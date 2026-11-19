#!/usr/bin/env node
// curve.mjs — how hard each arcade world is on its own (v59). A bot plays a
// world with the three lives ARCADE gives back at every world's door
// (TUNING.worlds.heal), until the floor opens under its beaten
// boss (the world cleared; the last world's boss wins the run), it goes down,
// or the cap. Per world and bot: how often it clears, the lives it costs, which
// of the world's eight waves the deaths fall on, and what does the killing.
// Read across the worlds this is the arcade's difficulty curve, a world at a
// time — the shape a whole run (scripts/reach.mjs) blurs, since a run that
// dies in world 5 says nothing about world 6.
//
// A world is walked in with what a run carries to its door: the weapon pod and
// the DASH level last the whole run (sim/hero.js: a hit takes a level, never
// the pod), and a world started with the bare gun is far harder than the one a
// player arrives in — on v58 the good bot cleared the boiler room one time in
// three started bare, five times in six arriving from the cistern. So `--kit chain`
// (the default) plays each seed's worlds in order: each is walked into with the
// kit the run had when the world before it opened its floor — cleared on its
// first try, or on a retry from its door on a new seed (up to RETRY), or, never
// cleared, carried in as it went in. Only a world's first try is counted.
// HARDCADE carries its lives too. `--kit none` starts every world bare.
//
//   node scripts/curve.mjs                                   worlds 1-9, sharp and average, 8 seeds
//   node scripts/curve.mjs --worlds 4,5,6 --skills expert --seeds 12 --mode hardcade
//   node scripts/curve.mjs --part 1/4 --json out.json        a quarter of the runs (run four at once), as JSON
//   node scripts/curve.mjs --seeds 24 --from 24 …            the next 24 seeds, to add to a first 24
//   node scripts/curve.mjs --offsets 0,0,-2,-1,… --entry 2,1  a trial of the curve's numbers, the tuning untouched
//   node scripts/curve.mjs --kit none …                      every world started with the bare gun (v59's first instrument)
//   node scripts/curve.mjs --merge a.json,b.json,…           the parts, as one table
import { writeFileSync, readFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=156';
import { TUNING as T } from '../js/tuning.js?v=156';
import { SKILLS, prng, think } from './bot.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const WORLDS = opt('--worlds', '1,2,3,4,5,6,7,8,9').split(',').map(Number), SKILL_LIST = opt('--skills', 'sharp,average').split(','),
  SEEDS = +opt('--seeds', 8), FROM = +opt('--from', 0), MODE = opt('--mode', 'arcade'), CAP = +opt('--cap', 420);
const PER = T.waves.rhythm.bossEvery, KIT = opt('--kit', 'chain'), RETRY = 2;
// a trial of the curve's own numbers (TUNING.waves.gentle), without touching the tuning:
// --offsets 0,0,-2,… a world's pressure offset in waves, --entry 2,1 its first waves' breather
if (opt('--offsets', null)) T.waves.gentle.world = opt('--offsets').split(',').map(Number);
if (opt('--entry', null)) T.waves.gentle.entry = opt('--entry').split(',').map(Number);
// --rooms 1,1,…,0.75 each world's share of the bodies (TUNING.worlds.list `room`)
if (opt('--rooms', null)) opt('--rooms').split(',').map(Number).forEach((r, i) => { if (T.worlds.list[i]) T.worlds.list[i].room = r; });

// what a run carries from world to world (sim/hero.js): the weapon pod, the DASH level, and in
// HARDCADE, which gives no lives back, the lives
export const kitOf = (w) => ({ weapon: w.hero.weapon ? { ...w.hero.weapon } : null, dash: w.hero.dashLevel, lives: w.mode === 'hardcade' ? w.hero.lives : null });
const wear = (w, kit) => { if (!kit) return; w.hero.weapon = kit.weapon ? { ...kit.weapon } : null; w.hero.dashLevel = kit.dash; if (kit.lives) w.hero.lives = kit.lives; };
export const kitName = (k) => !k ? 'bare' : `${k.weapon ? `${k.weapon.fam}${k.weapon.level}` : 'gun'}/d${k.dash}`;

export function playWorld(world, seed, K, mode = MODE, cap = CAP, kit = null) {
  const w = createWorld({ seed, mode, world }), mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed) };
  wear(w, kit);
  const first = (world - 1) * PER;   // the wave before this world's first
  const deaths = [];
  let held = null, cleared = false, out = null;
  for (let i = 0; i < cap / T.sim.dt && !w.over && !cleared; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    for (const e of w.events) {
      if (e.type === 'hurt') deaths.push({ wave: Math.max(1, w.wave - first), by: e.by ?? '?', boss: w.gels.some((g) => g.alive && g.isBoss) });
      if (e.type === 'worldOut' || e.type === 'won') { cleared = true; out = kitOf(w); }
    }
  }
  return { world, seed, cleared, down: !!w.over && !cleared, time: Math.round(w.time), wave: Math.max(0, w.wave - first), lost: deaths.length, deaths,
    kitIn: kit ? kitName(kit) : 'bare', kitOut: out };
}

