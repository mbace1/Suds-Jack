// Slay Kallio — the core-loop gate. Bare node, no browser:
//   node slaykallio/test/core.mjs
// Everything is driven off game state from a fixed seed, so a number that
// changes here changed in the rules, not in the clock.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, ACTS, EVENTS, THEMES, RULES } from '../js/data.js';
import { readFileSync } from 'node:fs';
import { createRun, startRun, playCard, endTurn, canPlay, preview, describe, describeIntent, chooseReward, botRun, botTurn, botStep, computeDamage, chooseNode, chooseEvent, chooseRest, pickCard, upgrade, buildRoute, jumpTo, hourOf, nightfall, HOUR_WORD } from '../js/engine.js';

const ENC = id => ENCOUNTERS.findIndex(e => e.id === id);

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

// ── data integrity ───────────────────────────────────────────────────────
const themes = Object.keys(THEMES);
for (const [table, name] of [[CARDS, 'card'], [CHARACTERS, 'character'], [JOKERS, 'joker'], [ENEMIES, 'enemy'], [ENCOUNTERS, 'encounter'], [ACTS, 'act'], [EVENTS, 'event']]) {
  const entries = Array.isArray(table) ? table.map(e => [e.id, e]) : Object.entries(table);
  const bad = entries.filter(([, e]) => !themes.every(t => e[t]?.name));
  check(`every ${name} is named in both themes`, bad.length === 0, bad.map(b => b[0]).join(','));
}
const differ = Object.values(CARDS).filter(c => c.kallio.name !== c.fantasy.name).length;
check(`the fantasy skin renames nearly every card (${differ}/${Object.keys(CARDS).length})`, differ > Object.keys(CARDS).length * 0.85);
for (const [id, ch] of Object.entries(CHARACTERS)) {
  check(`${id}: starter deck is 10 known cards`, ch.deck.length === 10 && ch.deck.every(c => CARDS[c]));
  const own = Object.values(CARDS).filter(c => c.char === id).length;
  check(`${id}: has a pool of its own cards (${own})`, own >= 7);
  check(`${id}: both looks carry every colour`, themes.every(t => ['skin', 'hair', 'top', 'bottom'].every(k => ch[t].look[k])));
}
check('every encounter names real enemies', ENCOUNTERS.every(e => e.enemies.every(id => ENEMIES[id])));
check(`two acts, each ending on a boss (${ACTS.map(a => a.boss)})`, ACTS.length === 2 && ACTS.every(a => ENEMIES[ENCOUNTERS[ENC(a.boss)].enemies[0]].boss === true));
check('every act has elites, and they are elites', ACTS.every(a => a.elites.length >= 2 && a.elites.every(id => ENCOUNTERS[ENC(id)].enemies.some(x => ENEMIES[x].elite))));
check('every act draws on at least eight fights of its own', ACTS.every(a => a.fights.length >= 8 && a.fights.every(id => ENC(id) >= 0)));
check(`there are a dozen events (${EVENTS.length})`, EVENTS.length >= 12);
check('every event option has a label in both skins and only known effects',
  EVENTS.every(ev => ev.options.length >= 2 && ev.options.every(o => themes.every(t => o[t]?.label) && o.effects.every(f => ['heal', 'maxHp', 'hp', 'card', 'curse', 'joker', 'remove', 'upgrade', 'maxEnergy', 'roll', 'reward'].includes(f.type)))));
