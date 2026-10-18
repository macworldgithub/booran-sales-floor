'use client';

import type { UnifiedSummary } from '@/lib/types';
import { useDialog } from '@/lib/use-dialog';

import React from 'react';
import { X, Bell, AlertTriangle, Users, Car, CheckCircle2 } from 'lucide-react';

interface NotificationCenterModalProps {
  summary: UnifiedSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export function NotificationCenterModal({
  summary,
  isOpen,
  onClose,
  onNavigateTab,
}: NotificationCenterModalProps) {
  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen) return null;

  const notifications = [
    ...(summary?.inventory.openActionItems ? [{ id: 'open-actions', title: 'Inventory Actions Need Attention', body: `${summary.inventory.openActionItems.toLocaleString()} open action items in the selected locations.`, tab: 'action-items' }] : []),
    ...(summary?.crm.newLeads ? [{ id: 'new-leads', title: 'New Leads', body: `${summary.crm.newLeads.toLocaleString()} new leads in the selected locations.`, tab: 'leads' }] : []),
    ...(summary?.inventory.agingOver90Days ? [{ id: 'aging-stock', title: 'Aged Stock', body: `${summary.inventory.agingOver90Days.toLocaleString()} vehicles have been in stock for more than 90 days in the selected locations.`, tab: 'inventory' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} data-app-dialog role="dialog" aria-modal="true" aria-label="NotificationCenter" tabIndex={-1} className="relative w-full max-w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92dvh] sm:max-h-[85dvh] flex flex-col animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Notifications & Alerts</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {!notifications.length && <p className="p-4 text-center text-sm text-slate-500">{summary ? 'No alerts in the selected locations.' : 'Load showroom data to view current alerts.'}</p>}
          {notifications.map((n) => (
            <button type="button"
              key={n.id}
              onClick={() => {
                onNavigateTab(n.tab);
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 cursor-pointer transition-colors space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{n.title}</span>

              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{n.body}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
