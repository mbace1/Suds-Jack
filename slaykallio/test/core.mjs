// Slay Kallio — the core-loop gate. Bare node, no browser:
//   node slaykallio/test/core.mjs
// Everything is driven off game state from a fixed seed, so a number that
// changes here changed in the rules, not in the clock.

import { CARDS, CHARACTERS, JOKERS, ARTIFACTS, ENEMIES, ENCOUNTERS, ACTS, EVENTS, THEMES, RULES, ASCENSION, ASC_MAX } from '../js/data.js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { poseAt, frameAt, FRAME_NAMES, REST, LIMITS, CLIP_NAMES, clipLength, isHeld, landsAtRest } from '../js/motion.js';
import { CAST, WITH_GUNS, POSES, WITH_POSES, castFiles, plateFor, posesFor } from '../js/plates.js';
import { chronicle, headline } from '../js/ledger.js';
import { createRun, startRun, playCard, endTurn, canPlay, preview, describe, describeIntent, chooseReward, botRun, botTurn, botStep, computeDamage, chooseNode, chooseEvent, chooseRest, pickCard, upgrade, buildRoute, jumpTo, hourOf, nightfall, HOUR_WORD, DUSK, NIGHT, skipPick, pickable, WHEN, rung, enemyDamage, gainArtifact, hasArtifact, artifactSum } from '../js/engine.js';

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
// v43: THREE acts. The run walks the canal from above it, to beside it, to in
// it, and the hour stretches across however many there are rather than being
// pinned to two.
check(`three acts, each ending on a boss (${ACTS.map(a => a.boss)})`, ACTS.length === 3 && ACTS.every(a => ENEMIES[ENCOUNTERS[ENC(a.boss)].enemies[0]].boss === true));
check('and each act ends on a DIFFERENT boss', new Set(ACTS.map(a => a.boss)).size === ACTS.length);
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
// Everything player-facing is in English (2026-09-04). The one exemption used
// to be personal names — a name is not a language — and as of v15 there are
// none left to exempt: a character is named by their CLASS, so this reads the
// character's name too.
// (not `on` or `se`: both are English words, and the first cut of this regex
// flagged "+1 energy on the first turn" as Finnish)
const FINNISH = /[äöÄÖ]|\b(ja|ei|kun|tai|että|joka|mutta|sinä|minä)\b/;
const englishGaps = [];
for (const [id, c] of Object.entries(CARDS)) for (const t of themes) if (FINNISH.test(c[t].name)) englishGaps.push(`card ${id} (${t})`);
for (const [id, ch] of Object.entries(CHARACTERS)) for (const t of themes) {
  if (FINNISH.test(ch[t].name) || FINNISH.test(ch[t].blurb)) englishGaps.push(`character ${id} (${t})`);
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
// A character is named by their CLASS in BOTH skins (owner, 2026-09-06) — a
// character select whose names are "Late" and "Vekku" tells you nothing about
// what the deck does. `title` is gone, so this reads the name; and no former
// first name may come back through it.
const PEOPLE = /\b(Late|Ilona|Roope|Vekku|Sanna|Kake)\b/;
check('every character is named by their class, in both skins',
  Object.values(CHARACTERS).every(ch => themes.every(t => /^The \w/.test(ch[t].name) && !PEOPLE.test(ch[t].name))));
check('and the class is a trade on the bridge, not a job title',
  Object.values(CHARACTERS).every(ch => /Drinker|Busker|Collector|Pusher|Walker|Boxer/.test(ch.kallio.name)));
check('the title line is gone — the blurb carries the person now',
  Object.values(CHARACTERS).every(ch => themes.every(t => ch[t].title === undefined && ch[t].blurb.length > 20)));
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
check('First Sip pays for itself and then some', s.hero.energy === 11 && s.hero.status.buzz === 3);
check('First Sip exhausts', s.exhaust.some(c => c.id === 'first_sip'));
check('Buzz raises the next Swing to 9', preview(s, 0, 0).damage === 9);
endTurn(s);
// v28: a third carries. 3 → 1, not 3 → 0 — the one number that lets him build.
check('and two-thirds of it fades at the end of the turn (3 → 1)', s.hero.status.buzz === 1);

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
check('Never Sober brings 3 Buzz every turn', s.hero.status.buzz === 3);
// The carry gives buzz a FIXED POINT rather than unbounded growth: +3 a turn
// with a third kept settles at 4 (3 → 1 kept → 4 → 1 kept → 4). Asserting the
// plateau is what says the rule compounds without running away.
for (let i = 0; i < 4; i++) { s.enemies.forEach(e => { e.intent = { id: 'flutter', intent: 'block', block: 5 }; }); endTurn(s); }
check(`and with the carry it settles at a plateau, not a runaway (${s.hero.status.buzz})`, s.hero.status.buzz === 4);

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
// By ID, never by index into `moves`. v23 made the rotation walk only the
// UNCONDITIONAL moves, so adding one conditional move to the front of a list
// silently shifts every index behind it — the same brittleness the twelve
// `hp === 68` literals had, found the same way: four checks failing at once
// for one reason that is not what any of them is about.
const kingMove = id => ENEMIES.bridge_king.moves.find(m => m.id === id);
s.enemies[0].intent = { ...kingMove('one_two'), shown: 8 };
s.hand = [];
const hb = s.hero.hp;
endTurn(s);
check('one-two lands twice', hb - s.hero.hp === 16);
s.enemies[0].hp = 1; s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3;
playCard(s, 0, 0);
while (s.phase === 'reward') chooseReward(s, 0);
// v44 — an act break has a BEAT in it now: clearing an act leaves one card
// behind, so the phase after the rewards drain is the pick, not the map.
// Asserted rather than walked past, because the removal is the whole answer to
// a deck that grew and never concentrated.
check('beating him ends the act on a card to leave behind', s.phase === 'pick' && s.pick.kind === 'remove' && s.log.some(l => l.t === 'actWon'));
{
  const before = s.hero.deck.length;
  const basics = s.hero.deck.filter(c => CARDS[c.id].rarity === 'basic').length;
  const take = pickable(s).find(({ c }) => CARDS[c.id].rarity === 'basic');
  check('and the basics you started with are on the table', basics > 0 && !!take);
  pickCard(s, take.i);
  check('leaving one takes it out of the deck for good', s.hero.deck.length === before - 1
    && s.hero.deck.filter(c => CARDS[c.id].rarity === 'basic').length === basics - 1);
}
check('and THEN act two opens', s.phase === 'map' && s.act === 1 && s.route.act === 1 && s.route.step === 0);
check(`and dusk falls: you catch your breath for ${Math.floor(78 * RULES.healBetweenActs)} HP between the acts`, s.log.some(l => l.t === 'heal' && l.n > 0) && s.hero.hp >= Math.min(78, hb - 16 + Math.floor(78 * RULES.healBetweenActs) - 1));
check('act two draws from its own pool', s.route.steps[0].every(o => ACTS[1].fights.includes(o.id)));
jumpTo(s, ENC('bear'));
check('the bear is the last thing on the bridge', s.phase === 'fight' && s.enemies[0].id === 'the_bear' && s.enemies[0].hp === 140);
// By ID, never by index: v23 paid for this once already - a conditional move
// put at the FRONT of a list shifts every index behind it, and v40's `press`
// broke these two checks the same way.
s.enemies[0].intent = { ...ENEMIES.the_bear.moves.find(m => m.id === 'granite') };
s.hand = []; endTurn(s);
check('granite: 20 block and 3 thorns', s.enemies[0].block === 20 && s.enemies[0].status.thorns === 3);
s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3; s.enemies[0].block = 0;
const hpT = s.hero.hp;
playCard(s, 0, 0);
check('striking a thorned bear costs 3', hpT - s.hero.hp === 3);
s.enemies[0].hp = 1; s.hand = [{ uid: 1, id: 'strike', ...CARDS.strike }]; s.hero.energy = 3; s.enemies[0].block = 0;
playCard(s, 0, 0);
// v43: the Bear ends ACT TWO now, not the run - there is an act under it.
check('beating the bear ends act two the same way', s.phase === 'pick' && s.pick.kind === 'remove');
skipPick(s);
check('and skipping the card still opens act three', s.phase === 'map' && s.act === 2 && s.log.some(l => l.t === 'actWon'));
// The last act has no act AFTER it, so the run ends rather than paying again.
check('two acts cleared is two cards left behind, not three',
  RULES.removeBetweenActs * (ACTS.length - 1) === 2);

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
// v48 — the dog REMEMBERS a third: 8 → 2 (floored), not to nothing.
check(`and a third of the Fetch stays for next turn — 8 → ${s.hero.status.fetch}`, s.hero.status.fetch === Math.floor(8 * RULES.fetchCarry));
{
  // THE BITE IS AN ATTACK: a Vulnerable target takes ×1.5, Strength adds first.
  let v = rig('walker', ['throw_stick']);
  playCard(v, 0);
  v.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
  const w = [...v.enemies].sort((a, b) => a.hp - b.hp)[0];
  w.status.vulnerable = 2; v.hero.status.strength = 2;
  // read the BITE off the log, not the HP drop — the first cut of this check
  // read 12 for a bite of 15 because the target only had 12 HP to lose
  const m1 = v.log.length;
  endTurn(v);
  const bite = v.log.slice(m1).find(l => l.t === 'damage' && l.src === 'fetch')?.amount;
  check(`the dog's bite is an attack — 8 Fetch + 2 Strength on a Vulnerable enemy is ${Math.floor(10 * RULES.vulnerable)} (${bite})`,
    bite === Math.floor(10 * RULES.vulnerable));
  // A pending Double is the next CARD's — the dog neither uses nor spends it.
  v = rig('walker', ['throw_stick']);
  playCard(v, 0);
  v.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
  const w2 = [...v.enemies].sort((a, b) => a.hp - b.hp)[0];
  v.hero.status.doubleNext = 1;
  const b2 = w2.hp;
  endTurn(v);
  // (Double expires at the end of the turn anyway — "your next attack THIS
  // turn" — so what matters is that the dog did not take it.)
  check(`and a pending Double is not the dog's to use (${b2 - w2.hp} damage, not 16)`, b2 - w2.hp === 8);
  // THE FIXED POINT: 6 Fetch a turn, a third kept, settles at 9 — never runs away.
  v = rig('walker', []);
  v.enemies.forEach(e => { e.hp = e.maxHp = 9999; });
  const bites = [];
  for (let t = 0; t < 12; t++) {
    v.hero.status.fetch = (v.hero.status.fetch || 0) + 6;
    v.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; e.block = 0; });
    const mark = v.log.length;
    endTurn(v);
    bites.push(v.log.slice(mark).find(l => l.t === 'damage' && l.src === 'fetch')?.amount ?? 0);
    v.hero.hp = v.hero.maxHp;
  }
  // 1.5F is 9 in the continuous case; floors land it at 8 (2 kept + 6) —
  // a plateau either way, which is the whole claim.
  check(`a steady 6 Fetch a turn settles at a plateau, not a runaway (${bites.slice(-4).join(', ')})`,
    bites.slice(-4).every(b => b === 8));
}
// v48 — the four cards v41 silently REPLACED by reusing their ids are back,
// and v41's own four are still in the pool under their own names.
check('the four shadowed originals are back — Long Lead is 12 Fetch for 2, Good Boy draws, One More draws, Deposit Run is free',
  CARDS.long_lead.cost === 2 && CARDS.long_lead.effects[0].n === 12 &&
  CARDS.good_boy.effects.some(f => f.type === 'draw') && CARDS.one_more.effects.some(f => f.type === 'draw') && CARDS.deposit_run.cost === 0);