check('every event text tells you the price on the label (full information)',
  EVENTS.every(ev => ev.options.every(o => o.effects.length === 0 || /\(/.test(o.kallio.label))));
check('every card describes itself', Object.values(CARDS).every(c => describe(c).length > 0));
check('the curse says it is unplayable', /Unplayable/.test(describe(CARDS.soaked)));
check('scaling cards say what they scale on', /per card played/.test(describe(CARDS.first_chord)) && /per block/.test(describe(CARDS.ram_it)));

// ── the owner's direction, pinned ────────────────────────────────────────
// Everything player-facing is in English (2026-09-04). Personal names are
// exempt — a name is not a language — so this looks at the words AROUND them.
// (not `on` or `se`: both are English words, and the first cut of this regex
// flagged "+1 energy on the first turn" as Finnish)
const FINNISH = /[äöÄÖ]|\b(ja|ei|kun|tai|että|joka|mutta|sinä|minä)\b/;
const englishGaps = [];
for (const [id, c] of Object.entries(CARDS)) for (const t of themes) if (FINNISH.test(c[t].name)) englishGaps.push(`card ${id} (${t})`);
for (const [id, ch] of Object.entries(CHARACTERS)) for (const t of themes) {
  if (FINNISH.test(ch[t].title) || FINNISH.test(ch[t].blurb)) englishGaps.push(`character ${id} (${t})`);
}
for (const [id, j] of Object.entries(JOKERS)) for (const t of themes) if (FINNISH.test(j[t].name) || FINNISH.test(j[t].text)) englishGaps.push(`friend ${id} (${t})`);
for (const [id, e] of Object.entries(ENEMIES)) for (const t of themes) if (FINNISH.test(e[t].name)) englishGaps.push(`enemy ${id} (${t})`);
for (const enc of ENCOUNTERS) for (const t of themes) if (FINNISH.test(enc[t].name)) englishGaps.push(`encounter ${enc.id} (${t})`);
for (const a of ACTS) for (const t of themes) if (FINNISH.test(a[t].name)) englishGaps.push(`act ${a.id} (${t})`);
for (const ev of EVENTS) for (const t of themes) {
  if (FINNISH.test(ev[t].name) || FINNISH.test(ev[t].text)) englishGaps.push(`event ${ev.id} (${t})`);
  for (const o of ev.options) if (FINNISH.test(o[t].label)) englishGaps.push(`event ${ev.id} option (${t})`);
}
check(`every word the player reads is English${englishGaps.length ? ` — ${englishGaps.slice(0, 4)}` : ''}`, englishGaps.length === 0);

// Every card carries a picture, and it is one cardart.js can actually draw.
const cardartSrc = readFileSync(new URL('../js/cardart.js', import.meta.url), 'utf8');
const drawable = new Set([...cardartSrc.matchAll(/^  (\w+)\(c, r, a\) \{/gm)].map(m => m[1]));
const noPic = Object.entries(CARDS).filter(([, c]) => !c.pic);
const badPic = Object.entries(CARDS).filter(([, c]) => c.pic && !drawable.has(c.pic));
check(`every card names a picture${noPic.length ? ` — ${noPic.slice(0, 3).map(c => c[0])}` : ''}`, noPic.length === 0);
check(`and cardart.js can draw every one of them${badPic.length ? ` — ${badPic.map(c => c[1].pic)}` : ''}`, badPic.length === 0);
check(`the pictures are not all the same drawing (${new Set(Object.values(CARDS).map(c => c.pic)).size} of ${drawable.size})`,
  new Set(Object.values(CARDS).map(c => c.pic)).size >= 15);

// The roster is Kallio bums, the enemies are rats, blobs and rival bums.
check('every character is a bum on the bridge',
  Object.values(CHARACTERS).every(ch => /collector|busker|drinker|cart|bum/.test(ch.kallio.title) || ch.kallio.title.startsWith('the ')));
// Every look declares its shape, and carries the colours that shape's painter
// reads. A missing `shape` silently falls through to the person painter, which
// then reads a `bottom` colour a rat does not have — found by rendering the
// cast, invisible to a gate that only checked that names exist.
const NEEDS = { person: ['skin', 'hair', 'top', 'bottom'], rat: ['body', 'head', 'wing', 'beak'], blob: ['body', 'head', 'beak'], bird: ['body', 'head', 'wing', 'beak', 'neck'], bear: ['body', 'head', 'wing', 'beak', 'moss', 'eye'] };
const lookGaps = [];
for (const [id, e] of Object.entries(ENEMIES)) for (const t of themes) {
  const l = e[t].look;
  if (!l.shape) { lookGaps.push(`${id} (${t}) declares no shape`); continue; }
  if (!NEEDS[l.shape]) { lookGaps.push(`${id} (${t}) shape "${l.shape}" has no painter`); continue; }
  for (const k of NEEDS[l.shape]) if (!l[k]) lookGaps.push(`${id} (${t}) ${l.shape} is missing ${k}`);
}
for (const [id, c] of Object.entries(CHARACTERS)) for (const t of themes) {
  for (const k of NEEDS.person) if (!c[t].look[k]) lookGaps.push(`${id} (${t}) is missing ${k}`);
}
check(`every look carries what its painter reads${lookGaps.length ? ` — ${lookGaps.slice(0, 3)}` : ''}`, lookGaps.length === 0);

const shapes = new Set(Object.values(ENEMIES).map(e => e.kallio.look.shape ?? 'rat'));
check(`the bestiary is rats, blobs, birds, cutouts of other bums — and the bear (${[...shapes]})`,
  shapes.has('rat') && shapes.has('blob') && shapes.has('person') && shapes.has('bird') && shapes.has('bear'));
check('the pigeons and the gull fly the bird painter; the bear is the plate come alive',
  ENEMIES.pigeon.kallio.look.shape === 'bird' && ENEMIES.gull.kallio.look.big === true && ENEMIES.the_bear.kallio.look.shape === 'bear');
// Figures stand on tin OR cardboard, and both are actually used somewhere.
const bases = new Set([...Object.values(CHARACTERS).map(c => c.kallio.look.base),
  ...Object.values(ENEMIES).map(e => e.kallio.look.base).filter(Boolean)]);
check(`tin soldiers AND cardboard cutouts are both on the board (${[...bases]})`,
  bases.has('tin') && bases.has('card'));
check('every figure is worn — each carries a grime value',
  Object.values(CHARACTERS).every(c => themes.every(t => typeof c[t].look.grime === 'number')));

// ── a first turn ─────────────────────────────────────────────────────────
let s = startRun(createRun({ seed: 7, character: 'drinker' }));
check('the run opens on the map', s.phase === 'map' && s.act === 0 && s.route.step === 0);
check('the first step offers only fights, from act one', s.route.steps[0].every(o => o.kind === 'fight' && ACTS[0].fights.includes(o.id)));
check('choosing a span starts that fight', chooseNode(s, 0) && s.phase === 'fight' && ENCOUNTERS[s.encounter].id === s.route.done[0].id);
check('every enemy shows an intent', s.enemies.every(e => e.intent && describeIntent(e)));
check(`a hand of ${RULES.draw} and ${RULES.energy} energy`, s.hand.length === RULES.draw && s.hero.energy === RULES.energy);
check('deck + hand + draw account for every card', s.hand.length + s.draw.length === 10);

// determinism
const s2 = startRun(createRun({ seed: 7, character: 'drinker' })); chooseNode(s2, 0);
check('the same seed rolls the same route and deals the same hand', JSON.stringify(s.route.steps) === JSON.stringify(s2.route.steps) && s.hand.map(c => c.id).join() === s2.hand.map(c => c.id).join());
const s3 = startRun(createRun({ seed: 8, character: 'drinker' })); chooseNode(s3, 0);
check('a different seed differs somewhere', JSON.stringify(s.route.steps) !== JSON.stringify(s3.route.steps) || s.hand.map(c => c.id).join() !== s3.hand.map(c => c.id).join());

// ── the route's shape, over many seeds ───────────────────────────────────
const shape = { firstStep: true, restLast: true, eliteEarly: false, eliteByFour: true, dupes: false, width: true, eventsSeen: new Set() };
for (let seed = 1; seed <= 40; seed++) {
  const st = createRun({ seed, character: 'busker' });
  for (const a of [0, 1]) {
    const r = buildRoute(st, a);
    if (!r.steps[0].every(o => o.kind === 'fight')) shape.firstStep = false;
    if (!r.steps.at(-1).some(o => o.kind === 'rest')) shape.restLast = false;
    r.steps.forEach((step, i) => {
      if (step.some(o => o.kind === 'elite') && i < 2) shape.eliteEarly = true;
      const keys = step.map(o => `${o.kind}:${o.id ?? ''}`);
      if (new Set(keys).size !== keys.length) shape.dupes = true;
      if (step.length < 2 || step.length > 3) shape.width = false;
      for (const o of step) if (o.kind === 'event') shape.eventsSeen.add(o.id);
    });
    if (!r.steps.slice(0, 5).some(step => step.some(o => o.kind === 'elite'))) shape.eliteByFour = false;
  }
}
check('the first step is always fights only', shape.firstStep);
check('a rest is always offered on the span before the boss', shape.restLast);
check('an elite is never offered before the third step', !shape.eliteEarly);
check('and always offered by the fifth', shape.eliteByFour);
check('no step offers the same span twice', !shape.dupes);
check('every step offers two or three spans', shape.width);
check(`every event is reachable (${shape.eventsSeen.size}/${EVENTS.length})`, shape.eventsSeen.size === EVENTS.length);

// ── the damage pipeline ──────────────────────────────────────────────────
// Build a hand by hand so the arithmetic is exact.
function rig(character = 'drinker', hand = [], seed = 3) {
  const st = startRun(createRun({ seed, character }));
  chooseNode(st, 0);
  st.hand = hand.map((id, i) => ({ uid: 1000 + i, id, ...CARDS[id], effects: CARDS[id].effects.map(f => ({ ...f })) }));
  st.hero.energy = 10;
  return st;
}
s = rig('drinker', ['strike']);
const pig = s.enemies[0];
const hpBefore = pig.hp;
playCard(s, 0, 0);
check('a Swing deals 6', hpBefore - pig.hp === 6, `${hpBefore - pig.hp}`);
check('and costs its energy', s.hero.energy === 9);
check('and lands in the discard', s.discard.some(c => c.id === 'strike') && s.hand.length === 0);

s = rig('drinker', ['bad_mouth', 'strike']);
playCard(s, 0, 0);
check('Bad Mouth applies Vulnerable', s.enemies[0].status.vulnerable === 1);
const p = preview(s, 0, 0);
check('the preview quotes the vulnerable number (9)', p.damage === 9, `${p.damage}`);
const before = s.enemies[0].hp;
playCard(s, 0, 0);
check('and the same number lands', before - s.enemies[0].hp === 9);

s = rig('drinker', ['first_sip', 'strike']);
playCard(s, 0);
check('First Sip pays for itself and then some', s.hero.energy === 11 && s.hero.status.buzz === 2);
check('First Sip exhausts', s.exhaust.some(c => c.id === 'first_sip'));
check('Buzz raises the next Swing to 8', preview(s, 0, 0).damage === 8);
endTurn(s);
check('and fades at the end of the turn', !s.hero.status.buzz);

s = rig('drinker', ['see_double', 'strike', 'strike']);
playCard(s, 0);
check('Seeing Double doubles the next attack', preview(s, 0, 0).damage === 12 && preview(s, 0, 0).breakdown.mults.some(m => m.src === 'doubleNext'));
check('a doubled Swing says 12 on its face', /Deal 12 damage/.test(describe(s.hand[0], s, 0, 0)));

// block
s = rig('cart', ['dig_in', 'ram_it']);
playCard(s, 0);
check('Dig In gives 8 block', s.hero.block === 8);
check('Ram It hits for the block held', preview(s, 0, 0).damage === 8);
s = rig('cart', ['defend']);
playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
const hp0 = s.hero.hp, peckers = s.enemies.filter(e => e.alive).length;
endTurn(s);
check(`block absorbs ${peckers} pecks of 4 with 5 block (${peckers * 4 - 5} through)`, hp0 - s.hero.hp === peckers * 4 - 5, `${hp0 - s.hero.hp}`);
check('block is gone next turn', s.hero.block === 0);

// weak on the hero, vulnerable on the hero
s = rig('drinker', ['strike']);
s.hero.status.weak = 1;
check('Weak takes a Swing to 4', preview(s, 0, 0).damage === 4);
s = rig('drinker', []);
s.hero.status.vulnerable = 1;
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
const h1 = s.hero.hp, peckers2 = s.enemies.filter(e => e.alive).length;
endTurn(s);
check(`Vulnerable hero takes 6 per peck (${peckers2} pecks)`, h1 - s.hero.hp === peckers2 * 6, `${h1 - s.hero.hp}`);

// ── jokers ───────────────────────────────────────────────────────────────
const withJoker = (st, id) => { st.jokers.push({ id, ...JOKERS[id] }); return st; };
s = withJoker(rig('drinker', ['strike', 'strike', 'strike']), 'third_time');
playCard(s, 0, 0); playCard(s, 0, 0);
const t3 = preview(s, 0, 0);
check('Third Time doubles the 3rd attack', t3.damage === 12 && t3.breakdown.mults[0].src === 'third_time');

s = withJoker(rig('drinker', ['strike', 'strike']), 'first_light');
check('First Light ×1.5 on the first attack (9)', preview(s, 0, 0).damage === 9);
playCard(s, 0, 0);
check('and not on the second', preview(s, 0, 0).damage === 6);

s = withJoker(rig('busker', ['tune_up', 'tune_up', 'first_chord']), 'drum_kid');
playCard(s, 0); playCard(s, 0);
// downbeat: 3 + 2 per played (2) = 7, + kick drum 1 per played (2) = 9
check('Bucket Drummer stacks with the busker\'s own scaling (9)', preview(s, 0, 0).damage === 9, `${preview(s, 0, 0).damage}`);

s = withJoker(rig('drinker', ['first_sip', 'strike']), 'pigeon_pal');
check('Pigeon Pal only pays on 0-cost attacks', preview(s, 1, 0).damage === 6);
s = withJoker(rig('busker', ['first_chord']), 'pigeon_pal');
check('First Chord is a 0-cost attack: +3', preview(s, 0, 0).damage === 6);

s = withJoker(rig('drinker', ['strike', 'strike']), 'slow_swing');
check('Slow Swing ignores a 1-cost', preview(s, 0, 0).damage === 6);
s = withJoker(rig('busker', ['last_string']), 'slow_swing');
check('and pays +4 on a 2-cost (18)', preview(s, 0, 0).damage === 18);

s = withJoker(rig('drinker', ['bad_mouth', 'strike']), 'sharp_eye');
playCard(s, 0, 0);
check('Sharp Eye makes Vulnerable ×1.75 (10)', preview(s, 0, 0).damage === 10);

s = withJoker(rig('drinker', ['defend']), 'dry_socks');
playCard(s, 0);
check('Dry Socks adds 2 block to a skill', s.hero.block === 7);

s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'morning_can'); chooseNode(s, 0);
endTurn(s);
check('Morning Can: 4 energy, 4 cards', s.hero.energy === 4 && s.hand.length === 4, `${s.hero.energy}/${s.hand.length}`);

s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'the_plank'); chooseNode(s, 0);
endTurn(s);
check('Loose Plank: 3 block at the start of the turn', s.hero.block === 3);

