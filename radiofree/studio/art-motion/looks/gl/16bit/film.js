// GAMEPLAY LABORATORY · 16-bit (a console-generation-two bumper). The screen is 180×320, upscaled ×6. What makes it
// that era rather than the one before:
//   · many more colours, but still quantised to 5 bits a channel (32 levels), so gradients band;
//   · gradients done as horizontal bands, the way per-scanline colour changes painted skies;
//   · four scrolling planes at four speeds (parallax), a sprite with 3–4 shades per material and a dark outline;
//   · the logo arrives by rotate-and-scale of a bitmap plane with nearest sampling (the famous "mode" trick), so its
//     pixels swim and snap while it zooms, then a palette-cycle shine runs across it;
//   · master brightness in 16 steps, not a soft fade.
// Original art throughout: a goggled lab kid in a magenta scarf, test chambers, a lab corridor at sunset.
import { register, clamp } from '../common/film.js';
import { drawText, textWidth, pixels } from '../common/font.js';

const W = 180, H = 320, SECONDS = 5.8;
const T = { run1: 3.35, stop: 3.7, logo0: 3.55, logo1: 4.35, shine0: 4.45, shine1: 5.05, shine2: 5.2, week: 4.7, music: 0.0, dim: 3.6 };
const SPEED = 190;   // scroll, source pixels per second, while running
const scrollAt = (t) => (t < T.run1 ? SPEED * t : SPEED * T.run1 + SPEED * 0.5 * (T.stop - T.run1) * (1 - Math.pow(1 - clamp((t - T.run1) / (T.stop - T.run1)), 2)) );

let g;
const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const mix = (a, b, k) => { const p = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };

// ------------------------------------------------------------------ plane 3: the back wall's tall windows at sunset
const SKY = ['#2a1050', '#46126a', '#6a1878', '#922080', '#b8307a', '#d84a6a', '#ee6a58', '#f89048', '#fbb448', '#fdd060'];
function backWall(sx) {
  // sky bands (one colour per band of scanlines, no blending)
  for (let i = 0; i < SKY.length; i++) rect(0, i * 14, W, 14, SKY[i]);
  rect(0, 140, W, 110, '#1c1830');
  // a far city skyline in two silhouette tones, and the window mullions over it all
  const off = -(sx * 0.15) % 48;
  for (let k = -1; k < 6; k++) { const x = off + k * 48;
    [[0, 30, 10], [12, 22, 8], [22, 40, 12], [36, 18, 9]].forEach(([dx, h, w2]) => { rect(x + dx, 140 - h, w2, h, '#3a1e58'); for (let wy = 0; wy < h - 4; wy += 5) rect(x + dx + 2, 140 - h + 3 + wy, 1, 1, '#fdd060'); }); }
  const mo = -(sx * 0.25) % 60;
  for (let k = -1; k < 5; k++) { const x = mo + k * 60; rect(x, 0, 6, 140, '#141022'); rect(x + 6, 0, 1, 140, '#2e2848'); }
  rect(0, 136, W, 6, '#141022'); rect(0, 136, W, 1, '#3a3458');
  // stars in the top bands
  for (let i = 0; i < 18; i++) { const x = ((i * 53 + 17) - sx * 0.12) % W, y = (i * 29) % 50 + 4; rect((x + W) % W, y, 1, 1, i % 3 ? '#f0d0ff' : '#ffffff'); }
}

// ------------------------------------------------------------------ plane 2: test chambers
const CHAMBER = [
  { liquid: ['#1e7a5c', '#2fb07a', '#7ef0b0'], icon: 'heart' }, { liquid: ['#6a1e8a', '#a440c8', '#e09cff'], icon: 'star' },
  { liquid: ['#1e4c9a', '#3c86e0', '#9cd4ff'], icon: 'gem' }, { liquid: ['#9a3a14', '#e07028', '#ffc070'], icon: 'ring' },
];
const ICON = { heart: ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'], star: ['0001000', '0011100', '1111111', '0111110', '0110110', '1100011'],
  gem: ['0011100', '0111110', '1111111', '0111110', '0011100', '0001000'], ring: ['0011100', '0100010', '1000001', '1000001', '0100010', '0011100'] };
