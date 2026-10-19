const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');

function mount(updateLead, lead = { _id: 'lead-1', phone: '' }, disabled = false) {
  const harness = hookHarness(), busy = [], updates = [];
  const props = { lead, disabled, onUpdated(updated) { updates.push(updated); props.lead = updated; }, onEditingChange(value) { busy.push(value); } };
  const compiled = ts.transpileModule(readFileSync('components/customer/CustomerPhoneEditor.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const mocks = { react: harness.react, '@/lib/api': { leadApi: { updateLead } } };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((id) => mocks[id] || require(id), module, module.exports);
  let tree;
  const render = () => { tree = harness.render(() => module.exports.CustomerPhoneEditor(props)); return tree; };
  const find = (predicate) => { const result = nodes(tree).find(predicate); assert.ok(result, 'Expected phone control'); return result; };
  const text = (node) => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' ? node : node?.props ? text(node.props.children) : '';
  return { render, find, text, busy, updates, cleanup: harness.cleanup };
}

test('a missing customer number can be added and the saved lead updates immediately', async () => {
  let call;
  const view = mount(async (id, input) => { call = { id, input }; return { data: { _id: id, phone: '+61412345678' } }; });
  view.render();
  view.find((node) => node.type === 'button' && view.text(node) === 'Add number').props.onClick();
  view.render();
  view.find((node) => node.type === 'input').props.onChange({ target: { value: '0412 345 678' } });
  view.render();
  await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  view.render();
  assert.deepEqual(call, { id: 'lead-1', input: { customer_phone: '0412 345 678' } });
  assert.equal(view.updates[0].phone, '+61412345678');
  assert.deepEqual(view.busy, [true, false]);
  assert.ok(view.find((node) => node.type === 'p' && view.text(node) === '+61412345678'));
  assert.ok(view.find((node) => node.type === 'button' && view.text(node) === 'Edit number'));
  view.cleanup();
});

test('invalid numbers preserve the edited draft and show an error; cancel restores the saved number', async () => {
  const view = mount(async () => { throw new Error('Enter a valid Australian mobile number.'); }, { _id: 'lead-1', phone: '+61412345678' });
  view.render(); view.find((node) => node.type === 'button').props.onClick(); view.render();
  view.find((node) => node.type === 'input').props.onChange({ target: { value: 'incorrect' } }); view.render();
  await view.find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} }); view.render();
  assert.equal(view.find((node) => node.type === 'input').props.value, 'incorrect');
  assert.match(view.text(view.find((node) => node.props.role === 'alert')), /valid Australian mobile/);
  view.find((node) => node.type === 'button' && view.text(node) === 'Cancel').props.onClick(); view.render();
  assert.ok(view.find((node) => node.type === 'p' && view.text(node) === '+61412345678'));
  assert.equal(view.updates.length, 0);
  view.cleanup();
});

test('phone editing is unavailable while a message send is being confirmed', () => {
  const view = mount(async () => { throw new Error('Must not save'); }, { _id: 'lead-1', phone: '+61412345678' }, true);
  view.render();
  assert.equal(view.find((node) => node.type === 'button').props.disabled, true);
  view.cleanup();
});
