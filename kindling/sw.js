// Betterment / Kindling — offline shell.
// The state remains local-only; the whole UI is cached for daily use without a signal.

const VERSION = 'v7';
const CACHE = `kindling-${VERSION}`;

// The proven core remains on its v5 token. The v6 GDD rules and v7 combat slice
// stay isolated so gameplay experiments do not destabilise the daily care loop.
const V = '?v=5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './modern-ux.css?v=5',
  './modern-ux-accessibility.css?v=5',
  './gdd-rules.css?v=6',
  './combat.css?v=7',
  './js/modern-ux.js?v=5',
  './js/gdd-rules.js?v=6',
  './js/combat.js?v=7',
  `./js/main.js${V}`,
  `./js/room.js${V}`,
  `./js/idle.js${V}`,
  `./js/pet.js${V}`,
  `./js/state.js${V}`,
  `./js/errand.js${V}`,
  `./js/breathe.js${V}`,
  `./js/pixel.js${V}`,
  `./js/palette.js${V}`,
  `./js/audio.js${V}`,
  '../hub/shell.js?v=17',
  '../hub/pad.js?v=9',
  '../hub/games.js?v=21',
  '../hub/padkeys.js?v=9',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
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
  if (url.origin !== location.origin) return;
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
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      const loose = await caches.match(req, { ignoreSearch: true });
      if (loose) return loose;
      throw new Error('offline and uncached');
    }
  })());
});