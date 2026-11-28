const { test } = require('node:test'), assert = require('node:assert/strict'), { readFileSync } = require('node:fs'), ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
const load = (file, mocks = {}, bindings = {}) => {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', ...Object.keys(bindings), code)(id => mocks[id] || require(id), mod, mod.exports, ...Object.values(bindings));
  return mod.exports;
};
const text = node => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? '');

test('Sidebar renames Leads Centre to Customer 360 and uses newLeadsCount for notification badge', () => {
  const harness = hookHarness();
  const { Sidebar } = load('components/layout/Sidebar.tsx', {
    react: harness.react,
    '@/lib/auth': { useAuth: () => ({ user: { role: 'admin', site: 'South Morang Hyundai' } }) },
    '@/lib/navigation': { canOpenTab: () => true },
    '@/components/ui/BooranLogo': { BooranLogo: () => null },
    '@/components/ui/RooftopOptions': { RooftopOptions: () => null },
  });

  // When newLeadsCount is 5 and total leadsCount is 11301:
  let tree = harness.render(() => Sidebar({
    activeTab: 'today',
    setActiveTab() {},
    role: 'admin',
    leadsCount: 11301,
    newLeadsCount: 5,
    selectedRooftop: 'All Locations',
    setSelectedRooftop() {},
  }));

  const allNodes = nodes(tree);
  const buttons = allNodes.filter(n => n.type === 'button');
  const customer360Btn = buttons.find(b => text(b).includes('Customer 360'));
  assert.ok(customer360Btn, 'Customer 360 nav item exists');
  assert.ok(!text(customer360Btn).includes('11,301'), 'Badge should not be total client records (11,301)');
  assert.ok(text(customer360Btn).includes('5'), 'Badge must show newLeadsCount (5)');

  // When newLeadsCount is 0:
  tree = harness.render(() => Sidebar({
    activeTab: 'today',
    setActiveTab() {},
    role: 'admin',
    leadsCount: 11301,
    newLeadsCount: 0,
    selectedRooftop: 'All Locations',
    setSelectedRooftop() {},
  }));
  const customer360BtnZero = nodes(tree).filter(n => n.type === 'button').find(b => text(b).includes('Customer 360'));
  assert.equal(text(customer360BtnZero).trim(), 'Customer 360', 'No notification badge when newLeadsCount is 0');
  harness.cleanup();
});

test('getLeadAssignmentHighlight identifies unassigned new leads and Connex leads assisted to Mark', () => {
  const { getLeadAssignmentHighlight } = load('components/views/LeadsView.tsx', {
    '@/components/customer/VirtualYardCsvUpload': { VirtualYardCsvUpload: () => null },
    react: { useState: () => [null, () => {}], useEffect() {}, useCallback: fn => fn },
    '@/lib/auth': { useAuth: () => ({ user: null }) },
    '@/lib/use-paginated-query': { usePaginatedQuery: () => ({ data: [], pagination: {} }) },
    '@/lib/api': { leadApi: {} },
    '@/components/ui/QueryStatus': { QueryStatus: () => null },
    '@/components/ui/Pagination': { Pagination: () => null },
    '@/components/ui/RooftopOptions': { RooftopOptions: () => null },
    '@/components/customer/EngagementIndicator': { EngagementIndicator: () => null },
    '@/components/customer/LeadAssignment': { LeadAssignment: () => null },
    '@/components/customer/BulkLeadAssignment': { BulkLeadAssignment: () => null },
    '@/lib/use-dialog': { useDialog: () => ({}) },
    '@/lib/lead-sources': { leadSources: [] },
  });

  // 1. Unassigned new lead
  const unassignedNew = getLeadAssignmentHighlight({
    _id: '1',
    status: 'new_lead',
    owner_name: 'Unassigned',
    owner_id: null,
  });
  assert.ok(unassignedNew);
  assert.equal(unassignedNew.type, 'unassigned_new');
  assert.equal(unassignedNew.label, 'New · Needs Assignment');

  // 2. Unassigned existing lead in following_up
  const unassignedFollowup = getLeadAssignmentHighlight({
    _id: '2',
    status: 'following_up',
    owner_name: 'Unassigned',
    owner_id: null,
  });
  assert.ok(unassignedFollowup);
  assert.equal(unassignedFollowup.type, 'unassigned');
  assert.equal(unassignedFollowup.label, 'Awaiting Assignment');

  // 3. Connex lead system assisted to Mark Robinson
  const connexMark = getLeadAssignmentHighlight({
    _id: '3',
    status: 'new_lead',
    source: 'Connex',
    deal_id: 'CONNEX-006TJ000014M6qLYAS',
    owner_name: 'Mark Robinson',
    owner_id: 'mark123',
  });
  assert.ok(connexMark);
  assert.equal(connexMark.type, 'connex_mark');
  assert.equal(connexMark.label, 'Connex · System Assisted to Mark');

  // 4. Connex lead with deal_id prefix assisted to Mark
  const connexPrefix = getLeadAssignmentHighlight({
    _id: '4',
    status: 'following_up',
    deal_id: 'CONNEX-12345',
    owner_name: 'Mark',
    owner_id: 'mark123',
  });
  assert.ok(connexPrefix);
  assert.equal(connexPrefix.type, 'connex_mark');

  // 5. Assigned lead to regular consultant is not flagged
  const regularAssigned = getLeadAssignmentHighlight({
    _id: '5',
    status: 'new_lead',
    owner_name: 'Paul Smith',
    owner_id: 'paul456',
  });
  assert.equal(regularAssigned, null);

  // 6. Sold or lost leads are not flagged
  const soldLead = getLeadAssignmentHighlight({
    _id: '6',
    status: 'sold',
    owner_name: 'Unassigned',
  });
  assert.equal(soldLead, null);
});

test('Customer360Modal uses unique React keys across all direct sibling sections so re-renders never duplicate CustomerDetails', () => {
  const noop = () => null;
  const harness = hookHarness();
  const { Customer360Modal } = load('components/modals/Customer360Modal.tsx', {
    react: harness.react,
    'lucide-react': new Proxy({}, { get: () => noop }),
    '@/lib/auth': { useAuth: () => ({ user: { id: 'u1', name: 'Manager', role: 'sales_manager', canAllocate: true } }) },
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
    '@/components/customer/CustomerHistoryTab': { CustomerHistoryTab: noop },
    '@/components/customer/CustomerBusinessTab': { CustomerBusinessTab: noop },
    '@/components/customer/VirtualYardSourceDetails': { VirtualYardSourceDetails: noop },
  });

  const lead = { _id: 'lead-123', name: 'Test Lead', status: 'new_lead', dealership: 'South Morang Hyundai', source: 'Nextgate', owner_id: 'rep-1' };
  const tree = harness.render(() => Customer360Modal({ lead, isOpen: true, onClose() {} }));
  const body = nodes(tree).find(n => typeof n.props?.className === 'string' && n.props.className.includes('overflow-y-auto'));
  assert.ok(body, 'Customer360Modal body container exists');
  const keys = (Array.isArray(body.props.children) ? body.props.children : [body.props.children])
    .filter(child => child && typeof child === 'object' && child.key != null)
    .map(child => child.key);
  assert.ok(keys.includes('details-lead-123'));
  assert.ok(keys.includes('assign-lead-123'));
  assert.equal(new Set(keys).size, keys.length, `Duplicate React sibling keys found: ${keys.join(', ')}`);
  harness.cleanup();
});
