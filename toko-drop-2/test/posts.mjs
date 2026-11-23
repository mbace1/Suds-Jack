// posts.mjs — the floor's own shape (sim/posts.js, v108), in bare node: what stands on a later world's floor is
// laid out symmetric and off the middle, blocks the hero and the bodies, stops every bullet (cover both ways, a
// world's sweeping lines excepted), keeps spawns, gates and drops clear, goes round in the core, and comes with
// its world when the run drops into it. World 1 and a campaign room have none. v110: the ice's blocks drift and
// never pin anything to the rail; the sewer's rams punch out of their walls on a told beat, push away from their
// wall, and keep spawns, gates and drops out of their lanes. v111: the driveway's ball rolls on, gives way to
// whatever walks into it and never moves the hero, comes back off the rail, the posts and a gate's beam, and a
// shot that dies on it nudges it on.
//
//   node test/posts.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=163';
import { TUNING as T } from '../js/tuning.js?v=163';
import * as posts from '../js/sim/posts.js?v=163';
import { rooms } from '../js/sim/director/campaign.js?v=163';
import { readFileSync } from 'node:fs';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const quiet = (w) => { w.director = { step() {} }; w.gels.length = 0; w.bullets.length = 0; return w; };

// ── the layouts ──────────────────────────────────────────────────────
{
  const w1 = createWorld({ seed: 1, mode: 'arcade', world: 1 });
  check('world 1 has nothing on its floor (1.x\'s)', w1.posts.length === 0);
  let bad = [];
  for (let k = 2; k <= 9; k++) for (const shape of ['landscape', 'portrait']) {
    const w = createWorld({ seed: 1, mode: 'arcade', world: k, shape });
    // (the driveway's ball rolls, and starts where it starts: the standing posts are the balanced ones)
    const still = w.posts.filter((p) => !p.ball), n = w.posts.length, sx = still.reduce((a, p) => a + p.x, 0), mid = Math.min(...w.posts.map((p) => Math.hypot(p.x, p.z) - p.r));
    // a ram rests in its wall (outside the floor) and is checked on its own below
    const inside = w.posts.every((p) => p.ram ? (p.ram.zWalls ? Math.abs(p.z) - p.r >= w.hz : Math.abs(p.x) - p.r >= w.hx) : Math.abs(p.x) + p.r < w.hx && Math.abs(p.z) + p.r < w.hz);
    if (!n || Math.abs(sx) > 1e-9 || mid < 3 || !inside) bad.push(`${k} ${shape}: n ${n} Σx ${sx.toFixed(2)} mid ${mid.toFixed(2)} inside ${inside}`);
  }
  check('every later world has its posts, balanced left and right, off the middle, inside the floor (both orientations)', !bad.length, bad.join('; '));
}

// ── they block ───────────────────────────────────────────────────────
{
  const w = quiet(createWorld({ seed: 2, mode: 'arcade', world: 4 })), p = w.posts[0], h = w.hero;
  h.x = p.x + p.r + 3; h.z = p.z; h.invinc = 1e9;
  for (let i = 0; i < 90; i++) step(w, { ...IDLE, mx: -1, mz: 0 });
  check('the hero walking into a post stops at its face', Math.hypot(h.x - p.x, h.z - p.z) >= p.r + T.hero.radius - 1e-6, Math.hypot(h.x - p.x, h.z - p.z).toFixed(3));
  const g = api.spawn(w, 'globbo', p.x + 0.2, p.z, {});
  step(w, IDLE);
  check('a body inside a post is pushed out of it', Math.hypot(g.x - p.x, g.z - p.z) >= p.r + g.r - 1e-6, Math.hypot(g.x - p.x, g.z - p.z).toFixed(3));
}

