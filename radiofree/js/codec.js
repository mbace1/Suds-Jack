// Radio Free Helsinki — one post's screen, and the voice that drives it.
//
// The feed is vertical, so the codec's two frames are STACKED rather than sat
// side by side: the story panel on top, Toko's portrait below it with a data
// column beside her, and a waveform band across the bottom. It is still half a
// Metal Gear codec — one portrait, one picture — turned into a 9:16 post.
//
// Both frames are drawn into detached buffers and blitted into ONE canvas, so
// they cannot drift apart when CSS scales the post to the viewport.
//
// The top frame is a PROGRAM FEED and it cuts: the graphic, then footage from
// the city, then a wide master of the anchor, then footage again — the way a
// news package is actually assembled. Toko's close portrait stays put below it
// as the constant, so a cut to the wide shot reads as a second camera on the
// same person rather than the same picture twice. Under DECODE the cutting
// STOPS and holds on the graphic: the pace is part of the persuasion, and
// taking a story apart means being allowed to look at one thing.
//
// The Reader is the other half of the illusion: it types the bulletin one
// character at a time, blips per character, and hands back a mouth amplitude
// every frame — so Toko is lip-synced to the text on screen instead of flapping
// on a timer. Vowels open the mouth, consonants part it, spaces close it.

import { PixelScreen, shade, mix } from './screen.js?v=6';
import { PAL, SECTOR_COLOR } from './palette.js?v=6';
import { Toko } from './toko.js?v=6';
import { drawVisual, PANEL_W, PANEL_H, num } from './visuals.js?v=6';
import { drawBroll } from './broll.js?v=6';
import { drawWide } from './toko.js?v=6';

export const POST_W = 144, POST_H = 276;
const SHOT_SECS = 3.6;                 // how long the edit holds a shot
const VF = { x: 8, y: 6, w: PANEL_W, h: PANEL_H };     // the story frame
const PF = { x: 8, y: 166, w: 96, h: 96 };             // the portrait frame
const DATA = { x: 110, y: 166, w: 26, h: 96 };         // freq / rec / level
const WAVE = { x: 8, y: 266, w: 128, h: 8 };

export class Post {
  constructor(host, story, sector, seed = 0) {
    this.scr = new PixelScreen(host, POST_W, POST_H);
    this.portrait = new PixelScreen(null, PF.w, PF.h);
    this.panel = new PixelScreen(null, PANEL_W, PANEL_H);
    this.toko = new Toko();
    this.toko.t = seed * 1.7;          // so twelve idle portraits are not one pose
    this.story = story;
    this.freq = sector.freq;
    this.accent = SECTOR_COLOR[story.sector] || PAL.GREEN;
    this.t = seed * 0.9;
    this.signal = 1;                   // 1 until a post goes live and re-tunes
    this.decode = 0;
    this.decoded = false;
    this.mouth = 0;
    this.wave = new Array(31).fill(0.2);
    this.live = false;
    this.silent = false;               // the sign-off: the carrier is gone
    this.broll = story.broll || 'esplanadi';
    this.shots = story.visual === 'signoff'
      ? ['graphic']                    // a test card does not cut to anything
      : ['graphic', 'broll', 'wide', 'broll'];
    this.shot = 0;                     // 0 is always the graphic
    this.shotT = 0;
    this.flash = 0;
  }

  // a post that scrolls into view re-tunes: the picture fades up out of noise
  // A post that comes back to camera starts on the graphic, not halfway through
  // an edit it was running when you scrolled off it — the story panel is what
  // the bulletin is about, so it is what you land on.
  goLive() { this.live = true; this.signal = 0; this.shot = 0; this.shotT = 0; this.flash = 0; }
  goIdle() { this.live = false; }

  update(dt, mouth) {
    this.t += dt;
    this.cutting(dt);
    this.mouth = mouth;
    this.signal += (1 - this.signal) * Math.min(1, dt * 1.6);
    this.decode += ((this.decoded ? 1 : 0) - this.decode) * Math.min(1, dt * 4.5);
    this.toko.update(dt, mouth, this.decoded);
    // the waveform scrolls left. The newest sample is the mouth on top of a
    // breathing carrier — with noise alone, an idle channel quantised to 1px
    // and the band read as a broken dotted line instead of an open mic.
    this.wave.shift();
    const carrier = this.silent ? 0 : 0.3 + Math.sin(this.t * 3.1) * 0.13 + Math.random() * 0.1;
    this.wave.push(Math.min(1, mouth * 0.82 + carrier));
  }

