const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function mount(overrides = {}, leadOverrides = {}) {
  const harness = hookHarness();
  const media = { id: 'photo-1', name: 'vehicle.jpg', url: 'https://example.test/api/media/abc', content_type: 'image/jpeg', size: 100, created_at: '2026-10-19T01:00:00Z' };
  const api = {
    history: async () => ({ success: true, data: { messages: [], sms_available: true, media_available: true }, pagination: { totalPages: 1 } }),
    media: async () => ({ success: true, data: [media] }),
    send: async () => ({ success: true, data: { status: 'queued' } }),
    ...overrides,
  };
  let updates = 0;
  const mocks = { react: harness.react, '@/lib/api': { customerMessageApi: api }, '@/lib/use-refresh-on-resume': { useRefreshOnResume() {} } };
  const compiled = ts.transpileModule(readFileSync('components/customer/CustomerMessages.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((id) => mocks[id] || require(id), module, module.exports);
  const props = { lead: { _id: 'lead-1', name: 'Alice', phone: '0412345678', ...leadOverrides }, onMessageSent: () => { updates++; } };
  let tree;
  const render = () => { tree = harness.render(() => module.exports.CustomerMessages(props)); return tree; };
  const find = (predicate) => { const result = nodes(tree).find(predicate); assert.ok(result, 'Expected control'); return result; };
  const text = (node) => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node) : node?.props ? text(node.props.children) : '';
  return { render, find, text, media, api, updates: () => updates, cleanup: harness.cleanup };
}

test('lost SMS response preserves the exact request and attachments when checking its result', async () => {
  const calls = [];
  const view = mount({ send: async (id, payload) => {
    calls.push({ id, payload });
    if (calls.length === 1) throw new Error('Network disconnected');
    return { success: true, data: { status: 'queued' } };
  } });
  view.render(); await settle(); view.render();
  view.find((node) => node.type === 'textarea').props.onChange({ target: { value: 'Your vehicle photo' } });
  view.find((node) => node.type === 'button' && view.text(node) === 'Attach').props.onClick();
  view.render();
  await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(view.find((node) => node.type === 'textarea').props.disabled, true);
  assert.equal(view.text(view.find((node) => node.type === 'button' && node.props.type === 'submit')), 'Check send result');
  await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], calls[0]);
  assert.deepEqual(calls[0].payload.media_ids, ['photo-1']);
  assert.equal(calls[0].payload.body, 'Your vehicle photo');
  assert.match(calls[0].payload.request_id, /^[a-f0-9-]{36}$/);
  assert.equal(view.find((node) => node.type === 'textarea').props.value, '');
  assert.equal(view.updates(), 1);
  view.cleanup();
});

test('provider rejection keeps the draft and shows failure instead of queued confirmation', async () => {
  const view = mount({ send: async () => ({ success: true, data: { status: 'failed', error: 'Insufficient credits' } }) });
  view.render(); await settle(); view.render();
  view.find((node) => node.type === 'textarea').props.onChange({ target: { value: 'Hello Alice' } });
  view.render();
  await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  view.render();
  assert.equal(view.find((node) => node.type === 'textarea').props.value, 'Hello Alice');
  assert.match(view.text(view.find((node) => node.props.role === 'alert')), /Insufficient credits/);
  assert.equal(view.find((node) => node.type === 'textarea').props.disabled, false);
  view.cleanup();
});

test('invalid files never upload and customers without mobile numbers cannot send', async () => {
  let uploads = 0;
  const view = mount({ upload: async () => { uploads++; } }, { phone: '' });
  view.render(); await settle(); view.render();
  assert.equal(view.find((node) => node.props.type === 'submit').props.disabled, true);
  view.find((node) => node.props.type === 'file').props.onChange({ target: { files: [{ name: 'large.mp4', type: 'video/mp4', size: 101 * 1024 * 1024 }] } });
  await settle(); view.render();
  assert.equal(uploads, 0);
  assert.match(view.text(view.find((node) => node.props.role === 'alert')), /100 MB/);
  view.cleanup();
});

test('completed uploads automatically attach their durable share link', async () => {
  const uploaded = { id: 'new-photo', name: 'new.jpg', content_type: 'image/jpeg', size: 100, url: 'https://example.test/api/media/new' };
  let payload;
  const view = mount({ upload: async () => ({ success: true, data: uploaded }), send: async (id, input) => { payload = input; return { success: true, data: { status: 'queued' } }; } });
  view.render(); await settle(); view.render();
  view.find((node) => node.props.type === 'file').props.onChange({ target: { files: [{ name: 'new.jpg', type: 'image/jpeg', size: 100 }] } });
  await settle(); view.render();
  assert.equal(view.find((node) => node.type === 'a' && node.props.href === uploaded.url).props.href, uploaded.url);
  assert.equal(view.find((node) => node.props.type === 'submit').props.disabled, false);
  await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(payload.media_ids, ['new-photo']);
  view.cleanup();
});
