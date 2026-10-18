'use client';
import { useEffect, useRef, useState } from 'react';
export default function ServiceWorkerRegistrar() {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [activated, setActivated] = useState(false);
  const accepted = useRef(false);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    let reloading = false;
    const cleanupWorkers: Array<() => void> = [];
    let hadController = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);
    const onController = () => {
      setWaiting(null);
      if (accepted.current && !reloading) { reloading = true; window.location.reload(); }
      else if (hadController) setActivated(true);
      hadController = true;
    };
    const check = () => { if (document.visibilityState === 'visible') registration?.update().catch(() => {}); };
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const changed = () => {
        if (disposed) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
        if (worker.state === 'redundant') setWaiting((current) => current === worker ? null : current);
      };
      worker.addEventListener('statechange', changed);
      cleanupWorkers.push(() => worker.removeEventListener('statechange', changed));
      changed();
    };
    const updateFound = () => watch(registration?.installing || null);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onController);
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((reg) => {
        if (disposed) return;
        registration = reg;
        watch(reg.waiting);
        watch(reg.installing);
        reg.addEventListener('updatefound', updateFound);
      }).catch((error) => console.error('Service worker registration failed:', error));
      document.addEventListener('visibilitychange', check);
    }
    return () => {
      disposed = true;
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      document.removeEventListener('visibilitychange', check);
      navigator.serviceWorker?.removeEventListener('controllerchange', onController);
      registration?.removeEventListener('updatefound', updateFound);
      cleanupWorkers.forEach((cleanup) => cleanup());
    };
  }, []);
  if (online && !waiting && !activated) return null;
  return <div role="status" className="pwa-status fixed left-3 right-3 z-[60] mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-xl">
    <span>{!online ? 'You are offline. Reconnect to load and save live data.' : activated ? 'The app was updated in another tab. Save your work before reloading.' : 'An app update is ready. Save your work before updating.'}</span>
    {online && (waiting || activated) && <button className="rounded-lg bg-white px-4 py-2 font-bold text-slate-900" onClick={() => {
      if (activated || !waiting || waiting.state === 'activated') { window.location.reload(); return; }
      accepted.current = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }}>{activated ? 'Reload now' : 'Update now'}</button>}
  </div>;
}
