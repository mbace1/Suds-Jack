// Radio Free Helsinki — one post's screen, and the voice that drives it.
// Vertical codec: story panel on top, Toko portrait below. While live, a cut
// sequencer cycles weighted-random shots:
//   ~20% face / ~15% graphic / ~65% broll
// DECODE still mutates whichever shot is showing.
// Idle/static frames prefer story.broll so the new Helsinki art is visible
// while scrolling — not only during live cuts.

import { PixelScreen, shade, mix } from './screen.js?v=19';
import { PAL, SECTOR_COLOR } from './palette.js?v=19';
import { Toko } from './toko.js?v=19';
import { drawVisual, PANEL_W, PANEL_H, num, BROLL_KEYS } from './visuals.js?v=19';

export const POST_W = 144, POST_H = 276;
const VF = { x: 8, y: 6, w: PANEL_W, h: PANEL_H };
const PF = { x: 8, y: 166, w: 96, h: 96 };
const DATA = { x: 110, y: 166, w: 26, h: 96 };
const WAVE = { x: 8, y: 266, w: 128, h: 8 };

const WEIGHTS = { face: 0.20, graphic: 0.15, broll: 0.65 };
const CUT_MIN = 3.2, CUT_MAX = 5.5;

function pickBroll(story, lastKey) {
  const pool = (BROLL_KEYS && BROLL_KEYS.length) ? BROLL_KEYS
    : ['esplanadi', 'kamppi', 'harbour', 'gulf', 'cathedral', 'katu', 'mannerheim', 'station', 'suomenlinna', 'katajanokka'];
  const own = pool.includes(story.broll) ? story.broll : null;
  if (own && own !== lastKey && Math.random() < 0.6) return own;
  const others = pool.filter(k => k !== lastKey);
  return others[Math.floor(Math.random() * others.length)] || own || pool[0];
}

function pickShot(story, lastKey) {
  const r = Math.random();
  if (r < WEIGHTS.face) return { type: 'face' };
  if (r < WEIGHTS.face + WEIGHTS.graphic) return { type: 'graphic' };
  return { type: 'broll', key: pickBroll(story, lastKey) };
}

export class Post {
  constructor(host, story, sector, seed = 0) {
    this.scr = new PixelScreen(host, POST_W, POST_H);
    this.portrait = new PixelScreen(null, PF.w, PF.h);
    this.panel = new PixelScreen(null, PANEL_W, PANEL_H);
    this.toko = new Toko();
    this.toko.t = seed * 1.7;
    this.story = story;
    this.freq = sector.freq;
    this.accent = SECTOR_COLOR[story.sector] || PAL.GREEN;
    this.t = seed * 0.9;
    this.signal = 1;
    this.decode = 0;
    this.decoded = false;
    this.mouth = 0;
    this.wave = new Array(31).fill(0.2);
    this.live = false;
    this.silent = false;
    this.shot = story.broll
      ? { type: 'broll', key: story.broll }
      : { type: 'graphic' };
    this.lastBroll = story.broll || null;
    this.cutT = 0;
    this.nextCut = CUT_MIN + Math.random() * (CUT_MAX - CUT_MIN);
  }

  goLive() {
    this.live = true;
    this.signal = 0;
    this.shot = this.story.broll
      ? { type: 'broll', key: this.story.broll }
      : pickShot(this.story, this.lastBroll);
    this.noteShot();
    this.cutT = 0;
    this.nextCut = CUT_MIN + Math.random() * (CUT_MAX - CUT_MIN);
  }
  goIdle() { this.live = false; }

  noteShot() { if (this.shot && this.shot.type === 'broll' && this.shot.key) this.lastBroll = this.shot.key; }

  update(dt, mouth) {
    this.t += dt;
    this.mouth = mouth;
    this.signal += (1 - this.signal) * Math.min(1, dt * 1.6);
    this.decode += ((this.decoded ? 1 : 0) - this.decode) * Math.min(1, dt * 4.5);
    this.toko.update(dt, mouth, this.decoded);

    if (this.live && !this.silent) {
      this.cutT += dt;
      if (this.cutT >= this.nextCut) {
        this.shot = pickShot(this.story, this.lastBroll);
        this.noteShot();
        this.cutT = 0;
        this.nextCut = CUT_MIN + Math.random() * (CUT_MAX - CUT_MIN);
      }
    }

    this.wave.shift();
    const carrier = this.silent ? 0 : 0.3 + Math.sin(this.t * 3.1) * 0.13 + Math.random() * 0.1;
    this.wave.push(Math.min(1, mouth * 0.82 + carrier));
  }

