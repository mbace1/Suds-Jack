// KUOPPA on the Pajatso face — every number the run is made of, as data.
//
// v5, after the owner played v4: *"charms like Clover Pit and maybe Jokers
// like Balatro, so levels can be raised and ante pushed 10x each 3 rounds or
// so"*. So a round is a HAND: every coin that lands somewhere adds CHIPS or
// MULT, and when the round's last coin is down the machine scores
// CHIPS × MULT toward the ANTE, which is ×10 every three rounds. Money is
// separate and small (markka, for the vendor), the way Balatro keeps its
// dollars apart from its score. The parts still arrive in the owner's order,
// one per ante cleared, in this mode only.

const T = (en, fi, ja) => ({ en, fi, ja });

// ── the antes ────────────────────────────────────────────────────────────
export const LOCKS = 8;
export const ANTE_BASE = 100;            // lock 1 wants 100, lock 2 1 000, … lock 8 a billion
export const ANTE_X = 10;
export const anteFor = a => ANTE_BASE * ANTE_X ** (a - 1);
export const ROUNDS = 3;                 // rounds to reach it
export const DROPS = 20;                 // coins the house hands you each round…
export const DROPS_PER_LOCK = 8;         // …and eight more for every lock opened

// ── money: markka, for the vendor only ─────────────────────────────────────
export const START_MONEY = 4;
export const ROUND_PAY = 3;              // the barman's cut, every round
export const CLEAR_PAY = 3;              // an ante cleared…
export const EARLY_PAY = 2;              // …plus this for every round it did not need
export const INTEREST = { per: 5, cap: 5 };   // 1 mk for every 5 held, at most 5

// ── the parts, bolted on one per ante cleared, in the owner's order ──────
export const PARTS = ['chucker', 'tulips', 'fever', 'windmills', 'chain', 'multiplier'];

// ── what a hit is worth: base, and what each level adds (Balatro's hand
// levels). Level plates from the vendor raise them. ─────────────────────
export const HITS = {
  R:        { chips: 0,  mult: 1, lv: { mult: 1 } },
  one:      { chips: 10, mult: 0, lv: { chips: 10, mult: 1 } },
  half:     { chips: 15, mult: 0, lv: { chips: 15, mult: 1 } },
  potti:    { chips: 70, mult: 0, xmult: 2, lv: { chips: 40, mult: 3 } },
  tulip:    { chips: 10, mult: 1, lv: { chips: 10, mult: 1 } },
  heso:     { chips: 5,  mult: 0, lv: { chips: 10, mult: 1 } },
  attacker: { chips: 15, mult: 0, lv: { chips: 10, mult: 0.5 } },
  reel:     { chips: 0,  mult: 0, lv: {} },
  x3:       { chips: 0,  mult: 0, lv: {} },
  nudge:    { chips: 0,  mult: 0, lv: {} },
};
export const LEVELS = ['R', 'one', 'half', 'potti', 'tulip', 'heso', 'attacker', 'reel'];
// a level only means something once its part is on the machine
export const LEVEL_NEEDS = { tulip: 'tulips', heso: 'chucker', attacker: 'fever', reel: 'chucker' };

// ── the reels (part 1): a lottery drawn when a coin drops in the heso ─────
export const OUTCOMES = { miss: 56, cherry: 18, bell: 11, coin: 6, clover: 5, seven: 2.2, mask: 0 };
export const MASK_PER_LOCK = 0.9;        // the raccoon mask grows with every lock opened
// what a line pays, before the reel level multiplies the chips
export const REEL = { cherry: { chips: 30 }, bell: { chips: 60 }, coin: { money: 3 }, clover: { drops: 3 }, seven: { xmult: 2 }, mask: { halveChips: true } };
export const HOLD = 4;                   // spins that can wait their turn

