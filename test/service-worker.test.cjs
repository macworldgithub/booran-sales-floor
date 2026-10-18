const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

function worker(fetch = async () => { throw new Error('offline'); }, storage) {
  const events = {};
  const offline = new Response('<h1>Offline</h1>');
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://floor.test' }, addEventListener: (name, handler) => { events[name] = handler; } },
    caches: storage || { match: async () => offline }, URL, Response, fetch,
  });
  return { events, offline };
}
test('worker never intercepts customer API requests, cross-origin data or writes', () => {
  const { events } = worker();
  for (const [url, method, headers] of [
    ['https://floor.test/api', 'GET', {}],
    ['https://floor.test/api/leads', 'GET', {}],
    ['https://backend.test/api/leads', 'GET', {}],
    ['https://floor.test/api/leads', 'POST', {}],
    ['https://floor.test/private', 'GET', { authorization: 'Bearer test' }],
    ['https://floor.test/?_rsc=abc', 'GET', {}],
  ]) {
    let intercepted = false;
    events.fetch({ request: { url, method, headers: new Headers(headers) }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, `${method} ${url}`);
  }
});

test('asset loads survive disabled cache storage and cache quota failures', async () => {
  for (const storage of [
    { open: async () => { throw new Error('Storage disabled'); } },
    { open: async () => ({ match: async () => null, put: async () => { throw new Error('Quota exceeded'); } }) },
  ]) {
    const response = { ok: true, type: 'basic', clone() { return this; } };
    const { events } = worker(async () => response, storage);
    let result;
    events.fetch({ request: { url: 'https://floor.test/_next/static/chunk.js', method: 'GET', headers: new Headers() }, respondWith: (promise) => { result = promise; } });
    assert.equal(await result, response);
  }
});
test('offline navigation resolves to a real cached response', async () => {
  const { events, offline } = worker();
  let result;
  events.fetch({ request: { url: 'https://floor.test/', method: 'GET', mode: 'navigate', headers: new Headers() }, respondWith: (response) => { result = response; } });
  assert.equal(await result, offline);
});

test('offline navigation with disabled cache storage resolves to a network error response', async () => {
  const { events } = worker(async () => { throw new Error('offline'); }, { match: async () => { throw new Error('Cache unavailable'); } });
  let result;
  events.fetch({ request: { url: 'https://floor.test/', method: 'GET', mode: 'navigate', headers: new Headers() }, respondWith: (response) => { result = response; } });
  assert.equal((await result).type, 'error');
});

test('manifest icons have actual PNG encoding and the declared dimensions', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const bytes = readFileSync(`public${icon.src}`);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', icon.src);
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes, icon.src);
  }
});
