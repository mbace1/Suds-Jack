// PACHI PIT — every number the run is made of, as data. The engine reads ids
// and rule keys out of here and knows nothing about "a horseshoe" or "a mask".

// ── the debt ─────────────────────────────────────────────────────────────
// Eight padlocks on the door. Each deadline is three shifts; after the eighth
// the door opens, and past it the shaft goes on at x1.6 a deadline.
export const DEBTS = [30, 65, 120, 200, 320, 500, 780, 1200];
export const SHIFTS_PER_DEADLINE = 3;
export const LOCKS = DEBTS.length;
export function debtFor(d) {           // d is 1-based
  if (d <= DEBTS.length) return DEBTS[d - 1];
  return Math.round(DEBTS[DEBTS.length - 1] * Math.pow(1.6, d - DEBTS.length) / 10) * 10;
}

export const START = {
  wallet: 5,
  drops: 12,            // coins the house gives you to shoot, each shift
  slots: 5,             // charm slots
  interest: 0.08,       // what the ATM pays on its balance at the end of a shift
  fireRate: 1.6,        // coins a second while FIRE is held — a real handle's pace
  bandit: 0.25,         // share of the wallet a paw takes
};

// ── coins ────────────────────────────────────────────────────────────────
// A coin's worth is fixed when it is minted or stamped, never when it pays:
// the one on the lip is worth what it says.
export const COINS = {
  copper: { value: 1, scale: 1, next: 'silver' },
  silver: { value: 5, scale: 1, next: 'gold' },
  gold:   { value: 25, scale: 1, next: 'gold' },
  clover: { value: 1, scale: 1, next: 'silver' },   // pays a free spin when it reaches the tray
  jumbo:  { value: 10, scale: 1.45, next: 'jumbo' },
  trash:  { value: 0, scale: 1.1, next: 'trash' },  // the raccoon's junk
  prize:  { value: 0, scale: 1.6, next: 'prize' },  // a capsule: a charm when it falls
};

// ── the reels ────────────────────────────────────────────────────────────
// The lottery drawn on every start. MASK grows with every deadline — the
// house's 666.
export const OUTCOMES = {
  miss: 56, cherry: 17, bell: 10, coin: 6, clover: 4.5, seven: 1.6, mask: 4.9,
};
export const MASK_PER_DEADLINE = 1.25;
// what a line of three pays, as coins dropped on the shelf
export const PAYS = {
  cherry: { n: 3, kind: 'copper' },
  bell:   { n: 5, kind: 'copper' },
  coin:   { n: 2, kind: 'silver' },
  clover: { n: 3, kind: 'copper', spin: 1 },
};
export const FEVER = { drops: 8, perEntry: 4, kind: 'copper' };

// what the board's pockets pay, before charms
export const POCKETS = {
  start:  { shelf: 0 },               // the spin is the payout
  tulip:  { shelf: 2 },
  pocket: { tray: 2 },                // straight to the tray: the board's only direct pay
};

