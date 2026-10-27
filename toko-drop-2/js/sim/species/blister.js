// blister.js — BLISTER, THE CISTERN's boss (v45): BUBBLA's bubble at a
// boss's size. The bubble takes your shots, thinning with each one, and pops
// on the last (`shell`); only then does a shot reach the gel inside, and only
// for `bare` s — then the bubble is whole again. Whole, it hangs back and
// blows big slow bubbles at you, each bursting into a ring at the end of its
// life; bare, it panics: it backs off, wobbling, and fires fast fans. Raging
// (bosskit.js, at half health) it blows more often and its bubbles burst into
// more. So the fight is a rhythm: break the bubble, then make the bare
// seconds count.
//
// g.s.shell is the bubble's hits left (the look reads it, bubbla's look).
// Numbers: js/tuning/species/blister.js. Seeded: w.rng only.
import { rage, range, toHero } from './bosskit.js?v=55';

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.shell = S.shell; s.bareT = 0; s.clock = w.rng.next() * Math.PI * 2;
    s.blowT = range(w, S.blow.every) * 0.6; s.panicT = 0; s.bubbles = [];
    s.enraged = false;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, R = S.rage, B = S.blow;
    const mad = rage(w, g, S);
    s.clock += dt;
    g.anchored = true;
    const { ux, uz, d } = toHero(w, g.x, g.z);
    g.faceX = ux; g.faceZ = uz;
    const opts = { color: S.bulletColor, src: g.kind };

    // its blown bubbles: each one that ran its life out bursts where it is
    for (let i = s.bubbles.length - 1; i >= 0; i--) {
      const b = s.bubbles[i];
      if (!b.dead) continue;
      s.bubbles.splice(i, 1);
      if (b.life > 0) continue;               // it hit you, or left the floor: no burst
      api.fire.ring(w, b.x, b.z, mad ? R.burst : B.burst.count, w.rng.next() * Math.PI, { ...opts, speedMult: B.burst.speed });
      w.events.push({ type: 'bubble', id: g.id, x: b.x, z: b.z, popped: true, small: true });
    }

    if (s.shell <= 0) {
      // bare: it backs off slowly, wobbling side to side, firing fast
      s.bareT -= dt;
      const sp = S.panic.speed * g.speedMult, side = Math.sin(s.clock * 2.4);
      g.vx = (-ux * 0.5 - uz * side) * sp;
      g.vz = (-uz * 0.5 + ux * side) * sp;
      if ((s.panicT -= dt) <= 0) {
        s.panicT = S.panic.every * g.intervalMult;
        api.fire.fanSpan(w, g.x, g.z, api.fire.aimAngle(w, g.x, g.z), S.panic.count, S.panic.span, { ...opts, speedMult: S.panic.shotSpeed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
      }
      if (s.bareT <= 0) {
        s.shell = S.shell; g.sqV += 0.6;
        s.blowT = range(w, mad ? R.every : B.every);
        w.events.push({ type: 'bubble', id: g.id, x: g.x, z: g.z, whole: true });
      }
      return;
    }

    // whole: hang back at `keep`, swaying, and blow
    const radial = d > S.keep + 1 ? 1 : d < S.keep - 1 ? -1 : 0, sp = api.speed(g);
    const sway = Math.sin(s.clock * Math.PI * 2 * S.bob[0]) * S.bob[1] * 2 * Math.PI * S.bob[0];
    g.vx = ux * radial * sp - uz * sway;
    g.vz = uz * radial * sp + ux * sway;
    if ((s.blowT -= dt) <= 0) {
      s.blowT = range(w, mad ? R.every : B.every) * g.intervalMult;
      const a0 = api.fire.aimAngle(w, g.x, g.z);
      for (let j = 0; j < B.count; j++) {
        const a = B.count > 1 ? a0 - B.span / 2 + (j * B.span) / (B.count - 1) : a0;
        const b = api.fire.emit(w, g.x + Math.cos(a) * g.r * 0.8, g.z + Math.sin(a) * g.r * 0.8, a, { ...opts, speedMult: B.speed, radius: B.radius, life: B.life });
        if (b) s.bubbles.push(b);
      }
      g.sqV -= 0.5;
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
    }
  },

  // the bubble takes the shot; the last one pops it
  onHit(w, g, b, api) {
    const s = g.s;
    if (s.shell <= 0) return undefined;           // bare: the gel takes it
    s.shell--;
    g.sqV += 0.25;
    if (s.shell === 0) {
      s.bareT = api.S(g).bare; s.panicT = 0.3;
      w.events.push({ type: 'bubble', id: g.id, x: g.x, z: g.z, popped: true, big: true });
      w.events.push({ type: 'shake', amount: 0.3, id: g.id, kind: g.kind, x: g.x, z: g.z });
    }
    return 'block';
  },
};
