// Radio Free Helsinki — interface strings, fi / en / ja.
//
// The bulletins themselves live in stories.js (they are long enough to want
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
    'gate.blurb': 'Pirate wire out of the capital. Games, industry, and the defence band — read by Toko, who has never been asked to be impartial.',
    'gate.fiction': 'Every bulletin is invented. Every technique in them is not.',
    'gate.btn': '▶ Tune in',

    'rail.decode': 'DECODE',
    'rail.refold': 'RE-FOLD',
    'rail.next': 'NEXT',

    'tag.onair': 'ON AIR',
    'standby': 'awaiting transmission',
    'hint.swipe': 'swipe up for the next bulletin',
    'tell.prefix': 'TELL: ',
    'fiction': 'Fictional broadcast · invented studios, ministries and ports · real techniques',

    'sector.GAMING': 'GAMES / STUDIOS',
    'sector.INDUSTRY': 'TECH / INDUSTRY',
    'sector.DEFENCE': 'DEFENCE / SIGNAL',

    'a11y.prevChannel': 'Previous channel',
    'a11y.nextChannel': 'Next channel',
    'a11y.sound': 'Sound on or off',
    'a11y.nextPost': 'Next bulletin',
    'a11y.lang': 'Language — English. Press to change.',
  },

  // ────────────────────────────────────────────────── Suomi
  fi: {
    'gate.blurb': 'Piraattilähetys pääkaupungista. Pelit, teollisuus ja puolustuksen taajuus — lukijana Toko, jolta ei ole koskaan pyydetty puolueettomuutta.',
    'gate.fiction': 'Jokainen uutinen on keksitty. Yksikään niiden keino ei ole.',
    'gate.btn': '▶ Viritä',

    'rail.decode': 'PURA',
    'rail.refold': 'TAITA',
    'rail.next': 'SEURAAVA',

    'tag.onair': 'SUORA',
    'standby': 'odottaa lähetystä',
    'hint.swipe': 'pyyhkäise ylös seuraavaan',
    'tell.prefix': 'TUNNISTAT NÄIN: ',
    'fiction': 'Kuvitteellinen lähetys · keksityt studiot, ministeriöt ja satamat · todelliset keinot',

    'sector.GAMING': 'PELIT / STUDIOT',
    'sector.INDUSTRY': 'TEKNIIKKA / TEOLLISUUS',
    'sector.DEFENCE': 'PUOLUSTUS / SIGNAALI',

    'a11y.prevChannel': 'Edellinen kanava',
    'a11y.nextChannel': 'Seuraava kanava',
    'a11y.sound': 'Ääni päälle tai pois',
    'a11y.nextPost': 'Seuraava uutinen',
    'a11y.lang': 'Kieli — suomi. Vaihda painamalla.',
  },

  // ────────────────────────────────────────────────── 日本語
  ja: {
    'gate.blurb': '首都から流れる海賊電波。ゲーム、産業、そして防衛帯——読み手はトコ。中立でいてくれと頼まれたことは一度もない。',
    'gate.fiction': 'ニュースはすべて架空。使われている手法はどれも実在する。',
    'gate.btn': '▶ 受信する',

    'rail.decode': '解読',
    'rail.refold': '戻す',
    'rail.next': '次へ',

    'tag.onair': 'オンエア',
    'standby': '送信待ち',
    'hint.swipe': '上にスワイプで次の記事へ',
    'tell.prefix': '見分け方：',
    'fiction': '架空の放送 · 架空のスタジオ・省庁・港湾 · 実在する手法',

    'sector.GAMING': 'ゲーム / スタジオ',
    'sector.INDUSTRY': 'テクノロジー / 産業',
    'sector.DEFENCE': '防衛 / 信号',

    'a11y.prevChannel': '前のチャンネル',
    'a11y.nextChannel': '次のチャンネル',
    'a11y.sound': '音のオン・オフ',
    'a11y.nextPost': '次の記事',
    'a11y.lang': '言語 — 日本語。押すと切り替わります。',
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
