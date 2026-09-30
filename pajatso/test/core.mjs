// PAJATSO — the core gate. Bare node: no browser, no GPU, no audio.
//
//   node pajatso/test/core.mjs
//
// Two modes share one physics: the classic Pajatso (js/classic/) and the pit
// run, KUOPPA (js/engine.js and the pachinko board).
//
// Everything that is rules or physics is checked here against exact numbers
// and seeded runs; what the machine LOOKS like is test/smoke.cjs's job, and
// whether the economy is any fun is test/measure.mjs's (never a gate).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRng, seedOf } from '../js/rng.js?v=11';
import { Board, buildLayout, BOARD } from '../js/board.js?v=11';
import { Pusher, PUSHER } from '../js/pusher.js?v=11';
import { drawOutcome, buildGrid, linesShown, reachLines, LINES } from '../js/reels.js?v=11';
import { Engine, computeRules, VERSION } from '../js/engine.js?v=11';
import * as D from '../js/data.js?v=11';
import { playRun, playShift } from './bot.mjs?v=11';
import { buildPajatso, FACE, PAYS, JACKPOT, WINDOWS, LABEL, POT_START, POTTI_COLS, MIDDLE, columnAt } from '../js/classic/layout.js?v=11';
import { _STR } from '../js/classic/lang.js?v=11';
import '../js/kuoppa/words.js?v=11';
import { Kuoppa, computeRules as kRules, DATA as KD } from '../js/kuoppa/run.js?v=11';
import { playRun as playKuoppa, POLICIES } from './runbot.mjs?v=11';
import { Pajatso, START_COINS } from '../js/classic/game.js?v=11';

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

// ── the Pajatso face ─────────────────────────────────────────────────────
section('pajatso: the face');
{
  const L = buildPajatso();
  const d = 2 * FACE.COIN_R;
  // THE WEDGE RULE: every pair of nails is either a pass for the coin or not
  // a gap at all. A pair closer than a pass is a well a coin sits in.
  let tight = [];
  for (let i = 0; i < L.pins.length; i++) for (let j = i + 1; j < L.pins.length; j++) {
    const a = L.pins[i], b = L.pins[j], gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
    if (gap < FACE.CLEAR - 0.05) tight.push(`${a.tag}@${a.x.toFixed(1)},${a.y.toFixed(1)}–${b.tag}@${b.x.toFixed(1)},${b.y.toFixed(1)} (${gap.toFixed(2)})`);
  }
  check(`no two nails closer than a pass (${FACE.CLEAR} bu of air)${tight.length ? ` — ${tight.slice(0, 3).join('; ')}` : ''}`, tight.length === 0);
  const wins = L.pockets.filter(p => p.window != null).sort((a, b) => a.x - b.x);
  check(`the row of windows is the photograph's: ${wins.map(p => LABEL[p.pay]).join(' ')}`,
    wins.map(p => LABEL[p.pay]).join(' ') === 'R 1:00 1:50 1:50 7:00 1:50 1:50 1:00 R');
  check('every window is wider than the coin and narrower than a coin and a quarter', wins.every(p => p.w > d && p.w < d * 1.25));
  check('the POTTI window is the narrowest, and guarded by a nail over its mouth',
    wins.every(p => p.pay === JACKPOT || p.w > L.byId.w4.w) && L.pins.some(q => q.tag === 'guard' && Math.abs(q.x - L.byId.w4.x) < 0.01));
  // between two windows is a pass: a coin that misses them falls on down
  const gaps = wins.slice(1).map((p, i) => (p.x - p.w / 2) - (wins[i].x + wins[i].w / 2));
  check(`the air between windows is a pass (${Math.min(...gaps).toFixed(2)} bu ≥ ${FACE.CLEAR})`, Math.min(...gaps) >= FACE.CLEAR);
  check('the pot is thirteen columns covering the face edge to edge, one pocket each and none of them paying',
    L.columns.length === FACE.COLS && L.columns[0].x0 <= -L.Rin && L.columns.at(-1).x1 >= BOARD.R
    && L.pockets.filter(p => p.pot != null).length === FACE.COLS && L.pockets.every(p => p.pot == null || p.pay == null));
  check('a coin anywhere across the bottom lands in a column', [-26.9, -10, 0, 1.5, 15, 29.9].every(x => columnAt(L, x) >= 0 && columnAt(L, x) < FACE.COLS));
  check('the POTTI opens the three middle columns, which start as the top of the hump',
    POTTI_COLS.length === 3 && POTTI_COLS.every(k => POT_START[k] >= Math.max(...POT_START) - 1));
  check('the window labels and payouts agree (1:50 is one and a half)', WINDOWS.every(k => PAYS[k] > 0) && PAYS.half === 1.5 && PAYS.one === 1 && PAYS.R === 1);
}