  renderStatic() {
    this.toko.update(0.016, 0, this.decoded);
    if (this.story.broll) {
      this.shot = { type: 'broll', key: this.story.broll };
    } else {
      this.shot = { type: 'graphic' };
    }
    this.draw();
  }

  draw() {
    const s = this.scr;
    s.clear(PAL.SHELL);

    const faceShot = this.live && this.shot.type === 'face';
    let visualKey = this.story.visual;
    if (this.shot.type === 'broll') {
      visualKey = this.shot.key || this.story.broll || 'cathedral';
    }

    if (faceShot) {
      this.toko.draw(this.panel, this.signal, true);
      s.ctx.drawImage(this.panel.canvas, VF.x, VF.y);
      this.toko.draw(this.portrait, this.signal * 0.55, false);
      s.ctx.globalAlpha = 0.45;
      s.ctx.drawImage(this.portrait.canvas, PF.x, PF.y);
      s.ctx.globalAlpha = 1;
    } else {
      this.toko.draw(this.portrait, this.signal, false);
      drawVisual(visualKey, this.panel, this.t, this.decode);
      s.ctx.drawImage(this.panel.canvas, VF.x, VF.y);
      s.ctx.drawImage(this.portrait.canvas, PF.x, PF.y);
    }

    const line = mix(PAL.GREEN_DIM, PAL.AMBER_DIM, this.decode);
    this.frame(VF, line, mix(this.accent, PAL.AMBER, this.decode));
    this.frame(PF, line, mix(PAL.GEL_RIM, PAL.AMBER, this.decode));
    this.dataColumn();
    this.waveband(mix(this.accent, PAL.AMBER_HOT, this.decode));

    s.px(0, 0, POST_W, 1, shade(PAL.SHELL, 1.9));
    s.px(0, POST_H - 1, POST_W, 1, shade(PAL.SHELL, 0.4));
  }

  frame(f, lineColor, cornerColor) {
    const s = this.scr;
    s.px(f.x - 1, f.y - 1, f.w + 2, 1, lineColor);
    s.px(f.x - 1, f.y + f.h, f.w + 2, 1, lineColor);
    s.px(f.x - 1, f.y - 1, 1, f.h + 2, lineColor);
    s.px(f.x + f.w, f.y - 1, 1, f.h + 2, lineColor);
    const L = 7;
    for (const [cx, cy, dx, dy] of [
      [f.x - 2, f.y - 2, 1, 1], [f.x + f.w + 1, f.y - 2, -1, 1],
      [f.x - 2, f.y + f.h + 1, 1, -1], [f.x + f.w + 1, f.y + f.h + 1, -1, -1],
    ]) {
      s.px(dx > 0 ? cx : cx - L + 1, cy, L, 1, cornerColor);
      s.px(cx, dy > 0 ? cy : cy - L + 1, 1, L, cornerColor);
    }
  }

  dataColumn() {
    const s = this.scr;
    const c = mix(this.accent, PAL.AMBER_HOT, this.decode);
    s.px(DATA.x, DATA.y, DATA.w, DATA.h, PAL.PANEL_LO);
    s.px(DATA.x, DATA.y, DATA.w, 1, shade(c, 0.4));
    s.px(DATA.x, DATA.y + DATA.h - 1, DATA.w, 1, shade(c, 0.4));
    num(s, DATA.x + 3, DATA.y + 5, this.freq, c);

    const on = Math.floor(this.t * 1.6) % 2 === 0;
    s.px(DATA.x + 4, DATA.y + 16, 4, 4, on ? PAL.DEFENCE : shade(PAL.DEFENCE, 0.3));
    s.px(DATA.x + 11, DATA.y + 17, 9, 2, shade(c, 0.7));

    const segs = 12, top = DATA.y + 26;
    const lit = Math.round(this.mouth * segs);
    for (let i = 0; i < segs; i++) {
      const y = top + (segs - 1 - i) * 5;
      const hot = i >= segs - 3;
      s.px(DATA.x + 6, y, 14, 3,
        i < lit ? (hot ? PAL.AMBER_HOT : c) : shade(PAL.PANEL, 1.6));
    }
  }

