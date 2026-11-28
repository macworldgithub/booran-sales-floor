'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

type SourceRow = {
  id: string;
  fields: Record<string, string>;
  exports: { file: string; row: number }[];
};

export function VirtualYardSourceDetails({ type, id }: { type: 'leads' | 'appointments'; id: string }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || rows !== null) return;
    const controller = new AbortController();
    fetchApi<SourceRow[]>(`/${type}/${encodeURIComponent(id)}/virtualyard-source`, { signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) {
          setRows(result.data ?? []);
          setFailed(false);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [type, id, open, attempt, rows]);

  return (
    <details className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs" onToggle={event => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold text-slate-900">Virtual Yard source details</summary>
      {open && failed && (
        <div className="mt-2 space-y-2">
          <p role="alert" className="text-red-700">Could not load Virtual Yard details.</p>
          <button type="button" className="font-semibold underline" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry</button>
        </div>
      )}
      {open && !failed && rows === null && <p role="status" className="mt-2 text-slate-600">Loading source details…</p>}
      {rows?.length === 0 && <p className="mt-2 text-slate-600">No CSV details have been saved for this record.</p>}
      {rows?.map(row => (
        <div key={row.id} className="mt-3 min-w-0 space-y-2 border-t border-slate-200 pt-2">
          <p className="font-semibold text-slate-800">Virtual Yard record {row.id}</p>
          <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
            {Object.entries(row.fields).map(([column, value]) => (
              <div className="contents" key={column}>
                <dt className="font-semibold text-slate-600">{column}</dt>
                <dd className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{value || <span className="text-slate-500">Blank</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="break-words text-slate-500">Exported in {row.exports.map(item => `${item.file} (row ${item.row})`).join(', ')}</p>
        </div>
      ))}
    </details>
  );
}
