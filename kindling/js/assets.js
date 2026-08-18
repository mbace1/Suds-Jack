// Kindling — the seam between drawn art and cut art.
//
// Every visual element in this game is in one of two states, and this module is
// the only thing that knows which:
//
//   placeholder   drawn in code, which is everything today
//   live          a cut PNG, which is what the art pipeline produces
//
// The point is that a caller never asks "has the art landed yet". It asks for
// the asset; if there is a bitmap it gets one, and if there is not it draws its
// own. So an asset can switch over the moment it arrives, one at a time, with
// no rewrite and without the game ever being half-broken in between. Eeri does
// the same thing for the same reason, and it is what let that project ship for
// months with a mix of code-built and modelled art.
//
// Everything here is FAILURE-TOLERANT on purpose. A missing manifest, a missing
// PNG, a decode error, no network — all of them land in the same place: the
// asset stays a placeholder and the game draws it. Art is the one thing in this
// app allowed to be absent, because the app has to work on a phone, offline,
// before you are properly awake.

const BASE = new URL('../assets/', import.meta.url);

let manifest = null;
let loading = null;
const bitmaps = new Map();          // id -> HTMLImageElement, once decoded

// ── loading ──

function decode(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);       // absent art is not an error
    img.src = src;
  });
}

// Load the manifest and every `live` bitmap. Safe to call as often as you like;
// the work happens once. Never rejects.
export function ready() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(new URL('manifest.json', BASE));
      if (res.ok) manifest = await res.json();
    } catch { /* no manifest is a valid state: everything is drawn */ }
    if (!manifest) manifest = { grid: { w: 320, h: 180 }, assets: {} };

    const live = Object.entries(manifest.assets)
      .filter(([, a]) => a.mode === 'live' && a.file);
    await Promise.all(live.map(async ([id, a]) => {
      const img = await decode(new URL(a.file, BASE).href);
      if (img) bitmaps.set(id, img);
      // A `live` entry whose file will not decode quietly becomes a
      // placeholder rather than a hole in the picture. It is reported by
      // `missing()` so a gate can fail on it, but the app still runs.
    }));
    return true;
  })();
  return loading;
}

// ── asking ──

export const grid = () => manifest?.grid ?? { w: 320, h: 180 };
export const spec = id => manifest?.assets?.[id] ?? null;
export const isLive = id => bitmaps.has(id);

// A whole-screen layer (a scene plane). Returns the bitmap, or null to mean
// "draw it yourself".
export function layer(id) {
  return bitmaps.get(id) ?? null;
}

// One frame out of a sprite sheet, as everything `drawImage` needs. `row` is a
// named strip from the manifest (idle / walk / run / cast / …) and `i` wraps,
// so a caller can hand it a frame counter without doing modulo itself.
export function frame(id, row, i = 0) {
  const a = spec(id), img = bitmaps.get(id);
  if (!a || !img || !a.rows) return null;
  const names = Object.keys(a.rows);
  const r = names.indexOf(row);
  if (r < 0) return null;
  const n = a.rows[row];
  const cell = a.cell;
  return { img, sx: (((i % n) + n) % n) * cell, sy: r * cell, w: cell, h: cell };
}

// One cell out of an atlas, by name. The manifest lists atlas cells in reading
// order, so a name is an index and nobody has to count rows in their head.
export function cell(id, name) {
  const a = spec(id), img = bitmaps.get(id);
  if (!a || !img || !a.cells) return null;
  const idx = a.cells.indexOf(name);
  if (idx < 0) return null;
  const across = Math.floor(img.width / a.cell);
  return {
    img, sx: (idx % across) * a.cell, sy: Math.floor(idx / across) * a.cell,
    w: a.cell, h: a.cell,
  };
}

// What the manifest promised and could not deliver — a `live` entry whose file
// did not decode. Empty is the healthy answer, and the gate asserts it.
export function missing() {
  if (!manifest) return [];
  return Object.entries(manifest.assets)
    .filter(([id, a]) => a.mode === 'live' && !bitmaps.has(id))
    .map(([id]) => id);
}

// Every file the service worker has to precache. The worker's shell list is
// hand-kept, and a list one token behind the page is an app that loads online
// and is blank on a train — which this repo has shipped before. So the list is
// DERIVED here and the gate compares the two.
export function files() {
  if (!manifest) return [];
  return Object.values(manifest.assets)
    .filter(a => a.mode === 'live' && a.file)
    .map(a => `./assets/${a.file}`);
}
