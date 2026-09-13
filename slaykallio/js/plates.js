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
// THE WEAPONS RULE, and the owner reversing half of it (v22).
// `art-src/concepts/README.md` rejected six concept sheets partly on **no
// weapons**. Every one of these 32 plates carries something, so that rule taken
// literally rejects the whole set; v19 drew the line at firearms instead, on
// the reasoning that a knife on a bum is plausible and a man drinking in a park
// with a pistol is a different game in a different country.
//
// **Owner, 2026-09-09: *"of course they can have firearms."*** So that is not a
// rule, and the eight plates v19 refused are castable. `WITH_GUNS` stays as a
// NOTE rather than a ban — it is a real fact about the set, it cost a pass over
// all thirty-two at full size to establish, and it is the thing a person wants
// to know while casting. Nothing enforces it.
//
// The cast below was NOT reverted with the rule. Three of v19's five recasts
// are better castings on their own terms and the reasoning survives the
// permission: `grunt-ragged`'s bandaged fists ARE the Old Boxer, `cleaver`'s
// apron and face mask ARE the Night Shift, and `knuckle` is a Bridge King.
// A constraint that improved the work does not get undone because it was
// lifted — and the owner had just approved this cast as the game's default.
//
// A plate ships from `figures/`, NOT from `art-src/`: a Slay Kallio deploy is
// a copy of the folder minus `test/` and `art-src/`, so runtime art in
// art-src/ would arrive as a 404. TURF learned the same thing from the
// opposite direction and its note says so.

const DIR = 'figures/';

// ── POSE SETS (v25) ──────────────────────────────────────────────────────
// Two of TURF's characters are not plates at all: `gunner` and `leopard` were
// carried through the whole of `ART_REQUEST.md` §6's frame table — idle, move,
// attack-windup, attack-release, hit, death-fall, death-down — in both facings,
// and that art had been sitting in `turf/art-src/sprites/cast/` unread while
// this game moved a single still card around. `motion.js` names a frame per
// clip stage; this says which figures HAVE frames.
//
// FRONT ONLY, deliberately. TURF needs two facings because its board is
// isometric and a unit can walk away from the camera. Here everybody faces
// across the bridge and `body.scale.x = facing` mirrors the enemy row, so a
// rear frame would never be drawn. Seven files a character instead of fourteen.
export const POSES = ['idle', 'move', 'attack-windup', 'attack-release', 'hit', 'death-fall', 'death-down'];
export const WITH_POSES = new Set(['leopard', 'gunner']);

// id → plate. Only person-shaped figures are cast: the rats, blobs, birds and
// the bear have no equivalent in a roster of street operators and keep their
// drawn cutout, which is why this is a lookup rather than a blanket switch.
// Plates that put a gun in the figure's hand. A NOTE for whoever casts next,
// not a filter — see above. All eight are available.
export const WITH_GUNS = ['denny', 'deuce', 'grunt-handgun', 'grunt-shotgun',
  'grunt-tanner', 'grunt-track', 'niner', 'gunner'];

