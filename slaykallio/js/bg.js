// The backdrop: a summer park, painted in code and then put out of focus
// above and below the bench — a tilt-shift, so the bench reads as a tabletop
// diorama standing in a real place. The painting is the default; the seam for
// real photographs (and side-by-side stereo pairs) is `fromImage`, which
// crops one eye and applies the same focus bands, so a stereoscopic test is a
// URL and not a rewrite.

import * as THREE from 'three';

const W = 1280, H = 720;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function paintPark(theme, seed = 3) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rnd = rng(seed);
  const p = theme.park;
  const HZ = H * 0.56;                       // the horizon, a little above the middle

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, HZ);
  sky.addColorStop(0, p.sky[0]); sky.addColorStop(1, p.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HZ + 2);
  // a haze of high cloud
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) { const x = rnd() * W, y = rnd() * HZ * 0.5, w = 120 + rnd() * 260; ctx.beginPath(); ctx.ellipse(x, y, w, 18 + rnd() * 14, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;

  // the district behind the trees: a row of five-storey blocks and one tower
  ctx.fillStyle = theme.name === 'Fantasy' ? '#4a4660' : '#b9aa9c';
  for (let x = 0; x < W; x += 90 + rnd() * 60) { const h = 60 + rnd() * 70; ctx.fillRect(x, HZ - h, 80 + rnd() * 40, h); }
  // Kallio church's tower (or a keep, in the other skin)
  const tx = W * 0.62;
  ctx.fillStyle = theme.name === 'Fantasy' ? '#3a3650' : '#a89a8a';
  ctx.fillRect(tx - 22, HZ - 230, 44, 230);
  if (theme.name === 'Fantasy') { for (let i = 0; i < 4; i++) ctx.fillRect(tx - 22 + i * 12, HZ - 244, 8, 14); }
  else { ctx.beginPath(); ctx.moveTo(tx - 26, HZ - 230); ctx.lineTo(tx, HZ - 290); ctx.lineTo(tx + 26, HZ - 230); ctx.fill(); }
  // windows catching the sun
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  for (let i = 0; i < 60; i++) ctx.fillRect(rnd() * W, HZ - 20 - rnd() * 100, 4, 6);

  // tree line: three tones of canopy, back to front, lighter toward the top
  const canopy = (x, y, r, tones) => {
    for (let k = 0; k < tones.length; k++) {
      ctx.fillStyle = tones[k];
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * r * (0.7 - k * 0.15);
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - k * r * 0.18 + Math.sin(a) * d * 0.7, r * (0.55 - k * 0.1), 0, Math.PI * 2); ctx.fill();
      }
    }
  };
  for (let i = 0; i < 9; i++) canopy(i * W / 8 + rnd() * 60, HZ - 30 - rnd() * 40, 70 + rnd() * 50, p.canopy);
  // trunks
  ctx.fillStyle = '#4a3a2a';
  for (let i = 0; i < 7; i++) { const x = i * W / 6 + rnd() * 80; ctx.fillRect(x, HZ - 40, 8 + rnd() * 6, 60); }

  // grass, a path, and the far lawn
  const grass = ctx.createLinearGradient(0, HZ, 0, H);
  grass.addColorStop(0, p.grass); grass.addColorStop(1, mixHex(p.grass, '#2a4a1a', 0.5));
  ctx.fillStyle = grass; ctx.fillRect(0, HZ, W, H - HZ);
  ctx.fillStyle = p.path;
  ctx.beginPath(); ctx.moveTo(W * 0.3, HZ + 10); ctx.lineTo(W * 0.55, HZ + 10); ctx.lineTo(W * 1.05, H); ctx.lineTo(W * -0.2, H); ctx.fill();
  // sun on the grass
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffffc0';
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse(rnd() * W, HZ + 20 + rnd() * (H - HZ), 80 + rnd() * 120, 14, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // people on the lawn, far off: two dabs each
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W, y = HZ + 20 + rnd() * 90, s = 0.6 + (y - HZ) / 120;
    ctx.fillStyle = ['#e04060', '#4060e0', '#f0f0f0', '#f0c040', '#202030'][i % 5];
    ctx.fillRect(x, y - 16 * s, 7 * s, 16 * s);
    ctx.fillStyle = '#e8b898'; ctx.fillRect(x + 1, y - 22 * s, 5 * s, 6 * s);
  }
  // a couple of far benches
  ctx.fillStyle = mixHex(p.bench, '#000', 0.2);
  for (let i = 0; i < 3; i++) { const x = 100 + i * 420 + rnd() * 100, y = HZ + 40 + rnd() * 30; ctx.fillRect(x, y, 60, 6); ctx.fillRect(x, y - 10, 60, 4); }
  return c;
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = i => Math.round(((pa >> (16 - i * 8)) & 255) * (1 - t) + ((pb >> (16 - i * 8)) & 255) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

// The tilt-shift. A sharp band around the focus row, blurring in steps toward
// the top and bottom of the frame; a warm lift and a touch more saturation,
// because that is what a miniature-photo filter does and what makes a real
// park look like a model of one. Falls back to the sharp picture where the
// canvas has no `filter`.
export function tiltShift(src, { focus = 0.6, band = 0.14, maxBlur = 14 } = {}) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  const hasFilter = 'filter' in ctx;
  ctx.drawImage(src, 0, 0);
  if (!hasFilter) return c;
  const H = src.height, steps = 7;
  for (let i = 1; i <= steps; i++) {
    const blur = maxBlur * (i / steps) ** 1.4;
    ctx.filter = `blur(${blur.toFixed(1)}px) saturate(1.15) brightness(1.03)`;
    // above the band
    const topEnd = (focus - band / 2) * H * (1 - (i - 1) / steps);
    const topStart = (focus - band / 2) * H * (1 - i / steps);
    if (topEnd > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, Math.max(0, topStart) - blur, src.width, topEnd - Math.max(0, topStart) + blur * 2); ctx.clip();
      ctx.drawImage(src, 0, 0); ctx.restore();
    }
    // below the band
    const botStart = (focus + band / 2) * H + (H - (focus + band / 2) * H) * (i - 1) / steps;
    const botEnd = (focus + band / 2) * H + (H - (focus + band / 2) * H) * i / steps;
    ctx.save(); ctx.beginPath(); ctx.rect(0, botStart - blur, src.width, botEnd - botStart + blur * 2); ctx.clip();
    ctx.drawImage(src, 0, 0); ctx.restore();
  }
  ctx.filter = 'none';
  // vignette, the second half of the miniature look
  const g = ctx.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.45, c.width / 2, c.height / 2, c.height * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,0,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

