'use client';

import { useState } from 'react';
import { leadApi } from '@/lib/api';
import type { Lead } from '@/lib/types';

export function CustomerEmailEditor({ lead, onUpdated }: { lead: Lead; onUpdated: (lead: Lead) => void }) {
  const email = lead.email || lead.customer_email || '';
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(email);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <div className="min-w-0">
    <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Email</p>
    {editing ? <form className="space-y-2" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try {
        const result = await leadApi.updateLead(lead._id, { customer_email: draft.trim() });
        if (!result.data) throw new Error('The email could not be saved.');
        onUpdated(result.data); setEditing(false);
      } catch (reason) { setError((reason as Error).message); }
      finally { setBusy(false); }
    }}>
      <label className="block text-xs">Customer email<input autoFocus aria-label="Customer email" type="email" autoComplete="email" maxLength={254} value={draft} onChange={event => setDraft(event.target.value)} disabled={busy} className="mt-1 w-full rounded-lg border px-2 py-2" /></label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white">{busy ? 'Saving…' : 'Save email'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} className="text-xs">Cancel</button></div>
    </form> : <><p className="break-all text-xs font-semibold text-slate-800">{email || 'Not provided'}</p><button type="button" onClick={() => { setDraft(email); setError(''); setEditing(true); }} className="mt-1 text-xs font-semibold text-red-700 hover:underline">{email ? 'Edit email' : 'Add email'}</button></>}
  </div>;
}
