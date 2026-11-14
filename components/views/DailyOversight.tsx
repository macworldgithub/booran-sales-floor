'use client';
import { useCallback, useEffect, useState } from 'react';
import { leadApi } from '@/lib/api';
import { oversightApi, type DailyOversight as DailyData, type IntakeSource } from '@/lib/oversight';
import { useAuth } from '@/lib/auth';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import { LeadAssignment } from '@/components/customer/LeadAssignment';
import { LostLeadReview } from '@/components/customer/LostLeadReview';
import { ManagerMergeRequests } from '@/components/customer/ManagerMergeRequests';
import { LeadIntegrationStatus } from '@/components/customer/LeadIntegrationStatus';
import { ConnexIntegration } from '@/components/customer/ConnexIntegration';
import type { Lead } from '@/lib/types';

const workdayColumns = [['customersUpdated', 'Customers updated'], ['videosAdded', 'Videos added'], ['videosSent', 'Videos sent'], ['nextActionsSet', 'Next actions set'], ['tasksCompleted', 'Tasks completed'], ['sales', 'Sales']] as const;
const eventLabels: Record<string, string> = { crm: 'Customer updated', videosAdded: 'Video added', videosSent: 'Video sent', nextActionsSet: 'Next action set', tasksCompleted: 'Task completed', sales: 'Sale completed' };
const button = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50';
const dateTime = (value: string) => new Date(value).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'short', timeStyle: 'short' });
function Signal({ value, children }: { value: string; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden className={`h-2.5 w-2.5 rounded-full ${value === 'green' ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="sr-only">{value === 'green' ? 'Complete: ' : 'Needs attention: '}</span>{children}</span>;
}
export function DailyOversight({ rooftop, onOpenLead }: { rooftop: string; onOpenLead: (lead: Lead) => void }) {
  const { user } = useAuth();
  const manager = Boolean(user?.canAllocate);
  const [selectedDate, setSelectedDate] = useState('');
  const [stored, setStored] = useState<{ rooftop: string; selectedDate: string; data: DailyData } | null>(null);
  const data = stored?.rooftop === rooftop && stored.selectedDate === selectedDate ? stored.data : null;
  const [expanded, setExpanded] = useState(manager ? '' : user?.id || '');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [queuePage, setQueuePage] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useRefreshOnResume(refresh);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 20000);
    window.addEventListener('booran:data-changed', refresh);
    return () => { clearInterval(timer); window.removeEventListener('booran:data-changed', refresh); };
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    oversightApi.daily(rooftop, controller.signal, queuePage, selectedDate).then(result => { if (!controller.signal.aborted && result.data) { setStored({ rooftop, selectedDate, data: result.data }); if (result.data.unassignedPagination) setQueuePage(page => Math.min(page, result.data!.unassignedPagination!.totalPages - 1)); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [rooftop, revision, queuePage, selectedDate]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); refresh(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  const open = (id: string) => run(async () => { const result = await leadApi.getLead(id); if (result.data) onOpenLead(result.data); });
  const workday = data?.workday;
  const member = workday?.members.find(person => person.id === expanded);
  const queuePages = data?.unassignedPagination?.totalPages ?? Math.max(1, Math.ceil((data?.unassigned.length || 0) / 5));
  const page = Math.min(queuePage, queuePages - 1);
  return <section aria-label={manager ? 'Daily manager oversight' : 'My daily oversight'} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">{manager ? 'Daily manager overview' : 'My daily overview'}</h2><p className="text-xs text-slate-600">{workday?.date || data?.date} · Melbourne time · Refreshes every 20 seconds{data ? ` · Updated ${dateTime(data.refreshedAt)}` : ''}</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">Workday · Melbourne<input aria-label="Workday" type="date" value={selectedDate || workday?.date || ''} max={data?.today} onChange={event => { setSelectedDate(event.target.value); setExpanded(''); }} className="mt-1 block min-h-11 rounded-lg border p-2" /></label><button type="button" onClick={() => setSelectedDate('')} className={button}>Today</button><button onClick={refresh} className={button}>Refresh overview</button></div></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{data ? ' · Showing the last successful update.' : ''}</p>}
    {!data && !error && <p role="status" className="text-sm text-slate-500">Loading daily activity…</p>}
    {data && <>
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Workday activity · <strong>{workday?.date}</strong> · Australia/Melbourne. Only events recorded on this date contribute to these counts.</p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-6">
        {workdayColumns.map(([field, label]) => <div key={field} className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-extrabold tabular-nums">{workday?.totals[field] ?? 0}</p><p className="text-slate-600">{label}</p></div>)}
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Salesperson events for the selected Melbourne workday.</caption><thead><tr className="border-b text-slate-500"><th scope="col" className="p-2">Salesperson</th>{workdayColumns.map(([field, label]) => <th key={field} scope="col" className="whitespace-nowrap p-2 font-semibold">{label}</th>)}</tr></thead><tbody>{workday?.members.map(person => <tr key={person.id} className={`border-b ${expanded === person.id ? 'bg-blue-50' : ''}`}>
        <th scope="row" className="p-2"><button aria-expanded={expanded === person.id} onClick={() => setExpanded(expanded === person.id ? '' : person.id)} className="min-h-11 text-left font-bold text-blue-800 underline underline-offset-2">{person.name}</button></th>
        {workdayColumns.map(([field]) => <td key={field} className="p-2 text-base font-bold tabular-nums">{person[field]}</td>)}
      </tr>)}</tbody></table></div>
      <p className="text-xs text-slate-500">Customers updated counts distinct customers; videos, next actions, completed tasks and sales count that workday’s recorded events. Select a salesperson to inspect the activity. Historical totals reflect the activity history available in Sales Floor.</p>
      {member && <section aria-label="Workday activity details" className="space-y-3 rounded-xl border border-blue-200 p-3"><div className="flex items-start justify-between gap-2"><h3 className="font-bold">{member.name} · {workday?.date}</h3><button className={button} onClick={() => setExpanded('')}>Close detail</button></div>
        {!member.events.length && <p className="text-sm">No activity recorded for this workday.</p>}
        {member.events.map((event, index) => <article key={`${event.kind}-${event.at}-${index}`} className="rounded-lg border p-3 text-xs"><p className="font-semibold">{eventLabels[event.kind] || event.kind} · {dateTime(event.at)}</p>{event.leadId && <button disabled={busy} className="min-h-11 text-blue-800 underline" onClick={() => open(event.leadId!)}>{event.customer}</button>}<p className="whitespace-pre-wrap break-words text-slate-600">{event.detail}</p></article>)}
        {member.events.length === 50 && <p className="text-xs text-slate-500">Showing the latest 50 workday events.</p>}
      </section>}
      <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-bold">Current pipeline and carry-overs</summary><p className="mt-2 text-xs">Current status · {data.date}: {data.summary.activeProspects} active prospects · {data.summary.unassigned} unassigned · {data.summary.overdueProspects} untouched prospects · {data.summary.tasksRemaining} tasks remaining · {data.summary.mtdSales} sales this month.</p>{data.dealerSocket && <p className="mt-2 text-xs">DealerSocket via SMS Campaign · {data.dealerSocket.active} active · {data.dealerSocket.assigned} assigned. {data.dealerSocket.snapshotAt && `Source captured ${dateTime(data.dealerSocket.snapshotAt)}.`}</p>}</details>
      <h3 className="text-sm font-bold">Current allocation and review tools</h3>
      {manager && <div className="grid gap-4 xl:grid-cols-2"><details className="rounded-xl border p-3" open={(data.unassignedPagination?.total ?? data.unassigned.length) > 0}><summary className="cursor-pointer text-sm font-bold">Unassigned / new leads ({(data.unassignedPagination?.total ?? data.unassigned.length)})</summary>{!(data.unassignedPagination?.total ?? data.unassigned.length) && <p className="mt-2 text-xs">No leads awaiting allocation.</p>}{(data.unassignedPagination ? data.unassigned : data.unassigned.slice(page * 5, page * 5 + 5)).map(lead => <div key={lead._id} className="mt-3 space-y-1 text-xs"><button className="font-semibold text-blue-800 underline" onClick={() => onOpenLead(lead)}>{lead.name}</button><p><Signal value="red">{lead.overdue ? 'Overdue · awaiting allocation' : 'Awaiting allocation'}</Signal> · {lead.source} · {lead.dealership}</p>{lead.source_owner && <p>DealerSocket owner · {lead.source_owner}</p>}{lead.quick_walk_in && <p>{lead.diary_entries?.[0]?.note}</p>}<LeadAssignment lead={lead} onUpdated={refresh} quick /></div>)}{queuePages > 1 && <div className="mt-3 flex items-center gap-2"><button className={button} disabled={page === 0} onClick={() => setQueuePage(page - 1)}>Previous</button><span>{page + 1}/{queuePages}</span><button className={button} disabled={page + 1 === queuePages} onClick={() => setQueuePage(page + 1)}>Next</button></div>}</details>
        <details className="rounded-xl border border-amber-200 p-3" open={data.losses.length > 0}><summary className="cursor-pointer text-sm font-bold">Lost-lead review ({data.losses.length} pending · {data.summary.lossesApprovedToday} approved today)</summary>{!data.losses.length && <p className="mt-2 text-xs">No losses awaiting approval.</p>}{data.losses.map(lead => <details key={lead._id} className="mt-3"><summary className="cursor-pointer text-xs font-semibold">{lead.name} · {lead.owner_name} · {lead.loss_review?.reason}</summary><button onClick={() => onOpenLead(lead)} className={`${button} my-2`}>Open customer</button><LostLeadReview lead={lead} onUpdated={refresh} /></details>)}</details>
      </div>}
      {manager && <ManagerMergeRequests key={`merges-${rooftop}`} rooftop={rooftop} revision={revision} onOpenLead={onOpenLead} />}
      {manager && <LeadIntegrationStatus key={`feeds-${rooftop}`} rooftop={rooftop} revision={revision} />}
      {manager && <ConnexIntegration key={`connex-${rooftop}`} rooftop={rooftop} revision={revision} onOpenLead={onOpenLead} />}
      {manager && <LeadIntake key={`intake-${rooftop}`} rooftop={rooftop} onImported={lead => { refresh(); onOpenLead(lead); }} />}

    </>}
  </section>;
}
function LeadIntake({ rooftop, onImported }: { rooftop: string; onImported: (lead: Lead) => void }) {
  const [source, setSource] = useState<IntakeSource>('connex');
  const [form, setForm] = useState({ externalId: '', dealership: rooftop === 'All Locations' ? '' : rooftop, name: '', phone: '', email: '', vehicle: '', opportunityStatus: '', notes: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const { locations } = useAuth();
  return <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-bold">Connex / external lead intake</summary><p className="my-2 text-xs text-slate-600">Use Hyundai Connex above for connected South Morang opportunities. This form also supports manually supplied external enquiries; reuse the source reference when updating contact details.</p><form className="grid gap-2 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { const result = await oversightApi.intake(source, form); if (result.data) onImported(result.data); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }}>
    <label className="text-xs">Source<select value={source} onChange={event => setSource(event.target.value as IntakeSource)} className="mt-1 block w-full rounded-lg border p-2">{[['connex', 'Connex'], ['drive', 'Drive'], ['socket', 'Socket'], ['website', 'Website'], ['sms', 'SMS campaign']].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label className="text-xs">Dealership<select required value={form.dealership} onChange={event => setForm({ ...form, dealership: event.target.value })} className="mt-1 block w-full rounded-lg border p-2"><option value="">Choose dealership</option>{locations.filter(site => site.toLowerCase() !== 'south morang').map(site => <option key={site}>{site}</option>)}</select></label>
    {([['externalId', 'Source lead reference (required)'], ['name', 'Customer name (when available)'], ['phone', 'Phone (once revealed)'], ['email', 'Email'], ['vehicle', 'Vehicle interest'], ['opportunityStatus', 'Opportunity status'], ['notes', 'Source notes']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<input required={key === 'externalId'} maxLength={key === 'notes' ? 5000 : 200} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="mt-1 block w-full rounded-lg border p-2" /></label>)}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}<button className={button} disabled={busy}>{busy ? 'Saving…' : 'Create / update unassigned lead'}</button>
  </form></details>;
}
