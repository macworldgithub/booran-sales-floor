/* Public assets only. CRM responses and page HTML are never cached. */
const CACHE = 'booran-pwa-v2';
const OFFLINE = '/offline.html';
const ASSETS = [OFFLINE, '/images/icon-192x192.png', '/images/icon-512x512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  const legacy = ['api-cache', 'pages-cache', 'images-cache', 'next-static', 'google-fonts-css', 'google-fonts-files'];
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name !== CACHE && (name.startsWith('booran-') || legacy.includes(name)))
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.headers.has('authorization')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  if (!url.pathname.startsWith('/_next/static/') && !ASSETS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      if (keys.length > 100) {
        const removable = keys.filter(key => !ASSETS.includes(new URL(key.url).pathname));
        await Promise.all(removable.slice(0, keys.length - 100).map(key => cache.delete(key)));
      }
    }
    return response;
  })());
});
