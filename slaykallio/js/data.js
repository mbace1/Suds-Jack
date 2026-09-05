// Slay Kallio — everything the game is made of, as data.
//
// The engine (engine.js) reads ids out of these tables and knows nothing about
// "a bottle collector" or "a rat"; a new character, card, friend or enemy is a
// new entry here, never a rebuild.
//
// EVERYTHING PLAYER-FACING IS IN ENGLISH (owner, 2026-09-04). Personal names
// stay as they are — a name is not a language — but every title, card name and
// line of text is English in both skins.
//
// `pic` names a drawing in cardart.js. Every card has one: a card with only
// words on it is a spreadsheet row, and this game is about a hand you read at
// a glance.

// ── cards ────────────────────────────────────────────────────────────────
// type: attack | skill | power | curse    target: enemy | all | self
// effects — the vocabulary engine.js understands:
//   damage {n, times, scale, per}   scale: played | block | hand | finds | jokers
//   block  {n, scale, per}
//   status {who: self|target|all, key, n}
//   draw {n} · energy {n} · addCard {id, n} · heal {n}
export const CARDS = {
  // the two basics every deck starts on
  strike: { type: 'attack', cost: 1, target: 'enemy', rarity: 'basic', pic: 'fist', effects: [{ type: 'damage', n: 6 }],
    kallio: { name: 'Swing' }, fantasy: { name: 'Strike' } },
  defend: { type: 'skill', cost: 1, target: 'self', rarity: 'basic', pic: 'cardboard', effects: [{ type: 'block', n: 5 }],
    kallio: { name: 'Cover Up' }, fantasy: { name: 'Defend' } },

  // ─ Late, the park drinker — Buzz: strength that fades at the end of the turn
  first_sip: { char: 'drinker', type: 'skill', cost: 0, target: 'self', exhaust: true, rarity: 'common', pic: 'can',
    effects: [{ type: 'energy', n: 1 }, { type: 'status', who: 'self', key: 'buzz', n: 2 }],
    kallio: { name: 'First Sip' }, fantasy: { name: 'Quicksilver Draught' } },
  one_two: { char: 'drinker', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'twofist',
    effects: [{ type: 'damage', n: 4, times: 2 }],
    kallio: { name: 'One-Two' }, fantasy: { name: 'Twin Blows' } },
  steady_hand: { char: 'drinker', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'hand',
    effects: [{ type: 'block', n: 7 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Steady Hand' }, fantasy: { name: 'Steady Hand' } },
  bottle_first: { char: 'drinker', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', pic: 'bottlebreak',
    effects: [{ type: 'damage', n: 11 }, { type: 'status', who: 'target', key: 'vulnerable', n: 2 }],
    kallio: { name: 'Bottle First' }, fantasy: { name: 'Acid Flask' } },
  one_more: { char: 'drinker', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'can',
    effects: [{ type: 'draw', n: 2 }, { type: 'status', who: 'self', key: 'buzz', n: 1 }],
    kallio: { name: 'One More' }, fantasy: { name: 'Second Dose' } },
  spit_take: { char: 'drinker', type: 'attack', cost: 1, target: 'all', rarity: 'uncommon', pic: 'spray',
    effects: [{ type: 'damage', n: 5 }],
    kallio: { name: 'Spit Take' }, fantasy: { name: 'Caustic Spray' } },
  see_double: { char: 'drinker', type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', pic: 'double',
    effects: [{ type: 'status', who: 'self', key: 'doubleNext', n: 1 }],
    kallio: { name: 'Seeing Double' }, fantasy: { name: 'Catalyst' } },
  never_sober: { char: 'drinker', type: 'power', cost: 2, target: 'self', rarity: 'rare', pic: 'sunburst',
    effects: [{ type: 'status', who: 'self', key: 'buzzPerTurn', n: 2 }],
    kallio: { name: 'Never Sober' }, fantasy: { name: 'Endless Cup' } },

  // ─ Ilona, the busker — cards grow with every card played before them
  first_chord: { char: 'busker', type: 'attack', cost: 0, target: 'enemy', rarity: 'common', pic: 'guitar',
    effects: [{ type: 'damage', n: 3, scale: 'played', per: 2 }],
    kallio: { name: 'First Chord' }, fantasy: { name: 'Opening Chord' } },
  busk: { char: 'busker', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'guitar',
    effects: [{ type: 'damage', n: 7 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Play It Loud' }, fantasy: { name: 'Sharp Verse' } },
  hat_out: { char: 'busker', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'hat',
    effects: [{ type: 'block', n: 5, scale: 'played', per: 2 }],
    kallio: { name: 'Hat Out' }, fantasy: { name: 'Refrain' } },
  encore: { char: 'busker', type: 'attack', cost: 2, target: 'enemy', rarity: 'rare', pic: 'crowd',
    effects: [{ type: 'damage', n: 4, scale: 'played', per: 4 }],
    kallio: { name: 'Encore' }, fantasy: { name: 'Crescendo' } },
  last_string: { char: 'busker', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', pic: 'string',
    effects: [{ type: 'damage', n: 14 }],
    kallio: { name: 'Last String' }, fantasy: { name: 'Thunder Note' } },
  the_groove: { char: 'busker', type: 'power', cost: 1, target: 'self', rarity: 'rare', pic: 'note',
    effects: [{ type: 'status', who: 'self', key: 'groove', n: 1 }],
    kallio: { name: 'The Groove' }, fantasy: { name: 'Rhythm of War' } },
  out_of_tune: { char: 'busker', type: 'skill', cost: 1, target: 'all', rarity: 'uncommon', pic: 'noise',
    effects: [{ type: 'block', n: 4 }, { type: 'status', who: 'all', key: 'weak', n: 1 }],
    kallio: { name: 'Out Of Tune' }, fantasy: { name: 'Dirge' } },
  tune_up: { char: 'busker', type: 'skill', cost: 0, target: 'self', rarity: 'common', pic: 'note',
    effects: [{ type: 'draw', n: 1 }],
    kallio: { name: 'Tune Up' }, fantasy: { name: 'Grace Note' } },

  // ─ Roope, the bottle collector — Bottles: 0-cost tokens, and a counted hand
  bottle_glass: { type: 'attack', cost: 0, target: 'enemy', rarity: 'token', find: true, exhaust: true, pic: 'bottle',
    effects: [{ type: 'damage', n: 3 }],
    kallio: { name: 'Bottle: Glass' }, fantasy: { name: 'Trinket: Shard' } },
  bottle_can: { type: 'skill', cost: 0, target: 'self', rarity: 'token', find: true, exhaust: true, pic: 'can',
    effects: [{ type: 'block', n: 3 }],
    kallio: { name: 'Bottle: Can' }, fantasy: { name: 'Trinket: Charm' } },
  bottle_deposit: { type: 'skill', cost: 0, target: 'self', rarity: 'token', find: true, exhaust: true, pic: 'coin',
    effects: [{ type: 'energy', n: 1 }],
    kallio: { name: 'Bottle: Deposit' }, fantasy: { name: 'Trinket: Spark' } },
  dig_the_bin: { char: 'collector', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'bin',
    effects: [{ type: 'addCard', id: 'find', n: 2 }],
    kallio: { name: 'Dig The Bin' }, fantasy: { name: 'Rummage' } },
  full_bag: { char: 'collector', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'bag',
    effects: [{ type: 'damage', n: 5, scale: 'finds', per: 3 }],
    kallio: { name: 'Full Bag' }, fantasy: { name: 'Jury Rig' } },
  armful: { char: 'collector', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'bag',
    effects: [{ type: 'block', n: 0, scale: 'hand', per: 2 }],
    kallio: { name: 'Armful' }, fantasy: { name: 'Packed Satchel' } },
  shove_off: { char: 'collector', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'shove',
    effects: [{ type: 'damage', n: 6 }, { type: 'status', who: 'target', key: 'weak', n: 1 }],
    kallio: { name: 'Shove Off' }, fantasy: { name: 'Haggle' } },
  quick_score: { char: 'collector', type: 'attack', cost: 0, target: 'enemy', rarity: 'uncommon', exhaust: true, pic: 'coin',
    effects: [{ type: 'damage', n: 5 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Quick Score' }, fantasy: { name: 'Bargain' } },
  the_route: { char: 'collector', type: 'power', cost: 1, target: 'self', rarity: 'rare', pic: 'bin',
    effects: [{ type: 'status', who: 'self', key: 'findPerTurn', n: 1 }],
    kallio: { name: 'The Route' }, fantasy: { name: 'Endless Pockets' } },
  whole_haul: { char: 'collector', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', pic: 'haul',
    effects: [{ type: 'damage', n: 0, scale: 'hand', per: 3 }],
    kallio: { name: 'The Whole Haul' }, fantasy: { name: 'The Heap' } },

  // ─ Vekku, the cart pusher — block that hits, and block that stays
  dig_in: { char: 'cart', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'cart',
    effects: [{ type: 'block', n: 8 }],
    kallio: { name: 'Dig In' }, fantasy: { name: 'Raise Shield' } },
  ram_it: { char: 'cart', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'cart',
    effects: [{ type: 'damage', n: 0, scale: 'block', per: 1 }],
    kallio: { name: 'Ram It' }, fantasy: { name: 'Shield Bash' } },
  rattle: { char: 'cart', type: 'skill', cost: 0, target: 'self', rarity: 'common', pic: 'rattle',
    effects: [{ type: 'block', n: 3 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Rattle' }, fantasy: { name: 'Rally' } },
  loaded_high: { char: 'cart', type: 'skill', cost: 2, target: 'self', rarity: 'uncommon', pic: 'stack',
    effects: [{ type: 'block', n: 15 }],
    kallio: { name: 'Loaded High' }, fantasy: { name: 'Iron Wall' } },
  parked: { char: 'cart', type: 'power', cost: 2, target: 'self', rarity: 'rare', pic: 'stack',
    effects: [{ type: 'status', who: 'self', key: 'retainBlock', n: 1 }],
    kallio: { name: 'Parked For Good' }, fantasy: { name: 'Bulwark' } },
  run_them_down: { char: 'cart', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'cart',
    effects: [{ type: 'damage', n: 9 }],
    kallio: { name: 'Run Them Down' }, fantasy: { name: 'Lunge' } },
  wide_load: { char: 'cart', type: 'attack', cost: 1, target: 'all', rarity: 'uncommon', pic: 'sweep',
    effects: [{ type: 'damage', n: 5 }, { type: 'block', n: 5 }],
    kallio: { name: 'Wide Load' }, fantasy: { name: 'Shield Sweep' } },
  pack_it_tight: { char: 'cart', type: 'power', cost: 1, target: 'self', rarity: 'uncommon', pic: 'cardboard',
    effects: [{ type: 'status', who: 'self', key: 'blockPerTurn', n: 3 }],
    kallio: { name: 'Pack It Tight' }, fantasy: { name: 'Vigil' } },

  // ─ neutral — in every character's reward pool
  grit: { type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'fist',
    effects: [{ type: 'damage', n: 8 }],
    kallio: { name: 'Grit' }, fantasy: { name: 'Resolve' } },
  short_cut: { type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'bridge',
    effects: [{ type: 'draw', n: 2 }],
    kallio: { name: 'Short Cut' }, fantasy: { name: 'Scout Ahead' } },
  wet_coat: { type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'coat',
    effects: [{ type: 'block', n: 7 }],
    kallio: { name: 'Wet Coat' }, fantasy: { name: 'Cloak' } },
  bad_mouth: { type: 'skill', cost: 0, target: 'enemy', rarity: 'uncommon', pic: 'shout',
    effects: [{ type: 'status', who: 'target', key: 'vulnerable', n: 1 }],
    kallio: { name: 'Bad Mouth' }, fantasy: { name: 'Taunt' } },
  streetlight: { type: 'attack', cost: 2, target: 'all', rarity: 'uncommon', pic: 'lamp',
    effects: [{ type: 'damage', n: 9 }],
    kallio: { name: 'Streetlight' }, fantasy: { name: 'Starfall' } },
  old_days: { type: 'skill', cost: 1, target: 'self', rarity: 'rare', exhaust: true, pic: 'sunburst',
    effects: [{ type: 'status', who: 'self', key: 'strength', n: 2 }],
    kallio: { name: 'The Old Days' }, fantasy: { name: 'Battle Hymn' } },

  // ─ curse — cannot be played, clogs the hand
  soaked: { type: 'curse', cost: null, target: 'self', rarity: 'curse', pic: 'rain', effects: [],
    kallio: { name: 'Soaked' }, fantasy: { name: 'Soaked' } },
};

// ── the roster — four Kallio bums ────────────────────────────────────────
// `look` drives puppet.js. Everything is worn: layered coats, tape, mismatched
// boots. `base` picks what the cutout is stuck to — a tin soldier's oval or a
// cardboard wedge with tape over the feet.
export const CHARACTERS = {
  drinker: {
    hp: 68,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'first_sip', 'one_two'],
    kallio: { name: 'Late', title: 'the park drinker', blurb: 'Holds the north end of the bridge. The drink is a strength that lasts exactly one turn.',
      look: { skin: '#c09070', hair: '#5a4632', hairStyle: 'lank', top: '#4a5236', under: '#22242a', bottom: '#2a3040', stripe: '#d8d4c4', shoes: '#26241f', shoeStyle: 'clog', hat: 'bucket', hatColor: '#d8b53a', smoke: true, prop: 'can', accent: '#d8b53a', base: 'tin', grime: 0.85 } },
    fantasy: { name: 'Late', title: 'the sot', blurb: 'A draught that lends strength for a moment and no longer.',
      look: { skin: '#c89878', hair: '#4a3a2a', hairStyle: 'greasy', top: '#4a3050', bottom: '#2e2838', shoes: '#241c16', hat: 'hood', prop: 'flask', accent: '#7ac89a', base: 'tin', grime: 0.7 } },
  },
  busker: {
    hp: 72,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'first_chord', 'tune_up'],
    kallio: { name: 'Ilona', title: 'the busker', blurb: 'Plays the underpass for change. Every card played this turn makes the next one land harder.',
      look: { skin: '#d0a284', hair: '#2a1a12', hairStyle: 'tangle', top: '#6a3628', bottom: '#3a3448', shoes: '#4a2a20', hat: 'beanie', prop: 'guitar', accent: '#c05a3a', base: 'card', grime: 0.6 } },
    fantasy: { name: 'Ilona', title: 'the bard', blurb: 'Each verse played this turn makes the next one strike harder.',
      look: { skin: '#d0a284', hair: '#2a1a12', hairStyle: 'tangle', top: '#7a4a22', bottom: '#3a2c1c', shoes: '#4a2a20', hat: 'feather', prop: 'lute', accent: '#c8963a', base: 'card', grime: 0.5 } },
  },
  collector: {
    hp: 66,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'dig_the_bin', 'full_bag'],
    kallio: { name: 'Roope', title: 'the bottle collector', blurb: 'Works the bins ahead of everyone. Free Bottles into your hand, and cards that count what you are holding.',
      look: { skin: '#bc8e70', hair: '#8a8478', hairStyle: 'bald', top: '#5a6a4a', bottom: '#453c30', shoes: '#2a2018', hat: 'cap', prop: 'bag', accent: '#8aa03a', base: 'card', grime: 0.9 } },
    fantasy: { name: 'Roope', title: 'the tinker', blurb: 'Pockets full of trinkets, and a bag that never quite empties.',
      look: { skin: '#bc8e70', hair: '#8a8478', hairStyle: 'bald', top: '#40603a', bottom: '#35402c', shoes: '#2a2018', hat: 'cap', prop: 'bag', accent: '#a8c04a', base: 'card', grime: 0.8 } },
  },
  cart: {
    hp: 78,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'dig_in', 'ram_it'],
    kallio: { name: 'Vekku', title: 'the cart pusher', blurb: 'Everything he owns is in the trolley. Block that hits back, and block that does not wash off.',
      look: { skin: '#c09070', hair: '#6a6058', hairStyle: 'shaggy', top: '#3a4a5a', bottom: '#2e3440', shoes: '#1c1c20', hat: 'none', prop: 'cart', accent: '#5a90b0', base: 'tin', grime: 0.85 } },
    fantasy: { name: 'Vekku', title: 'the warden', blurb: 'A shield that strikes, and a wall that stands from turn to turn.',
      look: { skin: '#c09070', hair: '#6a6058', hairStyle: 'shaggy', top: '#6a6a72', bottom: '#40404a', shoes: '#1c1c20', hat: 'helm', prop: 'shield', accent: '#b0b8c8', base: 'tin', grime: 0.7 } },
  },
};

// ── friends ──────────────────────────────────────────────────────────────
// Balatro's idea: a passive that bends the arithmetic of what you already do.
export const JOKERS = {
  third_time: { effect: { type: 'nthAttackMult', n: 3, mult: 2 },
    kallio: { name: 'Third Time', text: 'Every 3rd attack each turn deals ×2.' },
    fantasy: { name: 'Rule of Three', text: 'Every 3rd attack each turn deals ×2.' } },
  drum_kid: { effect: { type: 'attackAddPerPlayed', per: 1 },
    kallio: { name: 'Bucket Drummer', text: 'Attacks deal +1 for each card played before them this turn.' },
    fantasy: { name: 'War Drum', text: 'Attacks deal +1 for each card played before them this turn.' } },
  the_plank: { effect: { type: 'blockPerTurn', n: 3 },
    kallio: { name: 'Loose Plank', text: 'Gain 3 block at the start of your turn.' },
    fantasy: { name: 'Loose Stone', text: 'Gain 3 block at the start of your turn.' } },
  pigeon_pal: { effect: { type: 'attackAddIfCost', cost: 0, add: 3 },
    kallio: { name: 'Pigeon Pal', text: '0-cost attacks deal +3.' },
    fantasy: { name: 'Sparrow', text: '0-cost attacks deal +3.' } },
  morning_can: { effect: { type: 'energyDraw', energy: 1, draw: -1 },
    kallio: { name: 'Morning Can', text: '+1 energy each turn. Draw 1 fewer card.' },
    fantasy: { name: 'Mana Ring', text: '+1 energy each turn. Draw 1 fewer card.' } },
  dry_socks: { effect: { type: 'skillBlock', n: 2 },
    kallio: { name: 'Dry Socks', text: 'Skills also give 2 block.' },
    fantasy: { name: 'Blessed Cloak', text: 'Skills also give 2 block.' } },
  first_light: { effect: { type: 'firstAttackMult', mult: 1.5 },
    kallio: { name: 'First Light', text: 'The first attack each turn deals ×1.5.' },
    fantasy: { name: 'Opening Salvo', text: 'The first attack each turn deals ×1.5.' } },
  empty_hands: { effect: { type: 'emptyHandBlock', n: 5 },
    kallio: { name: 'Empty Hands', text: 'End your turn with an empty hand: gain 5 block.' },
    fantasy: { name: 'Last Stand', text: 'End your turn with an empty hand: gain 5 block.' } },
  the_crew: { effect: { type: 'attackAddPerJoker', per: 1 },
    kallio: { name: 'The Crew', text: 'Attacks deal +1 for each friend you have.' },
    fantasy: { name: 'Coven', text: 'Attacks deal +1 for each familiar you have.' } },
  good_bin: { effect: { type: 'startFinds', n: 2 },
    kallio: { name: 'A Good Bin', text: 'Start each fight with 2 Bottles in hand.' },
    fantasy: { name: 'Lucky Pouch', text: 'Start each fight with 2 Trinkets in hand.' } },
  sharp_eye: { effect: { type: 'vulnMult', mult: 1.75 },
    kallio: { name: 'Sharp Eye', text: 'Vulnerable enemies take ×1.75 instead of ×1.5.' },
    fantasy: { name: 'Divining Rod', text: 'Vulnerable enemies take ×1.75 instead of ×1.5.' } },
  slow_swing: { effect: { type: 'attackAddIfCostAtLeast', cost: 2, add: 4 },
    kallio: { name: 'Slow Swing', text: 'Attacks costing 2 or more deal +4.' },
    fantasy: { name: 'Heavy Hand', text: 'Attacks costing 2 or more deal +4.' } },
};

// ── enemies ──────────────────────────────────────────────────────────────
// Rats, mutating blobs, and rival bums — owner's list, 2026-09-04. Rats are
// small and quick, blobs change what they are between turns, and a rival is
// another cardboard cutout the same size as you.
export const ENEMIES = {
  rat: { hp: 12, pattern: 'cycle', scale: 0.5,
    moves: [
      { id: 'bite', intent: 'attack', dmg: 4 },
      { id: 'bite', intent: 'attack', dmg: 4 },
      { id: 'skitter', intent: 'block', block: 5 },
    ],
    kallio: { name: 'Rat', look: { body: '#5a4a3e', wing: '#443830', head: '#6a5648', beak: '#c08878', shape: 'rat' } },
    fantasy: { name: 'Imp', look: { body: '#5a3a4a', wing: '#3a2434', head: '#6a4458', beak: '#c85a5a', shape: 'rat' } } },
  bin_rat: { hp: 28, pattern: 'cycle', scale: 0.72,
    moves: [
      { id: 'lunge', intent: 'attack', dmg: 9 },
      { id: 'gnaw', intent: 'debuff', dmg: 5, status: { key: 'weak', n: 1 } },
      { id: 'screech', intent: 'debuff', status: { key: 'vulnerable', n: 1 } },
    ],
    kallio: { name: 'Bin Rat', look: { body: '#6a5a48', wing: '#4a3e32', head: '#7a6650', beak: '#c89078', shape: 'rat' } },
    fantasy: { name: 'Dire Imp', look: { body: '#6a4a58', wing: '#48303c', head: '#7a5468', beak: '#d06a6a', shape: 'rat' } } },
  blob: { hp: 40, pattern: 'cycle', scale: 0.95,
    moves: [
      { id: 'mutate', intent: 'buff', block: 8, status: { key: 'strength', n: 2 } },
      { id: 'slap', intent: 'attack', dmg: 7 },
      { id: 'slap', intent: 'attack', dmg: 7 },
    ],
    kallio: { name: 'Mutating Blob', look: { body: '#6a7a3a', wing: '#4a5a28', head: '#8a9a4a', beak: '#2a3410', shape: 'blob' } },
    fantasy: { name: 'Bog Ooze', look: { body: '#4a7a5a', wing: '#2e5a3c', head: '#6a9a6a', beak: '#1a3418', shape: 'blob' } } },
  rival: { hp: 34, pattern: 'cycle', scale: 0.92,
    moves: [
      { id: 'jeer', intent: 'debuff', status: { key: 'weak', n: 2 } },
      { id: 'swing', intent: 'attack', dmg: 8 },
      { id: 'haymaker', intent: 'attack', dmg: 12 },
    ],
    kallio: { name: 'Rival Bum', look: { skin: '#c08a68', hair: '#3a2e24', hairStyle: 'tangle', top: '#5a4a3a', bottom: '#3a3630', shoes: '#241c16', hat: 'beanie', prop: 'bottle', accent: '#a06a3a', base: 'card', grime: 0.9, shape: 'person' } },
    fantasy: { name: 'Bandit', look: { skin: '#b08a60', hair: '#2a2018', hairStyle: 'tangle', top: '#4a3a2a', bottom: '#332c22', shoes: '#241c16', hat: 'hood', prop: 'bottle', accent: '#8a5a2a', base: 'card', grime: 0.7, shape: 'person' } } },
  boss_rat: { hp: 60, elite: true, pattern: 'cycle', scale: 1.0,
    moves: [
      { id: 'drag', intent: 'curse', addCard: 'soaked' },
      { id: 'maul', intent: 'attack', dmg: 10 },
      { id: 'maul', intent: 'attack', dmg: 10 },
      { id: 'burrow', intent: 'block', block: 10 },
    ],
    kallio: { name: 'The King Rat', look: { body: '#7a6248', wing: '#544434', head: '#8a7050', beak: '#d0a080', shape: 'rat' } },
    fantasy: { name: 'Imp Lord', look: { body: '#7a5060', wing: '#523646', head: '#8a5a6e', beak: '#e07070', shape: 'rat' } } },
  bridge_king: { hp: 120, boss: true, pattern: 'cycle', scale: 1.15,
    moves: [
      { id: 'shove', intent: 'attack', dmg: 16 },
      { id: 'plant', intent: 'buff', block: 15, status: { key: 'strength', n: 2 } },
      { id: 'one_two', intent: 'attack', dmg: 8, times: 2 },
      { id: 'the_word', intent: 'debuff', status: { key: 'vulnerable', n: 2 }, status2: { key: 'weak', n: 2 } },
    ],
    kallio: { name: 'The Bridge King', look: { skin: '#c09070', hair: '#1a1814', hairStyle: 'slick', top: '#c4bda6', under: '#1a1814', bottom: '#bab392', shoes: '#141210', hat: 'none', chain: true, heavy: true, prop: 'plank', accent: '#c8a83a', base: 'tin', grime: 0.55, shape: 'person' } },
    fantasy: { name: 'The Gate Troll', look: { skin: '#7a8a6a', hair: '#2a3020', hairStyle: 'bald', top: '#4a4438', bottom: '#3a382e', shoes: '#161412', hat: 'horns', prop: 'plank', accent: '#c85a3a', base: 'tin', grime: 0.9, shape: 'person' } } },
};

// ── the run ──────────────────────────────────────────────────────────────
export const ENCOUNTERS = [
  { id: 'rats', enemies: ['rat', 'rat', 'rat'], reward: ['card', 'joker'],
    kallio: { name: 'Rats Under The Deck' }, fantasy: { name: 'A Nest Of Imps' } },
  { id: 'bin', enemies: ['bin_rat', 'rat'], reward: ['card'],
    kallio: { name: 'The Bin Rat' }, fantasy: { name: 'The Dire Imp' } },
  { id: 'blob', enemies: ['blob'], reward: ['card', 'joker'],
    kallio: { name: 'Something In The Water' }, fantasy: { name: 'The Bog Ooze' } },
  { id: 'rivals', enemies: ['rival', 'rat'], reward: ['card'],
    kallio: { name: 'Somebody Else’s Spot' }, fantasy: { name: 'Bandits On The Span' } },
  { id: 'king_rat', enemies: ['boss_rat'], reward: ['card', 'joker'],
    kallio: { name: 'The King Rat' }, fantasy: { name: 'The Imp Lord' } },
  { id: 'bridge', enemies: ['bridge_king'], reward: [],
    kallio: { name: 'Who Owns The Bridge' }, fantasy: { name: 'Who Holds The Span' } },
];

// The park, in the two skins. Grittier than a postcard: the greens are
// weathered, the light is late and low, and nothing is saturated.
export const THEMES = {
  kallio: { name: 'Kallio', jokerWord: 'friends', findWord: 'Bottle', energyWord: 'energy',
    park: { sky: ['#6f7f88', '#cbb9a0'], canopy: ['#2b3a26', '#3f5230', '#5d7038'], grass: '#4e5a34', path: '#8a7f6a', stone: '#6a6660', bench: '#8a7053', iron: '#2a2724', water: '#3a4448' } },
  fantasy: { name: 'Fantasy', jokerWord: 'familiars', findWord: 'Trinket', energyWord: 'mana',
    park: { sky: ['#4a5070', '#b89878'], canopy: ['#22321f', '#33482c', '#4a6034'], grass: '#3f5030', path: '#7a705e', stone: '#5e5a56', bench: '#76603f', iron: '#26231f', water: '#2e3a44' } },
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
