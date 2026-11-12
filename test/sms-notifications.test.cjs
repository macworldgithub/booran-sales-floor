const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
function load(file, mocks) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} }; new Function('require', 'module', 'exports', compiled)(id => mocks[id] || require(id), module, module.exports); return module.exports;
}
const tick = () => new Promise(setImmediate);

test('reply polling rejects stale rooftop responses and keeps read operations scoped', async t => {
  const harness = hookHarness(), saved = { window: global.window, document: global.document }, pending = [], reads = []; let poll;
  global.window = { setInterval(fn) { poll = fn; return 1; }, addEventListener() {}, removeEventListener() {} }; global.document = { visibilityState: 'visible' };
  t.after(() => { harness.cleanup(); global.window = saved.window; global.document = saved.document; });
  const { useSmsNotifications } = load('lib/use-sms-notifications.ts', { react: harness.react,
    './use-refresh-on-resume': { useRefreshOnResume() {} }, './sms-notifications': { smsNotificationsApi: {
      list: (site, page, unread, signal) => new Promise(resolve => pending.push({ site, page, unread, signal, resolve })),
      read: async (id, site) => reads.push({ id, site }), readAll: async site => reads.push({ all: true, site }),
    } } });
  let site = 'South Morang Hyundai'; const render = () => harness.render(() => useSmsNotifications(site, true));
  const feed = count => ({ data: { items: [], unreadCount: count }, pagination: { totalPages: 1 } });
  render(); pending[0].resolve(feed(2)); await tick(); let state = render(); assert.equal(state.feed.unreadCount, 2);
  poll(); render(); const old = pending.at(-1);
  site = 'South Morang Kia'; state = render(); assert.equal(state.feed, null); assert.equal(old.signal.aborted, true);
  old.resolve(feed(99)); pending.at(-1).resolve(feed(1)); await tick(); state = render(); assert.equal(state.feed.unreadCount, 1);
  await state.read('reply'); await state.readAll(); assert.deepEqual(reads, [{ id: 'reply', site }, { all: true, site }]);
  state.setUnreadOnly(false); render(); assert.equal(pending.at(-1).unread, false);
});

test('notification cards show real reply previews and open the selected conversation with unread/read controls', async t => {
  const harness = hookHarness(); t.after(() => harness.cleanup());
  const { NotificationCenterModal } = load('components/modals/NotificationCenterModal.tsx', { react: harness.react, '@/lib/use-dialog': { useDialog() { return { current: null }; } } });
  const opened = [], reply = { id: 'reply', leadId: 'customer', customer: 'Synthetic customer', dealership: 'South Morang Hyundai', body: '<script>plain reply</script>', createdAt: '2026-11-12T00:00:00Z', read: false };
  let all = 0, unread = true;
  const props = { isOpen: true, summary: null, onClose() {}, onNavigateTab() {}, sms: { items: [reply], unreadCount: 1 },
    onOpenReply: async row => opened.push(row.leadId), onReadAll: async () => { all++; }, onUnreadOnlyChange: value => { unread = value; } };
  const render = () => harness.render(() => NotificationCenterModal(props));
  const text = node => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? '');
  let tree = render(); assert.match(text(tree), /SMS replies\s+\(1 unread\)/); assert.match(text(tree), /<script>plain reply<\/script>/);
  assert.ok(!nodes(tree).some(node => node.props?.dangerouslySetInnerHTML));
  await nodes(tree).find(node => node.type === 'button' && text(node).includes('Open conversation')).props.onClick();
  assert.deepEqual(opened, ['customer']); tree = render();
  await nodes(tree).find(node => node.type === 'button' && text(node) === 'Mark all SMS replies read').props.onClick(); assert.equal(all, 1);
  nodes(tree).find(node => node.type === 'input').props.onChange({ target: { checked: false } }); assert.equal(unread, false);
});