// ── bullets: cover both ways ─────────────────────────────────────────
{
  const w = quiet(createWorld({ seed: 3, mode: 'arcade', world: 5 })), p = w.posts[0];
  const shot = (o) => ({ x: p.x - p.r - 1, z: p.z, px: p.x - p.r - 1, pz: p.z, vx: 20, vz: 0, speed: 20, r: 0.15, life: 5, color: 0xffffff, revenge: false, homing: 0, grazed: false, dead: false, ...o });
  const mine = shot({ hero: true, src: null }), theirs = shot({ hero: false, src: 'spittor' }), sweep = shot({ hero: false, src: 'sweep' });
  w.bullets.push(mine, theirs, sweep);
  w.hero.x = 0; w.hero.z = w.hz - 2; w.hero.invinc = 1e9;
  let hits = 0;
  for (let i = 0; i < 30; i++) { step(w, IDLE); hits += w.events.filter((e) => e.type === 'postHit').length; }
  check('your bullet dies on a post', mine.dead || !w.bullets.includes(mine));
  check('…and so does a gel\'s: it is cover both ways', theirs.dead || !w.bullets.includes(theirs));
  check('…and each is told where (postHit)', hits >= 2, `${hits}`);
  check('a world\'s sweeping lines pass through, as they pass a room\'s edge', !sweep.dead && sweep.x > p.x + p.r, `${sweep.x.toFixed(2)}`);
}

// ── spawns, gates and drops land clear ───────────────────────────────
{
  let inSpawn = 0, inGate = 0, n = 0;
  for (const world of [4, 5, 8]) for (let seed = 0; seed < 6; seed++) {
    const w = createWorld({ seed: 40 + seed, mode: 'arcade', world });
    w.hero.invinc = 1e9;
    for (let i = 0; i < 25 / dt; i++) {
      step(w, IDLE);
      for (const e of w.events) if (e.type === 'spawn') { n++; const g = w.gels.find((x) => x.id === e.id); if (g && posts.inside(w, e.x, e.z, 0)) inSpawn++; }
      for (const g of w.pk.gates) if (!g.type || g.type === 'gate') if (posts.inside(w, g.x, g.z, 0.4)) inGate++;
    }
  }
  check('no body lands inside a post', n > 0 && inSpawn === 0, `${inSpawn}/${n}`);
  check('no gate stands inside a post', inGate === 0, `${inGate}`);
  const w = quiet(createWorld({ seed: 7, mode: 'arcade', world: 4 })), p = w.posts[1];
  w.pk.on = true;
  const it = { x: p.x, z: p.z };
  posts.push(w, it, 0.7);
  check('a drop put down on a post is moved clear of it', Math.hypot(it.x - p.x, it.z - p.z) >= p.r + 0.7 - 1e-9);
}

// ── the core's crystals go round ─────────────────────────────────────
{
  const w = quiet(createWorld({ seed: 4, mode: 'arcade', world: 9 })), c = w.posts[0], a0 = Math.atan2(c.z, c.x), R = Math.hypot(c.x, c.z);
  w.hero.invinc = 1e9;
  for (let i = 0; i < Math.round(T.posts.worlds[9].orbit.period / 4 / dt); i++) step(w, IDLE);
  const a1 = Math.atan2(c.z, c.x);
  let turned = a1 - a0; while (turned < 0) turned += 2 * Math.PI;
  check('the core\'s crystals go round the middle, a quarter turn in a quarter of their period', Math.abs(turned - Math.PI / 2) < 0.05 && Math.abs(Math.hypot(c.x, c.z) - R) < 1e-9, `${turned.toFixed(3)}`);
  const h = w.hero; h.x = c.x; h.z = c.z;
  step(w, IDLE);
  check('…and push the hero out of their way', Math.hypot(h.x - c.x, h.z - c.z) >= c.r + T.hero.radius - 1e-6);
}

