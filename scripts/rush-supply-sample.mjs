// rush-supply-sample.mjs — samples getEnemySchedule()'s spawn-side supply
// ceiling under RUSH, per rush.level, against the real TUNING data.
//
// Q-026 / toko-drop/RUSH_DESIGN.md §3.2: Godot's own (unshipped) Rush spawn
// director had a hard supply ceiling below B tier until telegraphs were made
// to pipeline. This checks whether getEnemySchedule() — tuned for the base
// game's wave pacing, reused under Rush by substituting rush.level for wave
// count — has the same problem. Bare node, no game deps: it's a faithful,
// standalone replica of the schedule loop in main.js's getEnemySchedule(),
// not the loop itself, so re-check this file against main.js if that
// function's logic changes.
//
// Usage: node scripts/rush-supply-sample.mjs [maxLevel]
import { TUNING } from '../toko-drop/js/tuning.js';

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const W = TUNING.waves;
const R = W.rhythm;
function waveKind(w) {
  if (w % R.bossEvery === 0) return 'boss';
  if (w % R.spikeEvery === 0) return 'spike';
  if (w >= R.swarmFrom && w % R.swarmEvery === 0) return 'swarm';
  return 'normal';
}

// One batch = one getEnemySchedule(level) call under Rush (main.js).
function schedule(level, rng) {
  let kind = waveKind(level);
  if (kind === 'boss') kind = 'spike';   // v225: Rush has no boss set pieces
  const isSpike = kind === 'spike', isSwarm = kind === 'swarm';
  const isBreather = kind === 'normal' && waveKind(level - 1) !== 'normal';

  const B = W.budget;
  const rampB = Math.min(level, B.knee);
  const postB = Math.max(0, level - B.knee);
  const base = B.base + rampB * B.ramp + postB * B.post;
  const mod = isSpike ? B.kind.spike : isSwarm ? B.kind.swarm
            : isBreather ? B.kind.breather : B.kind.normal;
  let budget = Math.floor(base * mod);
  if (level < B.early.until) budget = Math.floor(budget * (B.early.base + B.early.step * (level - 1)));

  const POOL = Object.entries(TUNING.rush.pool).map(([name, [min, cost]]) => [name, min, cost]);
  const available = POOL.filter(([, min]) => level >= min);
  const swarmPool = available.filter(([, , c]) => c <= W.variants.swarmCostMax);
  const drawPool = (isSwarm && swarmPool.length) ? swarmPool : available;

  const C = W.caps;
  const cap = isSwarm ? Math.min(C.swarm.max, C.swarm.base + Math.floor(level * C.swarm.per))
                       : Math.min(C.normal.max, C.normal.base + level * C.normal.per);

  const VARIANTS = isSwarm ? W.variants.swarm : W.variants.normal;
  const list = [];
  let spent = 0, t = 0;
  while (spent < budget && list.length < cap) {
    const [type, , cost] = drawPool[Math.floor(rng() * drawPool.length)];
    const variant = VARIANTS[Math.floor(rng() * VARIANTS.length)];
    let entryCost, count;
    if (variant === 'elite')          { entryCost = Math.ceil(cost * W.variants.eliteCost); count = 1; }
    else if (variant === 'elitelite') { entryCost = Math.ceil(cost * W.variants.eliteliteCost); count = 1; }
    else if (variant === 'twin')      { entryCost = Math.ceil(cost * W.variants.twinCost); count = 2; }
    else if (variant === 'group') {
      const cheaper = swarmPool.length ? swarmPool : available;
      const pick = cheaper[Math.floor(rng() * cheaper.length)];
      const cnt = W.variants.group.base + Math.floor(rng() * W.variants.group.rand);
      entryCost = pick[2] * cnt; count = cnt;
    } else { entryCost = cost; count = 1; }
    if (spent + entryCost > budget + B.slack) break;
    list.push({ type, t, count });
    t += isSwarm ? (W.cadence.swarm.min + rng() * W.cadence.swarm.rand)
                 : (W.cadence.normal.min + rng() * W.cadence.normal.rand);
    spent += entryCost;
  }
  const kills = list.reduce((s, e) => s + e.count, 0);
  const dripEnd = list.length ? list[list.length - 1].t : 0;
  return { kind, budget, entries: list.length, kills, dripEnd };
}

const GAP = 1.5;   // waveGapT — the flat breather every clear pays (main.js)
const PAR = { C: 0.5, B: 0.9, A: 1.4, S: 2.0 };   // RUSH_DESIGN.md §3.2
const MAX_LEVEL = Number(process.argv[2]) || 7;
const SAMPLES = 40;   // seeds averaged per level

console.log('level  kind     budget  entries  kills  drip(s)  batch(s)  supply k/s   vs S(2.0)   vs A(1.4)');
for (let level = 1; level <= MAX_LEVEL; level++) {
  let sKills = 0, sDrip = 0, kindSeen = null, sBudget = 0, sEntries = 0;
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const rng = mulberry32(seed * 0x9E3779B1 + level);
    const r = schedule(level, rng);
    sKills += r.kills; sDrip += r.dripEnd; kindSeen = r.kind; sBudget += r.budget; sEntries += r.entries;
  }
  const kills = sKills / SAMPLES, drip = sDrip / SAMPLES, budget = sBudget / SAMPLES, entries = sEntries / SAMPLES;
  const batch = drip + GAP;
  const supply = kills / batch;
  console.log(
    String(level).padEnd(6) + kindSeen.padEnd(9) + budget.toFixed(1).padEnd(8) +
    entries.toFixed(1).padEnd(9) + kills.toFixed(1).padEnd(7) + drip.toFixed(2).padEnd(9) +
    batch.toFixed(2).padEnd(10) + supply.toFixed(2).padEnd(13) +
    (supply >= PAR.S ? 'MEETS' : 'short by ' + (PAR.S - supply).toFixed(2)) + '   ' +
    (supply >= PAR.A ? 'MEETS' : 'short by ' + (PAR.A - supply).toFixed(2))
  );
}
