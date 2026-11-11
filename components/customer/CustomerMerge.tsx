'use client';

import { useEffect, useRef, useState } from 'react';
import { leadApi } from '@/lib/api';
import type { Lead } from '@/lib/types';

export function MergeCustomerSummary({ lead, label }: { lead: Lead; label: string }) {
  return <div className="space-y-1 rounded-lg border bg-slate-50 p-3 text-xs">
    <h5 className="font-bold">{label} · {lead.name}</h5><p>{lead.phone || 'No mobile'} · {lead.email || 'No email'}</p>
    <p>{lead.owner_name || 'Unassigned'} · {lead.status?.replaceAll('_', ' ')}</p><p>{lead.vehicle} · {lead.source}</p>
    <p>{lead.diary_entries?.length || 0} diary notes</p>
  </div>;
}

export function CustomerMerge({ lead, onMerged }: { lead: Lead; onMerged: (lead: Lead) => void }) {
  const [open, setOpen] = useState(false), [related, setRelated] = useState<Lead[]>([]);
  const [primaryId, setPrimaryId] = useState(lead._id), [secondaryId, setSecondaryId] = useState('');
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [retired, setRetired] = useState<Lead[]>([]);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!open) return;
    let current = true;
    const timer = window.setTimeout(() => {
      leadApi.getRelated(lead._id, search).then(result => { if (current) { setRelated(result.data?.duplicates || []); setRetired(result.data?.merged || []); setConfirmed(false); } })
        .catch(reason => { if (current) setError(reason.message); });
    }, search ? 250 : 0);
    return () => { current = false; window.clearTimeout(timer); };
  }, [open, lead._id, search]);
  const choices = [lead, ...related], primary = choices.find(row => row._id === primaryId), secondary = choices.find(row => row._id === secondaryId);
  return <section aria-label="Manager customer merge" className="space-y-3 rounded-xl border border-amber-200 p-3 text-xs">
    <button type="button" onClick={() => { setOpen(!open); setError(''); }} aria-expanded={open} className="font-bold text-blue-700">{open ? 'Close merge review' : 'Manager: review duplicates / merge'}</button>
    {open && <>
      <p>Select the primary customer to keep and the secondary to retire. Missing details, diary notes, messages, media and linked work transfer to the primary. Its status and salesperson stay in place.</p>
      <label className="block">Find secondary by customer name or mobile<input aria-label="Find secondary customer" value={search} disabled={busy} onChange={event => { setSearch(event.target.value); setSecondaryId(''); }} className="mt-1 w-full rounded-lg border p-2" /></label>
      {!related.length && <p>No matching secondary was found at this dealership. Search by name if a mobile is missing.</p>}
      {!!related.length && <>
        <div className="grid gap-3 sm:grid-cols-2"><label>Primary to keep<select aria-label="Primary customer" value={primaryId} onChange={event => { setPrimaryId(event.target.value); setSecondaryId(''); setConfirmed(false); }} disabled={busy} className="mt-1 w-full rounded-lg border p-2">{choices.map(row => <option key={row._id} value={row._id}>{row.name} · {row.source} · {row.owner_name}</option>)}</select></label>
          <label>Secondary to retire<select aria-label="Secondary customer" value={secondaryId} onChange={event => { setSecondaryId(event.target.value); setConfirmed(false); }} disabled={busy} className="mt-1 w-full rounded-lg border p-2"><option value="">Choose secondary</option>{choices.filter(row => row._id !== primaryId).map(row => <option key={row._id} value={row._id}>{row.name} · {row.source} · {row.owner_name}</option>)}</select></label></div>
        {primary && secondary && <><div className="grid gap-2 sm:grid-cols-2"><MergeCustomerSummary lead={primary} label="Primary survives" /><MergeCustomerSummary lead={secondary} label="Secondary retires" /></div>
          <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I confirm these are the same customer and the selected primary should survive.</label>
          <button type="button" disabled={!confirmed || busy} className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50" onClick={async () => {
            setBusy(true); setError('');
            try { const result = await leadApi.merge(primary._id, secondary._id); if (active.current && result.data) onMerged(result.data); }
            catch (reason) { if (active.current) setError((reason as Error).message); }
            finally { if (active.current) setBusy(false); }
          }}>{busy ? 'Merging…' : 'Merge into primary'}</button>
        </>}
      </>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!!retired.length && <details><summary className="cursor-pointer font-semibold">Retired merged records ({retired.length})</summary>{retired.map(row => <div key={row._id} className="mt-2 space-y-2"><MergeCustomerSummary lead={row} label="Retired source record" />{row.diary_entries?.map((note, index) => <p className="whitespace-pre-wrap" key={index}>{note.author}: {note.note}</p>)}</div>)}</details>}
    </>}
  </section>;
}
