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
