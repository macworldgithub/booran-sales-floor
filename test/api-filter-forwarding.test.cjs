const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

test('API proxy forwards every filter, sort and page parameter without caching', async () => {
  const compiled = ts.transpileModule(readFileSync('app/api/[...path]/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  let forwarded;
  const fetch = async (url, options) => {
    forwarded = { url, options };
    return Response.json({ success: true, data: [], pagination: { total: 0, page: 2, limit: 10, totalPages: 0 } });
  };
  new Function('module', 'exports', 'fetch', 'process', compiled)(module, module.exports, fetch, { env: { API_URL: 'https://backend.test/api', NODE_ENV: 'production' } });
  const nextUrl = new URL('https://floor.test/api/inventory/vehicles?rooftop=South%20Morang%20Hyundai&category=Used&agingBucket=90%2B&search=EV%5B123%5D&sortBy=totalStockCost&sortOrder=asc&page=2&limit=10');
  const response = await module.exports.GET({ nextUrl, method: 'GET', headers: new Headers({ cookie: 'booran_session=test-session' }) }, { params: Promise.resolve({ path: ['inventory', 'vehicles'] }) });
  assert.equal(forwarded.url.origin, 'https://backend.test');
  assert.equal(forwarded.url.pathname, '/api/inventory/vehicles');
  assert.deepEqual([...forwarded.url.searchParams], [...nextUrl.searchParams]);
  assert.equal(forwarded.options.headers.get('cookie'), 'booran_session=test-session');
  assert.equal(forwarded.options.cache, 'no-store');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual((await response.json()).data, []);
});

test('API proxy returns a controlled unavailable response for invalid upstream configuration', async () => {
  const compiled = ts.transpileModule(readFileSync('app/api/[...path]/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'fetch', 'process', compiled)(module, module.exports, () => { throw new Error('Unexpected request'); }, { env: { API_URL: 'invalid-url', NODE_ENV: 'production' } });
  const nextUrl = new URL('https://floor.test/api/leads');
  const response = await module.exports.GET({ nextUrl, method: 'GET', headers: new Headers() }, { params: Promise.resolve({ path: ['leads'] }) });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).success, false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

function uploadProxy(fetch) {
  const compiled = ts.transpileModule(readFileSync('app/api/[...path]/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'fetch', 'process', compiled)(module, module.exports, fetch, { env: { API_URL: 'https://backend.test/api', NODE_ENV: 'production' } });
  return module.exports;
}

test('media proxy preserves arbitrary binary bytes and authenticated chunk offsets', async () => {
  let forwarded;
  const proxy = uploadProxy(async (url, options) => { forwarded = { url, options }; return Response.json({ success: true, data: { next_offset: 5 } }); });
  const bytes = new Uint8Array([0, 255, 128, 13, 10]);
  const request = new Request('https://floor.test/api/leads/lead/media/photo/content?offset=0', { method: 'PUT', headers: { 'content-type': 'application/octet-stream', cookie: 'booran_session=fixture', origin: 'https://floor.test' }, body: bytes });
  const response = await proxy.PUT({ nextUrl: new URL(request.url), method: request.method, headers: request.headers, body: request.body }, { params: Promise.resolve({ path: ['leads', 'lead', 'media', 'photo', 'content'] }) });
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(forwarded.options.body), bytes);
  assert.equal(forwarded.options.headers.get('content-type'), 'application/octet-stream');
  assert.equal(forwarded.options.headers.get('cookie'), 'booran_session=fixture');
  assert.equal(forwarded.url.searchParams.get('offset'), '0');
});

test('media proxy rejects oversized and cross-origin uploads before contacting the backend', async () => {
  let calls = 0;
  const proxy = uploadProxy(async () => { calls++; throw new Error('Must not forward'); });
  const url = new URL('https://floor.test/api/leads/lead/media/photo/content?offset=0');
  const context = { params: Promise.resolve({ path: ['leads', 'lead', 'media', 'photo', 'content'] }) };
  const request = new Request(url, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: new Uint8Array(2 * 1024 * 1024 + 1) });
  const response = await proxy.PUT({ nextUrl: url, method: request.method, headers: request.headers, body: request.body }, context);
  assert.equal(response.status, 413);
  const rejected = await proxy.PUT({ nextUrl: url, method: 'PUT', headers: new Headers({ origin: 'https://untrusted.test' }) }, context);
  assert.equal(rejected.status, 403);
  assert.equal(calls, 0);
});
