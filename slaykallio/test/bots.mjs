// Slay Kallio — six ways to play it, measured against each other.
//   node slaykallio/test/bots.mjs [seeds]
//
// This is a MEASURING INSTRUMENT, not a gate. It never fails a build.
//
// Why it exists: every balance number this game has was produced by ONE bot,
// which plays the highest-value card it can afford until it cannot, and takes
// the first reward offered. That bot empties its hand. Roope's whole mechanic
// is holding one. So "the collector wins 2%" could mean the character is weak
// or the instrument cannot hold it, and a single bot can never tell you which.
// Six bots can: if a character's best line is not the greedy one, the spread
// between them is the size of the skill the character is asking for.
//
// THE CONTROL COLUMN. `greedy` is the engine's own `botStep`, unchanged and
// imported rather than reimplemented. Its numbers must reproduce the ones in
// VERSIONS.md; that is what makes the other five columns mean anything. The
// same discipline TURF's balance work landed on, for the same reason.
//
// Each bot is a POLICY over six decisions, not just card play — how it drafts
// and where it walks matter as much as what it plays:
//   card(state)      which card, and at whom (null = end the turn)
//   map(state, opts) which span to walk to
//   event(state, ev) which option to take
//   rest(state)      sleep or upgrade
//   pick(state)      which card to remove or upgrade
//   draft(state, r)  which reward to take
//
// HONEST LIMITS, so nobody reads more into a column than is there:
//   - None of these is a good player. They are six DIFFERENT bad players, and
//     the useful reading is the difference between them, not the height of any.
//   - A bot cannot see two turns ahead. Nothing here plans a build; `synergist`
//     drafts toward one, which is not the same thing.
//   - A spread of a few points at 150 seeds is noise. Do not tune on it.

import { pathToFileURL } from 'node:url';
import { CARDS, CHARACTERS, ENCOUNTERS, ACTS, EVENTS, RULES } from '../js/data.js';
import { createRun, startRun, playCard, endTurn, canPlay, preview, chooseNode, chooseEvent,
  chooseRest, pickCard, chooseReward, botStep, skipPick, pickable } from '../js/engine.js';

const chars = Object.keys(CHARACTERS);

// ── what a bot can see ───────────────────────────────────────────────────
const alive = s => s.enemies.filter(e => e.alive);
// how much is coming at the hero if the turn ended now — the number every
// defensive decision is actually about
function incoming(s) {
  return alive(s).reduce((a, e) => {
    const m = e.intent;
    if (!m || !(m.intent === 'attack' || m.dmg)) return a;
    return a + (m.shown ?? m.dmg ?? 0) * (m.times || 1);
  }, 0);
}
const hpFrac = s => s.hero.hp / s.hero.maxHp;
const scaleOn = (c, kind) => c.effects.some(f => f.scale === kind);
// does this card put `key` on YOU — the mechanic-granting half of a deck
const grants = (c, key) => c.effects.some(f => f.type === 'status' && f.who === 'self' && f.key === key);
const dmgOf = (s, i) => { const p = preview(s, i); return p ? p.damage * Math.max(1, p.hits) : 0; };
const blkOf = (s, i) => preview(s, i)?.block ?? 0;
// the target every bot agrees on: the one that dies soonest
const weakest = s => alive(s).sort((a, b) => a.hp - b.hp)[0]?.slot ?? 0;

// play by a score, highest first; `stop` can refuse to play at all
function playByScore(s, score, { stop = () => false } = {}) {
  let guard = 40;
  while (s.phase === 'fight' && guard-- > 0) {
    if (stop(s)) break;
    let best = -1, bestScore = -Infinity;
    for (let i = 0; i < s.hand.length; i++) {
      if (!canPlay(s, i)) continue;
      const v = score(s, i, s.hand[i]);
      if (v > bestScore) { bestScore = v; best = i; }
    }
    if (best < 0 || bestScore <= -Infinity) break;
    playCard(s, best, weakest(s));
  }
  if (s.phase === 'fight') endTurn(s);
}

// the ordinary map walk, parameterised by taste
function walk(s, taste) {
  const opts = s.route.steps[s.route.step] ?? [];
  const rank = o => taste[o.kind] ?? 0;
  let best = 0, bestV = -Infinity;
  opts.forEach((o, i) => { const v = rank(o) + (o.kind === 'rest' ? (1 - hpFrac(s)) * 6 : 0); if (v > bestV) { bestV = v; best = i; } });
  chooseNode(s, best);
}

