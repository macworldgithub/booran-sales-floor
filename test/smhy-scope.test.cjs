const {test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),{readFileSync}=require('node:fs');
const {hookHarness,nodes}=require('./helpers/hook-harness.cjs');
const tick=()=>new Promise(setImmediate);
function load(file,mocks={}){const mod={exports:{}};const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(id=>mocks[id]||require(id),mod,mod.exports);return mod.exports;}
const text=node=>Array.isArray(node)?node.map(text).join(' '):node?.props?text(node.props.children):String(node??'');

test('next action allows an out-of-window date, preserves its draft and reuses the request ID after a lost response',async t=>{
  const harness=hookHarness();t.after(()=>harness.cleanup());const calls=[];let failed=true;
  const {LeadFollowUp}=load('components/customer/LeadFollowUp.tsx',{react:harness.react,'@/lib/oversight':{melbourneDateTime:(date,time)=>`${date}T${time}:00Z`,oversightApi:{policy:async()=>({data:{today:'2026-11-17',afterContact:{today:'2026-11-17',maxDate:'2026-11-20'}}}),nextAction:async(id,payload)=>{calls.push(payload);if(failed)throw Error('Response interrupted');return {data:{next_action_review:{status:'pending'}}};}}}});
  const render=()=>harness.render(()=>LeadFollowUp({lead:{_id:'lead',owner_id:'person',status:'following_up'},onUpdated(){}}));render();await tick();let tree=render();
  const date=nodes(tree).find(node=>node.type==='input'&&node.props.type==='date');assert.equal(date.props.max,undefined);date.props.onChange({target:{value:'2026-12-02'}});
  nodes(tree).find(node=>node.type==='textarea').props.onChange({target:{value:'Requested by customer'}});
  nodes(tree).find(node=>node.type==='input'&&node.props.maxLength===200).props.onChange({target:{value:'Follow-up call'}});
  tree=render();await nodes(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});tree=render();assert.match(text(tree),/Response interrupted/);
  failed=false;await nodes(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});tree=render();assert.equal(calls.length,2);assert.equal(calls[0].requestId,calls[1].requestId);assert.match(calls[0].dueAt,/2026-12-02/);assert.match(text(tree),/Awaiting Manager Approval/);
});

test('pending date overrides show the approval label rather than another editable follow-up form',()=>{
  const harness=hookHarness();const {LeadFollowUp}=load('components/customer/LeadFollowUp.tsx',{react:harness.react,'@/lib/oversight':{oversightApi:{policy:async()=>({})}}});
  const tree=harness.render(()=>LeadFollowUp({lead:{_id:'lead',owner_id:'person',status:'following_up',next_action_review:{status:'pending',title:'Later call',due_at:'2026-12-02T00:00:00Z'}}}));
  assert.match(text(tree),/Awaiting Manager Approval/);assert.equal(nodes(tree).filter(node=>node.type==='form').length,0);harness.cleanup();
});

test('manager profile consent submits an audited opt-out reason',async t=>{
  const harness=hookHarness();t.after(()=>harness.cleanup());const calls=[],updates=[];
  const {CustomerConsent}=load('components/customer/CustomerConsent.tsx',{react:harness.react,'@/lib/auth':{useAuth:()=>({user:{canAllocate:true}})},'@/lib/crm-updates':{crmApi:{consent:async(...args)=>{calls.push(args);return {data:{opted_out:true}};}}}});
  const render=()=>harness.render(()=>CustomerConsent({lead:{_id:'lead',opted_out:false},onUpdated:lead=>updates.push(lead)}));let tree=render();
  nodes(tree).find(node=>node.type==='textarea').props.onChange({target:{value:'Customer asked to stop'}});tree=render();await nodes(tree).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.deepEqual(calls,[['lead',true,'Customer asked to stop']]);assert.equal(updates[0].opted_out,true);
});

