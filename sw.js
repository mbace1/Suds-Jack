// The arcade, offline.
const VERSION = 'v49';
const CACHE = `suds-hub-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './hub/arcade.js?v=5',
  './hub/art.js?v=20',
  './hub/feedback.js?v=13',
  './hub/games.js?v=54',
  './hub/hub-entry.js?v=4',
  './hub/hub.css?v=23',
  './hub/hub.js?v=66',
  './hub/i18n.js?v=11',
  './hub/pad.js?v=9',
  './hub/toko-cabinet.js?v=2',
  './hub/topics.js?v=5',
  './toko/js/chat.js?v=20',
  './toko/js/dialogue.fi.js?v=20',
  './toko/js/dialogue.ja.js?v=20',
  './toko/js/dialogue.js?v=20',
  './toko/js/face.js',
  './toko/js/glitch.js',
  './toko/js/lockup.js',
  './toko/js/palette.js',
  './toko/js/sting.js',
  './toko/js/surface.js',
  './toko/js/util.js',
  './toko/js/wordmark.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('suds-hub-') && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const live = url.pathname.endsWith('/versions.json');
  if (req.mode === 'navigate' || live) {
    e.respondWith(fetch(req, { cache: 'no-store' })
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  const mine = /\/(?:hub|toko)\//.test(url.pathname);
  const immutable = url.search.includes('v=');
  if (mine && !immutable) {
    e.respondWith(fetch(req)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && mine) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
