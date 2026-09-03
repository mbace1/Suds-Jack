// Boot, HUD, and the enemy-phase pacing loop. Everything spatial lives in
// combat.js/grid.js/ai.js (pure, tested in bare node — test/smoke.mjs);
// this file is the only place that touches the DOM.
import { PAL } from './palette.js?v=10';
import {
  createEncounterState, getUnit, canUnitAct, stepEnemyPhase, peekEnemyQueue, moveUnit, orderAttack, useAbility,
  awardXp, xpToNext, applyTrinkets,
} from './combat.js?v=16';
import { computeLayout, render, toScreen, SUPERSAMPLE, TILE_W, SPRITE_H } from './render.js?v=21';
import { createCamera, MIN_TILE_W } from './camera.js?v=1';
import { createInputHandler } from './input.js?v=15';
import { createAnimator } from './anim.js?v=5';
import { momentumDamage, evasionOf } from './momentum.js?v=1';
import { magOf, needsReload, roundsLeft } from './ammo.js?v=2';
import { abilitiesFor, canAfford, whyNot } from './abilities.js?v=1';
import { autoTurn } from './autoplay.js?v=4';
import { audio } from './audio.js?v=1';

const $ = id => document.getElementById(id);
const canvas = $('board'), stage = $('stage');
const topbar = { turn: $('turnLabel'), round: $('roundLabel') };
const controls = { endTurn: $('endTurnBtn'), cancel: $('cancelBtn'), mute: $('muteBtn') };
const abilitiesEl = $('abilities');
controls.auto = $('autoBtn');
const squadEl = $('squad'), selPortraitEl = $('selPortrait'), selTextEl = $('selText'), toastEl = $('toast');
const titleEl = $('title'), titleStart = $('titleStart');
const resultEl = $('result'), resultTitle = $('resultTitle'), resultBody = $('resultBody'), resultAgain = $('resultAgain');

let DATA = null, state = null, layout = null, input = null, camera = null, enemyPhaseRunning = false;
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
const SEQUENCE = ['backlot', 'loading-dock', 'warehouse', 'underpass', 'the-yard', 'the-crossing', 'the-depot'];
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
  const [weapons, units, enemies, encounters, hazards, trinkets, abilities] = await Promise.all(
    ['weapons', 'units', 'enemies', 'encounters', 'hazards', 'trinkets', 'abilities'].map(f => fetch(`data/${f}.json`).then(r => r.json())),
  );
  return {
    weapons: weapons.weapons, units: units.units, enemies: enemies.enemies,
    encounters: encounters.encounters, hazards: hazards.hazards, trinkets: trinkets.trinkets,
    abilities: abilities.abilities,
  };
}

function fitCanvas() {
  const availW = stage.clientWidth - 8, availH = stage.clientHeight - 8;
  if (!layout || availW <= 0 || availH <= 0) return;
  let scale = Math.min(availW / layout.width, availH / layout.height);
  // FITTING THE WHOLE BOARD AND MAKING IT LEGIBLE ARE DIFFERENT REQUESTS,
  // and on a phone they disagree: an 11-tile grid in portrait fits at about
  // 1.0-1.3x, which delivers a 32px tile as a 32px tile. v24 shipped that
  // and the owner's verdict was that things were hard to see. So the fit is
  // a FLOOR now, not a ceiling — below MIN_TILE_W the board is allowed to
  // overflow the stage and camera.js gives it somewhere to look and a way
  // to look elsewhere. On a desktop viewport the fit already clears the
  // floor and nothing about this changes.
  // MEASURED, NOT ASSUMED. Filling the leftover height was tried first and
  // rejected on the screenshot: an isometric 11x9 board is wide and short
  // (320x222) while a phone in portrait is tall and narrow, so zooming until
  // the height is full crops nearly half the width — and a game whose whole
  // contract is that you can see every enemy's plan cannot show you half the
  // enemies. The vertical letterbox is geometry, not waste; the encounter
  // photo shows through it.
  scale = Math.max(scale, MIN_TILE_W / TILE_W);
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
  cssScale = scale;
  if (camera) { camera.recenter(); focusCamera(); }
}
let cssScale = 1;
window.addEventListener('resize', fitCanvas);
// The stage does not only change size when the WINDOW does. The bottom bar
// grows a row when a selected operator is carrying momentum and shrinks
// again when it spends it, and the toast wraps to two lines on a phone —
// each of those takes height away from #stage with no resize event to
// notice it, leaving the board scaled for a viewport that no longer exists
// (measured: 644px of board in a 620px stage on desktop, clipped top and
// bottom). Observing the element itself is the only thing that catches it.
if (typeof ResizeObserver === 'function') new ResizeObserver(() => fitCanvas()).observe(stage);

