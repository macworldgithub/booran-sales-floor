'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { leadApi } from '@/lib/api';
import { crmApi } from '@/lib/crm-updates';
import type { Lead } from '@/lib/types';

export function BulkLeadAssignment({ leads, onCompleted }: {
  leads: Lead[];
  onCompleted?: () => void;
}) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cleanupMode, setCleanupMode] = useState<'none' | 'sold' | 'lost'>('none');
  const [soldDate, setSoldDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [cleanupReason, setCleanupReason] = useState('');
  const selected = leads.filter(lead => ids.includes(lead._id));
  const first = selected[0]?._id;
  useEffect(() => {
    let active = true;
    setTarget('');
    setPeople([]);
    if (first) {
      leadApi.getAssignees(first).then(result => {
        if (active) setPeople(result.data || []);
      }).catch(e => {
        if (active) setMessage(e.message);
      });
    }
    return () => { active = false; };
  }, [first]);

  if (!user?.canAllocate) return null;

  return (
    <details className="my-3 rounded-xl border p-3 text-sm">
      <summary className="cursor-pointer font-bold">Bulk reassignment &amp; cleanup · select customers from this page</summary>
      <p className="my-2 text-xs text-slate-600">
        Reassign up to 100 customers, or bulk-close historical unassigned leads as Sold or Lost (without sending automated SMS).
      </p>
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="rounded border px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setIds(leads.map(l => l._id))}
          disabled={busy || !leads.length}
        >
          Select page ({leads.length})
        </button>
        {!!ids.length && (
          <button
            type="button"
            className="rounded border px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => setIds([])}
            disabled={busy}
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
        {leads.map(lead => (
          <label key={lead._id} className="flex min-h-11 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={ids.includes(lead._id)}
              disabled={busy}
              onChange={e => setIds(v => e.target.checked ? [...v, lead._id] : v.filter(id => id !== lead._id))}
            />
            <span className="truncate">{lead.name} · {lead.owner_name} · {lead.source}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Bulk reassignment recipient" className="min-h-11 max-w-full rounded-lg border p-2 text-xs" value={target} onChange={e => setTarget(e.target.value)}>
          <option value="">Choose salesperson or manager</option>
          {people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <button
          type="button"
          disabled={busy || !selected.length || selected.length > 100 || !target}
          className="min-h-11 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50"
          onClick={async () => {
            setBusy(true); setMessage('');
            try {
              const result = await crmApi.bulkAssign(selected, target);
              if (result.data) {
                setIds(result.data.errors.map(e => e.id));
                setMessage(`${result.data.reassigned.length} customers reassigned.${result.data.errors.map(e => ` ${leads.find(l => l._id === e.id)?.name}: ${e.error}`).join('')}`);
                onCompleted?.();
              }
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Reassign {selected.length} selected
        </button>
        <button
          type="button"
          disabled={busy || !selected.length}
          className="min-h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 disabled:opacity-50"
          onClick={() => setCleanupMode(cleanupMode === 'sold' ? 'none' : 'sold')}
        >
          Mark {selected.length} Sold…
        </button>
        <button
          type="button"
          disabled={busy || !selected.length}
          className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 disabled:opacity-50"
          onClick={() => setCleanupMode(cleanupMode === 'lost' ? 'none' : 'lost')}
        >
          Mark {selected.length} Lost (cleanup)…
        </button>
      </div>
      {cleanupMode !== 'none' && selected.length > 0 && (
        <div className="mt-3 space-y-2 rounded-lg border bg-slate-50 p-3 text-xs">
          <p className="font-bold">
            {cleanupMode === 'sold'
              ? `Mark ${selected.length} selected leads as Sold`
              : `Mark ${selected.length} selected leads as Lost (no final SMS sent)`}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {cleanupMode === 'sold' && (
              <>
                <label>
                  Sold date (optional)
                  <input type="date" value={soldDate} onChange={e => setSoldDate(e.target.value)} className="mt-1 block w-full rounded border bg-white p-1.5" />
                </label>
                <label>
                  Delivery date (optional)
                  <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-1 block w-full rounded border bg-white p-1.5" />
                </label>
              </>
            )}
            <label className={cleanupMode === 'lost' ? 'sm:col-span-3' : ''}>
              Note / reason (optional)
              <input type="text" maxLength={300} placeholder={cleanupMode === 'sold' ? 'e.g. Already delivered in DealerSocket' : 'e.g. Unassigned cleanup — historical'} value={cleanupReason} onChange={e => setCleanupReason(e.target.value)} className="mt-1 block w-full rounded border bg-white p-1.5" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || selected.length > 100}
              className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
              onClick={async () => {
                setBusy(true); setMessage('');
                try {
                  const res = await crmApi.bulkStatus(selected.map(l => l._id), {
                    status: cleanupMode,
                    ...(cleanupMode === 'sold' && soldDate ? { soldAt: soldDate } : {}),
                    ...(cleanupMode === 'sold' && deliveryDate ? { deliveryDate } : {}),
                    ...(cleanupReason.trim() ? { reason: cleanupReason.trim() } : {}),
                  });
                  if (res.data) {
                    setIds(res.data.errors.map(e => e.id));
                    setMessage(`${res.data.updated.length} leads marked ${cleanupMode}.${res.data.errors.map(e => ` ${leads.find(l => l._id === e.id)?.name}: ${e.error}`).join('')}`);
                    setCleanupMode('none');
                    setCleanupReason('');
                    onCompleted?.();
                  }
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm bulk {cleanupMode}
            </button>
            <button type="button" disabled={busy} className="rounded-lg border bg-white px-3 py-2" onClick={() => setCleanupMode('none')}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && <p role="status" className="mt-2 whitespace-pre-wrap text-xs">{message}</p>}
    </details>
  );
}