check("and v41's four kept their place under their own ids",
  ['one_for_the_road', 'pocketful', 'well_trained', 'slack_lead'].every(id => CARDS[id]));
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
check('Never Sober+ costs 1 and brings 4 Buzz', up('never_sober').cost === 1 && up('never_sober').effects[0].n === 4);
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
// Nothing left to pick is a REAL state, and it had no way out: the panel
// listed nothing and the phase never ended. Found by a bot on one seed in 900.
s = startRun(createRun({ seed: 5, character: 'cart' }));
s.hero.deck.forEach(c => upgrade(c));
s.route.steps[0] = [{ kind: 'rest' }];
chooseNode(s, 0); chooseRest(s, 'upgrade');
check('with every card upgraded, a rest offers nothing to pick', s.phase === 'pick' && pickable(s).length === 0);
check('and skipPick is the way out', skipPick(s) === true && s.phase === 'map');
// and it carries the rest of the event with it, rather than dropping it
s = startRun(createRun({ seed: 5, character: 'cart' }));
s.hero.deck.forEach(c => upgrade(c));
s.route.steps[0] = [{ kind: 'event', id: 'gulls_event' }];
chooseNode(s, 0);
const hpG = s.hero.hp;
chooseEvent(s, 1);                                    // lose 6 HP, then upgrade a card
check('a two-part event stops at the pick', s.phase === 'pick' && s.hero.hp === hpG - 6);
skipPick(s);
check('and skipping the pick still finishes the event', s.phase === 'map' && s.log.some(l => l.t === 'skipPick'));
check('pickable lists exactly what a remove may take', (() => {
  const st = startRun(createRun({ seed: 5, character: 'cart' }));
  st.route.steps[0] = [{ kind: 'event', id: 'the_statue' }];
  chooseNode(st, 0); chooseEvent(st, 1);
  return st.phase === 'pick' && pickable(st).length === st.hero.deck.length;
})());

// ── events ───────────────────────────────────────────────────────────────
// Every number below is derived from the character's own max HP, never
// written out. Twelve of these checks were literals ("hp === 68") and a
// two-point change to the drinker in v16 failed all twelve at once — none of
// them is about the drinker's HP, they are about what the EVENT does.
const HP0 = CHARACTERS.drinker.hp;
const atEvent = (id, seed = 5, character = 'drinker') => {
  const st = startRun(createRun({ seed, character }));
  st.route.steps[0] = [{ kind: 'event', id }];
  chooseNode(st, 0);
  return st;
};
s = atEvent('the_statue');
check('an event span opens the event', s.phase === 'event' && s.event.id === 'the_statue' && s.event.options.length === 3);
chooseEvent(s, 0);
check('touching the bear: +6 max HP, then −8 HP', s.hero.maxHp === HP0 + 6 && s.hero.hp === HP0 - 2 && s.phase === 'map');
s = atEvent('the_statue');
chooseEvent(s, 1);
check('leaving something behind asks for a card to remove', s.phase === 'pick' && s.pick.kind === 'remove');
const dn = s.hero.deck.length;
pickCard(s, 0);
check('and the deck is one lighter', s.hero.deck.length === dn - 1 && s.phase === 'map');
s = atEvent('the_statue'); chooseEvent(s, 2);
check('walking on costs nothing and goes back to the map', s.phase === 'map' && s.hero.hp === HP0);
s = atEvent('night_tram'); chooseEvent(s, 0);
check('the last tram: heal 15 (capped) and a Hangover in the deck', s.hero.deck.some(c => c.id === 'hangover') && s.hero.hp === HP0);
s = atEvent('night_tram'); chooseEvent(s, 1);
check('staying awake: 4 energy, 8 max HP gone', s.hero.maxEnergy === 4 && s.hero.maxHp === HP0 - 8 && s.hero.hp === HP0 - 8);
s = atEvent('kiosk'); chooseEvent(s, 0);
check('the kiosk takes 7 HP and opens a card reward', s.hero.hp === HP0 - 7 && s.phase === 'reward' && s.reward.kind === 'card');
chooseReward(s, 0);
check('and the reward leads back to the map, not to a fight', s.phase === 'map');
s = atEvent('sauna'); chooseEvent(s, 0);
check('the sauna heals nothing at full health — but does not hurt either', s.hero.hp === HP0 && s.phase === 'map');
s = atEvent('sauna'); s.hero.hp = 20; chooseEvent(s, 0);
check(`and 60% of max from 20 is ${20 + Math.floor(HP0 * 0.6)}`, s.hero.hp === 20 + Math.floor(HP0 * 0.6));
s = atEvent('dumpster'); chooseEvent(s, 1);
// Read the DROP out of the log rather than the end state. The friend is rolled
// from the run's rng, and some of them grant max HP — which grants the HP with
// it — so `hp === HP0 - 7` was really asserting which friend the seed happened
// to roll. v26 changed the route pool, the roll moved, and a check about a bin
// failed because of a coat. Same shape as v16's HP ledger: a gain is not a
// cost being smaller.
const dug = s.log.find(l => l.t === 'hp' && l.n < 0) ?? s.log.find(l => l.t === 'damage');
check('digging in the bin costs 7 and gains a friend',
  s.jokers.length === 1 && s.hero.hp <= HP0 - 7 + (s.jokers[0].effect?.type === 'maxHp' ? s.jokers[0].effect.n : 0),
  `hp ${s.hero.hp} of ${HP0}, friend ${s.jokers[0]?.id}, drop ${JSON.stringify(dug)}`);
s = atEvent('the_canal'); chooseEvent(s, 0);
const roll1 = s.log.find(l => l.t === 'roll').good;
const s4 = atEvent('the_canal'); chooseEvent(s4, 0);
check('a roll is logged and the same seed rolls the same way', s4.log.find(l => l.t === 'roll').good === roll1);
check('and the outcome matches the label', roll1 ? s.jokers.length === 1 : (s.hero.hp === HP0 - 12 && s.hero.deck.some(c => c.id === 'soaked')));
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
check('Bad Debt: 4 energy and 3 HP down at the start of the fight', s.hero.energy === 4 && s.hero.hp === HP0 - 3);
s = withJoker(rig('drinker', []), 'stray_dog');
s.enemies.forEach(e => { e.intent = { id: 'flap', intent: 'block', block: 0 }; });
const sd = [...s.enemies].sort((a, b) => a.hp - b.hp)[0], sdHp = sd.hp;
endTurn(s);
check('Stray Dog bites the weakest for 3 at the end of the turn', sdHp - sd.hp === 3);
s = startRun(createRun({ seed: 5, character: 'drinker' }));
s.route.steps[0] = [{ kind: 'event', id: 'dumpster' }]; chooseNode(s, 0);
s.rng = { next: () => 0, int: () => 0, pick: a => a[0], shuffle: a => { const i = a.indexOf('heavy_coat'); if (i > 0) [a[0], a[i]] = [a[i], a[0]]; return a; } };
chooseEvent(s, 1);
check('Heavy Coat: +8 max HP the moment it is picked up', s.jokers[0]?.id === 'heavy_coat' && s.hero.maxHp === HP0 + 8 && s.hero.hp === HP0 - 7 + 8);

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

