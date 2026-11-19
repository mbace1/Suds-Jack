#!/usr/bin/env node
// run.mjs — the run's own machines (v126, docs/STATE.md), in bare node: `runPhase` names where a run is, in the
// order the game walks it; a world's boss down leaves the hero safe under WORLD CLEAR; between the worlds the guard
// is the game's grace and not the INVINCIBLE pickup's timer (its ★ chip stays dark); `heroState` reads the dash and
// the guard; and nothing after the director's decision changes a decided run — a run won, a room's end written.
import { readFileSync } from 'node:fs';
import { createWorld, step, api, runPhase } from '../js/sim/world.js?v=156';
import { heroState, hurtHero } from '../js/sim/hero.js?v=156';
import { rooms } from '../js/sim/director/campaign.js?v=156';
import { TUNING as T } from '../js/tuning.js?v=156';

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const dt = T.sim.dt, EVERY = T.waves.rhythm.bossEvery;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const PHASES = ['wave', 'bossDown', 'worldClear', 'transition', 'breather', 'won', 'dead', 'room'];
const level = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
const roomOf = (id) => { const r = rooms().find((x) => x.id === id); return { ...r, level: level(id), turn: false }; };

// a run in world `world`'s boss wave with its bosses up, the hero untouchable (test/bossfight.mjs's `at`)
function atBoss(world, seed) {
  const w = createWorld({ seed, mode: 'arcade', world });
  w.hero.invinc = 1e9;
  step(w, IDLE);
  w.gels = []; w.dir.queue = []; w.dir.wave = world * EVERY - 1; w.dir.gapT = 1e-9;
  step(w, IDLE); step(w, IDLE);
  for (let i = 0; i < 4 / dt && w.dir.queue.some((q) => q.boss); i++) step(w, IDLE);
  for (let i = 0; i < 2 / dt; i++) step(w, IDLE);
  return w;
}

// a world's end, as the run walks it, and the hero's guard through it
{
  const w = atBoss(1, 11), seq = [];
  const note = () => { const p = runPhase(w); if (p !== seq[seq.length - 1]) seq.push(p); };
  note();
  for (const g of w.gels) if (g.alive && g.isBoss) api.kill(w, g);
  w.hero.invinc = 0; w.hero.mercy = 0;
  let hurtInClear = null, grace = false, chip = false;
  for (let i = 0; i < 40 / dt && !(w.world === 2 && runPhase(w) === 'wave'); i++) {
    step(w, IDLE); note();
    const p = runPhase(w), h = w.hero;
    if (p === 'worldClear' && hurtInClear === null) { const lives = h.lives; hurtInClear = api.hurt(w, 'test') || h.lives !== lives; }
    if (p === 'transition') { if (h.invinc > 0) chip = true; if (heroState(h).guard === 'grace') grace = true; }
  }
  const tail = seq.slice(seq.indexOf('bossDown')).join(' → ');
  check('a world\'s end, in order: bossDown → worldClear → transition → breather → wave', seq[0] === 'wave' && tail === 'bossDown → worldClear → transition → breather → wave' && w.world === 2, seq.join(' → '));
  check('…every phase one the reader declares', seq.every((p) => PHASES.includes(p)), seq.join(','));
  check('…the world\'s boss down, nothing hurts the hero under WORLD CLEAR', hurtInClear === false, String(hurtInClear));
  check('…between the worlds the guard is the game\'s grace', grace);
  check('…and not the INVINCIBLE pickup\'s timer: the ★ chip stays dark through the world change', !chip);
}

// the hero's two small machines, read
{
  const h = createWorld({ seed: 1, mode: 'arcade' }).hero, s = [];
  s.push(heroState(h));
  h.dash = 0.1; s.push(heroState(h));
  h.dash = 0; h.dashCd = 0.3; h.mercy = 0.5; s.push(heroState(h));
  h.mercy = 0; h.invinc = 2; h.grace = 1; s.push(heroState(h));
  h.invinc = 0; s.push(heroState(h));
  const k = s.map((x) => `${x.dash}/${x.guard}`).join(' ');
  check('heroState: the dash (ready, dashing, cooldown) and what guards the hero', k === 'ready/null dashing/dash cooldown/mercy cooldown/pickup cooldown/grace', k);
}

