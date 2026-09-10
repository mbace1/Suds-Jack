// Slay Kallio — boot, the HUD, and the replay of what the engine did.
//
// The engine resolves a card or an enemy phase in one synchronous call and
// leaves a log; this file reads the log back at a human pace — one number,
// one wobble, one topple at a time — the way turf's anim.js reads its state
// log. While the replay runs the hand is locked; when it drains, every bar is
// synced to the real state so nothing can drift. `window.__sk` is the seam
// the smoke test drives, and it can set the replay delays to zero.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, ACTS, EVENTS, THEMES, RULES } from './data.js';
import * as engine from './engine.js';
import { Arena } from './scene.js';
import { Puppet, paintCutout, setFigureMotion, figureMotion, freezeFigures, setFigureArt, figureArt, setFigureCut, figureCut } from './puppet.js';
import { preloadPlates, plateFor as figurePlateFor, posesFor as figurePoses, CAST } from './plates.js';
import { paintCardPic } from './cardart.js';
import { drawMap } from './map.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';
import { watchPad } from '../../hub/pad.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const store = {
  get: (k, d) => { try { const v = localStorage.getItem('slayKallio.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('slayKallio.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const VERSION = 14;
let theme = THEMES[store.get('theme', 'kallio')] ? store.get('theme', 'kallio') : 'kallio';
let state = null;
let arena = null;
let hero = null;                 // the hero's Puppet
const foes = new Map();          // enemy uid → Puppet
const shown = new Map();         // uid|'hero' → { hp, block } as displayed
let sel = -1;                    // selected hand index
let target = 0;                  // selected enemy slot (keys/pad)
let menuSel = { char: 0 };
let busy = false;
let speed = 1;                   // replay speed; the smoke test sets 0 = instant
const queue = [];                // [{ at, fn }]
let qt = 0;
let padHint = false;

const T = () => THEMES[theme];
const nameOf = (table, id) => table[id]?.[theme]?.name ?? id;
const cardName = id => nameOf(CARDS, id);
const PANELS = ['#menu', '#reward', '#result', '#deck', '#map', '#event', '#rest', '#pick'];

// ── boot ─────────────────────────────────────────────────────────────────
const gl = $('#gl');
arena = new Arena(gl, T());
const params = new URLSearchParams(location.search);

// The backdrop, in order of preference:
//   1. ?bg=<url>            an explicit plate, for testing one without editing
//   2. bg/plate.jpg         a photograph DROPPED INTO THE GAME FOLDER
//   3. the painted park     always, if neither is there
//
// (2) is the whole point: the owner asked for a real photo behind the bridge,
// and this makes adding one a matter of putting a file at `slaykallio/bg/plate.jpg`
// with no code change at all. Nothing 404s loudly — `setPhoto` rejects and the
// painting is already on screen, so a missing plate is simply the default.
// Both paths go through the SAME tilt-shift, so a photograph gets the sharp
// band on the deck like everything else.
// The plates, by the hour of the run (owner's photographs, 2026-09-05). The run
// starts in the afternoon in Karhupuisto and ends at night on a Kallio street;
// each stage draws one plate from its set, by the run's seed, so a seed is a
// route AND its weather. `bg/plate.jpg` — the bear — stays the plate the menu
// opens on. Every one goes through the same cut-to-frame and grade.
const PLATES = {
  day: ['bg/plate.jpg', 'bg/day-beds.jpg', 'bg/day-square-painted.jpg', 'bg/day-bench.jpg', 'bg/day-bear-lawn.jpg', 'bg/day-beds-tram.jpg', 'bg/day-square.jpg'],
  evening: ['bg/dusk-metro.jpg', 'bg/dusk-church.jpg'],
  night: ['bg/night-street.jpg', 'bg/night-door.jpg', 'bg/night-restaurant.jpg', 'bg/night-bar.jpg', 'bg/night-tram.jpg'],
};
const STAGES = ['day', 'evening', 'night'];
let plateStage = null, plateUrl = null;
function plateFor(stage) {
  if (params.get('bg')) return params.get('bg');
  const set = PLATES[stage];
  const seed = state?.seed ?? 0;
  return set[(seed + STAGES.indexOf(stage) * 7) % set.length];
}
function applyHour(h) {
  arena.setHour(h);
  const stage = STAGES[engine.nightfall(h)];
  if (stage !== plateStage) {
    plateStage = stage;
    plateUrl = plateFor(stage);
    arena.setPhoto(plateUrl, { stereo: params.get('stereo'), eye: params.get('eye') || 'left' }).catch(() => {});
  }
}
resize();                                  // the plate is CUT to the frame, so give it the real one first
applyHour(0);
setMuted(store.get('mute', false));
// The figures are made of card, so they can be MOVED rather than redrawn
// (owner, 2026-09-07). 'paper' is Paper Mario — anticipation, a lunge that
// squashes, a card that bends when hit, a breath at rest; 'still' is what
// shipped through v16. A toggle rather than a replacement, because the only
// way to know whether motion carries a verb is to watch the same fight twice.
// THE HOUSE LOOK CAN BE CHANGED (v30, owner: *"we had characters from turf in
// Slay earlier, they were meant to be a visual style from the options. I want
// those back as the main style"*). The style toggles exist so the same fight
// can be watched twice, which means the owner TOGGLES THEM WHILE COMPARING —
// and every toggle writes to localStorage. So a value chosen while looking at
// four options beat the default forever after: v21 moved the house style to
// the plates and every browser that had already flipped to `drawn` kept it,
// which is a decision being overruled by a comparison. A preference is only a
// preference against the default it was set AGAINST. `LOOK_REV` is bumped
// whenever the house answer moves, and a stored style older than it is
// dropped rather than obeyed. Everything else the game remembers — the theme,
// the seed, the run — is untouched: this is only for the look.
const LOOK_REV = 2;                       // 2 = plates, die-cut, paper motion
const LOOK_KEYS = ['art', 'cut', 'figures'];
if (store.get('lookRev', 0) < LOOK_REV) {
  for (const k of LOOK_KEYS) { try { localStorage.removeItem('slayKallio.' + k); } catch { /* private mode */ } }
  store.set('lookRev', LOOK_REV);
}
setFigureMotion(store.get('figures', 'paper'));
// The owner's TURF character plates, worn by the person-shaped figures
// (2026-09-07). Preloaded rather than fetched per puppet: a plate arriving
// mid-fight would repaint one figure and leave the row mismatched. The menu
// starts on 'drawn' and the roster repaints itself once the plates land, so a
// slow decode never shows a blank card.
setFigureArt(store.get('art', 'turf'));
setFigureCut(store.get('cut', 'silhouette'));
// The plates are the default now, so the preload is on the critical path for
// how the game LOOKS on arrival rather than for a toggle nobody has touched.
// A figure whose plate has not decoded falls back to the drawn cutout and
// bakes that into its texture, so anything built before this resolves has to
// be built again — the menu roster, and a fight if one is somehow already
// running (a deep link, or a fast hand on a slow connection).
preloadPlates().then(() => {
  if (!state || state.phase === 'menu') return renderMenu();
  if (state.phase === 'fight' || state.phase === 'reward') spawnFight(); else spawnHeroAlone();
  renderAll();
});

function resize() {
  const w = innerWidth, h = innerHeight;
  arena.resize(w, h, 4.6);
  document.documentElement.classList.toggle('portrait', h > w);
}
addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  qt += dt * 1000;
  // drain everything whose time has come, in order
  while (queue.length && queue[0].at <= qt) queue.shift().fn();
  if (busy && !queue.length) { busy = false; syncAll(); afterReplay(); }
  arena.update(dt);
  placeLabels();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ── the replay queue ─────────────────────────────────────────────────────
let cursor = 0;                  // where in state.log the view has read to
function later(ms, fn) { const at = (queue.length ? queue[queue.length - 1].at : qt) + ms * speed; queue.push({ at, fn }); }
function enqueueLog() {
  const events = state.log.slice(cursor);
  cursor = state.log.length;
  if (!events.length) return;
  busy = true;
  document.body.classList.add('busy');
  for (const ev of events) act(ev);
  later(0, () => {});
}

function unitOf(uid) { return uid === 'hero' ? hero : foes.get(uid); }

function act(ev) {
  switch (ev.t) {
    case 'play': {
      const c = CARDS[ev.card];
      later(0, () => { sfx.card(); if (c.type === 'attack') hero.attack(); flashCardPlayed(ev.card); });
      later(c.type === 'attack' ? 220 : 120, () => {});
      break;
    }
    case 'damage': {
      const isHero = ev.target === 'hero' || ev.target === undefined || !foes.has(ev.target);
      if (isHero) {
        later(0, () => { hero.hit(); arena.kick(ev.amount > 8 ? 1.4 : 0.8); sfx.hurt(); pop('hero', ev.blocked && !ev.amount - ev.blocked ? `${ev.amount}` : `-${ev.amount - ev.blocked}`, 'dmg'); setShown('hero', { hp: ev.hp }); if (ev.blocked) setShown('hero', { block: Math.max(0, shownOf('hero').block - ev.blocked) }); });
        later(420, () => {});
      } else {
        // Balatro's pop: the base, each add, each mult, then the number that lands
        const b = ev.breakdown;
        if (b && (b.adds.length || b.mults.length)) {
          later(0, () => pop(ev.target, `${b.base}`, 'base'));
          b.adds.forEach((a, i) => later(160, () => { sfx.mult(i); pop(ev.target, `+${a.n}`, 'add', a.src); }));
          b.mults.forEach((m, i) => later(200, () => { sfx.mult(3 + i); pop(ev.target, `×${m.x}`, 'mult', m.src); }));
          later(220, () => {});
        }
        later(0, () => { const p = foes.get(ev.target); p?.hit(); sfx.hit(ev.amount >= 12); pop(ev.target, `${ev.amount}`, ev.amount >= 12 ? 'big' : 'dmg'); setShown(ev.target, { hp: ev.hp, block: Math.max(0, shownOf(ev.target).block - ev.blocked) }); });
        later(240, () => {});
      }
      break;
    }
    case 'die': later(120, () => { const p = foes.get(ev.target); p?.die(); sfx.topple(); labelOf(ev.target)?.classList.add('dead'); }); later(300, () => {}); break;
    case 'block': later(0, () => { sfx.block(); pop(ev.target, `+${ev.n}`, 'block'); setShown(ev.target, { block: ev.total }); }); later(160, () => {}); break;
    case 'status': later(0, () => { sfx.status(); pop(ev.target, `${STATUS_LABEL[ev.key] ?? ev.key} ${ev.n}`, 'status'); refreshStatus(ev.target); }); later(200, () => {}); break;
    case 'power': later(0, () => { pop('hero', 'POWER', 'status'); refreshStatus('hero'); }); break;
    case 'energy': later(0, () => { pop('hero', `+${ev.n} ⚡`, 'energy'); renderEnergy(); }); break;
    case 'heal': later(0, () => { pop('hero', `+${ev.n}`, 'block'); setShown('hero', { hp: ev.hp }); }); break;
    case 'enemyAct': {
      later(160, () => { const p = foes.get(ev.enemy); if (ev.intent === 'attack' || ev.intent === 'debuff') p?.attack(); labelOf(ev.enemy)?.classList.add('acting'); });
      later(ev.intent === 'attack' || ev.intent === 'debuff' ? 260 : 120, () => {});
      break;
    }
    case 'curse': later(0, () => { pop(ev.src, cardName(ev.card), 'curse'); pop('hero', `+ ${cardName(ev.card)}`, 'curse'); }); later(300, () => {}); break;
    case 'endTurn': later(0, () => { sel = -1; renderHand(); document.querySelectorAll('.unit').forEach(u => u.classList.remove('acting')); }); later(260, () => {}); break;
    case 'turn': later(120, () => { sfx.turn(); document.querySelectorAll('.unit').forEach(u => u.classList.remove('acting')); renderAll(); }); break;
    case 'draw': case 'conjure': later(40, () => { sfx.draw(); renderHand(); }); break;
    case 'exhaust': case 'reshuffle': case 'skipReward': case 'gainCard': case 'gainJoker': break;
    case 'fightWon': later(700, () => { banner('CLEAR'); sfx.win(); }); later(900, () => {}); break;
    case 'reward': later(0, () => openReward()); break;
    case 'encounter': later(200, () => spawnFight()); break;
    case 'enemyHeal': later(0, () => { pop(ev.target, `+${ev.n}`, 'block'); setShown(ev.target, { hp: ev.hp }); }); later(200, () => {}); break;
    // the run between fights
    case 'map': later(0, () => openMapPanel()); break;
    case 'node': later(0, () => { closePanels(); }); break;
    case 'event': later(0, () => openEventPanel()); break;
    case 'rest': later(0, () => openRestPanel()); break;
    case 'pick': later(0, () => openPickPanel()); break;
    case 'actWon': later(500, () => { banner('ACT CLEAR'); sfx.win(); }); later(900, () => {}); break;
    case 'hour': later(0, () => { applyHour(ev.hour); renderTop(); }); break;
    case 'maxHp': case 'maxEnergy': case 'upgrade': case 'removeCard': case 'rested': case 'eventChoice': case 'roll': later(0, () => renderTop()); break;
    case 'won': later(600, () => showResult(true)); break;
    case 'lost': later(200, () => { hero.die(); sfx.lose(); }); later(1600, () => showResult(false)); break;
    default: break;
  }
}

function afterReplay() {
  document.body.classList.remove('busy');
  if (!state) return;
  // whatever the run is waiting on, its screen must be up — the log's own
  // event opened it, but a flush or a resize can land here with it hidden
  if (state.phase === 'reward' && $('#reward').hidden) openReward();
  if (state.phase === 'map' && $('#map').hidden) openMapPanel();
  if (state.phase === 'event' && $('#event').hidden) openEventPanel();
  if (state.phase === 'rest' && $('#rest').hidden) openRestPanel();
  if (state.phase === 'pick' && $('#pick').hidden) openPickPanel();
}
function closePanels() { for (const p of ['#map', '#event', '#rest', '#pick', '#reward']) $(p).hidden = true; }

// ── displayed numbers ────────────────────────────────────────────────────
function shownOf(k) { if (!shown.has(k)) shown.set(k, { hp: 0, block: 0 }); return shown.get(k); }
function setShown(k, patch) { Object.assign(shownOf(k), patch); paintUnit(k); }
function syncAll() {
  if (!state) return;
  setShown('hero', { hp: state.hero.hp, block: state.hero.block });
  for (const e of state.enemies) setShown(e.uid, { hp: e.hp, block: e.block });
  renderAll();
}

// ── the puppets ──────────────────────────────────────────────────────────
function layout() {
  // hero on the left, enemies spaced on the right; portrait squeezes the row
  // Both sides are laid out inside the camera's action width, so nobody is
  // ever half off the frame: the hero holds the left quarter and the enemy
  // row is spread across the right half, tightening as the row grows.
  const n = state.enemies.length;
  const half = (arena.actionWidth ?? 6.6) / 2;
  const heroX = -half * 0.72;
  const first = half * 0.12, last = half * 0.92;
  const foeX = i => n === 1 ? half * 0.5 : first + (last - first) * (i / (n - 1));
  return { heroX, foeX };
}

function spawnFight() {
  arena.clearPuppets();
  foes.clear();
  const ch = CHARACTERS[state.character];
  hero = new Puppet({ look: { ...ch[theme].look, id: state.character }, seed: 11, scale: 1, facing: 1, mood: arena.figureMood() });
  arena.add(hero);
  const made = state.enemies.map(e => {
    const d = ENEMIES[e.id];
    const p = new Puppet({ look: { ...d[theme].look, id: e.id, mutated: e.mutated || 0 }, seed: 100 + e.uid, scale: d.scale, facing: -1, mood: arena.figureMood() });
    arena.add(p);
    foes.set(e.uid, p);
    return p;
  });
  // Make room for the tallest thing on the board BEFORE working out where
  // anyone stands: the camera move changes how wide the picture is, so the
  // row has to be laid out against the camera that will actually render it.
  arena.ensureHeadroom(Math.max(hero.height, ...made.map(p => p.height)) * 1.06);
  const L = layout();
  hero.setHome(L.heroX, 0, 0.1);
  state.enemies.forEach((e, i) => {
    const p = foes.get(e.uid);
    p.setHome(L.foeX(i), 0, 0.05 - (i % 2) * 0.12);
    if (!e.alive) { p.alive = false; p.fall = { angle: Math.PI / 2 - 0.02, vel: 0, axis: { x: 1, y: 0, z: 0 }, done: true }; }
  });
  buildLabels();
  syncAll();
  // The act card. `nameOf(table, id)` wants a lookup KEYED by id (CARDS,
  // ENEMIES); handing it the encounter object and the encounter's own id makes
  // `enc['rats']` undefined every time, so it fell through to the raw id and the
  // fallback after `||` could never fire. Nobody noticed while the ids happened
  // to read as words — until the fantasy skin put KING_RAT across the screen.
  banner(ENCOUNTERS[state.encounter][theme].name);
}

// Between fights the deck is empty but the hero is still standing on it — the
// map, an event and a rest all happen with the bridge behind them.
function spawnHeroAlone() {
  arena.clearPuppets(); foes.clear();
  const ch = CHARACTERS[state.character];
  hero = new Puppet({ look: { ...ch[theme].look, id: state.character }, seed: 11, scale: 1, facing: 1, mood: arena.figureMood() });
  arena.add(hero);
  arena.ensureHeadroom(hero.height * 1.06);
  hero.setHome(layout().heroX, 0, 0.1);
  labels.innerHTML = '';
  buildLabels();
  syncAll();
}

function relayout() { if (!state || state.phase === 'menu') return; const L = layout(); hero?.setHome(L.heroX, 0, 0.1); state.enemies.forEach((e, i) => foes.get(e.uid)?.setHome(L.foeX(i), 0, 0.05 - (i % 2) * 0.12)); }
addEventListener('resize', relayout);

// ── labels over the puppets ──────────────────────────────────────────────
const STATUS_LABEL = { vulnerable: 'VULN', weak: 'WEAK', strength: 'STR', buzz: 'BUZZ', doubleNext: '×2 NEXT', frail: 'FRAIL', thorns: 'THORNS', fetch: 'FETCH' };
// How far down the screen a unit label's ANCHOR may sit. The label's own box
// hangs 58px above that anchor (`margin-top` on .unit), so a gutter of 96 let
// the box reach y=38 — inside the HUD plate, where the hero's name and HP were
// drawn a second time on top of the run panel's own. Found by looking at a
// DAYLIGHT plate: at night the collision was there and invisible. The gutter
// is measured off the plate at render time, so it follows the portrait layout
// (which starts the HUD 50px lower) without a second number.
const LABEL_RISE = 58;
const labels = $('#labels');
function labelOf(k) { return labels.querySelector(`.unit[data-k="${k}"]`); }

function buildLabels() {
  labels.innerHTML = '';
  const mk = (k, name, cls) => {
    const u = el('div', `unit ${cls}`); u.dataset.k = k;
    u.append(el('div', 'name', name), el('div', 'intent'), el('div', 'bar'), el('div', 'hp'), el('div', 'statuses'), el('div', 'hitbox'));
    u.querySelector('.bar').append(el('i'));
    labels.append(u);
    return u;
  };
  const ch = CHARACTERS[state.character];
  mk('hero', ch[theme].name, 'hero');
  if (state.phase !== 'fight' && state.phase !== 'reward') return;
  state.enemies.forEach(e => {
    const u = mk(e.uid, `${nameOf(ENEMIES, e.id)}${e.mutated ? ' ✶'.repeat(e.mutated) : ''}`, `enemy${e.mutated ? ' mutated' : ''}`);
    if (e.mutated) u.title = e.mutated > 1 ? 'mutated by the night: more of it, and stronger' : 'mutating in the dusk: more of it';
    u.dataset.slot = e.slot;
    u.setAttribute('role', 'button');
    u.setAttribute('aria-label', `${nameOf(ENEMIES, e.id)}`);
    u.tabIndex = 0;
    if (!e.alive) u.classList.add('dead');
    const go = ev => { ev.preventDefault(); onEnemyTap(e.slot); };
    u.addEventListener('pointerup', go);
    u.addEventListener('touchend', go);
    u.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
  });
}

const _v = { x: 0, y: 0, z: 0 };
// the lowest edge of the HUD plate, plus the height the label rises above its
// own anchor — asked of the layout rather than guessed at, once a frame
function labelTop() {
  // Ask the rect, not `offsetParent`: #top is position:fixed, and a fixed
  // element's offsetParent is ALWAYS null — a guard written on it read the
  // plate's height as zero and collapsed the gutter to the old broken value.
  const r = $('#top')?.getBoundingClientRect();
  return Math.max(24, (r?.height ? r.bottom : 0) + 8) + LABEL_RISE;
}
function placeLabels() {
  if (!state || !hero) return;
  const w = innerWidth, h = innerHeight;
  const put = (k, p) => {
    const u = labelOf(k); if (!u) return;
    const head = arena.project(p.headWorld(), w, h);
    const foot = arena.project(p.home, w, h);
    // Clamp into the frame. The boss stands a head taller than everyone else
    // and the camera is close, so his label went off the TOP of the screen —
    // on the one fight where reading the intent matters most. The label is
    // pushed down rather than the camera pulled back, because pulling back
    // for one encounter would undo "much closer to the characters".
    const top = labelTop(), x = Math.max(78, Math.min(w - 78, head.x));
    const y = Math.max(top, Math.min(h - 120, head.y));
    u.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    u.style.setProperty('--h', `${Math.max(40, foot.y - y).toFixed(0)}px`);
  };
  put('hero', hero);
  for (const [uid, p] of foes) put(uid, p);
}

function paintUnit(k) {
  const u = labelOf(k); if (!u) return;
  const unit = k === 'hero' ? state.hero : state.enemies.find(e => e.uid === k);
  if (!unit) return;
  const s = shownOf(k);
  u.querySelector('.bar i').style.width = `${Math.max(0, s.hp / unit.maxHp * 100)}%`;
  u.querySelector('.hp').textContent = `${s.hp}/${unit.maxHp}${s.block ? ` ⛨${s.block}` : ''}`;
  u.classList.toggle('blocking', s.block > 0);
  if (k !== 'hero') paintIntent(unit);
  refreshStatus(k);
}

function paintIntent(e) {
  const u = labelOf(e.uid); if (!u) return;
  const box = u.querySelector('.intent');
  if (!e.alive || !e.intent) { box.textContent = ''; box.className = 'intent'; return; }
  box.className = `intent ${e.intent.intent}`;
  const glyph = { attack: '⚔', block: '⛨', buff: '▲', debuff: '☁', curse: '✖', heal: '✚' }[e.intent.intent] ?? '?';
  box.textContent = `${glyph} ${engine.describeIntent(e)}`;
  // the preview of the selected card, on every enemy it could hit
  const pv = u.querySelector('.preview');
  if (pv) pv.remove();
  if (sel >= 0 && state.hand[sel] && ['enemy', 'all'].includes(state.hand[sel].target) && e.alive) {
    const p = engine.preview(state, sel, e.slot);
    if (p.damage) u.append(el('div', 'preview', `${p.damage}${p.hits > 1 ? `×${p.hits}` : ''}`));
  }
}

function refreshStatus(k) {
  const u = labelOf(k); if (!u) return;
  const unit = k === 'hero' ? state.hero : state.enemies.find(e => e.uid === k);
  const box = u.querySelector('.statuses'); box.innerHTML = '';
  for (const [key, n] of Object.entries(unit.status)) if (n) box.append(el('span', `st ${key}`, `${STATUS_LABEL[key] ?? key} ${n}`));
  if (k === 'hero') for (const key of Object.keys(state.hero.powers)) box.append(el('span', 'st power', POWER_LABEL[key] ?? key));
}
const POWER_LABEL = { buzzPerTurn: 'BUZZ/TURN', findPerTurn: 'FIND/TURN', blockPerTurn: 'BLOCK/TURN', retainBlock: 'KEEP BLOCK', groove: 'GROOVE', thornsPerTurn: 'THORNS/TURN', keepFetch: 'KEEP FETCH', drawPerTurn: 'DRAW+', strengthPerTurn: 'STR/TURN', energyPerTurn: 'ENERGY+' };

// floating numbers and Balatro chips
const fx = $('#fx');
function pop(k, text, cls, src) {
  const u = labelOf(k); if (!u) return;
  const r = u.getBoundingClientRect();
  const n = el('div', `pop ${cls}`, text);
  if (src && JOKERS[src]) n.append(el('small', '', nameOf(JOKERS, src)));
  else if (src && STATUS_LABEL[src]) n.append(el('small', '', STATUS_LABEL[src]));
  const jitter = (Math.random() - 0.5) * 30;
  n.style.left = `${r.left + r.width / 2 + jitter}px`;
  n.style.top = `${r.top + (cls === 'block' ? 46 : 20)}px`;
  fx.append(n);
  n.addEventListener('animationend', () => n.remove());
}
function banner(text) { const b = $('#banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

// ── the HUD ──────────────────────────────────────────────────────────────
function renderAll() { if (!state || state.phase === 'menu') return; renderTop(); renderHand(); renderEnergy(); for (const e of state.enemies) paintUnit(e.uid); paintUnit('hero'); }

function renderTop() {
  const h = state.hero, ch = CHARACTERS[state.character];
  $('#who').textContent = ch[theme].name;
  $('#hp').textContent = `${h.hp}/${h.maxHp}`;
  $('#hpbar i').style.width = `${h.hp / h.maxHp * 100}%`;
  $('#piles').textContent = `draw ${state.draw.length} · discard ${state.discard.length} · deck ${h.deck.length}`;
  const r = state.route, act = ACTS[state.act];
  const here = state.phase === 'fight' || state.phase === 'reward' ? ENCOUNTERS[state.encounter]?.[theme].name : state.phase === 'event' ? EVENTS.find(e => e.id === state.event?.id)?.[theme].name : state.phase === 'rest' || state.phase === 'pick' ? 'a quiet span' : 'the fork';
  $('#where').textContent = `Act ${state.act + 1} · ${act[theme].name} · ${Math.min(r?.step ?? 0, act.steps)}/${act.steps} · ${engine.HOUR_WORD(state.hour ?? 0)} · ${here ?? ''}`;
  const jr = $('#jokers'); jr.innerHTML = '';
  for (const j of state.jokers) {
    const b = el('div', 'joker'); b.append(el('b', '', nameOf(JOKERS, j.id)), el('span', '', j[theme].text));
    jr.append(b);
  }
  for (let i = state.jokers.length; i < RULES.jokerMax; i++) jr.append(el('div', 'joker empty', ''));
}

function renderEnergy() {
  if (!state) return;
  $('#energy b').textContent = state.hero.energy;
  $('#energy small').textContent = `/${state.hero.maxEnergy} ${T().energyWord}`;
}

function renderHand() {
  const hand = $('#hand'); hand.innerHTML = '';
  if (!state || state.phase !== 'fight') return;
  const n = state.hand.length;
  state.hand.forEach((c, i) => {
    const b = el('button', `card ${c.type}${c.find ? ' find' : ''}`);
    b.dataset.i = i;
    b.style.setProperty('--i', i); b.style.setProperty('--n', n);
    b.style.setProperty('--accent', CHARACTERS[state.character][theme].look.accent);
    b.append(cardFace(c, engine.describe(c, state, i, target)));
    const playable = engine.canPlay(state, i);
    b.classList.toggle('unplayable', !playable);
    b.classList.toggle('selected', i === sel);
    b.setAttribute('aria-pressed', i === sel);
    b.addEventListener('click', ev => { ev.preventDefault(); onCardTap(i); });
    hand.append(b);
  });
  $('#end').disabled = false;
}

// One card face, built once and used by the hand and by the reward panel —
// two builders drift, and the reward is where a card is read most carefully.
function cardFace(c, text) {
  const frag = document.createDocumentFragment();
  const accent = CHARACTERS[state.character][theme].look.accent;
  const pic = paintCardPic(c.pic ?? 'fist', c.type === 'curse' ? '#7a5a8a' : accent, c.id.length + 3);
  const art = el('span', 'art');
  const img = pic.cloneNode(true);
  img.getContext('2d').drawImage(pic, 0, 0);
  img.className = 'pic';
  art.append(img);
  frag.append(el('span', 'cost', c.cost === null || c.cost === undefined ? '✖' : c.cost),
    nameSpan(c), art, el('span', 'text', text), el('span', 'type', c.type));
  return frag;
}

function nameSpan(c) { const n = el('span', 'name', cardName(c.id)); if (c.up) n.append(el('i', 'up', '+')); return n; }
function flashCardPlayed(id) { const t = $('#played'); t.textContent = cardName(id); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); }

// ── input ────────────────────────────────────────────────────────────────
function onCardTap(i) {
  if (busy || state.phase !== 'fight') return;
  unlock();
  const c = state.hand[i];
  if (!c) return;
  if (!engine.canPlay(state, i)) { sel = -1; renderHand(); return; }
  if (sel === i) {
    // a second tap plays a card that needs no target, or one with a single target
    const alive = state.enemies.filter(e => e.alive);
    if (c.target !== 'enemy' || alive.length === 1) return play(i, alive[0]?.slot ?? 0);
    return play(i, alive.some(e => e.slot === target) ? target : alive[0].slot);
  }
  sel = i;
  renderHand();
  for (const e of state.enemies) paintIntent(e);
  document.body.classList.toggle('targeting', c.target === 'enemy');
}

function onEnemyTap(slot) {
  if (busy || state.phase !== 'fight') return;
  const e = state.enemies[slot];
  if (!e?.alive) return;
  target = slot;
  if (sel >= 0) return play(sel, slot);
  for (const x of state.enemies) paintIntent(x);
}

function play(i, slot) {
  const c = state.hand[i];
  if (c.target === 'enemy' && !state.enemies[slot]?.alive) return;
  sel = -1;
  document.body.classList.remove('targeting');
  const ok = engine.playCard(state, i, slot);
  if (!ok) { renderHand(); return; }
  enqueueLog();
  renderHand(); renderEnergy(); renderTop();
  for (const e of state.enemies) paintIntent(e);
}

function endTurn() {
  if (busy || state.phase !== 'fight') return;
  unlock();
  sel = -1; document.body.classList.remove('targeting');
  engine.endTurn(state);
  enqueueLog();
  renderHand();
}
$('#end').addEventListener('click', endTurn);

// keys: 1-9 select or play a card, ←→ move the selection, ↑↓ pick the target,
// Enter plays, Esc deselects, E ends the turn
addEventListener('keydown', ev => {
  if (ev.repeat) return;
  const k = ev.key;
  if (!$('#menu').hidden) return menuKeys(ev);
  if (!$('#reward').hidden) return rewardKeys(ev);
  for (const id of ['#map', '#event', '#rest', '#pick']) if (!$(id).hidden) return panelKeys(ev, id);
  if (!$('#result').hidden) { if (k === 'Enter' || k === ' ') toMenu(); return; }
  if (state?.phase !== 'fight') return;
  if (/^[1-9]$/.test(k)) { const i = Number(k) - 1; if (i < state.hand.length) onCardTap(i); }
  else if (k === 'ArrowRight' || k === 'ArrowLeft') { if (!state.hand.length) return; sel = ((sel < 0 ? 0 : sel) + (k === 'ArrowRight' ? 1 : -1) + state.hand.length) % state.hand.length; renderHand(); for (const e of state.enemies) paintIntent(e); document.body.classList.toggle('targeting', state.hand[sel]?.target === 'enemy'); }
  else if (k === 'ArrowUp' || k === 'ArrowDown') { cycleTarget(k === 'ArrowDown' ? 1 : -1); }
  else if (k === 'Enter' || k === ' ') { if (sel >= 0) onCardTap(sel); }
  else if (k === 'Escape') { sel = -1; document.body.classList.remove('targeting'); renderHand(); for (const e of state.enemies) paintIntent(e); }
  else if (k === 'e' || k === 'E') endTurn();
  else if (k === 'd' || k === 'D') toggleDeck();
});

function cycleTarget(d) {
  const alive = state.enemies.filter(e => e.alive);
  if (!alive.length) return;
  const i = alive.findIndex(e => e.slot === target);
  target = alive[(Math.max(0, i) + d + alive.length) % alive.length].slot;
  for (const e of state.enemies) paintIntent(e);
  document.querySelectorAll('.unit.enemy').forEach(u => u.classList.toggle('aimed', Number(u.dataset.slot) === target));
}

// a pad: d-pad/stick through the hand and the enemies, A plays, B backs out,
// Y ends the turn; never Start — that is the shell's hold-for-home
watchPad({
  dir(dx, dy) {
    if (!dx && !dy) return;
    if (!padHint) { padHint = true; document.body.classList.add('pad'); }
    if (!$('#menu').hidden) return menuKeys({ key: dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp', preventDefault() {} });
    if (!$('#reward').hidden) return rewardKeys({ key: dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : 'x', preventDefault() {} });
    for (const id of ['#map', '#event', '#rest', '#pick']) if (!$(id).hidden) return panelKeys({ key: (dx > 0 || dy > 0) ? 'ArrowRight' : 'ArrowLeft', preventDefault() {} }, id);
    if (state?.phase !== 'fight' || busy) return;
    if (dx) { if (!state.hand.length) return; sel = ((sel < 0 ? (dx > 0 ? -1 : 0) : sel) + dx + state.hand.length) % state.hand.length; renderHand(); for (const e of state.enemies) paintIntent(e); document.body.classList.toggle('targeting', state.hand[sel]?.target === 'enemy'); }
    if (dy) cycleTarget(dy);
  },
  press(i) {
    if (!$('#menu').hidden) return menuKeys({ key: i === 0 ? 'Enter' : i === 3 ? 't' : 'x', preventDefault() {} });
    if (!$('#reward').hidden) return rewardKeys({ key: i === 0 ? 'Enter' : i === 1 ? 'Escape' : 'x', preventDefault() {} });
    for (const id of ['#map', '#event', '#rest', '#pick']) if (!$(id).hidden) return panelKeys({ key: i === 0 ? 'Enter' : 'x', preventDefault() {} }, id);
    if (!$('#result').hidden) { if (i === 0) toMenu(); return; }
    if (state?.phase !== 'fight') return;
    if (i === 0 && sel >= 0) onCardTap(sel);
    else if (i === 0 && sel < 0 && state.hand.length) { sel = 0; renderHand(); }
    else if (i === 1) { sel = -1; document.body.classList.remove('targeting'); renderHand(); }
    else if (i === 3) endTurn();
  },
});

// ── menu ─────────────────────────────────────────────────────────────────
const chars = Object.keys(CHARACTERS);
function renderMenu() {
  const t = T();
  $('#menu .theme b').textContent = t.name;
  document.documentElement.dataset.theme = theme;
  $('#tag').textContent = theme === 'kallio'
    ? 'A deck, a plank bridge, and everything in Kallio that wants your spot.'
    : 'A deck, an old span, and everything in the realm that wants your spot.';
  const r = $('#roster'); r.innerHTML = '';
  chars.forEach((id, i) => {
    const ch = CHARACTERS[id];
    const b = el('button', 'pick'); b.dataset.char = id;
    b.classList.toggle('selected', i === menuSel.char);
    const cv = paintCutout({ ...ch[theme].look, id }, 11, T().mood?.figure); cv.className = 'portrait';
    b.append(cv, el('b', '', ch[theme].name), el('span', '', ch[theme].blurb), el('small', '', `${ch.hp} HP`));
    b.addEventListener('click', () => { menuSel.char = i; renderMenu(); });
    r.append(b);
  });
  $('#mute').textContent = isMuted() ? 'sound off' : 'sound on';
  $('#figs').textContent = `figures: ${figureMotion()}`;
  $('#art').textContent = `art: ${figureArt()}`;
  $('#cut').textContent = `cut: ${figureCut()}`;
  const best = store.get('best', null);
  $('#best').textContent = best ? `best: ${best.won ? 'cleared the run' : `fight ${best.fights + 1}`} as ${CHARACTERS[best.character]?.[theme].name ?? best.character}` : '';
}
function menuKeys(ev) {
  const k = ev.key;
  if (k === 'ArrowRight' || k === 'ArrowLeft') { menuSel.char = (menuSel.char + (k === 'ArrowRight' ? 1 : -1) + chars.length) % chars.length; renderMenu(); }
  else if (k === 'Enter' || k === ' ') startRun(chars[menuSel.char]);
  else if (k === 't' || k === 'T' || k === 'ArrowUp' || k === 'ArrowDown') setTheme(theme === 'kallio' ? 'fantasy' : 'kallio');
}
$('#menu .theme').addEventListener('click', () => setTheme(theme === 'kallio' ? 'fantasy' : 'kallio'));
$('#start').addEventListener('click', () => startRun(chars[menuSel.char]));
$('#mute').addEventListener('click', () => { setMuted(!isMuted()); store.set('mute', isMuted()); renderMenu(); });
// Live: one module-level setting in puppet.js, so the enemies already standing
// on the bridge obey it too and the two looks can be compared mid-fight.
// The art switch has to REPAINT: a puppet bakes its cutout into a texture at
// construction, so unlike the motion toggle this one cannot just flip a flag.
// Same respawn path a theme switch takes, for the same reason.
$('#art').addEventListener('click', () => { setArt(figureArt() === 'turf' ? 'drawn' : 'turf'); });
// The cut is baked into the texture like the art is, so it respawns too.
$('#cut').addEventListener('click', () => { setCut(figureCut() === 'card' ? 'silhouette' : 'card'); });
function setCut(k) {
  setFigureCut(k); store.set('cut', figureCut());
  renderMenu();
  if (state && state.phase !== 'menu') { if (state.phase === 'fight' || state.phase === 'reward') spawnFight(); else spawnHeroAlone(); renderAll(); }
}
function setArt(a) {
  setFigureArt(a); store.set('art', figureArt());
  renderMenu();
  if (state && state.phase !== 'menu') { if (state.phase === 'fight' || state.phase === 'reward') spawnFight(); else spawnHeroAlone(); renderAll(); }
}
$('#figs').addEventListener('click', () => {
  setFigureMotion(figureMotion() === 'paper' ? 'still' : 'paper');
  store.set('figures', figureMotion());
  renderMenu();
});

function setTheme(t) {
  if (!THEMES[t]) return;
  theme = t; store.set('theme', t);
  arena.setTheme(T());
  renderMenu();
  if (state && state.phase !== 'menu') { if (state.phase === 'fight' || state.phase === 'reward') spawnFight(); else spawnHeroAlone(); renderAll(); }
}

function startRun(character) {
  unlock();
  const seed = Number(params.get('seed')) || ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  state = engine.createRun({ seed, character, theme });
  cursor = 0; queue.length = 0; busy = false; sel = -1; target = 0;
  plateStage = null;
  engine.startRun(state);
  for (const p of PANELS) $(p).hidden = true;
  $('#hud').hidden = false;
  spawnHeroAlone();
  cursor = 0;
  enqueueLog();
  sfx.turn();
}

function toMenu() {
  for (const p of PANELS) $(p).hidden = true;
  $('#hud').hidden = true;
  labels.innerHTML = '';
  arena.clearPuppets(); foes.clear(); hero = null;
  state = null;
  $('#menu').hidden = false;
  renderMenu();
}
$('#quit').addEventListener('click', toMenu);
$('#again').addEventListener('click', toMenu);

// ── rewards ──────────────────────────────────────────────────────────────
let rewardSel = 0;
function openReward() {
  const r = state.reward; if (!r) return;
  const panel = $('#reward'); panel.hidden = false;
  rewardSel = 0;
  $('#reward h2').textContent = r.kind === 'card' ? 'Take a card' : `A ${T().jokerWord.replace(/s$/, '')} tags along`;
  const box = $('#options'); box.innerHTML = '';
  r.options.forEach((id, i) => {
    let b;
    if (r.kind === 'card') {
      const c = CARDS[id];
      b = el('button', `card ${c.type}`);
      b.style.setProperty('--accent', CHARACTERS[state.character][theme].look.accent);
      b.append(cardFace({ ...c, id }, engine.describe(c)));
    } else {
      b = el('button', 'joker big');
      b.append(el('b', '', nameOf(JOKERS, id)), el('span', '', JOKERS[id][theme].text));
    }
    b.dataset.i = i;
    b.classList.toggle('selected', i === rewardSel);
    b.addEventListener('click', () => choose(i));
    box.append(b);
  });
}
function choose(i) {
  if (state.phase !== 'reward') return;
  sfx.pick();
  $('#reward').hidden = true;
  const from = state.log.length; cursor = from;
  engine.chooseReward(state, i);
  enqueueLog();
  renderTop();
}
$('#skip').addEventListener('click', () => choose(-1));
function rewardKeys(ev) {
  const k = ev.key, n = state.reward?.options.length ?? 0;
  if (k === 'ArrowRight' || k === 'ArrowLeft') { rewardSel = (rewardSel + (k === 'ArrowRight' ? 1 : -1) + n) % n; $('#options').querySelectorAll('button').forEach((b, i) => b.classList.toggle('selected', i === rewardSel)); }
  else if (k === 'Enter' || k === ' ') choose(rewardSel);
  else if (k === 'Escape') choose(-1);
}

// ── the fork, an event, a rest, a pick ───────────────────────────────────
let panelSel = 0;
const KIND_WORD = { fight: 'a fight', elite: 'an elite', event: 'somewhere', rest: 'a rest', boss: 'the boss' };
function nodeName(n) {
  if (n.kind === 'fight' || n.kind === 'elite') return ENCOUNTERS.find(e => e.id === n.id)?.[theme].name ?? n.id;
  if (n.kind === 'event') return EVENTS.find(e => e.id === n.id)?.[theme].name ?? n.id;
  return 'A quiet span';
}
function nodeHint(n) {
  if (n.kind === 'fight' || n.kind === 'elite') {
    const enc = ENCOUNTERS.find(e => e.id === n.id);
    const counts = new Map(); for (const id of enc.enemies) counts.set(id, (counts.get(id) || 0) + 1);
    return [...counts].map(([id, k]) => `${k > 1 ? `${k}× ` : ''}${nameOf(ENEMIES, id)}`).join(', ') + (enc.reward.includes('joker') ? ` · a ${T().jokerWord.replace(/s$/, '')} waits` : '');
  }
  if (n.kind === 'event') return 'Something other than a fight.';
  return `Sleep for ${Math.round(RULES.restHeal * 100)}% of your HP, or upgrade a card.`;
}
function openMapPanel() {
  if (!state || state.phase !== 'map') return;
  closePanels();
  applyHour(state.hour ?? 0);              // idempotent; covers any path that opens the map without replaying the log
  if (!hero || foes.size) spawnHeroAlone();
  const r = state.route, act = ACTS[state.act];
  const panel = $('#map'); panel.hidden = false;
  panel.querySelector('h2').textContent = r.step === 0 ? act[theme].name : 'The bridge forks';
  panel.querySelector('.where').textContent = `Act ${state.act + 1} · ${engine.HOUR_WORD(state.hour ?? 0)} · span ${r.step + 1} of ${act.steps}, then ${ENCOUNTERS.find(e => e.id === act.boss)[theme].name}`;
  panelSel = 0;
  drawMapPanel();
  renderTop();
}
// The sheet is drawn from the route; a button is laid over each pin of the
// current step so a thumb, a key and a pad all land on the same thing.
let mapPins = [];
function drawMapPanel() {
  if (!state || state.phase !== 'map' || $('#map').hidden) return;
  const r = state.route, act = ACTS[state.act];
  const cv = $('#mapcv');
  const drawn = drawMap(cv, {
    route: r, act, hour: state.hour ?? 0, portrait: arena.portrait, seed: state.seed,
    nameOf: nodeName, bossName: ENCOUNTERS.find(e => e.id === act.boss)[theme].name,
  });
  mapPins = drawn.pins;
  const box = $('#nodes'); box.innerHTML = '';
  r.steps[r.step].forEach((n, i) => {
    const p = drawn.pins.find(q => q.i === r.step && q.j === i);
    const b = el('button', `node ${n.kind}`);
    b.style.left = `${p.x}px`; b.style.top = `${p.y}px`;
    b.setAttribute('aria-label', `${KIND_WORD[n.kind]}: ${nodeName(n)}. ${nodeHint(n)}`);
    b.append(el('b', '', KIND_WORD[n.kind]), el('span', '', nodeName(n)), el('small', '', nodeHint(n)));
    b.classList.toggle('selected', i === panelSel);
    b.addEventListener('click', () => takeNode(i));
    b.addEventListener('pointerenter', () => captionNode(i));
    b.addEventListener('focus', () => captionNode(i));
    box.append(b);
  });
  captionNode(panelSel);
}
function captionNode(i) {
  const n = state?.route?.steps[state.route.step]?.[i]; if (!n) return;
  const c = $('#map .caption'); c.innerHTML = '';
  c.append(el('b', '', KIND_WORD[n.kind]), document.createTextNode(`${nodeName(n)} — ${nodeHint(n)}`));
}
addEventListener('resize', () => drawMapPanel());
function takeNode(i) {
  if (state.phase !== 'map') return;
  sfx.pick();
  const from = state.log.length; cursor = from;
  if (!engine.chooseNode(state, i)) return;
  $('#map').hidden = true;
  enqueueLog();
  renderTop();
}
function openEventPanel() {
  if (!state || state.phase !== 'event') return;
  closePanels();
  const ev = EVENTS.find(e => e.id === state.event.id);
  const panel = $('#event'); panel.hidden = false;
  panel.querySelector('h2').textContent = ev[theme].name;
  panel.querySelector('.text').textContent = ev[theme].text;
  const box = $('#choices'); box.innerHTML = '';
  panelSel = 0;
  ev.options.forEach((o, i) => {
    const b = el('button', '', o[theme].label);
    b.classList.toggle('selected', i === panelSel);
    b.addEventListener('click', () => takeChoice(i));
    box.append(b);
  });
  renderTop();
}
function takeChoice(i) {
  if (state.phase !== 'event') return;
  sfx.pick();
  cursor = state.log.length;
  if (!engine.chooseEvent(state, i)) return;
  $('#event').hidden = true;
  enqueueLog();
  renderTop();
}
function openRestPanel() {
  if (!state || state.phase !== 'rest') return;
  closePanels();
  const panel = $('#rest'); panel.hidden = false;
  const h = state.hero;
  panel.querySelector('.sub').textContent = `Sleep: heal ${Math.floor(h.maxHp * RULES.restHeal)} (${h.hp}/${h.maxHp}). Think it over: upgrade one card for good.`;
  panelSel = 0;
  panel.querySelectorAll('.btn').forEach((b, i) => b.classList.toggle('selected', i === panelSel));
  renderTop();
}
function takeRest(kind) {
  if (state.phase !== 'rest') return;
  sfx.pick();
  cursor = state.log.length;
  if (!engine.chooseRest(state, kind)) return;
  $('#rest').hidden = true;
  enqueueLog();
  renderTop();
}
$('#restHeal').addEventListener('click', () => takeRest('heal'));
$('#restUp').addEventListener('click', () => takeRest('upgrade'));
function openPickPanel() {
  if (!state || state.phase !== 'pick') return;
  closePanels();
  const panel = $('#pick'); panel.hidden = false;
  const kind = state.pick.kind;
  panel.querySelector('h2').textContent = kind === 'remove' ? 'Leave one behind' : 'Which card?';
  const list = panel.querySelector('.list'); list.innerHTML = '';
  panelSel = 0;
  // Nothing left to pick is a real state — every card upgraded — and it used to
  // show an empty list with no way out of the phase.
  if (!engine.pickable(state).length) {
    const b = el('button', 'row', kind === 'upgrade' ? 'Every card is already as good as it gets. Walk on.' : 'Nothing to leave behind. Walk on.');
    b.addEventListener('click', () => { sfx.pick(); cursor = state.log.length; engine.skipPick(state); $('#pick').hidden = true; enqueueLog(); renderTop(); });
    b.classList.add('selected');
    list.append(b);
    return;
  }
  state.hero.deck.forEach((c, i) => {
    if (kind === 'upgrade' && (c.up || c.type === 'curse')) return;
    const row = el('button', `row ${c.type}`);
    row.dataset.i = i;
    const b = el('b', '', cardName(c.id)); if (c.up) b.append(el('i', 'up', '+'));
    row.append(b, el('span', '', `${c.cost ?? '✖'} · ${engine.describe(c)}`));
    if (kind === 'upgrade') {
      const after = engine.upgrade({ ...c, effects: c.effects.map(f => ({ ...f })), up: false });
      row.append(el('span', '', ` → ${after.cost ?? '✖'} · ${engine.describe(after)}`));
    }
    row.addEventListener('click', () => takePick(i));
    list.append(row);
  });
  list.querySelectorAll('.row').forEach((r, i) => r.classList.toggle('selected', i === panelSel));
  renderTop();
}
function takePick(i) {
  if (state.phase !== 'pick') return;
  sfx.pick();
  cursor = state.log.length;
  if (!engine.pickCard(state, i)) return;
  $('#pick').hidden = true;
  enqueueLog();
  renderTop();
}
// one key handler for all four: arrows move, Enter takes, 1-9 takes directly
function panelKeys(ev, id) {
  const k = ev.key;
  const panel = $(id);
  const buttons = [...panel.querySelectorAll(id === '#pick' ? '.row' : id === '#rest' ? '.btn' : id === '#map' ? '.node' : '#choices button')];
  if (!buttons.length) return;
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowUp') {
    panelSel = (panelSel + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons.forEach((b, i) => b.classList.toggle('selected', i === panelSel));
    buttons[panelSel].scrollIntoView?.({ block: 'nearest' });
    if (id === '#map') captionNode(panelSel);
  } else if (k === 'Enter' || k === ' ') buttons[panelSel]?.click();
  else if (/^[1-9]$/.test(k)) buttons[Number(k) - 1]?.click();
}

// ── result ───────────────────────────────────────────────────────────────
function showResult(won) {
  $('#hud').hidden = true;
  const p = $('#result'); p.hidden = false;
  p.querySelector('h2').textContent = won ? 'THE BRIDGE IS YOURS' : 'FLAT ON THE PLANKS';
  const s = state.stats;
  const fellAt = state.phase === 'lost' ? (ENCOUNTERS[state.encounter]?.[theme].name ?? 'the road') : '';
  p.querySelector('.stats').textContent = `${won ? 'cleared both acts' : `fell in act ${state.act + 1} at ${fellAt}`} · ${s.fights} fights · ${s.events} events · ${s.cardsPlayed} cards · ${s.damageDealt} damage · biggest hit ${s.biggestHit} · ${state.jokers.length} ${T().jokerWord}`;
  const best = store.get('best', null);
  const score = { won, fights: s.fights, character: state.character, at: Date.now() };
  if (!best || (won && !best.won) || (won === !!best.won && s.fights > best.fights)) store.set('best', score);
}

// ── deck view ────────────────────────────────────────────────────────────
function toggleDeck() {
  const d = $('#deck');
  if (!d.hidden) { d.hidden = true; return; }
  if (!state) return;
  d.hidden = false;
  const list = d.querySelector('.list'); list.innerHTML = '';
  const counts = new Map();
  for (const c of state.hero.deck) { const k = `${c.id}${c.up ? '+' : ''}`; const e = counts.get(k) || { c, n: 0 }; e.n++; counts.set(k, e); }
  for (const { c, n } of [...counts.values()].sort((a, b) => (a.c.cost ?? 9) - (b.c.cost ?? 9))) {
    const row = el('div', `row ${c.type}`);
    const b = el('b', '', `${n}× ${cardName(c.id)}`); if (c.up) b.append(el('i', 'up', '+'));
    row.append(b, el('span', '', `${c.cost ?? '✖'} · ${engine.describe(c)}`));
    list.append(row);
  }
}
$('#deckbtn').addEventListener('click', toggleDeck);
$('#deck .close').addEventListener('click', toggleDeck);
$('#menubtn').addEventListener('click', () => { if (confirm('Leave this run?')) toMenu(); });

// ── first gesture unlocks audio ──────────────────────────────────────────
addEventListener('pointerdown', unlock, { once: true });
addEventListener('keydown', unlock, { once: true });

renderMenu();
$('#ver').textContent = `v${VERSION}`;

// ── the debug seam ───────────────────────────────────────────────────────
// Drain the replay the way the frame loop would: run everything queued, then
// the same end-of-replay housekeeping — the busy flag, the body class that
// blocks the hand, and whichever run screen the phase is waiting on. A drain
// that skipped the housekeeping left the hand under pointer-events: none.
function flushNow() { while (queue.length) queue.shift().fn(); busy = false; syncAll(); afterReplay(); }
window.__sk = {
  engine, arena, CARDS, JOKERS, ENEMIES,
  state: () => state,
  theme: () => theme,
  puppets: () => ({ hero, foes: [...foes.values()] }),
  busy: () => busy,
  // Every caller of this seam means "put me in a fight", and the run now opens
  // on the map — so it walks onto the first span unless told to stay.
  start: (character = 'drinker', seed = 1, toFight = true) => {
    params.set('seed', String(seed)); startRun(character);
    flushNow();
    if (toFight && state.phase === 'map') { takeNode(0); flushNow(); }
  },
  setHour: t => applyHour(t),
  plate: () => plateUrl,
  setTheme,
  setSpeed: s => { speed = s; },
  select: onCardTap,
  tapEnemy: onEnemyTap,
  endTurn,
  choose,
  takeNode, takeChoice, takeRest, takePick,
  flush: () => flushNow(),
  debug: {
    setHp: (slot, hp) => { const e = state.enemies[slot]; if (e) { e.hp = hp; syncAll(); } },
    heroHp: hp => { state.hero.hp = hp; syncAll(); },
    giveJoker: id => { state.jokers.push({ id, ...JOKERS[id] }); renderTop(); },
    hand: ids => { state.hand = ids.map((id, i) => ({ uid: 9000 + i, id, ...CARDS[id] })); state.hero.energy = 9; renderHand(); },
    // straight to a fight, so a cast can be looked at without winning the five
    // before it — the same reason turf's __turf can boot any encounter
    jumpTo: i => { if (!engine.jumpTo(state, i)) return false; cursor = state.log.length; spawnFight(); syncAll(); return true; },
    // what the act card OUGHT to say, read from the data rather than the screen
    encounterName: (i, t = theme) => ENCOUNTERS[i]?.[t]?.name,
    // a cutout painted at full size, for looking at the art rather than the scene
    look: (id, mutated = 0) => paintCutout({ ...(ENEMIES[id] ?? CHARACTERS[id])[theme].look, id, mutated }, 3, arena.figureMood()),
    encounterCount: () => ENCOUNTERS.length,
    events: () => EVENTS.map(e => e.id),
    // force the next fork to offer exactly these spans, for driving one screen
    forkTo: nodes => { state.route.steps[state.route.step] = nodes; openMapPanel(); },
    mapPins: () => mapPins,
    // The paper-motion seam. `figures` reads the toggle; `playClip` fires a
    // verb on one figure without needing the fight to produce it — nobody
    // should have to be hit to see what being hit looks like; and `poseOf`
    // reports the flex matrix a figure is actually wearing, which is the one
    // honest way for a gate to say "it moved".
    figures: () => figureMotion(),
    art: () => figureArt(),
    cast: () => ({ ...CAST }),
    setArt: a => { setArt(a); return figureArt(); },
    cut: () => figureCut(),
    setCut: k => { setCut(k); return figureCut(); },
    plated: id => !!figurePlateFor(id),
    // The frame axis (v25): which drawings a figure has, and which one it is
    // wearing right now. A gate that only asked "did the matrix change" could
    // not tell a moved card from a card that also swapped its drawing.
    poses: id => figurePoses(id),
    frameOf: (who = 'hero') => unitOf(who)?.frame ?? null,
    // renderMenu() too, or the seam and the button diverge: the gate flipped
    // the switch through here and then failed on the label, which is the seam
    // telling the truth about a real gap rather than a test being awkward.
    setFigures: m => { setFigureMotion(m); store.set('figures', figureMotion()); renderMenu(); return figureMotion(); },
    playClip: (name, who = 'hero') => {
      const p = unitOf(who);
      if (!p) return false;
      p.play(name, p.facing);
      return true;
    },
    // Hold a clip at an exact moment so a contact sheet shows the real poses
    // rather than whatever the wall clock happened to be on.
    scrub: (name, t, who = 'hero') => {
      const p = unitOf(who);
      if (!p) return false;
      freezeFigures(true);
      p.clip = { name, t, dir: p.facing };
      return true;
    },
    unfreeze: () => { freezeFigures(false); },
    poseOf: (who = 'hero') => {
      const p = unitOf(who);
      if (!p) return null;
      const e = p.flex.matrix.elements;                 // column-major out of three.js
      return { sx: e[0], sy: e[5], shear: e[4], lean: e[1], x: p.group.position.x, y: p.group.position.y };
    },
    // re-open whatever screen the phase wants, from the current state — for a
    // harness that has moved the engine underneath the view
    redraw: () => { cursor = state.log.length; closePanels(); afterReplay(); },
  },
};