function chambers(sx, t) {
  const sp = sx * 0.55, gap = 76;
  for (let k = Math.floor(sp / gap) - 1; k < Math.floor(sp / gap) + 4; k++) {
    const x = Math.round(k * gap - sp + 20), c = CHAMBER[((k % 4) + 4) % 4];
    // the pipe that links them
    rect(x - 40, 150, gap, 6, '#4a4a64'); rect(x - 40, 150, gap, 1, '#8a8ab0'); rect(x - 40, 155, gap, 1, '#26263a');
    // cap and base, three-tone metal
    rect(x - 2, 156, 34, 10, '#5a5a78'); rect(x - 2, 156, 34, 2, '#a0a0c8'); rect(x - 2, 164, 34, 2, '#2e2e44');
    rect(x - 2, 236, 34, 14, '#5a5a78'); rect(x - 2, 236, 34, 2, '#a0a0c8'); rect(x - 2, 248, 34, 2, '#2e2e44');
    // the glass: liquid in three bands, a highlight down the left edge
    rect(x, 166, 30, 70, '#202038');
    rect(x + 1, 180, 28, 56, c.liquid[0]); rect(x + 1, 180, 28, 4, c.liquid[1]); rect(x + 1, 178, 28, 2, c.liquid[2]);
    rect(x + 3, 168, 2, 66, '#e8f0ff'); rect(x + 6, 168, 1, 66, '#9aa8d8');
    // the icon floats in the liquid, two-pixel bob
    const bob = Math.round(Math.sin(t * 3 + k) * 2), ic = ICON[c.icon];
    ic.forEach((row, y) => [...row].forEach((v, xx) => { if (v === '1') rect(x + 11 + xx, 198 + y + bob, 1, 1, c.liquid[2]); }));
    // bubbles
    for (let b = 0; b < 3; b++) { const ph = (t * 0.9 + b * 0.33 + k * 0.17) % 1; rect(x + 6 + ((b * 7 + k * 3) % 18), 234 - ph * 52, 2, 2, c.liquid[2]); }
    // the plate
    rect(x + 1, 226, 28, 9, '#141422'); drawText(g, 'T' + String(((k % 9) + 9) % 9 + 1).padStart(2, '0'), x + 6, 227, { fill: '#ffd060' });
  }
}

// ------------------------------------------------------------------ plane 1: the floor; plane 0: foreground pillars
function floor(sx) {
  rect(0, 250, W, 70, '#24243a');
  for (let r = 0; r < 6; r++) { const y = 254 + r * 11, sh = ['#3c3c5a', '#34344e', '#2c2c44', '#26263a', '#20202e', '#1a1a26'][r];
    rect(0, y, W, 10, sh); const off = -(sx * (1 + r * 0.08)) % 16;
    for (let x = off; x < W; x += 16) rect(x, y, 1, 10, '#14141e'); }
  // hazard edge: yellow and black in 8-pixel stripes
  const ho = -sx % 16; for (let x = ho - 16; x < W; x += 16) { rect(x, 250, 8, 4, '#f8c800'); rect(x + 8, 250, 8, 4, '#18181e'); }
}
function foreground(sx) {
  const sp = sx * 1.5, gap = 210;
  for (let k = Math.floor(sp / gap); k < Math.floor(sp / gap) + 2; k++) {
    const x = Math.round(k * gap - sp + 150);
    rect(x, 0, 22, H, '#0e0c18'); rect(x + 2, 0, 3, H, '#2a2440'); rect(x + 17, 0, 2, H, '#060510');
    for (let y = 30; y < H; y += 46) { rect(x - 3, y, 28, 5, '#1a1628'); rect(x - 3, y, 28, 1, '#3a3456'); }
  }
}

// ------------------------------------------------------------------ the runner: a shaded sprite with an outline pass
const spr = document.createElement('canvas'); spr.width = 40; spr.height = 44; const sg = spr.getContext('2d', { willReadFrequently: true });
const C = { out: '#1a1226', coat: ['#ffffff', '#c8d0e8', '#8890b0'], skin: ['#ffd8b0', '#e8a878', '#b87050'], hair: ['#7a4020', '#4a2410'],
  scarf: ['#ff4cb0', '#d0207c', '#8a1050'], pants: ['#3a4a8a', '#262f60'], shoe: ['#f04838', '#a82418'], gog: ['#80f0ff', '#2a8ab0'] };
