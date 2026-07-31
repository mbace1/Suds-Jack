// Radio Free Helsinki — the station graphic.
//
// Every bulletin already names one in `story.visual`, the validator already
// rejects a wire naming one this build cannot draw, and `visuals.js` already
// draws thirteen of them. Until now not one reached a screen: `drawVisual` was
// called only from `codec.js`, and the only codec post left is the sign-off.
//
// That cost DECODE half of what it teaches. The panels decode TOO — the
// truncated bar chart re-bases to zero and the mountain becomes a bump, the
// valuation tower goes hollow but for the 6% actually sold, the packed
// auditorium empties to the four people on the stage, nine hundred accounts
// collapse into a fan spoked to the one node that made them. With the graphic
// off screen, pressing DECODE only ever struck the words out.
//
// So the graphic is the third shot, and it is the one DECODE cuts home to.
//
// The panel is drawn at its own 128×152 and blitted at an INTEGER scale into
// the card. Fitting it to the frame instead would resample pixel art to
// fractional cells, which is the one thing this whole renderer exists to
// avoid; the card is what makes up the difference in size.

import { PixelScreen, mix, shade } from './screen.js?v=33';
import { drawVisual, PANEL_W, PANEL_H } from './visuals.js?v=33';
import { PAL, SECTOR_COLOR } from './palette.js?v=33';

export const GRAPHIC_H = 640;
const MIN_ASPECT = 0.40, MAX_ASPECT = 0.75;

// Fractions of W/H, same discipline as the anchor — nothing here is a pixel.
//
// TWO LAYOUTS, and the second one is not a nicety. Decoded, the lower third
// grows into a card that eats most of the frame, and the first cut of this
// scene put the panel underneath it: DECODE cut home to a graphic you could
// not see. So decoded, the card goes COMPACT — the panel moves to the top band
// and takes whatever integer scale still fits there. It is a reference you
// glance at while you read the plain readings, not the hero of the frame.
const FULL = {
  strip: 0.055, stripH: 0.052,     // the title bar
  panelY: 0.175,                   // where the bezel starts
  band: 0.56,                      // how much height the panel may claim
  foot: 0.905, rule: true,
};
const COMPACT = {
  strip: 0.020, stripH: 0.042,
  panelY: 0.098,
  band: 0.34,
  foot: 0, rule: false,
};

export class Graphic {
  constructor(host, story, sector, seed = 0) {
    this.story = story || {};
    this.sector = sector || {};
    this.seed = seed;
    this.live = false;
    this._decoded = false;
    this.decodeK = 0;               // 0..1, animated — the panels mix on it
    this.t = seed * 0.83;
    this.accent = SECTOR_COLOR[this.story.sector] || PAL.GREEN;

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap graphic-wrap';

    const cv = document.createElement('canvas');
    cv.className = 'photo graphic-cv';
    cv.setAttribute('aria-hidden', 'true');   // the bulletin text is the channel

    const grade = document.createElement('div');
    grade.className = 'photo-grade';
    const sweep = document.createElement('div');
    sweep.className = 'photo-sweep';

    wrap.append(cv, grade, sweep);
    host.appendChild(wrap);

    this.wrap = wrap;
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    // the panel keeps its own detached buffer, the same way the codec screen
    // composes its two frames — one canvas cannot be two resolutions
    this.panel = new PixelScreen(null, PANEL_W, PANEL_H);
    this.fit();
  }

  get decoded() { return this._decoded; }
  set decoded(v) { this._decoded = !!v; }

