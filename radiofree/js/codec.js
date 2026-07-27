// Radio Free Helsinki — the codec screen and the voice that drives it.
//
// One canvas holds both frames: Toko's portrait on the left (half a Metal Gear
// codec), the bulletin's picture on the right (the half that behaves like a
// feed), and a shared waveform band underneath. Drawing them into ONE canvas
// rather than two means the frames cannot drift apart when the page scales.
//
// The Reader is the other half of the illusion: it types the bulletin one
// character at a time, blips per character, and hands back a mouth amplitude
// every frame — so Toko is lip-synced to the text on screen instead of flapping
// on a timer. Vowels open the mouth, consonants part it, spaces close it.

import { PixelScreen, shade, mix } from './screen.js?v=1';
import { PAL, SECTOR_COLOR } from './palette.js?v=1';
import { Toko } from './toko.js?v=1';
import { drawVisual } from './visuals.js?v=1';

const CW = 248, CH = 124;
const PF = { x: 6, y: 6, w: 96, h: 96 };      // portrait frame
const VF = { x: 110, y: 6, w: 128, h: 96 };   // story frame
const WAVE = { x: 6, y: 108, w: 232, h: 12 }; // the shared waveform band

export class Codec {
  constructor(host) {
    this.scr = new PixelScreen(host, CW, CH);
    this.portrait = new PixelScreen(null, PF.w, PF.h);
    this.panel = new PixelScreen(null, VF.w, VF.h);
    this.toko = new Toko();
    this.t = 0;
    this.signal = 0;          // 0..1, the picture coming up on connect
    this.decode = 0;          // 0..1, eased
    this.mouth = 0;
    this.visual = 'chart';
    this.accent = PAL.GREEN;
    this.wave = new Array(58).fill(0);
  }

  setStory(story) {
    this.visual = story.visual;
    this.accent = SECTOR_COLOR[story.sector] || PAL.GREEN;
  }

  update(dt, mouth, decoded) {
    this.t += dt;
    this.mouth = mouth;
    this.signal += (1 - this.signal) * Math.min(1, dt * 1.6);
    this.decode += ((decoded ? 1 : 0) - this.decode) * Math.min(1, dt * 4.5);
    this.toko.update(dt, mouth, decoded);
    // the waveform scrolls left. The newest sample is the mouth on top of a
    // breathing carrier — with noise alone, an idle channel quantised to 1px
    // and the band read as a broken dotted line instead of an open mic.
    this.wave.shift();
    const carrier = 0.3 + Math.sin(this.t * 3.1) * 0.13 + Math.random() * 0.1;
    this.wave.push(Math.min(1, mouth * 0.82 + carrier));
  }

  draw() {
    const s = this.scr;
    s.clear(PAL.SHELL);
    this.toko.draw(this.portrait, this.signal);
    drawVisual(this.visual, this.panel, this.t, this.decode);

    s.ctx.drawImage(this.portrait.canvas, PF.x, PF.y);
    s.ctx.drawImage(this.panel.canvas, VF.x, VF.y);

    const line = mix(PAL.GREEN_DIM, PAL.AMBER_DIM, this.decode);
    this.frame(PF, line, mix(PAL.GEL_RIM, PAL.AMBER, this.decode));
    this.frame(VF, line, mix(this.accent, PAL.AMBER, this.decode));
    this.waveband(mix(this.accent, PAL.AMBER_HOT, this.decode));

    // the housing's own highlight, so the screen reads as a device
    s.px(0, 0, CW, 1, shade(PAL.SHELL, 1.9));
    s.px(0, CH - 1, CW, 1, shade(PAL.SHELL, 0.4));
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

  waveband(color) {
    const s = this.scr;
    s.px(WAVE.x, WAVE.y, WAVE.w, WAVE.h, PAL.PANEL_LO);
    s.px(WAVE.x, WAVE.y + WAVE.h / 2, WAVE.w, 1, shade(color, 0.35));
    const mid = WAVE.y + WAVE.h / 2;
    this.wave.forEach((v, i) => {
      const x = WAVE.x + 2 + i * 4;
      const h = Math.max(1, Math.round(v * (WAVE.h / 2 - 1)));
      s.px(x, mid - h, 2, h * 2, v > 0.55 ? shade(color, 1.25) : color);
    });
    // a level pip that sits still, so the band has a scale
    s.px(WAVE.x + WAVE.w - 4, WAVE.y + 2, 2, WAVE.h - 4, shade(color, 0.5));
  }

  destroy() { this.scr.destroy(); }
}

// ── the reader ─────────────────────────────────────────────────────
// Types runs of text into a host element. Runs marked with a plain-language
// reading get a span so the decode can grow the correction inline, in place,
// without retyping the whole bulletin.

const VOWELS = 'aeiouyäöAEIOUYÄÖ';

export class Reader {
  constructor(host, onBlip) {
    this.host = host;
    this.onBlip = onBlip || (() => {});
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
  play(lines, decoded) {
    this.host.innerHTML = '';
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
      this.host.appendChild(p);
    }
    this.decoded = decoded;
  }

  // reveal (or hide) the plain readings without retyping anything
  setDecoded(on) {
    this.decoded = on;
    for (const item of this.queue) {
      if (!item.onlyDecoded) continue;
      item.node.hidden = !on;
      if (!on) { item.node.textContent = ''; item.i = 0; }
    }
    for (const p of this.host.querySelectorAll('.spun')) p.classList.toggle('struck', on);
    // anything already passed by the typewriter should show immediately
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
  update(dt, cps = 72) {
    if (this.done) { this.amp *= 0.86; return this.amp; }
    this.acc += dt * cps;
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
      if (ch === ' ' || ch === '\n') this.amp = 0;
      else if (VOWELS.includes(ch)) this.amp = 0.95;
      else if (',.;:—'.includes(ch)) this.amp = 0.1;
      else this.amp = 0.5;
      if (this.chars % 3 === 0 && ch !== ' ') this.onBlip(this.chars);
    }
    if (this.at >= this.queue.length) { this.done = true; this.amp = 0; }
    if (!typed) this.amp *= 0.9;
    return this.amp;
  }
}
