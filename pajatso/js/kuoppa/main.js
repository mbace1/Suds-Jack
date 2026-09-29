// KUOPPA — the roguelike page: the run (run.js) on the Pajatso machine, at
// the same table as the base page (../classic/table.js). What is its own: the
// round's CHIPS × MULT and the ante in the HUD, the LCD in the yakumono, the
// nudge's voice, and the sheets between rounds — the vendor, the lock that
// opens with its part's card, the end.

import { Kuoppa, DATA as D, JOKER, CHARM } from './run.js?v=9';
import './words.js?v=9';
import { View } from '../classic/view.js?v=9';
import { JACKPOT, LABEL } from '../classic/layout.js?v=9';
import { getLang } from '../classic/lang.js?v=9';
import { mountTable, store, $, buzz, seedFrom, t, mk, sfx } from '../classic/table.js?v=9';
import { makeLcd, drawLcd } from './lcd.js?v=9';
import { partCard } from './cards.js?v=9';
import { STOP_ORDER, TIMING } from '../reels.js?v=9';

let game = new Kuoppa({ seed: seedFrom() });
const lcd = makeLcd();
const view = new View($('gl'), game.L);
view.lcdTexture = lcd.texture;
let best = store.get('kuoppa.best', 0);           // most locks opened

const viewUpdate = view.update.bind(view);
// REACH: while the last reel turns, the camera leans in on the LCD
const reaching = g => { const s = g.spin; return !!(s && s.reach && s.t >= s.stops[STOP_ORDER[1]] && s.t < s.stops[STOP_ORDER[2]] + 0.6); };
view.update = (g, dt, time) => {
  if (view.lcdMesh) drawLcd(lcd, g, time, { reach: t('reach'), lcdShop: t('lcdShop'), lcdDue: t('lcdDue') });
  view.focus = view.lcdMesh && reaching(g) ? { x: 1.5, y: 68.9, halfW: 9 } : null;
  viewUpdate(g, dt, time);
};

// big numbers the Balatro way: 1 234, 56.7k, 8.9M, 1.2B
const big = n => {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  const u = [['B', 1e9], ['M', 1e6], ['k', 1e3]].find(([, v]) => n >= v);
  return `${(n / u[1]).toFixed(n / u[1] < 100 ? 1 : 0)}${u[0]}`;
};
const fmtMult = m => (m < 100 ? String(Math.round(m * 10) / 10) : big(m));
const L = () => getLang();
const nameOf = (type, id) => type === 'joker' ? JOKER[id].name[L()] : type === 'charm' ? CHARM[id].name[L()] : t('plateName', { w: winName(id) });
const bossOf = id => D.BOSSES.find(b => b.id === id);
const winName = k => ({ R: 'R', one: '1:00', half: '1:50', potti: '7:00', tulip: '🌷', heso: 'ヘソ', attacker: 'ATK', reel: '777' }[k] ?? LABEL[k] ?? k);

const sheetOpen = () => !$('run').hidden;
const table = mountTable({
  marksKey: 'kuoppa.marks',
  game: () => game,
  view,
  tips: { pull: 'tipPull', round: 'kTipRound', vendor: 'kTipVendor', nudge: 'tipNudge', again: 'tipAgain', right: 'tipRight', deadline: 'kTipDeadline' },
  tipVars: () => ({ n: game.handful, name: bossOf(game.boss).name[L()] }),
  words: () => ({ n: D.DROPS }),
  onEvent,
  hud,
  blocked: sheetOpen,
  padPress: i => {
    if (!sheetOpen()) return false;
    if (i === 0) $('runSheet').querySelector('.big')?.click();
    return true;
  },
  onBegin: () => setTimeout(() => table.tip('round'), 9000),
  onLang: () => { if (sheetOpen() && lastSheet) lastSheet(); },
});

function hud() {
  $('coins').querySelector('b').textContent = mk(game.coins);
  $('drops').querySelector('b').textContent = game.drops;
  $('anteLbl').textContent = t('anteWord', { d: Math.min(game.deadline, D.LOCKS) });
  $('anteGot').textContent = big(game.anteTotal);
  $('anteOf').textContent = ` / ${big(game.ante)}`;
  $('round').querySelector('b').textContent = `${Math.min(game.round, D.ROUNDS)}/${D.ROUNDS}`;
  const dl = $('dl'); dl.hidden = !game.deadlineRound; dl.textContent = t('deadline');
  $('tally').querySelector('.chips').textContent = big(game.tally.chips);
  $('tally').querySelector('.mult').textContent = fmtMult(game.tally.mult);
}

