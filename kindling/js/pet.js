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

import { PAL, mix, shade } from './palette.js?v=7';

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
    face = -1, look = 0,
  } = opts;
  const b = BUILD[stage] ?? BUILD.spark;
  const r = b.r;

  // firelight decides how much of the creature there is at all: at coals it is
  // a shape you can just make out, at a full fire the stone has colour in it
  const body = mix(PAL.EM_BODY[0], PAL.EM_BODY[2], 0.25 + lit * 0.75);
  const bodyLit = mix(body, PAL.EM_LIT, 0.3 + lit * 0.7);
  const rim = mix(PAL.COAL, PAL.EMBER, 0.25 + lit * 0.5);
  const hornTone = mix(shade(PAL.EM_HORN, 0.42), PAL.EM_HORN, 0.25 + lit * 0.6);
  const hornLit = mix(hornTone, PAL.EM_HORN_LIT, 0.3 + lit * 0.35);
  const scarf = mix(PAL.EM_SCARF_DK, PAL.EM_SCARF, 0.3 + lit * 0.7);
  const scarfLit = mix(scarf, PAL.EM_SCARF_LIT, 0.35 + lit * 0.65);

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
    scr.px(tx, ty, 2, 2, mix(PAL.EMBER, PAL.FLAME, flick));
    scr.px(tx, ty - 1, 1, 1, mix(PAL.FLAME, PAL.FLAME_CORE, flick));
  }

  // ── body ── an ellipse, so height and width are the stage's to set
  ellipse(scr, bx, by, bodyW, bodyH, body, PAL.INK);
  crescent(scr, bx, by, Math.min(bodyW, bodyH), -1, bodyLit, rim);

  // POROUS STONE: a few lighter pits, never a texture. The sheet's surface is
  // speckle, and speckle at this size is four pixels — any more and the body
  // stops being one mass, which is the thing the silhouette depends on.
  for (const [px, py] of [[-2, -1], [1, 1], [2, -2], [-1, 2]]) {
    if (Math.abs(px) < bodyW - 1 && Math.abs(py) < bodyH - 1) {
      scr.px(bx + px, by + py, 1, 1, mix(body, PAL.EM_LIT, 0.35));
    }
  }
  // an elder's stone has opened: cracks with the fire showing through
  if (b.cracks) {
    const pulse = still ? 0.5 : 0.5 + Math.sin(t * 2.3) * 0.5;
    scr.px(bx - 1, by - 2, 1, 3, mix(PAL.COAL, PAL.EMBER, pulse));
    scr.px(bx + 2, by, 1, 2, mix(PAL.COAL, PAL.EMBER, pulse * 0.7));
  }

  // a spark has no tail yet, so its ember sits on its back — the sheet's young
  // Ember carries the glow before it has anywhere to put it
  if (!b.tail) {
    const flick = still ? 0.5 : 0.5 + Math.sin(t * 9.1) * 0.5;
    scr.px(bx + 1, by - bodyH - 1, 2, 2, mix(PAL.EMBER, PAL.FLAME, flick));
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
  scr.disc(hx, hy, r, body, PAL.INK);
  crescent(scr, hx, hy, r, -1, bodyLit, rim);

  // ── HORNS ── the age ladder, and the first thing you read at arm's length.
  // They lean out and back from the top of the head; an elder's branches.
  for (const side of [-1, 1]) {
    const ox = hx + side * (r - 2), oy = hy - r + 1;
    horn(scr, ox, oy, b.horn, side, hornTone, hornLit);
    if (b.branch) {
      horn(scr, Math.round(ox + side * 2.4), oy - 3, Math.round(b.horn * 0.5),
        side, hornTone, hornLit);
    }
  }

  // ── face ── both eyes sit on the side it is turned toward. Large, white and
  // set wide: the sheet's single most recognisable feature after the horns.
  const closed = pose === 'doze' || (!still && blinking(t));
  const ey = hy - 1 - (pose === 'stretch' ? 1 : 0);
  for (const dx of [-4, 2]) {
    const ex = hx + face * dx - (face > 0 ? 2 : 0);
    if (closed) { scr.px(ex, ey, 5, 2, PAL.INK); continue; }
    scr.px(ex, ey - 2, 5, 5, PAL.EM_EYE);
    scr.px(ex + 1, ey - 1, 4, 4, PAL.EM_PUPIL);
    // the catch light is a reflection of the fire, so it stays on the fire side
    // of the eye no matter which way the head is turned
    scr.px(ex, ey - 2, 2, 2, '#ffffff');
  }
  // the mouth, and two fangs standing up out of it
  if (!closed || pose !== 'doze') {
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
    scr.px(lx, ly, 4, 4, mix(PAL.EMBER, PAL.FLAME, flick));
    scr.px(lx, ly - 2, 2, 2, PAL.FLAME_CORE);
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
