const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const lead = (id, name) => ({ _id: id, name, phone: '0400000000', email: '', owner_name: 'Test salesperson',
  status: 'following_up', source: 'Test import', vehicle: 'Test vehicle', diary_entries: [] });
const review = () => ({ id: 'review-1', dealership: 'South Morang Hyundai', requestedName: 'Test importer',
  updatedAt: '2026-11-13T00:00:00Z', incoming: lead('incoming', 'Incoming test'), candidates: [lead('primary', 'Primary test')] });

function mount() {
  const harness = hookHarness();
  let row = review(), revision = 0, tree;
  const compiled = ts.transpileModule(readFileSync('components/customer/ManagerMergeRequests.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const mocks = { react: harness.react, '@/lib/api': { fetchApi: async () => ({ success: true, data: [row], pagination: { total: 1, totalPages: 1 } }) },
    './CustomerMerge': { MergeCustomerSummary: () => null } };
  new Function('require', 'module', 'exports', compiled)(id => mocks[id] || require(id), module, module.exports);
  return { render() { tree = harness.render(() => module.exports.ManagerMergeRequests({ rooftop: 'South Morang Hyundai', revision, onOpenLead() {} })); return tree; },
    child() { return nodes(tree).find(node => typeof node.type === 'function'); },
    refresh(next) { row = next; revision++; }, cleanup: harness.cleanup };
}

test('background timestamp refresh preserves the mounted merge form and confirmation', async () => {
  const view = mount(); view.render(); await settle(); view.render();
  const original = view.child(); assert.ok(original);
  const next = review(); next.updatedAt = '2026-11-13T00:01:00Z';
  next.incoming.overdue = true; // Time-based badges are not changes to the reviewed customer details.
  view.refresh(next); view.render(); await settle(); view.render();
  assert.equal(view.child().key, original.key, 'timestamp-only polling must not unmount a checked review');
  assert.equal(view.child().props.review.updatedAt, next.updatedAt, 'submission must use the latest concurrency token');
  view.cleanup();
});

test('changed customer details or primary candidates require fresh confirmation', async () => {
  for (const change of [row => { row.incoming.phone = '0411111111'; }, row => { row.candidates[0].owner_name = 'Another salesperson'; },
    row => { row.candidates.push(lead('another-primary', 'Another primary')); }, row => { row.incoming.diary_entries.push({ note: 'New details' }); }]) {
    const view = mount(); view.render(); await settle(); view.render(); const original = view.child();
    const next = review(); change(next); view.refresh(next); view.render(); await settle(); view.render();
    assert.notEqual(view.child().key, original.key, 'material changes must reset confirmation'); view.cleanup();
  }
});

test('a completed transfer removes its form immediately and stale polling cannot restore it', async () => {
  const view = mount(); view.render(); await settle(); view.render();
  view.child().props.onResolved(); view.render();
  assert.equal(view.child(), undefined, 'completed reviews must disappear without waiting for another request');
  await settle(); view.render();
  assert.equal(view.child(), undefined, 'an older open-list response cannot restore the completed review');
  const reopened = review(); reopened.updatedAt = '2026-11-13T00:05:00Z';
  view.refresh(reopened); view.render(); await settle(); view.render();
  assert.ok(view.child(), 'a genuinely new review version must remain reviewable');
  view.cleanup();
});
