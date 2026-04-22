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

    // 清理文本
    function cleanText(t) {
      if (!t) return null;
      return t.replace(/\s+/g, ' ').trim();
    }

    const data = {};

    // 只保留 2 个字段
    // 1. 产品标题
    data.product_title = cleanText(document.querySelector('#productTitle')?.textContent);

    // 2. 产品描述
    const listItems = document.querySelectorAll('#feature-bullets li span.a-list-item');
    data.list_items = Array.from(listItems).map(i => cleanText(i.textContent)).filter(Boolean);

    res.json({
      success: true,
      fakeIp,
      data
    });

  } catch (error) {
    res.json({ success: false, message: '爬取失败' });
  }
}
