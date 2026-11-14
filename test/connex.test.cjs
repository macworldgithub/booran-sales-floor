const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
test('Connex note retries reuse their request reference and preserve the draft after a lost response', async t => {
  const saved = { window: global.window, document: global.document };
  global.window = { setInterval: () => 1 }; global.document = { visibilityState: 'visible' };
  const harness = hookHarness(); t.after(() => { harness.cleanup(); Object.assign(global, saved); });
  const requests = [], record = { recordId: '006TJ000013YBI9YAO', snapshot: { opportunityName: 'Fixture', stage: 'Accepted', url: 'https://connex-hmca.my.site.com/HMCADealerCommunity/s/opportunity/006TJ000013YBI9YAO' } };
  let fail = true;
  const mocks = { react: harness.react, '@/components/customer/ConnexPreferences': { ConnexPreferences: () => null }, '@/lib/api': { leadApi: {} }, '@/lib/auth': { useAuth: () => ({ user: { canAllocate: true } }) },
    '@/lib/connex': { pendingJob: job => job.status === 'queued', connexApi: { customer: async () => ({ data: { configured: true, writesEnabled: true, records: [record], jobs: [] } }),
      action: async (id, payload) => { requests.push(payload); if (fail) throw new Error('Connection interrupted'); return { data: { status: 'queued' } }; } } } };
  const compiled = ts.transpileModule(readFileSync('components/customer/ConnexLeadActions.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} }; new Function('require', 'module', 'exports', compiled)(id => mocks[id] || require(id), mod, mod.exports);
  const lead = { _id: 'fixture', source: 'Connex', status: 'following_up' };
  const render = () => harness.render(() => mod.exports.ConnexLeadActions({ lead, onUpdated() {}, onRequestLost() {} }));
  render(); await new Promise(resolve => setImmediate(resolve)); let tree = render();
  nodes(tree).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Fixture shared note' } }); tree = render();
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); tree = render();
  assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, 'Fixture shared note');
  fail = false; await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); tree = render();
  assert.equal(requests.length, 2); assert.equal(requests[0].requestId, requests[1].requestId);
  assert.equal(nodes(tree).find(node => node.type === 'textarea').props.value, '');
});
