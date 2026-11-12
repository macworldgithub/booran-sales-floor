'use client';

import type { UnifiedSummary } from '@/lib/types';
import { useDialog } from '@/lib/use-dialog';

import React, { useState } from 'react';
import { X, Bell, MessageSquare } from 'lucide-react';
import type { SmsReplyFeed, SmsReplyNotification } from '@/lib/sms-notifications';

interface NotificationCenterModalProps {
  summary: UnifiedSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  sms?: SmsReplyFeed | null;
  smsError?: string;
  smsLoading?: boolean;
  unreadOnly?: boolean;
  onUnreadOnlyChange?: (value: boolean) => void;
  onOpenReply?: (reply: SmsReplyNotification) => Promise<void>;
  onReadAll?: () => Promise<void>;
  onRefresh?: () => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function NotificationCenterModal({
  summary,
  isOpen,
  onClose,
  onNavigateTab,
  sms, smsError, smsLoading = false, unreadOnly = true, onUnreadOnlyChange, onOpenReply, onReadAll, onRefresh,
  page = 1, totalPages = 0, onPageChange,
}: NotificationCenterModalProps) {
  const dialogRef = useDialog(isOpen, onClose);
  const [busy, setBusy] = useState(''), [actionError, setActionError] = useState('');
  const run = async (id: string, action: () => Promise<void>) => {
    if (busy) return; setBusy(id); setActionError('');
    try { await action(); } catch (reason) { setActionError((reason as Error).message); }
    finally { setBusy(''); }
  };

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
          <button aria-label="Close notifications" onClick={onClose} className="min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {onOpenReply && <section aria-label="SMS reply notifications" className="space-y-3">
            <div className="flex items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-bold"><MessageSquare className="h-4 w-4" />SMS replies{sms ? ` (${sms.unreadCount} unread)` : ''}</h4><button type="button" disabled={smsLoading} onClick={onRefresh} className="min-h-11 px-2 text-xs font-bold text-blue-800 disabled:opacity-50">Refresh</button></div>
            <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={unreadOnly} onChange={event => onUnreadOnlyChange?.(event.target.checked)} />Unread only</label><button type="button" disabled={Boolean(busy) || !sms?.unreadCount} onClick={() => { if (onReadAll) void run('all', onReadAll); }} className="min-h-11 px-2 text-xs font-bold text-blue-800 disabled:opacity-50">{busy === 'all' ? 'Marking read…' : 'Mark all SMS replies read'}</button></div>
            {(smsError || actionError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{actionError || smsError}</p>}
            {sms?.warning && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{sms.warning}</p>}
            {smsLoading && !sms && <p role="status" className="text-xs text-slate-500">Loading SMS replies…</p>}
            {sms && !sms.items.length && <p className="text-sm text-slate-500">{unreadOnly ? 'No unread SMS replies in the selected locations.' : 'No SMS replies in the selected locations.'}</p>}
            {sms?.items.map(reply => <button type="button" key={reply.id} disabled={Boolean(busy)} onClick={() => void run(reply.id, () => onOpenReply(reply))} className={`w-full min-h-11 rounded-xl border p-3 text-left space-y-1 disabled:opacity-50 ${reply.read ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}>
              <span className="flex items-start justify-between gap-2"><span className="break-words text-sm font-bold">{reply.customer}</span><span className="shrink-0 text-[11px] font-semibold">{reply.read ? 'Read' : 'New reply'}</span></span>
              <span className="block text-[11px] text-slate-500">{reply.dealership} · {new Date(reply.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="block whitespace-pre-wrap break-words text-xs text-slate-700">{reply.body}</span>
              <span className="block text-xs font-bold text-blue-800">{busy === reply.id ? 'Opening…' : 'Open conversation'}</span>
            </button>)}
            {totalPages > 1 && <div className="flex items-center justify-between gap-2 text-xs"><button className="min-h-11 px-3 text-blue-800 disabled:opacity-50" disabled={page <= 1 || smsLoading} onClick={() => onPageChange?.(page - 1)}>Previous replies</button><span>{page}/{totalPages}</span><button className="min-h-11 px-3 text-blue-800 disabled:opacity-50" disabled={page >= totalPages || smsLoading} onClick={() => onPageChange?.(page + 1)}>Next replies</button></div>}
            <p className="text-[11px] text-slate-500">Replies are checked automatically. Opening a reply marks it read for your account only.</p>
          </section>}
          {!notifications.length && !onOpenReply && <p className="p-4 text-center text-sm text-slate-500">{summary ? 'No alerts in the selected locations.' : 'Load showroom data to view current alerts.'}</p>}
          {onOpenReply && notifications.length > 0 && <h4 className="border-t pt-3 text-xs font-bold text-slate-500">Showroom alerts</h4>}
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
