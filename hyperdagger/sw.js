// Hyper Dagger service worker — offline-first for the pure-browser FPS.
//  - The whole module graph + vendored three.js is PRECACHED at install so
//    a second visit works with the network offline.
//  - Untokened requests (page shell, vendor files' internal relative imports,
//    icons) use network-first with cache fallback.
//  - Tokened module requests (?v=N) stay network-first so a deploy with a
//    bumped token always pulls the new graph; the old tokened entries age out.

const CACHE = 'hyperdagger-v34';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  '../toko/js/face.js',
  '../toko/js/glitch.js',
  '../toko/js/palette.js',
  '../toko/js/signature.js?v=3',
  '../toko/js/surface.js',
  '../toko/js/util.js',
  './js/audio.js?v=54',
  './js/bullets.js?v=54',
  './js/daggers.js?v=54',
  './js/enemy.js?v=54',
  './js/gems.js?v=54',
  './js/input.js?v=54',
  './js/main.js?v=63',
  './js/meshassets.js?v=54',
  './js/player.js?v=54',
  './js/rng.js?v=54',
  './js/tuning.js?v=54',
  './js/voxel.js?v=54',
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
  './models/enemies/skull.glb',
  './models/enemies/spider.glb',
  './models/enemies/totem.glb',
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
