// Slay Kallio — the rules, and nothing else.
//
// No DOM, no three.js, no clock: every function here takes a state and
// mutates it, and `state.log` records what happened so the view can act it
// out afterwards. Deterministic from `seed`, which is what lets
// test/core.mjs assert exact numbers in bare node.
//
// The damage pipeline is Balatro's shape on top of Slay the Spire's numbers:
//   base (card + strength + buzz + scaling)  →  + adds (jokers)  →  × mults
//   (jokers, Crema, weak, vulnerable)  →  floor
// and the breakdown rides on the log entry so the view can pop each "+3" and
// "×2" the way Balatro does. What is quoted is what is rolled: describe() and
// preview() run the same pipeline the play does.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, RULES } from './data.js';

// ── rng ──────────────────────────────────────────────────────────────────
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = n => Math.floor(next() * n);
  const pick = arr => arr[int(arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = int(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  return { next, int, pick, shuffle, get seed() { return s; } };
}

// every 0-cost token the tinker's cards can conjure, taken from the data
const TOKENS = Object.entries(CARDS).filter(([, c]) => c.find).map(([id]) => id);

let uidCounter = 0;
const card = id => ({ uid: ++uidCounter, id, ...CARDS[id] });

// ── run ──────────────────────────────────────────────────────────────────
export function createRun({ seed = 1, character = 'barista', theme = 'kallio' } = {}) {
  const def = CHARACTERS[character];
  if (!def) throw new Error(`no character ${character}`);
  const state = {
    seed, theme, character,
    rng: makeRng(seed),
    hero: {
      hp: def.hp, maxHp: def.hp, block: 0, energy: 0, maxEnergy: RULES.energy,
      status: {}, powers: {},
      deck: def.deck.map(card),
    },
    draw: [], hand: [], discard: [], exhaust: [],
    jokers: [],
    enemies: [],
    encounter: -1,
    turn: 0,
    phase: 'menu',           // menu | fight | reward | won | lost
    reward: null,            // { kind: 'card'|'joker', options: [...] , queue: [...] }
    playedThisTurn: [],      // cards played this turn, in order
    attacksThisTurn: 0,
    findsThisTurn: 0,
    log: [],
    stats: { damageDealt: 0, cardsPlayed: 0, biggestHit: 0, fights: 0 },
  };
  return state;
}

export function startRun(state) {
  state.phase = 'fight';
  nextEncounter(state);
  return state;
}

function nextEncounter(state) {
  state.encounter++;
  const enc = ENCOUNTERS[state.encounter];
  if (!enc) { state.phase = 'won'; state.log.push({ t: 'won' }); return; }
  const h = state.hero;
  h.block = 0; h.status = {}; h.powers = {};
  state.enemies = enc.enemies.map((id, i) => {
    const d = ENEMIES[id];
    return { uid: ++uidCounter, id, slot: i, hp: d.hp, maxHp: d.hp, block: 0, status: {},
      moveIndex: d.pattern === 'cycle' ? state.rng.int(d.moves.length) : 0, intent: null, alive: true };
  });
  for (const e of state.enemies) planIntent(state, e);
  state.draw = state.rng.shuffle(state.hero.deck.map(c => ({ ...c })));
  state.hand = []; state.discard = []; state.exhaust = [];
  state.turn = 0;
  state.phase = 'fight';
  state.log.push({ t: 'encounter', index: state.encounter, id: enc.id });
  for (const j of state.jokers) {
    if (j.effect.type === 'startFinds') for (let i = 0; i < j.effect.n; i++) addCardToHand(state, 'find', j.id);
  }
  startTurn(state);
}

// ── turns ────────────────────────────────────────────────────────────────
function startTurn(state) {
  const h = state.hero;
  state.turn++;
  state.playedThisTurn = [];
  state.attacksThisTurn = 0;
  state.findsThisTurn = 0;
  if (!h.powers.retainBlock) h.block = 0;
  let energy = h.maxEnergy, draw = RULES.draw;
  for (const j of state.jokers) {
    const f = j.effect;
    if (f.type === 'energyDraw') { energy += f.energy; draw += f.draw; }
    if (f.type === 'blockPerTurn') gainBlock(state, h, f.n, j.id);
  }
  if (h.powers.blockPerTurn) gainBlock(state, h, h.powers.blockPerTurn, 'timetable');
  if (h.powers.buzzPerTurn) addStatus(state, h, 'buzz', h.powers.buzzPerTurn, 'closing_time');
  if (h.powers.findPerTurn) for (let i = 0; i < h.powers.findPerTurn; i++) addCardToHand(state, 'find', 'recycling');
  h.energy = energy;
  h.groovePaid = false;
  drawCards(state, draw);
  state.log.push({ t: 'turn', n: state.turn, energy });
}

export function drawCards(state, n) {
  for (let i = 0; i < n; i++) {
    if (state.hand.length >= RULES.handMax) break;
    if (!state.draw.length) {
      if (!state.discard.length) break;
      state.draw = state.rng.shuffle(state.discard);
      state.discard = [];
      state.log.push({ t: 'reshuffle' });
    }
    const c = state.draw.pop();
    state.hand.push(c);
    state.log.push({ t: 'draw', card: c.id, uid: c.uid });
  }
}

function addCardToHand(state, id, src) {
  // `find` is the engine's word for a conjured 0-cost token; the data decides
  // what they are called on screen (Bottles in Kallio, Trinkets in the other
  // skin), which is why the ids are read out of the table rather than named.
  if (id === 'find') id = state.rng.pick(TOKENS);
  if (state.hand.length >= RULES.handMax) return;
  const c = card(id);
  state.hand.push(c);
  state.log.push({ t: 'conjure', card: id, uid: c.uid, src });
}

export function endTurn(state) {
  if (state.phase !== 'fight') return state;
  const h = state.hero;
  for (const j of state.jokers) {
    if (j.effect.type === 'emptyHandBlock' && state.hand.filter(c => c.type !== 'curse').length === 0) gainBlock(state, h, j.effect.n, j.id);
  }
  // hand goes to the discard; buzz fades
  while (state.hand.length) state.discard.push(state.hand.pop());
  delete h.status.buzz;
  delete h.status.doubleNext;
  state.log.push({ t: 'endTurn' });
  enemyPhase(state);
  if (state.phase !== 'fight') return state;
  // statuses tick down at the end of the round on both sides
  tickStatuses(h);
  for (const e of state.enemies) if (e.alive) tickStatuses(e);
  startTurn(state);
  return state;
}

function tickStatuses(u) {
  for (const k of ['vulnerable', 'weak']) if (u.status[k]) { u.status[k]--; if (u.status[k] <= 0) delete u.status[k]; }
}

// ── the player's card ────────────────────────────────────────────────────
export function canPlay(state, i) {
  const c = state.hand[i];
  if (!c || state.phase !== 'fight') return false;
  if (c.type === 'curse' || c.cost === null) return false;
  return c.cost <= state.hero.energy;
}

export function playCard(state, i, targetIndex = null) {
  if (!canPlay(state, i)) return false;
  const c = state.hand[i];
  const h = state.hero;
  let target = null;
  if (c.target === 'enemy') {
    target = state.enemies[targetIndex];
    if (!target || !target.alive) target = state.enemies.find(e => e.alive);
    if (!target) return false;
  }
  h.energy -= c.cost;
  state.hand.splice(i, 1);
  state.log.push({ t: 'play', card: c.id, uid: c.uid, target: target?.uid ?? null });
  state.stats.cardsPlayed++;

  const targets = c.target === 'all' ? state.enemies.filter(e => e.alive) : target ? [target] : [];
  for (const fx of c.effects) applyEffect(state, c, fx, target, targets);
  if (c.type === 'attack') state.attacksThisTurn++;
  if (c.find) state.findsThisTurn++;
  for (const j of state.jokers) {
    if (j.effect.type === 'skillBlock' && c.type === 'skill') gainBlock(state, h, j.effect.n, j.id);
  }
  state.playedThisTurn.push(c.id);
  // groove: the 3rd card each turn pays back an energy
  if (h.powers.groove && state.playedThisTurn.length === 3 && !h.groovePaid) { h.energy += 1; h.groovePaid = true; state.log.push({ t: 'energy', n: 1, src: 'groove' }); }

  if (c.type === 'power') state.exhaust.push(c);
  else if (c.exhaust) { state.exhaust.push(c); state.log.push({ t: 'exhaust', uid: c.uid }); }
  else state.discard.push(c);

  checkFightOver(state);
  return true;
}

function applyEffect(state, c, fx, target, targets) {
  const h = state.hero;
  switch (fx.type) {
    case 'damage': {
      const times = fx.times || 1;
      for (const e of targets) for (let k = 0; k < times; k++) {
        if (!e.alive) continue;
        const d = computeDamage(state, c, fx, e);
        dealDamage(state, e, d.final, { breakdown: d, src: c.id });
      }
      break;
    }
    case 'block': gainBlock(state, h, blockAmount(state, c, fx), c.id); break;
    case 'status': {
      const who = fx.who === 'self' ? [h] : fx.who === 'all' ? state.enemies.filter(e => e.alive) : targets;
      for (const u of who) {
        if (['buzzPerTurn', 'findPerTurn', 'blockPerTurn', 'retainBlock', 'groove'].includes(fx.key)) {
          h.powers[fx.key] = (h.powers[fx.key] || 0) + fx.n;
          state.log.push({ t: 'power', key: fx.key, n: h.powers[fx.key] });
        } else addStatus(state, u, fx.key, fx.n, c.id);
      }
      break;
    }
    case 'draw': drawCards(state, fx.n); break;
    case 'energy': h.energy += fx.n; state.log.push({ t: 'energy', n: fx.n, src: c.id }); break;
    case 'addCard': for (let k = 0; k < fx.n; k++) addCardToHand(state, fx.id, c.id); break;
    case 'heal': heal(state, fx.n); break;
    default: throw new Error(`unknown effect ${fx.type}`);
  }
}

function scaleOf(state, fx) {
  switch (fx.scale) {
    case 'played': return state.playedThisTurn.length * (fx.per || 1);
    case 'block': return state.hero.block * (fx.per || 1);
    case 'hand': return state.hand.length * (fx.per || 1);
    case 'finds': return state.findsThisTurn * (fx.per || 1);
    case 'jokers': return state.jokers.length * (fx.per || 1);
    default: return 0;
  }
}

function blockAmount(state, c, fx) {
  return Math.max(0, fx.n + scaleOf(state, fx));
}

// The one place damage is worked out. `preview` calls it without side effects.
export function computeDamage(state, c, fx, target) {
  const h = state.hero;
  const adds = [], mults = [];
  let base = fx.n + scaleOf(state, fx);
  if (h.status.strength) { base += h.status.strength; adds.push({ src: 'strength', n: h.status.strength }); }
  if (h.status.buzz) { base += h.status.buzz; adds.push({ src: 'buzz', n: h.status.buzz }); }
  const played = state.playedThisTurn.length;
  const attackNo = state.attacksThisTurn + 1;
  let vulnMult = RULES.vulnerable;
  for (const j of state.jokers) {
    const f = j.effect;
    switch (f.type) {
      case 'attackAddPerPlayed': if (played) adds.push({ src: j.id, n: played * f.per }); break;
      case 'attackAddIfCost': if (c.cost === f.cost) adds.push({ src: j.id, n: f.add }); break;
      case 'attackAddIfCostAtLeast': if (c.cost >= f.cost) adds.push({ src: j.id, n: f.add }); break;
      case 'attackAddPerJoker': adds.push({ src: j.id, n: state.jokers.length * f.per }); break;
      case 'nthAttackMult': if (attackNo % f.n === 0) mults.push({ src: j.id, x: f.mult }); break;
      case 'firstAttackMult': if (attackNo === 1) mults.push({ src: j.id, x: f.mult }); break;
      case 'vulnMult': vulnMult = f.mult; break;
    }
  }
  if (h.status.doubleNext) mults.push({ src: 'doubleNext', x: 2 });
  if (h.status.weak) mults.push({ src: 'weak', x: RULES.weak });
  if (target?.status?.vulnerable) mults.push({ src: 'vulnerable', x: vulnMult });
  let v = base;
  for (const a of adds) if (a.src !== 'strength' && a.src !== 'buzz') v += a.n;
  for (const m of mults) v *= m.x;
  return { base: fx.n + scaleOf(state, fx), adds, mults, final: Math.max(0, Math.floor(v)) };
}

// what a card would do right now — the same arithmetic the play uses
export function preview(state, i, targetIndex = null) {
  const c = state.hand[i];
  if (!c) return null;
  const target = c.target === 'enemy' ? (state.enemies[targetIndex] ?? state.enemies.find(e => e.alive)) : null;
  const out = { damage: 0, block: 0, hits: 0, breakdown: null };
  for (const fx of c.effects) {
    if (fx.type === 'damage') {
      const d = computeDamage(state, c, fx, target ?? state.enemies.find(e => e.alive));
      out.damage = d.final; out.hits = fx.times || 1; out.breakdown = d;
    }
    if (fx.type === 'block') out.block = blockAmount(state, c, fx);
  }
  return out;
}

function dealDamage(state, target, amount, extra = {}) {
  let left = amount;
  let blocked = 0;
  if (target.block > 0) {
    blocked = Math.min(target.block, left);
    target.block -= blocked; left -= blocked;
  }
  target.hp = Math.max(0, target.hp - left);
  state.log.push({ t: 'damage', target: target.uid, amount, blocked, hp: target.hp, ...extra });
  if (target !== state.hero) {
    state.stats.damageDealt += left;
    state.stats.biggestHit = Math.max(state.stats.biggestHit, amount);
    if (target.hp <= 0 && target.alive) { target.alive = false; target.intent = null; state.log.push({ t: 'die', target: target.uid, id: target.id }); }
  } else if (target.hp <= 0) {
    state.phase = 'lost';
    state.log.push({ t: 'lost' });
  }
}

function gainBlock(state, u, n, src) {
  if (n <= 0) return;
  u.block += n;
  state.log.push({ t: 'block', target: u === state.hero ? 'hero' : u.uid, n, total: u.block, src });
}

function addStatus(state, u, key, n, src) {
  u.status[key] = (u.status[key] || 0) + n;
  state.log.push({ t: 'status', target: u === state.hero ? 'hero' : u.uid, key, n, total: u.status[key], src });
}

function heal(state, n) {
  const h = state.hero;
  const before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + n);
  if (h.hp !== before) state.log.push({ t: 'heal', n: h.hp - before, hp: h.hp });
}

// ── enemies ──────────────────────────────────────────────────────────────
function planIntent(state, e) {
  const d = ENEMIES[e.id];
  const m = d.pattern === 'random' ? state.rng.pick(d.moves) : d.moves[e.moveIndex % d.moves.length];
  e.intent = { ...m };
  if (m.intent === 'attack') e.intent.shown = enemyDamage(state, e, m.dmg);
}

// the number on the telegraph is the number that lands
export function enemyDamage(state, e, dmg) {
  let v = dmg + (e.status.strength || 0);
  if (e.status.weak) v *= RULES.weak;
  if (state.hero.status.vulnerable) v *= RULES.vulnerable;
  return Math.max(0, Math.floor(v));
}

function enemyPhase(state) {
  const h = state.hero;
  for (const e of state.enemies) {
    if (!e.alive || state.phase !== 'fight') continue;
    e.block = 0;
    const m = e.intent;
    state.log.push({ t: 'enemyAct', enemy: e.uid, move: m.id, intent: m.intent });
    if (m.intent === 'attack' || m.dmg) {
      const times = m.times || 1;
      for (let k = 0; k < times && state.phase === 'fight'; k++) dealDamage(state, h, enemyDamage(state, e, m.dmg), { src: m.id, from: e.uid });
    }
    if (m.block) gainBlock(state, e, m.block, m.id);
    if (m.status) {
      const self = m.status.key === 'strength';
      addStatus(state, self ? e : h, m.status.key, m.status.n, m.id);
    }
    if (m.status2) addStatus(state, h, m.status2.key, m.status2.n, m.id);
    if (m.addCard) { const c = card(m.addCard); state.discard.push(c); state.log.push({ t: 'curse', card: c.id, uid: c.uid, src: e.uid }); }
    e.moveIndex++;
    planIntent(state, e);
  }
  // the hero's vulnerable/weak were applied for the coming turn; intents are
  // re-shown against the hero's current statuses
  for (const e of state.enemies) if (e.alive && e.intent?.intent === 'attack') e.intent.shown = enemyDamage(state, e, e.intent.dmg);
}

function checkFightOver(state) {
  if (state.phase !== 'fight') return;
  if (state.enemies.every(e => !e.alive)) {
    state.stats.fights++;
    state.log.push({ t: 'fightWon', index: state.encounter });
    heal(state, RULES.healAfterFight);
    const enc = ENCOUNTERS[state.encounter];
    const queue = [...enc.reward];
    if (state.jokers.length >= RULES.jokerMax) queue.splice(queue.indexOf('joker'), queue.includes('joker') ? 1 : 0);
    openReward(state, queue);
  }
}

// ── rewards ──────────────────────────────────────────────────────────────
function openReward(state, queue) {
  if (!queue.length) { state.reward = null; nextEncounter(state); return; }
  const kind = queue.shift();
  const options = kind === 'card' ? rollCards(state, 3) : rollJokers(state, 3);
  if (!options.length) { openReward(state, queue); return; }
  state.phase = 'reward';
  state.reward = { kind, options, queue };
  state.log.push({ t: 'reward', kind, options });
}

function rollCards(state, n) {
  const pool = Object.entries(CARDS)
    .filter(([, c]) => (c.char === state.character || !c.char) && !['basic', 'token', 'curse'].includes(c.rarity))
    .map(([id, c]) => ({ id, w: c.rarity === 'rare' ? 1 : c.rarity === 'uncommon' ? 3 : 5 }));
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = state.rng.next() * total;
    let k = 0;
    while (r >= pool[k].w) { r -= pool[k].w; k++; }
    out.push(pool[k].id);
    pool.splice(k, 1);
  }
  return out;
}

