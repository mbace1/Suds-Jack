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
//
// THE RUN (2026-09-05, owner: "aim for StS2 parity"). Two acts. At every step
// the route offers two or three spans — a fight, an elite, an event, a rest —
// and you choose one; the act ends on its boss. The whole route is rolled from
// the seed up front (`buildRoute`), so the same seed is the same map, and a
// future map screen can draw it without the rules changing.
//
// Phases: menu | map | fight | reward | event | rest | pick | won | lost.
// `pick` is the one shared sub-phase: an event option or a rest that touches a
// specific card (remove it, upgrade it) parks what is left to do in
// `state.pick.then` and waits for `pickCard`.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, ACTS, EVENTS, RULES } from './data.js';

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
const ENC_INDEX = Object.fromEntries(ENCOUNTERS.map((e, i) => [e.id, i]));
const POWERS = ['buzzPerTurn', 'findPerTurn', 'blockPerTurn', 'retainBlock', 'groove',
  'thornsPerTurn', 'keepFetch', 'drawPerTurn', 'strengthPerTurn', 'energyPerTurn'];

let uidCounter = 0;
const card = id => ({ uid: ++uidCounter, id, ...CARDS[id], effects: CARDS[id].effects.map(f => ({ ...f })) });

// ── upgrades ─────────────────────────────────────────────────────────────
// One rule, not a second version of every card: numbers move, the card stays
// the same card. Damage and block +3 (a multi-hit gets +1 per hit), a scaling
// card scales one harder, draw and conjure +1, a status one deeper, a power
// costs one less. `describe` and `preview` read the moved numbers, so an
// upgraded card's face is right by construction.
export function upgrade(c) {
  if (c.up) return c;
  for (const f of c.effects) {
    switch (f.type) {
      case 'damage': if (f.n > 0 || !f.scale) f.n += f.times > 1 ? 1 : 3; else f.per += 1; break;
      case 'block': if (f.n > 0 || !f.scale) f.n += 3; else f.per += 1; break;
      case 'draw': case 'addCard': f.n += 1; break;
      case 'status': if (!['doubleNext', 'retainBlock', 'groove', 'keepFetch'].includes(f.key) && f.who === 'self') f.n += f.key === 'fetch' ? 3 : 1; break;
      case 'heal': f.n += 3; break;
      case 'energy': f.n += 1; break;
      case 'loseHp': f.n = Math.max(0, f.n - 1); break;
      default: break;
    }
  }
  if (c.type === 'power' && c.cost > 0) c.cost -= 1;
  c.up = true;
  return c;
}

// ── run ──────────────────────────────────────────────────────────────────
export function createRun({ seed = 1, character = 'drinker', theme = 'kallio' } = {}) {
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
    act: 0,
    hour: undefined,         // 0 day … 1 night, from route progress (hourOf)
    route: null,             // { act, step, steps: [[node…]…], done: [node…] }
    encounter: -1,           // index into ENCOUNTERS of the current/last fight
    event: null,             // { id, options }
    pick: null,              // { kind: 'remove'|'upgrade', then: [effects], from }
    turn: 0,
    phase: 'menu',
    reward: null,            // { kind: 'card'|'joker', options: [...], queue: [...] }
    rewardThen: 'fight',     // where a drained reward queue leads: 'fight' → after the fight, 'map' → straight back to the map
    playedThisTurn: [],
    attacksThisTurn: 0,
    attacksThisFight: 0,
    findsThisTurn: 0,
    struck: 0,               // enemy hits taken this fight — the boxer counts them
    log: [],
    stats: { damageDealt: 0, cardsPlayed: 0, biggestHit: 0, fights: 0, events: 0, rests: 0 },
  };
  return state;
}

export function startRun(state) {
  state.act = 0;
  buildRoute(state, 0);
  openMap(state);
  return state;
}

