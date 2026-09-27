// KUOPPA — the roguelike page: the run (run.js) on the Pajatso machine, at
// the same table as the base page (../classic/table.js). What is its own: the
// round's coins and the debt in the HUD, the reels on the box bolted on top,
// and the sheets between rounds — the vendor, the debt, the part, the end.

import { Kuoppa, DATA as D } from './run.js?v=4';
import './words.js?v=4';
import { View } from '../classic/view.js?v=4';
import { JACKPOT } from '../classic/layout.js?v=4';
import { getLang } from '../classic/lang.js?v=4';
import { mountTable, store, $, buzz, seedFrom, t, mk, sfx } from '../classic/table.js?v=4';
import { makeLcd, drawLcd } from './lcd.js?v=4';

let game = new Kuoppa({ seed: seedFrom() });
const view = new View($('gl'), game.L);
const lcd = makeLcd();
let best = store.get('kuoppa.best', 0);           // most locks opened

// the LCD is drawn every frame, before the view renders
const viewUpdate = view.update.bind(view);
view.update = (g, dt, time) => { if (view.topper) drawLcd(lcd, g, time, { reach: t('reach'), lcdShop: t('lcdShop'), lcdDue: t('lcdDue') }); viewUpdate(g, dt, time); };

const sheetOpen = () => !$('run').hidden;
const table = mountTable({
  game: () => game,
  view,
  tips: { pull: 'tipPull', round: 'kTipRound', vendor: 'kTipVendor', again: 'tipAgain', right: 'tipRight' },
  tipVars: () => ({ n: game.handful }),
  words: () => ({ n: D.DROPS }),
  onEvent,
  hud,
  blocked: sheetOpen,
  clearTop: true,
  padPress: i => {
    if (!sheetOpen()) return false;
    if (i === 0) $('runSheet').querySelector('.big')?.click();
    return true;
  },
  onBegin: () => setTimeout(() => table.tip('round'), 9500),
  onLang: () => { if (sheetOpen() && lastSheet) lastSheet(); },
});

function hud() {
  $('coins').querySelector('b').textContent = mk(game.coins);
  $('drops').querySelector('b').textContent = game.drops;
  $('pot').querySelector('b').textContent = mk(game.pottiNow);
  $('debtLbl').textContent = t('debtIs', { d: Math.min(game.deadline, D.LOCKS) });
  $('round').querySelector('b').textContent = `${Math.min(game.round, D.ROUNDS)}/${D.ROUNDS}`;
  $('debt').querySelector('b').textContent = `${mk(game.debt)}`;
}

