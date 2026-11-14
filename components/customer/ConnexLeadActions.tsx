'use client';
import { useEffect, useRef, useState } from 'react';
import { connexApi, pendingJob, type ConnexCustomer } from '@/lib/connex';
import { leadApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Lead } from '@/lib/types';
import { ConnexPreferences } from '@/components/customer/ConnexPreferences';
const button = 'min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50';
export function ConnexLeadActions({ lead, onUpdated, onRequestLost }: { lead: Lead; onUpdated: (lead: Lead) => void; onRequestLost: () => void }) {
  const [data, setData] = useState<ConnexCustomer | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [note, setNote] = useState(''), [subStatus, setSubStatus] = useState(''), [reload, setReload] = useState(0);
  const [lostReason, setLostReason] = useState('LMS Lost');
  const lock = useRef(false), requests = useRef<Record<string, string>>({}), done = useRef(new Set<string>()), update = useRef(onUpdated);
  update.current = onUpdated;
  const { user } = useAuth();
  const linked = lead.source === 'Connex' || lead.source_refs?.some(ref => ref.source === 'Connex');
  useEffect(() => {
    if (!linked) return;
    const controller = new AbortController();
    const read = async () => {
      try {
        const result = await connexApi.customer(lead._id, controller.signal);
        if (controller.signal.aborted) return;
        setData(result.data || null);
        if (result.data?.jobs.some(job => job.status === 'done' && !done.current.has(job.id))) {
          result.data.jobs.filter(job => job.status === 'done').forEach(job => done.current.add(job.id));
          const fresh = await leadApi.getLead(lead._id);
          if (!controller.signal.aborted && fresh.data) update.current(fresh.data);
        }
      } catch (reason) { if (!controller.signal.aborted) setError((reason as Error).message); }
    };
    void read(); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void read(); }, 5000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [lead._id, linked, reload]);
  if (!linked) return null;
  const act = async (recordId: string, action: string) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    const payload = { recordId, action, ...(action === 'close_lost' ? { lostReason } : {}), ...(action === 'note' ? { note } : {}), ...(action === 'qualify' && subStatus.trim() ? { subStatus: subStatus.trim() } : {}) };
    const key = JSON.stringify([payload, lead.owner_id, lead.status, lead.loss_review?.id]), requestId = requests.current[key] ||= crypto.randomUUID();
    try {
      await connexApi.action(lead._id, { ...payload, requestId });
      if (action === 'note') setNote('');
      setMessage('Action queued. The Connex status updates after the source confirms it.'); setReload(value => value + 1);
    } catch (reason) { setError((reason as Error).message); } finally { lock.current = false; setBusy(false); }
  };
  return <section aria-label="Connex opportunity" className="space-y-3 rounded-xl border border-blue-200 p-3">
    <h4 className="text-sm font-bold">Hyundai Connex</h4>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}{message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
    {data && !data.records.length && <p className="text-xs">This enquiry has not been linked to a verified Connex opportunity. Ask a manager to import its opportunity link.</p>}
    {data?.records.map(record => {
      const pending = data.jobs.some(job => job.recordId === record.recordId && pendingJob(job));
      const closed = ['Closed Won', 'Closed Lost'].includes(record.snapshot.stage), disabled = busy || pending || !data.configured || !data.writesEnabled;
      return <article key={record.recordId} className="space-y-2 text-xs">
        <p className="font-semibold">{record.snapshot.opportunityName} · {record.snapshot.stage}{record.snapshot.subStatus && ` · ${record.snapshot.subStatus}`}</p>
        <p>Connex salesperson: {record.snapshot.salesperson || 'Unassigned'} · {record.detailsPending ? 'Contact details hidden until accepted' : 'Contact details available'}</p>
        {record.outcome === 'merge_review' && <p className="rounded-lg bg-amber-50 p-2 text-amber-900">The revealed mobile matches an existing customer. A manager must resolve the merge review before the contact can be attached.</p>}
        {record.milestoneError && <p className="text-red-700">Staff update needs attention: {record.milestoneError}</p>}
        {record.snapshot.vehicle && <p>Vehicle interest: {record.snapshot.vehicle}</p>}
        {record.acceptanceOverdue && <p className="text-red-700">Acceptance overdue. Due {new Date(record.acceptanceDueAt!).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}.</p>}
        <div className="flex flex-wrap gap-2"><a className={button} href={record.snapshot.url} target="_blank" rel="noopener noreferrer">Open Connex</a><button className={button} disabled={busy || pending || !data.configured} onClick={() => act(record.recordId, 'refresh')}>Refresh details</button>
          {!closed && <><button className={button} disabled={disabled} onClick={() => act(record.recordId, 'accept')}>Accept and reveal details</button><button className={button} disabled={disabled || !lead.owner_id} onClick={() => act(record.recordId, 'assign')}>Send assigned salesperson</button></>}
        </div>
        {!closed && <div className="flex flex-wrap items-center gap-2"><input className="min-h-11 rounded-lg border p-2" aria-label="Connex dealer sub-status" placeholder="Dealer sub-status (optional)" value={subStatus} maxLength={100} onChange={event => setSubStatus(event.target.value)} /><button className={button} disabled={disabled} onClick={() => act(record.recordId, 'qualify')}>Set Sales Qualified</button><p className="text-slate-500">Use the exact sub-status available for this opportunity type, such as Information Request.</p></div>}
        {!closed && lead.status === 'sold' && <button className={button} disabled={disabled} onClick={() => act(record.recordId, 'close_won')}>Close Connex as won</button>}
        {!closed && lead.status === 'lost' && lead.loss_review?.status === 'approved' && <div className="flex flex-wrap gap-2"><label>Connex lost reason<select className="ml-2 min-h-11 rounded-lg border p-2" value={lostReason} onChange={event => setLostReason(event.target.value)}>{(data.lostReasons || ['LMS Lost']).map(reason => <option key={reason}>{reason}</option>)}</select></label><button className={button} disabled={disabled} onClick={() => act(record.recordId, 'close_lost')}>Close Connex with approved loss reason</button><p className="w-full text-slate-500">The full manager-approved reason is included in Connex comments.</p></div>}
        {!closed && !['sold', 'lost'].includes(lead.status) && <button className={button} disabled={busy} onClick={onRequestLost}>Request manager loss review</button>}
        <form className="space-y-2" onSubmit={event => { event.preventDefault(); void act(record.recordId, 'note'); }}><label className="block">Share a note with Connex<textarea className="mt-1 w-full rounded-lg border p-2" value={note} maxLength={3500} onChange={event => setNote(event.target.value)} required /></label><button className={button} disabled={disabled || !note.trim()}>Share note</button></form>
        {record.snapshot.latestNote && <details><summary className="cursor-pointer">Latest Connex note</summary><p className="whitespace-pre-wrap break-words">{record.snapshot.latestNote}</p></details>}
        {data.jobs.filter(job => job.recordId === record.recordId).slice(0, 5).map(job => <div key={job.id} className="rounded border p-2"><p>{job.action.replaceAll('_', ' ')} · {job.status}</p>{job.error && <p className="text-red-700">{job.error}</p>}{user?.canAllocate && job.status === 'needs_attention' && job.action !== 'note' && <button className={button} disabled={busy} onClick={async () => { if (lock.current) return; lock.current = true; setBusy(true); try { await connexApi.retry(job.id); setReload(value => value + 1); } catch (reason) { setError((reason as Error).message); } finally { lock.current = false; setBusy(false); } }}>Retry</button>}</div>)}
      </article>;
    })}
    <ConnexPreferences />
  </section>;
}
