// ui.js — HUD, menus, banners and the touch sticks. DOM over the canvas:
// crisp vector type on near-black (DIRECTION). Menus are pad-first — a d-pad
// or arrow keys move a gold focus ring (1.x v134), A / Enter picks, B / Esc
// backs out — and a tap or click works on every button just the same.
import { TUNING } from './tuning.js?v=39';
import { GEL_LINES } from './gels-said.js?v=39';
import { goalOf, modsOf, speciesOf, metricOf } from './sim/challenge.js?v=39';
import { tiersFor, onCourse } from './sim/director/campaign.js?v=39';
import { roomChart, routeChart, goalGlyph, GRADE_COLORS } from './chart.js?v=39';

const STR = {
  en: {
    intro: 'INTRO', introSub: 'watch it begin, then play',
    dash: 'DASH', push: 'PUSH', pushSub: 'shoves gels away', cut: 'CUT', cutSub: 'through them, and it hurts', gelHp: 'GEL HP', gelHpSub: 'tougher gels, same score',
    arcade: '1.x waves: three lives, every kill pays your streak.', hardcade: 'Arcade, and the biters\' corpses shoot back.', survival: 'Endless. It only gets worse.', campaign: 'rooms with their own clock — cleared opens the next', goalSurvive: 'SURVIVE', goalQuota: 'KILL', goalFlawless: 'NO HITS', menuBtn: 'MENU', menuSub: 'settings, sound, language', trial: 'CHALLENGE', trial_gates: 'DASH THE GATES', trial_hold: 'HOLD THE RING', trial_collect: 'COLLECT THE ORBS', trial_combo: 'KEEP A STREAK', trial_protect: 'PROTECT THE HEART', trialMet: 'CHALLENGE MET', trialMissed: 'CHALLENGE MISSED', skills: 'asks for', sk_position: 'positioning', sk_priority: 'target priority', sk_aim: 'aim economy', sk_movement: 'movement', sk_risk: 'risk', whyDied: 'you went down', whyHit: 'a hit in a no-hits room', whyHeart: 'the heart was lost', whyClock: 'the clock ran out first', yours: 'yours', start: 'START', tierC: 'getting through', tierF: 'dying, or the clock', hitCost: 'each hit costs a grade', downShare: 'put down', yourBest: 'your best', notPlayed: 'not played yet', gDodge: 'DODGE', gClear: 'CLEAR ALL', gGates: 'GATES', gHold: 'HOLD THE RING', gProtect: 'PROTECT THE HEART', gOrder: 'IN ORDER', gHunt: 'HUNT', gStreak: 'STREAK', gCollect: 'COLLECT', gBoss: 'BOSS', gGauntlet: 'GAUNTLET', mNoGun: 'NO GUN', mDash: 'DASH ONLY', mAmmo: 'AMMO', mFaster: 'FASTER', mMoving: 'MOVING FLOOR', hits: 'hits', timeUp: 'TIME', timeUpSub: 'the clock ran out', teaches: 'teaches', roomLocked: 'LOCKED', grade: 'GRADE', rooms: 'ROOMS', worldLocked: 'clear the world before it',
    best: 'BEST', hard: 'HARD', on: 'ON', off: 'OFF', hardSub: 'arcade becomes HARDCADE: the biters\' corpses shoot back', options: 'OPTIONS', optionsSub: 'dash, gels, worlds, sound, language', back: 'BACK', nextRun: 'from the next run', resume: 'RESUME', quit: 'QUIT', again: 'AGAIN', menu: 'MENU', paused: 'PAUSED',
    over: 'GAME OVER', gotyou: 'GOT YOU', lastHit: 'LAST HIT BY', time: 'TIME', newbest: 'NEW BEST', soon: 'SOON',
    wave: 'WAVE', clear: 'CLEAR', curtain: 'CURTAIN!', pod: 'POD', podUp: 'POD LV2!', podDown: 'POD KNOCKED DOWN TO LV1', soundOn: 'SOUND ON', volume: 'VOLUME', annOn: 'ANNOUNCER ON', annOff: 'ANNOUNCER OFF', annVol: 'ANNOUNCER VOL.', motionOn: 'REDUCE MOTION ON', motionOff: 'REDUCE MOTION OFF', motionOnH: 'no camera shake', motionOffH: 'full screen-shake', langName: 'LANGUAGE · ENGLISH', gooOn: 'SPLATTER ON', gooOff: 'SPLATTER OFF', soundOff: 'SOUND OFF', score: 'SCORE', kills: 'KILLS', grazes: 'GRAZES',
    greenRush: 'GREEN RUSH! DOUBLE PRIZE', dud: 'DUD! GREEN MEANS GO', dashThrough: 'DASH THROUGH!', gateChain: 'GATE CHAIN', bounty: 'BOUNTY',
    world2: 'WORLD 2 · THE DRIVEWAY', world3: 'WORLD 3 · THE SEWER', world4: 'WORLD 4 · THE CISTERN', world5: 'WORLD 5 · THE BOILER ROOM', world6: 'WORLD 6 · THE RIVER', world7: 'WORLD 7 · THE ICE SHEET', world8: 'WORLD 8 · THE DEEP', world9: 'WORLD 9 · THE CORE', won: 'RUN COMPLETE', wonSub: 'all nine worlds',
    dashUp: 'DASH UP', dashDown: 'DASH KNOCKED DOWN TO LV1', fxInv: 'INVINCIBLE', fxRapid: 'RAPID FIRE', fxMult: 'SCORE', fxDash: 'DASH',
    hintTouch: 'LEFT THUMB MOVES · RIGHT THUMB AIMS AND FIRES · FLICK TO DASH',
    hintKeys: 'WASD MOVES · MOUSE AIMS · HOLD CLICK TO FIRE · SPACE DASHES · ESC PAUSES',
    hintPad: 'LEFT STICK MOVES · RIGHT STICK AIMS AND FIRES · A DASHES · START PAUSES',
    gels: 'GELS', worlds: 'WORLDS', street: 'STREET', neon: 'NEON', streetSub: 'driveway, then sewer', neonSub: 'abstract hex, then tide', classic: 'CLASSIC', sdf: 'SDF', classicSub: 'mesh gels, as they are', sdfSub: 'ray-marched fields',
  },
  ja: {
    intro: 'イントロ', introSub: '始まりを見てからプレイ',
    dash: 'ダッシュ', push: '押す', pushSub: 'ゼリーを押しのける', cut: '貫く', cutSub: '貫いてダメージ', gelHp: 'ゼリー耐久', gelHpSub: '硬いゼリー、スコアは同じ',
    arcade: '1.xのウェーブ：ライフ3つ、撃破は連鎖分のスコア。', hardcade: 'アーケード、噛みつく敵の残骸が撃ち返してくる。', survival: '終わりなし。ひたすら厳しくなる。', campaign: 'それぞれの制限時間を持つ部屋 — クリアで次が開く', goalSurvive: '生き残れ', goalQuota: '撃破', goalFlawless: 'ノーダメージ', menuBtn: 'メニュー', menuSub: '設定・サウンド・言語', trial: 'チャレンジ', trial_gates: 'ゲートを抜けろ', trial_hold: '輪に留まれ', trial_collect: 'オーブを集めろ', trial_combo: '連鎖を保て', trial_protect: '心臓を守れ', trialMet: 'チャレンジ達成', trialMissed: 'チャレンジ失敗', skills: '求めるもの', sk_position: '位置取り', sk_priority: '優先順位', sk_aim: '照準の節約', sk_movement: '機動', sk_risk: 'リスク', whyDied: '倒れた', whyHit: 'ノーダメージの部屋で被弾', whyHeart: '心臓を失った', whyClock: '先に時間切れ', yours: 'あなた', start: 'スタート', tierC: 'クリア', tierF: '倒れるか時間切れ', hitCost: '被弾ごとに1段階下がる', downShare: '撃破', yourBest: '自己ベスト', notPlayed: '未プレイ', gDodge: '避けろ', gClear: '全滅させろ', gGates: 'ゲート', gHold: '輪に留まれ', gProtect: '心臓を守れ', gOrder: '順番に', gHunt: '狩れ', gStreak: '連鎖', gCollect: '集めろ', gBoss: 'ボス', gGauntlet: '試練', mNoGun: '銃なし', mDash: 'ダッシュのみ', mAmmo: '弾', mFaster: '加速', mMoving: '動く床', hits: '被弾', timeUp: '時間切れ', timeUpSub: '時計が尽きた', teaches: '教える', roomLocked: 'ロック中', grade: '評価', rooms: '部屋', worldLocked: '前のワールドをクリア',
    best: 'ベスト', hard: 'ハード', on: 'オン', off: 'オフ', hardSub: 'アーケードがHARDCADEに：噛みつく敵の残骸が撃ち返す', options: 'オプション', optionsSub: 'ダッシュ・ゼリー・ワールド・サウンド・言語', back: '戻る', nextRun: '次のプレイから', resume: '再開', quit: 'やめる', again: 'もう一度', menu: 'メニュー', paused: '一時停止',
    over: 'ゲームオーバー', gotyou: 'やられた相手', lastHit: '最後に当てた相手', time: 'タイム', newbest: '新記録', soon: '近日',
    wave: 'ウェーブ', clear: 'クリア', curtain: 'カーテン！', pod: 'ポッド', podUp: 'ポッド LV2！', podDown: 'ポッドが LV1 に', soundOn: 'サウンド オン', volume: '音量', annOn: 'アナウンサー オン', annOff: 'アナウンサー オフ', annVol: 'アナウンサー音量', motionOn: '手ぶれ軽減 オン', motionOff: '手ぶれ軽減 オフ', motionOnH: 'カメラ揺れなし', motionOffH: '画面揺れ演出あり', langName: '言語 · 日本語', gooOn: 'しぶき オン', gooOff: 'しぶき オフ', soundOff: 'サウンド オフ', score: 'スコア', kills: '撃破', grazes: 'グレイズ',
    greenRush: 'グリーンラッシュ！賞品2倍', dud: 'ハズレ！緑で行け', dashThrough: 'ダッシュで抜けろ！', gateChain: 'ゲートチェーン', bounty: '賞金首',
    world2: 'ワールド2 · ドライブウェイ', world3: 'ワールド3 · 下水道', world4: 'ワールド4 · 貯水槽', world5: 'ワールド5 · ボイラー室', world6: 'ワールド6 · 川', world7: 'ワールド7 · 氷原', world8: 'ワールド8 · 深淵', world9: 'ワールド9 · コア', won: 'ラン完走', wonSub: '9ワールドすべて',
    dashUp: 'ダッシュ強化', dashDown: 'ダッシュが LV1 に', fxInv: '無敵', fxRapid: '連射', fxMult: 'スコア', fxDash: 'ダッシュ',
    hintTouch: '左手で移動 · 右手でエイムと射撃 · はじいてダッシュ',
    hintKeys: 'WASDで移動 · マウスでエイム · クリック長押しで射撃 · スペースでダッシュ · ESCで一時停止',
    hintPad: '左スティックで移動 · 右スティックでエイムと射撃 · Aでダッシュ · STARTで一時停止',
    gels: 'ゼリー', worlds: 'ワールド', street: 'ストリート', neon: 'ネオン', streetSub: 'ドライブウェイ、そして下水道', neonSub: '抽象の六角、そして潮流', classic: 'クラシック', sdf: 'SDF', classicSub: 'いつものメッシュ', sdfSub: 'レイマーチの距離場',
  },
  fi: {
    intro: 'INTRO', introSub: 'katso alku, sitten pelaa',
    dash: 'SYÖKSY', push: 'TÖNÄISY', pushSub: 'tönäisee geelit sivuun', cut: 'VIILTO', cutSub: 'läpi, ja se satuttaa', gelHp: 'GEELIN KESTO', gelHpSub: 'sitkeämmät geelit, samat pisteet',
    arcade: '1.x:n aallot: kolme elämää, jokainen kaato maksaa putkesi verran.', hardcade: 'Arcade, ja purijoiden raadot ampuvat takaisin.', survival: 'Loputon. Pahenee vain.', campaign: 'huoneita omalla kellollaan — läpäisy avaa seuraavan', goalSurvive: 'SELVIYDY', goalQuota: 'KAADA', goalFlawless: 'EI OSUMIA', menuBtn: 'VALIKKO', menuSub: 'asetukset, ääni, kieli', trial: 'HAASTE', trial_gates: 'SYÖKSY PORTEISTA', trial_hold: 'PIDÄ RENGAS', trial_collect: 'KERÄÄ PALLOT', trial_combo: 'PIDÄ PUTKI', trial_protect: 'SUOJAA SYDÄN', trialMet: 'HAASTE SUORITETTU', trialMissed: 'HAASTE JÄI', skills: 'vaatii', sk_position: 'sijoittuminen', sk_priority: 'kohteiden järjestys', sk_aim: 'tähtäyksen säästö', sk_movement: 'liike', sk_risk: 'riski', whyDied: 'kaaduit', whyHit: 'osuma huoneessa ilman osumia', whyHeart: 'sydän menetettiin', whyClock: 'kello loppui ensin', yours: 'sinun', start: 'ALOITA', tierC: 'läpäisy', tierF: 'kuolema tai kello', hitCost: 'jokainen osuma vie arvosanan', downShare: 'kaadettu', yourBest: 'paras', notPlayed: 'ei vielä pelattu', gDodge: 'VÄISTÄ', gClear: 'KAADA KAIKKI', gGates: 'PORTIT', gHold: 'PIDÄ RENGAS', gProtect: 'SUOJAA SYDÄN', gOrder: 'JÄRJESTYKSESSÄ', gHunt: 'METSÄSTÄ', gStreak: 'PUTKI', gCollect: 'KERÄÄ', gBoss: 'POMO', gGauntlet: 'KUJANJUOKSU', mNoGun: 'EI ASETTA', mDash: 'VAIN SYÖKSY', mAmmo: 'AMMUKSET', mFaster: 'KIIHTYY', mMoving: 'LIIKKUVA LATTIA', hits: 'osumaa', timeUp: 'AIKA', timeUpSub: 'kello loppui', teaches: 'opettaa', roomLocked: 'LUKITTU', grade: 'ARVOSANA', rooms: 'HUONEET', worldLocked: 'läpäise edellinen maailma',
    best: 'ENNÄTYS', hard: 'VAIKEA', on: 'PÄÄLLÄ', off: 'POIS', hardSub: 'arcadesta tulee HARDCADE: purijoiden raadot ampuvat takaisin', options: 'ASETUKSET', optionsSub: 'syöksy, geelit, maailmat, ääni, kieli', back: 'TAKAISIN', nextRun: 'seuraavasta pelistä', resume: 'JATKA', quit: 'LOPETA', again: 'UUDESTAAN', menu: 'VALIKKO', paused: 'TAUKO',
    over: 'PELI OHI', gotyou: 'KAATAJA', lastHit: 'VIIMEKSI OSUI', time: 'AIKA', newbest: 'UUSI ENNÄTYS', soon: 'TULOSSA',
    wave: 'AALTO', clear: 'TYHJÄ', curtain: 'VERHO!', pod: 'KAPSELI', podUp: 'KAPSELI LV2!', podDown: 'KAPSELI PUTOSI LV1:EEN', soundOn: 'ÄÄNI PÄÄLLÄ', volume: 'ÄÄNENVOIMAKKUUS', annOn: 'SELOSTAJA PÄÄLLÄ', annOff: 'SELOSTAJA POIS', annVol: 'SELOSTAJAN ÄÄNI', motionOn: 'VÄHENNÄ LIIKETTÄ PÄÄLLÄ', motionOff: 'VÄHENNÄ LIIKETTÄ POIS', motionOnH: 'ei kameran tärinää', motionOffH: 'täysi ruudun tärinä', langName: 'KIELI · SUOMI', gooOn: 'ROISKEET PÄÄLLÄ', gooOff: 'ROISKEET POIS', soundOff: 'ÄÄNI POIS', score: 'PISTEET', kills: 'KAATOJA', grazes: 'HIPAISUJA',
    greenRush: 'VIHREÄ RYNTÄYS! TUPLAPALKINTO', dud: 'SUUTARI! VIHREÄLLÄ MENNÄÄN', dashThrough: 'SYÖKSY LÄPI!', gateChain: 'PORTTIKETJU', bounty: 'PALKKIO',
    world2: 'MAAILMA 2 · PIHATIE', world3: 'MAAILMA 3 · VIEMÄRI', world4: 'MAAILMA 4 · VESISÄILIÖ', world5: 'MAAILMA 5 · KATTILAHUONE', world6: 'MAAILMA 6 · JOKI', world7: 'MAAILMA 7 · JÄÄKENTTÄ', world8: 'MAAILMA 8 · SYVYYS', world9: 'MAAILMA 9 · YDIN', won: 'LÄPI PELATTU', wonSub: 'kaikki yhdeksän maailmaa',
    dashUp: 'SYÖKSY PARANI', dashDown: 'SYÖKSY PUTOSI LV1:EEN', fxInv: 'KUOLEMATON', fxRapid: 'PIKATULI', fxMult: 'PISTEET', fxDash: 'SYÖKSY',
    hintTouch: 'VASEN PEUKALO LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · SIPAISE SYÖKSYÄKSESI',
    hintKeys: 'WASD LIIKKUU · HIIRI TÄHTÄÄ · PIDÄ PAINIKE POHJASSA AMPUAKSESI · VÄLILYÖNTI SYÖKSYY · ESC TAUKO',
    hintPad: 'VASEN TATTI LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · A SYÖKSYY · START TAUKO',
    gels: 'GEELIT', worlds: 'MAAILMAT', street: 'KATU', neon: 'NEON', streetSub: 'pihatie, sitten viemäri', neonSub: 'abstrakti kenno, sitten virta', classic: 'KLASSINEN', sdf: 'SDF', classicSub: 'tavalliset verkkogeelit', sdfSub: 'säteenmarssatut kentät',
  },
};
// the language: the one picked in OPTIONS (toko2.lang), else the browser's
export const LANGS = ['en', 'fi', 'ja'];
const pickLang = () => { let l = ''; try { l = localStorage.getItem('toko2.lang') || ''; } catch { /* private mode */ }
  if (!STR[l]) l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; };