function limb(ax, ay, bx, by, w, col) { const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1); for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; sg.fillStyle = col; sg.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); } }
function runner(frame, mode, t) {
  sg.clearRect(0, 0, 40, 44);
  const p = frame / 6 * Math.PI * 2, run = mode === 'run', skid = mode === 'skid';
  const bob = run ? (frame % 3 === 0 ? 1 : 0) : 0, hx = 18, hy = 26 + bob;
  const leg = (s, shade) => { const a = run ? Math.sin(p + s) * 0.9 : skid ? (s ? -0.5 : 0.7) : (s ? -0.15 : 0.15);
    const kx = hx + Math.sin(a) * 6, ky = hy + Math.cos(a) * 6, bend = run ? Math.max(0, -Math.cos(p + s)) * 4 : 0;
    const fx = kx + Math.sin(a - 0.4) * 6 - bend, fy = Math.min(42, ky + 7);
    limb(hx, hy, kx, ky, 4, C.pants[shade]); limb(kx, ky, fx, fy, 4, C.pants[shade]); sg.fillStyle = C.shoe[shade]; sg.fillRect(Math.round(fx - 2), Math.round(fy - 1), 7, 3); sg.fillStyle = C.out; sg.fillRect(Math.round(fx - 2), Math.round(fy + 1), 7, 1); };
  const arm = (s, shade) => { const a = run ? -Math.sin(p + s) * 1.1 : skid ? 1.2 : 0.2, sx0 = 18, sy0 = 15 + bob;
    const ex = sx0 + Math.sin(a) * 5, ey = sy0 + Math.cos(a) * 5, wx = ex + Math.sin(a + 0.9) * 5, wy = ey + Math.cos(a + 0.9) * 4;
    limb(sx0, sy0, ex, ey, 3, C.coat[1 + shade]); limb(ex, ey, wx, wy, 3, C.coat[1 + shade]); sg.fillStyle = C.skin[shade]; sg.fillRect(Math.round(wx - 1), Math.round(wy - 1), 3, 3); };
  // the scarf streams back, waving
  for (let i = 0; i < 9; i++) { sg.fillStyle = C.scarf[i < 2 ? 0 : i % 2 ? 1 : 2]; sg.fillRect(15 - i * 1.6, 13 + bob + Math.round(Math.sin(t * 14 - i * 0.8) * (run ? 1.5 : 0.6)) + i * 0.3, 3, 3); }
  arm(Math.PI, 1); leg(Math.PI, 1);
  // coat body: three shades, light from the upper left
  sg.fillStyle = C.coat[1]; sg.fillRect(13, 13 + bob, 11, 16); sg.fillStyle = C.coat[0]; sg.fillRect(13, 13 + bob, 6, 13); sg.fillStyle = C.coat[2]; sg.fillRect(21, 15 + bob, 3, 13);
  sg.fillStyle = C.scarf[0]; sg.fillRect(14, 12 + bob, 10, 3); sg.fillStyle = C.scarf[1]; sg.fillRect(19, 13 + bob, 5, 2);
  leg(0, 0); arm(0, 0);
  // head: skin in three tones, spiky hair, goggles across the eyes
  sg.fillStyle = C.skin[0]; sg.fillRect(15, 3 + bob, 10, 9); sg.fillStyle = C.skin[1]; sg.fillRect(22, 5 + bob, 3, 7); sg.fillStyle = C.skin[2]; sg.fillRect(16, 11 + bob, 8, 1);
  sg.fillStyle = C.hair[0]; [[13, 1, 8, 4], [12, 3, 4, 5], [16, 0, 3, 2], [20, 1, 3, 2], [10, 4, 3, 2]].forEach(([x, y, w, h]) => sg.fillRect(x, y + bob, w, h));
  sg.fillStyle = C.hair[1]; sg.fillRect(13, 5 + bob, 3, 3);
  sg.fillStyle = C.gog[1]; sg.fillRect(16, 5 + bob, 10, 3); sg.fillStyle = C.gog[0]; sg.fillRect(19, 5 + bob, 3, 2); sg.fillRect(23, 5 + bob, 3, 2);
  // the outline: every empty pixel touching the sprite turns dark (an outline drawn into the sprite data, as in the era)
  const im = sg.getImageData(0, 0, 40, 44), d = im.data, solid = (x, y) => x >= 0 && y >= 0 && x < 40 && y < 44 && d[(y * 40 + x) * 4 + 3] > 0, add = [];
  for (let y = 0; y < 44; y++) for (let x = 0; x < 40; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push([x, y]);
  sg.fillStyle = C.out; add.forEach(([x, y]) => sg.fillRect(x, y, 1, 1));
  return spr;
}

// ------------------------------------------------------------------ the logo: a bitmap plane, rotated and scaled with nearest sampling
const LW = 176, LH = 64, logo = document.createElement('canvas'); logo.width = LW; logo.height = LH; const lg = logo.getContext('2d');
const HOT = ['#fff4a0', '#ffd848', '#ffa830', '#ff7a28', '#f04a30', '#c02838', '#8a1a40'], COOL = ['#e0ffff', '#a0f0ff', '#58c8ff', '#3088f0', '#2050c8'];
function paintLogo(shine) {
  lg.clearRect(0, 0, LW, LH);
  const sh = (x, y) => (shine !== null && Math.abs(x + y * 0.6 - shine) < 6);
  // GAMEPLAY: 3× pixels, a hot gradient by row, a shine band cycled diagonally across it
  const w1 = textWidth('GAMEPLAY', 3), x1 = Math.round((LW - w1) / 2);
  drawText(lg, 'GAMEPLAY', x1 + 2, 4, { px: 3, fill: '#2a0a30' });   // drop shadow plane
  drawText(lg, 'GAMEPLAY', x1, 2, { px: 3, outline: '#1a0820', fill: (x, y) => (sh(x * 3, y * 3) ? '#ffffff' : HOT[y]) });
  // LABORATORY: 2× bold, a cool gradient
  const w2 = textWidth('LABORATORY', 2, true), x2 = Math.round((LW - w2) / 2);
  drawText(lg, 'LABORATORY', x2 + 2, 33, { px: 2, bold: true, fill: '#081840' });
  drawText(lg, 'LABORATORY', x2, 31, { px: 2, bold: true, outline: '#081028', fill: (x, y) => (sh(x * 2, 30 + y * 2) ? '#ffffff' : COOL[Math.min(4, Math.floor(y * 0.75))]) });
  drawText(lg, '·  WEEKLY HIGHLIGHTS  ·', Math.round((LW - textWidth('·  WEEKLY HIGHLIGHTS  ·')) / 2), 53, { fill: '#ffd060' });
}

// ------------------------------------------------------------------ one frame
function draw(t, scr) {
  g = scr.g; t = Math.floor(t * 30) / 30; g.imageSmoothingEnabled = false;
  const sx = scrollAt(t);
  backWall(sx); chambers(sx, t); floor(sx);
  // the runner: 6-frame cycle at 12 frames a second, skidding to a stop
  const mode = t < T.run1 ? 'run' : t < T.stop + 0.15 ? 'skid' : 'stand';
  const fr = Math.floor(t * 12) % 6;
  g.drawImage(runner(fr, mode, t), 44 - 18, 262 - 42);
  foreground(sx);
  // master brightness steps down behind the logo (16 levels)
  const dim = Math.round(clamp((t - T.dim) / 0.4) * 7) / 16;
  if (dim > 0) { g.fillStyle = `rgba(8,4,20,${dim})`; g.fillRect(0, 0, W, H); }
  // the logo: rotate-and-scale in, then shine
  if (t >= T.logo0) {
    const k = clamp((t - T.logo0) / (T.logo1 - T.logo0)), e = 1 - Math.pow(1 - k, 3);
    const s = 0.08 + 0.92 * e, a = (1 - e) * Math.PI * 2.5;
    let shine = null; if (t >= T.shine0 && t < T.shine1) shine = -10 + (t - T.shine0) / (T.shine1 - T.shine0) * 230; else if (t >= T.shine2 && t < T.shine2 + 0.6) shine = -10 + (t - T.shine2) / 0.6 * 230;
    paintLogo(shine);
    g.save(); g.translate(W / 2, 96); g.rotate(a); g.scale(s, s); g.drawImage(logo, -LW / 2, -LH / 2); g.restore();
    // sparkles at the corners once it lands
    if (k >= 1) for (let i = 0; i < 4; i++) { const ph = Math.floor((t * 10 + i * 3) % 8); if (ph < 4) { const x = [16, 160, 26, 152][i], y = [62, 70, 128, 122][i], r = [1, 2, 3, 2][ph];
      rect(x - r, y, r * 2 + 1, 1, '#ffffff'); rect(x, y - r, 1, r * 2 + 1, '#ffffff'); } }
  }
  // WEEK 45 slides in from the right on a ribbon, with a one-step overshoot
  if (t >= T.week) { const k = clamp((t - T.week) / 0.25), x = Math.round(W - (W - 46) * k) + (k >= 1 && t < T.week + 0.33 ? -3 : 0);
    rect(x, 140, 92, 15, '#d0207c'); rect(x, 140, 92, 2, '#ff4cb0'); rect(x, 153, 92, 2, '#8a1050');
    drawText(g, 'WEEK 45', x + 12, 144, { px: 1, bold: true, fill: '#ffffff', outline: '#5a0a34' }); }
  // the console's colour depth: 5 bits a channel
  const im = g.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { d[i] &= 0xf8; d[i + 1] &= 0xf8; d[i + 2] &= 0xf8; } g.putImageData(im, 0, 0);
  return scr.c;
}

const steps = []; for (let t = 0.04; t < T.run1; t += 0.25) steps.push(+t.toFixed(3));
register({ w: W, h: H, seconds: SECONDS, events: { music: T.music, steps, skid: T.run1, logo0: T.logo0, logo1: T.logo1, shine0: T.shine0, shine2: T.shine2, week: T.week }, draw });