// ── the route ────────────────────────────────────────────────────────────
// Rolled up front from the seed. The shape rules, all of which the gate
// checks: the first step is fights only (you learn the deck before you choose
// anything); an elite is never offered before step 2 and always by step 4; a
// rest is always among the last step's options, so the boss is never reached
// without the choice of resting first; and no step offers the same span twice.
export function buildRoute(state, actIndex) {
  const act = ACTS[actIndex];
  const rng = state.rng;
  const fights = rng.shuffle([...act.fights]);
  const events = rng.shuffle(EVENTS.map(e => e.id));
  let fi = 0, ei = 0;
  const nextFight = () => { const id = fights[fi % fights.length]; fi++; return { kind: 'fight', id }; };
  const nextEvent = () => { const id = events[ei % events.length]; ei++; return { kind: 'event', id }; };
  const steps = [];
  let eliteOffered = false, restOffered = false;
  for (let s = 0; s < act.steps; s++) {
    const opts = [];
    const last = s === act.steps - 1;
    if (s === 0) { opts.push(nextFight(), nextFight()); }
    else {
      if (last) opts.push({ kind: 'rest' });
      else if ((s === 2 || s === 3) && !restOffered && (s === 3 || rng.next() < 0.6)) { opts.push({ kind: 'rest' }); restOffered = true; }
      if (s >= 2 && !last && (s === 4 && !eliteOffered || rng.next() < 0.35)) {
        opts.push({ kind: 'elite', id: rng.pick(act.elites) }); eliteOffered = true;
      }
      if (rng.next() < 0.55 || last) opts.push(nextEvent());
      while (opts.length < 2) opts.push(nextFight());
      if (opts.length < 3 && rng.next() < 0.5) opts.push(nextFight());
    }
    // no duplicate span in one step
    const seen = new Set();
    const unique = opts.filter(o => { const k = `${o.kind}:${o.id ?? ''}`; if (seen.has(k)) return false; seen.add(k); return true; });
    while (unique.length < 2) unique.push(nextFight());
    steps.push(rng.shuffle(unique));
  }
  state.route = { act: actIndex, step: 0, steps, done: [] };
  return state.route;
}

// The hour of the run, 0 at the first span and 1 at the last boss. The world
// starts in daylight and ends in the dark, and past dusk what spawns has begun
// to change: level 0 by day, 1 through the evening, 2 at night.
export function hourOf(state) {
  const steps = ACTS.reduce((a, x) => a + x.steps + 1, 0);
  const walked = ACTS.slice(0, state.act).reduce((a, x) => a + x.steps + 1, 0) + Math.min(state.route?.step ?? 0, ACTS[state.act].steps + 1);
  return Math.min(1, walked / (steps - 1));
}
export const nightfall = hour => hour < 0.5 ? 0 : hour < 0.8 ? 1 : 2;
export const HOUR_WORD = hour => hour < 0.2 ? 'afternoon' : hour < 0.45 ? 'late afternoon' : hour < 0.6 ? 'dusk' : hour < 0.8 ? 'evening' : 'night';
function markHour(state) {
  const h = hourOf(state);
  if (state.hour !== h) { state.hour = h; state.log.push({ t: 'hour', hour: h, word: HOUR_WORD(h) }); }
}

function openMap(state) {
  const r = state.route;
  state.event = null; state.pick = null; state.reward = null;
  markHour(state);
  if (r.step >= r.steps.length) {
    // the act's boss stands at the end of the route
    startEncounter(state, ACTS[r.act].boss, 'boss');
    return;
  }
  state.phase = 'map';
  state.log.push({ t: 'map', act: r.act, step: r.step, options: r.steps[r.step] });
}

export function chooseNode(state, i) {
  if (state.phase !== 'map') return false;
  const r = state.route;
  const node = r.steps[r.step]?.[i];
  if (!node) return false;
  r.done.push(node);
  r.step++;
  state.log.push({ t: 'node', act: r.act, step: r.step - 1, node });
  if (node.kind === 'fight' || node.kind === 'elite') startEncounter(state, node.id, node.kind);
  else if (node.kind === 'event') openEvent(state, node.id);
  else if (node.kind === 'rest') { state.phase = 'rest'; state.log.push({ t: 'rest' }); }
  return true;
}

