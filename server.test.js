const { test, before, after } = require('node:test');
const assert = require('node:assert');

const server = require('./server.js');

const PORT = 18099;
const base = `http://127.0.0.1:${PORT}`;

before(() => new Promise((resolve) => {
  server.listen(PORT, '127.0.0.1', resolve);
}));

after(() => new Promise((resolve) => {
  server.close(resolve);
}));

test('healthz returns 200', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
});

test('index returns html', async () => {
  const res = await fetch(`${base}/`);
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.match(text, /CodeM Demo/);
});
