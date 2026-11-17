'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { crmApi } from '@/lib/crm-updates';
import type { Lead } from '@/lib/types';
export function CustomerConsent({ lead, onUpdated }: {
    lead: Lead;
    onUpdated: (lead: Lead) => void;
}) {
    const { user } = useAuth(), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    return <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-bold">Communication consent · {lead.opted_out ? 'Opted out' : 'Contact permitted'}</summary>
    {lead.communication_consent && <p className="my-2 text-xs">{lead.communication_consent.reason} · {new Date(lead.communication_consent.changed_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</p>}
    {lead.consent_review?.status === 'pending' && <p role="status" className="text-amber-800">Awaiting Manager Approval</p>}
    <p className="my-2 text-xs">{user?.canAllocate ? 'Managers can opt customers out or restore contact with a recorded reason.' : 'Opt-out takes effect immediately. Restoring contact requires manager approval.'}</p>
    <form className="space-y-2" onSubmit={async (event) => { event.preventDefault(); if (busy)
        return; setBusy(true); setError(''); try {
        const result = await crmApi.consent(lead._id, !lead.opted_out, reason);
        if (result.data)
            onUpdated(result.data);
        setReason('');
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}>
      <label className="block text-xs">Consent reason<textarea aria-label="Consent reason" required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border p-2"/></label>
      <button disabled={busy || !reason.trim()} className="min-h-11 rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">{lead.opted_out ? (user?.canAllocate ? 'Restore contact' : 'Request contact restoration') : 'Opt customer out'}</button>
    </form>{error && <p role="alert" className="text-red-700">{error}</p>}
  </details>;
}
