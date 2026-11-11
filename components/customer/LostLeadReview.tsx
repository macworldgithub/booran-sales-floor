'use client';
import { useEffect, useRef, useState } from 'react';
import { leadApi } from '@/lib/api';
import { oversightApi, type LossAction } from '@/lib/oversight';
import { useAuth } from '@/lib/auth';
import type { Lead } from '@/lib/types';

export function LostLeadReview({ lead, onUpdated, requestOpen = false }: { lead: Lead; onUpdated: (lead: Lead) => void; requestOpen?: boolean }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = lead.loss_review?.status === 'pending';
  const section = useRef<HTMLElement>(null);
  useEffect(() => { if (requestOpen) section.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [requestOpen]);
  useEffect(() => {
    if (!pending || !user?.canAllocate) return;
    let active = true;
    leadApi.getAssignees(lead._id).then(result => { if (active) setPeople(result.data || []); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [pending, user?.canAllocate, lead._id]);
  const run = async (action?: LossAction) => {
    setBusy(true); setError('');
    try {
      const result = action && lead.loss_review ? await oversightApi.reviewLoss(lead._id, { reviewId: lead.loss_review.id, action, notes, assigneeId: assignee || undefined }) : await oversightApi.requestLoss(lead._id, reason);
      if (result.data) onUpdated(result.data);
      setReason(''); setNotes('');
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  if (['sold', 'lost'].includes(lead.status) && !lead.loss_review) return null;
  return <section ref={section} aria-label="Lost lead review" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
    <h4 className="font-bold">{pending ? 'Loss awaiting manager approval' : 'Lost lead review'}</h4>
    {lead.loss_review && <p className="text-xs">{lead.loss_review.requested_name}: {lead.loss_review.reason} · {lead.loss_review.status}{lead.loss_review.notes ? ` · ${lead.loss_review.reviewed_name}: ${lead.loss_review.notes}` : ''}</p>}
    {pending && user?.canAllocate && <>
      <label className="block text-xs font-semibold">Manager notes<textarea value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <div className="flex flex-wrap gap-2">
        {([['approve', 'Approve loss'], ['call', 'Call customer myself'], ['return', 'Return to salesperson']] as const).map(([action, label]) => <button key={action} disabled={busy || (action !== 'approve' && !notes.trim())} onClick={() => run(action)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{label}</button>)}
      </div>
      <div className="flex flex-wrap gap-2"><select aria-label="Reassign lost lead to" value={assignee} onChange={event => setAssignee(event.target.value)} className="max-w-full rounded-lg border p-2"><option value="">Choose salesperson</option>{people.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select><button disabled={busy || !assignee || !notes.trim()} onClick={() => run('reassign')} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Reassign with notes</button></div>
      {lead.phone && <a href={`tel:${lead.phone}`} className="inline-block font-semibold text-blue-700">Call {lead.phone}</a>}
    </>}
    {!pending && !['sold', 'lost'].includes(lead.status) && <details open={requestOpen || undefined}><summary className="cursor-pointer font-semibold">Mark as LOST / request approval</summary><label className="mt-2 block text-xs">Reason (required)<textarea required value={reason} maxLength={2000} onChange={event => setReason(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label><button disabled={busy || !reason.trim()} onClick={() => run()} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit for approval</button></details>}
    {busy && <p role="status">Saving review…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
