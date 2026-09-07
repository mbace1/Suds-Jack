#!/usr/bin/env node
// EERI layer compositor v3 — a POOL of pieces, composed; not one segment tiled.
//
// v2 keyed one generated segment per layer and stamped it across the rect with
// a gap between copies. Shot in game at x=78 the failure is unmissable: three
// identical half-built frames at identical heights, three identical cranes
// above them, evenly spaced. Rendered as a full-width strip it is worse — half
// of every layer is empty air between the stamps.
//
// The segments themselves were never the problem. They are on target: balsa
// standards, split-pin bolts, corrugated cut edges. What was missing is
// COMPOSITION, so that is what this file now does:
//
//   1. PIECES, not segments. Each source image is one object on magenta with
//      no ground under it (sheet-pieces.mjs). This file finds its ink bounds,
//      gives it a world height, and places it.
//   2. A HEIGHT PROFILE. Every piece carries its own world height and jitters
//      around it, and `hero` pieces (cranes, lift cores, the tall scaffold)
//      appear rarely and stand well above the run. v2's skyline was a straight
//      line because every stamp was the same picture at the same scale.
//   3. A CONTINUOUS GRADE. Every layer that stands on the ground gets a torn
//      card ground line running the FULL width, tiled with overlap so it has
//      no seam, and every piece is planted on it with a contact shadow. The
//      owner's note on the v2 build was that the backgrounds "stopped abruptly
//      or aren't connected to ground" — a run of cutouts with air under it is
//      exactly that, and no amount of piece quality fixes it.
//   4. EDGE CONTRAST. Each piece drops a hard-edged cutout shadow onto
//      whatever is behind it, and each lane gets its contrast pushed back up
//      before the depth tint washes it out. Flat pale shapes on a flat pale
//      field is the other half of the same note.
//   5. DEPTH ORDER + A VALUE STAIRCASE. Placements draw tallest-first, so
//      short clutter overlaps tall structure. The depth tint alone mixes every
//      lane toward the same pale sky, which is why the base build reads as one
//      field of cream with the player lost in it; `value` steps each lane down
//      from the one behind it, so the play lane is the most contrasty band on
//      screen. That is rung 1's acceptance test, not a style preference.
//
// Everything is seeded, so the same commit builds the same layers.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// WORLD picks which set is built — each world is its own pool + layer
// config over the SAME rects/tints (the contract in assets/README.md is
// world-agnostic; only what is painted onto each rect changes).
const WORLD = process.env.WORLD ?? 'groundworks';
const PIECES = process.env.PIECES ?? 'pieces';
const OUT = process.env.OUT ?? 'layers';
const PPU = 30;
const SKY_PALE = [0xc2, 0xe2, 0xf4];
const KEYLIB = await readFile(new URL('./keylib.js', import.meta.url), 'utf8');

