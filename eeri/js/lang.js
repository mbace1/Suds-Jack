// EERI — the three languages.
//
// House convention, not a per-game choice: every playable thing on this
// site speaks fi / en / ja (`hub/games.js` carries all three per cabinet,
// `gameoflife/js/i18n.js` is the fullest example). Eeri had none, which
// meant a Finnish six-year-old — the actual player — read the game in
// English.
//
// Three rules, all learned elsewhere in this repo:
//
//  1. **English is the fallback, per key.** A missing Finnish string shows
//     the English one rather than a blank or a key name. That is what lets
//     a pack ship half-finished instead of not at all.
//  2. **The tongue is detected once and then obeyed.** `navigator.language`
//     picks the first guess; a choice made in the UI is persisted under
//     `eeriLang` and beats detection forever after.
//  3. **`<html lang>` is written**, because the CRT-era habit of leaving it
//     at `en` breaks a screen reader and Japanese line-breaking alike.
//
// A note kept honest: the Japanese here is written by someone who does not
// speak it natively, in the same position as `toko/js/dialogue.ja.js` —
// which carries the same caveat and a `scripts/ja-review.mjs` page for a
// native read. Treat these strings as a draft until somebody reads them.

const KEY = 'eeriLang';
export const LANGS = ['fi', 'en', 'ja'];