section('pajatso: the machine');
{
  // the lever across its whole travel, a coin at a time, on a fresh pot
  const g = new Pajatso({ seed: 2024, coins: 1e9 });
  const out = { win: 0, lost: 0, foul: 0, returned: 0 };
  const byPower = [];
  let slowest = 0, paid = 0, pottis = 0;
  for (let i = 0; i <= 10; i++) {
    const p = i / 10, seen = { L: 0, C: 0, R: 0 };
    for (let n = 0; n < 60; n++) {
      g.pot = [...POT_START];
      g.pull(p);
      let t = 0;
      while (g.phase === 'flight' && t < 60) { g.update(1 / 30); t += 1 / 30; }
      slowest = Math.max(slowest, t);
      for (const ev of g.drain()) {
        if (ev.t in out) out[ev.t]++;
        if (ev.t === 'win') { paid += ev.pay; if (ev.kind === JACKPOT) pottis++; seen[ev.x < -9 ? 'L' : ev.x > 9 ? 'R' : 'C']++; }
      }
    }
    byPower.push(seen);
  }
  const N = 11 * 60;
  check(`every coin comes to rest: none on the face after the slowest shot (${slowest.toFixed(1)}s)`, slowest < 20 && g.phase === 'idle');
  check(`no coin has to be fished out (${out.returned} of ${N})`, out.returned <= N * 0.005);
  check(`fouls are rare across the lever (${out.foul} of ${N})`, out.foul <= N * 0.03);
  check(`most coins go to the pot, as on a real one (${Math.round(100 * out.lost / N)}%)`, out.lost / N > 0.4 && out.lost / N < 0.75);
  check(`every kind of window is hit somewhere on the lever`,
    Object.keys(PAYS).every(k => Object.keys(g.stats.hits).some(id => buildPajatso().byId[id]?.pay === k)));
  // the bare base face (no nails) catches ~1 in 36 in the 7:00, so the rarity
  // is paid for in the POTTI opening one column, not three
  check(`the POTTI is rare (${pottis} in ${N})`, pottis > 0 && pottis < N * 0.045);
  check('the base machine is windows and nothing else: no nail field', !g.L.pins.some(p => p.tag === 'field'));
  const sideOf = s => (s.R - s.L) / Math.max(1, s.L + s.R + s.C);
  check(`the lever steers: a long pull lands further right than a short one (${sideOf(byPower[1]).toFixed(2)} → ${sideOf(byPower[10]).toFixed(2)})`,
    sideOf(byPower[10]) - sideOf(byPower[1]) > 0.3);
  // 660 coins see only a handful of POTTIs at ~40 each, so this band is wide
  // on purpose; the number to tune by is test/face.mjs's, over 3000 coins
  const rtp = paid / (N - out.foul - out.returned);
  check(`on a fresh pot it pays back about what it takes (${rtp.toFixed(2)} a markka)`, rtp > 0.6 && rtp < 1.3);
}

