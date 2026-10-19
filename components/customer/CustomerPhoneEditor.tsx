'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { leadApi } from '@/lib/api';
import { Lead } from '@/lib/types';

export function CustomerPhoneEditor({ lead, disabled = false, onUpdated, onEditingChange }: {
  lead: Lead;
  disabled?: boolean;
  onUpdated: (lead: Lead) => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const number = lead.phone || lead.customer_phone || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(number);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!editing) setDraft(number); }, [number, editing]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || disabled) return;
    setSaving(true); setError('');
    try {
      const result = await leadApi.updateLead(lead._id, { customer_phone: draft.trim() });
      if (!result.data) throw new Error('The mobile number could not be saved.');
      onUpdated(result.data);
      setEditing(false); onEditingChange(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'The mobile number could not be saved.'); }
    finally { setSaving(false); }
  };

  if (editing) return <form onSubmit={save} className="min-w-0 space-y-2">
    <label className="block text-[10px] font-bold uppercase text-slate-500">Mobile number
      <input aria-label="Lead mobile number" type="tel" inputMode="tel" autoComplete="tel" maxLength={50} value={draft} disabled={saving || disabled} onChange={(event) => setDraft(event.target.value)} placeholder="0412 345 678" className="mt-1 block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-normal text-slate-900 focus:border-red-500 focus:outline-none" />
    </label>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={saving || disabled} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save number'}</button>
      <button type="button" disabled={saving} onClick={() => { setDraft(number); setError(''); setEditing(false); onEditingChange(false); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">Cancel</button>
    </div>
  </form>;

  return <div className="min-w-0">
    <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Mobile</p>
    <p className="break-words text-xs font-semibold text-slate-800">{number || 'Not provided'}</p>
    <button type="button" disabled={disabled} onClick={() => { setError(''); setEditing(true); onEditingChange(true); }} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">
      {number ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{number ? 'Edit number' : 'Add number'}
    </button>
  </div>;
}
