'use client';
import { useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { uploadInspection } from '@/lib/appraisals';
export type Contract = { reference: string; signed_at: string; media_id: string; filename: string; appraisal_id?: string };
export function SignedContract({ leadId, dealId, contract, onSaved }: { leadId: string; dealId: string; contract?: Contract; onSaved: () => void }) {
  const [reference, setReference] = useState(''), [signedAt, setSignedAt] = useState(''), [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const attempt = useRef<{ id: string; mediaId?: string }>({ id: '' });
  const field = 'w-full rounded-lg border border-slate-300 p-2 text-sm';
  if (contract) return <div className="space-y-1 text-sm"><p>Signed contract · {contract.reference} · {new Date(contract.signed_at).toLocaleString()}</p><a className="underline" target="_blank" rel="noreferrer" href={`/api/leads/${leadId}/media/${contract.media_id}/content`}>View private contract · {contract.filename}</a>{contract.appraisal_id && <p>Trade appraisal linked to contract</p>}</div>;
  return <details className="space-y-2 rounded-lg border p-3"><summary className="cursor-pointer font-semibold">Record an already signed contract</summary>
    <p className="text-xs text-slate-600">Attach the signed document. This records an existing agreement in the customer history.</p>
    <label className="block">Contract reference<input disabled={busy} className={field} maxLength={120} value={reference} onChange={e => { attempt.current.id = ''; setReference(e.target.value); }} /></label>
    <label className="block">Signed time<input disabled={busy} type="datetime-local" className={field} value={signedAt} onChange={e => { attempt.current.id = ''; setSignedAt(e.target.value); }} /></label>
    <label className="block">Signed PDF or image<input type="file" accept="application/pdf,image/*" disabled={busy} onChange={e => { attempt.current = { id: '' }; setFile(e.target.files?.[0] || null); }} /></label>
    <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-40" disabled={busy || !reference.trim() || !signedAt || !file} onClick={async () => {
      setBusy(true); setError('');
      try {
        if (!file) return;
        const signed = new Date(signedAt); if (!Number.isFinite(+signed)) throw new Error('Choose a valid signature time.');
        attempt.current.id ||= crypto.randomUUID();
        attempt.current.mediaId ||= (await uploadInspection(leadId, file, 'contract')).id;
        await fetchApi(`/leads/${leadId}/deals/${dealId}/contract`, { method: 'POST', body: JSON.stringify({ requestId: attempt.current.id, reference, signedAt: signed.toISOString(), mediaId: attempt.current.mediaId }) });
        onSaved();
      } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
    }}>{busy ? 'Saving contract…' : 'Record signed contract'}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </details>;
}
