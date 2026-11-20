'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchApi, leadApi } from '@/lib/api';
import { TradeInSettings, TradeOpportunity, ServiceBooking, LostTradeCall, tradeInApi } from '@/lib/trade-in';
import { Lead } from '@/lib/types';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { Pagination } from '@/components/ui/Pagination';
import { QueryStatus } from '@/components/ui/QueryStatus';

const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900';
const button = 'min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const card = 'space-y-3 rounded-xl border border-slate-200 bg-white p-4';
const query = (params: Record<string, string | number>) => new URLSearchParams(Object.entries(params).map(([k,v]) => [k,String(v)]));
const bookings = (params: Record<string, string | number>, options?: RequestInit) => fetchApi<ServiceBooking[]>('/trade-in/service-bookings?' + query(params), options);
const losses = (params: Record<string, string | number>, options?: RequestInit) => fetchApi<LostTradeCall[]>('/trade-in/loss-followups?' + query(params), options);
const displayDate = (date: string) => new Date(date).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });

export function TradeInWorkspace({ rooftop, manager, onShowAppraisal }: { rooftop: string; manager: boolean; onShowAppraisal: (id: string) => void }) {
  const [tab, setTab] = useState('Invitations');
  return <section className={card}>
    <h2 className="text-xl font-bold">Vehicle buying opportunities</h2>
    <nav aria-label="Trade-in follow-up" className="flex flex-wrap gap-2">
      {['Invitations', ...(manager ? ['Service bookings', 'Lost-deal calls', 'Automation'] : [])].map(name => <button type="button" key={name} aria-pressed={tab === name} className={tab === name ? button : 'min-h-11 rounded-lg border px-3 py-2'} onClick={() => setTab(name)}>{name}</button>)}
    </nav>
    {tab === 'Invitations' && <Invitations key={rooftop} rooftop={rooftop} onShowAppraisal={onShowAppraisal} />}
    {tab === 'Service bookings' && manager && <Bookings key={rooftop} rooftop={rooftop} />}
    {tab === 'Lost-deal calls' && manager && <LostCalls key={rooftop} rooftop={rooftop} />}
    {tab === 'Automation' && manager && <Automation key={rooftop} rooftop={rooftop} />}
  </section>;
}
function Invitations({ rooftop, onShowAppraisal }: { rooftop: string; onShowAppraisal: (id: string) => void }) {
  const [page,setPage] = useState(1);
  const rows = usePaginatedQuery<TradeOpportunity>(tradeInApi.opportunities, { rooftop, page, limit: 20 }, setPage);
  return <>
    <p className="text-sm text-slate-600">Post-sale, lost-lead and upcoming service invitations share the same customer photo and valuation flow.</p>
    <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
    {rows.data.map(row => <article key={row._id} className={card}>
      <strong>{row.customer}</strong><p>{row.kind.replaceAll('_',' ')} · {row.status} · {row.dealership}</p>
      <p className="text-sm">{Object.entries(row.channels).map(([channel,status]) => channel + ': ' + status).join(' · ')}</p>
      <p className="text-xs text-slate-500">{displayDate(row.createdAt)}</p>
      {row.appraisal_id && <button className={button} onClick={() => onShowAppraisal(row.appraisal_id!)}>Open submitted appraisal</button>}
    </article>)}
    {!rows.isLoading && !rows.error && !rows.data.length && <p>No invitations in this scope yet.</p>}
    <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={20} onPageChange={setPage} itemName="invitations" />
  </>;
}
function Automation({ rooftop }: { rooftop: string }) {
  const [settings,setSettings] = useState<TradeInSettings | null>(null), [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false);
  const specific = !!rooftop && rooftop !== 'All Locations';
  useEffect(() => {
    if (!specific) return;
    let active = true;
    tradeInApi.settings(rooftop).then(result => { if (active) setSettings(result.data || null); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [rooftop,specific]);
  if (!specific) return <p>Choose one dealership to manage its invitations.</p>;
  return <form className="space-y-4" onSubmit={async e => {
    e.preventDefault(); if (!settings || busy) return; setBusy(true); setError(''); setNotice('');
    try { await tradeInApi.saveSettings(rooftop,settings); setNotice('Automation settings saved.'); } catch(reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }}>
    {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}
    {settings ? <fieldset disabled={busy} className="space-y-3">
      {!settings.configured && <p className="rounded-lg bg-amber-50 p-3">Customer links need configuration before invitations can be enabled.</p>}
      {!settings.sendingEnabled && <p className="rounded-lg bg-amber-50 p-3">Automatic sending is paused by the server configuration.</p>}
      {([['enabled','Enable vehicle buying invitations'],['postSale','Completed sales without a trade'],['lostLead','Newly lost leads'],['service','Service bookings three days ahead']] as const).map(([key,title]) => <label className="flex items-center gap-3" key={key}><input type="checkbox" checked={settings[key]} onChange={e => setSettings({...settings,[key]:e.target.checked})} />{title}</label>)}
      <p className="text-sm text-slate-600">Only new sales and losses after activation are included. Service records must have been received within seven days. Each customer is contacted at most once in 30 days across these triggers.</p>
      <div className="flex flex-wrap gap-5">{(['sms','email'] as const).map(channel => <label key={channel} className="flex gap-2"><input type="checkbox" checked={settings.channels.includes(channel)} onChange={e => setSettings({...settings,channels:e.target.checked ? [...settings.channels,channel] : settings.channels.filter(v => v !== channel)})} />{channel === 'sms' ? 'SMS' : 'Email'}</label>)}</div>
      {settings.channels.includes('email') && !settings.emailConfigured && <p className="text-sm text-amber-800">The sending mailbox needs configuration.</p>}
      <button className={button} disabled={!settings.channels.length}>Save settings</button>
    </fieldset> : !error && <p>Loading settings…</p>}
  </form>;
}
function Bookings({ rooftop }: { rooftop: string }) {
  const [page,setPage] = useState(1), [search,setSearch] = useState(''), [customers,setCustomers] = useState<Lead[]>([]);
  const [leadId,setLeadId] = useState(''), [reference,setReference] = useState(''), [startsAt,setStartsAt] = useState(''), [vehicle,setVehicle] = useState('');
  const [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const rows = usePaginatedQuery(bookings, { rooftop, page, limit: 20 }, setPage);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      leadApi.getLeads({rooftop,search,page:1,limit:20}, {signal:controller.signal}).then(result => { if (!controller.signal.aborted) setCustomers(result.data || []); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    },300);
    return () => { clearTimeout(timer); controller.abort(); };
  },[rooftop,search]);
  return <>
    <p className="text-sm text-slate-600">Bookings can be entered here or received from the service booking feed. Reuse the booking reference to update or cancel it. Times below are Melbourne time.</p>
    <form className={card} onSubmit={async e => {
      e.preventDefault(); const lead = customers.find(row => row._id === leadId); if (!lead || busy) return;
      setBusy(true); setError('');
      try { await fetchApi('/trade-in/service-bookings',{method:'POST',body:JSON.stringify({leadId,dealership:lead.dealership,reference,startsAt:new Date(startsAt).toISOString(),vehicle})}); setReference(''); rows.refresh(); }
      catch(reason) { setError((reason as Error).message); } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <label>Find customer<input className={field} value={search} onChange={e => { setSearch(e.target.value); setLeadId(''); }} /></label>
        <label>Customer<select required className={field} value={leadId} onChange={e => setLeadId(e.target.value)}><option value="">Choose customer</option>{customers.map(row => <option value={row._id} key={row._id}>{row.name} · {row.dealership}</option>)}</select></label>
        <label>Booking reference<input required maxLength={120} className={field} value={reference} onChange={e => setReference(e.target.value)} /></label>
        <label>Booking time (your device timezone)<input required type="datetime-local" className={field} value={startsAt} onChange={e => setStartsAt(e.target.value)} /></label>
        <label>Vehicle<input maxLength={200} className={field} value={vehicle} onChange={e => setVehicle(e.target.value)} /></label>
        <button className={button}>Save booking</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
    {rows.data.map(row => <article className={card} key={row._id}><strong>{row.reference} · {row.vehicle}</strong><p>{displayDate(row.starts_at)} · {row.status}</p>
      {row.status === 'booked' && <button disabled={busy} className="min-h-11 underline" onClick={async () => {
        setBusy(true); setError('');
        try { await fetchApi('/trade-in/service-bookings',{method:'POST',body:JSON.stringify({dealership:row.dealership,leadId:row.lead_id,reference:row.reference,startsAt:row.starts_at,vehicle:row.vehicle,status:'cancelled'})}); rows.refresh(); }
        catch(reason) { setError((reason as Error).message); } finally { setBusy(false); }
      }}>Cancel booking</button>}
    </article>)}
    <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={20} onPageChange={setPage} itemName="bookings" />
  </>;
}
function LostCalls({ rooftop }: { rooftop: string }) {
  const [page,setPage] = useState(1);
  const rows = usePaginatedQuery(losses, { rooftop, page, limit: 20 }, setPage);
  return <>
    <p className="text-sm text-slate-600">Call lost customers and record their feedback, including valuation and margin concerns.</p>
    <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
    {rows.data.map(row => <LostCall key={row._id} row={row} onSaved={rows.refresh} />)}
    {!rows.isLoading && !rows.error && !rows.data.length && <p>No lost customers in this scope.</p>}
    <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={20} onPageChange={setPage} itemName="lost customers" />
  </>;
}
function LostCall({ row,onSaved }: { row: LostTradeCall; onSaved: () => void }) {
  const [reason,setReason] = useState('price'), [notes,setNotes] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const attempt = useRef<{id:string;body:string} | null>(null);
  return <form className={card} onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    const body = JSON.stringify({reason,notes});
    if (attempt.current?.body !== body) attempt.current = {id:crypto.randomUUID(),body};
    try { await fetchApi('/trade-in/loss-followups/'+row._id,{method:'POST',body:JSON.stringify({reason,notes,requestId:attempt.current.id})}); setNotes(''); attempt.current=null; onSaved(); }
    catch(failure) { setError((failure as Error).message); } finally { setBusy(false); }
  }}>
    <strong>{row.customer}</strong><p>{row.dealership} · {row.reason || 'No loss reason recorded'}</p>
    {row.phone && <a className="inline-block min-h-11 underline" href={'tel:'+row.phone}>Call {row.phone}</a>}
    {row.follow_up && <p className="text-sm">Last call: {row.follow_up.by_name} · {displayDate(row.follow_up.at)} · {row.follow_up.reason}<br />{row.follow_up.notes}</p>}
    <fieldset disabled={busy} className="space-y-3">
      <label className="block">Customer feedback<select className={field} value={reason} onChange={e => setReason(e.target.value)}>{['price','valuation','margin','other'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block">Call notes<textarea required maxLength={2000} className={field} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <button className={button}>Record manager call</button>
    </fieldset>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </form>;
}