section('pajatso: the rules');
{
  const g = new Pajatso({ seed: 5, coins: 3 });
  check(`a session starts with the handful (${START_COINS} mk)`, new Pajatso().coins === START_COINS && START_COINS >= 20);
  check('a pull puts a coin in and costs one', g.pull(0.4) && g.coins === 2 && g.inFlight);
  check('one coin at a time: no second pull while it is on the face', !g.pull(0.4) && g.coins === 2);
  g.finish();
  check('the coin comes to rest and the lever is free again', g.phase === 'idle' || g.phase === 'broke');
  const win = (id, coins = 5) => { const h = new Pajatso({ seed: 9, coins }); h.pull(0.5); h.drain(); h.onBoard({ t: 'pocket', pocket: id }); return [h, h.drain().find(e => e.t === 'win')]; };
  const [h1, e1] = win('w2');
  check(`a 1:50 window pays one and a half (${e1?.pay})`, e1?.pay === 1.5 && h1.coins === 5.5);
  const [h2, e2] = win('w0');
  check('R gives the coin back', e2?.pay === 1 && h2.coins === 5 && h2.stats.backs === 1);
  const [h3, e3] = win('w4');
  const col = POT_START[MIDDLE];
  check(`the POTTI pays 7:00 and the middle column (${e3?.pay} = 7 + ${col})`,
    e3?.pay === 7 + col && e3.column === col && h3.pot[MIDDLE] === 0 && h3.pot[MIDDLE - 1] === POT_START[MIDDLE - 1] && h3.stats.pottis === 1);
  check('and the columns it opened start filling again from nothing', h3.pottiNow === 7);
  // a miss joins the pile it fell into
  const m = new Pajatso({ seed: 9, coins: 5 });
  m.pull(0.5); m.drain(); m.onBoard({ t: 'pocket', pocket: 'c6' });
  const lost = m.drain().find(e => e.t === 'lost');
  check('a coin that misses every window joins its column of the pot', lost?.column === 6 && m.pot[6] === POT_START[6] + 1 && m.pottiNow === 7 + col + 1);
  // a full stack bounces the coin on to the next one with room, toward the
  // side it came down on; only a pot full everywhere loses it to the cash box
  const fp = new Pajatso({ seed: 9, coins: 5 });
  fp.pot[2] = fp.pot[3] = fp.pot[4] = FACE.COL_MAX;
  fp.intoPot(3, fp.L.columns[3].x + 0.5);
  const hop = fp.drain().find(e => e.t === 'lost');
  check(`a coin on a full stack bounces on to the next with room (${hop?.from} → ${hop?.column})`, hop?.kept && hop.from === 3 && hop.column === 5 && fp.pot[5] === POT_START[5] + 1);
  fp.pot.fill(FACE.COL_MAX); fp.intoPot(6, 1.5);
  check('only a pot full everywhere loses the coin to the cash box', fp.drain().find(e => e.t === 'lost')?.kept === false);
  const full = new Pajatso({ seed: 9, coins: 5, pot: POT_START.map(() => FACE.COL_MAX) });
  full.pull(0.5); full.drain(); full.onBoard({ t: 'pocket', pocket: 'c0' });
  check('a full column spills into the cash box: the pile never grows past the glass', full.pot[0] === FACE.COL_MAX && full.drain().find(e => e.t === 'lost')?.kept === false);
  const f = new Pajatso({ seed: 9, coins: 5 });
  f.pull(0.5); f.onBoard({ t: 'foul' });
  check('a coin that does not get round the top comes back', f.coins === 5);
  const half = new Pajatso({ seed: 9, coins: 0.5 });
  check('fifty penni is not a pull: broke means under one markka', half.phase === 'broke' && !half.pull(0.5));
  const b = new Pajatso({ seed: 11, coins: 1 });
  b.pull(0.95); b.finish();
  check('the last markka spent and lost leaves you broke, or paid you something', b.coins < 1 ? b.phase === 'broke' : b.phase === 'idle');
  b.coins = 0; b.phase = 'broke'; b.pot[6] = 1;
  check(`${START_COINS} more from the bar starts a fresh session, and the pot stays what it was`,
    b.refill() && b.coins === START_COINS && b.phase === 'idle' && b.stats.shots === 0 && b.pot[6] === 1);
  const run = seed => { const x = new Pajatso({ seed, coins: 30 }); for (let i = 0; i < 12; i++) { x.pull(i / 11); x.finish(); } return `${x.coins}/${x.pot}`; };
  check('one seed, one session', run(77) === run(77));
}

