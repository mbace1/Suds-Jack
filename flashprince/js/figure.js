// The figure — a rotoscoped man made of eleven polygons.
//
// Chahi filmed himself running, jumping and falling over in a car park, traced
// the frames, and reduced each one to a handful of filled shapes. There is no
// sprite sheet in Another World and there is none here either: a pose is
// thirteen numbers, a frame is those numbers turned into polygons, and an
// animation is a short list of poses with times against them.
//
// Doing it this way is not nostalgia — it is what makes the movement carry.
// Interpolating between two traced keys gives you the in-betweens for free, so
// a run can hold its contact pose for three frames and blur through the pass in
// one, which is exactly the timing a rotoscope has and exactly what a
// constant-rate sprite loop cannot do.
//
// A pose is:
//   [ hipN,kneeN, hipF,kneeF, shN,elN, shF,elF, lean, head, py, px, rot ]
//
// N is the near limb (drawn in front of the torso), F the far one (drawn
// behind, and a shade darker — the one cheat that gives a flat figure depth).
// Every angle is degrees from straight down, positive swinging FORWARD, so the
// same numbers work facing either way and there is no left/right sheet.

const D = Math.PI / 180;

export const P = (...v) => v;

// ── the pose library ───────────────────────────────────────────────
// Read these as traced frames, because that is what they are standing in for.
export const POSE = {
  //           hipN kneeN hipF kneeF  shN  elN  shF  elF lean head  py  px rot
  stand:    P(  -4,   4,    6,   5,    8,  16,   -5,  12,   4,  -2,   0,  0,  0),
  breathe:  P(  -4,   3,    6,   4,    7,  14,   -4,  11,   3,  -1,  -1,  0,  0),
  alert:    P( -10,   6,   12,   8,   14,  30,  -12,  26,   9,  -4,   1,  0,  0),

  // walking — a careful single step, PoP's shift-step. Long contact, low lift.
  step1:    P(  22,   6,  -18,  24,  -16,  22,   18,  20,   6,  -2,   1,  0,  0),
  step2:    P(   6,  20,   -4,  10,   -6,  20,    8,  18,   6,  -2,   2,  0,  0),
  step3:    P( -16,  10,   20,  10,   14,  20,  -14,  18,   5,  -2,   1,  0,  0),

  // running — four traced keys, contact / pass / contact / pass
  run1:     P(  34,   8,  -30,  44,  -36,  46,   38,  36,  15,  -4,   0,  0,  0),
  run2:     P(   6,  50,   -8,  14,  -14,  62,   16,  52,  14,  -4,  -2,  0,  0),
  run3:     P( -30,  44,   34,   8,   38,  36,  -36,  46,  15,  -4,   0,  0,  0),
  run4:     P(  -8,  14,    6,  50,   16,  52,  -14,  62,  14,  -4,  -2,  0,  0),
  skid:     P(  30,  14,  -16,  28,  -30,  30,  -34,  26,  -8,   4,   4,  0,  0),

  // the turn. He plants, pivots on the ball of the foot, and settles.
  turnA:    P(   8,  16,   -8,  16,   16,  30,  -14,  26,   2,   6,   3,  0,  0),
  turnB:    P(   2,  26,   -2,  26,   24,  40,  -20,  36,  -2,  10,   6,  0,  0),

  // crouching, and the roll out of it
  crouch:   P(  56,  86,   48,  92,   26,  62,   18,  58,  26,  -6,  11,  1,  0),
  crouchLo: P(  62,  96,   54, 100,   32,  70,   24,  64,  30,  -8,  13,  1,  0),
  tuck:     P(  96, 108,   92, 112,   72,  96,   68,  92,  52,   0,  10,  0,  0),

  // jumping. gather, extend, tuck, reach, absorb.
  gather:   P(  46,  70,   40,  74,  -30,  34,  -34,  30,  24,  -4,   8,  0,  0),
  launch:   P(  10,  14,   34,  46,   64,  30,   40,  40,  20,  -8,  -3,  0,  0),
  rise:     P(  26,  46,  -14,  30,   58,  46,   14,  50,  16,  -6,  -1,  0,  0),
  apex:     P(  34,  62,   -8,  40,   38,  60,   -6,  54,  10,  -4,   0,  0,  0),
  descend:  P(  20,  30,  -20,  22,  -14,  40,  -28,  34,   6,   0,   0,  0,  0),
  land:     P(  38,  62,   30,  66,   16,  56,   10,  52,  20,  -4,   8,  0,  0),
  sprawl:   P(  70, 100,   58,  94,  -40,  70,  -48,  64,  38,  10,  12,  0,  0),

  // hanging from a ledge. The arms are the anchor, so the body reads as weight.
  hang:     P(  10,  26,   -6,  16,  164,  14,  158,  18,  -4,   4,   0,  0,  0),
  hangSwing:P(  30,  38,   14,  22,  164,  10,  160,  14,  -8,   6,   1,  0,  0),
  pullUp:   P(  46,  66,   30,  50,  150,  62,  146,  58,  12,   2,   4,  1,  0),
  mantle:   P(  76,  92,   40,  70,  100,  84,   96,  80,  34,  -2,   6,  3,  0),
  standUp:  P(  36,  58,   22,  44,   40,  50,   34,  46,  18,  -4,   5,  2,  0),

  // the pistol. Drawing it is slow on purpose — it is the whole duel.
  draw1:    P(  -6,   6,    8,   6,   30,  76,   -6,  12,   4,  -2,   0,  0,  0),
  draw2:    P(  -8,   8,   10,   8,   62,  52,  -10,  16,   2,  -4,   0,  0,  0),
  aim:      P( -10,   8,   14,   8,   86,   4,  -14,  18,   0,  -6,   0,  0,  0),
  aimLow:   P(  58,  88,   50,  94,   84,   6,   20,  40,  24,  -8,  11,  1,  0),
  recoil:   P( -12,  10,   16,  10,   72,  16,  -16,  20,  -4,  -8,  -1, -1,  0),

  // ── the careful step ───────────────────────────────────────────────
  // Shift, in Prince of Persia, and the most useful move in it. He shortens
  // his stride, leans back off the toe, and puts one foot down where he can
  // see it. It exists because the game kills you for a pixel.
  inch1:    P(  13,   5,   -9,  15,  -10,  20,   11,  18,  -4,  -2,   1,  0,  0),
  inch2:    P(   4,  12,   -3,   9,   -4,  18,    5,  17,  -5,  -2,   2,  0,  0),
  inch3:    P(  -8,   7,   11,   8,    9,  19,   -8,  17,  -4,  -2,   1,  0,  0),
  peer:     P(  -6,   5,    9,   7,   10,  22,   -8,  18, -10,  14,   2, -1,  0),

  // stepping up onto something a foot high, without hanging off it first
  stepUpA:  P(  74,  62,   -6,  10,  -26,  36,   16,  30,  22,  -4,   2,  1,  0),
  stepUpB:  P(  52,  20,   26,  74,    6,  46,  -18,  40,  30,  -6,  -6,  3,  0),
  stepUpC:  P(  14,   8,   36,  56,   22,  38,   -8,  34,  16,  -4,  -2,  4,  0),

  // lowering himself over an edge on purpose, which is not the same thing as
  // falling off one
  kneel:    P(  84,  96,   62,  88,   36,  58,   30,  54,  40,  -6,  12,  0,  0),
  reachDn:  P( 100, 104,   78,  96,  110,  40,  104,  44,  46,   2,  14, -2,  0),
  lower:    P(  46,  52,   30,  40,  150,  22,  146,  26,  10,   6,   6, -1,  0),

  // running into a wall at speed, which Prince of Persia also charges you for
  bumpA:    P(  26,  18,  -14,  26,  -46,  58,  -52,  52, -22,  16,   4, -2,  0),
  bumpB:    P(  10,  22,   -6,  18,  -20,  46,  -26,  42, -10,   8,   3, -1,  0),

  // the flask
  drinkA:   P(  58,  88,   50,  94,   26,  62,   18,  58,  28,  -4,  11,  1,  0),
  drinkB:   P(  56,  86,   48,  92,  132,  96,   22,  60,  20, -14,  10,  1,  0),

  // ── the sword ──────────────────────────────────────────────────────
  // En garde is a WHOLE BODY, not an arm: side-on, weight back, knees soft.
  // At thirty pixels the stance has to be readable as a silhouette or the
  // duel is unreadable, and the duel is the other half of the game.
  guard:    P(  30,  26,  -22,  30,   62,  52,  -30,  44,  -8,  -4,   6,  0,  0),
  guardHi:  P(  28,  24,  -20,  28,   78,  40,  -28,  42,  -4,  -6,   5,  0,  0),
  advance:  P(  44,  18,  -14,  40,   66,  48,  -34,  46,   2,  -4,   5,  2,  0),
  retreat:  P(  10,  38,  -34,  22,   56,  58,  -24,  40, -14,  -2,   7, -2,  0),
  strikeA:  P(  38,  22,  -18,  34,   14,  86,  -26,  46,  -2,  -6,   5,  0,  0),
  strikeB:  P(  62,  14,  -20,  46,   96,   4,  -18,  40,  16,  -8,   2,  4,  0),
  parry:    P(  26,  28,  -20,  30,  104,  36,  -26,  44, -10,  -8,   6, -1,  0),
  clang:    P(  22,  30,  -18,  32,  118,  52,  -30,  46, -16,  -4,   7, -3,  0),
  swordUp:  P(  -4,   6,    8,   6,   36,  70,   -8,  14,   2,  -2,   0,  0,  0),

  // and being hit, and stopping
  hurt:     P( -16,  16,   22,  20,  -34,  40,  -42,  34, -12,  12,   2, -2,  0),
  deadA:    P(  40,  70,   30,  60,  -60,  40,  -66,  36, -30,  20,   6, -2, 26),
  deadB:    P(  84, 104,   78, 100,  -84,  30,  -88,  26, -70,  30,  14, -4, 78),
};

