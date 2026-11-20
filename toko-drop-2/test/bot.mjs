#!/usr/bin/env node
// bot.mjs — the expert's look-ahead (v55, scripts/bot.mjs plan()), in bare
// node. The planner reads the sim's own fields (a bullet's line, a hopper's
// landing, the dash's i-frames), so a renamed field would blind it without a
// sound and scripts/reach.mjs would quietly measure a worse player. A bullet
// coming straight at it: it steps off the line. A ring closing on it that it
// cannot walk out of: it dashes. A hopper about to land on it: it is gone
// before the landing. The three skills that set the grade lines never plan.
import { createWorld, step } from '../js/sim/world.js?v=158';
import { TUNING as T } from '../js/tuning.js?v=158';
import * as fire from '../js/sim/fire.js?v=158';
import { SKILLS, plan, think, prng, sight } from '../scripts/bot.mjs';

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };

// a still floor: nothing on it, the director held, the hero at the middle
function floor() {
  const w = createWorld({ seed: 3, mode: 'arcade' });
  w.director = { step() {} }; w.gels = []; w.bullets = []; w.gelBullets = 0; w.lobs = []; w.hazards = [];
  w.hero.x = 0; w.hero.z = 0; w.hero.dashCd = 0; w.hero.dash = 0; w.hero.mercy = 0; w.hero.invinc = 0;
  return w;
}

// v56: every skill looks ahead; the human part sets them apart, in order, and the expert has none
{
  const E = SKILLS.expert, L = ['sharp', 'average', 'rough'].map((k) => SKILLS[k]);
  check('the expert has no human part: no reaction time, nothing missed, no limit to its attention, no shaky thumb', E.react === 0 && E.see === 1 && E.focus === Infinity && E.reads === 1 && E.jitter === 0);
  const down = (f) => L.every((k, i) => i === 0 || f(L[i - 1]) <= f(k));
  check('sharp takes things in faster, tracks more at once, thinks further and moves cleaner than average, and average than rough',
    L.every((k) => k.react > 0 && k.see < 1 && k.focus < Infinity && k.jitter > 0) && down((k) => k.react) && down((k) => -k.see) && down((k) => -k.focus) && down((k) => -k.horizon) && down((k) => k.jitter) && down((k) => k.dashAt) && down((k) => -k.reads));
}

{
  const w = floor();
  fire.emit(w, 4, 0, Math.PI);   // straight at the hero along x
  const p = plan(w, 0, 0, false);
  check('a bullet coming straight at it: it steps off the line, on foot, and not toward it', Math.abs(p.mz) > 0.5 && p.mx <= 0.01 && !p.dash, JSON.stringify(p));
}

{
  // the human part bites: a bullet younger than its reaction time is not there
  // to it yet, and one it never noticed is never there
  const w = floor();
  w.time = 10; fire.emit(w, 4, 0, Math.PI);
  const mem = { rnd: () => 0.5, seen: new WeakMap() }, K = { ...SKILLS.average, see: 1 };
  const fresh = plan(w, 0, 0, false, K, mem);
  w.time = 10 + K.react + 0.01;
  const taken = plan(w, 0, 0, false, K, mem);
  check('a bullet younger than its reaction time is not there to it yet; once taken in, it steps aside', fresh.mx === 0 && fresh.mz === 0 && Math.abs(taken.mz) > 0.5, `${JSON.stringify(fresh)} → ${JSON.stringify(taken)}`);
  // a missed volley is missed whole: a ring fired at once, every bullet of it
  const wv = floor(); wv.time = 3;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; fire.emit(wv, 2.5 + Math.cos(a) * 0.3, Math.sin(a) * 0.3, Math.PI, { src: 'test' }); }
  const missed = plan(wv, 0, 0, false, { ...SKILLS.average, react: 0, see: 0.5 }, { rnd: () => 0.9 });
  const caught = plan(wv, 0, 0, false, { ...SKILLS.average, react: 0, see: 0.5 }, { rnd: () => 0.1 });
  check('a volley is noticed or missed whole: one roll for all of it', missed.mx === 0 && missed.mz === 0 && (caught.mx !== 0 || caught.mz !== 0), `${JSON.stringify(missed)} / ${JSON.stringify(caught)}`);
  // attention: with more coming than it can track, the least urgent go unseen
  const w2 = floor();
  fire.emit(w2, 0, 3, -Math.PI / 2); fire.emit(w2, 9, 0, Math.PI);   // one about to arrive, one far off
  const one = plan(w2, 0, 0, false, { ...SKILLS.average, react: 0, see: 1, focus: 1 }, { rnd: () => 0.5 });
  const none = plan(w2, 0, 0, false, { ...SKILLS.average, react: 0, see: 1, focus: 0 }, { rnd: () => 0.5 });
  check('…it tracks the most urgent bullets first, and with no attention to spare dodges nothing', Math.abs(one.mx) > 0.5 && none.mx === 0 && none.mz === 0, `${JSON.stringify(one)} / ${JSON.stringify(none)}`);
}

