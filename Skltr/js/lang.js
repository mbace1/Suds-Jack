// Lightweight i18n for SKLTR (ported from toko-drop). Localizes the DOM-overlay UI
// (title, controls, orientation/language chips, death screen, feedback panel). The
// on-canvas HUD stays English — canvas monospace renders CJK unreliably and the
// layout is space-tight. t(key, ...args) returns the active-language string, falling
// back to English; values may be plain strings or functions (templated).
const STRINGS = {
  en: {
    subtitle: 'neon survival — dodge the storm, ride the adrenaline',
    tapStart: 'CLICK / TAP / ENTER to drop in',
    ctrlD1: 'WASD move · mouse aim (look anywhere) · auto-fire on target',
    ctrlD2: 'SPACE jump / double-jump · Q dash · SHIFT sprint · T auto-aim · ESC pause',
    ctrlTouch: 'Touch: left move · right aim · tap = jump / double-jump · swipe = dash',
    orientation: 'ORIENTATION', landscape: 'LANDSCAPE', portrait: 'PORTRAIT',
    orientLandH: 'Wide view — desktop / sideways mobile',
    orientPortH: 'Tall view — upright mobile',
    language: 'LANGUAGE',
    visualTest: 'VISUAL TEST', depthTest: 'DEPTH TEST',
    visualTestH: 'Extra color / VFX pass (experimental)',
    depthTestH: 'Giant valley + cave, bigger scale (experimental)',
    youDied: 'DOWN',
    survived: (time, kills) => `survived ${time} · ${kills} kills`,
    best: 'best', newBest: 'NEW BEST!',
    fbEnjoy: 'WHAT DID YOU ENJOY?  (optional)',
    fbWrong: 'WHAT WENT WRONG?  (optional)',
    fbElse: 'Anything else? (optional)',
    fbSend: 'SEND & CONTINUE', fbSkip: 'SKIP',
    likeFeel: 'Dash / dodge feel', likeDodge: 'Bullet-hell dodging',
    likeAim: 'Free-look aiming', likeVibe: 'Visuals / vibe', likeVert: 'Verticality / traversal',
    fbFast: 'Enemies / bullets too fast', fbUnfair: 'Felt unfair / cheap',
    fbUnclear: "Couldn't read the threat", fbBullets: 'Too many bullets onscreen',
    fbDash: 'Dash was on cooldown', fbSwarm: 'Got swarmed all at once',
  },
  ja: {
    subtitle: 'ネオンサバイバル — 弾幕を回避し、アドレナリンに乗れ',
    tapStart: 'クリック / タップ / ENTER で開始',
    ctrlD1: 'WASD 移動 · マウスで照準（全方向）· 自動射撃',
    ctrlD2: 'SPACE ジャンプ/二段 · Q ダッシュ · SHIFT スプリント · T オートエイム · ESC ポーズ',
    ctrlTouch: 'タッチ: 左で移動 · 右で照準 · タップ=ジャンプ/二段 · スワイプ=ダッシュ',
    orientation: '画面の向き', landscape: '横', portrait: '縦',
    orientLandH: '横向き — 広い視界',
    orientPortH: '縦向き — 縦持ちモバイル',
    language: '言語',
    visualTest: 'ビジュアルテスト', depthTest: '奥行きテスト',
    visualTestH: '色・エフェクトを試験追加（実験的機能）',
    depthTestH: '巨大な谷と洞窟、より広いスケール（実験的機能）',
    youDied: 'ダウン',
    survived: (time, kills) => `生存 ${time} · ${kills} キル`,
    best: 'ベスト', newBest: '新記録！',
    fbEnjoy: '良かった点は？（任意）',
    fbWrong: '悪かった点は？（任意）',
    fbElse: 'その他（任意）',
    fbSend: '送信して続行', fbSkip: 'スキップ',
    likeFeel: '操作感／ダッシュ', likeDodge: '弾幕回避',
    likeAim: '全方向エイム', likeVibe: 'ビジュアル／雰囲気', likeVert: '立体的な移動',
    fbFast: '敵／弾が速すぎる', fbUnfair: '理不尽に感じた',
    fbUnclear: '脅威が見づらい', fbBullets: '弾が多すぎた',
    fbDash: 'ダッシュがクールダウン中', fbSwarm: '一度に群がられた',
  },
  fi: {
    subtitle: 'neon-selviytyminen — väistä myrsky, ratsasta adrenaliinilla',
    tapStart: 'KLIKKAA / NAPAUTA / ENTER aloittaaksesi',
    ctrlD1: 'WASD liiku · hiiri tähtää (joka suuntaan) · autotuli',
    ctrlD2: 'SPACE hyppy/tupla · Q syöksy · SHIFT sprintti · T autotähtäys · ESC tauko',
    ctrlTouch: 'Kosketus: vasen liike · oikea tähtäys · napautus = hyppy/tupla · pyyhkäisy = syöksy',
    orientation: 'SUUNTA', landscape: 'VAAKA', portrait: 'PYSTY',
    orientLandH: 'Vaaka — leveä näkymä',
    orientPortH: 'Pysty — pystymobiili',
    language: 'KIELI',
    visualTest: 'VISUAALITESTI', depthTest: 'SYVYYSTESTI',
    visualTestH: 'Kokeellinen väri-/tehostelisä',
    depthTestH: 'Jättiläinen laakso + luola, isompi mittakaava (kokeellinen)',
    youDied: 'KAADUIT',
    survived: (time, kills) => `selvisit ${time} · ${kills} tappoa`,
    best: 'paras', newBest: 'UUSI ENNÄTYS!',
    fbEnjoy: 'MISTÄ PIDIT?  (valinnainen)',
    fbWrong: 'MIKÄ MENI PIELEEN?  (valinnainen)',
    fbElse: 'Jotain muuta? (valinnainen)',
    fbSend: 'LÄHETÄ & JATKA', fbSkip: 'OHITA',
    likeFeel: 'Liike / syöksy', likeDodge: 'Luotien väistely',
    likeAim: 'Vapaa tähtäys', likeVibe: 'Visuaalit / tunnelma', likeVert: 'Korkeuserot / liikkuvuus',
    fbFast: 'Viholliset / luodit liian nopeita', fbUnfair: 'Tuntui epäreilulta',
    fbUnclear: 'Uhkaa ei voinut lukea', fbBullets: 'Liikaa luoteja ruudulla',
    fbDash: 'Syöksy oli jäähdyllä', fbSwarm: 'Jäin saarretuksi',
  },
};

const LANGS = ['en', 'ja', 'fi'];
const LANG_LABELS = { en: 'ENG', ja: '日本語', fi: 'SUOMI' };

let _lang = localStorage.getItem('skltrLang') || 'en';
if (!LANGS.includes(_lang)) _lang = 'en';

export function getLang() { return _lang; }
export function langs() { return LANGS.map(code => ({ code, label: LANG_LABELS[code] })); }
export function setLang(code) { if (LANGS.includes(code)) { _lang = code; localStorage.setItem('skltrLang', _lang); } return _lang; }
export function t(key, ...args) {
  const table = STRINGS[_lang] || STRINGS.en;
  let v = table[key]; if (v === undefined) v = STRINGS.en[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
}
