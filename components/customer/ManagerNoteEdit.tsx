'use client';
import { useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import type { Lead } from '@/lib/types';

export function ManagerNoteEdit({ leadId, entry, onUpdated }: { leadId: string; entry: NonNullable<Lead['diary_entries']>[number]; onUpdated?: (lead: Lead) => void }) {
  const { user } = useAuth(), [editing, setEditing] = useState(false), [draft, setDraft] = useState(entry.note), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const request = useRef(''), lock = useRef(false);
  if (!user?.canAllocate || !entry.id || !onUpdated || (entry.kind && entry.kind !== 'note')) return null;
  if (!editing) return <button type="button" className="mt-2 min-h-11 text-xs font-bold text-blue-800 underline" onClick={() => { setDraft(entry.note); request.current = crypto.randomUUID(); setError(''); setEditing(true); }}>Edit note</button>;
  return <div className="mt-2 space-y-2"><label className="block">Edit customer note<textarea aria-label="Edit customer note" maxLength={5000} value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); request.current = crypto.randomUUID(); }} className="mt-1 min-h-24 w-full rounded-lg border p-2" /></label>{error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex gap-3"><button type="button" disabled={busy || !draft.trim()} className="min-h-11 font-bold text-blue-800" onClick={async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const result = await fetchApi<Lead>(`/leads/${encodeURIComponent(leadId)}/notes/${encodeURIComponent(entry.id!)}`, { method: 'PATCH', body: JSON.stringify({ note: draft.trim(), expectedNote: entry.note, requestId: request.current }) }); if (!result.data) throw Error('The note edit could not be confirmed.'); onUpdated(result.data); setEditing(false); }
    catch (reason) { setError((reason as Error).message); } finally { lock.current = false; setBusy(false); }
  }}>{busy ? 'Saving…' : 'Save note'}</button><button type="button" disabled={busy} className="min-h-11" onClick={() => setEditing(false)}>Cancel edit</button></div></div>;
}