// h = world height the piece stands. hero = rare, and breaks the height line.
// The heights are the composition: a run of 13s with an occasional 17 is a
// skyline; thirteen 13s is a fence.
//
// `cast` is a per-piece de-magenta, and it is per-piece ON PURPOSE. The
// backing bounces onto everything it lights, so a balsa scaffold comes back
// salmon — but `castprobe.mjs` scores the orange skip and the orange cones
// just as high, because orange genuinely sits on the magenta side of the
// green-magenta axis. A blanket correction would grey out the only saturated
// colours in the kit. So the neutrals declare their own correction and the
// painted pieces declare none. (Measured means: scaff3 13.8, fence 14.9,
// stack 10.9, crane 7.5 — against frame2 −3.3 and hut −2.1, which are clean.)
const POOLS = {};
POOLS.groundworks = {
  skyline: [
    { src: 'P-sky-slab',  h: 17, w: 3 },
    { src: 'P-sky-step',  h: 12, w: 3 },
    { src: 'P-sky-pair',  h: 10, w: 3 },
    { src: 'P-sky-tower', h: 20, w: 2 },
    { src: 'P-sky-stack', h: 21, w: 1, hero: true, cast: 1.0 },
    { src: 'P-sky-crane', h: 24, w: 1, hero: true, cast: 1.0 },
  ],
  far: [
    { src: 'P-far-frame5', h: 13, w: 3 },
    { src: 'P-far-frame3', h: 9.5, w: 3 },
    { src: 'P-far-frame2', h: 6.5, w: 3 },
    { src: 'P-far-hoard',  h: 3.6, w: 2 },
    { src: 'P-far-silo',   h: 11, w: 2 },
    { src: 'P-far-core',   h: 17, w: 1, hero: true },
    { src: 'P-far-crane',  h: 16, w: 1, hero: true, cast: 1.0 },
  ],
  mid: [
    { src: 'P-mid-scaff3', h: 7.5, w: 3, cast: 1.0 },
    { src: 'P-mid-scaff1', h: 4.2, w: 3, cast: 1.0 },
    { src: 'P-mid-hoard',  h: 3.4, w: 3 },
    { src: 'P-mid-hut',    h: 3.2, w: 2 },
    { src: 'P-mid-stack',  h: 3.0, w: 2 },
    { src: 'P-mid-skip',   h: 2.2, w: 2 },
    { src: 'P-mid-pipes',  h: 2.4, w: 2 },
    { src: 'P-mid-mixer',  h: 2.6, w: 1 },
    { src: 'P-mid-tower',  h: 10.5, w: 1, hero: true, cast: 1.0 },
  ],
  near: [
    // The hoarding earns its place in the NEAR lane, not just the mid one:
    // it is the only wide block of local colour in the kit, and the play lane
    // needs something behind it that is neither pale nor grey or the player
    // is a small figure against a field of card. Rung 1's acceptance test is
    // "the player is instantly findable", and this is what buys it.
    { src: 'P-mid-hoard',   h: 2.6, w: 3 },
    { src: 'P-near-spoil',  h: 2.0, w: 3 },
    { src: 'P-near-pipes',  h: 1.5, w: 2 },
    { src: 'P-near-cones',  h: 0.8, w: 2 },
    { src: 'P-near-drums',  h: 1.4, w: 2 },
    { src: 'P-near-pallet', h: 1.3, w: 2 },
    { src: 'P-near-fence',  h: 2.2, w: 2, cast: 1.0 },
  ],
  // The fore lane must be CROPPED and NARROW. `high` used to seat a piece at
  // y1 − h·1.1, i.e. entirely inside the frame — so the pipe run hung across
  // the middle of the screen as a black bar with the playfield behind it,
  // which is the "big shape parked at eye level" the layer contract names as
  // the failure mode. It now sits above y1 − h·0.45, so the frame cuts it.
  fore: [
    { src: 'P-fore-stand', h: 17, w: 4 },
    { src: 'P-fore-net',   h: 17, w: 1 },
    { src: 'P-fore-pipe',  h: 3.4, w: 2, high: true },
    { src: 'P-fore-spoil', h: 3.0, w: 3, low: true },
    { src: 'P-fore-drums', h: 2.6, w: 2, low: true },
  ],
};

