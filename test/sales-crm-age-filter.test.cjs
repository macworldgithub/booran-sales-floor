const { test } = require('node:test'), assert = require('node:assert/strict'), { readFileSync } = require('node:fs'), { join } = require('node:path'), ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
const load = (file, mocks = {}, bindings = {}) => {
  const filePath = join(__dirname, '..', file);
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(filePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', ...Object.keys(bindings), code)(id => mocks[id] || require(id), mod, mod.exports, ...Object.values(bindings));
  return mod.exports;
};
const text = node => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? '');

const defaultMocks = (harness, queryData = []) => ({
  react: harness.react,
  '@/lib/auth': { useAuth: () => ({ user: { role: 'sales_manager' } }) },
  '@/lib/api': { fetchApi: async () => ({ success: true, data: [] }) },
  '@/lib/crm-report': { crmQuery: () => '', exportCrmReport: () => {}, priorityLeads: () => {}, rateText: () => '' },
  '@/lib/use-refresh-on-resume': { useRefreshOnResume: () => {} },
  '@/lib/use-paginated-query': {
    usePaginatedQuery: () => ({
      data: queryData,
      pagination: { total: queryData.length, totalPages: 1 },
      isLoading: false,
      error: null,
      refresh() {},
    }),
  },
  '@/lib/use-dialog': { useDialog: () => ({ current: null }) },
  '@/components/ui/QueryStatus': { QueryStatus: () => null },
  '@/components/ui/Pagination': { Pagination: () => null },
  'lucide-react': new Proxy({}, { get: () => () => null }),
});

test('age helper formats minutes into days and hours correctly', () => {
  const harness = hookHarness();
  const { age } = load('components/views/SalesCrmDashboard.tsx', defaultMocks(harness));

  assert.equal(age(null), 'No recorded contact');
  assert.equal(age(45), '45m');
  assert.equal(age(90), '1h 30m');
  assert.equal(age(1018 * 1440 + 16 * 60), '1018d 16h');
});

test('SalesCrmDashboard removes actions and excludes leads over 60 days old from active priorities', () => {
  const harness = hookHarness();
  const freshRow = {
    lead: { _id: 'fresh-1', name: 'Fresh Customer', vehicle: 'Hyundai Kona', source: 'Web' },
    state: 'at_risk',
    reasons: [{ key: 'first_response_sla', text: 'First response SLA breached', next: 'Call now' }],
    intent: [],
    score: 90,
    suggestedNext: 'Call now',
    key: 'k1',
    handled: false,
    firstResponse: { targetMinutes: 15, internetGoalMinutes: 5, breached: true, ageMinutes: 30, dueAt: null },
    lastContactAt: null,
    minutesSinceContact: null,
    appointments: [],
    deals: [],
    signals: {},
  };
  const oldRow = {
    lead: { _id: 'old-1', name: 'Old Customer', vehicle: 'Hyundai Tucson', source: 'Web' },
    state: 'inactive',
    reasons: [],
    intent: [],
    score: 0,
    suggestedNext: '',
    key: 'k2',
    handled: true,
    firstResponse: { targetMinutes: 15, internetGoalMinutes: 5, breached: false, ageMinutes: 1018 * 1440, dueAt: null },
    lastContactAt: null,
    minutesSinceContact: null,
    appointments: [],
    deals: [],
    signals: {},
  };

  const mockWindow = {
    setInterval: () => 1,
    clearInterval: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const mockDocument = {
    visibilityState: 'visible',
    getElementById: () => null,
  };

  const { SalesCrmDashboard } = load('components/views/SalesCrmDashboard.tsx', defaultMocks(harness, [freshRow, oldRow]), {
    window: mockWindow,
    document: mockDocument,
  });

  const tree = harness.render(() => SalesCrmDashboard({
    rooftop: 'South Morang Hyundai',
    onOpenLead() {},
  }));

  const all = nodes(tree);
  const cards = all.filter(n => typeof n.type === 'function' && n.type.name === 'PriorityCard');
  assert.equal(cards.length, 1, 'Only fresh lead should be displayed in active priorities');
  assert.equal(cards[0].props.row.lead.name, 'Fresh Customer');
  assert.ok(!cards.some(c => c.props.row.lead.name === 'Old Customer'), 'Lead over 60 days is excluded from active priority cards');

  // Test PriorityCard rendering directly for active vs inactive leads
  const { PriorityCard } = load('components/views/SalesCrmDashboard.tsx', defaultMocks(harness), {
    window: mockWindow,
    document: mockDocument,
  });

  const freshCardTree = PriorityCard({
    row: freshRow,
    manager: true,
    table: false,
    onOpenLead() {},
    onSms() {},
    onAction() {},
  });
  const freshText = text(freshCardTree);
  assert.ok(freshText.includes('SLA breached'), 'Fresh row with breached SLA displays SLA breached');
  assert.ok(freshText.includes('Mark handled'), 'Fresh row displays Mark handled action');
  assert.ok(freshText.includes('Step in'), 'Fresh row displays Step in manager action');

  const oldCardTree = PriorityCard({
    row: oldRow,
    manager: true,
    table: false,
    onOpenLead() {},
    onSms() {},
    onAction() {},
  });
  const oldText = text(oldCardTree);
  assert.ok(!oldText.includes('SLA breached'), 'Inactive row must not display SLA breached');
  assert.ok(!oldText.includes('Mark handled'), 'Inactive row must not have Mark handled action');
  assert.ok(!oldText.includes('Step in'), 'Inactive row must not have Step in action');
  assert.ok(oldText.includes('Lead age over 60 days · inactive'), 'Inactive row shows inactive state explanation');
});
