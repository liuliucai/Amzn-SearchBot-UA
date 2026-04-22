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

    function cleanText(t) {
      return t ? t.trim().replace(/\s+/g, ' ') : null;
    }

    const data = {};

    // 1. 标题
    const titleEl = document.querySelector('#productTitle');
    data.product_title = cleanText(titleEl?.textContent) || null;

    // 2. 价格
    const priceEl =
      document.querySelector('#apex-pricetopay-accessibility-label') ||
      document.querySelector('.a-price .a-offscreen') ||
      document.querySelector('#priceblock_ourprice');
    data.price_label = cleanText(priceEl?.textContent) || null;

    // 3. 库存
    const availEl = document.querySelector('#availability');
    data.availability = cleanText(availEl?.textContent) || null;

    // 4. 评分 & 评论数
    const ratingEl = document.querySelector('#acrPopover') || document.querySelector('.a-icon-star');
    data.rating = ratingEl?.getAttribute('title') || null;

    const reviewsEl = document.querySelector('#acrCustomerReviewText');
    data.review_count = cleanText(reviewsEl?.textContent) || null;

    // 5. 亮点
    const highlightEl = document.querySelector('#topHighlight');
    data.top_highlight = cleanText(highlightEl?.textContent) || null;

    // 6. 五点描述
    const listItems = document.querySelectorAll('#feature-bullets li span.a-list-item');
    data.list_items = Array.from(listItems).map(item => cleanText(item.textContent));

    // 7. 规格表
    const specs = [];
    const specsTable = document.querySelector('#productDetails_techSpec_section_1') || document.querySelector('#features_and_specs > table');
    if (specsTable) {
      specsTable.querySelectorAll('tr').forEach(row => {
        const k = cleanText(row.querySelector('th')?.textContent);
        const v = cleanText(row.querySelector('td')?.textContent);
        if (k) specs.push(`${k} | ${v}`);
      });
    }
    data.specs = specs;

    // 8. 详细信息
    const detailBullets = document.querySelectorAll('#detailBullets_feature_div > ul > li');
    data.full_product_details = Array.from(detailBullets).map(item => cleanText(item.textContent));

    res.json({
      success: true,
      fakeIp,
      data
    });

  } catch (error) {
    res.json({ success: false, message: '爬取失败：' + error.message });
  }
}
