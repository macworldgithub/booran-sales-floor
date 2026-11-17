'use client';
import { useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Appraisal } from '@/lib/appraisals';
export function InternalDrives({ appraisal, onChange }: { appraisal: Appraisal; onChange: (row: Appraisal) => void }) {
  const [odometer, setOdometer] = useState(''), [notes, setNotes] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef<string>('');
  const active = appraisal.internal_drives?.find(drive => drive.status === 'active');
  const field = 'w-full rounded-lg border p-2 text-sm';
  return <section className="space-y-2 border-t pt-3"><h3 className="font-semibold">Internal test drives</h3>
    {appraisal.internal_drives?.map(drive => <p key={drive.id} className="text-sm">{drive.driver} · {drive.status} · {new Date(drive.started_at).toLocaleString()} · {drive.start_odometer.toLocaleString()} km{drive.status === 'completed' && ` → ${drive.end_odometer?.toLocaleString()} km · ${drive.distance_km} km · ${Math.ceil((drive.duration_seconds || 0) / 60)} min`}{drive.start_notes && ` · ${drive.start_notes}`}{drive.end_notes && ` · ${drive.end_notes}`}</p>)}
    <label className="block text-sm">{active ? 'Finish' : 'Start'} odometer (km)<input type="number" min={active?.start_odometer || 0} step={1} className={field} value={odometer} onChange={e => setOdometer(e.target.value)} /></label>
    <label className="block text-sm">Drive notes<textarea className={field} value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} /></label>
    <button type="button" disabled={busy || !odometer.trim()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40" onClick={async () => {
      setBusy(true); setError('');
      try { const reading = Number(odometer); if (!Number.isSafeInteger(reading) || reading < 0) throw new Error('Enter whole kilometres.');
        if (!pending.current) pending.current = crypto.randomUUID();
        const base = `/leads/${appraisal.lead_id}/appraisals/${appraisal._id}/drives`;
        const result = await fetchApi<Appraisal>(active ? `${base}/${encodeURIComponent(active.id)}/finish` : base, { method: 'POST', body: JSON.stringify({ requestId: pending.current, odometer: reading, notes }) });
        if (result.data) onChange(result.data); pending.current = ''; setOdometer(''); setNotes('');
      } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
    }}>{busy ? 'Saving…' : active ? 'Finish internal drive' : 'Start internal drive'}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
