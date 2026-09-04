// Slay Kallio — everything the game is made of, as data.
//
// The engine (engine.js) reads ids out of these tables and knows nothing about
// "a barista" or "a seagull"; a new character, card, joker or enemy is a new
// entry here, never a rebuild. Every named thing carries a name in BOTH themes
// (`kallio` — the Helsinki district the game is set in — and `fantasy`), so the
// menu's theme switch is a lookup and not a second data set. Card text is not
// stored: engine.describe() writes it from the effects, so a number changed
// here changes the text on the card with it.

// ── cards ────────────────────────────────────────────────────────────────
// type: attack | skill | power | curse    target: enemy | all | self
// effects — the vocabulary engine.js understands:
//   damage {n, times, scale, per}   scale: played | block | hand | finds | jokers
//   block  {n, scale, per}
//   status {who: self|target|all, key, n}
//   draw {n} · energy {n} · addCard {id, n} · heal {n}
// A `find` is a 0-cost token the tinker's cards conjure into the hand.
export const CARDS = {
  // the two basics every deck starts on
  strike: { type: 'attack', cost: 1, target: 'enemy', rarity: 'basic', effects: [{ type: 'damage', n: 6 }],
    kallio: { name: 'Tönäisy' }, fantasy: { name: 'Strike' } },
  defend: { type: 'skill', cost: 1, target: 'self', rarity: 'basic', effects: [{ type: 'block', n: 5 }],
    kallio: { name: 'Väistö' }, fantasy: { name: 'Defend' } },

  // ─ barista (Nita) — Buzz: temporary strength that fades at the end of the turn
  espresso: { char: 'barista', type: 'skill', cost: 0, target: 'self', exhaust: true, rarity: 'common',
    effects: [{ type: 'energy', n: 1 }, { type: 'status', who: 'self', key: 'buzz', n: 2 }],
    kallio: { name: 'Espresso' }, fantasy: { name: 'Quicksilver Draught' } },
  latte_art: { char: 'barista', type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 4, times: 2 }],
    kallio: { name: 'Latte art' }, fantasy: { name: 'Twin Vials' } },
  pourover: { char: 'barista', type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'block', n: 7 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Pour over' }, fantasy: { name: 'Slow Distillation' } },
  burnt_roast: { char: 'barista', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon',
    effects: [{ type: 'damage', n: 11 }, { type: 'status', who: 'target', key: 'vulnerable', n: 2 }],
    kallio: { name: 'Palanut paahto' }, fantasy: { name: 'Acid Flask' } },
  refill: { char: 'barista', type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'draw', n: 2 }, { type: 'status', who: 'self', key: 'buzz', n: 1 }],
    kallio: { name: 'Santsikuppi' }, fantasy: { name: 'Second Dose' } },
  steam_wand: { char: 'barista', type: 'attack', cost: 1, target: 'all', rarity: 'uncommon',
    effects: [{ type: 'damage', n: 5 }],
    kallio: { name: 'Höyryputki' }, fantasy: { name: 'Steam Burst' } },
  crema: { char: 'barista', type: 'skill', cost: 1, target: 'self', rarity: 'uncommon',
    effects: [{ type: 'status', who: 'self', key: 'doubleNext', n: 1 }],
    kallio: { name: 'Crema' }, fantasy: { name: 'Catalyst' } },
  closing_time: { char: 'barista', type: 'power', cost: 2, target: 'self', rarity: 'rare',
    effects: [{ type: 'status', who: 'self', key: 'buzzPerTurn', n: 2 }],
    kallio: { name: 'Sulkemisaika' }, fantasy: { name: 'Philosopher’s Stone' } },

  // ─ bassist (Jape) — Riff: cards that grow with every card played before them this turn
  downbeat: { char: 'bassist', type: 'attack', cost: 0, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 3, scale: 'played', per: 2 }],
    kallio: { name: 'Iskubasso' }, fantasy: { name: 'Opening Chord' } },
  slap: { char: 'bassist', type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 7 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Slap' }, fantasy: { name: 'Sharp Verse' } },
  feedback_loop: { char: 'bassist', type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'block', n: 5, scale: 'played', per: 2 }],
    kallio: { name: 'Kierto' }, fantasy: { name: 'Refrain' } },
  encore: { char: 'bassist', type: 'attack', cost: 2, target: 'enemy', rarity: 'rare',
    effects: [{ type: 'damage', n: 4, scale: 'played', per: 4 }],
    kallio: { name: 'Encore' }, fantasy: { name: 'Crescendo' } },
  power_chord: { char: 'bassist', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon',
    effects: [{ type: 'damage', n: 14 }],
    kallio: { name: 'Voimasointu' }, fantasy: { name: 'Thunder Note' } },
  groove: { char: 'bassist', type: 'power', cost: 1, target: 'self', rarity: 'rare',
    effects: [{ type: 'status', who: 'self', key: 'groove', n: 1 }],
    kallio: { name: 'Groove' }, fantasy: { name: 'Rhythm of War' } },
  wall_of_sound: { char: 'bassist', type: 'skill', cost: 1, target: 'all', rarity: 'uncommon',
    effects: [{ type: 'block', n: 4 }, { type: 'status', who: 'all', key: 'weak', n: 1 }],
    kallio: { name: 'Äänivalli' }, fantasy: { name: 'Dirge' } },
  pick: { char: 'bassist', type: 'skill', cost: 0, target: 'self', rarity: 'common',
    effects: [{ type: 'draw', n: 1 }],
    kallio: { name: 'Plektra' }, fantasy: { name: 'Grace Note' } },

  // ─ tinker (Kaisa) — Finds: 0-cost tokens conjured into the hand, and cards that count the hand
  find_button: { type: 'attack', cost: 0, target: 'enemy', rarity: 'token', find: true, exhaust: true,
    effects: [{ type: 'damage', n: 3 }],
    kallio: { name: 'Löytö: nappi' }, fantasy: { name: 'Trinket: Bolt' } },
  find_yarn: { type: 'skill', cost: 0, target: 'self', rarity: 'token', find: true, exhaust: true,
    effects: [{ type: 'block', n: 3 }],
    kallio: { name: 'Löytö: lankakerä' }, fantasy: { name: 'Trinket: Charm' } },
  find_coin: { type: 'skill', cost: 0, target: 'self', rarity: 'token', find: true, exhaust: true,
    effects: [{ type: 'energy', n: 1 }],
    kallio: { name: 'Löytö: kolikko' }, fantasy: { name: 'Trinket: Spark' } },
  rummage: { char: 'tinker', type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'addCard', id: 'find', n: 2 }],
    kallio: { name: 'Penkominen' }, fantasy: { name: 'Rummage' } },
  tinkering: { char: 'tinker', type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 5, scale: 'finds', per: 3 }],
    kallio: { name: 'Tuunaus' }, fantasy: { name: 'Jury Rig' } },
  basketful: { char: 'tinker', type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'block', n: 0, scale: 'hand', per: 2 }],
    kallio: { name: 'Korikaupalla' }, fantasy: { name: 'Packed Satchel' } },
  haggle: { char: 'tinker', type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 6 }, { type: 'status', who: 'target', key: 'weak', n: 1 }],
    kallio: { name: 'Tinkiminen' }, fantasy: { name: 'Haggle' } },
  bargain: { char: 'tinker', type: 'attack', cost: 0, target: 'enemy', rarity: 'uncommon', exhaust: true,
    effects: [{ type: 'damage', n: 5 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Tarjous' }, fantasy: { name: 'Bargain' } },
  recycling: { char: 'tinker', type: 'power', cost: 1, target: 'self', rarity: 'rare',
    effects: [{ type: 'status', who: 'self', key: 'findPerTurn', n: 1 }],
    kallio: { name: 'Kierrätys' }, fantasy: { name: 'Endless Pockets' } },
  the_pile: { char: 'tinker', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon',
    effects: [{ type: 'damage', n: 0, scale: 'hand', per: 3 }],
    kallio: { name: 'Kasa' }, fantasy: { name: 'The Heap' } },

  // ─ driver (Reino) — block that hits, and block that stays
  braking: { char: 'driver', type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'block', n: 8 }],
    kallio: { name: 'Jarrutus' }, fantasy: { name: 'Raise Shield' } },
  line_8: { char: 'driver', type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 0, scale: 'block', per: 1 }],
    kallio: { name: 'Linja 8' }, fantasy: { name: 'Shield Bash' } },
  bell: { char: 'driver', type: 'skill', cost: 0, target: 'self', rarity: 'common',
    effects: [{ type: 'block', n: 3 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Kilistys' }, fantasy: { name: 'Rally' } },
  packed_full: { char: 'driver', type: 'skill', cost: 2, target: 'self', rarity: 'uncommon',
    effects: [{ type: 'block', n: 15 }],
    kallio: { name: 'Täyteen pakattu' }, fantasy: { name: 'Iron Wall' } },
  terminus: { char: 'driver', type: 'power', cost: 2, target: 'self', rarity: 'rare',
    effects: [{ type: 'status', who: 'self', key: 'retainBlock', n: 1 }],
    kallio: { name: 'Päätepysäkki' }, fantasy: { name: 'Bulwark' } },
  overtake: { char: 'driver', type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 9 }],
    kallio: { name: 'Ohitus' }, fantasy: { name: 'Lunge' } },
  emergency_brake: { char: 'driver', type: 'attack', cost: 1, target: 'all', rarity: 'uncommon',
    effects: [{ type: 'damage', n: 5 }, { type: 'block', n: 5 }],
    kallio: { name: 'Hätäjarru' }, fantasy: { name: 'Shield Sweep' } },
  timetable: { char: 'driver', type: 'power', cost: 1, target: 'self', rarity: 'uncommon',
    effects: [{ type: 'status', who: 'self', key: 'blockPerTurn', n: 3 }],
    kallio: { name: 'Aikataulu' }, fantasy: { name: 'Vigil' } },

  // ─ neutral — in every character's reward pool
  sisu: { type: 'attack', cost: 1, target: 'enemy', rarity: 'common',
    effects: [{ type: 'damage', n: 8 }],
    kallio: { name: 'Sisu' }, fantasy: { name: 'Resolve' } },
  bicycle: { type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'draw', n: 2 }],
    kallio: { name: 'Fillari' }, fantasy: { name: 'Scout Ahead' } },
  raincoat: { type: 'skill', cost: 1, target: 'self', rarity: 'common',
    effects: [{ type: 'block', n: 7 }],
    kallio: { name: 'Sadetakki' }, fantasy: { name: 'Cloak' } },
  heckle: { type: 'skill', cost: 0, target: 'enemy', rarity: 'uncommon',
    effects: [{ type: 'status', who: 'target', key: 'vulnerable', n: 1 }],
    kallio: { name: 'Huutelu' }, fantasy: { name: 'Taunt' } },
  city_lights: { type: 'attack', cost: 2, target: 'all', rarity: 'uncommon',
    effects: [{ type: 'damage', n: 9 }],
    kallio: { name: 'Kaupungin valot' }, fantasy: { name: 'Starfall' } },
  band_practice: { type: 'skill', cost: 1, target: 'self', rarity: 'rare', exhaust: true,
    effects: [{ type: 'status', who: 'self', key: 'strength', n: 2 }],
    kallio: { name: 'Bänditreenit' }, fantasy: { name: 'Battle Hymn' } },

  // ─ curse — the ticket inspector's fine; it cannot be played and clogs the hand
  fine: { type: 'curse', cost: null, target: 'self', rarity: 'curse', effects: [],
    kallio: { name: 'Sakko' }, fantasy: { name: 'Tithe' } },
};

