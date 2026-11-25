const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');

const load = (file, mocks = {}) => {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), mod, mod.exports);
  return mod.exports;
};

const text = node => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? '');

test('Customer360Modal renders Profile/History/Business tabs cleanly and switches lazily', () => {
  const noop = () => null;
  const harness = hookHarness();
  const MockHistory = () => null;
  const MockBusiness = () => null;

  const { Customer360Modal } = load('components/modals/Customer360Modal.tsx', {
    react: harness.react,
    'lucide-react': new Proxy({}, { get: () => noop }),
    '@/lib/auth': { useAuth: () => ({ user: { id: 'u1', name: 'Kris', role: 'sales_manager', canAllocate: true } }) },
    '@/lib/use-dialog': { useDialog: () => ({ current: null }) },
    '@/lib/api': { leadApi: {} },
    '@/components/customer/EngagementIndicator': { EngagementIndicator: noop },
    '@/components/customer/CustomerMessages': { CustomerMessages: noop },
    '@/components/customer/CustomerPhoneEditor': { CustomerPhoneEditor: noop },
    '@/components/customer/CustomerEmailEditor': { CustomerEmailEditor: noop },
    '@/components/customer/CustomerMerge': { CustomerMerge: noop },
    '@/components/customer/LeadAssignment': { LeadAssignment: noop },
    '@/components/customer/LostLeadReview': { LostLeadReview: noop },
    '@/components/customer/LeadFollowUp': { LeadFollowUp: noop },
    '@/components/customer/WorkflowHistory': { WorkflowHistory: noop },
    '@/components/customer/DealWorkflowActions': { DealWorkflowActions: noop },
    '@/components/customer/ConnexLeadActions': { ConnexLeadActions: noop },
    '@/components/customer/CustomerConsent': { CustomerConsent: noop },
    '@/components/customer/CustomerActivityFeed': { CustomerActivityFeed: noop },
    '@/components/customer/CustomerHistoryTab': { CustomerHistoryTab: MockHistory },
    '@/components/customer/CustomerBusinessTab': { CustomerBusinessTab: MockBusiness },
  });

  const lead = { _id: 'lead-999', name: 'Colin Beruld', status: 'following_up', dealership: 'South Morang Hyundai', source: 'Nextgate', owner_id: 'rep-1' };
  const renderModal = () => Customer360Modal({ lead, isOpen: true, onClose() {} });

  let tree = harness.render(renderModal);
  const tabs = nodes(tree).filter(n => n.props?.role === 'tab');
  assert.deepEqual(tabs.map(t => text(t).trim()), ['Profile', 'History', 'Business']);
  assert.equal(tabs[0].props['aria-selected'], true);
  assert.equal(nodes(tree).some(n => n.type === MockHistory), false, 'History tab should not mount on initial Profile view');
  assert.equal(nodes(tree).some(n => n.type === MockBusiness), false, 'Business tab should not mount on initial Profile view');

  // Switch to History tab
  tabs[1].props.onClick();
  tree = harness.render(renderModal);
  assert.equal(nodes(tree).filter(n => n.props?.role === 'tab')[1].props['aria-selected'], true);
  assert.equal(nodes(tree).some(n => n.type === MockHistory), true, 'History tab mounts when selected');
  assert.equal(nodes(tree).some(n => n.type === MockBusiness), false);

  // Switch to Business tab
  nodes(tree).filter(n => n.props?.role === 'tab')[2].props.onClick();
  tree = harness.render(renderModal);
  assert.equal(nodes(tree).filter(n => n.props?.role === 'tab')[2].props['aria-selected'], true);
  assert.equal(nodes(tree).some(n => n.type === MockBusiness), true, 'Business tab mounts when selected');
  assert.equal(nodes(tree).some(n => n.type === MockHistory), false);

  harness.cleanup();
});

test('CustomerHistoryTab fetches history on mount and displays lifetime metrics and deals', async () => {
  const noop = () => null;
  const harness = hookHarness();
  const payload = {
    summary: { totalVehiclesPurchased: 2, totalDeals: 2, lifetimeSpendCents: 7574000, pricedPurchasesCount: 2, lastPurchaseDate: '2024-06-12T00:00:00Z', customerPurchasesCount: 2, businessPurchasesCount: 0 },
    items: [
      { id: 'd1', origin: 'deal', scope: 'customer', buyerName: 'Colin Beruld', businessName: null, vehicle: '2023 Hyundai Tucson Elite', make: 'Hyundai', model: 'Tucson', year: 2023, vin: 'KMHJ3812MPU123456', stockNumber: 'ST100', dealNumber: 'D1', purchaseDate: '2024-06-12T00:00:00Z', deliveryDate: null, salePriceCents: 4899000, salesperson: 'James Carter', status: 'Completed', statusRaw: 'completed', appraisalId: null, leadId: 'lead-1' },
    ],
    hasLinkedBusiness: false,
    linkedBusinesses: [],
    appraisalsCount: 0,
    deliveriesCount: 0,
    notesCount: 0,
    serviceBookings: [],
  };

  const { CustomerHistoryTab } = load('components/customer/CustomerHistoryTab.tsx', {
    react: harness.react,
    'lucide-react': new Proxy({}, { get: () => noop }),
    '@/lib/auth': { useAuth: () => ({ user: { id: 'u1', name: 'Kris' } }) },
    '@/lib/api': { leadApi: { getHistory: () => Promise.resolve({ success: true, data: payload }) } },
    './WorkflowHistory': { WorkflowHistory: noop },
    './CustomerActivityFeed': { CustomerActivityFeed: noop },
  });

  const lead = { _id: 'lead-1', name: 'Colin Beruld', status: 'sold', dealership: 'South Morang Hyundai' };
  harness.render(() => CustomerHistoryTab({ lead }));
  await new Promise(resolve => setTimeout(resolve, 0));
  const tree = harness.render(() => CustomerHistoryTab({ lead }));
  const content = text(tree);
  assert.ok(content.includes('Lifetime value summary'));
  assert.ok(content.includes('$75,740'));
  assert.ok(content.includes('2023 Hyundai Tucson Elite'));
  assert.ok(content.includes('James Carter'));
  harness.cleanup();
});
