const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

// Exercise the actual control handlers and inspect their outgoing API parameters.
// Hooks use a synchronous harness; browser layout is outside these wiring tests.
function mountView(filename, name) {
  let cursor = 0;
  const state = [];
  let params;
  let tree;
  const props = {
    selectedRooftop: 'All Locations',
    leads: [], vehicles: [], actionItems: [], appointments: [],
    isOpen: true, summary: null,
    onClose() {}, onNavigateTab() {},
    onRooftopChange: (value) => { props.selectedRooftop = value; },
    onSelectLead() {}, onSelectVehicle() {}, onOpenBookDrive() {}, onOpenAddProspect() {},
  };
  const RooftopOptions = () => null;
  const Pagination = () => null;
  const hookReact = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (next) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useEffect() {}, useCallback: (callback) => callback,
  };
  const mocks = {
    react: hookReact,
    '@/lib/auth': { useAuth: () => ({ user: { role: 'manager', site: 'South Morang' }, locations: ['BYD South Morang', 'South Morang Hyundai'] }) },
    '@/lib/vehicle-status': { vehicleStatus: () => ({ label: 'In Stock', held: false, available: true }) },
    '@/lib/use-dialog': { useDialog: () => ({ current: null }) },
    '@/components/ui/MetricCard': { MetricCard: () => null },
    '@/components/ui/RooftopOptions': { RooftopOptions },
    '@/components/ui/Pagination': { Pagination },
    '@/components/ui/QueryStatus': { QueryStatus: () => null },
    '@/lib/api': { leadApi: { getLeads() {} }, inventoryApi: { getVehicles() {}, getActionItems() {} } },
    '@/lib/use-paginated-query': { usePaginatedQuery(loader, query) {
      params = query;
      return { data: [], pagination: { total: 0, totalPages: 0 }, isLoading: false, error: null, refresh() {} };
    } },
  };
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((id) => id in mocks ? mocks[id] : require(id), module, module.exports);
  const Component = module.exports[name];
  function render() { cursor = 0; tree = Component(props); return params; }
  function nodes(node) {
    if (arguments.length === 0) node = tree;
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child));
    return [node, ...nodes(node.props?.children)];
  }
  function find(predicate) {
    const result = nodes().find(predicate);
    assert.ok(result, 'Expected control was rendered');
    return result;
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join('');
    return typeof node === 'string' || typeof node === 'number' ? String(node) : node?.props ? text(node.props.children) : '';
  }
  return { render, find, nodes, text, Pagination, RooftopOptions };
}

for (const [filename, name, sort] of [
  ['LeadsView.tsx', 'LeadsView', 'customer_name:asc'],
  ['InventoryView.tsx', 'InventoryView', 'totalStockCost:desc'],
  ['ActionItemsView.tsx', 'ActionItemsView', 'actionType:asc'],
]) {
  test(`${name}: dealership and sort controls send the correct query and reset pagination`, () => {
    const view = mountView(path.join('components', 'views', filename), name);
    view.render();
    const dealership = view.find((node) => node.type === 'select' && node.props['aria-label'] === 'Dealership');
    assert.ok(view.nodes(dealership.props.children).some((node) => node.type === view.RooftopOptions), 'Dealership must use authorised location options');
    const sortSelect = view.find((node) => node.type === 'select' && node.props.value?.includes(':'));
    const sortOptions = view.nodes(sortSelect.props.children).filter((node) => node.type === 'option');
    assert.ok(sortOptions.length >= 2);
    assert.ok(sortOptions.some((node) => node.props.value === sort));
    assert.ok(sortOptions.every((node) => /^[a-zA-Z][a-zA-Z0-9_]*:(asc|desc)$/.test(node.props.value)), 'Sort choices must be sort fields, not dealerships');

    view.find((node) => node.type === view.Pagination).props.onPageChange(3);
    assert.equal(view.render().page, 3);
    dealership.props.onChange({ target: { value: 'South Morang Hyundai' } });
    let query = view.render();
    assert.equal(query[name === 'LeadsView' ? 'dealership' : 'rooftop'], 'South Morang Hyundai');
    assert.equal(query.page, 1);
    sortSelect.props.onChange({ target: { value: sort } });
    query = view.render();
    assert.equal(query.sortBy, sort.split(':')[0]);
    assert.equal(query.sortOrder, sort.split(':')[1]);
    assert.equal(query[name === 'LeadsView' ? 'dealership' : 'rooftop'], 'South Morang Hyundai');

    view.find((node) => node.type === 'input' && node.props['aria-label'] === 'Search results').props.onChange({ target: { value: '  test stock  ' } });
    assert.equal(view.render().search, 'test stock');
    view.find((node) => node.type === 'button' && view.text(node) === 'Reset filters').props.onClick();
    query = view.render();
    assert.equal(query.search, '');
    assert.equal(query[name === 'LeadsView' ? 'dealership' : 'rooftop'], 'all');
    assert.equal(query.page, 1);
  });
}