// ── the roster ───────────────────────────────────────────────────────────
// `look` drives puppet.js: the painted cutout is procedural, so a character is
// a handful of colours and shape switches per theme, not an image.
export const CHARACTERS = {
  barista: {
    hp: 68,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'espresso', 'latte_art'],
    kallio: { name: 'Nita', title: 'barista', blurb: 'Runs the corner café. Caffeine is a temporary strength that fades with the turn.',
      look: { skin: '#e8b898', hair: '#3a2418', hairStyle: 'bun', top: '#2b6b5e', bottom: '#2a2a33', shoes: '#1a1a1f', hat: 'none', prop: 'cup', accent: '#f2c14e' } },
    fantasy: { name: 'Nita', title: 'alchemist', blurb: 'Brews draughts that lend strength for a moment and no longer.',
      look: { skin: '#e8b898', hair: '#3a2418', hairStyle: 'bun', top: '#5a2e6b', bottom: '#2a2233', shoes: '#1a1a1f', hat: 'hood', prop: 'flask', accent: '#8ee0a8' } },
  },
  bassist: {
    hp: 72,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'downbeat', 'pick'],
    kallio: { name: 'Jape', title: 'bassisti', blurb: 'Plays the bar down the street. Every card played this turn makes the next riff louder.',
      look: { skin: '#f0c8a8', hair: '#111111', hairStyle: 'mohawk', top: '#1c1c1c', bottom: '#3b3b8a', shoes: '#8a1c1c', hat: 'none', prop: 'bass', accent: '#e63b7a' } },
    fantasy: { name: 'Jape', title: 'bard', blurb: 'Each verse played this turn makes the next one strike harder.',
      look: { skin: '#f0c8a8', hair: '#111111', hairStyle: 'mohawk', top: '#7a3b1c', bottom: '#3b2a1a', shoes: '#4a2a1a', hat: 'feather', prop: 'lute', accent: '#e6a83b' } },
  },
  tinker: {
    hp: 66,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'rummage', 'tinkering'],
    kallio: { name: 'Kaisa', title: 'kirppistäti', blurb: 'Keeps the flea-market stall. Conjures free Finds into your hand and counts what you are holding.',
      look: { skin: '#dcb090', hair: '#d8d0c0', hairStyle: 'bob', top: '#c95a2a', bottom: '#5a4a3a', shoes: '#3a2a1a', hat: 'beret', prop: 'basket', accent: '#f0a830' } },
    fantasy: { name: 'Kaisa', title: 'tinker', blurb: 'Pockets full of trinkets, and a bag that never quite empties.',
      look: { skin: '#dcb090', hair: '#d8d0c0', hairStyle: 'bob', top: '#4a6b2a', bottom: '#3a3a2a', shoes: '#2a2a1a', hat: 'goggles', prop: 'wrench', accent: '#c0d840' } },
  },
  driver: {
    hp: 78,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'braking', 'line_8'],
    kallio: { name: 'Reino', title: 'ratikkakuski', blurb: 'Drives the 8 tram. Block that hits back, and block that does not wash away.',
      look: { skin: '#e0b090', hair: '#6a6a6a', hairStyle: 'short', top: '#1f4d8f', bottom: '#1a2a4a', shoes: '#111111', hat: 'cap', prop: 'none', accent: '#38b0e8' } },
    fantasy: { name: 'Reino', title: 'knight', blurb: 'A shield that strikes, and a wall that stands from turn to turn.',
      look: { skin: '#e0b090', hair: '#6a6a6a', hairStyle: 'short', top: '#8a8a95', bottom: '#4a4a55', shoes: '#2a2a2a', hat: 'helm', prop: 'shield', accent: '#e0e0f0' } },
  },
};

