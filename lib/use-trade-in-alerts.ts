'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from './api';
import { useRefreshOnResume } from './use-refresh-on-resume';
export type TradeInAlert = { _id: string; lead_id: string; title: string; dealership: string; createdAt: string };
export function useTradeInAlerts(rooftop: string, enabled: boolean) {
  const [stored,setStored] = useState<{rooftop:string;items:TradeInAlert[];total:number} | null>(null);
  const [revision,setRevision] = useState(0), [error,setError] = useState('');
  const refresh = useCallback(() => setRevision(value => value+1),[]);
  useRefreshOnResume(refresh);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); },60000);
    return () => clearInterval(timer);
  },[enabled,refresh]);
  useEffect(() => {
    if (!enabled) { setStored(null); return; }
    const controller = new AbortController();
    fetchApi<{items:TradeInAlert[];total:number}>('/trade-in/alerts?rooftop='+encodeURIComponent(rooftop),{signal:controller.signal})
      .then(result => { if (!controller.signal.aborted && result.data) { setStored({rooftop,...result.data}); setError(''); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  },[enabled,rooftop,revision]);
  const current = enabled && stored?.rooftop === rooftop ? stored : null;
  return { items:current?.items || [], total:current?.total || 0, error, refresh,
    read:async (id:string) => { await fetchApi('/trade-in/alerts/'+encodeURIComponent(id)+'/read?rooftop='+encodeURIComponent(rooftop),{method:'PATCH',body:'{}'}); refresh(); },
  };
}
