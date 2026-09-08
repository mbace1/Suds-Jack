// Slay Kallio — the figures are made of card, so MOVE THE CARD.
//
// Owner, 2026-09-07, after the same direction was written up for TURF
// (`turf/ART_REQUEST.md` §12): *"can you test the Paper Mario type figures
// here now? as a toggle in the menu?"* — and this is the right place to test
// it, because the figures here are already flat cutouts standing on bases and
// already topple in 3D when they die. Nothing has to be drawn.
//
// THE IDEA: a verb is a thing that happens to the OBJECT, not a flipbook drawn
// inside it. Anticipation, a lunge, a squash on the landing, the card flexing
// when it is hit. Paper Mario's whole vocabulary, and it costs no art.
//
// PURE, and that is deliberate: no three.js, no DOM, no clock. `puppet.js`
// asks it for a transform and applies it; `test/core.mjs` can assert the
// arithmetic in bare node. Same rule the engine follows.
//
// UNITS. Everything is in the figure's OWN height, so one number reads the
// same on a rat and on the Bridge King:
//   dx, dy, dz   offsets in puppet heights; +dx is the way the figure faces
//   rot          radians, about the FEET — a cutout stands on a base, so the
//                feet are the only anchor a rotation can honestly use. About
//                the centre it reads as a sprite being spun.
//   sx, sy       scale about the feet (sy < 1 is a squash)
//   skew         horizontal shear about the feet: the card bending
//
// ONE DIFFERENCE FROM THE TURF BRIEF worth recording, because it changes a
// recommendation: over there the idle breath was left off by default, since
// anim.js stops its rAF the moment nothing is animating and a breath never
// stops. Here the scene renders every frame regardless — it is three.js with
// a torch that gutters — so the breath is free and is on.

export const REST = { dx: 0, dy: 0, dz: 0, rot: 0, sx: 1, sy: 1, skew: 0 };

// Bounds every clip must stay inside. `test/core.mjs` samples each clip across
// its whole length against these: a verb that throws the figure off its base
// is a bug you only ever see as "why is the rat inside the plank".
export const LIMITS = { dx: 0.5, dy: 0.35, dz: 0.3, rot: 1.4, skew: 0.3, scale: [0.8, 1.25] };

const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
// ease out, and its mirror — anticipation is SLOW and the strike is FAST,
// which is the whole reason a lunge reads as a lunge rather than a slide
const out = t => 1 - (1 - t) * (1 - t);
const inn = t => t * t;

// A clip is a list of [duration, fn(k) -> partial transform]. Missing fields
// fall back to REST, so a stage only names what it actually moves.
const CLIPS = {
  // The breath. Barely there on purpose: it says "alive", and anything more
  // says "idle animation". It has no end — held until something interrupts.
  breath: [[Infinity, (k, c) => ({
    sy: 1 + 0.012 * Math.sin(k * Math.PI * 2),
    sx: 1 - 0.006 * Math.sin(k * Math.PI * 2),
    rot: 0.004 * Math.sin(k * Math.PI * 2 + 1),
  })]],

  // ATTACK. Three beats, and the middle one is short: anticipate away from the
  // target, commit fast, then recover. The commit is under half a step so it
  // never reads as the figure having MOVED — this is a game where the board
  // says where everybody stands.
  attack: [
    [0.20, (k, c) => ({ dx: -0.10 * out(k) * c.dir, rot: -0.09 * out(k) * c.dir, sy: 1 + 0.03 * out(k) })],
    [0.11, (k, c) => ({ dx: (-0.10 + 0.40 * inn(k)) * c.dir, dz: 0.10 * inn(k), rot: (-0.09 + 0.24 * inn(k)) * c.dir, sy: 1 + 0.03 - 0.09 * inn(k), sx: 1 + 0.06 * inn(k) })],
    [0.30, (k, c) => ({ dx: 0.30 * (1 - out(k)) * c.dir, dz: 0.10 * (1 - out(k)), rot: 0.15 * (1 - out(k)) * c.dir, sy: 0.94 + 0.06 * out(k), sx: 1.06 - 0.06 * out(k) })],
  ],

  // HURT. Knocked back, and the CARD BENDS — the shear is the whole point,
  // because a rigid figure sliding backwards is a token being moved and a
  // bending one is a thing being hit.
  hurt: [
    [0.09, (k, c) => ({ dx: 0.16 * out(k) * c.dir, skew: 0.20 * out(k) * c.dir, sy: 1 - 0.06 * out(k), rot: 0.10 * out(k) * c.dir })],
    [0.26, (k, c) => {
      const s = Math.cos(k * Math.PI * 2.6) * (1 - k) * (1 - k);      // settle, overshooting once
      return { dx: 0.16 * s * c.dir, skew: 0.20 * s * c.dir, sy: 1 - 0.06 * s, rot: 0.10 * s * c.dir };
    }],
  ],

  // A HOP. Not used by a fight on a bridge where nobody walks, but this is the
  // verb the TURF brief is really about and it is the one worth being able to
  // look at, so the brand board and the debug seam can play it.
  hop: [
    [0.10, k => ({ sy: 1 - 0.12 * out(k), sx: 1 + 0.08 * out(k) })],                       // crouch
    [0.34, (k, c) => ({
      dy: 0.22 * Math.sin(k * Math.PI), dx: 0.30 * k * c.dir,
      rot: 0.10 * Math.sin(k * Math.PI) * c.dir,
      sy: 1 - 0.12 + 0.20 * Math.sin(k * Math.PI), sx: 1 + 0.08 - 0.14 * Math.sin(k * Math.PI),
    })],
    [0.12, (k, c) => ({ dx: 0.30 * c.dir, sy: 0.88 + 0.12 * out(k), sx: 1.09 - 0.09 * out(k) })],   // land squash
  ],
};

export const CLIP_NAMES = Object.keys(CLIPS);
export const isHeld = name => CLIPS[name]?.some(([d]) => !Number.isFinite(d)) ?? false;
export function clipLength(name) {
  const c = CLIPS[name];
  if (!c) return 0;
  return c.reduce((a, [d]) => a + (Number.isFinite(d) ? d : 0), 0);
}

// The one call. `t` is seconds since the clip started; `ctx.dir` is +1 when
// the figure acts toward its own facing and −1 away from it (a hit comes from
// the other side). Past the end of a finite clip it returns REST, so a caller
// that forgets to stop asking gets a figure standing still rather than one
// frozen mid-lunge.
export function poseAt(name, t, ctx = {}) {
  const clip = CLIPS[name];
  if (!clip) return { ...REST };
  const c = { dir: 1, ...ctx };
  let left = Math.max(0, t);
  for (const [dur, fn] of clip) {
    if (!Number.isFinite(dur)) return { ...REST, ...fn(left / 2.8 % 1, c) };   // held: loops on its own clock
    if (left < dur || dur === 0) return { ...REST, ...fn(dur ? clamp01(left / dur) : 1, c) };
    left -= dur;
  }
  return { ...REST };
}

// Does this clip come home? Every finite one must, or a figure that has been
// hit stands slightly to the left for the rest of the fight — the kind of
// error that accumulates invisibly over a run.
export function landsAtRest(name, eps = 1e-6) {
  if (isHeld(name)) return true;
  const p = poseAt(name, clipLength(name) + 0.001, { dir: 1 });
  return Math.abs(p.dx) < eps && Math.abs(p.dy) < eps && Math.abs(p.dz) < eps
    && Math.abs(p.rot) < eps && Math.abs(p.skew) < eps
    && Math.abs(p.sx - 1) < eps && Math.abs(p.sy - 1) < eps;
}