// ── 大当たり (part 3): a jackpot opens the ATTACKER for a count of pulls ──
export const FEVER = { pulls: 10 };
// ── 確変 RUSH (part 5): after a jackpot, sevens ×3 and the electric tulip open,
// and the POTTI's chips grow every round until somebody takes them ──
export const CHAIN = { spins: 8, sevenX: 3, pottiPerRound: 20 };
// ── 出玉 (part 6): the R windows become ×3 — three more coins to shoot ──
export const TIMES3 = 3;

// ── THE DEADLINE ROUND (owner: "the Ante part is like Clover Pit deadline
// payment or the 3rd fight in Balatro"): the third round of every ante is the
// one the payment falls due on, and it carries a twist — announced when the
// ante begins, so you can shop for it, the way Balatro shows its boss blind.
export const BOSSES = [
  { id: 'short_hand', name: T('The Short Hand', 'Lyhyt käsi', '短い手'),
    text: T('The deadline round hands out 10 fewer coins.', 'Eräpäivän kierroksella saat 10 kolikkoa vähemmän.', '期限のラウンドはコインが10枚少ない。') },
  { id: 'tilt_sensor', name: T('The Tilt Sensor', 'Kallistusanturi', '傾きセンサー'),
    text: T('The deadline round tilts on the first nudge.', 'Eräpäivän kierroksella jo ensimmäinen tönäisy kallistaa.', '期限のラウンドは最初のナッジで即ティルト。') },
  { id: 'taped_potti', name: T('The Taped POTTI', 'Teipattu POTTI', 'テープのポッティ'),
    text: T('The 7:00 is taped shut for the deadline round.', '7:00 on teipattu kiinni eräpäivän kierroksella.', '期限のラウンドは7:00がテープで塞がれる。') },
  { id: 'dry_r', name: T('The Dry R', 'Kuiva R', '乾いたR'),
    text: T('R scores nothing in the deadline round.', 'R ei tuo mitään eräpäivän kierroksella.', '期限のラウンドはRが何も数えない。') },
  { id: 'watered', name: T('The Watered Beer', 'Laimennettu olut', '薄めたビール'),
    text: T('Chips count half in the deadline round.', 'Pelimerkit lasketaan puoliksi eräpäivän kierroksella.', '期限のラウンドはチップが半分。') },
  { id: 'flat', name: T('The Flat Plates', 'Latteat laatat', '平らなプレート'),
    text: T('Every window scores at level 1 in the deadline round.', 'Jokainen ikkuna lasketaan tasolla 1 eräpäivän kierroksella.', '期限のラウンドはすべての窓がレベル1。') },
  { id: 'toko_night', needs: 'chucker', name: T("Toko's Night", 'Tokon ilta', 'トコの夜'),
    text: T('Toko comes up three times as often on the reels in the deadline round.', 'Toko tulee rullilla kolme kertaa useammin eräpäivän kierroksella.', '期限のラウンドはリールにトコが3倍出る。') },
];

// ── the vendor ──────────────────────────────────────────────────────────
export const JOKER_SLOTS = 5;
export const CHARM_SLOTS = 4;
export const PLATE_PRICE = 3;
export const REROLL = 2;                 // and one more each time, until the next vendor
export const SELL = 0.5;                 // a joker or charm sells for half what it cost