// `focus` is where the sharp band sits, as a fraction down the frame. It is
// the BENCH'S ROW, handed in by the arena: a miniature photo is only convincing
// while the one sharp stripe lies on the thing you are looking at, and in
// portrait the bench is nowhere near where it is in landscape.
export function paintedPark(theme, seed, focus = 0.6) {
  const tex = new THREE.CanvasTexture(tiltShift(paintPark(theme, seed), { focus }));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A photograph as the park. `stereo: 'sbs'` takes a side-by-side pair and
// crops the chosen eye; a future stereoscopic display would ask for both.
export function fromImage(url, { stereo = null, eye = 'left', focus = 0.6 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      const sw = stereo === 'sbs' ? img.width / 2 : img.width;
      const sx = stereo === 'sbs' && eye === 'right' ? img.width / 2 : 0;
      c.width = Math.min(2048, sw); c.height = Math.round(c.width * img.height / sw);
      c.getContext('2d').drawImage(img, sx, 0, sw, img.height, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(tiltShift(c, { focus }));
      tex.colorSpace = THREE.SRGBColorSpace;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// The other half of a tilt-shift: something CLOSE and out of focus along the
// bottom edge. A miniature photo has one, and without it the near ground is
// the only sharp thing below the bench and the frame reads as flat.
export function paintForeground(theme) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  const rnd = rng(11);
  const p = theme.park;
  // grass blades and leaf clumps rising from the bottom edge
  for (let i = 0; i < 200; i++) {
    const x = rnd() * 1024, h = 60 + rnd() * 180;
    ctx.strokeStyle = i % 3 ? p.canopy[0] : p.canopy[1];
    ctx.lineWidth = 6 + rnd() * 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, 260); ctx.quadraticCurveTo(x + (rnd() - 0.5) * 60, 260 - h * 0.6, x + (rnd() - 0.5) * 110, 256 - h); ctx.stroke();
  }
  ctx.fillStyle = mixHex(p.canopy[0], '#000000', 0.35);
  for (let i = 0; i < 26; i++) { const x = rnd() * 1024; ctx.beginPath(); ctx.ellipse(x, 220 + rnd() * 40, 60 + rnd() * 90, 40 + rnd() * 40, rnd(), 0, Math.PI * 2); ctx.fill(); }
  // blur it and fade the top edge out, so it never draws a line across the game
  const out = document.createElement('canvas'); out.width = 1024; out.height = 256;
  const o = out.getContext('2d');
  if ('filter' in o) o.filter = 'blur(16px)';
  o.drawImage(c, 0, 0);
  o.filter = 'none';
  o.globalCompositeOperation = 'destination-in';
  const grad = o.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.75)'); grad.addColorStop(1, 'rgba(0,0,0,0.95)');
  o.fillStyle = grad; o.fillRect(0, 0, 1024, 256);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
