// The arcade, offline.
//
// The Game of Life has worked without a signal for a while; the page that
// lists it has not. That is backwards — the hub is the thing you open first,
// and "no connection" should cost you the games you have not cached, not the
// front door.
//
// Two rules, and they are different on purpose:
//
//   the page shell   NETWORK FIRST. index.html has no ?v= on it, so a cached
//                    copy would pin the arcade at whatever it looked like the
//                    day you first visited. The network wins when there is one
//                    and the cache answers when there is not.
//   the modules      CACHE FIRST. Every one of them carries a ?v= token, so a
//                    new deploy is a new URL and there is nothing to go stale.
//
// Nothing under a game's own folder is touched. toko-drop/ and gameoflife/
// ship their own workers with their own precache lists, and a second worker
// caching their files from out here would be two answers to the same question.
// A narrower scope wins the page, so those keep controlling themselves.

const VERSION = 'v13';
const CACHE = `suds-hub-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './hub/arcade.js?v=5',
  './hub/art.js?v=13',
  './hub/feedback.js?v=13',
  './hub/games.js?v=16',
  './hub/hub.css?v=23',
  './hub/hub.js?v=30',
  './hub/i18n.js?v=11',
  './hub/pad.js?v=9',
  './hub/topics.js?v=2',
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
  // one missing file must not fail the whole install and leave the arcade with
  // no worker at all — cache what is there and say so
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

  // versions.json is the one thing that is supposed to change under the page
  // without a deploy of the arcade, so it is never served from the cache while
  // there is a network to ask
  const live = url.pathname.endsWith('/versions.json');

  if (req.mode === 'navigate' || live) {
    e.respondWith(fetch(req)
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return r;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }

  // A module with a ?v= token is immutable by construction — a new deploy is a
  // new URL — so the cache is always right and is answered from first.
  //
  // A module WITHOUT one is not. The counter under toko/ imports its own dozen
  // modules with bare specifiers, and serving those cache-first would pin them
  // at whatever they were the first time you loaded the page, with no way to
  // ever move them. They are precached so the counter exists with no signal,
  // and revalidated so it is never stale with one. Same rule as the page shell,
  // for the same reason.
  const mine = /\/(?:hub|toko)\//.test(url.pathname);
  const immutable = url.search.includes('v=');

  if (mine && !immutable) {
    e.respondWith(fetch(req)
      .then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
      })
      .catch(() => caches.match(req)));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    // only the hub's own modules are worth keeping; a game's files belong to
    // that game's worker
    if (r.ok && mine) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return r;
  })));
});