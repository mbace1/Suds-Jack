// Boot, HUD, and the enemy-phase pacing loop. Everything spatial lives in
// combat.js/grid.js/ai.js (pure, tested in bare node — test/smoke.mjs);
// this file is the only place that touches the DOM.
import { PAL } from './palette.js?v=3';
import {
  createEncounterState, getUnit, canUnitAct, stepEnemyPhase, moveUnit, orderAttack,
  awardXp, xpToNext, applyTrinkets,
} from './combat.js?v=8';
import { computeLayout, render } from './render.js?v=11';
import { createInputHandler } from './input.js?v=7';
import { createAnimator } from './anim.js?v=4';
import { audio } from './audio.js?v=1';

const $ = id => document.getElementById(id);
const canvas = $('board'), stage = $('stage');
const topbar = { turn: $('turnLabel'), round: $('roundLabel') };
const controls = { endTurn: $('endTurnBtn'), cancel: $('cancelBtn'), mute: $('muteBtn') };
const squadEl = $('squad'), selPortraitEl = $('selPortrait'), selTextEl = $('selText'), toastEl = $('toast');
const titleEl = $('title'), titleStart = $('titleStart');
const resultEl = $('result'), resultTitle = $('resultTitle'), resultBody = $('resultBody'), resultAgain = $('resultAgain');

let DATA = null, state = null, layout = null, input = null, enemyPhaseRunning = false;
// The animation layer. It reads state.log rather than being called by
// combat.js (which stays pure and bare-node tested), and owns the only rAF
// loop in this game — one that stops itself whenever nothing is mid-clip, so
// an idle player turn costs nothing. onFrame re-renders WITHOUT re-syncing:
// advancing a clip changes which frame is drawn, never the game state.
const anim = createAnimator({
  onFrame: () => { if (state && layout) render(canvas, state, layout, anim); },
  onEvent: soundFor,
});

// One log entry -> one sound. A weapon's own archetype picks the attack
// voice, so a knife and a pistol are told apart by ear before the damage
// number lands; a miss gets its own sound because silence there is
// indistinguishable from an input that never registered.
function soundFor(e, s) {
  if (e.type === 'move') { audio.move(); return; }
  if (e.type === 'pickup') { audio.pickup(); return; }
  if (e.type === 'hazard') { if (e.killed) audio.down(); else audio.hit(); return; }
  if (e.type !== 'attack') return;
  const a = s.units.find(u => u.uid === e.attackerUid);
  const ranged = a && a.weapon && a.weapon.archetype === 'ranged';
  if (ranged) audio.ranged(); else audio.melee();
  if (!e.hit) { audio.miss(); return; }
  // Stagger the impact behind the swing so the two read as cause and effect
  // rather than one cluttered noise.
  setTimeout(() => {
    if (e.killed) audio.down();
    else { audio.hit(); if (e.knockback && e.knockback.moved) audio.knock(); }
  }, 70);
}

// GDD.md §9: "Expand to 3-5 encounters in sequence." Four now — warehouse and
// underpass (2026-08-31 roster expansion) field different squads than
// backlot/loading-dock on purpose, to actually exercise the wider roster in
// real play rather than leave it as unreachable data. crewProgress is keyed
// by defId, so a squad with no progress entry yet (sledge/cleaver/rook,
// gunner/leopard/denny) just starts fresh — no crash, no special-casing.
const SEQUENCE = ['backlot', 'loading-dock', 'warehouse', 'underpass', 'the-yard'];
let seqIndex = 0;

// GDD.md §5's v1 list, the other half: "XP levels... unlocking small stat
// bumps." Scoped to ONE RUN — a run is the walk through SEQUENCE, same as
// GDD §3's "Run ends on squad wipe" framing — not a cross-session save file;
// that's the meta-roster/loot half of §5, explicitly roadmap, not this. Keyed
// by defId ('blade'/'niner'/'wrench'), which is stable across encounters
// even if a future encounter reorders playerSpawns; uid ('p0'..) is not.
let crewProgress = {};

