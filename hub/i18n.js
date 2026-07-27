// The arcade, in three languages — the same three the whole workshop uses.
//
// Every string the hub itself says lives here. t(key) falls back to English, so
// a missing translation shows English rather than breaking a view; the gate in
// test/hub-smoke.cjs checks the three tables key for key so that fallback stays
// a safety net rather than a habit.
//
// A game's OWN copy — its tagline, its controls line, its state note — is not
// here. It lives in the catalogue entry beside the English, under `fi` and `ja`
// keys, because adding a game must stay one edit in games.js plus one marquee.
// gameText() below is what reads it.
//
// Interpolation is `{x}`, which is enough: nothing here needs plurals, and the
// one counted string is a rating that reads as a number in all three.

export const LANGS = [
  { code: 'fi', label: 'Suomi' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

const KEY = 'sudsJackHubLang';

let lang = 'en';

export function setLang(l) { if (STR[l]) lang = l; }
export function getLang() { return lang; }

export function t(key, vars) {
  let v = STR[lang]?.[key] ?? STR.en[key] ?? key;
  if (vars) for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, val);
  return v;
}

// A game's own words in the current language, falling back to the English that
// is already in the catalogue. A game listed today with no translations yet
// reads in English inside a Finnish page, which is honest and beats a blank.
export function gameText(game, field) {
  return game?.[lang]?.[field] ?? game?.[field] ?? '';
}

// stored choice → browser hint → English. Mirrored onto <html lang> by the
// caller, because a page that says lang="en" while showing Japanese is lying to
// every screen reader and translation tool that asks.
export function preferred() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && STR[saved]) return saved;
  } catch { /* private mode */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STR[nav] ? nav : 'en';
}

export function remember(l) {
  try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
}

// for the gate: the three tables have to match key for key
export function keysOf(l) { return Object.keys(STR[l] ?? {}); }

