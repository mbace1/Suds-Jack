// Radio Free Helsinki — Toko at the desk.
//
// This is the anchor shot for the multi-scene bulletins: B-roll, then a cut to
// the studio, then back out. Toko is his FACE — the owner's master, traced
// (`toko/js/master.js`), white on magenta, as a badge at the desk; in a film, the same badge in 3D
// (`js/toko3d.js`). The bodies this shot gave him before (the magenta bust,
// Toko Live's dark hood with magenta hands, the teal gel in `toko.js`) were
// assistants' drawings, not his, and are retired: see `subject()`.
//
// The face is imported, never copied: `toko/js/master.js` is the owner's
// master artwork traced to outlines (toko/tools/trace-master.cjs), 99.7% pixel
// overlap with the original file in toko/master/.
//
// Mirrors Photo's interface — goLive/goIdle/update/draw/renderStatic/decoded/
// destroy — so main.js drives it without knowing which kind of shot it holds.

import { drawMasterBadge } from '../../toko/js/master.js';
import { WAYS, STICKER } from '../../toko/js/palette.js';
import { glance, drift, blink } from '../../toko/js/util.js';
import { PAL, SECTOR_COLOR } from './palette.js?v=71';
import { shade, mix } from './screen.js?v=71';

// The canvas is sized to the POST, not to a fixed 9:16. A phone post is
// taller than 9:16 and `object-fit: cover` crops the sides off a fixed frame —
// which took the station chrome off both edges and blew the head up past the
// frame. So the buffer matches the box and NOTHING is cropped; the layout
// below is therefore all fractions of W/H, never pixels.
export const ANCHOR_H = 640;              // internal height; width follows the box
const MIN_ASPECT = 0.40, MAX_ASPECT = 0.75;

// The composition, as fractions. A MEDIUM shot: the badge carries the frame
// and the desk hides its chin.
const L = {
  desk: 0.668,          // the desk edge, as a fraction of H
  plate: 0.760,         // the nameplate strip on the desk front
  filmDesk: 0.52,       // a film seats the desk higher: its lower third sits on the desk front
  maskW: 0.27,          // the badge's radius, of W…
  maskH: 0.155,         // …but never more than this of H
  maskSit: 0.9,         // centre above the desk edge, in radii: the desk hides his chin
  wall: { x: 0.045, y: 0.052, w: 0.910, h: 0.455 },
};

