// Kindling — the small thing that lives by the fire.
//
// It is drawn, never sprited: five growth stages out of one set of numbers, so
// growing is a change to `r` and a couple of flags rather than five sheets of
// art that can drift apart.
//
// Two rules it is built to obey, both learned on the arcade's cover art:
//
//  * A hero cannot be a black silhouette against a dark scene. The room is
//    nearly black, so the creature is LIT from the hearth side — a band of pale
//    fur down the lit edge and one line of ember on the silhouette itself. Take
//    those two passes away and it becomes a hole in the picture.
//  * The shape has to live in the outline, because a flat fill has no shading to
//    put it in. Hence the 1px ink edge on every mass, and ears/tail that read at
//    two pixels.
//
// Poses are states of the day, not decoration: it dozes by the coals when
// nothing has been done, sits up once the fire has anything to it, hops when you
// keep something, and is simply absent while it is out on an errand.

import { PAL, mix } from './palette.js?v=2';

// which features each stage has. `r` is the head radius; everything else is
// measured off it, which is what keeps a spark and an elder the same creature.
const BUILD = {
  spark:  { r: 4, ears: false, tail: false, moss: false },
  wisp:   { r: 5, ears: true,  tail: false, moss: false },
  tender: { r: 6, ears: true,  tail: true,  moss: false },
  keeper: { r: 6, ears: true,  tail: true,  moss: false, lamp: true },
  elder:  { r: 7, ears: true,  tail: true,  moss: true,  lamp: true },
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

// pose: 'sit' | 'doze' | 'hop' | 'walk' | 'peer' | 'stretch' | 'perk'
//
// `face` is which way it is turned, and it is deliberately NOT the same thing as
// which side is lit: the light comes out of the hearth and stays there, so the
// crescent and the ember rim are always on the fire side however the creature
// has turned. Only the eyes, the nose and the tail follow the facing. Flipping
// the lighting with the sprite is the classic way to make a room stop having a
// light source in it.
export function drawPet(scr, x, floorY, opts = {}) {
  const {
    stage = 'spark', t = 0, pose = 'sit', hop = 0, lit = 1, still = false,
    face = -1, look = 0,
  } = opts;
  const b = BUILD[stage] ?? BUILD.spark;
  const r = b.r;

  // firelight decides how much colour the creature has at all — at coals it is
  // a warm grey shape, at a full fire it is moss over gold
  const fur = mix(PAL.FUR_DARK, PAL.FUR, 0.35 + lit * 0.65);
  const furLit = mix(fur, PAL.FUR_LIT, 0.25 + lit * 0.75);
  const rim = mix(PAL.COAL_HOT, PAL.EMBER, lit);
  const belly = mix(PAL.FUR_DARK, PAL.BELLY, 0.3 + lit * 0.7);

  // A walk is a bob, not a slide: two pixels up and down on a fast clock is the
  // whole animation, and without it the creature crossing the room reads as a
  // sticker being dragged.
  const walking = pose === 'walk';
  const breathe = still ? 0
    : walking ? Math.abs(Math.sin(t * 9)) * 1.6
      : Math.sin(t * (pose === 'doze' ? 1.1 : 2.0)) * 0.5;
  const lift = pose === 'hop' ? hop : 0;
  const squash = pose === 'hop' ? (1 - hop / 6) * 0.6
    : pose === 'stretch' ? -1.6 : 0;                    // a stretch is long, not tall

  const bodyR = Math.round(r * 1.15);
  const bx = Math.round(x);
  const by = Math.round(floorY - bodyR - lift + breathe * 0.6);
  // `look` lifts the head and cranes it: 1 is looking up at the shelf or the
  // window, which is what makes standing under something read as looking at it.
  const hx = Math.round(bx - (pose === 'doze' ? 1 : 0) + face * look * 1.5);
  const hy = Math.round(by - r - bodyR * 0.55 - lift * 0.4
    + (pose === 'doze' ? r * 0.7 : 0) + breathe + squash - look * 2);

  // the tail curls BEHIND, which depends on which way it is turned — otherwise
  // a creature walking right grows a tail out of its face
  if (b.tail) {
    for (let i = 0; i < 5; i++) {
      const a = 0.6 + i * 0.42;
      scr.px(bx - face * (bodyR - 1 + Math.cos(a) * (i + 2) * 0.9),
        by + 1 + Math.sin(-a) * (i + 1) * 0.7, 2, 2, i > 2 ? furLit : fur);
    }
  }

  // ── body ──
  scr.disc(bx, by, bodyR, fur, PAL.INK);
  crescent(scr, bx, by, bodyR, -1, furLit, rim);
  // the front: a pale oval that stops short of the outline, so the ink line
  // stays unbroken and the mass keeps its shape. It is centred under the face —
  // hung off to one side it read as a stripe of paint rather than a chest.
  for (let dy = -bodyR + 2; dy <= bodyR - 2; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, (bodyR - 2) * (bodyR - 2) - dy * dy)));
    const half = Math.min(dx, 3);
    scr.px(bx - half - 1, by + dy + 1, half * 2 + 1, 1, belly);
  }
  if (b.moss) {
    // an elder has the room growing on it: three tufts along the back
    for (let i = 0; i < 3; i++) scr.px(bx + 1 + i * 2, by - bodyR + i, 2, 2, PAL.MOSS);
  }
  // feet: tucked when it is sitting, and stepping when it is not — two pixels
  // are enough to seat the mass on the floor either way
  if (walking) {
    const step = Math.sin(t * 9) * 2.5;
    scr.px(bx - 3 + step, floorY - 1, 2, 1, PAL.INK);
    scr.px(bx + 1 - step, floorY - 1, 2, 1, PAL.INK);
  } else {
    scr.px(bx - 3, floorY - 1, 2, 1, PAL.INK);
    scr.px(bx + 1, floorY - 1, 2, 1, PAL.INK);
  }

  // ── head ──
  if (b.ears) {
    for (const side of [-1, 1]) {
      const ex = hx + side * (r - 1);
      scr.px(ex - 1, hy - r - 2, 2, 3, side < 0 ? furLit : fur);
      scr.px(ex - 1, hy - r - 3, 2, 1, PAL.INK);
    }
  }
  scr.disc(hx, hy, r, fur, PAL.INK);
  crescent(scr, hx, hy, r, -1, furLit, rim);

  // ── face ── both eyes sit on the side it is turned toward
  const closed = pose === 'doze' || (!still && blinking(t));
  const ey = hy - 1 - (pose === 'stretch' ? 1 : 0);
  for (const dx of [-2, 1]) {
    const ex = hx + face * dx - 1;
    if (closed) scr.px(ex, ey, 3, 1, PAL.INK);
    else {
      scr.px(ex, ey - 1, 2, 3, PAL.EYE);
      // the catch light is a reflection of the fire, so it stays on the fire
      // side of the eye no matter which way the head is turned
      scr.px(ex, ey - 1, 1, 1, PAL.EYE_LIGHT);
    }
  }
  scr.px(hx + face * 4 - (face > 0 ? 0 : 4), ey + 2, 2, 1,
    mix(PAL.NOSE, PAL.EMBER, lit * 0.4));

  // ── what it is carrying ──
  if (b.lamp) {
    const ly = by - 1;
    scr.px(bx - bodyR - 2, ly, 2, 3, mix(PAL.WOOD, PAL.FLAME, 0.35 + lit * 0.5));
    scr.px(bx - bodyR - 2, ly + 1, 1, 1, PAL.FLAME_CORE);
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
