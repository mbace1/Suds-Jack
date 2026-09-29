// PACHI PIT — the measuring instrument. NEVER a gate: it prints numbers for a
// person to read, the way slaykallio/test/bots.mjs does.
//
//   node pachipit/test/measure.mjs board [n=300] [--mods=lifeNails:0.5,...]
//   node pachipit/test/measure.mjs svg out.svg [power...]   the layout + paths
//
// `board` fires n coins at each power, one at a time on an empty board, and
// reports where they went: fouls, chutes, every pocket, the warp, how long a
// coin takes, and how often the rattle had to shake one loose. The rattle
// count is the one to watch when moving a nail — a coin that needs it is a
// coin that was wedged, and a wedge is a layout bug, not a feature.

import { Board, buildLayout, BOARD } from '../js/board.js?v=8';
import { makeRng } from '../js/rng.js?v=8';
import { writeFileSync } from 'node:fs';

const [mode = 'board', ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const args = rest.filter(a => !a.startsWith('--'));
const mods = {};
for (const kv of (flags.mods ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':'); mods[k] = v === undefined ? true : Number.isNaN(Number(v)) ? v : Number(v);
}

const STUCK = [];
function fire(board, power, record = null) {
  board.launch(power);
  const hits = [];
  let exit = null, foul = false, rattles = 0, warp = false, t = 0;
  while (board.coins.length && t < 30) {
    board.step(); t += BOARD.DT;
    if (record) for (const c of board.coins) record.push([c.x, c.y]);
    for (const e of board.drain()) {
      if (e.t === 'pocket') hits.push(e.pocket);
      if (e.t === 'exit') exit = e;
      if (e.t === 'foul') foul = true;
      if (e.t === 'rattle') { rattles++; STUCK.push([Math.round(e.x), Math.round(e.y)]); }
      if (e.t === 'warp') warp = true;
    }
  }
  return { hits, exit, foul, rattles, warp, t, timeout: board.coins.length > 0 };
}

if (mode === 'board') {
  const n = Number(args[0] ?? 300);
  const layout = buildLayout(mods);
  console.log(`pins ${layout.pins.length}, segments ${layout.segs.length}, mods ${JSON.stringify(mods)}`);
  console.log('power  foul  L/C/R%        start tulip pocket warp  att   t(s)  rattle rescued timeout');
  const open = 'fever' in flags;
  for (let p = 0; p <= 1.0001; p += 0.1) {
    const board = new Board(buildLayout(mods), makeRng(1234 + Math.round(p * 100)));
    if (open) board.setAttacker(true);
    const acc = { foul: 0, L: 0, C: 0, R: 0, start: 0, tulip: 0, pocket: 0, warp: 0, attacker: 0, t: 0, rattles: 0, rescued: 0, timeout: 0 };
    for (let i = 0; i < n; i++) {
      const r = fire(board, p);
      if (r.foul) { acc.foul++; continue; }
      if (r.timeout) { acc.timeout++; board.coins.length = 0; continue; }
      acc[r.exit.chute]++;
      if (r.exit.via === 'rescued') acc.rescued++;
      for (const h of r.hits) {
        if (h.startsWith('start')) acc.start++;
        else if (h.startsWith('tulip')) acc.tulip++;
        else if (h.startsWith('pocket')) acc.pocket++;
        else if (h === 'attacker') acc.attacker++;
      }
      if (r.warp) acc.warp++;
      acc.t += r.t; acc.rattles += r.rattles;
    }
    const played = n - acc.foul;
    const pc = k => (100 * acc[k] / Math.max(1, played)).toFixed(1).padStart(5);
    acc.stuckAt = STUCK.splice(0).reduce((m, [x, y]) => (m[`${x},${y}`] = (m[`${x},${y}`] ?? 0) + 1, m), {});
    console.log(`${p.toFixed(1)}   ${(100 * acc.foul / n).toFixed(0).padStart(3)}%  ${pc('L')}${pc('C')}${pc('R')}  ${pc('start')} ${pc('tulip')} ${pc('pocket')} ${pc('warp')} ${pc('attacker')}  ${(acc.t / Math.max(1, played)).toFixed(2)}  ${String(acc.rattles).padStart(5)} ${String(acc.rescued).padStart(6)} ${String(acc.timeout).padStart(6)}`);
    const top = Object.entries(acc.stuckAt).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (top.length && 'stuck' in flags) console.log('        stuck at', top.map(([k, v]) => `(${k})x${v}`).join(' '));
  }
}

if (mode === 'svg') {
  const out = args[0] ?? 'board.svg';
  const powers = args.slice(1).map(Number);
  const L = buildLayout(mods);
  const S = 10, W = 64 * S, H = 88 * S;
  const X = x => (x + 32) * S, Y = y => (86 - y) * S;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#10131a"/>`;
  for (const s of L.segs) {
    const col = { rail: '#c8c8d0', guide: '#8888a0', frame: '#e0b040', stage: '#e07040', cup: '#40c0e0', wing: s.when === 'open' ? '#40e080' : '#e04080', lid: '#e04040', lanefloor: '#888' }[s.kind] ?? '#aaa';
    svg += `<line x1="${X(s.ax)}" y1="${Y(s.ay)}" x2="${X(s.bx)}" y2="${Y(s.by)}" stroke="${col}" stroke-width="3"/>`;
  }
  for (const p of L.pins) {
    const col = { life: '#ff4040', hakama: '#ff9040', way: '#40ff90', top: '#9090ff', warplip: '#ff40ff' }[p.tag] ?? '#d0c080';
    svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r * S}" fill="${col}"/>`;
  }
  for (const w of L.windmills) svg += `<circle cx="${X(w.x)}" cy="${Y(w.y)}" r="${w.r * S}" fill="none" stroke="#f0f" stroke-width="2"/>`;
  const wp = L.warp;
  svg += `<rect x="${X(wp.x0)}" y="${Y(wp.y1)}" width="${(wp.x1 - wp.x0) * S}" height="${(wp.y1 - wp.y0) * S}" fill="rgba(255,0,255,.25)"/>`;
  svg += `<circle cx="${X(0)}" cy="${Y(50)}" r="3" fill="#fff"/>`;
  // a coin to scale, bottom left
  svg += `<circle cx="${X(-20)}" cy="${Y(2)}" r="${BOARD.COIN_R * S}" fill="#c87533"/>`;
  const cols = ['#ff5050', '#50ff50', '#5090ff', '#ffff50', '#ff50ff', '#50ffff'];
  powers.forEach((p, k) => {
    for (let run = 0; run < 3; run++) {
      const b = new Board(L, makeRng(99 + k * 7 + run));
      if ('fever' in flags) b.setAttacker(true);
      const pts = [];
      fire(b, p, pts);
      const d = pts.filter((_, i) => i % 3 === 0).map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
      svg += `<polyline points="${d}" fill="none" stroke="${cols[k % cols.length]}" stroke-width="1.2" opacity=".75"/>`;
    }
  });
  svg += '</svg>';
  writeFileSync(out, svg);
  console.log(`wrote ${out}`);
}

