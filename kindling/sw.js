// Betterment / Kindling — offline shell.
// The state remains local-only; the whole UI is cached for daily use without a signal.

const VERSION = 'v11';
const CACHE = `kindling-${VERSION}`;

// Existing core modules stay on the v10 token. The Betterment recovery layer has
// its own v11 token so the rules can ship without duplicating the core state module.
const V = '?v=10';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './modern-ux.css?v=10',
  './modern-ux-accessibility.css?v=10',
  './betterment-recovery.css?v=11',
  './js/modern-ux.js?v=10',
  './js/betterment-rules.js?v=11',
  './js/betterment-recovery.js?v=11',
  `./js/main.js${V}`,
  `./js/room.js${V}`,
  `./js/idle.js${V}`,
  `./js/pet.js${V}`,
  `./js/species.js${V}`,
  `./js/assets.js${V}`,
  `./assets/manifest.json${V}`,
  `./assets/camp-sky.png${V}`,
  `./assets/camp-ruin.png${V}`,
  `./assets/camp-ground.png${V}`,
  `./assets/camp-front.png${V}`,
  `./assets/ember.png${V}`,
  `./assets/mossling.png${V}`,
  `./assets/ashling.png${V}`,
  `./assets/mossknight.png${V}`,
  `./assets/objects.png${V}`,
  `./assets/ui.png${V}`,
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