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
//          keys: vulnerable weak strength buzz doubleNext frail thorns fetch
//          powers (self only): buzzPerTurn findPerTurn blockPerTurn retainBlock
//                 groove thornsPerTurn keepFetch drawPerTurn strengthPerTurn energyPerTurn
//   draw {n} · energy {n} · addCard {id, n} · heal {n} · loseHp {n}
//   scale: played | block | hand | finds | jokers | buzz | discard | struck | fetch | missing
// `up` is never written here: an upgraded card is the same card with its
// numbers moved by engine.upgrade(), so no card needs a second version.
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
    effects: [{ type: 'damage', n: 4 }],
    kallio: { name: 'Bottle: Glass' }, fantasy: { name: 'Trinket: Shard' } },
  bottle_can: { type: 'skill', cost: 0, target: 'self', rarity: 'token', find: true, exhaust: true, pic: 'can',
    effects: [{ type: 'block', n: 4 }],
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
    effects: [{ type: 'block', n: 0, scale: 'hand', per: 3 }],
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

  // ─ Late, second wave
  hair_of_dog: { char: 'drinker', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'can',
    effects: [{ type: 'status', who: 'self', key: 'buzz', n: 3 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Hair Of The Dog' }, fantasy: { name: 'Bitter Tonic' } },
  last_call: { char: 'drinker', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', pic: 'sunburst',
    effects: [{ type: 'damage', n: 6, scale: 'buzz', per: 2 }],
    kallio: { name: 'Last Call' }, fantasy: { name: 'Fever Strike' } },
  pour_one_out: { char: 'drinker', type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', exhaust: true, pic: 'bottle',
    effects: [{ type: 'heal', n: 4 }, { type: 'status', who: 'self', key: 'buzz', n: 2 }],
    kallio: { name: 'Pour One Out' }, fantasy: { name: 'Libation' } },
  stumble: { char: 'drinker', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'shove',
    effects: [{ type: 'damage', n: 10 }, { type: 'status', who: 'self', key: 'weak', n: 1 }],
    kallio: { name: 'Stumble Into Them' }, fantasy: { name: 'Reckless Lunge' } },
  blackout: { char: 'drinker', type: 'attack', cost: 3, target: 'enemy', rarity: 'rare', exhaust: true, pic: 'bottlebreak',
    effects: [{ type: 'damage', n: 26 }],
    kallio: { name: 'Blackout' }, fantasy: { name: 'Oblivion' } },

  // ─ Ilona, second wave
  chorus: { char: 'busker', type: 'attack', cost: 1, target: 'enemy', rarity: 'uncommon', pic: 'crowd',
    effects: [{ type: 'damage', n: 2, times: 2, scale: 'played', per: 1 }],
    kallio: { name: 'Chorus' }, fantasy: { name: 'Refrain Of Blades' } },
  pass_the_hat: { char: 'busker', type: 'skill', cost: 0, target: 'self', rarity: 'common', pic: 'hat',
    effects: [{ type: 'block', n: 0, scale: 'played', per: 2 }],
    kallio: { name: 'Pass The Hat' }, fantasy: { name: 'Collection' } },
  open_mic: { char: 'busker', type: 'power', cost: 2, target: 'self', rarity: 'rare', pic: 'note',
    effects: [{ type: 'status', who: 'self', key: 'drawPerTurn', n: 1 }],
    kallio: { name: 'Open Mic' }, fantasy: { name: 'Endless Verse' } },
  feedback: { char: 'busker', type: 'attack', cost: 1, target: 'all', rarity: 'uncommon', pic: 'noise',
    effects: [{ type: 'damage', n: 3, scale: 'played', per: 1 }],
    kallio: { name: 'Feedback' }, fantasy: { name: 'Discord' } },
  finale: { char: 'busker', type: 'attack', cost: 3, target: 'enemy', rarity: 'rare', exhaust: true, pic: 'crowd',
    effects: [{ type: 'damage', n: 10, scale: 'played', per: 3 }],
    kallio: { name: 'Finale' }, fantasy: { name: 'Coda' } },

  // ─ Roope, second wave
  cash_in: { char: 'collector', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'coin',
    effects: [{ type: 'damage', n: 3, scale: 'hand', per: 2 }],
    kallio: { name: 'Cash In' }, fantasy: { name: 'Appraise' } },
  sort_it: { char: 'collector', type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', pic: 'bin',
    effects: [{ type: 'draw', n: 2 }, { type: 'addCard', id: 'find', n: 1 }],
    kallio: { name: 'Sort It Out' }, fantasy: { name: 'Take Stock' } },
  deposit_run: { char: 'collector', type: 'skill', cost: 0, target: 'self', rarity: 'common', pic: 'coin',
    effects: [{ type: 'addCard', id: 'find', n: 1 }],
    kallio: { name: 'Deposit Run' }, fantasy: { name: 'Pocket Something' } },
  hoard: { char: 'collector', type: 'skill', cost: 2, target: 'self', rarity: 'uncommon', pic: 'haul',
    effects: [{ type: 'block', n: 4, scale: 'hand', per: 2 }],
    kallio: { name: 'Hoard' }, fantasy: { name: 'Barricade Of Junk' } },
  trolley_full: { char: 'collector', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', pic: 'haul',
    effects: [{ type: 'damage', n: 8, scale: 'finds', per: 4 }],
    kallio: { name: 'Trolley Full' }, fantasy: { name: 'Loaded Satchel' } },

  // ─ Vekku, second wave
  brace: { char: 'cart', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'cart',
    effects: [{ type: 'block', n: 6 }, { type: 'status', who: 'self', key: 'thorns', n: 2 }],
    kallio: { name: 'Brace' }, fantasy: { name: 'Spiked Guard' } },
  barricade: { char: 'cart', type: 'skill', cost: 2, target: 'self', rarity: 'uncommon', pic: 'stack',
    effects: [{ type: 'block', n: 12 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Barricade' }, fantasy: { name: 'Shield Wall' } },
  overloaded: { char: 'cart', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', pic: 'sweep',
    effects: [{ type: 'damage', n: 4, scale: 'block', per: 1 }],
    kallio: { name: 'Overloaded' }, fantasy: { name: 'Crushing Charge' } },
  push_through: { char: 'cart', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'cart',
    effects: [{ type: 'damage', n: 6 }, { type: 'block', n: 4 }],
    kallio: { name: 'Push Through' }, fantasy: { name: 'Advance' } },
  rust_bucket: { char: 'cart', type: 'power', cost: 2, target: 'self', rarity: 'rare', pic: 'rattle',
    effects: [{ type: 'status', who: 'self', key: 'thornsPerTurn', n: 3 }],
    kallio: { name: 'Rust Bucket' }, fantasy: { name: 'Thorn Mail' } },

  // ─ Sanna, the dog walker — Fetch: the dog attacks at the end of your turn
  throw_stick: { char: 'walker', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'stick',
    effects: [{ type: 'status', who: 'self', key: 'fetch', n: 8 }],
    kallio: { name: 'Throw The Stick' }, fantasy: { name: 'Loose The Hound' } },
  heel: { char: 'walker', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'dog',
    effects: [{ type: 'damage', n: 5 }, { type: 'status', who: 'self', key: 'fetch', n: 3 }],
    kallio: { name: 'Heel' }, fantasy: { name: 'To Me' } },
  good_boy: { char: 'walker', type: 'skill', cost: 0, target: 'self', rarity: 'common', pic: 'dog',
    effects: [{ type: 'status', who: 'self', key: 'fetch', n: 3 }, { type: 'draw', n: 1 }],
    kallio: { name: 'Good Boy' }, fantasy: { name: 'Good Beast' } },
  long_lead: { char: 'walker', type: 'skill', cost: 2, target: 'self', rarity: 'uncommon', pic: 'stick',
    effects: [{ type: 'status', who: 'self', key: 'fetch', n: 12 }],
    kallio: { name: 'Long Lead' }, fantasy: { name: 'Long Chain' } },
  bark: { char: 'walker', type: 'skill', cost: 1, target: 'all', rarity: 'uncommon', pic: 'shout',
    effects: [{ type: 'status', who: 'all', key: 'weak', n: 1 }, { type: 'status', who: 'self', key: 'fetch', n: 2 }],
    kallio: { name: 'Bark' }, fantasy: { name: 'Howl' } },
  sit_stay: { char: 'walker', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'dog',
    effects: [{ type: 'block', n: 6 }, { type: 'status', who: 'self', key: 'fetch', n: 3 }],
    kallio: { name: 'Sit. Stay.' }, fantasy: { name: 'Hold' } },
  off_the_lead: { char: 'walker', type: 'attack', cost: 2, target: 'enemy', rarity: 'rare', pic: 'dog',
    effects: [{ type: 'damage', n: 4, scale: 'fetch', per: 1 }],
    kallio: { name: 'Off The Lead' }, fantasy: { name: 'Unleashed' } },
  two_dogs: { char: 'walker', type: 'power', cost: 2, target: 'self', rarity: 'rare', pic: 'dog',
    effects: [{ type: 'status', who: 'self', key: 'keepFetch', n: 1 }],
    kallio: { name: 'Two Dogs' }, fantasy: { name: 'The Pack' } },
  treats: { char: 'walker', type: 'skill', cost: 0, target: 'self', rarity: 'common', exhaust: true, pic: 'bag',
    effects: [{ type: 'status', who: 'self', key: 'fetch', n: 5 }],
    kallio: { name: 'Treats' }, fantasy: { name: 'Scraps' } },
  walkies: { char: 'walker', type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', pic: 'bridge',
    effects: [{ type: 'draw', n: 2 }, { type: 'status', who: 'self', key: 'fetch', n: 2 }],
    kallio: { name: 'Walkies' }, fantasy: { name: 'Patrol' } },

  // ─ Kake, the old boxer — Counter: thorns, and cards that count the hits you took
  guard_up: { char: 'boxer', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'glove',
    effects: [{ type: 'block', n: 5 }, { type: 'status', who: 'self', key: 'thorns', n: 2 }],
    kallio: { name: 'Guard Up' }, fantasy: { name: 'High Guard' } },
  jab: { char: 'boxer', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'twofist',
    effects: [{ type: 'damage', n: 4, times: 2 }],
    kallio: { name: 'Jab, Jab' }, fantasy: { name: 'Double Cut' } },
  counter_punch: { char: 'boxer', type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'glove',
    effects: [{ type: 'damage', n: 3, scale: 'struck', per: 2 }],
    kallio: { name: 'Counter Punch' }, fantasy: { name: 'Riposte' } },
  roll_with_it: { char: 'boxer', type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'hand',
    effects: [{ type: 'block', n: 8 }],
    kallio: { name: 'Roll With It' }, fantasy: { name: 'Parry' } },
  iron_jaw: { char: 'boxer', type: 'power', cost: 1, target: 'self', rarity: 'uncommon', pic: 'glove',
    effects: [{ type: 'status', who: 'self', key: 'thornsPerTurn', n: 2 }],
    kallio: { name: 'Iron Jaw' }, fantasy: { name: 'Barbed Skin' } },
  big_right: { char: 'boxer', type: 'attack', cost: 2, target: 'enemy', rarity: 'uncommon', exhaust: true, pic: 'fist',
    effects: [{ type: 'damage', n: 16 }],
    kallio: { name: 'The Big Right' }, fantasy: { name: 'Heavy Blow' } },
  clinch: { char: 'boxer', type: 'skill', cost: 1, target: 'enemy', rarity: 'uncommon', pic: 'shove',
    effects: [{ type: 'status', who: 'target', key: 'weak', n: 2 }, { type: 'block', n: 4 }],
    kallio: { name: 'Clinch' }, fantasy: { name: 'Grapple' } },
  second_wind: { char: 'boxer', type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', exhaust: true, pic: 'sunburst',
    effects: [{ type: 'block', n: 0, scale: 'struck', per: 3 }, { type: 'heal', n: 3 }],
    kallio: { name: 'Second Wind' }, fantasy: { name: 'Second Wind' } },
  glass_chin: { char: 'boxer', type: 'attack', cost: 0, target: 'enemy', rarity: 'common', pic: 'fist',
    effects: [{ type: 'damage', n: 7 }, { type: 'status', who: 'self', key: 'vulnerable', n: 1 }],
    kallio: { name: 'Glass Chin' }, fantasy: { name: 'Open Stance' } },
  bell: { char: 'boxer', type: 'power', cost: 2, target: 'self', rarity: 'rare', pic: 'bell',
    effects: [{ type: 'status', who: 'self', key: 'strengthPerTurn', n: 1 }],
    kallio: { name: 'The Bell' }, fantasy: { name: 'War Bell' } },

  // ─ neutral, second wave
  bum_a_smoke: { type: 'skill', cost: 0, target: 'self', rarity: 'common', exhaust: true, pic: 'can',
    effects: [{ type: 'draw', n: 1 }],
    kallio: { name: 'Bum A Smoke' }, fantasy: { name: 'Beg A Favour' } },
  spare_change: { type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', exhaust: true, pic: 'coin',
    effects: [{ type: 'energy', n: 2 }],
    kallio: { name: 'Spare Change' }, fantasy: { name: 'Found Coin' } },
  sleeping_bag: { type: 'skill', cost: 1, target: 'self', rarity: 'common', pic: 'coat',
    effects: [{ type: 'block', n: 5 }, { type: 'heal', n: 2 }],
    kallio: { name: 'Sleeping Bag' }, fantasy: { name: 'Bedroll' } },
  night_bus: { type: 'skill', cost: 1, target: 'self', rarity: 'uncommon', exhaust: true, pic: 'tram',
    effects: [{ type: 'draw', n: 3 }],
    kallio: { name: 'Night Bus' }, fantasy: { name: 'Night Coach' } },
  head_butt: { type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'fist',
    effects: [{ type: 'damage', n: 10 }, { type: 'loseHp', n: 2 }],
    kallio: { name: 'Head Butt' }, fantasy: { name: 'Skull Crack' } },
  broken_bottle: { type: 'attack', cost: 1, target: 'enemy', rarity: 'common', pic: 'bottlebreak',
    effects: [{ type: 'damage', n: 5 }, { type: 'status', who: 'target', key: 'vulnerable', n: 1 }],
    kallio: { name: 'Broken Bottle' }, fantasy: { name: 'Jagged Shard' } },
  street_smarts: { type: 'power', cost: 3, target: 'self', rarity: 'rare', pic: 'key',
    effects: [{ type: 'status', who: 'self', key: 'energyPerTurn', n: 1 }],
    kallio: { name: 'Street Smarts' }, fantasy: { name: 'Inner Fire' } },
  the_hard_way: { type: 'attack', cost: 2, target: 'all', rarity: 'uncommon', pic: 'sweep',
    effects: [{ type: 'damage', n: 8 }, { type: 'status', who: 'self', key: 'frail', n: 1 }],
    kallio: { name: 'The Hard Way' }, fantasy: { name: 'Wild Swing' } },
  granite: { type: 'skill', cost: 2, target: 'self', rarity: 'uncommon', pic: 'bear',
    effects: [{ type: 'block', n: 10 }, { type: 'status', who: 'self', key: 'thorns', n: 3 }],
    kallio: { name: 'Granite' }, fantasy: { name: 'Stoneskin' } },
  mirror_shard: { type: 'skill', cost: 1, target: 'self', rarity: 'rare', exhaust: true, pic: 'mirror',
    effects: [{ type: 'status', who: 'self', key: 'doubleNext', n: 1 }],
    kallio: { name: 'Mirror Shard' }, fantasy: { name: 'Twin Glass' } },

  // ─ curses — cannot be played, clog the hand
  soaked: { type: 'curse', cost: null, target: 'self', rarity: 'curse', pic: 'rain', effects: [],
    kallio: { name: 'Soaked' }, fantasy: { name: 'Soaked' } },
  hangover: { type: 'curse', cost: null, target: 'self', rarity: 'curse', pic: 'rain', effects: [],
    kallio: { name: 'Hangover' }, fantasy: { name: 'Malaise' } },
  doubt: { type: 'curse', cost: null, target: 'self', rarity: 'curse', pic: 'mirror', effects: [],
    kallio: { name: 'Doubt' }, fantasy: { name: 'Doubt' } },
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
    hp: 76,
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
  walker: {
    hp: 70,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'throw_stick', 'heel'],
    kallio: { name: 'Sanna', title: 'the dog walker', blurb: 'Walks every dog in Kallio and owns none of them. Feed the dog Fetch all turn; at the end of it, the dog goes in.',
      look: { skin: '#d8b090', hair: '#a8482a', hairStyle: 'tangle', top: '#7a5a3a', under: '#3a3a44', bottom: '#2c3a2c', shoes: '#3a2a20', hat: 'cap', hatColor: '#5a4a3a', prop: 'lead', accent: '#c87a3a', base: 'card', grime: 0.65 } },
    fantasy: { name: 'Sanna', title: 'the houndmaster', blurb: 'The hound waits for the word. Everything you do this turn is a promise it keeps at the end of it.',
      look: { skin: '#d8b090', hair: '#a8482a', hairStyle: 'tangle', top: '#5a3a2a', bottom: '#2a2a1c', shoes: '#3a2a20', hat: 'hood', prop: 'lead', accent: '#c8a03a', base: 'card', grime: 0.55 } },
  },
  boxer: {
    hp: 80,
    deck: ['strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'guard_up', 'jab'],
    kallio: { name: 'Kake', title: 'the old boxer', blurb: 'Fought at the Kallio hall in another decade. Thorns punish what hits him, and his best punches count the hits he took.',
      look: { skin: '#b88868', hair: '#d0ccc0', hairStyle: 'bald', top: '#8a2a2a', under: '#e0d8c8', bottom: '#2a2a30', shoes: '#1c1c20', hat: 'none', prop: 'gloves', accent: '#c83a3a', base: 'tin', grime: 0.75 } },
    fantasy: { name: 'Kake', title: 'the pit fighter', blurb: 'Every blow that lands on him is a blow he has already answered.',
      look: { skin: '#b88868', hair: '#d0ccc0', hairStyle: 'bald', top: '#5a2a2a', bottom: '#2a2420', shoes: '#1c1c20', hat: 'none', prop: 'gloves', accent: '#d8a03a', base: 'tin', grime: 0.7 } },
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
  lucky_lighter: { effect: { type: 'firstTurnEnergy', n: 1 },
    kallio: { name: 'Lucky Lighter', text: '+1 energy on the first turn of every fight.' },
    fantasy: { name: 'Tinderbox', text: '+1 mana on the first turn of every fight.' } },
  stray_dog: { effect: { type: 'endTurnDamage', n: 3 },
    kallio: { name: 'Stray Dog', text: 'At the end of your turn, deal 3 to the weakest enemy.' },
    fantasy: { name: 'Familiar Rat', text: 'At the end of your turn, deal 3 to the weakest enemy.' } },
  mouthguard: { effect: { type: 'thornsStart', n: 2 },
    kallio: { name: 'Mouthguard', text: 'Start every fight with 2 Thorns.' },
    fantasy: { name: 'Bramble Charm', text: 'Start every fight with 2 Thorns.' } },
  heavy_coat: { effect: { type: 'maxHp', n: 8 },
    kallio: { name: 'Heavy Coat', text: '+8 max HP.' },
    fantasy: { name: 'Bear Pelt', text: '+8 max HP.' } },
  tram_ticket: { effect: { type: 'firstTurnDraw', n: 2 },
    kallio: { name: 'Tram Ticket', text: 'Draw 2 more on the first turn of every fight.' },
    fantasy: { name: 'Map Fragment', text: 'Draw 2 more on the first turn of every fight.' } },
  cracked_mirror: { effect: { type: 'firstAttackFightMult', mult: 2 },
    kallio: { name: 'Cracked Mirror', text: 'The first attack of every fight deals ×2.' },
    fantasy: { name: 'Broken Idol', text: 'The first attack of every fight deals ×2.' } },
  spare_key: { effect: { type: 'blockOnAttack', n: 1 },
    kallio: { name: 'Spare Key', text: 'Attacks also give 1 block.' },
    fantasy: { name: 'Iron Bangle', text: 'Attacks also give 1 block.' } },
  bad_debt: { effect: { type: 'energyForHp', energy: 1, hp: 3 },
    kallio: { name: 'Bad Debt', text: '+1 energy each turn. Lose 3 HP at the start of every fight.' },
    fantasy: { name: 'Blood Pact', text: '+1 mana each turn. Lose 3 HP at the start of every fight.' } },
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
    kallio: { name: 'Rat', look: { body: '#6d5c4c', wing: '#4e4238', head: '#7f6b58', beak: '#c69a86', shape: 'rat' } },
    fantasy: { name: 'Imp', look: { body: '#6d4a5c', wing: '#452b3e', head: '#7d5468', beak: '#d06e6e', shape: 'rat' } } },
  bin_rat: { hp: 28, pattern: 'cycle', scale: 0.72,
    moves: [
      { id: 'lunge', intent: 'attack', dmg: 9 },
      { id: 'gnaw', intent: 'debuff', dmg: 5, status: { key: 'weak', n: 1 } },
      { id: 'screech', intent: 'debuff', status: { key: 'vulnerable', n: 1 } },
    ],
    kallio: { name: 'Bin Rat', look: { body: '#7b6a54', wing: '#564838', head: '#8d785e', beak: '#cf9c82', shape: 'rat' } },
    fantasy: { name: 'Dire Imp', look: { body: '#7c5a68', wing: '#553a48', head: '#8c6478', beak: '#d87c7c', shape: 'rat' } } },
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
  bridge_king: { hp: 104, boss: true, pattern: 'cycle', scale: 1.15,
    moves: [
      { id: 'shove', intent: 'attack', dmg: 16 },
      { id: 'plant', intent: 'buff', block: 12, status: { key: 'strength', n: 1 } },
      { id: 'one_two', intent: 'attack', dmg: 8, times: 2 },
      { id: 'the_word', intent: 'debuff', status: { key: 'vulnerable', n: 2 }, status2: { key: 'weak', n: 2 } },
    ],
    kallio: { name: 'The Bridge King', look: { skin: '#c09070', hair: '#1a1814', hairStyle: 'slick', top: '#c4bda6', under: '#1a1814', bottom: '#bab392', shoes: '#141210', hat: 'none', chain: true, heavy: true, prop: 'plank', accent: '#c8a83a', base: 'tin', grime: 0.55, shape: 'person' } },
    fantasy: { name: 'The Gate Troll', look: { skin: '#7a8a6a', hair: '#2a3020', hairStyle: 'bald', top: '#4a4438', bottom: '#3a382e', shoes: '#161412', hat: 'horns', prop: 'plank', accent: '#c85a3a', base: 'tin', grime: 0.9, shape: 'person' } } },
  // ─ second wave (Eldritch Kallio, 2026-09-05)
  pigeon: { hp: 9, pattern: 'cycle', scale: 0.42,
    moves: [
      { id: 'peck', intent: 'attack', dmg: 3 },
      { id: 'flap', intent: 'block', block: 3 },
      { id: 'mob', intent: 'attack', dmg: 2, times: 2 },
    ],
    kallio: { name: 'Pigeon', look: { body: '#7a7c84', wing: '#5a5c66', head: '#8c8e96', beak: '#c8783a', neck: '#4a7a6a', shape: 'bird' } },
    fantasy: { name: 'Rook', look: { body: '#2a2a34', wing: '#1c1c26', head: '#34343e', beak: '#b8a03a', neck: '#4a3a6a', shape: 'bird' } } },
  gull: { hp: 26, pattern: 'cycle', scale: 0.66,
    moves: [
      { id: 'snatch', intent: 'debuff', dmg: 5, status: { key: 'frail', n: 1 } },
      { id: 'dive', intent: 'attack', dmg: 9 },
      { id: 'screech', intent: 'debuff', status: { key: 'vulnerable', n: 1 } },
    ],
    kallio: { name: 'Gull', look: { body: '#d8d4c8', wing: '#8a8c90', head: '#e4e0d4', beak: '#d8a03a', neck: '#d8d4c8', big: true, shape: 'bird' } },
    fantasy: { name: 'Harpy', look: { body: '#a88a78', wing: '#5a3a3a', head: '#c0a090', beak: '#8a2a2a', neck: '#a88a78', big: true, shape: 'bird' } } },
  tar_blob: { hp: 34, pattern: 'cycle', scale: 0.9,
    moves: [
      { id: 'harden', intent: 'buff', block: 6, status: { key: 'thorns', n: 2 } },
      { id: 'slap', intent: 'attack', dmg: 6 },
      { id: 'ooze', intent: 'debuff', dmg: 4, status: { key: 'weak', n: 1 } },
    ],
    kallio: { name: 'Tar Blob', look: { body: '#2a2622', wing: '#1a1816', head: '#4a4440', beak: '#0e0c0a', shape: 'blob' } },
    fantasy: { name: 'Pitch Ooze', look: { body: '#24202a', wing: '#16141a', head: '#463c4a', beak: '#0c0a10', shape: 'blob' } } },
  blob_spawn: { hp: 14, pattern: 'cycle', scale: 0.55,
    moves: [
      { id: 'slap', intent: 'attack', dmg: 4 },
      { id: 'mutate', intent: 'buff', status: { key: 'strength', n: 1 } },
    ],
    kallio: { name: 'Blob Spawn', look: { body: '#7a8a3a', wing: '#5a6a28', head: '#9aaa4a', beak: '#2a3410', shape: 'blob' } },
    fantasy: { name: 'Oozeling', look: { body: '#4a8a5a', wing: '#2e6a3c', head: '#6aaa6a', beak: '#1a3418', shape: 'blob' } } },
  dealer: { hp: 30, pattern: 'cycle', scale: 0.92,
    moves: [
      { id: 'pitch', intent: 'debuff', status: { key: 'frail', n: 1 }, status2: { key: 'weak', n: 1 } },
      { id: 'cut', intent: 'attack', dmg: 7 },
      { id: 'bad_batch', intent: 'curse', addCard: 'hangover' },
    ],
    kallio: { name: 'The Dealer', look: { skin: '#d0a898', hair: '#1a1814', hairStyle: 'slick', top: '#1c1c22', under: '#c8c0b0', bottom: '#1c1c22', shoes: '#0e0e10', hat: 'cap', hatColor: '#1c1c22', prop: 'bag', accent: '#c8a03a', base: 'card', grime: 0.5, shape: 'person' } },
    fantasy: { name: 'The Alchemist', look: { skin: '#c8b8a8', hair: '#3a2a4a', hairStyle: 'slick', top: '#2a1c3a', bottom: '#1c1428', shoes: '#0e0e10', hat: 'hood', prop: 'flask', accent: '#8ac83a', base: 'card', grime: 0.5, shape: 'person' } } },
  preacher: { hp: 32, pattern: 'cycle', scale: 0.96,
    moves: [
      { id: 'sermon', intent: 'buff', status: { key: 'strength', n: 1 }, who: 'all' },
      { id: 'smite', intent: 'attack', dmg: 9 },
      { id: 'brace', intent: 'block', block: 8 },
    ],
    kallio: { name: 'The Preacher', look: { skin: '#c09880', hair: '#8a8078', hairStyle: 'shaggy', top: '#2a2a2a', under: '#e8e0d0', bottom: '#2a2a2a', shoes: '#141210', hat: 'none', prop: 'plank', accent: '#d8c8a0', base: 'card', grime: 0.7, shape: 'person' } },
    fantasy: { name: 'The Zealot', look: { skin: '#c09880', hair: '#8a8078', hairStyle: 'shaggy', top: '#4a2a1a', bottom: '#2a1c14', shoes: '#141210', hat: 'hood', prop: 'plank', accent: '#e8c85a', base: 'card', grime: 0.7, shape: 'person' } } },
  rival_b: { hp: 34, pattern: 'cycle', scale: 0.92,
    moves: [
      { id: 'taunt', intent: 'debuff', status: { key: 'vulnerable', n: 1 } },
      { id: 'jab', intent: 'attack', dmg: 5, times: 2 },
      { id: 'swing', intent: 'attack', dmg: 9 },
    ],
    kallio: { name: 'The Other One', look: { skin: '#b88a70', hair: '#c8b088', hairStyle: 'lank', top: '#3a5a6a', bottom: '#2a2a30', shoes: '#241c16', hat: 'bucket', hatColor: '#5a5a4a', prop: 'can', accent: '#5a90b0', base: 'card', grime: 0.9, shape: 'person' } },
    fantasy: { name: 'Cutpurse', look: { skin: '#b88a70', hair: '#c8b088', hairStyle: 'lank', top: '#2a3a4a', bottom: '#1c1c24', shoes: '#241c16', hat: 'hood', prop: 'flask', accent: '#7ab0c8', base: 'card', grime: 0.8, shape: 'person' } } },
  bouncer: { hp: 70, elite: true, pattern: 'cycle', scale: 1.05,
    moves: [
      { id: 'wall', intent: 'block', block: 14 },
      { id: 'throw_out', intent: 'attack', dmg: 13 },
      { id: 'grip', intent: 'debuff', dmg: 6, status: { key: 'weak', n: 1 } },
      { id: 'rally', intent: 'buff', status: { key: 'strength', n: 2 } },
    ],
    kallio: { name: 'The Bouncer', look: { skin: '#a87858', hair: '#1a1814', hairStyle: 'bald', top: '#141416', under: '#141416', bottom: '#141416', shoes: '#0e0e10', hat: 'none', heavy: true, prop: 'none', accent: '#c8c8c8', base: 'tin', grime: 0.4, shape: 'person' } },
    fantasy: { name: 'The Gatekeeper', look: { skin: '#8a7a6a', hair: '#1a1814', hairStyle: 'bald', top: '#3a3a44', bottom: '#2a2a32', shoes: '#0e0e10', hat: 'helm', heavy: true, prop: 'plank', accent: '#b0b8c8', base: 'tin', grime: 0.6, shape: 'person' } } },
  gull_king: { hp: 75, elite: true, pattern: 'cycle', scale: 1.0,
    moves: [
      { id: 'storm', intent: 'attack', dmg: 6, times: 3 },
      { id: 'screech', intent: 'debuff', status: { key: 'vulnerable', n: 2 } },
      { id: 'feast', intent: 'heal', heal: 12 },
      { id: 'dive', intent: 'attack', dmg: 14 },
    ],
    kallio: { name: 'The Gull King', look: { body: '#e8e4d8', wing: '#6a6c70', head: '#f0ece0', beak: '#e0a83a', neck: '#e8e4d8', big: true, crown: true, shape: 'bird' } },
    fantasy: { name: 'The Harpy Queen', look: { body: '#b89a88', wing: '#4a2a2a', head: '#d0b0a0', beak: '#9a2a2a', neck: '#b89a88', big: true, crown: true, shape: 'bird' } } },
  night_shift: { hp: 44, pattern: 'cycle', scale: 0.96,
    moves: [
      { id: 'torch', intent: 'attack', dmg: 11 },
      { id: 'lockdown', intent: 'attack', dmg: 6, block: 10 },
      { id: 'radio', intent: 'buff', status: { key: 'strength', n: 1 }, who: 'all' },
    ],
    kallio: { name: 'Night Shift', look: { skin: '#c0a088', hair: '#3a3028', hairStyle: 'slick', top: '#1a2a4a', under: '#e8e8e0', bottom: '#1a2a4a', shoes: '#0e0e10', hat: 'cap', hatColor: '#1a2a4a', prop: 'can', accent: '#e8c83a', base: 'tin', grime: 0.35, shape: 'person' } },
    fantasy: { name: 'The Watchman', look: { skin: '#c0a088', hair: '#3a3028', hairStyle: 'slick', top: '#3a3a4a', bottom: '#2a2a34', shoes: '#0e0e10', hat: 'helm', prop: 'plank', accent: '#e8c83a', base: 'tin', grime: 0.5, shape: 'person' } } },
  // The Karhupuisto bear — the granite statue in the plate behind the bridge,
  // woken. Eldritch Kallio's second boss is the thing that was in the
  // photograph all along.
  the_bear: { hp: 140, boss: true, pattern: 'cycle', scale: 1.32,
    moves: [
      { id: 'granite', intent: 'buff', block: 20, status: { key: 'thorns', n: 3 } },
      { id: 'maul', intent: 'attack', dmg: 12, times: 2 },
      { id: 'roar', intent: 'debuff', status: { key: 'vulnerable', n: 2 }, status2: { key: 'weak', n: 2 } },
      { id: 'crush', intent: 'attack', dmg: 20 },
      { id: 'stir', intent: 'heal', heal: 10, status: { key: 'strength', n: 2 } },
    ],
    kallio: { name: 'The Bear', look: { body: '#6a6260', head: '#7a726e', wing: '#4a4442', beak: '#2a2624', moss: '#3a4a2a', eye: '#e8a84a', shape: 'bear' } },
    fantasy: { name: 'The Stone Bear', look: { body: '#5a5a6a', head: '#6a6a7a', wing: '#3a3a48', beak: '#20202a', moss: '#3a3a5a', eye: '#8ac8e8', shape: 'bear' } } },
};

// ── the run ──────────────────────────────────────────────────────────────
// Owner, 2026-09-05: "aim for StS2 parity". So the run is no longer six fights
// on a line: it is TWO ACTS, and at every step you choose the next span from
// two or three — a fight, an elite, an event, a rest — with a boss at the end
// of each act. `ENCOUNTERS` is the whole pool; `ACTS` says which of it each act
// draws from. The route is rolled from the run's own seed (engine.buildRoute),
// so the same seed is the same map.
//
// The curve is MEASURED, not felt (see test/balance.mjs). The first cut of the
// old six-fight run was flat: every character arrived at the boss on 91-99% HP
// and 100% of losses were the last encounter. Escorting the bigger enemies is
// what made the middle cost something, and every new encounter keeps that
// shape — nothing big stands alone until the elites.
export const ENCOUNTERS = [
  // ─ act one: the canal bridge
  { id: 'rats', enemies: ['rat', 'rat', 'rat'], reward: ['card', 'joker'],
    kallio: { name: 'Rats Under The Deck' }, fantasy: { name: 'A Nest Of Imps' } },
  { id: 'bin', enemies: ['bin_rat', 'rat', 'rat'], reward: ['card'],
    kallio: { name: 'The Bin Rat' }, fantasy: { name: 'The Dire Imp' } },
  { id: 'blob', enemies: ['blob', 'rat'], reward: ['card', 'joker'],
    kallio: { name: 'Something In The Water' }, fantasy: { name: 'The Bog Ooze' } },
  { id: 'rivals', enemies: ['rival', 'bin_rat'], reward: ['card'],
    kallio: { name: 'Somebody Else’s Spot' }, fantasy: { name: 'Bandits On The Span' } },
  { id: 'pigeons', enemies: ['pigeon', 'pigeon', 'pigeon', 'pigeon'], reward: ['card'],
    kallio: { name: 'The Pigeons Want Your Bread' }, fantasy: { name: 'An Unkindness' } },
  { id: 'tar', enemies: ['tar_blob', 'blob_spawn'], reward: ['card'],
    kallio: { name: 'What Came Up The Drain' }, fantasy: { name: 'The Pitch Pit' } },
  { id: 'dealer', enemies: ['dealer', 'rat'], reward: ['card'],
    kallio: { name: 'A Friend Of A Friend' }, fantasy: { name: 'The Alchemist’s Errand' } },
  { id: 'preacher', enemies: ['preacher', 'rat', 'rat'], reward: ['card'],
    kallio: { name: 'The Man With The Sign' }, fantasy: { name: 'The Zealot’s Flock' } },
  { id: 'king_rat', enemies: ['boss_rat', 'rat', 'rat'], reward: ['card', 'joker'],
    kallio: { name: 'The King Rat' }, fantasy: { name: 'The Imp Lord' } },
  { id: 'bouncer', enemies: ['bouncer'], reward: ['card', 'joker'],
    kallio: { name: 'Not On The List' }, fantasy: { name: 'The Gatekeeper' } },
  { id: 'bridge', enemies: ['bridge_king'], reward: ['card', 'joker'],
    kallio: { name: 'Who Owns The Bridge' }, fantasy: { name: 'Who Holds The Span' } },
  // ─ act two: under the bear
  { id: 'gulls', enemies: ['gull', 'pigeon', 'pigeon'], reward: ['card', 'joker'],
    kallio: { name: 'Gulls Off The Harbour' }, fantasy: { name: 'Harpies On The Wind' } },
  { id: 'twins', enemies: ['rival', 'rival_b'], reward: ['card'],
    kallio: { name: 'Both Of Them' }, fantasy: { name: 'Two Knives' } },
  { id: 'night', enemies: ['night_shift', 'gull'], reward: ['card'],
    kallio: { name: 'The Night Shift' }, fantasy: { name: 'The Watch' } },
  { id: 'swarm', enemies: ['blob', 'blob_spawn', 'blob_spawn'], reward: ['card', 'joker'],
    kallio: { name: 'It Has Been Busy' }, fantasy: { name: 'The Brood' } },
  { id: 'dealers', enemies: ['dealer', 'dealer'], reward: ['card'],
    kallio: { name: 'Two For One' }, fantasy: { name: 'Twin Alchemists' } },
  { id: 'sermon', enemies: ['preacher', 'bin_rat', 'bin_rat'], reward: ['card'],
    kallio: { name: 'The Sermon' }, fantasy: { name: 'The Congregation' } },
  { id: 'pitch', enemies: ['tar_blob', 'tar_blob'], reward: ['card'],
    kallio: { name: 'Pitch Black' }, fantasy: { name: 'Twin Pitch' } },
  { id: 'flock', enemies: ['gull', 'pigeon', 'pigeon', 'pigeon'], reward: ['card'],
    kallio: { name: 'The Whole Flock' }, fantasy: { name: 'The Whole Flight' } },
  { id: 'gull_king', enemies: ['gull_king'], reward: ['card', 'joker'],
    kallio: { name: 'The Gull King' }, fantasy: { name: 'The Harpy Queen' } },
  { id: 'rat_court', enemies: ['boss_rat', 'bin_rat', 'bin_rat'], reward: ['card', 'joker'],
    kallio: { name: 'The Rat Court' }, fantasy: { name: 'The Imp Court' } },
  { id: 'bear', enemies: ['the_bear'], reward: [],
    kallio: { name: 'The Bear Wakes' }, fantasy: { name: 'The Stone Bear Wakes' } },
];

// Each act draws its spans from these. `steps` is how many spans you choose
// before the boss; the route always offers a rest on the last of them.
export const ACTS = [
  { id: 'canal', steps: 6, boss: 'bridge',
    fights: ['rats', 'bin', 'blob', 'rivals', 'pigeons', 'tar', 'dealer', 'preacher'],
    elites: ['king_rat', 'bouncer'],
    kallio: { name: 'The Canal Bridge' }, fantasy: { name: 'The Old Span' } },
  { id: 'bear', steps: 6, boss: 'bear',
    fights: ['gulls', 'twins', 'night', 'swarm', 'dealers', 'sermon', 'pitch', 'flock'],
    elites: ['gull_king', 'rat_court'],
    kallio: { name: 'Under The Bear' }, fantasy: { name: 'The Stone Watch' } },
];

// ── events ───────────────────────────────────────────────────────────────
// A span with no fight on it: a place, a short text, and two or three things
// you can do there. Effects the engine understands:
//   heal {n} · maxHp {n} · hp {n} (lose) · card {id} · curse {id} · joker (random)
//   remove (pick a card to remove) · upgrade (pick a card to upgrade)
//   maxEnergy {n} · reward {kind} (opens the ordinary reward) ·
//   roll {p, good: [...], bad: [...]} — the odds are SHOWN; full information.
export const EVENTS = [
  { id: 'the_statue',
    kallio: { name: 'The Bear In The Park', text: 'The granite bear sits where it always has. Somebody has left flowers. Its nose is worn pale where a century of hands have touched it, and tonight it is warm.' },
    fantasy: { name: 'The Stone Idol', text: 'An old idol squats in the clearing. Its snout is polished by ten thousand palms, and tonight it is warm.' },
    options: [
      { kallio: { label: 'Touch the nose. (+6 max HP, lose 8 HP)' }, fantasy: { label: 'Touch the snout. (+6 max HP, lose 8 HP)' }, effects: [{ type: 'maxHp', n: 6 }, { type: 'hp', n: 8 }] },
      { kallio: { label: 'Leave something behind. (Remove a card)' }, fantasy: { label: 'Leave an offering. (Remove a card)' }, effects: [{ type: 'remove' }] },
      { kallio: { label: 'Walk on.' }, fantasy: { label: 'Walk on.' }, effects: [] },
    ] },
  { id: 'sauna',
    kallio: { name: 'The Public Sauna', text: 'Kotiharju is still lit. The attendant looks at you a long time and then nods you through. The steam takes everything out of you and puts something back.' },
    fantasy: { name: 'The Bathhouse', text: 'A bathhouse, still lit past midnight. The keeper nods you through. The steam takes everything out of you and puts something back.' },
    options: [
      { kallio: { label: 'Sit as long as you can bear. (Heal 60% of max HP)' }, fantasy: { label: 'Stay in the heat. (Heal 60% of max HP)' }, effects: [{ type: 'heal', pct: 0.6 }] },
      { kallio: { label: 'Think it over in the steam. (Upgrade a card)' }, fantasy: { label: 'Meditate in the steam. (Upgrade a card)' }, effects: [{ type: 'upgrade' }] },
    ] },
  { id: 'dumpster',
    kallio: { name: 'Behind The Alepa', text: 'The lock on the bin cage is broken again. It is mostly bread. Under the bread there is something that is not bread.' },
    fantasy: { name: 'The Midden', text: 'The gate on the refuse pit hangs open. It is mostly rot. Under the rot there is something that is not rot.' },
    options: [
      { kallio: { label: 'Take the bread. (Heal 10)' }, fantasy: { label: 'Take what is edible. (Heal 10)' }, effects: [{ type: 'heal', n: 10 }] },
      { kallio: { label: 'Dig for the other thing. (Lose 7 HP, gain a friend)' }, fantasy: { label: 'Dig for the other thing. (Lose 7 HP, gain a familiar)' }, effects: [{ type: 'hp', n: 7 }, { type: 'joker' }] },
    ] },
  { id: 'preacher_event',
    kallio: { name: 'The Man With The Megaphone', text: 'He has been shouting at the tram stop since before you were born. Tonight he is shouting at you specifically, and some of it is true.' },
    fantasy: { name: 'The Prophet', text: 'He has been preaching at the crossroads since before you were born. Tonight he is preaching at you specifically, and some of it is true.' },
    options: [
      { kallio: { label: 'Listen. (Upgrade a card, gain Doubt)' }, fantasy: { label: 'Listen. (Upgrade a card, gain Doubt)' }, effects: [{ type: 'upgrade' }, { type: 'curse', id: 'doubt' }] },
      { kallio: { label: 'Argue back. (Gain The Old Days)' }, fantasy: { label: 'Argue back. (Gain Battle Hymn)' }, effects: [{ type: 'card', id: 'old_days' }] },
      { kallio: { label: 'Cross the street.' }, fantasy: { label: 'Cross the road.' }, effects: [] },
    ] },
  { id: 'night_tram',
    kallio: { name: 'The Last Tram', text: 'The 3 rattles in, empty and lit like an aquarium. Nobody checks tickets at this hour. You could ride it to the end of the line and back.' },
    fantasy: { name: 'The Night Coach', text: 'A coach rolls in, empty and lit. Nobody asks for fare at this hour. You could ride it to the end of the road and back.' },
    options: [
      { kallio: { label: 'Sleep on it. (Heal 15, gain Hangover)' }, fantasy: { label: 'Sleep on it. (Heal 15, gain Malaise)' }, effects: [{ type: 'heal', n: 15 }, { type: 'curse', id: 'hangover' }] },
      { kallio: { label: 'Stay awake and think. (+1 max energy, −8 max HP)' }, fantasy: { label: 'Stay awake and think. (+1 max mana, −8 max HP)' }, effects: [{ type: 'maxEnergy', n: 1 }, { type: 'maxHp', n: -8 }] },
      { kallio: { label: 'Let it go.' }, fantasy: { label: 'Let it go.' }, effects: [] },
    ] },
  { id: 'lost_dog',
    kallio: { name: 'A Dog With No Collar', text: 'It has been following you for two blocks. It is not a nice dog. It sits down when you look at it, which is more than most people do.' },
    fantasy: { name: 'A Hound With No Master', text: 'It has been following you since the ford. It is not a gentle beast. It sits when you look at it, which is more than most do.' },
    options: [
      { kallio: { label: 'Let it come. (Gain a friend)' }, fantasy: { label: 'Let it come. (Gain a familiar)' }, effects: [{ type: 'joker' }] },
      { kallio: { label: 'Teach it one thing. (Gain Bark)' }, fantasy: { label: 'Teach it one thing. (Gain Howl)' }, effects: [{ type: 'card', id: 'bark' }] },
    ] },
  { id: 'the_canal',
    kallio: { name: 'Something Under The Surface', text: 'The canal is black and completely still, and there is a shape under it that the streetlight does not explain. It is holding something that glints.' },
    fantasy: { name: 'Beneath The Water', text: 'The channel is black and still, and there is a shape under it the lanterns do not explain. It is holding something that glints.' },
    options: [
      { kallio: { label: 'Reach in. (50%: gain a friend · 50%: lose 12 HP and gain Soaked)' }, fantasy: { label: 'Reach in. (50%: gain a familiar · 50%: lose 12 HP and gain Soaked)' },
        effects: [{ type: 'roll', p: 0.5, good: [{ type: 'joker' }], bad: [{ type: 'hp', n: 12 }, { type: 'curse', id: 'soaked' }] }] },
      { kallio: { label: 'Keep walking.' }, fantasy: { label: 'Keep walking.' }, effects: [] },
    ] },
  { id: 'old_friend',
    kallio: { name: 'Somebody You Used To Know', text: 'He is on the bench by the kiosk with a bag of cans and he is glad to see you, which is the worst part. He remembers things you have made an effort to forget.' },
    fantasy: { name: 'An Old Companion', text: 'He is by the roadside shrine with a skin of wine and he is glad to see you, which is the worst part. He remembers what you have tried to forget.' },
    options: [
      { kallio: { label: 'Share a can. (+4 max HP)' }, fantasy: { label: 'Share the wine. (+4 max HP)' }, effects: [{ type: 'maxHp', n: 4 }] },
      { kallio: { label: 'Let him talk. (Remove a card)' }, fantasy: { label: 'Let him talk. (Remove a card)' }, effects: [{ type: 'remove' }] },
    ] },
  { id: 'kiosk',
    kallio: { name: 'The Kiosk Is Still Open', text: 'The window is lit and the woman inside does not blink. There is no till. Everything costs a little of yourself.' },
    fantasy: { name: 'The Pedlar’s Stall', text: 'The stall is lit and the pedlar does not blink. There is no purse. Everything costs a little of yourself.' },
    options: [
      { kallio: { label: 'Buy something. (Lose 7 HP, pick a card)' }, fantasy: { label: 'Buy something. (Lose 7 HP, pick a card)' }, effects: [{ type: 'hp', n: 7 }, { type: 'reward', kind: 'card' }] },
      { kallio: { label: 'Buy a friend. (Lose 14 HP, pick a friend)' }, fantasy: { label: 'Buy a familiar. (Lose 14 HP, pick a familiar)' }, effects: [{ type: 'hp', n: 14 }, { type: 'reward', kind: 'joker' }] },
      { kallio: { label: 'Just looking.' }, fantasy: { label: 'Just looking.' }, effects: [] },
    ] },
  { id: 'police',
    kallio: { name: 'Move Along', text: 'Two of them, bored, one hand on the belt. You have done nothing, which has never once mattered.' },
    fantasy: { name: 'The Watch Patrol', text: 'Two of them, bored, one hand on the hilt. You have done nothing, which has never once mattered.' },
    options: [
      { kallio: { label: 'Talk back. (Lose 10 HP, gain Broken Bottle)' }, fantasy: { label: 'Talk back. (Lose 10 HP, gain Jagged Shard)' }, effects: [{ type: 'hp', n: 10 }, { type: 'card', id: 'broken_bottle' }] },
      { kallio: { label: 'Run, and drop something. (Remove a card)' }, fantasy: { label: 'Run, and drop something. (Remove a card)' }, effects: [{ type: 'remove' }] },
      { kallio: { label: 'Move along.' }, fantasy: { label: 'Move along.' }, effects: [] },
    ] },
  { id: 'mirror',
    kallio: { name: 'The Shop Window', text: 'Your reflection in the dark glass is a half-second behind you. Then it is a half-second ahead. It knows a card you have not played yet.' },
    fantasy: { name: 'The Black Glass', text: 'Your reflection in the dark pane is a half-second behind you. Then it is a half-second ahead. It knows a move you have not made yet.' },
    options: [
      { kallio: { label: 'Look closer. (Upgrade a card, gain Doubt)' }, fantasy: { label: 'Look closer. (Upgrade a card, gain Doubt)' }, effects: [{ type: 'upgrade' }, { type: 'curse', id: 'doubt' }] },
      { kallio: { label: 'Break it. (Gain Mirror Shard, lose 5 HP)' }, fantasy: { label: 'Break it. (Gain Twin Glass, lose 5 HP)' }, effects: [{ type: 'card', id: 'mirror_shard' }, { type: 'hp', n: 5 }] },
      { kallio: { label: 'Look away. (Heal 8)' }, fantasy: { label: 'Look away. (Heal 8)' }, effects: [{ type: 'heal', n: 8 }] },
    ] },
  { id: 'gulls_event',
    kallio: { name: 'The Gulls Have Your Bag', text: 'Three of them, working together, which gulls do not do. One has the strap. They are waiting to see what you will trade for it.' },
    fantasy: { name: 'The Harpies Have Your Pack', text: 'Three of them, working together, which they do not do. One has the strap. They are waiting to see what you will trade.' },
    options: [
      { kallio: { label: 'Let them have it. (Remove a card, heal 12)' }, fantasy: { label: 'Let them have it. (Remove a card, heal 12)' }, effects: [{ type: 'remove' }, { type: 'heal', n: 12 }] },
      { kallio: { label: 'Fight for it. (Lose 6 HP, upgrade a card)' }, fantasy: { label: 'Fight for it. (Lose 6 HP, upgrade a card)' }, effects: [{ type: 'hp', n: 6 }, { type: 'upgrade' }] },
    ] },
];

// The park, in the two skins. Grittier than a postcard: the greens are
// weathered, the light is late and low, and nothing is saturated.
// ── the hour, and the grade ───────────────────────────────────────────────
// Owner, 2026-09-05: *"let's go Eldritch Kallio and looking a bit more like
// Darkest Dungeon. evening is darker etc"*.
//
// Darkest Dungeon's look is not a filter, it is a LIGHTING SETUP: one warm
// source close to the party, everything past its falloff going to black, and
// a cold edge separating a figure from the dark behind it. So the hour is data
// — a light rig and a film grade per skin — and every surface reads it. The
// grade is the same numbers a colourist would name: exposure, a lifted black
// that is never truly black, saturation pulled out, shadows tinted cold,
// highlights tinted toward the torch, and a vignette that does most of the
// work of making a frame feel enclosed.
const MOOD = {
  kallio: {
    torch: '#ffb765', torchI: 15, torchAt: [-3.6, 1.2, 2.6], torchFar: 21, torchDecay: 1.35,
    sun: '#ffe2b4', sunI: 0.1,
    // A second, dimmer warm source over the ENEMY ROW. Falloff is the look, but
    // a rat nobody can see is not atmosphere, it is a missing telegraph — DD
    // lights the RANK, not the room.
    rank: '#e09a52', rankI: 5.5, rankFar: 13, rankDecay: 1.5,
    figureFloor: 0.52,        // no cutout is ever darker than this, whatever the falloff
    flicker: 0.16,            // the torch is not steady; dread is unreliable light
    sky: '#33465a', ground: '#0c1010', fillI: 0.62,   // the last of the daylight
    rim: '#6f93ad', rimI: 0.75,                       // a cold edge off the canal
    fog: '#0b0f11', fogNear: 9, fogFar: 30,
    grade: { exposure: 0.66, gamma: 1.16, sat: 0.5, lift: 0.035,
      shadow: '#16232e', shadowAmt: 0.5, high: '#e0a45a', highAmt: 0.26,
      vignette: 0.74, grain: 14 },
    // the same torch, painted into the cutouts — see puppet.js
    figure: { warm: '#ffab52', cold: '#101a24', rim: '#6f93ad', depth: '99' },
  },
  fantasy: {
    torch: '#ffc87a', torchI: 14, torchAt: [-3.6, 1.2, 2.6], torchFar: 20, torchDecay: 1.4,
    sun: '#f0dcc0', sunI: 0.08,
    rank: '#c98ae0', rankI: 5, rankFar: 12, rankDecay: 1.55,
    figureFloor: 0.5,
    flicker: 0.2,
    sky: '#2e2a48', ground: '#0a090e', fillI: 0.55,
    rim: '#7d6fb0', rimI: 0.8,
    fog: '#08070c', fogNear: 8, fogFar: 28,
    grade: { exposure: 0.6, gamma: 1.2, sat: 0.42, lift: 0.03,
      shadow: '#1b1830', shadowAmt: 0.56, high: '#d8a06a', highAmt: 0.24,
      vignette: 0.78, grain: 16 },
    figure: { warm: '#ffc06a', cold: '#141026', rim: '#7d6fb0', depth: 'a0' },
  },
};

// Evening values. Nothing here is a daylight colour with the brightness taken
// off: a canopy at dusk loses its yellow before it loses its green, and sodium
// light on a far bank is the one warm thing left in the frame.
// The run starts in DAYLIGHT. The day rig is a sun and no torch; the grade is
// nearly straight. Night is the evening rig pushed further: the torch is all
// there is, the fog closes in, the grade crushes and the tint splits harder.
// The arena lerps between the three by the hour the run has reached.
const DAY = {
  kallio: {
    torch: '#ffb765', torchI: 0, torchAt: [-3.6, 1.2, 2.6], torchFar: 21, torchDecay: 1.35,
    sun: '#ffe2b4', sunI: 1.45,
    rank: '#e09a52', rankI: 0, rankFar: 13, rankDecay: 1.5,
    figureFloor: 1, flicker: 0,
    sky: '#a8bac6', ground: '#3a4034', fillI: 1.05,
    rim: '#7e939c', rimI: 0.85,
    fog: '#8e9a98', fogNear: 18, fogFar: 52,
    grade: { exposure: 1.0, gamma: 1.0, sat: 0.92, lift: 0, shadow: '#2a3038', shadowAmt: 0.08, high: '#ffe8c0', highAmt: 0.08, vignette: 0.4, grain: 6 },
    figure: { warm: '#fff0d0', cold: '#3a4858', rim: '#dce8f0', depth: '55' },
  },
  fantasy: {
    torch: '#ffc87a', torchI: 0, torchAt: [-3.6, 1.2, 2.6], torchFar: 20, torchDecay: 1.4,
    sun: '#f0dcc0', sunI: 1.3,
    rank: '#c98ae0', rankI: 0, rankFar: 12, rankDecay: 1.55,
    figureFloor: 1, flicker: 0,
    sky: '#8a90b0', ground: '#2e3428', fillI: 0.95,
    rim: '#8a8ab0', rimI: 0.8,
    fog: '#7e8090', fogNear: 16, fogFar: 48,
    grade: { exposure: 0.96, gamma: 1.02, sat: 0.85, lift: 0, shadow: '#2a2838', shadowAmt: 0.1, high: '#f0dcc0', highAmt: 0.08, vignette: 0.45, grain: 8 },
    figure: { warm: '#f8e8d0', cold: '#383050', rim: '#d0c8e8', depth: '60' },
  },
};
const NIGHT = {
  kallio: {
    torch: '#ffa040', torchI: 17, torchAt: [-3.6, 1.2, 2.6], torchFar: 20, torchDecay: 1.4,
    sun: '#ffe2b4', sunI: 0,
    rank: '#d88a42', rankI: 5, rankFar: 12, rankDecay: 1.6,
    figureFloor: 0.46, flicker: 0.22,
    sky: '#1a2634', ground: '#050605', fillI: 0.34,
    rim: '#4f7da0', rimI: 0.9,
    fog: '#05070a', fogNear: 7, fogFar: 24,
    grade: { exposure: 0.42, gamma: 1.3, sat: 0.4, lift: 0.03, shadow: '#0e1a26', shadowAmt: 0.6, high: '#d09040', highAmt: 0.3, vignette: 0.92, grain: 20 },
    figure: { warm: '#ffa040', cold: '#0a1220', rim: '#4f7da0', depth: 'b0' },
  },
  fantasy: {
    torch: '#ffc06a', torchI: 16, torchAt: [-3.6, 1.2, 2.6], torchFar: 19, torchDecay: 1.45,
    sun: '#f0dcc0', sunI: 0,
    rank: '#b878d8', rankI: 4.6, rankFar: 11, rankDecay: 1.6,
    figureFloor: 0.44, flicker: 0.26,
    sky: '#1c1830', ground: '#050408', fillI: 0.3,
    rim: '#6a5aa8', rimI: 0.95,
    fog: '#040308', fogNear: 6, fogFar: 22,
    grade: { exposure: 0.38, gamma: 1.34, sat: 0.34, lift: 0.025, shadow: '#120e26', shadowAmt: 0.64, high: '#c88a5a', highAmt: 0.28, vignette: 0.94, grain: 22 },
    figure: { warm: '#ffb860', cold: '#0c0818', rim: '#6a5aa8', depth: 'b8' },
  },
};

export const THEMES = {
  kallio: { name: 'Kallio', jokerWord: 'friends', findWord: 'Bottle', energyWord: 'energy',
    mood: MOOD.kallio, moods: { day: DAY.kallio, evening: MOOD.kallio, night: NIGHT.kallio },
    park: { sky: ['#1e2730', '#7a5334'], canopy: ['#131b16', '#1e2b1d', '#2e3d23'], grass: '#232a19', path: '#3c362c', stone: '#2f2d2a', bench: '#463a2e', iron: '#141311', water: '#111819' } },
  fantasy: { name: 'Fantasy', jokerWord: 'familiars', findWord: 'Trinket', energyWord: 'mana',
    mood: MOOD.fantasy, moods: { day: DAY.fantasy, evening: MOOD.fantasy, night: NIGHT.fantasy },
    park: { sky: ['#171a2a', '#5e3a46'], canopy: ['#0f150f', '#182219', '#26301d'], grass: '#1b2317', path: '#332e27', stone: '#282629', bench: '#3a3028', iron: '#121014', water: '#0d1317' } },
};

export const RULES = {
  energy: 3,
  draw: 5,
  handMax: 10,
  jokerMax: 5,
  healAfterFight: 6,
  restHeal: 0.3,           // a rest site heals this share of max HP
  healBetweenActs: 0.5,    // beating an act's boss: dusk falls, and you catch your breath
  mutation: [1, 1.15, 1.3],// enemy HP × by nightfall level 0/1/2; level 2 also brings 1 Strength
  vulnerable: 1.5,
  weak: 0.75,
  frail: 0.75,             // block gained ×0.75
};