section('kuoppa: the parts on the face');
{
  const mods = k => ({ parts: KD.PARTS.slice(0, k) });
  let wedges = [];
  for (let k = 0; k <= KD.PARTS.length; k++) {
    const L = buildPajatso({ ...mods(k), winWiden: 0.25, rubberPins: 1 });
    for (let i = 0; i < L.pins.length; i++) for (let j = i + 1; j < L.pins.length; j++) {
      const a = L.pins[i], b = L.pins[j], gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      if (gap < FACE.CLEAR - 0.05) wedges.push(`${k}:${a.tag}–${b.tag}`);
    }
    for (const w of L.windmills) for (const p of L.pins) if (Math.hypot(w.x - p.x, w.y - p.y) - w.r - p.r < FACE.CLEAR - 0.05) wedges.push(`${k}:mill–${p.tag}`);
  }
  check(`every stage of the face keeps the wedge rule, filed windows included${wedges.length ? ` — ${wedges.slice(0, 3)}` : ''}`, wedges.length === 0);
  const L6 = buildPajatso(mods(6));
  check('the parts arrive where the roadmap puts them', !!L6.byId.start && L6.pockets.filter(p => p.tulip).length === 2
    && L6.byId.attacker?.open === false && L6.windmills.length === 2 && L6.pockets.filter(p => p.pay === 'x3').length === 2);
  check('the base machine has none of them', (() => { const b = buildPajatso(); return !b.byId.start && !b.byId.attacker && !b.windmills.length && !b.pockets.some(p => p.tulip || p.pay === 'x3'); })());
  // the machine with every part, the lever swept: nothing stuck
  const g = new Kuoppa({ seed: 31 });
  g.parts = [...KD.PARTS]; g.rebuild();
  let rescued = 0, fouls = 0, starts = 0, N = 0, slow = 0;
  for (let i = 0; i <= 10; i++) for (let n = 0; n < 24; n++) {
    g.drops = 1; g.phase = 'idle'; g.spins = []; g.spin = null;
    g.pull(i / 10);
    let t = 0; while (g.phase === 'flight' && t < 60) { g.update(1 / 30); t += 1 / 30; }
    slow = Math.max(slow, t); N++;
    for (const ev of g.drain()) { if (ev.t === 'returned') rescued++; if (ev.t === 'foul') fouls++; if (ev.t === 'held' || ev.t === 'overflow') starts++; }
  }
  check(`with every part on, no coin has to be fished out (${rescued} of ${N}) and none is slow (${slow.toFixed(1)}s)`, rescued <= N * 0.01 && slow < 20);
  check(`the start chucker is found (${starts} of ${N})`, starts > N * 0.02);
}