// ── jokers ───────────────────────────────────────────────────────────────
// Balatro's idea, borrowed whole: a passive that bends the arithmetic of what
// you already do. Kallio calls them friends who tag along; the fantasy skin
// calls them familiars. `effect` is interpreted by engine.js.
export const JOKERS = {
  third_time: { effect: { type: 'nthAttackMult', n: 3, mult: 2 },
    kallio: { name: 'Kolmas kerta', text: 'Every 3rd attack each turn deals ×2.' },
    fantasy: { name: 'Rule of Three', text: 'Every 3rd attack each turn deals ×2.' } },
  kick_drum: { effect: { type: 'attackAddPerPlayed', per: 1 },
    kallio: { name: 'Bassorumpu', text: 'Attacks deal +1 for each card played before them this turn.' },
    fantasy: { name: 'War Drum', text: 'Attacks deal +1 for each card played before them this turn.' } },
  park_bench: { effect: { type: 'blockPerTurn', n: 3 },
    kallio: { name: 'Puistonpenkki', text: 'Gain 3 block at the start of your turn.' },
    fantasy: { name: 'Stone Seat', text: 'Gain 3 block at the start of your turn.' } },
  pigeon_pal: { effect: { type: 'attackAddIfCost', cost: 0, add: 3 },
    kallio: { name: 'Pulukaveri', text: '0-cost attacks deal +3.' },
    fantasy: { name: 'Sparrow', text: '0-cost attacks deal +3.' } },
  double_espresso: { effect: { type: 'energyDraw', energy: 1, draw: -1 },
    kallio: { name: 'Tuplaespresso', text: '+1 energy each turn. Draw 1 fewer card.' },
    fantasy: { name: 'Mana Ring', text: '+1 energy each turn. Draw 1 fewer card.' } },
  summer_holiday: { effect: { type: 'skillBlock', n: 2 },
    kallio: { name: 'Kesäloma', text: 'Skills also give 2 block.' },
    fantasy: { name: 'Blessed Cloak', text: 'Skills also give 2 block.' } },
  karaoke_night: { effect: { type: 'firstAttackMult', mult: 1.5 },
    kallio: { name: 'Karaokeilta', text: 'The first attack each turn deals ×1.5.' },
    fantasy: { name: 'Opening Salvo', text: 'The first attack each turn deals ×1.5.' } },
  terrace: { effect: { type: 'emptyHandBlock', n: 5 },
    kallio: { name: 'Terassi', text: 'End your turn with an empty hand: gain 5 block.' },
    fantasy: { name: 'Last Stand', text: 'End your turn with an empty hand: gain 5 block.' } },
  friend_of_friend: { effect: { type: 'attackAddPerJoker', per: 1 },
    kallio: { name: 'Kaverin kaveri', text: 'Attacks deal +1 for each friend you have.' },
    fantasy: { name: 'Coven', text: 'Attacks deal +1 for each familiar you have.' } },
  flea_find: { effect: { type: 'startFinds', n: 2 },
    kallio: { name: 'Kirppislöytö', text: 'Start each fight with 2 Finds in hand.' },
    fantasy: { name: 'Lucky Pouch', text: 'Start each fight with 2 Trinkets in hand.' } },
  metal_detector: { effect: { type: 'vulnMult', mult: 1.75 },
    kallio: { name: 'Metallinpaljastin', text: 'Vulnerable enemies take ×1.75 instead of ×1.5.' },
    fantasy: { name: 'Divining Rod', text: 'Vulnerable enemies take ×1.75 instead of ×1.5.' } },
  queue: { effect: { type: 'attackAddIfCostAtLeast', cost: 2, add: 4 },
    kallio: { name: 'Jonotus', text: 'Attacks costing 2 or more deal +4.' },
    fantasy: { name: 'Heavy Hand', text: 'Attacks costing 2 or more deal +4.' } },
};

