const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

function load(filename, bindings = {}, mocks = {}) {
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const resolve = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/lib/')) return load(id.replace('@/', '') + '.ts', bindings, mocks);
    if (id.startsWith('./') && filename.startsWith('lib/')) return load('lib/' + id.slice(2) + '.ts', bindings, mocks);
    return require(id);
  };
  new Function('require', 'module', 'exports', ...Object.keys(bindings), compiled)(resolve, module, module.exports, ...Object.values(bindings));
  return module.exports;
}
test('local date inputs validate real calendar days and never throw for malformed input', () => {
  const { localDate, validLocalDate, localDayRange } = load('lib/dates.ts');
  assert.equal(localDate(new Date(2026, 9, 18, 0, 30)), '2026-10-18');
  assert.equal(validLocalDate('2024-02-29'), true);
  for (const input of ['', 'invalid', '2026-02-30', '2026-13-01', '10000-01-01']) {
    assert.equal(validLocalDate(input), false);
    assert.ok(Number.isFinite(Date.parse(localDayRange(input).from)));
  }
  const range = localDayRange('2026-10-18');
  assert.equal(range.from, new Date(2026, 9, 18).toISOString());
  assert.equal(range.to, new Date(2026, 9, 19).toISOString());
});
test('API failures cannot emit successful mutations or clear a newer session', async () => {
  const events = [];
  let resolveOld;
  let response = () => new Promise((resolve) => { resolveOld = resolve; });
  let url;
  const api = load('lib/api.ts', {
    fetch: async (endpoint) => { url = endpoint; return response(); },
    window: { dispatchEvent: (event) => events.push(event.type) }, console: { error() {} },
  });
  const old = api.fetchApi('/auth/me');
  api.advanceSessionGeneration();
  resolveOld(Response.json({ success: false, error: 'Expired' }, { status: 401 }));
  await assert.rejects(old, /Expired/);
  assert.deepEqual(events, []);
  for (const invalid of [{}, [], { success: 'true' }]) {
    response = () => Response.json(invalid);
    await assert.rejects(api.fetchApi('/leads', { method: 'POST' }), /invalid response/);
  }
  assert.deepEqual(events, []);
  response = () => Response.json({ success: false, error: 'Rejected' });
  await assert.rejects(api.fetchApi('/leads', { method: 'POST', body: '{}' }), /Rejected/);
  assert.deepEqual(events, []);
  response = () => Response.json({ success: true, data: {} });
  await api.leadApi.getLead('stock/id?fake=1');
  assert.equal(url, '/api/leads/stock%2Fid%3Ffake%3D1');
  response = () => Response.json({ success: false }, { status: 401 });
  await assert.rejects(api.fetchApi('/leads'));
  assert.deepEqual(events, ['booran:unauthorized']);
});

test('sold stock stays unavailable and expired holds become available in the UI', () => {
  const { vehicleStatus } = load('lib/vehicle-status.ts');
  assert.deepEqual(vehicleStatus({ status: 'Sold', softHold: { held: true } }), { label: 'Sold', held: false, available: false });
  assert.deepEqual(vehicleStatus({ status: 'In Transit' }), { label: 'In Transit', held: false, available: false });
  assert.deepEqual(vehicleStatus({ status: 'Soft Hold', softHold: { held: true, expiresAt: '2026-01-01T00:00:00Z' } }, Date.parse('2026-02-01')), { label: 'In Stock', held: false, available: true });
});