function rollJokers(state, n) {
  const held = new Set(state.jokers.map(j => j.id));
  const pool = Object.keys(JOKERS).filter(id => !held.has(id));
  return state.rng.shuffle(pool).slice(0, n);
}

export function chooseReward(state, index) {
  if (state.phase !== 'reward' || !state.reward) return false;
  const { kind, options, queue } = state.reward;
  const id = options[index];
  if (id !== undefined) {
    if (kind === 'card') { state.hero.deck.push(card(id)); state.log.push({ t: 'gainCard', card: id }); }
    else { state.jokers.push({ id, ...JOKERS[id] }); state.log.push({ t: 'gainJoker', joker: id }); }
  } else state.log.push({ t: 'skipReward', kind });
  openReward(state, queue);
  return true;
}

export const skipReward = state => chooseReward(state, -1);

// ── text ─────────────────────────────────────────────────────────────────
const STATUS_WORD = {
  vulnerable: 'Vulnerable', weak: 'Weak', strength: 'Strength', buzz: 'Buzz', doubleNext: 'Double',
};
const POWER_TEXT = {
  buzzPerTurn: n => `At the start of your turn, gain ${n} Buzz.`,
  findPerTurn: n => `At the start of your turn, conjure ${n} Bottle.`,
  blockPerTurn: n => `At the start of your turn, gain ${n} block.`,
  retainBlock: () => 'Block is not lost at the start of your turn.',
  groove: () => 'The 3rd card you play each turn refunds 1 energy.',
};
const SCALE_TEXT = { played: 'card played this turn', block: 'block you have', hand: 'card in your hand', finds: 'Bottle played this turn', jokers: 'friend' };

