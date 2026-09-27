// Pajatso in three languages, the house convention: Finnish, English,
// Japanese. English is the per-KEY fallback, so a line not yet translated reads
// in English rather than as a key. The first visit follows the arcade's own
// choice (`sudsJackHubLang`), then the browser; a switch on the title and the
// pause sheet changes it and it is kept.

export const LANGS = [['fi', 'FI'], ['en', 'EN'], ['ja', '日本']];
const KEY = 'pajatso.lang';

const STR = {
  en: {
    money: 'Markka', best: 'Best', last: 'Last pull', pull: 'Pull', lever: 'PULL ▼', potti: 'POTTI now',
    sub: 'The Finnish coin wall game · a Kallio bar',
    intro1: 'You have <b>{n} markka</b>. A pull takes one. Pull the lever down and let go: <b>how far you pull</b> decides where the coin leaves the rail over the top.',
    intro2: 'The windows across the top pay what is printed under them: <b>R</b> gives the coin back, <b>1:00</b> pays one, <b>1:50</b> one and a half. A coin that misses them all falls into the <b>pot</b> — the columns of coins behind the glass.',
    intro3: 'The red <b>7:00</b> in the middle is the <b>POTTI</b>: seven markka and the three middle columns of the pot.',
    play: 'PLAY', kuoppa: 'KUOPPA — roguelike mode (early) ›', kuoppaShort: 'KUOPPA — roguelike mode ›',
    keys: 'Drag the lever down and let go · tap it to pull the same again · SPACE hold and release · ENTER same again · pad: hold A / RT',
    paused: 'PAUSED', resume: 'BACK TO THE MACHINE', restart: 'START OVER WITH {n}', close: 'tap to close',
    tipPull: 'Pull the <b>lever</b> down and let go. How far you pull decides where the coin leaves the rail at the top — a short pull drops it on the left, a long one rides it round to the right.',
    tipWindows: 'The <b>windows</b> across the top pay what is printed under them. Miss them all and the coin joins the <b>pot</b> below.',
    tipAgain: 'The green line on the lever is your last pull. <b>Tap</b> the lever to pull exactly the same again.',
    tipPotti: 'The red <b>7:00</b> is the <b>POTTI</b>: seven markka AND every coin in the three middle columns. The more the machine eats, the bigger it gets — right now it is <b>{n}</b>.',
    tipRight: 'Pull all the way and the coin rides the rail over the top and down the <b>right side</b> — a different game on the same machine.',
    foul: 'Not round the top', foulSub: 'the coin rolls back to you — pull a little harder',
    returned: 'Coin back', returnedSub: 'it stuck, so the barman fished it out',
    pottiToast: '★ POTTI!', pottiSub: '{n} markka — the middle of the pot is yours',
    back: 'coin back',
    broke: 'OUT OF MARKKA', brokeSub: 'Rahat loppu',
    sPulls: 'Pulls', sWon: 'Won', sBiggest: 'Biggest win', sPeak: 'Most at once', sPotti: '★ POTTI', sBack: 'Coins back (R)',
    yourBest: 'Your best ever: <b>{n}</b> markka at once.', more: '{n} MORE FROM THE BAR',
    muteLabel: 'Sound on or off', pauseLabel: 'Pause', leverLabel: 'The lever: pull down and let go. A tap pulls the same as last time.', langLabel: 'Language',
  },
  fi: {
    money: 'Markkaa', best: 'Ennätys', last: 'Viimeksi', pull: 'Veto', lever: 'VEDÄ ▼', potti: 'POTTI nyt',
    sub: 'Kolikkopeli seinällä · kallioläinen baari',
    intro1: 'Sinulla on <b>{n} markkaa</b>. Yksi veto vie yhden. Vedä vipu alas ja päästä irti: <b>se, kuinka pitkälle vedät</b>, ratkaisee missä kolikko lähtee kiskolta.',
    intro2: 'Ylärivin ikkunat maksavat sen, mitä niiden alle on painettu: <b>R</b> antaa kolikon takaisin, <b>1:00</b> maksaa markan, <b>1:50</b> puolitoista. Ohi mennyt kolikko putoaa <b>pottiin</b> — lasin takana näkyviin kolikkopinoihin.',
    intro3: 'Keskellä punainen <b>7:00</b> on <b>POTTI</b>: seitsemän markkaa ja potin kolme keskimmäistä pinoa.',
    play: 'PELAA', kuoppa: 'KUOPPA — roguelike-tila (kesken) ›', kuoppaShort: 'KUOPPA — roguelike-tila ›',
    keys: 'Vedä vipua alas ja päästä · napauta: sama veto uudestaan · VÄLILYÖNTI pohjaan ja irti · ENTER sama uudestaan · ohjain: pidä A / RT',
    paused: 'TAUKO', resume: 'TAKAISIN KONEELLE', restart: 'ALOITA ALUSTA, {n} MK', close: 'sulje napauttamalla',
    tipPull: 'Vedä <b>vipu</b> alas ja päästä irti. Vedon pituus ratkaisee, missä kolikko lähtee kiskolta — lyhyt veto pudottaa sen vasemmalle, pitkä vie sen kaaren yli oikealle.',
    tipWindows: 'Ylärivin <b>ikkunat</b> maksavat sen, mitä niiden alle on painettu. Jos kolikko menee kaikista ohi, se putoaa alas <b>pottiin</b>.',
    tipAgain: 'Vivun vihreä viiva on edellinen vetosi. <b>Napauta</b> vipua, niin veto on täsmälleen sama.',
    tipPotti: 'Punainen <b>7:00</b> on <b>POTTI</b>: seitsemän markkaa JA kaikki kolikot kolmesta keskimmäisestä pinosta. Mitä enemmän kone syö, sitä isompi se on — nyt <b>{n}</b>.',
    tipRight: 'Vedä pohjaan asti, niin kolikko kiertää kaaren yli ja alas <b>oikeaa laitaa</b> — toinen peli samalla koneella.',
    foul: 'Ei mennyt kaaren yli', foulSub: 'kolikko palaa sinulle — vedä vähän pidemmälle',
    returned: 'Kolikko takaisin', returnedSub: 'se jäi jumiin, baarimikko kaivoi sen esiin',
    pottiToast: '★ POTTI!', pottiSub: '{n} markkaa — potin keskusta on sinun',
    back: 'kolikko takaisin',
    broke: 'MARKAT LOPPUIVAT', brokeSub: 'Out of markka',
    sPulls: 'Vetoja', sWon: 'Voitettu', sBiggest: 'Suurin voitto', sPeak: 'Eniten kerralla', sPotti: '★ POTTI', sBack: 'Takaisin (R)',
    yourBest: 'Ennätyksesi: <b>{n}</b> markkaa kerralla.', more: '{n} LISÄÄ TISKILTÄ',
    muteLabel: 'Äänet päälle tai pois', pauseLabel: 'Tauko', leverLabel: 'Vipu: vedä alas ja päästä irti. Napautus toistaa edellisen vedon.', langLabel: 'Kieli',
  },
  ja: {
    money: 'マルッカ', best: '最高', last: '前回', pull: '引き', lever: '引く ▼', potti: '今のポッティ',
    sub: 'フィンランドの壁掛けコインゲーム · カッリオのバー',
    intro1: '持ち金は<b>{n}マルッカ</b>。一回引くと一枚。レバーを下に引いて離す：<b>引く長さ</b>で、コインが上のレールから離れる場所が決まる。',
    intro2: '上の窓は下に書かれた額を払う：<b>R</b>はコインが戻る、<b>1:00</b>は1枚、<b>1:50</b>は1.5枚。全部外れたコインは<b>ポット</b>へ——ガラスの奥に積まれたコインの列に落ちる。',
    intro3: '真ん中の赤い<b>7:00</b>が<b>ポッティ</b>：7マルッカと、ポットの真ん中の3列。',
    play: 'プレイ', kuoppa: 'KUOPPA — ローグライクモード（開発中） ›', kuoppaShort: 'KUOPPA — ローグライクモード ›',
    keys: 'レバーを下にドラッグして離す · タップで同じ引きをもう一度 · スペース長押しで引く · ENTERで同じ引き · パッド：A長押し / RT',
    paused: '一時停止', resume: '台に戻る', restart: '{n}枚で最初から', close: 'タップで閉じる',
    tipPull: '<b>レバー</b>を下に引いて離す。引く長さで、コインがレールを離れる場所が決まる——短いと左に落ち、長いと上を回って右へ。',
    tipWindows: '上の<b>窓</b>は下に書かれた額を払う。全部外れるとコインは下の<b>ポット</b>に積まれる。',
    tipAgain: 'レバーの緑の線は前回の引き。レバーを<b>タップ</b>すると、まったく同じ引きになる。',
    tipPotti: '赤い<b>7:00</b>は<b>ポッティ</b>：7マルッカと、真ん中の3列のコイン全部。台が飲み込むほど大きくなる——今は<b>{n}</b>。',
    tipRight: 'いっぱいまで引くと、コインはレールで上を回って<b>右側</b>を落ちる——同じ台の別のゲーム。',
    foul: '上まで届かない', foulSub: 'コインは戻ってくる——もう少し強く',
    returned: 'コイン返却', returnedSub: '引っかかったので、バーテンが取り出した',
    pottiToast: '★ ポッティ！', pottiSub: '{n}マルッカ——ポットの真ん中はあなたのもの',
    back: 'コイン返却',
    broke: 'マルッカ切れ', brokeSub: 'ラハット・ロップ（お金がなくなった）',
    sPulls: '引いた回数', sWon: '勝ち', sBiggest: '最大', sPeak: '最多', sPotti: '★ ポッティ', sBack: '返却 (R)',
    yourBest: '最高記録：一度に<b>{n}</b>マルッカ。', more: 'バーでもう{n}枚',
    muteLabel: '音のオン・オフ', pauseLabel: '一時停止', leverLabel: 'レバー：下に引いて離す。タップで前回と同じ引き。', langLabel: '言語',
  },
};

const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
function initial() {
  const mine = read(KEY);
  if (mine && STR[mine]) return mine;
  let hub = read('sudsJackHubLang');
  try { hub = JSON.parse(hub); } catch { /* stored bare */ }
  if (hub && STR[hub]) return hub;
  const nav = (navigator.language || 'en').slice(0, 2);
  return STR[nav] ? nav : 'en';
}
let lang = initial();

export function getLang() { return lang; }
export function setLang(l) {
  if (!STR[l]) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
  document.documentElement.lang = l;
}
export function t(key, vars) {
  let v = STR[lang]?.[key] ?? STR.en[key] ?? key;
  if (vars) for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, val);
  return v;
}
// markka as a person writes them: 12 or 12,50 (a Finnish comma), 12.50 elsewhere
export function mk(n) {
  const whole = Number.isInteger(n);
  const s = whole ? String(n) : n.toFixed(2);
  return lang === 'fi' ? s.replace('.', ',') : s;
}
// for the gate: every key in every language
export const _STR = STR;
