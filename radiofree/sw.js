// Radio Free Helsinki — offline.
const VERSION = 'v8';
const CACHE = `rfh-${VERSION}`;
const V = `?v=8`;
const SHELL = [
  '../toko/js/signature.js?v=2',
  ...['surface', 'palette', 'face', 'util', 'glitch'].map(m => `../toko/js/${m}.js`),
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  ...['main', 'codec', 'toko', 'visuals', 'stories', 'i18n', 'screen', 'audio', 'palette']
    .map(m => `./js/${m}.js${V}`),
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