// Card text is written from the effects, with live numbers when a state and
// hand index are given: a Crema-doubled Strike says 12 on its face.
export function describe(c, state = null, i = null, targetIndex = null) {
  if (c.type === 'curse') return 'Unplayable. Takes up a slot in your hand.';
  const parts = [];
  const live = state && i !== null ? preview(state, i, targetIndex) : null;
  for (const fx of c.effects) {
    switch (fx.type) {
      case 'damage': {
        const n = live ? live.damage : fx.n;
        let s = `Deal ${n}${fx.times ? ` ×${fx.times}` : ''} damage${c.target === 'all' ? ' to all' : ''}`;
        if (fx.scale && !live) s += fx.n ? ` +${fx.per} per ${SCALE_TEXT[fx.scale]}` : ` = ${fx.per} per ${SCALE_TEXT[fx.scale]}`;
        parts.push(s + '.');
        break;
      }
      case 'block': {
        const n = live ? live.block : fx.n;
        let s = `Gain ${n} block`;
        if (fx.scale && !live) s += fx.n ? ` +${fx.per} per ${SCALE_TEXT[fx.scale]}` : ` = ${fx.per} per ${SCALE_TEXT[fx.scale]}`;
        parts.push(s + '.');
        break;
      }
      case 'status':
        if (POWER_TEXT[fx.key]) parts.push(POWER_TEXT[fx.key](fx.n));
        else if (fx.key === 'doubleNext') parts.push('Your next attack this turn deals double.');
        else parts.push(`${fx.who === 'self' ? 'Gain' : 'Apply'} ${fx.n} ${STATUS_WORD[fx.key]}${fx.who === 'all' ? ' to all' : ''}.`);
        break;
      case 'draw': parts.push(`Draw ${fx.n}.`); break;
      case 'energy': parts.push(`Gain ${fx.n} energy.`); break;
      case 'addCard': parts.push(`Conjure ${fx.n} Bottle${fx.n > 1 ? 's' : ''} into your hand.`); break;
      case 'heal': parts.push(`Heal ${fx.n}.`); break;
    }
  }
  if (c.exhaust) parts.push('Exhaust.');
  return parts.join(' ');
}

