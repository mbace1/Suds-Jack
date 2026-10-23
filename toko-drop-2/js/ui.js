// ui.js — HUD, menus, banners and the touch sticks. DOM over the canvas:
// crisp vector type on near-black (DIRECTION). Menus are pad-first — a d-pad
// or arrow keys move a gold focus ring (1.x v134), A / Enter picks, B / Esc
// backs out — and a tap or click works on every button just the same.
import { TUNING } from './tuning.js?v=18';

const STR = {
  en: {
    intro: 'INTRO', introSub: 'watch it begin, then play',
    dash: 'DASH', push: 'PUSH', pushSub: 'shoves gels away', cut: 'CUT', cutSub: 'through them, and it hurts', gelHp: 'GEL HP', gelHpSub: 'tougher gels, same score',
    arcade: '1.x waves: three lives, every kill pays your streak.', hardcade: 'Arcade, and the biters\' corpses shoot back.', survival: 'Endless. It only gets worse.', campaign: 'Rooms with their own clock — coming next.',
    best: 'BEST', resume: 'RESUME', quit: 'QUIT', again: 'AGAIN', menu: 'MENU', paused: 'PAUSED',
    over: 'GAME OVER', gotyou: 'GOT YOU', time: 'TIME', newbest: 'NEW BEST', soon: 'SOON',
    wave: 'WAVE', clear: 'CLEAR', curtain: 'CURTAIN!', pod: 'POD', podUp: 'POD LV2!', podDown: 'POD KNOCKED DOWN TO LV1', soundOn: 'SOUND ON', soundOff: 'SOUND OFF', score: 'SCORE', kills: 'KILLS', grazes: 'GRAZES',
    greenRush: 'GREEN RUSH! DOUBLE PRIZE', dud: 'DUD! GREEN MEANS GO', dashThrough: 'DASH THROUGH!', gateChain: 'GATE CHAIN', bounty: 'BOUNTY',
    dashUp: 'DASH UP', dashDown: 'DASH KNOCKED DOWN TO LV1', fxInv: 'INVINCIBLE', fxRapid: 'RAPID FIRE', fxMult: 'SCORE', fxDash: 'DASH',
    hintTouch: 'LEFT THUMB MOVES · RIGHT THUMB AIMS AND FIRES · FLICK TO DASH',
    hintKeys: 'WASD MOVES · MOUSE AIMS · HOLD CLICK TO FIRE · SPACE DASHES · ESC PAUSES',
    hintPad: 'LEFT STICK MOVES · RIGHT STICK AIMS AND FIRES · A DASHES · START PAUSES',
    gels: 'GELS', classic: 'CLASSIC', sdf: 'SDF', classicSub: 'mesh gels, as they are', sdfSub: 'ray-marched fields',
  },
  ja: {
    intro: 'イントロ', introSub: '始まりを見てからプレイ',
    dash: 'ダッシュ', push: '押す', pushSub: 'ゼリーを押しのける', cut: '貫く', cutSub: '貫いてダメージ', gelHp: 'ゼリー耐久', gelHpSub: '硬いゼリー、スコアは同じ',
    arcade: '1.xのウェーブ：ライフ3つ、撃破は連鎖分のスコア。', hardcade: 'アーケード、噛みつく敵の残骸が撃ち返してくる。', survival: '終わりなし。ひたすら厳しくなる。', campaign: '制限時間のある部屋 — 次の版で。',
    best: 'ベスト', resume: '再開', quit: 'やめる', again: 'もう一度', menu: 'メニュー', paused: '一時停止',
    over: 'ゲームオーバー', gotyou: 'やられた相手', time: 'タイム', newbest: '新記録', soon: '近日',
    wave: 'ウェーブ', clear: 'クリア', curtain: 'カーテン！', pod: 'ポッド', podUp: 'ポッド LV2！', podDown: 'ポッドが LV1 に', soundOn: 'サウンド オン', soundOff: 'サウンド オフ', score: 'スコア', kills: '撃破', grazes: 'グレイズ',
    greenRush: 'グリーンラッシュ！賞品2倍', dud: 'ハズレ！緑で行け', dashThrough: 'ダッシュで抜けろ！', gateChain: 'ゲートチェーン', bounty: '賞金首',
    dashUp: 'ダッシュ強化', dashDown: 'ダッシュが LV1 に', fxInv: '無敵', fxRapid: '連射', fxMult: 'スコア', fxDash: 'ダッシュ',
    hintTouch: '左手で移動 · 右手でエイムと射撃 · はじいてダッシュ',
    hintKeys: 'WASDで移動 · マウスでエイム · クリック長押しで射撃 · スペースでダッシュ · ESCで一時停止',
    hintPad: '左スティックで移動 · 右スティックでエイムと射撃 · Aでダッシュ · STARTで一時停止',
    gels: 'ゼリー', classic: 'クラシック', sdf: 'SDF', classicSub: 'いつものメッシュ', sdfSub: 'レイマーチの距離場',
  },
  fi: {
    intro: 'INTRO', introSub: 'katso alku, sitten pelaa',
    dash: 'SYÖKSY', push: 'TÖNÄISY', pushSub: 'tönäisee geelit sivuun', cut: 'VIILTO', cutSub: 'läpi, ja se satuttaa', gelHp: 'GEELIN KESTO', gelHpSub: 'sitkeämmät geelit, samat pisteet',
    arcade: '1.x:n aallot: kolme elämää, jokainen kaato maksaa putkesi verran.', hardcade: 'Arcade, ja purijoiden raadot ampuvat takaisin.', survival: 'Loputon. Pahenee vain.', campaign: 'Huoneita omalla kellollaan — seuraavaksi.',
    best: 'ENNÄTYS', resume: 'JATKA', quit: 'LOPETA', again: 'UUDESTAAN', menu: 'VALIKKO', paused: 'TAUKO',
    over: 'PELI OHI', gotyou: 'KAATAJA', time: 'AIKA', newbest: 'UUSI ENNÄTYS', soon: 'TULOSSA',
    wave: 'AALTO', clear: 'TYHJÄ', curtain: 'VERHO!', pod: 'KAPSELI', podUp: 'KAPSELI LV2!', podDown: 'KAPSELI PUTOSI LV1:EEN', soundOn: 'ÄÄNI PÄÄLLÄ', soundOff: 'ÄÄNI POIS', score: 'PISTEET', kills: 'KAATOJA', grazes: 'HIPAISUJA',
    greenRush: 'VIHREÄ RYNTÄYS! TUPLAPALKINTO', dud: 'SUUTARI! VIHREÄLLÄ MENNÄÄN', dashThrough: 'SYÖKSY LÄPI!', gateChain: 'PORTTIKETJU', bounty: 'PALKKIO',
    dashUp: 'SYÖKSY PARANI', dashDown: 'SYÖKSY PUTOSI LV1:EEN', fxInv: 'KUOLEMATON', fxRapid: 'PIKATULI', fxMult: 'PISTEET', fxDash: 'SYÖKSY',
    hintTouch: 'VASEN PEUKALO LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · SIPAISE SYÖKSYÄKSESI',
    hintKeys: 'WASD LIIKKUU · HIIRI TÄHTÄÄ · PIDÄ PAINIKE POHJASSA AMPUAKSESI · VÄLILYÖNTI SYÖKSYY · ESC TAUKO',
    hintPad: 'VASEN TATTI LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · A SYÖKSYY · START TAUKO',
    gels: 'GEELIT', classic: 'KLASSINEN', sdf: 'SDF', classicSub: 'tavalliset verkkogeelit', sdfSub: 'säteenmarssatut kentät',
  },
};
const lang = (() => { const l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; })();
export const t = (k) => STR[lang][k] ?? STR.en[k] ?? k;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// The modes the title offers, top to bottom. SURVIVAL is off it for now
// (owner, 2026-10-22: "forget survival for now"); only the title forgets it.
// The mode still runs (main.js MODES), keeps its best score and its strings,
// and listing it here again puts its row back as it was.
const TITLE_MODES = ['arcade', 'hardcade'];

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
    document.getElementById('pausebtn').addEventListener('click', () => this.h.onPause());
    this.focusIndex = 0;
    this._padPrev = {};
    this._bannerT = 0;
    addEventListener('keydown', (e) => this._menuKey(e));
  }

  setHud(visible) { this.hudEl.hidden = !visible; }

  hud(w) {
    this.scoreEl.textContent = w.score.toLocaleString('en-US');
    this.multEl.textContent = w.streak > 1 ? `×${w.streak}` : '';     // 1.x: every kill pays 100 × the streak
    if (this._lives !== w.hero.lives) {
      this._lives = w.hero.lives;
      this.livesEl.replaceChildren(...Array.from({ length: Math.max(0, w.hero.lives) }, () => el('i')));
    }
    this.clockEl.textContent = timeText(w.time);
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
  }

  // `test` is the title's two test switches (owner, 2026-10-22): which dash,
  // and how tough the gels are. `keep` holds the focus where it was, so a pad
  // can flip a switch and stay on it.
  title(best, sound, source, test = { dash: 'push', hp: 1 }, keep = false) {
    const prev = this.focusIndex;
    const logo = el('div', 'logo'); logo.append(el('span', 'name', 'TOKO DROP'), el('span', 'num', '2.0'));
    const hint = el('p', 'hint', t(source === 'pad' ? 'hintPad' : source === 'keys' ? 'hintKeys' : 'hintTouch'));
    const fmt = (v) => (v ? `${t('best')} ${v.toLocaleString('en-US')}` : '');
    // the start button and, beside it, the intro that leads into it
    const startRow = el('div', 'row start');
    const introBtn = this._button(t('intro'), t('introSub'), () => this.h.onIntro?.());
    introBtn.classList.add('narrow');
    startRow.append(this._button('ARCADE', `${t('arcade')} ${fmt(best.arcade)}`, () => this.h.onStart('arcade')), introBtn);
    const switches = el('div', 'row');
    switches.append(
      this._button(`${t('dash')} · ${t(test.dash)}`, t(`${test.dash}Sub`), () => this.h.onDash?.()),
      this._button(`${t('gelHp')} ×${test.hp}`, t('gelHpSub'), () => this.h.onGelHp?.()),
    );
    this._panel([
      logo,
      startRow,
      // ARCADE leads the start row, beside INTRO; the other modes follow
      ...TITLE_MODES.filter((m) => m !== 'arcade').map((m) => this._button(m.toUpperCase(), `${t(m)} ${fmt(best[m])}`, () => this.h.onStart(m))),
      this._button(`CAMPAIGN · ${t('soon')}`, t('campaign'), () => {}, true),
      switches,
      this._gelsRow(sound),
      hint,
    ]);
    if (keep && prev > 0 && prev < this.buttons.length) { this.focusIndex = prev; this._focus(); }
  }

  // the GELS switch (render/sdf.js) beside SOUND: how the gels are drawn
  _gelsRow(sound) {
    const g = this.h.gels?.() === 'sdf' ? 'sdf' : 'classic', row = el('div', 'row');
    row.append(
      this._button(`${t('gels')} · ${t(g)}`, t(`${g}Sub`), () => this.h.onGels?.()),
      this._button(sound ? t('soundOn') : t('soundOff'), null, () => this.h.onSound()),
    );
    return row;
  }

  pause() {
    this._panel([el('h2', null, t('paused')), this._button(t('resume'), null, () => this.h.onResume()), this._button(t('quit'), null, () => this.h.onMenu())]);
  }

  results(r) {
    const rows = el('dl', 'stats');
    const row = (k, v) => rows.append(el('dt', null, k), el('dd', null, v));
    row(t('score'), r.score.toLocaleString('en-US') + (r.newBest ? `  ${t('newbest')}` : ''));
    row(t('best'), r.best.toLocaleString('en-US'));
    row(t('time'), r.time);
    if (r.gotYou) row(t('gotyou'), r.gotYou);
    row(t('kills'), String(r.kills));
    row(t('grazes'), String(r.grazes));
    this._panel([el('h2', null, t('over')), el('p', 'mode', r.mode.toUpperCase()), rows,
      this._button(t('again'), null, () => this.h.onAgain()), this._button(t('menu'), null, () => this.h.onMenu())]);
  }

  // ── pad and keys in menus ──────────────────────────────────────
  _move(d) { if (!this.buttons?.length) return; this.focusIndex = (this.focusIndex + d + this.buttons.length) % this.buttons.length; this._focus(); }
  _pick() { this.buttons?.[this.focusIndex]?.click(); }
  _menuKey(e) {
    if (this.menuEl.hidden) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { this._move(1); e.preventDefault(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this._move(-1); e.preventDefault(); }
    else if (e.code === 'Enter' || e.code === 'Space') { this._pick(); e.preventDefault(); }
    else if (e.code === 'Escape' && this.h.onBack) this.h.onBack();
  }
  // The pad is read every frame, menu or not, so a button already held when
  // a menu opens is not a press in it: Options pauses on its way down, and
  // the same press must not then pick RESUME a frame later.
  pollPad() {
    const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((x) => x && x.connected);
    if (!p) { this._padPrev = {}; return; }
    const now = { up: p.buttons[12]?.pressed || p.axes[1] < -0.6, down: p.buttons[13]?.pressed || p.axes[1] > 0.6, a: p.buttons[0]?.pressed, b: p.buttons[1]?.pressed, start: p.buttons[9]?.pressed };
    if (this.menuEl.hidden) { this._padPrev = now; return; }
    const edge = (k) => now[k] && !this._padPrev[k];
    if (edge('down')) this._move(1);
    if (edge('up')) this._move(-1);
    if (edge('a') || edge('start')) this._pick();
    if (edge('b') && this.h.onBack) this.h.onBack();
    this._padPrev = now;
  }

  // ── the touch sticks, drawn where the thumbs landed ────────────
  drawSticks(input) {
    const c = this.sticks, dpr = Math.min(devicePixelRatio, 2);
    if (c.width !== Math.round(innerWidth * dpr)) { c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr); }
    const g = this.sctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
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