// ── v110: the ice's blocks drift, and never pin anything to the rail ──
{
  const D = T.posts.worlds[7].drift, w = quiet(createWorld({ seed: 6, mode: 'arcade', world: 7 })), [a, b] = w.posts;
  w.hero.invinc = 1e9; w.hero.x = 0; w.hero.z = 0;
  const x0 = a.x, z0 = a.z;
  step(w, IDLE);
  check('an ice block drifts at its speed', Math.abs(Math.hypot(a.x - x0, a.z - z0) - D.speed * dt) < 1e-9, `${Math.hypot(a.x - x0, a.z - z0) / dt}`);
  let nearRail = Infinity, touch = Infinity, turned = 0, last = Math.sign(a.drift.vx);
  for (let i = 0; i < 150 / dt; i++) {
    step(w, IDLE);
    for (const p of w.posts) nearRail = Math.min(nearRail, w.hx - Math.abs(p.x) - p.r, w.hz - Math.abs(p.z) - p.r);
    touch = Math.min(touch, Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r);
    if (Math.sign(a.drift.vx) !== last) { turned++; last = Math.sign(a.drift.vx); }
  }
  check('…and turns back off the sheet\'s edge, never nearer the rail than a hero can stand in', turned >= 2 && nearRail >= D.gap - 1e-6 && nearRail > 2 * T.hero.radius, `turned ${turned}, nearest ${nearRail.toFixed(2)}`);
  check('…and the two never run into each other', touch >= 0, touch.toFixed(2));
  // a hero standing at the rail in a block's way: pushed, but never out of the floor nor left inside the block
  const v = quiet(createWorld({ seed: 6, mode: 'arcade', world: 7 })), p = v.posts[0], h = v.hero;
  p.x = v.hx - p.r - D.gap - 3; p.z = 0; p.drift.vx = D.speed; p.drift.vz = 0; v.posts[1].x = -10; v.posts[1].z = -5;
  h.invinc = 1e9; h.x = h.px = v.hx - T.hero.radius; h.z = h.pz = 0;
  let worst = 0, outOf = 0;
  for (let i = 0; i < 8 / dt; i++) { step(v, IDLE); worst = Math.max(worst, p.r + T.hero.radius - Math.hypot(h.x - p.x, h.z - p.z)); outOf = Math.max(outOf, Math.abs(h.x) + T.hero.radius - v.hx); }
  check('a hero against the rail in a block\'s way is never pinned: the block turns back with room to spare', worst < 1e-6 && outOf < 1e-6, `inside the block ${worst.toFixed(3)}, past the rail ${outOf.toFixed(3)}`);
  const u = quiet(createWorld({ seed: 6, mode: 'arcade', world: 7 })), u2 = quiet(createWorld({ seed: 6, mode: 'arcade', world: 7 }));
  for (let i = 0; i < 40 / dt; i++) { step(u, IDLE); step(u2, IDLE); }
  check('…and a run replays: the same blocks in the same places', u.posts.every((q, i) => q.x === u2.posts[i].x && q.z === u2.posts[i].z));
}

