// posts.js — the floor's own shape (v108; owner: "arcade arena shapes are boring. We need some dynamic
// elements"). A later world's floor is not an empty rectangle: things stand in it — the driveway's bollards, the
// cistern's pillars, the boiler's drums, the river's boulders, the core's crystals going round — and they BLOCK.
// The hero and every body are pushed out of them as the rail pushes, a bullet (yours or a gel's) dies on one, so
// each is cover both ways; a spawn, a gate or a drop that would land in one is moved clear of it.
//
// They are circles, laid out from TUNING.posts by world as fractions of its floor (so one layout fits the floor in
// either orientation), symmetric about the middle so neither side is the safe one, and never on the middle, where
// the hero lands from the world before. A post with an `orbit` goes round the middle on the run's clock.
// v110 (the owner's "dynamic elements"): some of them MOVE. The ice's blocks DRIFT on the sheet, glancing off its
// edge and each other — never closer to the rail than a hero can stand in, so nothing is ever pinned against it;
// the sewer's RAMS punch out of its long walls on a beat: hidden in the wall, their face showing in the slot for a
// warning, out across their lane, held, and back — so a ram only ever pushes away from its wall, into the floor.
// A spawn, a gate or a drop keeps clear of a ram's whole lane, not just of where it is now (`clear`).
// Pure: no DOM, no clock but the run's, no Math.random.
//
//   w.posts  [{ x, z, r, kind, px, pz, orbit? { a0, R, w }, drift? { vx, vz }, ram? { ... } }]
//            none in world 1 (1.x's floor) or a campaign room
import { TUNING } from '../tuning.js?v=110';

const T = TUNING;
const smooth = (k) => k * k * (3 - 2 * k), _q = { x: 0, z: 0 };

// a world's posts, laid out on its floor (`w.hx`, `w.hz` already its own)
export function layout(w) {
  const L = T.worlds.modes.includes(w.mode) ? T.posts.worlds[w.world] : null;
  w.posts = [];
  if (!L) return;
  const m = Math.min(w.hx, w.hz);
  for (const p of L.at) {
    const r = L.r * (p[2] ?? 1);
    if (L.orbit) {
      const a0 = Math.atan2(p[1], p[0]), R = Math.hypot(p[0] * w.hx, p[1] * w.hz) || L.orbit.r * m;
      w.posts.push({ kind: L.kind, r, x: Math.cos(a0) * R, z: Math.sin(a0) * R, px: 0, pz: 0, orbit: { a0, R, w: (2 * Math.PI) / L.orbit.period } });
    } else w.posts.push({ kind: L.kind, r, x: p[0] * w.hx, z: p[1] * w.hz, px: 0, pz: 0 });
  }
  if (L.drift) w.posts.forEach((p, i) => { const d = L.drift.dirs[i % L.drift.dirs.length], n = Math.hypot(d[0], d[1]) || 1; p.drift = { vx: (d[0] / n) * L.drift.speed, vz: (d[1] / n) * L.drift.speed }; });
  // the rams, in the long walls (the pair nearer the middle): `along` a fraction of the long half, `side` which wall
  if (L.rams) {
    const R = L.rams, zWalls = w.hz <= w.hx, half = zWalls ? w.hz : w.hx, long = zWalls ? w.hx : w.hz;
    for (const [along, side, phase] of R.at) {
      const q = { kind: R.kind, r: R.r, x: 0, z: 0, px: 0, pz: 0, ram: { zWalls, side, along: along * long, half, phase, ext: R.hide, stage: 'rest', beat: -1 } };
      place(q, R.hide); w.posts.push(q);
    }
  }
  for (const p of w.posts) { p.px = p.x; p.pz = p.z; }
}

// a ram with its face `ext` m into the floor past its wall (negative: still in the wall)
function place(q, ext) {
  const m = q.ram, c = m.side * (m.half - ext + q.r);
  m.ext = ext;
  if (m.zWalls) { q.x = m.along; q.z = c; } else { q.x = c; q.z = m.along; }
}

// where a ram's beat has it: [face past the wall, stage]
function beat(R, tau) {
  const { warn, punch, hold, back } = R, peek = R.peek, reach = R.reach;
  if (tau < warn) return [R.hide + (peek - R.hide) * smooth(tau / warn), 'warn'];
  tau -= warn;
  if (tau < punch) { const k = tau / punch; return [peek + (reach - peek) * (1 - (1 - k) * (1 - k)), 'punch']; }
  tau -= punch;
  if (tau < hold) return [reach, 'hold'];
  tau -= hold;
  if (tau < back) return [reach + (R.hide - reach) * smooth(tau / back), 'back'];
  return [R.hide, 'rest'];
}