function applyProgress(state) {
  for (const u of state.units) {
    if (u.faction !== 'player') continue;
    const p = crewProgress[u.defId];
    if (!p) continue;
    u.level = p.level; u.xp = p.xp; u.maxHp = p.maxHp; u.hp = p.maxHp;
    // Trinkets are found gear and persist for the run, same as XP. Re-applied
    // through the engine rather than assigned, so their weapon-field bonuses
    // are folded into this encounter's freshly-built weapon.
    if (p.trinkets && p.trinkets.length) applyTrinkets(u, p.trinkets, DATA.trinkets);
  }
}
function saveProgress(state) {
  for (const u of state.units) {
    if (u.faction !== 'player') continue;
    crewProgress[u.defId] = { level: u.level, xp: u.xp, maxHp: u.maxHp, trinkets: (u.trinkets || []).map(t => t.id) };
  }
}

async function loadData() {
  const [weapons, units, enemies, encounters, hazards, trinkets] = await Promise.all(
    ['weapons', 'units', 'enemies', 'encounters', 'hazards', 'trinkets'].map(f => fetch(`data/${f}.json`).then(r => r.json())),
  );
  return {
    weapons: weapons.weapons, units: units.units, enemies: enemies.enemies,
    encounters: encounters.encounters, hazards: hazards.hazards, trinkets: trinkets.trinkets,
  };
}