// rect + tint from eeri/js/layers.js + palette.js.
//   groundY  — where the FEET of a standing piece land, in world units
//   adv      — advance as a fraction of the placed piece's width. Below 1 the
//              next piece overlaps the last; that is what makes a site.
//   clear    — [everyN, worldUnits]: a deliberate clearing, so the run breathes
//   grade    — [source, world height]: the ground line the layer stands on
//   shadow   — [offsetX, offsetY, alpha] in world units: the cutout shadow
//   contrast — pushes the lane away from its own mid before the tint washes it
//   value    — the depth staircase (see header). 1 = untouched.
const CONFIGS = {};
CONFIGS.groundworks = { ver: 3, layers: [
  { name: 'skyline', x0: -30, x1: 130, y0: 0,  y1: 30, tint: 0.50, groundY: 3.0, adv: [0.55, 0.92], clear: [6, 5],  hero: 0.16, jitter: 0.14,
    value: 1.00, contrast: 1.04, shadow: [0.35, -0.35, 0.13], seed: 11 },
  { name: 'far',     x0: -20, x1: 120, y0: 0,  y1: 20, tint: 0.28, groundY: 2.2, adv: [0.52, 0.88], clear: [7, 4],  hero: 0.16, jitter: 0.12,
    value: 0.92, contrast: 1.12, shadow: [0.30, -0.30, 0.20], grade: ['G-far', 4.2], seed: 23 },
  { name: 'mid',     x0: -12, x1: 110, y0: 0,  y1: 14, tint: 0.16, groundY: 2.6, adv: [0.80, 1.45], clear: [4, 7],  hero: 0.12, jitter: 0.10,
    value: 0.84, contrast: 1.16, shadow: [0.22, -0.22, 0.26], grade: ['G-mid', 3.6], seed: 37 },
  { name: 'near',    x0: -8,  x1: 104, y0: 0,  y1: 8,  tint: 0.05, groundY: 2.9, adv: [1.10, 2.10], clear: [4, 6],  hero: 0,    jitter: 0.16,
    value: 0.78, contrast: 1.18, shadow: [0.14, -0.14, 0.30], grade: ['G-near', 3.4], seed: 51 },
  // The fore lane is NEAR-SILHOUETTE by contract (dark, no sky tint), and the
  // generator bakes magenta bounce into dark surfaces that edge despill cannot
  // reach — the grade both enforces the contract and kills the cast. It is
  // also kept SPARSE and NARROW on purpose: v2 parked a wide dark girder at
  // eye level and hid a third of the playfield behind it.
  { name: 'fore',    x0: -8,  x1: 104, y0: -2, y1: 14, tint: 0.00, groundY: -2, adv: [3.0, 6.0], clear: [2, 14], hero: 0, jitter: 0.10,
    value: 1.00, contrast: 1.00, seed: 67, colour: { c: [42, 33, 26], amt: 0.65 } },
] };

// ---- PIPEWORKS — world 2 (DESIGN §4.1 "pipes/water", due at level 4) ------
// Same craft kit, new subjects: the waterworks. Water is CUT PAPER — layered
// blue card with scalloped torn edges — never a rendered liquid.
// P-mid-tower is borrowed from the groundworks pool on purpose: a scaffold
// tower is world-agnostic site furniture, and one shared silhouette ties the
// worlds to one site without the backdrops repeating.
POOLS.pipeworks = {
  skyline: [
    { src: 'W-sky-tower', h: 18, w: 3, cast: 1.0 },
    { src: 'W-sky-gas',   h: 10, w: 2, cast: 1.0 },
    { src: 'W-sky-pump',  h: 8,  w: 3 },
    { src: 'W-sky-pipes', h: 6.5, w: 2, cast: 1.0 },
    { src: 'W-sky-crane', h: 24, w: 1, hero: true, cast: 1.0 },
  ],
  far: [
    { src: 'W-far-tank',   h: 12, w: 3, cast: 0.6 },
    { src: 'W-far-rack',   h: 8,  w: 3, cast: 0.8 },
    { src: 'W-far-house',  h: 6.5, w: 3 },
    { src: 'W-far-stand',  h: 17, w: 1, hero: true },
    { src: 'W-far-bridge', h: 10, w: 1, hero: true },
  ],
  mid: [
    { src: 'W-far-rack',     h: 4.6, w: 3, cast: 0.8, sink: 0.2 },
    { src: 'W-mid-run',      h: 2.4, w: 3, cast: 1.0, sink: 0.25 },
    { src: 'W-mid-valve',    h: 3.6, w: 2, sink: 0.3 },
    { src: 'W-mid-elbow',    h: 3.1, w: 2, cast: 0.7, sink: 0.25 },
    { src: 'W-mid-pumpskid', h: 2.6, w: 2, sink: 0.3 },
    { src: 'W-mid-sluice',   h: 3.4, w: 2, sink: 0.3 },
    { src: 'W-mid-stack',    h: 2.8, w: 2, sink: 0.25 },
    { src: 'P-mid-tower',    h: 10.5, w: 1, hero: true, cast: 1.0 },
  ],
  near: [
    { src: 'W-near-water',   h: 1.4, w: 4, sink: 0.5 },
    { src: 'W-near-culvert', h: 1.6, w: 2, sink: 0.35 },
    { src: 'W-near-hose',    h: 0.9, w: 2, sink: 0.35 },
    { src: 'W-near-sand',    h: 1.1, w: 2, sink: 0.35 },
    { src: 'W-near-pump',    h: 1.5, w: 2, sink: 0.35 },
  ],
  fore: [
    { src: 'W-fore-stand', h: 17, w: 4, cast: 0.8 },
    { src: 'W-fore-run',   h: 3.4, w: 2, high: true, cast: 0.8 },
    { src: 'W-fore-spoil', h: 3.0, w: 3, low: true, cast: 0.8 },
  ],
};

