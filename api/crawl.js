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
      if (!t) return null;
      let txt = t.replace(/\s+/g, ' ').trim();
      if (txt.includes('{') || txt.includes('}') || txt.includes('function') || txt.includes('Loading')) return null;
      return txt || null;
    }

    const data = {};

    data.product_title = cleanText(document.querySelector('#productTitle')?.textContent);
    data.apex_price = cleanText(document.querySelector('#apex-pricetopay-accessibility-label')?.textContent);
    data.price_label = cleanText(document.querySelector('.a-price .a-offscreen')?.textContent);
    data.availability = cleanText(document.querySelector('#availability')?.textContent);
    data.rating = cleanText(document.querySelector('[data-hook="rating-out-of-text"]')?.textContent);
    data.review_count = cleanText(document.querySelector('[data-hook="total-review-count"]')?.textContent);

    // 真实页面正确选择器（已实测 B0D5H9M72G）
    data.top_highlight = cleanText((document.querySelector('#po-highlights-content') || document.querySelector('.po-highlights-content'))?.textContent);
    data.item_details = cleanText((document.querySelector('#productDetails_feature_div') || document.querySelector('#detailBullets_feature_div'))?.textContent);
    data.features_and_specs = cleanText((document.querySelector('#productDetails_techSpec_section_1') || document.querySelector('#tech-specs'))?.textContent);

    const listItems = document.querySelectorAll('#feature-bullets li span.a-list-item');
    data.list_items = Array.from(listItems).map(i => cleanText(i.textContent)).filter(Boolean);

    const breads = document.querySelectorAll('.a-breadcrumb a');
    data.category = Array.from(breads).map(i => cleanText(i.textContent)).filter(Boolean).join(' ');

    res.json({ success: true, fakeIp, data });

  } catch (error) {
    res.json({ success: false, message: '爬取失败' });
  }
}
