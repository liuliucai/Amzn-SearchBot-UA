const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 加载 IP 文件（不修改）
const ipFile = path.join(__dirname, 'ips.json');
const ipData = JSON.parse(fs.readFileSync(ipFile, 'utf8'));
const ipPool = ipData.prefixes.map(item => item.ip_prefix.split('/')[0]);

// 随机获取伪装IP
function getRandomFakeIP() {
  return ipPool[Math.floor(Math.random() * ipPool.length)];
}

// 爬虫 API
app.post('/api/crawl', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.json({ success: false, message: '缺少 URL' });

    const fakeIp = getRandomFakeIP();
    
    // ✅ 已使用你提供的完整 User-Agent
    const USER_AGENT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-SearchBot/0.1) Chrome/119.0.6045.214 Safari/537.36";

    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'X-Forwarded-For': fakeIp,
        'Client-IP': fakeIp
      },
      timeout: 10000
    });

    const html = response.data;
    const title = html.match(/<span id="productTitle".*?>(.*?)<\/span>/s)?.[1]?.trim() || '未获取到标题';
    const price = html.match(/\$[0-9]+\.[0-9]+/)?.[0] || '未获取到价格';
    const asin = url.match(/dp\/([A-Z0-9]{10})/)?.[1] || '未获取到ASIN';

    res.json({
      success: true,
      fakeIp,
      data: { asin, title, price, url }
    });

  } catch (error) {
    res.json({
      success: false,
      message: '爬取失败：' + error.message
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 后端运行在 http://localhost:${PORT}`);
  console.log(`✅ 前端打开 index.html 即可使用`);
});
