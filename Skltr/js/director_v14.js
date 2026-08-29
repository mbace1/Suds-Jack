import { COST } from './enemy.js?v=12';

// SKLTR v16 arena encounter director.
// The existing terrain already contains raised platforms, ramps, trenches, hazards,
// moving platforms and objective beacons. This director turns the 10-minute run into
// three authored combat-space problems separated by traversal/recovery windows.
const BASE = { chaser: 1.15, turret: 2.2, flyer: 2.8, boss: 30, boss2: 22, boss3: 34 };
let runStart = performance.now();
let lastAccess = runStart;
let phaseId = -1;
let phaseEntered = runStart;

const phases = [
  // Arena 1: lateral movement. Hounds dominate and tortoises appear as anchors.
  { end: 70,  name: 'ARENA 1 · HUNT', arena: 'HOUND RUN',
    mul: { chaser: 0.62, turret: 2.5, flyer: 99 } },
  // Force a genuine release/traversal beat rather than carrying a full swarm onward.
  { end: 90,  name: 'TRAVERSE', arena: 'LINK 1',
    mul: { chaser: 30, turret: 30, flyer: 30 } },

  // Arena 2: lane denial + elevation. Tortoises become the structural threat.
  { end: 180, name: 'ARENA 2 · CROSSFIRE', arena: 'TORTOISE HEIGHTS',
    mul: { chaser: 1.05, turret: 0.58, flyer: 5.5 } },
  { end: 205, name: 'TRAVERSE', arena: 'LINK 2',
    mul: { chaser: 32, turret: 32, flyer: 32 } },

  // Arena 3: vertical attention. Wasps pull the player into jumps / air-dashes while
  // a smaller ground ecology prevents simply camping a raised surface.
  { end: 310, name: 'ARENA 3 · VERTICAL', arena: 'WASP LIFT',
    mul: { chaser: 1.0, turret: 1.25, flyer: 0.52 } },
  { end: 335, name: 'TRAVERSE', arena: 'LINK 3',
    mul: { chaser: 34, turret: 34, flyer: 34 } },

  // Mixed ecology: all learned movement problems overlap, but composition drives
  // difficulty more than raw HP inflation.
  { end: 450, name: 'MIXED ARENA', arena: 'THE MACHINE YARD',
    mul: { chaser: 0.72, turret: 0.72, flyer: 0.72 } },
  { end: 475, name: 'BREATHE', arena: 'FINAL LINK',
    mul: { chaser: 36, turret: 36, flyer: 36 } },

  // Final push: dense role combinations leading into the existing boss cadence.
  { end: 570, name: 'OVERDRIVE', arena: 'KILL FLOOR',
    mul: { chaser: 0.55, turret: 0.62, flyer: 0.62 } },
  { end: 1e9, name: 'LAST STAND', arena: 'TEN MINUTE CLIMAX',
    mul: { chaser: 0.46, turret: 0.54, flyer: 0.54 } },
];

function elapsed(now) {
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
    // Lightweight event lets HUD/dev tools react without coupling this module to main.
    window.dispatchEvent(new CustomEvent('skltr-arena', { detail: phases[id] }));
  }
  return phases[id];
}

function liveCost(type) {
  const now = performance.now();
  const t = elapsed(now);
  const p = phaseAt(t, now);
  if (!(type in BASE)) return 1;
  if (type.startsWith('boss')) return BASE[type];

  let cost = BASE[type] * (p.mul[type] ?? 1);
  if (p.name !== 'TRAVERSE' && p.name !== 'BREATHE') {
    const sincePhase = (now - phaseEntered) / 1000;
    // Prevent banked credits from dumping an entire arena population on frame one.
    if (sincePhase < 5) cost *= 1 + (5 - sincePhase) * 1.55;
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

window._skltrDirector = () => {
  const now = performance.now();
  const t = elapsed(now);
  const p = phaseAt(t, now);
  return {
    seconds: Math.round(t), phase: p.name, arena: p.arena,
    costs: { chaser: liveCost('chaser'), turret: liveCost('turret'), flyer: liveCost('flyer') }
  };
};