// ── a fight ──────────────────────────────────────────────────────────────
function startEncounter(state, encId, kind = 'fight') {
  const index = ENC_INDEX[encId];
  const enc = ENCOUNTERS[index];
  if (!enc) throw new Error(`no encounter ${encId}`);
  state.encounter = index;
  if (kind === 'boss') { state.route.step = ACTS[state.act].steps + 1; }
  markHour(state);
  const lvl = nightfall(state.hour ?? 0);
  const h = state.hero;
  h.block = 0; h.status = {}; h.powers = {}; h.fresh = {};
  state.enemies = enc.enemies.map((id, i) => {
    const d = ENEMIES[id];
    // MUTATION. Past dusk an ordinary enemy is no longer quite the thing it
    // was by day: more of it, and at night, stronger. A boss is never
    // mutated — a boss IS the night.
    const mut = d.boss ? 0 : lvl;
    const hp = Math.round(d.hp * RULES.mutation[mut]);
    const e = { uid: ++uidCounter, id, slot: i, hp, maxHp: hp, block: 0, status: {}, mutated: mut,
      moveIndex: d.pattern === 'cycle' ? state.rng.int(d.moves.length) : 0, intent: null, alive: true };
    if (mut >= 2) e.status.strength = 1;
    return e;
  });
  for (const e of state.enemies) planIntent(state, e);
  state.draw = state.rng.shuffle(state.hero.deck.map(c => ({ ...c, effects: c.effects.map(f => ({ ...f })) })));
  state.hand = []; state.discard = []; state.exhaust = [];
  state.turn = 0;
  state.attacksThisFight = 0;
  state.struck = 0;
  state.phase = 'fight';
  state.log.push({ t: 'encounter', index, id: enc.id, kind, hour: state.hour, mutated: lvl });
  for (const j of state.jokers) {
    const f = j.effect;
    if (f.type === 'startFinds') for (let i = 0; i < f.n; i++) addCardToHand(state, 'find', j.id);
    if (f.type === 'thornsStart') addStatus(state, h, 'thorns', f.n, j.id);
    if (f.type === 'energyForHp') loseHp(state, f.hp, j.id);
  }
  if (state.phase === 'fight') startTurn(state);
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
    if (f.type === 'energyForHp') energy += f.energy;
    if (f.type === 'blockPerTurn') gainBlock(state, h, f.n, j.id);
    if (f.type === 'firstTurnEnergy' && state.turn === 1) energy += f.n;
    if (f.type === 'firstTurnDraw' && state.turn === 1) draw += f.n;
  }
  if (h.powers.energyPerTurn) energy += h.powers.energyPerTurn;
  if (h.powers.drawPerTurn) draw += h.powers.drawPerTurn;
  if (h.powers.blockPerTurn) gainBlock(state, h, h.powers.blockPerTurn, 'timetable');
  if (h.powers.buzzPerTurn) addStatus(state, h, 'buzz', h.powers.buzzPerTurn, 'closing_time');
  if (h.powers.thornsPerTurn) addStatus(state, h, 'thorns', h.powers.thornsPerTurn, 'thornsPerTurn');
  if (h.powers.strengthPerTurn) addStatus(state, h, 'strength', h.powers.strengthPerTurn, 'strengthPerTurn');
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
  // THE DOG GOES IN. Everything the walker did this turn was a promise; the
  // end of the turn is when it is kept — at the weakest enemy, and then the
  // Fetch is spent unless a power keeps the dog out.
  if (h.status.fetch) {
    const weakest = state.enemies.filter(e => e.alive).sort((a, b) => a.hp - b.hp)[0];
    if (weakest) dealDamage(state, weakest, h.status.fetch, { src: 'fetch' });
    if (!h.powers.keepFetch) delete h.status.fetch;
  }
  for (const j of state.jokers) {
    if (j.effect.type === 'endTurnDamage') {
      const weakest = state.enemies.filter(e => e.alive).sort((a, b) => a.hp - b.hp)[0];
      if (weakest) dealDamage(state, weakest, j.effect.n, { src: j.id });
    }
  }
  checkFightOver(state);
  if (state.phase !== 'fight') return state;
  // hand goes to the discard; buzz fades
  while (state.hand.length) state.discard.push(state.hand.pop());
  delete h.status.buzz;
  delete h.status.doubleNext;
  state.log.push({ t: 'endTurn' });
  enemyPhase(state);
  if (state.phase !== 'fight') return state;
  // Statuses tick down at the end of the round on both sides — except one an
  // enemy applied to the hero THIS round, which skips its first tick (Slay
  // the Spire's own `justApplied`). Without that, a Weak or a Frail an enemy
  // had just landed was gone before the next turn began, and no enemy debuff
  // on the hero had ever actually done anything. Found by the gull's snatch,
  // the first debuff a test checked from the enemy's side.
  tickStatuses(h);
  for (const e of state.enemies) if (e.alive) tickStatuses(e);
  startTurn(state);
  return state;
}

