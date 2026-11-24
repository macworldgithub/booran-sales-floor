const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');

const load = (file, mocks = {}) => {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    id => mocks[id] || require(id),
    mod,
    mod.exports
  );
  return mod.exports;
};

const text = node => (Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : String(node ?? ''));

test('VehicleLookup supports rego and VIN mode and displays NEVDIS risk badges', async t => {
  const harness = hookHarness();
  t.after(harness.cleanup);

  const apiCalls = [];
  let apiResponse = {
    data: {
      rego: 'TEST01',
      state: 'VIC',
      vin: '6T9P01V97PANA4001',
      make: 'FORD',
      model: 'TEST',
      year: 2023,
      bodyType: 'SEDAN',
      colour: 'WHITE',
      registration: { status: 'REGISTERED', expiryDate: '2027-03-13' },
      riskFlags: { isStolen: false, isWrittenOff: false },
      source: 'InfoAgent NEVDIS',
      warnings: [],
    },
  };

  const results = [];
  const { VehicleLookup } = load('components/customer/VehicleLookup.tsx', {
    react: harness.react,
    '@/lib/api': {
      fetchApi: async url => {
        apiCalls.push(url);
        return apiResponse;
      },
    },
  });

  const render = () =>
    harness.render(() =>
      VehicleLookup({
        rooftop: 'South Morang Hyundai',
        onResult: val => results.push(val),
      })
    );

  let tree = render();

  // Check buttons for mode toggle
  const buttons = nodes(tree).filter(n => n.type === 'button');
  const regoBtn = buttons.find(b => text(b).includes('By Rego'));
  const vinBtn = buttons.find(b => text(b).includes('By VIN'));
  assert.ok(regoBtn);
  assert.ok(vinBtn);

  // Set Rego input
  const regoInput = nodes(tree).find(n => n.type === 'input');
  regoInput.props.onChange({ target: { value: 'TEST01' } });

  tree = render();

  // Click lookup button
  const lookupBtn = nodes(tree).find(b => b.type === 'button' && text(b).includes('Look up Plate'));
  assert.ok(lookupBtn);
  await lookupBtn.props.onClick();

  tree = render();

  assert.equal(apiCalls.length, 1);
  assert.match(apiCalls[0], /rego=TEST01/);
  assert.match(apiCalls[0], /state=VIC/);
  assert.match(apiCalls[0], /rooftop=South\+Morang\+Hyundai/);
  assert.equal(results.length, 1);
  assert.equal(results[0].vin, '6T9P01V97PANA4001');

  // Verify rendered vehicle details and badges
  const renderedText = text(tree);
  assert.match(renderedText, /2023 FORD TEST/);
  assert.match(renderedText, /REGISTERED/);
  assert.match(renderedText, /2027-03-13/);
  assert.match(renderedText, /No Police \/ WOVR records/);

  // Switch to VIN mode
  vinBtn.props.onClick();
  tree = render();

  const vinInput = nodes(tree).find(n => n.type === 'input');
  vinInput.props.onChange({ target: { value: '6T9P01V97PANA4001' } });

  tree = render();
  const vinLookupBtn = nodes(tree).find(b => b.type === 'button' && text(b).includes('Look up VIN'));
  assert.ok(vinLookupBtn);

  // Test risky vehicle
  apiResponse = {
    data: {
      rego: 'STOLEN1',
      state: 'NSW',
      vin: '6T9P01V97PANA4001',
      make: 'TOYOTA',
      model: 'RAV4',
      year: 2021,
      registration: { status: 'EXPIRED', expiryDate: '2023-01-01' },
      riskFlags: { isStolen: true, isWrittenOff: true },
      source: 'InfoAgent NEVDIS',
      warnings: ['POLICE STOLEN ALERT: Vehicle reported stolen'],
    },
  };

  await vinLookupBtn.props.onClick();
  tree = render();

  assert.equal(apiCalls.length, 2);
  assert.match(apiCalls[1], /vin=6T9P01V97PANA4001/);

  const riskyText = text(tree);
  assert.match(riskyText, /REPORTED STOLEN/);
  assert.match(riskyText, /WRITTEN OFF \(WOVR\)/);
  assert.match(riskyText, /POLICE STOLEN ALERT/);
});
