'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Database, Activity, ShieldCheck, Clock } from 'lucide-react';
import { FeedLog } from '@/lib/types';
import { Pagination } from '@/components/ui/Pagination';
import { QueryStatus } from '@/components/ui/QueryStatus';
import { usePaginatedQuery } from '@/lib/use-paginated-query';
import { inventoryApi, leadApi } from '@/lib/api';

export function FeedLogsView() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingFlwup, setIsSyncingFlwup] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: logs, pagination, isLoading, error, refresh: fetchLogs } = usePaginatedQuery(
    inventoryApi.getFeedLogs, { page, limit: pageSize, status, search }, setPage,
  );

  const handleSyncCsv = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await inventoryApi.syncCsv();
      if (res?.success && res?.data) {
        setSyncStatus({
          type: 'success',
          message: `CSV sync successful: ${res.data.vehiclesProcessed || 0} vehicles processed (${res.data.inserted || 0} new inserted, ${res.data.updated || 0} updated) across ${res.data.filesProcessed || 0} files. DB total: ${res.data.totalInDb || 0}. Actions synced: ${res.data.actionsSynced || 0}. Duration: ${res.data.durationMs}ms.`,
        });
        fetchLogs();
      } else {
        setSyncStatus({ type: 'error', message: res?.message || 'Sync completed with warnings.' });
      }
    } catch (err) {
      setSyncStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to synchronize CSV data.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFlwup = async () => {
    if (isSyncingFlwup) return;
    setIsSyncingFlwup(true);
    setSyncStatus(null);
    try {
      const res = await leadApi.syncFlwup();
      if (res?.success && res?.data) {
        setSyncStatus({
          type: 'success',
          message: `FLWUP Leads sync successful: ${res.data.dealsProcessed || 0} leads processed across ${res.data.rooftopsProcessed || 0} rooftops (${res.data.inserted || 0} new inserted, ${res.data.updated || 0} updated). DB total: ${res.data.totalInDb || 0}. Numbers normalized to +61 format. Duration: ${res.data.durationMs}ms.`,
        });
        fetchLogs();
      } else {
        setSyncStatus({ type: 'error', message: res?.message || 'Sync completed with warnings.' });
      }
    } catch (err) {
      setSyncStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to synchronize FLWUP leads.' });
    } finally {
      setIsSyncingFlwup(false);
    }
  };

  return (
    <div className="view-stack space-y-5">
      {/* Intro */}
      <div className="page-intro p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            booran_inventory_tracker · Telemetry & Sync
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-heading uppercase">
            Pentana DMS & Website Feed Reconciliation
          </h2>
          <p className="text-xs text-slate-500">
            Audit trail of vehicle inventory feeds, quarantine exceptions, price adjustments, and sync latencies.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSyncFlwup}
            disabled={isSyncingFlwup || isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 active:bg-black text-white shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFlwup ? 'animate-spin' : ''}`} />
            <span>{isSyncingFlwup ? 'Syncing FLWUP...' : 'Sync FLWUP Leads'}</span>
          </button>
          <button
            onClick={handleSyncCsv}
            disabled={isSyncing || isSyncingFlwup}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing CSV...' : 'Sync CSV Data'}</span>
          </button>
          <button
            onClick={fetchLogs}
            disabled={isLoading || isSyncing || isSyncingFlwup}
            title="Refresh feed logs"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
          syncStatus.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{syncStatus.message}</span>
          <button onClick={() => setSyncStatus(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-3 text-sm">✕</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input aria-label="Search feed logs" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search feed type or notes" className="min-w-0 flex-1 rounded-lg border p-2 text-sm" />
        <select aria-label="Feed status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border p-2 text-sm">
          <option value="all">All statuses</option><option>SUCCESS</option><option>WARNING</option><option>ERROR</option>
        </select>
        <button onClick={() => { setSearch(''); setStatus('all'); setPage(1); }} className="text-sm text-red-700">Reset filters</button>
      </div>
      <QueryStatus error={error} isLoading={isLoading} onRetry={fetchLogs} />
      {/* Logs Table */}
      <div className="surface-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase font-heading tracking-wide">
          Recent Feed Synchronization Runs
        </h3>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isLoading ? 'Checking feed logs...' : 'No feed logs recorded.'}
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log._id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.feedType}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      ({log.scheduledWindow})
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.status === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 font-mono text-[11px] text-slate-600">
                  <div>Pentana Rows: <strong>{log.totalPentanaRows}</strong></div>
                  <div>Website Rows: <strong>{log.totalWebsiteRows}</strong></div>
                  <div>Quarantined: <strong className="text-amber-600">{log.quarantinedCount}</strong></div>
                  <div>Execution: <strong>{log.durationMs}ms</strong></div>
                </div>

                {log.notes && (
                  <p className="text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                    {log.notes}
                  </p>
                )}

                <div className="text-[10px] text-slate-400 font-mono">
                  Timestamp: {new Date(log.createdAt).toLocaleString('en-AU')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} itemName="feed logs" isLoading={isLoading} />
    </div>
  );
}