function tickStatuses(u) {
  for (const k of ['vulnerable', 'weak', 'frail']) {
    if (!u.status[k]) continue;
    if (u.fresh?.[k]) { delete u.fresh[k]; continue; }      // applied this round: it lasts the next one
    u.status[k]--; if (u.status[k] <= 0) delete u.status[k];
  }
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
  state.log.push({ t: 'play', card: c.id, uid: c.uid, target: target?.uid ?? null, up: !!c.up });
  state.stats.cardsPlayed++;

  const targets = c.target === 'all' ? state.enemies.filter(e => e.alive) : target ? [target] : [];
  for (const fx of c.effects) applyEffect(state, c, fx, target, targets);
  if (c.type === 'attack') {
    state.attacksThisTurn++; state.attacksThisFight++;
    for (const j of state.jokers) if (j.effect.type === 'blockOnAttack') gainBlock(state, h, j.effect.n, j.id);
  }
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
        if (POWERS.includes(fx.key)) {
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
    case 'loseHp': loseHp(state, fx.n, c.id); break;
    default: throw new Error(`unknown effect ${fx.type}`);
  }
}

function scaleOf(state, fx) {
  const h = state.hero;
  switch (fx.scale) {
    case 'played': return state.playedThisTurn.length * (fx.per || 1);
    case 'block': return h.block * (fx.per || 1);
    case 'hand': return state.hand.length * (fx.per || 1);
    case 'finds': return state.findsThisTurn * (fx.per || 1);
    case 'jokers': return state.jokers.length * (fx.per || 1);
    case 'buzz': return (h.status.buzz || 0) * (fx.per || 1);
    case 'discard': return state.discard.length * (fx.per || 1);
    case 'struck': return state.struck * (fx.per || 1);
    case 'fetch': return (h.status.fetch || 0) * (fx.per || 1);
    case 'missing': return Math.floor((h.maxHp - h.hp) * (fx.per || 1));
    default: return 0;
  }
}

function blockAmount(state, c, fx) {
  let v = Math.max(0, fx.n + scaleOf(state, fx));
  if (state.hero.status.frail) v = Math.floor(v * RULES.frail);
  return v;
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
      case 'firstAttackFightMult': if (state.attacksThisFight === 0) mults.push({ src: j.id, x: f.mult }); break;
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
  state.log.push({ t: 'damage', target: target === state.hero ? 'hero' : target.uid, amount, blocked, hp: target.hp, ...extra });
  if (target !== state.hero) {
    state.stats.damageDealt += left;
    state.stats.biggestHit = Math.max(state.stats.biggestHit, amount);
    if (target.hp <= 0 && target.alive) { target.alive = false; target.intent = null; state.log.push({ t: 'die', target: target.uid, id: target.id }); }
    // Thorns on an enemy: a card that struck it costs the hero the thorns.
    // Not the dog and not a friend — thorns answer a BLOW, and never each other.
    if (target.status.thorns && extra.breakdown && !extra.thorns) dealDamage(state, state.hero, target.status.thorns, { src: 'thorns', thorns: true, from: target.uid });
  } else {
    if (extra.from !== undefined && !extra.thorns) {
      state.struck++;
      const attacker = state.enemies.find(e => e.uid === extra.from);
      if (state.hero.status.thorns && attacker?.alive) dealDamage(state, attacker, state.hero.status.thorns, { src: 'thorns', thorns: true });
    }
    if (target.hp <= 0 && state.phase !== 'lost') {
      state.phase = 'lost';
      state.log.push({ t: 'lost' });
    }
  }
}

function gainBlock(state, u, n, src) {
  if (n <= 0) return;
  u.block += n;
  state.log.push({ t: 'block', target: u === state.hero ? 'hero' : u.uid, n, total: u.block, src });
}

