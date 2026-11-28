const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');

test('Virtual Yard upload checks files, starts importing automatically and resumes an interrupted import', async () => {
  const harness = hookHarness();
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync('components/customer/VirtualYardCsvUpload.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  let applied = 0;
  let refreshed = 0;
  const mocks = {
    react: harness.react,
    '@/lib/auth': { useAuth: () => ({ user: { role: 'manager', site: 'South Morang', allowedSites: ['South Morang'] }, locations: [] }) },
    '@/lib/api': { async fetchApi(path) {
      if (path.includes('file=bad.csv')) throw new Error('Unexpected columns.');
      if (path.includes('file=good.csv')) return { data: { id: 'job-1', type: 'lead', file: 'good.csv', rows: 101,
        ready: 101, existing: 0, duplicates: 0, issues: 0, examples: [] } };
      assert.match(path, /job-1\/apply$/);
      applied++;
      if (applied === 2) throw new Error('The request took too long.');
      return { data: { processed: applied === 1 ? 100 : 101, total: 101, done: applied === 3,
        result: { inserted: applied === 1 ? 100 : 101, updated: 0, unchanged: 0, skipped: 0 } } };
    } },
  };
  new Function('require', 'module', 'exports', 'window', compiled)(
    id => mocks[id] || require(id), module, module.exports, { dispatchEvent: () => refreshed++ },
  );
  const view = () => harness.render(() => module.exports.VirtualYardCsvUpload({ rooftop: 'BYD South Morang' }));
  const buttons = tree => nodes(tree).filter(node => node.type === 'button');
  const text = value => Array.isArray(value) ? value.map(text).join('') : value?.props ? text(value.props.children) : String(value ?? '');
  const totals = tree => nodes(tree).find(node => node.props?.['aria-label'] === 'CSV file totals');
  const click = async (tree, label) => {
    buttons(tree).find(button => button.props.children === label).props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    return view();
  };
  const input = nodes(view()).find(node => node.type === 'input');
  const select = files => input.props.onChange({ target: { files } });
  const limit = 4 * 1024 * 1024;
  const maximum = Array.from({ length: 16 }, (_, i) => ({ name: `upload-${i}.csv`, size: limit }));
  select(maximum);
  assert.equal(buttons(view())[0].props.disabled, false);
  select([...maximum, { name: 'extra.csv', size: 1 }]);
  assert.equal(buttons(view())[0].props.disabled, true);
  select([{ name: 'large.csv', size: limit + 1 }]);
  assert.equal(buttons(view())[0].props.disabled, true);
  input.props.onChange({ target: { files: [new File(['bad'], 'bad.csv'), new File(['good'], 'good.csv')] } });
  let tree = await click(view(), 'Check and import files');
  assert.ok(nodes(tree).find(node => node.props?.['aria-label'] === 'Files that need review'));
  assert.match(text(totals(tree)), /Files checked successfully1 of 2Files imported0 of 1 readyFiles that failed checks1/);
  assert.equal(applied, 2, 'The first click automatically starts import after the file checks');
  assert.equal(buttons(tree).some(button => button.props.children === 'Apply import'), false);
  assert.ok(nodes(tree).find(node => node.props?.role === 'alert'));
  tree = await click(tree, 'Resume import');
  assert.equal(applied, 3);
  assert.equal(refreshed, 2);
  assert.ok(nodes(tree).some(node => node.props?.children === 'Import complete'));
  assert.match(text(totals(tree)), /Files imported1 of 1 ready/);
  const records = nodes(tree).find(node => node.props?.['aria-label'] === 'Record totals for this file');
  assert.match(text(records), /Inserted 101Updated 0/);
});
