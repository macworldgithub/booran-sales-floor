'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Car, Plus, User, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { appointmentApi } from '@/lib/api';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { Pagination } from '@/components/ui/Pagination';
import { Appointment } from '@/lib/types';

interface CalendarViewProps {
  appointments: Appointment[];
  onOpenBookDrive: () => void;
}

export function CalendarView({ appointments, onOpenBookDrive }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const from = new Date(`${selectedDate}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const { data: filteredAppointments, pagination, isLoading, error, refresh } = usePaginatedQuery(
    appointmentApi.getAppointments, { page, limit: pageSize, from: from.toISOString(), to: to.toISOString(), type }, setPage,
  );

  return (
    <div className="view-stack space-y-5">
      {/* Page Intro */}
      <div className="page-intro flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Showroom Floor Schedule
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Test Drives & Customer Appointments
          </h2>
          <p className="text-xs text-slate-500">
            Coordinated test track bookings, consultant allocations, and delivery handovers.
          </p>
        </div>

        <button
          onClick={onOpenBookDrive}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Schedule Drive / Visit</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm">Date<input aria-label="Appointment date" type="date" value={selectedDate} onChange={(event) => { if (event.target.value) { setSelectedDate(event.target.value); setPage(1); } }} className="min-w-0 rounded-lg border p-2" /></label>
        <select aria-label="Appointment type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="rounded-lg border p-2 text-sm"><option value="all">All visit types</option><option>Test Drive</option><option>Showroom Visit</option><option>Delivery Handover</option><option>Callback</option></select>
        <button onClick={() => { setSelectedDate(new Date().toLocaleDateString('en-CA')); setType('all'); setPage(1); }} className="text-sm text-red-700">Today</button>
      </div>
      <QueryStatus error={error} isLoading={isLoading} onRetry={refresh} />
      {/* Timeline Card */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Showroom Activity</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No appointments scheduled. Click &quot;+ Schedule Drive / Visit&quot; above to book.
            </div>
          ) : (
            filteredAppointments.map((appt) => (
              <div
                key={appt._id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{appt.prospectName}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        {appt.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Vehicle: <strong>{appt.vehicle}</strong> · Host Consultant:{' '}
                      <strong>{appt.consultantName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{appt.notes}</p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {appt.when
                      ? new Date(appt.when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '11:00 AM'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Duration: {appt.duration || 45} mins
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} itemName="appointments" isLoading={isLoading} />
    </div>
  );
}