// an event option's HP cost, as advertised — every label states it, which is
// the whole point of the full-information rule
function eventCost(o) {
  return o.effects.reduce((a, f) => a + (f.type === 'hp' ? f.n : f.type === 'roll' ? f.bad.reduce((b, g) => b + (g.type === 'hp' ? g.n : 0), 0) * (1 - f.p) : 0), 0);
}
const eventGain = o => o.effects.filter(f => ['joker', 'upgrade', 'card', 'maxEnergy', 'maxHp', 'reward'].includes(f.type)).length;

// pick a card out of the deck to remove or upgrade
function pickBy(s, want) {
  const options = pickable(s);
  if (!options.length) return void skipPick(s);        // every card already upgraded
  const chosen = options.find(({ c }) => want(c, s)) ?? options[0];
  if (!pickCard(s, chosen.i)) skipPick(s);
}

// ── the half of a policy that is not card play ───────────────────────────
// `synergist` and `native` SHARE this, on purpose: the only difference
// between those two columns is how the hand is played, so any gap between
// them is about the mechanic and not about drafting or where it walked.
const buildPolicy = {
  map: s => walk(s, { elite: 3, fight: 3, event: 4, rest: 2 }),
  event: (s, ev) => chooseEvent(s, ev.options.reduce((best, o, i, all) => eventGain(o) > eventGain(all[best]) ? i : best, 0)),
  rest: s => chooseRest(s, hpFrac(s) < 0.5 ? 'heal' : 'upgrade'),
  pick: s => pickBy(s, (c, st) => st.pick.kind === 'upgrade'
    ? !c.up && (c.char === st.character || c.effects.some(f => f.scale))
    : c.type === 'curse' || c.rarity === 'basic'),
  draft: (s, r) => chooseReward(s, r.kind === 'card'
    ? r.options.reduce((b, id, i, all) => {
      const worth = x => (CARDS[x].char ? 2 : 0) + (CARDS[x].effects.some(f => f.scale) ? 2 : 0) + (CARDS[x].type === 'power' ? 2 : 0);
      return worth(id) > worth(all[b]) ? i : b;
    }, 0) : 0),
};

// ── ONE READING PER CHARACTER ────────────────────────────────────────────
// `native` plays each character the way somebody who knows that character
// would, which is the only honest way to ask whether a weak column is a weak
// CHARACTER. Five bots said the drinker, the collector and the walker win 7%
// at best — but not one of those five is built to spend a strength that
// expires, to hold a hand of free tokens, or to feed a dog all turn.
const SCORE = {
  // BUZZ FADES AT THE END OF THE TURN. Every point not spent is thrown away,
  // so the drink goes down first and every attack you own follows it in the
  // SAME turn. Blocking while buzz is up is paying with a resource that is
  // about to expire.
  drinker: (st, i, c) => {
    const buzz = st.hero.status.buzz || 0;
    if (c.type === 'power') return 200;
    if (grants(c, 'buzz')) return 150 - (c.cost || 0) * 2;
    if (scaleOn(c, 'buzz')) return 90 + dmgOf(st, i);
    if (c.type === 'attack') return 40 + dmgOf(st, i) + buzz * 4;
    const need = Math.max(0, incoming(st) - st.hero.block);
    return (buzz ? 2 : 14) + Math.min(blkOf(st, i), need);
  },

  // ORDER IS THE PLAY: the card that counts what came before it goes last.
  busker: (st, i, c) => {
    if (c.type === 'power') return 200;
    if (scaleOn(c, 'played')) {
      const more = st.hand.some((x, j) => j !== i && canPlay(st, j) && x.type !== 'power' && !scaleOn(x, 'played'));
      return more ? -Infinity : 80 + dmgOf(st, i) + blkOf(st, i);
    }
    return 20 - (c.cost || 0) * 3 + dmgOf(st, i) * 0.15 + blkOf(st, i) * 0.15;
  },

  // CASH THE HAND, THEN SPEND IT. The hand-counters are worth most while the
  // hand is full, so they go first — but after them the Bottles are FREE, and
  // `hoarder`'s mistake was sitting on cards that were no longer worth
  // anything to hold. Count first, then empty out.
  collector: (st, i, c) => {
    if (c.type === 'power') return 200;
    if (scaleOn(c, 'hand') || scaleOn(c, 'finds')) return 150 + dmgOf(st, i) + blkOf(st, i);
    const waiting = st.hand.some((x, j) => j !== i && canPlay(st, j) && (scaleOn(x, 'hand') || scaleOn(x, 'finds')));
    if (waiting) return -Infinity;                        // do not shrink the hand yet
    const need = Math.max(0, incoming(st) - st.hero.block);
    return 20 + dmgOf(st, i) + Math.min(blkOf(st, i), need) * 1.2 - (c.cost || 0);
  },

  // BLOCK IS AMMUNITION. Cover up first, then the attack that counts the
  // block — the opposite order to the one a value-sorting bot plays.
  cart: (st, i, c) => {
    if (c.type === 'power') return 200;
    if (scaleOn(c, 'block')) {
      const more = st.hand.some((x, j) => j !== i && canPlay(st, j) && blkOf(st, j) > 0);
      return more ? -Infinity : 90 + dmgOf(st, i);
    }
    return 30 + blkOf(st, i) * 1.4 + dmgOf(st, i) * 0.5 - (c.cost || 0);
  },

  // FEED THE DOG. Fetch is paid out at the END of your turn, so everything
  // that adds to it is worth more the earlier it is played, and a turn that
  // ends with the dog unfed has thrown the character away.
  walker: (st, i, c) => {
    if (c.type === 'power') return 200;
    if (grants(c, 'fetch')) return 140 + (c.effects.find(f => f.key === 'fetch')?.n || 0) * 2 - (c.cost || 0) * 2;
    if (scaleOn(c, 'fetch')) return 90 + dmgOf(st, i);
    const need = Math.max(0, incoming(st) - st.hero.block);
    return 20 + dmgOf(st, i) * 0.8 + Math.min(blkOf(st, i), need);
  },

  // BEING HIT IS THE RESOURCE. Thorns answer a blow, and his best punches
  // count the blows he took — so block only what would actually kill, and
  // let the rest land.
  boxer: (st, i, c) => {
    if (c.type === 'power') return 200;
    if (grants(c, 'thorns')) return 150 - (c.cost || 0) * 2;
    if (scaleOn(c, 'struck')) {
      const more = st.hand.some((x, j) => j !== i && canPlay(st, j) && !scaleOn(x, 'struck'));
      return more ? -Infinity : 90 + dmgOf(st, i);
    }
    const lethal = incoming(st) - st.hero.block >= st.hero.hp;
    return 30 + dmgOf(st, i) + (lethal ? blkOf(st, i) * 3 : blkOf(st, i) * 0.15) - (c.cost || 0);
  },
};