function addStatus(state, u, key, n, src) {
  u.status[key] = (u.status[key] || 0) + n;
  if (u === state.hero && state.enemyActing && ['vulnerable', 'weak', 'frail'].includes(key)) (u.fresh ??= {})[key] = true;
  state.log.push({ t: 'status', target: u === state.hero ? 'hero' : u.uid, key, n, total: u.status[key], src });
}

function heal(state, n) {
  const h = state.hero;
  const before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + n);
  if (h.hp !== before) state.log.push({ t: 'heal', n: h.hp - before, hp: h.hp });
}

function loseHp(state, n, src) {
  const h = state.hero;
  if (n <= 0) return;
  h.hp = Math.max(0, h.hp - n);
  state.log.push({ t: 'damage', target: 'hero', amount: n, blocked: 0, hp: h.hp, src, self: true });
  if (h.hp <= 0 && state.phase !== 'lost') { state.phase = 'lost'; state.log.push({ t: 'lost' }); }
}

// ── enemies ──────────────────────────────────────────────────────────────
function planIntent(state, e) {
  const d = ENEMIES[e.id];
  const m = d.pattern === 'random' ? state.rng.pick(d.moves) : d.moves[e.moveIndex % d.moves.length];
  e.intent = { ...m };
  if (m.intent === 'attack' || m.dmg) e.intent.shown = enemyDamage(state, e, m.dmg);
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
  state.enemyActing = true;
  for (const e of state.enemies) {
    if (!e.alive || state.phase !== 'fight') continue;
    e.block = 0;
    const m = e.intent;
    state.log.push({ t: 'enemyAct', enemy: e.uid, move: m.id, intent: m.intent });
    if (m.intent === 'attack' || m.dmg) {
      const times = m.times || 1;
      for (let k = 0; k < times && state.phase === 'fight' && e.alive; k++) dealDamage(state, h, enemyDamage(state, e, m.dmg), { src: m.id, from: e.uid });
    }
    if (m.block) gainBlock(state, e, m.block, m.id);
    if (m.heal) { const before = e.hp; e.hp = Math.min(e.maxHp, e.hp + m.heal); if (e.hp !== before) state.log.push({ t: 'enemyHeal', target: e.uid, n: e.hp - before, hp: e.hp }); }
    if (m.status) {
      const selfKeys = ['strength', 'thorns'];
      if (m.who === 'all') for (const o of state.enemies) { if (o.alive) addStatus(state, o, m.status.key, m.status.n, m.id); }
      else addStatus(state, selfKeys.includes(m.status.key) ? e : h, m.status.key, m.status.n, m.id);
    }
    if (m.status2) addStatus(state, h, m.status2.key, m.status2.n, m.id);
    if (m.addCard) { const c = card(m.addCard); state.discard.push(c); state.log.push({ t: 'curse', card: c.id, uid: c.uid, src: e.uid }); }
    e.moveIndex++;
    if (e.alive) planIntent(state, e);
  }
  state.enemyActing = false;
  // the hero's vulnerable/weak were applied for the coming turn; intents are
  // re-shown against the hero's current statuses
  for (const e of state.enemies) if (e.alive && e.intent && (e.intent.intent === 'attack' || e.intent.dmg)) e.intent.shown = enemyDamage(state, e, e.intent.dmg);
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
    state.rewardThen = 'fight';
    openReward(state, queue);
  }
}

// after the last reward of a fight: the next act, the end, or back to the map
function afterFight(state) {
  const enc = ENCOUNTERS[state.encounter];
  const act = ACTS[state.act];
  if (enc && enc.id === act.boss) {
    state.log.push({ t: 'actWon', act: state.act });
    if (state.act + 1 >= ACTS.length) { state.phase = 'won'; state.log.push({ t: 'won' }); return; }
    // Dusk falls between the acts, and you catch your breath. Measured: without
    // this every character reached act two at ~40% HP and the Bridge King was
    // 48% of all deaths — the middle of the run was a wall, not a curve.
    heal(state, Math.floor(state.hero.maxHp * RULES.healBetweenActs));
    state.act++;
    buildRoute(state, state.act);
  }
  openMap(state);
}