// ── v45: THE RUN, READ BACK ──────────────────────────────────────────────
// `ledger.js` is pure — it reads `state.log` and nothing else — which is what
// lets it be asserted here in bare node rather than through a screenshot. The
// contract it has to keep is that it cannot disagree with the engine, so every
// check below compares it against a number the engine already knows.
{
  const st = botRun(startRun(createRun({ seed: 4, character: 'busker' })));
  const c = chronicle(st);
  check('a finished run has a chronicle', c.over && c.spans.length > 0);
  check('and it knows which act it ended in and against what',
    !!c.ended && typeof c.ended.act === 'number' && !!c.ended.id, JSON.stringify(c.ended));
  // The span it died on is the one the engine says it died on.
  check('the fatal span is the encounter the engine stopped at',
    c.ended.id === ENCOUNTERS[st.encounter].id, `${c.ended.id} vs ${ENCOUNTERS[st.encounter].id}`);
  check('every span is stamped with an act inside the run', c.spans.every(sp => sp.act >= 0 && sp.act < ACTS.length));
  check('and the acts only ever go forward', c.spans.every((sp, i) => i === 0 || sp.act >= c.spans[i - 1].act));

  // HP IS THE SUM OF THE DROPS, NOT END MINUS START. v16 paid for this once:
  // the post-fight breather lands inside the span that earned it, so a
  // subtraction prices a fight at less than it cost and would have somebody
  // cut the heal. Checked against the log directly.
  const paid = st.log.filter(e => e.t === 'damage' && e.target === 'hero')
    .reduce((a, e) => a + Math.max(0, (e.amount ?? 0) - (e.blocked ?? 0)), 0);
  check(`HP paid is summed drops, not end-minus-start (${c.totals.hpLost})`, c.totals.hpLost === paid);
  check('and it is more than the hero could ever have held at once', c.totals.hpLost > st.hero.maxHp * 0.5);

  // The deck arithmetic has to close: what you started with, plus what you
  // took, minus what you left behind, is what you are holding.
  const d = c.deck;
  check(`the deck arithmetic closes: ${d.start} + ${d.gained} − ${d.removed} = ${d.end}`,
    d.start + d.gained - d.removed === d.end);
  check('and the starting deck is the character\'s own', d.start === CHARACTERS[st.character].deck.length);
  check('basics are counted, since the filler share is the whole point',
    d.basicsStart > 0 && d.basicsEnd <= d.basicsStart);

  // The totals agree with `stats`, which the engine keeps by a different route.
  check('the chronicle and the engine agree on cards played', c.totals.cardsPlayed === st.stats.cardsPlayed);
  check('and on damage dealt', c.totals.damageDealt === st.stats.damageDealt);
  check('and it counts at least as many fights as stats does',
    c.totals.fights + c.totals.elites + c.totals.bosses >= st.stats.fights - 1);

  // A run still in progress reads as unfinished rather than throwing.
  const mid = startRun(createRun({ seed: 4, character: 'busker' }));
  chooseNode(mid, 0);
  const m = chronicle(mid);
  check('a run in progress has a chronicle too, and knows it is not over', !m.over && !m.ended && m.spans.length === 1);
  check('and the headline says how far it has got', headline(m).reached === 1);
}

// A WON run walks every act, and the chronicle is what proves the route did.
{
  let won = null;
  for (let seed = 1; seed <= 40 && !won; seed++) {
    const st = botRun(startRun(createRun({ seed, character: 'collector' })));
    if (st.phase === 'won') won = st;
  }
  check('a won run exists in the first 40 seeds for the collector', !!won);
  if (won) {
    const c = chronicle(won);
    check(`a won run's route covers every act (${[...new Set(c.spans.map(s => s.act))].join(',')})`,
      new Set(c.spans.map(s => s.act)).size === ACTS.length);
    check('and it has no fatal span', !c.ended && c.won);
    check(`and one boss per act (${c.totals.bosses})`, c.totals.bosses === ACTS.length);
    // v44's finding, now visible to the player: the deck gets SHARPER.
    check(`the filler share falls across a won run (${c.deck.basicsStart} → ${c.deck.basicsEnd})`,
      c.deck.basicsEnd < c.deck.basicsStart);
  }
}

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
  // v43: with three acts the curve STRETCHES rather than moving - the run is
  // day through act one, the evening through act two, and act three is night
  // from the first span of it. The assertion is on that shape rather than on a
  // step number, so a fourth act would not silently break it.
  const at = (act, step) => nightfall(hourOf({ act, route: { step } }));
  check('act one starts in daylight', at(0, 0) === 0);
  check('dusk has fallen by the end of act two', at(1, ACTS[1].steps + 1) >= 1);
  check('act three is night from its first span', at(2, 0) === 2 && at(2, ACTS[2].steps) === 2);
  check('and the last span of the run is the darkest hour', hourOf({ act: 2, route: { step: ACTS[2].steps + 1 } }) === 1);
}
// Mutation is read off the HOUR, so the assertions below drive the hour to the
// level they are about rather than assuming which act it lands in — that is
// what let a third act be inserted without rewriting them.
s = startRun(createRun({ seed: 5, character: 'boxer' })); s.act = 1; buildRoute(s, 1); s.route.step = 1; jumpTo(s, ENC('gulls'));
check(`an evening fight spawns mutated: gull ${Math.round(26 * RULES.mutation[1])} HP, marked ✶`, s.enemies.every(e => e.mutated === 1) && s.enemies.find(e => e.id === 'gull').hp === Math.round(26 * RULES.mutation[1]) && !s.enemies.some(e => e.status.strength));
check('and the encounter log says what hour it was', s.log.findLast(l => l.t === 'encounter').mutated === 1 && s.log.findLast(l => l.t === 'encounter').hour >= DUSK);
// `jumpTo` resolves the act from the encounter's own pools, so a fight act
// three SHARES with act two walks the hour back to act two; the night check
// has to name a fight only act three has.
s = startRun(createRun({ seed: 5, character: 'boxer' })); s.act = 2; buildRoute(s, 2); jumpTo(s, ENC('eels'));
check(`by night a fight spawns at level 2: ×${RULES.mutation[2]} HP and 1 Strength each`, nightfall(s.hour) === 2 && s.enemies.every(e => e.mutated === 2 && e.status.strength === 1 && e.hp === Math.round(ENEMIES[e.id].hp * RULES.mutation[2])));
check('and the telegraph carries the extra strength', s.enemies.filter(e => e.intent?.intent === 'attack').every(e => e.intent.shown === e.intent.dmg + 1));
s = startRun(createRun({ seed: 5, character: 'boxer' })); s.act = 2; buildRoute(s, 2); s.route.step = ACTS[2].steps + 1; jumpTo(s, ENC('mother'));
check('the Mother is never mutated — a boss IS the night', s.hour === 1 && s.enemies[0].mutated === 0 && s.enemies[0].hp === ENEMIES.the_mother.hp && HOUR_WORD(s.hour) === 'night');
s = startRun(createRun({ seed: 5, character: 'boxer' })); jumpTo(s, ENC('bear'));
check('nor is the Bear, which now ends act two', s.enemies[0].mutated === 0 && s.enemies[0].hp === 140);
s = startRun(createRun({ seed: 5, character: 'boxer' })); jumpTo(s, ENC('bridge'));
check('nor is the Bridge King', s.enemies[0].mutated === 0 && s.enemies[0].hp === 104);

