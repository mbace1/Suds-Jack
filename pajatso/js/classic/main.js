// PAJATSO — the base machine: the rules, the view, and what this page says
// about what happens in it. The lever, keys, pad, HUD voices, language and
// loop are the table both pages stand at (table.js).

import { Pajatso, START_COINS } from './game.js?v=4';
import { View } from './view.js?v=4';
import { JACKPOT } from './layout.js?v=4';
import { mountTable, store, $, buzz, seedFrom, t, mk, sfx } from './table.js?v=4';

const BEST = 'pajatso.best';
let game = new Pajatso({ seed: seedFrom() });
const view = new View($('gl'), game.L);
let best = store.get(BEST, 0);

const table = mountTable({
  game: () => game,
  view,
  tips: { pull: 'tipPull', windows: 'tipWindows', again: 'tipAgain', potti: 'tipPotti', right: 'tipRight' },
  tipVars: () => ({ n: mk(game.pottiNow) }),
  words: () => ({ n: START_COINS }),
  onEvent,
  hud,
  blocked: () => !$('broke').hidden,
  padPress: i => { if (!$('broke').hidden) { if (i === 0) refill(); return true; } return false; },
  onRelease: (p, pulled) => { if (!pulled && game.phase === 'broke') showBroke(); },
});

function hud() {
  $('coins').querySelector('b').textContent = mk(game.coins);
  $('pot').querySelector('b').textContent = mk(game.pottiNow);
  if (game.coins > best) { best = game.coins; store.set(BEST, best); }
  $('best').querySelector('b').textContent = mk(best);
}

// ── what happened in the machine, as sound and light ───────────────────
function onEvent(ev) {
  switch (ev.t) {
    case 'insert': sfx.clink(); break;
    case 'launch': sfx.launch(); buzz(8); break;
    case 'tick': sfx.tick(ev.v, ev.x); break;
    case 'rattle': sfx.rattle(); break;
    case 'win': {
      view.pop(ev.cup); view.catch(ev.x, ev.y);
      // the POTTI's column coins spill out of the pot on their own; the rest
      // of any win comes down the chute
      view.payout(Math.ceil(ev.pay - ev.column));
      table.pop(ev.x, ev.y + 2, ev.kind === 'R' ? 'R' : `+${mk(ev.pay)}`);
      for (let i = 0; i < Math.min(Math.ceil(ev.pay), 14); i++) setTimeout(() => sfx.spill(1), 300 + i * 80);
      if (ev.kind === JACKPOT) { sfx.fever(); buzz([60, 40, 60, 40, 120]); table.toast(t('pottiToast'), t('pottiSub', { n: mk(ev.pay) }), 'star', 2800); }
      else if (ev.kind === 'R') { sfx.beep(); buzz(16); }
      else { sfx.win(ev.pay > 1 ? 'bell' : 'cherry'); buzz(24); }
      break;
    }
    case 'lost': sfx.miss(); if (ev.kept) view.toPot(ev.column, ev.height); break;
    case 'foul': sfx.foul(); table.toast(t('foul'), t('foulSub'), '', 1600); break;
    case 'returned': sfx.beep(); table.toast(t('returned'), t('returnedSub'), '', 1400); break;
    case 'ready': if (game.stats.shots === 1) table.tip('windows'); else if (game.stats.shots === 3) table.tip('again'); else if (game.stats.shots === 6) table.tip('potti'); break;
    case 'broke': setTimeout(showBroke, 900); break;
  }
}

function showBroke() {
  if (!$('broke').hidden || game.phase !== 'broke') return;
  const s = game.stats;
  $('brokeSheet').innerHTML = `
    <h1 style="font-size:clamp(40px, 11vw, 64px)">${t('broke')}</h1>
    <div class="sub">${t('brokeSub')}</div>
    <div class="stats">
      <span>${t('sPulls')} <b>${s.shots}</b></span><span>${t('sWon')} <b>${mk(s.won)}</b></span>
      <span>${t('sBiggest')} <b>${mk(s.biggest)}</b></span><span>${t('sPeak')} <b>${mk(s.peak)}</b></span>
      <span>${t('sPotti')} <b>${s.pottis}</b></span><span>${t('sBack')} <b>${s.backs}</b></span>
    </div>
    <p>${t('yourBest', { n: mk(best) })}</p>
    <div class="btns">
      <button class="big" id="more">${t('more', { n: START_COINS })}</button>
      <a class="big alt" href="kuoppa.html">${t('kuoppaShort')}</a>
    </div>`;
  $('broke').hidden = false;
  $('more').addEventListener('click', refill);
  $('more').focus();
}
function refill() {
  game.refill();
  view.clearTray();
  $('broke').hidden = true;
  hud();
}

$('restart').addEventListener('click', () => {
  game = new Pajatso({ seed: seedFrom() + Math.floor(Math.random() * 1e6) });
  view.setLayout(game.L); view.clearTray(); table.resume(); hud();
});

// ── the seam the browser gate drives ───────────────────────────────────
window.__pj = {
  get game() { return game; },
  view,
  pause: table.pause, resume: table.resume,
  get paused() { return table.st.paused; },
  get started() { return table.st.started; },
  get power() { return table.st.power; },
  get lastPull() { return table.st.lastPull; },
  debug: {
    begin: table.begin,
    pull: p => table.release(p),
    advance: s => table.advance(s),
    setCoins(n) { game.coins = n; if (n >= 1 && game.phase === 'broke') game.phase = 'idle'; },
    setLang: l => table.setLang(l),
  },
};
