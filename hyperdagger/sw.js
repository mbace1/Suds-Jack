// Hyper Dagger offline service worker — same strategy as toko-drop's (v128):
//  - Tokened URLs (?v=N) are immutable per release → CACHE-FIRST; a release
//    bumps every token, so new URLs can never hit a stale cache entry.
//  - The whole module graph + vendored three.js is PRECACHED at install so
//    the installed app boots offline from the very first visit.
//  - Untokened requests (page shell, vendor files' internal relative imports,
//    icons) are NETWORK-FIRST with cache fallback: offline boot works, and a
//    new release is picked up the moment the device is online.
//  - The cache name embeds the token (from this script's own ?v= URL);
//    activation deletes older caches.
//  - GET + same-origin only: leaderboard/telemetry POSTs and any cross-origin
//    traffic pass straight through, untouched.
//  - Only OK responses are cached; precache failures are non-fatal (a CDN
//    edge 404 must not brick the install or get pinned offline).
const TOKEN = new URL(self.location.href).searchParams.get('v') ?? '0';
const CACHE = `hyper-dagger-v${TOKEN}`;

const PRECACHE = [
  './', './index.html',
  // Module tokens are all normalized to the release token, so these precache
  // entries are byte-identical to the URLs the page actually imports.
  ...['main', 'input', 'player', 'daggers', 'gems', 'voxel', 'enemy', 'bullets', 'audio', 'rng']
    .map(m => `./js/${m}.js?v=${TOKEN}`),
  './vendor/three.module.min.js',
  './vendor/jsm/postprocessing/EffectComposer.js',
  './vendor/jsm/postprocessing/RenderPass.js',
  './vendor/jsm/postprocessing/AfterimagePass.js',
  './vendor/jsm/postprocessing/UnrealBloomPass.js',
  './vendor/jsm/postprocessing/ShaderPass.js',
  './vendor/jsm/postprocessing/OutputPass.js',
  './vendor/jsm/postprocessing/MaskPass.js',
  './vendor/jsm/postprocessing/Pass.js',
  './vendor/jsm/shaders/CopyShader.js',
  './vendor/jsm/shaders/AfterimageShader.js',
  './vendor/jsm/shaders/LuminosityHighPassShader.js',
  './vendor/jsm/shaders/OutputShader.js',
  `./manifest.webmanifest?v=${TOKEN}`,
  './favicon.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.searchParams.has('v')) {
    // tokened = immutable for this release: cache-first
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      }),
    );
  } else {
    // untokened shell/vendor/icons: network-first, cache fallback
    e.respondWith(
      caches.open(CACHE).then(async c => {
        try {
          const res = await fetch(e.request);
          if (res.ok) c.put(e.request, res.clone());
          return res;
        } catch {
          const hit = await c.match(e.request, { ignoreSearch: url.pathname.endsWith('/') });
          if (hit) return hit;
          throw new Error('offline, uncached: ' + url.pathname);
        }
      }),
    );
  }
});
