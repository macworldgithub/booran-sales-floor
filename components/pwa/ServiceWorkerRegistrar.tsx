'use client';
import { useEffect, useState } from 'react';
export default function ServiceWorkerRegistrar() {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    let reloading = false;
    let hadController = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);
    const onController = () => {
      if (hadController && !reloading) { reloading = true; window.location.reload(); }
      hadController = true;
    };
    const check = () => { if (document.visibilityState === 'visible') registration?.update().catch(() => {}); };
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onController);
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((reg) => {
        if (disposed) return;
        registration = reg;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (!disposed && worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
      }).catch((error) => console.error('Service worker registration failed:', error));
      document.addEventListener('visibilitychange', check);
    }
    return () => {
      disposed = true;
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      document.removeEventListener('visibilitychange', check);
      navigator.serviceWorker?.removeEventListener('controllerchange', onController);
    };
  }, []);
  if (online && !waiting) return null;
  return <div role="status" className="pwa-status fixed left-3 right-3 z-[60] mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-4 text-sm text-white shadow-xl">
    <span>{!online ? 'You are offline. Reconnect to load and save live data.' : 'An app update is ready. Save your work before updating.'}</span>
    {online && waiting && <button className="rounded-lg bg-white px-4 py-2 font-bold text-slate-900" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>Update now</button>}
  </div>;
}
