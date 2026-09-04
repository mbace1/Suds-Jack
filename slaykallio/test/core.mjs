// Slay Kallio — the core-loop gate. Bare node, no browser:
//   node slaykallio/test/core.mjs
// Everything is driven off game state from a fixed seed, so a number that
// changes here changed in the rules, not in the clock.

import { CARDS, CHARACTERS, JOKERS, ENEMIES, ENCOUNTERS, THEMES, RULES } from '../js/data.js';
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
check('the fantasy skin actually renames the cards', differ > Object.keys(CARDS).length * 0.9);
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
check('the curse says it is unplayable', /Unplayable/.test(describe(CARDS.fine)));
check('scaling cards say what they scale on', /per card played/.test(describe(CARDS.downbeat)) && /per block/.test(describe(CARDS.line_8)));

// ── a first turn ─────────────────────────────────────────────────────────
let s = startRun(createRun({ seed: 7, character: 'barista' }));
check('the run opens on the first encounter', s.phase === 'fight' && s.encounter === 0);
check('three pigeons on the bench', s.enemies.length === 3 && s.enemies.every(e => e.id === 'pigeon'));
check('every enemy shows an intent', s.enemies.every(e => e.intent && describeIntent(e)));
check(`a hand of ${RULES.draw} and ${RULES.energy} energy`, s.hand.length === RULES.draw && s.hero.energy === RULES.energy);
check('deck + hand + draw account for every card', s.hand.length + s.draw.length === 10);

// determinism
const s2 = startRun(createRun({ seed: 7, character: 'barista' }));
check('the same seed deals the same hand', s.hand.map(c => c.id).join() === s2.hand.map(c => c.id).join());
const s3 = startRun(createRun({ seed: 8, character: 'barista' }));
check('a different seed differs somewhere', s.hand.map(c => c.id).join() !== s3.hand.map(c => c.id).join() || s.enemies[0].moveIndex !== s3.enemies[0].moveIndex);

// ── the damage pipeline ──────────────────────────────────────────────────
// Build a hand by hand so the arithmetic is exact.
function rig(character = 'barista', hand = [], seed = 3) {
  const st = startRun(createRun({ seed, character }));
  st.hand = hand.map((id, i) => ({ uid: 1000 + i, id, ...CARDS[id] }));
  st.hero.energy = 10;
  return st;
}
s = rig('barista', ['strike']);
const pig = s.enemies[0];
const hpBefore = pig.hp;
playCard(s, 0, 0);
check('a Strike deals 6', hpBefore - pig.hp === 6, `${hpBefore - pig.hp}`);
check('and costs its energy', s.hero.energy === 9);
check('and lands in the discard', s.discard.some(c => c.id === 'strike') && s.hand.length === 0);

s = rig('barista', ['heckle', 'strike']);
playCard(s, 0, 0);
check('Heckle applies Vulnerable', s.enemies[0].status.vulnerable === 1);
const p = preview(s, 0, 0);
check('the preview quotes the vulnerable number (9)', p.damage === 9, `${p.damage}`);
const before = s.enemies[0].hp;
playCard(s, 0, 0);
check('and the same number lands', before - s.enemies[0].hp === 9);

s = rig('barista', ['espresso', 'strike']);
playCard(s, 0);
check('Espresso pays for itself and then some', s.hero.energy === 11 && s.hero.status.buzz === 2);
check('Espresso exhausts', s.exhaust.some(c => c.id === 'espresso'));
check('Buzz raises the next Strike to 8', preview(s, 0, 0).damage === 8);
endTurn(s);
check('and fades at the end of the turn', !s.hero.status.buzz);

s = rig('barista', ['crema', 'strike', 'strike']);
playCard(s, 0);
check('Crema doubles the next attack', preview(s, 0, 0).damage === 12 && preview(s, 0, 0).breakdown.mults.some(m => m.src === 'doubleNext'));
check('a doubled Strike says 12 on its face', /Deal 12 damage/.test(describe(s.hand[0], s, 0, 0)));

// block
s = rig('driver', ['braking', 'line_8']);
playCard(s, 0);
check('Braking gives 8 block', s.hero.block === 8);
check('Linja 8 hits for the block held', preview(s, 0, 0).damage === 8);
s = rig('driver', ['defend']);
playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
const hp0 = s.hero.hp;
endTurn(s);
check('block absorbs three pecks of 4 with 5 block (7 through)', hp0 - s.hero.hp === 7, `${hp0 - s.hero.hp}`);
check('block is gone next turn', s.hero.block === 0);

