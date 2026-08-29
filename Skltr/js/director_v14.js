import { COST } from './enemy.js?v=12';

// SKLTR v14 encounter pacing shim.
// Main's spawn loop stays simple; these live costs turn it into authored pressure
// windows without changing input/combat code. The clock resets after a long idle,
// which naturally happens between runs.
const BASE = { chaser: 1.15, turret: 2.2, flyer: 2.8, boss: 30, boss2: 22, boss3: 34 };
let runStart = performance.now();
let lastAccess = runStart;
let phaseId = -1;
let phaseEntered = runStart;

const phases = [
  // 0–60: teach motion pressure — mostly hounds, rare tortoise.
  { end: 60,  name: 'HUNT',      mul: { chaser: 0.75, turret: 2.8, flyer: 99 } },
  // 60–75: recovery / traversal window.
  { end: 75,  name: 'BREATHE',   mul: { chaser: 18, turret: 18, flyer: 18 } },
  // 75–150: introduce lane denial.
  { end: 150, name: 'CROSSFIRE', mul: { chaser: 1.0, turret: 0.78, flyer: 5.0 } },
  // 150–165: short reset.
  { end: 165, name: 'BREATHE',   mul: { chaser: 20, turret: 20, flyer: 20 } },
  // 165–250: vertical attention enters the mix.
  { end: 250, name: 'VERTICAL',  mul: { chaser: 1.0, turret: 1.05, flyer: 0.72 } },
  // 250–265: reset before first major peak.
  { end: 265, name: 'BREATHE',   mul: { chaser: 22, turret: 22, flyer: 22 } },
  // 265–370: all three roles overlap.
  { end: 370, name: 'PRESSURE',  mul: { chaser: 0.85, turret: 0.9, flyer: 0.9 } },
  // 370–390: longer breath.
  { end: 390, name: 'BREATHE',   mul: { chaser: 24, turret: 24, flyer: 24 } },
  // 390–510: escalation, Risk-of-Rain style mess but still role-based.
  { end: 510, name: 'OVERDRIVE', mul: { chaser: 0.68, turret: 0.78, flyer: 0.78 } },
  // 510–525: final reset.
  { end: 525, name: 'BREATHE',   mul: { chaser: 26, turret: 26, flyer: 26 } },
  // 525–600+: final 75-second push.
  { end: 1e9, name: 'LAST STAND',mul: { chaser: 0.58, turret: 0.68, flyer: 0.68 } },
];

function elapsed(now) {
  // A real run has frequent director accesses. A long idle means title/death screen;
  // reset so the next run starts from HUNT rather than inheriting old pacing.
  if (now - lastAccess > 8000) {
    runStart = now;
    phaseId = -1;
    phaseEntered = now;
  }
  lastAccess = now;
  return (now - runStart) / 1000;
}

function phaseAt(t, now) {
  const idx = phases.findIndex(p => t < p.end);
  const id = idx < 0 ? phases.length - 1 : idx;
  if (id !== phaseId) {
    phaseId = id;
    phaseEntered = now;
  }
  return phases[id];
}

function liveCost(type) {
  const now = performance.now();
  const t = elapsed(now);
  const p = phaseAt(t, now);
  if (!(type in BASE)) return 1;

  // Bosses stay controlled by main's boss timer; don't distort them here.
  if (type.startsWith('boss')) return BASE[type];

  let cost = BASE[type] * (p.mul[type] ?? 1);

  // Consume the credits accumulated during recovery instead of dumping a full cap
  // instantly when the next pressure phase begins. First ~4s of a live phase are
  // deliberately expensive, then settle quickly into the authored mix.
  if (p.name !== 'BREATHE') {
    const sincePhase = (now - phaseEntered) / 1000;
    if (sincePhase < 4) cost *= 1 + (4 - sincePhase) * 1.7;
  }

  return cost;
}

for (const type of Object.keys(BASE)) {
  Object.defineProperty(COST, type, {
    configurable: true,
    enumerable: true,
    get: () => liveCost(type),
  });
}

// Debug hook for balancing from the browser console.
window._skltrDirector = () => {
  const now = performance.now();
  const t = elapsed(now);
  const p = phaseAt(t, now);
  return { seconds: Math.round(t), phase: p.name,
    costs: { chaser: liveCost('chaser'), turret: liveCost('turret'), flyer: liveCost('flyer') } };
};