// ── rules: how charm and deal effects combine ─────────────────────────────
// Every effect is a key here. `sum` adds, `mul` multiplies, `max` keeps the
// biggest. A charm cannot invent a key — which is how "a charm bends a number
// the machine already has, and never adds a verb" is enforced rather than hoped.
export const RULES = {
  // the board (layout mods are rebuilt into the nails)
  lifeNails: { mode: 'sum', base: 0 },
  chuckerWiden: { mode: 'sum', base: 0 },
  rubberPins: { mode: 'max', base: 0 },
  thirdWindmill: { mode: 'max', base: 0 },
  rightWay: { mode: 'max', base: 0 },
  wideTulips: { mode: 'max', base: 0 },
  magnet: { mode: 'sum', base: 0 },
  // stamps: a coin through this pocket is minted one grade up
  stampStart: { mode: 'sum', base: 0 },
  stampTulip: { mode: 'sum', base: 0 },
  stampPocket: { mode: 'max', base: 0 },   // 1 = the pocket mints clovers
  stampExtra: { mode: 'sum', base: 0 },    // every stamp strikes this many grades more
  mint: { mode: 'sum', base: 0 },          // the hopper's coins come out this many grades up
  goldValue: { mode: 'max', base: 25 },
  silverEvery: { mode: 'sum', base: 0 },   // one coin in N you shoot is minted silver (N = 10 / this)
  tulipPay: { mode: 'max', base: 2 },
  bedTop: { mode: 'sum', base: 0 },        // coins the house tips onto the shelf at the start of a shift
  // the reels
  wSeven: { mode: 'mul', base: 1 }, wCherry: { mode: 'mul', base: 1 }, wBell: { mode: 'mul', base: 1 },
  wCoin: { mode: 'mul', base: 1 }, wClover: { mode: 'mul', base: 1 }, wMask: { mode: 'mul', base: 1 },
  maskAdd: { mode: 'sum', base: 0 },
  luck: { mode: 'sum', base: 0 },           // re-draws of a miss
  payMul: { mode: 'mul', base: 1 },
  bellPay: { mode: 'max', base: 5 },
  // the pusher
  stroke: { mode: 'sum', base: 0 },
  pace: { mode: 'mul', base: 1 },           // strokes per second, relative
  guards: { mode: 'sum', base: 0, cap: 1 },
  tilt: { mode: 'sum', base: 0 },
  heavy: { mode: 'max', base: 0 },          // coins landing on the bed are jumbo-sized copper
  // money
  interest: { mode: 'sum', base: START.interest },
  drops: { mode: 'sum', base: START.drops },
  trayMul: { mode: 'mul', base: 1 },
  discount: { mode: 'mul', base: 1 },
  slots: { mode: 'sum', base: START.slots },
  feverDrops: { mode: 'sum', base: FEVER.drops },
  // the raccoon
  mousetrap: { mode: 'sum', base: 0 },
  trashValue: { mode: 'max', base: 0 },
};