// shortest-arc-free lerp: these are traced angles, not orientations, so a plain
// numeric blend is what is wanted — a knee going 8 → 44 must pass through 26.
export function blend(a, b, t) {
  const o = new Array(13);
  for (let i = 0; i < 13; i++) o[i] = a[i] + (b[i] - a[i]) * t;
  return o;
}

// A clip is [ [pose, holdFrames], … ]. Sampling it holds the last key rather
// than wrapping, so a one-shot clip settles instead of snapping back.
export function sample(clip, f, loop = false) {
  let total = 0;
  for (const k of clip) total += k[1];
  if (total <= 0) return clip[0][0];
  let t = loop ? ((f % total) + total) % total : Math.min(f, total - 0.001);
  for (let i = 0; i < clip.length; i++) {
    const [pose, hold] = clip[i];
    if (t < hold) {
      const next = clip[i + 1] ? clip[i + 1][0] : (loop ? clip[0][0] : pose);
      return blend(pose, next, hold ? t / hold : 0);
    }
    t -= hold;
  }
  return clip[clip.length - 1][0];
}

// ── skeleton → polygons ────────────────────────────────────────────
// Bone lengths for a 32px man. Everything else in the game is measured off
// these, so the world is built to the body rather than the body squeezed into
// the world.
const THIGH = 8, SHIN = 8, SPINE = 10, UPPER = 7.5, FORE = 7, HIP_Y = -16;

