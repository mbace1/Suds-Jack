// PACHI PIT — the core gate. Bare node: no browser, no GPU, no audio.
//
//   node pachipit/test/core.mjs
//
// Everything that is rules or physics is checked here against exact numbers
// and seeded runs; what the machine LOOKS like is test/smoke.cjs's job, and
// whether the economy is any fun is test/measure.mjs's (never a gate).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng, seedOf } from '../js/rng.js?v=1';
import { Board, buildLayout, BOARD } from '../js/board.js?v=1';
import { Pusher, PUSHER } from '../js/pusher.js?v=1';
import { drawOutcome, buildGrid, linesShown, reachLines, LINES } from '../js/reels.js?v=1';
import { Engine, computeRules, VERSION } from '../js/engine.js?v=1';
import * as D from '../js/data.js?v=1';
import { playRun, playShift } from './bot.mjs?v=1';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '..');
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const section = t => console.log(`\n── ${t}`);

// ── the seeded stream ────────────────────────────────────────────────────
section('rng');
{
  const a = makeRng(42), b = makeRng(42);
  const xs = Array.from({ length: 50 }, () => a.next()), ys = Array.from({ length: 50 }, () => b.next());
  check('one seed, one stream', xs.every((x, i) => x === ys[i]));
  const c = makeRng(7); for (let i = 0; i < 20; i++) c.next();
  const saved = c.state, next = c.next();
  const d = makeRng(1); d.state = saved;
  check('the whole state is one integer: a stream resumes exactly', d.next() === next);
  check('a named seed is stable', seedOf('pit-1') === seedOf('pit-1') && seedOf('pit-1') !== seedOf('pit-2'));
}

// ── the data ─────────────────────────────────────────────────────────────
section('data');
{
  const ids = D.CHARMS.map(c => c.id);
  check('charm ids are unique', new Set(ids).size === ids.length);
  const bad = D.CHARMS.flatMap(c => Object.keys(c.rules).filter(k => !D.RULES[k]).map(k => `${c.id}.${k}`))
    .concat(D.DEALS.flatMap(d => Object.keys(d.rules ?? {}).filter(k => !D.RULES[k]).map(k => `${d.id}.${k}`)));
  check(`every charm and deal bends a rule the machine HAS${bad.length ? ` — ${bad}` : ''}`, bad.length === 0);
  check('every charm has a name, a family, a price and words', D.CHARMS.every(c => c.name && c.text && c.price > 0 && ['nails', 'stamps', 'reels', 'pusher', 'money', 'raccoon'].includes(c.family)));
  check('every family has at least two charms', ['nails', 'stamps', 'reels', 'pusher', 'money', 'raccoon'].every(f => D.CHARMS.filter(c => c.family === f).length >= 2));
  check('the phone has at least six deals, so three are never forced', D.DEALS.length >= 6);
  check('debts only ever grow', D.DEBTS.every((d, i) => i === 0 || d > D.DEBTS[i - 1]) && D.debtFor(9) > D.debtFor(8));
  check('eight padlocks', D.LOCKS === 8);
  let threw = false;
  try { computeRules([{ id: 'x' }], ['nope']); } catch { threw = true; }
  check('an unknown charm or deal simply contributes nothing', !threw);
  const r = computeRules([{ id: 'life_nails' }, { id: 'lucky_seven' }, { id: 'collection_plate' }], ['interest']);
  check('rules fold: sums add, products multiply', Math.abs(r.lifeNails - 0.4) < 1e-9 && r.wSeven === 2 && r.trayMul === 1.5
    && Math.abs(r.interest - (D.START.interest + 0.05)) < 1e-9);
  check('guards are capped at a full wall', computeRules([{ id: 'gutter_guards' }], []).guards <= 1);
}