// ── the seven ────────────────────────────────────────────────────────────
export const BOTS = {
  // THE CONTROL. The engine's own bot, imported rather than copied, so this
  // column reproduces every number already in VERSIONS.md by construction.
  greedy: {
    note: 'the engine\'s own bot: highest value it can afford, first reward, unchanged',
    step: botStep,
  },

  // Kill it before it kills you. Block is nearly worthless, elites are XP,
  // events are opportunities, a rest is for upgrading not sleeping.
  aggressive: {
    note: 'damage above all; takes elites, upgrades at rests, drafts attacks',
    card: s => playByScore(s, (st, i, c) => dmgOf(st, i) * 2 + (c.type === 'power' ? 5 : 0) + blkOf(st, i) * 0.1 + 1),
    map: s => walk(s, { elite: 5, fight: 3, event: 2, rest: 1 }),
    event: (s, ev) => chooseEvent(s, ev.options.reduce((best, o, i, all) => eventGain(o) > eventGain(all[best]) ? i : best, 0)),
    rest: s => chooseRest(s, hpFrac(s) < 0.3 ? 'heal' : 'upgrade'),
    pick: s => pickBy(s, (c, st) => st.pick.kind === 'upgrade' ? !c.up && c.type === 'attack' : c.type === 'curse' || c.rarity === 'basic'),
    draft: (s, r) => chooseReward(s, r.kind === 'card'
      ? r.options.reduce((b, id, i, all) => (CARDS[id].type === 'attack' && CARDS[all[b]].type !== 'attack') ? i : b, 0) : 0),
  },

  // Survive. Block to the incoming number and no further — block past what is
  // coming is wasted, which is the one thing a defensive bot must know.
  defensive: {
    note: 'blocks to the incoming number, then hits; avoids elites, sleeps at rests',
    card: s => playByScore(s, (st, i, c) => {
      const need = Math.max(0, incoming(st) - st.hero.block);
      const b = blkOf(st, i);
      return (need > 0 ? Math.min(b, need) * 2.2 : b * 0.2) + dmgOf(st, i) * 0.8 + (c.type === 'power' ? 5 : 0) + 1;
    }),
    map: s => walk(s, { rest: 4, event: 3, fight: 2, elite: -4 }),
    event: (s, ev) => chooseEvent(s, ev.options.reduce((best, o, i, all) => eventCost(o) < eventCost(all[best]) ? i : best, 0)),
    rest: s => chooseRest(s, hpFrac(s) < 0.85 ? 'heal' : 'upgrade'),
    pick: s => pickBy(s, (c, st) => st.pick.kind === 'upgrade' ? !c.up && (c.type === 'skill' || c.rarity === 'basic') : c.type === 'curse' || c.rarity === 'basic'),
    draft: (s, r) => chooseReward(s, r.kind === 'card'
      ? r.options.reduce((b, id, i, all) => (CARDS[id].type === 'skill' && CARDS[all[b]].type !== 'skill') ? i : b, 0) : 0),
  },

  // HOLD THE HAND. The one a human finds on Roope: play the cards that count
  // your hand FIRST, while it is still full, and never spend a card that is
  // only worth its own face. This is the bot the collector was built for and
  // the one the greedy bot can never be.
  hoarder: {
    note: 'plays hand-counting cards while the hand is full, then holds',
    card: s => playByScore(s, (st, i, c) => {
      if (scaleOn(c, 'hand')) return 100 + dmgOf(st, i) + blkOf(st, i);      // now, while it is worth most
      if (c.type === 'power') return 40;
      if (st.hand.some((x, j) => canPlay(st, j) && scaleOn(x, 'hand'))) return -Infinity;  // wait: do not shrink the hand
      const need = Math.max(0, incoming(st) - st.hero.block);
      return dmgOf(st, i) + Math.min(blkOf(st, i), need) * 1.5 - (c.cost || 0) * 2;
    }, { stop: st => st.hand.length <= 2 && !st.hand.some((x, j) => canPlay(st, j) && scaleOn(x, 'hand')) }),
    map: s => walk(s, { rest: 3, fight: 3, event: 3, elite: 1 }),
    event: (s, ev) => chooseEvent(s, ev.options.reduce((best, o, i, all) => (eventGain(o) - eventCost(o) / 8) > (eventGain(all[best]) - eventCost(all[best]) / 8) ? i : best, 0)),
    rest: s => chooseRest(s, hpFrac(s) < 0.7 ? 'heal' : 'upgrade'),
    pick: s => pickBy(s, (c, st) => st.pick.kind === 'upgrade' ? !c.up && c.effects.some(f => f.scale) : c.type === 'curse' || c.rarity === 'basic'),
    draft: (s, r) => chooseReward(s, r.kind === 'card'
      ? r.options.reduce((b, id, i, all) => (CARDS[id].effects.some(f => f.scale) && !CARDS[all[b]].effects.some(f => f.scale)) ? i : b, 0) : 0),
  },

  // ORDER IS THE PLAY. Powers first, then the cheap cards, and the card that
  // counts what you played before it goes LAST. That is Ilona's whole question
  // and the greedy bot answers it backwards every single turn.
  synergist: {
    note: 'powers, then cheap cards, then the scaler last; drafts to the mechanic',
    card: s => playByScore(s, (st, i, c) => {
      if (c.type === 'power') return 200;
      if (scaleOn(c, 'played')) {
        // hold it while anything else can still be played before it
        const more = st.hand.some((x, j) => j !== i && canPlay(st, j) && x.type !== 'power' && !scaleOn(x, 'played'));
        return more ? -Infinity : 80 + dmgOf(st, i) + blkOf(st, i);
      }
      return 20 - (c.cost || 0) * 3 + dmgOf(st, i) * 0.15 + blkOf(st, i) * 0.15;
    }),
    ...buildPolicy,
  },

  // THE CHARACTER'S OWN LINE. Same drafting and the same walk as `synergist`
  // — only the hand is played differently, so the gap between those two
  // columns is the mechanic and nothing else.
  native: {
    note: 'plays each character by its own mechanic; shares the synergist\'s drafting',
    card: s => playByScore(s, (st, i, c) => SCORE[st.character](st, i, c)),
    ...buildPolicy,
  },

  // THE FLOOR. Uniformly random among legal plays. If a character's greedy
  // number is not far above this one, the fight is not asking a question.
  random: {
    note: 'uniformly random legal play — the floor every other column is read against',
    card: s => {
      let guard = 40;
      while (s.phase === 'fight' && guard-- > 0) {
        const playable = s.hand.map((_, i) => i).filter(i => canPlay(s, i));
        if (!playable.length || s.rng.next() < 0.18) break;                  // sometimes just stop
        playCard(s, playable[s.rng.int(playable.length)], s.rng.int(Math.max(1, alive(s).length)));
      }
      if (s.phase === 'fight') endTurn(s);
    },
    map: s => chooseNode(s, s.rng.int((s.route.steps[s.route.step] ?? [0]).length)),
    event: (s, ev) => chooseEvent(s, s.rng.int(ev.options.length)),
    rest: s => chooseRest(s, s.rng.next() < 0.5 ? 'heal' : 'upgrade'),
    pick: s => pickBy(s, () => s.rng.next() < 0.3),
    draft: (s, r) => chooseReward(s, s.rng.int(r.options.length)),
  },
};

