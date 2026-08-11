// Kindling — offline.
//
// This is a thing you open once a day, often first thing and often on a phone,
// and a daily habit that needs a signal is a daily habit with a hole in it. The
// whole app is nine small modules and one canvas, so there is no excuse: it is
// cache-first and it works with the network gone entirely.
//
// Nothing here needs to be clever, because none of this content changes between
// deploys — the `?v=N` token in every import IS the version, so a new deploy is a
// new cache name and the old one is simply dropped.
//
// Registered from index.html over https only (or with ?sw=1), so local dev and
// the smoke gate are never served a stale shell.
//
// A narrower scope wins its own pages, so this worker — not the arcade's root
// one — is what controls /kindling/. That is also why scripts/deploy-hub.mjs
// skips any folder shipping its own sw.js.

const VERSION = 'v2';
const CACHE = `kindling-${VERSION}`;

// The shell: everything needed to open the room and get through a day. The query
// strings matter — these are the URLs the page actually requests, and a token
// that disagrees with index.html is the one bug this file can have. The gate in
// test/smoke.cjs fetches every entry and fails on a stale or mistyped one.
const V = '?v=2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  `./js/main.js${V}`,
  `./js/room.js${V}`,
  `./js/pet.js${V}`,
  `./js/state.js${V}`,
  `./js/errand.js${V}`,
  `./js/breathe.js${V}`,
  `./js/pixel.js${V}`,
  `./js/palette.js${V}`,
  `./js/audio.js${V}`,
  // The way home, which lives one level up and belongs to the arcade. Caching
  // it is what keeps the HOME button on the page when there is no network —
  // without these four the button is simply missing offline. They are tokened,
  // so a bumped shell is a new URL rather than a stale hit, and the gate checks
  // these numbers against what hub/shell.js actually imports.
  '../hub/shell.js?v=17',
  '../hub/pad.js?v=9',
  '../hub/games.js?v=21',
  '../hub/padkeys.js?v=9',
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
  if (url.origin !== location.origin) return;          // nothing external, and
                                                       // nothing external exists:
                                                       // this app makes no calls
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
      // offline and not in the cache: a navigation still lands on the room
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