let lang = pickLang();
export const getLang = () => lang;
export function setLang(l) { if (!STR[l]) return; lang = l; try { localStorage.setItem('toko2.lang', l); } catch { /* private mode */ } document.documentElement.lang = l; }
export const t = (k) => STR[lang][k] ?? STR.en[k] ?? k;
// what a campaign room asks, in the words the list and the HUD use (1.x goalLabel)
// (sim/challenge.js): the goal, then what the room takes away. `r` carries its level when there is one.
export function goalText(r) {
  const g = goalOf(r), m = modsOf(r), L = r.level;
  const kind = g.kind ? TUNING.species[speciesOf(g.kind)]?.name : '';
  const head = {
    survive: g.metric === 'hits' ? t('gDodge') : t('goalSurvive'), quota: `${t('goalQuota')} ${g.kills}`, clear: t('gClear'),
    gates: `${t('gGates')} ${L?.gates?.length ?? ''}`, hold: t('gHold'), protect: t('gProtect'), order: t('gOrder'),
    hunt: `${t('gHunt')} ${kind}`, combo: `${t('gStreak')} ${g.streak}`, collect: `${t('gCollect')} ${g.orbs?.length ?? ''}`,
    boss: t('gBoss'), gauntlet: t('gGauntlet'),
  }[g.type] ?? t('goalSurvive');
  const tail = [m.flawless && t('goalFlawless'), m.dash && m.noGun ? t('mDash') : m.noGun && t('mNoGun'), m.ammo && `${t('mAmmo')} ${m.ammo}`,
    m.escalate && t('mFaster'), (L?.arena?.shapes ?? []).some((p) => p.orbit || p.pulse) && t('mMoving')].filter(Boolean);
  return [head.trim(), ...tail].join(' · ');
}
// the room's progress, for the HUD: the goal's count and what is left
export function goalProgress(w) {
  const ch = w.ch, g = ch?.goal;
  if (!g) return goalText(w.room);
  const n = Math.floor(ch.n + 1e-9), of = ch.of;
  const head = {
    survive: g.metric === 'hits' ? `${t('gDodge')} · ${w.hits || 0} ${t('hits')}` : t('goalSurvive'),
    quota: `${t('goalQuota')} ${Math.min(w.kills, g.kills)}/${g.kills}`, clear: t('gClear'), gates: `${t('gGates')} ${n}/${of}`,
    hold: `${t('gHold')} ${Math.round((100 * ch.n) / of)}%`, protect: `${t('gProtect')} ${Math.max(0, ch.heart?.hp ?? 0)}/${ch.heart?.max ?? 0}`,
    order: `${t('gOrder')} ${n}/${of}`, hunt: `${t('gHunt')} ${n}/${of}`, combo: `${t('gStreak')} ${ch.arcade ? n : Math.max(w.streak, 0)}/${of}`,
    collect: `${t('gCollect')} ${n}/${of}`, boss: t('gBoss'), gauntlet: `${t('gGauntlet')} ${Math.max(1, ch.stage + 1)}/${ch.stages?.length ?? 1}`,
  }[g.type] ?? t('goalSurvive');
  const ammo = w.gun && w.gun.ammo !== Infinity ? ` · ${t('mAmmo')} ${w.gun.ammo}` : '';
  return `${ch.mods.flawless ? `${t('goalFlawless')} · ` : ''}${head}${ammo}`;
}

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// The modes the title offers, top to bottom. SURVIVAL was off it from v17
// (owner, 2026-10-22: "forget survival for now") and is back from v20, its
// floor changing size as you play (owner, 2026-10-23: "like Sektori").
// the title's modes (owner, 2026-10-23): ARCADE, with a HARD switch that
// turns it into HARDCADE, and the CAMPAIGN. SURVIVAL still runs (main.js
// MODES) but is off the title for now
const TITLE_MODES = ['arcade'];

