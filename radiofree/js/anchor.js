// Radio Free Helsinki — Toko at the desk.
//
// This is the anchor shot for the multi-scene bulletins: B-roll, then a cut to
// the studio, then back out. It is NOT the teal gel in `toko.js` — that was a
// local invention. Toko is the brand mark: a rounded head with the face
// reversed out of it, magenta ground, paper ink, two colours and nothing else.
// The mask IS the face, and the pink is `TOKO.MAGENTA`.
//
// The geometry is imported, never copied. `toko/js/face.js` holds the one
// measured table (`GEO`), and `BRAND.md` records four wrong answers already
// paid for on the eye alone — a second copy in this folder would drift on the
// fifth. Both that file and `util.js` are already in the service worker's
// precache (the signature badge pulls them), so this costs nothing offline.
//
// Mirrors Photo's interface — goLive/goIdle/update/draw/renderStatic/decoded/
// destroy — so main.js drives it without knowing which kind of shot it holds.

import { drawHead, HEAD } from '../../toko/js/face.js';
import { TOKO } from '../../toko/js/palette.js';
import { glance, drift, blink } from '../../toko/js/util.js';
import { PAL, SECTOR_COLOR } from './palette.js?v=40';
import { shade, mix } from './screen.js?v=40';

// The canvas is sized to the POST, not to a fixed 9:16. A phone post is
// taller than 9:16 and `object-fit: cover` crops the sides off a fixed frame —
// which took the station chrome off both edges and blew the head up past the
// frame. So the buffer matches the box and NOTHING is cropped; the layout
// below is therefore all fractions of W/H, never pixels.
export const ANCHOR_H = 640;              // internal height; width follows the box
const MIN_ASPECT = 0.40, MAX_ASPECT = 0.75;

// The composition, as fractions. A MEDIUM shot: the face carries the frame,
// the shoulders reach the desk, and the desk eats everything below them.
//
// The head silhouette in `face.js` is a head on a SHORT neck — it ends at a
// collar, not at a body. Drawn alone over a desk it reads as a lollipop on a
// stick, so the torso below is drawn here, in the same magenta, before the
// head goes on top of it. The brand owns the head; the shot owns the body.
const L = {
  desk: 0.668,          // the desk edge, as a fraction of H
  plate: 0.760,         // the nameplate strip on the desk front
  headW: 0.430,         // of W
  headWCap: 0.250,      // ...but never taller than this fraction of H allows
  headY: 0.205,         // of H
  wall: { x: 0.045, y: 0.052, w: 0.910, h: 0.455 },
  torsoTop: 0.485,      // of H — behind the collar
  collar: 0.136, trap: 0.295, delt: 0.406, shoulder: 0.428,   // of W
  trapY: 0.026, deltY: 0.108, shY: 0.150,                     // of H
};

