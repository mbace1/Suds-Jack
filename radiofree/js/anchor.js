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
// Mirrors Photo's interface — goLive/goIdle/update/draw/renderStatic/
// destroy — so main.js drives it without knowing which kind of shot it holds.

import { drawHead, HEAD } from '../../toko/js/face.js';
import { TOKO } from '../../toko/js/palette.js';
import { glance, drift, blink } from '../../toko/js/util.js';
import { PAL, SECTOR_COLOR } from './palette.js?v=43';
import { PixelScreen, shade, mix } from './screen.js?v=43';
import { drawPlate, PLATE_W, PLATE_H } from './plates.js?v=43';
import { brollList } from './wire.js?v=43';

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
//
// EVERYTHING IS PITCHED HIGH. The post's copy grew when the two-line clamp came
// off it, and the caption now starts around 0.34 H — so a face composed on the
// middle of the frame is a face with its chin behind a paragraph. The whole
// booth sits in the top third: head 0.10–0.32, desk at 0.56, and the furniture
// below it is drawn for the two hundred pixels of it anybody ever sees.
const L = {
  desk: 0.560,          // the desk edge, as a fraction of H
  plate: 0.652,         // the nameplate strip on the desk front
  headW: 0.395,         // of W
  headWCap: 0.230,      // ...but never taller than this fraction of H allows
  headY: 0.098,         // of H
  wall: { x: 0.045, y: 0.030, w: 0.910, h: 0.400 },
  torsoTop: 0.385,      // of H — behind the collar
  collar: 0.136, trap: 0.295, delt: 0.406, shoulder: 0.428,   // of W
  trapY: 0.026, deltY: 0.108, shY: 0.150,                     // of H
};

const rnd = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ── the sets ──────────────────────────────────────────────────────────────
//
// Toko does not read every bulletin from the same desk. Two thirds of them are
// STAND-UPS: he is out where the story is, with the location itself behind him
// — the same plate the footage beat cuts to, drawn as a backdrop and pushed
// down into the dark so a magenta head reads against it.
//
// It costs nothing extra to draw, because the plates already exist and already
// cache their static half. What it buys is the thing a desk cannot: the studio
// says a bulletin was WRITTEN, and a stand-up says somebody went.
//
// The choice is seeded off the post index, never Math.random(): scrolling back
// to a bulletin has to find it in the same place, on the same night.
const STANDUP = (seed) => (seed % 3) !== 0;

// A stand-up is handheld and a desk is on a tripod, and that difference is
// most of what tells them apart before you have read a word. Two slow
// out-of-phase sines rather than noise — an operator's arms drift, they do not
// jitter, and jitter at 60fps reads as a fault in the video rather than a
// person holding a camera.
function handheld(t) {
  return {
    x: (Math.sin(t * 0.83) + Math.sin(t * 1.97 + 1.1) * 0.5) * 0.5,
    y: (Math.sin(t * 0.61 + 2.2) + Math.sin(t * 1.43) * 0.4) * 0.5,
    r: Math.sin(t * 0.47 + 0.6) * 0.0022,
  };
}