// run time as m:ss
export function timeText(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class UI {
  constructor(handlers) {
    this.h = handlers;
    document.documentElement.lang = lang;
    this.hudEl = document.getElementById('hud');
    this.scoreEl = document.getElementById('score');
    this.multEl = document.getElementById('mult');
    this.livesEl = document.getElementById('lives');
    this.clockEl = document.getElementById('clock');
    this.fxEl = document.getElementById('fx');
    this.menuEl = document.getElementById('menu');
    this.bannerEl = document.getElementById('banner');
    this.vignetteEl = document.getElementById('vignette');
    this.sticks = document.getElementById('sticks');
    this.sctx = this.sticks.getContext('2d');
    this.pauseBtn = document.getElementById('pausebtn');
    this.pauseBtn.addEventListener('click', () => this.h.onPause());
    this.focusIndex = 0;
    this._padPrev = {};
    this._bannerT = 0;
    addEventListener('keydown', (e) => this._menuKey(e));
  }

  // the HUD; the MENU button on it is always there while you play, in the language you play in
  setHud(visible) {
    this.hudEl.hidden = !visible;
    if (visible && this.pauseBtn) { this.pauseBtn.textContent = `≡ ${t('menuBtn')}`; this.pauseBtn.setAttribute('aria-label', t('menuBtn')); }
  }

  hud(w) {
    this.scoreEl.textContent = w.score.toLocaleString('en-US');
    this.multEl.textContent = w.streak > 1 ? `×${w.streak}` : '';     // 1.x: every kill pays 100 × the streak
    if (this._lives !== w.hero.lives) {
      this._lives = w.hero.lives;
      this.livesEl.replaceChildren(...Array.from({ length: Math.max(0, w.hero.lives) }, () => el('i')));
    }
    // a campaign room's clock is its goal and the seconds it has left (1.x v265)
    if (w.room && w.dir) {
      const left = Math.max(0, Math.ceil(w.dir.duration - w.dir.t));
      // and the grade it is on course for: for a timed room, how long that line has left
      const oc = onCourse(w), tag = oc ? `${oc.grade}${oc.left != null ? ` ${Math.ceil(oc.left)}s` : ''}` : '';
      const str = `${goalProgress(w)} · ${left}s`;
      if (this._clockStr !== str + tag) {
        this._clockStr = str + tag;
        const g = el('span', 'course', tag);
        g.style.color = oc ? GRADE_COLORS[oc.grade] : '';
        this.clockEl.replaceChildren(str, ...(tag ? [' · ', g] : []));
      }
    } else if (w.ch?.arcade) {
      // an arcade challenge wave (v36): the run's clock, the goal's count, and the challenge's seconds
      this._clockStr = null;
      this.clockEl.textContent = `${timeText(w.time)} · ${goalProgress(w)} · ${Math.max(0, Math.ceil(w.ch.limit - w.ch.t))}s`;
    } else { this._clockStr = null; this.clockEl.textContent = timeText(w.time); }
    this._effects(w);
  }

  // What the pickups have given you, under the lives: the pod and the dash
  // you hold (1.x's [S LV2], main.js:5826-5838), and every timer still
  // running — ★ invincible, » rapid fire, ×2 score (1.x showed the ×2 and its
  // bar, main.js:5805-5815, 5850-5857), to a tenth of a second.
  _effects(w) {
    if (!this.fxEl) return;
    const h = w.hero, P = TUNING.pickups, chips = [];
    // 1.x's bracketed weapon chip, [B] or [S LV2] (main.js:5834)
    if (h.weapon) chips.push([`[${P.podGlyph[h.weapon.fam]}${h.weapon.level >= 2 ? ' LV2' : ''}]`, TUNING.hero.weapons[h.weapon.fam].color[h.weapon.level >= 2 ? 1 : 0]]);
    if (h.dashLevel > 0) chips.push([`${t('fxDash')} LV${h.dashLevel}`, P.colors.dash]);
    if (h.invinc > 0) chips.push([`${P.glyphs.invincible} ${t('fxInv')} ${h.invinc.toFixed(1)}`, P.colors.invincible]);
    if (h.rapid > 0) chips.push([`${P.glyphs.firerate} ${t('fxRapid')} ${h.rapid.toFixed(1)}`, P.colors.firerate]);
    if (w.pk?.multT > 0) chips.push([`${P.glyphs.scoremult} ${t('fxMult')} ${w.pk.multT.toFixed(1)}`, P.colors.scoremult]);
    const key = chips.map((c) => c[0]).join('|');
    if (key === this._fxKey) return;
    this._fxKey = key;
    this.fxEl.replaceChildren(...chips.map(([text, hex]) => { const e = el('span', null, text); e.style.color = '#' + hex.toString(16).padStart(6, '0'); return e; }));
  }

  banner(text, seconds = 1.6) {
    this.bannerEl.textContent = text; this.bannerEl.hidden = false;
    this.bannerEl.classList.remove('pop'); void this.bannerEl.offsetWidth; this.bannerEl.classList.add('pop');
    this._bannerT = seconds;
  }
  tick(dt) { if (this._bannerT > 0 && (this._bannerT -= dt) <= 0) this.bannerEl.hidden = true; }
  // 1.x's red screen edge on a hit (main.js:5550-5564), 0.32 s; CSS plays it
  vignette() { const v = this.vignetteEl; if (!v) return; v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); }

  // ── panels ─────────────────────────────────────────────────────
  _panel(children) {
    this.menuEl.replaceChildren(...children);
    this.menuEl.hidden = false;
    this.buttons = [...this.menuEl.querySelectorAll('button')];
    this.focusIndex = 0;
    this._focus();
  }
  hide() { this.menuEl.hidden = true; this.buttons = []; }
  _button(label, sub, fn, disabled = false) {
    const b = el('button', 'item');
    if (disabled) { b.classList.add('off'); b.setAttribute('aria-disabled', 'true'); }
    b.append(el('span', 'label', label));
    if (sub) b.append(el('span', 'sub', sub));
    b.addEventListener('click', () => { if (!disabled) fn(); });
    b.addEventListener('pointerenter', () => { this.focusIndex = this.buttons.indexOf(b); this._focus(); });
    return b;
  }
  _focus() {
    (this.buttons || []).forEach((b, i) => b.classList.toggle('focus', i === this.focusIndex));
    this.buttons?.[this.focusIndex]?.scrollIntoView?.({ block: 'nearest' });
  }

  // `keep` holds the focus where it was (on OPTIONS, coming back from it).
  title(best, sound, source, test = { dash: 'push', hp: 1 }, keep = false) {
    const prev = this.focusIndex;
    const logo = el('div', 'logo'); logo.append(el('span', 'name', 'TOKO DROP'), el('span', 'num', '2.0'));
    const hint = el('p', 'hint', t(source === 'pad' ? 'hintPad' : source === 'keys' ? 'hintKeys' : 'hintTouch'));
    const fmt = (v) => (v ? `${t('best')} ${v.toLocaleString('en-US')}` : '');
    // the start screen (owner, 2026-10-24): ARCADE with the HARD switch
    // beside it, CAMPAIGN, and MENU — every setting is behind MENU. The intro
    // film is not on it (?intro still plays it, for a look check)
    const startRow = el('div', 'row start');
    const hard = !!this.h.hard?.(), m = hard ? 'hardcade' : 'arcade';
    const hardBtn = this._button(`${t('hard')} · ${hard ? t('on') : t('off')}`, t('hardSub'), () => this.h.onHard?.());
    hardBtn.classList.add('hard');
    startRow.append(this._button(m.toUpperCase(), `${t(m)} ${fmt(best[m])}`, () => this.h.onStart(m)), hardBtn);
    this.optBack = null;
    this._panel([
      logo,
      startRow,
      this._button('CAMPAIGN', t('campaign'), () => this.h.onCampaign?.()),
      this._button(t('menuBtn'), t('menuSub'), () => this.openOptions(() => { this.h.onTitle?.(); this._focusOn(t('menuBtn')); })),
      hint,
    ]);
    if (keep && prev > 0 && prev < this.buttons.length) { this.focusIndex = prev; this._focus(); }
  }

  // THE CAMPAIGN: thirty rooms on one GRID, a row per world in its rail
  // colour and a tile per room — its number, its goal as a picture, the grade
  // it has paid, or a lock. A tile opens the room's CARD (roomCard), which is
  // the only place a room starts from: you read a room before you play it.
  // `played` is the room just left; `focus` a tile to come back to.
  campaign(list, played = null) {
    this.optBack = () => this.h.onTitle?.(); this._list = list;   // Esc or B: back to the title
    const GC = GRADE_COLORS, flat = list.flatMap((wd) => wd.rooms);
    const items = [el('h2', null, 'CAMPAIGN'), el('p', 'mode camp', t('campaign'))];
    const at = played?.focus ?? played?.next ?? flat.find((r) => r.open && !r.grade)?.id ?? flat[0]?.id;
    // the route: thirty rooms, how hard each is, and what you have paid on it
    const route = el('div', 'route-wrap');
    route.append(routeChart(flat, { width: Math.min(560, Math.max(260, (window.innerWidth || 600) - 80)), height: (window.innerHeight || 800) < 520 ? 36 : 54, focus: at }));
    items.push(route);
    if (played?.grade) {
      // the room just cleared: its grade, its number, and the S line when it is not an S yet
      const pr = flat.find((r) => r.id === played.id), m = pr ? metricOf(pr) : null, H = pr?.level ? tiersFor(pr, pr.level) : null;
      const num = played.value == null || !m ? `${played.kills} ${t('kills').toLowerCase()}` : m.name === 'time' ? `${(+played.value).toFixed(1)} s` : m.name === 'hits' ? `${played.value} ${t('hits')}` : `${Math.round(played.value * 100)}%`;
      const toS = played.grade !== 'S' && H && m ? ` · S ${m.name === 'time' ? `≤ ${(+H.S).toFixed(1)} s` : m.name === 'hits' ? `≤ ${H.S} ${t('hits')}` : `≥ ${Math.round(H.S * 100)}%`}` : '';
      const p = el('p', 'played', `${played.name} — ${t('grade')} ${played.grade} · ${num}${toS}`);
      p.style.color = GC[played.grade];
      items.push(p);
    }
    const grid = el('div', 'grid');
    list.forEach((wd, wi) => {
      const name = el('span', 'wname', wd.name);
      name.style.color = wd.open ? wd.rail : '';
      grid.append(name);
      wd.rooms.forEach((r, ri) => {
        const b = el('button', 'tile');
        b.dataset.gr = wi; b.dataset.gc = ri; b.dataset.id = r.id;
        b.setAttribute('aria-label', r.open ? `${r.index + 1} ${r.name}` : `${r.index + 1} ${t('roomLocked')}`);
        if (!r.open) { b.classList.add('off'); b.setAttribute('aria-disabled', 'true'); }
        b.append(el('span', 'num', String(r.index + 1)), goalGlyph(goalOf(r).type, { size: 26, color: wd.rail, locked: !r.open }));
        if (r.grade) { const g = el('span', 'grade', r.grade); g.style.color = GC[r.grade]; b.append(g); b.style.borderColor = GC[r.grade]; }
        b.addEventListener('click', () => { if (r.open) this.roomCard(r, wd); });
        b.addEventListener('pointerenter', () => { this.focusIndex = this.buttons.indexOf(b); this._focus(); });
        grid.append(b);
      });
    });
    items.push(grid);
    items.push(this._button(t('back'), null, () => this.h.onTitle?.()));
    this._panel(items);
    const i = this.buttons.findIndex((b) => b.dataset.id === at);
    if (i >= 0) { this.focusIndex = i; this._focus(); }
  }

  // A room's CARD: what it asks, its chart, the lines it is graded on in its
  // own number (the seconds, the hits, the heart, the share), your best, and
  // START. BACK (or Esc, or B) is the grid, with this room's tile in focus.
  roomCard(r, wd) {
    const GC = GRADE_COLORS, L = r.level;
    this.optBack = () => this.campaign(this._list, { focus: r.id });
    const m = metricOf(r), tiers = L ? tiersFor(r, L) : null;
    const fmt = (v) => (m.name === 'time' ? `≤ ${(+v).toFixed(1)} s` : m.name === 'hits' ? `≤ ${v} ${t('hits')}` : m.name === 'heart' ? `♥ ≥ ${Math.round(v * 100)}%` : `≥ ${Math.round(v * 100)}% ${t('downShare')}`);
    const rows = el('div', 'tiers');
    const line = (g, text) => { const k = el('span', 'tg', g); k.style.color = GC[g]; rows.append(k, el('span', 'tt', text)); };
    if (tiers) for (const g of ['S', 'A', 'B']) line(g, fmt(tiers[g]));
    line('C', t('tierC'));
    line('F', t('tierF'));
    const head = el('p', 'mode', `${wd?.name ?? ''} · ${r.index + 1} / 30`);
    head.style.color = wd?.rail ?? '';
    const best = r.grade ? `${t('yourBest')}: ${r.grade}${r.best != null ? ` · ${m.name === 'time' ? `${(+r.best).toFixed(1)} s` : m.name === 'hits' ? `${r.best} ${t('hits')}` : `${Math.round(r.best * 100)}%`}` : ''}` : t('notPlayed');
    const bestEl = el('p', 'best', best);
    if (r.grade) bestEl.style.color = GC[r.grade];
    const chart = L ? roomChart(L, { width: 300, height: 56 }) : null;
    const startBtn = this._button(t('start'), `${L?.duration ?? ''} s`, () => this.h.onRoom?.(r.id));
    startBtn.classList.add('go');
    this._panel([el('h2', 'card', r.name), head, el('p', 'goal', goalText(r)), ...(chart ? [chart] : []),
      ...(L?.plan?.teaches ? [el('p', 'teaches', `${t('teaches')}: ${L.plan.teaches}`)] : []),
      ...(L?.plan?.strategy ? [el('p', 'skills', `${t('skills')}: ${L.plan.strategy.map((k) => t(`sk_${k}`)).join(' · ')}`)] : []),
      rows, ...(m.name === 'share' ? [el('p', 'hint', t('hitCost'))] : []), bestEl,
      startBtn, this._button(t('back'), null, () => this.closeOptions())]);
  }

  // OPTIONS, 1.x's way (its title OPTIONS opened the pause menu's settings,
  // v109): one page of every switch, reached from the title, the pause menu
  // and the death screen, and BACK (or Esc, or B) to where it was opened.
  // `back` redraws that menu. The test switches (DASH, GEL HP) take effect
  // from the next run; the rest at once.
  openOptions(back) {
    if (back) this.optBack = back;
    const o = this.h.optionsState?.() ?? { sound: true, test: { dash: 'push', hp: 1 } }, keep = this.optBack && this.menuEl.querySelector('h2.opt') ? this.focusIndex : 0;
    const switches = el('div', 'row');
    switches.append(
      this._button(`${t('dash')} · ${t(o.test.dash)}`, t(`${o.test.dash}Sub`), () => this.h.onDash?.()),
      this._button(`${t('gelHp')} ×${o.test.hp}`, t('gelHpSub'), () => this.h.onGelHp?.()),
    );
    this._panel([el('h2', 'opt', t('options')), switches, ...this._gelsRow(o.sound), this._button(t('back'), null, () => this.closeOptions()), el('p', 'hint', `${t('dash')} · ${t('gelHp')}: ${t('nextRun')}`)]);
    if (keep > 0 && keep < this.buttons.length) { this.focusIndex = keep; this._focus(); }
  }
  _focusOn(label) { const i = this.buttons.findIndex((b) => b.querySelector('.label')?.textContent === label); if (i >= 0) { this.focusIndex = i; this._focus(); } }
  closeOptions() { const b = this.optBack; this.optBack = null; b?.(); }
  get inOptions() { return !!this.optBack; }

  // the GELS switch (render/sdf.js) beside SOUND: how the gels are drawn;
  // WORLDS (v23): which look worlds 2 and 3 wear; and below them SOUND and
  // SPLATTER (render/goo.js), off for a phone that cannot carry it
  _gelsRow(sound) {
    const g = this.h.gels?.() === 'sdf' ? 'sdf' : 'classic', wl = this.h.worlds?.() === 'neon' ? 'neon' : 'street';
    const row = el('div', 'row'), row2 = el('div', 'row');
    row.append(
      this._button(`${t('gels')} · ${t(g)}`, t(`${g}Sub`), () => this.h.onGels?.()),
      this._button(`${t('worlds')} · ${t(wl)}`, t(`${wl}Sub`), () => this.h.onWorlds?.()),
    );
    // 1.x's settings page (v81, v137): VOLUME and the announcer with its own
    // volume, REDUCE MOTION, and the language its title carried as chips
    const o = this.h.optionsState?.() ?? {}, pct = (v) => `${Math.round((v ?? 1) * 100)}%`;
    row2.append(
      this._button(`${t('volume')} ${pct(o.volume)}`, null, () => this.h.onVolume?.()),
      this._button(this.h.goo?.() === false ? t('gooOff') : t('gooOn'), null, () => this.h.onGoo?.()),
    );
    const row3 = el('div', 'row'), row4 = el('div', 'row');
    row3.append(
      this._button(o.announcer ? t('annOn') : t('annOff'), null, () => this.h.onAnnouncer?.()),
      this._button(`${t('annVol')} ${pct(o.annVolume)}`, null, () => this.h.onAnnVolume?.()),
    );
    row4.append(
      this._button(o.reduceMotion ? t('motionOn') : t('motionOff'), t(o.reduceMotion ? 'motionOnH' : 'motionOffH'), () => this.h.onMotion?.()),
      this._button(t('langName'), null, () => this.h.onLang?.()),
    );
    return [row, row2, row3, row4];
  }

  // the card for the gel that got you (or, paused, the last to land a hit):
  // its name, a box main.js draws the gel itself into (render/specimen.js),
  // and one line on how to read it next time
  _gelCard(kind, head) {
    const S = kind && TUNING.species[kind];
    if (!S) return null;
    const card = el('div', 'gelcard'), box = el('div', 'specimen'), words = el('div', 'words');
    words.append(el('p', 'head', head), el('p', 'name', S.name), el('p', 'line', GEL_LINES[lang]?.[kind] ?? GEL_LINES.en[kind] ?? ''));
    card.append(box, words);
    card.style.setProperty('--gel', `#${S.color.toString(16).padStart(6, '0')}`);
    queueMicrotask(() => this.h.onSpecimen?.(kind, box));
    return card;
  }

  pause(lastHit = null) {
    const card = this._gelCard(lastHit, t('lastHit'));
    this.optBack = null;
    this._panel([el('h2', null, t('paused')), ...(card ? [card] : []), this._button(t('resume'), null, () => this.h.onResume()),
      this._button(t('options'), null, () => this.openOptions(() => { this.pause(lastHit); this._focusOn(t('options')); })), this._button(t('quit'), null, () => this.h.onMenu())]);
  }

  results(r) {
    this.optBack = null;
    const rows = el('dl', 'stats');
    const row = (k, v) => rows.append(el('dt', null, k), el('dd', null, v));
    row(t('score'), r.score.toLocaleString('en-US') + (r.newBest ? `  ${t('newbest')}` : ''));
    row(t('best'), r.best.toLocaleString('en-US'));
    row(t('time'), r.time);
    if (r.gotYou && !r.gotYouKind) row(t('gotyou'), r.gotYou);
    row(t('kills'), String(r.kills));
    row(t('grazes'), String(r.grazes));
    const card = this._gelCard(r.gotYouKind, t('gotyou'));
    if (r.room) row(t('grade'), r.room.grade);
    // a room: your number against its lines, or what the F was
    const lines = r.room ? this._roomLines(r.room) : null;
    this._panel([el('h2', null, r.won ? t('won') : r.room?.outcome === 'fail' ? t('timeUp') : t('over')), el('p', 'mode', r.won ? `${r.mode.toUpperCase()} · ${t('wonSub')}` : r.room ? `${r.room.name} · ${goalText(r.room)}` : r.mode.toUpperCase()), ...(card ? [card] : []), rows, ...(lines ? [lines] : []),
      this._button(t('again'), null, () => this.h.onAgain()), r.room ? this._button(t('rooms'), null, () => this.h.onCampaign?.()) : this._button(t('menu'), null, () => this.h.onMenu()),
      this._button(t('options'), null, () => this.openOptions(() => { this.results(r); this._focusOn(t('options')); }))]);
  }

  // A room's result against its lines: S, A, B in its own number, C, F —
  // with a marker on the line you landed on and your number beside it; an F
  // says why (`why` from sim/director/campaign.js end()).
  _roomLines(room) {
    const GC = GRADE_COLORS, L = room.level, m = metricOf(room), H = L ? tiersFor(room, L) : null;
    const box = el('div', 'tiers result');
    const num = (v) => (v == null ? '' : m.name === 'time' ? `${(+v).toFixed(1)} s` : m.name === 'hits' ? `${v} ${t('hits')}` : m.name === 'heart' ? `♥ ${Math.round(v * 100)}%` : `${Math.round(v * 100)}%`);
    const fmt = (v) => (m.name === 'time' ? `≤ ${(+v).toFixed(1)} s` : m.name === 'hits' ? `≤ ${v} ${t('hits')}` : m.name === 'heart' ? `♥ ≥ ${Math.round(v * 100)}%` : `≥ ${Math.round(v * 100)}% ${t('downShare')}`);
    const why = { died: t('whyDied'), hit: t('whyHit'), heart: t('whyHeart'), clock: t('whyClock') }[room.why] ?? t('tierF');
    const text = { C: t('tierC'), F: room.grade === 'F' ? why : t('tierF') };
    for (const g of ['S', 'A', 'B', 'C', 'F']) {
      if (!H && 'SAB'.includes(g)) continue;
      const k = el('span', 'tg', g); k.style.color = GC[g];
      const here = room.grade === g;
      const line = el('span', 'tt', `${'SAB'.includes(g) ? fmt(H[g]) : text[g]}${here ? `  ◀ ${t('yours')}${room.grade !== 'F' && room.value != null ? ` ${num(room.value)}` : ''}` : ''}`);
      if (here) { line.style.color = GC[g]; line.style.fontWeight = '700'; }
      box.append(k, line);
    }
    return box;
  }

  // ── pad and keys in menus ──────────────────────────────────────
  _move(d) { if (!this.buttons?.length) return; this.focusIndex = (this.focusIndex + d + this.buttons.length) % this.buttons.length; this._focus(); }
  // a direction in a menu: on the campaign's grid, to the tile that way (off
  // its top or bottom, to what is above or below the grid); anywhere else,
  // up and left are back a button and down and right on a button
  _dir(dx, dy) {
    const b = this.buttons?.[this.focusIndex];
    if (!b || b.dataset.gr == null) { this._move(dy || dx); return; }
    const r = +b.dataset.gr + dy, c = +b.dataset.gc + dx, tiles = this.buttons.filter((x) => x.dataset.gr != null);
    let i = this.buttons.findIndex((x) => x.dataset.gr != null && +x.dataset.gr === r && +x.dataset.gc === c);
    if (i < 0 && dx) { this._move(dx); return; }
    if (i < 0) i = dy < 0 ? this.buttons.indexOf(tiles[0]) - 1 : this.buttons.indexOf(tiles[tiles.length - 1]) + 1;
    if (i >= 0 && i < this.buttons.length) { this.focusIndex = i; this._focus(); }
  }
  _pick() { this.buttons?.[this.focusIndex]?.click(); }
  _menuKey(e) {
    if (this.menuEl.hidden) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { this._dir(0, 1); e.preventDefault(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this._dir(0, -1); e.preventDefault(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { this._dir(1, 0); e.preventDefault(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this._dir(-1, 0); e.preventDefault(); }
    else if (e.code === 'Enter' || e.code === 'Space') { this._pick(); e.preventDefault(); }
    else if (e.code === 'Escape') { if (this.optBack) this.closeOptions(); else this.h.onBack?.(); }
  }
  // The pad is read every frame, menu or not, so a button already held when
  // a menu opens is not a press in it: Options pauses on its way down, and
  // the same press must not then pick RESUME a frame later.
  pollPad() {
    const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((x) => x && x.connected);
    if (!p) { this._padPrev = {}; return; }
    const now = { up: p.buttons[12]?.pressed || p.axes[1] < -0.6, down: p.buttons[13]?.pressed || p.axes[1] > 0.6, left: p.buttons[14]?.pressed || p.axes[0] < -0.6, right: p.buttons[15]?.pressed || p.axes[0] > 0.6, a: p.buttons[0]?.pressed, b: p.buttons[1]?.pressed, start: p.buttons[9]?.pressed };
    if (this.menuEl.hidden) { this._padPrev = now; return; }
    const edge = (k) => now[k] && !this._padPrev[k];
    if (edge('down')) this._dir(0, 1);
    if (edge('up')) this._dir(0, -1);
    if (edge('right')) this._dir(1, 0);
    if (edge('left')) this._dir(-1, 0);
    if (edge('a') || edge('start')) this._pick();
    if (edge('b')) { if (this.optBack) this.closeOptions(); else this.h.onBack?.(); }
    this._padPrev = now;
  }

  // ── the touch sticks, drawn where the thumbs landed ────────────
  // `pips`: the bodies off the screen on a world bigger than it (main.js),
  // each an arrow on the edge pointing at it, in its colour: { x, y, a, hex, big }
  drawSticks(input, pips = null) {
    const c = this.sticks, dpr = Math.min(devicePixelRatio, 2);
    if (c.width !== Math.round(innerWidth * dpr)) { c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr); }
    const g = this.sctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (pips) {
      for (const p of pips) {
        const r = p.big ? 9 : 6;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a);
        g.fillStyle = `#${p.hex.toString(16).padStart(6, '0')}`; g.globalAlpha = p.alpha;
        g.beginPath(); g.moveTo(r * 1.4, 0); g.lineTo(-r * 0.8, r); g.lineTo(-r * 0.8, -r); g.closePath(); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
    }
    if (input.source !== 'touch') return;
    const R = TUNING.input.stickRadius;
    for (const s of [input.left, input.right]) {
      if (!s.active) continue;
      const l = Math.hypot(s.dx, s.dy), k = l > R ? R / l : 1;
      g.strokeStyle = 'rgba(217,220,226,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(s.ox, s.oy, R, 0, Math.PI * 2); g.stroke();
      g.fillStyle = s === input.right ? 'rgba(255,180,104,0.55)' : 'rgba(217,220,226,0.45)';
      g.beginPath(); g.arc(s.ox + s.dx * k, s.oy + s.dy * k, 22, 0, Math.PI * 2); g.fill();
    }
  }
}