section('kuoppa: the rules');
{
  const g = new Kuoppa({ seed: 4 });
  check(`a run starts with ${KD.DROPS} coins to shoot, a little money and the first ante (${KD.anteFor(1)})`,
    g.drops === KD.DROPS && g.coins === KD.START_MONEY && g.phase === 'idle' && g.ante === KD.ANTE_BASE);
  check('the ante is ×10 a lock', [1, 2, 3, 8].every(a => KD.anteFor(a) === KD.ANTE_BASE * 10 ** (a - 1)));
  check("a pull is paid with the round's coins, not the money", g.pull(0.4) && g.drops === KD.DROPS - 1 && g.coins === KD.START_MONEY);
  g.finish(); g.drain();
  // scoring: base + level, chips and mult into the round's tally
  const s0 = new Kuoppa({ seed: 5 });
  s0.onBoard({ t: 'pocket', pocket: 'w2' });              // a 1:50
  check(`a 1:50 scores ${KD.HITS.half.chips} chips`, s0.tally.chips === KD.HITS.half.chips && s0.tally.mult === 1);
  s0.onBoard({ t: 'pocket', pocket: 'w0' });              // R
  check('R scores mult and gives a markka back', s0.tally.mult === 2 && s0.coins === KD.START_MONEY + 1);
  s0.levels.half = 3; s0.onBoard({ t: 'pocket', pocket: 'w3' });
  check('a level plate raises what a window scores', s0.tally.chips === KD.HITS.half.chips * 2 + KD.HITS.half.lv.chips * 2 && s0.tally.mult === 2 + KD.HITS.half.lv.mult * 2);
  s0.pot[5] = s0.pot[6] = s0.pot[7] = 4;
  const m0 = s0.coins, x0 = s0.tally.mult;
  s0.onBoard({ t: 'pocket', pocket: 'w4' });
  check('the POTTI scores ×2 mult and pays the middle of the pot in markka', s0.tally.mult === (x0 + 0) * 2 && s0.coins === m0 + 12 && s0.pot[6] === 0);
  // the round scores CHIPS × MULT and pays the barman's cut
  const e = new Kuoppa({ seed: 6 });
  e.tally.chips = 40; e.tally.mult = 3; e.drops = 0; e.phase = 'spent';
  e.update(1 / 30);
  const sc = e.drain().find(v => v.t === 'scored');
  check('when the last coin is down the round scores chips × mult toward the ante', sc?.score === 120 && sc.total === 120);
  check('reaching the ante early opens the lock and pays for the rounds not needed', e.deadline === 2 && e.parts[0] === 'chucker' && e.phase === 'shop'
    && e.coins === KD.START_MONEY + KD.ROUND_PAY + KD.CLEAR_PAY + KD.EARLY_PAY * 2);
  const f = new Kuoppa({ seed: 7 });
  for (let r = 0; r < KD.ROUNDS; r++) { f.drops = 0; f.phase = 'spent'; f.tally.chips = 1; f.update(1 / 30); f.drain(); if (f.phase === 'shop') f.nextRound(); }
  check('three rounds short of the ante: the floor opens', f.phase === 'fell');
  // jokers
  const j = new Kuoppa({ seed: 8 });
  j.jokers = [{ id: 'bajazzo', n: 0 }, { id: 'bear', n: 0 }];
  j.tally.chips = 10; j.drops = 0; j.phase = 'spent'; j.update(1 / 30);
  const js = j.drain().find(v => v.t === 'scored');
  check('jokers work in order at the round\'s end: (1 + 4) × 1.5', js.mult === 7.5 && js.score === 75 && js.labels.length === 2);
  const k = new Kuoppa({ seed: 8 });
  k.jokers = [{ id: 'mirror_ball', n: 0 }];
  k.onBoard({ t: 'pocket', pocket: 'w1' });
  check('the Mirror Ball scores the first window twice', k.tally.chips === 2 * KD.HITS.one.chips);
  const st = new Kuoppa({ seed: 8 });
  st.jokers = [{ id: 'stacker', n: 0 }];
  st.onBoard({ t: 'pocket', pocket: 'c3' }); st.onBoard({ t: 'pocket', pocket: 'c4' });
  check('a growing joker grows from what happens (the Stacker, +2 a coin in the pot)', st.jokers[0].n === 4);
  // the vendor
  const v = new Kuoppa({ seed: 9 });
  v.coins = 100; v.drops = 0; v.phase = 'spent'; v.update(1 / 30); v.drain();
  check('after a round short of the ante: the vendor, two cards and a level plate', v.phase === 'shop' && v.offers.length === 3 && v.offers[2].type === 'plate');
  const plateKind = v.offers[2].id, lv0 = v.levels[plateKind];
  check('a plate raises its window a level', v.buy(2) && v.levels[plateKind] === lv0 + 1);
  const ji = v.offers.findIndex(o => o && o.type !== 'plate');
  const bought = v.offers[ji];
  check('a joker or charm is bought for its price and kept', v.buy(ji) && v.owned(bought.id));
  const before = v.coins;
  check('and sells back for half', v.sell(bought.type, bought.id) && v.coins === before + Math.max(1, Math.floor(bought.price * KD.SELL)) && !v.owned(bought.id));
  const r0 = v.coins, rc = v.rerollCost;
  check('another look costs more each time', v.reroll() && v.coins === r0 - rc && v.rerollCost === rc + 1);
  check('the vendor never stocks what you have, or what your machine has no part for',
    ['joker', 'charm'].every(tp => v.eligible(tp).every(c => !v.owned(c.id) && (!c.needs || v.has(c.needs)))));
  check('the next round hands you the coins', v.nextRound() && v.phase === 'idle' && v.drops === v.handful);
  // the deadline round
  const d = new Kuoppa({ seed: 10 });
  d.boss = 'short_hand'; d.round = KD.ROUNDS;
  check('the third round is the deadline round, and its twist bites only then', d.deadlineRound && d.handful === KD.DROPS - 10 && (d.round = 1, d.handful === KD.DROPS));
  const dt = new Kuoppa({ seed: 10 });
  dt.boss = 'taped_potti'; dt.round = KD.ROUNDS; dt.taped();
  check('the taped POTTI is shut in the deadline round', dt.L.byId.w4.open === false);
  dt.round = 1; dt.taped();
  check('and open again after', dt.L.byId.w4.open === true);
  check('every ante draws a twist the machine can have', KD.BOSSES.every(b => b.name.en && b.text.fi && b.text.ja) && !!new Kuoppa({ seed: 11 }).boss);
  // the parts, in the owner's order
  const w = new Kuoppa({ seed: 12 });
  for (let a = 0; a < KD.LOCKS; a++) { w.tally.chips = w.ante; w.drops = 0; w.phase = 'spent'; w.update(1 / 30); w.drain(); if (w.phase === 'shop') w.nextRound(); }
  check(`the parts come in the owner's order (${w.parts.join(' → ')}), and eight antes open the door`, w.parts.join() === KD.PARTS.join() && w.phase === 'won');
  // the parts' rules
  const r = new Kuoppa({ seed: 13 });
  r.parts = [...KD.PARTS]; r.rebuild();
  r.onBoard({ t: 'pocket', pocket: 'start' });
  check('a coin in the heso holds a spin and scores', r.spins.length === 1 && r.tally.chips === KD.HITS.heso.chips);
  const drops = r.drops;
  r.onBoard({ t: 'pocket', pocket: 'w0' });
  check(`the ×3 window hands you ${KD.TIMES3} more coins to shoot`, r.drops === drops + KD.TIMES3);
  r.openFever();
  check('a jackpot opens the attacker (大当たり)', r.L.byId.attacker.open && r.fever > 0);
  r.fever = 1; r.settle();
  check('and it shuts when the pulls run out', !r.L.byId.attacker.open);
  r.openRush();
  check('確変 RUSH opens the electric tulip', r.L.byId.denchu.open === true && r.chance === KD.CHAIN.spins);
  // the reels pay the picture
  const sp = new Kuoppa({ seed: 14 });
  sp.parts = ['chucker']; sp.rebuild();
  let right = true, spun = 0;
  for (let i = 0; i < 300; i++) {
    sp.spins = [{ from: 'start' }]; sp.spinGap = 0; sp.newTally(); sp.tally.chips = 100;
    const dr = sp.drops, mo = sp.coins;
    sp.update(1 / 30);
    const s = sp.spin;
    while (sp.spin) sp.update(1 / 30);
    spun++;
    const shown = linesShown(s.grid).map(l => l.symbol);
    const want = { chips: 100, mult: 1, drops: dr, coins: mo };
    for (const y of shown) {
      if (y === 'cherry' || y === 'bell') want.chips += KD.REEL[y].chips;
      if (y === 'coin') want.coins += KD.REEL.coin.money;
      if (y === 'clover') want.drops += KD.REEL.clover.drops;
      if (y === 'seven') want.mult *= 2;
      if (y === 'mask') want.chips -= Math.floor(want.chips / 2);
    }
    if (sp.tally.chips !== want.chips || sp.tally.mult !== want.mult || sp.drops !== want.drops || sp.coins !== want.coins) right = false;
    sp.drain();
  }
  check(`the reels score exactly what the picture shows (${spun} spins)`, right);
  const x = kRules(['heavy_r', 'bent_nail', 'beer_crate', 'dark_pint']);
  check('rules combine: sums add, flags take the biggest', x.rMoney === 1 && x.openPotti === 1 && x.extraDrops === 0);
  const a1 = playKuoppa(99, POLICIES.balatro), b1 = playKuoppa(99, POLICIES.balatro);
  check(`a bot plays a run to its end (${a1.phase} at lock ${a1.deadline}), and one seed is one run`,
    (a1.phase === 'fell' || a1.phase === 'won') && a1.deadline === b1.deadline && a1.run.scored === b1.run.scored && a1.jokers.map(q => q.id).join() === b1.jokers.map(q => q.id).join());
}

