// rules.js — ONE RULE PER WORLD (1.x v264, main.js:2925-3172): each campaign
// world owns exactly one mechanic, so a world can be named by how it plays,
// and THE SURFACE keeps none, because it is where the game is taught. Ported
// from 1.x's updateWorldRule as written, but drawn from the run's own seed
// (1.x used Math.random), so a room replays exactly.
//
// The sim keeps `w.rule` = { kind, t, ... } and reports
//   ruleWarn  { kind, t }       the rail flashes: a sweep or an updraft is coming
//   ruleFire  { kind }          it comes
// and `w.rule.dark` (0..1) for the view, which draws THE VOID's dark closing in.
// Every number is TUNING.campaign.rules.
import { TUNING } from '../tuning.js?v=65';

const T = TUNING, R = T.campaign.rules;

// a campaign room plays its world's rule; an arcade run (v27) the rule of the
// world it is in, from the fourth world on (TUNING.worlds.list)
export const kindOf = (w) => (w.room ? (w.room.level && 'rule' in w.room.level ? w.room.level.rule : T.campaign.worlds[w.room.world]?.rule ?? null)
  : T.worlds.modes.includes(w.mode) ? T.worlds.list[(w.world || 1) - 1]?.rule ?? null : null);

export function create(w) {
  const kind = kindOf(w);
  w.rule = kind ? { kind, cycle: kind === 'cycle', t: 0, angle: w.rng.next() * Math.PI * 2, nextAt: 0, warnT: 0, pushT: 0, lane: 0, ang0: 0, dark: 0, fired: 0, ct: 0, ci: 0 } : null;
  if (w.rule?.cycle) { w.rule.kind = T.worlds.cycle.rules[0]; }
}

// a room's GAUNTLET changes the rule mid-room (sim/challenge.js): a fresh
// state of the new kind, or none
export function setKind(w, kind) {
  const was = w.rule?.kind ?? null;
  if (!kind) { w.rule = null; w.hero.slipX = w.hero.slipZ = 0; }
  else w.rule = { kind, cycle: false, t: 0, angle: w.rule?.angle ?? w.rng.next() * Math.PI * 2, nextAt: 0, warnT: 0, pushT: 0, lane: 0, ang0: 0, dark: 0, fired: 0, ct: 0, ci: 0 };
  if (kind !== was) { w.hero.slipX = w.hero.slipZ = 0; w.events.push({ type: 'ruleTurn', kind }); }
}