export function describeIntent(e) {
  const m = e.intent;
  if (!m) return '';
  switch (m.intent) {
    case 'attack': return `${m.shown}${m.times ? ` ×${m.times}` : ''}`;
    case 'block': return `block ${m.block}`;
    case 'buff': return `+${m.status?.n ?? ''} str${m.block ? ` · block ${m.block}` : ''}`;
    case 'debuff': return `${m.dmg ? `${m.dmg} · ` : ''}${STATUS_WORD[m.status.key].toLowerCase()} ${m.status.n}${m.status2 ? ` · ${STATUS_WORD[m.status2.key].toLowerCase()} ${m.status2.n}` : ''}`;
    case 'curse': return 'adds a curse';
    default: return m.intent;
  }
}

// ── a bot, for the gates ─────────────────────────────────────────────────
// Plays the highest-damage playable card at the lowest-HP enemy until it can
// play nothing, then ends the turn. Takes the first reward. Not clever — its
// job is to finish a run so the gate can assert a run finishes.
export function botTurn(state) {
  let guard = 40;
  while (state.phase === 'fight' && guard-- > 0) {
    let best = -1, bestScore = -1;
    for (let i = 0; i < state.hand.length; i++) {
      if (!canPlay(state, i)) continue;
      const p = preview(state, i);
      const score = p.damage * p.hits + p.block * 0.8 + (state.hand[i].type === 'power' ? 6 : 0) + 1;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    const alive = state.enemies.filter(e => e.alive).sort((a, b) => a.hp - b.hp);
    playCard(state, best, alive[0]?.slot ?? 0);
  }
  if (state.phase === 'fight') endTurn(state);
}

export function botRun(state, maxTurns = 400) {
  let n = 0;
  while ((state.phase === 'fight' || state.phase === 'reward') && n++ < maxTurns) {
    if (state.phase === 'reward') chooseReward(state, 0);
    else botTurn(state);
  }
  return state;
}
