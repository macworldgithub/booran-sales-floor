'use client';

import { useCallback, useEffect, useState } from 'react';
import { leadApi, salesWorkApi, type SalesTask, type TeamActivityMember } from '@/lib/api';
import type { Appointment, Lead } from '@/lib/types';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { useRefreshOnResume } from '@/lib/use-refresh-on-resume';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { Pagination } from '@/components/ui/Pagination';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
const link = 'text-sm font-semibold text-blue-700 hover:underline';
const muted = 'text-sm text-slate-600';
const melbourneTime = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', hour: 'numeric', minute: '2-digit' });
const melbourneDateTime = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' });

export function TeamActivity({ rooftop, onOpenLeads, onOpenCalendar }: {
  rooftop: string;
  onOpenLeads: (member: TeamActivityMember) => void;
  onOpenCalendar: (member: TeamActivityMember) => void;
}) {
  const [data, setData] = useState<{ rooftop: string; members: TeamActivityMember[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const members = data?.rooftop === rooftop ? data.members : null;
  useRefreshOnResume(refresh);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 30000);
    window.addEventListener('booran:data-changed', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('booran:data-changed', refresh); };
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    salesWorkApi.team(rooftop, controller.signal).then(result => {
      if (!controller.signal.aborted) setData({ rooftop, members: result.data ?? [] });
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load team activity.');
    });
    return () => controller.abort();
  }, [rooftop, revision]);

  return <section className={`${card} space-y-3`} aria-label="Team activity">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Team activity</h2>
        <p className={muted}>Active leads, open follow-ups, and today’s activity for your sales team.</p>
      </div>
      <button type="button" onClick={refresh} className={link}>Refresh team activity</button>
    </div>
    <QueryStatus error={error} isLoading={!members && !error} onRetry={refresh} />
    {members?.length === 0 && <p className={muted}>No active salespeople in this dealership scope.</p>}
    {!!members?.length && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {members.map(member => <article key={member.id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 className="break-words text-sm font-bold text-slate-900">{member.name}</h3>
        <p className="text-xs text-slate-600">{member.site}</p>
        <dl className="my-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {[
            ['Active leads', member.activeLeads], ['Leads updated today', member.leadsUpdated],
            ['Open follow-ups', member.openTasks], ['Follow-ups done today', member.tasksCompleted],
            ['Bookings today', member.appointments],
          ].map(([label, count]) => <div key={label}><dt className="text-slate-600">{label}</dt><dd className="font-bold text-slate-900">{count}</dd></div>)}
        </dl>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <button type="button" onClick={() => onOpenLeads(member)} className={link}>View leads</button>
          <button type="button" onClick={() => onOpenCalendar(member)} className={link}>View calendar</button>
        </div>
      </article>)}
    </div>}
  </section>;
}

export function MySalesDay({ rooftop, leads, appointments, onOpenLead, onNavigate }: {
  rooftop: string;
  leads: Lead[];
  appointments: Appointment[];
  onOpenLead: (lead: Lead) => void;
  onNavigate: (tab: 'leads' | 'calendar') => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [taskError, setTaskError] = useState('');
  const { data: tasks, pagination, isLoading, error, refresh } = usePaginatedQuery(
    salesWorkApi.tasks, { rooftop, page, limit: pageSize, status: 'open', assignee: 'me', sortBy: 'due_at', sortOrder: 'asc' }, setPage,
  );

  async function taskAction(task: SalesTask, complete: boolean) {
    setBusy(true);
    setTaskError('');
    try {
      if (complete) {
        await salesWorkApi.completeTask(task._id);
      } else {
        const result = await leadApi.getLead(task.lead_id);
        if (result.data) onOpenLead(result.data);
      }
    } catch (reason) {
      setTaskError(reason instanceof Error ? reason.message : 'Unable to update this follow-up.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="view-stack space-y-4">
    <section className={card}>
      <h2 className="text-xl font-extrabold text-slate-900">My sales day</h2>
      <p className={muted}>Your follow-ups, assigned leads, and appointments.</p>
    </section>
    <section className={`${card} space-y-3`}>
      <h3 className="font-bold text-slate-900">Actions needed</h3>
      <QueryStatus error={error} isLoading={isLoading} onRetry={refresh} />
      {taskError && <p role="alert" className="text-sm text-red-700">{taskError}</p>}
      {!isLoading && !error && !tasks.length && <p className={muted}>You have no open follow-ups.</p>}
      {tasks.map(task => <div key={task._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{task.title}</p>
          <p className="text-xs text-slate-600">Due {melbourneDateTime.format(new Date(task.due_at))}</p>
          {task.notes && <p className="break-words text-xs text-slate-600">{task.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={() => taskAction(task, false)} className={link}>Open lead</button>
          <button type="button" disabled={busy} onClick={() => taskAction(task, true)} className={link}>Mark done</button>
        </div>
      </div>)}
      {!!pagination.total && <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} itemName="follow-ups" isLoading={isLoading} />}
    </section>
    <div className="grid gap-4 xl:grid-cols-2">
      <section className={`${card} space-y-3`}>
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">My active leads</h3><button type="button" onClick={() => onNavigate('leads')} className={link}>Open my leads</button></div>
        {leads.slice(0, 5).map(lead => <button type="button" key={lead._id} onClick={() => onOpenLead(lead)} className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50">
          <span className="block break-words text-sm font-semibold">{lead.name || lead.customer_name}</span>
          <span className="text-xs capitalize text-slate-600">{lead.status.replaceAll('_', ' ')} · {lead.dealership}</span>
        </button>)}
        {!leads.length && <p className={muted}>You have no active leads.</p>}
      </section>
      <section className={`${card} space-y-3`}>
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">My calendar today</h3><button type="button" onClick={() => onNavigate('calendar')} className={link}>Open my calendar</button></div>
        {appointments.filter(appointment => appointment.status !== 'Cancelled').slice(0, 5).map(appointment => <div key={appointment._id} className="rounded-xl border border-slate-200 p-3">
          <p className="break-words text-sm font-semibold">{appointment.prospectName}</p>
          <p className="text-xs text-slate-600">{melbourneTime.format(new Date(appointment.when))} · {appointment.type} · {appointment.dealership}</p>
        </div>)}
        {!appointments.some(appointment => appointment.status !== 'Cancelled') && <p className={muted}>You have no appointments today.</p>}
      </section>
    </div>
  </div>;
}
