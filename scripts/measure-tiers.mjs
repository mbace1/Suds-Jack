#!/usr/bin/env node
// measure-tiers.mjs — score a challenge the way a machine plays it, so the
// campaign's grades are in this build's units instead of the port's.
//
//   node scripts/measure-tiers.mjs [--runs 8] [--write] [level-id ...]
//
// WHY. v242/v243 carried the grade tiers across from the Godot port's
// challenges.gd, where they were measured against THAT build's scoring. The
// two builds score orders of magnitude apart — a bot took 3.4M on NO SECOND
// CHANCE against an S of 16,450 — so every grade in the campaign currently
// lands on S the moment the level starts, and the unlock chain opens itself.
// This replaces them with numbers measured here.
//
// WHAT THE BOT IS, stated plainly so nobody mistakes it for a player: it
// kites (moves down the summed repulsion from nearby bodies) and auto-fires
// at the nearest one. It never dashes, never uses an ability, never picks a
// target for a reason. It has ORDINARY hp and dies. So these tiers are a
// LADDER calibrated to a machine — the right order of magnitude and the
// right relative shape across levels — and the absolute cut for "an A" is
// still a human's call after playing.
//
// C/B/A/S are the 25th / 50th / 75th / 95th percentiles of N runs.
//
// ── UNFINISHED, AND IT REFUSES TO PRETEND OTHERWISE ────────────────────────
// Only the FIRST run of a page produces a result. Runs 2+ reload cleanly (the
// ?run= is there because an identical url with only a hash is a same-document
// navigation and never reloads) and still come back with no lastLevelResult,
// so the game is not reaching 'playing' on a reloaded page for a reason not
// yet found. Percentiles of one sample are not percentiles, so --runs > 1
// EXITS rather than printing a ladder somebody might paste into a level file.
//
// What it did establish, which is worth keeping: a MORTAL kiting bot scores
// tens of thousands on ch-first-light — 44,300 dying at 32 s in one run,
// 244,050 clearing the full 60 s in another — against a port-derived S of
// 20,600. So the inherited tiers are SOFT (a machine beats S), but they are
// the right order of magnitude. The earlier "orders of magnitude wrong"
// reading came from a probe that made the bot immortal, and was an artefact
// of the gate rather than a fact about the tiers.

import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const RUNS = (() => { const i = args.indexOf('--runs'); return i >= 0 ? +args[i + 1] : 8; })();
const WRITE = args.includes('--write');
const ids = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
if (RUNS > 1) {
  console.error('measure-tiers: only the first run of a page returns a result (see the header).');
  console.error('Refusing --runs ' + RUNS + ': percentiles of one sample are not percentiles.');
  console.error('Use --runs 1 for a single honest score per level.');
  process.exit(2);
}

const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const PLAYWRIGHT = process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs';
const WORK = process.env.MEASURE_DIR || '/tmp/toko-measure';
const PORT = process.env.MEASURE_PORT || 8775;

