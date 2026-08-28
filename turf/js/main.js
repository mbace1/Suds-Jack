// Boot, HUD, and the enemy-phase pacing loop. Everything spatial lives in
// combat.js/grid.js/ai.js (pure, tested in bare node — test/smoke.mjs);
// this file is the only place that touches the DOM.
import { PAL } from './palette.js?v=2';
import {
  createEncounterState, getUnit, canUnitAct, stepEnemyPhase, moveUnit, orderAttack,
} from './combat.js?v=2';
import { computeLayout, render } from './render.js?v=2';
import { createInputHandler } from './input.js?v=2';

const $ = id => document.getElementById(id);
const canvas = $('board'), stage = $('stage');
const topbar = { turn: $('turnLabel'), round: $('roundLabel'), endTurn: $('endTurnBtn') };
const squadEl = $('squad'), selInfoEl = $('selInfo'), toastEl = $('toast');
const titleEl = $('title'), titleStart = $('titleStart');
const resultEl = $('result'), resultTitle = $('resultTitle'), resultBody = $('resultBody'), resultAgain = $('resultAgain');

let DATA = null, state = null, layout = null, input = null, enemyPhaseRunning = false;

// GDD.md §9: "Expand to 3-5 encounters in sequence." Two so far (loading-dock
// added right after backlot). No persistence/XP yet (that's queued after this
// per owner direction) — each encounter still boots the same fixed 3-unit
// squad at full HP; only the sequence position carries across a win.
const SEQUENCE = ['backlot', 'loading-dock'];
let seqIndex = 0;

async function loadData() {
  const [weapons, units, enemies, encounters] = await Promise.all(
    ['weapons', 'units', 'enemies', 'encounters'].map(f => fetch(`data/${f}.json`).then(r => r.json())),
  );
  return { weapons: weapons.weapons, units: units.units, enemies: enemies.enemies, encounters: encounters.encounters };
}

