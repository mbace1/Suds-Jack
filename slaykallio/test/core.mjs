// Slay Kallio — the core-loop gate. Bare node, no browser:
//   node slaykallio/test/core.mjs
// Everything is driven off game state from a fixed seed, so a number that
// changes here changed in the rules, not in the clock.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, THEMES, RULES } from '../js/data.js';
import { readFileSync } from 'node:fs';
import { createRun, startRun, playCard, endTurn, canPlay, preview, describe, describeIntent, chooseReward, botRun, botTurn, computeDamage } from '../js/engine.js';

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

// ── data integrity ───────────────────────────────────────────────────────
const themes = Object.keys(THEMES);
for (const [table, name] of [[CARDS, 'card'], [CHARACTERS, 'character'], [JOKERS, 'joker'], [ENEMIES, 'enemy'], [ENCOUNTERS, 'encounter']]) {
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
check('the run ends on a boss', ENEMIES[ENCOUNTERS.at(-1).enemies[0]].boss === true);
check('an elite stands before it', ENCOUNTERS.slice(0, -1).some(e => e.enemies.some(id => ENEMIES[id].elite)));
check('every card describes itself', Object.values(CARDS).every(c => describe(c).length > 0));
check('the curse says it is unplayable', /Unplayable/.test(describe(CARDS.soaked)));
check('scaling cards say what they scale on', /per card played/.test(describe(CARDS.first_chord)) && /per block/.test(describe(CARDS.ram_it)));

// ── the owner's direction, pinned ────────────────────────────────────────
// Everything player-facing is in English (2026-09-04). Personal names are
// exempt — a name is not a language — so this looks at the words AROUND them.
const FINNISH = /[äöÄÖ]|\b(ja|on|ei|se|kun|tai|että|joka)\b/;
const englishGaps = [];
for (const [id, c] of Object.entries(CARDS)) for (const t of themes) if (FINNISH.test(c[t].name)) englishGaps.push(`card ${id} (${t})`);
for (const [id, ch] of Object.entries(CHARACTERS)) for (const t of themes) {
  if (FINNISH.test(ch[t].title) || FINNISH.test(ch[t].blurb)) englishGaps.push(`character ${id} (${t})`);
}
for (const [id, j] of Object.entries(JOKERS)) for (const t of themes) if (FINNISH.test(j[t].name) || FINNISH.test(j[t].text)) englishGaps.push(`friend ${id} (${t})`);
for (const [id, e] of Object.entries(ENEMIES)) for (const t of themes) if (FINNISH.test(e[t].name)) englishGaps.push(`enemy ${id} (${t})`);
for (const enc of ENCOUNTERS) for (const t of themes) if (FINNISH.test(enc[t].name)) englishGaps.push(`encounter ${enc.id} (${t})`);
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
const NEEDS = { person: ['skin', 'hair', 'top', 'bottom'], rat: ['body', 'head', 'wing', 'beak'], blob: ['body', 'head', 'beak'] };
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
check(`the bestiary is rats, blobs and cutouts of other bums (${[...shapes]})`,
  shapes.has('rat') && shapes.has('blob') && shapes.has('person'));
// Figures stand on tin OR cardboard, and both are actually used somewhere.
const bases = new Set([...Object.values(CHARACTERS).map(c => c.kallio.look.base),
  ...Object.values(ENEMIES).map(e => e.kallio.look.base).filter(Boolean)]);
check(`tin soldiers AND cardboard cutouts are both on the board (${[...bases]})`,
  bases.has('tin') && bases.has('card'));
check('every figure is worn — each carries a grime value',
  Object.values(CHARACTERS).every(c => themes.every(t => typeof c[t].look.grime === 'number')));

// ── a first turn ─────────────────────────────────────────────────────────
let s = startRun(createRun({ seed: 7, character: 'drinker' }));
check('the run opens on the first encounter', s.phase === 'fight' && s.encounter === 0);
check('three rats under the deck', s.enemies.length === 3 && s.enemies.every(e => e.id === 'rat'));
check('every enemy shows an intent', s.enemies.every(e => e.intent && describeIntent(e)));
check(`a hand of ${RULES.draw} and ${RULES.energy} energy`, s.hand.length === RULES.draw && s.hero.energy === RULES.energy);
check('deck + hand + draw account for every card', s.hand.length + s.draw.length === 10);

// determinism
const s2 = startRun(createRun({ seed: 7, character: 'drinker' }));
check('the same seed deals the same hand', s.hand.map(c => c.id).join() === s2.hand.map(c => c.id).join());
const s3 = startRun(createRun({ seed: 8, character: 'drinker' }));
check('a different seed differs somewhere', s.hand.map(c => c.id).join() !== s3.hand.map(c => c.id).join() || s.enemies[0].moveIndex !== s3.enemies[0].moveIndex);

// ── the damage pipeline ──────────────────────────────────────────────────
// Build a hand by hand so the arithmetic is exact.
function rig(character = 'drinker', hand = [], seed = 3) {
  const st = startRun(createRun({ seed, character }));
  st.hand = hand.map((id, i) => ({ uid: 1000 + i, id, ...CARDS[id] }));
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
const hp0 = s.hero.hp;
endTurn(s);
check('block absorbs three pecks of 4 with 5 block (7 through)', hp0 - s.hero.hp === 7, `${hp0 - s.hero.hp}`);
check('block is gone next turn', s.hero.block === 0);

// weak on the hero, vulnerable on the hero
s = rig('drinker', ['strike']);
s.hero.status.weak = 1;
check('Weak takes a Swing to 4', preview(s, 0, 0).damage === 4);
s = rig('drinker', []);
s.hero.status.vulnerable = 1;
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
const h1 = s.hero.hp;
endTurn(s);
check('Vulnerable hero takes 6 per peck', h1 - s.hero.hp === 18, `${h1 - s.hero.hp}`);

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

s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'morning_can');
endTurn(s);
check('Morning Can: 4 energy, 4 cards', s.hero.energy === 4 && s.hand.length === 4, `${s.hero.energy}/${s.hand.length}`);

s = withJoker(startRun(createRun({ seed: 5, character: 'drinker' })), 'the_plank');
endTurn(s);
check('Loose Plank: 3 block at the start of the turn', s.hero.block === 3);

s = withJoker(rig('drinker', ['strike']), 'empty_hands');
playCard(s, 0, 0);
endTurn(s);
// terrace block is granted at end of turn, then lost at the start of the next — so read the log
check('Empty Hands pays when the hand is emptied', s.log.some(l => l.t === 'block' && l.src === 'empty_hands' && l.n === 5));

s = createRun({ seed: 5, character: 'collector' });
withJoker(s, 'good_bin');
startRun(s);
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
s.encounter = 3; // jump to the inspector next
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
check('the run moves on to the King Rat', s.phase === 'fight' && s.enemies[0].id === 'boss_rat');
check('the fight heals a little on the way', s.log.some(l => l.t === 'heal') || s.hero.hp === s.hero.maxHp);
const insp = s.enemies[0];
insp.intent = { ...ENEMIES.boss_rat.moves[0] };
s.hand = [];
endTurn(s);
check('the King Rat drags a Soaked into the discard', s.discard.some(c => c.id === 'soaked'));
s.hand = [{ uid: 9, id: 'soaked', ...CARDS.soaked }];
check('a Soaked cannot be played', canPlay(s, 0) === false);

s = startRun(createRun({ seed: 2, character: 'drinker' }));
s.enemies[0].status.strength = 2;
s.enemies[0].intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 };
s.hand = []; s.enemies[1].alive = false; s.enemies[2].alive = false;
const hh = s.hero.hp;
endTurn(s);
check('enemy strength adds to its hit (6)', hh - s.hero.hp === 6);
check('the intent shown next turn is a real number', s.enemies[0].intent.intent !== 'attack' || s.enemies[0].intent.shown >= 4);

