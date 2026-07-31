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
    'layout': 'floor:',
    'layout.rack': 'rack',
    'layout.rack.hint': 'covers side by side, as many as fit',
    'layout.wide': 'wide',
    'layout.wide.hint': 'one at a time, cover at full width',
    'layout.list': 'list',
    'layout.list.hint': 'no covers — one line each, for getting somewhere',
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
    'fresh.new': 'new',
    'fresh.up': 'updated',
    'fresh.from': 'you last saw v{x}',
    'fresh.count': '{n} moved since you were last here',
    'played': 'tried',
    'played.when': 'you opened it on {x}',
    'played.count': '{n} of {m} tried',
    'find': 'find a game',
    'find.count': '{n} of {m}',
    'find.none': 'Nothing on the floor matches that.',
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
    'notes.link': 'your notes ({n})',
    'notes.title': 'What you have told us',
    'notes.none': 'Nothing yet.',
    'notes.held': 'held',
    'notes.gone': 'sent',
    'notes.retry': 'Send the held ones',
    'notes.forget': 'Forget these',
    'notes.sure': 'Sure? Press again',
    // the room: sound, and the counters on the wall
    'sound': 'sound',
    'sound.on': 'on',
    'sound.off': 'off',
    'best': 'best',
    'best.secs': '{x}s',
    'credits': 'credits',
    'credit.one': '1 credit',
    'credit.many': '{x} credits',
    'streak': '{x} days running',
    'tickets': '{x} tickets',
    'tickets.buy': 'Tickets buy nothing.',
    'secret.found': 'A cabinet you were not shown.',
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
    'layout': 'sali:',
    'layout.rack': 'rivistö',
    'layout.rack.hint': 'kannet vierekkäin, niin monta kuin mahtuu',
    'layout.wide': 'leveä',
    'layout.wide.hint': 'yksi kerrallaan, kansi koko leveydeltä',
    'layout.list': 'lista',
    'layout.list.hint': 'ei kansia — rivi kutakin, kun on kiire jonnekin',
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
    'fresh.new': 'uusi',
    'fresh.up': 'päivittynyt',
    'fresh.from': 'näit viimeksi v{x}',
    'fresh.count': '{n} on muuttunut viime käynnistäsi',
    'played': 'kokeiltu',
    'played.when': 'avasit sen {x}',
    'played.count': '{n}/{m} kokeiltu',
    'find': 'etsi peli',
    'find.count': '{n}/{m}',
    'find.none': 'Mikään salissa ei vastaa tuota.',
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
    'notes.link': 'omat viestisi ({n})',
    'notes.title': 'Mitä olet kertonut',
    'notes.none': 'Ei vielä mitään.',
    'notes.held': 'odottaa',
    'notes.gone': 'lähetetty',
    'notes.retry': 'Lähetä odottavat',
    'notes.forget': 'Unohda nämä',
    'notes.sure': 'Varmastiko? Paina uudestaan',
    'sound': 'ääni',
    'sound.on': 'päällä',
    'sound.off': 'pois',
    'best': 'paras',
    'best.secs': '{x}s',
    'credits': 'krediittiä',
    'credit.one': '1 krediitti',
    'credit.many': '{x} krediittiä',
    'streak': '{x} päivää putkeen',
    'tickets': '{x} lippua',
    'tickets.buy': 'Lipuilla ei saa mitään.',
    'secret.found': 'Kaappi jota ei näytetty sinulle.',
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
    'layout': 'フロア:',
    'layout.rack': '棚',
    'layout.rack.hint': '入るだけ横に並べる',
    'layout.wide': '横幅',
    'layout.wide.hint': '一つずつ、カバーは幅いっぱい',
    'layout.list': '一覧',
    'layout.list.hint': 'カバーなし — 一行ずつ、目的地に急ぐとき',
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
    'fresh.new': '新着',
    'fresh.up': '更新',
    'fresh.from': '前回は v{x}',
    'fresh.count': '前回から {n} 件が動いた',
    'played': '起動済み',
    'played.when': '{x} に開いた',
    'played.count': '{m} 件中 {n} 件を試した',
    'find': 'ゲームを探す',
    'find.count': '{m} 件中 {n} 件',
    'find.none': '当てはまるものはフロアにない。',
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
    'notes.link': 'あなたのメモ ({n})',
    'notes.title': 'あなたが伝えたこと',
    'notes.none': 'まだ何もありません。',
    'notes.held': '保留',
    'notes.gone': '送信済み',
    'notes.retry': '保留分を送る',
    'notes.forget': 'これらを消す',
    'notes.sure': '本当に？もう一度押す',
    'sound': 'サウンド',
    'sound.on': 'オン',
    'sound.off': 'オフ',
    'best': 'ベスト',
    'best.secs': '{x}秒',
    'credits': 'クレジット',
    'credit.one': '1 クレジット',
    'credit.many': '{x} クレジット',
    'streak': '{x}日連続',
    'tickets': 'チケット {x} 枚',
    'tickets.buy': 'チケットでは何も買えません。',
    'secret.found': '見せていなかったキャビネット。',
  },
};
