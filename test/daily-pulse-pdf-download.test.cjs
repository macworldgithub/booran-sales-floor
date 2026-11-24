const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(file, mocks = {}, bindings = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} }, names = Object.keys(bindings);
  new Function('require', 'module', 'exports', ...names, code)(
    id => mocks[id] || require(id),
    mod,
    mod.exports,
    ...names.map(key => bindings[key])
  );
  return mod.exports;
}

test('downloadDailyPulsePdf fetches pdf endpoint and triggers file download', async () => {
  let requestedUrl, downloadedFilename;
  const fakeBlob = { size: 100 };
  const mockFetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/pdf' : null),
      },
      blob: async () => fakeBlob,
    };
  };

  const fakeDocument = {
    createElement: (tag) => {
      if (tag === 'a') {
        return {
          set href(val) { this._href = val; },
          set download(val) { downloadedFilename = val; },
          click() {},
        };
      }
      return {};
    },
  };

  const fakeUrl = {
    createObjectURL: () => 'blob:mock-pdf',
    revokeObjectURL: () => {},
  };

  const api = load('lib/daily-traffic.ts', { './api': {} }, {
    fetch: mockFetch,
    document: fakeDocument,
    URL: fakeUrl,
    window: { open() {} },
    setTimeout: (fn) => fn(),
  });

  const mockData = {
    date: '2026-11-24',
    computedAt: '2026-11-24T08:00:00Z',
    timezone: 'Australia/Melbourne',
    summary: { newCustomers: 20 },
    members: [],
  };

  await api.downloadDailyPulsePdf(mockData, 'South Morang Hyundai', { name: 'Quoc Truong', role: 'manager' });

  assert.ok(requestedUrl.includes('/api/daily-traffic/pdf'));
  assert.ok(requestedUrl.includes('date=2026-11-24'));
  assert.ok(requestedUrl.includes('rooftop=South+Morang+Hyundai'));
  assert.ok(requestedUrl.includes('userName=Quoc+Truong'));
  assert.equal(downloadedFilename, 'daily-pulse-wrap-2026-11-24.pdf');
});
