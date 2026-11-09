// slam.js — a GIANT's own attack (v112; owner: "a bit less shooting and more unique patterns"). A size-5 body
// (sim/director/arcade.js sizeWave) does not fire anything new: on its own beat it GATHERS — stops, squashes down,
// and the floor shows how far it reaches — then SLAMS the floor. Inside that ring when it lands, you are hit
// (unless you are in a dash or your mercy, as any hit); outside it, nothing. The bodies in reach are thrown outward
// (a giant clears its own crowd), and the giant itself rebounds off its slam.
//
// It is told every time (`slamWarn` with the reach, `warn` s before), never aimed (it is the giant's own ground),
// and on the run's clock (its first beat off the giant's id, so two giants do not slam as one). Pure: no DOM,
// no Math.random.
//
//   g.slam  { t, phase: 'idle' | 'warn', x, z }
//   events  slamWarn { id, x, z, r, t } · slam { id, x, z, r, color }
import { TUNING } from '../tuning.js?v=124';

const T = TUNING;

export const reach = (g) => g.r + T.sizes.slam.reach;

export function step(w, g, dt, api) {
  const L = T.sizes.slam;
  if (g.state !== 'active' || g.isBoss) return;
  if (!g.slam) g.slam = { t: L.first + (g.id % 5) * L.stagger, phase: 'idle', x: g.x, z: g.z };
  const s = g.slam;
  if (s.phase === 'idle') {
    if ((s.t -= dt) > 0) return;
    s.phase = 'warn'; s.t = L.warn; s.x = g.x; s.z = g.z;
    w.events.push({ type: 'slamWarn', id: g.id, x: g.x, z: g.z, r: reach(g), t: L.warn });
  }
  // gathering: it holds still where it stopped (nothing of this step's walk), squashing down onto the floor —
  // set, not sprung: the body's own spring would hold it most of the way up
  g.vx = g.vz = 0; g.x = s.x; g.z = s.z;
  g.sq = 1 + (L.squash - 1) * Math.min(1, ((L.warn - s.t) / L.warn) * L.gather); g.sqV = 0;
  if ((s.t -= dt) > 0) return;
  // the slam
  const R = reach(g), h = w.hero;
  w.events.push({ type: 'slam', id: g.id, x: g.x, z: g.z, r: R, color: T.species[g.kind].color });
  w.events.push({ type: 'shake', amount: L.shake });
  if (h.alive && Math.hypot(h.x - g.x, h.z - g.z) < R + T.hero.radius * 0.5) api.hurt(w, `slam:${g.kind}`);
  for (const o of w.gels) {
    if (o === g || !o.alive || o.state !== 'active' || o.isBoss) continue;
    const dx = o.x - g.x, dz = o.z - g.z, d = Math.hypot(dx, dz);
    if (d >= R + o.r * 0.5) continue;
    const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0, k = L.push * (1 - 0.5 * Math.min(1, d / R));
    o.kx += nx * k; o.kz += nz * k; o.sqV += 0.12;
  }
  g.sq = L.squash * 0.85; g.sqV = L.rebound;
  s.phase = 'idle'; s.t = L.every;
}