export function drawFigure(scr, x, y, face, pose, col, opt = {}) {
  const [hipN, kneeN, hipF, kneeF, shN, elN, shF, elF, lean, head, py, px, rot] = pose;
  const s = opt.scale ?? 1;

  const pel = { x: x + face * px * s, y: y + (HIP_Y + py) * s };
  const rr = rot * D * face;
  const cs = Math.cos(rr), sn = Math.sin(rr);
  const R = p => rot ? {
    x: pel.x + (p.x - pel.x) * cs - (p.y - pel.y) * sn,
    y: pel.y + (p.x - pel.x) * sn + (p.y - pel.y) * cs,
  } : p;

  // down-swinging bones: a = 0 points at the floor, + swings forward
  const down = (from, a, len) => ({
    x: from.x + Math.sin(a * D) * face * len * s,
    y: from.y + Math.cos(a * D) * len * s,
  });
  const up = (from, a, len) => ({
    x: from.x + Math.sin(a * D) * face * len * s,
    y: from.y - Math.cos(a * D) * len * s,
  });

  const leg = (hip, knee) => {
    const k = down(pel, hip + lean * 0.15, THIGH);
    const a = down(k, hip + knee, SHIN);
    return [R(k), R(a)];
  };
  const [kneeNp, ankNp] = leg(hipN, kneeN);
  const [kneeFp, ankFp] = leg(hipF, kneeF);

  const sho = R(up(pel, lean, SPINE));
  const shoRaw = up(pel, lean, SPINE);
  const arm = (sh, el) => {
    const e = down(shoRaw, sh + lean * 0.2, UPPER);
    const h = down(e, sh + el, FORE);
    return [R(e), R(h)];
  };
  const [elbNp, handNp] = arm(shN, elN);
  const [elbFp, handFp] = arm(shF, elF);

  const neck = R(up(shoRaw, lean, 2));
  const hd = R(up(shoRaw, lean + head, 5.6));
  const pelR = R(pel);

  const W = w => w * s;
  const foot = (ank, knee) => {
    // the foot points where the shin is going, flattened toward the floor
    const dx = ank.x - knee.x, dy = ank.y - knee.y;
    const L = Math.hypot(dx, dy) || 1;
    const fx = face * 0.82 + (dx / L) * 0.3, fy = Math.max(-0.35, (dy / L) * 0.25);
    const n = Math.hypot(fx, fy) || 1;
    return [
      ank.x - fx / n * W(1.6), ank.y - fy / n * W(1.6) - W(1.4),
      ank.x + fx / n * W(5.4), ank.y + fy / n * W(5.4) - W(0.6),
      ank.x + fx / n * W(5.0), ank.y + fy / n * W(5.0) + W(1.5),
      ank.x - fx / n * W(2.0), ank.y - fy / n * W(2.0) + W(1.5),
    ];
  };

  // FAR side first — a shade down, which is the only depth cue a flat figure
  // gets and the reason the run reads as a run and not as scissors.
  scr.limb(shoRaw.x, shoRaw.y, elbFp.x, elbFp.y, W(2.2), W(1.9), col.far);
  scr.limb(elbFp.x, elbFp.y, handFp.x, handFp.y, W(1.9), W(1.5), col.far);
  scr.disc(handFp.x, handFp.y, W(1.6), col.far);
  scr.limb(pelR.x, pelR.y, kneeFp.x, kneeFp.y, W(3.0), W(2.4), col.far);
  scr.limb(kneeFp.x, kneeFp.y, ankFp.x, ankFp.y, W(2.3), W(1.7), col.far);
  scr.poly(foot(ankFp, kneeFp), col.far);

  // the torso, one quad from hips to shoulders
  const perp = (a, w) => ({ x: Math.cos(a * D) * face * w * s, y: -Math.sin(a * D) * w * s });
  const ph = perp(lean, 3.2), ps = perp(lean, 3.8);
  scr.poly([
    pelR.x - ph.x, pelR.y - ph.y, pelR.x + ph.x, pelR.y + ph.y,
    sho.x + ps.x, sho.y + ps.y, sho.x - ps.x, sho.y - ps.y,
  ], col.body);
  scr.limb(pelR.x, pelR.y, sho.x, sho.y, W(3.4), W(4.0), col.body);
  scr.limb(sho.x, sho.y, neck.x, neck.y, W(1.8), W(1.6), col.skin);

  // the head: a squat hexagon with the face cut forward, hair over the back
  const hx = face, ang = (lean + head) * D * face;
  const hc = Math.cos(ang), hs = Math.sin(ang);
  const hp = (fx, fy) => [hd.x + (fx * hx * hc - fy * hs) * s, hd.y + (fx * hx * hs + fy * hc) * s];
  scr.poly([
    ...hp(-3.2, -3.6), ...hp(2.0, -3.8), ...hp(3.6, -1.0), ...hp(3.5, 1.6),
    ...hp(1.8, 3.7), ...hp(-2.4, 3.6), ...hp(-3.6, 1.0),
  ], col.skin);
  scr.poly([
    ...hp(-3.6, -3.4), ...hp(2.2, -4.0), ...hp(3.2, -2.0), ...hp(1.0, -2.4),
    ...hp(-2.0, -0.8), ...hp(-3.9, 2.2),
  ], col.hair);
  if (col.eye != null && s >= 1) scr.rect(hp(1.4, -0.6)[0] - 0.5, hp(1.4, -0.6)[1] - 0.5, 1.6, 1.4, col.eye);

  // NEAR side last, over everything
  scr.limb(pelR.x, pelR.y, kneeNp.x, kneeNp.y, W(3.1), W(2.5), col.legs);
  scr.limb(kneeNp.x, kneeNp.y, ankNp.x, ankNp.y, W(2.4), W(1.8), col.legs);
  scr.poly(foot(ankNp, kneeNp), col.legs);
  scr.limb(shoRaw.x, shoRaw.y, elbNp.x, elbNp.y, W(2.3), W(2.0), col.arms);
  scr.limb(elbNp.x, elbNp.y, handNp.x, handNp.y, W(2.0), W(1.6), col.skin);
  scr.disc(handNp.x, handNp.y, W(1.7), col.skin);

  if (opt.gun) {
    // the pistol, aimed down the forearm
    const dx = handNp.x - elbNp.x, dy = handNp.y - elbNp.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const g = (a, b) => [handNp.x + ux * a * s + nx * b * s, handNp.y + uy * a * s + ny * b * s];
    scr.poly([...g(-1, -1.6), ...g(6.5, -1.4), ...g(6.5, 0.2), ...g(-1, 0.8)], col.gun ?? col.hair);
    scr.poly([...g(0.4, 0.6), ...g(2.4, 0.6), ...g(1.8, 3.4), ...g(-0.2, 3.2)], col.gun ?? col.hair);
  }

  if (opt.sword) {
    // A blade laid along the forearm and out past the fist. It is drawn from
    // the ARM's direction rather than from the pose, so every stance in the
    // duel points it somewhere believable without the pose table having to
    // carry a sword angle as a fourteenth number.
    const dx = handNp.x - elbNp.x, dy = handNp.y - elbNp.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const b = (a, o) => [handNp.x + ux * a * s + nx * o * s, handNp.y + uy * a * s + ny * o * s];
    scr.poly([...b(-3, -2.6), ...b(1, -2.6), ...b(1, 2.6), ...b(-3, 2.6)], col.hilt ?? col.hair);  // guard
    scr.poly([...b(1, -1.5), ...b(24, -0.7), ...b(25.5, 0), ...b(24, 0.7), ...b(1, 1.5)], col.blade ?? col.skin);
    scr.poly([...b(1, -1.5), ...b(24, -0.7), ...b(25.5, 0), ...b(2, -0.2)], col.edge ?? col.blade ?? col.skin);
    scr.poly([...b(-5.5, -1.2), ...b(-3, -1.2), ...b(-3, 1.2), ...b(-5.5, 1.2)], col.hilt ?? col.hair);
  }
  return { head: hd, hand: handNp, pelvis: pelR, shoulder: sho };
}
