'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchApi, leadApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { saveJson } from '@/lib/appraisals';
import { Lead } from '@/lib/types';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { Pagination } from '@/components/ui/Pagination';
import { QueryStatus } from '@/components/ui/QueryStatus';

const card = 'rounded-xl border border-slate-200 bg-white p-4 space-y-3';
const field = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const button = 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40';
type Pulse = { currentActive: number; unactioned: number; appointments: number; overdue: number; completed: number; conversion: number; videos: number; monthlyTarget: number;
  signals: { followUp: string; conversion: string }; attention: { id: string; name: string; owner: string; dealership: string }[];
  team: { id: string; name: string; leads: number; sales: number }[]; sites: { name: string; leads: number; sales: number }[]; models: { name: string; sales: number }[] };
export function PulseDashboard({ rooftop, onOpenLead }: { rooftop: string; onOpenLead: (lead: Lead) => void }) {
  const { user } = useAuth();
  const manager = ['super_admin', 'manager', 'dealer_principal', 'general_manager', 'sales_manager'].includes(user?.role || '');
  const [period, setPeriod] = useState('today'), [data, setData] = useState<Pulse | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [settings, setSettings] = useState({ followUpHours: 72, conversionTarget: 15, monthlyTarget: 10 }), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    fetchApi<Pulse>(`/pulse?rooftop=${encodeURIComponent(rooftop)}&period=${period}`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setData(result.data || null); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [rooftop, period, revision]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 30000);
    window.addEventListener('booran:data-changed', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('booran:data-changed', refresh); };
  }, []);
  return <section className={card} aria-label="PULSE sales summary">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-extrabold">PULSE · {manager ? 'Management overview' : 'My sales summary'}</h2><p className="text-sm text-slate-600">Melbourne reporting days · updates every 30 seconds</p></div><div className="flex gap-2"><select aria-label="Summary period" className={field} value={period} onChange={e => setPeriod(e.target.value)}><option value="today">Today</option><option value="week">Weekly</option><option value="month">Month to date</option></select><button type="button" className={button} onClick={() => setRevision(value => value + 1)}>Refresh</button></div></div>
    <QueryStatus error={error || null} isLoading={!data && !error} onRetry={() => setRevision(value => value + 1)} />
    {data && <>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Active leads', data.currentActive], ['Unactioned leads', data.unactioned], ['Appointments / test drives', data.appointments], ['Overdue SLA', data.overdue], ['Completed deals', data.completed], ['Lead-to-sale conversion', `${data.conversion}%`], ['Videos sent', data.videos], ['Monthly target', data.monthlyTarget]].map(([title, value]) => <div key={title} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-600">{title}</dt><dd className="text-2xl font-bold">{value}</dd></div>)}</dl>
      <div className="flex flex-wrap gap-3 text-sm">{Object.entries(data.signals).map(([key, value]) => <span key={key} className={`rounded px-2 py-1 ${value === 'green' ? 'bg-emerald-100 text-emerald-900' : value === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}>{key === 'followUp' ? 'Follow-up' : 'Conversion'}: {value}</span>)}</div>
      {!!data.attention.length && <div><h3 className="mb-2 font-bold">Follow-ups needing attention</h3>{data.attention.map(lead => <button type="button" key={lead.id} className="block w-full border-t p-2 text-left text-sm" onClick={async () => { try { const result = await leadApi.getLead(lead.id); if (result.data) onOpenLead(result.data); } catch (reason) { setError((reason as Error).message); } }}>{lead.name} · {lead.owner} · {lead.dealership}</button>)}</div>}
      {manager && <div className="grid gap-3 md:grid-cols-3">{[{ title: 'Team results', rows: data.team }, { title: 'Site comparison', rows: data.sites }, { title: 'Sold model mix', rows: data.models }].map(group => <div key={group.title} className="rounded-lg border p-3"><h3 className="font-semibold">{group.title}</h3>{group.rows.map((item, index) => <p className="text-sm" key={index}>{item.name} · {item.sales} sales {'leads' in item ? ` / ${item.leads} leads` : ''}</p>)}{!group.rows.length && <p className="text-sm text-slate-600">No records in this period.</p>}</div>)}</div>}
      <button className={button} type="button" onClick={() => saveJson({ rooftop, period, generatedAt: new Date().toISOString(), ...data }, 'booran-pulse-report.json')}>Export PULSE report</button>
    </>}
    <LeadAlertFeed rooftop={rooftop} onOpenLead={onOpenLead} />
    {manager && rooftop !== 'All Locations' && rooftop !== 'South Morang' && <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Configure this dealership’s PULSE targets</summary><form className="mt-3 space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); setNotice(''); try { await fetchApi('/pulse/settings', { method: 'PATCH', body: JSON.stringify({ dealership: rooftop, ...settings }) }); setRevision(value => value + 1); setNotice('Targets saved.'); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }}><div className="grid gap-2 sm:grid-cols-3">{(Object.keys(settings) as (keyof typeof settings)[]).map(key => <label key={key} className="text-sm">{key}<input className={field} type="number" min={1} max={key === 'conversionTarget' ? 100 : key === 'followUpHours' ? 720 : 10000} value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} /></label>)}</div><button className={button} disabled={busy}>Save targets</button>{notice && <p role="status">{notice}</p>}</form></details>}
  </section>;
}

type SalesAlert = { _id: string; lead_id: string; kind: string; title: string; dealership: string; createdAt: string };
const alertTitles = { high_buyer: 'High Buyer Alert', price_objection: 'Price Objection Alert', high_risk: 'High Risk Alert' };
const alertRows = (params: Record<string, string | number>, options?: RequestInit) => fetchApi<SalesAlert[]>(`/lead-alerts?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`, options);
function LeadAlertFeed({ rooftop, onOpenLead }: { rooftop: string; onOpenLead: (lead: Lead) => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1), [kind, setKind] = useState(''), [error, setError] = useState('');
  const [enabled, setEnabled] = useState<string[] | null>(null), [saving, setSaving] = useState(false);
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const rows = usePaginatedQuery(alertRows, { rooftop, page, limit: 10, ...(kind ? { kind } : {}) }, setPage);
  const manager = ['super_admin', 'manager', 'dealer_principal', 'general_manager', 'sales_manager'].includes(user?.role || '');
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') rows.refresh(); }, 30000);
    return () => window.clearInterval(timer);
  }, [rows.refresh]);
  useEffect(() => {
    if (!manager || ['All Locations', 'South Morang'].includes(rooftop)) return;
    const controller = new AbortController();
    fetchApi<{ enabled: string[] }>(`/lead-alerts/settings?rooftop=${encodeURIComponent(rooftop)}`, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setEnabled(result.data?.enabled || []); }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [manager, rooftop]);
  return <section className="space-y-3 border-t pt-3"><h3 className="font-bold">Customer alerts</h3><select aria-label="Alert category" className={field} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">All categories</option>{Object.entries(alertTitles).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select>
    <QueryStatus error={rows.error} isLoading={rows.isLoading} onRetry={rows.refresh} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {rows.data.map(row => <button type="button" key={row._id} className="block w-full rounded-lg border p-3 text-left text-sm" onClick={async () => {
      const current = ++version.current; setError('');
      try { const result = await leadApi.getLead(row.lead_id); if (current === version.current && result.data) onOpenLead(result.data); } catch (reason) { if (current === version.current) setError((reason as Error).message); }
    }}><strong>{row.title}</strong> · {row.dealership} · {new Date(row.createdAt).toLocaleString()}<span className="block text-xs underline">Open customer</span></button>)}
    {!rows.isLoading && !rows.error && !rows.data.length && <p className="text-sm text-slate-600">No alerts in this category.</p>}
    <Pagination currentPage={page} totalPages={rows.pagination.totalPages} totalItems={rows.pagination.total} pageSize={10} onPageChange={setPage} itemName="alerts" />
    {enabled && <details><summary className="cursor-pointer text-sm font-semibold">Configure dealership alert categories</summary><div className="mt-2 space-y-2">{Object.entries(alertTitles).map(([value, title]) => <label className="flex gap-2 text-sm" key={value}><input type="checkbox" checked={enabled.includes(value)} disabled={saving} onChange={e => setEnabled(e.target.checked ? [...enabled, value] : enabled.filter(item => item !== value))} />{title}</label>)}<button className={button} type="button" disabled={saving} onClick={async () => { setSaving(true); setError(''); try { await fetchApi('/lead-alerts/settings', { method: 'PATCH', body: JSON.stringify({ dealership: rooftop, enabled }) }); } catch (reason) { setError((reason as Error).message); } finally { setSaving(false); } }}>Save alert categories</button></div></details>}
  </section>;
}

import { DeliveryCentreView } from './DeliveryCentreView';

export function DeliveryCentre({ rooftop }: { rooftop: string }) {
  return <DeliveryCentreView rooftop={rooftop} />;
}
