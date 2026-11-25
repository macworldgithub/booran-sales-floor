'use client';
import { useState } from 'react';
import { trafficApi, type TrafficCustomer, type TrafficProgress } from '@/lib/daily-traffic';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { Pagination } from '@/components/ui/Pagination';

function Status({ done, children }: { done: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${done ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}><span aria-hidden className={`h-2 w-2 rounded-full ${done ? 'bg-emerald-500' : 'bg-red-500'}`} />{children}</span>;
}
function Trigger({ customer }: { customer: TrafficCustomer }) {
  return <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-800">{customer.createdToday && customer.allocatedToday ? 'Created & allocated today' : customer.allocatedToday ? 'Allocated Today' : 'Created Today'}</span>;
}
function FollowUp({ customer }: { customer: TrafficCustomer }) {
  return <><Status done={customer.coverage.nextActionsSet}>{customer.coverage.nextActionsSet ? 'Set' : 'Missing'}</Status>{customer.coverage.nextActionsSet && customer.followUpDue && <span className="mt-1 block text-xs text-slate-500">Due: {new Date(customer.followUpDue).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'short', timeStyle: 'short' })}</span>}</>;
}
export function DailyNewTracking({ rooftop, date, summary, revision, busy, onOpen }: {
  rooftop: string; date: string; summary: TrafficProgress; revision: number; busy: boolean; onOpen: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const query = usePaginatedQuery<TrafficCustomer>(trafficApi.customers, { rooftop, date, page, limit: 10, revision }, setPage);
  const open = (customer: TrafficCustomer) => <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold text-blue-800 disabled:opacity-50" onClick={() => onOpen(customer.id)}>Open</button>;
  return <section aria-label="Daily New Tracking Indicator" className="min-w-0 space-y-3 rounded-xl border border-blue-100 bg-white p-3 sm:p-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold">Daily New Tracking Indicator</h3><p className="mt-1 text-xs text-slate-600">Tracking all new customers created on {date}. Every daily new customer requires a sent video and a scheduled next follow-up.</p></div><dl className="flex flex-wrap gap-5 text-xs"><div><dt className="uppercase text-slate-500">Total new this day</dt><dd className="mt-1 text-xl font-bold">{summary.newCustomers}</dd></div><div><dt className="uppercase text-slate-500">Videos sent</dt><dd className="mt-1 text-xl font-bold">{summary.coverage.videosSent}/{summary.newCustomers}</dd></div><div><dt className="uppercase text-slate-500">Follow-up set</dt><dd className="mt-1 text-xl font-bold">{summary.coverage.nextActionsSet}/{summary.newCustomers}</dd></div></dl></header>
    <QueryStatus error={query.error} isLoading={query.isLoading} onRetry={query.refresh} />
    <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b text-slate-600">{['Customer', 'Trigger', 'Salesperson', 'Video Sent?', 'Next Follow-up Set?', 'Action'].map(title => <th key={title} scope="col" className="p-2">{title}</th>)}</tr></thead><tbody>{query.data.map(customer => <tr key={customer.id} className="border-b"><td className="p-2"><button type="button" disabled={busy} onClick={() => onOpen(customer.id)} className="min-h-11 text-left font-semibold text-blue-800 underline">{customer.name}</button><span className="block text-slate-500">{customer.dealership}</span></td><td className="p-2"><Trigger customer={customer} /></td><td className="p-2">{customer.ownerName}</td><td className="p-2"><Status done={customer.coverage.videosSent}>{customer.coverage.videosSent ? 'Sent' : 'Missing'}</Status></td><td className="p-2"><FollowUp customer={customer} /></td><td className="p-2">{open(customer)}</td></tr>)}</tbody></table></div>
    <div className="space-y-3 md:hidden">{query.data.map(customer => <article key={customer.id} className="space-y-3 rounded-lg border p-3 text-xs"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-bold">{customer.name}</p><p className="mt-1 text-slate-500">{customer.dealership}</p></div>{open(customer)}</div><Trigger customer={customer} /><p>Salesperson: {customer.ownerName}</p><dl className="grid grid-cols-2 gap-2"><div><dt className="mb-1 text-slate-500">Video Sent?</dt><dd><Status done={customer.coverage.videosSent}>{customer.coverage.videosSent ? 'Sent' : 'Missing'}</Status></dd></div><div><dt className="mb-1 text-slate-500">Next Follow-up Set?</dt><dd><FollowUp customer={customer} /></dd></div></dl></article>)}</div>
    {!query.isLoading && !query.error && !query.data.length && <p className="text-sm text-slate-500">No new or allocated customers for this workday.</p>}
    {query.pagination.total > 10 && <Pagination currentPage={page} totalPages={query.pagination.totalPages} totalItems={query.pagination.total} pageSize={10} onPageChange={setPage} itemName="daily new customers" isLoading={query.isLoading} />}
  </section>;
}