// JOKERS change the SCORE (Balatro). Each is a hook the run calls:
//   hit(ctx, kind)  — a coin scored `kind`; bend ctx.chips / ctx.mult
//   end(ctx)        — the round's last coin is down, before CHIPS × MULT
//   on(ev, j)       — something happened in the run; `j.n` is the joker's own
//                     counter, for the ones that grow
// `rules` is for the few that change the economy instead.
export const JOKERS = [
  { id: 'bajazzo', price: 4, name: T('Bajazzo', 'Bajazzo', 'バヤッツォ'),
    text: T('+4 mult at the end of every round.', '+4 kerrointa joka kierroksen lopussa.', '毎ラウンドの終わりに倍率+4。'),
    end: c => { c.mult += 4; return '+4 mult'; } },
  { id: 'smokes', price: 4, name: T('Pack of Smokes', 'Tupakka-aski', 'タバコの箱'),
    text: T('+40 chips at the end of every round.', '+40 pelimerkkiä joka kierroksen lopussa.', '毎ラウンドの終わりにチップ+40。'),
    end: c => { c.chips += 40; return '+40'; } },
  { id: 'one_and_half', price: 5, name: T('One-and-a-Half', 'Puolitoista', '一・五'),
    text: T('Every 1:50 hit: +3 mult.', 'Jokainen 1:50-osuma: +3 kerrointa.', '1:50に入るたび倍率+3。'),
    hit: (c, k) => { if (k === 'half') { c.mult += 3; return '+3 mult'; } } },
  { id: 'left_hand', price: 5, name: T('Left Hand', 'Vasenkätinen', '左利き'),
    text: T('Every R hit: +3 more mult.', 'Jokainen R-osuma: +3 kerrointa lisää.', 'Rに入るたび倍率さらに+3。'),
    hit: (c, k) => { if (k === 'R') { c.mult += 3; return '+3 mult'; } } },
  { id: 'gold_tooth', price: 6, name: T('Gold Tooth', 'Kultahammas', '金歯'),
    text: T('×2 mult at the end of a round with a POTTI in it.', '×2 kerroin sen kierroksen lopussa, jolla osui POTTI.', 'ポッティが出たラウンドの終わりに倍率×2。'),
    end: c => { if (c.round.pottis > 0) { c.mult *= 2; return '×2'; } } },
  { id: 'bear', price: 8, name: T('The Karhupuisto Bear', 'Karhupuiston karhu', '熊公園の熊'),
    text: T('×1.5 mult at the end of every round.', '×1,5 kerroin joka kierroksen lopussa.', '毎ラウンドの終わりに倍率×1.5。'),
    end: c => { c.mult *= 1.5; return '×1.5'; } },
  { id: 'streak', price: 6, name: T('Hot Streak', 'Putki', '連チャン'),
    text: T('Every window hit: +1 mult for each window hit in a row before it. A coin in the pot breaks the streak.',
      'Jokainen ikkunaosuma: +1 kerroin jokaisesta peräkkäisestä osumasta ennen sitä. Pottiin mennyt kolikko katkaisee putken.',
      '窓に入るたび、それまでの連続ヒット数だけ倍率+1。ポットに落ちると途切れる。'),
    hit: (c, k) => { if (['R', 'one', 'half', 'potti', 'tulip'].includes(k) && c.round.streak > 1) { c.mult += c.round.streak - 1; return `+${c.round.streak - 1} mult`; } } },
  { id: 'stacker', price: 5, name: T('The Stacker', 'Pinoaja', '積み屋'),
    text: T('Gains +2 chips for every coin that falls into the pot. Adds them at the end of every round.',
      'Kasvaa +2 pelimerkkiä jokaisesta pottiin pudonneesta kolikosta. Lisää ne joka kierroksen lopussa.',
      'ポットに落ちたコイン1枚ごとにチップ+2を貯める。毎ラウンドの終わりに加算。'),
    on: (ev, j) => { if (ev.t === 'lost') j.n = (j.n ?? 0) + 2; },
    end: (c, j) => { if (j.n) { c.chips += j.n; return `+${j.n}`; } }, grows: j => `+${j.n ?? 0}` },
  { id: 'pot_watcher', price: 6, name: T('Pot Watcher', 'Potinvahtija', 'ポットの番人'),
    text: T('At the end of every round: +3 chips for every coin in the pot.', 'Joka kierroksen lopussa: +3 pelimerkkiä jokaisesta potin kolikosta.', '毎ラウンドの終わりに、ポットのコイン1枚ごとにチップ+3。'),
    end: c => { const n = c.run.pot.reduce((a, b) => a + b, 0) * 3; c.chips += n; return `+${n}`; } },
  { id: 'last_orders', price: 6, name: T('Last Orders', 'Valomerkki', 'ラストオーダー'),
    text: T('×2 mult on the last round of an ante.', '×2 kerroin anten viimeisellä kierroksella.', 'アンテ最後のラウンドで倍率×2。'),
    end: c => { if (c.run.round === ROUNDS) { c.mult *= 2; return '×2'; } } },
  { id: 'mirror_ball', price: 7, name: T('Mirror Ball', 'Peilipallo', 'ミラーボール'),
    text: T('The first window hit of every round scores twice.', 'Jokaisen kierroksen ensimmäinen ikkunaosuma lasketaan kahdesti.', '毎ラウンド最初の窓ヒットを2回数える。'),
    retrigger: c => c.round.windows === 1 },
  { id: 'navel', price: 5, needs: 'chucker', name: T('Navel Gazer', 'Napatutkija', 'ヘソ見'),
    text: T('Every coin in the heso: +2 mult.', 'Jokainen kolikko hesoon: +2 kerrointa.', 'ヘソに入るたび倍率+2。'),
    hit: (c, k) => { if (k === 'heso') { c.mult += 2; return '+2 mult'; } } },
  { id: 'lucky_sakke', price: 8, needs: 'chucker', name: T('Seven Sakke', 'Seiska-Sakke', 'セブンのサッケ'),
    text: T('Gains ×0.5 mult for every line of sevens this run. Applies it at the end of every round.',
      'Kasvaa ×0,5 kerrointa jokaisesta seiskarivistä tällä kierroksella. Käyttää sen joka kierroksen lopussa.',
      'このランで7が揃うたび倍率×0.5を貯める。毎ラウンドの終わりに適用。'),
    on: (ev, j) => { if (ev.t === 'reel' && ev.outcome === 'seven') j.n = (j.n ?? 0) + 1; },
    end: (c, j) => { if (j.n) { const x = 1 + 0.5 * j.n; c.mult *= x; return `×${x}`; } }, grows: j => `×${1 + 0.5 * (j.n ?? 0)}` },
  { id: 'tulip_painter', price: 7, needs: 'tulips', name: T('Tulip Painter', 'Tulppaanimaalari', 'チューリップ職人'),
    text: T('Every tulip hit: ×1.2 mult.', 'Jokainen tulppaaniosuma: ×1,2 kerroin.', 'チューリップに入るたび倍率×1.2。'),
    hit: (c, k) => { if (k === 'tulip') { c.mult *= 1.2; return '×1.2'; } } },
  { id: 'fever_dream', price: 8, needs: 'fever', name: T('Fever Dream', 'Kuumeuni', '熱にうかされて'),
    text: T('Every coin through the open attacker: ×1.1 mult.', 'Jokainen kolikko avoimen attackerin läpi: ×1,1 kerroin.', '開いたアタッカーに入るたび倍率×1.1。'),
    hit: (c, k) => { if (k === 'attacker') { c.mult *= 1.1; return '×1.1'; } } },
  { id: 'brass_band', price: 7, name: T('Brass Band', 'Torvisoittokunta', 'ブラスバンド'),
    text: T('Every 1:50 hit: ×1.15 mult.', 'Jokainen 1:50-osuma: ×1,15 kerroin.', '1:50に入るたび倍率×1.15。'),
    hit: (c, k) => { if (k === 'half') { c.mult *= 1.15; return '×1.15'; } } },
  { id: 'neon_r', price: 6, name: T('Neon R', 'Neon-R', 'ネオンのR'),
    text: T('Every R hit: ×1.25 mult.', 'Jokainen R-osuma: ×1,25 kerroin.', 'Rに入るたび倍率×1.25。'),
    hit: (c, k) => { if (k === 'R') { c.mult *= 1.25; return '×1.25'; } } },
  { id: 'campfire', price: 7, name: T('Campfire', 'Nuotio', '焚き火'),
    text: T('Gains ×0.2 mult for every round scored. Applies it at the end of every round.',
      'Kasvaa ×0,2 kerrointa jokaisesta pelatusta kierroksesta. Käyttää sen joka kierroksen lopussa.',
      'ラウンドを重ねるたび倍率×0.2を貯める。毎ラウンドの終わりに適用。'),
    on: (ev, j) => { if (ev.t === 'scored') j.n = (j.n ?? 0) + 1; },
    end: (c, j) => { const x = +(1 + 0.2 * (j.n ?? 0)).toFixed(2); if (x > 1) { c.mult *= x; return `×${x}`; } }, grows: j => `×${(1 + 0.2 * (j.n ?? 0)).toFixed(1)}` },
  { id: 'tattoo', price: 6, name: T('Tattoo', 'Tatuointi', '刺青'),
    text: T('Gains ×0.25 mult for every level plate you buy. Applies it at the end of every round.',
      'Kasvaa ×0,25 kerrointa jokaisesta ostamastasi tasolaatasta. Käyttää sen joka kierroksen lopussa.',
      'レベルプレートを買うたび倍率×0.25を貯める。毎ラウンドの終わりに適用。'),
    on: (ev, j) => { if (ev.t === 'bought' && ev.type === 'plate') j.n = (j.n ?? 0) + 1; },
    end: (c, j) => { const x = 1 + 0.25 * (j.n ?? 0); if (x > 1) { c.mult *= x; return `×${x}`; } }, grows: j => `×${1 + 0.25 * (j.n ?? 0)}` },
  { id: 'kallio', price: 10, name: T('Kallio', 'Kallio', 'カッリオ'),
    text: T('×1 mult for every lock you have opened, at the end of every round.', '×1 kerroin jokaisesta avaamastasi lukosta, joka kierroksen lopussa.', '開けた鍵1つごとに倍率×1（毎ラウンドの終わり）。'),
    end: c => { const x = c.run.deadline - 1; if (x > 1) { c.mult *= x; return `×${x}`; } } },
  { id: 'brawler', price: 5, name: T('Bar Brawler', 'Tappelupukari', 'けんか屋'),
    text: T('Every nudge: +2 mult.', 'Jokainen tönäisy: +2 kerrointa.', 'ナッジするたび倍率+2。'),
    hit: (c, k) => { if (k === 'nudge') { c.mult += 2; return '+2 mult'; } } },
  { id: 'beer_crate', price: 5, name: T('Crate of Beer', 'Kaljakori', 'ビールケース'),
    text: T('Five more coins to shoot every round.', 'Viisi kolikkoa lisää joka kierrokselle.', '毎ラウンド打てるコイン+5。'),
    rules: { extraDrops: 5 } },
  { id: 'dark_pint', price: 7, name: T('Dark Pint', 'Tumma tuoppi', '黒ビール'),
    text: T('×3 mult at the end of every round, and five coins fewer to shoot.', '×3 kerroin joka kierroksen lopussa, ja viisi kolikkoa vähemmän.', '毎ラウンドの終わりに倍率×3、ただし打てるコイン−5。'),
    rules: { extraDrops: -5 }, end: c => { c.mult *= 3; return '×3'; } },
];

