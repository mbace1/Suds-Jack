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

const VERSION = 'v1';
const CACHE = `suds-hub-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './hub/art.js?v=10',
  './hub/feedback.js?v=13',
  './hub/games.js?v=10',
  './hub/hub.css?v=17',
  './hub/hub.js?v=18',
  './hub/i18n.js?v=6',
  './hub/pad.js?v=9',
  './hub/topics.js?v=2',
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

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    // only the hub's own modules are worth keeping; a game's files belong to
    // that game's worker
    if (r.ok && url.pathname.includes('/hub/')) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return r;
  })));
});
