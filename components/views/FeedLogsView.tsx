'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Database, Activity, ShieldCheck, Clock } from 'lucide-react';
import { FeedLog } from '@/lib/types';
import { inventoryApi } from '@/lib/api';

export function FeedLogsView() {
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryApi.getFeedLogs();
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load feed logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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

        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
    </div>
  );
}
