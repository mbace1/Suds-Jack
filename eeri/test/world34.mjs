// Structural gate for the experimental World 3/4 pack.
// Run: node eeri/test/world34.mjs

import { WORLD34_ROOMS } from '../js/world34-rooms.js?v=51';
import { check, estimate, LEVEL, W } from '../js/parts.js?v=51';

let fail = 0;
const ok = (name, pass, detail = '') => {
  if (pass) console.log('  ok   ' + name);
  else {
    fail++;
    console.log('  FAIL ' + name + (detail ? '\n       → ' + detail : ''));
  }
};

ok('six rooms make Worlds 3 and 4', WORLD34_ROOMS.length === 6,
  `${WORLD34_ROOMS.length} rooms`);

for (const room of WORLD34_ROOMS) {
  const r = check(room);
  const c = r.compiled;
  const e = estimate(room);

  ok(`${room.name}: passes the room prover`, r.ok, r.problems.join('\n       → '));
  ok(`${room.name}: has ${LEVEL.bolts} bolts`, c.bolts.length === LEVEL.bolts,
    `${c.bolts.length}`);
  ok(`${room.name}: has ${LEVEL.golden} golden bolts`, c.golden.length === LEVEL.golden,
    `${c.golden.length}`);
  ok(`${room.name}: checkpoint is in the middle 30–70%`, !!c.checkpoint
    && c.checkpoint.x > W * 0.3 && c.checkpoint.x < W * 0.7,
    c.checkpoint ? `x=${c.checkpoint.x}` : 'none');
  ok(`${room.name}: learned run is level-sized`, e.total > 20 && e.total < 120,
    `${e.total.toFixed(1)}s`);
  ok(`${room.name}: platforming remains at least 60% of the estimate`, e.onFoot >= 0.6,
    `${Math.round(e.onFoot * 100)}%`);

  console.log(`       ${e.total.toFixed(0)}s learned · ${Math.round(e.onFoot * 100)}% on foot`);
}

if (fail) {
  console.error(`\n${fail} World 3/4 gate(s) failed`);
  process.exit(1);
}
console.log('\nWorld 3/4 greyboxes structurally pass.');
