// Validates that every aqueduct level, in its authored orientation, connects
// spring -> fountain via the same BFS rules the game uses. Pure Node, no deps:
//   node gameoflife/test/check_levels.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'js', 'experiences', 'aqueduct.js'), 'utf8');
const m = src.match(/const LEVELS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('LEVELS not found'); process.exit(1); }
const LEVELS = eval(m[1]);

const OPP = d => (d + 2) % 4;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const CONNS = { S: [1, 3], C: [0, 1] };

function connsOf(c) {
  if (!c) return [];
  if (c.k === 'X' || c.k === 'F') return [c.dir];
  return CONNS[c.k].map(d => (d + c.rot) % 4);
}

LEVELS.forEach((rows, li) => {
  const gh = rows.length, gw = rows[0].length;
  const grid = rows.map(r => r.map(code => {
    if (code === '..') return null;
    const k = code[0], n = +code[1];
    return (k === 'X' || k === 'F') ? { k, dir: n } : { k, rot: n };
  }));
  let sx = -1, sy = -1, fCount = 0, xCount = 0;
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (grid[y][x]?.k === 'X') { sx = x; sy = y; xCount++; }
    if (grid[y][x]?.k === 'F') fCount++;
  }
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  let solved = false;
  while (q.length) {
    const [x, y] = q.shift();
    for (const dir of connsOf(grid[y][x])) {
      const nx = x + DX[dir], ny = y + DY[dir];
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const n = grid[ny][nx];
      if (!n || seen.has(`${nx},${ny}`)) continue;
      if (!connsOf(n).includes(OPP(dir))) continue;
      seen.add(`${nx},${ny}`);
      if (n.k === 'F') solved = true;
      q.push([nx, ny]);
    }
  }
  console.log(`Level ${li + 1}: ${gw}x${gh}, springs=${xCount}, fountains=${fCount}, solvable=${solved}`);
  if (!solved || xCount !== 1 || fCount !== 1) process.exitCode = 1;
});

// ── i18n completeness ──────────────────────────────────────────────
// First Lightning shipped to production rendering "lt.s1" as its story text and
// "lt.wait" as its button, because none of its strings existed in i18n.js and
// t() falls back to returning the key. Nothing caught it: the smoke gate drove
// the scene happily, since a raw key is still a non-empty string. So: every key
// any experience asks for must exist in ALL THREE languages, and the three
// blocks must agree with each other.
import { readdirSync } from 'node:fs';

const i18n = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');

// the three language blocks, split on the key that opens each one
const starts = [...i18n.matchAll(/'hub\.title':/g)].map(m => m.index);
if (starts.length !== 3) {
  console.log(`i18n: expected 3 language blocks, found ${starts.length}`);
  process.exitCode = 1;
}
const LANGS = ['en', 'fi', 'ja'];
const blocks = starts.map((s, i) => i18n.slice(s, starts[i + 1] ?? i18n.length));
const keysOf = (b) => new Set([...b.matchAll(/^\s*'([^']+)':/gm)].map(m => m[1]));
const sets = blocks.map(keysOf);

// 1. the blocks agree
sets.forEach((k, i) => {
  if (i === 0) return;
  const missing = [...sets[0]].filter(x => !k.has(x));
  if (missing.length) {
    console.log(`i18n: ${LANGS[i]} is missing ${missing.length} key(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);
    process.exitCode = 1;
  }
});

// 2. every key the code actually asks for exists
const expDir = new URL('../js/experiences/', import.meta.url);
const used = new Map();      // key -> file that wants it
for (const f of readdirSync(expDir)) {
  if (!f.endsWith('.js')) continue;
  const src = readFileSync(new URL(f, expDir), 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-z0-9]+\.[a-zA-Z0-9._]+)'\s*\)/g)) {
    if (!used.has(m[1])) used.set(m[1], f);
  }
}
// plus the hub card every registered experience needs
const mainSrc = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const registry = (mainSrc.match(/^const REGISTRY = \[([^\]]+)\]/m) || [, ''])[1]
  .split(',').map(s => s.trim()).filter(Boolean);
for (const id of registry) {
  used.set(`exp.${id}.name`, 'REGISTRY');
  used.set(`exp.${id}.desc`, 'REGISTRY');
}

const orphans = [...used].filter(([k]) => LANGS.some((_, i) => !sets[i].has(k)));
if (orphans.length) {
  for (const [k, f] of orphans) {
    const where = LANGS.filter((_, i) => !sets[i].has(k)).join('/');
    console.log(`i18n: ${f} uses '${k}' — missing in ${where}`);
  }
  process.exitCode = 1;
} else {
  console.log(`i18n: ${used.size} keys used, all present in ${LANGS.join('/')}`);
}
