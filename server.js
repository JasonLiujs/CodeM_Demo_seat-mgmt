const http = require('node:http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><title>CodeM Demo</title></head>
<body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;color:#e2e8f0">
  <div style="text-align:center">
    <h1>CodeM Demo 已上线</h1>
    <p>CI/CD 流水线工作正常 · 部署时间 ${new Date().toISOString()}</p>
  </div>
</body>
</html>`);
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`listening on 0.0.0.0:${PORT}`);
  });
}

module.exports = server;