s = startRun(createRun({ seed: 2, character: 'drinker' }));
s.hero.hp = 3; s.hand = [];
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
endTurn(s);
check('running out of HP loses the run', s.phase === 'lost');

// ── the bouncer ──────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 4, character: 'cart' }));
s.encounter = ENCOUNTERS.length - 2;
s.enemies.forEach(e => { e.alive = false; e.hp = 0; });
s.enemies[0].alive = true; s.enemies[0].hp = 1;
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
playCard(s, 0, 0);
while (s.phase === 'reward') chooseReward(s, 0);
check('the last fight is the Bridge King', s.phase === 'fight' && s.enemies[0].id === 'bridge_king' && s.enemies[0].hp === 120);
s.enemies[0].intent = { ...ENEMIES.bridge_king.moves[2], shown: 8 };
s.hand = [];
const hb = s.hero.hp;
endTurn(s);
check('one-two lands twice', hb - s.hero.hp === 16);
s.enemies[0].hp = 1; s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
playCard(s, 0, 0);
check('beating him wins the run', s.phase === 'won');

// ── a whole run, four times ──────────────────────────────────────────────
const results = {};
for (const ch of Object.keys(CHARACTERS)) {
  let wins = 0, deepest = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const st = botRun(startRun(createRun({ seed, character: ch })));
    check(`${ch} seed ${seed} ends`, st.phase === 'won' || st.phase === 'lost');
    if (st.phase === 'won') wins++;
    deepest = Math.max(deepest, st.encounter);
  }
  results[ch] = { wins, deepest };
}
console.log('bot win rates over 40 seeds:', results);
check('every character can reach the boss with a dumb bot', Object.values(results).every(r => r.deepest >= ENCOUNTERS.length - 1));
check('and no character wins every time', Object.values(results).every(r => r.wins < 40));
check('and no character never wins', Object.values(results).every(r => r.wins > 0));

// the log never references a card the hand does not know
s = botRun(startRun(createRun({ seed: 9, character: 'collector' })));
check('the log is a list of typed events', s.log.every(l => typeof l.t === 'string'));
check('damage events carry a breakdown', s.log.filter(l => l.t === 'damage' && l.breakdown).length > 0);

// jokers cap
s = startRun(createRun({ seed: 1, character: 'drinker' }));
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
