const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ts=require('typescript');
const {hookHarness,nodes}=require('./helpers/hook-harness.cjs');
function load(file,mocks={},bindings={}) {
 const output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,module={exports:{}};
 new Function('require','module','exports',...Object.keys(bindings),output)(id=>Object.hasOwn(mocks,id)?mocks[id]:require(id),module,module.exports,...Object.values(bindings));return module.exports;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const settings={widgets:['sales','inventory','benchmark','service'],customKpis:[],serviceTargets:{}};
const fixture=site=>({sites:[site],availableSites:[site],computedAt:'2026-11-20T00:00:00Z',timezone:'Australia/Melbourne',range:{first:'2026-11-01',last:'2026-11-20',today:'2026-11-20'},settings,modules:[],
 sales:{units:7,target:10,financialCoverage:100},inventory:{units:10,hotModels:[]},service:{csiResponses:0,records:0,bookings:0,health:'unknown',departments:[]},alerts:[],customKpis:[],sources:[],definitions:{},benchmarks:[]});

test('DP navigation and API filters preserve management access and explicit site/date scope',async()=>{
 const {canOpenTab}=load('lib/navigation.ts');
 for(const role of ['dealer_principal','general_manager','sales_manager','manager','super_admin'])assert.equal(canOpenTab('dp',role),true);
 for(const role of ['sales_consultant','contractor'])assert.equal(canOpenTab('dp',role),false);
 const calls=[],{dpApi}=load('lib/dp-dashboard.ts',{'./api':{fetchApi:async(...args)=>{calls.push(args);return {success:true};}}});
 const signal=new AbortController().signal;await dpApi.summary({rooftop:'Site A',period:'custom',from:'2026-01-01',to:'2026-11-20'},{signal});
 const url=new URL(calls[0][0],'https://fixture.test');assert.equal(url.searchParams.get('rooftop'),'Site A');assert.equal(url.searchParams.get('from'),'2026-01-01');assert.equal(calls[0][1].signal,signal);
});

test('changing a DP financial scope hides prior results and ignores a late response after revoking management access',async t=>{
 const harness=hookHarness();t.after(()=>harness.cleanup());let user={id:'dp',role:'dealer_principal',site:'Site A',allowedSites:['Site A','Site B']},rooftop='Site A';const pending=[];
 const empty=()=>null,modules=Object.fromEntries(['DpSales','DpInventory','DpBenchmark','DpService','DpKpi','DpHealth'].map(name=>[name,empty]));
 const {DealerPrincipalDashboard}=load('components/dp/DealerPrincipalDashboard.tsx',{
  react:harness.react,'@/lib/auth':{useAuth:()=>({user})},'@/lib/api':{},'@/lib/dp-dashboard':{dpApi:{summary:(params,options)=>new Promise(resolve=>pending.push({params,options,resolve}))},dpNumber:String,dpMoney:String},
  '@/lib/use-refresh-on-resume':{useRefreshOnResume(){}},'@/lib/use-paginated-query':{},'@/lib/use-dialog':{},'@/components/ui/QueryStatus':{QueryStatus:empty},'@/components/ui/Pagination':{},
  './DpModules':modules,'./DpControls':{DpSettingsForm:empty,DpServiceForm:empty},
 },{window:{setInterval:()=>1,addEventListener(){},removeEventListener(){}},clearInterval(){},document:{visibilityState:'visible'}});
 const render=()=>harness.render(()=>DealerPrincipalDashboard({rooftop,onRooftopChange(){},onOpenLead(){},onOpenVehicle(){}}));render();pending[0].resolve({data:fixture('Site A')});await tick();let tree=render();
 assert.ok(nodes(tree).some(node=>node.props?.['aria-label']==='DP group headline KPIs'));
 rooftop='Site B';tree=render();assert.equal(pending[0].options.signal.aborted,true);assert.ok(!nodes(tree).some(node=>node.props?.['aria-label']==='DP group headline KPIs'));
 user={...user,role:'sales_consultant'};assert.equal(render(),null);assert.equal(pending[1].options.signal.aborted,true);pending[1].resolve({data:fixture('Site B')});await tick();assert.equal(render(),null);assert.equal(pending.length,2);
});

test('service form preserves retry identity and revision after a lost response, validates sample pairs and saves weighted totals',async t=>{
 const harness=hookHarness();t.after(()=>harness.cleanup());const saves=[];let attempt=0;
 const blank={dealership:'Site A',date:'2026-11-20',department:'Service',revision:0};
 const fields=['csiPoints','csiResponses','claimsOpened','claimsClosed','claimCycleHours','claimCycleSamples','productiveHours','availableHours','repairHours','repairs','revenueCents','retainedCustomers','eligibleCustomers'];for(const field of fields)blank[field]=null;
 const {DpServiceForm}=load('components/dp/DpControls.tsx',{
  react:harness.react,'@/lib/dp-dashboard':{serviceFields:fields,dpApi:{entry:async()=>({data:blank}),saveEntry:async input=>{saves.push(input);if(++attempt===1)throw Error('Response lost');return {data:{...input,revision:1}};}}},'./DpModules':{},
 });const render=()=>harness.render(()=>DpServiceForm({data:fixture('Site A'),onSaved(){}}));render();await tick();let tree=render();
 const change=(label,value)=>{nodes(tree).find(node=>node.type==='input'&&node.props['aria-label']===label).props.onChange({target:{value}});tree=render();};
 change('CSI average score (0–100)','90');await nodes(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});tree=render();assert.equal(saves.length,0);assert.ok(nodes(tree).some(node=>node.props?.role==='alert'));
 change('CSI response count','10');change('Service revenue (AUD)','250.25');change('Average claim cycle (days)','2');change('Claims in cycle-time sample','3');
 await nodes(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});tree=render();await nodes(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});tree=render();
 assert.equal(saves.length,2);assert.equal(saves[0].requestId,saves[1].requestId);assert.equal(saves[1].revision,0);assert.equal(saves[1].csiPoints,900);assert.equal(saves[1].revenueCents,25025);assert.equal(saves[1].claimCycleHours,144);
 assert.ok(nodes(tree).some(node=>node.props?.role==='status'&&node.props.children==='Service measurements saved.'));
});

test('CSV exports quote spreadsheet formulas and keep unavailable financial values distinct from zero',async()=>{
 let blob,clicked=false;const report=fixture('=SUM(1,1)');report.benchmarks=[{site:'=SUM(1,1)',units:0,grossCents:null,stockValueCents:0,serviceRevenueCents:null}];
 const {exportDpReport}=load('lib/dp-dashboard.ts',{'./api':{}},{URL:{createObjectURL:value=>{blob=value;return 'blob:fixture';},revokeObjectURL(){}},document:{createElement:()=>({click(){clicked=true;}})},setTimeout:callback=>callback()});
 exportDpReport(report);const csv=await blob.text();assert.equal(clicked,true);assert.match(csv,/'=SUM\(1,1\)/);assert.match(csv,/Unavailable/);assert.match(csv,/,"0",/);
});
