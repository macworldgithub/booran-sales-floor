'use client';
import { useEffect, useState } from 'react';
import { connexApi, type ConnexStatus, type ConnexRecord, pendingJob } from '@/lib/connex';
import { leadApi } from '@/lib/api';
import type { Lead } from '@/lib/types';
const button = 'min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50';
const date = (value?: string) => value ? new Date(value).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' }) : 'Not yet';
export function ConnexIntegration({ rooftop, revision, onOpenLead }: { rooftop: string; revision: number; onOpenLead: (lead: Lead) => void }) {
  const [status, setStatus] = useState<ConnexStatus | null>(null), [rows, setRows] = useState<ConnexRecord[]>([]);
  const [view, setView] = useState('all'), [page, setPage] = useState(1), [pages, setPages] = useState(0);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
  const [map, setMap] = useState<Record<string, string> | null>(null), [reference, setReference] = useState('');
  const visible = ['All Locations', 'South Morang Hyundai'].includes(rooftop);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    Promise.all([connexApi.status(controller.signal), connexApi.records(view, page, controller.signal)]).then(([s, r]) => {
      if (!controller.signal.aborted) { setStatus(s.data || null); setRows(r.data || []); setPages(r.pagination?.totalPages || 0); setError(''); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [visible, revision, view, page, reload]);
  if (!visible) return null;
  const perform = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return; setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); setReload(value => value + 1); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  return <details className="space-y-3 rounded-xl border border-blue-200 p-3"><summary className="cursor-pointer text-sm font-bold">Hyundai Connex · {status?.records ?? '…'} enquiries</summary>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {status && <>
      <p className="text-xs text-slate-600">{!status.configured ? 'Connection needs setup.' : status.running ? 'Checking Connex…' : 'Connected.'} {status.writesEnabled ? 'Updates enabled.' : 'Source updates paused.'} Last successful check: {date(status.lastPullAt)}.</p>
      {status.error && <p role="alert" className="text-sm text-red-700">{status.error}</p>}
      <p className="text-xs">{status.discovered} discovered · {status.records} checked · {status.imported} linked to customers · {status.mergeReviews} merge reviews · {status.pendingDetails} awaiting details · {status.masked} contact details hidden · {status.failedPulls} read failures. {status.complete ? 'All Opportunities list fully read.' : 'List coverage has not been confirmed; further opportunities may remain.'}</p>
      <p className="text-xs text-amber-800">{status.acceptanceOverdue} acceptance overdue · {status.notAcceptedThreeDays} unaccepted for 3 days · {status.openSixWeeks} open for 6 weeks.</p>
      <button className={button} disabled={busy || !status.configured || status.running} onClick={() => perform(() => connexApi.sync(), 'Connex pull queued. New records appear as their details are read.')}>Pull Connex leads</button>
      <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void perform(async () => { await connexApi.import(reference); setReference(''); }, 'Opportunity queued for verification and import.'); }}>
        <input aria-label="Connex opportunity link" required value={reference} onChange={event => setReference(event.target.value)} placeholder="Paste an opportunity link" className="min-h-11 min-w-0 flex-1 rounded-lg border p-2 text-sm" /><button className={button} disabled={busy || !status.configured}>Import opportunity</button>
      </form>
      <label className="block text-xs">Show <select className="ml-2 min-h-11 rounded-lg border p-2" value={view} onChange={event => { setView(event.target.value); setPage(1); }}><option value="all">All enquiries</option><option value="masked">Contact details hidden</option><option value="overdue">Acceptance overdue</option><option value="three_days">Unaccepted 3 days</option><option value="six_weeks">Open 6 weeks</option><option value="merge_review">Merge review</option></select></label>
      {rows.map(record => <article key={record.recordId} className="space-y-1 rounded-lg border p-3 text-xs">
        <p className="font-semibold">{record.snapshot.name || record.snapshot.opportunityName} · {record.snapshot.type}</p><p>{record.snapshot.stage} {record.snapshot.subStatus && `· ${record.snapshot.subStatus}`} · Connex salesperson: {record.snapshot.salesperson || 'Unassigned'}</p>
        <p>{record.snapshot.vehicle || 'Vehicle not supplied'} · {record.detailsPending ? 'Contact details hidden until accepted' : 'Contact details available'} · Pulled {date(record.lastPullAt)}</p>
        {record.acceptanceOverdue && <p className="text-red-700">Acceptance overdue since {date(record.acceptanceDueAt)}</p>}
        {record.outcome === 'merge_review' && <p className="text-amber-800">Mobile matches another customer. Resolve this enquiry in the merge-review queue.</p>}
        <div className="flex gap-2">{record.leadId && <button className={button} disabled={busy} onClick={() => perform(async () => { const result = await leadApi.getLead(record.leadId!); if (result.data) onOpenLead(result.data); }, '')}>Open customer</button>}<a className={button} href={record.snapshot.url} target="_blank" rel="noopener noreferrer">Open Connex</a></div>
      </article>)}
      {!rows.length && <p className="text-xs">No enquiries in this view.</p>}
      {pages > 1 && <div className="flex items-center gap-2 text-xs"><button className={button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button>{page}/{pages}<button className={button} disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</button></div>}
      {!!status.jobs.length && <details><summary className="cursor-pointer text-xs font-semibold">Pending or failed Connex actions ({status.jobs.length})</summary>{status.jobs.map(job => <div key={job.id} className="mt-2 rounded border p-2 text-xs"><p>{job.action.replaceAll('_', ' ')} · {job.recordId} · {job.status}</p>{job.error && <p className="text-red-700">{job.error}</p>}{!pendingJob(job) && job.action !== 'note' && <button className={button} disabled={busy} onClick={() => perform(() => connexApi.retry(job.id), 'Action queued for retry.')}>Retry</button>}</div>)}</details>}
      <details><summary className="cursor-pointer text-xs font-semibold">Salesperson mappings</summary><p className="my-2 text-xs text-slate-600">Names match automatically when unique. Enter the exact Connex contact name when it differs from Sales Floor.</p><form className="space-y-2" onSubmit={event => { event.preventDefault(); void perform(async () => { await connexApi.staffMap(map || Object.fromEntries(status.staff.map(person => [person.id, person.connexName]))); setMap(null); }, 'Salesperson mappings saved.'); }}>{status.staff.map(person => <label key={person.id} className="grid gap-1 text-xs sm:grid-cols-2">{person.name}<input aria-label={`Connex name for ${person.name}`} className="min-h-11 rounded border p-2" value={map?.[person.id] ?? person.connexName} placeholder={person.name} onChange={event => setMap(current => ({ ...(current || Object.fromEntries(status.staff.map(p => [p.id, p.connexName]))), [person.id]: event.target.value }))} /></label>)}<button className={button} disabled={busy || !map}>Save mappings</button></form></details>
    </>}
  </details>;
}
