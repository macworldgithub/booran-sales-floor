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
