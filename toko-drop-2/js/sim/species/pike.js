// pike.js — PIKE, THE RIVER's boss (v45). It circles you at a distance,
// firing a small fan now and then; then stops, lines up on you for `aim` s
// (the tell: its lane lit on the floor, s.lx/lz the far end) and charges
// along that line at `charge.speed`, leaving a wake: a slow shot either side,
// square to its line, every `wake.every` s, so the lane it took stays shut for
// a moment. A charge that ends in a wall stuns it there (a ring, then
// `stun.time` s still); one that runs out its time glides back to circling.
// Raging (bosskit.js, at half health) it charges `rage.chain` times in a row,
// lining up again at once between them.
//
//   CIRCLE → AIM → CHARGE → (STUN at a wall) → CIRCLE
// Numbers: js/tuning/species/pike.js. Seeded: w.rng only.
import { rage, range, toHero } from './bosskit.js?v=67';

// the far end of the lane from (x, z) along (dx, dz): where it meets a wall
function laneEnd(w, x, z, dx, dz, m) {
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (w.hx - m - x) / dx); else if (dx < -1e-6) t = Math.min(t, (-w.hx + m - x) / dx);
  if (dz > 1e-6) t = Math.min(t, (w.hz - m - z) / dz); else if (dz < -1e-6) t = Math.min(t, (-w.hz + m - z) / dz);
  return { x: x + dx * t, z: z + dz * t };
}

function lineUp(w, g, S, aim) {
  const s = g.s, { ux, uz } = toHero(w, g.x, g.z);
  s.dx = ux; s.dz = uz; s.state = 'aim'; s.t = aim; s.aimT = aim;
  const e = laneEnd(w, g.x, g.z, ux, uz, g.r);
  s.lx = e.x; s.lz = e.z;
  g.sqV -= 0.5;
}

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'circle'; s.t = range(w, S.circle.time); s.sign = w.rng.next() < 0.5 ? 1 : -1;
    s.fanT = S.circle.fan.every * 0.5; s.dx = 0; s.dz = 1; s.lx = g.x; s.lz = g.z; s.left = 0; s.wakeT = 0;
    s.enraged = false;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, R = S.rage, C = S.circle;
    const mad = rage(w, g, S);
    g.anchored = true;
    s.t -= dt;
    const opts = { color: S.bulletColor, src: g.kind };
    if (s.state === 'circle') {
      const { ux, uz, d } = toHero(w, g.x, g.z), sp = api.speed(g);
      const radial = d > C.want + C.band ? 1 : d < C.want - C.band ? -1 : 0;
      g.vx = (ux * radial * 0.6 - uz * s.sign) * sp; g.vz = (uz * radial * 0.6 + ux * s.sign) * sp;
      const l = Math.hypot(g.vx, g.vz) || 1; g.faceX = g.vx / l; g.faceZ = g.vz / l;
      // a wall it is circling into turns its circle round
      if ((Math.abs(g.x) > w.hx - g.r - 0.3 && g.x * g.vx > 0) || (Math.abs(g.z) > w.hz - g.r - 0.3 && g.z * g.vz > 0)) s.sign = -s.sign;
      g.tell = 0;
      if ((s.fanT -= dt) <= 0) {
        s.fanT = C.fan.every * g.intervalMult;
        api.fire.fanSpan(w, g.x, g.z, api.fire.aimAngle(w, g.x, g.z), C.fan.count, C.fan.span, { ...opts, speedMult: C.fan.speed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
      }
      if (s.t <= 0) { s.left = mad ? R.chain : 1; lineUp(w, g, S, mad ? R.aim : S.aim); }
    } else if (s.state === 'aim') {
      // the lane follows you a little while it tells, then locks
      if (s.t > s.aimT * 0.4) { const e = toHero(w, g.x, g.z); s.dx = e.ux; s.dz = e.uz; const L = laneEnd(w, g.x, g.z, s.dx, s.dz, g.r); s.lx = L.x; s.lz = L.z; }
      g.faceX = s.dx; g.faceZ = s.dz;
      g.tell = 1 - Math.max(0, s.t) / s.aimT;
      if (s.t <= 0) { s.state = 'charge'; s.t = S.charge.time; s.wakeT = 0; g.tell = 0; g.sqV += 0.7; w.events.push({ type: 'charge', id: g.id, x: g.x, z: g.z }); }
    } else if (s.state === 'charge') {
      const sp = S.charge.speed * g.speedMult;
      g.vx = s.dx * sp; g.vz = s.dz * sp; g.faceX = s.dx; g.faceZ = s.dz;
      if ((s.wakeT -= dt) <= 0) {
        s.wakeT = S.wake.every;
        const a = Math.atan2(s.dz, s.dx);
        api.fire.emit(w, g.x, g.z, a + Math.PI / 2, { ...opts, speedMult: S.wake.speed, life: S.wake.life });
        api.fire.emit(w, g.x, g.z, a - Math.PI / 2, { ...opts, speedMult: S.wake.speed, life: S.wake.life });
      }
      const atWall = S.charge.time - s.t > 0.12 && (Math.abs(g.x) >= w.hx - g.r - 0.05 || Math.abs(g.z) >= w.hz - g.r - 0.05);
      if (atWall || s.t <= 0) {
        s.left--;
        if (atWall) {
          api.fire.ring(w, g.x, g.z, S.stun.ring, w.rng.next() * Math.PI, { ...opts, speedMult: S.stun.speed });
          w.events.push({ type: 'shake', amount: 0.3, id: g.id, kind: g.kind, x: g.x, z: g.z });
          w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
        }
        if (s.left > 0) lineUp(w, g, S, R.aim);
        else if (atWall) { s.state = 'stun'; s.t = S.stun.time; g.sqV -= 1.0; }
        else { s.state = 'circle'; s.t = range(w, C.time); }
      }
    } else {
      g.tell = 0.3 + 0.3 * Math.sin(s.t * 20);
      if (s.t <= 0) { s.state = 'circle'; s.t = range(w, C.time); g.tell = 0; }
    }
  },
};
