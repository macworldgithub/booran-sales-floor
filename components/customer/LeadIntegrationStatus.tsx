'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

type Sync = { kind: string; dealership: string; address?: string; sourceRecords?: number; sourceActive?: number; sourceMissingOwner?: number; customers?: number; missingPhone?: number; missingEmail?: number; last_success?: string; snapshotAt?: string; error?: string };
type Status = { states: Sync[]; email: { address: string; category: string; configured: boolean }[] };

export function LeadIntegrationStatus({ rooftop, revision }: { rooftop: string; revision: number }) {
  const [stored, setStored] = useState<{ site: string; status: Status } | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetchApi<Status>(`/integrations/lead-status?rooftop=${encodeURIComponent(rooftop)}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted && result.data) { setStored({ site: rooftop, status: result.data }); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [rooftop, revision]);
  const data = stored?.site === rooftop ? stored.status : null;
  return <details className="space-y-2 rounded-xl border p-3 text-xs">
    <summary className="cursor-pointer text-sm font-bold">Lead feed and email status</summary>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {data?.states.filter(state => state.kind === 'dealersocket').map(state => <div className="mt-2 space-y-1" key={state.dealership}>
      <h4 className="font-bold">{state.dealership}</h4><p>Latest DealerSocket feed: {state.sourceRecords} opportunities · {state.sourceActive} active. {state.customers} unmerged source records stored.</p>
      <p>{state.missingPhone} stored records without a mobile · {state.missingEmail} without an email · {state.sourceMissingOwner} feed opportunities without a salesperson.</p>
      {state.snapshotAt && <p>Source captured {new Date(state.snapshotAt).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}.</p>}
      {state.error && <p className="text-red-700">{state.error}</p>}
    </div>)}
    {data && !data.states.some(state => state.kind === 'dealersocket') && <p>Waiting for the next source sync. Existing customers remain available.</p>}
    {data?.email.map(inbox => {
      const state = data.states.find(state => state.address === inbox.address);
      return <p className="mt-2" key={inbox.address}><strong>{inbox.category === 'new' ? 'New' : 'Used'} vehicle lead email:</strong> {inbox.address} · {!inbox.configured ? 'Mailbox setup required' : state?.error ? 'Mailbox unavailable' : state?.last_success ? 'Connected' : 'Waiting for first mailbox check'}</p>;
    })}
  </details>;
}