// ── rewards ──────────────────────────────────────────────────────────────
function openReward(state, queue) {
  if (!queue.length) { state.reward = null; if (state.rewardThen === 'map') openMap(state); else afterFight(state); return; }
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

function gainJoker(state, id) {
  const j = { id, ...JOKERS[id] };
  state.jokers.push(j);
  state.log.push({ t: 'gainJoker', joker: id });
  if (j.effect.type === 'maxHp') { state.hero.maxHp += j.effect.n; state.hero.hp += j.effect.n; state.log.push({ t: 'maxHp', n: j.effect.n, maxHp: state.hero.maxHp, hp: state.hero.hp }); }
}

export function chooseReward(state, index) {
  if (state.phase !== 'reward' || !state.reward) return false;
  const { kind, options, queue } = state.reward;
  const id = options[index];
  if (id !== undefined) {
    if (kind === 'card') { state.hero.deck.push(card(id)); state.log.push({ t: 'gainCard', card: id }); }
    else gainJoker(state, id);
  } else state.log.push({ t: 'skipReward', kind });
  openReward(state, queue);
  return true;
}

export const skipReward = state => chooseReward(state, -1);

// ── events ───────────────────────────────────────────────────────────────
function openEvent(state, id) {
  const ev = EVENTS.find(e => e.id === id);
  if (!ev) throw new Error(`no event ${id}`);
  state.phase = 'event';
  state.event = { id, options: ev.options.map((_, i) => i) };
  state.stats.events++;
  state.log.push({ t: 'event', id });
}

export function chooseEvent(state, i) {
  if (state.phase !== 'event' || !state.event) return false;
  const ev = EVENTS.find(e => e.id === state.event.id);
  const opt = ev.options[i];
  if (!opt) return false;
  state.log.push({ t: 'eventChoice', id: ev.id, option: i });
  runEffects(state, [...opt.effects], 'event');
  return true;
}

// Event and rest effects, in order. An effect that needs a card picked parks
// the rest in `state.pick.then` and stops; `pickCard` resumes it. A `reward`
// opens the ordinary reward and sends it back to the map when it drains.
function runEffects(state, effects, from) {
  const h = state.hero;
  while (effects.length) {
    const f = effects.shift();
    switch (f.type) {
      case 'heal': heal(state, f.pct ? Math.floor(h.maxHp * f.pct) : f.n); break;
      case 'maxHp': h.maxHp = Math.max(1, h.maxHp + f.n); h.hp = Math.max(1, Math.min(h.maxHp, h.hp + Math.max(0, f.n))); state.log.push({ t: 'maxHp', n: f.n, maxHp: h.maxHp, hp: h.hp }); break;
      case 'hp': loseHp(state, f.n, from); if (state.phase === 'lost') return; break;
      case 'card': h.deck.push(card(f.id)); state.log.push({ t: 'gainCard', card: f.id }); break;
      case 'curse': h.deck.push(card(f.id)); state.log.push({ t: 'gainCard', card: f.id, curse: true }); break;
      case 'joker': { const opts = rollJokers(state, 1); if (opts.length) gainJoker(state, opts[0]); break; }
      case 'maxEnergy': h.maxEnergy += f.n; state.log.push({ t: 'maxEnergy', n: f.n, maxEnergy: h.maxEnergy }); break;
      case 'roll': { const good = state.rng.next() < f.p; state.log.push({ t: 'roll', good }); effects.unshift(...(good ? f.good : f.bad)); break; }
      case 'remove': case 'upgrade': {
        state.pick = { kind: f.type, then: effects, from };
        state.phase = 'pick';
        state.log.push({ t: 'pick', kind: f.type });
        return;
      }
      case 'reward': {
        state.rewardThen = 'map';
        openReward(state, [f.kind]);
        if (state.phase === 'reward') return;      // the map follows when it drains
        break;
      }
      default: throw new Error(`unknown event effect ${f.type}`);
    }
  }
  openMap(state);
}

export function pickCard(state, deckIndex) {
  if (state.phase !== 'pick' || !state.pick) return false;
  const c = state.hero.deck[deckIndex];
  if (!c) return false;
  const { kind, then } = state.pick;
  if (kind === 'remove') { state.hero.deck.splice(deckIndex, 1); state.log.push({ t: 'removeCard', card: c.id, uid: c.uid }); }
  else if (kind === 'upgrade') { if (c.up) return false; upgrade(c); state.log.push({ t: 'upgrade', card: c.id, uid: c.uid }); }
  state.pick = null;
  runEffects(state, then, 'pick');
  return true;
}

// ── a rest ───────────────────────────────────────────────────────────────
export function chooseRest(state, kind) {
  if (state.phase !== 'rest') return false;
  state.stats.rests++;
  if (kind === 'heal') { heal(state, Math.floor(state.hero.maxHp * RULES.restHeal)); state.log.push({ t: 'rested', kind }); openMap(state); return true; }
  if (kind === 'upgrade') { state.log.push({ t: 'rested', kind }); runEffects(state, [{ type: 'upgrade' }], 'rest'); return true; }
  return false;
}

// Jump straight to an encounter, keeping the deck and friends you are holding.
// For tuning and for looking at art: nobody should have to win five fights to
// see whether the sixth one reads. The act follows the encounter, so beating
// a boss from here still ends the act.
export function jumpTo(state, index) {
  const enc = ENCOUNTERS[index];
  if (!enc) return false;
  state.reward = null; state.event = null; state.pick = null;
  const act = ACTS.findIndex(a => a.boss === enc.id || a.fights.includes(enc.id) || a.elites.includes(enc.id));
  if (act >= 0 && act !== state.act) { state.act = act; buildRoute(state, act); }
  if (!state.route) buildRoute(state, state.act);
  startEncounter(state, enc.id, enc.enemies.some(id => ENEMIES[id].boss) ? 'boss' : enc.enemies.some(id => ENEMIES[id].elite) ? 'elite' : 'fight');
  return true;
}

// ── text ─────────────────────────────────────────────────────────────────
const STATUS_WORD = {
  vulnerable: 'Vulnerable', weak: 'Weak', strength: 'Strength', buzz: 'Buzz', doubleNext: 'Double',
  frail: 'Frail', thorns: 'Thorns', fetch: 'Fetch',
};
const POWER_TEXT = {
  buzzPerTurn: n => `At the start of your turn, gain ${n} Buzz.`,
  findPerTurn: n => `At the start of your turn, conjure ${n} Bottle.`,
  blockPerTurn: n => `At the start of your turn, gain ${n} block.`,
  retainBlock: () => 'Block is not lost at the start of your turn.',
  groove: () => 'The 3rd card you play each turn refunds 1 energy.',
  thornsPerTurn: n => `At the start of your turn, gain ${n} Thorns.`,
  keepFetch: () => 'Fetch is not spent at the end of your turn.',
  drawPerTurn: n => `Draw ${n} more card${n > 1 ? 's' : ''} each turn.`,
  strengthPerTurn: n => `At the start of your turn, gain ${n} Strength.`,
  energyPerTurn: n => `Gain ${n} more energy each turn.`,
};
const SCALE_TEXT = { played: 'card played this turn', block: 'block you have', hand: 'card in your hand', finds: 'Bottle played this turn', jokers: 'friend',
  buzz: 'Buzz', discard: 'card in your discard', struck: 'hit you took this fight', fetch: 'Fetch', missing: 'missing HP' };

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
        else if (fx.key === 'fetch') parts.push(`Gain ${fx.n} Fetch.`);
        else parts.push(`${fx.who === 'self' ? 'Gain' : 'Apply'} ${fx.n} ${STATUS_WORD[fx.key]}${fx.who === 'all' ? ' to all' : ''}.`);
        break;
      case 'draw': parts.push(`Draw ${fx.n}.`); break;
      case 'energy': parts.push(`Gain ${fx.n} energy.`); break;
      case 'addCard': parts.push(`Conjure ${fx.n} Bottle${fx.n > 1 ? 's' : ''} into your hand.`); break;
      case 'heal': parts.push(`Heal ${fx.n}.`); break;
      case 'loseHp': parts.push(`Lose ${fx.n} HP.`); break;
    }
  }
  if (c.exhaust) parts.push('Exhaust.');
  return parts.join(' ');
}