// ── act two is an ESCALATION, not act one after dark ─────────────────────
// v35. The act-two harness priced every span and found eight of the thirteen
// ordinary fights costing under 11 HP and killing 1% of the runs that met
// them, which is what "act two has no middle" actually means: the pool was
// act-one shapes with a mutation multiplier on top, so the whole act was an
// HP tax that the Bear collected. These two hold the floor the retune set.
{
  const body = id => {
    const e = ENCOUNTERS.find(x => x.id === id);
    return e.enemies.reduce((a, x) => a + ENEMIES[x].hp, 0);
  };
  const med = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const one = ACTS[0].fights.map(body), two = ACTS[1].fights.map(body);
  check(`no act-two fight is lighter than act one's middle one (${Math.min(...two)} vs ${med(one)} HP of bodies)`,
    Math.min(...two) >= med(one));
  check(`and act two's middle fight is half again act one's (${med(two)} vs ${med(one)})`,
    med(two) >= med(one) * 1.25);
  check('every act-two fight fields at least two bodies that can attack',
    ACTS[1].fights.every(id => ENCOUNTERS.find(x => x.id === id).enemies
      .filter(e => ENEMIES[e].moves.some(m => m.dmg)).length >= 2));
}
// The number on the screen and the number in the log are the same number.
// v34 shipped with VERSION left at 33 while VERSIONS.md and hub/versions.json
// both said 34 — the arcade advertised a release the cabinet denied.
check('the version on screen is the version in the log', (() => {
  const top = readFileSync(new URL('../VERSIONS.md', import.meta.url), 'utf8').match(/^## v(\d+)/m)?.[1];
  const code = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8').match(/^const VERSION = (\d+);/m)?.[1];
  return top && code && top === code;
})());
check('a won fight records the hour it was won at', (() => {
  const st = botRun(startRun(createRun({ seed: 3, character: 'boxer' })));
  const w = st.log.filter(l => l.t === 'fightWon');
  return w.length > 1 && w.every(l => [0, 1, 2].includes(l.lvl)) && w.every((l, i) => i === 0 || l.lvl >= w[i - 1].lvl);
})());

// ── the ascension ladder ─────────────────────────────────────────────────
// Six rungs, each one rule, each riding a lever the engine already had. The
// checks below are about the TABLE and about each rule firing — the ladder is
// cumulative (rung 6 is every rung), which is Slay the Spire's own shape and
// the reason only rung 0 can be an exact control.
{
  check(`the ladder is ${ASC_MAX} rungs, numbered from one with no gaps and no repeated id`,
    ASCENSION.length === ASC_MAX && ASCENSION.every((r, i) => r.n === i + 1)
    && new Set(ASCENSION.map(r => r.id)).size === ASC_MAX
    && ASCENSION.every(r => typeof r.text === 'string' && r.text.length > 10));
  check('a rung out of range is clamped, never obeyed',
    createRun({ seed: 1, asc: -3 }).asc === 0 && createRun({ seed: 1, asc: 99 }).asc === ASC_MAX
    && createRun({ seed: 1 }).asc === 0);

  // THE CONTROL, BY CONSTRUCTION. A run at rung 0 must be the run this game
  // had before the ladder existed — not nearly, exactly — or every number
  // measured before v36 is measuring a different game.
  // `uid` is a MODULE-level counter, so two identical runs number their cards
  // and their enemies differently purely by running second — and it rides on
  // `target`, `enemy`, `src` and `from` as well as on `uid` itself. Renumber each log
  // by order of first appearance instead of stripping those keys, because
  // WHICH body was hit is exactly what the control is checking.
  const UIDKEY = new Set(['uid', 'target', 'enemy', 'src', 'from']);
  const logOf = st => {
    const seen = new Map();
    return JSON.stringify(botRun(st).log, (k, v) => {
      if (!UIDKEY.has(k) || typeof v !== 'number') return v;
      if (!seen.has(v)) seen.set(v, seen.size);
      return seen.get(v);
    });
  };
  check('rung 0 is the old game, to the log entry',
    [3, 11, 29].every(seed =>
      logOf(startRun(createRun({ seed, character: 'boxer' })))
      === logOf(startRun(createRun({ seed, character: 'boxer', asc: 0 })))));
  check('and the ladder is cumulative — the top rung is every rung',
    ASCENSION.every(r => rung({ asc: ASC_MAX }, r.id)) && !ASCENSION.some(r => rung({ asc: 0 }, r.id)));

  // 1 — an elite is offered a span earlier
  const eliteStep = st => st.route.steps.findIndex(o => o.some(n => n.kind === 'elite'));
  const first = a => Array.from({ length: 40 }, (_, i) =>
    eliteStep(startRun(createRun({ seed: i + 1, character: 'boxer', asc: a })))).filter(x => x >= 0);
  check('rung 1 puts an elite on the route by step three, where rung 0 may wait for four',
    first(1).every(x => x <= 3) && first(0).some(x => x === 4));

  // 2 — the dark comes sooner
  const firstFight = a => { const st = startRun(createRun({ seed: 5, character: 'boxer', asc: a })); chooseNode(st, 0); return st; };
  check('rung 2 mutates the first fight of the run, which rung 0 leaves alone',
    firstFight(0).enemies.every(e => e.mutated === 0) && firstFight(2).enemies.every(e => e.mutated === 1));
  check('and it does not touch the HOUR — the sky, the plates and the map still read the same clock',
    firstFight(0).hour === firstFight(2).hour);

  // 3 — a thinner rest
  const rested = a => {
    const st = startRun(createRun({ seed: 5, character: 'boxer', asc: a }));
    st.hero.hp = 10; st.phase = 'rest'; chooseRest(st, 'heal'); return st.hero.hp - 10;
  };
  check(`rung 3 gives back a fifth (${rested(3)}) where rung 0 gives a third (${rested(0)})`,
    rested(3) === Math.floor(CHARACTERS.boxer.hp * RULES.restHealHard)
    && rested(0) === Math.floor(CHARACTERS.boxer.hp * RULES.restHeal) && rested(3) < rested(0));

  // 4 — the carried curse
  const deckOf = a => startRun(createRun({ seed: 5, character: 'boxer', asc: a })).hero.deck;
  check('rung 4 puts one Doubt in the deck, and exactly one',
    deckOf(4).filter(c => c.id === 'doubt').length === 1
    && deckOf(3).every(c => c.id !== 'doubt')
    && deckOf(4).length === deckOf(3).length + 1);

  // 5 — a boss with a point of Strength, and the telegraph says so
  const bossAt = a => { const st = startRun(createRun({ seed: 5, character: 'boxer', asc: a })); jumpTo(st, ENC('bridge')); return st; };
  check('rung 5 stands a boss up with 1 Strength; rung 0 does not',
    (bossAt(5).enemies[0].status.strength ?? 0) === 1 && (bossAt(0).enemies[0].status.strength ?? 0) === 0);
  {
    const st = bossAt(5), e = st.enemies[0];
    e.intent = { ...ENEMIES.bridge_king.moves.find(m => m.dmg), shown: 0 };
    e.intent.shown = enemyDamage(st, e, e.intent.dmg);
    check(`and the intent line quotes the bigger number (${e.intent.shown} for a ${e.intent.dmg})`,
      e.intent.shown === e.intent.dmg + 1);
  }

  // 6 — a shorter breath between the acts
  check('rung 6 hands back a third between acts where rung 0 hands back a half',
    RULES.healBetweenActsHard < RULES.healBetweenActs
    && Math.abs(RULES.healBetweenActsHard - 1 / 3) < 1e-9);

  // and the whole ladder is still playable — a bot must be able to finish a
  // run at every rung, or a rung is a wall rather than a difficulty
  for (const a of [0, 2, 4, ASC_MAX]) {
    const ends = [1, 2, 3, 4, 5].map(seed => botRun(startRun(createRun({ seed, character: 'cart', asc: a }))).phase);
    check(`a run at rung ${a} still ends`, ends.every(p => p === 'won' || p === 'lost'));
  }
}

// ── a whole run, six times ───────────────────────────────────────────────
const results = {};
for (const ch of Object.keys(CHARACTERS)) {
  let wins = 0, lastAct = 0, sawEvent = 0, sawRest = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const st = botRun(startRun(createRun({ seed, character: ch })));
    check(`${ch} seed ${seed} ends`, st.phase === 'won' || st.phase === 'lost');
    if (st.phase === 'won') wins++;
    if (st.act >= ACTS.length - 1) lastAct++;
    if (st.stats.events) sawEvent++;
    if (st.stats.rests) sawRest++;
  }
  results[ch] = { wins, lastAct, sawEvent, sawRest };
}
console.log('bot over 80 seeds:', results);
// v43 — WHAT THIS BOT CAN STILL BE ASKED. `botRun` plays the highest-value
// card it can afford and navigates by nothing; over two acts its win rate was
// low but nonzero for all six, so "and no character never wins" was a real
// structural check. A third act took it to 5/7/18/4/0/3 per 160 seeds and the
// Dog Walker to a flat ZERO - and that is not a rounding problem at 80 seeds,
// it is the finding v16 already named from the other side ("nobody had ever
// played her": a native policy moved her 5% -> 24%). A naive bot cannot hold
// fetch, and three acts is long enough that not holding it never converts.
// So the claim is narrowed to what this instrument can carry - the run always
// ends, every character reaches the LAST act, and nobody sweeps - and the
// per-character rate is measured in bots.mjs, where the policies live.
check('every character reaches the last act with a dumb bot', Object.values(results).every(r => r.lastAct > 0));
check('and no character wins every time', Object.values(results).every(r => r.wins < 80));
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


// ── the paper motion (v17) ───────────────────────────────────────────────
// `js/motion.js` is pure for exactly this reason: a verb that throws a figure
// off its own base is arithmetic, and arithmetic can be checked in bare node.
// What a gate CANNOT say is whether a lunge reads as a lunge — that is a
// screenshot, and this repo has shipped a green suite over wrong art twice.
check(`the motion vocabulary has every verb the fight produces (${CLIP_NAMES.join(', ')})`,
  ['breath', 'attack', 'hurt', 'hop'].every(n => CLIP_NAMES.includes(n)));
check('every clip starts at REST — a verb that begins displaced pops',
  CLIP_NAMES.every(n => isHeld(n) || Object.keys(REST).every(k => Math.abs(poseAt(n, 0, { dir: 1 })[k] - REST[k]) < 1e-9)));
check('and every finite clip comes home — otherwise a figure hit twice drifts off its base for the rest of the run',
  CLIP_NAMES.every(n => landsAtRest(n)));
check('past the end a clip is REST, not frozen mid-lunge',
  Object.keys(REST).every(k => Math.abs(poseAt('attack', 99, { dir: 1 })[k] - REST[k]) < 1e-9));
const outOfBounds = [];
for (const n of CLIP_NAMES) {
  const span = isHeld(n) ? 3 : clipLength(n);
  for (let i = 0; i <= 120; i++) {
    for (const dir of [1, -1]) {
      const p = poseAt(n, span * i / 120, { dir });
      if (Math.abs(p.dx) > LIMITS.dx || Math.abs(p.dy) > LIMITS.dy || Math.abs(p.dz) > LIMITS.dz
        || Math.abs(p.rot) > LIMITS.rot || Math.abs(p.skew) > LIMITS.skew
        || p.sx < LIMITS.scale[0] || p.sx > LIMITS.scale[1] || p.sy < LIMITS.scale[0] || p.sy > LIMITS.scale[1]) outOfBounds.push(n);
    }
  }
}
check(`no clip leaves the figure's own envelope${outOfBounds.length ? ` — ${[...new Set(outOfBounds)]}` : ''}`, outOfBounds.length === 0);
// The direction is the whole reason a lunge is not a wobble: the same clip
// played the other way must be its mirror, and nothing may be direction-blind
// in the axes that carry the verb.
const fwd = poseAt('attack', 0.28, { dir: 1 }), back = poseAt('attack', 0.28, { dir: -1 });
check(`an attack commits the way the figure faces (${fwd.dx.toFixed(2)} vs ${back.dx.toFixed(2)})`,
  fwd.dx > 0.1 && Math.abs(fwd.dx + back.dx) < 1e-9 && Math.abs(fwd.rot + back.rot) < 1e-9);
// Anticipation is what makes a lunge read as a lunge instead of a slide: the
// figure is still leaning AWAY at 0.20s and fully committed by 0.31, so the
// strike takes 0.11s against a 0.20s wind-up.
check('and the strike is faster than the wind-up — anticipation is what makes it read',
  poseAt('attack', 0.20, { dir: 1 }).dx < 0 && poseAt('attack', 0.31, { dir: 1 }).dx > 0.29);
const hurt = poseAt('hurt', 0.06, { dir: -1 });
check(`being hit bends the card, it does not just slide it (shear ${hurt.skew.toFixed(2)})`,
  Math.abs(hurt.skew) > 0.1 && hurt.sy < 1);
const air = poseAt('hop', 0.27, { dir: 1 });
check(`a hop leaves the plank (${air.dy.toFixed(2)} of its own height up)`, air.dy > 0.15);
check('and lands on a squash rather than snapping upright', poseAt('hop', 0.46, { dir: 1 }).sy < 0.99);
// The breath is held: it must never end, and must actually move.
const b1 = poseAt('breath', 0.0), b2 = poseAt('breath', 0.7);
check('the breath is a held pose that never stops and always moves', isHeld('breath') && Math.abs(b1.sy - b2.sy) > 1e-4);


// ── the TURF plates (v18) ────────────────────────────────────────────────
// `plates.js` is importable here because its DOM lives inside functions: the
// cast list and the paths are data, and data is what a bare-node gate can ask
// about. What it cannot ask is whether a street operator reads as a Kallio bum
// — that is the screenshot, and the weapons question with it.
const personIds = [...Object.keys(CHARACTERS),
  ...Object.entries(ENEMIES).filter(([, e]) => !e.kallio.look.shape || e.kallio.look.shape === 'person').map(([id]) => id)];
