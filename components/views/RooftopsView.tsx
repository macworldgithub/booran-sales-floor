'use client';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import { useEffect, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { leadApi, inventoryApi } from '@/lib/api';
import type { Rooftop } from '@/lib/types';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { Pagination } from '@/components/ui/Pagination';
export function RooftopsView({ onSelectRooftopFilter, selectedRooftop }: { selectedRooftop: string; onSelectRooftopFilter?: (rooftop: string) => void }) {
  const [rooftops, setRooftops] = useState<Rooftop[]>([]);
  const [resolvedScope, setResolvedScope] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useRefreshOnResume(() => setRevision((value) => value + 1));
  useEffect(() => {
    const updated = () => setRevision((value) => value + 1);
    window.addEventListener('booran:data-changed', updated);
    return () => window.removeEventListener('booran:data-changed', updated);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setRooftops([]); setPage(1);
    Promise.all([leadApi.getCrmRooftops(selectedRooftop), inventoryApi.getInventoryRooftops(selectedRooftop)]).then((results) => {
      if (!active) return;
      const entries = results.flatMap((result) => result.data || []).filter((entry) => typeof entry.name === 'string' && entry.name.trim());
      const merged = new Map<string, Rooftop>();
      for (const entry of entries) merged.set(entry.name, { ...merged.get(entry.name), ...entry });
      setRooftops(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setResolvedScope(selectedRooftop);
    }).catch((failure) => { if (active) { setError(failure.message); setResolvedScope(selectedRooftop); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision, selectedRooftop]);
  const currentScope = resolvedScope === selectedRooftop;
  const busy = loading || !currentScope;
  const filtered = (currentScope ? rooftops : []).filter((rooftop) => `${rooftop.name} ${rooftop.location || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  return <div className="view-stack space-y-5">
    <div className="page-intro"><div><h1 className="text-2xl font-bold">Locations & Rooftops</h1><p className="mt-2 text-sm text-slate-500">Your authorised dealerships and facility details.</p></div><button aria-label="Refresh locations" onClick={() => setRevision((value) => value + 1)} className="rounded-xl border p-3"><RefreshCw size={18} /></button></div>
    <input aria-label="Search locations" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search locations" className="min-h-11 rounded-xl border border-slate-200 bg-white p-3 text-sm" />
    <QueryStatus error={currentScope ? error : null} isLoading={busy} onRetry={() => setRevision((value) => value + 1)} />
    {!busy && !error && !filtered.length && <p className="p-6 text-center text-sm text-slate-500">No matching locations.</p>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{filtered.slice((current - 1) * pageSize, current * pageSize).map((rooftop) => <article key={rooftop.name} className="surface-card space-y-4 p-5">
      <div className="flex items-start gap-3"><MapPin className="shrink-0 text-red-600" /><div className="min-w-0"><h2 className="font-bold">{rooftop.name}</h2><p className="text-sm text-slate-500">{rooftop.location || rooftop.brand || 'Booran Motors'}</p></div></div>
      {rooftop.generalManager && <p className="text-sm text-slate-600">General manager: {rooftop.generalManager}</p>}
      {rooftop.dealerPrincipal && <p className="text-sm text-slate-600">Dealer principal: {rooftop.dealerPrincipal}</p>}
      {onSelectRooftopFilter && <button onClick={() => onSelectRooftopFilter(rooftop.name)} className="min-h-11 rounded-lg bg-red-50 px-4 text-sm font-semibold text-red-700">View this dealership</button>}
    </article>)}</div>
    <Pagination currentPage={current} totalPages={Math.ceil(filtered.length / pageSize)} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} itemName="locations" isLoading={busy} />
  </div>;
}
