const { test } = require('node:test'), assert = require('node:assert/strict'), { readFileSync } = require('node:fs'), ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
const load = (file, mocks = {}, bindings = {}) => { const mod = { exports: {} }; const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText; new Function('require', 'module', 'exports', ...Object.keys(bindings), code)(id => mocks[id] || require(id), mod, mod.exports, ...Object.values(bindings)); return mod.exports; };
const text = node => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? '');
const settle = () => new Promise(setImmediate);

test('Add Prospect sends the selected Phone source and quick intake remains Walk-In', async t => {
  const harness = hookHarness(), saved = []; t.after(harness.cleanup);
  const { AddProspectModal } = load('components/modals/AddProspectModal.tsx', { react: harness.react, '@/lib/auth': { useAuth: () => ({ user: { canAllocate: true }, locations: ['South Morang Hyundai'] }) }, '@/lib/locations': { specificDealerships: locations => locations }, '@/lib/use-dialog': { useDialog: () => ({}) }, '@/components/ui/RooftopOptions': { RooftopOptions: () => null }, '@/components/customer/VehicleLookup': {}, '@/lib/crm-updates': { crmApi: { duplicateCheck: async () => ({}) } }, '@/lib/lead-sources': load('lib/lead-sources.ts'), '@/lib/api': { leadApi: { createLead: async body => { saved.push(body); return { success: true, data: { _id: 'new' } }; } } } });
  const render = () => harness.render(() => AddProspectModal({ isOpen: true, defaultDealership: 'South Morang Hyundai', onClose() {} }));
  let tree = render(); const source = nodes(tree).find(node => node.props['aria-label'] === 'Prospect source');
  assert.ok(nodes(source).some(node => node.type === 'option' && node.props.children === 'Walk-In'));
  source.props.onChange({ target: { value: 'Phone' } });
  const inputs = nodes(tree).filter(node => node.type === 'input');
  inputs.find(node => node.props.placeholder === 'e.g. Jason Miller').props.onChange({ target: { value: 'Fixture customer' } });
  inputs.find(node => node.props.placeholder === '+61 400 000 000').props.onChange({ target: { value: '+61400111222' } });
  tree = render(); await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); assert.equal(saved[0].source, 'Phone');
  nodes(tree).find(node => node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  nodes(tree).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Quick fixture description' } });
  tree = render(); assert.equal(nodes(tree).find(node => node.props['aria-label'] === 'Prospect source').props.disabled, true);
  await nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); assert.equal(saved[1].source, 'Walk-in Showroom');
});

test('daily diary shows carried items, original deadline and customer navigation without inventing work', () => {
  const harness = hookHarness(), opens = [], queries = [];
  const mocks = { react: harness.react, '@/lib/auth': {}, '@/lib/api': {}, '@/lib/daily-traffic': { ...load('lib/daily-traffic.ts', { './api': {} }), trafficApi: { diary() {} } }, '@/lib/use-refresh-on-resume': {}, '@/lib/use-dialog': {}, '@/components/ui/QueryStatus': { QueryStatus: () => null }, '@/components/ui/Pagination': { Pagination: () => null }, '@/components/customer/LeadAssignment': {}, '@/components/customer/ManagerApprovals': {}, './DailyIntegrationTools': {}, '@/lib/use-paginated-query': { usePaginatedQuery(loader, params) { queries.push(params); return { data: [{ id: 'task', leadId: 'customer', kind: 'task', title: 'Call', customer: 'Fixture', originalDueAt: '2026-11-18T01:00:00Z', diaryDate: '2026-11-20', carriedForward: true, complete: false }], pagination: { total: 1, totalPages: 1 }, refresh() {} }; } } };
  const { TrafficDiary } = load('components/views/DailyTrafficDashboard.tsx', mocks);
  const tree = harness.render(() => TrafficDiary({ rooftop: 'South Morang Hyundai', date: '2026-11-20', selection: { member: 'rep', metric: 'diary' }, revision: 1, busy: false, onOpen: id => opens.push(id) }));
  assert.match(text(tree), /Outstanding · carried forward to\s+2026-11-20/); assert.match(text(tree), /Original due/);
  assert.equal(queries[0].member, 'rep'); nodes(tree).find(node => node.type === 'button' && node.props.children === 'Open customer').props.onClick(); assert.deepEqual(opens, ['customer']); harness.cleanup();
});

test('manager note notification polling aborts stale scopes, keeps customer links and marks reads for the current account', async t => {
  const harness = hookHarness(), requests = [], timers = [];
  t.after(harness.cleanup); const window = { setInterval: fn => { timers.push(fn); return 1; }, addEventListener() {}, removeEventListener() {} };
  const { useManagerNoteAlerts } = load('lib/use-manager-note-alerts.ts', { react: harness.react, './use-refresh-on-resume': { useRefreshOnResume() {} }, './api': { fetchApi: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })) } }, { window, document: { visibilityState: 'visible' }, clearInterval() {} });
  let site = 'South Morang Hyundai'; const render = () => harness.render(() => useManagerNoteAlerts(site, 'rep'));
  render(); requests[0].resolve({ data: [{ _id: 'alert', lead_id: 'customer' }], pagination: { total: 1 } }); await settle();
  let result = render(); assert.equal(result.total, 1); assert.equal(result.items[0].lead_id, 'customer');
  site = 'Other'; result = render(); assert.equal(result.total, 0); assert.equal(requests[0].options.signal.aborted, true);
  requests[1].resolve({ data: [], pagination: { total: 0 } }); await settle();
  const read = result.read('alert'); assert.match(requests[2].url, /lead-alerts\/alert\/read\?rooftop=Other/); requests[2].resolve({ success: true }); await read;
  assert.equal(timers.length, 1);
});