// ── charms ────────────────────────────────────────────────────────────────
// Families (GDD §5.1): nails · stamps · reels · pusher · money · raccoon.
// `rarity` 1..3 sets how often the vendor stocks it.
export const CHARMS = [
  // nails — the nail doctor bends the machine
  { id: 'life_nails', family: 'nails', rarity: 1, price: 6, name: 'Bent Life Nails',
    text: 'The two nails over the start chucker are bent open. More coins find it.',
    rules: { lifeNails: 0.4, chuckerWiden: 0.5 } },
  { id: 'rubber_pins', family: 'nails', rarity: 1, price: 5, name: 'Rubber Pins',
    text: 'Every nail bounces harder. Coins wander into pockets they would have fallen past.',
    rules: { rubberPins: 1 } },
  { id: 'windmill', family: 'nails', rarity: 1, price: 4, name: 'Third Windmill',
    text: 'A windmill under the top nails. It sends coins where the rail never would.',
    rules: { thirdWindmill: 1 } },
  { id: 'right_way', family: 'nails', rarity: 2, price: 7, name: 'Right Way',
    text: 'A second way on the right side, down to the life nails. Mid-power shots find the chucker too.',
    rules: { rightWay: 1 } },
  { id: 'wide_tulips', family: 'nails', rarity: 2, price: 7, name: 'Wide Tulips',
    text: 'The tulips are wired open and never close.',
    rules: { wideTulips: 1 } },
  { id: 'magnet', family: 'nails', rarity: 2, price: 8, name: 'Magnet',
    text: 'A magnet under the start chucker. Coins passing near it lean in.',
    rules: { magnet: 70 } },

  // stamps — the pocket a coin passes through decides what it is worth
  { id: 'silver_die', family: 'stamps', rarity: 2, price: 8, name: 'Silver Die',
    text: 'A coin through the start chucker comes out one grade up: copper to silver (5), silver to gold (25).',
    rules: { stampStart: 1 } },
  { id: 'gold_leaf', family: 'stamps', rarity: 2, price: 9, name: 'Gold Leaf',
    text: 'A coin through a tulip comes out one grade up, and tulips drop 3 coins instead of 2.',
    rules: { stampTulip: 1, tulipPay: 3 } },
  { id: 'silver_lining', family: 'stamps', rarity: 1, price: 6, name: 'Silver Lining',
    text: 'One coin in every ten you shoot is minted silver before it leaves the handle.',
    rules: { silverEvery: 1 } },
  { id: 'rubber_stamp', family: 'stamps', rarity: 3, price: 12, name: 'Rubber Stamp',
    text: 'Every stamp strikes twice: a coin that would come out silver comes out gold.',
    rules: { stampExtra: 1 } },
  { id: 'mint', family: 'stamps', rarity: 3, price: 13, name: 'The Mint',
    text: 'The payout hopper drops silver where it dropped copper — every reel, tulip and FEVER payout.',
    rules: { mint: 1 } },
  { id: 'gold_standard', family: 'stamps', rarity: 2, price: 9, name: 'Gold Standard',
    text: 'Gold coins are worth 40 instead of 25.',
    rules: { goldValue: 40 } },
  { id: 'clover_press', family: 'stamps', rarity: 1, price: 5, name: 'Clover Press',
    text: 'A coin through a side pocket is pressed into a clover coin. When a clover coin reaches your tray, the reels spin.',
    rules: { stampPocket: 1 } },

  // reels — the lottery
  { id: 'lucky_seven', family: 'reels', rarity: 2, price: 9, name: 'Lucky Seven',
    text: 'Sevens come up twice as often. FEVER opens the gate on the right.',
    rules: { wSeven: 2 } },
  { id: 'horseshoe', family: 'reels', rarity: 2, price: 8, name: 'Horseshoe',
    text: 'A losing spin is drawn again, once.',
    rules: { luck: 1 } },
  { id: 'hot_hopper', family: 'reels', rarity: 3, price: 11, name: 'Hot Hopper',
    text: 'Every reel payout drops twice the coins.',
    rules: { payMul: 2 } },
  { id: 'bell_boy', family: 'reels', rarity: 1, price: 5, name: 'Bell Boy',
    text: 'Three bells drop 12 coins instead of 5, and bells come up more.',
    rules: { bellPay: 12, wBell: 1.4 } },
  { id: 'cherry_pit', family: 'reels', rarity: 1, price: 4, name: 'Cherry Pit',
    text: 'Cherries come up twice as often.',
    rules: { wCherry: 2 } },

  // pusher — the Raccoin half
  { id: 'gutter_guards', family: 'pusher', rarity: 1, price: 7, name: 'Gutter Guards',
    text: 'Tin plates over most of the side gutters. Less for the house.',
    rules: { guards: 0.65 } },
  { id: 'loaded_bed', family: 'pusher', rarity: 1, price: 6, name: 'Loaded Bed',
    text: 'Forty coins tipped onto the shelf when the machine next starts, and ten more at the start of every shift.',
    rules: { bedTop: 10 }, onBuy: { drop: 40 } },
  { id: 'tilted_bed', family: 'pusher', rarity: 3, price: 10, name: 'Tilted Bed',
    text: 'Somebody shimmed the back legs. The whole bed creeps toward you.',
    rules: { tilt: 0.1 } },
  { id: 'heavy_coins', family: 'pusher', rarity: 2, price: 7, name: 'Heavy Coins',
    text: 'Your coins land on the bed as fat jumbo coins that shove harder (and are worth 10).',
    rules: { heavy: 1 } },
  { id: 'fast_motor', family: 'pusher', rarity: 1, price: 5, name: 'Fast Motor',
    text: 'The pusher strokes a third faster, and the house tips five coins on the shelf every shift to feed it.',
    rules: { pace: 1.35, bedTop: 5 } },

  // money — the ATM and the vendor
  { id: 'piggy_bank', family: 'money', rarity: 1, price: 5, name: 'Piggy Bank',
    text: 'The ATM pays 8% more interest on its balance at the end of every shift.',
    rules: { interest: 0.08 } },
  { id: 'collection_plate', family: 'money', rarity: 3, price: 12, name: 'Collection Plate',
    text: 'Everything that reaches your tray is worth half again.',
    rules: { trayMul: 1.5 } },
  { id: 'overtime', family: 'money', rarity: 2, price: 8, name: 'Overtime',
    text: 'The house gives you three more coins to shoot every shift.',
    rules: { drops: 3 } },
  { id: 'coupon', family: 'money', rarity: 1, price: 4, name: 'Coupon',
    text: 'Everything at the vendor costs a quarter less.',
    rules: { discount: 0.75 } },
  { id: 'fever_lamp', family: 'money', rarity: 2, price: 7, name: 'Fever Lamp',
    text: 'FEVER loads five more coins.',
    rules: { feverDrops: 5 } },

  // the raccoon
  { id: 'mousetrap', family: 'raccoon', rarity: 1, price: 4, name: 'Mousetrap',
    text: 'The first paw that comes down each deadline gets caught instead of your coins.',
    rules: { mousetrap: 1 } },
  { id: 'trash_panda', family: 'raccoon', rarity: 2, price: 6, name: "Toko's Junk",
    text: "Toko's junk is worth 4 when it falls in your tray.",
    rules: { trashValue: 4 } },
];