const STR = {
  en: {
    'sub': 'A workshop of browser games. Nothing to install, nothing to sign up for — pick a cabinet and press Play.',
    'floor': 'The floor — in development',
    'floor.sr': 'Games in development',
    'archive': 'Archived — finished or set down',
    'sketches': 'Shader sketches — where the look came from',
    'source': 'Source on GitHub',
    'tell.hub': 'Tell us about the arcade itself',
    'hub.self': 'the arcade itself',
    'lang': 'Language',
    'screen': 'screen:',
    'accent.cyan': 'cyan',
    'accent.green': 'green',
    'accent.white': 'white',
    'play': 'Play',
    'play.aria': 'Play {x}',
    'notup': 'Not up',
    'notup.yet': 'not up yet',
    'feedback': 'Feedback',
    'pad.hint': 'pad: ✕ play · △ feedback · hold ☰ for hub',
    'ver.from': 'version from {x}',
    'fb.title': 'Feedback: {x}',
    'fb.q': 'What kind of note is this?',
    'fb.rate': '{n} out of 5',
    'fb.placeholder': 'What would you change? What did you like? (optional)',
    'fb.note': 'Your note',
    'fb.dest.on': 'Goes straight to the people building these. No account, no tracking.',
    'fb.dest.off': 'Kept on this device — no inbox is configured yet.',
    'fb.send': 'Send',
    'fb.notnow': 'Not now',
    'fb.close': 'Close',
    'fb.sending': 'Sending…',
    'fb.sent': 'Got it — thank you. That went straight to the workshop.',
    'fb.sent.blind': 'Sent. That form does not answer back, so that is as much as we know.',
    'fb.queued': 'Held for now — the inbox did not answer. It will go out next time you visit.',
    'fb.off': 'Kept on this device.',
    'counter.q': 'I HAVE SOMETHING TO TELL YOU.',
    'counter.ask': 'GO ON. WHICH ONE.',
    'counter.kind': '{x}. WHAT KIND OF NOTE?',
    'counter.words': 'IN YOUR OWN WORDS.',
    'counter.never': 'NEVER MIND.',
    'counter.send': 'SEND',
    'counter.type': 'TYPE IT HERE',
    'counter.local': 'KEPT ON THIS DEVICE',
    'counter.hint': 'CTRL+ENTER SEND · ESC BACK',
    'counter.menu': '1-9 PICK · ENTER SKIP · ESC LEAVE',
    'counter.sent': 'GOT IT. THAT IS IN THE WORKSHOP NOW.',
    'counter.blind': 'IT LEFT. THAT FORM DOES NOT ANSWER BACK, SO THAT IS ALL I CAN HONESTLY TELL YOU.',
    'counter.queued': 'THE INBOX DID NOT ANSWER. I AM HOLDING IT. IT GOES OUT NEXT TIME YOU COME IN.',
    'counter.off': 'KEPT ON THIS DEVICE. NO INBOX IS SET YET.',
    'counter.thin': 'WORDS WOULD HAVE HELPED MORE.',
    'counter.gone': 'THE BOOK IS NOT ON THE COUNTER RIGHT NOW.',
  },

  fi: {
    'sub': 'Selainpelien paja. Ei asennuksia, ei tunnuksia — valitse kaappi ja paina Pelaa.',
    'floor': 'Sali — työn alla',
    'floor.sr': 'Pelit työn alla',
    'archive': 'Arkisto — valmiit tai sivuun jätetyt',
    'sketches': 'Varjostinluonnokset — täältä ilme on peräisin',
    'source': 'Lähdekoodi GitHubissa',
    'tell.hub': 'Kerro mitä mieltä olet pelisalista',
    'hub.self': 'pelisali itse',
    'lang': 'Kieli',
    'screen': 'ruutu:',
    'accent.cyan': 'syaani',
    'accent.green': 'vihreä',
    'accent.white': 'valkoinen',
    'play': 'Pelaa',
    'play.aria': 'Pelaa: {x}',
    'notup': 'Ei pystyssä',
    'notup.yet': 'ei vielä pystyssä',
    'feedback': 'Palaute',
    'pad.hint': 'ohjain: ✕ pelaa · △ palaute · pidä ☰ pohjassa = sali',
    'ver.from': 'versio lähteestä {x}',
    'fb.title': 'Palaute: {x}',
    'fb.q': 'Millaista palautetta tämä on?',
    'fb.rate': '{n} viidestä',
    'fb.placeholder': 'Mitä muuttaisit? Mistä pidit? (vapaaehtoinen)',
    'fb.note': 'Viestisi',
    'fb.dest.on': 'Menee suoraan näiden tekijöille. Ei tunnuksia, ei seurantaa.',
    'fb.dest.off': 'Tallessa tällä laitteella — postilaatikkoa ei ole vielä asetettu.',
    'fb.send': 'Lähetä',
    'fb.notnow': 'Ei nyt',
    'fb.close': 'Sulje',
    'fb.sending': 'Lähetetään…',
    'fb.sent': 'Tuli perille — kiitos. Meni suoraan pajalle.',
    'fb.sent.blind': 'Lähti. Tuo lomake ei vastaa mitään, joten enempää emme tiedä.',
    'fb.queued': 'Jäi odottamaan — postilaatikko ei vastannut. Lähtee ensi käynnillä.',
    'fb.off': 'Tallessa tällä laitteella.',
    'counter.q': 'MINULLA ON SINULLE ASIAA.',
    'counter.ask': 'ANNA TULLA. MISTÄ NIISTÄ.',
    'counter.kind': '{x}. MILLAISTA PALAUTETTA?',
    'counter.words': 'OMIN SANOIN.',
    'counter.never': 'EI SITTENKÄÄN.',
    'counter.send': 'LÄHETÄ',
    'counter.type': 'KIRJOITA TÄHÄN',
    'counter.local': 'TALLESSA TÄLLÄ LAITTEELLA',
    'counter.hint': 'CTRL+ENTER LÄHETÄ · ESC TAKAISIN',
    'counter.menu': '1-9 VALITSE · ENTER OHITA · ESC POISTU',
    'counter.sent': 'TULI PERILLE. SE ON NYT PAJALLA.',
    'counter.blind': 'LÄHTI. TUO LOMAKE EI VASTAA MITÄÄN, JOTEN ENEMPÄÄ EN VOI REHELLISESTI SANOA.',
    'counter.queued': 'POSTILAATIKKO EI VASTANNUT. PIDÄN SEN TALLESSA. SE LÄHTEE ENSI KÄYNNILLÄ.',
    'counter.off': 'TALLESSA TÄLLÄ LAITTEELLA. POSTILAATIKKOA EI OLE VIELÄ ASETETTU.',
    'counter.thin': 'SANAT OLISIVAT AUTTANEET ENEMMÄN.',
    'counter.gone': 'KIRJA EI OLE NYT TISKILLÄ.',
  },

  ja: {
    'sub': 'ブラウザゲームの工房。インストールも登録も不要 — キャビネットを選んでプレイ。',
    'floor': 'フロア — 制作中',
    'floor.sr': '制作中のゲーム',
    'archive': 'アーカイブ — 完成したもの、手を止めたもの',
    'sketches': 'シェーダー習作 — この見た目の出どころ',
    'source': 'GitHub のソース',
    'tell.hub': 'このアーケードそのものへの一言',
    'hub.self': 'アーケードそのもの',
    'lang': '言語',
    'screen': '画面:',
    'accent.cyan': 'シアン',
    'accent.green': 'グリーン',
    'accent.white': 'ホワイト',
    'play': 'プレイ',
    'play.aria': '{x} をプレイ',
    'notup': '準備中',
    'notup.yet': 'まだ公開していません',
    'feedback': 'フィードバック',
    'pad.hint': 'パッド: ✕ プレイ · △ フィードバック · ☰ 長押しでハブ',
    'ver.from': 'バージョンの出どころ: {x}',
    'fb.title': 'フィードバック: {x}',
    'fb.q': 'どんな内容ですか？',
    'fb.rate': '5 段階中 {n}',
    'fb.placeholder': '何を変えますか？何が良かったですか？（任意）',
    'fb.note': 'あなたのメモ',
    'fb.dest.on': '作っている本人に直接届きます。アカウントも追跡もありません。',
    'fb.dest.off': 'この端末に保存されます — 受信先はまだ設定されていません。',
    'fb.send': '送信',
    'fb.notnow': 'あとで',
    'fb.close': '閉じる',
    'fb.sending': '送信中…',
    'fb.sent': '受け取りました。ありがとう。工房に直接届きました。',
    'fb.sent.blind': '送信しました。あのフォームは返事をしないので、分かるのはここまでです。',
    'fb.queued': '預かりました — 受信先が応答しませんでした。次回の訪問時に送ります。',
    'fb.off': 'この端末に保存しました。',
    'counter.q': '伝えたいことがある。',
    'counter.ask': '言ってみろ。どれについてだ。',
    'counter.kind': '{x} だな。どんな内容だ。',
    'counter.words': '自分の言葉で。',
    'counter.never': 'やっぱりやめる。',
    'counter.send': '送信',
    'counter.type': 'ここに書く',
    'counter.local': 'この端末に保存',
    'counter.hint': 'CTRL+ENTER 送信 · ESC 戻る',
    'counter.menu': '1-9 選択 · ENTER 早送り · ESC 退出',
    'counter.sent': '受け取った。もう工房にある。',
    'counter.blind': '送った。あのフォームは返事をしないから、正直に言えるのはここまでだ。',
    'counter.queued': '受信先が応答しなかった。預かっておく。次に来たときに送る。',
    'counter.off': 'この端末に保存した。受信先はまだ設定されていない。',
    'counter.thin': '言葉があったほうが助かった。',
    'counter.gone': '今は帳面がカウンターに出ていない。',
  },
};
