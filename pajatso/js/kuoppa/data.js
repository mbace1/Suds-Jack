// KUOPPA on the Pajatso face — every number the run is made of, as data.
//
// The owner's answers (2026-09-27) set the shape: keep KUOPPA's debt and
// deadline (CloverPit's run), and bolt the pachinko parts on IN ORDER, in this
// mode only — the base machine never gets them. So a run is: the house hands
// you coins to shoot each round, whatever the machine pays goes in your purse,
// every third round a debt is due, and each debt paid bolts the next part onto
// the face. Charms from the vendor between rounds bend the machine you have.

// ── the debt ─────────────────────────────────────────────────────────────
// Eight padlocks. Tuned with test/run.mjs (the bot), never by eye.
export const DEBTS = [30, 60, 110, 175, 255, 350, 460, 600];
export const LOCKS = DEBTS.length;
export const ROUNDS = 3;                 // rounds to a deadline
export const DROPS = 20;                 // coins the house hands you each round…
export const DROPS_PER_LOCK = 5;         // …and five more for every padlock opened
export const START_PURSE = 5;

// ── the parts, bolted on one per debt paid, in the owner's order ─────────
export const PARTS = ['chucker', 'tulips', 'fever', 'windmills', 'chain', 'multiplier'];

// ── the reels (part 1): a lottery drawn when a coin drops in the chucker ──
export const OUTCOMES = { miss: 56, cherry: 18, bell: 11, coin: 6, clover: 5, seven: 2.2, mask: 0 };
export const MASK_PER_DEADLINE = 0.9;    // the raccoon mask grows with every lock opened
export const MASK_TAKES = 0.25;          // a line of masks takes a quarter of the purse
export const REEL_PAY = { cherry: 3, bell: 5, coin: 10, seven: 25 };
export const CLOVER_DROPS = 3;           // a line of clovers hands you three more coins
export const HOLD = 4;                   // spins that can wait their turn

// ── FEVER (part 3): a jackpot (sevens or the POTTI) opens the gate on the right ──────────────────
// For a count of pulls the attacker under the right half of the window row
// is open: a coin that misses the windows there is paid instead of joining
// the pot — shoot right.
export const FEVER = { pulls: 10, pays: 2 };
// ── CHAIN (part 5): a jackpot makes the next likelier, and the POTTI grows ──
export const CHAIN = { spins: 8, sevenX: 3, pottiPerRound: 2 };
// ── MULTIPLIER (part 6): the R windows become ×3 — three coins to play ──
export const TIMES3 = 3;

// ── charms: how their effects combine ─────────────────────────────────────
export const RULES = {
  openPotti: 'max', winWiden: 'sum', rubberPins: 'max', wideTulips: 'max',
  halfPay: 'sum', rPay: 'sum', extraDrops: 'sum', interest: 'sum', wSeven: 'sum',
  magnet: 'sum', feverLong: 'sum', pottiCols: 'max',
};

