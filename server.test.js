import { test, before, after } from 'node:test';
import assert from 'node:assert';

// server.js 是 ESM，动态 import
let server;

before(async () => {
  const mod = await import('./server.js');
  server = mod.default;
  await new Promise((resolve) => {
    server.listen(18099, '127.0.0.1', resolve);
  });
});

after(() => new Promise((resolve) => {
  server.close(resolve);
}));

test('healthz returns 200 ok', async () => {
  const res = await fetch('http://127.0.0.1:18099/healthz');
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
});

test('root path returns content (200)', async () => {
  const res = await fetch('http://127.0.0.1:18099/');
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.ok(text.length > 0, 'response body should not be empty');
});
