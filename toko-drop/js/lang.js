// Lightweight i18n for Toko Drop. Localizes the DOM-overlay UI (title, controls,
// death screen, feedback panel, wave banner). The on-canvas HUD and the
// roguelike upgrade cards intentionally stay English (canvas monospace fonts
// render CJK unreliably and the HUD layout is space-tight).
//
// t(key, ...args) returns the string for the active language, falling back to
// English for any missing key. Values may be plain strings or functions (for
// templated strings that interpolate a runtime label).

const STRINGS = {
  en: {
    subtitle: 'TWIN-STICK BULLET-HELL',
    best: 'BEST', pts: 'PTS', wave: 'WAVE',
    tapStart: 'TAP OR PRESS SPACE TO START',
    ctrlMove: 'Move',        ctrlMoveH: 'left stick / WASD',
    ctrlAim: 'Aim & fire',   ctrlAimH: 'right stick / hold LMB',
    ctrlDash: 'Dash',        ctrlDashH: 'A / bumper / Space',
    ctrlPause: 'Pause',      ctrlPauseH: 'Start / ESC',
    ctrlEyes: 'Eyes',        ctrlEyesH: 'E',
    orientation: 'ORIENTATION', landscape: 'LANDSCAPE', portrait: 'PORTRAIT',
    orientLandH: 'Wide arena — Steam Deck / sideways mobile',
    orientPortH: 'Tall arena — upright mobile',
    rogue: 'ROGUELIKE MODE', on: 'ON', off: 'OFF',
    rogueOnH: 'Pick an upgrade card after each wave',
    rogueOffH: 'No upgrades — pure arcade survival',
    language: 'LANGUAGE',
    youDied: 'YOU DIED',
    bestScore: '★ BEST SCORE', bestTime: '★ BEST TIME', bestWave: '★ BEST WAVE',
    seed: 'SEED',
    fbEnjoy: 'WHAT DID YOU ENJOY?  (optional)',
    fbWrong: 'WHAT WENT WRONG?  (optional)',
    fbElse: 'Anything else? (optional)',
    fbSend: 'SEND & CONTINUE', fbSkip: 'SKIP',
    likeWeapons: 'The weapon pods', likeBosses: 'Boss fights',
    likeFeel: 'Movement / dash feel', likeDodging: 'Bullet-hell dodging',
    likeVariety: 'Enemy variety', likeVibe: 'Visuals / vibe',
    fbTooFast: 'Enemies / bullets too fast', fbUnfair: 'Felt unfair / cheap',
    fbUnclear: "Couldn't read the threat",
    fbHit: (l) => `${l} hit me too often`,
    fbMany: (l) => `Too many ${l}s at once`,
    fbDash: 'Dash was on cooldown',
    fbBullets: 'Too many bullets onscreen',
    fbBlender: 'Got swarmed all at once',
  },
  ja: {
    subtitle: 'ツインスティック弾幕',
    best: 'ベスト', pts: '点', wave: 'ウェーブ',
    tapStart: 'タップまたはスペースでスタート',
    ctrlMove: '移動',          ctrlMoveH: '左スティック / WASD',
    ctrlAim: '照準＆射撃',      ctrlAimH: '右スティック / 左クリック長押し',
    ctrlDash: 'ダッシュ',       ctrlDashH: 'A / バンパー / スペース',
    ctrlPause: 'ポーズ',        ctrlPauseH: 'スタート / ESC',
    ctrlEyes: '目',             ctrlEyesH: 'E',
    orientation: '画面の向き', landscape: '横', portrait: '縦',
    orientLandH: '横長アリーナ — Steam Deck / 横向きモバイル',
    orientPortH: '縦長アリーナ — 縦向きモバイル',
    rogue: 'ローグライク', on: 'オン', off: 'オフ',
    rogueOnH: 'ウェーブごとにアップグレードを選択',
    rogueOffH: 'アップグレードなし — 純粋なアーケード',
    language: '言語',
    youDied: 'ゲームオーバー',
    bestScore: '★ ベストスコア', bestTime: '★ ベストタイム', bestWave: '★ ベストウェーブ',
    seed: 'シード',
    fbEnjoy: '良かった点は？（任意）',
    fbWrong: '悪かった点は？（任意）',
    fbElse: 'その他（任意）',
    fbSend: '送信して続行', fbSkip: 'スキップ',
    likeWeapons: '武器ポッド', likeBosses: 'ボス戦',
    likeFeel: '操作感／ダッシュ', likeDodging: '弾幕回避',
    likeVariety: '敵のバリエーション', likeVibe: 'ビジュアル／雰囲気',
    fbTooFast: '敵／弾が速すぎる', fbUnfair: '理不尽に感じた',
    fbUnclear: '脅威が見づらい',
    fbHit: (l) => `${l}に撃たれすぎた`,
    fbMany: (l) => `${l}が一度に多すぎた`,
    fbDash: 'ダッシュがクールダウン中だった',
    fbBullets: '画面上の弾が多すぎた',
    fbBlender: '一度に群がられた',
  },
  fi: {
    subtitle: 'KAKSITIKKU-LUOTIHELVETTI',
    best: 'PARAS', pts: 'PIST.', wave: 'AALTO',
    tapStart: 'NAPAUTA TAI PAINA VÄLILYÖNTIÄ',
    ctrlMove: 'Liiku',          ctrlMoveH: 'vasen tatti / WASD',
    ctrlAim: 'Tähtää & ammu',   ctrlAimH: 'oikea tatti / pidä LMB',
    ctrlDash: 'Syöksy',         ctrlDashH: 'A / olkanäppäin / väli',
    ctrlPause: 'Tauko',         ctrlPauseH: 'Start / ESC',
    ctrlEyes: 'Silmät',         ctrlEyesH: 'E',
    orientation: 'SUUNTA', landscape: 'VAAKA', portrait: 'PYSTY',
    orientLandH: 'Leveä areena — Steam Deck / vaakamobiili',
    orientPortH: 'Korkea areena — pystymobiili',
    rogue: 'ROGUELIKE-TILA', on: 'PÄÄLLÄ', off: 'POIS',
    rogueOnH: 'Valitse päivityskortti joka aallon jälkeen',
    rogueOffH: 'Ei päivityksiä — pelkkää arcade-selviytymistä',
    language: 'KIELI',
    youDied: 'KUOLIT',
    bestScore: '★ PARAS PISTEMÄÄRÄ', bestTime: '★ PARAS AIKA', bestWave: '★ PARAS AALTO',
    seed: 'SIEMEN',
    fbEnjoy: 'MISTÄ PIDIT?  (valinnainen)',
    fbWrong: 'MIKÄ MENI PIELEEN?  (valinnainen)',
    fbElse: 'Jotain muuta? (valinnainen)',
    fbSend: 'LÄHETÄ & JATKA', fbSkip: 'OHITA',
    likeWeapons: 'Asepodit', likeBosses: 'Pomotaistelut',
    likeFeel: 'Liike / syöksy', likeDodging: 'Luotien väistely',
    likeVariety: 'Vihollisten kirjo', likeVibe: 'Visuaalit / tunnelma',
    fbTooFast: 'Viholliset / luodit liian nopeita', fbUnfair: 'Tuntui epäreilulta',
    fbUnclear: 'Uhkaa ei voinut lukea',
    fbHit: (l) => `${l} osui liian usein`,
    fbMany: (l) => `Liikaa ${l}-vihollisia kerralla`,
    fbDash: 'Syöksy oli jäähdyllä',
    fbBullets: 'Liikaa luoteja ruudulla',
    fbBlender: 'Jäin joukon saartamaksi',
  },
};

const LANGS       = ['en', 'ja', 'fi'];
const LANG_LABELS = { en: 'ENG', ja: '日本語', fi: 'SUOMI' };

let _lang = localStorage.getItem('tokoDropLang') || 'en';
if (!LANGS.includes(_lang)) _lang = 'en';

export function getLang()   { return _lang; }
export function langLabel() { return LANG_LABELS[_lang]; }

// Advance to the next language (EN → JA → FI → EN) and persist the choice.
export function cycleLang() {
  _lang = LANGS[(LANGS.indexOf(_lang) + 1) % LANGS.length];
  localStorage.setItem('tokoDropLang', _lang);
  return _lang;
}

export function t(key, ...args) {
  const table = STRINGS[_lang] || STRINGS.en;
  let v = table[key];
  if (v === undefined) v = STRINGS.en[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
}