// ── the board ────────────────────────────────────────────────────────────
section('board');
{
  const L = buildLayout();
  check(`the board has nails (${L.pins.length}) and every pocket`, L.pins.length > 120
    && ['start', 'tulipL', 'tulipR', 'pocketL', 'pocketR', 'attacker'].every(id => L.byId[id]));
  // THE WEDGE RULE: two nails a coin can pass between must clear its width by
  // BOARD.CLEAR; two it cannot must be a fence. Anything between is a trap.
  const { PIN_R, COIN_R, CLEAR } = BOARD;
  const field = L.pins.filter(p => p.tag === 'field' || p.tag === 'top');
  let wedges = 0;
  for (let i = 0; i < field.length; i++) for (let j = i + 1; j < field.length; j++) {
    const d = Math.hypot(field[i].x - field[j].x, field[i].y - field[j].y);
    const gap = d - 2 * PIN_R;
    if (gap < CLEAR - 0.05 && gap > 1.1) wedges++;
  }
  check(`no two field nails form a wedge (${wedges})`, wedges === 0);

  const fire = (b, power, secs = 25) => {
    b.launch(power);
    const ev = [];
    for (let t = 0; t < secs && b.coins.length; t += BOARD.DT) { b.step(); ev.push(...b.drain()); }
    return { ev, left: b.coins.length };
  };
  {
    const b = new Board(buildLayout(), makeRng(3));
    let timeouts = 0, rescued = 0, starts = 0, exits = 0, fouls = 0;
    for (let i = 0; i < 120; i++) {
      const { ev, left } = fire(b, 0.22);
      if (left) { timeouts++; b.coins.length = 0; }
      for (const e of ev) {
        if (e.t === 'exit') { exits++; if (e.via === 'rescued') rescued++; }
        if (e.t === 'pocket' && e.kind === 'start') starts++;
        if (e.t === 'foul') fouls++;
      }
    }
    check(`at the sweet spot every coin comes out (${exits}/120, ${timeouts} stuck)`, exits === 120 && timeouts === 0);
    check(`and hardly any needs the attendant (${rescued})`, rescued <= 2);
    check(`and the start chucker catches some (${starts})`, starts >= 8 && starts <= 50);
    check('and nothing fouls at a real power', fouls === 0);
  }
  {
    const b = new Board(buildLayout(), makeRng(4));
    let fouls = 0;
    for (let i = 0; i < 60; i++) fouls += fire(b, 0).ev.filter(e => e.t === 'foul').length;
    check(`a dead-weak shot falls back as a FOUL sometimes (${fouls}/60)`, fouls > 3 && fouls < 50);
  }
  {
    const b = new Board(buildLayout(), makeRng(5));
    b.setAttacker(true);
    let att = 0;
    for (let i = 0; i < 60; i++) att += fire(b, 0.9).ev.filter(e => e.t === 'pocket' && e.kind === 'attacker').length;
    check(`FEVER: shooting right finds the open gate (${att}/60)`, att >= 45);
    b.setAttacker(false);
    let shut = 0;
    for (let i = 0; i < 30; i++) shut += fire(b, 0.9).ev.filter(e => e.t === 'pocket' && e.kind === 'attacker').length;
    check('and a shut gate catches nothing', shut === 0);
  }
  {
    const b = new Board(buildLayout(), makeRng(6));
    let toggles = 0, open = null, consistent = true;
    for (let i = 0; i < 200 && toggles < 4; i++) {
      for (const e of fire(b, 0.52).ev) if (e.t === 'tulip') {
        toggles++;
        if (open !== null && e.open === open) consistent = false;
        open = e.open;
      }
    }
    check(`a tulip opens on one coin and shuts on the next (${toggles} toggles)`, toggles >= 2 && consistent);
  }
  {
    // the backflow valve: a coin sent anticlockwise at the mouth of the lane
    // bounces off it instead of riding the rail down the lane
    const L2 = buildLayout();
    const b = new Board(L2, makeRng(7));
    const c = b.launch(0.5);
    c.x = L2.tip.x + 1.2; c.y = L2.tip.y + 1.6; c.vx = -30; c.vy = 18;
    const ev = [];
    for (let t = 0; t < 12 && b.coins.length; t += BOARD.DT) { b.step(); ev.push(...b.drain()); }
    check('the backflow valve keeps a bounced coin out of the lane', !ev.some(e => e.t === 'foul'));
  }
  {
    // the layout mods: the nail doctor really moves nails
    const base = buildLayout(), bent = buildLayout({ lifeNails: 0.4, chuckerWiden: 0.5 });
    const life = L => L.pins.filter(p => p.tag === 'life').map(p => Math.abs(p.x));
    check('bent life nails stand further apart', life(bent)[0] > life(base)[0] && bent.byId.start.w > base.byId.start.w);
    check('the right way and the third windmill add what they say', buildLayout({ rightWay: 1 }).pins.filter(p => p.tag === 'way').length
      > base.pins.filter(p => p.tag === 'way').length && buildLayout({ thirdWindmill: 1 }).windmills.length === 3);
  }
}

