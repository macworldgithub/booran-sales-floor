const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const React = require('react');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');

test('manager sections have distinct sibling keys through background refreshes', async t => {
  const saved = { window: global.window, document: global.document };
  global.window = { setInterval() { return 1; }, addEventListener() {}, removeEventListener() {} };
  global.document = { visibilityState: 'visible' };
  const harness = hookHarness();
  t.after(() => { harness.cleanup(); global.window = saved.window; global.document = saved.document; });
  const data = { date: '2026-11-12', refreshedAt: '2026-11-12T00:00:00Z', members: [], unassigned: [], losses: [],
    summary: { allGreen: true }, report: { available: false } };
  const ManagerMergeRequests = () => null, LeadIntegrationStatus = () => null;
  const mocks = { react: harness.react, '@/lib/auth': { useAuth: () => ({ user: { id: 'manager', canAllocate: true }, locations: [] }) },
    '@/lib/oversight': { oversightApi: { daily: async () => ({ data }) } }, '@/lib/api': {},
    '@/lib/use-refresh-on-resume': { useRefreshOnResume() {} },
    '@/components/customer/ConnexIntegration': { ConnexIntegration: () => null },
    '@/components/customer/ManagerMergeRequests': { ManagerMergeRequests }, '@/components/customer/LeadIntegrationStatus': { LeadIntegrationStatus },
    '@/components/customer/LeadAssignment': { LeadAssignment: () => null }, '@/components/customer/LostLeadReview': { LostLeadReview: () => null } };
  const compiled = ts.transpileModule(readFileSync('components/views/DailyOversight.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(id => mocks[id] || require(id), mod, mod.exports);
  const render = () => harness.render(() => mod.exports.DailyOversight({ rooftop: 'South Morang Hyundai', onOpenLead() {} }));
  const assertKeys = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      const flat = node.flat(Infinity).filter(child => React.isValidElement(child));
      const keys = flat.map(child => child.key).filter(key => key != null);
      assert.equal(new Set(keys).size, keys.length, 'duplicate sibling keys can leave orphaned DOM sections during reconciliation');
      node.forEach(assertKeys);
    } else assertKeys(node.props?.children);
  };
  let tree = render(); await new Promise(resolve => setImmediate(resolve));
  for (let i = 0; i < 12; i++) {
    tree = render(); assertKeys(tree);
    assert.equal(nodes(tree).filter(node => node.type === ManagerMergeRequests).length, 1);
    const button = nodes(tree).find(node => node.type === 'button' && node.props.children === 'Refresh overview');
    button.props.onClick(); await new Promise(resolve => setImmediate(resolve));
  }
});

test('workday table shows selected-day counts and sends the chosen date without stale pipeline values', async t => {
  const saved = { window: global.window, document: global.document };
  global.window = { setInterval() { return 1; }, addEventListener() {}, removeEventListener() {} };
  global.document = { visibilityState: 'visible' };
  const harness = hookHarness(); t.after(() => { harness.cleanup(); global.window = saved.window; global.document = saved.document; });
  const requests = [], data = date => ({ date: '2026-11-12', today: '2026-11-12', refreshedAt: '2026-11-12T02:00:00Z',
    members: [], unassigned: [], losses: [], summary: { activeProspects: 999, mtdSales: 77 }, report: {},
    workday: { date: date || '2026-11-12', totals: { customersUpdated: date ? 0 : 2 }, members: [{ id: 'sales', name: 'Alice',
      customersUpdated: date ? 0 : 2, videosAdded: 1, videosSent: 1, nextActionsSet: 1, tasksCompleted: 1, sales: 1, events: [] }] } });
  const mocks = { react: harness.react, '@/lib/auth': { useAuth: () => ({ user: { canAllocate: true }, locations: [] }) },
    '@/lib/oversight': { oversightApi: { daily: async (site, signal, page, date) => { requests.push(date); return { data: data(date) }; } } },
    '@/lib/api': {}, '@/lib/use-refresh-on-resume': { useRefreshOnResume() {} } };
  for (const name of ['ManagerMergeRequests', 'LeadIntegrationStatus', 'ConnexIntegration', 'LeadAssignment', 'LostLeadReview']) mocks['@/components/customer/' + name] = { [name]: () => null };
  const compiled = ts.transpileModule(readFileSync('components/views/DailyOversight.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} }; new Function('require', 'module', 'exports', compiled)(id => mocks[id] || require(id), mod, mod.exports);
  const render = () => harness.render(() => mod.exports.DailyOversight({ rooftop: 'South Morang Hyundai', onOpenLead() {} }));
  const text = node => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? '');
  render(); await new Promise(resolve => setImmediate(resolve)); let tree = render();
  let table = nodes(tree).find(node => node.type === 'table');
  assert.match(text(table), /Customers updated/); assert.match(text(table), /Alice 2/);
  assert.doesNotMatch(text(table), /999|77|MTD|active prospects|%/);
  nodes(tree).find(node => node.props?.['aria-label'] === 'Workday').props.onChange({ target: { value: '2026-11-11' } });
  tree = render(); assert.ok(!nodes(tree).some(node => node.type === 'table'), 'changing the date hides previous-day results while loading');
  await new Promise(resolve => setImmediate(resolve)); tree = render(); table = nodes(tree).find(node => node.type === 'table');
  assert.equal(requests.at(-1), '2026-11-11'); assert.match(text(table), /Alice 0/);
});