// THE OWNER'S OWN 26 ARE THE CAST (v34, owner: *"continue development with the
// new directions and assets"*, after v27 cut them and nothing read them).
// Every name below is a file cut from the owner's casting sheets by
// `turf/tools/sheet-cut.mjs` — his people, not characters generated in their
// technique. Cast for what the PICTURE shows, the rule v26 set; most of the
// generated plates were derived from one of these, so the swap is mostly the
// original replacing its copy: `grunt-barfly` → `beanie-bottle`, `grunt-spike`
// → `mohawk-green`, `grunt-milo` → `hood-can`, `grunt-ragged` → `rasta-bandaged`.
// `leopard`, `gunner` and `sledge` were already his; `sledge` had been shipping
// as the generated `sledge-plate` by mistake. Three of the 26 are spare
// (`beanie-nine`, `fade-red`, `redhood-blue`) — more human enemies when wanted.
export const CAST = {
  // the roster
  drinker:   'beanie-bottle',  // beer in hand, cigarette, ragged coat — the plate IS the mechanic
  busker:    'mohawk-green',   // the green mohawk; grunt-spike was drawn from him
  collector: 'hood-can',       // hood up, can in hand, working the bins
  cart:      'sledge',         // the mass in the set; the sledgehammer never leaves both hands
  walker:    'leopard',        // the highest-fidelity woman in the set, with a full pose set
  boxer:     'rasta-bandaged', // BANDAGED FISTS AND NO WEAPON — he is the old boxer
  // the bums on the other side
  rival:       'hood-brown',   // hollow-eyed, brown hood, a knife
  rival_b:     'hood-grey',    // the smaller one, grey hood
  dealer:      'longcoat',     // a bottle and a coat that hangs below the knee
  preacher:    'beanie-beard',
  bouncer:     'cap-sweater',  // heavy, bearded, a length of pipe
  night_shift: 'cook-mask',    // chef's whites and a face mask: he IS a night shift (the same person as `slomo`)
  bridge_king: 'spike-vest',   // tattooed, a spiked club — a boss reads as one
  // the ones that REACT (v23)
  lookout:      'track-red',   // hands in pockets, watching
  scrapper:     'crop-navy',
  hard_case:    'flatcap-gold',// stocky, tracksuit, a chain
  bottle_thief: 'blonde',      // the set's other woman, high ponytail, a knife
  // the ones from v26, each for what the picture shows
  debt:    'gunner',           // the OTHER character with a full pose set — so he can act
  bat:     'flatcap-blue',     // hold_him / swing: a tracksuit heavy
  sable:   'hoodie',           // finish_it: the dark hood, the face under it
  hardhat: 'hardhat-yellow',   // a yellow hard hat — he came off a site
  fence:   'dread-brown',      // dreadlocks, the orange jacket: he buys anything
  crowbar: 'bar-black',        // pry / duck: the one who actually holds a bar
};

// A posed character has no bare `<name>.png` — its standing frame is
// `<name>-idle.png`, so the seven files are one set with one naming rule and
// nothing has to remember which of them is the special one.
const fileFor = (name, pose) => DIR + name + (WITH_POSES.has(name) ? '-' + (pose ?? 'idle') : '') + '.png';

export const castFiles = () => [...new Set(Object.values(CAST))]
  .flatMap(n => WITH_POSES.has(n) ? POSES.map(p => fileFor(n, p)) : [fileFor(n)]);

export function plateFor(id, pose) {
  const n = CAST[id];
  return n ? fileFor(n, pose) : null;
}

// Which frames this figure actually has, so a Puppet bakes those and no more.
export const posesFor = id => WITH_POSES.has(CAST[id]) ? POSES : ['idle'];

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

// AN IMAGE URL IS A CACHE KEY TOO. The module tokens (`?v=`) move when a
// module's bytes move, but they do not reach `img.src` — so when v34 replaced
// `figures/sledge.png` with the owner's own plate under the SAME name, a
// browser holding the old bytes would have loaded the new modules and gone on
// showing the generated Cart Pusher. `ASSET_REV` moves when any file under
// `figures/` changes. It is appended at the REQUEST only: `fileFor` keeps
// returning the bare path, because the gate resolves those against the tree
// with `existsSync` and a query string is not part of a filename.
const ASSET_REV = 36;
const bust = src => `${src}?a=${ASSET_REV}`;

export function preloadPlates() {
  return Promise.all(castFiles().map(src => new Promise(res => {
    if (loaded.has(src)) return res(true);
    const img = new Image();
    img.onload = () => { try { loaded.set(src, { img, ink: scanInk(img) }); } catch { /* tainted or blank */ } res(true); };
    img.onerror = () => res(false);        // a missing plate falls back to the drawn figure
    img.src = bust(src);
  })));
}

// A pose that failed to decode falls back to the figure's idle rather than to
// nothing: a missing frame should cost a swap, never leave a blank plane.
export function plateReady(id, pose) {
  const s = plateFor(id, pose);
  if (!s) return null;
  return loaded.get(s) ?? (pose ? loaded.get(plateFor(id)) ?? null : null);
}

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

