// Radio Free Helsinki — interface strings, fi / en / ja.
//
// The videos themselves live in stories.js (they are long enough to want
// their own file); everything else the interface says is here. t() falls back
// to English so a missing string shows English rather than breaking a view —
// which is exactly why the gate checks that no key is missing at all: a raw key
// is still a non-empty string, and it would ship quietly.

export const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'fi', label: 'FI' },
  { code: 'ja', label: 'JA' },
];

const STR = {
  // ────────────────────────────────────────────────── English
  en: {
    'gate.blurb': 'Pirate wire out of the capital, read by Toko, who has never been asked to be impartial.',
    'gate.fiction': 'The events are real. The names are not. Neither are the techniques — those are real too.',
    'gate.btn': '▶ Tune in',

    'off.tag': 'TRANSMISSION ENDS',
    'off.head': 'That is the wire. Now the part about us.',
    'off.p1': '{n} stories out of a day. Somebody chose them, and somebody put them in an order, and that somebody was this station.',
    'off.p2': 'Every technique below is real and none of the videos were. The useful half is the one you take out of here — so here is what you pulled apart tonight, and what you let past.',
    'off.tally': 'DECODED',
    'off.none': 'You did not decode any of them. That is allowed — but the tells are the whole payload, and they are up there behind the ⧉.',
    'off.all': 'All {n}. Go and find one of these in something real.',
    'off.some': 'The ones still dim are still up there.',
    'off.back': 'Back to the top of the wire',
    'rail.top': 'TOP',
    'rail.decode': 'DECODE',
    'rail.refold': 'RE-FOLD',
    'rail.next': 'NEXT',

    'tag.onair': 'ON AIR',
    'standby': 'awaiting transmission',
    'hint.swipe': 'swipe up for the next video',
    'tell.prefix': 'TELL: ',
    'fiction': 'Real events · invented names · real techniques',

    'sector.GAMING': 'GAMES / STUDIOS',
    'sector.INDUSTRY': 'TECH / INDUSTRY',
    'sector.DEFENCE': 'DEFENCE / SIGNAL',

    'a11y.prevChannel': 'Previous channel',
    'a11y.nextChannel': 'Next channel',
    'a11y.sound': 'Sound on or off',
    'a11y.nextPost': 'Next video',
    'a11y.lang': 'Language — English. Press to change.',
    'a11y.archive': 'Choose a broadcast date',
  },

  // ────────────────────────────────────────────────── Suomi
  fi: {
    'gate.blurb': 'Piraattilähetys pääkaupungista, lukijana Toko, jolta ei ole koskaan pyydetty puolueettomuutta.',
    'gate.fiction': 'Tapahtumat ovat todellisia. Nimet eivät. Keinot ovat.',
    'gate.btn': '▶ Viritä',

    'off.tag': 'LÄHETYS PÄÄTTYY',
    'off.head': 'Siinä oli päivän lanka. Nyt se osa joka koskee meitä.',
    'off.p1': '{n} juttua yhdestä päivästä. Joku valitsi ne, ja joku pani ne järjestykseen, ja se joku oli tämä asema.',
    'off.p2': 'Jokainen alla oleva keino on todellinen eikä yksikään video ollut. Hyödyllinen puolisko on se jonka viet täältä mukanasi — tässä siis se minkä purit tänään, ja se minkä päästit ohi.',
    'off.tally': 'PURETUT',
    'off.none': 'Et purkanut yhtäkään. Se on sallittua — mutta tunnusmerkit ovat koko anti, ja ne odottavat tuolla ⧉:n takana.',
    'off.all': 'Kaikki {n}. Mene nyt etsimään yksi näistä jostakin oikeasta.',
    'off.some': 'Himmeinä olevat ovat yhä tuolla.',
    'off.back': 'Takaisin langan alkuun',
    'rail.top': 'ALKUUN',
    'rail.decode': 'PURA',
    'rail.refold': 'TAITA',
    'rail.next': 'SEURAAVA',

    'tag.onair': 'SUORA',
    'standby': 'odottaa lähetystä',
    'hint.swipe': 'pyyhkäise ylös seuraavaan videoon',
    'tell.prefix': 'TUNNISTAT NÄIN: ',
    'fiction': 'Todellisia tapahtumia · keksityt nimet · todellisia keinoja',

    'sector.GAMING': 'PELIT / STUDIOT',
    'sector.INDUSTRY': 'TEKNIIKKA / TEOLLISUUS',
    'sector.DEFENCE': 'PUOLUSTUS / SIGNAALI',

    'a11y.prevChannel': 'Edellinen kanava',
    'a11y.nextChannel': 'Seuraava kanava',
    'a11y.sound': 'Ääni päälle tai pois',
    'a11y.nextPost': 'Seuraava video',
    'a11y.lang': 'Kieli — suomi. Vaihda painamalla.',
    'a11y.archive': 'Valitse lähetyspäivä',
  },

  // ────────────────────────────────────────────────── 日本語
  ja: {
    'gate.blurb': '首都から流れる海賊電波。読み手はトコ。中立でいてくれと頼まれたことは一度もない。',
    'gate.fiction': '出来事は実際のもの。名前は架空。手法は、実在する。',
    'gate.btn': '▶ 受信する',

    'off.tag': '放送終了',
    'off.head': '以上が今日の電文。ここからは、こちらの話。',
    'off.p1': '一日から{n}本。誰かがそれを選び、誰かが順番をつけた。その誰かが、この局だ。',
    'off.p2': '下に並ぶ手法はどれも実在し、動画はどれも作りものだった。役に立つのは持ち帰るほうの半分だ——というわけで、今夜あなたが解いたものと、通り過ぎたものを置いておく。',
    'off.tally': '解読済み',
    'off.none': 'ひとつも解読しなかった。それでもかまわない——ただ、見分け方こそがこの放送の中身で、⧉ の奥にまだ置いてある。',
    'off.all': '{n}本すべて。あとは本物のどれかで、この手口をひとつ見つけにいくこと。',
    'off.some': '暗いままのものは、まだそこにある。',
    'off.back': '電文のはじめに戻る',
    'rail.top': '先頭へ',
    'rail.decode': '解読',
    'rail.refold': '戻す',
    'rail.next': '次へ',

    'tag.onair': 'オンエア',
    'standby': '送信待ち',
    'hint.swipe': '上にスワイプで次の動画へ',
    'tell.prefix': '見分け方：',
    'fiction': '実際の出来事 · 架空の名前 · 実在する手法',

    'sector.GAMING': 'ゲーム / スタジオ',
    'sector.INDUSTRY': 'テクノロジー / 産業',
    'sector.DEFENCE': '防衛 / 信号',

    'a11y.prevChannel': '前のチャンネル',
    'a11y.nextChannel': '次のチャンネル',
    'a11y.sound': '音のオン・オフ',
    'a11y.nextPost': '次の動画',
    'a11y.lang': '言語 — 日本語。押すと切り替わります。',
    'a11y.archive': '放送日を選ぶ',
  },
};

