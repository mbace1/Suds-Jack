// Toko Drop offline service worker (v128, roadmap M2).
//
// Strategy honors the repo's release cache discipline:
//  - Every module/asset URL carries a `?v=N` cache token that bumps on every
//    release (scripts/bump-version.sh), so tokened responses are immutable →
//    CACHE-FIRST. A new release means new URLs, never a stale hit.
//  - The whole module graph is PRECACHED at install (the first page load races
//    the worker, so runtime caching alone would leave offline boot to the
//    evictable HTTP cache). The token comes from this script's own ?v= URL.
//  - Untokened requests (the page shell / directory URL, manifest icons) are
//    NETWORK-FIRST with cache fallback: the installed app boots offline but
//    picks up new releases the moment it's online.
//  - The cache name embeds the current token; bump-version.sh's global
//    `?v=` replace rotates it each release, and activation deletes old caches.
//  - GET + same-origin only: feedback POSTs (Formspree / Apps Script) and any
//    cross-origin traffic pass straight through, untouched.
//  - Only OK responses are ever cached, and precache failures are non-fatal —
//    a CDN edge 404 (the v118/v119 propagation lesson) must not get pinned
//    into the offline cache or brick the install.
const CACHE = 'toko-drop-?v=149';
const TOKEN = new URL(self.location.href).searchParams.get('v') ?? '0';

// New game files must be added here as well as to bump-version.sh's file loop.
const PRECACHE = [
  './', './index.html',
  ...['main', 'input', 'bullet', 'player', 'enemy', 'audio', 'designer', 'lang', 'tuning', 'retro']
    .map(m => `./js/${m}.js?v=${TOKEN}`),
  `./vendor/three.module.min.js?v=${TOKEN}`,
  `./vendor/three.webgpu.min.js?v=${TOKEN}`,
  `./vendor/three.core.min.js?v=${TOKEN}`,
  `./vendor/jsm/geometries/RoundedBoxGeometry.js?v=${TOKEN}`,
  `./audio/announcer-intro.mp3?v=${TOKEN}`,
  `./manifest.webmanifest?v=${TOKEN}`,
  './logo.png',  // title-screen logo (untokened, loaded from main.js)
  './favicon.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.searchParams.has('v')) {
    // Tokened = immutable for this release: cache-first.
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
  } else {
    // Page shell & untokened assets: network-first, cache fallback offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
