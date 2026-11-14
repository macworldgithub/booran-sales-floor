const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes } = require('./helpers/hook-harness.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(t, overrides = {}) {
  const harness = hookHarness(); t.after(() => harness.cleanup());
  const filter = {view:'all',search:'',stage:'',type:'',salesperson:'',from:'',to:'',sort:'newest'};
  const record = {recordId:'006TJ000013YBI9YAO',leadId:'fixture-lead',snapshot:{opportunityName:'Fixture reference',name:'Fixture customer',type:'Finance',stage:'Distributed',url:'https://connex-hmca.my.site.com/HMCADealerCommunity/s/opportunity/006TJ000013YBI9YAO'}};
  const status = {configured:true,writesEnabled:true,running:true,phase:'reading_details',recovering:true,error:'Previous timeout',records:1,imported:1,mergeReviews:0,pendingDetails:0,masked:1,failedPulls:0,staff:[],jobs:[]};
  const calls = [], api = {status:async()=>({data:status}),records:async f=>{calls.push(f);return{data:[record],pagination:{total:1,totalPages:1},facets:{types:['Finance'],salespeople:['Unassigned']}};},views:async()=>({data:{views:[],pinnedId:''}}),options:async()=>({data:{statuses:['Distributed','Accepted'],lostReasons:['LMS Lost']}}),...overrides};
  const mocks = {react:harness.react,'@/lib/connex':{connexApi:api,emptyFilters:filter,pendingJob:()=>false},'@/lib/api':{leadApi:{}},'./ConnexPreferences':{ConnexPreferences:()=>null,ConnexHolidayCalendar:()=>null}};
  const compiled = ts.transpileModule(readFileSync('components/customer/ConnexIntegration.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};new Function('require','module','exports','window',compiled)(id=>mocks[id]||require(id),mod,mod.exports,{setInterval(){return 1;},clearInterval(){}});
  const render = () => harness.render(()=>mod.exports.ConnexIntegration({rooftop:'South Morang Hyundai',revision:0,onOpenLead(){}}));
  return {render,calls,record,status};
}
test('Connex filters hide old rows while a new source query loads and show recovery without a false connected label', async t => {
  const {render,calls}=setup(t);render();await tick();let tree=render();
  const text=node=>Array.isArray(node)?node.map(text).join(' '):node?.props?text(node.props.children):String(node??'');
  assert.match(text(tree),/Retrying the previous interruption/); assert.match(text(tree),/Reading customer details/);
  nodes(tree).find(node=>node.props?.['aria-label']==='Connex view').props.onChange({target:{value:'open'}});
  tree=render();assert.equal(nodes(tree).filter(node=>node.type==='article').length,0);
  await tick();tree=render();assert.equal(calls.at(-1).view,'open');assert.equal(nodes(tree).filter(node=>node.type==='article').length,1);
});

test('a status timeout preserves loaded enquiries and provides a retry that recovers independently', async t => {
  let fail = true, attempts = 0;
  const {render,status}=setup(t,{status:async()=>{attempts++;if(fail)throw new Error('The request took too long. Please retry.');return {data:status};}});
  render();await tick();let tree=render();
  assert.equal(nodes(tree).filter(node=>node.type==='article').length,1);
  const retry=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Retry loading Connex');assert.ok(retry);
  fail=false;retry.props.onClick();render();await tick();tree=render();
  assert.equal(attempts,2);assert.equal(nodes(tree).filter(node=>node.type==='article').length,1);
  assert.ok(!nodes(tree).some(node=>node.type==='button'&&node.props.children==='Retry loading Connex'));
});

test('an enquiry timeout preserves successful status and filtering does not refetch status', async t => {
  let attempts=0;
  const {render,status}=setup(t,{status:async()=>{attempts++;return{data:status};},records:async()=>{throw new Error('Temporary read failure');}});
  render();await tick();let tree=render();
  const text=node=>Array.isArray(node)?node.map(text).join(' '):node?.props?text(node.props.children):String(node??'');
  assert.match(text(tree),/1\s+enquiries/);assert.match(text(tree),/Connex enquiries:.*Temporary read failure/);
  nodes(tree).find(node=>node.props?.['aria-label']==='Connex view').props.onChange({target:{value:'open'}});
  render();await tick();render();assert.equal(attempts,1);
});
test('lost bulk response retains selection and request identity until the queue result is confirmed', async t => {
  const attempts=[];let failed=true;
  const {render}=setup(t,{bulk:async input=>{attempts.push(input);if(failed)throw new Error('Connection interrupted');return{data:{jobs:[{id:'queued'}],errors:[]}};}});
  render();await tick();let tree=render();nodes(tree).find(node=>node.props?.['aria-label']==='Select Fixture reference').props.onChange({target:{checked:true}});tree=render();
  const update=()=>nodes(tree).find(node=>node.type==='button'&&Array.isArray(node.props.children)&&node.props.children[0]==='Queue update for ');
  await update().props.onClick();tree=render();assert.equal(nodes(tree).find(node=>node.props?.['aria-label']==='Select Fixture reference').props.checked,true);
  failed=false;await update().props.onClick();tree=render();assert.equal(attempts.length,2);assert.equal(attempts[0].requestId,attempts[1].requestId);assert.equal(nodes(tree).find(node=>node.props?.['aria-label']==='Select Fixture reference').props.checked,false);
});
