// Slay Kallio — boot, the HUD, and the replay of what the engine did.
//
// The engine resolves a card or an enemy phase in one synchronous call and
// leaves a log; this file reads the log back at a human pace — one number,
// one wobble, one topple at a time — the way turf's anim.js reads its state
// log. While the replay runs the hand is locked; when it drains, every bar is
// synced to the real state so nothing can drift. `window.__sk` is the seam
// the smoke test drives, and it can set the replay delays to zero.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, THEMES, RULES } from './data.js';
import * as engine from './engine.js';
import { Arena } from './scene.js';
import { Puppet, paintCutout } from './puppet.js';
import { paintCardPic } from './cardart.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';
import { watchPad } from '../../hub/pad.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const store = {
  get: (k, d) => { try { const v = localStorage.getItem('slayKallio.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('slayKallio.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const VERSION = 5;
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

// ── boot ─────────────────────────────────────────────────────────────────
const gl = $('#gl');
arena = new Arena(gl, T());
const params = new URLSearchParams(location.search);
if (params.get('bg')) arena.setPhoto(params.get('bg'), { stereo: params.get('stereo'), eye: params.get('eye') || 'left' }).catch(() => {});
setMuted(store.get('mute', false));

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
    case 'won': later(600, () => showResult(true)); break;
    case 'lost': later(200, () => { hero.die(); sfx.lose(); }); later(1600, () => showResult(false)); break;
    default: break;
  }
}

function afterReplay() {
  document.body.classList.remove('busy');
  if (state.phase === 'reward' && $('#reward').hidden) openReward();
}

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
  hero = new Puppet({ look: ch[theme].look, seed: 11, scale: 1, facing: 1 });
  arena.add(hero);
  const made = state.enemies.map(e => {
    const d = ENEMIES[e.id];
    const p = new Puppet({ look: d[theme].look, seed: 100 + e.uid, scale: d.scale, facing: -1 });
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
  banner(nameOf(ENCOUNTERS[state.encounter], ENCOUNTERS[state.encounter].id) || ENCOUNTERS[state.encounter][theme].name);
}

function relayout() { if (!state || state.phase === 'menu') return; const L = layout(); hero?.setHome(L.heroX, 0, 0.1); state.enemies.forEach((e, i) => foes.get(e.uid)?.setHome(L.foeX(i), 0, 0.05 - (i % 2) * 0.12)); }
addEventListener('resize', relayout);

// ── labels over the puppets ──────────────────────────────────────────────
const STATUS_LABEL = { vulnerable: 'VULN', weak: 'WEAK', strength: 'STR', buzz: 'BUZZ', doubleNext: '×2 NEXT' };
// how far down the screen a unit label may start: clear of the top HUD plate,
// and the label's own box hangs 58px above its anchor (see .unit in the CSS)
const TOP_GUTTER = 96;
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
  state.enemies.forEach(e => {
    const u = mk(e.uid, nameOf(ENEMIES, e.id), 'enemy');
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
    const top = TOP_GUTTER, x = Math.max(78, Math.min(w - 78, head.x));
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
  const glyph = { attack: '⚔', block: '⛨', buff: '▲', debuff: '☁', curse: '✖' }[e.intent.intent] ?? '?';
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
const POWER_LABEL = { buzzPerTurn: 'BUZZ/TURN', findPerTurn: 'FIND/TURN', blockPerTurn: 'BLOCK/TURN', retainBlock: 'KEEP BLOCK', groove: 'GROOVE' };

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
  $('#who').textContent = `${ch[theme].name} · ${ch[theme].title}`;
  $('#hp').textContent = `${h.hp}/${h.maxHp}`;
  $('#hpbar i').style.width = `${h.hp / h.maxHp * 100}%`;
  $('#piles').textContent = `draw ${state.draw.length} · discard ${state.discard.length} · deck ${h.deck.length}`;
  $('#where').textContent = `${state.encounter + 1}/${ENCOUNTERS.length} · ${ENCOUNTERS[state.encounter]?.[theme].name ?? ''}`;
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
    el('span', 'name', cardName(c.id)), art, el('span', 'text', text), el('span', 'type', c.type));
  return frag;
}

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
    if (state?.phase !== 'fight' || busy) return;
    if (dx) { if (!state.hand.length) return; sel = ((sel < 0 ? (dx > 0 ? -1 : 0) : sel) + dx + state.hand.length) % state.hand.length; renderHand(); for (const e of state.enemies) paintIntent(e); document.body.classList.toggle('targeting', state.hand[sel]?.target === 'enemy'); }
    if (dy) cycleTarget(dy);
  },
  press(i) {
    if (!$('#menu').hidden) return menuKeys({ key: i === 0 ? 'Enter' : i === 3 ? 't' : 'x', preventDefault() {} });
    if (!$('#reward').hidden) return rewardKeys({ key: i === 0 ? 'Enter' : i === 1 ? 'Escape' : 'x', preventDefault() {} });
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
    const cv = paintCutout(ch[theme].look, 11); cv.className = 'portrait';
    b.append(cv, el('b', '', ch[theme].name), el('i', '', ch[theme].title), el('span', '', ch[theme].blurb), el('small', '', `${ch.hp} HP`));
    b.addEventListener('click', () => { menuSel.char = i; renderMenu(); });
    r.append(b);
  });
  $('#mute').textContent = isMuted() ? 'sound off' : 'sound on';
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

