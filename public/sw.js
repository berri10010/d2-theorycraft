const CACHE = 'd2tc-v1';

const APP_SHELL = [
  '/',
  '/editor',
];

const DATA_FILES = [
  '/data/weapons-0.json',
  '/data/weapons-1.json',
  '/data/perk-descriptions.json',
  '/data/god-rolls.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([...APP_SHELL, ...DATA_FILES]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip cross-origin requests (Bungie CDN images, Clarity DB, etc.)
  if (url.origin !== self.location.origin) return;

  // Network-first for data files — get fresh data when online, fall back to cache
  if (DATA_FILES.some((f) => url.pathname === f)) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for everything else (JS/CSS/HTML chunks)
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      });
    })
  );
});
