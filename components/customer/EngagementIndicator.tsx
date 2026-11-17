'use client';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import type { ProspectEngagement, VehicleEngagementSummary } from '@/lib/types';

const sign = (value: number) => value > 0 ? `+${value}` : String(value);
export function EngagementIndicator({ engagement, active = true }: { engagement?: ProspectEngagement | null; active?: boolean }) {
  if (!engagement || !active) return null;
  const positive = engagement.state === 'buying', negative = engagement.state === 'losing';
  return <details onClick={event => event.stopPropagation()} className={`max-w-full rounded-lg border p-2 text-xs ${positive ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : negative ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold" title={engagement.signals.map(signal => `${signal.key}: ${sign(signal.score)} — ${signal.reason}`).join('\n')}>
      {positive && <CircleCheck aria-hidden className="h-4 w-4 shrink-0" />}{negative && <TriangleAlert aria-hidden className="h-4 w-4 shrink-0" />}
      <span>{engagement.label} · {sign(engagement.score)}</span><span className="ml-auto text-[10px] underline">Why?</span>
    </summary>
    <div className="space-y-2 border-t border-current/10 pt-2">{engagement.signals.map(signal => <div key={signal.key}><p><strong className="capitalize">{signal.key === 'sms' ? 'SMS responses' : signal.key}</strong> <strong>{sign(signal.score)}</strong> · {signal.reason}</p>
      {signal.key === 'sms' && <p className="mt-1 text-[11px]">{signal.metrics.outboundCount} outbound · {signal.metrics.replyCount} replies · response rate {signal.metrics.responseRate == null ? 'not measurable' : `${signal.metrics.responseRate}%`}{signal.metrics.medianResponseMinutes != null ? ` · median response ${signal.metrics.medianResponseMinutes} min` : ''}{signal.metrics.repliesWithin24Hours ? ` · ${signal.metrics.repliesWithin24Hours} within 24h` : ''}</p>}
    </div>)}<p className="text-[10px]">Last 14 days · SMS ±3, notes ±2, engagement ±1. Buying ≥3; losing ≤−2. Updated {new Date(engagement.computedAt).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}.</p></div>
  </details>;
}
export function InventoryEngagementSummary({ summary }: { summary?: VehicleEngagementSummary }) {
  if (!summary?.activeProspects) return null;
  return <div aria-label="Linked active prospect engagement" className="flex flex-wrap items-center gap-2 text-[11px]">
    <span className="text-slate-600">{summary.activeProspects} active prospects</span>
    {summary.buying > 0 && <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-800"><CircleCheck aria-hidden className="h-3.5 w-3.5" />{summary.buying} Close to Buying</span>}
    {summary.losing > 0 && <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 font-semibold text-amber-900"><TriangleAlert aria-hidden className="h-3.5 w-3.5" />{summary.losing} Close to Losing</span>}
    {summary.neutral > 0 && <span className="text-slate-500">{summary.neutral} neutral</span>}
  </div>;
}
