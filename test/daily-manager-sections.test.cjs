const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ts=require('typescript');
const {hookHarness,nodes}=require('./helpers/hook-harness.cjs');
test('manager approvals disclose one review form at a time and retain one merge queue on refresh',async t=>{
 const harness=hookHarness();t.after(()=>harness.cleanup());
 const requests=['one','two'].map(id=>({kind:'followup',lead:{_id:id,name:id,owner_name:'Alice'},review:{id,title:'Later call',requested_name:'Alice'}}));
 const Merge=()=>null,mocks={react:harness.react,'@/lib/crm-updates':{crmApi:{approvals:async()=>({data:{requests,merges:[],limit:200}})}},'@/lib/api':{},'./LostLeadReview':{LostLeadReview:()=>null},'./ManagerMergeRequests':{ManagerMergeRequests:Merge}};
 const mod={exports:{}},source=ts.transpileModule(readFileSync('components/customer/ManagerApprovals.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',source)(id=>mocks[id]||require(id),mod,mod.exports);
 const render=()=>harness.render(()=>mod.exports.ManagerApprovals({rooftop:'South Morang',revision:1,onOpenLead(){}}));render();await new Promise(resolve=>setImmediate(resolve));let tree=render();
 assert.equal(nodes(tree).filter(node=>node.type==='textarea').length,0);
 let summaries=nodes(tree).filter(node=>node.props?.['aria-expanded']!==undefined);summaries[0].props.onClick();tree=render();assert.equal(nodes(tree).filter(node=>node.type==='textarea').length,1);
 summaries=nodes(tree).filter(node=>node.props?.['aria-expanded']!==undefined);summaries[1].props.onClick();tree=render();assert.equal(nodes(tree).filter(node=>node.type==='textarea').length,1);assert.equal(nodes(tree).filter(node=>node.props?.['aria-expanded']===true).length,1);
 for(let i=0;i<12;i++){nodes(tree).find(node=>node.type==='button'&&node.props.children==='Refresh approvals').props.onClick();tree=render();await new Promise(resolve=>setImmediate(resolve));tree=render();assert.equal(nodes(tree).filter(node=>node.type===Merge).length,1);}
});
