// draper.js — DRAPER, 1.x's wall-weaver (v171; user: "walls of bullets,
// curtains even"): a violet loom slab with two glowing end-spools that keeps
// about eleven units off you, its broad face always square to you, and every
// six seconds or so winds up for 0.9 s — the spools tumbling — then looms a
// marching CURTAIN of thirteen bullets across your line with one two-slot gap.
// Dash the gap or dash the wall: both are answers. 5 hp, harmless to touch.
//
// 1.x js/enemy.js at v268: the type 548-552, the CFG row 619, the loom 771-772
// and its spools 1097-1105, the movement-and-fire branch 2200-2232 (from the
// pre-move position and line of 1678-1682), the squash 2726-2737, 2779. The
// generic _tick has no DRAPER case (2873-2958) and main.js gives it nothing of
// its own in classic (it is a shooter: placed, never flooded, no variant —
// arcade-mode.md §2.5.2). Specs: docs/port-1x/bullets-graze.md §3.2, §5.5.
// Every number is tuning/species/draper.js.
//
// Per step, from where the swarm forces left it (its HOLDER share: current
// 0.25 only — the core's), with (ex, ez) where it stands and d its distance to
// you at the top of the step (1.x enemy.js:1678-1682):
//   THE HOLD     d > 12.5 walks straight at you at its speed; d < 9.5 backs
//                straight off at the same speed; between, it stands. Speed is
//                api.speed (CFG 0.9 × the wave's speedMult × SWIFT × a SIREN's
//                surge). The core integrates the velocity with any knock (a
//                PUSH dash's shove) on top and holds it inside the walls, so a
//                shove is carried, never thrown away. It faces you (faceX/Z).
//   THE WEAVE    not winding up: the weave clock runs down, and once it is out
//                with you nearer than 17 the wind-up starts (0.9 s). A clock
//                that ran out with you farther waits, still running.
//   THE WIND-UP  the clock does not run; the spools tumble at 18 rad/s (s.spool,
//                for the look); the step the wind-up runs out — the same step,
//                after its own decrement, as 1.x — the curtain looms from (ex,
//                ez) along the line to you NOW, and the weave clock is reloaded
//                to fireInterval × intervalMult.
//   THE CURTAIN  1.x's own loop: 15 slots 0.85 apart across the line square to
//                the aim (ex − fz·o, ez + fx·o, o = (k − 7)·0.85), slots gap and
//                gap + 1 empty (gap from w.rng, 2..12), 13 bullets marching
//                along the aim at speedMult 0.72 in 0xcc88ff, each one
//                api.fire.emit. One `gelShot` for the volley.
//   THE ENDS     a slot whose first step lands past the core's keep box (the
//                walls + 1.5) but inside 1.x's (±max(hx, hz) + 2) is not lost
//                to the core's cull as it would be: the behaviour carries it,
//                moving and ageing it as 1.x's bullets.update did, and emits it
//                the step it crosses into the core's box — where 1.x's bullet
//                was, as old as 1.x's was (tuning `cull`). It cannot hit or be
//                grazed while it is out there.
//   THE SPRING   1.x's non-blob squash spring (0.18 / 0.90 per frame, after the
//                movement). The core runs the blob spring on a `custom` body
//                before this step, so the step takes it back — exactly: the
//                core's spring is linear in the kicks it was handed — and runs
//                1.x's in its place, as SHEPHERD's, OMEGA's and TORO's ports do.
// What 1.x did that is not here, and why:
//   the wind-up STROBE (emissive 0x5522aa / 0x110022, enemy.js:2212) never
//   reached 1.x's screen — the emissive chain wrote black over it the same
//   frame (enemy.js:2688-2689) — so the sim raises no `tell` (which the view
//   would draw as a glow); the look keeps it behind a switch, off.
//   A curtain end still off the floor when its DRAPER dies dies with it: 1.x's
//   bullet flew on, but 2.0 has nothing left to carry it (the dead body is
//   gone from w.gels, and the core would cull it). The core's cull is the gap.
// Hits are ordinary (the 0.8 circle), touching it does not hurt, its corpse
// bites FAN in HARDCADE (the core's, from the tuning row), and its death is
// the core's (smooth goo, the cube's death voice). It is never a boss.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    s.weave = w.rng.range(S.weaveFirst[0], S.weaveFirst[1]);   // 1.x _weaveT, drawn on its first update (enemy.js:2208)
    s.windup = 0;                          // 1.x _windup (enemy.js:2209): > 0 while it winds up
    s.spool = 0;                           // the spools' rotation.x (enemy.js:2213); they start upright (1097-1105)
    s.curtains = 0;                        // curtains loomed so far
    s.gap = -1;                            // the last curtain's first empty slot
    s.carried = [];                        // curtain ends still off the floor, on their way in (see `carry`)
    s.sq = g.sq; s.sqV = g.sqV; s.sqTick = -1;   // the squash spring as this step last left it
    // its face is turned to you from the start: 1.x's update turned it every
    // frame from the frame it was made (enemy.js:2207)
    const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || S.distFloor;
    g.faceX = dx / d; g.faceZ = dz / d;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, H = S.hold;
    const sqV = takeBackCoreSpring(w, g, S, api);

    // where it stands at the top of its update, and the line to you (enemy.js:1678-1682)
    const ex = g.x, ez = g.z, ddx = h.x - ex, ddz = h.z - ez;
    const dist = Math.hypot(ddx, ddz) || S.distFloor;

    // the hold (enemy.js:2204-2207)
    const spd = api.speed(g);
    if (dist > H.distance + H.band) { g.vx = (ddx / dist) * spd; g.vz = (ddz / dist) * spd; }
    else if (dist < H.distance - H.band) { g.vx = -((ddx / dist) * spd); g.vz = -((ddz / dist) * spd); }
    g.faceX = ddx / dist; g.faceZ = ddz / dist;

    // the curtain ends it still carries off the floor move on, and come onto it
    carry(w, g, S, dt, api);

    // the wind-up, or the weave clock (enemy.js:2210-2229)
    if (s.windup > 0) {
      s.windup -= dt;
      s.spool += dt * S.spoolSpin;
      if (s.windup <= 0) {
        loom(w, g, ex, ez, ddx / dist, ddz / dist, S, dt, api);
        s.weave = S.fireInterval * g.intervalMult;
      }
    } else {
      s.weave -= dt;
      if (s.weave <= 0 && dist < S.range) s.windup = S.windup;
    }

    // 1.x's squash spring, after the movement (enemy.js:2728-2731)
    const Q = S.squash;
    const v = (sqV - (s.sq - 1) * Q.spring) * Q.damp;
    g.sqV = s.sqV = v;
    g.sq = s.sq = clamp(s.sq + v, Q.min, Q.max);
    s.sqTick = w.tick;
  },
};