// ── v110: the sewer's rams punch out of their walls on a told beat ──────
{
  const R = T.posts.worlds[3].rams;
  for (const shape of ['landscape', 'portrait']) {
    const w = quiet(createWorld({ seed: 8, mode: 'arcade', world: 3, shape })), rams = w.posts.filter((p) => p.ram);
    w.hero.invinc = 1e9; w.hero.x = 0; w.hero.z = 0;
    const log = [], deepest = new Map(rams.map((p) => [p, -Infinity]));
    for (let i = 0; i < R.period / dt; i++) {
      step(w, IDLE);
      for (const e of w.events) if (e.type === 'ramWarn' || e.type === 'ram') log.push({ type: e.type, t: w.time, side: e.side });
      for (const p of rams) deepest.set(p, Math.max(deepest.get(p), p.ram.ext));
    }
    const sides = [-1, 1].map((sd) => log.filter((e) => e.side === sd));
    const told = sides.every((L) => L.length === 2 && L[0].type === 'ramWarn' && L[1].type === 'ram' && Math.abs(L[1].t - L[0].t - R.warn) < 2 * dt);
    const turns = Math.abs(Math.abs(sides[0][1]?.t - sides[1][1]?.t) - R.period / 2) < 2 * dt;
    check(`${shape}: each ram is told (its face in the slot) ${R.warn} s before it punches, once a beat, the two by turns`, rams.length === 2 && told && turns, JSON.stringify(log.map((e) => [e.type, e.side, +e.t.toFixed(2)])));
    check(`${shape}: …out to its reach and no further, the middle clear`, [...deepest.values()].every((x) => Math.abs(x - R.reach) < 1e-9) && rams[0].ram.half - R.reach >= 3, [...deepest.values()].join(' '));
  }
  // a ram pushes what is in its lane away from its wall, into the floor
  const w = quiet(createWorld({ seed: 8, mode: 'arcade', world: 3 })), p = w.posts.find((q) => q.ram && q.ram.side === -1), h = w.hero, m = p.ram;
  h.invinc = 1e9; h.x = h.px = m.along; h.z = h.pz = -w.hz + T.hero.radius;
  for (let i = 0; i < R.period / dt && m.stage !== 'hold'; i++) step(w, IDLE);
  const face = -w.hz + R.reach;
  check('a ram punching shoves the hero out of its lane, into the floor (never into the wall)', h.z >= face + T.hero.radius - 0.05 && Math.abs(h.z) < w.hz, `hero z ${h.z.toFixed(2)}, face ${face.toFixed(2)}`);
  // a body in the middle of its lane goes out ahead of its face; one off to the side slides off its round face
  const v = quiet(createWorld({ seed: 8, mode: 'arcade', world: 3 })), q = v.posts.find((o) => o.ram && o.ram.side === -1);
  v.hero.invinc = 1e9; v.hero.x = 12; v.hero.z = 0;
  const g = api.spawn(v, 'globbo', q.ram.along, -v.hz + 1.2, {}), g2 = api.spawn(v, 'globbo', q.ram.along + 1.0, -v.hz + 1.2, {}); g.speedMult = g2.speedMult = 0;
  for (let i = 0; i < R.period / dt && q.ram.stage !== 'hold'; i++) step(v, IDLE);
  check('…and a body with it, or off to its side', g.z >= face + g.r - 0.05 && Math.hypot(g2.x - q.x, g2.z - q.z) >= q.r + g2.r - 1e-6 && g.alive && g2.alive, `${g.z.toFixed(2)} / ${g2.x.toFixed(2)},${g2.z.toFixed(2)}`);
  // a bullet dies on a ram that is out
  const b = { x: p.x - 3, z: p.z, px: p.x - 3, pz: p.z, vx: 20, vz: 0, speed: 20, r: 0.15, life: 5, color: 0xffffff, revenge: false, homing: 0, grazed: false, dead: false, hero: true, src: null };
  w.bullets.push(b); for (let i = 0; i < 12; i++) step(w, IDLE);
  check('…and a bullet stops on a ram that is out', b.dead || !w.bullets.includes(b));
  // nothing is put down in a ram's lane: spawns over a world's worth of waves, and a drop dropped there
  let inLane = 0, n = 0;
  for (let seed = 0; seed < 6; seed++) {
    const v = createWorld({ seed: 60 + seed, mode: 'arcade', world: 3 }); v.hero.invinc = 1e9;
    const lanes = v.posts.filter((q) => q.ram);
    const inside = (x, z, r) => lanes.some((q) => { const M = q.ram, across = M.zWalls ? x - M.along : z - M.along, depth = M.half - M.side * (M.zWalls ? z : x); return Math.abs(across) < q.r + r && depth < R.reach + r - 1e-6; });
    for (let i = 0; i < 25 / dt; i++) {
      step(v, IDLE);
      for (const e of v.events) if (e.type === 'spawn') { n++; if (inside(e.x, e.z, 0)) inLane++; }
      for (const gg of v.pk.gates) if (inside(gg.x, gg.z, 0.4)) inLane++;
    }
  }
  check('no body lands, and no gate stands, in a ram\'s lane', n > 0 && inLane === 0, `${inLane}/${n}`);
  const it = { x: m.along, z: -w.hz + 1 };
  posts.clear(w, it, 0.7);
  check('a drop put down in a ram\'s lane is moved out of its end, into the floor', it.z >= -w.hz + R.reach + 0.7 - 1e-9, `${it.z.toFixed(2)}`);
}