  waveband(color) {
    const s = this.scr;
    s.px(WAVE.x, WAVE.y, WAVE.w, WAVE.h, PAL.PANEL_LO);
    const mid = WAVE.y + WAVE.h / 2;
    s.px(WAVE.x, mid, WAVE.w, 1, shade(color, 0.35));
    this.wave.forEach((v, i) => {
      const x = WAVE.x + 2 + i * 4;
      const h = Math.max(1, Math.round(v * (WAVE.h / 2 - 1)));
      s.px(x, mid - h, 2, h * 2, v > 0.55 ? shade(color, 1.25) : color);
    });
  }

  destroy() { this.scr.destroy(); }
}

const VOWELS = 'aeiouyäöAEIOUYÄÖ';
const PUNCT = ',.;:—、。「」『』・…!?！？';

function amplitudeOf(ch) {
  if (ch === ' ' || ch === '\n' || ch === '　') return 0;
  if (PUNCT.includes(ch)) return 0.1;
  const code = ch.codePointAt(0);
  if (code > 0x2e80) return (code >= 0x3040 && code <= 0x30ff) ? 0.92 : 0.7;
  if (VOWELS.includes(ch)) return 0.95;
  return 0.5;
}

const CPS = { en: 72, fi: 72, ja: 26 };

export class Reader {
  constructor(onBlip) {
    this.onBlip = onBlip || (() => {});
    this.host = null;
    this.reset();
  }

  reset() {
    this.queue = [];
    this.at = 0;
    this.acc = 0;
    this.amp = 0;
    this.chars = 0;
    this.done = true;
  }

  play(host, lines, decoded) {
    this.host = host;
    host.innerHTML = '';
    this.reset();
    this.done = false;
    for (const runs of lines) {
      const p = document.createElement('p');
      p.className = 'bulletin-line';
      for (const run of runs) {
        if (run.plain === null) {
          const span = document.createElement('span');
          p.appendChild(span);
          this.queue.push({ node: span, text: run.text });
        } else {
          const was = document.createElement('span');
          was.className = 'spun' + (decoded ? ' struck' : '');
          p.appendChild(was);
          this.queue.push({ node: was, text: run.text });
          const plain = document.createElement('span');
          plain.className = 'plain';
          plain.hidden = !decoded;
          p.appendChild(plain);
          this.queue.push({ node: plain, text: run.plain, onlyDecoded: true });
        }
      }
      host.appendChild(p);
    }
    this.decoded = decoded;
  }

  setDecoded(on) {
    this.decoded = on;
    if (!this.host) return;
    for (const item of this.queue) {
      if (!item.onlyDecoded) continue;
      item.node.hidden = !on;
      if (!on) { item.node.textContent = ''; item.i = 0; }
    }
    for (const p of this.host.querySelectorAll('.spun')) p.classList.toggle('struck', on);
    if (this.done && on) {
      for (const item of this.queue) if (item.onlyDecoded) item.node.textContent = item.text;
    }
  }

  finish() {
    for (const item of this.queue) {
      if (item.onlyDecoded && !this.decoded) continue;
      item.node.textContent = item.text;
    }
    this.at = this.queue.length;
    this.done = true;
    this.amp = 0;
  }

  update(dt, lang = 'en') {
    if (this.done) { this.amp *= 0.86; return this.amp; }
    this.acc += dt * (CPS[lang] ?? CPS.en);
    let typed = 0;
    while (this.acc >= 1 && this.at < this.queue.length) {
      this.acc -= 1;
      const item = this.queue[this.at];
      if (item.onlyDecoded && !this.decoded) { this.at++; continue; }
      item.i = item.i || 0;
      if (item.i >= item.text.length) { this.at++; continue; }
      const ch = item.text[item.i++];
      item.node.textContent = item.text.slice(0, item.i);
      typed++;
      this.chars++;
      this.amp = amplitudeOf(ch);
      if (this.chars % 3 === 0 && ch !== ' ') this.onBlip(this.chars);
    }
    if (this.at >= this.queue.length) { this.done = true; this.amp = 0; }
    if (!typed) this.amp *= 0.9;
    return this.amp;
  }
}