// one seed's worlds in order, each walked into with the kit the run had at its door
export function playChain(worlds, s, K, mode = MODE, cap = CAP) {
  const rows = [];
  let kit = null;
  for (const wn of worlds) {
    const r = playWorld(wn, 501 + s * 31 + wn * 7, K, mode, cap, kit);
    rows.push(r);
    let out = r.kitOut;
    for (let a = 1; !out && a <= RETRY; a++) out = playWorld(wn, 501 + s * 31 + wn * 7 + 7919 * a, K, mode, cap, kit).kitOut;
    kit = out ?? kit;
    if (mode === 'hardcade' && kit && !out) kit = { ...kit, lives: null };   // never cleared: its lives are the door's three again
    // the next world's door gives lives back as sim/worlds.js swap() does (TUNING.worlds.heal: HARDCADE one, v62)
    else if (kit?.lives) kit = { ...kit, lives: Math.min(T.hero.lives, kit.lives + (T.worlds.heal?.[mode] ?? 0)) };
  }
  return rows.map(({ kitOut, ...r }) => r);
}

function table(rows) {
  const out = [], skills = [...new Set(rows.map((r) => r.skill))], worlds = [...new Set(rows.map((r) => r.world))].sort((a, b) => a - b);
  const walked = rows.some((r) => r.kitIn && r.kitIn !== 'bare');   // read off the rows, so a merge of bare runs says so
  out.push(`${MODE.toUpperCase()} — each world ${walked ? 'walked into with the kit the run carried to its door' : 'started bare'}, ${walked && MODE === 'hardcade' ? 'with the lives it carried' : 'with three lives'}\n`);
  out.push(`world  ${skills.map((s) => `${s.padEnd(8)} clears  lives  time`).join('   ')}`);
  for (const wn of worlds) {
    const cells = skills.map((s) => {
      const r = rows.filter((x) => x.world === wn && x.skill === s), n = r.length || 1;
      const clear = r.filter((x) => x.cleared).length / n, lost = r.reduce((a, x) => a + x.lost, 0) / n, t = r.filter((x) => x.cleared).map((x) => x.time).sort((a, b) => a - b);
      return `${''.padEnd(8)} ${String(Math.round(clear * 100)).padStart(4)}%  ${lost.toFixed(1).padStart(5)}  ${t.length ? `${t[t.length >> 1]}s`.padStart(5) : '    –'}`;
    });
    out.push(`  ${wn}    ${cells.join('   ')}`);
  }
  // what the runs walked in with
  out.push(`\nwhat each world was walked into with (pod and level / DASH level), first tries`);
  for (const s of skills) {
    const cells = worlds.map((wn) => {
      const r = rows.filter((x) => x.world === wn && x.skill === s), n = r.length || 1;
      const pod2 = r.filter((x) => /[a-z]2\//.test(x.kitIn ?? '')).length, pod = r.filter((x) => /^(spread|burst|laser|rapid|shotgun)/.test(x.kitIn ?? '')).length, dash = r.filter((x) => /\/d[12]/.test(x.kitIn ?? '')).length;
      return `w${wn} pod ${Math.round((100 * pod) / n)}% (L2 ${Math.round((100 * pod2) / n)}%) dash ${Math.round((100 * dash) / n)}%`;
    });
    out.push(`  ${s.padEnd(7)} ${cells.join(' · ')}`);
  }
  // where the lives go: by wave of the world (8 is its boss), and what took them
  for (const s of skills) {
    out.push(`\n${s}: lives lost by the world's wave (1-${PER}, ${PER} is the boss), and what took them`);
    for (const wn of worlds) {
      const d = rows.filter((x) => x.world === wn && x.skill === s).flatMap((x) => x.deaths), by = {};
      const per = Array.from({ length: PER }, (_, i) => d.filter((x) => Math.min(PER, x.wave) === i + 1).length);
      for (const x of d) by[x.by] = (by[x.by] || 0) + 1;
      out.push(`  world ${wn}: ${per.join(' ')}   ${Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    }
  }
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (opt('--merge', null)) {
    const rows = opt('--merge').split(',').flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
    console.log(table(rows));
  } else {
    const [pi, pn] = (opt('--part', '1/1')).split('/').map(Number), jobs = [], rows = [];
    if (KIT === 'chain') {
      for (const skill of SKILL_LIST) for (let s = FROM; s < FROM + SEEDS; s++) jobs.push({ skill, s });
      jobs.forEach((j, i) => { if (i % pn !== pi - 1) return; for (const r of playChain(WORLDS, j.s, SKILLS[j.skill])) rows.push({ skill: j.skill, ...r }); });
    } else {
      for (const skill of SKILL_LIST) for (const wn of WORLDS) for (let s = FROM; s < FROM + SEEDS; s++) jobs.push({ skill, wn, seed: 501 + s * 31 + wn * 7 });
      jobs.forEach((j, i) => { if (i % pn !== pi - 1) return; const { kitOut, ...r } = playWorld(j.wn, j.seed, SKILLS[j.skill]); rows.push({ skill: j.skill, ...r }); });
    }
    if (opt('--json', null)) writeFileSync(opt('--json'), JSON.stringify(rows));
    else console.log(table(rows));
  }
}