CONFIGS.pipeworks = { ver: 1, layers: [
  { name: 'skyline', x0: -30, x1: 130, y0: 0,  y1: 30, tint: 0.50, groundY: 3.0, adv: [0.55, 0.92], clear: [5, 7],  hero: 0.08, jitter: 0.14,
    value: 1.00, contrast: 1.04, shadow: [0.35, -0.35, 0.13], seed: 71 },
  { name: 'far',     x0: -20, x1: 120, y0: 0,  y1: 20, tint: 0.28, groundY: 2.2, adv: [0.55, 0.95], clear: [6, 5],  hero: 0.16, jitter: 0.12,
    value: 0.92, contrast: 1.12, shadow: [0.30, -0.30, 0.20], grade: ['WG-far', 4.2], seed: 83 },
  { name: 'mid',     x0: -12, x1: 110, y0: 0,  y1: 14, tint: 0.16, groundY: 2.6, adv: [0.72, 1.30], clear: [5, 6],  hero: 0.10, jitter: 0.10,
    value: 0.84, contrast: 1.16, shadow: [0.22, -0.22, 0.26], grade: ['WG-mid', 3.6], seed: 97 },
  { name: 'near',    x0: -8,  x1: 104, y0: 0,  y1: 8,  tint: 0.05, groundY: 2.9, adv: [1.10, 2.10], clear: [4, 6],  hero: 0,    jitter: 0.16,
    value: 0.78, contrast: 1.18, shadow: [0.14, -0.14, 0.30], grade: ['WG-near', 3.4], seed: 103 },
  { name: 'fore',    x0: -8,  x1: 104, y0: -2, y1: 14, tint: 0.00, groundY: -2, adv: [3.0, 6.0], clear: [2, 14], hero: 0, jitter: 0.10,
    value: 1.00, contrast: 1.00, seed: 109, colour: { c: [42, 33, 26], amt: 0.65 } },
] };

const POOL = POOLS[WORLD];
const LAYERS = CONFIGS[WORLD].layers;
if (!POOL) { console.error(`unknown WORLD "${WORLD}"`); process.exit(1); }

// ---------------------------------------------------------------------------
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.goto('data:text/html,<html><body></body></html>');
await page.addScriptTag({ content: KEYLIB });