test('manager activity badges and role, author and video filters remain distinct',()=>{
  const harness=hookHarness();const {CustomerActivityFeed}=load('components/customer/CustomerActivityFeed.tsx',{react:harness.react,'./ManagerNoteEdit':{ManagerNoteEdit:()=>null}});
  const lead={diary_entries:[{author:'Quoc',author_role:'sales_manager',kind:'note',date:'2026-11-17T00:00:00Z',note:'Manager note text'},{author:'Paul',author_role:'sales_consultant',kind:'video_sent',note:'Video sent'},{author:'Customer',author_role:'customer',kind:'video_viewed',note:'Video viewed'}]};
  const render=()=>harness.render(()=>CustomerActivityFeed({lead}));let tree=render();assert.equal(nodes(tree).filter(n=>n.type==='article').length,3);assert.match(text(tree),/Manager note/);
  nodes(tree).find(n=>n.props?.['aria-label']==='Activity author role').props.onChange({target:{value:'manager'}});tree=render();assert.equal(nodes(tree).filter(n=>n.type==='article').length,1);
  nodes(tree).find(n=>n.props?.['aria-label']==='Activity author role').props.onChange({target:{value:'all'}});nodes(tree).find(n=>n.props?.['aria-label']==='Activity type').props.onChange({target:{value:'video_viewed'}});tree=render();assert.equal(nodes(tree).filter(n=>n.type==='article').length,1);assert.match(text(nodes(tree).find(n=>n.type==='article')),/Customer/);harness.cleanup();
});

test('Today semantics exclude future, completed and awaiting-approval work in Melbourne time',()=>{
  const {needsActionToday}=load('lib/crm-updates.ts',{'./api':{fetchApi(){}}}),now=new Date('2026-11-17T02:00:00Z'),base={status:'following_up'};
  assert.equal(needsActionToday(base,now),true);assert.equal(needsActionToday({...base,next_action:{due_at:'2026-11-18T00:00:00Z'}},now),false);
  assert.equal(needsActionToday({...base,next_action:{status:'completed'}},now),false);assert.equal(needsActionToday({...base,loss_review:{status:'pending'}},now),false);assert.equal(needsActionToday({...base,next_action_review:{status:'pending'}},now),false);
});

test('approved library clips attach immediately and publication requires an explicit generic-content confirmation',async t=>{
  const harness=hookHarness();t.after(()=>harness.cleanup());const published=[],attached=[];
  const {VideoLibrary}=load('components/customer/VideoLibrary.tsx',{react:harness.react,'@/lib/auth':{useAuth:()=>({user:{canAllocate:true}})},'@/lib/crm-updates':{crmApi:{library:async()=>({data:[{id:'template',title:'Welcome'}]}),attachClip:async()=>({data:{id:'copied',url:'https://media.test/customer-clip'}}),publishClip:async(...args)=>{published.push(args);return{};}}}});
  const render=()=>harness.render(()=>VideoLibrary({lead:{_id:'lead',dealership:'South Morang Hyundai'},media:[{id:'original',name:'Generic video',content_type:'video/mp4',status:'ready'}],onAttach:item=>attached.push(item)}));render();await tick();let tree=render();
  await nodes(tree).find(n=>n.type==='button'&&n.props.children==='Attach clip').props.onClick();assert.equal(attached[0].id,'copied');tree=render();
  nodes(tree).find(n=>n.props?.['aria-label']==='Template source video').props.onChange({target:{value:'original'}});nodes(tree).find(n=>n.props?.['aria-label']==='Video template title').props.onChange({target:{value:'New template'}});tree=render();assert.equal(nodes(tree).find(n=>n.type==='button'&&n.props.children==='Approve clip').props.disabled,true);
  nodes(tree).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});tree=render();assert.equal(nodes(tree).find(n=>n.type==='button'&&n.props.children==='Approve clip').props.disabled,false);
  nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await tick();assert.deepEqual(published[0],['lead','original','New template',true]);
});
