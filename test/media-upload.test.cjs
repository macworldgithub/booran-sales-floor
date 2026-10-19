const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

test('photo/video upload splits binary files into authenticated chunks before completion', async () => {
  const compiled = ts.transpileModule(readFileSync('lib/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const bytes = new Uint8Array(2 * 1024 * 1024 + 3).fill(255);
  bytes[0] = 0; bytes[bytes.length - 1] = 128;
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return Response.json({ success: true, data: { id: 'media-1', upload: { chunk_size: 2 * 1024 * 1024 } } });
    if (url.endsWith('/complete')) return Response.json({ success: true, data: { id: 'media-1', url: 'https://backend.test/api/media/token' } });
    return Response.json({ success: true, data: { next_offset: 0 } });
  };
  new Function('module', 'exports', 'fetch', compiled)(module, module.exports, fetch);
  const result = await module.exports.customerMessageApi.upload('customer-1', new File([bytes], 'video.mp4', { type: 'video/mp4' }));
  assert.equal(result.data.id, 'media-1');
  assert.equal(calls.length, 4);
  assert.equal(calls[1].url, '/api/leads/customer-1/media/media-1/content?offset=0');
  assert.equal(calls[2].url, '/api/leads/customer-1/media/media-1/content?offset=2097152');
  assert.equal(calls[1].options.headers.get('Content-Type'), 'application/octet-stream');
  assert.equal(calls[1].options.credentials, 'same-origin');
  const combined = new Blob([calls[1].options.body, calls[2].options.body]);
  assert.deepEqual(new Uint8Array(await combined.arrayBuffer()), bytes);
  assert.ok(calls[3].url.endsWith('/complete'));
});
