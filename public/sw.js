// Cache version — bump this string to force all clients to evict the old cache.
const CACHE = 'd2tc-v11';

const DATA_FILES = [
  '/data/weapons.json',
  '/data/perks.json',
  '/data/mods.json',
  '/data/statgroups.json',
  '/data/pvp-wishlist.json',
  '/data/pride.json',
  '/data/sources.json',
  '/data/clarity.json',
  '/data/god-rolls.json',
];

self.addEventListener('install', () => self.skipWaiting());

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

  // Skip cross-origin (Bungie images, Clarity DB, Google Fonts)
  if (url.origin !== self.location.origin) return;

  // Network-first for weapon/god-roll data — fresh when online, cached fallback offline
  if (DATA_FILES.some((f) => url.pathname === f)) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Only good responses are cached; on an error status prefer the last good copy.
          if (!res.ok) return caches.match(request).then((cached) => cached || res);
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        // respondWith needs a Response, so offline with nothing cached is a network error, not undefined.
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Cache-first for immutable hashed assets only (_next/static/)
  // These files have content-hashes in their names and never change.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Everything else (HTML pages, icons, manifest) — always network-first.
  // This ensures deployments are picked up immediately and avoids stale HTML
  // pointing to outdated CSS/JS chunk hashes.
});