s = withJoker(rig('drinker', ['strike']), 'empty_hands');
playCard(s, 0, 0);
endTurn(s);
// terrace block is granted at end of turn, then lost at the start of the next — so read the log
check('Empty Hands pays when the hand is emptied', s.log.some(l => l.t === 'block' && l.src === 'empty_hands' && l.n === 5));

s = createRun({ seed: 5, character: 'collector' });
withJoker(s, 'good_bin');
startRun(s); chooseNode(s, 0);
check('A Good Bin opens the fight with 2 Bottles in hand', s.hand.filter(c => c.find).length === 2 && s.hand.length === 7);

// ── characters ───────────────────────────────────────────────────────────
s = rig('collector', ['dig_the_bin', 'full_bag', 'armful']);
playCard(s, 0);
const finds = s.hand.filter(c => c.find);
check('Dig The Bin conjures 2 Bottles', finds.length === 2);
const handN = s.hand.length;
check(`Armful gives 3 per card in hand (${handN * 3})`, preview(s, s.hand.findIndex(c => c.id === 'armful')).block === handN * 3);
let fi = s.hand.findIndex(c => c.find && c.type === 'attack');
if (fi < 0) { s.hand.push({ uid: 5000, id: 'bottle_glass', ...CARDS.bottle_glass }); fi = s.hand.length - 1; }
playCard(s, fi, 0);
check('a played Bottle exhausts', s.exhaust.some(c => c.find));
check('Full Bag counts Bottles played (5 + 3)', preview(s, s.hand.findIndex(c => c.id === 'full_bag'), 0).damage === 8);

