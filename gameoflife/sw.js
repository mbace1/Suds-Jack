// The Game of Life — offline.
//
// The whole point of this app is to send you outside, and outside is exactly
// where the signal stops. So the app has to work with no network at all: the
// nature invitations are the thing you most want in your pocket on a trail, and
// they were the first thing to break.
//
// Cache-first, because none of this content changes between deploys — the
// `?v=N` cache-buster in every import is the version, so a new deploy is a new
// cache name and the old one is simply dropped. Nothing here needs to be clever;
// it needs to be correct when there is no answer coming from the network.
//
// Registered from index.html only over https (or with ?sw=1), so local dev and
// the smoke gate are never served a stale shell.

const VERSION = 'v42';
const CACHE = `gol-${VERSION}`;

// the shell: everything needed to open the hub and run any experience. The
// query strings matter — these are the URLs the page actually requests.
const V = `?v=42`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  `./js/main.js${V}`,
  `./js/i18n.js${V}`,
  `./js/palette.js${V}`,
  `./js/pixel.js${V}`,
  `./js/crt.js${V}`,
  `./js/storage.js${V}`,
  `./js/audio.js${V}`,
  `./js/nature.js${V}`,
  `./js/poems.js${V}`,
  `./js/feedback.js${V}`,
  `./js/crt.js${V}`,
  ...['aqueduct', 'forest', 'tern', 'cup', 'hanami', 'berry', 'stars', 'maple',
      'plate', 'seam', 'dots', 'glass', 'wait', 'lichen', 'cloud', 'ice',
      'trace', 'gears', 'cairn', 'downhill', 'tether', 'hedge', 'seed',
      'lightning', 'whale', 'pando', 'murmur', 'eel',
  ].map(id => `./js/experiences/${id}.js${V}`),
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
  if (req.method !== 'GET') return;                     // feedback POSTs pass through
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // nothing external is cached

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // keep whatever we learn, so an experience opened once works offline later
      if (res && res.ok && res.type === 'basic') {
        (await caches.open(CACHE)).put(req, res.clone());
      }
      return res;
    } catch {
      // offline and not in the cache: a navigation should still land on the hub
      // rather than the browser's error page
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