// CHARMS bend the MACHINE, the odds and the money (CloverPit). Rules only.
export const RULES = {
  openPotti: 'max', winWiden: 'sum', rubberPins: 'max', wideTulips: 'max', lifeNails: 'sum',
  magnet: 'sum', wSeven: 'sum', horseshoe: 'max', pottiCols: 'max', interestCap: 'sum', rMoney: 'sum',
  extraDrops: 'sum', feverLong: 'sum', extraNudges: 'sum',
};
export const CHARMS = [
  { id: 'bent_nail', price: 6, rules: { openPotti: 1 }, name: T('Bent Nail', 'Taivutettu naula', '曲がった釘'),
    text: T('The nail over the 7:00 is bent aside: the POTTI is easier to find.', 'Naula 7:00:n yllä on taivutettu sivuun: POTTI on helpompi osua.', '7:00の上の釘が曲げられ、ポッティに入りやすい。') },
  { id: 'filed_windows', price: 6, rules: { winWiden: 0.25 }, name: T('Filed Windows', 'Viilatut ikkunat', '削った窓'),
    text: T('Every window is filed a little wider.', 'Jokainen ikkuna on viilattu vähän leveämmäksi.', 'すべての窓が少し広く削られる。') },
  { id: 'rubber_nails', price: 4, rules: { rubberPins: 1 }, name: T('Rubber Nails', 'Kuminaulat', 'ゴムの釘'),
    text: T('Every nail bounces harder.', 'Jokainen naula kimmottaa kovempaa.', 'すべての釘がよく跳ねる。') },
  { id: 'fat_pot', price: 6, rules: { pottiCols: 5 }, name: T('Fat Pot', 'Lihava potti', '太ったポット'),
    text: T('The POTTI opens the five middle columns of the pot instead of three.', 'POTTI avaa potin viisi keskimmäistä pinoa kolmen sijaan.', 'ポッティが真ん中の3列ではなく5列を開く。') },
  { id: 'savings', price: 5, rules: { interestCap: 5 }, name: T('Savings Book', 'Säästökirja', '貯金通帳'),
    text: T('Interest can reach 10 mk a round instead of 5.', 'Korkoa voi kertyä 10 mk kierroksessa 5:n sijaan.', '利息の上限が毎ラウンド5から10マルッカに。') },
  { id: 'heavy_r', price: 4, rules: { rMoney: 1 }, name: T('Heavy R', 'Raskas R', '重いR'),
    text: T('R gives the coin back and one more markka.', 'R antaa kolikon takaisin ja yhden markan lisää.', 'Rはコインを返し、さらに1マルッカ。') },
  { id: 'bent_life', price: 5, needs: 'chucker', rules: { lifeNails: 0.3 }, name: T('Opened Life Nails', 'Avatut elämänaulat', '開いた命釘'),
    text: T('The two life nails over the heso are bent open.', 'Heson yllä olevat kaksi elämänaulaa on taivutettu auki.', 'ヘソの上の命釘2本が開かれる。') },
  { id: 'magnet', price: 6, needs: 'chucker', rules: { magnet: 60 }, name: T('Magnet', 'Magneetti', '磁石'),
    text: T('A magnet behind the heso. Coins passing near it lean in.', 'Magneetti heson takana. Ohi menevät kolikot kallistuvat sitä kohti.', 'ヘソの裏に磁石。近くのコインが寄っていく。') },
  { id: 'lucky_seven', price: 7, needs: 'chucker', rules: { wSeven: 2.2 }, name: T('Lucky Seven', 'Onnen seiska', 'ラッキーセブン'),
    text: T('Sevens come up twice as often on the reels.', 'Seiskoja tulee rullilla kaksi kertaa useammin.', 'リールの7が2倍出やすい。') },
  { id: 'horseshoe', price: 6, needs: 'chucker', rules: { horseshoe: 1 }, name: T('Horseshoe', 'Hevosenkenkä', '蹄鉄'),
    text: T('A losing spin is drawn again, once.', 'Hävitty pyöräytys arvotaan kerran uudestaan.', '外れの回転を一度だけ引き直す。') },
  { id: 'wired_tulips', price: 5, needs: 'tulips', rules: { wideTulips: 1 }, name: T('Wired Tulips', 'Sidotut tulppaanit', '針金のチューリップ'),
    text: T('The tulips are wired open and never close.', 'Tulppaanit on sidottu auki eivätkä koskaan sulkeudu.', 'チューリップが針金で開きっぱなし。') },
  { id: 'steady_hands', price: 5, rules: { extraNudges: 1 }, name: T('Steady Hands', 'Vakaat kädet', '落ち着いた手'),
    text: T('One more free nudge for every coin.', 'Yksi ilmainen tönäisy lisää jokaiselle kolikolle.', 'コインごとの無料ナッジ+1。') },
  { id: 'long_fever', price: 6, needs: 'fever', rules: { feverLong: 6 }, name: T('Long Fever', 'Pitkä kuume', '長いフィーバー'),
    text: T('The attacker stays open six more pulls.', 'Attacker pysyy auki kuusi vetoa pidempään.', 'アタッカーが6回長く開く。') },
];
