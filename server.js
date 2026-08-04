const { createReadStream } = require('node:fs');
const { createServer } = require('node:http');
const { join } = require('node:path');

const port = Number(process.env.PORT || 8080);
const indexPath = join(__dirname, 'index.html');

createServer((request, response) => {
  const path = new URL(request.url || '/', `http://127.0.0.1:${port}`).pathname;
  if (path === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end('{"status":"ok"}');
    return;
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(indexPath).pipe(response);
}).listen(port, '0.0.0.0');