const KEY = 'rfhLang';
let lang = 'en';

export function t(key) {
  const v = STR[lang]?.[key] ?? STR.en[key];
  return v ?? key;
}

export function getLang() { return lang; }

export function setLang(code) {
  if (!STR[code]) return;
  lang = code;
  document.documentElement.lang = code;      // screen readers, and CJK glyph choice
  try { localStorage.setItem(KEY, code); } catch { /* private mode */ }
}

// stored preference → browser hint → English
export function initLang() {
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (stored && STR[stored]) { setLang(stored); return; }
  const nav = (navigator.language || 'en').slice(0, 2);
  setLang(STR[nav] ? nav : 'en');
}

export function nextLang() {
  const i = LANGS.findIndex(l => l.code === lang);
  return LANGS[(i + 1) % LANGS.length].code;
}

// the dates on the wire, in the shape each language writes them
export function formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  const dd = pad(d.getDate()), mm = pad(d.getMonth() + 1), yy = d.getFullYear();
  if (lang === 'ja') return `${yy}.${mm}.${dd}`;
  return `${dd}.${mm}.${yy}`;
}

// exported for the gate: every language block must carry the same keys
export const UI_KEYS = Object.keys(STR.en);
export const UI_LANGS = Object.keys(STR);
export const _STR = STR;