// ── v111: the driveway's ball ────────────────────────────────────────
{
  const B = T.posts.worlds[2].ball, mk = (seed = 9) => { const w = quiet(createWorld({ seed, mode: 'arcade', world: 2 })); w.hero.invinc = 1e9; w.hero.x = w.hero.px = 0; w.hero.z = w.hero.pz = 0; return w; };
  const ballOf = (w) => w.posts.find((p) => p.ball);
  {
    const w = mk(), b = ballOf(w);
    w.hero.x = w.hero.px = 25; w.hero.z = w.hero.pz = 14;   // out of its way
    let out = 0, inPost = 0, bounces = 0, sp = [];
    for (let i = 0; i < 120 / dt; i++) {
      step(w, IDLE);
      bounces += w.events.filter((e) => e.type === 'ballBounce').length;
      if (Math.abs(b.x) + b.r > w.hx + 1e-6 || Math.abs(b.z) + b.r > w.hz + 1e-6) out++;
      for (const q of w.posts) if (q !== b && Math.hypot(b.x - q.x, b.z - q.z) < b.r + q.r - 1e-6) inPost++;
      if (i > 10 / dt) sp.push(Math.hypot(b.ball.vx, b.ball.vz));
    }
    const mean = sp.reduce((a, v) => a + v, 0) / sp.length;
    check('the ball rolls on at about its cruise speed, round the driveway, coming back off its rail and its bollards', out === 0 && inPost === 0 && bounces >= 4 && Math.abs(mean - B.speed) < 0.35, `out ${out}, in a post ${inPost}, ${bounces} heard bounces, mean speed ${mean.toFixed(2)}`);
  }
  {
    // standing in its road: it never moves you — it comes back off you
    const w = mk(), b = ballOf(w), h = w.hero;
    b.x = b.px = -6; b.z = b.pz = 0; b.ball.vx = B.speed; b.ball.vz = 0;
    let moved = 0, came = false;
    for (let i = 0; i < 6 / dt; i++) { step(w, IDLE); moved = Math.max(moved, Math.hypot(h.x, h.z)); if (b.ball.vx < 0) came = true; }
    check('standing in the ball\'s road, you are never moved: it comes back off you', moved < 1e-9 && came && Math.hypot(b.x - h.x, b.z - h.z) >= b.r + T.hero.radius - 0.05, `moved ${moved}, came back ${came}`);
    // walking into it shoves it, as hard as you came on
    const v = mk(), c = ballOf(v), vh = v.hero;
    c.x = c.px = 3.5; c.z = c.pz = 0; c.ball.vx = 0.001; c.ball.vz = 0;
    for (let i = 0; i < 40; i++) step(v, { ...IDLE, mx: 1, mz: 0 });
    check('walking into it shoves it on, away from you', c.ball.vx > B.nudge && c.x > 3.5 && vh.x > 0, `${c.ball.vx.toFixed(2)} at ${c.x.toFixed(2)}`);
    // a dash into it sends it flying, no faster than its most
    const u = mk(), d = ballOf(u);
    d.x = d.px = 3.2; d.z = d.pz = 0; d.ball.vx = 0.001; d.ball.vz = 0;
    let top = 0;
    for (let i = 0; i < 30; i++) { step(u, { ...IDLE, mx: 1, mz: 0, dash: i === 0 }); top = Math.max(top, Math.hypot(d.ball.vx, d.ball.vz)); }
    check('a dash into it sends it flying, never past its most', top > 4 && top <= B.max + 1e-9, top.toFixed(2));
  }
  {
    // a body walking into it shoves it too, and goes on its way
    const w = mk(), b = ballOf(w);
    b.x = b.px = 0; b.z = b.pz = -6; b.ball.vx = 0.001; b.ball.vz = 0;
    w.hero.x = w.hero.px = 0; w.hero.z = w.hero.pz = 8;
    const g = api.spawn(w, 'globbo', 0, -10, {});
    for (let i = 0; i < 4 / dt && b.ball.vz < B.nudge; i++) step(w, IDLE);
    check('a body walking into it shoves it on', b.ball.vz >= B.nudge * 0.9 && g.alive, `${b.ball.vz.toFixed(2)}`);
  }
  {
    // a shot dies on it — cover both ways — and nudges it its way
    const w = mk(), b = ballOf(w);
    b.x = b.px = 0; b.z = b.pz = -8; b.ball.vx = 0.001; b.ball.vz = 0;
    const s0 = { x: -5, z: -8, px: -5, pz: -8, vx: 20, vz: 0, speed: 20, r: 0.15, life: 5, color: 0xffffff, revenge: false, homing: 0, grazed: false, dead: false, hero: true, src: null };
    w.bullets.push(s0);
    let vx = null;
    for (let i = 0; i < 30 && vx === null; i++) { step(w, IDLE); if (s0.dead || !w.bullets.includes(s0)) vx = b.ball.vx; }
    check('a shot dies on the ball and nudges it on its way', vx !== null && vx > B.shot * 0.5, `${vx}`);
  }
  {
    // a gate's beam turns it back
    const w = mk(), b = ballOf(w);
    b.x = b.px = -8; b.z = b.pz = 0; b.ball.vx = B.speed; b.ball.vz = 0;
    w.pk.gates.push({ id: 990, x: -2, z: 0, px: -2, pz: 0, angle: 0, ax: 0, az: 1, risk: false, green: true, alive: true, cd: 0, retireT: null, drift: false, dx: 0, dz: 0, type: 'gate' });
    let back = false;
    for (let i = 0; i < 6 / dt && !back; i++) { step(w, IDLE); if (b.ball.vx < 0) back = true; }
    check('a gate\'s beam turns the ball back', back && b.x < -2 - B.r + 0.1, `${b.x.toFixed(2)}`);
  }
  {
    // put down on it, a drop moves; the ball does not
    const w = mk(), b = ballOf(w), x0 = b.x, z0 = b.z, it = { x: b.x, z: b.z };
    posts.clear(w, it, 0.7);
    check('a drop put down on the ball is moved off it, and the ball stays', Math.hypot(it.x - b.x, it.z - b.z) >= b.r + 0.7 - 1e-9 && b.x === x0 && b.z === z0);
    const a = mk(4), c = mk(4);
    for (let i = 0; i < 30 / dt; i++) { step(a, { ...IDLE, mx: Math.sin(i * 0.01), mz: Math.cos(i * 0.013), fire: true, aim: true }); step(c, { ...IDLE, mx: Math.sin(i * 0.01), mz: Math.cos(i * 0.013), fire: true, aim: true }); }
    check('…and a run replays, the ball where it was', ballOf(a).x === ballOf(c).x && ballOf(a).z === ballOf(c).z);
  }
}