s = rig('busker', ['tune_up', 'tune_up', 'tune_up', 'encore']);
playCard(s, 0); playCard(s, 0); playCard(s, 0);
check('Encore after three cards: 4 + 12 = 16', preview(s, 0, 0).damage === 16);

s = rig('busker', ['the_groove', 'tune_up', 'tune_up', 'strike']);
playCard(s, 0);
const e0 = s.hero.energy;
playCard(s, 0); playCard(s, 0);
check('Groove refunds an energy on the 3rd card', s.hero.energy === e0 + 1);

s = rig('cart', ['parked', 'dig_in']);
playCard(s, 0); playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'flutter', intent: 'block', block: 5 }; });
endTurn(s);
check('Parked For Good keeps the block across the turn', s.hero.block === 8);
check('a power leaves the deck for the fight', s.exhaust.some(c => c.id === 'parked') && !s.discard.some(c => c.id === 'parked'));

s = rig('drinker', ['never_sober']);
playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'flutter', intent: 'block', block: 5 }; });
endTurn(s);
check('Never Sober brings 2 Buzz every turn', s.hero.status.buzz === 2);

// ── enemies ──────────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 11, character: 'cart' }));
jumpTo(s, ENC('rivals'));
s.enemies.forEach(e => { e.hp = 0; e.alive = false; });
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
s.enemies[0].alive = true; s.enemies[0].hp = 1;
playCard(s, 0, 0);
check('killing the last enemy opens a reward', s.phase === 'reward' && s.reward.kind === 'card' && s.reward.options.length === 3);
check('the reward pool is the character\'s own plus neutral', s.reward.options.every(id => !CARDS[id].char || CARDS[id].char === 'cart'));
check('and never a basic, token or curse', s.reward.options.every(id => !['basic', 'token', 'curse'].includes(CARDS[id].rarity)));
const deckN = s.hero.deck.length;
chooseReward(s, 0);
check('taking a card grows the deck', s.hero.deck.length === deckN + 1);
check('and the run goes back to the map', s.phase === 'map' && s.route.act === 0);
check('the fight heals a little on the way', s.log.some(l => l.t === 'heal') || s.hero.hp === s.hero.maxHp);
jumpTo(s, ENC('king_rat'));
check('jumping to the King Rat puts him on the deck', s.phase === 'fight' && s.enemies[0].id === 'boss_rat');
const insp = s.enemies[0];
insp.intent = { ...ENEMIES.boss_rat.moves[0] };
s.hand = [];
endTurn(s);
check('the King Rat drags a Soaked into the discard', s.discard.some(c => c.id === 'soaked'));
s.hand = [{ uid: 9, id: 'soaked', ...CARDS.soaked }];
check('a Soaked cannot be played', canPlay(s, 0) === false);