// ── the pusher ───────────────────────────────────────────────────────────
section('pusher');
{
  const p = new Pusher(makeRng(9));
  p.fill();
  const bed = p.coins.filter(c => !c.shelf && c.lvl === 0);
  check(`the house float is a packed bed (${bed.length} on the floor, ${p.coins.filter(c => c.shelf).length} on the shelf)`, bed.length > 180);
  let overlap = 0;
  for (let i = 0; i < bed.length; i++) for (let j = i + 1; j < bed.length; j++) {
    if (Math.hypot(bed[i].x - bed[j].x, bed[i].z - bed[j].z) < bed[i].r + bed[j].r - 0.12) overlap++;
  }
  check(`and it is settled, not stacked into itself (${overlap} overlaps)`, overlap === 0);
  check('the front row already hangs over the lip', bed.some(c => c.z > PUSHER.D - c.r));

  // conservation: every coin that goes in is on the bed, in the tray or in a gutter
  const before = p.coins.length;
  let collected = 0, gutter = 0, drops = 0;
  const rng = makeRng(10);
  for (let i = 0; i < 150; i++) {
    p.drop([-14, 0, 14][rng.int(3)] + rng.wobble(2), rng.range(1.5, 4), {});
    drops++;
    for (let s = 0; s < 36; s++) { p.step(); for (const e of p.drain()) { if (e.t === 'collect') collected++; if (e.t === 'gutter') gutter++; } }
  }
  check(`not a coin is created or lost (${before} + ${drops} = ${p.coins.length} + ${collected} + ${gutter})`,
    before + drops === p.coins.length + collected + gutter);
  check(`a loaded bed pays from the first drops (${collected} out of the front for ${drops} in)`, collected > drops * 0.45);
  check(`the house takes something at the sides, not everything (${gutter})`, gutter > 0 && gutter < collected);

  const noGuard = new Pusher(makeRng(11)), guard = new Pusher(makeRng(11), { guards: 0.8 });
  const run = q => { q.fill(); let g = 0; const r2 = makeRng(12); for (let i = 0; i < 120; i++) { q.drop(r2.wobble(18), r2.range(1.5, 4), {}); for (let s = 0; s < 36; s++) { q.step(); for (const e of q.drain()) if (e.t === 'gutter') g++; } } return g; };
  const g0 = run(noGuard), g1 = run(guard);
  check(`gutter guards keep coins out of the gutters (${g0} → ${g1})`, g1 < g0 * 0.6);

  // a coin lying on others rides them, and drops when they go
  const q = new Pusher(makeRng(13));
  const a = q.drop(0, 20, { fall: 0 }), top = q.drop(0, 20, { fall: 0 });
  check('a coin dropped on another lies on top of it', a.lvl === 0 && top.lvl === 1);
  q.remove(c => c === a, 'test');
  for (let s = 0; s < 10; s++) q.step();
  check('and falls when what held it up is gone', top.lvl === 0);
}

