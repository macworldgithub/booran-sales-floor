'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { oversightApi, melbourneDateTime, type FollowupPolicy } from '@/lib/oversight';
import type { Lead } from '@/lib/types';

export function LeadFollowUp({ lead, onUpdated }: { lead: Lead; onUpdated?: (lead: Lead) => void }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('16:00');
  const [policy, setPolicy] = useState<FollowupPolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    oversightApi.policy(lead._id).then(result => {
      if (active && result.data) { setPolicy(result.data.afterContact); setDate(previous => previous || result.data!.today); setError(''); }
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [lead._id, lead.last_activity_at, revision]);
  if (!lead.owner_id || ['sold', 'lost'].includes(lead.status) || lead.loss_review?.status === 'pending') return null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const result = await oversightApi.nextAction(lead._id, { title: title.trim(), note: note.trim(), dueAt: melbourneDateTime(date, time) });
      if (result.data) onUpdated?.(result.data);
      setTitle(''); setNote(''); setMessage('Contact recorded and next action saved.'); setRevision(value => value + 1);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <details className="rounded-xl border border-slate-200 p-3 text-sm">
    <summary className="cursor-pointer font-semibold text-blue-700">Record follow-up & next action</summary>
    <form className="mt-3 space-y-2" onSubmit={save}>
      <p className="text-xs text-slate-600">Melbourne time. {policy?.maxDate ? `After this contact, schedule through ${policy.maxDate}.` : policy ? 'Early contact sequence complete: free scheduling.' : 'Loading follow-up limits…'} One contact day counts per calendar day.</p>
      {lead.next_action && <p className="text-xs">Current: {lead.next_action.title} · {new Date(lead.next_action.due_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</p>}
      <label className="block text-xs font-semibold">Contact / follow-up note
        <textarea required maxLength={2000} value={note} onChange={event => setNote(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
      </label>
      <label className="block text-xs font-semibold">Next action
        <input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <label className="text-xs font-semibold">Due date<input required type="date" min={policy?.today} max={policy?.maxDate || undefined} value={date} onChange={event => setDate(event.target.value)} className="mt-1 block rounded-lg border p-2" /></label>
        <label className="text-xs font-semibold">Due time<input required type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-1 block rounded-lg border p-2" /></label>
      </div>
      {error && <p role="alert" className="text-red-700">{error} <button type="button" onClick={() => setRevision(value => value + 1)} className="underline">Reload limits</button></p>}
      {message && <p role="status" className="text-emerald-700">{message}</p>}
      <button type="submit" disabled={busy || !policy || !title.trim() || !note.trim()} className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save next action'}</button>
    </form>
  </details>;
}
