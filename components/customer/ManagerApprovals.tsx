'use client';
import { useEffect, useState } from 'react';
import { crmApi } from '@/lib/crm-updates';
import { leadApi } from '@/lib/api';
import type { Lead } from '@/lib/types';
import { LostLeadReview } from './LostLeadReview';
import { ManagerMergeRequests } from './ManagerMergeRequests';
type Queue = NonNullable<Awaited<ReturnType<typeof crmApi.approvals>>['data']>;
export function ManagerApprovals({ rooftop, revision, onOpenLead }: {
    rooftop: string;
    revision: number;
    onOpenLead: (lead: Lead) => void;
}) {
    const [data, setData] = useState<{
        site: string;
        queue: Queue;
    } | null>(null), [reload, setReload] = useState(0), [notes, setNotes] = useState<Record<string, string>>({}), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => { const controller = new AbortController(); crmApi.approvals(rooftop, controller.signal).then(result => { if (!controller.signal.aborted && result.data) {
        setData({ site: rooftop, queue: result.data });
        setError('');
    } }).catch(e => { if (!controller.signal.aborted)
        setError(e.message); }); return () => controller.abort(); }, [rooftop, revision, reload]);
    const queue = data?.site === rooftop ? data.queue : null;
    return <section aria-label="Manager approval queue" className="space-y-3 rounded-xl border border-amber-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Manager approval queue · date overrides, losses, merges & consent</h3><button className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => setReload(v => v + 1)}>Refresh approvals</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}{queue && !queue.requests.length && <p className="text-xs">No follow-up, loss or consent requests awaiting review.</p>}
    {queue?.requests.map(({ kind, lead, review }) => <article key={`${kind}-${review.id}`} className="space-y-2 rounded-lg border bg-white p-3 text-sm"><button className="font-semibold text-blue-800 underline" disabled={busy} onClick={async () => { setBusy(true); try {
            const result = await leadApi.getLead(lead._id);
            if (result.data)
                onOpenLead(result.data);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        } }}>{lead.name} · {lead.owner_name}</button><p>{kind === 'followup' ? 'Follow-up date override' : kind === 'loss' ? 'Lost-lead review' : 'Consent change'} · requested by {review.requested_name}</p>
      {kind === 'loss' ? <LostLeadReview lead={lead} onUpdated={() => setReload(v => v + 1)}/> : <><p>{review.title || review.reason}{review.due_at ? ` · ${new Date(review.due_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}` : ''}{kind === 'consent' ? ` · ${review.opt_out ? 'Opt out' : 'Restore contact'}` : ''}</p><label className="block text-xs">Manager review notes<textarea className="mt-1 min-h-20 w-full rounded-lg border p-2" value={notes[review.id] || ''} maxLength={2000} onChange={e => setNotes(v => ({ ...v, [review.id]: e.target.value }))}/></label><div className="flex gap-2">{(['approve', 'reject'] as const).map(action => <button key={action} disabled={busy || ((kind === 'consent' || action === 'reject') && !notes[review.id]?.trim())} className="min-h-11 rounded-lg border px-3 font-semibold disabled:opacity-50" onClick={async () => { setBusy(true); setError(''); try {
            await crmApi.review(lead._id, kind, review.id, action, notes[review.id] || '');
            setReload(v => v + 1);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        } }}>{action === 'approve' ? 'Approve' : 'Reject'}</button>)}</div></>}
    </article>)}
    {queue && queue.requests.length >= queue.limit && <p className="text-xs">Showing the first {queue.limit} customers awaiting review. Resolve these and refresh to load the remaining queue.</p>}
    <ManagerMergeRequests rooftop={rooftop} revision={revision + reload} onOpenLead={onOpenLead}/>
  </section>;
}
