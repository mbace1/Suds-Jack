// Slay Kallio — TURF's cast, standing on this bridge.
//
// Owner, 2026-09-07: *"I would like the turf art used on those figures."*
// `turf/art-src/sprites/` holds 32 real character plates the owner already
// has; this game paints its figures in code. So the plate replaces the PAINT
// and NOT the process — `paintCutout` still runs newsprint, torchlight, nicks,
// fibre and grime over the top, because those passes are what make a figure
// belong to this scene rather than to TURF's. A plate dropped in raw would
// stand in TURF's lighting in front of a Kallio evening, which is the exact
// bug v10 found the other way round: a cutout is an unlit plane and the torch
// has to be painted INTO it.
//
// THE HONEST CAVEAT, recorded because this project already ruled on it once.
// The concept-pack filter in `art-src/concepts/README.md` rejected six sheets
// on two rules, and one of them was **no weapons**: "nearly every figure in
// the pack carries a knife, which is TURF's grammar and not a game whose verbs
// are a swing, a bottle and a shopping trolley." Most of these plates carry a
// knife too. The casting below leans on the weapon-light end of the set —
// barfly's bottle, milo's can, the two tank-top idles — but this is a toggle
// so the picture can settle it, not a rule being quietly reversed.
//
// A plate ships from `figures/`, NOT from `art-src/`: a Slay Kallio deploy is
// a copy of the folder minus `test/` and `art-src/`, so runtime art in
// art-src/ would arrive as a 404. TURF learned the same thing from the
// opposite direction and its note says so.

const DIR = 'figures/';

// id → plate. Only person-shaped figures are cast: the rats, blobs, birds and
// the bear have no equivalent in a roster of street operators and keep their
// drawn cutout, which is why this is a lookup rather than a blanket switch.
export const CAST = {
  // the roster
  drinker:   'grunt-barfly',   // holds a bottle — the one plate that IS the mechanic
  busker:    'grunt-spike',    // green mohawk; a busker in the underpass
  collector: 'grunt-milo',     // hood up, a can in hand, working the bins
  cart:      'sledge',         // the mass in the set: heavy, bald, planted
  walker:    'leopard',        // the highest-fidelity woman in the set
  boxer:     'gunner',         // bald, tattooed, tank top — he is already the old boxer
  // the bums on the other side
  rival:       'grunt-hollow',
  rival_b:     'grunt-runt',
  dealer:      'denny',        // flat cap, gold chain
  preacher:    'grunt-beard',
  bouncer:     'knuckle',      // shirtless and scarred: the elite reads as one
  night_shift: 'grunt-tanner',
  bridge_king: 'grunt-ragged', // dreadlocks, bandaged hands — a king of a bridge
};

export const castFiles = () => [...new Set(Object.values(CAST))].map(n => DIR + n + '.png');
export const plateFor = id => CAST[id] ? DIR + CAST[id] + '.png' : null;

// ── loading ──────────────────────────────────────────────────────────────
// Decoded once and kept, with the INK BOUNDS scanned alongside: every plate is
// padded differently, so fitting one to its FILE stands a short figure in the
// air and a tall one through the planks. TURF's render.js pays for this exact
// lesson on its props ("a prop's height comes from its INK, never its file").
const loaded = new Map();

function scanInk(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let top = c.height, bottom = -1, left = c.width, right = -1;
  for (let y = 0; y < c.height; y++) {
    for (let px = 0; px < c.width; px++) {
      if (d[(y * c.width + px) * 4 + 3] > 24) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (px < left) left = px;
        if (px > right) right = px;
      }
    }
  }
  return bottom < 0 ? { top: 0, bottom: c.height - 1, left: 0, right: c.width - 1 } : { top, bottom, left, right };
}

export function preloadPlates() {
  return Promise.all(castFiles().map(src => new Promise(res => {
    if (loaded.has(src)) return res(true);
    const img = new Image();
    img.onload = () => { try { loaded.set(src, { img, ink: scanInk(img) }); } catch { /* tainted or blank */ } res(true); };
    img.onerror = () => res(false);        // a missing plate falls back to the drawn figure
    img.src = src;
  })));
}

export const plateReady = id => { const s = plateFor(id); return s ? loaded.get(s) ?? null : null; };

// Draw a plate into the cutout's own canvas, feet on the same baseline the
// painted figures stand on and filling the same share of the height — so a
// row can mix drawn and plated figures without one of them floating.
export function drawPlate(ctx, entry, { tw, th, foot, tall }) {
  const { img, ink } = entry;
  const iw = ink.right - ink.left + 1, ih = ink.bottom - ink.top + 1;
  const k = Math.min(tall / ih, (tw * 0.94) / iw);          // height first; width only clamps a wide pose
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  ctx.imageSmoothingEnabled = false;                        // it is pixel art; keep the pixels
  ctx.drawImage(img, tw / 2 - (ink.left + iw / 2) * k, foot - (ink.bottom + 1) * k, w, h);
  ctx.imageSmoothingEnabled = true;
}
