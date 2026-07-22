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
