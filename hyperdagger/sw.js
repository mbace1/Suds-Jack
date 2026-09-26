// Hyper Dagger service worker — offline-first for the pure-browser FPS.
//  - The whole module graph + vendored three.js is PRECACHED at install so
//    a second visit works with the network offline.
//  - Untokened requests (page shell, vendor files' internal relative imports,
//    icons) use network-first with cache fallback.
//  - Tokened module requests (?v=N) stay network-first so a deploy with a
//    bumped token always pulls the new graph; the old tokened entries age out.

const CACHE = 'hyperdagger-v53';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  '../toko/js/chat.js?v=21',
  '../toko/js/dialogue.fi.js',
  '../toko/js/dialogue.ja.js',
  '../toko/js/dialogue.js',
  '../toko/js/face.js',
  '../toko/js/glitch.js',
  '../toko/js/palette.js',
  '../toko/js/signature.js?v=3',
  '../toko/js/surface.js',
  '../toko/js/table.js?v=1',
  '../toko/js/util.js',
  './js/audio.js?v=83',
  './js/avbd/body.js?v=1',
  './js/avbd/collide.js?v=1',
  './js/avbd/manifold.js?v=1',
  './js/avbd/math.js?v=1',
  './js/avbd/solver.js?v=1',
  './js/backdrop.js?v=83',
  './js/bullets.js?v=83',
  './js/convoy.js?v=83',
  './js/daggers.js?v=83',
  './js/enemy.js?v=83',
  './js/environment.js?v=83',
  './js/gaze.js?v=83',
  './js/gel.js?v=83',
  './js/gems.js?v=83',
  './js/gibs.js?v=83',
  './js/goo.js?v=83',
  './js/inca.js?v=83',
  './js/input.js?v=83',
  './js/main.js?v=83',
  './js/mesh-enemies.js?v=83',
  './js/meshassets.js?v=83',
  './js/modes.js?v=83',
  './js/platforms.js?v=83',
  './js/player.js?v=83',
  './js/rng.js?v=83',
  './js/roster.js?v=83',
  './js/seasons.js?v=83',
  './js/shale.js?v=83',
  './js/truck.js?v=83',
  './js/tuning.js?v=83',
  './js/voxel.js?v=83',
  './js/walls.js?v=83',
  './vendor/jsm/loaders/GLTFLoader.js',
  './vendor/jsm/postprocessing/AfterimagePass.js',
  './vendor/jsm/postprocessing/EffectComposer.js',
  './vendor/jsm/postprocessing/MaskPass.js',
  './vendor/jsm/postprocessing/OutputPass.js',
  './vendor/jsm/postprocessing/Pass.js',
  './vendor/jsm/postprocessing/RenderPass.js',
  './vendor/jsm/postprocessing/ShaderPass.js',
  './vendor/jsm/postprocessing/UnrealBloomPass.js',
  './vendor/jsm/shaders/AfterimageShader.js',
  './vendor/jsm/shaders/CopyShader.js',
  './vendor/jsm/shaders/LuminosityHighPassShader.js',
  './vendor/jsm/shaders/OutputShader.js',
  './vendor/jsm/utils/BufferGeometryUtils.js',
  './vendor/three.module.min.js',
  './assets/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // tokened modules: network-first so a ?v= bump always wins
  if (url.searchParams.has('v') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // untokened shell/vendor/icons: network-first, cache fallback
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