// before the bodies step: the current and the updraft move what stands on the floor
export function step(w, dt, api) {
  const S = w.rule;
  if (!S) return;
  S.t += dt;
  // THE CORE: every rule in turn (TUNING.worlds.cycle)
  if (S.cycle && (S.ct += dt) >= T.worlds.cycle.every && S.warnT <= 0 && S.pushT <= 0) {
    const C = T.worlds.cycle;
    S.ct = 0; S.ci = (S.ci + 1) % C.rules.length; S.kind = C.rules[S.ci];
    S.t = 0; S.nextAt = 0; S.dark = 0; w.hero.slipX = w.hero.slipZ = 0;
    w.events.push({ type: 'ruleTurn', kind: S.kind });
  }
  const h = w.hero, live = (g) => g.alive && g.state === 'active';
  if (S.kind === 'current') {
    // the whole floor leans, and the lean turns
    const C = R.current;
    S.angle += C.turn * dt;
    const dx = Math.cos(S.angle), dz = Math.sin(S.angle);
    for (const g of w.gels) if (live(g) && !g.anchored) { g.x += dx * C.speed * dt; g.z += dz * C.speed * dt; }
    h.pullX = (h.pullX || 0) + dx * C.speed * C.playerMult * dt;
    h.pullZ = (h.pullZ || 0) + dz * C.speed * C.playerMult * dt;
  } else if (S.kind === 'sweep') {
    const W = R.sweep;
    if (S.nextAt === 0) S.nextAt = W.every;
    if (S.warnT > 0) {
      S.warnT -= dt;
      if (S.warnT <= 0) fireSweep(w, api);
    } else if (S.t >= S.nextAt) {
      S.nextAt = S.t + W.every; S.warnT = W.warn;
      S.lane = w.rng.int(0, 3);                    // which rail it comes off
      w.events.push({ type: 'ruleWarn', kind: S.kind, t: W.warn, lane: S.lane });
    }
  } else if (S.kind === 'dark') {
    // the dark breathes: closes in and opens again
    S.dark = 0.5 - 0.5 * Math.cos((S.t / R.dark.period) * Math.PI * 2);
  } else if (S.kind === 'updraft') {
    const U = R.updraft;
    if (S.nextAt === 0) S.nextAt = U.every;
    if (S.pushT > 0) {
      S.pushT -= dt;
      const k = Math.max(0, S.pushT / U.dur), MIN = 1.5;
      // out from the middle; a body ON the middle goes the event's own way
      const out = (x, z) => { const d = Math.hypot(x, z); return d < MIN ? [Math.cos(S.ang0), Math.sin(S.ang0)] : [x / d, z / d]; };
      for (const g of w.gels) if (live(g)) { const [ox, oz] = out(g.x, g.z); g.x += ox * U.push * k * dt; g.z += oz * U.push * k * dt; }
      const [ox, oz] = out(h.x, h.z);
      h.pullX = (h.pullX || 0) + ox * U.push * U.playerMult * k * dt;
      h.pullZ = (h.pullZ || 0) + oz * U.push * U.playerMult * k * dt;
    } else if (S.warnT > 0) {
      S.warnT -= dt;
      if (S.warnT <= 0) {
        S.pushT = U.dur; S.ang0 = w.rng.next() * Math.PI * 2; S.fired++;
        w.events.push({ type: 'ruleFire', kind: S.kind });
        w.events.push({ type: 'shake', amount: 0.35 });
      }
    } else if (S.t >= S.nextAt) {
      S.nextAt = S.t + U.every; S.warnT = U.warn;
      w.events.push({ type: 'ruleWarn', kind: S.kind, t: U.warn });
    }
  }
}

// THE VEIN's line: a row of bullets off one rail, with a gap you run to
function fireSweep(w, api) {
  const W = R.sweep, S = w.rule, horiz = S.lane < 2;
  const span = horiz ? w.hx : w.hz, n = Math.max(3, Math.floor((span * 2) / W.spacing));
  const gapAt = w.rng.int(0, Math.max(1, n - W.gapSlots) - 1);
  const sign = S.lane % 2 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    if (i >= gapAt && i < gapAt + W.gapSlots) continue;      // the hole
    const off = -span + (i + 0.5) * ((span * 2) / n);
    const x = horiz ? off : sign * w.hx, z = horiz ? sign * w.hz : off;
    const dx = horiz ? 0 : -sign, dz = horiz ? -sign : 0;
    api.fire.emit(w, x, z, Math.atan2(dz, dx), { color: W.color, src: 'sweep', speedMult: W.speed / T.bullets.gelSpeed });
  }
  S.fired++;
  w.events.push({ type: 'ruleFire', kind: S.kind });
}

// THE FOAM: the stick sets where you ACCELERATE, not where you are (1.x player.js:305-317)
export function slip(w, mx, mz, speed, dt) {
  const S = w.rule, h = w.hero;
  if (!S || S.kind !== 'slip') return false;
  const P = R.slip, k = Math.min(1, P.accel * dt);
  h.slipX = (h.slipX || 0) + (mx * speed - (h.slipX || 0)) * k;
  h.slipZ = (h.slipZ || 0) + (mz * speed - (h.slipZ || 0)) * k;
  if (!mx && !mz) { const d = Math.max(0, 1 - P.drag * dt); h.slipX *= d; h.slipZ *= d; }
  h.x += h.slipX * dt; h.z += h.slipZ * dt;
  return true;
}