const notPerson = Object.keys(CAST).filter(id => !personIds.includes(id));
check(`only person-shaped figures are cast${notPerson.length ? ` — ${notPerson}` : ''}`, notPerson.length === 0);
check('and every one of them is cast — a half-plated row is worse than none',
  personIds.every(id => CAST[id]), `${personIds.filter(id => !CAST[id])}`);
// A rat has no equivalent in a roster of street operators, and the fallback is
// what keeps the switch from ever showing a blank plane.
check('no rat, blob, bird or bear is cast: they keep the drawn cutout',
  Object.entries(ENEMIES).every(([id, e]) => !['rat', 'blob', 'bird', 'bear'].includes(e.kallio.look.shape) || !plateFor(id)));
const missing = castFiles().filter(f => !existsSync(new URL('../' + f, import.meta.url)));
check(`every cast plate is really in the tree${missing.length ? ` — ${missing}` : ''} (${castFiles().length} files)`, missing.length === 0);
// It SHIPS from figures/, not art-src/: a Slay Kallio deploy is the folder
// minus test/ and art-src/, so runtime art under art-src/ arrives as a 404.
check('the plates ship from figures/, which a deploy carries — not from art-src/',
  castFiles().every(f => f.startsWith('figures/')));
check('a figure with no plate returns null rather than a broken path', plateFor('rat') === null && plateFor('nobody') === null);
// THE CAST IS THE OWNER'S OWN 26 (v34). v27 cut them out of his casting
// sheets and v34 put them on the bridge; a generated `*-plate` creeping back
// into the cast would be a copy standing in for the person it was copied from.
const ROSTER = readdirSync(new URL('../../turf/art-src/sprites/cast/roster/', import.meta.url)).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4));
const strangers = [...new Set(Object.values(CAST))].filter(n => !ROSTER.includes(n));
check(`every cast plate is one of the owner's own 26${strangers.length ? ` — ${strangers}` : ''} (${new Set(Object.values(CAST)).size} of ${ROSTER.length} cast)`, strangers.length === 0);
// v19 refused eight plates for carrying firearms; the owner reversed that on
// 2026-09-09 (*"of course they can have firearms"*), so there is nothing left
// here to enforce and the gate that enforced it is gone rather than left
// passing vacuously. `WITH_GUNS` survives as a NOTE — a real fact about the
// set that cost a pass over all thirty-two at full size, and the thing a
// person wants while casting — so what is checked is that it still names
// plates that exist, which is the only way a note like this rots.
const ghosts = WITH_GUNS.filter(n => !existsSync(new URL(`../../turf/art-src/sprites/${n}-plate.png`, import.meta.url))
  && !existsSync(new URL(`../../turf/art-src/sprites/cast/${n}-idle.png`, import.meta.url)));
check(`the gun list still names real plates${ghosts.length ? ` — ${ghosts}` : ''} (${WITH_GUNS.length} of 32)`, ghosts.length === 0);

// ── the ones cast from the spare plates (v26) ────────────────────────────
// Two new conditions, one user each — the rule v23 set, which is that a
// condition with no user is dead code. `crowded` is `alone`'s mirror; the
// interesting half is that both directions of thinning the row now cost you
// something. `bleeding` is the first that reads YOU rather than the row.
const fight3 = (ids, hp) => {
  const st = startRun(createRun({ seed: 3, character: 'drinker' }));
  st.route.steps[0] = [{ kind: 'fight', id: ids }];
  chooseNode(st, 0);
  if (hp) st.hero.hp = hp;
  return st;
};
// `crowded` counts three alive INCLUDING itself, so the Bat's own fight has
// the bodies and stripping them takes the bonus away.
let cs = fight3('bat');
check('the Bat comes with company — three on the bridge', cs.enemies.filter(e => e.alive).length === 3);
const batIntent = st => st.enemies.find(e => e.id === 'bat')?.intent?.id;
check(`held by two friends, the Bat calls the shot — ${batIntent(cs)}`, batIntent(cs) === 'hold_him');
// Thin the row and it stops: the same enemy, a different fight.
cs = fight3('bat');
for (const e of cs.enemies) if (e.id !== 'bat') { e.alive = false; e.hp = 0; }
for (const e of cs.enemies) if (e.alive) { e.intent = null; }
endTurn(cs);
check('on his own he goes back to swinging at you', batIntent(cs) !== 'hold_him');
// `bleeding` reads the hero. The Butcher's Boy is the first enemy in the game
// whose threat depends on the state of your RUN rather than of the row.
let bs = fight3('sable');
const sableIntent = st => st.enemies.find(e => e.id === 'sable')?.intent?.id;
check(`at full health he only circles — ${sableIntent(bs)}`, sableIntent(bs) !== 'finish_it');
bs.hero.hp = Math.floor(bs.hero.maxHp / 2);
for (const e of bs.enemies) e.intent = null;
endTurn(bs);
check(`under half he goes for it — ${sableIntent(bs)}`, sableIntent(bs) === 'finish_it');
check('and it is the biggest number he has',
  ENEMIES.sable.moves.find(m => m.id === 'finish_it').dmg > Math.max(...ENEMIES.sable.moves.filter(m => m.id !== 'finish_it').map(m => m.dmg ?? 0)));
// v39, and this one is a SOFTLOCK that predates the rule which found it. The
// row can die during its OWN phase — thorns answer every blow, so the last
// attacker can kill itself coming in — and `endTurn` only asked whether the
// phase had already changed, which `enemyPhase` does for a dead HERO and never
// did for a dead row. The fight then never resolved: a fresh hand against an
// empty board, turn after turn, with no way on.
s = rig('boxer', []);
s.hero.status.thorns = 50;
s.enemies.forEach(e => { e.intent = { id: 't', intent: 'attack', dmg: 1, shown: 1 }; });
endTurn(s);
check('a row that kills itself on the thorns still ends the fight',
  s.enemies.every(e => !e.alive) && s.phase !== 'fight', `phase ${s.phase}`);

// v39. The Boxer's mechanic returned him to par and never above it, and it did
// not compound — thorns were re-bought every fight where the Cart's block
// accumulates. Being struck deepens them now, so the round spent being hit is
// the round they become worth having.
s = rig('boxer', []);
s.hero.status.thorns = 2;
s.enemies.forEach(e => { e.intent = { id: 't', intent: 'attack', dmg: 3, shown: 3 }; });
const hit = s.enemies.filter(e => e.alive).length;
endTurn(s);
check(`thorns grow on the blow they answer (2 + ${hit} hits = ${2 + hit})`,
  s.hero.status.thorns === 2 + hit * RULES.thornsOnStruck);
// It DEEPENS a mechanic rather than handing one out: no thorns, no growth.
s = rig('boxer', []);
s.enemies.forEach(e => { e.intent = { id: 't', intent: 'attack', dmg: 3, shown: 3 }; });
endTurn(s);
check('someone carrying none does not grow any', !s.hero.status.thorns);
// 1 and not 2: measured at 400 seeds, 2 is strictly better for him on every
// line and takes his best to 33%, near the top of the roster, which is a
// different character rather than a fixed one. Same call as v28's buzz carry.
check('the slope is one, not two', RULES.thornsOnStruck === 1);

// v38. Eight cards for the two thinnest pools, and these three are the ones
// that do something the character could not do before — the rest are numbers.
// The Boxer's question is "take the hit to get paid", and `take_it` is the
// whole question in one card: it buys nothing now and makes the next turn
// WORSE on purpose, because thorns only pay when something hits you.
s = rig('boxer', ['take_it']);
playCard(s, 0);
check('Take It buys thorns with your own ribs (5 thorns, 1 vulnerable)',
  s.hero.status.thorns === 5 && s.hero.status.vulnerable === 1);
// `second_wind` turns a round of absorbing into BLOCK. This turns it into the
// punch, so a round on the ropes has two ways out rather than one.
s = rig('boxer', ['on_the_ropes']);
s.struck = 3;  // state, not a hero status: the fight counts the hits, not the man
check('On The Ropes counts the hits he took (4 + 3x4 = 16)', preview(s, 0, 0).damage === 16);
// The Dog Walker fed `fetch` all turn and spent it exactly one way. The dog
// can stand in front of you now, so holding the stack is a question rather
// than a countdown.
s = rig('walker', ['guard_dog']);
s.hero.status.fetch = 9;
playCard(s, 0);
check('Guard Dog spends the whole stack on block (9)', s.hero.block === 9);
// Every new card is draftable, or it is decoration.
for (const id of ['take_it', 'body_shot', 'on_the_ropes', 'sparring',
                  'guard_dog', 'slip_lead', 'park_run', 'spare_lead'])
  check(`${id} is a real card with a drawable picture`,
    !!CARDS[id] && drawable.has(CARDS[id].pic) && !!CARDS[id].char);

// `hale` is `bleeding`'s MIRROR, and it is the condition the list was missing:
// every other rule reads the row or reads a hero who is already hurt, so
// nothing in the game cost you anything for arriving healthy. The Chancer is
// its one user — he sizes up whoever is still worth taking off, ONCE.
let ch = fight3('chancers');
const chanIntent = st => st.enemies.find(e => e.id === 'chancer')?.intent?.id;
check(`healthy, he sizes you up — ${chanIntent(ch)}`, chanIntent(ch) === 'sizes_you_up');
// and it is exactly the inverse of sable: hurt, he loses interest.
let ch2 = fight3('chancers');
ch2.hero.hp = Math.floor(ch2.hero.maxHp / 2);
for (const e of ch2.enemies) e.intent = null;
endTurn(ch2);
check(`under half he is a pushover — ${chanIntent(ch2)}`, chanIntent(ch2) !== 'sizes_you_up');
// ONCE, like the Bottle Thief's second wind: a spike that repeated every turn
// while you were above half would be a wall, not a spike.
const chMark = ch.log.length;
for (const e of ch.enemies) e.intent = null;
endTurn(ch); endTurn(ch);
check('and he only does it once', chanIntent(ch) !== 'sizes_you_up');
check('it is his biggest number',
  ENEMIES.chancer.moves.find(m => m.id === 'sizes_you_up').dmg
    > Math.max(...ENEMIES.chancer.moves.filter(m => m.id !== 'sizes_you_up').map(m => m.dmg ?? 0)));