const lerpN = (a, b, k) => a + (b - a) * k;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function withAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

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
    // What the FILM tells him to do this frame — mouth, eyes, a lean, the
    // take, and the shot's own colour. Null on the feed, where he reads on his
    // own clock; js/film.js sets it per frame through the export. Every field
    // is optional and overrides the feed behaviour only when present.
    this.act = null;
    this.deskFrac = L.desk;

    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'photo-wrap anchor-wrap';

    const cv = document.createElement('canvas');
    cv.className = 'photo anchor-cv';
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
    this.render(this.ctx, this.W, this.H, null);
  }

  // Paint the shot into any context at any size. The feed passes nothing and
  // gets the phone post; a FILM passes `{ zoom }` and gets the studio at full
  // resolution — the set a plane behind him, out of focus and slower under the
  // camera than he is, two studio lights cutting down through dust, and a desk
  // glossy enough to hold his colour. None of that exists on the feed, where
  // the post is 360 px wide and a depth of field is a smear.
  render(c, W, H, film) {
    const t = this.t;
    const act = this.act;
    const hot = act && act.hot !== undefined ? act.hot : this.decoded;
    // Amber has exactly one job on this dial, and DECODE is it — so the whole
    // studio's furniture swaps to it rather than a badge lighting up. A film
    // may hand the set another cold phosphor per shot; amber stays DECODE's.
    const key = hot ? PAL.AMBER : (act && act.key) || this.accent;
    const dim = hot ? PAL.AMBER_DIM : (act && act.dim) || shade(this.accent, 0.55);
    const s = W / 360;                 // stroke/type scale, off the design width
    this.deskFrac = film ? L.filmDesk : L.desk;
    this.rim = key;

    if (!film) {
      this.backWall(c, W, H, dim, hot);
      this.videoWall(c, t, W, H, key, dim, s);
      this.subject(c, t, W, H);
      this.desk(c, W, H, key, dim, s);
      this.furniture(c, t, W, H, key, hot, s);
      this.grain(c, W, H);
      if (hot) this.tear(c, t, W, H);
      return;
    }

    const { cx, cy } = this.pose(W, H);
    const zoom = film.zoom || 1;
    // the set, on its own plane: drawn once into a layer, then laid in soft
    if (!this.bgLayer) this.bgLayer = document.createElement('canvas');
    const bl = this.bgLayer;
    if (bl.width !== W || bl.height !== H) { bl.width = W; bl.height = H; }
    const b = bl.getContext('2d');
    b.clearRect(0, 0, W, H);
    this.backWall(b, W, H, dim, hot);
    this.videoWall(b, t, W, H, key, dim, s);
    c.fillStyle = '#020605';
    c.fillRect(0, 0, W, H);
    c.save();
    const zb = 1.04 + (zoom - 1) * 0.35;           // parallax: the wall is further away
    c.translate(cx, cy); c.scale(zb, zb); c.translate(-cx, -cy);
    // out of focus: taken down to a quarter, blurred there, and brought back
    // up smooth — the same look as a full-size blur for a sixteenth of the work
    if (!this.bgSmall) this.bgSmall = document.createElement('canvas');
    const bs = this.bgSmall, qw = Math.round(W / 4), qh = Math.round(H / 4);
    if (bs.width !== qw || bs.height !== qh) { bs.width = qw; bs.height = qh; }
    const bx = bs.getContext('2d');
    bx.clearRect(0, 0, qw, qh);
    bx.filter = `blur(${Math.max(1, 0.6 * s).toFixed(1)}px)`;
    bx.drawImage(bl, 0, 0, qw, qh);
    bx.filter = 'none';
    c.imageSmoothingEnabled = true;
    c.drawImage(bs, 0, 0, W, H);
    c.restore();

    this.beams(c, t, W, H, key, s, film.heat || 0);
    this.siren(c, t, W, H, film.heat || 0);

    c.save();
    c.translate(cx, cy); c.scale(zoom, zoom); c.translate(-cx, -cy);
    this.subject(c, t, W, H, film.toko3d || null);
    this.desk(c, W, H, key, dim, s, true);
    this.reflect(c, t, W, H, key);
    if (film.meter) this.spinMeter(c, t, W, H, key, s, film.meter, hot);
    c.restore();

    this.furniture(c, t, W, H, key, hot, s);
    if (hot) this.tear(c, t, W, H);
  }

  // Two studio lights from above the frame, down onto him, with dust turning
  // in them. Screen-blended, so they lift what is under them rather than
  // painting over it, and keyed to the shot so a cyan shot has cyan light.
  beams(c, t, W, H, key, s, heat = 0) {
    const { cx, cy, R } = this.pose(W, H);
    const deskY = H * this.deskFrac;
    c.save();
    c.globalCompositeOperation = 'screen';
    for (const side of [-1, 1]) {
      const sx = cx + side * W * 0.42, tx = cx + side * R * 0.35;
      const path = () => {
        c.beginPath();
        c.moveTo(sx - 16 * s, -10); c.lineTo(sx + 16 * s, -10);
        c.lineTo(tx + R * 1.25, deskY); c.lineTo(tx - R * 1.25, deskY);
        c.closePath();
      };
      const g = c.createLinearGradient(sx, 0, tx, deskY);
      g.addColorStop(0, withAlpha(key, 0.20 + 0.14 * heat));
      g.addColorStop(0.55, withAlpha(key, 0.07 + 0.06 * heat));
      g.addColorStop(1, withAlpha(key, 0));
      c.fillStyle = g;
      path(); c.fill();
      // the dust: a fixed population drifting on its own clock, inside the beam
      c.save(); path(); c.clip();
      c.fillStyle = withAlpha('#ffffff', 0.5);
      for (let i = 0; i < 70; i++) {
        const u = rnd(i * 3.3 + side), v = (rnd(i * 7.1 + side) + t * (0.012 + u * 0.02)) % 1;
        const x = lerpN(sx, tx, v) + (u - 0.5) * R * 2.2 * v + Math.sin(t * 0.7 + i) * 6 * s;
        const y = v * deskY;
        const r = (0.6 + rnd(i * 1.9) * 1.1) * s;
        c.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.3 + i * 0.7));
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    c.restore();
  }

  // The morning's last third is a red alert: a siren sweep turns across the
  // set, faster and redder the later the bulletin. One studio, escalating.
  siren(c, t, W, H, heat) {
    const k = clamp01((heat - 0.45) / 0.55);
    if (k <= 0) return;
    const deskY = H * this.deskFrac, cx = W / 2, a = t * (1.6 + 1.4 * k);
    c.save();
    c.globalCompositeOperation = 'screen';
    for (const off of [0, Math.PI]) {
      const aa = a + off;
      const g = c.createLinearGradient(cx, 0, cx + Math.cos(aa) * W, Math.sin(aa) * deskY);
      g.addColorStop(0, `rgba(224,20,27,${0.45 * k})`);
      g.addColorStop(1, 'rgba(224,20,27,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(cx, 12);
      c.lineTo(cx + Math.cos(aa - 0.22) * W * 1.4, 12 + Math.sin(aa - 0.22) * W * 1.4);
      c.lineTo(cx + Math.cos(aa + 0.22) * W * 1.4, 12 + Math.sin(aa + 0.22) * W * 1.4);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  // The SPIN-O-METER: a thermometer on the desk counting every spin DECODE
  // has shown this morning. It holds through the reads and climbs on the
  // reveal, so the morning's eighth bulletin opens on a nearly full glass.
  spinMeter(c, t, W, H, key, s, m, hot) {
    const { R, cx } = this.pose(W, H);
    const deskY = H * this.deskFrac;
    const x = cx + R * 1.38, h = R * 1.3, w = R * 0.2, top = deskY - h;
    const f = clamp01(m.value / m.total);
    const bump = m.bump ? 1 + 0.06 * Math.sin(t * 22) * Math.exp(-((t * 3) % 3)) : 1;
    c.save();
    c.translate(x, deskY); c.scale(bump, bump); c.translate(-x, -deskY);
    c.fillStyle = 'rgba(8,12,12,0.85)';
    c.strokeStyle = withAlpha(key, 0.8); c.lineWidth = 2 * s;
    c.beginPath(); c.roundRect(x - w / 2, top, w, h - w * 0.6, w / 2); c.fill(); c.stroke();
    const fillC = hot ? PAL.AMBER : '#e0141b';
    const fh = (h - w * 1.3) * f;
    c.fillStyle = fillC;
    c.beginPath(); c.roundRect(x - w * 0.28, top + (h - w * 0.6) - w * 0.35 - fh, w * 0.56, fh + w * 0.2, w * 0.28); c.fill();
    c.beginPath(); c.arc(x, deskY - w * 0.35, w * 0.62, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = withAlpha(key, 0.85);
    for (let i = 1; i < 5; i++) c.fillRect(x - w / 2, top + (h - w * 1.3) * i / 5, w * 0.35, 1.5 * s);
    c.font = `bold ${Math.round(9 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('SPINS', x, top - 4 * s);
    c.fillStyle = '#ffffff'; c.textBaseline = 'middle';
    c.font = `900 ${Math.round(11 * s)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    c.fillText(String(Math.round(m.value)), x, deskY - w * 0.35);
    c.restore();
  }

  // The desk top is glossy: it holds his ring and the light as a soft smear
  // below the edge, the way a lacquered news desk does.
  reflect(c, t, W, H, key) {
    const a = this.at;
    if (!a) return;
    const { R } = this.pose(W, H);
    const deskY = H * this.deskFrac;
    c.save();
    c.beginPath(); c.rect(0, deskY + 3, W, H * 0.16); c.clip();
    c.globalCompositeOperation = 'screen';
    c.translate(a.hx, deskY + R * 0.22);
    c.scale(1, 0.28);
    const g = c.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.3);
    g.addColorStop(0, withAlpha(a.ground || '#f0027f', 0.30));
    g.addColorStop(1, withAlpha(a.ground || '#f0027f', 0));
    c.fillStyle = g;
    c.fillRect(-R * 1.4, -R * 1.4, R * 2.8, R * 2.8);
    c.restore();
    c.save();
    c.globalCompositeOperation = 'screen';
    const sg = c.createLinearGradient(0, deskY, 0, deskY + H * 0.05);
    sg.addColorStop(0, withAlpha(key, 0.22));
    sg.addColorStop(1, withAlpha(key, 0));
    c.fillStyle = sg;
    c.fillRect(0, deskY, W, H * 0.05);
    c.restore();
  }

  // ── the set ────────────────────────────────────────────────────────────
  backWall(c, W, H, dim, hot) {
    const deskY = H * this.deskFrac;
    const g = c.createLinearGradient(0, 0, 0, deskY);
    // the wall takes the shot's key at a whisper, so a cyan shot IS cyan
    g.addColorStop(0, hot ? '#120c04' : mix('#05100c', dim, 0.22));
    g.addColorStop(1, hot ? '#1c1206' : mix('#0a1a14', dim, 0.36));
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
  // Toko is his FACE, and nothing else is his. The only original art of him
  // is the face — the owner's master, traced into `toko/js/master.js`. His
  // original colour is magenta (white on magenta, SIGN), any carrier colour is
  // still the original Toko, and a colour may carry a mood (owner,
  // 2026-09-24; toko/BRAND.md §2c) — so he turns YELLOW, the master file's own
  // carrier, when he decodes. The bodies he has worn at this
  // desk (a magenta bust, a dark hood with magenta hands) were assistants'
  // drawings, and they are gone. So he is the BADGE: on the feed the flat mark,
  // in a film the same mark as a lacquered 3D pin (`js/toko3d.js`), sitting
  // at the desk the way a presenter's head rises over one.
  pose(W, H) {
    const deskY = H * (this.deskFrac || L.desk);
    const R = Math.min(W * L.maskW, H * L.maskH);
    return { R, cx: W / 2, cy: deskY - R * L.maskSit, deskY };
  }

  // his face this frame: what the film says, or his own clock on the feed
  face(t) {
    const act = this.act || {};
    // Eyes shut and smiling at rest — that closed arch IS the logo. They open
    // while he is reading, because that is the one moment he is looking at
    // somebody; between bulletins he goes back to `glance`.
    const speaking = this.mouthSmooth > 0.03;
    const lid = blink(t, { every: 8.5, offset: this.seed * 0.9 });
    const open = act.open != null ? act.open : (speaking ? 1 : glance(t, { every: 11, offset: 0.7 }));
    const squash = act.squash != null ? act.squash : 1 - lid * 0.94;
    const grinK = act.grin != null ? act.grin : 1;
    // the mouth radius breathing: 0.09 is the feed's number, a film drives it
    // through `act` and asks for 0.26 so the smile visibly works
    const grin = grinK * (1 + this.mouthSmooth * (act.mouth != null ? 0.26 : 0.09) + drift(t, { period: 6 }) * 0.012);
    // the master's mouth fills the badge, so its breath is kept to a third of
    // what the thin measured arcs could take before it reads as a gulp
    return { open, squash, grin: 1 + (grin - 1) * 0.35 };
  }

  subject(c, t, W, H, toko3d = null) {
    const act = this.act || {};
    const { R, cx, cy } = this.pose(W, H);
    // a slow breath under everything; the film leans him, nods him, tilts him
    const sway = drift(t, { period: 11 }) * W * 0.008 + (act.lean || 0) * W;
    const bob = drift(t, { period: 7, phase: 0.3 }) * H * 0.004 + (act.nod || 0) * H * 0.02;
    const hx = cx + sway, hy = cy + bob;
    const f = this.face(t);
    // the take pops him toward the camera; a sentence turns him toward the
    // hand-side the film would have gestured on
    const pop = (1 + 0.14 * (act.hands || 0)) * (act.pop || 1);
    const yaw = (act.gesture || 0) * 0.32;
    this.at = { hx, hy, R };
    // the mood: magenta reading the broadcast, the yellow carrier once decoded
    const hot = act.hot !== undefined ? !!act.hot : this.decoded;
    const ground = hot ? STICKER.YELLOW : WAYS.SIGN.ground;
    this.at.ground = ground;

    // his own light on the wall behind him
    const glow = c.createRadialGradient(hx, hy, R * 0.6, hx, hy, R * 2.6);
    glow.addColorStop(0, withAlpha(ground, 0.30));
    glow.addColorStop(1, withAlpha(ground, 0));
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H * this.deskFrac);

    // the shadow he throws on the wall — the only thing keeping him off it
    c.save();
    c.globalAlpha = 0.38;
    c.fillStyle = '#020a07';
    c.beginPath();
    c.ellipse(hx + W * 0.03, hy + H * 0.016, R * pop * Math.cos(yaw), R * pop, act.tilt || 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    if (toko3d) {
      const img = toko3d.render({
        open: f.open, squash: f.squash, grin: f.grin,
        yaw, pitch: (act.nod || 0) * 0.35, roll: act.tilt || 0, pop,
        key: this.rim, hot, ground,
      });
      const size = R * 2 * toko3d.half;      // the canvas spans ±half units; the disc is ±1
      c.save();
      c.imageSmoothingEnabled = true;
      c.drawImage(img, hx - size / 2, hy - size / 2, size, size);
      c.restore();
      this.emoteMark(c, act.emote, act.emoteK || 0, hx + R * 0.95 * pop, hy - R * 0.9 * pop, R * 0.42);
      return;
    }
    c.save();
    if (act.tilt) { c.translate(hx, hy); c.rotate(act.tilt); c.translate(-hx, -hy); }
    c.translate(hx, hy); c.scale(pop * Math.cos(yaw), pop); c.translate(-hx, -hy);
    drawMasterBadge(c, hx, hy, R, { ground, ink: WAYS.SIGN.ink, squash: f.squash, grin: f.grin });
    c.restore();
    this.emoteMark(c, act.emote, act.emoteK || 0, hx + R * 0.95 * pop, hy - R * 0.9 * pop, R * 0.42);
  }

  // The reaction mark by his head — PDoomVideo's emote, in this station's ink:
  // a sparkle, a sweat drop, or the punctuation of a take. It pops on backOut,
  // wobbles, and is gone; the face itself never changes (toko/BRAND.md §2c).
  emoteMark(c, kind, k, x, y, size) {
    if (!kind || k <= 0.01) return;
    const b = 1 + 2.9 * Math.pow(k - 1, 3) + 1.9 * Math.pow(k - 1, 2);   // backOut
    c.save();
    c.translate(x, y);
    c.rotate(0.12 + Math.sin(this.t * 17) * 0.05 * (1 - k));
    c.scale(b, b);
    c.globalAlpha = Math.min(1, k * 1.3);
    c.lineJoin = 'round';
    c.lineWidth = size * 0.1;
    c.strokeStyle = '#0a0a0e';
    if (kind === 'spark') {
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 ? size * 0.22 : size * 0.62;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.stroke(); c.fillStyle = '#f5c400'; c.fill();
    } else if (kind === 'sweat') {
      c.beginPath();
      c.moveTo(0, -size * 0.6);
      c.quadraticCurveTo(size * 0.48, size * 0.05, 0, size * 0.42);
      c.quadraticCurveTo(-size * 0.48, size * 0.05, 0, -size * 0.6);
      c.closePath(); c.stroke(); c.fillStyle = '#4cb7e2'; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath(); c.ellipse(-size * 0.1, size * 0.02, size * 0.07, size * 0.14, 0.3, 0, Math.PI * 2); c.fill();
    } else {
      c.font = `900 ${Math.round(size * 1.3)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = size * 0.16;
      c.strokeText(kind, 0, 0);
      c.fillStyle = kind === '!' ? '#f5c400' : '#ffffff';
      c.fillText(kind, 0, 0);
    }
    c.restore();
  }

  // ── the desk ───────────────────────────────────────────────────────────
  desk(c, W, H, key, dim, s, film = false) {
    const deskY = H * this.deskFrac;
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
    // A film's own lower third sits on the desk front instead.
    if (film) return;
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
      c.drawImage(c.canvas, 0, by, W, bh, dx, by, W, bh);
    }
  }

  destroy() { this.wrap.remove(); }
}

// so a harness can lay out a preview without duplicating the fractions
export const ANCHOR_LAYOUT = L;