// the moving ones move (on the run's clock, so a run replays)
export function step(w) {
  if (!w.posts?.length) return;
  const L = T.posts.worlds[w.world], dt = T.sim.dt;
  for (const p of w.posts) {
    p.px = p.x; p.pz = p.z;
    if (p.orbit) { const a = p.orbit.a0 + w.time * p.orbit.w; p.x = Math.cos(a) * p.orbit.R; p.z = Math.sin(a) * p.orbit.R; }
    else if (p.drift) {
      // across the sheet, turning back off a line `gap` in from the rail (room for a hero between)
      const D = p.drift, g = L?.drift?.gap ?? 1.6, mx = w.hx - p.r - g, mz = w.hz - p.r - g;
      p.x += D.vx * dt; p.z += D.vz * dt;
      if (Math.abs(p.x) > mx) { p.x = Math.sign(p.x) * mx; D.vx = -Math.sign(p.x) * Math.abs(D.vx); }
      if (Math.abs(p.z) > mz) { p.z = Math.sign(p.z) * mz; D.vz = -Math.sign(p.z) * Math.abs(D.vz); }
      // while the floor is a shape (a shift: the ice's floe), the same off the shape's edge
      if (w.region && !w.region.contains(p.x, p.z, p.r + g)) {
        const x0 = p.x, z0 = p.z, q = w.region.clamp(p.x, p.z, p.r + g, _q), nx = q.x - x0, nz = q.z - z0, n = Math.hypot(nx, nz);
        p.x = q.x; p.z = q.z;
        if (n > 1e-9) { const vn = (D.vx * nx + D.vz * nz) / n; if (vn < 0) { D.vx -= 2 * vn * (nx / n); D.vz -= 2 * vn * (nz / n); } }
      }
    } else if (p.ram) {
      const R = L.rams, m = p.ram, t = w.time / R.period + m.phase, n = Math.floor(t), [ext, stage] = beat(R, (t - n) * R.period);
      if (stage !== m.stage) {
        if (stage === 'warn') w.events.push({ type: 'ramWarn', x: p.x, z: p.z, side: m.side, zWalls: m.zWalls, t: R.warn });
        if (stage === 'punch') w.events.push({ type: 'ram', x: p.x, z: p.z, side: m.side, zWalls: m.zWalls });
        m.stage = stage;
      }
      place(p, ext);
    }
  }
  // drifting blocks glance off each other (equal weights: they trade what they had along the line between them)
  for (let i = 0; i < w.posts.length; i++) {
    const a = w.posts[i];
    if (!a.drift) continue;
    for (let j = i + 1; j < w.posts.length; j++) {
      const b = w.posts[j];
      if (!b.drift) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.r + b.r + 0.4;
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d, va = a.drift.vx * nx + a.drift.vz * nz, vb = b.drift.vx * nx + b.drift.vz * nz, k = (min - d) / 2;
      a.x -= nx * k; a.z -= nz * k; b.x += nx * k; b.z += nz * k;
      if (va - vb > 0) { a.drift.vx += (vb - va) * nx; a.drift.vz += (vb - va) * nz; b.drift.vx += (va - vb) * nx; b.drift.vz += (va - vb) * nz; }
    }
  }
}

// keep a circle of radius r at o out of every post; the push back, or null. `press` gets the shove (v82's squash)
export function push(w, o, r, press = null) {
  if (!w.posts?.length) return null;
  let moved = null;
  for (const p of w.posts) {
    const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz), min = p.r + r;
    if (d >= min) continue;
    const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0, k = min - d;
    o.x += nx * k; o.z += nz * k;
    press?.(o, -nx * k, -nz * k);
    moved = { nx, nz };
  }
  return moved;
}

// keep a circle of radius r at o clear of every post, and of every ram's whole lane (where it will punch, not
// only where it is now): a spawn, a gate, a drop. The push back, or null
export function clear(w, o, r) {
  let moved = push(w, o, r);
  for (const p of w.posts ?? []) {
    if (!p.ram) continue;
    const m = p.ram, R = T.posts.worlds[w.world]?.rams;
    if (!R) continue;
    // the lane: from the wall to the ram's face at full reach, the ram's width across
    const across = m.zWalls ? o.x - m.along : o.z - m.along, into = m.side * (m.zWalls ? o.z : o.x), depth = m.half - into;
    if (Math.abs(across) >= p.r + r || depth >= R.reach + r) continue;
    const out = R.reach + r - depth;   // push it out of the lane's end, into the floor (never into the wall)
    if (m.zWalls) o.z -= m.side * out; else o.x -= m.side * out;
    moved = m.zWalls ? { nx: 0, nz: -m.side } : { nx: -m.side, nz: 0 };
  }
  return moved;
}

// is (x, z) inside a post, with a margin
export function inside(w, x, z, r = 0) {
  if (!w.posts?.length) return false;
  for (const p of w.posts) if (Math.hypot(x - p.x, z - p.z) < p.r + r) return true;
  return false;
}
