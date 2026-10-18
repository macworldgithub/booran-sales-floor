'use client';

import { localDate, appointmentTime } from '@/lib/dates';
import { specificDealerships } from '@/lib/locations';
import { RooftopOptions } from '@/components/ui/RooftopOptions';
import { useAuth } from '@/lib/auth';
import { useDialog } from '@/lib/use-dialog';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Car, User, CheckCircle2 } from 'lucide-react';
import { appointmentApi } from '@/lib/api';
import { Lead, Appointment } from '@/lib/types';

interface BookTestDriveModalProps {
  defaultDealership?: string;
  lead?: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated?: (appointment: Appointment) => void;
}

export function BookTestDriveModal({
  lead,
  isOpen,
  onClose,
  onAppointmentCreated,
  defaultDealership = 'All Locations',
}: BookTestDriveModalProps) {
  const { locations: directoryLocations, user } = useAuth();
  const locations = specificDealerships(directoryLocations);
  const [dealership, setDealership] = useState(lead?.dealership || lead?.dealership_name || defaultDealership);
  useEffect(() => { if (locations.length && !locations.includes(dealership)) setDealership(locations.includes(lead?.dealership || lead?.dealership_name || defaultDealership) ? (lead?.dealership || lead?.dealership_name || defaultDealership) : locations[0]); }, [directoryLocations, dealership, defaultDealership, lead?.dealership, lead?.dealership_name]);
  const [prospectName, setProspectName] = useState(lead?.name || lead?.customer_name || '');
  const [consultantName, setConsultantName] = useState(lead?.owner_name || user?.name || '');
  const [vehicle, setVehicle] = useState(lead?.vehicle || [lead?.make, lead?.model].filter(Boolean).join(' '));
  const [dateStr, setDateStr] = useState(localDate());
  const [timeStr, setTimeStr] = useState('11:00');
  const [duration, setDuration] = useState('45');
  const [type, setType] = useState<'Test Drive' | 'Showroom Visit'>('Test Drive');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (!locations.includes(dealership)) throw new Error('Select an available dealership.');
      const whenIso = appointmentTime(dateStr, timeStr);
      const res = await appointmentApi.createAppointment({
        dealership,
        leadId: lead?._id,
        prospectName: prospectName.trim() || 'Showroom Customer',
        consultantName,
        vehicle,
        type,
        when: whenIso,
        duration: parseInt(duration) || 45,
        notes,
      });

      if (res.success && res.data) {
        onAppointmentCreated?.(res.data);
        onClose();
      }
    } catch (err: any) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save. Please retry.');
      console.error('Failed to create appointment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} data-app-dialog role="dialog" aria-modal="true" aria-label="BookTestDrive" tabIndex={-1} className="relative w-full max-w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92dvh] sm:max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Book Test Drive / Visit</h3>
              <p className="text-[10px] text-slate-500">Schedule showroom floor drive</p>
            </div>
          </div>
          <button aria-label="Close booking" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
          <label className="block text-xs font-bold text-slate-700">Dealership / Rooftop
            <select aria-label="Appointment dealership" required value={dealership} onChange={(event) => setDealership(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><RooftopOptions allowAll={false} /></select>
          </label>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Prospect Name</label>
            <input
              type="text"
              required
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="Full customer name"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Appointment Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              >
                <option value="Test Drive">Test Drive</option>
                <option value="Showroom Visit">Showroom Visit</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle</label>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="e.g. BYD Sealion 7"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Time</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !locations.includes(dealership)}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