const load = async (stem) => {
  const f = ['jpg', 'png'].map(e => `${PIECES}/${stem}.${e}`).find(existsSync);
  if (!f) return null;
  const mime = f.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${(await readFile(f)).toString('base64')}`;
};

for (const L of LAYERS) {
  const pool = [];
  for (const p of POOL[L.name]) {
    const url = await load(p.src);
    if (!url) { console.log(`  · ${p.src} missing, skipped`); continue; }
    pool.push({ ...p, url });
  }
  if (!pool.length) { console.log(`${L.name}: EMPTY POOL — skipped`); continue; }
  const gradeUrl = L.grade ? await load(L.grade[0]) : null;

  const out = await page.evaluate(async ({ pool, gradeUrl, L, PPU, SKY_PALE }) => {
    const prep = async (url) => {
      const img = new Image(); img.src = url; await img.decode();
      return keyImage(img);                       // key + despill + bleed + crop
    };
    // A flat cutout casts a hard-edged shadow on the flat cutout behind it —
    // that IS the Crafted World read, and it is what separates two pale pieces
    // that would otherwise merge into one shape.
    const silhouette = (cv) => {
      const s = document.createElement('canvas');
      s.width = cv.width; s.height = cv.height;
      const g = s.getContext('2d');
      g.drawImage(cv, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#000'; g.fillRect(0, 0, s.width, s.height);
      return s;
    };

    // per-piece de-magenta, sized off the piece's own mean (see POOL header)
    const decast = (cv, amt) => {
      const g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
      let n = 0, sum = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        sum += (px[i] + px[i + 2]) / 2 - px[i + 1]; n++;
      }
      const k = (sum / Math.max(1, n)) * amt;
      if (k <= 0) return cv;
      for (let i = 0; i < px.length; i += 4) { px[i] -= k; px[i + 2] -= k; }
      g.putImageData(d, 0, 0);
      return cv;
    };

    for (const p of pool) {
      p.cv = await prep(p.url);
      if (p.cv && p.cast) decast(p.cv, p.cast);
      p.aspect = p.cv ? p.cv.width / p.cv.height : 1;
      if (p.cv) p.sh = silhouette(p.cv);
    }
    const live = pool.filter(p => p.cv);

    const wU = L.x1 - L.x0, hU = L.y1 - L.y0;
    const cw = Math.min(4096, Math.round(wU * PPU)), ch = Math.round(hU * PPU);
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const g2 = cv.getContext('2d');
    const sx = cw / wU, sy = ch / hU;

    let s = L.seed;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const between = ([a, b]) => a + rnd() * (b - a);

    // --- the grade: a continuous ground line, tiled with overlap ------------
    // Its top edge is torn, so consecutive tiles never show a join; a flat
    // band would just move the abrupt stop from the ends to the seams.
    let gradeTop = null, gradeCv = null;
    const runGrade = (gc, gh, crest, jitterY) => {
      const gw = gh * (gc.width / gc.height);
      const top = (L.y1 - crest) * sy;
      for (let x = -gw * 0.3, i = 0; x < wU + gw; x += gw * 0.82, i++) {
        const px = x * sx, jy = (rnd() - 0.5) * jitterY * sy;
        g2.save();
        if (i % 2) { g2.translate(px + gw * sx, top + jy); g2.scale(-1, 1); g2.drawImage(gc, 0, 0, gw * sx, gh * sy); }
        else g2.drawImage(gc, px, top + jy, gw * sx, gh * sy);
        g2.restore();
      }
      return top;
    };
    if (gradeUrl) {
      gradeCv = await prep(gradeUrl);
      if (gradeCv) {
        const gh = L.grade[1];
        gradeTop = runGrade(gradeCv, gh, L.groundY + gh * 0.34, 0.5);
      }
    }

    // --- seeded placement --------------------------------------------------
    const heroes = live.filter(p => p.hero), fills = live.filter(p => !p.hero);
    const bag = [];
    for (const p of fills) for (let i = 0; i < (p.w ?? 1); i++) bag.push(p);

    const place = [];
    let x = L.x0 - 8, last = null, n = 0;
    while (x < L.x1 + 4) {
      let p;
      if (heroes.length && rnd() < L.hero) p = heroes[(rnd() * heroes.length) | 0];
      else {
        const opts = bag.filter(q => q !== last);
        p = (opts.length ? opts : bag)[(rnd() * (opts.length || bag.length)) | 0];
      }
      last = p;
      const h = p.h * (1 + (rnd() - 0.5) * 2 * L.jitter);
      const w = h * p.aspect;
      // `sink` buries the feet in the grade: some pieces keep a sliver of
      // white base (legit ink — the key is right to keep it), and sinking is
      // cheaper and more honest than re-rolling for a perfect crop.
      let y = L.groundY - (p.sink ?? 0);
      if (p.low) y = L.y0 - h * 0.35;            // cropped by the bottom edge
      else if (p.high) y = L.y1 - h * 0.45;      // …and by the top
      place.push({ p, x, y, w, h, flip: rnd() < 0.5 });
      let adv = w * between(L.adv);
      if (L.clear && n && n % L.clear[0] === 0) adv += L.clear[1] * (0.5 + rnd());
      x += Math.max(adv, w * 0.25);
      n++;
    }
    place.sort((a, b) => b.h - a.h);           // tallest behind

    const draw = (img, q, dx = 0, dy = 0, alpha = 1) => {
      const px = (q.x - L.x0 + dx) * sx;
      const py = (L.y1 - (q.y + q.h) - dy) * sy;
      const pw = q.w * sx, ph = q.h * sy;
      g2.save();
      g2.globalAlpha = alpha;
      if (q.flip) { g2.translate(px + pw, py); g2.scale(-1, 1); g2.drawImage(img, 0, 0, pw, ph); }
      else g2.drawImage(img, px, py, pw, ph);
      g2.restore();
    };

    for (const q of place) {
      if (L.shadow) {
        const [ox, oy, a] = L.shadow;
        draw(q.p.sh, q, ox, oy, a);                       // cutout shadow behind
        // …and a contact shadow where it meets the grade, so it is PLANTED.
        // A cutout with clean air under its feet is the "not connected to
        // ground" read even when a grade line is present behind it.
        if (gradeTop !== null && !q.p.low && !q.p.high) {
          const px = (q.x - L.x0) * sx, pw = q.w * sx;
          const gy = (L.y1 - q.y) * sy;
          const gr = g2.createLinearGradient(0, gy - 0.28 * sy, 0, gy + 0.30 * sy);
          gr.addColorStop(0, `rgba(30,22,16,0)`);
          gr.addColorStop(0.45, `rgba(30,22,16,${a * 1.25})`);
          gr.addColorStop(1, `rgba(30,22,16,0)`);
          g2.fillStyle = gr;
          g2.fillRect(px - pw * 0.04, gy - 0.28 * sy, pw * 1.08, 0.58 * sy);
        }
      }
      draw(q.p.cv, q);
    }

    // …and the grade again, IN FRONT and low, so every foot is buried in
    // spoil. Drawn only behind the pieces it is a backdrop and they still
    // stand on air — which is the "not connected to ground" read exactly.
    if (gradeCv) runGrade(gradeCv, L.grade[1] * 0.5, L.groundY + 0.55, 0.35);

    // --- contrast, colour grade, value staircase, depth tint ---------------
    const t = g2.getImageData(0, 0, cw, ch), tp = t.data;
    const col = L.colour, [Cr, Cg, Cb] = col ? col.c : [0, 0, 0], ck = col ? col.amt : 0;
    const K = L.contrast ?? 1;
    for (let i = 0; i < tp.length; i += 4) {
      if (!tp[i + 3]) continue;
      let r = tp[i], g = tp[i + 1], b = tp[i + 2];
      if (K !== 1) {                              // definition back, before the wash
        r = 128 + (r - 128) * K; g = 128 + (g - 128) * K; b = 128 + (b - 128) * K;
      }
      if (col) { r += (Cr - r) * ck; g += (Cg - g) * ck; b += (Cb - b) * ck; }
      if (L.value !== 1) { r *= L.value; g *= L.value; b *= L.value; }
      if (L.tint > 0) {
        r += (SKY_PALE[0] - r) * L.tint; g += (SKY_PALE[1] - g) * L.tint; b += (SKY_PALE[2] - b) * L.tint;
      }
      tp[i] = r; tp[i + 1] = g; tp[i + 2] = b;
    }
    g2.putImageData(t, 0, 0);
    return { url: cv.toDataURL('image/png'), w: cw, h: ch, n: place.length, pool: live.length, grade: !!gradeUrl };
  }, { pool, gradeUrl, L, PPU, SKY_PALE });

  const dest = `${OUT}/${WORLD}_${L.name}_v${CONFIGS[WORLD].ver}.png`;
  await writeFile(dest, Buffer.from(out.url.split(',')[1], 'base64'));
  console.log(`${L.name.padEnd(8)} ${out.w}×${out.h}  ${out.n} placements / ${out.pool} pieces  grade:${out.grade ? 'yes' : 'no '}  tint ${L.tint} value ${L.value} K ${L.contrast}`);
}
await browser.close();
