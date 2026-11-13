'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { Lead } from '@/lib/types';
import { MergeCustomerSummary } from './CustomerMerge';

type Review = { id: string; dealership: string; requestedName: string; updatedAt: string; incoming: Lead; candidates: Lead[] };
const button = 'rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50';

function reviewKey(review: Review) {
  const details = (lead: Lead) => [lead._id, lead.name, lead.phone, lead.email, lead.owner_name,
    lead.status, lead.source, lead.vehicle, lead.diary_entries];
  // Polling can change updatedAt without changing the details the manager confirmed.
  // Keep that form mounted; require fresh confirmation when the reviewed details change.
  return JSON.stringify([review.id, review.dealership, review.requestedName,
    details(review.incoming), review.candidates.map(details)]);
}

export function ManagerMergeRequests({ rooftop, revision, onOpenLead }: { rooftop: string; revision: number; onOpenLead: (lead: Lead) => void }) {
  const [stored, setStored] = useState<{ site: string; rows: Review[]; total: number; totalPages: number } | null>(null);
  const [page, setPage] = useState(1), [version, setVersion] = useState(0), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchApi<Review[]>(`/merge-requests?rooftop=${encodeURIComponent(rooftop)}&page=${page}&limit=10`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setStored({ site: rooftop, rows: result.data || [], total: result.pagination?.total || 0, totalPages: Math.max(1, result.pagination?.totalPages || 1) }); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [rooftop, revision, page, version]);
  const data = stored?.site === rooftop ? stored : null;
  return <details className="space-y-3 rounded-xl border border-amber-200 p-3">
    <summary className="cursor-pointer text-sm font-bold">Duplicate mobile / manager merge requests ({data?.total || 0})</summary>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {data?.total === 0 && <p className="text-xs">No new duplicate-mobile requests.</p>}
    {data?.rows.map(review => <MergeReview key={reviewKey(review)} review={review} onOpenLead={onOpenLead} onResolved={() => setVersion(value => value + 1)} />)}
    {data && data.totalPages > 1 && <div className="flex items-center gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous requests</button><span className="text-xs">{page}/{data.totalPages}</span><button className={button} disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next requests</button></div>}
  </details>;
}

function MergeReview({ review, onOpenLead, onResolved }: { review: Review; onOpenLead: (lead: Lead) => void; onResolved: () => void }) {
  const [primaryId, setPrimaryId] = useState(review.candidates.length === 1 ? review.candidates[0]._id : '');
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const primary = review.candidates.find(row => row._id === primaryId);
  return <div className="space-y-3 rounded-lg border p-3 text-xs">
    <p className="font-semibold">{review.incoming.name} · {review.incoming.phone} · {review.dealership}</p>
    <p>Flagged by {review.requestedName}. Creation was blocked to prevent another customer entity.</p>
    <label>Primary customer to keep<select aria-label={`Primary for ${review.incoming.name}`} value={primaryId} disabled={busy} onChange={event => { setPrimaryId(event.target.value); setConfirmed(false); }} className="ml-2 max-w-full rounded-lg border p-2"><option value="">Choose primary</option>{review.candidates.map(row => <option key={row._id} value={row._id}>{row.name} · {row.source} · {row.owner_name}</option>)}</select></label>
    {primary && <>
      <div className="grid gap-2 sm:grid-cols-2"><MergeCustomerSummary lead={primary} label="Primary survives" /><MergeCustomerSummary lead={review.incoming} label="Incoming details" /></div>
      <label className="flex min-h-11 cursor-pointer select-none items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
        <input type="checkbox" className="h-5 w-5 shrink-0 cursor-pointer accent-blue-700" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy} />
        <span>I confirm this incoming enquiry belongs to the selected primary.</span>
      </label>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => onOpenLead(primary)}>Open primary customer</button><button className={button} disabled={!confirmed || busy} onClick={async () => {
        setBusy(true); setError('');
        try { await fetchApi(`/merge-requests/${encodeURIComponent(review.id)}/resolve`, { method: 'POST', body: JSON.stringify({ primaryId, expectedUpdatedAt: review.updatedAt }) }); if (active.current) onResolved(); }
        catch (reason) { if (active.current) setError((reason as Error).message); }
        finally { if (active.current) setBusy(false); }
      }}>{busy ? 'Transferring…' : 'Transfer missing details to primary'}</button></div>
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
