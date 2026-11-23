'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Activity,ArrowDownRight,ArrowUpRight,CalendarDays,CheckCircle2,Clock3,Download,Flame,MessageSquare,Phone,RefreshCw,ShieldAlert,UserRound,Users,X} from 'lucide-react';
import {fetchApi} from '@/lib/api';
import {useAuth} from '@/lib/auth';
import {useRefreshOnResume} from '@/lib/use-refresh-on-resume';
import {usePaginatedQuery} from '@/lib/use-paginated-query';
import {CrmReport,PriorityLead,crmQuery,exportCrmReport,priorityLeads,rateText} from '@/lib/crm-report';
import {Lead} from '@/lib/types';
import {QueryStatus} from '@/components/ui/QueryStatus';
import {Pagination} from '@/components/ui/Pagination';
import {useDialog} from '@/lib/use-dialog';
const field='min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900';
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const primary=button+' !border-blue-700 !bg-blue-700 !text-white hover:!bg-blue-800';
const card='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
const label=(value:string)=>value.replaceAll('_',' ');
const money=(cents:number)=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(cents/100);
const time=(value:string)=>new Date(value).toLocaleString('en-AU',{timeZone:'Australia/Melbourne',dateStyle:'medium',timeStyle:'short'});
export function age(minutes:number|null){if(minutes===null)return 'No recorded contact';if(minutes<60)return minutes+'m';if(minutes<1440)return Math.floor(minutes/60)+'h '+Math.floor(minutes%60)+'m';return Math.floor(minutes/1440)+'d '+Math.floor(minutes%1440/60)+'h';}
const tones:Record<string,string>={opportunities:'border-emerald-200 bg-emerald-50 text-emerald-900',at_risk:'border-red-200 bg-red-50 text-red-900',in_play:'border-blue-200 bg-blue-50 text-blue-900',sold:'border-emerald-200 bg-emerald-50 text-emerald-900',inactive:'border-slate-200 bg-slate-50 text-slate-700'};
type Props={rooftop:string;onOpenLead:(lead:Lead)=>void;onOpenSms?:(lead:Lead)=>void;onBookAppointment?:(lead:Lead)=>void};
export function SalesCrmDashboard({rooftop,onOpenLead,onOpenSms,onBookAppointment}:Props) {
  const {user}=useAuth(),manager=['super_admin','manager','dealer_principal','general_manager','sales_manager'].includes(user?.role || '');
  const [period,setPeriod]=useState('today'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[source,setSource]=useState(''),[vehicleType,setVehicleType]=useState(''),[staff,setStaff]=useState('');
  const [report,setReport]=useState<{key:string;data:CrmReport}|null>(null),[error,setError]=useState<string|null>(null),[revision,setRevision]=useState(0),[filter,setFilter]=useState('all'),[page,setPage]=useState(1),[search,setSearch]=useState(''),[handled,setHandled]=useState(false);
  const [selected,setSelected]=useState<{row:PriorityLead;action:string}|null>(null),[view,setView]=useState('cards'),[mode,setMode]=useState('priority');
  const params:Record<string,string|number>={rooftop,...(period==='custom'&&from&&to?{from,to}:{period:period==='custom'?'today':period}),...(source?{source}:{}),...(vehicleType?{vehicleType}:{}),...(staff&&manager?{staff}:{})};
  const key=JSON.stringify(params),data=report?.key===key?report.data:null;
  const refresh=useCallback(()=>setRevision(value=>value+1),[]);
  useRefreshOnResume(refresh);
  const rows=usePaginatedQuery(priorityLeads,{...params,filter,page,limit:10,search,handled:String(handled)},setPage);
  const [people,setPeople]=useState<{id:string;name:string}[]>([]);
  const customerRequest=useRef<AbortController|null>(null),[customerError,setCustomerError]=useState('');
  useEffect(()=>()=>customerRequest.current?.abort(),[key]);
  const openCustomer=async(lead:Lead,sms=false)=>{
    customerRequest.current?.abort();const controller=new AbortController();customerRequest.current=controller;setCustomerError('');
    try{const result=await fetchApi<Lead>('/leads/'+encodeURIComponent(lead._id),{signal:controller.signal});if(!controller.signal.aborted&&result.data)(sms?onOpenSms || onOpenLead:onOpenLead)(result.data);}
    catch(reason){if(!controller.signal.aborted)setCustomerError((reason as Error).message);}
  };
  useEffect(()=>{if(!manager)return;const controller=new AbortController();fetchApi<{id:string;name:string}[]>('/team-activity?rooftop='+encodeURIComponent(rooftop),{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setPeople(result.data||[]);}).catch(()=>{});return()=>controller.abort();},[manager,rooftop]);
  useEffect(()=>{
    const controller=new AbortController();setError(null);
    const timer=setTimeout(()=>fetchApi<CrmReport>('/crm/report?'+crmQuery(JSON.parse(key)),{signal:controller.signal,timeoutMs:45000}).then(result=>{if(!controller.signal.aborted&&result.data)setReport({key,data:result.data});}).catch(reason=>{if(!controller.signal.aborted)setError(reason.message);}),250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[key,revision]);
  useEffect(()=>{setPage(1);setSelected(null);},[key]);
  useEffect(()=>{
    const update=()=>{refresh();rows.refresh();};
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')update();},30000);
    window.addEventListener('booran:data-changed',update);
    return()=>{clearInterval(timer);window.removeEventListener('booran:data-changed',update);};
  },[refresh,rows.refresh]);
  const drill=(next:string)=>{setFilter(next);setPage(1);document.getElementById('crm-priority-actions')?.scrollIntoView({behavior:'smooth',block:'start'});};
  const saved=()=>{setSelected(null);refresh();rows.refresh();};
  const prioritySection=(<section id="crm-priority-actions" className={card+' scroll-mt-4'} aria-label="Prioritised customer actions">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Priority actions</h2><p className="text-xs text-slate-500">Risk first, then buying intent. Resolve the next step directly.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Priority filter" className={field+' !w-auto'} value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}>{['all','opportunities','at_risk','in_play','active','unactioned','overdue','leads','contacted','appointments','shows','sales','appointment_sales','videos','handled','inactive'].map(name=><option key={name} value={name}>{label(name)}</option>)}</select><button className={button} aria-pressed={view==='table'} onClick={()=>setView(view==='cards'?'table':'cards')}>{view==='cards'?'Table view':'Card view'}</button></div></div>
      <div className="my-3 flex flex-wrap items-center gap-3"><input className={field+' sm:!w-72'} aria-label="Search priority customers" placeholder="Search customer, mobile or vehicle" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={handled} onChange={e=>{setHandled(e.target.checked);setPage(1);}}/>Include handled priorities</label></div>
      <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh}/>
      {view==='table'&&<div className="mb-2 hidden grid-cols-4 gap-4 rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold uppercase text-slate-500 lg:grid"><span>Customer & vehicle</span><span>Status & last contact</span><span>Suggested next step</span><span>Actions</span></div>}
      {(() => {
        const displayRows = filter === 'inactive'
          ? rows.data
          : rows.data.filter(row => row.state !== 'inactive' && (row.firstResponse?.ageMinutes == null || row.firstResponse.ageMinutes <= 60 * 1440));
        return <>
          <div className={view==='cards'?'grid gap-3 xl:grid-cols-2':'space-y-3'}>{displayRows.map(row=><PriorityCard key={row.lead._id} row={row} manager={manager} table={view==='table'} onOpenLead={lead=>void openCustomer(lead)} onSms={lead=>void openCustomer(lead,true)} onBook={onBookAppointment} onAction={action=>setSelected({row,action})}/>)}</div>
          {!rows.isLoading&&!rows.error&&!displayRows.length&&<p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No customers match this filter.</p>}
        </>;
      })()}
      <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={10} onPageChange={setPage} itemName="customers"/>
    </section>);
  return <div className="view-stack space-y-4" aria-label="Sales CRM dashboard">
    <header className={card+' flex flex-wrap items-start justify-between gap-4'}>
      <div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Booran Motors · PULSE</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">{manager?'Sales CRM overview':'My sales CRM'}</h1><p className="mt-1 text-sm text-slate-500">{rooftop} · Melbourne time · refreshes every 30 seconds</p></div>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>{refresh();rows.refresh();}}><RefreshCw size={16}/>Refresh</button>{manager&&data&&<button className={primary} onClick={()=>exportCrmReport(data,rooftop)}><Download size={16}/>Export PULSE report</button>}</div>
    </header>
    <div className="flex flex-wrap items-center gap-2"><button className={mode==='priority'?primary:button} aria-pressed={mode==='priority'} onClick={()=>setMode('priority')}>Priority view</button><button className={mode==='performance'?primary:button} aria-pressed={mode==='performance'} onClick={()=>setMode('performance')}>Performance view</button></div>
    <details className={card} aria-label="CRM report filters"><summary className="cursor-pointer text-sm font-semibold">Report filters · {period==='custom'?from+' to '+to:label(period)}{source?' · '+source:''}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-slate-600">Reporting period<select className={field+' mt-1'} value={period} onChange={e=>setPeriod(e.target.value)}><option value="today">Today</option><option value="week">This week</option><option value="month">Month to date</option><option value="custom">Custom dates</option></select></label>
      {period==='custom'&&<><label className="text-xs">From<input type="date" className={field+' mt-1'} value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-xs">Through<input type="date" className={field+' mt-1'} value={to} onChange={e=>setTo(e.target.value)}/></label></>}
      <label className="text-xs font-semibold text-slate-600">Lead source<input list="crm-sources" placeholder="All sources" className={field+' mt-1'} value={source} onChange={e=>setSource(e.target.value)}/><datalist id="crm-sources">{data?.segments.source.map(row=><option key={row.name} value={row.name}/>)}</datalist></label>
      <label className="text-xs font-semibold text-slate-600">Vehicle type<input list="crm-vehicles" placeholder="All vehicle types" className={field+' mt-1'} value={vehicleType} onChange={e=>setVehicleType(e.target.value)}/><datalist id="crm-vehicles">{data?.segments.vehicleType.map(row=><option key={row.name} value={row.name}/>)}</datalist></label>
      {manager&&<label className="text-xs font-semibold text-slate-600">Salesperson<select className={field+' mt-1'} value={staff} onChange={e=>setStaff(e.target.value)}><option value="">Entire authorised team</option>{people.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
      {period==='custom'&&(!from||!to)&&<p className="text-xs text-amber-800">Choose both dates. Today is shown until the range is complete.</p>}
    </div></details>
    <QueryStatus error={error} isLoading={!data&&!error} onRetry={refresh}/>
    {customerError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{customerError}</p>}
    {data&&<>
      <section className="flex flex-wrap gap-2" aria-label="Operational risk summary">{[['active','Active customers',data.operations.active],['unactioned','Unactioned',data.operations.unactioned],['overdue','Overdue SLA',data.operations.overdue],['appointments','Appointments',data.metrics.appointments]].map(([filter,title,count])=><button key={filter} className={button+(filter==='overdue'&&Number(count)?' !border-red-200 !bg-red-50 !text-red-800':'')} onClick={()=>drill(String(filter))}>{title}: <strong>{count}</strong></button>)}<span className="self-center px-3 text-xs text-slate-500">{data.operations.stepIns7d} manager step-ins in 7 days</span></section>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Current priority summary">
        {[{key:'opportunities',name:'Hot opportunities',count:data.operations.opportunities,Icon:Flame},{key:'at_risk',name:'At risk',count:data.operations.atRisk,Icon:ShieldAlert},{key:'in_play',name:'In play',count:data.operations.inPlay,Icon:Activity},{key:'active',name:'Active customers',count:data.operations.active,Icon:Users}].map(item=><button key={item.key} onClick={()=>drill(item.key)} className={'min-w-0 rounded-2xl border p-3 text-left shadow-sm sm:p-5 '+(tones[item.key] || 'bg-slate-50 text-slate-900')}><div className="flex items-center gap-2 text-xs font-semibold"><item.Icon size={18}/>{item.name}</div><strong className="mt-2 block text-3xl">{item.count.toLocaleString()}</strong><span className="mt-1 block text-xs opacity-75">Current workload · view customers →</span></button>)}
      </section>
    </>}
    {mode==='priority'&&prioritySection}
    {data&&<details className={card} open={mode==='performance'}><summary className="cursor-pointer text-sm font-bold">Conversion, funnel & pipeline performance</summary><div className="mt-4 space-y-4">
      <section className={card} aria-label="Conversion KPI metrics"><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-bold">Conversion & response</h2><p className="text-xs text-slate-500">Customers created {time(data.window.from)} – {time(data.window.asOf)} · {data.metrics.leads} leads</p></div><p className="text-xs text-slate-500">Compared with preceding period</p></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <Kpi title="Median first response" value={data.metrics.firstResponse.medianMinutes===null?'—':data.metrics.firstResponse.medianMinutes.toFixed(1)+' min'} detail={data.metrics.firstResponse.samples+' recorded responses · internet goal <5 min'} current={data.metrics.firstResponse.medianMinutes} previous={data.previous.firstResponse.medianMinutes} lower onClick={()=>drill('leads')}/>
          <Kpi title="Contact rate" value={rateText(data.metrics.contactRate)} detail={data.metrics.contacted+' / '+data.metrics.leads+' customers reached'} current={data.metrics.contactRate.value} previous={data.previous.contactRate.value} onClick={()=>drill('contacted')}/>
          <Kpi title="Appointment set rate" value={rateText(data.metrics.appointmentRate)} detail={data.metrics.appointments+' booked · '+data.metrics.confirmedAppointments+' confirmed'} current={data.metrics.appointmentRate.value} previous={data.previous.appointmentRate.value} onClick={()=>drill('appointments')}/>
          <Kpi title="Appointment show rate" value={rateText(data.metrics.showRate)} detail={data.metrics.shows+' / '+data.metrics.appointments+' customers attended'} current={data.metrics.showRate.value} previous={data.previous.showRate.value} onClick={()=>drill('shows')}/>
          <Kpi title="Appointment-to-sale rate" value={rateText(data.metrics.closeRate)} detail="Completed sales linked to attended appointments" current={data.metrics.closeRate.value} previous={data.previous.closeRate.value} onClick={()=>drill('appointment_sales')}/>
          <Kpi title="Lead-to-sale conversion" value={rateText(data.metrics.conversion)} detail={data.metrics.sales+' / '+data.metrics.leads+' customers purchased'} current={data.metrics.conversion.value} previous={data.previous.conversion.value} onClick={()=>drill('sales')}/>
        </div>
      </section>
      <section className={card} aria-label="Sales conversion funnel"><h2 className="text-lg font-bold">Lead conversion funnel</h2><p className="mt-1 text-xs text-slate-500">Unique customers in the selected lead cohort. Click a stage to view its customers.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{[['leads',data.metrics.leads],['contacted',data.metrics.contacted],['appointments',data.metrics.appointments],['shows',data.metrics.shows],['sales',data.metrics.sales]].map(([name,count],i)=><button key={name} onClick={()=>drill(String(name))} className="relative min-h-24 rounded-xl border border-blue-100 bg-blue-50 p-3 text-left text-blue-950"><span className="text-xs font-bold capitalize">{name}</span><strong className="block text-2xl">{count}</strong><span className="absolute bottom-0 left-0 h-1.5 rounded-b-xl bg-blue-600" style={{width:(data.metrics.leads?Math.max(4,Number(count)/data.metrics.leads*100):0)+'%'}}/></button>)}</div>
      </section>
      <section className="grid gap-3 lg:grid-cols-3">
        <div className={card+' lg:col-span-2'}><h2 className="text-lg font-bold">Pipeline value & stages</h2><p className="text-xs text-slate-500">Known selling values only. Missing prices are excluded.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{data.stages.map(stage=><button key={stage.stage} onClick={()=>drill(stage.stage==='sold'?'sales':stage.stage)} className={'rounded-xl border p-3 text-left '+tones[stage.stage]}><span className="text-xs font-bold capitalize">{label(stage.stage)}</span><strong className="mt-1 block text-lg">{money(stage.valueCents)}</strong><span className="text-xs">{stage.count} customers · {stage.valuedLeads} priced</span></button>)}</div></div>
        <div className={card}><h2 className="text-lg font-bold">Videos & engagement</h2><button className="mt-3 block min-h-11 text-left" onClick={()=>drill('videos')}><strong className="text-3xl text-blue-800">{data.engagement.videoMessages}</strong><span className="ml-2 text-sm">video messages sent</span></button><p className="text-sm">{rateText(data.engagement.videoViewRate)} video view rate</p><p className="mt-2 text-xs text-slate-500">{data.engagement.websiteSignalsAvailable?'Website signals included where recorded.':'Website engagement telemetry is not available in this scope.'} Email opens: unavailable.</p></div>
      </section>
    </div></details>}
    {mode==='performance'&&prioritySection}
    {data&&<>
      <details className={card} open={mode==='performance'}><summary className="cursor-pointer text-sm font-bold">Daily conversion trend & breakdown</summary><div className="mt-3"><h2 className="text-lg font-bold">Daily conversion trend</h2><p className="mb-3 text-xs text-slate-500">Each daily cohort is measured at that day’s end. Missing denominators are shown as —.</p><ConversionTrend days={data.daily}/><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{['Melbourne day','Leads','Contact','Appointment','Show','Conversion'].map(title=><th key={title} className="p-3">{title}</th>)}</tr></thead><tbody>{data.daily.map(day=><tr key={day.date} className="border-t"><td className="p-3">{day.date}</td><td>{day.leads}</td>{[day.contactRate,day.appointmentRate,day.showRate,day.conversion].map((rate,i)=><td key={i} className="px-2"><span className="block text-xs">{rateText(rate)}</span><span className="mt-1 block h-1 w-16 rounded bg-slate-100"><span className="block h-1 rounded bg-blue-600" style={{width:(rate.value || 0)+'%'}}/></span></td>)}</tr>)}</tbody></table></div></div></details>
      <details className={card}><summary className="cursor-pointer font-bold">Source, hour, vehicle and salesperson breakdowns</summary><div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(data.segments).map(([name,items])=><div key={name}><h3 className="mb-2 font-semibold capitalize">{label(name)}</h3>{items.map(row=><div key={row.name} className="flex flex-wrap justify-between gap-2 border-t py-2 text-xs"><strong>{row.name}</strong><span>{row.leads} leads · {rateText(row.contactRate)} contact · {rateText(row.conversion)} sales · {row.firstResponse.medianMinutes===null?'—':row.firstResponse.medianMinutes.toFixed(1)+' min'} response</span></div>)}</div>)}</div></details>
      <details className={card}><summary className="cursor-pointer text-sm font-semibold">Metric definitions & data quality</summary><div className="mt-3 space-y-3 text-xs text-slate-600">{Object.entries(data.definitions).map(([name,text])=><p key={name}><strong className="capitalize">{name}: </strong>{text}</p>)}<p>Missing creation dates: {data.dataQuality.missingCreationDates}. Legacy attendance without a check-in timestamp: {data.dataQuality.legacyShows}. Sales without an appointment link: {data.dataQuality.unlinkedSales}. Bookings without confirmed contact evidence: {data.dataQuality.appointmentsWithoutContact}.</p><p>Last calculated: {time(data.computedAt)}. Blank rates mean insufficient source data.</p></div></details>
      {manager&&<Targets rooftop={rooftop} settings={data.settings} onSaved={saved}/>}
    </>}
    {selected&&<ActionDialog key={selected.row.lead._id+selected.action} row={selected.row} action={selected.action} manager={manager} onClose={()=>setSelected(null)} onSaved={saved} onOpenLead={lead=>void openCustomer(lead)}/>}
  </div>;
}
function Kpi({title,value,detail,current,previous,lower=false,onClick}:{title:string;value:string;detail:string;current:number|null;previous:number|null;lower?:boolean;onClick:()=>void}){
  const delta=current===null||previous===null?null:Math.round((current-previous)*10)/10,positive=delta!==null&&(lower?delta<=0:delta>=0);
  return <button onClick={onClick} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300"><span className="text-xs font-semibold text-slate-600">{title}</span><strong className="mt-1 block text-2xl font-extrabold text-slate-900">{value}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span><span className={'mt-2 flex items-center gap-1 text-xs font-semibold '+(delta===null?'text-slate-400':positive?'text-emerald-700':'text-red-700')}>{delta===null?'No comparison data':<>{delta>=0?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>} {Math.abs(delta)} {lower?'min':'pp'} {delta===0?'unchanged':lower?delta<0?'faster':'slower':delta>0?'higher':'lower'}</>}</span></button>;
}
export function PriorityCard({row,manager,table,onOpenLead,onSms,onBook,onAction}:{row:PriorityLead;manager:boolean;table:boolean;onOpenLead:(lead:Lead)=>void;onSms:(lead:Lead)=>void;onBook?:Props['onBookAppointment'];onAction:(action:string)=>void}){
  const lead=row.lead;
  return <article className={'min-w-0 rounded-xl border bg-white p-4 '+(row.state==='at_risk'?'border-red-200':row.state==='opportunities'?'border-emerald-200':'border-blue-100')+(table?' lg:grid lg:grid-cols-4 lg:gap-4':' space-y-3')}>
    <div className="min-w-0"><button className="text-left font-bold text-slate-900 hover:underline" onClick={()=>onOpenLead(lead)}>{lead.name}</button><p className="break-words text-xs text-slate-500">{lead.vehicle || [lead.make,lead.model].filter(Boolean).join(' ') || 'Vehicle not recorded'}</p><p className="mt-1 text-xs text-slate-500">{lead.owner_name || 'Unassigned'} · {lead.source || 'Source unknown'}</p></div>
    <div className="mt-2 space-y-1 lg:mt-0"><span className={'inline-block rounded-md border px-2 py-1 text-[11px] font-bold uppercase '+tones[row.state]}>{row.state==='opportunities'?'Hot opportunity':label(row.state)}</span>{row.handled&&<span className="ml-2 text-xs text-slate-500">Handled</span>}<p className="text-xs text-slate-500">Last contact: {age(row.minutesSinceContact)}</p>{row.state!=='inactive'&&row.firstResponse.breached&&<p className="flex items-center gap-1 text-xs font-semibold text-red-700"><Clock3 size={12}/>SLA breached · lead age {age(row.firstResponse.ageMinutes)}</p>}</div>
    <div className="mt-3 rounded-xl bg-slate-50 p-3 lg:mt-0"><p className={'text-xs font-bold '+(row.reasons.length?'text-red-700':'text-emerald-700')}>{row.reasons[0]?.text || row.intent.join(' · ') || (row.state==='inactive'?'Lead age over 60 days · inactive':'Follow-up in progress')}</p>{row.suggestedNext&&<p className="mt-1 text-xs text-slate-600"><strong>Next step: </strong>{row.suggestedNext}</p>}</div>
    <div className="mt-3 flex flex-wrap gap-2 lg:mt-0">
      {lead.phone&&<a href={'tel:'+lead.phone} className={button+' !text-emerald-800'}><Phone size={14}/>Call</a>}
      <button className={button} onClick={()=>onAction('contact')}>Log contact</button>
      <button className={button} onClick={()=>onSms(lead)}><MessageSquare size={14}/>SMS</button>
      {row.state!=='inactive'&&<button className={button} onClick={()=>onAction('handled')}><CheckCircle2 size={14}/>Mark handled</button>}
      {manager&&row.state!=='inactive'&&<button className={primary} onClick={()=>onAction('step-in')}>Step in</button>}
      <button className={button} onClick={()=>onAction('stage')}>Move stage</button>
      {onBook&&<button className={button} onClick={()=>onBook(lead)}><CalendarDays size={14}/>Book appointment</button>}
      <button className={button} onClick={()=>onAction('signals')}>Value & signals</button>
      {!!row.appointments.length&&<button className={button} onClick={()=>onAction('appointments')}>Appointment outcomes</button>}
    </div>
  </article>;
}
function ActionDialog({row,action,manager,onClose,onSaved,onOpenLead}:{row:PriorityLead;action:string;manager:boolean;onClose:()=>void;onSaved:()=>void;onOpenLead:(lead:Lead)=>void}){
  const ref=useDialog(true,onClose),[notes,setNotes]=useState(''),[status,setStatus]=useState('following_up'),[outcome,setOutcome]=useState('connected'),[channel,setChannel]=useState('call'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [signals,setSignals]=useState<Record<string,string|boolean>>(()=>Object.fromEntries(['opportunity_value_cents','finance_approved_cents','deposit_cents','required_deposit_cents','finance_started','trade_in'].map(key=>[key,typeof row.signals[key]==='boolean'?row.signals[key] as boolean:typeof row.signals[key]==='number'?String((row.signals[key] as number)/100):''])));
  const attempt=useRef<{body:string;id:string}|null>(null),lock=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const save=async()=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{
      const payload:Record<string,unknown>={notes,revision:row.revision,...(action==='handled'?{key:row.key}:{}),...(action==='stage'?{status}:{}),...(action==='contact'?{channel,outcome}:{}),
        ...(action==='signals'?Object.fromEntries(Object.entries(signals).map(([key,value])=>[key,['finance_started','trade_in'].includes(key)?value===true:value===''?null:Math.round(Number(value)*100)])): {})};
      const body=JSON.stringify(payload);if(attempt.current?.body!==body)attempt.current={body,id:crypto.randomUUID()};
      await fetchApi('/crm/leads/'+row.lead._id+'/'+action,{method:'POST',body:JSON.stringify({...payload,requestId:attempt.current.id})});if(mounted.current)onSaved();
    }catch(reason){setError((reason as Error).message);}finally{lock.current=false;setBusy(false);}
  };
  const appointmentAction=async(id:string,status:string)=>{if(busy)return;setBusy(true);setError('');try{await fetchApi('/crm/appointments/'+id,{method:'PATCH',body:JSON.stringify({status})});if(mounted.current)onSaved();}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}};
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-2 sm:items-center sm:p-5"><section ref={ref} data-app-dialog role="dialog" aria-modal="true" aria-label={label(action)+' · '+row.lead.name} tabIndex={-1} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold capitalize">{label(action.replace('-',' '))}</h2><p className="text-sm text-slate-500">{row.lead.name}</p></div><button className={button} aria-label="Close action" disabled={busy} onClick={onClose}><X size={18}/></button></div>
    {error&&<p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {action==='appointments'?<div className="space-y-3">{row.appointments.map(appt=><div key={appt.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{time(appt.when)} · {appt.status}</p>{['Booked','Confirmed'].includes(appt.status)&&<div className="mt-2 flex flex-wrap gap-2">{['Confirmed','Completed','No Show','Cancelled'].map(next=><button key={next} disabled={busy||appt.status===next} className={button} onClick={()=>appointmentAction(appt.id,next)}>{next==='Completed'?'Mark attended':next}</button>)}</div>}
      {manager&&appt.status==='Completed'&&row.deals.filter(deal=>!deal.appointmentId).map(deal=><button key={deal.id} className={button+' mt-2'} disabled={busy} onClick={async()=>{setBusy(true);try{await fetchApi('/crm/deals/'+deal.id+'/appointment',{method:'POST',body:JSON.stringify({appointmentId:appt.id})});if(mounted.current)onSaved();}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}}>Link sale {deal.id.slice(-6)} to this appointment</button>)}</div>)}</div>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy} className="space-y-4">
      {action==='handled'&&<p className="text-sm text-slate-600">Record the resolution. This priority is hidden for four hours, or until new evidence changes it. Contact metrics are updated only when contact is recorded.</p>}
      {action==='step-in'&&<p className="text-sm text-slate-600">Record your intervention and notify the salesperson. The current customer assignment is retained.</p>}
      {action==='contact'&&<><label className="block text-sm">Channel<select className={field+' mt-1'} value={channel} onChange={e=>{setChannel(e.target.value);setOutcome(e.target.value==='call'?'connected':'sent');}}><option value="call">Phone call</option><option value="email">Email</option></select></label><label className="block text-sm">Outcome<select className={field+' mt-1'} value={outcome} onChange={e=>setOutcome(e.target.value)}>{(channel==='call'?['connected','no_answer','voicemail']:['sent','replied']).map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label><p className="text-xs text-slate-500">Log an outcome only after the contact happened. A call button click does not count as a connected call.</p></>}
      {action==='stage'&&<><label className="block text-sm">New stage<select className={field+' mt-1'} value={status} onChange={e=>setStatus(e.target.value)}><option value="new_lead">New lead</option><option value="following_up">Following up</option><option value="returned">Returned</option></select></label><button type="button" className="min-h-11 text-sm font-semibold text-blue-700 underline" onClick={()=>{onClose();onOpenLead(row.lead);}}>Open customer to record a sale or request loss review</button></>}
      {action==='signals'&&<><div className="grid gap-3 sm:grid-cols-2">{Object.entries({opportunity_value_cents:'Opportunity value (AUD)',finance_approved_cents:'Finance approved (AUD)',deposit_cents:'Deposit paid (AUD)',required_deposit_cents:'Deposit required (AUD)'}).map(([key,title])=><label className="text-sm" key={key}>{title}<input className={field+' mt-1'} type="number" min="0" max="10000000" step="0.01" value={String(signals[key])} onChange={e=>setSignals({...signals,[key]:e.target.value})}/></label>)}</div>{[['finance_started','Finance started'],['trade_in','Trade-in interest']].map(([key,title])=><label key={key} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={signals[key]===true} onChange={e=>setSignals({...signals,[key]:e.target.checked})}/>{title}</label>)}<p className="text-xs text-slate-500">Blank amounts are unknown. Enter verified amounts to identify payment differences.</p></>}
      <label className="block text-sm">Notes<textarea required maxLength={2000} rows={3} className={field+' mt-1'} value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className={primary} disabled={busy}>{busy?'Saving…':'Save action'}</button>
    </fieldset></form>}
  </section></div>;
}
function Targets({rooftop,settings,onSaved}:{rooftop:string;settings:CrmReport['settings'];onSaved:()=>void}){
  const [sla,setSla]=useState(settings.firstResponseMinutes),[hours,setHours]=useState(settings.followUpHours),[busy,setBusy]=useState(false),[error,setError]=useState('');
  if(['All Locations','South Morang'].includes(rooftop))return null;
  return <details className={card}><summary className="cursor-pointer text-sm font-semibold">Dealership response targets</summary><form className="mt-3 space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await fetchApi('/pulse/settings',{method:'PATCH',body:JSON.stringify({dealership:rooftop,firstResponseMinutes:sla,followUpHours:hours,conversionTarget:settings.conversionTarget,monthlyTarget:settings.monthlyTarget})});onSaved();}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}}><label className="block text-sm">First response SLA (minutes)<input className={field} type="number" min="1" max="120" required value={sla} onChange={e=>setSla(Number(e.target.value))}/></label><label className="block text-sm">Stalled contact threshold (hours)<input className={field} type="number" min="1" max="720" required value={hours} onChange={e=>setHours(Number(e.target.value))}/></label>{error&&<p role="alert" className="text-red-700">{error}</p>}<button className={primary} disabled={busy}>Save response targets</button></form></details>;
}

function ConversionTrend({days}:{days:CrmReport['daily']}){
  const groups=(key:'contactRate'|'conversion')=>{const result:string[][]=[];let current:string[]=[];days.forEach((day,index)=>{const value=day[key].value;if(value===null){if(current.length)result.push(current);current=[];}else current.push((40+index*560/Math.max(1,days.length-1))+','+(150-value*1.2));});if(current.length)result.push(current);return result;};
  return <div className="mb-4 rounded-xl bg-slate-50 p-3"><svg viewBox="0 0 640 180" className="w-full" role="img" aria-label="Daily contact rate in blue and lead-to-sale conversion in green, from zero to one hundred percent">{[0,50,100].map(value=><g key={value}><line x1="40" x2="600" y1={150-value*1.2} y2={150-value*1.2} stroke="#e2e8f0"/><text x="3" y={154-value*1.2} fontSize="10" fill="#64748b">{value}%</text></g>)}{(['contactRate','conversion'] as const).flatMap((key,k)=>groups(key).map((points,i)=><g key={key+i}><polyline points={points.join(' ')} fill="none" stroke={k?'#059669':'#2563eb'} strokeWidth="3"/>{points.map((point,index)=>{const[x,y]=point.split(',');return <circle key={index} cx={x} cy={y} r="3" fill={k?'#059669':'#2563eb'}/>;})}</g>))}<text x="40" y="174" fontSize="10" fill="#64748b">{days[0]?.date}</text><text x="600" y="174" textAnchor="end" fontSize="10" fill="#64748b">{days.at(-1)?.date}</text></svg><p className="flex flex-wrap gap-4 text-xs"><span className="font-semibold text-blue-700">Contact rate</span><span className="font-semibold text-emerald-700">Lead-to-sale conversion</span><span className="text-slate-500">Gaps indicate missing denominators.</span></p></div>;
}
