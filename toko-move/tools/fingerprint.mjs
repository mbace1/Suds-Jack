// Toko Move — the Helsinki graph fingerprint: what a network refresh MOVED.
//
// test/city-build.mjs freezes the board the game is built on (every anchor,
// link and line) and fails when the HSL pack moves it. This prints exactly what
// moved, so adopting a refresh is a reading job, not a hunt; --write accepts it.
// Same fingerprint function as the gate — keep the two in step.
//
//   node toko-move/tools/fingerprint.mjs            # diff against the frozen board
//   node toko-move/tools/fingerprint.mjs --write    # accept the current pack's board
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildRealHelsinki } from '../js/real-helsinki.js';

const here = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'));
const c = buildRealHelsinki(pack);
export const fingerprint = city => [
  ...city.nodes.map(n => `N ${n.id} ${n.name} [${n.tags.join('|')}] c${n.capacity} @${n.x.toFixed(2)},${n.y.toFixed(2)}`).sort(),
  ...city.edges.map(e => `E ${[e.a, e.b].sort().join('-')} ${e.mode} t${e.time} c${e.capacity}`).sort(),
  ...city.lines.map(l => `L ${l.label} ${l.mode} ${l.nodes.join('>')}`).sort(),
].join('\n');

const FILE = join(here, '../test/helsinki-graph.fingerprint');
const was = readFileSync(FILE, 'utf8').trim().split('\n'), now = fingerprint(c).trim().split('\n');
const gone = was.filter(x => !now.includes(x)), added = now.filter(x => !was.includes(x));
console.log(gone.length || added.length ? `GONE\n  ${gone.join('\n  ')}\nNEW\n  ${added.join('\n  ')}` : 'the board did not move');
if (process.argv.includes('--write')) { writeFileSync(FILE, now.join('\n') + '\n'); console.log(`wrote ${FILE}`); }
