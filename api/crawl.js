import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: '请输入 URL' });

    const ipFile = path.join(process.cwd(), 'ips.json');
    const ipData = JSON.parse(fs.readFileSync(ipFile, 'utf8'));
    const ipList = ipData.prefixes.map(i => i.ip_prefix.split('/')[0]);
    const fakeIp = ipList[Math.floor(Math.random() * ipList.length)];

    const UA = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-SearchBot/0.1) Chrome/119.0.6045.214 Safari/537.36";

    const response = await axios.get(url, {
      headers: {
        'User-Agent': UA,
        'X-Forwarded-For': fakeIp,
        'Client-IP': fakeIp
      },
      timeout: 20000
    });

    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // 超强清理：只保留纯文本，自动过滤 JS/CSS/样式代码
    function cleanText(t) {
      if (!t) return null;
      let text = t.replace(/\s+/g, ' ').trim();
      
      // 过滤 JS/CSS 代码
      if (text.includes('{') || text.includes('}') || text.includes('function') || text.includes('Loading content')) {
        return null;
      }
      
      return text || null;
    }

    const data = {};

    // 1. 标题
    data.product_title = cleanText(document.querySelector('#productTitle')?.textContent);

    // 2. 价格
    data.apex_price = cleanText(document.querySelector('#apex-pricetopay-accessibility-label')?.textContent);
    data.price_label = cleanText(document.querySelector('.a-price .a-offscreen')?.textContent);

    // 3. 库存
    data.availability = cleanText(document.querySelector('#availability')?.textContent);

    // 4. 评分 & 评论
    data.rating = cleanText(document.querySelector('[data-hook="rating-out-of-text"]')?.textContent);
    data.review_count = cleanText(document.querySelector('[data-hook="total-review-count"]')?.textContent);

    // ==============================
    // 关键修复：只抓纯文本，不抓代码
    // ==============================
    data.top_highlight = cleanText(
      document.querySelector('#topHighlight')?.textContent ||
      document.querySelector('#po-highlights-content')?.textContent ||
      document.querySelector('.po-highlights-content')?.textContent
    );

    data.item_details = cleanText(
      document.querySelector('#item_details')?.textContent ||
      document.querySelector('#productDetails_feature_div')?.textContent
    );

    data.features_and_specs = cleanText(
      document.querySelector('#features_and_specs')?.textContent ||
      document.querySelector('#productDetails_techSpec_section_1')?.textContent
    );

    // 产品描述
    const listItems = document.querySelectorAll('#feature-bullets li span.a-list-item');
    data.list_items = Array.from(listItems).map(i => cleanText(i.textContent)).filter(Boolean);

    // 分类
    const breads = document.querySelectorAll('.a-breadcrumb a');
    data.category = Array.from(breads).map(i => cleanText(i.textContent)).filter(Boolean).join(' ');

    res.json({
      success: true,
      fakeIp,
      data
    });

  } catch (error) {
    res.json({ success: false, message: '爬取失败' });
  }
}