section('pajatso: the nudge');
{
  const g = new Pajatso({ seed: 21 });
  g.pull(0.5);
  let t = 0; while (g.board.inLane(g.board.coins[0]) && t < 5) { g.update(1 / 60); t += 1 / 60; }
  g.drain();
  const c = g.board.coins[0], vx = c.vx;
  check('a tap shoves the coin toward it', g.nudge(1, 0) && g.board.coins[0].vx > vx + 5);
  check('the second is free too', g.nudge(-1, 0) && g.inFlight);
  check('the third tilts: the coin is the machine\'s', g.nudge(1, 0) && !g.inFlight && g.drain().some(e => e.t === 'tilt'));
  const h = new Pajatso({ seed: 22 });
  h.pull(0.5);
  check('a coin still climbing the lane cannot be nudged', !h.nudge(1, 0));
  const k = new Kuoppa({ seed: 23 });
  k.boss = 'tilt_sensor'; k.round = KD.ROUNDS;
  k.pull(0.5); let u = 0; while (k.board.inLane(k.board.coins[0]) && u < 5) { k.update(1 / 60); u += 1 / 60; }
  check('the Tilt Sensor tilts on the first nudge of the deadline round', k.nudge(1, 0) && !k.inFlight);
}

section('pajatso: three languages');
{
  const keys = Object.keys(_STR.en);
  const missing = ['fi', 'ja'].flatMap(l => keys.filter(k => !_STR[l][k]).map(k => `${l}.${k}`));
  check(`every line is in Finnish and Japanese as well as English${missing.length ? ` — ${missing.slice(0, 5).join(', ')}` : ''}`, missing.length === 0);
  // pachinko's own words (大当たり, 確変, REACH) and the parts' Japanese names
  // are the same in every language on purpose
  const same = ['fi', 'ja'].flatMap(l => keys.filter(k => _STR[l][k] === _STR.en[k] && !/^(★ POTTI|★ POTTI!|REACH!|FEVER!|CHANCE|TILT!|Ante \{d\}\/8|大当たり!|確変 RUSH)$/.test(_STR.en[k]) && !k.startsWith('partJa_')).map(k => `${l}.${k}`));
  check(`and none of them is the English left in place${same.length ? ` — ${same.slice(0, 5).join(', ')}` : ''}`, same.length === 0);
  const html = readFileSync(path.join(GAME, 'index.html'), 'utf8') + readFileSync(path.join(GAME, 'kuoppa.html'), 'utf8');
  const used = [...html.matchAll(/data-il?="(\w+)"/g)].map(m => m[1]);
  check(`every key the page asks for exists (${used.length})`, used.every(k => k in _STR.en));
}