// ── the machine's events ───────────────────────────────────────────────
let pendingCleared = null;
function onEvent(ev) {
  switch (ev.t) {
    case 'insert': sfx.clink(); break;
    case 'launch': sfx.launch(); buzz(8); break;
    case 'tick': sfx.tick(ev.v, ev.x); break;
    case 'rattle': sfx.rattle(); break;
    case 'score': {
      // chips in blue, mult in red, a multiplier in gold, then what each joker did
      if (ev.kind === 'nudge' && !ev.labels.length) break;
      const parts = [];
      if (ev.chips) parts.push([`+${big(ev.chips)}`, 'chips']);
      if (ev.mult) parts.push([`+${fmtMult(ev.mult)} mult`, 'mult']);
      if (ev.xmult > 1) parts.push([`×${ev.xmult}`, 'xmult']);
      parts.forEach(([s, c], i) => setTimeout(() => table.pop(ev.x, ev.y + 3 + i * 2.2, s, c), i * 90));
      ev.labels.forEach((l, i) => setTimeout(() => table.pop(ev.x, ev.y + 3 + (parts.length + i) * 2.2, `${JOKER[l.id].name[L()]} ${l.say}`, 'joker'), (parts.length + i) * 110));
      break;
    }
    case 'win': {
      view.pop(ev.cup); view.catch(ev.x, ev.y);
      if (ev.kind === 'x3') { table.pop(ev.x, ev.y - 1, `+${ev.bonus}●`, 'bonus'); sfx.win('coin'); buzz(30); break; }
      if (ev.pay) { view.payout(Math.ceil(ev.pay)); table.pop(ev.x, ev.y - 2, `+${mk(ev.pay)} mk`, 'money'); }
      if (ev.kind === JACKPOT) { sfx.fever(); buzz([60, 40, 60, 40, 120]); table.toast(t('pottiToast'), '', 'star', 2200); }
      else if (ev.kind === 'R') { sfx.beep(); buzz(16); }
      else { sfx.win(ev.kind === 'half' ? 'bell' : 'cherry'); buzz(20); }
      break;
    }
    case 'tulip': sfx.tulip(ev.open); break;
    case 'held': view.pop(ev.cup); sfx.win('cherry'); break;
    case 'attacker': sfx.spill(1); buzz(14); break;
    case 'spin':
      if (ev.reach) setTimeout(() => { sfx.reach(); buzz([40, 80, 40, 80, 40]); table.toast(t('reach'), '', 'reach', 1400); }, (TIMING.spin + TIMING.gap) * 1000);
      break;
    case 'stage': table.pop(ev.x, ev.y + 3, 'STAGE!', 'xmult'); sfx.win('coin'); break;
    case 'reel':
      if (ev.outcome === 'miss') break;
      if (ev.outcome === 'clover') { table.toast('☘', t('clover', { n: ev.drops }), '', 1500); sfx.win('coin'); }
      else if (ev.outcome === 'mask') { table.toast(t('mask'), `−${big(ev.halved)}`, '', 2000); sfx.foul(); buzz([80, 40, 80]); }
      else if (ev.outcome === 'seven') { table.toast(`×${ev.xmult} MULT`, '777', 'star', 1800); sfx.win('coin'); buzz(40); }
      else if (ev.money) { table.toast(`+${mk(ev.money)} mk`, ev.outcome.toUpperCase(), '', 1400); view.payout(ev.money); sfx.win('bell'); }
      else { table.toast(`+${big(ev.chips)}`, ev.outcome.toUpperCase(), '', 1400); sfx.win('bell'); }
      break;
    case 'fever': table.toast(t('feverOn'), t('feverSub', { n: ev.pulls }), 'star', 2600); sfx.fever(); break;
    case 'feverEnd': table.toast(t('feverOff'), '', '', 1200); break;
    case 'chance': setTimeout(() => table.toast(t('chance'), t('chanceSub', { n: ev.spins }), 'star', 2000), 1400); break;
    case 'rushEnd': table.toast(t('rushEnd'), '', '', 1200); break;
    case 'nudge': sfx.rattle(); buzz(20); table.pop(ev.x, ev.y + 3, `${t('nudge')} ${'●'.repeat(Math.max(0, ev.left))}`, 'nudge'); break;
    case 'tilt': sfx.foul(); buzz([120, 60, 120]); table.toast(t('tilt'), t('tiltSub'), '', 1800); break;
    case 'lost': sfx.miss(); if (ev.kept) view.toPot(ev.column, ev.height, ev.from); break;
    case 'foul': sfx.foul(); table.toast(t('foul'), t('foulSub'), '', 1600); break;
    case 'returned': sfx.beep(); table.toast(t('returned'), t('returnedSub'), '', 1400); break;
    case 'ready': if (game.stats.shots === 2) table.tip('nudge'); else if (game.stats.shots === 5) table.tip('again'); break;
    case 'scored':
      sfx.fever(); buzz([30, 30, 30, 30, 90]);
      table.toast(`${big(ev.score)}`, t('scoredSub', { chips: big(ev.chips), mult: fmtMult(ev.mult) }), 'star', 2400);
      ev.labels.forEach((l, i) => setTimeout(() => table.pop(1.5, 60 - i * 3, `${JOKER[l.id].name[L()]} ${l.say}`, 'joker'), 200 + i * 220));
      break;
    case 'round': if (ev.boss) setTimeout(() => table.toast(t('deadline'), bossOf(ev.boss).name[L()], 'star', 2200), 300); break;
    case 'cleared': pendingCleared = ev; best = Math.max(best, ev.lock); store.set('kuoppa.best', best); break;
    // after a round: the score first, then the lock (if it opened), then the vendor
    case 'shop':
      if (ev.reroll) break;
      setTimeout(() => {
        if (game.phase !== 'shop' || sheetOpen()) return;
        const cl = pendingCleared; pendingCleared = null;
        if (cl) { sfx.lock(); showCleared(cl); } else showShop();
      }, 2300);
      break;
    case 'layout': view.setLayout(game.L); break;
    case 'fell': sfx.fall(); setTimeout(() => showEnd(false), 1600); break;
    case 'won': sfx.door(); setTimeout(() => showEnd(true), 1600); break;
  }
}