// a run won on a step takes nothing after it: the puddle under the hero lands only while the run is open
{
  const one = (win) => {
    const w = createWorld({ seed: 5, mode: 'arcade' });
    step(w, IDLE);
    w.gels = []; w.dir.queue = [];
    w.director = { step(w) { if (win) { w.won = true; w.over = true; w.events.push({ type: 'won' }); } } };
    w.hero.invinc = 0; w.hero.mercy = 0; w.hero.dash = 0;
    w.hazards.push({ x: w.hero.x, z: w.hero.z, r: 3, life: 5, src: 'test' });
    const lives = w.hero.lives;
    step(w, IDLE);
    return { lost: lives - w.hero.lives, hurt: w.events.some((e) => e.type === 'hurt' || e.type === 'over'), phase: runPhase(w) };
  };
  const ctl = one(false), won = one(true);
  check('control: a puddle under the hero hurts it', ctl.lost === 1 && ctl.hurt && ctl.phase === 'wave', JSON.stringify(ctl));
  check('a run won on this step: no life lost after it, no hurt under the WON screen', won.lost === 0 && !won.hurt && won.phase === 'won', JSON.stringify(won));
  const w = createWorld({ seed: 5, mode: 'arcade' }), lives = w.hero.lives;
  w.over = true;
  check('…and hurtHero refuses a decided run', hurtHero(w, 'test') === false && w.hero.lives === lives);
}

// a room's end written on a step is what the step leaves: no hit after its grade
{
  const R = roomOf('the-pull'), K = R.level.goal.kills;
  const one = (meet) => {
    const w = createWorld({ seed: 3, mode: 'campaign', room: R });
    w.hero.invinc = 1e9;
    for (let i = 0; i < 20; i++) step(w, IDLE);
    w.hero.invinc = 0; w.hero.mercy = 0; w.hero.dash = 0;
    w.hazards.push({ x: w.hero.x, z: w.hero.z, r: 3, life: 5, src: 'test' });
    if (meet) w.kills = K;
    const hits = w.hits || 0;
    step(w, IDLE);
    return { end: w.events.find((e) => e.type === 'roomEnd') ?? null, hits: (w.hits || 0) - hits, result: w.roomResult ?? null, phase: runPhase(w) };
  };
  const ctl = one(false), met = one(true);
  check('control: in a running room the puddle lands', ctl.hits === 1 && !ctl.end && ctl.phase === 'wave', JSON.stringify({ hits: ctl.hits, end: !!ctl.end, phase: ctl.phase }));
  check('a room cleared on this step: graded, and no hit after the grade', met.end?.outcome === 'clear' && met.hits === 0 && met.result?.hits === met.end.hits && met.phase === 'room', JSON.stringify({ end: met.end && { outcome: met.end.outcome, hits: met.end.hits }, hits: met.hits, phase: met.phase }));
}

// a death reads as one, in the arcade and in a room
{
  const w = createWorld({ seed: 9, mode: 'arcade' });
  step(w, IDLE);
  w.hero.lives = 1; w.hero.invinc = 0; w.hero.mercy = 0;
  api.hurt(w, 'test');
  const r = createWorld({ seed: 3, mode: 'campaign', room: roomOf('the-pull') });
  step(r, IDLE);
  r.hero.lives = 1; r.hero.invinc = 0; r.hero.mercy = 0;
  api.hurt(r, 'test'); step(r, IDLE);
  check('a death is "dead", in the arcade and in a room; a fresh world is null-safe', runPhase(w) === 'dead' && runPhase(r) === 'dead' && r.roomResult?.outcome === 'dead' && runPhase(null) === null, `${runPhase(w)} ${runPhase(r)}`);
}

console.log(failed ? `\n✗ run: ${failed} failed, ${passed} passed` : `✔ run: ${passed} checks`);
process.exit(failed ? 1 : 0);