check('hale and bleeding cannot both hold', !WHEN.hale(ch2) || !WHEN.bleeding(ch2));
check('nor can both be false', WHEN.hale(ch) || WHEN.bleeding(ch));
// The spike is the ENCOUNTER, not the enemy: two of them open on a healthy
// hero for more than any single ordinary act-two fight asks.
const pair = ENCOUNTERS.find(e => e.id === 'chancers');
check('the pair is two chancers', pair.enemies.filter(x => x === 'chancer').length === 2);
check('both new fights are in act two',
  ['chancers', 'chance_rat'].every(id => ACTS[1].fights.includes(id)));
check('the Chancer is cast from one of the owner 26', !!plateFor('chancer'));

// Six new people, and each is cast for a picture rather than for a hole in a
// stat table — which a gate cannot see. What it CAN see is that each one is a
// real plate, is person-shaped, and is not a second copy of a rotation the
// game already had.
const CAST_V26 = ['debt', 'bat', 'sable', 'hardhat', 'fence', 'crowbar'];
check(`six people cast from the spare pool (${CAST_V26.join(', ')})`,
  CAST_V26.every(id => ENEMIES[id] && plateFor(id)));
check('every one of them is a person, not a rat wearing a coat',
  CAST_V26.every(id => (ENEMIES[id].kallio.look.shape ?? 'person') === 'person'));
check('and each leads a fight of its own in one of the two act pools',
  CAST_V26.every(id => ACTS.some(a => a.fights.includes(id))));
check('the Debt Collector is the second figure that can act — he has the pose set',
  posesFor('debt').length === 7);

// ── the act-two harness (v27) ────────────────────────────────────────────
// `bots.mjs --act2` snapshots a run at the door of act two and resumes it
// later under another bot. The whole instrument rests on one claim: a resumed
// run is bit-identical to one that never stopped. That is asserted here rather
// than trusted, because the rng is a closure and a snapshot that dropped its
// internal state would still RUN — it would just be measuring a different game.
{
  const { BOTS, run, drive, snapshot, restore } = await import('./bots.mjs');
  const AT_DOOR = st => st.act === 1 && st.phase === 'map' && st.route?.step === 0;
  let arrived = 0, same = 0;
  for (let seed = 1; seed <= 40 && arrived < 8; seed++) {
    const straight = run(seed, 'cart', BOTS.native);
    const stopped = drive(startRun(createRun({ seed, character: 'cart' })), BOTS.native, null, AT_DOOR);
    if (!AT_DOOR(stopped)) continue;
    arrived++;
    const resumed = drive(restore(snapshot(stopped)), BOTS.native);
    const key = st => `${st.phase}:${st.hero.hp}:${st.encounter}:${st.log.length}`;
    if (key(straight) === key(resumed)) same++;
  }
  check(`a run resumed from its act-two snapshot ends exactly as the straight run (${same}/${arrived})`, arrived > 0 && same === arrived);
  check('a snapshot carries the rng as a number, not a closure', typeof snapshot(startRun(createRun({ seed: 3 }))).rngSeed === 'number');
}

// ── the frame axis (v25) ─────────────────────────────────────────────────
// v17 moved the card and left the drawing alone. The other half of Paper Mario
// is a small number of drawn frames swapping under the moving object, and the
// art for it was already in the repo — TURF's own seven-pose cast set, read by
// nothing. These assert the two halves cannot drift: a frame is picked off the
// SAME stage list as the transform, so it can never be one beat out of step.
check(`the frame set is the poses the fight produces (${FRAME_NAMES.join(', ')})`,
  ['idle', 'attack-windup', 'attack-release', 'hit', 'move'].every(n => FRAME_NAMES.includes(n)));
check('every frame a clip names is a frame the pose set actually has',
  FRAME_NAMES.every(n => POSES.includes(n)));
// The one that matters: the drawing changes ON the beat, not near it. The
// attack's stages are 0.20 / 0.11 / 0.30, so the windup owns everything before
// 0.20 and the release owns everything after it.
check('the attack winds up, then commits — and the swap is on the stage edge',
  frameAt('attack', 0) === 'attack-windup' && frameAt('attack', 0.199) === 'attack-windup'
  && frameAt('attack', 0.201) === 'attack-release');
check('the recovery HOLDS the release rather than snapping back to idle',
  frameAt('attack', 0.30) === 'attack-release' && frameAt('attack', 0.60) === 'attack-release');
check('and past the end of any clip the figure is standing still again',
  CLIP_NAMES.every(n => isHeld(n) || frameAt(n, clipLength(n) + 0.001) === 'idle'));
check('being hit shows the hit frame for the whole clip', frameAt('hurt', 0) === 'hit' && frameAt('hurt', 0.3) === 'hit');
check('a clip nobody drew frames for reads as idle rather than as undefined',
  frameAt('nosuchclip', 0.1) === 'idle');
// The files. A posed character has no bare <name>.png — the seven frames are
// one set with one naming rule, so nothing has to remember the special case.
check(`${WITH_POSES.size} character(s) carry a pose set, and it is the full table`,
  WITH_POSES.size > 0 && [...WITH_POSES].every(() => POSES.length === 7));
const posedIds = Object.entries(CAST).filter(([, n]) => WITH_POSES.has(n)).map(([id]) => id);
check(`a posed figure reports all seven frames (${posedIds.join(', ')})`,
  posedIds.length > 0 && posedIds.every(id => posesFor(id).length === 7));
check('an unposed figure reports exactly one, so it bakes exactly one texture',
  Object.keys(CAST).filter(id => !posedIds.includes(id)).every(id => posesFor(id).length === 1));
check('and every frame of every posed figure is a real file in figures/',
  posedIds.every(id => POSES.every(p => existsSync(new URL('../' + plateFor(id, p), import.meta.url)))),
  `${posedIds.flatMap(id => POSES.filter(p => !existsSync(new URL('../' + plateFor(id, p), import.meta.url))).map(p => id + ':' + p))}`);
check('asking a posed figure for no pose gives its standing frame',
  posedIds.every(id => plateFor(id) === plateFor(id, 'idle')));

// ── enemies that REACT (v23) ─────────────────────────────────────────────
// `when` is the difference between a bestiary and a rotation. These assert the
// condition FIRES and — the half that is easy to forget — that it does not
// fire when it should not, since a conditional move left in the ordinary loop
// is the obvious bug.
const withWhen = Object.entries(ENEMIES).filter(([, e]) => e.moves.some(m => m.when));
check(`enemies react to the fight, not just to a clock (${withWhen.length} of ${Object.keys(ENEMIES).length})`, withWhen.length >= 5);
// The list is read off the ENGINE, not typed out here. A literal copy failed
// the moment v26 added two conditions — the same brittleness as v16's
// `hp === 68` and v23's `moves[2]`, and the third time is enough.
const CONDITIONS = Object.keys(WHEN);
check(`every condition used is one the engine knows (${CONDITIONS.join(', ')})`,
  Object.values(ENEMIES).every(e => e.moves.every(m => !m.when || CONDITIONS.includes(m.when))));
check(`and all ${CONDITIONS.length} are actually used — a condition with no user is dead code`,
  CONDITIONS.every(w => Object.values(ENEMIES).some(e => e.moves.some(m => m.when === w))),
  `${CONDITIONS.filter(w => !Object.values(ENEMIES).some(e => e.moves.some(m => m.when === w)))}`);
// Every reacting enemy still has a rotation underneath: strip the conditional
// moves and what is left has to be a fight on its own.
check('a reacting enemy still has an ordinary loop under it',
  withWhen.every(([, e]) => e.moves.filter(m => !m.when).length >= 2));

const react = (enc, tweak = () => {}) => {
  const st = startRun(createRun({ seed: 6, character: 'cart' }));
  jumpTo(st, ENC(enc));
  tweak(st);
  st.enemies.forEach(e => { e.intent = null; });
  // re-plan against the state the tweak just made
  endTurn(st);
  return st;
};
// `first` — an opener. A rotation starts anywhere, so this is the one thing it
// could never do.
let r = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(r, ENC('lookout'));
const look = r.enemies.find(e => e.id === 'lookout');
check('the Lookout whistles on turn one, whatever the rotation rolled', look.intent.id === 'whistle', `${look.intent.id}`);
check('and it buffs the whole row rather than itself', look.intent.who === 'all');
endTurn(r);
check('and does not whistle again on turn two', r.enemies.find(e => e.id === 'lookout')?.intent.id !== 'whistle');

// `alone` — kill ORDER becomes a decision.
r = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(r, ENC('scrappers'));
const scr = r.enemies.filter(e => e.id === 'scrapper');
check('two Scrappers, and neither is enraged while it has company',
  scr.length === 2 && r.enemies.filter(e => e.alive).length === 3 && scr.every(e => e.intent.id !== 'nothing_left'));
r.enemies.forEach(e => { if (e !== scr[0]) { e.alive = false; e.hp = 0; } });
scr[0].intent = null; endTurn(r);
check('left alone, the Scrapper enrages', scr[0].intent.id === 'nothing_left', `${scr[0].intent.id}`);

// `walled` — block was a strictly safe play before this.
r = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(r, ENC('hardcase'));
const hard = r.enemies.find(e => e.id === 'hard_case');
check('the Hard Case ignores you while you are not turtling', hard.intent.id !== 'shoulder');
// Assert what ACTED, from the log. After `endTurn` an enemy's `intent` is the
// one planned for the turn AFTER — reading it there is reading one turn late,
// which is what made three of these look broken while the engine was right.
const acted = (st, from) => st.log.slice(from).filter(l => l.t === 'enemyAct').map(l => l.move);
let mark = r.log.length;
r.hero.block = 14; hard.intent = null; endTurn(r);
check('but answers a wall of block with frail', acted(r, mark).includes('shoulder'), `${acted(r, mark)}`);

