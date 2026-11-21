const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ts=require('typescript');
const {hookHarness,nodes}=require('./helpers/hook-harness.cjs');
const {renderToStaticMarkup}=require('react-dom/server');
test('daily tracker remains visible with complete and missing coverage, correct owners, due dates and customer navigation',t=>{
 const harness=hookHarness();t.after(()=>harness.cleanup());const queries=[],opened=[],loader=()=>{},rows=[
  {id:'done',name:'Covered fixture',dealership:'South Morang Hyundai',ownerName:'Fixture salesperson',createdToday:false,allocatedToday:true,coverage:{videosSent:true,nextActionsSet:true},followUpDue:'2026-11-22T01:00:00Z'},
  {id:'missing',name:'Pending fixture',dealership:'South Morang Hyundai',ownerName:'Unassigned',createdToday:true,allocatedToday:false,coverage:{videosSent:false,nextActionsSet:false},followUpDue:null},
 ];
 const module={exports:{}},output=ts.transpileModule(readFileSync('components/views/DailyNewTracking.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mocks={react:harness.react,'@/lib/daily-traffic':{trafficApi:{customers:loader}},'@/lib/use-paginated-query':{usePaginatedQuery(fn,params){assert.equal(fn,loader);queries.push(params);return {data:rows,pagination:{total:2},isLoading:false,error:null};}},'@/components/ui/QueryStatus':{QueryStatus:()=>null},'@/components/ui/Pagination':{Pagination:()=>null}};
 new Function('require','module','exports',output)(id=>mocks[id]||require(id),module,module.exports);
 const tree=harness.render(()=>module.exports.DailyNewTracking({rooftop:'South Morang Hyundai',date:'2026-11-21',summary:{newCustomers:2,coverage:{videosSent:1,nextActionsSet:1}},revision:3,busy:false,onOpen:id=>opened.push(id)}));
 assert.equal(tree.props['aria-label'],'Daily New Tracking Indicator');assert.deepEqual(nodes(tree).filter(node=>node.type==='th').map(node=>node.props.children),['Customer','Trigger','Salesperson','Video Sent?','Next Follow-up Set?','Action']);
 assert.deepEqual(queries[0],{rooftop:'South Morang Hyundai',date:'2026-11-21',page:1,limit:10,revision:3});
 const html=renderToStaticMarkup(tree);for(const text of ['Covered fixture','Pending fixture','Fixture salesperson','Unassigned','Allocated Today','Created Today','Sent','Missing','Due:'])assert.ok(html.includes(text),text);
 nodes(tree).find(node=>node.type==='button'&&node.props.children==='Open').props.onClick();assert.deepEqual(opened,['done']);
});