// ── the reels ────────────────────────────────────────────────────────────
section('reels');
{
  const rng = makeRng(14);
  let lies = 0, missLies = 0, reachless = 0, n = 0;
  for (let i = 0; i < 4000; i++) {
    const outcome = drawOutcome(rng, D.OUTCOMES);
    const { grid, line } = buildGrid(rng, outcome);
    const shown = linesShown(grid);
    n++;
    if (outcome === 'miss') { if (shown.length) missLies++; }
    else {
      if (shown.length !== 1 || shown[0].symbol !== outcome || shown[0].line !== line) lies++;
      if (!reachLines(grid).includes(line)) reachless++;
    }
  }
  check(`the picture shows exactly the drawn win, every time (${n} spins)`, lies === 0);
  check('a miss never shows a line', missLies === 0);
  check('every win passed through a REACH', reachless === 0);
  const counts = {};
  const r2 = makeRng(15);
  for (let i = 0; i < 20000; i++) { const o = drawOutcome(r2, D.OUTCOMES); counts[o] = (counts[o] ?? 0) + 1; }
  const total = Object.values(D.OUTCOMES).reduce((a, b) => a + b, 0);
  const off = Object.entries(D.OUTCOMES).filter(([k, w]) => Math.abs((counts[k] ?? 0) / 20000 - w / total) > 0.012);
  check(`the lottery draws at its weights${off.length ? ` — ${off.map(o => o[0])}` : ''}`, off.length === 0);
}

