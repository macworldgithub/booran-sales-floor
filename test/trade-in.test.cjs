const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const ts=require('typescript');
function load(file,bindings={}) {
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}},names=Object.keys(bindings);
  new Function('require','module','exports',...names,code)(id=>id==='./api'?{fetchApi(){throw Error('Public form used authenticated helper');}}:require(id),mod,mod.exports,...names.map(key=>bindings[key]));
  return mod.exports;
}
test('public trade helper preserves binary photos and reports errors without using the session helper',async()=>{
  const calls=[];
  const api=load('lib/trade-in.ts',{fetch:async(url,options)=>{calls.push({url,options});return Response.json({success:true,data:{next_offset:4}});}});
  const photo=new Blob([new Uint8Array([255,0,128,10])]);
  await api.customerTradeRequest('signed.token','/photos/id/content?offset=0',{method:'PUT',body:photo});
  assert.equal(calls[0].url,'/api/public/trade-ins/signed.token/photos/id/content?offset=0');
  assert.equal(calls[0].options.headers['Content-Type'],'application/octet-stream');
  assert.equal(calls[0].options.body,photo);assert.equal(calls[0].options.cache,'no-store');
  const failed=load('lib/trade-in.ts',{fetch:async()=>Response.json({success:false,error:'Invitation expired'},{status:410})});
  await assert.rejects(()=>failed.customerTradeRequest('token'),/Invitation expired/);
});
test('public trade photo upload survives the web proxy as binary and rejects an unrelated origin',async()=>{
  let sent;
  const proxy=load('app/api/[...path]/route.ts',{fetch:async(url,options)=>{sent={url,options};return Response.json({success:true,data:{next_offset:4}});}});
  const request=new Request('https://web.test/api/public/trade-ins/token/photos/id/content?offset=0',{method:'PUT',headers:{origin:'https://web.test','content-type':'application/octet-stream'},body:new Uint8Array([255,0,128,10])});
  request.nextUrl=new URL(request.url);
  const response=await proxy.PUT(request,{params:Promise.resolve({path:['public','trade-ins','token','photos','id','content']})});
  assert.equal(response.status,200);
  assert.equal(sent.options.headers.get('Content-Type'),'application/octet-stream');
  assert.deepEqual([...new Uint8Array(sent.options.body)],[255,0,128,10]);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  const wrong=new Request(request.url,{method:'PUT',headers:{origin:'https://other.test'}});
  wrong.nextUrl=new URL(wrong.url);
  assert.equal((await proxy.PUT(wrong,{params:Promise.resolve({path:[]})})).status,403);
});
