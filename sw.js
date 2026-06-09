/* Service worker for the fencing tournament tracker.
   Scope is the whole site, but this SW deliberately only caches the
   fencing app shell + its fonts — every other page (index, wizardwalk,
   etc.) is left to normal network behaviour so nothing goes stale. */
const CACHE = 'fencing-v7';
const SHELL = ['./fencing.html', './fencing.webmanifest', './favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isShell = url.origin === self.location.origin
    && /\/(fencing\.html|fencing\.webmanifest|favicon\.svg)$/.test(url.pathname);
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';

  // Only intercept the fencing app shell + its fonts. Cache-first so the
  // tool opens instantly and works fully offline once visited once.
  if (isShell || isFont) {
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
      )
    );
  }
  // Everything else: fall through to the network (no interception).
});
