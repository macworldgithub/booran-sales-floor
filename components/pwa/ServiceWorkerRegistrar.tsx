'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        // Check for updates on every page load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — optionally notify user
              console.log('[SW] New version available. Will activate on next visit.');
            }
          });
        });

        // Trigger background sync check
        if ('sync' in registration) {
          try {
            await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('background-sync');
          } catch {
            // Background sync not available, ignore
          }
        }

        console.log('[SW] Registered successfully:', registration.scope);
      } catch (error) {
        console.warn('[SW] Registration failed:', error);
      }
    };

    // Delay SW registration to not block initial page render
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }, []);

  return null; // Renders nothing
}
