'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from './api';
import { useRefreshOnResume } from './use-refresh-on-resume';
export type ManagerNoteAlert = { _id: string; lead_id: string; title: string; dealership: string; createdAt: string };
export function useManagerNoteAlerts(rooftop: string, accountId: string) {
  const scope = JSON.stringify([rooftop, accountId]);
  const [stored, setStored] = useState<{ scope: string; items: ManagerNoteAlert[]; total: number } | null>(null);
  const [revision, setRevision] = useState(0), [error, setError] = useState('');
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useRefreshOnResume(refresh);
  useEffect(() => {
    if (!accountId) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);
    window.addEventListener('booran:data-changed', refresh);
    return () => { clearInterval(timer); window.removeEventListener('booran:data-changed', refresh); };
  }, [accountId, refresh]);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController(); setError('');
    fetchApi<ManagerNoteAlert[]>('/lead-alerts?kind=manager_note&unread=true&limit=10&rooftop=' + encodeURIComponent(rooftop), { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted && result.data) setStored({ scope, items: result.data, total: result.pagination?.total || 0 }); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [accountId, rooftop, scope, revision]);
  const current = accountId && stored?.scope === scope ? stored : null;
  return { items: current?.items || [], total: current?.total || 0, error, refresh,
    read: async (id: string) => { await fetchApi('/lead-alerts/' + encodeURIComponent(id) + '/read?rooftop=' + encodeURIComponent(rooftop), { method: 'PATCH', body: '{}' }); refresh(); },
  };
}
