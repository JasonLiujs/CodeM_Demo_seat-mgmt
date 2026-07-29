import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const PORT = process.env.PORT || 8080;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  // 健康检查端点
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // 静态文件服务：托管 Vite 构建产物 dist/
  if (!existsSync(DIST_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Service unavailable: build output not found. Run npm run build.');
    return;
  }

  // 规范化路径，防止目录穿越
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  // 去掉前导 /
  const relativePath = pathname.replace(/^\//, '');
  const filePath = join(DIST_DIR, relativePath);

  // 确保解析后的路径仍在 DIST_DIR 内
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    if (!existsSync(filePath)) {
      // SPA 回退到 index.html（本 Demo 为单页应用，无路由，但保留回退）
      const indexPath = join(DIST_DIR, 'index.html');
      const html = await readFile(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`listening on 0.0.0.0:${PORT}`);
  });
}

export default server;