// ── the sheets ─────────────────────────────────────────────────────────
let lastSheet = null;
function sheet(html, render) {
  lastSheet = render;
  $('runSheet').innerHTML = html;
  $('run').hidden = false;
  $('runSheet').querySelector('.big:not([disabled])')?.focus();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function plateWhat(k, lvl) {
  const h = D.HITS[k], lv = h.lv;
  if (k === 'reel') return `×${lvl}`;
  const chips = h.chips + (lv.chips ?? 0) * (lvl - 1), mult = h.mult + (lv.mult ?? 0) * (lvl - 1);
  return [chips ? `+${chips} chips` : '', mult ? `+${mult} mult` : '', h.xmult ? `×${h.xmult}` : ''].filter(Boolean).join(' ');
}

function showShop() {
  if (game.phase !== 'shop') return;
  const cards = game.offers.map((o, i) => {
    if (!o) return `<div class="card"><h3>—</h3><p>${t('sold')}</p><button disabled>${t('sold')}</button></div>`;
    const def = o.type === 'joker' ? JOKER[o.id] : o.type === 'charm' ? CHARM[o.id] : null;
    const text = def ? def.text[L()] : t('plateText', { w: winName(o.id), l: game.levels[o.id] + 1, what: plateWhat(o.id, game.levels[o.id] + 1) });
    const label = !game.canBuy(o) && game.coins >= o.price ? t('full') : t('buy', { p: o.price });
    const tag = o.type === 'joker' ? 'tJoker' : o.type === 'charm' ? 'tCharm' : 'tPlate';
    return `<div class="card"><h3><span class="tag ${o.type}">${t(tag)}</span>${esc(nameOf(o.type, o.id))}</h3>
      <p>${esc(text)}</p><button data-buy="${i}" ${game.canBuy(o) ? '' : 'disabled'}>${label}</button></div>`;
  }).join('');
  const inv = (type, list, max) => `<div class="inv"><div>${t(type === 'joker' ? 'jokers' : 'charms', { n: list.length, max })}</div>${list.length ? list.map(item => {
    const id = item.id ?? item, def = type === 'joker' ? JOKER[id] : CHARM[id];
    const grows = type === 'joker' && def.grows ? ` <small>(${def.grows(item)})</small>` : '';
    return `<div class="row"><span><b>${esc(def.name[L()])}</b>${grows}</span><button data-sell="${type}:${id}">${t('sell', { p: Math.max(1, Math.floor(def.price * D.SELL)) })}</button></div>`;
  }).join('') : `<div class="row"><span>${t('none')}</span></div>`}</div>`;
  const lv = game.levelKinds().map(k => `<span>${winName(k)} · ${game.levels[k]}</span>`).join('');
  const boss = bossOf(game.boss);
  const toDeadline = game.round === D.ROUNDS;
  sheet(`
    <h1 style="font-size:clamp(34px, 9vw, 52px)">${t('shopTitle')}</h1>
    <div class="sub">${t('shopSub', { r: game.round, n: D.ROUNDS, got: big(game.anteTotal), ante: big(game.ante) })}</div>
    <p>${t('money')}: <b>${mk(game.coins)} mk</b></p>
    <div class="cards">${cards}</div>
    <div class="boss">${t('bossNext', { name: esc(boss.name[L()]), text: esc(boss.text[L()]) })}</div>
    ${inv('joker', game.jokers, D.JOKER_SLOTS)}${inv('charm', game.charms, D.CHARM_SLOTS)}
    <div class="lv" title="${t('levels')}">${lv}</div>
    <div class="btns">
      <button class="big" id="nextRound">${t(toDeadline ? 'nextDeadline' : 'next', { n: game.handful })}</button>
      <button class="big alt" id="reroll" ${game.coins < game.rerollCost ? 'disabled' : ''}>${t('reroll', { p: game.rerollCost })}</button>
    </div>`, showShop);
  for (const b of $('runSheet').querySelectorAll('[data-buy]')) b.addEventListener('click', () => { if (game.buy(+b.dataset.buy)) { sfx.buy(); game.drain(); showShop(); } else sfx.deny(); });
  for (const b of $('runSheet').querySelectorAll('[data-sell]')) b.addEventListener('click', () => { const [type, id] = b.dataset.sell.split(':'); if (game.sell(type, id)) { sfx.clink(); game.drain(); showShop(); } });
  $('reroll').addEventListener('click', () => { if (game.reroll()) { sfx.clink(); game.drain(); showShop(); } });
  $('nextRound').addEventListener('click', () => {
    const deadline = game.round === D.ROUNDS;
    game.nextRound(); $('run').hidden = true; lastSheet = null;
    if (deadline) setTimeout(() => table.tip('deadline'), 400);
    if (game.deadline === 1 && game.round === 2) table.tip('vendor');
  });
}

function showCleared(ev) {
  const part = ev.part;
  sheet(`
    <h1 style="font-size:clamp(34px, 9vw, 52px)">${t('clearedTitle', { d: ev.lock })}</h1>
    <p>${t('clearedSub', { bonus: ev.bonus, spare: ev.spare, next: big(ev.next) })}</p>
    ${part ? `<div class="part"><div class="sub" style="margin:0 0 6px">${t('bolted')}</div><h3>${t(`part_${part}`)}<span class="ja">${t(`partJa_${part}`)}</span></h3><div id="partPic"></div><p>${t(`partText_${part}`)}</p></div>` : ''}
    <div class="btns"><button class="big" id="toShop">${t('shopTitle')} ›</button></div>`, () => showCleared(ev));
  if (part) $('partPic').appendChild(partCard(part));
  $('toShop').addEventListener('click', showShop);
}

function showEnd(won) {
  const r = game.run;
  const opened = won ? D.LOCKS : game.deadline - 1;
  best = Math.max(best, opened); store.set('kuoppa.best', best);
  sheet(`
    <h1 style="font-size:clamp(38px, 10vw, 60px)">${won ? t('wonTitle') : t('fellTitle')}</h1>
    <p>${won ? t('wonSub') : t('fellSub', { got: big(game.anteTotal), ante: big(game.ante) })}</p>
    <div class="stats">
      <span>${t('rsLocks')} <b>${opened}/${D.LOCKS}</b></span><span>${t('rsBest')} <b>${big(r.best)}</b></span>
      <span>${t('rsPotti')} <b>${r.pottis}</b></span><span>${t('rsSpins')} <b>${r.spins}</b></span>
      <span>${t('rsSevens')} <b>${r.sevens}</b></span><span>${t('rsBought')} <b>${r.bought + r.plates}</b></span>
    </div>
    <div class="btns">
      <button class="big" id="againBtn">${t('again')}</button>
      <a class="big alt" href="./">${t('kBase')}</a>
    </div>`, () => showEnd(won));
  $('againBtn').addEventListener('click', newRun);
}

function newRun() {
  game = new Kuoppa({ seed: seedFrom() + Math.floor(Math.random() * 1e6) });
  view.setLayout(game.L); view.clearTray();
  $('run').hidden = true; lastSheet = null; pendingCleared = null;
  table.resume(); hud();
}
$('restart').addEventListener('click', newRun);

// ── the seam the browser gate drives ───────────────────────────────────
window.__kp = {
  get game() { return game; },
  view, table,
  pause: table.pause, resume: table.resume,
  get paused() { return table.st.paused; },
  get started() { return table.st.started; },
  get sheet() { return sheetOpen() ? $('runSheet').querySelector('h1')?.textContent : null; },
  debug: {
    begin: table.begin,
    pull: p => table.release(p),
    advance: s => table.advance(s),
    setLang: l => table.setLang(l),
    nudge: (dx, dy) => game.nudge(dx, dy),
    // jump the run: install parts, money, jokers — for looking at a later machine
    setup({ parts = [], coins, drops, jokers = [], charms = [] } = {}) {
      game.parts = [...parts];
      game.jokers = jokers.map(id => ({ id, n: 0 }));
      game.charms = [...charms];
      game.recompute();
      if (coins != null) game.coins = coins;
      if (drops != null) game.drops = drops;
      for (const ev of game.drain()) onEvent(ev);
    },
  },
};