test('booking options exclude location groups and daylight-saving gaps cannot shift a booking silently', () => {
  const { specificDealerships } = load('lib/locations.ts');
  assert.deepEqual(specificDealerships(['All Locations', 'South Morang', 'BYD South Morang', 'South Morang Kia']), ['BYD South Morang', 'South Morang Kia']);
  const { appointmentTime } = load('lib/dates.ts');
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Australia/Melbourne';
    assert.throws(() => appointmentTime('2026-10-04', '02:30'), /daylight saving/);
    assert.equal(appointmentTime('2026-10-04', '03:30'), '2026-10-03T16:30:00.000Z');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('pagination ignores superseded results and hides the previous filter results immediately', async () => {
  const { hookHarness, fakeTimers } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), timers = fakeTimers(), window = new EventTarget();
  const { usePaginatedQuery } = load('lib/use-paginated-query.ts', { window, document: new EventTarget(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout }, { react: harness.react });
  const pending = [];
  const loader = (params, options) => new Promise((resolve) => pending.push({ params, options, resolve }));
  let query = { page: 1, limit: 20, status: 'new_lead' };
  const render = () => harness.render(() => usePaginatedQuery(loader, query, (page) => { query = { ...query, page }; }));
  render(); timers.run();
  query = { ...query, status: 'sold' };
  assert.deepEqual(render().data, []); timers.run();
  assert.equal(pending[0].options.signal.aborted, true);
  const response = (id) => ({ success: true, data: [{ id }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  pending[0].resolve(response('old'));
  await new Promise(setImmediate);
  assert.deepEqual(render().data, []);
  pending[1].resolve(response('current'));
  await new Promise(setImmediate);
  assert.deepEqual(render().data, [{ id: 'current' }]);
  window.dispatchEvent(new Event('booran:data-changed'));
  assert.deepEqual(render().data, []);
  assert.equal(render().isLoading, true);
  query = { ...query, status: 'lost' };
  assert.deepEqual(render().data, []);
  assert.equal(render().pagination.total, 0);
  harness.cleanup();
});

test('resume refresh uses the latest callback, ignores hidden tabs, and removes listeners on unmount', () => {
  const { hookHarness } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), window = new EventTarget(), document = new EventTarget();
  const { useRefreshOnResume } = load('lib/use-refresh-on-resume.ts', { window, document }, { react: harness.react });
  const calls = [];
  harness.render(() => useRefreshOnResume(() => calls.push('old')));
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(calls, []);
  harness.render(() => useRefreshOnResume(() => calls.push('current')));
  window.dispatchEvent(new Event('online'));
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(calls, ['current', 'current']);
  harness.cleanup(); window.dispatchEvent(new Event('online'));
  assert.equal(calls.length, 2);
});

test('search stays closed after Escape and shows action-only results and errors', async () => {
  const { hookHarness, nodes, fakeTimers } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), timers = fakeTimers();
  let resolve, reject, selected;
  const { Header } = load('components/layout/Header.tsx', { window: new EventTarget(), document: new EventTarget(), setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout }, {
    react: harness.react, '@/components/ui/BooranLogo': { BooranLogo: () => null }, '@/lib/auth': { useAuth: () => ({ user: { name: 'Manager' }, logout() {} }) },
    '@/lib/api': { unifiedApi: { search: () => new Promise((yes, no) => { resolve = yes; reject = no; }) } },
  });
  const props = { selectedRooftop: 'BYD South Morang', role: 'manager', onSelectAction: (action) => { selected = action; } };
  const render = () => harness.render(() => Header(props));
  let tree = render();
  const input = () => nodes(tree).find((node) => node.type === 'input');
  input().props.onChange({ target: { value: 'STOCK1' } });
  tree = render(); timers.run();
  input().props.onKeyDown({ key: 'Escape' });
  const action = { _id: 'action1', stockNumber: 'STOCK1', actionType: 'PRICE', reason: 'Review price', status: 'resolved' };
  resolve({ success: true, data: { leads: [], vehicles: [], actionItems: [action] } });
  await new Promise(setImmediate);
  tree = render();
  assert.ok(!nodes(tree).some((node) => node.props?.children === 'Review price'));
  input().props.onFocus(); tree = render();
  const actionButton = nodes(tree).find((node) => node.type === 'button' && nodes(node).some((child) => child.props?.children === 'STOCK1'));
  assert.ok(actionButton);
  actionButton.props.onClick(); assert.equal(selected, action);
  input().props.onChange({ target: { value: 'Another' } }); tree = render(); timers.run();
  reject(new Error('Search unavailable'));
  await new Promise(setImmediate);
  tree = render();
  assert.ok(nodes(tree).some((node) => node.props?.role === 'alert' && node.props.children === 'Search unavailable'));
  props.selectedRooftop = 'South Morang Kia'; tree = render();
  assert.ok(!nodes(tree).some((node) => node.props?.role === 'alert'));
  harness.cleanup();
});
test('PWA updates detect an already installing worker and reload only after local approval', async () => {
  const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), window = new EventTarget(), document = new EventTarget();
  let reloads = 0, message;
  window.location = { reload: () => { reloads += 1; } };
  const installing = new EventTarget();
  installing.state = 'installing';
  installing.postMessage = (value) => { message = value; };
  const registration = new EventTarget();
  registration.installing = installing;
  const worker = new EventTarget();
  worker.controller = {}; worker.register = async () => registration;
  const registrar = load('components/pwa/ServiceWorkerRegistrar.tsx', { navigator: { onLine: true, serviceWorker: worker }, process: { env: { NODE_ENV: 'production' } }, window, document }, { react: harness.react });
  const render = () => harness.render(() => registrar.default());
  render(); await new Promise(setImmediate);
  installing.state = 'installed';
  installing.dispatchEvent(new Event('statechange'));
  let tree = render();
  const button = nodes(tree).find((node) => node.type === 'button');
  assert.ok(button, 'An update in progress before registration resolved must be detected');
  assert.equal(reloads, 0);
  button.props.onClick();
  assert.deepEqual(message, { type: 'SKIP_WAITING' });
  worker.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 1);
  harness.cleanup();
});

test('an update accepted in another PWA tab preserves the current form until Reload is clicked', async () => {
  const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), window = new EventTarget(), document = new EventTarget();
  let reloads = 0;
  window.location = { reload: () => { reloads += 1; } };
  const worker = new EventTarget();
  worker.controller = null; worker.register = async () => new EventTarget();
  const registrar = load('components/pwa/ServiceWorkerRegistrar.tsx', { navigator: { onLine: true, serviceWorker: worker }, process: { env: { NODE_ENV: 'production' } }, window, document }, { react: harness.react });
  const render = () => harness.render(() => registrar.default());
  render(); await new Promise(setImmediate);
  worker.controller = {};
  worker.dispatchEvent(new Event('controllerchange')); // first install
  assert.equal(render(), null);
  worker.dispatchEvent(new Event('controllerchange')); // update from another tab
  assert.equal(reloads, 0);
  const button = nodes(render()).find((node) => node.type === 'button');
  assert.equal(button.props.children, 'Reload now');
  button.props.onClick();
  assert.equal(reloads, 1);
  harness.cleanup();
});

