'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
export type VehicleLookupResult = { rego?: string; vin?: string; make?: string; model?: string; year?: number; source?: string };
export function VehicleLookup({ rooftop, onResult }: { rooftop: string; onResult: (value: VehicleLookupResult) => void }) {
  const [rego, setRego] = useState(''), [state, setState] = useState('VIC'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, [rooftop]);
  const field = 'w-full rounded-lg border border-slate-300 p-2 text-sm';
  return <fieldset className="space-y-2 rounded-lg border p-3">
    <legend className="px-1 text-sm font-semibold">Look up a registration</legend>
    <div className="grid grid-cols-2 gap-2"><label className="text-xs">Registration<input className={field} value={rego} maxLength={12} onChange={e => { generation.current++; setRego(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }} /></label><label className="text-xs">State<select className={field} value={state} onChange={e => { generation.current++; setState(e.target.value); }}>{['VIC','NSW','QLD','SA','WA','TAS','NT','ACT'].map(value => <option key={value}>{value}</option>)}</select></label></div>
    <button type="button" disabled={busy || !rego || !rooftop} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40" onClick={async () => {
      const version = ++generation.current; setBusy(true); setError('');
      try { const result = await fetchApi<VehicleLookupResult>(`/vehicle-lookup?${new URLSearchParams({ rego, state, rooftop })}`); if (version === generation.current && result.data) onResult(result.data); }
      catch (reason) { if (version === generation.current) setError((reason as Error).message); } finally { setBusy(false); }
    }}>{busy ? 'Looking up…' : 'Look up VIN'}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </fieldset>;
}
