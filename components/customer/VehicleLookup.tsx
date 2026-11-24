'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';

export type VehicleLookupResult = {
  rego?: string;
  state?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  bodyType?: string;
  vehicleType?: string;
  colour?: string;
  engineNumber?: string;
  registration?: {
    status?: string;
    expiryDate?: string | null;
  };
  riskFlags?: {
    isStolen?: boolean;
    isWrittenOff?: boolean;
    stolenIncidents?: unknown[];
    writtenOffIncidents?: unknown[];
  };
  warnings?: string[];
  source?: string;
};

export function VehicleLookup({
  rooftop,
  onResult,
}: {
  rooftop: string;
  onResult: (value: VehicleLookupResult) => void;
}) {
  const [lookupMode, setLookupMode] = useState<'rego' | 'vin'>('rego');
  const [rego, setRego] = useState('');
  const [state, setState] = useState('VIC');
  const [vin, setVin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [vehicle, setVehicle] = useState<VehicleLookupResult | null>(null);

  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, [rooftop]);

  const field = 'w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-red-500 focus:outline-none';

  const handleLookup = async () => {
    const version = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ rooftop });
      if (lookupMode === 'vin') {
        const cleanVin = vin.trim().toUpperCase();
        if (!cleanVin) throw new Error('Enter a valid 17-character VIN.');
        params.set('vin', cleanVin);
      } else {
        const cleanRego = rego.trim().toUpperCase();
        if (!cleanRego) throw new Error('Enter a registration plate.');
        params.set('rego', cleanRego);
        params.set('state', state);
      }

      const result = await fetchApi<VehicleLookupResult>(`/vehicle-lookup?${params.toString()}`);
      if (version === generation.current && result.data) {
        setVehicle(result.data);
        onResult(result.data);
      }
    } catch (reason) {
      if (version === generation.current) {
        setError((reason as Error).message || 'Vehicle lookup failed.');
      }
    } finally {
      if (version === generation.current) {
        setBusy(false);
      }
    }
  };

  const handleReset = () => {
    generation.current++;
    setVehicle(null);
    setError('');
  };

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex items-center justify-between">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Vehicle Data Lookup (NEVDIS)
        </legend>
        <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-xs">
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              lookupMode === 'rego' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => {
              setLookupMode('rego');
              setError('');
            }}
          >
            By Rego
          </button>
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              lookupMode === 'vin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => {
              setLookupMode('vin');
              setError('');
            }}
          >
            By VIN
          </button>
        </div>
      </div>

      {lookupMode === 'rego' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-slate-700">
            Registration Plate
            <input
              className={field}
              value={rego}
              maxLength={12}
              placeholder="e.g. TEST01"
              onChange={(e) => {
                generation.current++;
                setRego(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
              }}
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            State
            <select
              className={field}
              value={state}
              onChange={(e) => {
                generation.current++;
                setState(e.target.value);
              }}
            >
              {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div>
          <label className="text-xs font-medium text-slate-700">
            17-Character VIN
            <input
              className={field}
              value={vin}
              maxLength={17}
              placeholder="e.g. 6T9P01V97PANA4001"
              onChange={(e) => {
                generation.current++;
                setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
              }}
            />
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !rooftop || (lookupMode === 'rego' ? !rego.trim() : !vin.trim())}
          className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
          onClick={handleLookup}
        >
          {busy ? 'Looking up NEVDIS…' : lookupMode === 'rego' ? 'Look up Plate' : 'Look up VIN'}
        </button>
        {vehicle && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            onClick={handleReset}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {vehicle && (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900">
              {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle Details'}
            </span>
            {vehicle.source && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {vehicle.source}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-600">
            <div>
              <span className="font-medium text-slate-500">Plate:</span>{' '}
              {vehicle.rego ? `${vehicle.rego} (${vehicle.state || 'VIC'})` : '—'}
            </div>
            <div>
              <span className="font-medium text-slate-500">VIN:</span>{' '}
              <span className="font-mono text-[11px]">{vehicle.vin || '—'}</span>
            </div>
            {(vehicle.bodyType || vehicle.colour) && (
              <div className="col-span-2">
                <span className="font-medium text-slate-500">Details:</span>{' '}
                {[vehicle.bodyType, vehicle.colour].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {vehicle.registration?.status && (
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  vehicle.registration.status === 'REGISTERED'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                }`}
              >
                {vehicle.registration.status}
                {vehicle.registration.expiryDate ? ` · Exp ${vehicle.registration.expiryDate}` : ''}
              </span>
            )}

            {vehicle.riskFlags?.isStolen && (
              <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 ring-1 ring-inset ring-red-600/20">
                🚨 REPORTED STOLEN
              </span>
            )}

            {vehicle.riskFlags?.isWrittenOff && (
              <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 ring-1 ring-inset ring-rose-600/20">
                ⚠️ WRITTEN OFF (WOVR)
              </span>
            )}

            {!vehicle.riskFlags?.isStolen && !vehicle.riskFlags?.isWrittenOff && vehicle.source?.includes('NEVDIS') && (
              <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-inset ring-slate-500/10">
                ✓ No Police / WOVR records
              </span>
            )}
          </div>

          {vehicle.warnings && vehicle.warnings.length > 0 && (
            <div className="mt-1 space-y-1 rounded bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200/60">
              {vehicle.warnings.map((warning, idx) => (
                <div key={idx} className="font-medium">
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
