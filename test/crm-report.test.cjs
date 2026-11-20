const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),ts=require('typescript');
function load(bindings={}){
 const mod={exports:{}},source=ts.transpileModule(readFileSync('lib/crm-report.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',...Object.keys(bindings),source)(()=>({fetchApi:async()=>({success:true})}),mod,mod.exports,...Object.values(bindings));return mod.exports;
}
test('CRM export protects formula cells, preserves missing values and excludes customer contact details',async()=>{
 let blob,filename,clicked=false;
 const helpers=load({URL:{createObjectURL:value=>{blob=value;return 'blob:test';},revokeObjectURL(){}},document:{createElement:()=>({set download(value){filename=value;},click(){clicked=true;}})},setTimeout:fn=>{fn();return 1;}});
 const empty={numerator:0,denominator:0,value:null};
 const metrics={leads:0,firstResponse:{medianMinutes:null},contactRate:empty,appointmentRate:empty,showRate:empty,closeRate:empty,conversion:empty};
 helpers.exportCrmReport({computedAt:'2026-11-20T01:00:00Z',window:{from:'2026-11-19T13:00:00Z',asOf:'2026-11-20T01:00:00Z',timezone:'Australia/Melbourne'},metrics,engagement:{videoMessages:0},stages:[],daily:[],definitions:{contact:'Successful contact only.'},customer:{name:'Private customer',phone:'+61499918523'}},'=HYPERLINK("bad")');
 const csv=await blob.text();assert.match(csv,/'=HYPERLINK\(""bad""\)/);assert.match(csv,/Unavailable/);assert.doesNotMatch(csv,/Private customer|61499918523/);assert.equal(filename,'booran-pulse-report.csv');assert.equal(clicked,true);
 assert.equal(helpers.rateText(empty),'—');assert.equal(helpers.rateText({numerator:0,denominator:2,value:0}),'0%');
});