// ── a campaign room has none; a new world brings its own ─────────────
{
  const r = rooms()[0], c = createWorld({ seed: 1, mode: 'campaign', room: { ...r, level: JSON.parse(readFileSync(new URL(`../levels/${r.id}.json`, import.meta.url), 'utf8')), turn: false } });
  check('a campaign room has nothing on its floor', c.posts.length === 0);
  const w = createWorld({ seed: 5, mode: 'arcade', world: 1 });
  w.trans = null;
  w.world = 2; const A = { hx: 27.5, hz: 16 }; w.hx = A.hx; w.hz = A.hz; posts.layout(w);
  const I2 = T.posts.worlds[2].islands;
  check('the next world lays its own posts out on its own floor', w.posts.filter((p) => !p.ball).length === I2.reduce((a, I) => a + I.at.length, 0) && w.posts.every((p) => p.ball || p.kind === 'island')
    && w.props.length === I2.reduce((a, I) => a + I.props.length, 0) && w.props.some((q) => q.kind === 'bollard') && w.posts.filter((p) => p.ball).length === 1);
}

// ── v137: footprints, islands and pits ("Mix of A and B, so always rounded. But we need the pits somewhere as well") ──
{
  // every world but the first stands its things on a foot, on an island, or has pits — and the pits are somewhere
  const kinds = {};
  for (let k = 2; k <= 9; k++) { const L = T.posts.worlds[k]; kinds[k] = [L.foot && 'foot', L.islands?.length && 'island', L.pits && 'pit'].filter(Boolean); }
  check('every later world stands its things on a foot or an island, and some have pits', Object.values(kinds).every((x) => x.includes('foot') || x.includes('island')) && Object.values(kinds).filter((x) => x.includes('pit')).length >= 2, JSON.stringify(kinds));
  // an island: its circles overlap into one rounded slab, its props stand on it
  let loose = [];
  for (let k = 2; k <= 9; k++) for (const shape of ['landscape', 'portrait']) {
    const w = createWorld({ seed: 1, mode: 'arcade', world: k, shape }), byG = new Map();
    for (const p of w.posts) if (p.kind === 'island') { if (!byG.has(p.g)) byG.set(p.g, []); byG.get(p.g).push(p); }
    for (const [g, cs] of byG) {
      // every circle overlaps one laid before it (one piece, no gap a body could stand in; v145: not only the one just
      // before — the boiler's square decks have a small circle in each corner, laid after the three that make the deck)
      for (let i = 1; i < cs.length; i++) if (!cs.slice(0, i).some((o) => Math.hypot(cs[i].x - o.x, cs[i].z - o.z) <= (cs[i].r + o.r) * 0.8)) loose.push(`${k} ${shape} island ${g} circle ${i}`);
      for (const q of w.props.filter((q) => q.g === g)) if (!cs.some((c) => Math.hypot(q.x - c.x, q.z - c.z) + q.s * 0.6 < c.r)) loose.push(`${k} ${shape} island ${g}: a ${q.kind} off its slab`);
    }
  }
  check('an island is one rounded piece, its props standing on it', !loose.length, loose.join('; '));
  // walked at the seam between two of an island's circles, the hero stops outside both
  const w = quiet(createWorld({ seed: 2, mode: 'arcade', world: 6, shape: 'portrait' })), h = w.hero, cs = w.posts.filter((p) => p.kind === 'island' && p.g === 0);
  const a = cs[1], b = cs[2], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, nx = -(b.z - a.z), nz = b.x - a.x, nl = Math.hypot(nx, nz);
  h.invinc = 1e9; h.x = h.px = mx + (nx / nl) * 6; h.z = h.pz = mz + (nz / nl) * 6;
  const dx = -nx / nl, dz = -nz / nl;
  for (let i = 0; i < 120; i++) step(w, { ...IDLE, mx: dx, mz: dz });
  const into = Math.max(...cs.map((c) => c.r + T.hero.radius - Math.hypot(h.x - c.x, h.z - c.z)));
  check('the hero walked into the seam between two of an island\'s circles stops outside the island', into < 0.05, into.toFixed(3));
}
{
  // a pit: nothing walks over it, a shot flies over it
  const w = quiet(createWorld({ seed: 3, mode: 'arcade', world: 4, shape: 'portrait' })), p = w.posts.find((q) => q.pit), h = w.hero;
  check('the cistern has its wells', w.posts.filter((q) => q.pit).length === T.posts.worlds[4].pits.at.length && p.depth > 0);
  h.invinc = 1e9; h.x = h.px = p.x - p.r - 3; h.z = h.pz = p.z;
  for (let i = 0; i < 120; i++) step(w, { ...IDLE, mx: 1, mz: 0, dash: i === 10 });
  check('the hero cannot walk (nor dash) over a pit: it stops at its rim', Math.hypot(h.x - p.x, h.z - p.z) >= p.r + T.hero.radius - 0.05, Math.hypot(h.x - p.x, h.z - p.z).toFixed(3));
  const g = api.spawn(w, 'globbo', p.x + 0.3, p.z, {});
  step(w, IDLE);
  check('a body put down in a pit is out of it on the next step', Math.hypot(g.x - p.x, g.z - p.z) >= p.r + g.r - 1e-6);
  const s0 = { x: p.x - p.r - 1, z: p.z, px: p.x - p.r - 1, pz: p.z, vx: 20, vz: 0, speed: 20, r: 0.15, life: 5, color: 0xffffff, revenge: false, homing: 0, grazed: false, dead: false, hero: false, src: 'spittor' };
  w.bullets.push(s0); w.hero.x = w.hero.px = 0; w.hero.z = w.hero.pz = 0;
  let hits = 0;
  for (let i = 0; i < 18; i++) { step(w, IDLE); hits += w.events.filter((e) => e.type === 'postHit').length; }
  check('a shot flies over a pit, and nothing is told it hit one', !s0.dead && s0.x > p.x + p.r && hits === 0, `x ${s0.x.toFixed(2)}, hits ${hits}`);
  const it = { x: p.x, z: p.z };
  posts.clear(w, it, 0.7);
  check('a drop put down in a pit is moved out of it', Math.hypot(it.x - p.x, it.z - p.z) >= p.r + 0.7 - 1e-9);
  // what is low lets a shot over (T.posts.over): an island's slab between its props, a post's foot round it; what
  // stands on them stops it
  {
    const shoot = (v, x, z, vx, vz) => { const b = { x, z, px: x, pz: z, vx, vz, speed: Math.hypot(vx, vz), r: 0.15, life: 5, color: 0xffffff, revenge: false, homing: 0, grazed: false, dead: false, hero: false, src: 'spittor' }; v.bullets.push(b); return b; };
    const v = quiet(createWorld({ seed: 9, mode: 'arcade', world: 6, shape: 'portrait' })), cs = v.posts.filter((o) => o.kind === 'island' && o.g === 0), props = v.props.filter((q) => q.g === 0);
    v.hero.invinc = 1e9; v.hero.x = v.hero.px = 0; v.hero.z = v.hero.pz = -20;
    // across the island where no prop stands: over it
    const c = cs[0], clear = (zz) => props.every((q) => Math.abs(q.z - zz) > q.s * T.posts.propR + 0.4);
    const zz = [c.z, cs[cs.length - 1].z, (c.z + cs[1].z) / 2].find(clear) ?? c.z;
    const over = shoot(v, c.x - 6, zz, 20, 0);
    // straight at a prop on it: stopped
    const q = props[0], onProp = shoot(v, q.x - 6, q.z, 20, 0);
    for (let i = 0; i < 30; i++) step(v, IDLE);
    check('a shot flies over an island\'s slab where nothing stands on it', T.posts.over && !over.dead && over.x > c.x + c.r, `${over.x.toFixed(2)} dead ${over.dead}`);
    check('…and stops on what stands on it', onProp.dead || !v.bullets.includes(onProp));
    const u = quiet(createWorld({ seed: 9, mode: 'arcade', world: 4, shape: 'portrait' })), f = u.posts.find((o) => o.foot);
    u.hero.invinc = 1e9; u.hero.x = u.hero.px = 0; u.hero.z = u.hero.pz = 0;
    const past = shoot(u, f.x - 6, f.z + (f.r + f.prop) / 2, 20, 0), at = shoot(u, f.x - 6, f.z, 20, 0);
    for (let i = 0; i < 30; i++) step(u, IDLE);
    check('a shot flies over a post\'s foot, and stops on the post standing on it', !past.dead && past.x > f.x + f.r && (at.dead || !u.bullets.includes(at)), `${past.x.toFixed(2)}`);
  }
  // the ice's blocks glance off its holes' rims
  const v = quiet(createWorld({ seed: 6, mode: 'arcade', world: 7, shape: 'portrait' })), q = v.posts.find((o) => o.pit), blk = v.posts.find((o) => o.drift), D = T.posts.worlds[7].drift;
  blk.x = q.x - q.r - blk.r - D.gap - 2; blk.z = q.z; blk.drift.vx = D.speed; blk.drift.vz = 0;
  v.hero.invinc = 1e9; v.hero.x = v.hero.px = 0; v.hero.z = v.hero.pz = 0;
  let near = Infinity;
  for (let i = 0; i < 6 / dt; i++) { step(v, IDLE); near = Math.min(near, Math.hypot(blk.x - q.x, blk.z - q.z) - blk.r - q.r); }
  check('an ice block glances off a hole\'s rim, room for a hero between', near >= D.gap - 1e-6 && blk.drift.vx < 0, `nearest ${near.toFixed(2)}`);
}

console.log(failed ? `\n✗ posts: ${failed} failed, ${passed} passed` : `✔ posts: ${passed} checks`);
process.exit(failed ? 1 : 0);