{
  // THE VOID's dark: a bullet past the light is not there to a line player; the expert sees it
  const w = floor(), D = T.campaign.rules.dark;
  w.rule = { kind: 'dark', dark: 1, t: 0 };
  const K = { ...SKILLS.average, react: 0, see: 1 }, v = sight(w, K), d0 = v + 1;
  fire.emit(w, d0, 0, Math.PI, { speedMult: d0 / 0.45 / T.bullets.gelSpeed });   // here in 0.45 s: inside every look-ahead
  const inDark = plan(w, 0, 0, false, K, { rnd: () => 0.5, seen: new WeakMap() }, sight(w, K));
  const expert = plan(w, 0, 0, false, SKILLS.expert, { rnd: () => 0.5 }, sight(w, SKILLS.expert));
  check('in THE VOID\'s dark a bullet past the light is not there to a line player; the expert sees it and steps aside', v > D.near && v < D.far && inDark.mx === 0 && inDark.mz === 0 && sight(w, SKILLS.expert) === Infinity && Math.abs(expert.mz) > 0.5, `${JSON.stringify(inDark)} vs ${JSON.stringify(expert)}`);
}

{
  const w = floor(), n = 28, R = 1.4;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; fire.emit(w, Math.cos(a) * R, Math.sin(a) * R, a + Math.PI); }
  const p = plan(w, 0, 0, false);
  check('a ring closing on it too tight to walk through: it dashes', p.dash === true, JSON.stringify(p));
  w.hero.dashCd = 0.5;
  check('…and with the dash cooling down it does not ask for one', plan(w, 0, 0, false).dash === false);
}

{
  // a CUT room (v57): with the dash ready, the body it is about to cut through is the point, not a
  // threat — one charging at it from just past dash range is walked into, not backed off from
  const w = floor(), S = T.species.globbo;
  w.gels.push({ alive: true, state: 'active', kind: 'globbo', x: 5, z: 0, r: S.radius, velX: -4, velZ: 0, s: {} });
  const g = w.gels[0], K = { ...SKILLS.average, react: 0, see: 1 };
  const cut = plan(w, 1.4, 0, false, K, { rnd: () => 0.5 }, Infinity, g), shy = plan(w, 1.4, 0, false, K, { rnd: () => 0.5 });
  check('in a CUT room, with the dash ready, it walks straight in at the body it is cutting (and, as a threat, would have hung back)', cut.mx > 0.99 && shy.mx < 0.9, `${JSON.stringify(cut)} vs ${JSON.stringify(shy)}`);
}

{
  const w = floor(), S = T.species.hoppa;
  w.gels.push({ alive: true, state: 'active', kind: 'hoppa', x: 6, z: 0, r: S.radius, velX: 0, velZ: 0, s: { state: 'hop', t: 0.3, tx: 0, tz: 0, y: 2 } });
  const p = plan(w, 0, 0, false), clear = 0.3 * T.hero.speed * Math.hypot(p.mx, p.mz);
  check('a hopper about to land where it stands: it is out from under before the landing', clear > S.radius + T.gel.contactRadius, `${clear.toFixed(2)} u in 0.3 s`);
}

{
  // a live floor: it plays without a NaN and keeps its three lives a while
  const w = createWorld({ seed: 7, mode: 'arcade' }), K = SKILLS.expert, mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(7) };
  let held = null, bad = 0;
  for (let i = 0; i < 40 / T.sim.dt && !w.over; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    if (![held.mx, held.mz, held.ax, held.az].every(Number.isFinite)) bad++;
    step(w, held);
  }
  check('on a live floor it plays forty seconds of ARCADE with every input a number, and lives', !bad && w.hero.alive, `${bad} bad inputs, lives ${w.hero.lives}`);
}

console.log(failed ? `\n✗ bot: ${failed} failed, ${passed} passed` : `✔ bot: ${passed} checks`);
process.exit(failed ? 1 : 0);