test('semantic theme colors resolve to valid CSS variables', () => {
  const config = require('../tailwind.config');
  const css = readFileSync('app/globals.css', 'utf8');
  function check(colors) {
    for (const color of Object.values(colors)) {
      if (typeof color === 'object') check(color);
      else if (color.includes('var(')) {
        assert.doesNotMatch(color, /hsl\(var/);
        assert.match(css, new RegExp(color.slice(4, -1) + ':\\s*(?:#|rgba?\\()'));
      }
    }
  }
  check(config.theme.extend.colors);
});
test('late session verification cannot overwrite a successful login', async () => {
  const React = require('react');
  const hooks = [];
  let index = 0;
  const effects = [];
  const hookReact = {
    ...React,
    useState(initial) { const i = index++; hooks[i] ||= { value: typeof initial === 'function' ? initial() : initial }; return [hooks[i].value, (next) => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }]; },
    useRef(initial) { const i = index++; hooks[i] ||= { value: { current: initial } }; return hooks[i].value; },
    useCallback(fn) { return fn; },
    useEffect(fn, dependencies) { const i = index++; const previous = hooks[i]; if (!previous || dependencies.some((value, n) => !Object.is(value, previous.dependencies[n]))) { effects.push(() => { previous?.cleanup?.(); hooks[i] = { dependencies, cleanup: fn() }; }); } },
  };
  let resolveInitial;
  const initial = new Promise((resolve) => { resolveInitial = resolve; });
  const user = { id: 'new-session', email: 'southmorang@booran.com', name: 'Manager', role: 'manager', site: 'South Morang', allowedSites: ['South Morang'] };
  const window = new EventTarget();
  window.setInterval = () => 0;
  const document = new EventTarget();
  const auth = load('lib/auth.tsx', { window, document, localStorage: { setItem() {} } }, {
    react: hookReact, '@/components/auth/LoginScreen': { LoginScreen: () => null },
    './api': { advanceSessionGeneration() {}, authApi: { me: () => initial, login: async () => ({ success: true, data: { user } }) }, leadApi: { getCrmRooftops: async () => ({ success: true, data: [{ name: 'BYD South Morang' }] }) }, inventoryApi: { getInventoryRooftops: async () => ({ success: true, data: [] }) } },
  });
  function render() { index = 0; const tree = auth.AuthProvider({ children: 'dashboard' }); while (effects.length) effects.shift()(); return tree; }
  let tree = render();
  await tree.props.value.login(user.email, '123456');
  resolveInitial({ success: true, data: { ...user, id: 'obsolete-session' } });
  await new Promise(setImmediate);
  tree = render();
  assert.equal(tree.props.value.user.id, 'new-session');
  assert.equal(tree.props.value.isLoading, false);
  window.dispatchEvent(new Event('booran:unauthorized'));
  tree = render();
  assert.equal(tree.props.value.isAuthenticated, false);
  for (const hook of hooks) hook?.cleanup?.();
});

