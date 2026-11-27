'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { crmApi } from '@/lib/crm-updates';

type Sync = { kind: string; dealership: string; address?: string; sourceRecords?: number; sourceActive?: number; sourceMissingOwner?: number; customers?: number; missingPhone?: number; missingEmail?: number; last_success?: string; snapshotAt?: string; status?: string; testDrives?: number; error?: string };
type Status = { states: Sync[]; email: { address: string; category: string; configured: boolean; imported?: number; pendingMerges?: number; needsReview?: number }[] };

export function LeadIntegrationStatus({ rooftop, revision }: { rooftop: string; revision: number }) {
  const [stored, setStored] = useState<{ site: string; status: Status } | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const specific = Boolean(rooftop && rooftop !== 'All Locations');
  const [sourceSettings, setSourceSettings] = useState<{ skipDealerSocketNextgateLeads: boolean; skipDealerSocketWebsiteLeads: boolean } | null>(null);
  const [lostSms, setLostSms] = useState<{ enabled: boolean; template: string; smsConfigured: boolean } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => fetchApi<Status>(`/integrations/lead-status?rooftop=${encodeURIComponent(rooftop)}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted && result.data) { setStored({ site: rooftop, status: result.data }); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [rooftop, revision, retry]);

  useEffect(() => {
    if (!specific) { setSourceSettings(null); setLostSms(null); return; }
    const controller = new AbortController();
    crmApi.leadSourceSettings(rooftop, controller.signal)
      .then(res => { if (!controller.signal.aborted && res.data) setSourceSettings({ skipDealerSocketNextgateLeads: res.data.skipDealerSocketNextgateLeads, skipDealerSocketWebsiteLeads: res.data.skipDealerSocketWebsiteLeads }); })
      .catch(() => {});
    crmApi.lostSmsSettings(rooftop, controller.signal)
      .then(res => { if (!controller.signal.aborted && res.data) setLostSms({ enabled: res.data.enabled, template: res.data.template, smsConfigured: res.data.smsConfigured }); })
      .catch(() => {});
    return () => controller.abort();
  }, [rooftop, specific, revision]);

  const data = stored?.site === rooftop ? stored.status : null;
  return <details className="space-y-3 rounded-xl border p-3 text-xs">
    <summary className="cursor-pointer text-sm font-bold">Lead feed, email &amp; Lost SMS settings</summary>
    {error && <div><p role="alert" className="text-red-700">{error}</p><button className="mt-2 min-h-11 rounded-lg border px-3 py-2 font-semibold" onClick={() => setRetry(value => value + 1)}>Retry lead status</button></div>}
    {data?.states.filter(state => state.kind === 'dealersocket').map(state => <div className="mt-2 space-y-1" key={state.dealership}>
      <h4 className="font-bold">{state.dealership}</h4><p>Latest DealerSocket feed: {state.sourceRecords} opportunities · {state.sourceActive} active. {state.customers} unmerged source records stored.</p>
      <p>{state.missingPhone} stored records without a mobile · {state.missingEmail} without an email · {state.sourceMissingOwner} feed opportunities without a salesperson.</p>
      {state.snapshotAt && <p>Source captured {new Date(state.snapshotAt).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}.</p>}
      {state.error && <p className="text-red-700">{state.error}</p>}
    </div>)}
    {data && !data.states.some(state => state.kind === 'dealersocket') && <p>Waiting for the next source sync. Existing customers remain available.</p>}
    {data?.states.filter(state => state.kind === 'virtualyard').map(state => <div className="mt-3 space-y-1" key={`virtualyard-${state.dealership}`}>
      <h4 className="font-bold">Virtual Yard · {state.dealership}</h4>
      <p>{state.status === 'succeeded' ? 'Connected' : state.status === 'running' ? 'Sync in progress' : 'Sync paused or awaiting setup'} · {state.sourceRecords ?? 0} leads · {state.testDrives ?? 0} linked test-drive records in the latest import.</p>
      {state.last_success && <p>Last successful import: {new Date(state.last_success).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}.</p>}
      {state.error && <p className="text-amber-800">{state.error}</p>}
      <p className="text-slate-600">Imported enquiries arrive unassigned. Existing staff notes, allocation and consent are preserved.</p>
    </div>)}
    {data?.email.map(inbox => {
      const state = data.states.find(state => state.address?.toLowerCase() === inbox.address.toLowerCase());
      return <div className="mt-3 space-y-1" key={inbox.address}>
        <p><strong>{inbox.category === 'new' ? 'New' : 'Used'} vehicle lead email:</strong> {inbox.address} · {!inbox.configured ? 'Mailbox setup required' : state?.error ? 'Mailbox unavailable' : state?.last_success ? 'Connected' : 'Waiting for first mailbox check'}</p>
        <p>{inbox.imported ?? 0} emails imported · {inbox.pendingMerges ?? 0} duplicate enquiries awaiting manager merge · {inbox.needsReview ?? 0} emails need manual review.</p>
        {state?.last_success && <p>Last mailbox check: {new Date(state.last_success).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}.</p>}
        {state?.error && <p className="text-red-700">{state.error}</p>}
        {!!inbox.needsReview && <p className="text-amber-800">Open this mailbox to review emails that could not be imported. Correct the lead details before adding the customer.</p>}
      </div>;
    })}
    {!!data?.email.length && <p className="mt-2 text-slate-600">Website email leads arrive in New Leads as unassigned customers. Filter Leads by Website email and Unassigned to allocate them.</p>}

    {specific && (sourceSettings || lostSms) && (
      <div className="space-y-3 border-t pt-3">
        {settingsError && <p role="alert" className="text-red-700">{settingsError}</p>}
        {settingsNotice && <p role="status" className="font-semibold text-emerald-700">{settingsNotice}</p>}

        {sourceSettings && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <h4 className="font-bold text-slate-900">Lead source duplication filters · {rooftop}</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sourceSettings.skipDealerSocketNextgateLeads}
                disabled={savingSettings}
                onChange={e => setSourceSettings({ ...sourceSettings, skipDealerSocketNextgateLeads: e.target.checked })}
              />
              Pull Carsales / Nextgate leads straight from Nextgate (skip from DealerSocket)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sourceSettings.skipDealerSocketWebsiteLeads}
                disabled={savingSettings}
                onChange={e => setSourceSettings({ ...sourceSettings, skipDealerSocketWebsiteLeads: e.target.checked })}
              />
              Pull website leads via email only (skip website leads from DealerSocket)
            </label>
            <button
              type="button"
              disabled={savingSettings}
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
              onClick={async () => {
                setSavingSettings(true); setSettingsError(''); setSettingsNotice('');
                try {
                  await crmApi.saveLeadSourceSettings(rooftop, sourceSettings);
                  setSettingsNotice('Lead source filters saved.');
                } catch (err) {
                  setSettingsError((err as Error).message);
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              Save source filters
            </button>
          </div>
        )}

        {lostSms && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3">
            <h4 className="font-bold text-slate-900">Automated Final SMS on Lost leads · {rooftop}</h4>
            {!lostSms.smsConfigured && <p className="text-amber-800">Mobile Message sender is not configured for this dealership.</p>}
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={lostSms.enabled}
                disabled={savingSettings}
                onChange={e => setLostSms({ ...lostSms, enabled: e.target.checked })}
              />
              Send automated &ldquo;Final&rdquo; SMS when a manager marks a lead Lost
            </label>
            <label className="block font-medium text-slate-700">
              Message template (supports {'{first_name}'}, {'{customer_name}'}, {'{dealership}'})
              <textarea
                rows={3}
                maxLength={670}
                value={lostSms.template}
                disabled={savingSettings}
                onChange={e => setLostSms({ ...lostSms, template: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
              />
            </label>
            <button
              type="button"
              disabled={savingSettings || !lostSms.template.trim()}
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
              onClick={async () => {
                setSavingSettings(true); setSettingsError(''); setSettingsNotice('');
                try {
                  await crmApi.saveLostSmsSettings(rooftop, { enabled: lostSms.enabled, template: lostSms.template });
                  setSettingsNotice('Automated Final Lost SMS settings saved.');
                } catch (err) {
                  setSettingsError((err as Error).message);
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              Save Lost SMS settings
            </button>
          </div>
        )}
      </div>
    )}
  </details>;
}
