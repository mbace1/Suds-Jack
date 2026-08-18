// Kindling — EMBER, the small thing that lives by the fire.
//
// Rebuilt against the approved character sheet (`art-src/approved/SHEETS.md`
// §2). What used to be here was a moss-green animal invented from prose; Ember
// is a different creature and the sheet is specific about it:
//
//   a body of dark POROUS STONE, nearly the colour of the night
//   one big round head on a small round body, no neck and no waist
//   two large white eyes set wide, two small fangs standing up
//   two pale tan HORNS curving up and back
//   a dark maroon SCARF at the throat, hanging down the front
//   ember glow in the cracks, at the hands and at the tail tip
//
// The consequence of the first line is the whole build: a dark body against a
// dark night cannot carry its own silhouette, so the sheet's call-out puts the
// job on the ornaments — "big head, clear horns, scarf, and tail flame create a
// strong, readable silhouette at small sizes". Horns and scarf are therefore
// drawn in the two lightest colours the creature owns, and the lit crescent and
// ember rim from the old build stay, because a dark shape in a dark room is a
// hole in the picture whatever else you do to it.
//
// Growth is the sheet's own age ladder — "horn size, posture, accessories, and
// surface detail (cracks, moss, wear)", explicitly not body type. Five stages,
// each changing the outline by more than the guide's three pixels.
//
// It is drawn, never sprited: one table of numbers, so growing cannot make five
// sheets of art that drift apart.

import { PAL, mix, shade } from './palette.js?v=8';
import { get as species, stageAt } from './species.js?v=8';

// ── SKIN: what a species is made of ──
// The build is shared on purpose. The global bible's "shared shape language"
// panel is one round core form with a signature crown, so what tells an Ember
// from a Mossling at 26 pixels is the CROWN and the SURFACE — never the body
// plan. Everything below is therefore a palette swap plus one shape flag.
const SKIN = {
  stone: { body: PAL.EM_BODY, lit: PAL.EM_LIT, crown: PAL.EM_HORN, crownLit: PAL.EM_HORN_LIT,
           cloth: PAL.EM_SCARF, clothLit: PAL.EM_SCARF_LIT, clothDark: PAL.EM_SCARF_DK,
           glow: PAL.EMBER, glowHot: PAL.FLAME },
  moss:  { body: PAL.MO_BODY, lit: PAL.MO_LIT, crown: PAL.MO_ANTLER, crownLit: PAL.MO_ANTLER_LIT,
           cloth: '#5a4a2c', clothLit: '#7d6538', clothDark: '#33291a',
           glow: PAL.MO_ACCENT, glowHot: '#c7ef8a' },
  ash:   { body: PAL.AS_BODY, lit: PAL.AS_LIT, crown: PAL.AS_SPIKE, crownLit: '#c19a72',
           cloth: PAL.AS_WING, clothLit: PAL.AS_WING_LIT, clothDark: '#3a1a16',
           glow: PAL.EMBER, glowHot: PAL.FLAME },
  iron:  { body: PAL.MK_BODY, lit: PAL.MK_LIT, crown: PAL.MK_MOSS, crownLit: PAL.MK_MOSS_LIT,
           cloth: PAL.MK_TRIM, clothLit: '#d3ad55', clothDark: '#5e4a1e',
           glow: PAL.MK_MOSS_LIT, glowHot: '#93b862' },
};

