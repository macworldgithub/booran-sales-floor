'use client';

export function QueryStatus({ error, isLoading, onRetry }: { error: string | null; isLoading: boolean; onRetry: () => void }) {
  if (!error && !isLoading) return null;
  return (
    <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm flex flex-wrap items-center justify-between gap-3 ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-600'}`}>
      <span>{error || 'Loading results…'}</span>
      {error && <button type="button" onClick={onRetry} className="rounded-lg border border-red-200 px-4 py-2 font-semibold">Try again</button>}
    </div>
  );
}