// ── enemies ──────────────────────────────────────────────────────────────
// moves cycle in order from a random start (cycle) or are drawn (random).
// intent is what the telegraph shows; the numbers are exactly what happens.
export const ENEMIES = {
  pigeon: { hp: 12, pattern: 'cycle', scale: 0.62,
    moves: [
      { id: 'peck', intent: 'attack', dmg: 4 },
      { id: 'peck', intent: 'attack', dmg: 4 },
      { id: 'flutter', intent: 'block', block: 5 },
    ],
    kallio: { name: 'Pulu', look: { body: '#7a7f8c', wing: '#5a5f6c', head: '#4a7a5a', beak: '#e0a040', shape: 'bird' } },
    fantasy: { name: 'Bat', look: { body: '#4a3a5a', wing: '#2a1a3a', head: '#5a4a6a', beak: '#e04040', shape: 'bird' } } },
  gull: { hp: 28, pattern: 'cycle', scale: 0.8,
    moves: [
      { id: 'dive', intent: 'attack', dmg: 9 },
      { id: 'snatch', intent: 'debuff', dmg: 5, status: { key: 'weak', n: 1 } },
      { id: 'screech', intent: 'debuff', status: { key: 'vulnerable', n: 1 } },
    ],
    kallio: { name: 'Lokki', look: { body: '#eeeeee', wing: '#9aa0a8', head: '#eeeeee', beak: '#f0c040', shape: 'bird' } },
    fantasy: { name: 'Harpy', look: { body: '#c0a080', wing: '#6a4a3a', head: '#e0b090', beak: '#a0a0a0', shape: 'bird' } } },
  floater: { hp: 40, pattern: 'cycle', scale: 1.0,
    moves: [
      { id: 'bloat', intent: 'buff', block: 8, status: { key: 'strength', n: 2 } },
      { id: 'splash', intent: 'attack', dmg: 7 },
      { id: 'splash', intent: 'attack', dmg: 7 },
    ],
    kallio: { name: 'Kaljakelluja', look: { skin: '#e8a888', hair: '#c08040', hairStyle: 'short', top: '#f0e060', bottom: '#4060a0', shoes: 'none', hat: 'none', prop: 'ring', accent: '#f0e060', shape: 'person' } },
    fantasy: { name: 'Bog Slime', look: { body: '#6aa040', wing: '#4a8030', head: '#8ac050', beak: '#204010', shape: 'blob' } } },
  king: { hp: 34, pattern: 'cycle', scale: 0.95,
    moves: [
      { id: 'sing', intent: 'debuff', status: { key: 'weak', n: 2 } },
      { id: 'hit', intent: 'attack', dmg: 8 },
      { id: 'high_note', intent: 'attack', dmg: 12 },
    ],
    kallio: { name: 'Karaokekunkku', look: { skin: '#e8c0a0', hair: '#1a1a1a', hairStyle: 'quiff', top: '#d0d0d8', bottom: '#202028', shoes: '#101010', hat: 'none', prop: 'mic', accent: '#f0d040', shape: 'person' } },
    fantasy: { name: 'Goblin Shaman', look: { skin: '#7aa050', hair: '#2a3a1a', hairStyle: 'short', top: '#5a3a2a', bottom: '#3a2a1a', shoes: 'none', hat: 'horns', prop: 'staff', accent: '#e05050', shape: 'person' } } },
  inspector: { hp: 60, elite: true, pattern: 'cycle', scale: 1.0,
    moves: [
      { id: 'check', intent: 'curse', addCard: 'fine' },
      { id: 'fine', intent: 'attack', dmg: 10 },
      { id: 'fine', intent: 'attack', dmg: 10 },
      { id: 'clipboard', intent: 'block', block: 10 },
    ],
    kallio: { name: 'Lipuntarkastaja', look: { skin: '#e0b8a0', hair: '#4a3a2a', hairStyle: 'short', top: '#20304a', bottom: '#20304a', shoes: '#101010', hat: 'cap', prop: 'clipboard', accent: '#e0e0e0', shape: 'person' } },
    fantasy: { name: 'Tax Collector', look: { skin: '#e0b8a0', hair: '#4a3a2a', hairStyle: 'short', top: '#3a1a3a', bottom: '#2a1a2a', shoes: '#101010', hat: 'hood', prop: 'ledger', accent: '#e0c040', shape: 'person' } } },
  bouncer: { hp: 120, boss: true, pattern: 'cycle', scale: 1.18,
    moves: [
      { id: 'shove', intent: 'attack', dmg: 16 },
      { id: 'plant', intent: 'buff', block: 15, status: { key: 'strength', n: 2 } },
      { id: 'one_two', intent: 'attack', dmg: 8, times: 2 },
      { id: 'the_list', intent: 'debuff', status: { key: 'vulnerable', n: 2 }, status2: { key: 'weak', n: 2 } },
    ],
    kallio: { name: 'Portsari', look: { skin: '#d8a888', hair: '#101010', hairStyle: 'bald', top: '#101014', bottom: '#101014', shoes: '#000000', hat: 'none', prop: 'earpiece', accent: '#e03030', shape: 'person' } },
    fantasy: { name: 'Gate Golem', look: { skin: '#8a8a90', hair: '#606068', hairStyle: 'bald', top: '#5a5a62', bottom: '#4a4a52', shoes: '#303038', hat: 'none', prop: 'none', accent: '#40c0e0', shape: 'person' } } },
};