// ── the run ──────────────────────────────────────────────────────────────
section('engine');
{
  const e = new Engine({ seed: 21 });
  check('a run starts idle, at the first padlock, owing the first debt', e.phase === 'idle' && e.deadline === 1 && e.debt === D.DEBTS[0]);
  check('the vendor has three charms on the shelf', e.shop.items.length === 3);
  const wallet0 = e.wallet;
  const log = [];
  e.startShift();
  check(`a shift loads the house coins (${e.drops})`, e.drops === D.START.drops);
  e.setPower(0.22); e.hold(true);
  let t = 0;
  while (e.phase === 'shift' && t < 180) { e.advance(0.25); t += 0.25; log.push(...e.drain()); }
  check(`the shift runs to its end (${t.toFixed(1)}s)`, e.phase === 'idle' && e.shift === 2);
  const launched = log.filter(x => x.t === 'launch').length, fouls = log.filter(x => x.t === 'foul').length;
  check(`every house coin was shot (${launched} launched, ${fouls} fouls)`, launched - fouls === D.START.drops);
  const collected = log.filter(x => x.t === 'collect').reduce((s, x) => s + x.value, 0);
  const credit = log.filter(x => x.t === 'credit').reduce((s, x) => s + x.n, 0);
  const stolen = log.filter(x => x.t === 'bandit').reduce((s, x) => s + x.took, 0);
  check(`the wallet is exactly what reached the tray (${wallet0} + ${collected} + ${credit} − ${stolen} = ${e.wallet})`,
    e.wallet === wallet0 + collected + credit - stolen);
  check('the board is empty and nothing is queued when a shift ends', !e.board.busy && !e.chutes.length && !e.hopper.length && !e.spin && !e.spins.length);
  check('the shift end says what it paid', log.some(x => x.t === 'shiftEnd' && x.tray.value === e.tray.value));

  // the ATM
  const w = e.wallet;
  check('the ATM takes nothing while the machine runs', (() => { const f = new Engine({ seed: 22 }); f.startShift(); return f.deposit(5) === 0; })());
  e.deposit(3);
  check('a deposit moves coins from the wallet to the ATM', e.wallet === w - 3 && e.atm === 3);
  check('and never more than you have', e.deposit(1e9) === w - 3 && e.wallet === 0);

  // the deadline: short → the floor opens; enough → a padlock and the phone
  const short = new Engine({ seed: 23 });
  short.phase = 'due'; short.atm = 5; short.wallet = 3;
  check('short at the deadline: the floor opens', short.settle() === 'fell' && short.phase === 'fell');
  check('and the wallet went into the ATM first', short.atm === 8 && short.wallet === 0);
  const rich = new Engine({ seed: 24 });
  rich.phase = 'due'; rich.atm = rich.debt + 7; rich.wallet = 0;
  check('paid at the deadline: a padlock falls and the phone rings', rich.settle() === 'paid' && rich.phase === 'phone' && rich.atm === 7);
  check('the phone offers three different deals', new Set(rich.phone.deals).size === 3);
  const offered = rich.phone.deals[0];
  rich.pickDeal(0);
  check('taking a deal starts the next deadline at shift one', rich.deadline === 2 && rich.shift === 1 && rich.phase === 'idle');
  check('the next debt is the table\'s (or cut by a soft loan)', rich.debt === D.DEBTS[1] || (offered === 'soft_loan' && rich.debt < D.DEBTS[1]));

  // the vendor
  const v = new Engine({ seed: 25 });
  v.wallet = 500;
  const first = v.shop.items[0].id, price = v.priceOf(first);
  check('a charm costs what it says', v.buy(0) && v.wallet === 500 - price && v.charms[0].id === first);
  check('and cannot be bought twice', !v.buy(0));
  check('selling gives back half', v.sell(0) && v.wallet === 500 - price + Math.floor(price / 2));
  const r0 = v.rerollCost();
  v.reroll();
  check('a reroll restocks and the next one costs more', v.rerollCost() > r0);
  v.charms = D.CHARMS.slice(0, v.slots).map(c => ({ id: c.id, paid: 1 }));
  v.shop.items = [{ id: D.CHARMS[v.slots + 2].id, sold: false }];
  check('a full rack refuses another charm', !v.buy(0));

  // charms really change the machine
  const g = new Engine({ seed: 26 });
  g.charms.push({ id: 'gutter_guards', paid: 0 }, { id: 'life_nails', paid: 0 }, { id: 'fast_motor', paid: 0 });
  g.applyRules(); g.startShift();
  check('Gutter Guards put tin over the gutters', g.pusher.guards > 0.5);
  check('Bent Life Nails bend the nails', g.board.L.mods.lifeNails === 0.4);
  check('Fast Motor quickens the stroke', g.pusher.period < PUSHER.PERIOD);

  // stamps: with the Silver Die, a coin through the start chucker lands silver
  const s = new Engine({ seed: 27 });
  s.charms.push({ id: 'silver_die', paid: 0 }); s.applyRules();
  const slog = [];
  for (let k = 0; k < 3 && !slog.some(x => x.t === 'land' && x.kind === 'silver'); k++) {
    s.startShift(); s.setPower(0.22); s.hold(true);
    for (let tt = 0; s.phase === 'shift' && tt < 180; tt += 0.25) { s.advance(0.25); slog.push(...s.drain()); }
  }
  const startHits = slog.filter(x => x.t === 'pocket' && x.kind === 'start').length;
  check(`the Silver Die mints what goes through the start chucker (${startHits} starts)`,
    startHits > 0 && slog.filter(x => x.t === 'pocket' && x.kind === 'start').every(x => x.stamped === 'silver')
    && slog.some(x => x.t === 'land' && x.kind === 'silver'));

  // FEVER
  const f = new Engine({ seed: 28 });
  f.startShift(); f.startFever('test');
  check('FEVER opens the gate and loads the fever coins', f.board.L.byId.attacker.open && f.fever.left === D.FEVER.drops);
  f.drops = 0; f.setPower(0.9); f.hold(true);
  const flog = [];
  for (let tt = 0; f.phase === 'shift' && tt < 180; tt += 0.25) { f.advance(0.25); flog.push(...f.drain()); }
  const entries = flog.filter(x => x.t === 'pocket' && x.kind === 'attacker').length;
  check(`fever coins shot right pay through the gate (${entries}/${D.FEVER.drops})`, entries >= D.FEVER.drops * 0.6);
  check('and the gate shuts when the fever is spent', !f.board.L.byId.attacker.open && flog.some(x => x.t === 'feverEnd'));

  // the bandit and the mousetrap
  const b = new Engine({ seed: 29 });
  b.wallet = 40; b.bandit();
  check('the paw takes a quarter of the wallet', b.wallet === 30);
  b.traps = 1; b.bandit();
  check('a mousetrap catches the next paw', b.wallet === 30 && b.traps === 0);
  check('the masks come up more often every deadline', (() => { const m = new Engine({ seed: 30 }); const w1 = m.weights().mask; m.deadline = 5; return m.weights().mask > w1; })());

  // determinism: the same seed and the same hands make the same run
  const runA = new Engine({ seed: 31 }), runB = new Engine({ seed: 31 });
  for (const x of [runA, runB]) { playShift(x); playShift(x); }
  check('one seed, one run', JSON.stringify(runA.stats) === JSON.stringify(runB.stats) && runA.wallet === runB.wallet
    && runA.pusher.coins.length === runB.pusher.coins.length);
}

