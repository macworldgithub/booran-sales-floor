/**
 * Booran Motors Sales Floor OS — Service Worker
 * Manual Workbox-free implementation for Next.js 16 + Turbopack compatibility
 */

const CACHE_NAME = 'booran-floor-v1';
const OFFLINE_URL = '/offline';

// Resources to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/apple-touch-icon.png',
  '/images/splash-screen.jpg',
];

// ─── Install: Precache core shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: Smart caching strategies ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET or chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Backend API: Network first, cache fallback (1hr TTL)
  if (url.hostname === 'localhost' && url.port === '5001') {
    event.respondWith(networkFirst(request, 'api-cache', 60 * 60));
    return;
  }

  // Next.js API routes: Network only (never cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' },
    })));
    return;
  }

  // Google Fonts CSS: Cache first (7 days)
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(cacheFirst(request, 'google-fonts-css', 7 * 24 * 60 * 60));
    return;
  }

  // Google Fonts files: Cache first (1 year)
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, 'google-fonts-files', 365 * 24 * 60 * 60));
    return;
  }

  // Images: Cache first (30 days)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, 'images-cache', 30 * 24 * 60 * 60));
    return;
  }

  // Next.js static JS/CSS: Stale-while-revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, 'next-static'));
    return;
  }

  // HTML pages: Network first, offline page fallback
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      networkFirst(request, 'pages-cache', 24 * 60 * 60).catch(() =>
        caches.match(OFFLINE_URL) ?? fetch(request)
      )
    );
    return;
  }

  // Everything else: Network first with generic fallback
  event.respondWith(networkFirst(request, CACHE_NAME, 60 * 60));
});

// ─── Strategy helpers ────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
      if (age < maxAgeSeconds) return cached;
    } else {
      return cached;
    }
  }
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('No network and no cache');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached ?? networkPromise;
}

// ─── Push Notifications (future use) ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Booran Floor OS', {
      body: data.body ?? '',
      icon: '/images/icon-192x192.png',
      badge: '/images/icon-96x96.png',
      tag: data.tag ?? 'booran-notification',
      data: { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url ?? '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
