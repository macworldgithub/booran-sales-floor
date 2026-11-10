'use client';

import { useEffect, useState } from 'react';
import type { Lead } from '@/lib/types';
import { leadApi } from '@/lib/api';

type Assignee = { id: string; name: string; email: string };

export function LeadAssignment({ lead, onUpdated, onSaved, quick = false }: {
  lead: Lead; onUpdated: (lead: Lead) => void; onSaved?: () => void; quick?: boolean;
}) {
  const [open, setOpen] = useState(quick || Boolean(onSaved));
  const [people, setPeople] = useState<Assignee[] | null>(null);
  const [choice, setChoice] = useState(lead.owner_id || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setPeople(null);
    leadApi.getAssignees(lead._id).then(result => {
      if (active) setPeople(result.data || []);
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [open, lead._id]);

  async function assign(id: string | null) {
    setSaving(true); setError('');
    try {
      const result = await leadApi.assign(lead._id, id, lead.owner_id ?? null);
      if (result.data) onUpdated(result.data);
      setOpen(false);
      onSaved?.();
    } catch (reason) {
      const failure = reason as Error & { status?: number };
      setError(failure.message);
      if (failure.status === 409) {
        const result = await leadApi.getLead(lead._id).catch(() => null);
        if (result?.data) onUpdated(result.data);
      }
    } finally { setSaving(false); }
  }

  return <section className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
    {!quick && !onSaved && <button type="button" onClick={() => { setChoice(lead.owner_id || ''); setOpen(!open); setError(''); }} disabled={saving} className="font-semibold text-blue-700">
      {open ? 'Close assignment' : 'Assign lead'}
    </button>}
    {open && !people && !error && <p role="status">Loading eligible staff…</p>}
    {open && people && quick && <div className="flex flex-wrap gap-2">
      {people.length ? people.map(person => <button key={person.id} type="button" disabled={saving} onClick={() => void assign(person.id)}
        className="rounded-lg border px-2 py-1 text-xs text-blue-800 disabled:opacity-50">Assign to {person.name}</button>) : <p>No eligible staff.</p>}
    </div>}
    {open && people && !quick && <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Assign lead to" value={choice} onChange={event => setChoice(event.target.value)} disabled={saving} className="max-w-full rounded-lg border px-2 py-1.5">
        <option value="">Unassigned queue</option>
        {people.map(person => <option value={person.id} key={person.id}>{person.name} · {person.email}</option>)}
      </select>
      <button type="button" disabled={saving || (choice === (lead.owner_id || '') && (Boolean(choice) || lead.owner_name === 'Unassigned'))} onClick={() => void assign(choice || null)}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save allocation'}</button>
    </div>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
