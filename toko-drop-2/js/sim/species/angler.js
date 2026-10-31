// angler.js — ANGLER, THE DEEP's boss (v45): GLOWA's anglerfish at a
// boss's size. It creeps at you holding its lure out in front (g.s.lx, lz:
// where the light is, for the look, glowa's). When you come within
// `bite.range` of the light it tells for `bite.tell` s and lunges along that
// line, bursting a ring of lights where the lunge ends; then it rests. While
// it creeps it lets `lantern.count` slow lights go every few seconds that turn
// after you. Raging (bosskit.js, at half health) two GLOWA come to it out of
// the dark, once, and its lanterns come twice as often.
//
//   CREEP → (near the light) TELL → BITE → REST → CREEP
// Numbers: js/tuning/species/angler.js. Seeded: w.rng only.
import { steerTo } from './base.js?v=69';
import { rage, range, toHero, inside } from './bosskit.js?v=69';

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'creep'; s.t = 0.8; s.lx = g.x; s.lz = g.z; s.dx = 0; s.dz = 1; s.called = false;
    s.lanternT = range(w, S.lantern.every) * 0.5;
    s.enraged = false;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, B = S.bite, R = S.rage, L = S.lantern;
    const mad = rage(w, g, S);
    g.anchored = true;
    const opts = { color: S.bulletColor, src: g.kind };
    if (mad && !s.called) {
      s.called = true;
      const n = Math.min(R.call.n, api.childrenAllowed(w));
      for (let i = 0; i < n; i++) {
        const a = w.rng.next() * Math.PI * 2, p = inside(w, g.x + Math.cos(a) * 6, g.z + Math.sin(a) * 6, 1.5);
        api.spawn(w, R.call.kind, p.x, p.z, { child: true, speedMult: g.speedMult, intervalMult: g.intervalMult });
      }
    }
    s.t -= dt;
    const reach = g.r * S.lure.reach;
    if (s.state === 'creep') {
      steerTo(g, h.x, h.z, api.speed(g));
      g.tell = 0;
      s.lx = g.x + g.faceX * reach; s.lz = g.z + g.faceZ * reach;
      if ((s.lanternT -= dt) <= 0) {
        s.lanternT = range(w, mad ? R.lantern : L.every) * g.intervalMult;
        api.fire.fanSpan(w, s.lx, s.lz, api.fire.aimAngle(w, s.lx, s.lz), L.count, L.span, { ...opts, speedMult: L.speed, homing: L.homing, life: L.life, radius: L.radius });
        w.events.push({ type: 'gelShot', x: s.lx, z: s.lz, kind: g.kind });
      }
      if (s.t <= 0 && Math.hypot(h.x - s.lx, h.z - s.lz) < B.range) {
        const { ux, uz } = toHero(w, g.x, g.z);
        s.dx = ux; s.dz = uz; s.state = 'tell'; s.t = B.tell; g.sqV -= 0.8;
      }
    } else if (s.state === 'tell') {
      g.tell = 1 - Math.max(0, s.t) / B.tell;
      g.faceX = s.dx; g.faceZ = s.dz;
      if (s.t <= 0) { s.state = 'bite'; s.t = B.time; g.sqV += 1.0; w.events.push({ type: 'bite', id: g.id, x: g.x, z: g.z, big: true }); }
    } else if (s.state === 'bite') {
      g.vx = s.dx * B.speed * g.speedMult; g.vz = s.dz * B.speed * g.speedMult; g.tell = 0;
      if (s.t <= 0) {
        api.fire.ring(w, g.x, g.z, B.ring, w.rng.next() * Math.PI, { ...opts, speedMult: B.ringSpeed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
        s.state = 'rest'; s.t = B.rest;
      }
    } else if (s.t <= 0) { s.state = 'creep'; s.t = 0.5; }
    if (s.state !== 'creep') { s.lx = g.x + s.dx * reach; s.lz = g.z + s.dz * reach; }
  },
};
