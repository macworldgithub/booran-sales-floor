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

test('already-linked reviews select the current primary, require confirmation and submit only once before clearing',async t=>{
 const harness=hookHarness();t.after(()=>harness.cleanup());let finish,resolved=0;const calls=[];
 const module={exports:{}},compiled=ts.transpileModule(readFileSync('components/customer/ManagerMergeRequests.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const mocks={react:harness.react,'@/lib/api':{fetchApi:(url,options)=>{calls.push({url,options});return new Promise(resolve=>{finish=resolve;});}},'./CustomerMerge':{MergeCustomerSummary:()=>null}};
 new Function('require','module','exports',compiled)(id=>mocks[id]||require(id),module,module.exports);
 const current={...review(),incomingPrimaryId:'current',candidates:[lead('other','Previous candidate'),lead('current','Current primary')]};
 const render=()=>harness.render(()=>module.exports.MergeReview({review:current,onOpenLead(){},onResolved(){resolved++;},onRefresh(){}}));
 let tree=render();assert.equal(nodes(tree).find(node=>node.type==='select').props.value,'current');
 let button=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Transfer missing details and clear review');assert.equal(button.props.disabled,true);
 nodes(tree).find(node=>node.type==='input'&&node.props.type==='checkbox').props.onChange({target:{checked:true}});tree=render();button=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Transfer missing details and clear review');
 const first=button.props.onClick(),second=button.props.onClick();assert.equal(calls.length,1);assert.equal(JSON.parse(calls[0].options.body).primaryId,'current');
 finish({success:true});await Promise.all([first,second]);assert.equal(resolved,1);
});

test('a changed surviving primary resets the manager confirmation',async()=>{
 const view=mount();view.render();await settle();view.render();const original=view.child();
 const next=review();next.incomingPrimaryId='primary';view.refresh(next);view.render();await settle();view.render();assert.notEqual(view.child().key,original.key);view.cleanup();
});