export const STATUS_HELP = {
  vulnerable: 'takes ×1.5 damage', weak: 'deals ×0.75 damage', frail: 'gains ×0.75 block', strength: 'permanent +damage',
  buzz: '+damage until the end of the turn', thorns: 'deals this back to whatever strikes it', fetch: 'the dog deals this at the end of your turn',
};

export function describeIntent(e) {
  const m = e.intent;
  if (!m) return '';
  switch (m.intent) {
    case 'attack': return `${m.shown}${m.times ? ` ×${m.times}` : ''}${m.block ? ` · block ${m.block}` : ''}`;
    case 'block': return `block ${m.block}`;
    case 'buff': return `+${m.status?.n ?? ''} ${STATUS_WORD[m.status?.key]?.toLowerCase() ?? 'str'}${m.who === 'all' ? ' all' : ''}${m.block ? ` · block ${m.block}` : ''}`;
    case 'debuff': return `${m.dmg ? `${m.shown ?? m.dmg} · ` : ''}${STATUS_WORD[m.status.key].toLowerCase()} ${m.status.n}${m.status2 ? ` · ${STATUS_WORD[m.status2.key].toLowerCase()} ${m.status2.n}` : ''}`;
    case 'heal': return `heals ${m.heal}${m.status ? ` · +${m.status.n} ${STATUS_WORD[m.status.key].toLowerCase()}` : ''}`;
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
      const c = state.hand[i];
      const fetch = c.effects.filter(f => f.type === 'status' && f.key === 'fetch').reduce((a, f) => a + f.n, 0);
      const score = p.damage * p.hits + p.block * 0.8 + fetch * 0.9 + (c.type === 'power' ? 6 : 0) + 1;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    const alive = state.enemies.filter(e => e.alive).sort((a, b) => a.hp - b.hp);
    playCard(state, best, alive[0]?.slot ?? 0);
  }
  if (state.phase === 'fight') endTurn(state);
}