// GROWTH SILHOUETTES (ART_GUIDE.md §5 · SHEETS.md §2 "the age ladder").
//
// `r` is the head radius and everything is measured off it, which is what keeps
// a spark and an elder the same creature — but SCALE IS NOT THE STAGE. Canon is
// explicit that growth may use size as well, never instead.
//
//   spark   horn NUBS, no scarf, no arms — an ember where the tail will be
//   wisp    horns curve; the scarf arrives; the body lengthens
//   tender  arms and feet separate from the mass
//   keeper  broader across, and carrying a flame in one hand
//   elder   BRANCHED horns, a mantle, moss and lit cracks in the stone
// Sized for the 320x180 grid: an adult stands ~26 px, which is the height the
// global art bible's scale chart gives Ember (~1.6u) once a unit is fixed. The
// numbers below are that chart, not a guess — Mossling will share them, Ashling
// takes ~0.75 of them and the Moss Knight ~1.5.
const BUILD = {
  spark:  { r: 7,  horn: 3,  stretch: 0.78, feet: 4 },
  wisp:   { r: 7,  horn: 4,  stretch: 1.24, feet: 4, scarf: true, tail: true },
  tender: { r: 8,  horn: 6,  stretch: 0.94, feet: 6, scarf: true, tail: true, arms: true },
  keeper: { r: 9,  horn: 7,  stretch: 0.90, feet: 7, scarf: true, tail: true, arms: true,
            broad: 4, lamp: true },
  elder:  { r: 10, horn: 10, stretch: 0.94, feet: 7, scarf: true, tail: true, arms: true,
            broad: 3, lamp: true, mantle: true, branch: true, cracks: true },
};

// a lit crescent down one side of a disc: the pass that keeps the creature from
// reading as a cut-out. `dir` is -1 for light from the left, +1 from the right.
function crescent(scr, cx, cy, r, dir, inner, rim) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (dx < 1) continue;
    const edge = cx + dir * dx;
    scr.px(edge, cy + dy, 1, 1, rim);
    scr.px(edge - dir, cy + dy, 1, 1, inner);
  }
}

// A filled ellipse with a 1px ink edge. The body needs independent width and
// height because that is where a stage's silhouette lives — a disc can only be
// bigger, and "bigger" is the one thing canon says a stage must not be.
function ellipse(scr, cx, cy, rw, rh, fill, edge) {
  for (let dy = -rh; dy <= rh; dy++) {
    const dx = Math.floor(rw * Math.sqrt(Math.max(0, 1 - (dy / rh) ** 2)));
    scr.px(cx - dx, cy + dy, dx * 2 + 1, 1, fill);
    if (edge !== undefined) {
      scr.px(cx - dx, cy + dy, 1, 1, edge);
      scr.px(cx + dx, cy + dy, 1, 1, edge);
    }
  }
  if (edge !== undefined) {
    scr.px(cx, cy - rh, 1, 1, edge);
    scr.px(cx, cy + rh, 1, 1, edge);
  }
}

// A horn: a tapering arc leaning up and back off the crown, in the palest colour
// the creature has. `n` is its length, and it is the single number that carries
// the age ladder — 2 px on a spark, 7 on an elder, which is the 3-pixel rule
// being obeyed by construction rather than by luck.
// A CROWN is whatever sits on top of the head, and which kind it is does more
// work than any other single decision: horns say Ember, antlers say Mossling,
// spikes say Ashling, a helm says Moss Knight. The age ladder rides on its
// LENGTH, so one number carries both facts.
function crownOf(scr, kind, x, y, n, side, tone, lit) {
  if (kind === 'helm') return;   // the helm is the head, and head() draws it
  if (kind === 'spike') {
    // a low row of spines rather than a pair of horns
    for (let i = 0; i < 3; i++) {
      const h = Math.max(2, n - i * 2);
      scr.px(x + side * (i * 2 + 1), y - h, 2, h, i ? tone : lit);
    }
    return;
  }
  if (kind === 'antler') {
    // AN ANTLER FORKS. Tines hung off the side of a horn were invisible at this
    // size — a Mossling and an Ember came out the same creature in two colours,
    // which is the 3-pixel rule being broken by the very thing meant to satisfy
    // it. What reads is a SHORT beam that splits into a clear Y near the top,
    // because a fork changes the outline and a bump on a curve does not.
    const beam = Math.max(2, Math.round(n * 0.55));
    for (let i = 0; i < beam; i++) {
      const k = i / Math.max(1, beam - 1);
      scr.px(Math.round(x + side * Math.sin(k * 1.1) * (n * 0.35)) - (side < 0 ? 1 : 0),
        Math.round(y - k * n * 0.55), 2, 2, tone);
    }
    const fx = Math.round(x + side * Math.sin(1.1) * (n * 0.35));
    const fy = Math.round(y - n * 0.55);
    for (const [spread, len] of [[0.15, 0.72], [0.85, 0.5]]) {
      const l = Math.max(3, Math.round(n * len));
      for (let i = 0; i < l; i++) {
        scr.px(fx + Math.round(side * spread * i * 1.6), fy - i - 1, 2, 2,
          i > l - 3 ? lit : tone);
      }
    }
    return;
  }
  horn(scr, x, y, n, side, tone, lit);
}