// Where the camera should be looking right now, in board coordinates. One
// function, consulted after every state change, because "somewhere to look"
// is a property of the game state and not of whoever last called it: the
// operator you have selected, or — during the enemy phase — whichever enemy
// is currently acting, which is the whole answer to "I can't see who is
// going where".
function focusCamera(animate = true) {
  if (!camera || !state || !layout) return;
  const u = state.actingUid ? getUnit(state, state.actingUid)
    : state.selected ? getUnit(state, state.selected)
    : state.cursor ? state.cursor : null;
  if (!u) return;
  const p = toScreen(layout, u.x, u.y);
  camera.centerOn(p.x, p.y - SPRITE_H / 2, animate);
}

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
  // Backing store at SUPERSAMPLE x the board's logical size; fitCanvas still
  // sets the CSS size from layout.width, so the board occupies the same space
  // and only gains real pixels.
  canvas.width = layout.width * SUPERSAMPLE;
  canvas.height = layout.height * SUPERSAMPLE;
  fitCanvas();
  if (input) input.destroy();
  if (camera) camera.destroy();
  anim.stop(); // a new encounter is a new log — drop any clip still playing from the last one
  camera = createCamera({ stage, canvas, getLayout: () => layout, getScale: () => cssScale });
  input = createInputHandler({
    canvas, getState: () => state, getLayout: () => layout, onChange,
    // A drag is a camera move, never an order. Without this, panning the
    // board at high zoom would also walk an operator to wherever the thumb
    // came to rest — the same class of bug as a tap handled twice.
    consumedDrag: () => camera.consumedDrag(),
    clearDrag: () => camera.clearDrag(),
    getAbilities: () => DATA.abilities,
  });
  resultEl.hidden = true;
  enemyPhaseRunning = false;
  setToast(objectiveText(state));
  onChange();
  // The opening shot frames the crew, not the top-left corner of the grid —
  // at a zoom where the board overflows, tile (0,0) is a wall and a bin.
  // ...AND whatever the mission is about: a screenshot of the extraction map
  // showed the pads sitting off the edge of the screen on the very frame the
  // player is told to go and stand on them.
  const crew = state.units.filter(u => u.faction === 'player');
  if (crew.length) {
    const pts = crew.map(u => ({ x: u.x, y: u.y }));
    for (const k of state.extract) {
      const [x, y] = k.split(',').map(Number);
      pts.push({ x, y });
    }
    for (const o of state.units) if (o.faction === 'objective') pts.push({ x: o.x, y: o.y });
    const mid = pts.reduce((a, q) => ({ x: a.x + q.x / pts.length, y: a.y + q.y / pts.length }), { x: 0, y: 0 });
    const p = toScreen(layout, mid.x, mid.y);
    camera.centerOn(p.x, p.y, false);
  }
}

function setToast(text) { toastEl.textContent = text; }

// Stated once, in words, when the encounter opens — the topbar carries the
// running count after that.
function objectiveText(state) {
  const w = state.win || { mode: 'eliminate' };
  const clock = w.deadline ? ` You have ${w.deadline} rounds.` : '';
  if (w.mode === 'survive') return `Hold ${w.rounds} rounds. Killing them all also wins.`;
  if (w.mode === 'extract') {
    return `Get ${w.need} of the crew onto the green tiles.${clock}`
      + ` Lose more than ${countPlayers(state) - w.need} and it's over.`;
  }
  if (w.mode === 'destroy') return `Break the cache.${clock} Killing them all also wins.`;
  return 'Take out every rival on the block.';
}

const countPlayers = state => state.units.filter(u => u.faction === 'player').length;

// The topbar's running line. A deadline has to be counted DOWN in the place
// the round number already lives — an objective stated once at the start and
// a clock the player has to track in their head is not full information.
function roundText(state) {
  const w = state.win || { mode: 'eliminate' };
  if (w.mode === 'survive') return `Round ${state.round} / ${w.rounds} — hold`;
  if (w.deadline) {
    const left = w.deadline - state.round + 1;
    return `Round ${state.round} / ${w.deadline} — ${left} left`;
  }
  return `Round ${state.round} — clear them out`;
}

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
controls.auto.addEventListener('click', () => setAuto(!autoOn));

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
  focusCamera();
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
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  let xpEvents = [];
  if (result === 'win' && !state.rewarded) {
    state.rewarded = true;
    xpEvents = awardXp(state);
    saveProgress(state);
  }
  showResult(result, xpEvents);
}

// The enemy phase's two beats. LOOK_MS is the pause on "X is up" before it
// moves; ACT_MS is the pause after it has, to read what happened.
const LOOK_MS = 340, ACT_MS = 520;

