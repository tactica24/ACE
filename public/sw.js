const VERSION = 'ace-pwa-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/',
  '/browse',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/ace-studio-mark.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== SHELL_CACHE && cacheName !== RUNTIME_CACHE)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful navigations
           if (response.ok) {
             const responseClone = response.clone();
             caches.open(RUNTIME_CACHE).then((cache) => {
               return cache.put(request, responseClone).catch((error) => {
                 console.warn('Failed to cache response:', error);
               });
             }).catch((error) => {
               console.warn('Failed to open cache:', error);
             });
           }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? caches.match(OFFLINE_URL))
    );
    return;
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request)
          .then((response) => {
             // Only cache successful asset responses
             if (response.ok) {
               const responseClone = response.clone();
               caches.open(RUNTIME_CACHE).then((cache) => {
                 return cache.put(request, responseClone).catch((error) => {
                   console.warn('Failed to cache asset response:', error);
                 });
               }).catch((error) => {
                 console.warn('Failed to open cache for asset:', error);
               });
             }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse ?? networkResponse;
      })
    );
  }
});