function fitCanvas() {
  const availW = stage.clientWidth - 8, availH = stage.clientHeight - 8;
  if (!layout || availW <= 0 || availH <= 0) return;
  let scale = Math.min(availW / layout.width, availH / layout.height);
  // Snapped to the nearest TENTH, not a whole step: a wide grid (backlot is
  // 11 tiles across) is width-bound on a phone in portrait, where the fit
  // is rarely more than ~1.0-1.3x to begin with — whole/half-integer
  // snapping (tried first) rounded nearly all of that back down to a flat
  // 1x, throwing away real width headroom for the sake of a crispness
  // difference nobody would actually see at these scales. Tenths keep
  // enough of the "multiple of a whole pixel" idea to stay reasonably
  // crisp while using the screen — the render.js SIDE_MARGIN trim is the
  // other half of the same fix, freeing width headroom for this to round
  // into in the first place.
  if (scale >= 1) scale = Math.floor(scale * 10) / 10;
  scale = Math.max(scale, 0.5);
  canvas.style.width = `${Math.round(layout.width * scale)}px`;
  canvas.style.height = `${Math.round(layout.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);

function boot(seed) {
  const encounter = DATA.encounters.find(e => e.id === SEQUENCE[seqIndex]);
  stage.style.setProperty('--encounter-bg', encounter.background ? `url(${encounter.background})` : 'none');
  state = createEncounterState(encounter, DATA.units, DATA.weapons, DATA.enemies, seed, DATA.hazards, DATA.trinkets);
  applyProgress(state);
  state.moveTiles = new Map();
  state.attackTiles = [];
  state.cursor = null;
  state.rewarded = false;
  layout = computeLayout(state.grid);
  canvas.width = layout.width;
  canvas.height = layout.height;
  fitCanvas();
  if (input) input.destroy();
  anim.stop(); // a new encounter is a new log — drop any clip still playing from the last one
  input = createInputHandler({ canvas, getState: () => state, getLayout: () => layout, onChange });
  resultEl.hidden = true;
  enemyPhaseRunning = false;
  setToast('Your move.');
  onChange();
}

function setToast(text) { toastEl.textContent = text; }

// How an enemy describes its own approach, by behaviour. Teaches the roster's
// vocabulary through play instead of a legend nobody reads.
const MOVE_VERB = {
  charger: 'closes in',
  skirmisher: 'keeps its distance',
  holder: 'works the cover',
  flanker: 'circles around',
};
function moveVerb(state, uid) {
  const u = getUnit(state, uid);
  return (u && MOVE_VERB[u.behaviour]) || 'moves in';
}

// Sound preference, persisted per browser under the same one-key convention
// every other cabinet here uses. Read once at load so a muted player stays
// muted on their next visit rather than being greeted by the shot they
// turned off last time.
const MUTE_KEY = 'turfMuted';
function applyMute() {
  const m = audio.isMuted();
  controls.mute.textContent = m ? 'Sound off' : 'Sound';
  controls.mute.setAttribute('aria-pressed', String(!m));
}
try { audio.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch { /* private mode */ }
controls.mute.addEventListener('click', () => {
  audio.setMuted(!audio.isMuted());
  try { localStorage.setItem(MUTE_KEY, audio.isMuted() ? '1' : '0'); } catch { /* private mode */ }
  applyMute();
});
applyMute();

function attackText(state, attackerName, evt) {
  const target = getUnit(state, evt.targetUid);
  const who = target ? target.name : 'the target';
  if (!evt.hit) return `${attackerName} misses ${who}.`;
  let s = `${attackerName} hits ${who} for ${evt.damage}.`;
  if (evt.killed) {
    s += ' Down.';
    if (evt.dropped) {
      const w = state.weaponDefs.find(x => x.id === evt.dropped.weaponId);
      if (w) s += ` Drops a ${w.name}.`;
    }
  } else if (evt.knockback && evt.knockback.moved) s += ' Knocked back.';
  // A shove that ends in a stairwell reads as a kill with no damage behind
  // it, so the line has to say what actually did the killing.
  if (evt.hazard) s += ` Into the ${evt.hazard.name.toLowerCase()}.`;
  return s;
}

function onChange() {
  // sync BEFORE the render: it reads whatever combat.js appended to state.log
  // during the action that triggered this call, so the frame we are about to
  // paint is already the first frame of any clip that action started.
  anim.sync(state);
  render(canvas, state, layout, anim);
  updateHud();
  // A player picking up a drop is the freshest log entry right after a
  // move that landed on one (combat.js's pickUpDropAt) — attacks/enemy
  // turns get their own toast text elsewhere, so this only fires for the
  // one event nothing else already narrates.
  const lastLog = state.log[state.log.length - 1];
  if (lastLog && lastLog.type === 'pickup') {
    const u = getUnit(state, lastLog.uid);
    // The log entry carries its own name now, so this reads the same whether
    // a body left its gun or what was in its pockets.
    if (u && lastLog.name) setToast(`${u.name} picks up a ${lastLog.name}.`);
  }
  if (state.result) { finishEncounter(state.result); return; }
  if (state.turn === 'enemy' && !enemyPhaseRunning) runEnemyPhase();
}

// checkWinLoss (combat.js) can flip state.result from more than one call
// site in a single enemy phase's worth of ticks, so the reward has to be
// idempotent per encounter rather than tied to "the first time we noticed" —
// state.rewarded (set false in boot()) is the guard.
function finishEncounter(result) {
  let xpEvents = [];
  if (result === 'win' && !state.rewarded) {
    state.rewarded = true;
    xpEvents = awardXp(state);
    saveProgress(state);
  }
  showResult(result, xpEvents);
}

function runEnemyPhase() {
  enemyPhaseRunning = true;
  audio.enemyTurn();
  setToast('Enemy turn…');
  const tick = () => {
    const step = stepEnemyPhase(state);
    anim.sync(state); // enemy moves and attacks animate on the same path player ones do
    render(canvas, state, layout, anim);
    updateHud();
    if (step && !step.done) {
      // Name the archetype in the narration rather than adding a fifth
      // marker to the board: drawTelegraph already shows WHERE each enemy
      // will stand and WHO it hits, which is the behaviour made visible —
      // another icon on top of that is icon soup, not information.
      const line = step.attacked
        ? attackText(state, step.name, step.attacked)
        : (step.moved ? `${step.name} ${moveVerb(state, step.uid)}.` : `${step.name} holds.`);
      setToast(line);
    }
    if (state.result) { enemyPhaseRunning = false; finishEncounter(state.result); return; }
    if (step && step.done) { enemyPhaseRunning = false; setToast('Your move.'); return; }
    setTimeout(tick, 600);
  };
  setTimeout(tick, 350);
}

function updateHud() {
  topbar.turn.textContent = state.turn === 'player' ? 'Your Turn' : 'Enemy Turn';
  topbar.turn.className = state.turn === 'enemy' ? 'enemy' : '';
  topbar.round.textContent = `Round ${state.round}`;
  controls.endTurn.disabled = state.turn !== 'player' || !!state.result;
  controls.cancel.disabled = state.turn !== 'player' || !!state.result || !state.selected;

  squadEl.innerHTML = '';
  for (const u of state.units.filter(u => u.faction === 'player')) {
    const btn = document.createElement('button');
    btn.className = 'unitBtn' + (u.hp <= 0 ? ' dead' : '') + (state.selected === u.uid ? ' selected' : '') + (u.hp > 0 && !canUnitAct(u) ? ' done' : '');
    btn.disabled = u.hp <= 0 || state.turn !== 'player';
    const frac = Math.max(0, u.hp / u.maxHp);
    const portrait = u.portrait ? `<img class="portrait" src="${u.portrait}" alt="">` : '';
    btn.innerHTML = `${portrait}<span class="info"><span class="nm">${u.name} · Lv${u.level}</span><span class="hpTrack"><span class="hpFill" style="width:${frac * 100}%;background:${frac > 0.5 ? PAL.HP_GOOD : frac > 0.25 ? PAL.HP_MID : PAL.HP_BAD}"></span></span></span>`;
    btn.addEventListener('pointerup', e => { e.preventDefault(); input.selectByUid(u.uid); });
    squadEl.appendChild(btn);
  }

  const sel = state.selected ? getUnit(state, state.selected) : null;
  if (sel) {
    if (sel.portrait) { selPortraitEl.src = sel.portrait; selPortraitEl.hidden = false; }
    else selPortraitEl.hidden = true;
    // The weapon numbers shown here are the EFFECTIVE ones (sel.weapon is the
    // base plus trinkets — combat.js's recomputeWeapon), so a player reads the
    // range and damage the unit will actually fire with, not the catalogue
    // value. The trinket list is named separately so the bonus is attributable
    // rather than an unexplained number.
    const carried = (sel.trinkets || []).map(t => t.name).join(', ');
    selTextEl.innerHTML = `<b>${sel.name}</b> · Lv${sel.level} (${sel.xp}/${xpToNext(sel.level)} xp) · ${sel.weapon.name} (rng ${sel.weapon.range}, dmg ${sel.weapon.damage})<br>`
      + `move: ${sel.actedMove ? 'used' : 'ready'} · act: ${sel.actedAction ? 'used' : 'ready'}`
      + (carried ? `<br>carrying: ${carried}` : '');
  } else {
    selPortraitEl.hidden = true;
    selTextEl.textContent = state.turn === 'player' ? 'Select an operator.' : '';
  }
}

function xpSummaryText(events) {
  if (!events.length) return '';
  return events.map(e => {
    const lvl = e.levelsGained.length ? ` → Lv${e.levelsGained[e.levelsGained.length - 1]}!` : '';
    return `${e.name} +${e.gained} XP${lvl}`;
  }).join(' · ');
}

function showResult(result, xpEvents = []) {
  resultEl.hidden = false;
  if (result === 'win') audio.win(); else audio.lose();
  const isLastEncounter = seqIndex >= SEQUENCE.length - 1;
  const xpLine = xpSummaryText(xpEvents);
  if (result === 'win' && !isLastEncounter) {
    resultTitle.textContent = 'BLOCK CLEARED';
    resultTitle.className = 'win';
    resultBody.textContent = 'Quiet for now. One more block to go.' + (xpLine ? ` (${xpLine})` : '');
    resultAgain.textContent = 'Continue';
  } else if (result === 'win') {
    resultTitle.textContent = 'TURF SECURED';
    resultTitle.className = 'win';
    resultBody.textContent = "Every block on the list. The city doesn't get any nicer, but tonight it's yours."
      + (xpLine ? ` (${xpLine})` : '');
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
  audio.unlock(); // a browser only allows a context to start from a gesture
  applyMute();
  titleEl.hidden = true;
  boot(Date.now());
});
resultAgain.addEventListener('pointerup', e => {
  e.preventDefault();
  // Winning a non-final encounter advances the sequence; a final win or any
  // loss restarts the run from encounter 1 — see the SEQUENCE comment above.
  // A new run also clears crewProgress: XP/levels are scoped to one run,
  // same as the comment on crewProgress explains.
  const advancing = state.result === 'win' && seqIndex < SEQUENCE.length - 1;
  seqIndex = advancing ? seqIndex + 1 : 0;
  if (!advancing) crewProgress = {};
  boot(Date.now());
});
controls.endTurn.addEventListener('pointerup', e => { e.preventDefault(); input && input.endTurn(); });
// false: a mouse/touch player tapping Cancel never asked for the keyboard/
// pad reticle to appear — see the comment on cancelSelection in input.js.
controls.cancel.addEventListener('pointerup', e => { e.preventDefault(); input && input.cancelSelection(false); });

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
  crewProgress: () => ({ ...crewProgress }),
  // The feel layer, exposed for the same reason every other cabinet here
  // exposes its internals: a tween that only exists for 200ms cannot be
  // checked by looking at a screenshot after the fact.
  anim,
  audio,
};

loadData().then(data => {
  DATA = data;
  titleStart.disabled = false;
  titleStart.textContent = 'Start';
}).catch(err => {
  titleStart.textContent = 'Failed to load — reload';
  console.error('TURF: failed to load data', err);
});