s = startRun(createRun({ seed: 2, character: 'drinker' })); chooseNode(s, 0);
s.enemies[0].status.strength = 2;
s.enemies[0].intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 };
s.hand = []; s.enemies.slice(1).forEach(e => { e.alive = false; });
const hh = s.hero.hp;
endTurn(s);
check('enemy strength adds to its hit (6)', hh - s.hero.hp === 6);
check('the intent shown next turn is a real number', s.enemies[0].intent.intent !== 'attack' || s.enemies[0].intent.shown >= 4);

s = startRun(createRun({ seed: 2, character: 'drinker' })); chooseNode(s, 0);
s.hero.hp = 3; s.hand = [];
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
endTurn(s);
check('running out of HP loses the run', s.phase === 'lost');

// ── the bouncer ──────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 4, character: 'cart' }));
jumpTo(s, ENC('bridge'));
check('act one ends on the Bridge King', s.phase === 'fight' && s.enemies[0].id === 'bridge_king' && s.enemies[0].hp === 104 && s.act === 0);
s.enemies[0].intent = { ...ENEMIES.bridge_king.moves[2], shown: 8 };
s.hand = [];
const hb = s.hero.hp;
endTurn(s);
check('one-two lands twice', hb - s.hero.hp === 16);
s.enemies[0].hp = 1; s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
playCard(s, 0, 0);
while (s.phase === 'reward') chooseReward(s, 0);
check('beating him opens ACT TWO, not the end', s.phase === 'map' && s.act === 1 && s.route.act === 1 && s.route.step === 0 && s.log.some(l => l.t === 'actWon'));
check(`and dusk falls: you catch your breath for ${Math.floor(78 * RULES.healBetweenActs)} HP between the acts`, s.log.some(l => l.t === 'heal' && l.n > 0) && s.hero.hp >= Math.min(78, hb - 16 + Math.floor(78 * RULES.healBetweenActs) - 1));
check('act two draws from its own pool', s.route.steps[0].every(o => ACTS[1].fights.includes(o.id)));
jumpTo(s, ENC('bear'));
check('the bear is the last thing on the bridge', s.phase === 'fight' && s.enemies[0].id === 'the_bear' && s.enemies[0].hp === 140);
s.enemies[0].intent = { ...ENEMIES.the_bear.moves[0] };
s.hand = []; endTurn(s);
check('granite: 20 block and 3 thorns', s.enemies[0].block === 20 && s.enemies[0].status.thorns === 3);
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3; s.enemies[0].block = 0;
const hpT = s.hero.hp;
playCard(s, 0, 0);
check('striking a thorned bear costs 3', hpT - s.hero.hp === 3);
s.enemies[0].hp = 1; s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3; s.enemies[0].block = 0;
playCard(s, 0, 0);
check('beating the bear wins the run', s.phase === 'won');

// ── the new mechanics, exactly ───────────────────────────────────────────
// frail
s = rig('cart', ['defend']);
s.hero.status.frail = 1;
check('Frail takes Cover Up to 3 (×0.75, floored)', preview(s, 0).block === 3);
playCard(s, 0);
check('and the same 3 lands', s.hero.block === 3);
s.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 3 }; });
endTurn(s);
check('Frail ticks off at the end of the round', !s.hero.status.frail);

// thorns on the hero
s = rig('boxer', ['guard_up']);
playCard(s, 0);
check('Guard Up: 5 block and 2 Thorns', s.hero.block === 5 && s.hero.status.thorns === 2);
s.enemies.slice(1).forEach(e => { e.alive = false; });
s.enemies[0].intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 };
const th0 = s.enemies[0].hp;
endTurn(s);
check('a 4-point peck into 2 Thorns costs the pecker 2', th0 - s.enemies[0].hp === 2);
check('and the hero counts the hit (struck = 1)', s.struck === 1);
// counter punch reads that count
s.hand = [{ uid: 2, id: 'counter_punch', ...CARDS.counter_punch, effects: CARDS.counter_punch.effects.map(f => ({ ...f })) }]; s.hero.energy = 3;
check('Counter Punch after one hit: 3 + 2 = 5', preview(s, 0, 0).damage === 5);
s.struck = 3;
check('and after three: 3 + 6 = 9', preview(s, 0, 0).damage === 9);
check('Counter Punch says what it counts', /per hit you took this fight/.test(describe(CARDS.counter_punch)));

// fetch — the dog goes in at the end of the turn
s = rig('walker', ['throw_stick']);
playCard(s, 0);
check('Throw The Stick: 8 Fetch', s.hero.status.fetch === 8);
s.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
const weakest = [...s.enemies].sort((a, b) => a.hp - b.hp)[0];
const wf = weakest.hp;
endTurn(s);
check('the dog hits the weakest enemy for 8 at the end of the turn', wf - weakest.hp === 8 && s.log.some(l => l.t === 'damage' && l.src === 'fetch' && l.amount === 8));
check('and the Fetch is spent', !s.hero.status.fetch);
s = rig('walker', ['two_dogs', 'throw_stick']);
playCard(s, 0); playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
endTurn(s);
check('Two Dogs keeps the Fetch across the turn', s.hero.status.fetch === 8);
s = rig('walker', ['throw_stick', 'off_the_lead']);
playCard(s, 0);
check('Off The Lead scales on Fetch: 4 + 8 = 12', preview(s, 0, 0).damage === 12);

// buzz scaling
s = rig('drinker', ['hair_of_dog', 'last_call']);
playCard(s, 0);
check('Hair Of The Dog: 3 Buzz and a card', s.hero.status.buzz === 3);
check('Last Call: 6 + 2×3 Buzz + 3 Buzz = 15', preview(s, 0, 0).damage === 15, `${preview(s, 0, 0).damage}`);