// weak on the hero, vulnerable on the hero
s = rig('barista', ['strike']);
s.hero.status.weak = 1;
check('Weak takes a Strike to 4', preview(s, 0, 0).damage === 4);
s = rig('barista', []);
s.hero.status.vulnerable = 1;
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
const h1 = s.hero.hp;
endTurn(s);
check('Vulnerable hero takes 6 per peck', h1 - s.hero.hp === 18, `${h1 - s.hero.hp}`);

// ── jokers ───────────────────────────────────────────────────────────────
const withJoker = (st, id) => { st.jokers.push({ id, ...JOKERS[id] }); return st; };
s = withJoker(rig('barista', ['strike', 'strike', 'strike']), 'third_time');
playCard(s, 0, 0); playCard(s, 0, 0);
const t3 = preview(s, 0, 0);
check('Third Time doubles the 3rd attack', t3.damage === 12 && t3.breakdown.mults[0].src === 'third_time');

s = withJoker(rig('barista', ['strike', 'strike']), 'karaoke_night');
check('Karaoke Night ×1.5 on the first attack (9)', preview(s, 0, 0).damage === 9);
playCard(s, 0, 0);
check('and not on the second', preview(s, 0, 0).damage === 6);

s = withJoker(rig('bassist', ['pick', 'pick', 'downbeat']), 'kick_drum');
playCard(s, 0); playCard(s, 0);
// downbeat: 3 + 2 per played (2) = 7, + kick drum 1 per played (2) = 9
check('Kick Drum stacks with the bassist\'s own scaling (9)', preview(s, 0, 0).damage === 9, `${preview(s, 0, 0).damage}`);

s = withJoker(rig('barista', ['espresso', 'strike']), 'pigeon_pal');
check('Pigeon Pal only pays on 0-cost attacks', preview(s, 1, 0).damage === 6);
s = withJoker(rig('bassist', ['downbeat']), 'pigeon_pal');
check('Downbeat is a 0-cost attack: +3', preview(s, 0, 0).damage === 6);

s = withJoker(rig('barista', ['strike', 'strike']), 'queue');
check('Queue ignores a 1-cost', preview(s, 0, 0).damage === 6);
s = withJoker(rig('bassist', ['power_chord']), 'queue');
check('and pays +4 on a 2-cost (18)', preview(s, 0, 0).damage === 18);

s = withJoker(rig('barista', ['heckle', 'strike']), 'metal_detector');
playCard(s, 0, 0);
check('Metal Detector makes Vulnerable ×1.75 (10)', preview(s, 0, 0).damage === 10);

s = withJoker(rig('barista', ['defend']), 'summer_holiday');
playCard(s, 0);
check('Summer Holiday adds 2 block to a skill', s.hero.block === 7);

s = withJoker(startRun(createRun({ seed: 5, character: 'barista' })), 'double_espresso');
endTurn(s);
check('Double Espresso: 4 energy, 4 cards', s.hero.energy === 4 && s.hand.length === 4, `${s.hero.energy}/${s.hand.length}`);

s = withJoker(startRun(createRun({ seed: 5, character: 'barista' })), 'park_bench');
endTurn(s);
check('Park Bench: 3 block at the start of the turn', s.hero.block === 3);

s = withJoker(rig('barista', ['strike']), 'terrace');
playCard(s, 0, 0);
endTurn(s);
// terrace block is granted at end of turn, then lost at the start of the next — so read the log
check('Terrace pays when the hand is emptied', s.log.some(l => l.t === 'block' && l.src === 'terrace' && l.n === 5));

s = createRun({ seed: 5, character: 'tinker' });
withJoker(s, 'flea_find');
startRun(s);
check('Flea Find opens the fight with 2 Finds in hand', s.hand.filter(c => c.find).length === 2 && s.hand.length === 7);

// ── characters ───────────────────────────────────────────────────────────
s = rig('tinker', ['rummage', 'tinkering', 'basketful']);
playCard(s, 0);
const finds = s.hand.filter(c => c.find);
check('Rummage conjures 2 Finds', finds.length === 2);
const handN = s.hand.length;
check(`Korikaupalla gives 2 per card in hand (${handN * 2})`, preview(s, s.hand.findIndex(c => c.id === 'basketful')).block === handN * 2);
let fi = s.hand.findIndex(c => c.find && c.type === 'attack');
if (fi < 0) { s.hand.push({ uid: 5000, id: 'find_button', ...CARDS.find_button }); fi = s.hand.length - 1; }
playCard(s, fi, 0);
check('a played Find exhausts', s.exhaust.some(c => c.find));
check('Tuunaus counts Finds played (5 + 3)', preview(s, s.hand.findIndex(c => c.id === 'tinkering'), 0).damage === 8);