// ── the machine's events ───────────────────────────────────────────────
function onEvent(ev) {
  switch (ev.t) {
    case 'insert': sfx.clink(); break;
    case 'launch': sfx.launch(); buzz(8); break;
    case 'tick': sfx.tick(ev.v, ev.x); break;
    case 'rattle': sfx.rattle(); break;
    case 'win': {
      view.pop(ev.cup); view.catch(ev.x, ev.y);
      if (ev.kind === 'x3') { table.pop(ev.x, ev.y + 2, `+${ev.bonus}●`, 'bonus'); sfx.win('coin'); buzz(30); break; }
      view.payout(Math.ceil(ev.pay - ev.column));
      table.pop(ev.x, ev.y + 2, ev.kind === 'R' && ev.pay === 1 ? 'R' : `+${mk(ev.pay)}`);
      for (let i = 0; i < Math.min(Math.ceil(ev.pay), 14); i++) setTimeout(() => sfx.spill(1), 300 + i * 80);
      if (ev.kind === JACKPOT) { sfx.fever(); buzz([60, 40, 60, 40, 120]); table.toast(t('pottiToast'), t('pottiSub', { n: mk(ev.pay) }), 'star', 2800); }
      else if (ev.kind === 'R') { sfx.beep(); buzz(16); }
      else { sfx.win(ev.pay > 1 ? 'bell' : 'cherry'); buzz(24); }
      break;
    }
    case 'tulip': sfx.tulip(ev.open); break;
    case 'held': view.pop(ev.cup); sfx.win('cherry'); table.pop(ev.x, ev.y + 2, '●', 'bonus'); break;
    case 'attacker': table.pop(ev.x, ev.y, `+${mk(ev.pay)}`, 'fever'); view.payout(ev.pay); sfx.spill(1); buzz(14); break;
    case 'spin': if (ev.reach) setTimeout(() => sfx.reach(), 1300); break;
    case 'reel':
      if (ev.outcome === 'miss') break;
      if (ev.outcome === 'clover') { table.toast('☘', t('clover', { n: ev.drops }), '', 1600); sfx.win('coin'); }
      else if (ev.outcome === 'mask') { table.toast(t('mask', { n: mk(-ev.pay) }), '', '', 2000); sfx.foul(); buzz([80, 40, 80]); }
      else { table.toast(`+${mk(ev.pay)}`, ev.outcome.toUpperCase(), ev.outcome === 'seven' ? 'star' : '', 1600); view.payout(ev.pay); sfx.win(ev.outcome === 'seven' ? 'coin' : 'bell'); buzz(40); }
      break;
    case 'fever': table.toast(t('feverOn'), t('feverSub', { n: ev.pulls }), 'star', 2600); sfx.fever(); break;
    case 'feverEnd': table.toast(t('feverOff'), '', '', 1200); break;
    case 'chance': setTimeout(() => table.toast(t('chance'), t('chanceSub', { n: ev.spins }), '', 1800), 1400); break;
    case 'interest': table.toast(t('interest', { n: mk(ev.pay) }), '', '', 1400); break;
    case 'lost': sfx.miss(); if (ev.kept) view.toPot(ev.column, ev.height); break;
    case 'foul': sfx.foul(); table.toast(t('foul'), t('foulSub'), '', 1600); break;
    case 'returned': sfx.beep(); table.toast(t('returned'), t('returnedSub'), '', 1400); break;
    case 'ready': if (game.stats.shots === 3) table.tip('again'); break;
    case 'roundEnd': table.toast(t('roundOver'), '', '', 1200); break;
    // after a round the vendor opens on its own; after a debt it waits for the
    // part's sheet to be read (that sheet's button leads here)
    case 'shop': if (ev.reroll) showShop(); else setTimeout(() => { if (!sheetOpen()) showShop(); }, 1100); break;
    case 'due': setTimeout(showDue, 1100); break;
    case 'layout': view.setLayout(game.L); if (game.has('chucker')) view.addTopper(lcd.texture); break;
    case 'fell': sfx.fall(); showEnd(false); break;
    case 'won': sfx.door(); showEnd(true); break;
  }
}

