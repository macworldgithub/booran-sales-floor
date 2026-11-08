'use client';

import { useState, type FormEvent } from 'react';
import { appointmentTime, localDate } from '@/lib/dates';
import { salesWorkApi } from '@/lib/api';
import type { Lead } from '@/lib/types';

export function LeadFollowUp({ lead }: { lead: Lead }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(localDate);
  const [time, setTime] = useState('16:00');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!lead.owner_id) return null;
  const assigneeId = lead.owner_id;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await salesWorkApi.createTask(lead._id, { title: title.trim(), dueAt: appointmentTime(date, time), assigneeId });
      setTitle('');
      setMessage('Follow-up assigned.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to assign the follow-up.');
    } finally {
      setBusy(false);
    }
  }

  return <details className="rounded-xl border border-slate-200 p-3 text-sm">
    <summary className="cursor-pointer font-semibold text-blue-700">Assign follow-up to {lead.owner_name || 'lead owner'}</summary>
    <form className="mt-3 space-y-2" onSubmit={save}>
      <label className="block text-xs font-semibold">Action needed
        <input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" />
      </label>
      <div className="flex flex-wrap gap-2">
        <label className="text-xs font-semibold">Due date
          <input required type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 block rounded-lg border p-2" />
        </label>
        <label className="text-xs font-semibold">Due time
          <input required type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-1 block rounded-lg border p-2" />
        </label>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {message && <p role="status" className="text-emerald-700">{message}</p>}
      <button type="submit" disabled={busy || !title.trim()} className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50">
        {busy ? 'Assigning…' : 'Assign follow-up'}
      </button>
    </form>
  </details>;
}
