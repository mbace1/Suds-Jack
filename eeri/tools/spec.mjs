// EERI — the port spec, emitted as data.
//
// The Godot port is produced FROM this build's version updates. Prose is a
// fine way to say why something changed and a terrible way to carry a
// number: `VERSIONS.md` says the dig stroke is 0.46s in a sentence, and a
// port reading that sentence has copied a number by hand — which is the
// same class of failure as a precache list a token behind the page, and
// this repo has shipped that one more than once.
//
// So the seam is a FILE. Everything the port needs to agree with this
// build about is emitted here, straight out of the modules that the game
// itself reads, and never re-typed:
//
//   budget   the kid's reach, speeds, the ride costs, the telegraph floor
//            and every enemy clock — js/parts.js is the only source
//   rooms    all twelve levels COMPILED: the tile grid, every part with
//            its position, the spawn, the finish. A port does not need to
//            reimplement parts.js to build a level — the grid IS the
//            collision truth and `solidChars` says which glyphs are solid.
//   report   what each level is FOR, in the report card's own numbers, so
//            the port can tell a level that plays thin from one that is
//            teaching.
//
// What is deliberately NOT here: anything about how this build DRAWS.
// three.js, the cutout diorama in js/layers.js, the FX pool, the craft
// materials — the JavaScript build tests VERTICAL and Godot tests
// LANDSCAPE, so presentation is exactly the part the two are allowed to
// disagree about. See PORT.md.
//
// Run: node eeri/tools/spec.mjs [outfile]     (default eeri/spec/eeri.json)

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROOMS } from '../js/rooms.js?v=44';
import {
  compile, estimate, deadAir, DEAD_AIR, LEVEL, REACH, SPEED, GIZMO, TARP_RISE,
  MACHINE_SPEED, MACHINE_REACH, RIDE, TELL, CLOCK, TILES, SOLID_CHARS,
  BELT_CHARS, TARP_CHAR, WATER_CHAR, CLIMB_CHAR, W, H, GROUND,
} from '../js/parts.js?v=44';
import { labelOf, slugOf, PER_WORLD } from '../js/levelid.js?v=44';
import { PROPS, SCENERY, withDefaults } from '../js/scenery.js?v=44';

const here = dirname(fileURLToPath(import.meta.url));

// The version is READ, not typed: VERSIONS.md's top heading is the release,
// and a spec that disagrees with the log about which build it describes is
// worse than no spec at all.
const log = readFileSync(resolve(here, '..', 'VERSIONS.md'), 'utf8');
const version = (log.match(/^## v([\d.]+)/m) || [, null])[1];
if (!version) throw new Error('spec: no "## vN.N" heading found in VERSIONS.md');

// Parts carry a `stamp` closure and a back-reference to their own part; both
// are this build's plumbing and neither means anything to a port.
const clean = (v) => JSON.parse(JSON.stringify(v, (k, x) =>
  (k === 'part' || k === 'parts' || k === 'stamp' || typeof x === 'function') ? undefined : x));

const levels = ROOMS.map((room, i) => {
  const r = compile(room);
  const d = deadAir(room);
  const e = estimate(room);
  const len = Math.max(1, (r.finish?.x ?? W) - r.spawn.kid.x);
  return {
    index: i,
    id: slugOf(i, ROOMS.length),
    label: labelOf(i, ROOMS.length),
    world: Math.floor(i / PER_WORLD) + 1,
    name: room.name,
    idea: room.idea || null,
    // the collision truth, one string per tile row, row 0 at the TOP
    grid: r.grid.map((row) => row.join('')),
    spawn: r.spawn, finish: r.finish, exit: r.exit, gate: r.gate,
    machines: clean(r.machines), obstacles: clean(r.obstacles),
    robots: clean(r.robots), hazards: clean(r.hazards), ball: clean(r.ball),
    belts: clean(r.belts), tarps: clean(r.tarps), hoists: clean(r.hoists),
    pipes: clean(r.pipes), ladders: clean(r.ladders), water: clean(r.water),
    girder: clean(r.girder), bank: clean(r.bank), wall: clean(r.wall),
    bolts: clean(r.bolts), golden: clean(r.golden), blueprint: clean(r.blueprint),
    checkpoint: clean(r.checkpoint), flag: clean(r.flag), shots: clean(r.shots),
    // what the level is FOR, in the report card's numbers
    report: {
      lengthTiles: +len.toFixed(1),
      asks: d.asks,
      asksPer10: +(d.asks / len * 10).toFixed(2),
      worstDeadAir: d.worst,
      worstDeadAirAt: d.where,
      learnedSeconds: +e.total.toFixed(1),
      onFootShare: +e.onFoot.toFixed(3),
    },
  };
});

const spec = {
  game: 'eeri',
  version,
  generated: 'node eeri/tools/spec.mjs',
  // The one sentence a porter has to read before the numbers.
  contract: 'This file is the DESIGN of Eeri, not its presentation. Every '
    + 'number here is emitted from js/parts.js and js/rooms.js and must not '
    + 'be re-typed downstream. How the game is drawn, framed and controlled '
    + 'is deliberately absent: the JavaScript build tests VERTICAL, the '
    + 'Godot port tests LANDSCAPE.',
  world: { widthTiles: W, heightTiles: H, groundTop: GROUND, perWorld: PER_WORLD },
  tiles: {
    map: TILES, solidChars: SOLID_CHARS, beltChars: BELT_CHARS,
    tarpChar: TARP_CHAR, waterChar: WATER_CHAR, climbChar: CLIMB_CHAR,
  },
  budget: {
    reach: REACH, speed: SPEED, gizmo: GIZMO, tarpRise: +TARP_RISE.toFixed(4),
    machineSpeed: MACHINE_SPEED, machineReach: MACHINE_REACH, ride: RIDE,
  },
  clocks: { telegraphFloor: TELL, ...CLOCK },
  levelCounts: { ...LEVEL, deadAirFloor: DEAD_AIR },
  // Scenery is visual and the port draws its own — but WHERE a prop stands
  // is a composition decision, not a rendering one, so the rows travel and
  // the shapes do not. `props` says which fields each type carries.
  scenery: {
    props: PROPS,
    placed: Object.fromEntries(Object.entries(SCENERY)
      .map(([w, rows]) => [w, rows.map(withDefaults)])),
  },
  levels,
};

// The bytes, exactly as they are written — so the gate can compare the
// committed file against a fresh build without knowing how it is formatted.
export const SPEC = spec;
export const SPEC_PATH = resolve(here, '..', 'spec', 'eeri.json');
export const serialise = () => JSON.stringify(spec, null, 2) + '\n';

// CLI: `node eeri/tools/spec.mjs [outfile]`
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const out = process.argv[2] || SPEC_PATH;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, serialise());
  const kb = (JSON.stringify(spec).length / 1024).toFixed(0);
  console.log(`eeri spec v${version} → ${out}  (${levels.length} levels, ${kb} KB)`);
}
