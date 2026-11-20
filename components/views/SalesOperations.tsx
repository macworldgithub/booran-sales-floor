'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchApi, leadApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SalesCrmDashboard } from './SalesCrmDashboard';
import { Lead } from '@/lib/types';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { Pagination } from '@/components/ui/Pagination';
import { QueryStatus } from '@/components/ui/QueryStatus';

const card = 'rounded-xl border border-slate-200 bg-white p-4 space-y-3';
const field = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const button = 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40';
export function PulseDashboard(props: Parameters<typeof SalesCrmDashboard>[0]) {
  return <><SalesCrmDashboard {...props} /><details className={card}><summary className="cursor-pointer text-sm font-semibold">Customer alert feed & category settings</summary><LeadAlertFeed rooftop={props.rooftop} onOpenLead={props.onOpenLead} /></details></>;
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
