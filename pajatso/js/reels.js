// THE REELS — the CloverPit slot, dressed as a pachinko LCD. Pure.
//
// A LOTTERY, not a strip. A real digital pachinko draws the outcome the moment
// the coin drops into the start chucker and then puts on a show that arrives
// at it; three independent reels cannot give a jackpot a rate a player will
// ever see in thirty drops (three sevens on a line with sevens at 1-in-10 is
// 1 in 1000 a line). So a spin is: draw the outcome from a weighted table,
// then BUILD a 3x3 picture that shows it — the winning line lit, every other
// line deliberately broken, and on a miss sometimes a REACH that nearly made it.

export const SYMBOLS = ['cherry', 'bell', 'coin', 'clover', 'seven', 'mask'];

// the lines a picture can win on: [reel, row] cells, left to right
export const LINES = {
  top: [[0, 0], [1, 0], [2, 0]],
  mid: [[0, 1], [1, 1], [2, 1]],
  bot: [[0, 2], [1, 2], [2, 2]],
  down: [[0, 0], [1, 1], [2, 2]],
  up: [[0, 2], [1, 1], [2, 0]],
};

// Reels stop left, right, centre: the centre reel is last so that a pair on
// the outside reels is a REACH — the moment the whole machine holds its breath.
export const STOP_ORDER = [0, 2, 1];
export const TIMING = { spin: 0.9, gap: 0.45, reach: 1.9, show: 0.8 };

export function drawOutcome(rng, weights) {
  let total = 0;
  for (const k in weights) total += Math.max(0, weights[k]);
  let x = rng.next() * total;
  for (const k in weights) { x -= Math.max(0, weights[k]); if (x < 0) return k; }
  return 'miss';
}

// The picture for an outcome. Every line that is not the winner must be broken,
// or the screen shows a win the machine did not pay — the unforgivable bug in
// a game about reading a screen.
export function buildGrid(rng, outcome, { lines = Object.keys(LINES), tease = 0.3 } = {}) {
  const grid = [[null, null, null], [null, null, null], [null, null, null]];   // grid[reel][row]
  const any = () => SYMBOLS[rng.int(SYMBOLS.length)];
  let line = null, reach = null;
  if (outcome !== 'miss') {
    line = lines[rng.int(lines.length)];
    for (const [r, w] of LINES[line]) grid[r][w] = outcome;
  } else if (rng.next() < tease) {
    // a reach that misses: the outside pair matches, the centre does not
    reach = lines[rng.int(lines.length)];
    const s = any();
    const [[r0, w0], [r1, w1], [r2, w2]] = LINES[reach];
    grid[r0][w0] = s; grid[r2][w2] = s;
    let m = any(); while (m === s) m = any();
    grid[r1][w1] = m;
  }
  // fill the rest, re-rolling any cell that would complete a line that is
  // not the winning one
  for (let r = 0; r < 3; r++) for (let w = 0; w < 3; w++) {
    if (grid[r][w]) continue;
    for (let tries = 0; tries < 40; tries++) {
      grid[r][w] = any();
      if (!completesOther(grid, r, w, line)) break;
    }
  }
  return { grid, line, reach: reach ?? (line ? line : null) };
}

function completesOther(grid, r, w, winLine) {
  for (const [name, cells] of Object.entries(LINES)) {
    if (name === winLine) continue;
    if (!cells.some(([a, b]) => a === r && b === w)) continue;
    const v = cells.map(([a, b]) => grid[a][b]);
    if (v.every(x => x) && v[0] === v[1] && v[1] === v[2]) return true;
  }
  return false;
}

// Every line the picture actually shows. The engine pays THIS, not the draw —
// so if the builder ever let an extra line through, the machine would pay it
// rather than lie about it, and the core test would catch the builder.
export function linesShown(grid, lines = Object.keys(LINES)) {
  const out = [];
  for (const name of lines) {
    const v = LINES[name].map(([a, b]) => grid[a][b]);
    if (v[0] === v[1] && v[1] === v[2]) out.push({ line: name, symbol: v[0] });
  }
  return out;
}

// Is there a pair on the outside reels of any line? (the REACH test, run when
// the second reel stops)
export function reachLines(grid, lines = Object.keys(LINES)) {
  return lines.filter(name => {
    const [[r0, w0], , [r2, w2]] = LINES[name];
    return grid[r0][w0] === grid[r2][w2];
  });
}

// How long a spin plays for, given its picture: a reach holds the centre reel.
export function spinLength(grid, lines) {
  const reach = reachLines(grid, lines).length > 0;
  return TIMING.spin + TIMING.gap * 2 + (reach ? TIMING.reach : 0) + TIMING.show;
}
