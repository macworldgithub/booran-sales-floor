'use client';
import { useCallback, useEffect, useState } from 'react';
import { leadApi, salesWorkApi } from '@/lib/api';
import { oversightApi, type DailyOversight as DailyData, type IntakeSource } from '@/lib/oversight';
import { useAuth } from '@/lib/auth';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import { LeadAssignment } from '@/components/customer/LeadAssignment';
import { LostLeadReview } from '@/components/customer/LostLeadReview';
import type { Lead } from '@/lib/types';

const button = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50';
const dateTime = (value: string) => new Date(value).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'short', timeStyle: 'short' });
const completion = (done: number, total: number, empty = 'No active prospects') => total ? `${done}/${total} (${Math.floor(done * 100 / total)}%)` : empty;
function Signal({ value, children }: { value: string; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden className={`h-2.5 w-2.5 rounded-full ${value === 'green' ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="sr-only">{value === 'green' ? 'Complete: ' : 'Needs attention: '}</span>{children}</span>;
}
export function DailyOversight({ rooftop, onOpenLead }: { rooftop: string; onOpenLead: (lead: Lead) => void }) {
  const { user } = useAuth();
  const manager = Boolean(user?.canAllocate);
  const [stored, setStored] = useState<{ rooftop: string; data: DailyData } | null>(null);
  const data = stored?.rooftop === rooftop ? stored.data : null;
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
    oversightApi.daily(rooftop, controller.signal, queuePage).then(result => { if (!controller.signal.aborted && result.data) { setStored({ rooftop, data: result.data }); if (result.data.unassignedPagination) setQueuePage(page => Math.min(page, result.data!.unassignedPagination!.totalPages - 1)); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [rooftop, revision, queuePage]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); refresh(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  const open = (id: string) => run(async () => { const result = await leadApi.getLead(id); if (result.data) onOpenLead(result.data); });
  const member = data?.members.find(person => person.id === expanded);
  const queuePages = data?.unassignedPagination?.totalPages ?? Math.max(1, Math.ceil((data?.unassigned.length || 0) / 5));
  const page = Math.min(queuePage, queuePages - 1);
  return <section aria-label={manager ? 'Daily manager oversight' : 'My daily oversight'} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">{manager ? 'Daily manager overview' : 'My daily overview'}</h2><p className="text-xs text-slate-600">{data?.date} · Melbourne time · Refreshes every 20 seconds{data ? ` · Updated ${dateTime(data.refreshedAt)}` : ''}</p></div><button onClick={refresh} className={button}>Refresh overview</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{data ? ' · Showing the last successful update.' : ''}</p>}
    {!data && !error && <p role="status" className="text-sm text-slate-500">Loading daily activity…</p>}
    {data && <>
      {data.dealerSocket && <p className="text-xs text-slate-600">DealerSocket via SMS Campaign · {data.dealerSocket.active} active · {data.dealerSocket.assigned} assigned · {data.dealerSocket.active - data.dealerSocket.assigned} awaiting allocation. {data.dealerSocket.snapshotAt ? `Source captured ${dateTime(data.dealerSocket.snapshotAt)}.` : 'Source capture time unavailable.'} The source date changes when SMS Campaign receives a new DealerSocket snapshot.</p>}
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-7">
        {[[data.summary.activeProspects, 'Active prospects'], [`${data.summary.tasksCompleted}/${data.summary.tasksTotal}`, 'Tasks complete'], [data.summary.tasksRemaining, 'Tasks remaining'], [data.summary.overdueTasks, 'Overdue tasks'], [data.summary.overdueProspects, 'Untouched prospects'], [data.summary.mtdSales, 'Sales this month'], [data.summary.carryOvers, 'Prior-day task carry-overs']].map(([value, label]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-extrabold tabular-nums">{value}</p><p className="text-slate-600">{label}</p></div>)}
      </div>
      <p className={`rounded-lg p-2 text-xs font-semibold ${data.summary.allGreen ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`} role="status">{data.summary.allGreen ? 'All green — zero outstanding daily actions.' : `${data.summary.activityRemaining} need activity today · ${data.summary.nextActionsRemaining} need next actions · ${data.summary.overdueProspects} untouched prospects · ${data.summary.videosRemaining} videos remaining · ${data.summary.tasksRemaining} tasks remaining · ${data.summary.pendingLosses} losses to review · ${data.summary.unassigned} unassigned`}</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Daily salesperson activity. Select a name to inspect customers, videos, notes and tasks.</caption><thead><tr className="border-b text-slate-500">{['Salesperson', 'CRM activity', 'Videos', 'Next actions', 'Tasks', 'Overdue', 'MTD sales'].map(label => <th key={label} scope="col" className="whitespace-nowrap p-2 font-semibold">{label}</th>)}</tr></thead><tbody>{data.members.map(person => <tr key={person.id} className={`border-b ${expanded === person.id ? 'bg-blue-50' : ''}`}>
        <th scope="row" className="p-2"><button aria-expanded={expanded === person.id} onClick={() => setExpanded(expanded === person.id ? '' : person.id)} className="text-left font-bold text-blue-800 underline underline-offset-2">{person.name}</button><p className="mt-1 font-normal text-slate-600">{person.activeProspects} active prospects</p></th>
        <td className="p-2"><Signal value={person.signals.activity}>{completion(person.logged, person.activeProspects)} updated today</Signal></td>
        <td className="p-2"><Signal value={person.signals.videos}>{completion(person.videosDone, person.expected)} videos · {person.videoSent} sent</Signal></td>
        <td className="p-2"><Signal value={person.signals.nextActions}>{completion(person.nextActions, person.activeProspects)} set</Signal></td>
        <td className="p-2"><Signal value={person.signals.tasks}>{completion(person.tasksCompleted, person.tasksTotal, 'No tasks due')} · {person.tasksRemaining} remaining</Signal></td>
        <td className="whitespace-nowrap p-2">{person.overdueTasks} tasks · {person.overdueProspects} prospects</td><td className="p-2 font-bold">{person.mtdSales}</td>
      </tr>)}</tbody></table></div>
      {!data.members.length && <p className="text-sm text-slate-600">No salespeople or activity in this dealership scope.</p>}
      <p className="text-xs text-slate-500">Soft North Star: approximately 20 new + used sales per person per month. No enforced target. Untouched prospects and unfinished tasks carry forward automatically.</p>
      {member && <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-3"><div className="flex justify-between gap-2"><h3 className="font-bold">{member.name} · {data.date}</h3><button className={button} onClick={() => setExpanded('')}>Close detail</button></div>
        {!member.leads.length && <p className="text-sm">No active prospects or tasks in this view.</p>}
        {member.leads.map(lead => <article key={lead._id} className="space-y-1 rounded-lg border bg-white p-3 text-xs"><button onClick={() => open(lead._id)} disabled={busy} className="font-bold text-blue-800 underline">{lead.name}</button><p>{lead.kind === 'walk_in' ? 'Walk-in' : 'Internet / external'} · {lead.source} · {lead.status.replaceAll('_', ' ')}</p><p><Signal value={lead.actioned ? 'green' : 'red'}>{lead.actioned ? 'Action recorded' : 'Needs video sent or next action'}</Signal>{lead.overdue ? ' · Untouched / overdue' : ''}</p><p>{lead.next_action ? `${lead.next_action.title} · ${dateTime(lead.next_action.due_at)}` : 'No next action set'}</p>{lead.videos.map(video => <p key={video.id}>{video.name} · {video.status && video.status !== 'ready' ? 'Adding end card…' : `${video.views} views · ${video.reviews} reviews`}</p>)}{lead.diary_entries?.slice(-2).map((note, index) => <p className="whitespace-pre-wrap text-slate-600" key={index}>{note.author}: {note.note}</p>)}</article>)}
        <h4 className="text-sm font-bold">Today’s tasks & carry-overs</h4>{!member.tasks.length && <p className="text-xs">No tasks due today.</p>}{member.tasks.map(task => <div key={task._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-xs"><div><p className="font-semibold">{task.title} · {task.status}{task.overdue ? ' · Overdue' : ''}</p><p>{dateTime(task.due_at)}{task.notes ? ` · ${task.notes}` : ''}</p></div><div className="flex gap-2"><button disabled={busy} onClick={() => open(task.lead_id)} className={button}>Open customer</button>{task.status === 'open' && <button disabled={busy} onClick={() => run(async () => { await salesWorkApi.completeTask(task._id); })} className={button}>Mark done</button>}</div></div>)}
      </div>}
      {manager && <div className="grid gap-4 xl:grid-cols-2"><details className="rounded-xl border p-3" open={(data.unassignedPagination?.total ?? data.unassigned.length) > 0}><summary className="cursor-pointer text-sm font-bold">Unassigned / new leads ({(data.unassignedPagination?.total ?? data.unassigned.length)})</summary>{!(data.unassignedPagination?.total ?? data.unassigned.length) && <p className="mt-2 text-xs">No leads awaiting allocation.</p>}{(data.unassignedPagination ? data.unassigned : data.unassigned.slice(page * 5, page * 5 + 5)).map(lead => <div key={lead._id} className="mt-3 space-y-1 text-xs"><button className="font-semibold text-blue-800 underline" onClick={() => onOpenLead(lead)}>{lead.name}</button><p><Signal value="red">{lead.overdue ? 'Overdue · awaiting allocation' : 'Awaiting allocation'}</Signal> · {lead.source} · {lead.dealership}</p>{lead.source_owner && <p>DealerSocket owner · {lead.source_owner}</p>}{lead.quick_walk_in && <p>{lead.diary_entries?.[0]?.note}</p>}<LeadAssignment lead={lead} onUpdated={refresh} quick /></div>)}{queuePages > 1 && <div className="mt-3 flex items-center gap-2"><button className={button} disabled={page === 0} onClick={() => setQueuePage(page - 1)}>Previous</button><span>{page + 1}/{queuePages}</span><button className={button} disabled={page + 1 === queuePages} onClick={() => setQueuePage(page + 1)}>Next</button></div>}</details>
        <details className="rounded-xl border border-amber-200 p-3" open={data.losses.length > 0}><summary className="cursor-pointer text-sm font-bold">Lost-lead review ({data.losses.length} pending · {data.summary.lossesApprovedToday} approved today)</summary>{!data.losses.length && <p className="mt-2 text-xs">No losses awaiting approval.</p>}{data.losses.map(lead => <details key={lead._id} className="mt-3"><summary className="cursor-pointer text-xs font-semibold">{lead.name} · {lead.owner_name} · {lead.loss_review?.reason}</summary><button onClick={() => onOpenLead(lead)} className={`${button} my-2`}>Open customer</button><LostLeadReview lead={lead} onUpdated={refresh} /></details>)}</details>
      </div>}
      {manager && <LeadIntake key={rooftop} rooftop={rooftop} onImported={lead => { refresh(); onOpenLead(lead); }} />}
      {data.report.available ? <details className="rounded-xl border border-blue-300 bg-blue-50 p-3"><summary className="cursor-pointer text-sm font-bold">Daily summary · 6:30 pm</summary><p className="mt-2 text-xs">{data.date} · {data.report.description}. {data.summary.tasksCompleted} of {data.summary.tasksTotal} tasks complete; {data.summary.tasksRemaining} outstanding; {data.summary.carryOvers} prior-day carry-overs; {data.summary.overdueProspects} untouched prospects; {data.summary.pendingLosses} loss reviews. Team sales this month: {data.summary.mtdSales}.</p>{data.members.map(person => <p key={person.id} className="mt-1 text-xs">{person.name}: {person.allGreen ? 'all green' : 'attention needed'} · {person.tasksRemaining} tasks remaining · {person.overdueProspects} overdue prospects · {person.mtdSales} MTD sales</p>)}</details> : <p className="text-xs text-slate-600">Daily summary available in-app at 6:30 pm Melbourne time.</p>}
    </>}
  </section>;
}
function LeadIntake({ rooftop, onImported }: { rooftop: string; onImported: (lead: Lead) => void }) {
  const [source, setSource] = useState<IntakeSource>('connex');
  const [form, setForm] = useState({ externalId: '', dealership: rooftop === 'All Locations' ? '' : rooftop, name: '', phone: '', email: '', vehicle: '', opportunityStatus: '', notes: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const { locations } = useAuth();
  return <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-bold">Connex / external lead intake</summary><p className="my-2 text-xs text-slate-600">Connex: log in, open lead, assign and set the opportunity status to reveal contact details. Record available details here; reuse the source reference when the phone is revealed. Automated pulls need the Connex recording, credentials and provider access.</p><form className="grid gap-2 sm:grid-cols-2" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { const result = await oversightApi.intake(source, form); if (result.data) onImported(result.data); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }}>
    <label className="text-xs">Source<select value={source} onChange={event => setSource(event.target.value as IntakeSource)} className="mt-1 block w-full rounded-lg border p-2">{[['connex', 'Connex'], ['drive', 'Drive'], ['socket', 'Socket'], ['website', 'Website'], ['sms', 'SMS campaign']].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label className="text-xs">Dealership<select required value={form.dealership} onChange={event => setForm({ ...form, dealership: event.target.value })} className="mt-1 block w-full rounded-lg border p-2"><option value="">Choose dealership</option>{locations.filter(site => site.toLowerCase() !== 'south morang').map(site => <option key={site}>{site}</option>)}</select></label>
    {([['externalId', 'Source lead reference (required)'], ['name', 'Customer name (when available)'], ['phone', 'Phone (once revealed)'], ['email', 'Email'], ['vehicle', 'Vehicle interest'], ['opportunityStatus', 'Opportunity status'], ['notes', 'Source notes']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<input required={key === 'externalId'} maxLength={key === 'notes' ? 5000 : 200} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="mt-1 block w-full rounded-lg border p-2" /></label>)}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}<button className={button} disabled={busy}>{busy ? 'Saving…' : 'Create / update unassigned lead'}</button>
  </form></details>;
}
