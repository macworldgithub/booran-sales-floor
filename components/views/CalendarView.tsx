'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Car, Plus, User, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment } from '@/lib/types';

interface CalendarViewProps {
  appointments: Appointment[];
  onOpenBookDrive: () => void;
}

export function CalendarView({ appointments, onOpenBookDrive }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

      {/* Timeline Card */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Today&apos;s Showroom Activity</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No appointments scheduled. Click &quot;+ Schedule Drive / Visit&quot; above to book.
            </div>
          ) : (
            appointments.map((appt) => (
              <div
                key={appt._id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
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
    </div>
  );
}
