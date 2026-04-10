import express from 'express';
import { readFileSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3457;

// CORS — 允许 WebView 跨域访问
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
});

// APK 存放目录（项目根目录）
const APK_DIR = join(__dirname, '..');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

const LOCAL_IP = getLocalIP();
const BASE_URL = `http://${LOCAL_IP}:${PORT}`;

// 读取版本信息
function getVersionInfo() {
  const raw = readFileSync(join(__dirname, 'version.json'), 'utf-8');
  return JSON.parse(raw);
}

// API: 版本检查
app.get('/api/version', (req, res) => {
  const info = getVersionInfo();
  res.json({
    ...info,
    downloadUrl: `${BASE_URL}/download`,
    pageUrl: `${BASE_URL}/`,
  });
});

// API: APK 下载
app.get('/download', (req, res) => {
  const info = getVersionInfo();
  const apkPath = join(APK_DIR, info.apkFileName);
  if (!existsSync(apkPath)) {
    return res.status(404).json({ error: 'APK not found' });
  }
  const stat = statSync(apkPath);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${info.apkFileName}"`);
  res.setHeader('Content-Length', stat.size);
  res.sendFile(apkPath);
});

// API: 生成二维码图片
app.get('/api/qrcode', async (req, res) => {
  try {
    const buffer = await QRCode.toBuffer(BASE_URL, {
      width: 300, margin: 2,
      color: { dark: '#1e1e2e', light: '#ffffff' },
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// 下载页面
app.get('/', async (req, res) => {
  const info = getVersionInfo();
  const apkPath = join(APK_DIR, info.apkFileName);
  const fileSize = existsSync(apkPath)
    ? (statSync(apkPath).size / 1024 / 1024).toFixed(1)
    : '?';
  const qrDataUrl = await QRCode.toDataURL(BASE_URL, {
    width: 280, margin: 2,
    color: { dark: '#1e1e2e', light: '#ffffff' },
  });

  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JRAi Hub - 下载安装</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #1a1a3e, #24243e);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .card {
      background: rgba(30, 30, 60, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 20px;
      padding: 40px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    .icon {
      width: 80px; height: 80px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
    }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .version { color: #818cf8; font-size: 14px; margin-bottom: 24px; }
    .qr-container {
      background: #fff;
      border-radius: 12px;
      padding: 12px;
      display: inline-block;
      margin-bottom: 20px;
    }
    .qr-container img { display: block; width: 256px; height: 256px; }
    .qr-hint { font-size: 12px; color: #94a3b8; margin-bottom: 24px; }
    .download-btn {
      display: block;
      width: 100%;
      padding: 14px 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }
    .download-btn:active { transform: translateY(0); }
    .meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 20px;
      font-size: 12px;
      color: #64748b;
    }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .changelog {
      margin-top: 24px;
      text-align: left;
      background: rgba(15, 15, 35, 0.5);
      border-radius: 10px;
      padding: 16px;
    }
    .changelog h3 {
      font-size: 13px;
      color: #818cf8;
      margin-bottom: 8px;
    }
    .changelog pre {
      font-size: 12px;
      color: #94a3b8;
      white-space: pre-wrap;
      line-height: 1.6;
      font-family: inherit;
    }
    .server-info {
      margin-top: 16px;
      font-size: 11px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>JRAi Hub</h1>
    <div class="version">v${info.versionName} (Build ${info.versionCode})</div>

    <div class="qr-container">
      <img src="${qrDataUrl}" alt="扫码下载">
    </div>
    <div class="qr-hint">使用手机/平板扫描二维码打开此页面</div>

    <a class="download-btn" href="/download">
      ⬇ 下载安装包 (${fileSize} MB)
    </a>

    <div class="meta">
      <span>📦 ${fileSize} MB</span>
      <span>📱 Android 7.0+</span>
      <span>🔑 已签名</span>
    </div>

    <div class="changelog">
      <h3>📋 更新日志</h3>
      <pre>${info.updateLog}</pre>
    </div>

    <div class="server-info">
      服务器地址: ${BASE_URL}
    </div>
  </div>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       JRAi Hub 更新服务器已启动            ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  下载页面: ${BASE_URL}`);
  console.log(`║  版本API:  ${BASE_URL}/api/version`);
  console.log(`║  APK下载:  ${BASE_URL}/download`);
  console.log(`║  二维码:   ${BASE_URL}/api/qrcode`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