// ── the pusher ───────────────────────────────────────────────────────────
// `pusher [preload] [drops]`: fill the bed, run it to steady state, then drop
// coins at the back one every `gap` seconds and count what comes out of each
// edge. The ratio out-front / in is the machine's base return: under 1 is the
// house edge, and the charms exist to push it past 1.
if (mode === 'pusher') {
  const { Pusher, PUSHER } = await import('../js/pusher.js?v=8');
  const pre = Number(args[0] ?? 260), drops = Number(args[1] ?? 400), gap = Number(flags.gap ?? 0.6);
  const rng = makeRng(42);
  const p = new Pusher(rng, { guards: Number(flags.guards ?? 0), stroke: Number(flags.stroke ?? 0), tilt: Number(flags.tilt ?? 0) });
  p.fill({ bed: pre / 260 });
  const t0 = Date.now();
  let steps = 0;
  const run = (secs) => { const tally = { collect: 0, gutter: 0 }; for (let s = 0; s < secs / PUSHER.DT; s++) { p.step(); steps++; for (const e of p.drain()) if (e.t in tally) tally[e.t]++; } return tally; };
  const warm = run(40);
  console.log(`preload ${pre}: after 40s warm-up the bed holds ${p.coins.length} (${p.coins.filter(c => c.shelf).length} on the shelf, lvl1 ${p.coins.filter(c => c.lvl === 1).length}, lvl2 ${p.coins.filter(c => c.lvl === 2).length}); warm-up spilled ${warm.collect} front, ${warm.gutter} gutter`);
  const out = { collect: 0, gutter: 0 };
  for (let i = 0; i < drops; i++) {
    const chute = [-14, 0, 14][rng.int(3)];
    p.drop(chute + rng.wobble(2), rng.range(1.5, 4.5), { fall: 0.3 });
    const t = run(gap);
    out.collect += t.collect; out.gutter += t.gutter;
  }
  const tail = run(20);
  console.log(`${drops} drops, one per ${gap}s: front ${out.collect} (+${tail.collect} in the tail), gutter ${out.gutter} (+${tail.gutter})`);
  console.log(`return per drop ${(out.collect / drops).toFixed(3)}, gutter share ${(out.gutter / Math.max(1, out.gutter + out.collect)).toFixed(3)}; bed now ${p.coins.length}`);
  const shelf = p.coins.filter(c => c.shelf), bed = p.coins.filter(c => !c.shelf);
  console.log(`  shelf ${shelf.length} (lvl1 ${shelf.filter(c => c.lvl === 1).length}), bed lvl0 ${bed.filter(c => c.lvl === 0).length}, lvl1 ${bed.filter(c => c.lvl === 1).length}; bed lvl0 z from ${Math.min(...bed.map(c => c.z)).toFixed(1)}`);
  console.log(`${steps} steps in ${Date.now() - t0}ms — ${((Date.now() - t0) / steps * 1000).toFixed(1)}µs a step at ~${p.coins.length} coins`);
}

