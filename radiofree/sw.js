// Radio Free Helsinki — offline.
//
// The app is a news feed you read on a phone, which means it gets read on a
// metro, on a train out of the city, in the places where the signal is exactly
// what a pirate station would be fighting. It has no assets and no CDN — every
// pixel is drawn in code — so there is nothing standing between it and working
// with no network except naming its own files.
//
// Cache-first, because none of this changes between deploys: the `?v=N` in
// every import IS the version, so a new deploy is a new cache name and the old
// one is simply dropped.
//
// Registered from index.html over https only (or with ?sw=1), so local dev and
// the smoke gate are never served a stale shell.

const VERSION = 'v6';
const CACHE = `rfh-${VERSION}`;

// the shell: everything needed to open the feed and read every bulletin. The
// query strings matter — these are the URLs the page actually requests.
const V = `?v=6`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  ...['main', 'codec', 'toko', 'visuals', 'broll', 'poly', 'stories', 'i18n', 'screen', 'audio', 'palette']
    .map(m => `./js/${m}.js${V}`),
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll is all-or-nothing; one 404 would leave the app with no cache at
    // all, so each file is allowed to fail on its own
    await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // nothing external is cached

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        (await caches.open(CACHE)).put(req, res.clone());
      }
      return res;
    } catch {
      // offline and not in the cache: a navigation should still land on the
      // feed rather than the browser's error page. A deep link (#seabed) is
      // the same document, so this covers shared links too.
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      // ignoring the ?v= is a last resort — a stale module beats a dead page
      const loose = await caches.match(req, { ignoreSearch: true });
      if (loose) return loose;
      throw new Error('offline and uncached');
    }
  })());
});