  // the edit. Holds on the graphic while decoding, otherwise cuts on a beat.
  cutting(dt) {
    // the flash decays on its own clock — it has to keep falling in the decoded
    // branch too, or the cut back to the graphic leaves the panel washed out
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 7);
    if (this.shots.length < 2) return;
    if (this.decoded) {
      // decoding is reading: cut home to the graphic (it decodes too) and stay
      if (this.shots[this.shot] !== 'graphic') { this.shot = 0; this.shotT = 0; this.flash = 1; }
      return;
    }
    this.shotT += dt;
    if (this.shotT >= SHOT_SECS) {
      this.shotT = 0;
      this.shot = (this.shot + 1) % this.shots.length;
      this.flash = 1;
    }
  }

  // one frame for a post nobody is looking at yet: no reader, no motion
  renderStatic() {
    this.toko.update(0.016, 0, this.decoded);
    this.draw();
  }

  draw() {
    const s = this.scr;
    s.clear(PAL.SHELL);
    this.toko.draw(this.portrait, this.signal);

    // whichever shot the edit is on, into the one program buffer
    const shot = this.shots[this.shot];
    if (shot === 'broll') drawBroll(this.broll, this.panel, this.t, this.decode);
    else if (shot === 'wide') drawWide(this.panel, this.toko, this.signal);
    else drawVisual(this.story.visual, this.panel, this.t, this.decode);
    if (this.flash > 0.02) this.cutFlash();

    s.ctx.drawImage(this.panel.canvas, VF.x, VF.y);
    s.ctx.drawImage(this.portrait.canvas, PF.x, PF.y);

    const line = mix(PAL.GREEN_DIM, PAL.AMBER_DIM, this.decode);
    this.frame(VF, line, mix(this.accent, PAL.AMBER, this.decode));
    this.frame(PF, line, mix(PAL.GEL_RIM, PAL.AMBER, this.decode));
    this.dataColumn();
    this.waveband(mix(this.accent, PAL.AMBER_HOT, this.decode));

    s.px(0, 0, POST_W, 1, shade(PAL.SHELL, 1.9));
    s.px(0, POST_H - 1, POST_W, 1, shade(PAL.SHELL, 0.4));
  }

  // the snap on a cut: one bright band and a couple of displaced rows, gone in
  // a tenth of a second. Without it the shots simply replace each other and the
  // frame reads as a channel change rather than an edit.
  cutFlash() {
    const p = this.panel, k = this.flash;
    p.ctx.globalAlpha = k * 0.5;
    p.px(0, 0, p.w, p.h, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, this.decode));
    p.ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const y = Math.floor((i * 47 + this.t * 90) % (p.h - 6));
      const img = p.ctx.getImageData(0, y, p.w, 4);
      p.ctx.putImageData(img, Math.round((i % 2 ? 1 : -1) * k * 9), y);
    }
  }

  // corner brackets, not a full box — the codec's frames are implied
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

  // the strip beside the portrait: what you are tuned to, that it is live, and
  // how hard the anchor is talking
  dataColumn() {
    const s = this.scr;
    const c = mix(this.accent, PAL.AMBER_HOT, this.decode);
    s.px(DATA.x, DATA.y, DATA.w, DATA.h, PAL.PANEL_LO);
    s.px(DATA.x, DATA.y, DATA.w, 1, shade(c, 0.4));
    s.px(DATA.x, DATA.y + DATA.h - 1, DATA.w, 1, shade(c, 0.4));
    num(s, DATA.x + 3, DATA.y + 5, this.freq, c);

    const on = Math.floor(this.t * 1.6) % 2 === 0;          // REC
    s.px(DATA.x + 4, DATA.y + 16, 4, 4, on ? PAL.DEFENCE : shade(PAL.DEFENCE, 0.3));
    s.px(DATA.x + 11, DATA.y + 17, 9, 2, shade(c, 0.7));

    // which camera the edit is on: three marks, the live one lit
    if (this.shots.length > 1) {
      const names = ['graphic', 'broll', 'wide'];
      const live = this.shots[this.shot];
      names.forEach((n, i) => {
        const on = n === live;
        s.px(DATA.x + 4 + i * 7, DATA.y + 88, 5, 4, on ? c : shade(PAL.PANEL, 1.7));
      });
    }

    // a vertical level meter driven by the same mouth value as the face
    const segs = 11, top = DATA.y + 26;
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

// ── the reader ─────────────────────────────────────────────────────
// Types runs of text into a host element. Runs marked with a plain-language
// reading get a span so the decode can grow the correction inline, in place,
// without retyping the whole bulletin.

const VOWELS = 'aeiouyäöAEIOUYÄÖ';
const PUNCT = ',.;:—、。「」『』・…!?！？';

// how far the mouth opens on the character just typed. Latin script is read
// letter by letter, but Japanese is mora-timed: a kana IS a mouth opening, so
// treating it as one consonant would leave the face nearly shut through a whole
// bulletin.
function amplitudeOf(ch) {
  if (ch === ' ' || ch === '\n' || ch === '　') return 0;
  if (PUNCT.includes(ch)) return 0.1;
  const code = ch.codePointAt(0);
  if (code > 0x2e80) return (code >= 0x3040 && code <= 0x30ff) ? 0.92 : 0.7;
  if (VOWELS.includes(ch)) return 0.95;
  return 0.5;
}

// characters per second, per script. Japanese carries far more meaning per
// character, so the same rate would flash a bulletin past unread.
const CPS = { en: 72, fi: 72, ja: 26 };

export class Reader {
  constructor(onBlip) {
    this.onBlip = onBlip || (() => {});
    this.host = null;
    this.reset();
  }

  reset() {
    this.queue = [];       // {node, text, i}
    this.at = 0;
    this.acc = 0;
    this.amp = 0;
    this.chars = 0;
    this.done = true;
  }

  // lines: array of arrays of {text, plain}
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
          // the spun wording, then (once decoded) the plain reading beside it
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

  // reveal (or hide) the plain readings without retyping anything
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

  // returns the mouth amplitude for this frame
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