function fitCanvas() {
  const availW = stage.clientWidth - 16, availH = stage.clientHeight - 16;
  if (!layout || availW <= 0 || availH <= 0) return;
  let scale = Math.min(availW / layout.width, availH / layout.height);
  if (scale >= 1) scale = Math.floor(scale);
  scale = Math.max(scale, 0.5);
  canvas.style.width = `${Math.round(layout.width * scale)}px`;
  canvas.style.height = `${Math.round(layout.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);

function boot(seed) {
  const encounter = DATA.encounters.find(e => e.id === SEQUENCE[seqIndex]);
  state = createEncounterState(encounter, DATA.units, DATA.weapons, DATA.enemies, seed);
  state.moveTiles = new Map();
  state.attackTiles = [];
  state.cursor = null;
  layout = computeLayout(state.grid);
  canvas.width = layout.width;
  canvas.height = layout.height;
  fitCanvas();
  if (input) input.destroy();
  input = createInputHandler({ canvas, getState: () => state, getLayout: () => layout, onChange });
  resultEl.hidden = true;
  enemyPhaseRunning = false;
  setToast('Your move.');
  onChange();
}

function setToast(text) { toastEl.textContent = text; }

function attackText(state, attackerName, evt) {
  const target = getUnit(state, evt.targetUid);
  const who = target ? target.name : 'the target';
  if (!evt.hit) return `${attackerName} misses ${who}.`;
  let s = `${attackerName} hits ${who} for ${evt.damage}.`;
  if (evt.killed) s += ' Down.';
  else if (evt.knockback && evt.knockback.moved) s += ' Knocked back.';
  return s;
}

function onChange() {
  render(canvas, state, layout);
  updateHud();
  if (state.result) { showResult(state.result); return; }
  if (state.turn === 'enemy' && !enemyPhaseRunning) runEnemyPhase();
}

function runEnemyPhase() {
  enemyPhaseRunning = true;
  setToast('Enemy turn…');
  const tick = () => {
    const step = stepEnemyPhase(state);
    render(canvas, state, layout);
    updateHud();
    if (step && !step.done) {
      const line = step.attacked
        ? attackText(state, step.name, step.attacked)
        : (step.moved ? `${step.name} moves in.` : `${step.name} holds.`);
      setToast(line);
    }
    if (state.result) { enemyPhaseRunning = false; showResult(state.result); return; }
    if (step && step.done) { enemyPhaseRunning = false; setToast('Your move.'); return; }
    setTimeout(tick, 600);
  };
  setTimeout(tick, 350);
}

function updateHud() {
  topbar.turn.textContent = state.turn === 'player' ? 'Your Turn' : 'Enemy Turn';
  topbar.turn.className = state.turn === 'enemy' ? 'enemy' : '';
  topbar.round.textContent = `Round ${state.round}`;
  topbar.endTurn.disabled = state.turn !== 'player' || !!state.result;

  squadEl.innerHTML = '';
  for (const u of state.units.filter(u => u.faction === 'player')) {
    const btn = document.createElement('button');
    btn.className = 'unitBtn' + (u.hp <= 0 ? ' dead' : '') + (state.selected === u.uid ? ' selected' : '') + (u.hp > 0 && !canUnitAct(u) ? ' done' : '');
    btn.disabled = u.hp <= 0 || state.turn !== 'player';
    const frac = Math.max(0, u.hp / u.maxHp);
    btn.innerHTML = `<span class="nm">${u.name}</span><span class="hpTrack"><span class="hpFill" style="width:${frac * 100}%;background:${frac > 0.5 ? PAL.HP_GOOD : frac > 0.25 ? PAL.HP_MID : PAL.HP_BAD}"></span></span>`;
    btn.addEventListener('pointerup', e => { e.preventDefault(); input.selectByUid(u.uid); });
    squadEl.appendChild(btn);
  }

  const sel = state.selected ? getUnit(state, state.selected) : null;
  if (sel) {
    selInfoEl.innerHTML = `<b>${sel.name}</b> · ${sel.weapon.name} (rng ${sel.weapon.range}, dmg ${sel.weapon.damage})<br>`
      + `move: ${sel.actedMove ? 'used' : 'ready'} · act: ${sel.actedAction ? 'used' : 'ready'}`;
  } else {
    selInfoEl.textContent = state.turn === 'player' ? 'Select an operator.' : '';
  }
}

function showResult(result) {
  resultEl.hidden = false;
  const isLastEncounter = seqIndex >= SEQUENCE.length - 1;
  if (result === 'win' && !isLastEncounter) {
    resultTitle.textContent = 'BLOCK CLEARED';
    resultTitle.className = 'win';
    resultBody.textContent = 'Quiet for now. One more block to go.';
    resultAgain.textContent = 'Continue';
  } else if (result === 'win') {
    resultTitle.textContent = 'TURF SECURED';
    resultTitle.className = 'win';
    resultBody.textContent = "Every block on the list. The city doesn't get any nicer, but tonight it's yours.";
    resultAgain.textContent = 'Run It Back';
  } else {
    resultTitle.textContent = 'CREW DOWN';
    resultTitle.className = 'lose';
    resultBody.textContent = 'Three operators, one block. Not this time.';
    resultAgain.textContent = 'Run It Back';
  }
}

titleStart.addEventListener('pointerup', e => {
  e.preventDefault();
  if (titleStart.disabled) return;
  titleEl.hidden = true;
  boot(Date.now());
});
resultAgain.addEventListener('pointerup', e => {
  e.preventDefault();
  // Winning a non-final encounter advances the sequence; a final win or any
  // loss restarts the run from encounter 1 — see the SEQUENCE comment above.
  seqIndex = (state.result === 'win' && seqIndex < SEQUENCE.length - 1) ? seqIndex + 1 : 0;
  boot(Date.now());
});
topbar.endTurn.addEventListener('pointerup', e => { e.preventDefault(); input && input.endTurn(); });

// Console/test hook, same shape as every other game's (__hd, __dc, __sj):
// state for inspection, the commands a click ultimately calls, and boot()
// to start a fresh encounter without going through the title screen.
window.__turf = {
  state: () => state,
  layout: () => layout,
  boot,
  select: uid => input && input.selectByUid(uid),
  move: (uid, x, y) => { const r = moveUnit(state, uid, x, y); onChange(); return r; },
  attack: (uid, targetUid) => { const r = orderAttack(state, uid, targetUid); onChange(); return r; },
  endTurn: () => input && input.endTurn(),
  sequence: () => ({ ids: SEQUENCE.slice(), index: seqIndex }),
  setSequenceIndex: i => { seqIndex = i; },
};

loadData().then(data => {
  DATA = data;
  titleStart.disabled = false;
  titleStart.textContent = 'Start';
}).catch(err => {
  titleStart.textContent = 'Failed to load — reload';
  console.error('TURF: failed to load data', err);
});
