import { TUNING as T } from './tuning.js?v=69';

/**
 * THE MODE REGISTRY — this game is a laboratory, not one experience.
 *
 * PURE, HYPER and TRUCK are not "difficulty settings", they are three
 * different guesses about what this body of movement is FOR, and there will
 * be more: platformer courses, speed runs, wall-running, whatever the next
 * idea is. Bone Dust started as a Devil Daggers arena clone and shipped as a
 * directional bullet-hell dodger; the point of a lab is that the shipped
 * game is allowed to be a surprise.
 *
 * So a mode is DECLARED, not branched. Everything that varies between
 * experiments lives in one object here, and main.js asks the registry
 * instead of asking `mode === 'pure'` in twelve places — which is exactly
 * how TRUCK got lost: v33's notes promise "Mode cycles PURE -> HYPER ->
 * TRUCK", but the toggle was a two-way flip and truck.js was never imported,
 * so a whole named mode existed only on paper. A registry cannot lose a mode:
 * if it is in this list it is in the cycle, and the gate walks the list.
 *
 * ADDING AN EXPERIMENT IS ONE ENTRY. No new branches anywhere.
 */

/** Movement vocabulary. A mode turns these on; the player reads them. This
 *  is the menu of things an experiment can be built out of — extend it here
 *  and every mode can immediately opt in. */
export const ABILITY_DEFAULTS = {
  // NB: main's tuning sets maxJumps to 1 deliberately — "extra height comes
  // from a downward shotgun, not a free air jump". That is a DD design call,
  // so it is the DEFAULT here rather than something a mode has to remember.
  // A mode that wants a freer body says so explicitly (see MOVE).
  jumps: T.player.maxJumps,
  dash: true,      // Shift / B — i-frames through projectiles
  reap: false,     // spend the bone-yard
  glide: false,    // hold jump at apex to fall slowly
  airDash: 0,      // extra dashes usable while airborne (0 = ground-ish only)
  wallRun: false,  // NEEDS WALLS: the disc arena has none. Waiting on a
                   // court/course arena — declared so the vocabulary exists.
};

/**
 * @typedef {Object} Mode
 * @property {string} id            registry key, also the ?mode= value
 * @property {string} name          shown on the menu
 * @property {string} blurb         one line: what this experiment asks
 * @property {string} controls      the control line for this experiment
 * @property {Object} abilities     overrides on ABILITY_DEFAULTS
 * @property {'ddSpawnset'|'pulse'|'none'} director  what makes pressure
 * @property {'oneTouch'|'clock'} lethality          what killing you means
 * @property {'disc'|'track'} arena                  what you stand on
 * @property {'void'|'clamp'} edge                   what the rim does
 * @property {string} hiKey         localStorage best-score key (per experiment)
 */

/** @type {Mode[]} */
export const MODES = [
  {
    id: 'pure',
    name: 'PURE',
    blurb: 'the Devil Daggers spine — one touch, a fixed and learnable sky',
    controls: 'WASD move · tap fire = burst · hold = stream · Space jump ×2',
    abilities: { dash: false, reap: false }, // the DD body: one jump, shotgun for height
    director: 'ddSpawnset',   // the fixed spawnset: identical every run
    lethality: 'oneTouch',
    arena: 'disc',
    edge: 'void',
    hiKey: 'hyperDaggerHi',
  },
  {
    id: 'hyper',
    name: 'HYPER',
    blurb: 'the remix — a draining clock, dash and REAP, pressure that adapts',
    controls: 'WASD · fire · Space ×2 · Shift dash · R reap',
    abilities: { dash: true, reap: true },
    director: 'pulse',        // the budgeted director + pressure ceiling
    lethality: 'clock',
    arena: 'disc',
    edge: 'void',
    hiKey: 'hyperDaggerHiHyper',
  },
  {
    id: 'truck',
    name: 'TRUCK',
    blurb: 'Clustertruck — the floor is leaving, keep your feet off it',
    controls: 'WASD · Space ×2 · Shift dash · do not stop',
    abilities: { jumps: 2, dash: true, reap: false, glide: true }, // a track needs air control
    director: 'none',         // the track IS the pressure
    lethality: 'oneTouch',
    arena: 'track',
    edge: 'open',             // falling off is the failure state
    hiKey: 'hyperDaggerHiTruck',
  },
  {
    id: 'move',
    name: 'MOVE',
    blurb: 'the movement playground — no threats, every ability on, go feel it',
    controls: 'WASD · Space ×3 · Shift dash · hold Space to glide',
    // the lab bench: nothing is trying to kill you, so the only thing under
    // test is the body. New mechanics land here FIRST, where a bad one is
    // obvious in ten seconds instead of hidden behind a fight.
    abilities: { jumps: 3, dash: true, reap: true, glide: true, airDash: 1 },
    director: 'none',
    lethality: 'none',
    arena: 'disc',
    edge: 'clamp',            // you cannot fall out of the playground
    hiKey: null,              // nothing to score — it is a bench
  },
];

const BY_ID = new Map(MODES.map(m => [m.id, m]));

/** The registry never returns undefined: an unknown id falls back to the
 *  first mode, so a stale localStorage value or a typo'd ?mode= cannot
 *  boot the game into a half-configured state. */
export function modeById(id) { return BY_ID.get(id) ?? MODES[0]; }

/** Cycle order IS registry order — a mode in the list is always reachable. */
export function nextModeId(id) {
  const i = MODES.findIndex(m => m.id === id);
  return MODES[(i + 1 + MODES.length) % MODES.length].id;
}

/** Resolve a mode's declared abilities against the defaults. */
export function abilitiesOf(mode) {
  return { ...ABILITY_DEFAULTS, ...(mode.abilities ?? {}) };
}

/** Apply a mode's movement vocabulary to the player. One call, so no mode
 *  can half-configure the body by forgetting a field somewhere. */
export function applyAbilities(player, mode) {
  const a = abilitiesOf(mode);
  player.abilities = a;
  player.maxJumps = a.jumps;
  player.dashEnabled = a.dash;
  player.glideEnabled = a.glide;
  player.airDashes = a.airDash;
  // Pass the declared edge STRAIGHT through — 'void' | 'clamp' | 'open'.
  // (An earlier cut folded anything-not-clamp into 'open', which on the disc
  //  modes meant no floor at all: the body fell through the arena forever.)
  player.edgeMode = mode.edge;
  // A track supplies its own floor per frame; the disc's is y = 0.
  player.floorY = mode.arena === 'track' ? -Infinity : 0;
  return a;
}
