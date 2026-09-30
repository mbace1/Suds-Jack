// PAJATSO — the base machine: the rules, the view, and what this page says
// about what happens in it. The lever, keys, pad, HUD voices, language and
// loop are the table both pages stand at (table.js).

import { Pajatso, START_COINS } from './game.js?v=11';
import { View } from './view.js?v=11';
import { JACKPOT } from './layout.js?v=11';
import { mountTable, store, $, buzz, seedFrom, t, mk, sfx } from './table.js?v=11';

const BEST = 'pajatso.best';
let game = new Pajatso({ seed: seedFrom() });
const view = new View($('gl'), game.L);
let best = store.get(BEST, 0);
// THE TARGET: double what you sat down with, then another handful on top —
// a reason for a session to end somewhere other than at nothing
let goal = START_COINS * 2;

const table = mountTable({
  game: () => game,
  view,
  tips: { pull: 'tipPull', windows: 'tipWindows', again: 'tipAgain', potti: 'tipPotti', right: 'tipRight', nudge: 'tipNudge', marks: 'tipMarks', goal: 'tipGoal' },
  tipVars: () => ({ n: mk(game.pottiNow), s: START_COINS }),
  words: () => ({ n: START_COINS }),
  onEvent,
  hud,
  blocked: () => !$('broke').hidden,
  padPress: i => { if (!$('broke').hidden) { if (i === 0) refill(); return true; } return false; },
  onRelease: (p, pulled) => { if (!pulled && game.phase === 'broke') showBroke(); },
});

let shownCoins = null, upTimer = 0;
function hud() {
  if (shownCoins != null && game.coins > shownCoins) {
    const el = $('coins'); el.classList.remove('up'); void el.offsetWidth; el.classList.add('up');
    clearTimeout(upTimer); upTimer = setTimeout(() => el.classList.remove('up'), 500);
  }
  shownCoins = game.coins;
  $('coins').querySelector('b').textContent = mk(game.coins);
  $('pot').querySelector('b').textContent = mk(game.pottiNow);
  if (game.coins > best) { best = game.coins; store.set(BEST, best); }
  $('best').querySelector('b').textContent = mk(best);
  if (game.coins >= goal && game.phase !== 'broke') {
    const reached = goal;
    goal += START_COINS;
    game.stats.goals = (game.stats.goals ?? 0) + 1;
    sfx.fever(); buzz([40, 30, 40, 30, 80]);
    table.toast(t('goalToast', { n: mk(reached) }), t('goalSub', { m: mk(goal) }), 'star', 2600);
  }
  $('goal').querySelector('b').textContent = mk(goal);
  // the bar runs from where this target's climb started to the target itself
  const from = goal - START_COINS;
  $('goal').querySelector('.bar i').style.width = `${Math.max(0, Math.min(100, 100 * (game.coins - from) / (goal - from)))}%`;
}

// ── what happened in the machine, as sound and light ───────────────────
function onEvent(ev) {
  switch (ev.t) {
    case 'insert': sfx.clink(); break;
    case 'launch': sfx.launch(); buzz(8); break;
    // chrome edges clack and are felt; everything else is a small ping
    case 'tick': if (ev.what === 'window' || ev.what === 'divider') { sfx.clack(ev.v); if (ev.v > 14) buzz(5); } else sfx.tick(ev.v, ev.x); break;
    case 'rattle': sfx.rattle(); break;
    case 'win': {
      view.pop(ev.cup); view.catch(ev.x, ev.y);
      // the POTTI's column coins spill out of the pot on their own; the rest
      // of any win comes down the chute
      // whole markka and, for a 1:50, a nickel 50 p — every one of them heard
      // landing in the tray (view.onLand)
      const chute = ev.pay - ev.column;
      view.payout(Math.floor(chute), null, chute % 1 !== 0);
      table.pop(ev.x, ev.y + 2, ev.kind === 'R' ? 'R' : `+${mk(ev.pay)}`);
      if (ev.kind === JACKPOT) {
        sfx.fever(); buzz([60, 40, 60, 40, 120]);
        table.toast(t('pottiToast'), t('pottiSub', { n: mk(ev.pay) }), 'star', 2800);
        // the camera goes down to the pot and watches the middle stack pour out
        view.focus = { x: 1.5, y: 8, halfW: 18 };
        setTimeout(() => { view.focus = null; }, 2800);
      }
      else if (ev.kind === 'R') { sfx.beep(); buzz(16); }
      else { sfx.win(ev.pay > 1 ? 'bell' : 'cherry'); buzz(24); }
      break;
    }
    case 'lost': sfx.miss(); if (ev.kept) view.toPot(ev.column, ev.height, ev.from); break;
    case 'foul': sfx.foul(); table.toast(t('foul'), t('foulSub'), '', 1600); break;
    case 'returned': sfx.beep(); table.toast(t('returned'), t('returnedSub'), '', 1400); break;
    case 'ready': {
      const tipAt = { 1: 'windows', 3: 'again', 4: 'marks', 6: 'nudge', 8: 'potti', 11: 'goal' }[game.stats.shots];
      if (tipAt) table.tip(tipAt);
      break;
    }
    case 'nudge': sfx.rattle(); buzz(20); table.pop(ev.x, ev.y + 3, `${t('nudge')} ${'●'.repeat(Math.max(0, ev.left))}`); break;
    case 'tilt': sfx.foul(); buzz([120, 60, 120]); table.toast(t('tilt'), t('tiltSub'), '', 1800); break;
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
      <span>${t('sGoals')} <b>${s.goals ?? 0}</b></span>
    </div>
    <p>${t('yourBest', { n: mk(best) })}</p>
    <div class="btns">
      <button class="big" id="more">${t('more', { n: START_COINS })}</button>
    </div>`;
  $('broke').hidden = false;
  $('more').addEventListener('click', refill);
  $('more').focus();
}
function refill() {
  game.refill();
  goal = game.coins + START_COINS;
  view.clearTray();
  $('broke').hidden = true;
  hud();
}

$('restart').addEventListener('click', () => {
  game = new Pajatso({ seed: seedFrom() + Math.floor(Math.random() * 1e6) });
  goal = START_COINS * 2;
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
    get goal() { return goal; },
    setLang: l => table.setLang(l),
  },
};