const rnd = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export class Anchor {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector || {};
    this.seed = seed;
    this.decoded = false;
    this.live = false;
    this.t = seed * 1.37;        // every anchor shot breathes out of phase
    this.mouth = 0;
    this.mouthSmooth = 0;
    this.extAt = -99;   // last time a real reader amplitude arrived
    this.accent = SECTOR_COLOR[story && story.sector] || PAL.GREEN;

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap anchor-wrap';

    const cv = document.createElement('canvas');
    cv.className = 'photo drawn anchor-cv';
    // the bulletin text is the channel a screen reader follows; the studio is
    // decoration on top of it
    cv.setAttribute('aria-hidden', 'true');

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
    this.fit();
  }

  // Match the buffer to the box the post actually gives us. Checked on every
  // paint because it is one clientWidth read and the alternative — a fixed
  // 9:16 buffer cropped by object-fit — cost the station chrome off both
  // edges on any phone taller than 16:9, which is most of them.
  fit() {
    const box = this.wrap.getBoundingClientRect();
    const a = box.height > 0
      ? Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, box.width / box.height))
      : 0.5625;
    const w = Math.round(ANCHOR_H * a);
    if (this.cv.width === w && this.cv.height === ANCHOR_H) return false;
    this.cv.width = w;
    this.cv.height = ANCHOR_H;
    this.ctx.imageSmoothingEnabled = false;
    this.W = w;
    this.H = ANCHOR_H;
    return true;
  }

  goLive() { this.live = true; this.wrap.classList.add('live'); }
  goIdle() { this.live = false; this.wrap.classList.remove('live'); }

  // main.js hands the reader's per-character mouth amplitude straight through.
  // Toko's mouth is a stroked arc, so "talking" is its radius breathing — the
  // amplitude is smoothed because a raw per-character step chatters like a
  // puppet at 60fps.
  //
  // BUT THE TYPEWRITER IS OFF on this build — the copy is set, not typed
  // (owner's call), so `reader.finish()` runs immediately and `update()` only
  // ever returns a decaying zero. main.js says so in a comment and it is
  // right: with nothing else, the face sits dead. Text arriving instantly does
  // not mean Toko stopped reading it aloud, so when no external amplitude has
  // arrived recently he drives his own mouth off `speech()` below. If the
  // typewriter ever comes back, the real per-character value wins on arrival.
  update(dt, mouth = 0) {
    this.t += dt;
    this.mouth = mouth;
    if (mouth > 0.001) this.extAt = this.t;
    const external = this.t - this.extAt < 0.6;
    const target = external ? mouth : (this.live ? this.speech(this.t) : 0);
    const k = Math.min(1, dt * 14);
    this.mouthSmooth += (target - this.mouthSmooth) * k;
  }

  // A read-aloud envelope: syllables inside phrases, and a breath between
  // them. A plain sine at one rate reads as chewing — the mouth has to stop
  // sometimes, and the openings have to be uneven, or it is a puppet.
  speech(t) {
    const PHRASE = 3.75;
    const u = (t % PHRASE) / PHRASE;
    if (u > 0.86) return 0;                     // the breath between phrases
    const SYL = 5.6;                            // syllables per second
    const n = Math.floor(t * SYL);
    const f = t * SYL - n;
    const open = Math.sin(f * Math.PI);
    return open * open * (0.45 + rnd(n) * 0.55);
  }

  draw() { this.paint(); }
  renderStatic() { this.paint(); }

  paint() {
    this.fit();
    const c = this.ctx, t = this.t, W = this.W, H = this.H;
    const hot = this.decoded;
    // Amber has exactly one job on this dial, and DECODE is it — so the whole
    // studio's furniture swaps to it rather than a badge lighting up.
    const key = hot ? PAL.AMBER : this.accent;
    const dim = hot ? PAL.AMBER_DIM : shade(this.accent, 0.55);
    const s = W / 360;                 // stroke/type scale, off the design width

    this.backWall(c, W, H, dim, hot);
    this.videoWall(c, t, W, H, key, dim, s);
    this.subject(c, t, W, H);
    this.desk(c, W, H, key, dim, s);
    this.furniture(c, t, W, H, key, hot, s);
    this.grain(c, W, H);
    if (hot) this.tear(c, t, W, H);
  }

  // ── the set ────────────────────────────────────────────────────────────
  backWall(c, W, H, dim, hot) {
    const deskY = H * L.desk;
    const g = c.createLinearGradient(0, 0, 0, deskY);
    g.addColorStop(0, hot ? '#120c04' : '#05100c');
    g.addColorStop(1, hot ? '#1c1206' : '#0a1a14');
    c.fillStyle = g;
    c.fillRect(0, 0, W, deskY);

    // a graticule on the studio wall, well under the subject — the same signal
    // furniture the codec frames carry, at set scale
    c.globalAlpha = 0.10;
    c.fillStyle = dim;
    for (let x = 0; x < W; x += 24) c.fillRect(x, 0, 1, deskY);
    for (let y = 0; y < deskY; y += 32) c.fillRect(0, y, W, 1);
    c.globalAlpha = 1;
  }

  // The screen behind the anchor. A skyline rather than a logo: it says the
  // bulletin is about somewhere, and it keeps the shot from being a portrait
  // on a flat.
  videoWall(c, t, W, H, key, dim, s) {
    const x = W * L.wall.x, y = H * L.wall.y;
    const w = W * L.wall.w, h = H * L.wall.h;
    c.fillStyle = '#03110c';
    c.fillRect(x, y, w, h);

    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();

    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mix('#03110c', dim, 0.12));
    g.addColorStop(1, '#03110c');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);

    // The skyline: block sizes off a hash. (i * 41) % 100 looks like scatter
    // and draws a straight diagonal — that trap is already paid for.
    const base = y + h * 0.87;
    const step = w / 24;
    const body = shade(dim, 0.55);
    const lit = mix(body, key, 0.45);
    for (let i = 0; i < 26; i++) {
      const bw = step * (0.5 + rnd(i * 3.1 + this.seed) * 1.1);
      const bh = h * (0.18 + rnd(i * 7.7 + this.seed) * 0.46);
      const bx = x - step + i * step;
      c.fillStyle = body;
      c.fillRect(bx, base - bh, bw, bh);
      c.fillStyle = lit;                      // windows: phosphor, never warm
      for (let wy = base - bh + 5 * s; wy < base - 4 * s; wy += 7 * s) {
        for (let wx = bx + 2 * s; wx < bx + bw - 2 * s; wx += 5 * s) {
          if (rnd(wx * 0.7 + wy * 1.3 + this.seed) < 0.34) c.fillRect(wx, wy, 2 * s, 2 * s);
        }
      }
    }
    // the dome, so the city is Helsinki and not any city
    const dr = w * 0.072, dcx = x + w * 0.30, dcy = base - h * 0.34;
    c.fillStyle = shade(dim, 0.7);
    c.beginPath();
    c.arc(dcx, dcy, dr, Math.PI, Math.PI * 2);
    c.fill();
    c.fillRect(dcx - dr, dcy, dr * 2, dr * 1.1);
    c.fillRect(dcx - 2 * s, dcy - dr * 1.6, 4 * s, dr * 0.7);

    c.fillStyle = shade(dim, 0.9);
    c.fillRect(x, base, w, 2 * s);

    // the ticker: dashes crawling, the one thing on the wall that moves
    const ty = y + h - 20 * s;
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(x, ty, w, 14 * s);
    c.fillStyle = key;
    c.globalAlpha = 0.55;
    const gap = 20 * s, off = (t * 26 * s) % gap;
    for (let dx = -gap; dx < w + gap; dx += gap) c.fillRect(x + dx - off, ty + 6 * s, 11 * s, 2 * s);
    c.globalAlpha = 1;
    c.restore();

    c.strokeStyle = dim;
    c.lineWidth = 2 * s;
    c.strokeRect(x + s, y + s, w - 2 * s, h - 2 * s);
  }

  // ── the person ─────────────────────────────────────────────────────────
  subject(c, t, W, H) {
    // A very slow breath under everything. Nothing in a Toko mark is ever
    // perfectly still, and nothing in one is ever quick either.
    const sway = drift(t, { period: 11 }) * W * 0.008;
    const bob = drift(t, { period: 7, phase: 0.3 }) * H * 0.003;

    // the head is capped against BOTH axes, so a narrow post does not put the
    // face through the ceiling and a wide one does not shrink it to a pea
    const hw = Math.min(W * L.headW, H * L.headWCap * (HEAD.w / HEAD.h) * 1.32);
    const hx = (W - hw) / 2, hy = H * L.headY;

    // Eyes shut and smiling at rest — that closed arch IS the logo. They open
    // while he is reading, because that is the one moment he is looking at
    // somebody; between bulletins he goes back to `glance`.
    const speaking = this.mouthSmooth > 0.03;
    const lid = blink(t, { every: 8.5, offset: this.seed * 0.9 });
    const open = speaking ? 1 : glance(t, { every: 11, offset: 0.7 });

    // the shadow the subject throws on the wall — the only thing keeping the
    // silhouette off the graticule
    const ox = W * 0.033, oy = H * 0.016;
    c.save();
    c.globalAlpha = 0.35;
    this.torso(c, W, H, sway + ox, bob + oy, '#020a07');
    drawHead(c, hx + sway + ox, hy + bob + oy, hw, {
      ground: '#020a07', ink: '#020a07', face: false,
    });
    c.restore();

    this.torso(c, W, H, sway, bob, TOKO.MAGENTA);
    drawHead(c, hx + sway, hy + bob, hw, {
      ground: TOKO.MAGENTA,
      ink: TOKO.PAPER,
      faceOpts: {
        open,
        squash: 1 - lid * 0.94,
        // the mouth radius breathing. 0.09 at full amplitude reads as speech
        // at this size; the resting drift keeps it alive between characters.
        grin: 1 + this.mouthSmooth * 0.09 + drift(t, { period: 6 }) * 0.012,
      },
    });
  }

  // Shoulders. Not part of the brand mark — `face.js` stops at a collar — so
  // they are drawn here in the same magenta and slid under the head, and they
  // are WIDE: a narrow torso puts the silhouette back on a stem.
  //
  // A shoulder is a short slope and then a corner, not an arc. Swept as one
  // curve from collar to hem it comes out a bell and the figure reads as a
  // skittle — so: trapezius out, deltoid corner, then straight down.
  torso(c, W, H, dx, dy, color) {
    const cx = W / 2 + dx, top = H * L.torsoTop + dy;
    const a = W * L.collar, b = W * L.trap, d = W * L.delt, e = W * L.shoulder;
    const y1 = top + H * L.trapY, y2 = top + H * L.deltY, y3 = top + H * L.shY;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(cx - a, top);
    c.quadraticCurveTo(cx - b * 0.7, y1, cx - b, y2);
    c.quadraticCurveTo(cx - d, y3 - H * 0.02, cx - e, y3);
    c.lineTo(cx - e, H);
    c.lineTo(cx + e, H);
    c.lineTo(cx + e, y3);
    c.quadraticCurveTo(cx + d, y3 - H * 0.02, cx + b, y2);
    c.quadraticCurveTo(cx + b * 0.7, y1, cx + a, top);
    c.closePath();
    c.fill();
  }

  // ── the desk ───────────────────────────────────────────────────────────
  desk(c, W, H, key, dim, s) {
    const deskY = H * L.desk;
    const g = c.createLinearGradient(0, deskY, 0, H);
    g.addColorStop(0, mix('#0a1c16', dim, 0.14));
    g.addColorStop(1, '#04100c');
    c.fillStyle = g;
    c.fillRect(0, deskY, W, H - deskY);

    c.fillStyle = key;
    c.fillRect(0, deskY, W, 2 * s);
    c.globalAlpha = 0.4;
    c.fillRect(0, deskY + 8 * s, W, s);
    c.globalAlpha = 1;

    // The desk front carries the station, the way a real one carries the
    // programme name — otherwise the band between the desk edge and the lower
    // third is dead frame, and dead frame is what makes a shot look unfinished.
    const py = H * L.plate, ph = 34 * s;
    const px = W * 0.10, pw = W * 0.80;
    c.fillStyle = 'rgba(3,14,11,.72)';
    c.fillRect(px, py, pw, ph);
    c.fillStyle = key;
    c.fillRect(px, py, 3 * s, ph);
    c.globalAlpha = 0.45;
    c.fillRect(px, py + ph - s, pw, s);
    c.globalAlpha = 1;
    c.font = `bold ${Math.round(13 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText('RADIO FREE HELSINKI', px + 11 * s, py + ph * 0.38);
    c.globalAlpha = 0.6;
    c.font = `${Math.round(10 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.fillText(`${this.sector.freq || '--.--'}  ${this.sector.call || ''}`.trim(),
      px + 11 * s, py + ph * 0.74);
    c.globalAlpha = 1;

    // the laptop lighting the face from below belongs to the flat, not the
    // studio — that stays in the codec shot. Here it is a desk monitor's glow,
    // and it is phosphor, so it never competes with the decode.
    c.save();
    c.globalAlpha = 0.16;
    const gl = c.createRadialGradient(W / 2, deskY, 4, W / 2, deskY, W * 0.36);
    gl.addColorStop(0, key);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gl;
    c.fillRect(0, deskY - H * 0.14, W, H * 0.2);
    c.restore();
  }

  // REC, the frequency, the corner ticks — the receiver's own chrome, so the
  // shot arrives through the set rather than sitting on the page.
  furniture(c, t, W, H, key, hot, s) {
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = `bold ${Math.round(13 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    if ((t % 1.6) < 1.0) {
      c.fillStyle = hot ? PAL.AMBER : PAL.DEFENCE;
      c.beginPath();
      c.arc(28 * s, 26 * s, 5 * s, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = key;
    c.fillText(hot ? 'DECODE' : 'LIVE', 40 * s, 27 * s);

    c.textAlign = 'right';
    c.fillText(this.sector.freq || '--.--', W - 20 * s, 27 * s);
    c.globalAlpha = 0.6;
    c.font = `${Math.round(11 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.fillText(this.sector.call || 'RFH', W - 20 * s, 44 * s);
    c.globalAlpha = 1;
    c.textAlign = 'left';

    c.fillStyle = key;
    c.globalAlpha = 0.5;
    for (const [cx, sx] of [[10 * s, 1], [W - 10 * s, -1]]) {
      c.fillRect(cx, 10 * s, 14 * s * sx, 2 * s);
      c.fillRect(cx, 10 * s, 2 * s * sx, 14 * s);
    }
    c.globalAlpha = 1;
  }

  // Video grain must NOT come from bayer(): the low cells are the same cells
  // every frame, so it sits still and reads as a perforated screen.
  grain(c, W, H) {
    c.globalAlpha = 0.05;
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 240; i++) {
      c.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2, 1);
    }
    c.globalAlpha = 1;
  }

  // the decode tear — bands of the picture displaced sideways, the same move
  // the codec portrait makes when the spin shows
  tear(c, t, W, H) {
    for (let i = 0; i < 5; i++) {
      const by = ((t * 60 + i * 137) % (H + 40)) - 20;
      const bh = 6 + ((i * 5) % 9);
      const dx = (rnd(Math.floor(t * 6) + i) - 0.5) * 18;
      if (by < 0 || by + bh > H) continue;
      c.drawImage(this.cv, 0, by, W, bh, dx, by, W, bh);
    }
  }

  destroy() { this.wrap.remove(); }
}

// so a harness can lay out a preview without duplicating the fractions
export const ANCHOR_LAYOUT = L;
