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

    // 读取伪装IP ips.json 完全不动
    const ipFile = path.join(process.cwd(), 'ips.json');
    const ipData = JSON.parse(fs.readFileSync(ipFile, 'utf8'));
    const ipList = ipData.prefixes.map(i => i.ip_prefix.split('/')[0]);
    const fakeIp = ipList[Math.floor(Math.random() * ipList.length)];

    // 固定UA 完全不变
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

    // 文本清理函数不变
    function cleanText(t) {
      return t ? t.trim().replace(/\s+/g, ' ') : null;
    }

    const data = {};

    // 1. 产品标题 ✅ 有效（无需改）
    const titleEl = document.querySelector('#productTitle');
    data.product_title = cleanText(titleEl?.textContent) || null;

    // 2. 价格 【全部替换新版亚马逊通用选择器，废弃旧ID】
    const priceEl =
      document.querySelector('.a-price-whole') ||
      document.querySelector('.a-offscreen') ||
      document.querySelector('span.a-price span');
    data.price_label = cleanText(priceEl?.textContent) || null;

    // 3. 库存状态 ✅ 有效（无需改）
    const availEl = document.querySelector('#availability');
    data.availability = cleanText(availEl?.textContent) || null;

    // 4. 评分 & 评论数 ✅ 有效（无需改）
    const ratingEl = document.querySelector('#acrPopover') || document.querySelector('.a-icon-star');
    data.rating = ratingEl?.getAttribute('title') || null;

    const reviewsEl = document.querySelector('#acrCustomerReviewText');
    data.review_count = cleanText(reviewsEl?.textContent) || null;

    // 5. Top Highlights 【原ID废弃，替换新版About节点】
    const highlightEl = document.querySelector('#productDescription') || document.querySelector('.a-section.a-spacing-small');
    data.top_highlight = cleanText(highlightEl?.textContent) || null;

    // 6. 五点描述 ✅ 有效（无需改）
    const listItems = document.querySelectorAll('#feature-bullets li span.a-list-item');
    data.list_items = Array.from(listItems).map(item => cleanText(item.textContent));

    // 7. 产品规格表 【旧ID全废弃，适配新版亚马逊规格DOM】
    const specs = [];
    const specsTable = document.querySelector('table.a-normal.a-motorsports') || document.querySelector('.a-section.a-spacing-micro table');
    if (specsTable) {
      specsTable.querySelectorAll('tr').forEach(row => {
        const k = cleanText(row.querySelector('th')?.textContent);
        const v = cleanText(row.querySelector('td')?.textContent);
        if (k) specs.push(`${k} | ${v}`);
      });
    }
    data.specs = specs;

    // 8. 详细产品信息 【适配新版详情DOM】
    const detailBullets = document.querySelectorAll('.a-section.a-spacing-none li');
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