// ── the sheets between rounds ──────────────────────────────────────────
let lastSheet = null;
function sheet(html, render) {
  lastSheet = render;
  $('runSheet').innerHTML = html;
  $('run').hidden = false;
  $('runSheet').querySelector('.big:not([disabled])')?.focus();
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const charmName = id => D.CHARMS.find(c => c.id === id)?.name[getLang()] ?? id;

function showShop() {
  if (game.phase !== 'shop') return;
  const L = getLang();
  const cards = game.offers.map((c, i) => c
    ? `<div class="card"><h3>${esc(c.name[L] ?? c.name.en)}</h3><p>${esc(c.text[L] ?? c.text.en)}</p>
        <button data-buy="${i}" ${game.coins < c.price || game.charms.length >= D.SLOTS ? 'disabled' : ''}>${t('buy', { p: c.price })}</button></div>`
    : `<div class="card"><h3>—</h3><p>${t('sold')}</p><button disabled>${t('sold')}</button></div>`).join('');
  const owned = game.charms.length ? game.charms.map(id => `<b>${esc(charmName(id))}</b>`).join(' · ') : t('none');
  sheet(`
    <h1 style="font-size:clamp(34px, 9vw, 52px)">${t('shopTitle')}</h1>
    <div class="sub">${t('shopSub', { r: game.round, n: D.ROUNDS, debt: game.debt })}</div>
    <p>${t('purse')}: <b>${mk(game.coins)} mk</b></p>
    <div class="cards">${cards}</div>
    <div class="owned">${t('mine', { n: game.charms.length, max: D.SLOTS })}: ${owned}</div>
    <div class="btns">
      <button class="big" id="nextRound">${t('next', { n: game.handful })}</button>
      <button class="big alt" id="reroll" ${game.coins < D.REROLL ? 'disabled' : ''}>${t('reroll', { p: D.REROLL })}</button>
    </div>`, showShop);
  for (const b of $('runSheet').querySelectorAll('[data-buy]')) b.addEventListener('click', () => { if (game.buy(+b.dataset.buy)) { sfx.buy(); showShop(); } else sfx.deny(); });
  $('reroll').addEventListener('click', () => { if (game.reroll()) sfx.clink(); });
  $('nextRound').addEventListener('click', () => {
    game.nextRound(); $('run').hidden = true; lastSheet = null;
    if (game.deadline === 1 && game.round === 2) table.tip('vendor');
  });
}

function showDue() {
  if (game.phase !== 'due') return;
  const can = game.coins >= game.debt;
  sheet(`
    <h1 style="font-size:clamp(34px, 9vw, 52px)">${t('dueTitle')}</h1>
    <p>${t('dueSub', { d: game.deadline, debt: game.debt, coins: mk(game.coins) })}</p>
    <div class="btns"><button class="big" id="payDebt">${can ? t('pay', { debt: game.debt }) : t('cantPay')}</button></div>`, showDue);
  $('payDebt').addEventListener('click', () => {
    const lock = game.deadline;
    $('run').hidden = true; lastSheet = null;
    if (game.payDebt()) {
      best = Math.max(best, lock); store.set('kuoppa.best', best);
      sfx.lock(); buzz([40, 30, 120]);
      if (game.phase !== 'won') showPaid(lock);
    }
  });
}

function showPaid(lock) {
  const part = game.parts[game.parts.length - 1];
  const fresh = part && D.PARTS.indexOf(part) === lock - 1;
  sheet(`
    <h1 style="font-size:clamp(34px, 9vw, 52px)">${t('paidTitle', { d: lock })}</h1>
    ${fresh ? `<div class="part"><div class="sub" style="margin:0 0 6px">${t('bolted')}</div><h3>${t(`part_${part}`)}</h3><p>${t(`partText_${part}`)}</p></div>` : ''}
    <div class="btns"><button class="big" id="toShop">${t('shopTitle')} ›</button></div>`, () => showPaid(lock));
  $('toShop').addEventListener('click', showShop);
}

function showEnd(won) {
  const r = game.run;
  const opened = won ? D.LOCKS : game.deadline - 1;
  sheet(`
    <h1 style="font-size:clamp(38px, 10vw, 60px)">${won ? t('wonTitle') : t('fellTitle')}</h1>
    <p>${won ? t('wonSub') : t('fellSub', { short: mk(Math.max(0, game.debt - game.coins)), d: game.deadline })}</p>
    <div class="stats">
      <span>${t('rsLocks')} <b>${opened}/${D.LOCKS}</b></span><span>${t('rsEarned')} <b>${mk(r.earned)}</b></span>
      <span>${t('rsPotti')} <b>${r.pottis}</b></span><span>${t('rsSpins')} <b>${r.spins}</b></span>
      <span>${t('rsSevens')} <b>${r.sevens}</b></span><span>${t('rsCharms')} <b>${r.charmsBought}</b></span>
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
  $('run').hidden = true; lastSheet = null;
  table.resume(); hud();
}
$('restart').addEventListener('click', newRun);

// ── the seam the browser gate drives ───────────────────────────────────
window.__kp = {
  get game() { return game; },
  view,
  pause: table.pause, resume: table.resume,
  get paused() { return table.st.paused; },
  get started() { return table.st.started; },
  get sheet() { return sheetOpen() ? $('runSheet').querySelector('h1')?.textContent : null; },
  debug: {
    begin: table.begin,
    pull: p => table.release(p),
    advance: s => table.advance(s),
    setLang: l => table.setLang(l),
    // jump the run: install parts and a purse, for looking at a later machine
    setup({ parts = [], coins, drops } = {}) {
      game.parts = [...parts]; game.rebuild();
      if (coins != null) game.coins = coins;
      if (drops != null) game.drops = drops;
      for (const ev of game.drain()) onEvent(ev);
    },
  },
};