// ── running one ──────────────────────────────────────────────────────────
function step(s, bot) {
  if (bot.step) return bot.step(s);                     // the control drives itself
  switch (s.phase) {
    case 'fight': return bot.card(s);
    case 'reward': return bot.draft(s, s.reward);
    case 'map': return bot.map(s);
    case 'event': return bot.event(s, EVENTS.find(e => e.id === s.event.id));
    case 'rest': return bot.rest(s);
    case 'pick': return bot.pick(s);
    default: return undefined;
  }
}
// what KIND of thing an encounter is — the ledger below is about whether an
// ordinary fight costs anything at all
const BOSSES = new Set(ACTS.map(a => a.boss));
const ELITES = new Set(ACTS.flatMap(a => a.elites));
const kindOf = id => BOSSES.has(id) ? 'boss' : ELITES.has(id) ? 'elite' : 'fight';

export function run(seed, character, bot, ledger) {
  const s = startRun(createRun({ seed, character }));
  let n = 0, cur = null, lastHp = s.hero.hp;
  while (!['won', 'lost', 'menu'].includes(s.phase) && n++ < 900) {
    // opening a fight: remember what kind of thing it is
    if (s.phase === 'fight' && !cur) { const id = ENCOUNTERS[s.encounter]?.id ?? '?'; cur = { k: kindOf(id), lost: 0 }; }
    const before = `${s.phase}${s.route?.step}${s.turn}${s.hand.length}${s.hero.energy}`;
    step(s, bot);
    // a policy that refuses to act would spin; make it end the turn instead
    if (`${s.phase}${s.route?.step}${s.turn}${s.hand.length}${s.hero.energy}` === before && s.phase === 'fight') endTurn(s);
    // SUM THE DROPS, never the difference across the fight. The post-fight
    // heal lands in the same step that closes it, so an end-to-end subtraction
    // reports the fight's cost NET of the heal: the first cut of this read
    // 5.4 HP for an ordinary fight against a 6 HP heal, which says the run has
    // no attrition at all. It costs 9.3. A heal is not a fight being cheaper.
    if (cur && s.hero.hp < lastHp) cur.lost += lastHp - s.hero.hp;
    lastHp = s.hero.hp;
    if (cur && s.phase !== 'fight') { ledger?.(cur.k, cur.lost); cur = null; }
  }
  if (cur) ledger?.(cur.k, cur.lost);                  // died in it
  return s;
}