// ── the run ──────────────────────────────────────────────────────────────
// Six fights on a straight line — a map comes later, and a map in front of
// the same fight is a menu, not more game. `reward` names what follows.
export const ENCOUNTERS = [
  { id: 'flock', enemies: ['pigeon', 'pigeon', 'pigeon'], reward: ['card', 'joker'],
    kallio: { name: 'Puluparvi' }, fantasy: { name: 'A Flutter of Bats' } },
  { id: 'gull_and_pigeon', enemies: ['gull', 'pigeon'], reward: ['card'],
    kallio: { name: 'Lokki ja pulu' }, fantasy: { name: 'Harpy and Bat' } },
  { id: 'floater', enemies: ['floater'], reward: ['card', 'joker'],
    kallio: { name: 'Kaljakelluja' }, fantasy: { name: 'Bog Slime' } },
  { id: 'karaoke', enemies: ['king', 'gull'], reward: ['card'],
    kallio: { name: 'Karaokeilta' }, fantasy: { name: 'Shaman’s Chant' } },
  { id: 'inspection', enemies: ['inspector'], reward: ['card', 'joker'],
    kallio: { name: 'Lipuntarkastus' }, fantasy: { name: 'The Collector' } },
  { id: 'door', enemies: ['bouncer'], reward: [],
    kallio: { name: 'Ovella' }, fantasy: { name: 'The Gate' } },
];

export const THEMES = {
  kallio: { name: 'Kallio', jokerWord: 'friends', findWord: 'Find', energyWord: 'energy',
    park: { sky: ['#8fc3ee', '#dbeeff'], canopy: ['#3f8a3a', '#68b04a', '#a9d45a'], grass: '#7cb44a', path: '#d9c9a6', stone: '#8f8f8a', bench: '#8a5a32', iron: '#2c2c30' } },
  fantasy: { name: 'Fantasy', jokerWord: 'familiars', findWord: 'Trinket', energyWord: 'mana',
    park: { sky: ['#5a6fb0', '#e8c8a0'], canopy: ['#2f6a4a', '#4a9a5a', '#9ad46a'], grass: '#5f9a4a', path: '#c9b596', stone: '#7a7a80', bench: '#6a4a32', iron: '#2c2c30' } },
};

export const RULES = {
  energy: 3,
  draw: 5,
  handMax: 10,
  jokerMax: 5,
  healAfterFight: 8,
  vulnerable: 1.5,
  weak: 0.75,
};