function horn(scr, x, y, n, side, tone, lit) {
  const steps = Math.max(2, n * 2);
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    // out first, then up: a horn that goes straight out on a diagonal is an
    // antenna, which is exactly what the first cut drew. The sweep is what
    // makes it a horn, and the TAPER is what gives it mass — three pixels at
    // the base down to one at the tip.
    const hx = Math.round(x + side * Math.sin(k * 1.35) * (n * 0.62));
    const hy = Math.round(y - k * n * 1.05);
    const w = Math.max(1, Math.round(4 - k * 3));
    scr.px(hx - (side < 0 ? w - 1 : 0), hy, w, 2, k < 0.45 ? tone : lit);
  }
}

// pose: 'sit' | 'doze' | 'hop' | 'walk' | 'peer' | 'stretch' | 'perk'
//
// `face` is which way it is turned, and it is deliberately NOT the same thing as
// which side is lit: the light comes out of the fire and stays there, so the
// crescent and the ember rim are always on the fire side however the creature
// has turned. Only the eyes, the fangs and the tail follow the facing. Flipping
// the lighting with the sprite is the classic way to make a room stop having a
// light source in it.
export function drawPet(scr, x, floorY, opts = {}) {
  const {
    stage = 'spark', t = 0, pose = 'sit', hop = 0, lit = 1, still = false,
    face = -1, look = 0, kind = 'ember',
  } = opts;
  const sp = species(kind);
  const skin = SKIN[sp.surface] ?? SKIN.stone;
  const base = BUILD[stage] ?? BUILD.spark;
  // the species' own size, off the global bible's scale chart, against Ember's
  // 1.6u — so a Moss Knight really is half again as tall as the thing it fights
  const grow = sp.unit / 1.6;
  const b = { ...base, r: Math.max(4, Math.round(base.r * grow)),
              horn: Math.max(2, Math.round(base.horn * grow)),
              feet: Math.round(base.feet * grow) };
  const r = b.r;

  // firelight decides how much of the creature there is at all: at coals it is
  // a shape you can just make out, at a full fire the stone has colour in it
  const body = mix(skin.body[0], skin.body[2], 0.25 + lit * 0.75);
  const bodyLit = mix(body, skin.lit, 0.3 + lit * 0.7);
  const rim = mix(PAL.COAL, skin.glow, 0.25 + lit * 0.5);
  const hornTone = mix(shade(skin.crown, 0.42), skin.crown, 0.25 + lit * 0.6);
  const hornLit = mix(hornTone, skin.crownLit, 0.3 + lit * 0.35);
  const scarf = mix(skin.clothDark, skin.cloth, 0.3 + lit * 0.7);
  const scarfLit = mix(scarf, skin.clothLit, 0.35 + lit * 0.65);

  // ── the animation principles from the sheet, in three numbers ──
  // (1) IDLE BREATH: a gentle bob, and the ember flicker rides on it.
  // (2) WEIGHT: a hop squashes on the way down.
  // (3) FOLLOW-THROUGH: cloth and tail LAG the body. `lagT` is the same clock
  //     run two frames late, and the scarf and the tail are drawn off it — which
  //     is the one principle the previous build had none of. Everything moved
  //     together, so the creature read as one rigid piece being animated.
  const walking = pose === 'walk';
  const bob = t => still ? 0
    : walking ? Math.abs(Math.sin(t * 9)) * 1.6
      : Math.sin(t * (pose === 'doze' ? 1.1 : 2.0)) * 0.5;
  const breathe = bob(t);
  const lag = bob(t - 0.16) - breathe;                  // how far behind the cloth is
  const lift = pose === 'hop' ? hop : 0;
  const squash = pose === 'hop' ? (1 - hop / 6) * 0.6
    : pose === 'stretch' ? -1.6 : 0;                    // a stretch is long, not tall

  // the mass itself is the stage's silhouette: `stretch` makes a wisp taller than
  // it is wide, `broad` widens the shoulders of a keeper and an elder
  const bodyR = Math.round(r * 0.82);
  const bodyW = bodyR + (b.broad ?? 0);
  const bodyH = Math.round(bodyR * (b.stretch ?? 1));
  const bx = Math.round(x);
  const by = Math.round(floorY - bodyH - lift + breathe * 0.6);
  // `look` lifts the head and cranes it: 1 is looking up at the wall or the
  // window, which is what makes standing under something read as looking at it.
  const hx = Math.round(bx - (pose === 'doze' ? 1 : 0) + face * look * 1.5);
  const hy = Math.round(by - r * 0.82 - bodyH * 0.34 - lift * 0.4
    + (pose === 'doze' ? r * 0.7 : 0) + breathe + squash - look * 2);

  // ── the tail, behind, with an ember at the tip ──
  // It lags, and the ember on the end flickers on its own clock — "the tail
  // flame" the sheet counts as part of the silhouette.
  if (b.tail) {
    for (let i = 0; i < 5; i++) {
      const a = 0.6 + i * 0.42 + lag * 0.22 * i;
      scr.px(bx - face * (bodyW - 1 + Math.cos(a) * (i + 2) * 0.85),
        by + 1 + Math.sin(-a) * (i + 1) * 0.66, 2, 2, i > 2 ? bodyLit : body);
    }
    const tipA = 0.6 + 5 * 0.42 + lag * 1.1;
    const tx = Math.round(bx - face * (bodyW - 1 + Math.cos(tipA) * 6.8));
    const ty = Math.round(by + 1 + Math.sin(-tipA) * 4.3);
    const flick = still ? 0.6 : 0.5 + Math.sin(t * 12.7) * 0.5;
    scr.px(tx, ty, 2, 2, mix(skin.glow, skin.glowHot, flick));
    scr.px(tx, ty - 1, 1, 1, mix(skin.glowHot, PAL.FLAME_CORE, flick));
  }

  // WINGS, and they go behind the body: a wing drawn over the mass reads as a
  // cape. Two membranes with a lighter leading edge, opening a little on the
  // breath — the Ashling sheet's note is "wings open slightly on attack".
  if (sp.wings) {
    const open = 1 + (still ? 0 : Math.sin(t * 2) * 0.14);
    for (const side of [-1, 1]) {
      const span = Math.round((bodyW + 5) * open);
      for (let i = 0; i < span; i++) {
        // the membrane: tallest at the shoulder, tapering to the tip, and it
        // rises as it goes out — a wing that lies flat is a plank
        const drop = Math.round(i * 0.55);
        const tall = Math.max(1, Math.round((span - i) * 0.8));
        scr.px(bx + side * (bodyW + i), by - bodyH - 1 + drop - tall + 4, 1, tall,
          mix(skin.cloth, PAL.INK, 0.25));
      }
      // the leading edge, one step lighter, which is what makes it a wing and
      // not a smear
      for (let i = 0; i < span; i++) {
        const drop = Math.round(i * 0.55);
        const tall = Math.max(1, Math.round((span - i) * 0.8));
        scr.px(bx + side * (bodyW + i), by - bodyH - 1 + drop - tall + 4, 1, 1, skin.clothLit);
      }
    }
  }

  // ── body ── an ellipse, so height and width are the stage's to set
  ellipse(scr, bx, by, bodyW, bodyH, body, PAL.INK);
  crescent(scr, bx, by, Math.min(bodyW, bodyH), -1, bodyLit, rim);

  // POROUS STONE: a few lighter pits, never a texture. The sheet's surface is
  // speckle, and speckle at this size is four pixels — any more and the body
  // stops being one mass, which is the thing the silhouette depends on.
  for (const [px, py] of [[-2, -1], [1, 1], [2, -2], [-1, 2]]) {
    if (Math.abs(px) < bodyW - 1 && Math.abs(py) < bodyH - 1) {
      scr.px(bx + px, by + py, 1, 1, mix(body, skin.lit, 0.35));
    }
  }
  // an elder's stone has opened: cracks with the fire showing through
  if (b.cracks) {
    const pulse = still ? 0.5 : 0.5 + Math.sin(t * 2.3) * 0.5;
    scr.px(bx - 1, by - 2, 1, 3, mix(PAL.COAL, skin.glow, pulse));
    scr.px(bx + 2, by, 1, 2, mix(PAL.COAL, skin.glow, pulse * 0.7));
  }

  // a spark has no tail yet, so its ember sits on its back — the sheet's young
  // Ember carries the glow before it has anywhere to put it
  if (!b.tail) {
    const flick = still ? 0.5 : 0.5 + Math.sin(t * 9.1) * 0.5;
    scr.px(bx + 1, by - bodyH - 1, 2, 2, mix(skin.glow, skin.glowHot, flick));
    scr.px(bx + 1, by - bodyH - 2, 1, 1, PAL.SPARK);
  }

  // arms — two stubs clear of the mass, which is what "limbs separate from the
  // body" means at this size, with an ember in the open hand
  if (b.arms) {
    for (const side of [-1, 1]) {
      const ax = bx + side * (bodyW + 1);
      scr.px(ax - (side < 0 ? 2 : 0), by - 2, 3, 6, side < 0 ? bodyLit : body);
      scr.px(ax - (side < 0 ? 2 : 0), by + 4, 3, 2, PAL.INK);
    }
  }
  // an elder wears the room: a mantle across the shoulders, three pixels deep
  if (b.mantle) {
    for (let dx = -bodyW; dx <= bodyW; dx++) {
      const d = Math.abs(dx) / bodyW;
      scr.px(bx + dx, by - bodyH + 1 + Math.round(d * 2), 1, 3 - Math.round(d * 1.5),
        dx < 0 ? mix(PAL.MOSS_LIT, PAL.EM_LIT, 0.4) : PAL.MOSS_DARK);
    }
  }

  // ── THE SCARF ── the sheet's second silhouette feature, and the one thing on
  // the creature with follow-through: the hanging end swings a beat behind the
  // body. A band at the throat, then a flap down the front on the facing side.
  if (b.scarf) {
    const ny = by - bodyH + 1;
    scr.px(bx - bodyW, ny, bodyW * 2 + 1, 3, scarf);
    scr.px(bx - bodyW, ny, Math.max(1, bodyW), 1, scarfLit);
    const sway = Math.round(lag * 1.6);
    for (let i = 0; i < 6; i++) {
      scr.px(bx + face * 3 + Math.round(sway * (i / 5)), ny + 3 + i,
        5 - (i > 3 ? 2 : 0), 1, i % 2 ? scarf : scarfLit);
    }
    scr.px(bx - face * (bodyW - 1), ny + 3, 3, 5, shade(scarf, 0.75));   // the back flap
  }

  // feet: tucked when it is sitting, and stepping when it is not. Round paws,
  // two pixels wide, because the sheet's feet are round and separate.
  const gap = b.feet ?? 3;
  const paw = mix(body, PAL.INK, 0.35);
  if (walking) {
    const step = Math.sin(t * 9) * 2.5;
    scr.px(bx - gap + step, floorY - 3, 5, 3, paw);
    scr.px(bx + gap - 3 - step, floorY - 3, 5, 3, paw);
  } else {
    scr.px(bx - gap, floorY - 3, 5, 3, paw);
    scr.px(bx + gap - 3, floorY - 3, 5, 3, paw);
  }

  // ── head ── drawn before the horns so they sit on top of the crown
  if (sp.crown === 'helm') {
    // A CLOSED HELM IS THE HEAD. Drawn as a squarer mass than a face, with a
    // hard brow, a dark slit and moss over the crown — and no eyes at all,
    // because a helm with big friendly eyes under it is a mascot in a hat.
    ellipse(scr, hx, hy, r, Math.round(r * 1.05), body, PAL.INK);
    scr.px(hx - r, hy - Math.round(r * 0.35), r * 2 + 1, 2, shade(body, 0.6));
    scr.px(hx - r + 1, hy - 1, r * 2 - 1, 3, PAL.INK);              // the slit
    scr.px(hx - r + 2, hy, 3, 1, mix(skin.glow, PAL.INK, 0.4));     // one live glint
    for (let i = 0; i < 4; i++) {                                    // moss on the crown
      scr.px(hx - r + 2 + i * 3, hy - r - 1 + (i % 2), 3, 3, i % 2 ? hornTone : hornLit);
    }
    crescent(scr, hx, hy, r, -1, bodyLit, rim);
  } else {
    scr.disc(hx, hy, r, body, PAL.INK);
    crescent(scr, hx, hy, r, -1, bodyLit, rim);
  }

  // ── HORNS ── the age ladder, and the first thing you read at arm's length.
  // They lean out and back from the top of the head; an elder's branches.
  for (const side of [-1, 1]) {
    const ox = hx + side * (r - 2), oy = hy - r + 1;
    crownOf(scr, sp.crown, ox, oy, b.horn, side, hornTone, hornLit);
    if (b.branch && sp.crown === 'horn') {
      horn(scr, Math.round(ox + side * 2.4), oy - 3, Math.round(b.horn * 0.5),
        side, hornTone, hornLit);
    }
  }

  // ── face ── both eyes sit on the side it is turned toward. Large, white and
  // set wide: the sheet's single most recognisable feature after the horns.
  const helmed = sp.crown === 'helm';
  const closed = pose === 'doze' || (!still && blinking(t));
  const ey = hy - 1 - (pose === 'stretch' ? 1 : 0);
  if (!helmed) for (const dx of [-4, 2]) {
    const ex = hx + face * dx - (face > 0 ? 2 : 0);
    if (closed) { scr.px(ex, ey, 5, 2, PAL.INK); continue; }
    scr.px(ex, ey - 2, 5, 5, PAL.EM_EYE);
    scr.px(ex + 1, ey - 1, 4, 4, PAL.EM_PUPIL);
    // the catch light is a reflection of the fire, so it stays on the fire side
    // of the eye no matter which way the head is turned
    scr.px(ex, ey - 2, 2, 2, '#ffffff');
  }
  // the mouth, and two fangs standing up out of it
  if (!helmed && (!closed || pose !== 'doze')) {
    const mx = hx + face * 1, my = ey + 5;
    scr.px(mx - 3, my, 7, 2, shade(body, 0.6));
    scr.px(mx - 3, my - 2, 2, 2, PAL.EM_TOOTH);
    scr.px(mx + 2, my - 2, 2, 2, PAL.EM_TOOTH);
  }

  // ── what it is carrying ── a flame cupped in the near hand, which is the
  // sheet's adult pose
  if (b.lamp) {
    const ly = by - 1, lx = bx - bodyW - 2;
    const flick = still ? 0.5 : 0.5 + Math.sin(t * 10.3) * 0.5;
    scr.px(lx, ly, 4, 4, mix(skin.glow, skin.glowHot, flick));
    scr.px(lx, ly - 2, 2, 2, PAL.FLAME_CORE);
  }

  // THE SHIELD LEADS. The Moss Knight sheet says so in as many words, and in a
  // turn-based fight the shield is also the telegraph: it is what moves before
  // the hit lands, which is a silhouette change rather than a colour flash.
  if (sp.wears === 'shield') {
    const sx = bx + face * (bodyW + 3);
    ellipse(scr, sx, by - 1, 5, 8, mix(skin.body[1], skin.lit, 0.3), PAL.INK);
    scr.px(sx - 1, by - 7, 2, 13, skin.cloth);
    scr.px(sx - 4, by - 3, 8, 2, skin.cloth);
  }

  if (pose === 'doze' && !still) {
    // one slow curl of sleep, on the same clock as the breathing
    const p = (t * 0.5) % 1;
    scr.px(hx + r + 2 + p * 3, hy - r - 2 - p * 6, 1, 1, mix(PAL.SMOKE, PAL.PAPER_DIM, 1 - p));
  }
}

// a blink every few seconds, and the beat is uneven so it never looks like a
// metronome (the same trick the brand's mark uses at rest)
function blinking(t) {
  const cycle = t % 4.7;
  return cycle > 4.4 || (cycle > 2.05 && cycle < 2.14);
}

export { BUILD };