test('permission changes remount protected content and hide the previous dealership directory', async () => {
  const { hookHarness } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), window = new EventTarget(), document = new EventTarget();
  document.visibilityState = 'visible';
  let verify;
  window.setInterval = (callback) => { verify = callback; return 0; };
  let user = { id: 'same-user', email: 'devs@omnisuiteai.com', name: 'User', role: 'super_admin', site: 'All Locations', allowedSites: ['*'] };
  const rooftops = async () => ({ success: true, data: [{ name: user.role === 'super_admin' ? 'Booran Cheltenham' : 'BYD South Morang' }] });
  const { AuthProvider } = load('lib/auth.tsx', { window, document }, { react: harness.react, '@/components/auth/LoginScreen': { LoginScreen: () => null }, './api': { advanceSessionGeneration() {}, authApi: { me: async () => ({ success: true, data: user }) }, leadApi: { getCrmRooftops: rooftops }, inventoryApi: { getInventoryRooftops: rooftops } } });
  const render = () => harness.render(() => AuthProvider({ children: 'protected' }));
  render(); await new Promise(setImmediate);
  let tree = render(); await new Promise(setImmediate); tree = render();
  const oldKey = tree.props.children.key;
  assert.deepEqual(tree.props.value.locations, ['Booran Cheltenham']);
  user = { ...user, role: 'manager', site: 'South Morang', allowedSites: ['South Morang'] };
  await verify();
  tree = render();
  assert.notEqual(tree.props.children.key, oldKey);
  assert.deepEqual(tree.props.value.locations, []);
  await new Promise(setImmediate); tree = render();
  assert.deepEqual(tree.props.value.locations, ['BYD South Morang']);
  harness.cleanup();
});

test('late lead and vehicle updates cannot reopen closed dialogs or replace another selection', () => {
  const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), window = new EventTarget();
  window.location = { href: 'https://floor.test/' };
  window.setInterval = () => 0;
  const mocks = { react: harness.react, '@/lib/auth': { useAuth: () => ({ user: { role: 'manager' } }) } };
  for (const name of ['layout/Sidebar', 'layout/Header', 'layout/MobileNav', 'layout/BottomNav', 'views/TodayView', 'views/LeadsView', 'views/InventoryView', 'views/ActionItemsView', 'views/CalendarView', 'views/RooftopsView', 'views/StaffView', 'views/FeedLogsView', 'modals/Customer360Modal', 'modals/VehicleDetailModal', 'modals/AddProspectModal', 'modals/BookTestDriveModal', 'modals/NotificationCenterModal']) {
    mocks[`@/components/${name}`] = { [name.split('/').at(-1)]: () => null };
  }
  const pending = () => new Promise(() => {});
  mocks['@/lib/api'] = { leadApi: { getLeads: pending }, inventoryApi: { getVehicles: pending, getActionItems: pending }, appointmentApi: { getAppointments: pending }, unifiedApi: { getSummary: pending } };
  const App = load('app/page.tsx', { window, document: new EventTarget() }, mocks).default;
  const render = () => harness.render(() => App());
  let tree = render();
  const find = (name) => nodes(tree).find((node) => node.type === mocks[`@/components/${name}`][name.split('/').at(-1)]);
  for (const [entity, modal, updated] of [['Lead', 'modals/Customer360Modal', 'onLeadUpdated'], ['Vehicle', 'modals/VehicleDetailModal', 'onVehicleUpdated']]) {
    find('layout/Header').props[`onSelect${entity}`]({ _id: 'first' }); tree = render();
    const previous = find(modal).props;
    previous.onClose(); previous[updated]({ _id: 'first', status: 'changed' }); tree = render();
    assert.equal(find(modal).props.isOpen, false);
    find('layout/Header').props[`onSelect${entity}`]({ _id: 'second' });
    previous[updated]({ _id: 'first', status: 'changed' }); tree = render();
    assert.equal(find(modal).props[entity.toLowerCase()]._id, 'second');
  }
  harness.cleanup();
});

test('a hidden mobile drawer cannot take Escape handling from a visible dialog', () => {
  const { hookHarness } = require('./helpers/hook-harness.cjs');
  const harness = hookHarness(), document = new EventTarget();
  let closed = false;
  const dialog = { querySelectorAll: () => [], getClientRects: () => [1], focus() {}, contains: () => true };
  const hiddenDrawer = { getClientRects: () => [] };
  document.querySelectorAll = () => [dialog, hiddenDrawer];
  const { useDialog } = load('lib/use-dialog.ts', { document }, { react: harness.react });
  harness.render(() => { const ref = useDialog(true, () => { closed = true; }); ref.current = dialog; });
  document.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
  assert.equal(closed, true);
  harness.cleanup();
});