// self-cost cards
s = rig('drinker', ['head_butt']);
const hhb = s.hero.hp;
playCard(s, 0, 0);
check('Head Butt costs 2 HP and says so', hhb - s.hero.hp === 2 && /Lose 2 HP/.test(describe(CARDS.head_butt)));
s = rig('boxer', ['glass_chin']);
playCard(s, 0, 0);
check('Glass Chin leaves you Vulnerable', s.hero.status.vulnerable === 1);

// ── upgrades: one rule, every card ───────────────────────────────────────
const up = id => upgrade({ id, ...CARDS[id], effects: CARDS[id].effects.map(f => ({ ...f })) });
check('Swing+ is 9', up('strike').effects[0].n === 9 && up('strike').up === true);
check('Cover Up+ is 8', up('defend').effects[0].n === 8);
check('One-Two+ is 5 ×2 (a multi-hit gets +1 a hit)', up('one_two').effects[0].n === 5 && up('one_two').effects[0].times === 2);
check('Armful+ scales one harder (3 → 4 per card)', up('armful').effects[0].per === 4 && up('armful').effects[0].n === 0);
check('Tune Up+ draws 2', up('tune_up').effects[0].n === 2);
check('Never Sober+ costs 1 and brings 3 Buzz', up('never_sober').cost === 1 && up('never_sober').effects[0].n === 3);
check('Throw The Stick+ is 11 Fetch', up('throw_stick').effects[0].n === 11);
check('upgrading twice does nothing', upgrade(up('strike')).effects[0].n === 9);
s = rig('drinker', []);
s.hand = [up('strike')]; s.hero.energy = 3;
check('an upgraded card says 9 on its face and the preview agrees', /Deal 9 damage/.test(describe(s.hand[0], s, 0, 0)) && preview(s, 0, 0).damage === 9);
const upBefore = s.enemies[0].hp;
playCard(s, 0, 0);
check('and 9 lands', upBefore - s.enemies[0].hp === 9);

// ── rests ────────────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 5, character: 'cart' }));
s.route.steps[0] = [{ kind: 'rest' }, { kind: 'fight', id: 'rats' }];
s.hero.hp = 40;
chooseNode(s, 0);
check('a rest span opens the rest', s.phase === 'rest');
chooseRest(s, 'heal');
check(`sleeping heals 30% of max HP (${Math.floor(78 * RULES.restHeal)})`, s.hero.hp === 40 + Math.floor(78 * RULES.restHeal) && s.phase === 'map');
s = startRun(createRun({ seed: 5, character: 'cart' }));
s.route.steps[0] = [{ kind: 'rest' }];
chooseNode(s, 0); chooseRest(s, 'upgrade');
check('thinking it over asks for a card', s.phase === 'pick' && s.pick.kind === 'upgrade');
const si = s.hero.deck.findIndex(c => c.id === 'strike');
pickCard(s, si);
check('and the picked Swing is a Swing+', s.hero.deck[si].up === true && s.hero.deck[si].effects[0].n === 9 && s.phase === 'map');
check('an upgraded card cannot be picked again', (() => { s.route.steps[1] = [{ kind: 'rest' }]; chooseNode(s, 0); chooseRest(s, 'upgrade'); return pickCard(s, si) === false; })());
check('rests are counted', s.stats.rests === 2);

// ── events ───────────────────────────────────────────────────────────────
const atEvent = (id, seed = 5, character = 'drinker') => {
  const st = startRun(createRun({ seed, character }));
  st.route.steps[0] = [{ kind: 'event', id }];
  chooseNode(st, 0);
  return st;
};
s = atEvent('the_statue');
check('an event span opens the event', s.phase === 'event' && s.event.id === 'the_statue' && s.event.options.length === 3);
chooseEvent(s, 0);
check('touching the bear: +6 max HP, then −8 HP', s.hero.maxHp === 74 && s.hero.hp === 66 && s.phase === 'map');
s = atEvent('the_statue');
chooseEvent(s, 1);
check('leaving something behind asks for a card to remove', s.phase === 'pick' && s.pick.kind === 'remove');
const dn = s.hero.deck.length;
pickCard(s, 0);
check('and the deck is one lighter', s.hero.deck.length === dn - 1 && s.phase === 'map');
s = atEvent('the_statue'); chooseEvent(s, 2);
check('walking on costs nothing and goes back to the map', s.phase === 'map' && s.hero.hp === 68);
s = atEvent('night_tram'); chooseEvent(s, 0);
check('the last tram: heal 15 (capped) and a Hangover in the deck', s.hero.deck.some(c => c.id === 'hangover') && s.hero.hp === 68);
s = atEvent('night_tram'); chooseEvent(s, 1);
check('staying awake: 4 energy, 60 max HP', s.hero.maxEnergy === 4 && s.hero.maxHp === 60 && s.hero.hp === 60);
s = atEvent('kiosk'); chooseEvent(s, 0);
check('the kiosk takes 7 HP and opens a card reward', s.hero.hp === 61 && s.phase === 'reward' && s.reward.kind === 'card');
chooseReward(s, 0);
check('and the reward leads back to the map, not to a fight', s.phase === 'map');
s = atEvent('sauna'); chooseEvent(s, 0);
check('the sauna heals nothing at full health — but does not hurt either', s.hero.hp === 68 && s.phase === 'map');
s = atEvent('sauna'); s.hero.hp = 20; chooseEvent(s, 0);
check(`and 60% of max from 20 is ${20 + Math.floor(68 * 0.6)}`, s.hero.hp === 20 + Math.floor(68 * 0.6));
s = atEvent('dumpster'); chooseEvent(s, 1);
check('digging in the bin costs 7 and gains a friend', s.hero.hp === 61 && s.jokers.length === 1);
s = atEvent('the_canal'); chooseEvent(s, 0);
const roll1 = s.log.find(l => l.t === 'roll').good;
const s4 = atEvent('the_canal'); chooseEvent(s4, 0);
check('a roll is logged and the same seed rolls the same way', s4.log.find(l => l.t === 'roll').good === roll1);
check('and the outcome matches the label', roll1 ? s.jokers.length === 1 : (s.hero.hp === 56 && s.hero.deck.some(c => c.id === 'soaked')));
check('events are counted', s.stats.events === 1);
s = atEvent('the_statue'); s.hero.hp = 2; chooseEvent(s, 0);
check('an event can kill you, and the run knows it (2 + 6 − 8)', s.phase === 'lost');

