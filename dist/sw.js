const CACHE_PREFIX = 'axis-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const CORE_FILES = ['/', '/manifest.webmanifest', '/icons/axis-icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/images/axis-journal-photo.webp'];
const BUILD_ASSETS = ["/assets/atkinson-hyperlegible-latin-ext-400-normal-Bbz-b3yf.woff","/assets/atkinson-hyperlegible-latin-ext-400-normal-DRk46D-x.woff2","/assets/atkinson-hyperlegible-latin-ext-700-normal-BoVPHkS0.woff2","/assets/atkinson-hyperlegible-latin-ext-700-normal-CKkU2Dpt.woff","/assets/index-YFwr2vfI.css","/assets/index-oCutVg-V.js","/assets/newsreader-latin-ext-wght-normal-C-3rgBeH.woff2","/assets/newsreader-latin-wght-normal-CCVVNp6i.woff2","/assets/newsreader-vietnamese-wght-normal-Czsa-EzN.woff2"];
const SHELL_FILES = [...CORE_FILES, ...BUILD_ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const openClient = clients.find((client) => 'focus' in client);
      if (openClient) return openClient.focus();
      return self.clients.openWindow('/');
    }),
  );
});
