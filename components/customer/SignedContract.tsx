'use client';
import { useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { uploadInspection } from '@/lib/appraisals';

export type Contract = {
  reference: string;
  signed_at: string;
  media_id: string;
  filename: string;
  appraisal_id?: string;
  items?: string[];
};

export function SignedContract({
  leadId,
  dealId,
  contract,
  onSaved,
}: {
  leadId: string;
  dealId: string;
  contract?: Contract;
  onSaved: () => void;
}) {
  const [reference, setReference] = useState('');
  const [signedAt, setSignedAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [itemsText, setItemsText] = useState('');
  const [editingItems, setEditingItems] = useState(false);
  const [editItemsText, setEditItemsText] = useState(contract?.items?.join(', ') || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ id: string; mediaId?: string }>({ id: '' });
  const field = 'w-full rounded-lg border border-slate-300 p-2 text-sm';

  const saveContractItems = async () => {
    setBusy(true);
    setError('');
    try {
      const items = editItemsText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      await fetchApi(`/deals/${dealId}/contract-items`, {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      });
      setEditingItems(false);
      onSaved();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (contract) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p className="font-semibold text-slate-800">
          Signed contract · {contract.reference} · {new Date(contract.signed_at).toLocaleString()}
        </p>
        <a
          className="text-xs text-blue-700 underline"
          target="_blank"
          rel="noreferrer"
          href={`/api/leads/${leadId}/media/${contract.media_id}/content`}
        >
          View private contract · {contract.filename}
        </a>
        {contract.appraisal_id && <p className="text-xs text-slate-600">Trade appraisal linked to contract</p>}

        <div className="border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Contracted Line Items (Source of Truth)</span>
            <button
              type="button"
              className="text-xs font-medium text-blue-600 underline"
              onClick={() => {
                setEditItemsText(contract.items?.join(', ') || '');
                setEditingItems(!editingItems);
              }}
            >
              {editingItems ? 'Cancel' : 'Edit Items'}
            </button>
          </div>
          {editingItems ? (
            <div className="mt-2 space-y-2">
              <textarea
                className={field}
                rows={2}
                value={editItemsText}
                onChange={e => setEditItemsText(e.target.value)}
                placeholder="Comma-separated items (e.g. Front Dash Cam, Window Tint, Carpet Mats, Diesel)"
              />
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-40"
                disabled={busy}
                onClick={saveContractItems}
              >
                {busy ? 'Saving...' : 'Save Contract Items'}
              </button>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {contract.items && contract.items.length > 0 ? (
                contract.items.map((item, idx) => (
                  <span key={idx} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    ✓ {item}
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-slate-400">No structured items recorded yet. Click Edit Items to add.</span>
              )}
            </div>
          )}
        </div>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <details className="space-y-2 rounded-lg border p-3">
      <summary className="cursor-pointer font-semibold">Record an already signed contract</summary>
      <p className="text-xs text-slate-600">
        Attach the signed document. This records an existing agreement in the customer history and establishes the sole authority for vehicle preparation.
      </p>
      <label className="block">
        Contract reference
        <input
          disabled={busy}
          className={field}
          maxLength={120}
          value={reference}
          onChange={e => {
            attempt.current.id = '';
            setReference(e.target.value);
          }}
        />
      </label>
      <label className="block">
        Signed time
        <input
          disabled={busy}
          type="datetime-local"
          className={field}
          value={signedAt}
          onChange={e => {
            attempt.current.id = '';
            setSignedAt(e.target.value);
          }}
        />
      </label>
      <label className="block">
        Signed PDF or image
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={busy}
          onChange={e => {
            attempt.current = { id: '' };
            setFile(e.target.files?.[0] || null);
          }}
        />
      </label>
      <label className="block">
        Contracted Accessories & Line Items (Optional, comma-separated)
        <textarea
          disabled={busy}
          className={field}
          rows={2}
          value={itemsText}
          onChange={e => setItemsText(e.target.value)}
          placeholder="e.g. Front & Rear Dash Cam, Darkest Legal Tint, Carpet Floor Mats, Full Tank Diesel, Ceramic Protection"
        />
      </label>
      <button
        type="button"
        className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
        disabled={busy || !reference.trim() || !signedAt || !file}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            if (!file) return;
            const signed = new Date(signedAt);
            if (!Number.isFinite(+signed)) throw new Error('Choose a valid signature time.');
            attempt.current.id ||= crypto.randomUUID();
            attempt.current.mediaId ||= (await uploadInspection(leadId, file, 'contract')).id;
            const items = itemsText
              .split(/[\n,]+/)
              .map(s => s.trim())
              .filter(Boolean);
            await fetchApi(`/leads/${leadId}/deals/${dealId}/contract`, {
              method: 'POST',
              body: JSON.stringify({
                requestId: attempt.current.id,
                reference,
                signedAt: signed.toISOString(),
                mediaId: attempt.current.mediaId,
                items,
              }),
            });
            onSaved();
          } catch (reason) {
            setError((reason as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Saving contract…' : 'Record signed contract'}
      </button>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </details>
  );
}
