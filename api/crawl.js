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

    // 严格清理所有多余空格、换行、空白字符
    function cleanText(t) {
      if (!t) return null;
      return t.replace(/\s+/g, ' ').trim();
    }

    const data = {};

    // 1. 产品标题
    const titleEl = document.querySelector('#productTitle');
    data.product_title = cleanText(titleEl?.textContent);

    // 2. 价格
    const priceEl = document.querySelector('.a-price .a-offscreen');
    data.price_label = cleanText(priceEl?.textContent);

    // 3. 库存状态
    const availEl = document.querySelector('#availability');
    data.availability = cleanText(availEl?.textContent);

    // 4. 评分
    const ratingEl = document.querySelector('[data-hook="rating-out-of-text"]');
    data.rating = cleanText(ratingEl?.textContent);

    // 5. 评论数
    const reviewEl = document.querySelector('[data-hook="total-review-count"]');
    data.review_count = cleanText(reviewEl?.textContent);

    // 6. 五点描述
    const listItems = document.querySelectorAll('#feature-bullets li span.a-list-item');
    data.list_items = Array.from(listItems)
      .map(item => cleanText(item.textContent))
      .filter(Boolean);

    // 7. 商品分类（纯文字拼接，去掉 > 符号）
    const breads = document.querySelectorAll('.a-breadcrumb a');
    const category = Array.from(breads)
      .map(i => cleanText(i.textContent))
      .filter(Boolean);
    data.category = category.join(' ');

    res.json({
      success: true,
      fakeIp,
      data
    });

  } catch (error) {
    res.json({ success: false, message: '爬取失败：' + error.message });
  }
}
