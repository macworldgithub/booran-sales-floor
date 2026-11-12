'use client';
import { useCallback, useEffect, useState } from 'react';
import { smsNotificationsApi, type SmsReplyFeed } from './sms-notifications';
import { useRefreshOnResume } from './use-refresh-on-resume';

export function useSmsNotifications(rooftop: string, enabled: boolean) {
  const [page, setPage] = useState(1), [unreadOnly, setUnreadOnly] = useState(true);
  const [revision, setRevision] = useState(0);
  const [stored, setStored] = useState<{ rooftop: string; unreadOnly: boolean; page: number; data: SmsReplyFeed; totalPages: number } | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useRefreshOnResume(refresh);
  useEffect(() => { setPage(1); }, [rooftop, unreadOnly]);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 20000);
    window.addEventListener('booran:data-changed', refresh);
    return () => { clearInterval(timer); window.removeEventListener('booran:data-changed', refresh); };
  }, [enabled, refresh]);
  useEffect(() => {
    if (!enabled) { setStored(null); return; }
    const controller = new AbortController(); setLoading(true);
    smsNotificationsApi.list(rooftop, page, unreadOnly, controller.signal).then(result => {
      if (controller.signal.aborted || !result.data) return;
      const totalPages = result.pagination?.totalPages || 0;
      setStored({ rooftop, unreadOnly, page, data: result.data, totalPages }); setError('');
      if (page > Math.max(1, totalPages)) setPage(Math.max(1, totalPages));
    }).catch(reason => { if (!controller.signal.aborted) setError((reason as Error).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [rooftop, page, unreadOnly, revision, enabled]);
  const current = enabled && stored?.rooftop === rooftop && stored.unreadOnly === unreadOnly && stored.page === page ? stored : null;
  return { feed: current?.data || null, error, loading, refresh, page, setPage, unreadOnly, setUnreadOnly,
    totalPages: current?.totalPages || 0,
    read: async (id: string) => { await smsNotificationsApi.read(id, rooftop); refresh(); },
    readAll: async () => { await smsNotificationsApi.readAll(rooftop); refresh(); },
  };
}