// ── a whole run ──────────────────────────────────────────────────────────
section('a whole run');
{
  const t0 = Date.now();
  const e = playRun(4242, { policy: 'planner' });
  check(`the bot plays a run to its end (${e.phase} at deadline ${e.deadline}, ${e.stats.shifts} shifts, ${((Date.now() - t0) / 1000).toFixed(1)}s)`,
    (e.phase === 'fell' || e.phase === 'won') && e.stats.shifts >= 3);
  check('and pushed coins, spun reels and bought charms along the way', e.stats.value > 20 && e.stats.spins > 2 && e.stats.charmsBought > 0);
}

// ── the files ────────────────────────────────────────────────────────────
section('files');
{
  const html = readFileSync(path.join(GAME, 'index.html'), 'utf8');
  const token = html.match(/js\/main\.js\?v=(\d+)/)?.[1];
  const files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.m?js$/.test(f)) files.push(p); } };
  walk(path.join(GAME, 'js')); walk(path.join(GAME, 'test'));
  const odd = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      if (m[1].includes('hub/')) continue;
      const tok = m[1].match(/\?v=(\d+)$/)?.[1];
      if (tok !== token) odd.push(`${path.relative(GAME, f)} → ${m[1]}`);
    }
  }
  check(`one module token everywhere (?v=${token})${odd.length ? ` — ${odd.slice(0, 4).join('; ')}` : ''}`, !!token && odd.length === 0);
  // the shell on the same page reads the pad too; a different URL for the same
  // file is a second instance of it, with its own poller and its own edges
  const shell = readFileSync(path.join(GAME, '..', 'hub', 'shell.js'), 'utf8').match(/'\.\/pad\.js(\?v=\d+)?'/)?.[1] ?? '';
  const ours = readFileSync(path.join(GAME, 'js', 'input.js'), 'utf8').match(/'\.\.\/\.\.\/hub\/pad\.js(\?v=\d+)?'/)?.[1] ?? '';
  check(`hub/pad.js is asked for by the same URL the shell uses (${ours || 'bare'} / ${shell || 'bare'})`, ours === shell);
  const log = readFileSync(path.join(GAME, 'VERSIONS.md'), 'utf8').match(/^##\s*v(\d+)/m)?.[1];
  check(`the engine's VERSION is the log's top entry (${VERSION} / v${log})`, String(VERSION) === log);
  check('no image or audio file ships in the game', !readdirSync(GAME, { recursive: true }).some(f => /\.(png|jpe?g|gif|webp|mp3|ogg|wav)$/i.test(String(f))));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