// ── whole runs ───────────────────────────────────────────────────────────
// `runs [n=12] [--policy=greedy|saver|planner]`: how far the bot gets. The
// saver buys nothing and is the control — the naked machine; a policy only
// means something against it.
if (mode === 'runs') {
  const { playRun } = await import('./bot.mjs?v=8');
  const n = Number(args[0] ?? 12);
  for (const policy of (flags.policy ?? 'saver,greedy,planner').split(',')) {
    const reached = [], t0 = Date.now();
    let fevers = 0, bandits = 0, value = 0, spins = 0, starts = 0, fired = 0, charms = 0;
    for (let s = 1; s <= n; s++) {
      const e = playRun(s * 101, { policy });
      reached.push(e.phase === 'won' ? 9 : e.deadline);
      fevers += e.stats.fevers; bandits += e.stats.bandits; value += e.stats.value; spins += e.stats.spins;
      starts += e.stats.starts; fired += e.stats.fired; charms += e.stats.charmsBought;
    }
    const hist = Array.from({ length: 10 }, (_, d) => reached.filter(x => x === d).length);
    console.log(`${policy.padEnd(8)} reached: ${hist.slice(1).map((c, i) => `${i + 1 === 9 ? 'OUT' : 'D' + (i + 1)}:${c}`).join(' ')}  mean ${(reached.reduce((a, b) => a + b, 0) / n).toFixed(2)}`);
    console.log(`         per run: fired ${(fired / n).toFixed(0)}, starts ${(100 * starts / fired).toFixed(1)}%, spins ${(spins / n).toFixed(1)}, fevers ${(fevers / n).toFixed(2)}, bandits ${(bandits / n).toFixed(2)}, tray value ${(value / n).toFixed(0)}, charms ${(charms / n).toFixed(1)} — ${((Date.now() - t0) / n / 1000).toFixed(1)}s a run`);
  }
}