function setTheme(t) {
  if (!THEMES[t]) return;
  theme = t; store.set('theme', t);
  arena.setTheme(T());
  renderMenu();
  if (state && state.phase !== 'menu') { spawnFight(); renderAll(); }
}

function startRun(character) {
  unlock();
  const seed = Number(params.get('seed')) || ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  state = engine.createRun({ seed, character, theme });
  cursor = 0; queue.length = 0; busy = false; sel = -1; target = 0;
  engine.startRun(state);
  $('#menu').hidden = true; $('#result').hidden = true; $('#reward').hidden = true;
  $('#hud').hidden = false;
  spawnFight();
  cursor = state.log.length;
  syncAll();
  sfx.turn();
}

function toMenu() {
  $('#result').hidden = true; $('#hud').hidden = true; $('#reward').hidden = true; $('#deck').hidden = true;
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

// ── result ───────────────────────────────────────────────────────────────
function showResult(won) {
  $('#hud').hidden = true;
  const p = $('#result'); p.hidden = false;
  p.querySelector('h2').textContent = won ? 'THE BRIDGE IS YOURS' : 'FLAT ON THE PLANKS';
  const s = state.stats;
  p.querySelector('.stats').textContent = `${won ? 'cleared' : `fell at fight ${state.encounter + 1}`} · ${s.cardsPlayed} cards · ${s.damageDealt} damage · biggest hit ${s.biggestHit} · ${state.jokers.length} ${T().jokerWord}`;
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
  for (const c of state.hero.deck) counts.set(c.id, (counts.get(c.id) || 0) + 1);
  for (const [id, n] of [...counts].sort((a, b) => CARDS[a[0]].cost - CARDS[b[0]].cost)) {
    const row = el('div', `row ${CARDS[id].type}`);
    row.append(el('b', '', `${n}× ${cardName(id)}`), el('span', '', `${CARDS[id].cost ?? '✖'} · ${engine.describe(CARDS[id])}`));
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
window.__sk = {
  engine, arena, CARDS, JOKERS, ENEMIES,
  state: () => state,
  theme: () => theme,
  puppets: () => ({ hero, foes: [...foes.values()] }),
  busy: () => busy,
  start: (character = 'drinker', seed = 1) => { params.set('seed', String(seed)); startRun(character); },
  setTheme,
  setSpeed: s => { speed = s; },
  select: onCardTap,
  tapEnemy: onEnemyTap,
  endTurn,
  choose,
  flush: () => { while (queue.length) queue.shift().fn(); busy = false; syncAll(); afterReplay(); },
  debug: {
    setHp: (slot, hp) => { const e = state.enemies[slot]; if (e) { e.hp = hp; syncAll(); } },
    heroHp: hp => { state.hero.hp = hp; syncAll(); },
    giveJoker: id => { state.jokers.push({ id, ...JOKERS[id] }); renderTop(); },
    hand: ids => { state.hand = ids.map((id, i) => ({ uid: 9000 + i, id, ...CARDS[id] })); state.hero.energy = 9; renderHand(); },
    // straight to a fight, so a cast can be looked at without winning the five
    // before it — the same reason turf's __turf can boot any encounter
    jumpTo: i => { if (!engine.jumpTo(state, i)) return false; cursor = state.log.length; spawnFight(); syncAll(); return true; },
  },
};
