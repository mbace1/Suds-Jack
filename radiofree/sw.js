// Radio Free Helsinki — offline.
const VERSION = 'v41';
const CACHE = `rfh-${VERSION}`;
const V = `?v=41`;
const SHELL = [
  '../toko/js/signature.js?v=2',
  ...['surface', 'palette', 'face', 'util', 'glitch'].map(m => `../toko/js/${m}.js`),
  './',
  './index.html',
  './manifest.webmanifest',
  './img/cathedral.jpg',
  './img/katu.jpg',
  './img/mannerheim.jpg',
  './wire.json',
  './wire/index.json',
  './icon-192.png',
  './icon-512.png',
  ...['main', 'codec', 'package', 'anchor', 'graphic', 'plate', 'photo', 'plates', 'wire', 'toko', 'visuals', 'stories', 'i18n', 'screen', 'audio', 'palette']
    .map(m => `./js/${m}.js${V}`),
];

// The newest broadcast, whatever it turns out to be.
//
// The episode files used to be NAMED in the precache list, which was fine for
// as long as a person added one by hand and bumped the token in the same edit.
// The daily job writes a new `wire/<date>.json` every morning and never touches
// code, so a named list would be a list of yesterdays: the first read of a
// fresh episode would need the network, and a listener who installed the app on
// the metro would have an archive picker full of dates and nothing behind the
// top one. So install reads the index and caches whatever it points at.
async function precacheNewest(c) {
  try {
    const res = await fetch('./wire/index.json', { cache: 'reload' });
    if (!res || !res.ok) return;
    await c.put('./wire/index.json', res.clone());
    const idx = await res.json();
    const list = Array.isArray(idx.episodes) ? idx.episodes : [];
    for (const date of list.slice(0, 2)) {   // today's, and the one behind it
      await c.add(new Request(`./wire/${date}.json`, { cache: 'reload' })).catch(() => {});
    }
  } catch { /* the shell still installs; the wire falls back */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await precacheNewest(c);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// The wire is NETWORK-FIRST while the shell stays cache-first. Cache-first for
// content would pin a listener to whatever bulletins they downloaded first —
// the app would keep updating on token bumps and the news never would.
//
// EVERYTHING UNDER `wire/` COUNTS, and that is not tidiness. `wire/index.json`
// is the list of broadcasts; served cache-first it is a list frozen on the day
// the app was installed, so a daily job could commit an episode every morning
// and no installed copy would ever learn one existed. The index is the one file
// that MUST be allowed to grow, or the whole arrangement quietly undoes itself.
const isWire = (u) => u.pathname.endsWith('/wire.json')
  || (u.pathname.includes('/wire/') && u.pathname.endsWith('.json'));

async function wireFirst(req) {
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) {
      // keyed by the REQUEST, so each episode caches under its own date and
      // the last one read stays readable with the network off
      (await caches.open(CACHE)).put(req, res.clone());
      return res;
    }
    throw new Error('HTTP ' + (res && res.status));
  } catch {
    const c = await caches.match(req, { ignoreSearch: false })
      || await caches.match(req, { ignoreSearch: true });
    if (c) return c;
    return new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

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