// `needs` is a part the charm does nothing without; the vendor only stocks
// what can work on the machine you have.
export const CHARMS = [
  { id: 'bent_nail', price: 12, rules: { openPotti: 1 },
    name: { en: 'Bent Nail', fi: 'Taivutettu naula', ja: '曲がった釘' },
    text: { en: 'The nail over the 7:00 is bent aside. The POTTI is easier to find.',
      fi: 'Naula 7:00:n yllä on taivutettu sivuun. POTTI on helpompi osua.',
      ja: '7:00の上の釘が曲げられている。ポッティに入りやすくなる。' } },
  { id: 'brass_plates', price: 10, rules: { halfPay: 0.5 },
    name: { en: 'Brass Plates', fi: 'Messinkilaatat', ja: '真鍮のプレート' },
    text: { en: 'The 1:50 windows are re-printed 2:00.', fi: '1:50-ikkunat on painettu uudestaan: 2:00.', ja: '1:50の窓が2:00に刷り直される。' } },
  { id: 'wide_windows', price: 9, rules: { winWiden: 0.25 },
    name: { en: 'Filed Windows', fi: 'Viilatut ikkunat', ja: '削った窓' },
    text: { en: 'Every window is filed a little wider.', fi: 'Jokainen ikkuna on viilattu vähän leveämmäksi.', ja: 'すべての窓が少し広く削られる。' } },
  { id: 'heavy_r', price: 6, rules: { rPay: 1 },
    name: { en: 'Heavy R', fi: 'Raskas R', ja: '重いR' },
    text: { en: 'R gives the coin back and one more.', fi: 'R antaa kolikon takaisin ja yhden lisää.', ja: 'Rはコインを返し、さらに1枚。' } },
  { id: 'extra_coins', price: 8, rules: { extraDrops: 5 },
    name: { en: 'Regular', fi: 'Kanta-asiakas', ja: '常連' },
    text: { en: 'The barman knows you: five more coins every round.', fi: 'Baarimikko tuntee sinut: viisi kolikkoa lisää joka kierroksella.', ja: 'バーテンが顔を覚えた：毎ラウンド5枚多い。' } },
  { id: 'savings', price: 7, rules: { interest: 0.1 },
    name: { en: 'Savings Book', fi: 'Säästökirja', ja: '貯金通帳' },
    text: { en: 'Ten per cent on your purse at the end of every round.', fi: 'Kymmenen prosenttia korkoa kukkarolle joka kierroksen lopussa.', ja: '毎ラウンドの終わりに財布の10%の利息。' } },
  { id: 'rubber_nails', price: 6, rules: { rubberPins: 1 },
    name: { en: 'Rubber Nails', fi: 'Kuminaulat', ja: 'ゴムの釘' },
    text: { en: 'Every nail bounces harder.', fi: 'Jokainen naula kimmottaa kovempaa.', ja: 'すべての釘がよく跳ねる。' } },
  { id: 'fat_pot', price: 11, rules: { pottiCols: 5 },
    name: { en: 'Fat Pot', fi: 'Lihava potti', ja: '太ったポット' },
    text: { en: 'The POTTI opens the five middle columns instead of three.', fi: 'POTTI avaa viisi keskimmäistä pinoa kolmen sijaan.', ja: 'ポッティが真ん中の3列ではなく5列を開く。' } },
  { id: 'lucky_seven', price: 10, needs: 'chucker', rules: { wSeven: 2.2 },
    name: { en: 'Lucky Seven', fi: 'Onnen seiska', ja: 'ラッキーセブン' },
    text: { en: 'Sevens come up twice as often on the reels.', fi: 'Seiskoja tulee rullilla kaksi kertaa useammin.', ja: 'リールの7が2倍出やすい。' } },
  { id: 'magnet', price: 9, needs: 'chucker', rules: { magnet: 60 },
    name: { en: 'Magnet', fi: 'Magneetti', ja: '磁石' },
    text: { en: 'A magnet behind the start chucker. Coins passing near it lean in.', fi: 'Magneetti aloitustaskun takana. Ohi menevät kolikot kallistuvat sitä kohti.', ja: 'スタートチャッカーの裏に磁石。近くのコインが寄っていく。' } },
  { id: 'wired_tulips', price: 8, needs: 'tulips', rules: { wideTulips: 1 },
    name: { en: 'Wired Tulips', fi: 'Sidotut tulppaanit', ja: '針金のチューリップ' },
    text: { en: 'The tulips are wired open and never close.', fi: 'Tulppaanit on sidottu auki eivätkä koskaan sulkeudu.', ja: 'チューリップが針金で開きっぱなし。' } },
  { id: 'long_fever', price: 9, needs: 'fever', rules: { feverLong: 6 },
    name: { en: 'Long Fever', fi: 'Pitkä kuume', ja: '長いフィーバー' },
    text: { en: 'FEVER lasts six more pulls.', fi: 'FEVER kestää kuusi vetoa pidempään.', ja: 'フィーバーが6回長く続く。' } },
];
export const SLOTS = 6;                  // charms you can carry
export const OFFERS = 3;                 // what the vendor lays out
export const REROLL = 2;                 // mk for another look