// ── the phone ─────────────────────────────────────────────────────────────
// After every paid deadline the raccoon calls with three deals. `rules` are
// permanent; `now` is something that happens when you hang up.
export const DEALS = [
  { id: 'overtime', name: 'OVERTIME', text: 'Two more coins to shoot, every shift, from now on.', rules: { drops: 2 } },
  { id: 'renovation', name: 'RENOVATION', text: 'Another charm slot on the rack.', rules: { slots: 1 } },
  { id: 'soft_loan', name: 'SOFT LOAN', text: 'Next debt is a quarter smaller. The reels grow two more masks, for good.',
    rules: { maskAdd: 2 }, now: { debtCut: 0.25 } },
  { id: 'house_coins', name: 'HOUSE COINS', text: 'Thirty coins dropped on the shelf, right now.', now: { drop: { n: 30, kind: 'copper' } } },
  { id: 'silverware', name: 'SILVERWARE', text: 'Twelve copper coins on the bed turn silver.', now: { upgrade: 12 } },
  { id: 'prize', name: 'A PRIZE', text: 'A prize capsule on the shelf. Push it off and it opens into a charm.', now: { drop: { n: 1, kind: 'prize' } } },
  { id: 'nail_job', name: 'NAIL JOB', text: 'A man comes at night and bends the life nails. For good.', rules: { lifeNails: 0.3, chuckerWiden: 0.25 } },
  { id: 'interest', name: 'BETTER RATE', text: 'The ATM pays 5% more interest.', rules: { interest: 0.05 } },
  { id: 'pawn', name: 'PAWN IT', text: 'Coins worth a third of the next debt, now. Your dearest charm, gone.',
    now: { cash: 0.34, pawn: true } },
  { id: 'fever_tip', name: 'A TIP', text: 'The next shift starts in FEVER.', now: { fever: true } },
];

// the raccoon's lines on the phone, one per deadline; he gets less polite
export const CALLS = [
  'Paid. Look at you. Pick one, I have other tenants.',
  'Two locks. The door is starting to think about you.',
  'Three. My accountant says I should raise the rent. I agreed with him.',
  'Halfway. You know what is under that floor? Neither do I. Pick.',
  'Five. The masks are getting restless. So am I.',
  'Six. I have never had a tenant see six. Pick one and do not get used to it.',
  'Seven. One more and I have to open that door. I hate opening that door.',
];
