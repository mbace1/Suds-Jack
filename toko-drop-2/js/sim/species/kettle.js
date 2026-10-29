// kettle.js — KETTLE, THE BOILER ROOM's boss (v45). It keeps its distance
// and builds pressure (g.tell: it swells and glows), then vents for
// `vent.time` s: `vent.jets` jets of shots turning round it like a lawn
// sprinkler, and a scalding cloud on the floor where it stands (a hazard).
// Every `stall.every`th vent it overheats: it stalls for `stall.time` s,
// red-hot (s.hot, for the look), and every shot that lands does
// `stall.damage`. Raging (bosskit.js, at half health) it vents four jets, the
// sprinkler turning the other way each time, and builds pressure faster.
//
//   BUILD  `fill` s, s.p 0 → 1 (= g.tell)
//   VENT   the jets and the steam
//   STALL  (every second vent) still and red-hot
// Numbers: js/tuning/species/kettle.js. Seeded: w.rng only.
import { rage, toHero } from './bosskit.js?v=60';
import { TUNING } from '../../tuning.js?v=60';

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'build'; s.t = 0; s.p = 0; s.vents = 0; s.spin = w.rng.next() * Math.PI * 2; s.dir = 1; s.next = 0; s.hot = false;
    s.enraged = false;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, V = S.vent, R = S.rage;
    const mad = rage(w, g, S);
    g.anchored = true;
    const { ux, uz, d } = toHero(w, g.x, g.z);
    g.faceX = ux; g.faceZ = uz;
    s.t += dt;
    if (s.state === 'build') {
      const radial = d > S.keep + 1 ? 1 : d < S.keep - 1 ? -1 : 0, sp = api.speed(g);
      g.vx = ux * radial * sp; g.vz = uz * radial * sp;
      s.p = Math.min(1, s.t / (mad ? R.fill : S.fill));
      g.tell = s.p * s.p;
      if (s.p >= 1) {
        s.state = 'vent'; s.t = 0; s.next = 0; g.tell = 0; g.sqV += 0.9;
        if (mad) s.dir = -s.dir;
        api.fire.hazard(w, g.x, g.z, { r: V.steam.r, life: V.steam.life, src: g.kind, color: V.steam.color, kind: 'steam' });
        w.events.push({ type: 'vent', id: g.id, x: g.x, z: g.z, big: true });
      }
    } else if (s.state === 'vent') {
      s.p = Math.max(0, 1 - s.t / V.time);
      const jets = mad ? R.jets : V.jets;
      while (s.t >= s.next && s.next < V.time) {
        s.next += V.every;
        s.spin += V.spin * V.every * s.dir;
        for (let k = 0; k < jets; k++) api.fire.emit(w, g.x, g.z, s.spin + (k * Math.PI * 2) / jets, { color: S.bulletColor, src: g.kind, speedMult: V.speed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, spiral: true });
      }
      if (s.t >= V.time) {
        s.vents++; s.t = 0;
        if (s.vents % S.stall.every === 0) { s.state = 'stall'; s.hot = true; g.sqV -= 0.8; w.events.push({ type: 'stall', id: g.id, x: g.x, z: g.z }); }
        else s.state = 'build';
      }
    } else {
      // stalled: still, red-hot
      if (s.t >= S.stall.time) { s.state = 'build'; s.t = 0; s.hot = false; }
    }
  },

  // red-hot, a shot does more: the core takes its own 1, this takes the rest
  onHit(w, g, b, api) {
    if (g.s.hot && !g.shield) g.hp -= TUNING.species[g.kind].stall.damage - 1;
    return undefined;
  },
};
