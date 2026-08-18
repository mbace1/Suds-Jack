// The one asset loader the whole floor shares.
//
//   import { image, texture, mesh } from '../assets/load.js';
//   const sky = await texture(THREE, 'hyperdagger/sky', () => makeSkyCanvas());
//
// THE PROMISE THIS MODULE MAKES: a game that asks for an asset which has never
// been generated still works. Every entry point takes a `fallback` and calls
// it when the asset is missing, so adopting the pipeline is additive — you
// wire an id in, and until somebody runs `scripts/assets.mjs gen` the game
// renders exactly what it rendered before. Nothing here can break a cabinet.
//
// That is not politeness, it is three constraints this repo already has:
//   · every game currently draws its art in code, and those systems are the
//     house style rather than placeholders — see assets/manifest.mjs,
//   · four of these games ship offline service workers, and a loader that
//     hard-failed on a cache miss would break the offline promise,
//   · gh-pages is deployed per-game, so a game can go live before the batch
//     of art it names does.
//
// Resolution is off `import.meta.url`, never `location` and never a relative
// fetch: this module is imported from /toko-drop/js/, from /hub/, and from
// /AnotherHUB/ which is the same page one level down behind a <base href>. The
// module's own URL is the only thing that is right in all three — the counter
// paid for that lesson once already (toko/js/chat.js reads document.baseURI
// for the same reason).

const INDEX_URL = new URL('./index.json', import.meta.url);
const OUT = new URL('./out/', import.meta.url);

let indexPromise = null;

// One fetch per page, ever, and a failure is cached as "nothing generated"
// rather than retried per asset — a 404 here is the ordinary state of a fresh
// checkout, not an error worth a hundred network round trips.
export function ready() {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL)
      .then(r => (r.ok ? r.json() : { generated: {} }))
      .then(j => j.generated ?? {})
      .catch(() => ({}));
  }
  return indexPromise;
}

export async function has(id) {
  return Boolean((await ready())[id]);
}

// The absolute URL of a generated asset, or null. Exposed because a game may
// want to hand the URL to a loader this module knows nothing about.
export async function url(id) {
  const entry = (await ready())[id];
  return entry ? new URL(entry.file, OUT).href : null;
}

// Every generated URL, for a service worker's precache list. Binary assets are
// not in anybody's import graph, so scripts/sw-shell.mjs's walk cannot see
// them — a worker that wants them offline has to be told, and this is the
// telling. (`node scripts/assets.mjs list` prints the same thing at build time.)
export async function urls() {
  const idx = await ready();
  return Object.values(idx).map(e => new URL(e.file, OUT).href);
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`asset failed to decode: ${src}`));
    img.src = src;
  });
}

// An <img> for a 2D asset, or whatever `fallback()` returns. A fallback may
// return a canvas, an image, or null — the caller knows what it asked for.
export async function image(id, fallback = () => null) {
  const src = await url(id);
  if (!src) return fallback();
  try { return await loadImageEl(src); } catch { return fallback(); }
}

// A three.js texture. THREE is passed in rather than imported because every
// game here pins its own copy — some from a local vendor/ directory, some from
// a CDN importmap — and a second three.js in the page is a whole class of
// bug (two WebGLRenderers, two Object3D prototypes) that this module must not
// be the cause of.
export async function texture(THREE, id, fallback = () => null, tune = () => {}) {
  const src = await url(id);
  if (!src) {
    const fb = fallback();
    // A fallback that already returns a texture passes through; one that
    // returns a canvas gets wrapped, since a CanvasTexture is what these games
    // fake their skies and grounds with today.
    if (!fb) return null;
    const tex = fb.isTexture ? fb : new THREE.CanvasTexture(fb);
    tune(tex);
    return tex;
  }
  const img = await loadImageEl(src).catch(() => null);
  if (!img) return texture(THREE, '\0missing', fallback, tune);
  const tex = new THREE.Texture(img);
  tex.needsUpdate = true;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tune(tex);
  return tex;
}

// A GLB. The GLTFLoader is passed in for the same reason THREE is — it comes
// from each game's own three.js build, and importing one here would drag a
// second copy of the library into the page.
export async function mesh(GLTFLoader, id, fallback = () => null) {
  const src = await url(id);
  if (!src) return fallback();
  try {
    const gltf = await new GLTFLoader().loadAsync(src);
    return gltf.scene;
  } catch {
    return fallback();
  }
}

// For tests and for the console: pretend the batch is empty, or point the
// loader at a stub index without touching the network.
export function __setIndex(idx) { indexPromise = Promise.resolve(idx ?? {}); }