// ── new friends ──────────────────────────────────────────────────────────
s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'lucky_lighter'); chooseNode(s, 0);
check('Lucky Lighter: 4 energy on turn one', s.hero.energy === 4);
endTurn(s);
check('and 3 on turn two', s.hero.energy === 3);
s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'tram_ticket'); chooseNode(s, 0);
check('Tram Ticket: 7 cards on turn one', s.hand.length === 7);
s = withJoker(rig('drinker', ['strike', 'strike']), 'cracked_mirror');
check('Cracked Mirror: the first attack of the fight ×2 (12)', preview(s, 0, 0).damage === 12);
playCard(s, 0, 0);
check('and not the second', preview(s, 0, 0).damage === 6);
s = withJoker(rig('drinker', ['strike']), 'spare_key');
playCard(s, 0, 0);
check('Spare Key: an attack gives 1 block', s.hero.block === 1);
s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'mouthguard'); chooseNode(s, 0);
check('Mouthguard: 2 Thorns from the first turn', s.hero.status.thorns === 2);
s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'bad_debt'); chooseNode(s, 0);
check('Bad Debt: 4 energy and 3 HP down at the start of the fight', s.hero.energy === 4 && s.hero.hp === 65);
s = withJoker(rig('drinker', []), 'stray_dog');
s.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
const sd = [...s.enemies].sort((a, b) => a.hp - b.hp)[0], sdHp = sd.hp;
endTurn(s);
check('Stray Dog bites the weakest for 3 at the end of the turn', sdHp - sd.hp === 3);
s = startRun(createRun({ seed: 5, character: 'drinker' }));
s.route.steps[0] = [{ kind: 'event', id: 'dumpster' }]; chooseNode(s, 0);
s.rng = { next: () => 0, int: () => 0, pick: a => a[0], shuffle: a => { const i = a.indexOf('heavy_coat'); if (i > 0) [a[0], a[i]] = [a[i], a[0]]; return a; } };
chooseEvent(s, 1);
check('Heavy Coat: +8 max HP the moment it is picked up', s.jokers[0]?.id === 'heavy_coat' && s.hero.maxHp === 76 && s.hero.hp === 61 + 8);

// ── new enemies ──────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(s, ENC('preacher'));
const pr = s.enemies.find(e => e.id === 'preacher');
pr.intent = { ...ENEMIES.preacher.moves[0] };
s.enemies.filter(e => e !== pr).forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
s.hand = []; endTurn(s);
check('the sermon gives every rat +1 Strength, and the preacher too', s.enemies.every(e => e.status.strength === 1));
check('and the telegraph said so', /\+1 strength all/.test(describeIntent({ intent: { ...ENEMIES.preacher.moves[0] } })));
s = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(s, ENC('gull_king'));
const gk = s.enemies[0]; gk.hp = 40; gk.intent = { ...ENEMIES.gull_king.moves[2] };
s.hand = []; endTurn(s);
check('the Gull King feasts: +12 HP', gk.hp === 52 && s.log.some(l => l.t === 'enemyHeal' && l.n === 12));
check('and says so', /heals 12/.test(describeIntent({ intent: { ...ENEMIES.gull_king.moves[2] } })));
s = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(s, ENC('night'));
const ns = s.enemies.find(e => e.id === 'night_shift'); ns.intent = { ...ENEMIES.night_shift.moves[1], shown: 6 };
s.enemies.filter(e => e !== ns).forEach(e => { e.alive = false; });
s.hand = []; const nh = s.hero.hp; endTurn(s);
check('lockdown: 6 damage AND 10 block in one move', nh - s.hero.hp === 6 && ns.block === 10);
check('the telegraph carries both halves', describeIntent({ intent: { ...ENEMIES.night_shift.moves[1], shown: 6 } }) === '6 · block 10');
s = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(s, ENC('dealer'));
const dl = s.enemies.find(e => e.id === 'dealer'); dl.intent = { ...ENEMIES.dealer.moves[2] };
s.enemies.filter(e => e !== dl).forEach(e => { e.alive = false; });
s.hand = []; endTurn(s);
check('a bad batch is a Hangover in the discard', s.discard.some(c => c.id === 'hangover'));
s = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(s, ENC('tar'));
const tb = s.enemies.find(e => e.id === 'tar_blob'); tb.intent = { ...ENEMIES.tar_blob.moves[0] };
s.enemies.filter(e => e !== tb).forEach(e => { e.alive = false; });
s.hand = []; endTurn(s);
check('tar hardens: 6 block and 2 thorns on the blob', tb.block === 6 && tb.status.thorns === 2);
s = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(s, ENC('gulls'));
const gl = s.enemies.find(e => e.id === 'gull'); gl.intent = { ...ENEMIES.gull.moves[0], shown: 5 };
s.enemies.filter(e => e !== gl).forEach(e => { e.alive = false; });
s.hand = []; endTurn(s);
check('a gull snatch leaves you Frail', s.hero.status.frail === 1);
// the finding: a debuff an enemy applies must still be there on your next turn
s.hand = [{ uid: 3, id: 'defend', ...CARDS.defend, effects: CARDS.defend.effects.map(f => ({ ...f })) }]; s.hero.energy = 3;
check('and it is still there when you play your next card (Cover Up gives 3)', preview(s, 0).block === 3);
gl.intent = { ...ENEMIES.gull.moves[1], shown: 9 };          // a dive, not another snatch
endTurn(s);
check('and gone after that turn ends', !s.hero.status.frail);
check('four pigeons stand in a row', ENCOUNTERS[ENC('pigeons')].enemies.length === 4);

