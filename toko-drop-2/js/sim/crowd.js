// crowd.js — how the swarm moves as a swarm: 1.x's swarm forces (v196-v210,
// main.js:10231-10360) and its crowd solver (crowd.js, v245).
//
// The forces run before each body's own step and move it directly, by its
// species' share (TUNING.movement.roles): a SHEPHERD drags the bodies around
// it toward you, bodies sidestep the lane of a bullet coming at them, schools
// flock, solo hunters weave, and the whole wave rides one current. The crowd
// solver runs after the bodies have moved: bodies keep a pad apart, and one
// closing on you from behind another is held back and slid aside.
import { TUNING } from '../tuning.js?v=29';

const MV = TUNING.movement, C = TUNING.crowd;
const ARCHS = ['stream', 'ring', 'pincer'];
const roleOf = (g) => MV.roles[TUNING.species[g.kind].role] || MV.roles.DRIFTER;

export function swarmForces(w, dt) {
  const h = w.hero, rng = w.rngFx, gels = w.gels;
  const live = gels.filter((g) => g.alive && g.state === 'active' && !g.isBoss);
  const shepherds = live.filter((g) => g.kind === 'shepherd');
  const flockers = live.filter((g) => roleOf(g).flock > 0);
  const arch = ARCHS[(w.wave + w.seed) % 3];
  const herd = TUNING.species.shepherd.herd;
  for (const g of live) {
    const mv = roleOf(g);
    if (g.anchored) continue;
    // the herd
    if (shepherds.length && g.kind !== 'shepherd') {
      for (const s of shepherds) {
        const sx = g.x - s.x, sz = g.z - s.z;
        if (sx * sx + sz * sz > herd.radius * herd.radius) continue;
        const px = h.x - g.x, pz = h.z - g.z, pd = Math.hypot(px, pz);
        if (pd > herd.stopAt) { g.x += (px / pd) * herd.speed * dt; g.z += (pz / pd) * herd.speed * dt; }
        break;
      }
    }
    // dodge: sidestep an incoming hero-bullet lane, on a cooldown
    const D = MV.dodge;
    g.dodgeCd -= dt;
    if (g.dodgeT > 0) {
      g.dodgeT -= dt;
      g.x += g.dodgeVx * dt; g.z += g.dodgeVz * dt;
      const k = Math.max(0, 1 - dt * D.decay);
      g.dodgeVx *= k; g.dodgeVz *= k;
    }
    if (g.dodgeCd <= 0 && g.r <= D.maxRadius && mv.dodge > 0) {
      for (const b of w.bullets) {
        if (!b.hero) continue;
        const dx = g.x - b.x, dz = g.z - b.z, sp = Math.hypot(b.vx, b.vz) || 1, fx = b.vx / sp, fz = b.vz / sp;
        const ahead = dx * fx + dz * fz;
        if (ahead < D.ahead[0] || ahead > D.ahead[1]) continue;
        const s = dx * -fz + dz * fx;
        if (Math.abs(s) > g.r + D.lane) continue;
        const side = s >= 0 ? 1 : -1;
        g.dodgeVx = -fz * side * D.speed * mv.dodge; g.dodgeVz = fx * side * D.speed * mv.dodge;
        g.dodgeT = D.time; g.dodgeCd = rng.range(D.cooldown[0], D.cooldown[1]);
        w.events.push({ type: 'dodge', id: g.id });
        break;
      }
    }
    // flock: cohesion and alignment with nearby schoolmates
    if (mv.flock > 0) {
      const F = MV.flock;
      let cx = 0, cz = 0, vx = 0, vz = 0, n = 0;
      for (const o of flockers) {
        if (o === g) continue;
        const dx = o.x - g.x, dz = o.z - g.z;
        if (dx * dx + dz * dz > F.radius * F.radius) continue;
        cx += dx; cz += dz; vx += o.velX; vz += o.velZ; n++;
      }
      if (n) {
        const gl = Math.hypot(cx, cz) || 1;
        g.x += ((cx / gl) * F.cohesion + (vx / n) * F.align) * mv.flock * dt;
        g.z += ((cz / gl) * F.cohesion + (vz / n) * F.align) * mv.flock * dt;
      }
    }
    // weave: a solo body's serpentine approach
    if (mv.weave > 0) {
      const wdx = h.x - g.x, wdz = h.z - g.z, wd = Math.hypot(wdx, wdz) || 1;
      const s = Math.sin(w.time * MV.weaveSpeed + g.mvPhase) * MV.weaveGain * mv.weave;
      g.x += (-wdz / wd) * s * dt; g.z += (wdx / wd) * s * dt;
    }
    // the wave's current
    const cg = mv.current, CU = MV.current;
    if (cg <= 0) continue;
    if (arch === 'stream') {
      const ca = w.wave * 0.9 + w.time * 0.15;
      g.x += Math.cos(ca) * CU.stream * cg * dt; g.z += Math.sin(ca) * CU.stream * cg * dt;
    } else if (arch === 'ring') {
      const dx = g.x - h.x, dz = g.z - h.z, d = Math.hypot(dx, dz) || 1, sgn = w.wave % 2 === 0 ? 1 : -1;
      g.x += (-dz / d) * sgn * CU.ring * cg * dt; g.z += (dx / d) * sgn * CU.ring * cg * dt;
    } else {
      const hvx = h.sVelX ?? h.velX, hvz = h.sVelZ ?? h.velZ;      // 1.x read player._velX (0.4-smoothed, player.js:378)
      const pm = Math.hypot(hvx, hvz), ax = pm > 0.5 ? hvx / pm : 1, az = pm > 0.5 ? hvz / pm : 0;
      const tx = h.x - az * g.mvSide * CU.pincerSide, tz = h.z + ax * g.mvSide * CU.pincerSide;
      const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz) || 1;
      g.x += (dx / d) * CU.pincer * cg * dt; g.z += (dz / d) * CU.pincer * cg * dt;
    }
  }
}

