// The backdrop: the park behind the bridge, painted in code and then put out
// of focus above and below the deck — a tilt-shift, so the bridge reads as a
// model standing in a real place.
//
// Owner, 2026-09-04: it should look like tilt-shift NATURE, and a real photo
// is fair game. So the painting is built to be photographic rather than
// cartoon — a tonal ramp per band instead of flat colour, haze that eats
// contrast with distance, canopy in scattered clumps rather than lollipops,
// and a grain and vignette over the lot. `fromImage` is the same picture done
// with a real plate. The painting is the default; the seam for
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

  // sky: overcast, warming toward the horizon, with broken cloud
  const sky = ctx.createLinearGradient(0, 0, 0, HZ);
  sky.addColorStop(0, p.sky[0]); sky.addColorStop(0.7, mixHex(p.sky[0], p.sky[1], 0.6)); sky.addColorStop(1, p.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HZ + 2);
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.05 + rnd() * 0.12;
    ctx.fillStyle = rnd() > 0.4 ? '#e8e0d0' : '#6a6f78';
    const x = rnd() * W, y = rnd() * HZ * 0.72, w = 90 + rnd() * 320;
    ctx.beginPath(); ctx.ellipse(x, y, w, 12 + rnd() * 26, 0, 0, Math.PI * 2); ctx.fill();
  }
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

  // Tree line. A real canopy is a mass of small broken shapes, not three
  // lollipops: each tree is 40 scattered dabs whose size falls off toward the
  // outside, drawn dark first and lit only where the sky can reach.
  const canopy = (x, y, r, tones, haze) => {
    for (let k = 0; k < tones.length; k++) {
      for (let i = 0; i < 40; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * (0.95 - k * 0.24);
        const px = x + Math.cos(a) * d, py = y - k * r * 0.2 + Math.sin(a) * d * 0.62;
        ctx.globalAlpha = (0.55 + rnd() * 0.45) * (1 - haze * 0.55);
        ctx.fillStyle = tones[k];
        ctx.beginPath(); ctx.arc(px, py, r * (0.1 + rnd() * 0.13), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };
  // a far, hazed row and a near, contrasty one — depth is the haze, not the size
  for (let i = 0; i < 11; i++) canopy(i * W / 10 + rnd() * 70, HZ - 46 - rnd() * 40, 60 + rnd() * 40, p.canopy, 0.75);
  for (let i = 0; i < 8; i++) canopy(i * W / 7 + rnd() * 90, HZ - 18 - rnd() * 46, 78 + rnd() * 52, p.canopy, 0.15);
  // trunks, dark and never quite vertical
  for (let i = 0; i < 9; i++) {
    const x = i * W / 8 + rnd() * 70;
    ctx.strokeStyle = '#241c14'; ctx.lineWidth = 5 + rnd() * 7;
    ctx.beginPath(); ctx.moveTo(x, HZ + 12); ctx.lineTo(x + (rnd() - 0.5) * 18, HZ - 50 - rnd() * 30); ctx.stroke();
  }

  // the water this bridge crosses, and the bank on the far side
  const bank = ctx.createLinearGradient(0, HZ, 0, HZ + 90);
  bank.addColorStop(0, mixHex(p.grass, '#8a8272', 0.35)); bank.addColorStop(1, p.grass);
  ctx.fillStyle = bank; ctx.fillRect(0, HZ, W, 90);
  const water = ctx.createLinearGradient(0, HZ + 80, 0, H);
  water.addColorStop(0, mixHex(p.water ?? '#3a4448', '#000000', 0.15));
  water.addColorStop(1, mixHex(p.water ?? '#3a4448', '#8a9aa0', 0.35));
  ctx.fillStyle = water; ctx.fillRect(0, HZ + 80, W, H - HZ - 80);
  // the tree line's reflection, smeared vertically the way still water does it
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 200; i++) {
    const x = rnd() * W, y = HZ + 86 + rnd() * (H - HZ - 90);
    ctx.fillStyle = rnd() > 0.4 ? p.canopy[0] : '#5a6a58';
    ctx.fillRect(x, y, 10 + rnd() * 40, 2 + rnd() * 3);
  }
  ctx.globalAlpha = 1;
  // a few flat glints where the sky lands on it
  for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = 0.08 + rnd() * 0.16;
    ctx.fillStyle = '#c8d2d4';
    ctx.fillRect(rnd() * W, HZ + 92 + rnd() * (H - HZ - 100), 20 + rnd() * 90, 1 + rnd() * 2);
  }
  ctx.globalAlpha = 1;
  // reeds along the far bank, broken and uneven
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, h = 8 + rnd() * 26;
    ctx.strokeStyle = rnd() > 0.5 ? '#3f4a2a' : '#5a6238'; ctx.lineWidth = 1 + rnd() * 2;
    ctx.beginPath(); ctx.moveTo(x, HZ + 84); ctx.lineTo(x + (rnd() - 0.5) * 12, HZ + 84 - h); ctx.stroke();
  }
  // a few figures on the far bank, small and desaturated — they are 80 metres
  // away and out of focus, so they are two dabs and no more
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W, y = HZ + 30 + rnd() * 46, sc = 0.5 + (y - HZ) / 150;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = ['#6a4a4a', '#3a4a5a', '#8a8478', '#5a5a4a', '#2a2a30'][i % 5];
    ctx.fillRect(x, y - 15 * sc, 6 * sc, 15 * sc);
    ctx.fillStyle = '#9a7a62'; ctx.fillRect(x + 1, y - 20 * sc, 4 * sc, 5 * sc);
    ctx.globalAlpha = 1;
  }
  // haze over the far half: distance eats contrast before it eats detail
  const haze = ctx.createLinearGradient(0, HZ - 120, 0, HZ + 30);
  haze.addColorStop(0, 'rgba(190,196,196,0)');
  haze.addColorStop(1, 'rgba(190,196,196,0.34)');
  ctx.fillStyle = haze; ctx.fillRect(0, HZ - 120, W, 150);
  // film grain over everything, which is most of what makes a painting read
  // as a photograph once it is blurred
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }
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
export function tiltShift(src, { focus = 0.6, band = 0.12, maxBlur = 18 } = {}) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const ctx = c.getContext('2d');
  const hasFilter = 'filter' in ctx;
  ctx.drawImage(src, 0, 0);
  if (!hasFilter) return c;
  const H = src.height, steps = 7;
  for (let i = 1; i <= steps; i++) {
    const blur = maxBlur * (i / steps) ** 1.4;
    ctx.filter = `blur(${blur.toFixed(1)}px) saturate(0.92) contrast(1.06) brightness(0.99)`;
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
  const g = ctx.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.34, c.width / 2, c.height / 2, c.height * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(12,10,8,0.5)');
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
  for (let i = 0; i < 240; i++) {
    const x = rnd() * 1024, h = 50 + rnd() * 190;
    ctx.strokeStyle = [p.canopy[0], p.canopy[1], '#5a5236', '#3a3a28'][i % 4];
    ctx.lineWidth = 5 + rnd() * 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, 260); ctx.quadraticCurveTo(x + (rnd() - 0.5) * 70, 260 - h * 0.6, x + (rnd() - 0.5) * 120, 256 - h); ctx.stroke();
  }
  // something pale in the weeds, because this is a canal bank in Kallio
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#8a8f94' : '#8f8a72'; ctx.beginPath(); ctx.ellipse(rnd() * 1024, 200 + rnd() * 50, 14 + rnd() * 16, 7 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill(); }
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
