// berg.js — BERG, THE ICE SHEET's boss (v45): SKATA's slide at a boss's
// size. It slides at its own speed and never slows, glancing off the walls —
// each glance a fan of shards at you, every `reaim`th one lining it up on you
// again — and a shot knocks it a little along the shot's line. Every few
// seconds it stops dead and frosts over (`freeze.tell` s, g.tell), then fires
// walls of icicles out along `freeze.lines` lines, turned half a step each
// time, and slides on at you. Raging (bosskit.js, at half health) it calves
// two SKATA once, slides faster, and fires eight lines.
//
//   SLIDE → FREEZE (tell) → FIRE (hold) → SLIDE
// v136 (owner, 2026-11-10, asked about HARDCADE's ice playing easier than its river — BERG's icicle walls are told,
// read and walked round, where PIKE charges: "New BERG attack (HARDCADE)"): in HARDCADE only, while it slides it
// LUNGES — no frost, no lane: it turns on you at `snap.speed` × its slide for `snap.time` s, and `snap.again` s after
// that turns on you and lunges again, every `snap.every` s. Nothing tells the first; the beat before the second is
// the time a person has to read it. (A lunge alone the bots stepped out of; a second straight after it they could not
// read at all; with the beat between, a whole HARDCADE run clears world 7 27% of the time where it cleared it 42% —
// under the river's 31, and as near the deep's 30 as the measure can tell: scripts/curve.mjs, docs/CURVE.md.) ARCADE's BERG, and the campaign's
// (HARD PAIN too), are as they were.
// Numbers: js/tuning/species/berg.js. Seeded: w.rng only.
import { rage, range, toHero, inside } from './bosskit.js?v=145';

function slideAt(w, g, sp) { const { ux, uz } = toHero(w, g.x, g.z); g.s.vx = ux * sp; g.s.vz = uz * sp; }
// v136: the lunge is HARDCADE's alone
const lunges = (w, S) => !!S.snap && w.mode === 'hardcade';

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'slide'; s.t = range(w, S.freeze.every); s.bounces = 0; s.turn = 0; s.calved = false;
    slideAt(w, g, S.speed * g.speedMult);
    s.enraged = false;
    s.snapT = lunges(w, S) ? range(w, S.snap.first) : Infinity; s.snapping = 0; s.again = false; s.againT = 0;   // v136
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, R = S.rage, F = S.freeze, m = g.r;
    const mad = rage(w, g, S);
    g.anchored = true;
    const opts = { color: S.bulletColor, src: g.kind };
    if (mad && !s.calved) {
      s.calved = true;
      const n = Math.min(R.calf.n, api.childrenAllowed(w));
      for (let i = 0; i < n; i++) {
        const a = w.rng.next() * Math.PI * 2, p = inside(w, g.x + Math.cos(a) * g.r * 1.5, g.z + Math.sin(a) * g.r * 1.5, 1);
        api.spawn(w, R.calf.kind, p.x, p.z, { child: true, speedMult: g.speedMult, intervalMult: g.intervalMult });
      }
    }
    s.t -= dt;
    const sp0 = S.speed * g.speedMult * (mad ? R.speed : 1);
    if (s.state === 'slide') {
      // v136: the lunge, and the second one a beat after it (HARDCADE)
      let surge = 1;
      if (lunges(w, S)) {
        const P = S.snap, lunge = () => {
          s.snapping = P.time; surge = P.speed; slideAt(w, g, sp0 * surge); g.sqV -= 0.4;
          w.events.push({ type: 'skid', id: g.id, x: g.x, z: g.z, big: true, lunge: true });
        };
        if (s.snapping > 0) { s.snapping -= dt; surge = P.speed; }
        else if (s.again) { if ((s.againT -= dt) <= 0) { s.again = false; lunge(); } }
        else if ((s.snapT -= dt) <= 0) { s.snapT = range(w, P.every); s.again = P.again != null; s.againT = P.again ?? 0; lunge(); }
      }
      let bounced = false;
      if ((g.x <= -w.hx + m + 1e-3 && s.vx < 0) || (g.x >= w.hx - m - 1e-3 && s.vx > 0)) { s.vx = -s.vx; bounced = true; }
      if ((g.z <= -w.hz + m + 1e-3 && s.vz < 0) || (g.z >= w.hz - m - 1e-3 && s.vz > 0)) { s.vz = -s.vz; bounced = true; }
      if (bounced) {
        s.bounces++;
        if (s.bounces % S.reaim === 0) slideAt(w, g, Math.max(sp0, Math.hypot(s.vx, s.vz)));
        api.fire.fanSpan(w, g.x, g.z, api.fire.aimAngle(w, g.x, g.z), S.bounce.count, S.bounce.span, { ...opts, speedMult: S.bounce.speed });
        g.sqV -= 0.5;
        w.events.push({ type: 'skid', id: g.id, x: g.x, z: g.z, big: true });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
      }
      // its own speed again after a knock has slowed or quickened it
      const sp = Math.hypot(s.vx, s.vz) || 1, want = sp + (sp0 * surge - sp) * Math.min(1, dt * (surge > 1 ? 8 : 0.8));
      s.vx *= want / sp; s.vz *= want / sp;
      g.vx = s.vx; g.vz = s.vz;
      const d = Math.hypot(s.vx, s.vz) || 1; g.faceX = s.vx / d; g.faceZ = s.vz / d;
      g.tell = 0;
      if (s.t <= 0) { s.state = 'freeze'; s.t = F.tell; g.sqV -= 0.6; s.snapping = 0; s.again = false; }   // (a lunge ends where it frosts)
    } else if (s.state === 'freeze') {
      g.tell = 1 - Math.max(0, s.t) / F.tell;
      if (s.t <= 0) {
        const lines = mad ? R.lines : F.lines;
        s.turn ^= 1;
        for (let k = 0; k < lines; k++) {
          const a = (k * Math.PI * 2) / lines + s.turn * Math.PI / lines;
          api.fire.wall(w, g.x + Math.cos(a) * g.r, g.z + Math.sin(a) * g.r, Math.cos(a), Math.sin(a), F.n, F.width, { ...opts, speedMult: F.speed });
        }
        g.sqV += 0.9; g.tell = 0;
        w.events.push({ type: 'shake', amount: 0.25, id: g.id, kind: g.kind, x: g.x, z: g.z });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
        s.state = 'hold'; s.t = F.hold;
      }
    } else {
      if (s.t <= 0) { s.state = 'slide'; s.t = range(w, F.every); slideAt(w, g, sp0); }
    }
  },

  // a shot knocks it along the shot's line (and the shot still lands)
  onHit(w, g, b, api) {
    const S = api.S(g), s = g.s;
    if (s.state !== 'slide') return undefined;
    const bl = Math.hypot(b.vx, b.vz) || 1;
    s.vx += (b.vx / bl) * S.knock; s.vz += (b.vz / bl) * S.knock;
    const sp = Math.hypot(s.vx, s.vz); if (sp > S.max) { s.vx *= S.max / sp; s.vz *= S.max / sp; }
    return undefined;
  },
};
