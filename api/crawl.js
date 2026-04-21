import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: '请输入 Amazon URL' });

    // 读取伪装 IP（不修改 ips.json）
    const ipFile = path.join(process.cwd(), 'ips.json');
    const ipData = JSON.parse(fs.readFileSync(ipFile, 'utf8'));
    const ipList = ipData.prefixes.map(item => item.ip_prefix.split('/')[0]);
    const fakeIp = ipList[Math.floor(Math.random() * ipList.length)];

    // ✅ 你指定的完整 User-Agent
    const UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-SearchBot/0.1) Chrome/119.0.6045.214 Safari/537.36';

    const response = await axios.get(url, {
      headers: {
        'User-Agent': UA,
        'X-Forwarded-For': fakeIp,
        'Client-IP': fakeIp
      },
      timeout: 15000
    });

    const html = response.data;

    // 提取数据
    const title = html.match(/<span id="productTitle".*?>(.*?)<\/span>/s)?.[1]?.trim() || '未获取到标题';
    const price = html.match(/\$[0-9]+\.[0-9]+/)?.[0] || '未获取到价格';
    const asin = url.match(/dp\/([A-Z0-9]{10})/)?.[1] || '未获取到ASIN';

    res.json({
      success: true,
      fakeIp,
      data: { asin, title, price, url }
    });

  } catch (error) {
    res.json({ success: false, message: '爬取失败：' + error.message });
  }
}
