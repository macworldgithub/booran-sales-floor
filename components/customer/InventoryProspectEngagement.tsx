'use client';
import { useState } from 'react';
import type { Lead, Vehicle } from '@/lib/types';
import { inventoryApi } from '@/lib/api';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { EngagementIndicator, InventoryEngagementSummary } from './EngagementIndicator';
export function InventoryProspectEngagement({ vehicle, onOpenLead }: { vehicle: Vehicle; onOpenLead?: (lead: Lead) => void }) {
  const [page, setPage] = useState(1);
  const result = usePaginatedQuery(inventoryApi.getVehicleProspects, { vehicleId: vehicle._id, page, limit: 10 }, setPage);
  return <section aria-label="Active prospect engagement" className="space-y-3 rounded-xl border p-3 text-xs"><h4 className="font-bold">Active prospect engagement</h4>
    <InventoryEngagementSummary summary={vehicle.engagementSummary} />
    <QueryStatus error={result.error} isLoading={result.isLoading} onRetry={result.refresh} />
    {!result.isLoading && !result.error && !result.data.length && <p className="text-slate-500">No linked active prospects in your account scope.</p>}
    {result.data.map(lead => <article key={lead._id} className="space-y-2 border-t pt-2"><button className="min-h-11 font-bold text-blue-800 underline disabled:no-underline" disabled={!onOpenLead} onClick={() => onOpenLead?.(lead)}>{lead.name}</button><EngagementIndicator engagement={lead.engagement} active={['new_lead', 'following_up', 'returned'].includes(lead.status)} /></article>)}
    {result.pagination.totalPages > 1 && <div className="flex items-center justify-between gap-3"><button className="min-h-11 px-3 underline disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous prospects</button><span>{page}/{result.pagination.totalPages}</span><button className="min-h-11 px-3 underline disabled:opacity-40" disabled={page >= result.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Next prospects</button></div>}
  </section>;
}
