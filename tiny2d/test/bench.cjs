// Tiny 2D — the ride, measured.
//
//   node tiny2d/test/bench.cjs            report the curve as it stands
//   node tiny2d/test/bench.cjs --sweep    try candidate constants and print all
//
// It drives tiny2d/test/sim.html: the real Skater against the real Terrain at
// a fixed timestep, no renderer. What it reports is `align` at touchdown — the
// ratio skater.js grades landings by (perfect < PERFECT_ALIGN, ok < OK_ALIGN).
// A difficulty curve is only honest if a good line can still land clean deep
// into a run, and that is the number that says whether it can.
//
// Needs playwright + three in node_modules (npm i -D playwright three).
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const SK = path.join(ROOT, 'tiny2d/js/skater.js');
const TR = path.join(ROOT, 'tiny2d/js/terrain.js');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const PORT = 8079;

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] ?? 'text/plain' });
  res.end(fs.readFileSync(f));
});

const AT = (process.env.BENCH_AT || '0,800,1600,3200,6000').split(',').map(Number);
const SEEDS = [7, 11, 23, 41, 97];
const deg = m => Math.round(Math.atan(m) * 180 / Math.PI);

// The bands skater.js grades with, read from the source so this can never
// drift from the game.
function bands() {
  const s = fs.readFileSync(SK, 'utf8');
  return {
    perfect: Number(s.match(/PERFECT_ALIGN\s*=\s*([\d.]+)/)[1]),
    ok: Number(s.match(/OK_ALIGN\s*=\s*([\d.]+)/)[1]),
  };
}

async function measure(page, at) {
  // best-of the three ways to use the button in the air: the ceiling a player
  // could reach, not the average of the ways they could waste it
  const runs = await page.evaluate(({ at, seeds }) => {
    const out = [];
    for (const seed of seeds) {
      for (const dive of ['all', 'none', 'late']) {
        out.push({ dive, ...window.__bench.ride({ seed, from: at, steps: 26000, dive }) });
      }
    }
    return out.map(r => ({
      dive: r.dive, dist: r.dist,
      lands: r.lands.map(l => [+l.align.toFixed(3), +l.air.toFixed(2)]),
      slopes: r.slopes.filter((_, i) => i % 17 === 0),
    }));
  }, { at, seeds: SEEDS });

  const b = bands();
  const byDive = {};
  for (const r of runs) (byDive[r.dive] ??= []).push(...r.lands);
  const best = Object.entries(byDive)
    .map(([dive, l]) => ({ dive, l, ok: l.filter(([a]) => a < b.ok).length / (l.length || 1) }))
    .sort((x, y) => y.ok - x.ok)[0];

  const al = best.l.map(a => a[0]).sort((x, y) => x - y);
  const n = al.length;
  const slopes = runs.flatMap(r => r.slopes).sort((x, y) => x - y);
  const pc = f => n ? Math.round(al.filter(v => v < f).length / n * 100) : 0;
  return {
    n, dive: best.dive, perfect: pc(b.perfect), ok: pc(b.ok) - pc(b.perfect),
    hard: 100 - pc(b.ok), best: al[0], median: al[n >> 1],
    airsPer100m: +(n / (runs.reduce((s, r) => s + r.dist, 0) / 100)).toFixed(1),
    slopeMed: deg(slopes[slopes.length >> 1]), slopeP90: deg(slopes[Math.floor(slopes.length * 0.9)]),
    slopeMax: deg(slopes[slopes.length - 1]),
  };
}

async function report(page, label) {
  const b = bands();
  console.log(`\n${label}   (perfect < ${b.perfect}, ok < ${b.ok})`);
  for (const at of AT) {
    const r = await measure(page, at);
    console.log(`  ${String(at).padStart(4)}m  ${String(r.n).padStart(3)} airs (${String(r.airsPer100m).padStart(4)}/100m, best line: dive ${r.dive.padEnd(4)}) | ` +
      `perfect ${String(r.perfect).padStart(3)}%  ok ${String(r.ok).padStart(3)}%  hard ${String(r.hard).padStart(3)}% | ` +
      `align best ${r.best?.toFixed(2) ?? '-'} med ${r.median?.toFixed(2) ?? '-'} | ` +
      `slope ${String(r.slopeMed).padStart(2)}°/${String(r.slopeP90).padStart(2)}°/${String(r.slopeMax).padStart(2)}°`);
  }
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route('https://cdn.jsdelivr.net/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.167.0/', '');
    const f = path.join(THREE_DIR, rel);
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'no' });
    route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f, 'utf8') });
  });
  const load = async () => {
    await page.goto(`http://localhost:${PORT}/tiny2d/test/sim.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  };

  if (!process.argv.includes('--sweep')) {
    await load();
    await report(page, 'as it stands');
  } else {
    const skOrig = fs.readFileSync(SK, 'utf8'), trOrig = fs.readFileSync(TR, 'utf8');
    // [gravity, pop, len start, len end, slope start, slope end]
    const COMBOS = [
      [34, 14, 30, 26, 0.49, 0.81],
      [34, 10, 34, 30, 0.49, 0.81],
      [34, 10, 38, 34, 0.49, 0.81],
      [34, 10, 44, 40, 0.49, 0.81],
      [34, 12, 38, 34, 0.49, 0.81],
      [34, 12, 38, 34, 0.55, 0.88],
    ];
    try {
      for (const [g, pop, la, lb, sa, sb] of COMBOS) {
        fs.writeFileSync(SK, skOrig
          .replace(/const G\s+=\s*[\d.]+;/, `const G          = ${g};`)
          .replace(/const POP_MAX\s+=\s*[\d.]+;/, `const POP_MAX    = ${pop};`));
        fs.writeFileSync(TR, trOrig
          .replace(/const LEN_START\s+=\s*[\d.]+;/, `const LEN_START   = ${la};`)
          .replace(/const LEN_END\s+=\s*[\d.]+;/, `const LEN_END     = ${lb};`)
          .replace(/const SLOPE_START\s+=\s*[\d.]+;/, `const SLOPE_START = ${sa};`)
          .replace(/const SLOPE_END\s+=\s*[\d.]+;/, `const SLOPE_END   = ${sb};`));
        await load();
        await report(page, `g ${g}  pop ${pop}  len ${la}→${lb}  slope ${sa}→${sb}`);
      }
    } finally {
      fs.writeFileSync(SK, skOrig);
      fs.writeFileSync(TR, trOrig);
    }
  }
  await browser.close();
  server.close();
})();