export const STRINGS = {
  en: {
    mResume: 'carry on',
    mRestart: 'start this bit again',
    mHome: 'back to the arcade',
    mLevels: 'GO TO',
    mLang: 'LANGUAGE',
    ctlMenu: 'menu',
    langName: 'English',
    // the intro (owner's words, 2026-08-14 — the Finnish is the source)
    title: 'eeri',
    brief: 'adventures in a world of work machines and robots',
    start: 'START',
    // controls, as glyphs and their accessible names
    ctlLeft: 'run left',
    ctlRight: 'run right',
    ctlUp: 'climb up · raise the boom',
    ctlDown: 'climb down · dig',
    ctlJump: 'jump — and stomp what you land on',
    ctlAction: 'climb into the machine',
    hintRun: '◀ ▶ RUN   Ⓐ JUMP',
    hintClimb: '▲ ▼ CLIMB',
    hintRide: 'Ⓑ CLIMB IN',
    hintBoom: '▲ ▼ BOOM',
    // in play
    clear: 'LEVEL CLEAR',
    bolts: 'bolts',
    golden: 'golden bolts',
    // the clock-out card (DESIGN §4.3). `built` names what the golden bolts
    // put up; `builtOf` is the count under it. Neither ever scolds a low
    // number — the design's rule is that finding them shows you more of the
    // thing and never withholds anything.
    clockOut: 'CLOCKING OUT',
    blueprint: 'BLUEPRINT',
    built: 'you built',
    builtDone: 'finished, and the lights are on',
    checkpoint: 'CHECKPOINT',
    siteClear: 'SITE CLEAR',
    // the in-play prompts. A prompt never names a key (DESIGN §5) —
    // a key name is no help to a thumb or a pad, and the glyphs are
    // exactly what the on-screen buttons show.
    hFoot: '◀ ▶  RUN     Ⓐ  JUMP',
    hLadder: '▲ ▼  CLIMB     Ⓐ  JUMP OFF',
    hFlag: 'RUN PAST THE FLAG',
    hFetchBack: '◀  TOO HIGH TO JUMP — GO BACK FOR THE MACHINE',
    hFetchOn: 'TOO HIGH TO JUMP — BRING THE MACHINE  ▶',
    hWary: 'NOBODY IS DRIVING IT — WAIT FOR THE BUCKET TO LIFT',
    hNear: 'Ⓑ  CLIMB IN',
    hPipe: 'Ⓑ  GO IN THE PIPE',
    hRide: '◀ ▶  DRIVE     ▲ ▼  BOOM     Ⓑ  HOP OUT',
    hDig: 'HOLD ▼  DIG THE BANK DOWN',
    hFlatten: 'DRIVE OVER THE SHEET',
    hSling: 'HOLD ▼  SLING THE GIRDER ON',
    hCarry: 'CARRY IT TO THE GAP',
    hSeat: 'HOLD ▼  LOWER THE SPAN IN',
    hSmash: 'HOLD ▼  SWING THE BALL AT THE WALL',
    hOut: 'THE WAY OUT IS OPEN',
  },
  fi: {
    mResume: 'jatka',
    mRestart: 'aloita tämä kohta alusta',
    mHome: 'takaisin pelihalliin',
    mLevels: 'SIIRRY',
    mLang: 'KIELI',
    ctlMenu: 'valikko',
    langName: 'suomi',
    title: 'eeri',
    brief: 'seikkailee työkoneiden ja robottien maailmassa',
    start: 'ALOITA',
    ctlLeft: 'juokse vasemmalle',
    ctlRight: 'juokse oikealle',
    ctlUp: 'kiipeä ylös · nosta puomia',
    ctlDown: 'kiipeä alas · kaiva',
    ctlJump: 'hyppää — ja pomppaa päälle',
    ctlAction: 'kiipeä koneeseen',
    hintRun: '◀ ▶ JUOKSE   Ⓐ HYPPÄÄ',
    hintClimb: '▲ ▼ KIIPEÄ',
    hintRide: 'Ⓑ KIIPEÄ KYYTIIN',
    hintBoom: '▲ ▼ PUOMI',
    clear: 'KENTTÄ SELVÄ',
    clockOut: 'TYÖPÄIVÄ PÄÄTTYY',
    blueprint: 'PIIRUSTUS',
    built: 'rakensit',
    builtDone: 'valmis, ja valot palavat',
    bolts: 'pultit',
    golden: 'kultapultit',
    checkpoint: 'VÄLIPISTE',
    siteClear: 'TYÖMAA VALMIS',
    // the in-play prompts. A prompt never names a key (DESIGN §5) —
    // a key name is no help to a thumb or a pad, and the glyphs are
    // exactly what the on-screen buttons show.
    hFoot: '◀ ▶  JUOKSE     Ⓐ  HYPPÄÄ',
    hLadder: '▲ ▼  KIIPEÄ     Ⓐ  HYPPÄÄ POIS',
    hFlag: 'JUOKSE LIPUN OHI',
    hFetchBack: '◀  LIIAN KORKEA — HAE KONE',
    hFetchOn: 'LIIAN KORKEA — TUO KONE  ▶',
    hWary: 'KUKAAN EI AJA SITÄ — ODOTA KUNNES KAUHA NOUSEE',
    hNear: 'Ⓑ  KIIPEÄ KYYTIIN',
    hPipe: 'Ⓑ  MENE PUTKEEN',
    hRide: '◀ ▶  AJA     ▲ ▼  PUOMI     Ⓑ  HYPPÄÄ POIS',
    hDig: 'PIDÄ ▼  KAIVA VALLI ALAS',
    hFlatten: 'AJA LEVYN YLI',
    hSling: 'PIDÄ ▼  NOSTA PALKKI KOUKKUUN',
    hCarry: 'VIE SE AUKON LUO',
    hSeat: 'PIDÄ ▼  LASKE PALKKI PAIKALLEEN',
    hSmash: 'PIDÄ ▼  HEILAUTA PALLO SEINÄÄN',
    hOut: 'TIE ULOS ON AUKI',
  },
  ja: {
    mResume: 'つづける',
    mRestart: 'ここからやりなおす',
    mHome: 'アーケードにもどる',
    mLevels: 'いどう',
    mLang: 'ことば',
    ctlMenu: 'メニュー',
    langName: '日本語',
    title: 'eeri',
    // はたらくくるま is the standard Japanese category for work vehicles and
    // is exactly the register this game wants — it is what a Japanese
    // six-year-old's picture books call them.
    brief: 'はたらくくるまとロボットの世界を冒険する',
    start: 'スタート',
    ctlLeft: 'ひだりへ走る',
    ctlRight: 'みぎへ走る',
    ctlUp: 'のぼる・ブームを上げる',
    ctlDown: 'おりる・ほる',
    ctlJump: 'ジャンプ — ふんづける',
    ctlAction: '重機に乗りこむ',
    hintRun: '◀ ▶ はしる   Ⓐ ジャンプ',
    hintClimb: '▲ ▼ のぼる',
    hintRide: 'Ⓑ のりこむ',
    hintBoom: '▲ ▼ ブーム',
    clear: 'クリア',
    clockOut: 'しごとおわり',
    blueprint: 'せっけいず',
    built: 'つくったもの',
    builtDone: 'かんせい。あかりがついた',
    bolts: 'ボルト',
    golden: '金のボルト',
    checkpoint: 'チェックポイント',
    siteClear: 'げんば クリア',
    // the in-play prompts. A prompt never names a key (DESIGN §5) —
    // a key name is no help to a thumb or a pad, and the glyphs are
    // exactly what the on-screen buttons show.
    hFoot: '◀ ▶  はしる     Ⓐ  ジャンプ',
    hLadder: '▲ ▼  のぼる     Ⓐ  とびおりる',
    hFlag: 'はたの よこを かけぬけろ',
    hFetchBack: '◀  たかすぎる — 重機を とりに もどろう',
    hFetchOn: 'たかすぎる — 重機を つれてこよう  ▶',
    hWary: 'だれも のっていない — バケットが 上がるまで まて',
    hNear: 'Ⓑ  のりこむ',
    hPipe: 'Ⓑ  どかんに はいる',
    hRide: '◀ ▶  うごかす     ▲ ▼  ブーム     Ⓑ  おりる',
    hDig: '▼ を おして  土手を ほりさげる',
    hFlatten: '鉄板の うえを はしろう',
    hSling: '▼ を おして  鉄骨を つりあげる',
    hCarry: 'すきまの ところまで はこぼう',
    hSeat: '▼ を おして  はしを おろす',
    hSmash: '▼ を おして  鉄球を かべに ぶつける',
    hOut: 'でぐちが ひらいた',
  },
};

let current = null;

/** The first guess: what the browser says, narrowed to what we speak. */
function detect() {
  for (const tag of navigator.languages || [navigator.language || 'en']) {
    const code = String(tag).toLowerCase().slice(0, 2);
    if (LANGS.includes(code)) return code;
  }
  return 'en';
}

/** The language in force. A stored choice beats detection. */
export function lang() {
  if (current) return current;
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  current = LANGS.includes(stored) ? stored : detect();
  return current;
}

/** Choose one, remember it, and tell the document. */
export function setLang(code) {
  if (!LANGS.includes(code)) return lang();
  current = code;
  try { localStorage.setItem(KEY, code); } catch { /* private mode */ }
  document.documentElement.lang = code;
  return code;
}

/** One string, with English as the per-key fallback. */
export function t(key) {
  const l = lang();
  return STRINGS[l]?.[key] ?? STRINGS.en[key] ?? key;
}

/** Move to the next language in the ring — what the intro's toggle does. */
export function cycleLang() {
  const i = LANGS.indexOf(lang());
  return setLang(LANGS[(i + 1) % LANGS.length]);
}

// write it once at import, so `<html lang>` is right before anything paints
document.documentElement.lang = lang();
