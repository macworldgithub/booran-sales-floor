const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ts=require('typescript');
const {hookHarness,nodes}=require('./helpers/hook-harness.cjs');
function load(file,mocks={},bindings={}){const mod={exports:{}},source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','module','exports',...Object.keys(bindings),source)(id=>mocks[id]||require(id),mod,mod.exports,...Object.values(bindings));return mod.exports;}
const fields=['customersUpdated','videosAdded','videosSent','nextActionsSet','tasksCompleted','sales'];
const progress={newCustomers:2,fullyCovered:1,coveragePercent:50,coverageSignal:'amber',targets:Object.fromEntries(fields.slice(0,5).map(key=>[key,2])),coverage:Object.fromEntries(fields.slice(0,5).map(key=>[key,1])),signals:Object.fromEntries(fields.map(key=>[key,key==='sales'?'grey':'amber'])),counts:Object.fromEntries(fields.map(key=>[key,3]))};

test('daily metric cards and salesperson columns use exactly the four requested headings',()=>{
 const {trafficColumns}=load('lib/daily-traffic.ts',{'./api':{}});
 assert.deepEqual(trafficColumns,[['diaryItems','Diary Items'],['nextActionsSet','Next Action Set'],['lost','Lost'],['sales','Sold']]);
});
test('daily traffic CSV exports coverage and activity separately and protects formula cells',async()=>{
 let blob,filename;const helpers=load('lib/daily-traffic.ts',{'./api':{}},{URL:{createObjectURL:value=>{blob=value;return 'blob:test';},revokeObjectURL(){}},document:{createElement:()=>({set download(value){filename=value;},click(){}})},setTimeout:fn=>fn()});
 helpers.exportDailyTraffic({date:'2026-11-20',computedAt:'2026-11-20T01:00:00Z',timezone:'Australia/Melbourne',summary:progress,members:[{name:'=BAD("formula")',...progress}],priorities:{unassigned:1,overdue:2,approvals:{total:3}},definitions:{coverage:'Video + follow-up'},privateCustomer:{phone:'0412345678'}},'South Morang');
 const csv=await blob.text();assert.match(csv,/'=BAD\(""formula""\)/);assert.match(csv,/Diary Items activity/);assert.match(csv,/Next Action Set coverage/);assert.match(csv,/Sold activity/);assert.match(csv,/Lost activity/);assert.doesNotMatch(csv,/Videos sent activity/);assert.match(csv,/Not applicable|No target/);assert.doesNotMatch(csv,/0412345678/);assert.ok(csv.includes('\r\n'));assert.equal(filename,'daily-pulse-traffic-2026-11-20.csv');
});
test('daily traffic hides old date results immediately, aborts stale requests and restricts manager queues by role',async t=>{
 const saved={window:global.window,document:global.document};global.window={setInterval:()=>1,addEventListener(){},removeEventListener(){}};global.document={visibilityState:'visible'};
 const harness=hookHarness();t.after(()=>{harness.cleanup();Object.assign(global,saved);});let role='manager',requests=[];
 const api=load('lib/daily-traffic.ts',{'./api':{}}),summary={date:'2026-11-20',today:'2026-11-20',computedAt:'2026-11-20T01:00:00Z',summary:progress,members:[{id:'alice',name:'Alice',events:[],...progress}],priorities:{unassigned:4,overdue:2,approvals:{total:0,loss:0,dates:0,merges:0,consent:0}},definitions:{}};
 const mocks={react:harness.react,'@/lib/auth':{useAuth:()=>({user:{id:'alice',role}})},'@/lib/api':{},'@/lib/daily-traffic':{...api,trafficApi:{summary:(params,options)=>new Promise(resolve=>requests.push({params,options,resolve}))}},'@/lib/use-refresh-on-resume':{useRefreshOnResume(){}},'@/lib/use-paginated-query':{},'@/lib/use-dialog':{},'@/components/ui/QueryStatus':{QueryStatus:()=>null},'@/components/ui/Pagination':{},'@/components/customer/LeadAssignment':{},'@/components/customer/ManagerApprovals':{},'./DailyIntegrationTools':{}};
 const {DailyTrafficDashboard}=load('components/views/DailyTrafficDashboard.tsx',mocks),render=()=>harness.render(()=>DailyTrafficDashboard({rooftop:'South Morang',onOpenLead(){}}));
 render();requests[0].resolve({data:summary});await new Promise(resolve=>setImmediate(resolve));let tree=render();
 assert.ok(nodes(tree).some(node=>node.props?.label==='Unassigned'));assert.ok(nodes(tree).some(node=>node.props?.children==='Export Daily PULSE / Traffic'));
 const headers=nodes(tree).filter(node=>node.type==='th'&&node.props.scope==='col').map(node=>node.props.children);
 assert.deepEqual(headers,['Salesperson / daily coverage','Diary Items','Next Action Set','Lost','Sold']);
 const summaryCards=nodes(tree).find(node=>node.type==='section'&&node.props['aria-label']==='Team daily metrics');
 assert.deepEqual(nodes(summaryCards).filter(node=>node.type?.name==='TrafficMetricButton').map(node=>node.props.metric),['diaryItems','nextActionsSet','lost','sales']);
 nodes(tree).find(node=>node.type==='input'&&node.props.type==='date').props.onChange({target:{value:'2026-11-19'}});tree=render();assert.ok(!nodes(tree).some(node=>node.props?.label==='Unassigned'));assert.equal(requests[0].options.signal.aborted,true);
 requests[1].resolve({data:{...summary,date:'2026-11-19'}});await new Promise(resolve=>setImmediate(resolve));render();role='sales_consultant';render();requests.at(-1).resolve({data:summary});await new Promise(resolve=>setImmediate(resolve));tree=render();
 assert.ok(!nodes(tree).some(node=>node.props?.label==='Unassigned'||node.props?.label==='Pending approvals'));assert.ok(!nodes(tree).some(node=>node.props?.children==='Export Daily PULSE / Traffic'));
 role='contractor';assert.equal(render(),null);
});