// 1.x resolveCrowd, verbatim in behaviour. A brood let out this step
// (`landTick`, world.js gelStep) is not in it: 1.x built the brood after its
// crowd pass (main.js:10426, 10586-10620), so on that frame it was not there
// to push or be pushed
export function resolveCrowd(w, dt) {
  const gels = w.gels, h = w.hero, HX = w.hx, HZ = w.hz;
  // what the solver moves each body by, kept until the next solve so a species
  // step can read the last one (a tumbling cube moves its pivot with it)
  for (const g of gels) { g.nudgedX = 0; g.nudgedZ = 0; }
  const comfortK = Math.max(1, C.comfort);
  for (let pass = 0; pass < C.passes; pass++) {
    for (let i = 0; i < gels.length; i++) {
      const a = gels[i];
      if (!a.alive || a.state !== 'active' || a.anchored || a.landTick === w.tick) continue;
      for (let j = i + 1; j < gels.length; j++) {
        const b = gels[j];
        if (!b.alive || b.state !== 'active' || b.anchored || b.landTick === w.tick) continue;
        const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
        if (d <= 0.001) continue;
        const contact = a.r + b.r + C.pad, comfort = contact * comfortK;
        if (d >= comfort) continue;
        const nx = dx / d, nz = dz / d;
        let ax = 0, az = 0, bx = 0, bz = 0;
        if (d < contact) { const over = (contact - d) * 0.5; ax += nx * over; az += nz * over; bx -= nx * over; bz -= nz * over; }
        if (pass === 0 && comfort > contact) {
          const k = 1 - Math.max(0, d - contact) / (comfort - contact);
          const da = Math.hypot(a.x - h.x, a.z - h.z), db = Math.hypot(b.x - h.x, b.z - h.z);
          const back = da > db ? a : b, gd = back === a ? da : db;
          if (!back.isBoss && gd > 1e-6) {
            const gx = (h.x - back.x) / gd, gz = (h.z - back.z) / gd;
            if (back.velX * gx + back.velZ * gz > 0.5) {
              const hh = k * C.push * dt, m = k * C.slide * dt;
              let tx = -nz, tz = nx;
              if (tx * gx + tz * gz < 0) { tx = -tx; tz = -tz; }
              if (back === a) { ax += -gx * hh + tx * m; az += -gz * hh + tz * m; }
              else { bx += -gx * hh + tx * m; bz += -gz * hh + tz * m; }
            }
          }
        }
        if (ax || az) { a.x = clampTo(a.x + ax, HX - a.r); a.z = clampTo(a.z + az, HZ - a.r); a.nudgedX += ax; a.nudgedZ += az; }
        if (bx || bz) { b.x = clampTo(b.x + bx, HX - b.r); b.z = clampTo(b.z + bz, HZ - b.r); b.nudgedX += bx; b.nudgedZ += bz; }
      }
    }
  }
  // a campaign room's region is a wall for the crowd as well
  if (w.region) for (const g of gels) if (g.alive && !w.region.contains(g.x, g.z, g.r)) { const p = w.region.clamp(g.x, g.z, g.r, _rp); g.nudgedX += p.x - g.x; g.nudgedZ += p.z - g.z; g.x = p.x; g.z = p.z; }
}

const clampTo = (v, m) => (v < -m ? -m : v > m ? m : v);

const _rp = { x: 0, z: 0 };
