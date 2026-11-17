const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','module','exports',code)(id=>mocks[id]||require(id),module,module.exports);return module.exports;}
const text=node=>Array.isArray(node)?node.map(text).join(' '):node?.props?text(node.props.children):String(node??'');
const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];
test('engagement explains the specified scores, omits icons for neutral and hides inactive prospects',()=>{
 const {EngagementIndicator}=load('components/customer/EngagementIndicator.tsx');
 const signals=[{key:'sms',score:3,reason:'Customer replied',metrics:{outboundCount:2,replyCount:1,responseRate:50,medianResponseMinutes:30,repliesWithin24Hours:1}}];
 const base={score:3,state:'buying',label:'Close to Buying',computedAt:'2026-11-17T01:00:00Z',signals};
 let tree=EngagementIndicator({engagement:base});assert.match(text(tree),/Close to Buying/);assert.match(text(tree),/50%/);assert.match(text(tree),/30 min/);assert.match(text(tree),/within 24h/);assert.ok(nodes(tree).find(n=>n.props?.title)?.props.title.includes('+3'));
 tree=EngagementIndicator({engagement:{...base,state:'neutral',score:2,label:'Neutral'}});assert.equal(nodes(tree).filter(n=>n.props?.['aria-hidden']).length,0);
 assert.equal(EngagementIndicator({engagement:base,active:false}),null);assert.equal(EngagementIndicator({engagement:null}),null);
});
test('holding cost breakdown shows exact interest and paid lead charges without converting missing cost to zero',()=>{
 const {HoldingCostValue,HoldingCostDetails}=load('components/customer/HoldingCost.tsx');
 const vehicle={accumulatedHoldingCost:435,holdingCostBreakdown:{vehicleCost:36500,daysInStock:30,floorplanCost:225,carsalesLeads:2,driveLeads:1,carsalesRate:80,driveRate:50,carsalesCost:160,driveCost:50,total:435,leadCharges:210,warnings:[],segments:[{source:'Carsales',type:'Web enquiry',count:2}],leadDataCheckedAt:'2026-11-17T01:00:00Z'}};
 assert.match(text(HoldingCostValue({vehicle})),/435.00/);const view=text(HoldingCostDetails({vehicle}));assert.match(view,/7.5%/);assert.match(view,/225.00/);assert.match(view,/160.00/);assert.match(view,/50.00/);assert.match(view,/exclude GST/);assert.match(view,/Web enquiry/);
 assert.equal(text(HoldingCostValue({vehicle:{accumulatedHoldingCost:null}})),'Incomplete');assert.equal(text(HoldingCostValue({vehicle:{}})),'—');
});