function runEnemyPhase() {
  enemyPhaseRunning = true;
  audio.enemyTurn();
  setToast('Enemy turn…');
  // Two beats per enemy, not one. LOOK first — mark whoever is up, point the
  // camera at it, and hold — then ACT. Resolving both in the same frame is
  // what made this phase read as "fighters bump into each other": the unit
  // that moved and the unit that hit you were only ever seen after the fact,
  // in their new positions, with nothing on screen tying either to a name.
  const look = () => {
    const next = peekEnemyQueue(state);
    if (next) {
      state.actingUid = next;
      const u = getUnit(state, next);
      setToast(`${u.name} is up…`);
      render(canvas, state, layout, anim);
      focusCamera();
      setTimeout(tick, LOOK_MS);
    } else {
      tick();
    }
  };
  const tick = () => {
    const step = stepEnemyPhase(state);
    anim.sync(state); // enemy moves and attacks animate on the same path player ones do
    render(canvas, state, layout, anim);
    focusCamera();
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
    if (step && step.done) {
      enemyPhaseRunning = false; state.actingUid = null;
      setToast('Your move.'); onChange();
      if (autoOn) autoStep();
      return;
    }
    setTimeout(look, ACT_MS);
  };
  setTimeout(look, 350);
}


// The kit of whoever is selected. Rebuilt on every state change rather than
// toggled, because affordability moves under the player's feet — a unit that
// has just run can pay for something it could not a moment ago, and a stale
// button is worse than no button.
function renderAbilities() {
  abilitiesEl.innerHTML = '';
  const sel = state.selected ? getUnit(state, state.selected) : null;
  if (!sel || state.turn !== 'player' || state.result) { input && input.disarm(); return; }
  // Reload first, and only for something that carries a magazine. It is an
  // ability in every sense that matters here — it costs the action, it is
  // mutually exclusive with the rest, and it is the one the board should
  // offer loudest when the gun is dry.
  const mag = magOf(sel.weapon);
  if (mag != null) {
    const full = roundsLeft(sel) >= mag;
    const btn = document.createElement('button');
    btn.className = 'abilityBtn reload';
    btn.disabled = full || sel.actedAction;
    btn.title = full ? 'Already loaded' : 'Reload — costs your action, never your move';
    btn.innerHTML = `<span>Reload</span><span class="cost">${roundsLeft(sel)}/${mag}</span>`;
    btn.addEventListener('pointerup', e => { e.preventDefault(); input.reloadSelected(); });
    abilitiesEl.appendChild(btn);
  }
  for (const ab of abilitiesFor(sel, DATA.abilities)) {
    const ok = canAfford(sel, ab);
    const btn = document.createElement('button');
    btn.className = 'abilityBtn' + (input && input.armedAbility() === ab.id ? ' armed' : '');
    btn.disabled = !ok;
    // The reason it is unavailable goes in the tooltip AND the toast on tap:
    // "needs 3 momentum, has 1" is a instruction to go and run, which is the
    // behaviour this whole economy is trying to buy.
    btn.title = ok ? ab.blurb : `${ab.name} — ${whyNot(sel, ab)}`;
    btn.innerHTML = `<span>${ab.name}</span><span class="cost">${ab.cost}</span>`;
    btn.addEventListener('pointerup', e => {
      e.preventDefault();
      input.armAbility(ab.id);
    });
    abilitiesEl.appendChild(btn);
  }
}


// ── auto-battle ──────────────────────────────────────────────────────
// A switch, not a difficulty. It plays the PLAYER side with autoplay.js's
// tactical bot at the same pace a person would, through the same command
// functions a tap calls — so what you are watching is the real game, not a
// simulation of it, and anything that looks wrong on screen is wrong.
let autoOn = false, autoTimer = null;

function setAuto(on) {
  autoOn = on;
  controls.auto.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  if (on) {
    input && input.disarm();
    autoStep();
  } else {
    setToast('Auto off — your move.');
  }
  onChange();
}

// One operator per tick. Stepping rather than looping is what makes it
// watchable: the camera follows each unit as it acts, which is the same
// LOOK-then-ACT rhythm the enemy phase got in this version.
function autoStep() {
  if (!autoOn || !state || state.result || state.turn !== 'player') return;
  const next = state.units.find(u => u.faction === 'player' && u.hp > 0 && canUnitAct(u));
  if (!next) {
    setToast('Auto — ending turn.');
    autoTimer = setTimeout(() => { if (autoOn) input.endTurn(); }, AUTO_MS);
    return;
  }
  state.actingUid = next.uid;
  setToast(`Auto — ${next.name}.`);
  onChange();
  autoTimer = setTimeout(() => {
    if (!autoOn) return;
    autoTurn(state, next, DATA.abilities);
    state.actingUid = null;
    input.refreshSelectionOverlay(state);
    onChange();
    autoTimer = setTimeout(autoStep, AUTO_MS);
  }, AUTO_MS);
}

const AUTO_MS = 420;