// ── the matrix ───────────────────────────────────────────────────────────
// Wrapped in a function and run only when this file IS the command, so the
// instrument can be imported and pointed at a question — a sweep over one
// tuning number, say — without printing a matrix nobody asked for.
export function report(SEEDS = Number(process.argv[2]) || 150) {
  const names = Object.keys(BOTS);
  const wins = {}, act2 = {}, deaths = {}, stuck = {}, hpBy = {}, seen = {};
  for (const b of names) { wins[b] = {}; act2[b] = {}; deaths[b] = {}; stuck[b] = 0; hpBy[b] = { fight: 0, elite: 0, boss: 0 }; seen[b] = { fight: 0, elite: 0, boss: 0 }; }
  for (const b of names) {
    for (const ch of chars) {
      let w = 0, a2 = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const s = run(seed, ch, BOTS[b], (k, lost) => { hpBy[b][k] += Math.max(0, lost); seen[b][k]++; });
        if (s.phase === 'won') w++;
        else if (s.phase === 'lost') { const id = ENCOUNTERS[s.encounter]?.id ?? '?'; deaths[b][id] = (deaths[b][id] || 0) + 1; }
        else stuck[b]++;
        if (s.act >= 1) a2++;
      }
      wins[b][ch] = w / SEEDS; act2[b][ch] = a2 / SEEDS;
    }
  }

  const pct = v => String(Math.round(v * 100)).padStart(3) + '%';
  console.log(`\n── WIN RATE, ${SEEDS} seeds per cell ──\n`);
  console.log(`  ${'bot'.padEnd(11)}${chars.map(c => c.slice(0, 9).padStart(10)).join('')}${'  mean'}`);
  for (const b of names) {
    const mean = chars.reduce((a, c) => a + wins[b][c], 0) / chars.length;
    console.log(`  ${b.padEnd(11)}${chars.map(c => pct(wins[b][c]).padStart(10)).join('')}  ${pct(mean)}`);
  }
  console.log(`\n── REACHED ACT TWO ──\n`);
  console.log(`  ${'bot'.padEnd(11)}${chars.map(c => c.slice(0, 9).padStart(10)).join('')}`);
  for (const b of names) console.log(`  ${b.padEnd(11)}${chars.map(c => pct(act2[b][c]).padStart(10)).join('')}`);

  console.log(`\n── the best line for each character ──\n`);
  const findings = [];
  for (const ch of chars) {
    const ranked = names.filter(b => b !== 'random').sort((a, b) => wins[b][ch] - wins[a][ch]);
    const top = ranked[0], g = wins.greedy[ch];
    const lift = Math.round((wins[top][ch] - g) * 100);
    console.log(`  ${ch.padEnd(10)} best: ${top.padEnd(11)} ${pct(wins[top][ch])}   greedy ${pct(g)}   ${lift > 0 ? `+${lift} points` : 'greedy is the best line'}`);
    if (lift >= 8 && top !== 'greedy') findings.push(`${ch} plays ${lift} points better as ${top} than as greedy`);
  }

  // ── what an ordinary fight actually costs ────────────────────────────────
  // The deaths list says WHERE a run ends. It cannot say whether everything
  // before that point was free, and a game whose only teeth are two bosses is
  // a different game from one that wears you down.
  console.log(`\n── HP LOST PER ENCOUNTER, by kind ──\n`);
  console.log(`  ${'bot'.padEnd(11)}${['fight', 'elite', 'boss'].map(k => k.padStart(10)).join('')}   share of all HP lost to ordinary fights`);
  for (const b of names) {
    const tot = hpBy[b].fight + hpBy[b].elite + hpBy[b].boss || 1;
    const per = k => (seen[b][k] ? (hpBy[b][k] / seen[b][k]).toFixed(1) : '—').padStart(10);
    console.log(`  ${b.padEnd(11)}${['fight', 'elite', 'boss'].map(per).join('')}   ${pct(hpBy[b].fight / tot)}`);
  }

  console.log(`\n── where each bot dies ──\n`);
  for (const b of names) {
    const tot = Object.values(deaths[b]).reduce((a, x) => a + x, 0) || 1;
    const top = Object.entries(deaths[b]).sort((a, x) => x[1] - a[1]).slice(0, 3)
      .map(([id, n]) => `${ENCOUNTERS.find(e => e.id === id)?.kallio.name ?? id} ${Math.round(n / tot * 100)}%`);
    console.log(`  ${b.padEnd(11)} ${top.join(' · ')}${stuck[b] ? `   (${stuck[b]} runs hit the step cap)` : ''}`);
  }

  // ── the readings ─────────────────────────────────────────────────────────
  console.log(`\n── reading ──\n`);
  const floor = chars.reduce((a, c) => a + wins.random[c], 0) / chars.length;
  const ceil = Math.max(...names.filter(b => b !== 'random').map(b => chars.reduce((a, c) => a + wins[b][c], 0) / chars.length));
  console.log(ceil > floor + 0.1
    ? `  THE FIGHT ASKS SOMETHING: the best line averages ${pct(ceil)} against random's ${pct(floor)}.`
    : `  FLAT: the best line (${pct(ceil)}) is barely above random (${pct(floor)}). The fights are not asking a question.`);
  for (const f of findings) console.log(`  FINDING: ${f} — the greedy column was measuring the bot, not the bum.`);
  if (!findings.length) console.log(`  No character gains 8+ points from a different line: greedy is a fair instrument for all six.`);
  const spread = chars.map(c => Math.max(...names.filter(b => b !== 'random').map(b => wins[b][c])));
  console.log(`  worst character at its best line: ${pct(Math.min(...spread))} — ${chars[spread.indexOf(Math.min(...spread))]}`);
  console.log(`\n  (a measuring tool; it never fails a build. A few points at ${SEEDS} seeds is noise.)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) report();