// ── the hour: the run starts by day, and as evening comes things mutate ──
s = startRun(createRun({ seed: 5, character: 'boxer' }));
check('the run opens in daylight (hour 0, afternoon)', s.hour === 0 && HOUR_WORD(s.hour) === 'afternoon' && s.log.some(l => l.t === 'hour' && l.hour === 0));
chooseNode(s, 0);
check('and the first fight is not mutated', s.enemies.every(e => e.mutated === 0 && e.hp === ENEMIES[e.id].hp && !e.status.strength));
{
  const hs = [];
  const st = startRun(createRun({ seed: 5, character: 'boxer' }));
  while (!['won', 'lost'].includes(st.phase)) { if (!hs.length || st.hour !== hs.at(-1)) hs.push(st.hour); botStep(st); }
  check('the hour only ever moves forward', hs.every((h, i) => i === 0 || h >= hs[i - 1]));
  check('dusk falls at the end of act one', hourOf({ act: 0, route: { step: ACTS[0].steps + 1 } }) >= 0.5 && hourOf({ act: 0, route: { step: ACTS[0].steps - 1 } }) < 0.5);
  check('night falls inside act two', nightfall(hourOf({ act: 1, route: { step: 0 } })) === 1 && nightfall(hourOf({ act: 1, route: { step: ACTS[1].steps } })) === 2);
}
s = startRun(createRun({ seed: 5, character: 'boxer' })); jumpTo(s, ENC('gulls'));
check(`an act-two fight spawns mutated: gull ${Math.round(26 * RULES.mutation[1])} HP, marked ✶`, s.enemies.every(e => e.mutated === 1) && s.enemies.find(e => e.id === 'gull').hp === Math.round(26 * RULES.mutation[1]) && !s.enemies.some(e => e.status.strength));
check('and the encounter log says what hour it was', s.log.findLast(l => l.t === 'encounter').mutated === 1 && s.log.findLast(l => l.t === 'encounter').hour >= 0.5);
s = startRun(createRun({ seed: 5, character: 'boxer' })); s.act = 1; buildRoute(s, 1); s.route.step = ACTS[1].steps; jumpTo(s, ENC('sermon'));
check(`by night a fight spawns at level 2: ×${RULES.mutation[2]} HP and 1 Strength each`, nightfall(s.hour) === 2 && s.enemies.every(e => e.mutated === 2 && e.status.strength === 1 && e.hp === Math.round(ENEMIES[e.id].hp * RULES.mutation[2])));
check('and the telegraph carries the extra strength', s.enemies.filter(e => e.intent?.intent === 'attack').every(e => e.intent.shown === e.intent.dmg + 1));
s = startRun(createRun({ seed: 5, character: 'boxer' })); jumpTo(s, ENC('bear'));
check('the Bear is never mutated — a boss IS the night', s.hour === 1 && s.enemies[0].mutated === 0 && s.enemies[0].hp === 140 && HOUR_WORD(s.hour) === 'night');
s = startRun(createRun({ seed: 5, character: 'boxer' })); jumpTo(s, ENC('bridge'));
check('nor is the Bridge King, at dusk', s.enemies[0].mutated === 0 && s.enemies[0].hp === 104 && nightfall(s.hour) === 1);

// ── a whole run, six times ───────────────────────────────────────────────
const results = {};
for (const ch of Object.keys(CHARACTERS)) {
  let wins = 0, act2 = 0, sawEvent = 0, sawRest = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const st = botRun(startRun(createRun({ seed, character: ch })));
    check(`${ch} seed ${seed} ends`, st.phase === 'won' || st.phase === 'lost');
    if (st.phase === 'won') wins++;
    if (st.act >= 1) act2++;
    if (st.stats.events) sawEvent++;
    if (st.stats.rests) sawRest++;
  }
  results[ch] = { wins, act2, sawEvent, sawRest };
}
console.log('bot over 80 seeds:', results);
check('every character reaches act two with a dumb bot', Object.values(results).every(r => r.act2 > 0));
check('and no character wins every time', Object.values(results).every(r => r.wins < 80));
check('and no character never wins', Object.values(results).every(r => r.wins > 0));
check('the bot visits events and rests along the way', Object.values(results).every(r => r.sawEvent > 0 && r.sawRest > 0));

// the log never references a card the hand does not know
s = botRun(startRun(createRun({ seed: 9, character: 'collector' })));
check('the log is a list of typed events', s.log.every(l => typeof l.t === 'string'));
check('damage events carry a breakdown', s.log.filter(l => l.t === 'damage' && l.breakdown).length > 0);

// jokers cap
s = startRun(createRun({ seed: 1, character: 'drinker' })); chooseNode(s, 0);
for (const id of Object.keys(JOKERS).slice(0, RULES.jokerMax)) s.jokers.push({ id, ...JOKERS[id] });
s.enemies.forEach(e => { e.alive = false; e.hp = 0; });
s.enemies[0].alive = true; s.enemies[0].hp = 1;
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
playCard(s, 0, 0);
let sawJoker = false;
while (s.phase === 'reward') { if (s.reward.kind === 'joker') sawJoker = true; chooseReward(s, 0); }
check(`a full row of ${RULES.jokerMax} takes no more`, !sawJoker && s.jokers.length === RULES.jokerMax);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