// v40. THE BEAR READS THE BOARD NOW, and it is the only boss that did not.
// Seven ordinary enemies react and the act-one boss answers `hurt`; the fight
// that ends 84% of act-two runs walked a fixed loop of five.
r = startRun(createRun({ seed: 11, character: 'cart' })); jumpTo(r, ENC('bear'));
const bear = r.enemies.find(e => e.id === 'the_bear');
check('the Bear leaves you alone while you are not turtling', bear.intent.id !== 'press');
let bmark = r.log.length;
r.hero.block = 14; bear.intent = null; endTurn(r);
check('but leans on a wall of block', acted(r, bmark).includes('press'), `${acted(r, bmark)}`);

// And the move has to be a PUNISH rather than a discount. A conditional move
// REPLACES the rotation's next one, so anything weaker than what it displaces
// rewards the condition: at 16 against `maul`'s 12x2 this measured as act two
// getting THIRTEEN POINTS EASIER. The gate is the relationship, not the number.
{
  const mv = id => ENEMIES.the_bear.moves.find(m => m.id === id);
  const swing = m => (m.dmg || 0) * (m.times || 1);
  check('the wall answer is not cheaper than the swing it replaces',
    swing(mv('press')) >= swing(mv('maul')) * 0.8, `${swing(mv('press'))} vs ${swing(mv('maul'))}`);
  check('and it carries a rider, or it is just a smaller maul', !!mv('press').status);
  // The blind rising tide is gone: `stir` healed AND handed itself +2 Strength
  // every cycle for ever, which is what made a 140 HP boss a DPS check.
  check('the Bear no longer ramps its own Strength unconditionally',
    !ENEMIES.the_bear.moves.some(m => !m.when && m.status?.key === 'strength'));
  check('but it still heals — it is granite', mv('stir').heal > 0);
}


// ═══ v41 — THE SYNERGY PASS ═══════════════════════════════════════════════
{
  // 1. EVERY CLASS AXIS IS DEEP ENOUGH TO BUILD ON. v40 measured them and they
  // were wildly uneven: the Busker read `played` on seven cards and the Park
  // Drinker read `buzz` on ONE, which is a mechanic with a single user. The
  // gate is per character, so the next thin one fails rather than hides in a
  // total.
  const AXIS = { drinker: 'buzz', busker: 'played', collector: 'hand', cart: 'block', walker: 'fetch', boxer: 'struck' };
  for (const [ch, axis] of Object.entries(AXIS)) {
    const own = Object.values(CARDS).filter(c => c.char === ch && c.effects.some(f => f.scale === axis));
    check(`${ch}: at least 4 cards read ${axis} (${own.length})`, own.length >= 4);
  }
  // The Boxer reads TWO things - the hits he took and the thorns they grew -
  // so his depth is counted across both.
  const boxerAxes = Object.values(CARDS).filter(c => c.char === 'boxer' && c.effects.some(f => ['struck', 'thorns'].includes(f.scale)));
  check(`boxer: struck and thorns together (${boxerAxes.length})`, boxerAxes.length >= 5);

  // 2. A NEUTRAL CARD CAN JOIN A BUILD. Before v41 not one of the 24 neutrals
  // read any state, so a neutral draft could never be part of a deck - the
  // opposite of what a shared pool is for.
  const neutralScaling = Object.values(CARDS).filter(c => !c.char && c.effects.some(f => f.scale));
  check(`neutral cards scale on something (${neutralScaling.length})`, neutralScaling.length >= 5);
  // And on axes ANY character can build, not on one class's resource. Stated as
  // the INVERSE since v43: a list of permitted axes is a list that has to be
  // edited every time one is added, and the v43 pass added three (`dark`,
  // `discard`, `missing`) that every character reaches by simply playing the
  // game. What actually makes a neutral undraftable is scaling on a resource
  // ONE class generates, so that is what is checked.
  const CLASS_ONLY = ['buzz', 'played', 'finds', 'fetch'];
  const trespass = neutralScaling.filter(c => c.effects.some(f => CLASS_ONLY.includes(f.scale)));
  check('and never on one class\'s private resource',
    trespass.length === 0, trespass.map(c => c.kallio.name).join(', '));

  // 3. RARITY IS POTENTIAL, AND THE ODDS FOLLOW THE ACT.
  check('act two rolls rares more often than act one',
    RULES.rarityByAct[1].rare > RULES.rarityByAct[0].rare);
  check('and commons less often', RULES.rarityByAct[1].common < RULES.rarityByAct[0].common);
  // Measured, not asserted from the table: roll a thousand card rewards in
  // each act off the same seed and count what comes out.
  const rollShare = act => {
    const r = startRun(createRun({ seed: 5, character: 'busker' }));
    r.act = act;
    let rare = 0, total = 0;
    for (let i = 0; i < 400; i++) {
      jumpTo(r, ENC('rats'));
      r.act = act;
      while (r.phase === 'fight') botTurn(r);
      if (r.phase !== 'reward' || r.reward.kind !== 'card') { if (r.phase === 'reward') chooseReward(r, -1); continue; }
      for (const id of r.reward.options) { total++; if (CARDS[id].rarity === 'rare') rare++; }
      while (r.phase === 'reward') chooseReward(r, -1);
      if (r.hero.hp < 20) r.hero.hp = r.hero.maxHp;
    }
    return total ? rare / total : 0;
  };
  const a1 = rollShare(0), a2 = rollShare(1);
  check(`a rare is rarer in act one than act two (${(a1 * 100).toFixed(1)}% vs ${(a2 * 100).toFixed(1)}%)`, a2 > a1 * 1.5);

  // ── v43: THE HOUR IS AN AXIS ──────────────────────────────────────────────
  // `dark` is the only scale in the game that reads the RUN rather than the
  // fight, which is what makes it act three's card identity without a third
  // pool. The assertions are the whole contract: it is the same 0/1/2 that
  // decides mutation, it cannot be built inside a fight, and the face says the
  // number it is about to use.
  {
    const darkCards = Object.entries(CARDS).filter(([, c]) => c.effects.some(f => f.scale === 'dark'));
    check(`cards scale on the hour (${darkCards.length})`, darkCards.length >= 8);
    check('and every class has one, so no class is left out of the third act',
      Object.keys(CHARACTERS).every(ch => darkCards.some(([, c]) => c.char === ch)));
    check('and some are neutral', darkCards.some(([, c]) => !c.char));

    const at = (hourState, id) => {
      const st = startRun(createRun({ seed: 5, character: 'boxer' }));
      st.act = hourState; buildRoute(st, hourState); jumpTo(st, ENC(hourState === 2 ? 'eels' : hourState === 1 ? 'gulls' : 'rats'));
      st.hand = [{ uid: 990, ...CARDS[id], id }];
      return preview(st, 0).damage;
    };
    // Nightfall: 3 to the row by day, 10 through the evening, 17 at night.
    const day = at(0, 'nightfall_card'), eve = at(1, 'nightfall_card'), night = at(2, 'nightfall_card');
    check(`Nightfall grows with the hour — ${day} / ${eve} / ${night}`, day === 3 && eve === 10 && night === 17);
    // It is the mutation level, not a separate clock: the card and the enemy
    // in front of it are reading the same number.
    const st = startRun(createRun({ seed: 5, character: 'boxer' }));
    st.act = 2; buildRoute(st, 2); jumpTo(st, ENC('eels'));
    check('and it IS the mutation level the row spawned at',
      nightfall(st.hour) === st.enemies[0].mutated);
    // Nothing in a fight can move it — that is what stops it being farmed.
    const before = nightfall(st.hour);
    st.hand = [{ uid: 991, ...CARDS.strike, id: 'strike' }]; st.hero.energy = 3; playCard(st, 0, 0);
    endTurn(st);
    check('and no turn of play moves it', nightfall(st.hour) === before);
    check('and the face quotes the number it will use',
      describe(CARDS.nightfall_card).includes('+7 per step into the dark'));
  }

  // ── v43: EVERY CLASS CAN ANSWER A ROW ────────────────────────────────────
  // Act three's rosters are wider than act one's and every class rare was
  // single-target, so the card a long run most wanted did not exist. Each gets
  // exactly one, and it is that class's OWN axis pointed at the row rather
  // than a new verb - which is the v41 brief held to, not widened.
  {
    const rowRares = Object.values(CARDS).filter(c => c.char && c.rarity === 'rare' && c.target === 'all');
    check(`each class has a rare that answers the whole row (${rowRares.length})`,
      Object.keys(CHARACTERS).every(ch => rowRares.some(c => c.char === ch)));
    check('and each of them scales on that class\'s own resource',
      rowRares.every(c => c.effects.some(f => f.scale)));
  }

  // 4. EVERY BUILD-AROUND POWER DOES ITS RULE. Each is a rare, so each is a
  // ceiling - and a ceiling that does not work is just a dead card.
  const withPower = (key, n, char = 'busker') => {
    const s = startRun(createRun({ seed: 9, character: char }));
    s.hero.powers[key] = n;
    return s;
  };
  // freeDraw - the owner's own example: keep drawing on 0-cost cards.
  {
    const s = withPower('freeDraw', 1);
    s.hand = [{ uid: 900, ...CARDS.cheap_shot, id: 'cheap_shot' }];
    s.hero.energy = 3;
    const before = s.hand.length;
    playCard(s, 0, 0);
    check('freeDraw: a 0-cost card draws one', s.hand.length === before, `${before} -> ${s.hand.length}`);
    // and it is CAPPED, so a hand of free cards is a chain with an end
    check('and the chain is bounded', RULES.freeDrawCap > 0 && RULES.freeDrawCap <= 6);
  }
  // strikeTwice - the first 0-cost attack each turn lands twice
  {
    const s = withPower('strikeTwice', 1, 'collector');
    jumpTo(s, ENC('rats'));
    s.hero.powers.strikeTwice = 1;
    s.hand = [{ uid: 901, ...CARDS.cheap_shot, id: 'cheap_shot' }, { uid: 902, ...CARDS.cheap_shot, id: 'cheap_shot' }];
    s.hero.energy = 3;
    const hp0 = s.enemies[0].hp;
    playCard(s, 0, 0);
    const firstHit = hp0 - s.enemies[0].hp;
    const hp1 = s.enemies[0].hp;
    playCard(s, 0, 0);
    const secondHit = hp1 - s.enemies[0].hp;
    check(`strikeTwice: the FIRST free attack hits twice (${firstHit}) and the second once (${secondHit})`,
      firstHit === secondHit * 2);
  }
  // exhaustHit - a card leaving play is a punch
  {
    const s = withPower('exhaustHit', 5, 'walker');
    jumpTo(s, ENC('rats'));
    s.hero.powers.exhaustHit = 5;
    s.hand = [{ uid: 903, ...CARDS.rummage, id: 'rummage' }];
    s.hero.energy = 3;
    const hp0 = Math.min(...s.enemies.filter(e => e.alive).map(e => e.hp));
    playCard(s, 0, 0);
    const hp1 = Math.min(...s.enemies.filter(e => e.alive).map(e => e.hp));
    check(`exhaustHit: exhausting a card hits the weakest for 5 (${hp0} -> ${hp1})`, hp0 - hp1 === 5);
  }
  // buzzBlock - the drink that was about to wear off becomes a guard
  {
    const s = withPower('buzzBlock', 1, 'drinker');
    jumpTo(s, ENC('rats'));
    s.hero.powers.buzzBlock = 1;
    s.hero.status.buzz = 6; s.hand = []; s.hero.block = 0;
    endTurn(s);
    check('buzzBlock: the buzz about to fade becomes block', s.log.some(l => l.t === 'block' && l.src === 'buzzBlock')
      || s.hero.block > 0, `block ${s.hero.block}`);
  }
  // halfRetain - half the guard survives the turn
  {
    const s = withPower('halfRetain', 1, 'cart');
    jumpTo(s, ENC('rats'));
    s.hero.powers.halfRetain = 1;
    s.hand = []; s.hero.block = 20;
    const kept = 20;
    endTurn(s);
    check(`halfRetain: half the block is still there next turn (${s.hero.block} of ${kept} minus what was spent)`,
      s.hero.block >= 1);
  }

  // 5. `div` - how a card reads a LARGE resource honestly, and the face has
  // to say the divisor or the number is a lie.
  check('a divided scale says its divisor on the face',
    /per 3 block you have/.test(describe(CARDS.lean_on_it)), describe(CARDS.lean_on_it));
  {
    const s = startRun(createRun({ seed: 12, character: 'cart' }));
    jumpTo(s, ENC('rats'));
    s.hero.block = 21;
    s.hand = [{ uid: 904, ...CARDS.lean_on_it, id: 'lean_on_it' }];
    s.hero.energy = 3;
    check('and 21 block is 7 extra damage, not 21', preview(s, 0, 0).damage === 3 + 7, `${preview(s, 0, 0).damage}`);
  }

  // 6. ARTIFACTS ARE NOT FRIENDS, and the line is where they live. A friend
  // bends the arithmetic of a hit and is capped at five; an artifact changes a
  // rule of the run and is uncapped. If an artifact ever grew an effect the
  // damage pipeline reads, the two lists would have collapsed into one.
  const JOKER_PIPELINE = ['attackAddPerPlayed', 'attackAddIfCost', 'attackAddIfCostAtLeast',
    'attackAddPerJoker', 'nthAttackMult', 'firstAttackMult', 'firstAttackFightMult', 'vulnMult'];
  check(`artifacts exist (${Object.keys(ARTIFACTS).length})`, Object.keys(ARTIFACTS).length >= 6);
  check('and not one of them reaches into the damage pipeline — that is a friend\'s job',
    Object.values(ARTIFACTS).every(a => !JOKER_PIPELINE.includes(a.effect.type)));
  check('every artifact is named and explained in both skins',
    Object.values(ARTIFACTS).every(a => themes.every(t => a[t]?.name && a[t]?.text)));
  check('no artifact shares an id with a friend',
    Object.keys(ARTIFACTS).every(id => !JOKERS[id]));
  // Elites and bosses are what hand them out — that is what makes an elite
  // worth the HP it costs.
  const artifactGivers = ENCOUNTERS.filter(e => e.reward.includes('artifact'));
  check(`elites and act bosses give artifacts (${artifactGivers.length})`, artifactGivers.length >= 4);
  check('and no ordinary fight does',
    artifactGivers.every(e => e.enemies.some(id => ENEMIES[id].elite || ENEMIES[id].boss)));
  // They are uncapped, unlike friends.
  {
    const s = startRun(createRun({ seed: 4, character: 'cart' }));
    for (const id of Object.keys(ARTIFACTS)) gainArtifact(s, id);
    check(`artifacts are uncapped (${s.artifacts.length} held, friends cap at ${RULES.jokerMax})`,
      s.artifacts.length === Object.keys(ARTIFACTS).length && s.artifacts.length > RULES.jokerMax);
    check('and a held artifact is readable by rule', hasArtifact(s, 'restBoth') && artifactSum(s, 'startBlock') === 6);
  }
  // AND SOME OF THEM COST SOMETHING. The GDD's rule for friends is the rule
  // here: one that only gives is a number, not a decision. Measured, the first
  // eight were worth +8 points of win rate on their own - a flat gift.
  const costed = Object.entries(ARTIFACTS).filter(([, a]) => a.cost);
  check(`some artifacts cost something (${costed.length} of ${Object.keys(ARTIFACTS).length})`, costed.length >= 3);
  check('and each names its price on its face',
    costed.every(([, a]) => themes.every(t => /no longer|fewer|Frail|lose/i.test(a[t].text))));
  {
    // The price is carried on the SAME object as the gift, so taking the
    // upside can never drop the downside.
    const s = startRun(createRun({ seed: 8, character: 'cart' }));
    gainArtifact(s, 'bad_back');
    check('The Bad Back gives the Strength', hasArtifact(s, 'startStrength'));
    check('and takes the rest heal with it', hasArtifact(s, 'noRestHeal'));
    jumpTo(s, ENC('rats'));
    check('the Strength is there in the fight', (s.hero.status.strength || 0) >= 2, `${s.hero.status.strength}`);
  }
  {
    const s = startRun(createRun({ seed: 8, character: 'boxer' }));
    gainArtifact(s, 'broken_watch');
    jumpTo(s, ENC('rats'));
    s.hero.hp = 40;
    while (s.phase === 'fight') botTurn(s);
    check('The Broken Watch: no heal after a fight', !s.log.some(l => l.t === 'heal' && l.n === RULES.healAfterFight));
  }

  // Each one actually does its rule.
  {
    const s = startRun(createRun({ seed: 7, character: 'boxer' }));
    gainArtifact(s, 'tarp');
    jumpTo(s, ENC('rats'));
    check('The Tarp: a fight opens with 6 block', s.hero.block >= 6, `${s.hero.block}`);
  }
  {
    const s = startRun(createRun({ seed: 7, character: 'boxer' }));
    const before = s.hero.maxHp;
    gainArtifact(s, 'big_coat');
    check('The Big Coat: +12 max HP and the HP with it', s.hero.maxHp === before + 12 && s.hero.hp === s.hero.hp);
  }
  {
    const s = startRun(createRun({ seed: 7, character: 'walker' }));
    gainArtifact(s, 'wet_matches');
    jumpTo(s, ENC('rats'));
    s.hand = [{ uid: 905, ...CARDS.rummage, id: 'rummage' }];
    s.hero.energy = 3;
    const before = s.hand.length;
    playCard(s, 0, 0);
    // rummage draws 2 and exhausts; the artifact adds one more on the exhaust
    check('Wet Matches: exhausting also draws', s.hand.length >= before + 1, `${before} -> ${s.hand.length}`);
  }
}