export class Anchor {
  constructor(host, story, sector, seed = 0) {
    this.story = story;
    this.sector = sector || {};
    this.seed = seed;
    this.live = false;
    this.t = seed * 1.37;        // every anchor shot breathes out of phase
    this.mouth = 0;
    this.mouthSmooth = 0;
    this.extAt = -99;   // last time a real reader amplitude arrived
    this.accent = SECTOR_COLOR[story && story.sector] || PAL.GREEN;
    // 'booth' is the flat; 'street' is a stand-up on the story's own location
    this.set = STANDUP(seed) ? 'street' : 'booth';
    // the backdrop is the plate, drawn at its own resolution and blown up —
    // the same picture the footage beat shows, so a cut to the reporter lands
    // in a place the viewer was standing in two seconds ago
    this.bg = this.set === 'street' ? new PixelScreen(null, PLATE_W, PLATE_H) : null;

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
    const hot = false;                 // DECODE is gone; the set has one state
    const key = this.accent;
    const dim = shade(this.accent, 0.55);
    const s = W / 360;                 // stroke/type scale, off the design width

    if (this.set === 'street') {
      // the whole frame moves, background included — a camera shake that only
      // shakes the subject is a subject with a loose head
      const hh = handheld(t);
      c.save();
      c.translate(W * 0.5 + hh.x * W * 0.012, H * 0.5 + hh.y * H * 0.008);
      c.rotate(hh.r);
      c.translate(-W * 0.5, -H * 0.5);
      this.location(c, t, W, H, hot);
      this.subject(c, t, W, H, { standup: true });
      c.restore();
      this.strap(c, W, H, key, hot, s);
    } else {
      this.backWall(c, W, H, dim, hot);
      this.videoWall(c, t, W, H, key, dim, s);
      this.subject(c, t, W, H);
      this.desk(c, W, H, key, dim, s);
    }
    this.furniture(c, t, W, H, key, hot, s);
    this.grain(c, W, H);
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

  // ── on location ────────────────────────────────────────────────────────
  // The plate, blown up and pushed down. Two things are deliberate: the
  // backdrop is drawn a little OVER the frame and offset, so it reads as a
  // fragment of a place rather than as a poster of the same picture the
  // footage beat just showed; and it is darkened hard, because a magenta head
  // in front of a lit skyline is two subjects and neither wins.
  location(c, t, W, H, hot) {
    // A story naming several shots gives the stand-up a DIFFERENT one from the
    // shot the footage beat leads on — the reporter is somewhere else in the
    // same story, which is the whole reason to send him.
    const shots = brollList(this.story && this.story.broll);
    drawPlate(shots[shots.length > 1 ? 1 : 0], this.bg, t, hot ? 1 : 0);
    const over = 1.16;                       // a push-in, so it is not the same shot
    const bw = W * over, bh = H * over;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.bg.canvas,
      (W - bw) / 2 + Math.sin(t * 0.21) * W * 0.01,
      (H - bh) / 2, bw, bh);

    // night grade: dark at the bottom where the subject stands, open at the top
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hot ? 'rgba(20,12,2,.30)' : 'rgba(2,10,8,.30)');
    g.addColorStop(1, hot ? 'rgba(14,8,2,.86)' : 'rgba(1,6,5,.86)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  // The lower third a stand-up carries instead of a desk: who is talking and
  // where they are standing. It sits at 0.46 H on purpose — the post's own
  // copy covers the bottom 45% of the frame, so anything lower is furniture
  // nobody will ever see.
  strap(c, W, H, key, hot, s) {
    // 0.300, not 0.455: the post's own kicker block starts at 0.34 now that the
    // copy is unclamped, and the two collided. And the strap does NOT repeat the dateline — the kicker under
    // it already carries that, and a name printed twice in one frame reads as
    // a template rather than a broadcast.
    const y = H * 0.300, h = 40 * s, x = W * 0.06;
    c.fillStyle = 'rgba(2,10,8,.80)';
    c.fillRect(x, y, W * 0.50, h);
    c.fillStyle = key;
    c.fillRect(x, y, 4 * s, h);
    c.globalAlpha = 0.45;
    c.fillRect(x, y + h - s, W * 0.50, s);
    c.globalAlpha = 1;

    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = `bold ${Math.round(15 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.fillStyle = key;
    c.fillText('TOKO', x + 13 * s, y + h * 0.34);
    c.font = `${Math.round(10 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.globalAlpha = 0.75;
    // the dateline, which is the story's own slug — a stand-up that does not
    // say where it is standing is a green screen
    c.fillText(hot ? 'DECODE' : 'REPORTING', x + 13 * s, y + h * 0.72);
    c.globalAlpha = 1;
  }

  // ── the person ─────────────────────────────────────────────────────────
  subject(c, t, W, H, opt = {}) {
    // A very slow breath under everything. Nothing in a Toko mark is ever
    // perfectly still, and nothing in one is ever quick either.
    const sway = drift(t, { period: 11 }) * W * 0.008;
    const bob = drift(t, { period: 7, phase: 0.3 }) * H * 0.003;

    // the head is capped against BOTH axes, so a narrow post does not put the
    // face through the ceiling and a wide one does not shrink it to a pea
    // A stand-up is a closer, off-centre shot: the reporter stands to one side
    // with the place behind them, the way anybody framing this actually would.
    // A stand-up is a WIDER shot, not a closer one. At 1.10 he filled the
    // frame like a logo pasted on a photograph — a reporter on location is
    // head-and-shoulders in a corner with the place around them, and the place
    // is the reason the shot exists.
    const K = opt.standup ? 0.74 : 1;
    const hw = Math.min(W * L.headW, H * L.headWCap * (HEAD.w / HEAD.h) * 1.32) * K;
    const side = opt.standup ? (this.seed % 2 ? 0.46 : -0.44) : 0;
    const hx = (W - hw) / 2 + W * side * 0.5;
    const hy = H * (opt.standup ? L.headY + 0.052 : L.headY);

    // Eyes shut and smiling at rest — that closed arch IS the logo. They open
    // while he is reading, because that is the one moment he is looking at
    // somebody; between bulletins he goes back to `glance`.
    const speaking = this.mouthSmooth > 0.03;
    const lid = blink(t, { every: 8.5, offset: this.seed * 0.9 });
    const open = speaking ? 1 : glance(t, { every: 11, offset: 0.7 });

    // the shadow the subject throws on the wall — the only thing keeping the
    // silhouette off the graticule
    const ox = W * 0.033, oy = H * 0.016;
    const tdx = W * side * 0.5;
    c.save();
    c.globalAlpha = 0.35;
    this.torso(c, W, H, sway + ox + tdx, bob + oy, '#020a07', K);
    drawHead(c, hx + sway + ox, hy + bob + oy, hw, {
      ground: '#020a07', ink: '#020a07', face: false,
    });
    c.restore();

    this.torso(c, W, H, sway + tdx, bob, TOKO.MAGENTA, K);
    // THE RIM. A flat magenta shape on a dark photograph is a sticker; one
    // bright edge on the side the light is coming from is a person standing in
    // the scene. It is two draws — the silhouette again, one pixel over,
    // clipped to a thin strip — and it is most of the difference.
    if (opt.standup) {
      const lit = side > 0 ? -1 : 1;              // light from the open side
      c.save();
      c.beginPath();
      c.rect(hx + sway + (lit < 0 ? -3 : hw - 3) * 1, 0, 6, H);
      c.clip();
      c.globalAlpha = 0.85;
      this.torso(c, W, H, sway + tdx + lit * 2.5, bob, '#ffd6ea', K);
      drawHead(c, hx + sway + lit * 2.5, hy + bob, hw, {
        ground: '#ffd6ea', ink: '#ffd6ea', face: false,
      });
      c.restore();
      this.mic(c, W, H, hx + sway + hw / 2, hy + bob, hw);
    }
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
  torso(c, W, H, dx, dy, color, k = 1) {
    const cx = W / 2 + dx, top = H * (L.torsoTop + (k > 1 ? 0.035 : 0)) + dy;
    const a = W * L.collar * k, b = W * L.trap * k, d = W * L.delt * k, e = W * L.shoulder * k;
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

  // The stick mic. It lives BELOW-RIGHT of the mouth and never over it — a
  // capsule parked on the mouth reads as a tongue and kills the lip-sync, and
  // that lesson was paid for once already in the codec portrait.
  mic(c, W, H, cx, headTop, hw) {
    const x = cx + hw * 0.54, y = headTop + hw * 0.66;
    c.save();
    c.translate(x, y);
    c.rotate(-0.42);
    c.fillStyle = '#0d1512';                       // the shaft
    c.fillRect(-hw * 0.035, 0, hw * 0.07, hw * 0.72);
    c.fillStyle = '#1b2622';                       // the capsule
    c.beginPath();
    c.arc(0, 0, hw * 0.125, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = shade(this.accent, 0.5);         // the flag, with the station on it
    c.fillRect(-hw * 0.105, hw * 0.16, hw * 0.21, hw * 0.20);
    c.restore();
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

  // The corner ticks, and nothing else. REC, the timecode and the camera
  // number used to be drawn here too — they are the package's DOM HUD now
  // (`pkg-hud`), because the photographs cannot draw furniture and three
  // implementations of one corner had already started to disagree. Two REC
  // dots in one frame is worse than none.
  furniture(c, t, W, H, key, hot, s) {
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


  destroy() {
    if (this.bg) this.bg.destroy();
    this.wrap.remove();
  }
}

// so a harness can lay out a preview without duplicating the fractions
export const ANCHOR_LAYOUT = L;