s = rig('bassist', ['pick', 'pick', 'pick', 'encore']);
playCard(s, 0); playCard(s, 0); playCard(s, 0);
check('Encore after three cards: 4 + 12 = 16', preview(s, 0, 0).damage === 16);

s = rig('bassist', ['groove', 'pick', 'pick', 'strike']);
playCard(s, 0);
const e0 = s.hero.energy;
playCard(s, 0); playCard(s, 0);
check('Groove refunds an energy on the 3rd card', s.hero.energy === e0 + 1);

s = rig('driver', ['terminus', 'braking']);
playCard(s, 0); playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'flutter', intent: 'block', block: 5 }; });
endTurn(s);
check('Päätepysäkki keeps the block across the turn', s.hero.block === 8);
check('a power leaves the deck for the fight', s.exhaust.some(c => c.id === 'terminus') && !s.discard.some(c => c.id === 'terminus'));

s = rig('barista', ['closing_time']);
playCard(s, 0);
s.enemies.forEach(e => { e.intent = { id: 'flutter', intent: 'block', block: 5 }; });
endTurn(s);
check('Sulkemisaika brings 2 Buzz every turn', s.hero.status.buzz === 2);

// ── enemies ──────────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 11, character: 'driver' }));
s.encounter = 3; // jump to the inspector next
s.enemies.forEach(e => { e.hp = 0; e.alive = false; });
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
s.enemies[0].alive = true; s.enemies[0].hp = 1;
playCard(s, 0, 0);
check('killing the last enemy opens a reward', s.phase === 'reward' && s.reward.kind === 'card' && s.reward.options.length === 3);
check('the reward pool is the character\'s own plus neutral', s.reward.options.every(id => !CARDS[id].char || CARDS[id].char === 'driver'));
check('and never a basic, token or curse', s.reward.options.every(id => !['basic', 'token', 'curse'].includes(CARDS[id].rarity)));
const deckN = s.hero.deck.length;
chooseReward(s, 0);
check('taking a card grows the deck', s.hero.deck.length === deckN + 1);
check('the run moves on to the inspector', s.phase === 'fight' && s.enemies[0].id === 'inspector');
check('the fight heals a little on the way', s.log.some(l => l.t === 'heal') || s.hero.hp === s.hero.maxHp);
const insp = s.enemies[0];
insp.intent = { ...ENEMIES.inspector.moves[0] };
s.hand = [];
endTurn(s);
check('the inspector\'s check adds a Fine to the discard', s.discard.some(c => c.id === 'fine'));
s.hand = [{ uid: 9, id: 'fine', ...CARDS.fine }];
check('a Fine cannot be played', canPlay(s, 0) === false);

s = startRun(createRun({ seed: 2, character: 'barista' }));
s.enemies[0].status.strength = 2;
s.enemies[0].intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 };
s.hand = []; s.enemies[1].alive = false; s.enemies[2].alive = false;
const hh = s.hero.hp;
endTurn(s);
check('enemy strength adds to its hit (6)', hh - s.hero.hp === 6);
check('the intent shown next turn is a real number', s.enemies[0].intent.intent !== 'attack' || s.enemies[0].intent.shown >= 4);

s = startRun(createRun({ seed: 2, character: 'barista' }));
s.hero.hp = 3; s.hand = [];
s.enemies.forEach(e => { e.intent = { id: 'peck', intent: 'attack', dmg: 4, shown: 4 }; });
endTurn(s);
check('running out of HP loses the run', s.phase === 'lost');

// ── the bouncer ──────────────────────────────────────────────────────────
s = startRun(createRun({ seed: 4, character: 'driver' }));
s.encounter = ENCOUNTERS.length - 2;
s.enemies.forEach(e => { e.alive = false; e.hp = 0; });
s.enemies[0].alive = true; s.enemies[0].hp = 1;
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
playCard(s, 0, 0);
while (s.phase === 'reward') chooseReward(s, 0);
check('the last fight is the bouncer', s.phase === 'fight' && s.enemies[0].id === 'bouncer' && s.enemies[0].hp === 120);
s.enemies[0].intent = { ...ENEMIES.bouncer.moves[2], shown: 8 };
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
s = botRun(startRun(createRun({ seed: 9, character: 'tinker' })));
check('the log is a list of typed events', s.log.every(l => typeof l.t === 'string'));
check('damage events carry a breakdown', s.log.filter(l => l.t === 'damage' && l.breakdown).length > 0);

// jokers cap
s = startRun(createRun({ seed: 1, character: 'barista' }));
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