function updateHud() {
  topbar.turn.textContent = state.turn === 'player' ? 'Your Turn' : 'Enemy Turn';
  topbar.turn.className = state.turn === 'enemy' ? 'enemy' : '';
  // The objective is shown, always. A survive-N goal the player cannot see is
  // a hidden win condition in a game whose whole premise is full information —
  // they would play to eliminate, which on these rosters is how you lose.
  topbar.round.textContent = roundText(state);
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

  renderAbilities();

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
      + aimText(state)
      + ammoText(sel)
      + momentumText(sel)
      + forecastText(state)
      + (carried ? `<br>carrying: ${carried}` : '');
  } else {
    selPortraitEl.hidden = true;
    selTextEl.textContent = state.turn === 'player' ? 'Select an operator.' : '';
  }
}

// What the run this unit is carrying is currently worth, spelled out rather
// than left as a pip count to decode. Both halves are named because they are
// the same points spent two ways: attack now and the bonus lands but the
// evasion goes with it; hold fire and the evasion stands through the enemy
// phase. Silent on a unit that has not moved — a line reading "+0 / -0%" on
// every stationary operator is noise, not information.
// The one target the cursor is on, spelled out. The board badge gives the
// odds; this gives the REASON — which is the difference between a number a
// player trusts and a number they suspect. Only for the keyboard/pad cursor,
// because a touch player has no way to point at something without acting on
// it, and the badge already covers them.
function forecastText(state) {
  if (!state.cursor || !state.forecasts || !state.forecasts.size) return '';
  const at = state.units.find(u =>
    u.hp > 0 && u.x === state.cursor.x && u.y === state.cursor.y && state.forecasts.has(u.uid));
  if (!at) return '';
  const f = state.forecasts.get(at.uid);
  const why = [];
  if (f.cover) why.push('-30% their cover');
  if (f.evade > 0) why.push(`-${Math.round(f.evade * 100)}% they ran`);
  if (f.bonus > 0) why.push(`+${f.bonus} your run`);
  if (f.steps > 0) why.push(`${f.steps} tile${f.steps > 1 ? 's' : ''} to close`);
  return `<br>vs ${at.name}: ${Math.round(f.chance * 100)}% for ${f.damage}`
    + (f.lethal ? ' — KILLS' : ` of ${f.targetHp}`)
    + (why.length ? ` · ${why.join(' · ')}` : '');
}

// What aiming means, in words, while it is happening. Without this the
// board changing under a tap reads as a glitch rather than as a question.
function aimText(state) {
  if (!state.aimUid || !state.aimTiles || !state.aimTiles.length) return '';
  const foe = getUnit(state, state.aimUid);
  const best = state.aimTiles[0];
  return `<br>Firing on ${foe ? foe.name : 'them'}: pick a position`
    + ` (${state.aimTiles.length} on offer, best is ${Math.round(best.forecast.chance * 100)}%)`
    + ` — tap ${foe ? foe.name : 'them'} again to take it`;
}

// Rounds left, and what to do about it. Silent for melee, because "ammo: —"
// on every knife is noise.
function ammoText(sel) {
  const mag = magOf(sel.weapon);
  if (mag == null) return '';
  if (needsReload(sel)) return `<br>EMPTY — reloading costs your action, not your move`;
  return `<br>ammo ${roundsLeft(sel)} / ${mag}`;
}

function momentumText(sel) {
  const mo = sel.momentum || 0;
  if (!mo) return '';
  const bonus = momentumDamage(sel);
  const evade = Math.round(evasionOf(sel, { archetype: 'ranged' }) * 100);
  return `<br>momentum ${mo} · +${bonus} dmg on your swing · -${evade}% to be shot until you use it`;
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
    // A held block and a cleared one are different outcomes and should not
    // share a word — "cleared" over a board still full of rivals reads as a bug.
    const held = state.win && state.win.mode === 'survive'
      && state.units.some(u => u.faction === 'enemy' && u.hp > 0);
    resultTitle.textContent = held ? 'BLOCK HELD' : 'BLOCK CLEARED';
    resultTitle.className = 'win';
    resultBody.textContent = (held ? 'You outlasted them. Move before they regroup.' : 'Quiet for now. One more block to go.')
      + (xpLine ? ` (${xpLine})` : '');
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
  // The ability flow, for the console and the smoke gate: arm() puts the
  // board in ability mode exactly as the button does, ability() resolves one
  // without going through a tap.
  arm: id => input && input.armAbility(id),
  // Tap a TILE, through the real input path. Takes grid coordinates and
  // converts, so a caller never deals in pixels.
  tap: (gx, gy) => {
    const p = toScreen(layout, gx, gy);
    input.tapBoard(p.x, p.y - 4);
  },
  ability: (uid, id, target) => {
    const r = useAbility(state, uid, id, target, DATA.abilities);
    input.refreshSelectionOverlay(state); onChange(); return r;
  },
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