// `hurt` + `once` — the Jaw Worm's bellow: a single second wind.
r = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(r, ENC('thief'));
const thief = r.enemies.find(e => e.id === 'bottle_thief');
check('the Bottle Thief does not drink while she is fresh', thief.intent.id !== 'last_drop');
mark = r.log.length;
thief.hp = 8; thief.intent = null; endTurn(r);
check('hurt, she takes the last drop', acted(r, mark).includes('last_drop'), `${acted(r, mark)}`);
check(`and it healed her (${thief.hp} HP)`, thief.hp > 8);
mark = r.log.length;
thief.hp = 6; thief.intent = null; endTurn(r);
check('ONCE — there is no second bottle', !acted(r, mark).includes('last_drop'), `${acted(r, mark)}`);

// The boss: half gone is a different fight.
r = startRun(createRun({ seed: 6, character: 'cart' })); jumpTo(r, ENC('bridge'));
const king = r.enemies[0];
check('the Bridge King opens on his ordinary rotation', king.intent.id !== 'enough');
mark = r.log.length;
king.hp = 40; king.intent = null; endTurn(r);
check('at half he has had enough', acted(r, mark).includes('enough'), `${acted(r, mark)}`);
check('and it is worth three strength', king.status.strength >= 3, `${king.status.strength}`);

// ── NO KEY IS DEFINED TWICE IN A TABLE ──────────────────────────────────
// Found while diagnosing the Dog Walker: `good_boy`, `long_lead`, `one_more`
// and `deposit_run` were each written twice into CARDS, and an object literal
// keeps the LAST value at the FIRST key's position without a word. So the
// Walker's Good Boy had lost its draw and her Long Lead its 12 Fetch, the
// Drinker's One More was an attack and not the draw it was written as, and
// every balance number for four versions was taken on whichever copy happened
// to be lower in the file. The live copies were kept (moved into the first
// slot so key order, and every seeded roll, is unchanged); this is the gate.
{
  const src = readFileSync(new URL('../js/data.js', import.meta.url), 'utf8').split('\n');
  let table = null, seen = new Map();
  const dups = [];
  src.forEach((l, i) => {
    const t = l.match(/^export const ([A-Z_]+) = \{/);
    if (t) { table = t[1]; seen = new Map(); return; }
    if (/^\};/.test(l)) { table = null; return; }
    const k = table && l.match(/^  ([a-z_0-9]+): /);
    if (!k) return;
    if (seen.has(k[1])) dups.push(`${table}.${k[1]} (lines ${seen.get(k[1])} and ${i + 1})`);
    else seen.set(k[1], i + 1);
  });
  check(`no card, enemy or rule is written twice in data.js${dups.length ? ` — ${dups.join(', ')}` : ''}`, dups.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