// ── the files ────────────────────────────────────────────────────────────
section('files');
{
  const html = readFileSync(path.join(GAME, 'index.html'), 'utf8');
  const token = html.match(/js\/classic\/main\.js\?v=(\d+)/)?.[1];
  const pit = readFileSync(path.join(GAME, 'pit.html'), 'utf8').match(/js\/main\.js\?v=(\d+)/)?.[1];
  const kp = readFileSync(path.join(GAME, 'kuoppa.html'), 'utf8').match(/js\/kuoppa\/main\.js\?v=(\d+)/)?.[1];
  check(`all three pages ask for the same token (Pajatso ?v=${token}, Kuoppa ?v=${kp}, the old pit ?v=${pit})`, !!token && token === pit && token === kp);
  const files = [];
  const walk = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.m?js$/.test(f)) files.push(p); } };
  walk(path.join(GAME, 'js')); walk(path.join(GAME, 'test'));
  const odd = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      if (m[1].includes('hub/') || m[1].includes('toko/')) continue;    // the site's modules, on their own tokens
      const tok = m[1].match(/\?v=(\d+)$/)?.[1];
      if (tok !== token) odd.push(`${path.relative(GAME, f)} → ${m[1]}`);
    }
  }
  check(`one module token everywhere (?v=${token})${odd.length ? ` — ${odd.slice(0, 4).join('; ')}` : ''}`, !!token && odd.length === 0);
  // the shell on the same page reads the pad too; a different URL for the same
  // file is a second instance of it, with its own poller and its own edges
  const shell = readFileSync(path.join(GAME, '..', 'hub', 'shell.js'), 'utf8').match(/'\.\/pad\.js(\?v=\d+)?'/)?.[1] ?? '';
  const ours = readFileSync(path.join(GAME, 'js', 'input.js'), 'utf8').match(/'\.\.\/\.\.\/hub\/pad\.js(\?v=\d+)?'/)?.[1] ?? '';
  const classic = readFileSync(path.join(GAME, 'js', 'classic', 'table.js'), 'utf8').match(/'\.\.\/\.\.\/\.\.\/hub\/pad\.js(\?v=\d+)?'/)?.[1] ?? '';
  check(`hub/pad.js is asked for by the same URL the shell uses (${ours || 'bare'} · ${classic || 'bare'} / ${shell || 'bare'})`, ours === shell && classic === shell);
  const log = readFileSync(path.join(GAME, 'VERSIONS.md'), 'utf8').match(/^##\s*v(\d+)/m)?.[1];
  check(`the engine's VERSION is the log's top entry (${VERSION} / v${log})`, String(VERSION) === log);
  check('no image or audio file ships in the game', !readdirSync(GAME, { recursive: true }).some(f => /\.(png|jpe?g|gif|webp|mp3|ogg|wav)$/i.test(String(f))));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