const levelJs = readFileSync(path.join(root, 'toko-drop/js/level.js'), 'utf8');
const CAMPAIGN = JSON.parse('[' + levelJs.match(/export const CAMPAIGN = \[([^\]]*)\]/)[1].replace(/'/g, '"') + ']');
const targets = ids.length ? ids : CAMPAIGN;

const pct = (sorted, p) => {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
};

// A testbed with the bot appended, served locally — the same recipe the other
// gates use, and for the same reason: never measure a copy of the game that
// is not the game.
const setup = `
import { rmSync, cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('${WORK}', { recursive: true });
rmSync('${WORK}/testbed', { recursive: true, force: true });
cpSync('${root.replace(/\\/g, '/')}/toko-drop', '${WORK}/testbed', { recursive: true });
for (const sib of ['hub', 'toko']) {
  const s = '${root.replace(/\\/g, '/')}/' + sib;
  if (existsSync(s)) { rmSync('${WORK}/' + sib, { recursive: true, force: true }); cpSync(s, '${WORK}/' + sib, { recursive: true }); }
}
const p = '${WORK}/testbed/js/main.js';
writeFileSync(p, readFileSync(p, 'utf8') + \`

// ── MEASURE probe (appended by scripts/measure-tiers.mjs; never shipped) ────
if (location.hash === '#measure') {
  window._M = {
    ready: () => !!pendingLevel || gameState === 'title',
    // One page, many runs: the clock is ours and the level is replayed in
    // place, so a browser start-up is not paid per run.
    measure: async (id) => {
      const lv = await loadBundledLevel(id);
      if (!lv) return { error: 'level ' + id + ' did not load' };

      const realNow = performance.now.bind(performance);
      renderer.render = () => {};
      drawHUD = () => {};
      // THE BOT. Kites the summed repulsion of nearby bodies and auto-fires
      // at the nearest. Ordinary hp — it dies, which is the point.
      input.getMoveDir = () => {
        const p = player.mesh.position;
        let rx = 0, rz = 0;
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = p.x - e.position.x, dz = p.z - e.position.z;
          const d2 = dx * dx + dz * dz;
          if (d2 > 100 || d2 < 1e-4) continue;
          rx += dx / d2; rz += dz / d2;
        }
        // Nothing near: drift back to the middle rather than hug a wall.
        if (rx === 0 && rz === 0) { rx = -p.x; rz = -p.z; }
        const l = Math.hypot(rx, rz) || 1;
        return { x: rx / l, z: rz / l };
      };
      input.getAimDir = () => {
        const p = player.mesh.position;
        let best = null, bd = Infinity;
        for (const e of enemies) {
          if (!e.alive) continue;
          const d = (p.x - e.position.x) ** 2 + (p.z - e.position.z) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) return { x: 0, z: 0, valid: false };
        const dx = best.position.x - p.x, dz = best.position.z - p.z;
        const l = Math.hypot(dx, dz) || 1;
        return { x: dx / l, z: dz / l, valid: true };
      };
      pendingLevel = null;
      playLevel(lv, 0);
      let fakeNow = realNow();
      performance.now = () => fakeNow;
      const limit = Math.ceil((lv.duration + 10) / 0.05);
      let steps = 0;
      for (; steps < limit && gameState === 'playing'; steps++) { fakeNow += 50; loop(); }
      const res = lastLevelResult || {};
      return { id, score: res.score ?? 0, t: res.time ?? -1, out: res.outcome ?? '?', steps, state: gameState };
    },
  };
}
\`);
`;
await new Promise((res, rej) => {
  const n = spawn(process.execPath, ['--input-type=module', '-e', setup], { stdio: 'inherit' });
  n.on('exit', c => c === 0 ? res() : rej(new Error('setup failed')));
});

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', WORK],
  { stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise(r => setTimeout(r, 1200));

const { chromium } = await import(PLAYWRIGHT);
const b = await chromium.launch({ executablePath: CHROMIUM,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await b.newPage({ viewport: { width: 900, height: 600 } });
await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
await page.goto(`http://127.0.0.1:${PORT}/testbed/index.html#measure`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window._M && window._M.ready()', null, { timeout: 90000 });

const out = {};
let failed = 0;
console.log(`level                      runs   min    p25    p50    p75    p95    max`);
for (const id of targets) {
  const scores = [], notes = [];
  for (let r = 0; r < RUNS; r++) {
    // A fresh page per run. Replaying in place carried gameState and
    // lastLevelResult across, which is what made every run report the same
    // number; a reload cannot.
    // The ?run= is not decoration: navigating to an IDENTICAL url with only a
    // hash is a same-document navigation, so the page never reloads and the
    // previous run's gameState survives — which is what stalled this loop.
    await page.goto(`http://127.0.0.1:${PORT}/testbed/index.html?run=${id}-${r}#measure`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction('window._M && window._M.ready()', null, { timeout: 90000 });
    const one = await page.evaluate((i) => window._M.measure(i), id);
    if (one.error) { console.error('✘ ' + one.error); break; }
    // A run that produced no result is NOT a score of zero. Recording it as
    // one would put a fake number into a level file, which is the single
    // thing this tool must never do.
    if (one.out === '?' || one.t < 0) { notes.push(`no-result(steps=${one.steps},state=${one.state})`); continue; }
    scores.push(one.score);
    notes.push(`${one.out}@${one.t}s`);
  }
  if (!scores.length) { console.error(`✘ ${id}: no run produced a result — ${notes.join(' · ')}`); failed++; continue; }
  const s = scores.slice().sort((a, b2) => a - b2);
  const tiers = [pct(s, 0.25), pct(s, 0.50), pct(s, 0.75), pct(s, 0.95)];
  for (let i = 1; i < tiers.length; i++) if (tiers[i] <= tiers[i - 1]) tiers[i] = tiers[i - 1] + 1;
  out[id] = tiers;
  console.log(`${id.padEnd(24)} ${String(scores.length).padStart(4)} ${String(s[0]).padStart(6)} ` +
    tiers.map(t => String(t).padStart(6)).join(' ') + ` ${String(s[s.length - 1]).padStart(6)}`);
  if (process.env.MEASURE_DEBUG) console.log('    ' + notes.join(' · '));
}
await b.close();
server.kill();

if (failed) {
  console.error(`
✘ ${failed} level(s) produced no result — see the header. Nothing written.`);
  process.exit(1);
}

if (WRITE) {
  for (const [id, tiers] of Object.entries(out)) {
    const f = path.join(root, 'toko-drop/levels', id + '.json');
    const j = JSON.parse(readFileSync(f, 'utf8'));
    if (!j.grade) continue;
    j.grade.tiers = tiers;
    writeFileSync(f, JSON.stringify(j, null, 2).replace(/\n/g, '\n') + '\n');
    console.log('wrote ' + id + '.json');
  }
}
