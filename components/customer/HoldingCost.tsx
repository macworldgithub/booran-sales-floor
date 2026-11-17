'use client';
import type { Vehicle } from '@/lib/types';
const currency = (value: number) => value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
export function HoldingCostValue({ vehicle }: { vehicle: Vehicle }) {
  return <>{vehicle.accumulatedHoldingCost === undefined ? '—' : vehicle.accumulatedHoldingCost === null ? 'Incomplete' : currency(vehicle.accumulatedHoldingCost)}</>;
}
export function HoldingCostDetails({ vehicle }: { vehicle: Vehicle }) {
  const cost = vehicle.holdingCostBreakdown;
  if (!cost) return null;
  return <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs" onClick={event => event.stopPropagation()}>
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-bold"><span>Holding cost breakdown</span><span><HoldingCostValue vehicle={vehicle} /></span></summary>
    <dl className="space-y-2 border-t pt-3"><div className="flex justify-between gap-3"><dt>Floorplan interest · 7.5% p.a.</dt><dd>{cost.floorplanCost === null ? 'Vehicle cost needed' : currency(cost.floorplanCost)}</dd></div>
      <div className="text-slate-500">{cost.vehicleCost == null ? 'Unknown vehicle cost' : currency(cost.vehicleCost)} × 7.5% × {cost.daysInStock} / 365</div>
      <div className="flex justify-between gap-3"><dt>Carsales · {cost.carsalesLeads} × {currency(cost.carsalesRate)}</dt><dd>{currency(cost.carsalesCost)}</dd></div>
      <div className="flex justify-between gap-3"><dt>Drive.com · {cost.driveLeads} × {currency(cost.driveRate)}</dt><dd>{currency(cost.driveCost)}</dd></div>
      <div className="flex justify-between gap-3 border-t pt-2 font-bold"><dt>Total holding cost</dt><dd><HoldingCostValue vehicle={vehicle} /></dd></div></dl>
    <p className="mt-3 text-[11px] text-slate-500">Lead charges use distinct Nextgate enquiries; lead rates exclude GST. Other lead sources are excluded.</p>
    {cost.segments.length > 0 && <ul className="mt-2 list-inside list-disc text-[11px] text-slate-500">{cost.segments.map(segment => <li key={`${segment.source}-${segment.type}`}>{segment.source} · {segment.type}: {segment.count} leads</li>)}</ul>}
    {cost.warnings.map(warning => <p role="status" key={warning} className="mt-2 text-amber-800">{warning}</p>)}
    {cost.leadDataCheckedAt && <p className="mt-2 text-[10px] text-slate-500">Nextgate leads checked {new Date(cost.leadDataCheckedAt).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</p>}
  </details>;
}