// The curtain (enemy.js:2216-2224), 1.x's loop: from (x, z), across the
// lateral (−fz, fx), marching along (fx, fz). With you standing exactly on its
// centre 1.x's line is (0, 0) (the distance floor makes fx = fz = 0): every
// bullet spawns on the centre with no velocity at all, and sits there for its
// 4 s — kept, as 1.x. A slot whose first step lands outside the core's keep box
// but inside 1.x's is carried (below) instead of being handed to the cull.
function loom(w, g, x, z, fx, fz, S, dt, api) {
  const C = S.curtain, gap = w.rng.int(C.gap[0], C.gap[1]);
  const opts = curtainOpts(g, S);
  const a = Math.atan2(fz, fx), still = fx === 0 && fz === 0;
  const sp = api.T.bullets.gelSpeed * C.speedMult, vx = Math.cos(a) * sp, vz = Math.sin(a) * sp;   // as api.fire.emit sets them
  for (let k = 0; k < C.slots; k++) {
    if (k >= gap && k < gap + C.gapWidth) continue;            // the way through
    const o = (k - C.centre) * C.spacing;
    const bx = x - fz * o, bz = z + fx * o;
    if (!still) {
      const x1 = bx + vx * dt, z1 = bz + vz * dt;
      if (offFloor(w, S, x1, z1)) { g.s.carried.push({ x: x1, z: z1, a, vx, vz, life: api.T.bullets.life - dt }); continue; }
    }
    const b = api.fire.emit(w, bx, bz, a, opts);
    if (b && still) { b.vx = 0; b.vz = 0; }
  }
  g.s.curtains++; g.s.gap = gap;
  w.events.push({ type: 'gelShot', x, z, kind: g.kind, id: g.id, curtain: true });
}

const curtainOpts = (g, S) => ({ color: S.bulletColor, src: g.kind, speedMult: S.curtain.speedMult });

// Past the core's keep box (it would cull a bullet there, 2.0 world.js
// bulletsStep) but inside 1.x's square one (bullet.js:134, main.js:10428).
function offFloor(w, S, x, z) {
  const K = S.cull, cx = w.hx + K.core, cz = w.hz + K.core, sq = Math.max(w.hx, w.hz) + K.square;
  return (Math.abs(x) > cx || Math.abs(z) > cz) && Math.abs(x) <= sq && Math.abs(z) <= sq;
}

// The ends it carries, one step on (1.x bullet.js:130-135: move, age, cull):
// out of 1.x's box or out of time, gone; crossing into the core's box, handed
// to the core where it stands now and as old as it is, so the core's own step
// moves and ages it to exactly where and what 1.x's was; else carried on.
function carry(w, g, S, dt, api) {
  const list = g.s.carried;
  if (!list.length) return;
  const K = S.cull, sq = Math.max(w.hx, w.hz) + K.square;
  let n = 0;
  for (const c of list) {
    const x1 = c.x + c.vx * dt, z1 = c.z + c.vz * dt;
    if (c.life - dt <= 0 || Math.abs(x1) > sq || Math.abs(z1) > sq) continue;
    if (!offFloor(w, S, x1, z1)) { api.fire.emit(w, c.x, c.z, c.a, { ...curtainOpts(g, S), life: c.life }); continue; }
    c.x = x1; c.z = z1; c.life -= dt;
    list[n++] = c;
  }
  list.length = n;
}

// The velocity the squash spring was handed this step, before the core's own
// spring ran on it: the core did sqV' = (sqV − (sq − 1)·k)·c on what this
// step wrote last time plus any kicks since (a hit's −0.75, a shockwave, a
// shove), so sqV = sqV'/c + (sq − 1)·k, exactly. On a body's first step there
// is nothing to take back: both springs hold a body at rest still.
function takeBackCoreSpring(w, g, S, api) {
  const s = g.s;
  if (s.sqTick !== w.tick - 1) { s.sq = g.sq; return g.sqV; }
  const [k, c] = api.T.gel.sq[S.family === 'cube' ? 'cube' : 'blob'];   // the core's choice (world.js gelStep)
  return g.sqV / c + (s.sq - 1) * k;
}
