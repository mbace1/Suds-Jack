// Radio Free Helsinki — offline.
//
// The app is a news feed you read on a phone, which means it gets read on a
// metro, on a train out of the city, in the places where the signal is exactly
// what a pirate station would be fighting. It has no assets and no CDN — every
// pixel is drawn in code — so there is nothing standing between it and working
// with no network except naming its own files.
//
// TWO CACHING RULES, and the split is the point.
//
// The SHELL is cache-first, because none of it changes between deploys: the
// `?v=N` in every import IS the version, so a new deploy is a new cache name
// and the old one is simply dropped.
//
// The WIRE (`wire.json`) is NETWORK-FIRST, because the whole reason it is a
// file and not a module is that it changes without a deploy. Serving it
// cache-first would pin a listener to whatever bulletins they happened to
// download first and quietly undo the entire arrangement — the shell would
// update on a version bump and the content never would. Network wins when
// there is one; the cached copy is the fallback, so a train tunnel still
// yields yesterday's wire rather than the off-air card.
//
// Registered from index.html over https only (or with ?sw=1), so local dev and
// the smoke gate are never served a stale shell.

const VERSION = 'v7';
const CACHE = `rfh-${VERSION}`;

// the shell: everything needed to open the feed and read every bulletin. The
// query strings matter — these are the URLs the page actually requests.
const V = `?v=7`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  ...['main', 'codec', 'toko', 'visuals', 'broll', 'poly', 'stories', 'wire', 'i18n',
      'screen', 'audio', 'palette'].map(m => `./js/${m}.js${V}`),
  // no ?v= — it is versioned by its own `updated` field, not by the build
  './wire.json',
];

// the one URL that must never be answered from cache while a network exists
const isWire = (url) => url.pathname.endsWith('/wire.json');

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

// Network first, cache second, and refresh the cache on every success — so the
// offline copy is always the last wire this listener actually received.
async function wireFirst(req) {
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) {
      (await caches.open(CACHE)).put('./wire.json', res.clone());
      return res;
    }
    throw new Error(`HTTP ${res && res.status}`);
  } catch {
    // ignoreSearch: the page asks with a cache-busting query, the cache holds
    // the bare path
    const cached = await caches.match('./wire.json')
      || await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    // Let stories.js see a failure it can name, rather than a network error
    // the browser phrases for us — it has an off-air post ready for exactly it.
    return new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;      // nothing external is cached

  e.respondWith((async () => {
    if (isWire(url)) return wireFirst(req);

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
