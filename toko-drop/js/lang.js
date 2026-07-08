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
    volume: 'VOLUME', reduceMotion: 'REDUCE MOTION',
    reduceMotionOnH: 'No camera shake', reduceMotionOffH: 'Full screen-shake feedback',
    settings: 'SETTINGS', settingsHint: 'Settings are in the pause menu (⏸)',
    options: 'OPTIONS',
    smashTV: 'SMASH TV MODE',
    smashOnH: 'Enemies rush from 4 doors, bigger waves, more prizes — from the next wave',
    smashOffH: 'Standard waves surround the arena',
    announcer: 'ANNOUNCER',
    annOnH: 'Loud game-show commentary (spoken, English)',
    annOffH: 'No commentary',
    introVoice: 'INTRO VOICE',
    introOnH: 'Recorded title shout ("TOKO DROP!")',
    introOffH: 'Silent title screen',
    perfMode: 'PERFORMANCE MODE',
    perfOnH: 'Lower resolution, no glass effects — for slower phones', perfOffH: 'Full visual quality',
    runHistory: 'RUN HISTORY', noRuns: 'No runs yet — play one!',
    rhScore: 'SCORE', rhWave: 'WAVE', rhTime: 'TIME', rhMode: 'MODE', close: 'CLOSE',
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
    hudStreak: 'STREAK', hudShld: 'SHLD', hudHi: 'HI', hudScoreMult: 'SCORE',
    chooseUpgrade: 'CHOOSE UPGRADE',
    c_hp: '+1 HP',                  c_hp_d: 'Gain one extra hit point.',
    c_speed: 'Speed Up',            c_speed_d: 'Move 20% faster permanently.',
    c_firerate: 'Fire Rate Up',     c_firerate_d: 'Fire 20% faster permanently.',
    c_bigbullets: 'Bigger Bullets', c_bigbullets_d: 'Player bullets are 30% larger.',
    c_dashcd: 'Dash Refresh',       c_dashcd_d: 'Dash cooldown −0.15 s.',
    c_nuke: 'Nuke',                 c_nuke_d: 'Clear all enemy bullets now.',
    c_pierce: 'Pierce',             c_pierce_d: 'Bullets pass through enemies.',
    c_magnet: 'Magnet',             c_magnet_d: 'Pickups drift toward you.',
    c_shield: 'Shield',             c_shield_d: 'Absorbs one hit; resets each wave.',
    c_dashboom: 'Dash Boom',        c_dashboom_d: 'Radial explosion on every dash.',
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
    volume: '音量', reduceMotion: '手ぶれ軽減',
    reduceMotionOnH: 'カメラ揺れなし', reduceMotionOffH: '画面揺れ演出あり',
    settings: '設定', settingsHint: '設定はポーズメニューにあります（⏸）',
    options: 'オプション',
    smashTV: 'SMASH TVモード',
    smashOnH: '敵が4つの扉から突入、ウェーブ増強、賞品も増加 — 次のウェーブから',
    smashOffH: '通常ウェーブ（全方向から出現）',
    announcer: 'アナウンサー',
    annOnH: 'にぎやかな実況コメント（音声・英語）',
    annOffH: '実況なし',
    introVoice: 'イントロ音声',
    introOnH: 'タイトルの録音ボイス（「TOKO DROP!」）',
    introOffH: 'タイトルは無音',
    perfMode: '軽量モード',
    perfOnH: '低解像度・ガラス効果なし（低速端末向け）', perfOffH: 'フル画質',
    runHistory: 'プレイ履歴', noRuns: 'まだ記録がありません — プレイしよう！',
    rhScore: 'スコア', rhWave: 'ウェーブ', rhTime: 'タイム', rhMode: 'モード', close: '閉じる',
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
    hudStreak: '連続', hudShld: 'シールド', hudHi: 'ハイ', hudScoreMult: 'スコア',
    chooseUpgrade: 'アップグレードを選択',
    c_hp: 'HP +1',             c_hp_d: 'ヒットポイントを1つ追加',
    c_speed: 'スピードアップ',   c_speed_d: '移動速度が永久に20%上昇',
    c_firerate: '連射アップ',    c_firerate_d: '発射速度が永久に20%上昇',
    c_bigbullets: '弾の拡大',    c_bigbullets_d: 'プレイヤーの弾が30%大きくなる',
    c_dashcd: 'ダッシュ回復',    c_dashcd_d: 'ダッシュのクールダウン −0.15秒',
    c_nuke: 'ニューク',          c_nuke_d: '敵弾をすべて消す',
    c_pierce: '貫通',            c_pierce_d: '弾が敵を貫通する',
    c_magnet: 'マグネット',      c_magnet_d: 'アイテムが引き寄せられる',
    c_shield: 'シールド',        c_shield_d: '1発を防ぐ。ウェーブごとに回復',
    c_dashboom: 'ダッシュ爆発',  c_dashboom_d: 'ダッシュのたびに放射状に爆発',
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
    volume: 'ÄÄNENVOIMAKKUUS', reduceMotion: 'VÄHENNÄ LIIKETTÄ',
    reduceMotionOnH: 'Ei kameran tärinää', reduceMotionOffH: 'Täysi ruudun tärinä',
    settings: 'ASETUKSET', settingsHint: 'Asetukset ovat taukovalikossa (⏸)',
    options: 'VALINNAT',
    smashTV: 'SMASH TV -TILA',
    smashOnH: 'Viholliset ryntäävät 4 ovesta, isommat aallot, enemmän palkintoja — seuraavasta aallosta',
    smashOffH: 'Tavalliset aallot saartavat areenan',
    announcer: 'SELOSTAJA',
    annOnH: 'Äänekäs peliohjelmaselostus (puhuttu, englanniksi)',
    annOffH: 'Ei selostusta',
    introVoice: 'INTRO-ÄÄNI',
    introOnH: 'Nauhoitettu aloitushuuto ("TOKO DROP!")',
    introOffH: 'Hiljainen aloitusruutu',
    perfMode: 'SUORITUSKYKYTILA',
    perfOnH: 'Matalampi resoluutio, ei lasiefektejä — hitaille puhelimille', perfOffH: 'Täysi kuvanlaatu',
    runHistory: 'PELIHISTORIA', noRuns: 'Ei vielä pelejä — pelaa yksi!',
    rhScore: 'PISTEET', rhWave: 'AALTO', rhTime: 'AIKA', rhMode: 'TILA', close: 'SULJE',
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
    hudStreak: 'PUTKI', hudShld: 'KILPI', hudHi: 'HI', hudScoreMult: 'PISTEET',
    chooseUpgrade: 'VALITSE PÄIVITYS',
    c_hp: 'HP +1',                  c_hp_d: 'Yksi ylimääräinen osumapiste.',
    c_speed: 'Nopeus +',            c_speed_d: 'Liiku pysyvästi 20% nopeammin.',
    c_firerate: 'Tulinopeus +',     c_firerate_d: 'Ammu pysyvästi 20% nopeammin.',
    c_bigbullets: 'Isommat luodit', c_bigbullets_d: 'Pelaajan luodit 30% suuremmat.',
    c_dashcd: 'Syöksyn lataus',     c_dashcd_d: 'Syöksyn jäähtyminen −0,15 s.',
    c_nuke: 'Ydinisku',             c_nuke_d: 'Tyhjennä kaikki vihollisluodit.',
    c_pierce: 'Läpäisy',            c_pierce_d: 'Luodit läpäisevät viholliset.',
    c_magnet: 'Magneetti',          c_magnet_d: 'Poiminnat ajautuvat luoksesi.',
    c_shield: 'Kilpi',              c_shield_d: 'Vaimentaa yhden osuman; nollautuu aallottain.',
    c_dashboom: 'Syöksyräjähdys',   c_dashboom_d: 'Säteittäinen räjähdys joka syöksyllä.',
  },
};

const LANGS       = ['en', 'ja', 'fi'];
const LANG_LABELS = { en: 'ENG', ja: '日本語', fi: 'SUOMI' };

let _lang = localStorage.getItem('tokoDropLang') || 'en';
if (!LANGS.includes(_lang)) _lang = 'en';

export function getLang()   { return _lang; }
export function langLabel() { return LANG_LABELS[_lang]; }

// All selectable languages as {code, label} — for rendering a picker.
export function langs() {
  return LANGS.map(code => ({ code, label: LANG_LABELS[code] }));
}

// Set the active language directly and persist it.
export function setLang(code) {
  if (LANGS.includes(code)) {
    _lang = code;
    localStorage.setItem('tokoDropLang', _lang);
  }
  return _lang;
}

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