  fit() {
    const box = this.wrap.getBoundingClientRect();
    const a = box.height > 0
      ? Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, box.width / box.height))
      : 0.5625;
    const w = Math.round(GRAPHIC_H * a);
    if (this.cv.width === w && this.cv.height === GRAPHIC_H) return false;
    this.cv.width = w;
    this.cv.height = GRAPHIC_H;
    this.ctx.imageSmoothingEnabled = false;
    this.W = w;
    this.H = GRAPHIC_H;
    return true;
  }

  goLive() { this.live = true; this.wrap.classList.add('live'); }
  goIdle() { this.live = false; this.wrap.classList.remove('live'); }

  update(dt) {
    this.t += dt;
    // eased rather than snapped: the panels read `decode` as a 0..1 mix, so a
    // step would flip green to amber in one frame and lose the re-basing
    const want = this._decoded ? 1 : 0;
    this.decodeK += (want - this.decodeK) * Math.min(1, dt * 6);
    if (Math.abs(want - this.decodeK) < 0.002) this.decodeK = want;
  }

  draw() { this.paint(); }
  renderStatic() { this.paint(); }

  paint() {
    this.fit();
    const c = this.ctx, W = this.W, H = this.H, d = this.decodeK;
    const s = W / 360;
    const L = d > 0.5 ? COMPACT : FULL;
    const key = mix(this.accent, PAL.AMBER, d);
    const dim = mix(shade(this.accent, 0.55), PAL.AMBER_DIM, d);

    // ── the card ────────────────────────────────────────────────────
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix('#04100c', '#150e04', d));
    g.addColorStop(1, mix('#020806', '#0c0803', d));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    c.globalAlpha = 0.09;
    c.fillStyle = dim;
    for (let x = 0; x < W; x += 24) c.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 32) c.fillRect(0, y, W, 1);
    c.globalAlpha = 1;

    // ── the panel, at an integer scale ──────────────────────────────
    this.panel.clear(PAL.INK);
    drawVisual(this.story.visual, this.panel, this.t, d);

    const scale = Math.max(1, Math.min(
      Math.floor((W * 0.86) / PANEL_W),
      Math.floor((H * L.band) / PANEL_H)));
    const pw = PANEL_W * scale, ph = PANEL_H * scale;
    const px = Math.round((W - pw) / 2), py = Math.round(H * L.panelY);

    // the bezel: the graphic arrives inside the set, not printed on the page
    const b = Math.max(2, Math.round(3 * s));
    c.fillStyle = dim;
    c.fillRect(px - b, py - b, pw + b * 2, ph + b * 2);
    c.fillStyle = mix('#020806', PAL.AMBER_DIM, d * 0.25);
    c.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    c.drawImage(this.panel.canvas, px, py, pw, ph);

    // corner ticks on the bezel, bright
    c.fillStyle = key;
    const tk = Math.round(12 * s);
    for (const [cx, cy, sx, sy] of [
      [px - b, py - b, 1, 1], [px + pw + b, py - b, -1, 1],
      [px - b, py + ph + b, 1, -1], [px + pw + b, py + ph + b, -1, -1],
    ]) {
      c.fillRect(cx, cy - (sy < 0 ? b : 0), tk * sx, b * (sy < 0 ? 1 : 1));
      c.fillRect(cx - (sx < 0 ? b : 0), cy, b, tk * sy);
    }

    // ── the furniture ───────────────────────────────────────────────
    this.strip(c, W, H, s, key, d, L);
    this.foot(c, W, H, s, key, px, pw, py, ph, L);

    // Video grain must NOT come from bayer(): the low cells are the same cells
    // every frame, so it sits still and reads as a perforated screen.
    c.globalAlpha = 0.045;
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
      c.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2, 1);
    }
    c.globalAlpha = 1;
  }

  strip(c, W, H, s, key, d, L) {
    const y = H * L.strip, h = H * L.stripH;
    const x = W * 0.07, w = W * 0.86;
    c.fillStyle = 'rgba(2,10,8,.7)';
    c.fillRect(x, y, w, h);
    c.fillStyle = key;
    c.fillRect(x, y, Math.max(2, 3 * s), h);
    c.globalAlpha = 0.35;
    c.fillRect(x, y + h - 1, w, 1);
    c.globalAlpha = 1;

    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = `bold ${Math.round(12 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.fillStyle = key;
    // Amber has exactly one job and this is it — the word only changes when
    // the listener has asked what the picture was doing.
    c.fillText(d > 0.5 ? 'DECODE' : 'STATION GRAPHIC', x + 12 * s, y + h * 0.5);

    c.textAlign = 'right';
    c.fillText(this.sector.freq || '--.--', x + w - 12 * s, y + h * 0.5);
    c.textAlign = 'left';
  }

  foot(c, W, H, s, key, px, pw, py, ph, L) {
    if (!L.rule) return;
    // a scale rule under the bezel: it says the panel is a measurement, which
    // is the whole joke — the measurement is what the wording is hiding behind
    const ry = py + ph + Math.round(18 * s);
    c.fillStyle = key;
    c.globalAlpha = 0.5;
    c.fillRect(px, ry, pw, Math.max(1, Math.round(s)));
    for (let i = 0; i <= 4; i++) {
      c.fillRect(px + (pw - 1) * (i / 4), ry - 4 * s, Math.max(1, Math.round(s)), 4 * s);
    }
    c.globalAlpha = 1;

    c.font = `${Math.round(10 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.textAlign = 'center';
    c.globalAlpha = 0.55;
    c.fillText(`RADIO FREE HELSINKI · ${this.sector.call || ''}`.trim(),
      W / 2, H * L.foot);
    c.globalAlpha = 1;
    c.textAlign = 'left';
  }

  destroy() {
    this.panel.destroy();
    this.wrap.remove();
  }
}