// One decision in whatever phase the run is in. The map choice is the only
// place it is allowed a little sense — rest when hurt, avoid an elite when
// hurt — because a bot that walks into every elite at 20% HP measures nothing
// but its own stupidity.
export function botStep(state) {
  const h = state.hero;
  switch (state.phase) {
    case 'fight': botTurn(state); break;
    case 'reward': chooseReward(state, 0); break;
    case 'map': {
      const opts = state.route.steps[state.route.step] ?? [];
      const hurt = h.hp / h.maxHp < 0.55;
      const lastStep = state.route.step === state.route.steps.length - 1;
      let i = opts.findIndex(o => o.kind === 'rest');
      // the span before the boss always offers a rest, and only a fool walks past it
      if (i < 0 || (!hurt && !lastStep)) {
        const fight = opts.findIndex(o => o.kind === 'fight');
        const elite = opts.findIndex(o => o.kind === 'elite');
        const event = opts.findIndex(o => o.kind === 'event');
        i = (!hurt && h.hp / h.maxHp > 0.8 && elite >= 0) ? elite : fight >= 0 ? fight : event >= 0 ? event : Math.max(0, i);
      }
      chooseNode(state, i);
      break;
    }
    case 'event': {
      const ev = EVENTS.find(e => e.id === state.event.id);
      const cost = o => o.effects.reduce((a, f) => a + (f.type === 'hp' ? f.n : f.type === 'roll' ? f.bad.reduce((b, g) => b + (g.type === 'hp' ? g.n : 0), 0) : 0), 0);
      let i = ev.options.findIndex(o => cost(o) < h.hp - 8);
      chooseEvent(state, i < 0 ? ev.options.length - 1 : i);
      break;
    }
    case 'rest': chooseRest(state, h.hp / h.maxHp < 0.75 ? 'heal' : 'upgrade'); break;
    case 'pick': {
      const d = h.deck;
      let i = state.pick.kind === 'remove'
        ? d.findIndex(c => c.type === 'curse') >= 0 ? d.findIndex(c => c.type === 'curse') : d.findIndex(c => c.rarity === 'basic')
        : d.findIndex(c => !c.up && c.rarity !== 'basic' && c.type !== 'curse');
      if (i < 0) i = d.findIndex(c => state.pick.kind === 'remove' ? c.type !== 'curse' : !c.up && c.type !== 'curse');
      if (i < 0 || !pickCard(state, Math.max(0, i))) { state.pick = null; openMap(state); }
      break;
    }
    default: break;
  }
}

export function botRun(state, maxSteps = 900) {
  let n = 0;
  while (!['won', 'lost', 'menu'].includes(state.phase) && n++ < maxSteps) botStep(state);
  return state;
}
