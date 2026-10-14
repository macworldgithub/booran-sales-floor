'use client';

import React from 'react';
import { X, Bell, AlertTriangle, Users, Car, CheckCircle2 } from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  onNavigateTab,
}: NotificationCenterModalProps) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: 'Capital Trap Threshold Exceeded',
      body: '640 vehicles in Booran inventory have crossed 90 Days in Stock. Recommended for wholesale or price adjustments.',
      tab: 'action-items',
      time: '12 min ago',
      type: 'warning',
    },
    {
      id: 'notif-2',
      title: 'New Lead Allocated from flwup_crm',
      body: 'Cameron Bale requested an evaluation on BYD Atto 2 Dmi at BYD South Morang.',
      tab: 'leads',
      time: '24 min ago',
      type: 'lead',
    },
    {
      id: 'notif-3',
      title: 'Pentana DMS Sync Reconciliation Completed',
      body: 'Feed cycle reconciled 2,477 active vehicle units across all Victorian dealer rooftops.',
      tab: 'feed-logs',
      time: '1 hour ago',
      type: 'sync',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Notifications & Alerts</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onNavigateTab(n.tab);
                onClose();
              }}
              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 cursor-pointer transition-colors space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{n.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