test('inventory category and aging controls preserve the selected dealership', () => {
  const view = mountView('components/views/InventoryView.tsx', 'InventoryView');
  view.render();
  view.find((node) => node.type === 'select' && node.props['aria-label'] === 'Dealership').props.onChange({ target: { value: 'South Morang Hyundai' } });
  view.render();
  view.find((node) => node.type === 'select' && node.props['aria-label'] === 'Vehicle category').props.onChange({ target: { value: 'Used' } });
  view.render();
  view.find((node) => node.type === 'button' && view.text(node) === '90+ Days (Capital Trap)').props.onClick();
  const query = view.render();
  assert.equal(query.rooftop, 'South Morang Hyundai');
  assert.equal(query.category, 'Used');
  assert.equal(query.agingBucket, '90+');
});

test('lead and action status controls preserve rooftop and send the chosen status', () => {
  for (const [name, filename, label, expected] of [['LeadsView', 'LeadsView.tsx', 'Sold Deals', 'sold'], ['ActionItemsView', 'ActionItemsView.tsx', 'All', 'all']]) {
    const view = mountView(`components/views/${filename}`, name);
    view.render();
    view.find((node) => node.type === 'select' && node.props['aria-label'] === 'Dealership').props.onChange({ target: { value: 'South Morang Hyundai' } });
    view.render();
    view.find((node) => node.type === 'button' && view.text(node) === label).props.onClick();
    const query = view.render();
    assert.equal(query.status, expected);
    assert.equal(query[name === 'LeadsView' ? 'dealership' : 'rooftop'], 'South Morang Hyundai');
  }
});

test('South Morang dashboard contains only authorised network locations', () => {
  const view = mountView('components/views/TodayView.tsx', 'TodayView');
  view.render();
  const renderedText = view.nodes().map((node) => typeof node.type === 'string' ? view.text(node) : '').join(' ');
  assert.ok(renderedText.includes('BYD South Morang'));
  assert.ok(renderedText.includes('South Morang Hyundai'));
  for (const forbidden of ['Booran Cheltenham', 'Cranbourne Hyundai', 'Berwick MG', 'Across 4 Victorian rooftops']) assert.equal(renderedText.includes(forbidden), false);
});

test('notifications show no fabricated group counts or sample customers', () => {
  const view = mountView('components/modals/NotificationCenterModal.tsx', 'NotificationCenterModal');
  view.render();
  const renderedText = view.nodes().map((node) => typeof node.type === 'string' ? view.text(node) : '').join(' ');
  assert.equal(renderedText.includes('2,477'), false);
  assert.equal(renderedText.includes('640 vehicles'), false);
  assert.equal(renderedText.includes('Cameron Bale'), false);
});

test('action transfer and in-progress filters can be combined', () => {
  const view = mountView('components/views/ActionItemsView.tsx', 'ActionItemsView');
  view.render();
  view.find((node) => node.type === 'button' && view.text(node) === 'Transfers').props.onClick();
  view.render();
  view.find((node) => node.type === 'button' && view.text(node) === 'In progress').props.onClick();
  const query = view.render();
  assert.equal(query.actionType, 'TRANSFER');
  assert.equal(query.status, 'in_progress');
});
