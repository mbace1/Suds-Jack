// The studio's toolkit: a cut-paper diorama drawn in canvas 2D at 1080×1920.
//
// A SHEET is one piece of card: the shape is drawn, fibre texture is laid over
// its own pixels only, and it is dropped onto the stack with a soft shadow.
// Stack enough sheets and depth happens by itself — which is why every scene
// in the studio is built from sheets rather than painted.
//
// Everything is a pure function of time. Nothing here keeps state between
// frames except the buffer pool, which is reset by `beginFrame()`.

export const W = 1080, H = 1920, TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k = clamp(k), k * k * (3 - 2 * k));
export const eout = (k) => 1 - (1 - clamp(k)) ** 3;
export const ein = (k) => clamp(k) ** 3;
/** ease out with overshoot — the pop */
export const eob = (k) => { k = clamp(k); const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
/** a damped spring from 0 to 1 — the wobble a card makes when it lands */
export const spring = (k, f = 3.2, d = 5) => (k <= 0 ? 0 : 1 - Math.exp(-d * k) * Math.cos(f * TAU * k));

export function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const canvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

export const PAL = {
  cream: '#fbf3e4', card: '#fff8ea', ink: '#1f1d33', inkSoft: '#4a4766',
  toko: '#f0027f', pink: '#ff7eb6', coral: '#ff6b5b', red: '#e23a3a',
  sun: '#ffd166', gold: '#f4b93a', mint: '#3fc6a4', green: '#2e9e5b',
  sky: '#5ab8ff', blue: '#2f6fd0', violet: '#6c4fd6', deep: '#2b2a5c',
  wood: '#b9784a', woodD: '#8a5433', wall: '#f6d9b8', wallD: '#eec59c',
  glass: 'rgba(200,236,255,.35)',
};

let fibreTex = null;
export function fibre() {
  if (fibreTex) return fibreTex;
  fibreTex = canvas(384, 384);
  const g = fibreTex.getContext('2d'), r = rng(9);
  const im = g.createImageData(384, 384);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 30;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 280; i++) {
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.13)'; g.lineWidth = 1;
    const x = r() * 384, y = r() * 384, a = r() * TAU, l = 6 + r() * 22;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return fibreTex;
}

// a pool of full-frame buffers, handed out in order and reclaimed per frame
const pool = [];
let used = 0;
export function beginFrame() { used = 0; }
function buffer() {
  const c = pool[used] || (pool[used] = canvas());
  used++;
  const g = c.getContext('2d');
  // a pooled buffer must not remember the last shot's textAlign, font or
  // transform — it did, and a later caption header drew centred off the card
  g.reset();
  return [c, g];
}

/**
 * Draw one sheet of card. `draw(g)` paints the shape in its own colours; the
 * fibre goes on top of that, clipped to it, and the result lands on `ctx`
 * with a drop shadow `lift` px deep (0 = glued flat to the one below).
 */
export function sheet(ctx, draw, { lift = 16, tex = 0.5, alpha = 1 } = {}) {
  const [buf, b] = buffer(), [msk, m] = buffer();
  draw(b); draw(m);
  b.globalCompositeOperation = 'overlay'; b.globalAlpha = tex;
  b.fillStyle = b.createPattern(fibre(), 'repeat'); b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = 'destination-in'; b.globalAlpha = 1; b.drawImage(msk, 0, 0);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (lift > 0) {
    ctx.shadowColor = 'rgba(30,14,50,.42)'; ctx.shadowBlur = lift * 1.5;
    ctx.shadowOffsetY = lift * 0.7; ctx.shadowOffsetX = lift * 0.22;
  }
  ctx.drawImage(buf, 0, 0);
  ctx.restore();
  used -= 2;                       // the pair is free again once composited
}

export function round(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** a horizontal band with a wavy top edge, filled down to `bottom` */
export function wavy(c, y, amp, per, ph, color, bottom = H) {
  c.fillStyle = color; c.beginPath(); c.moveTo(-20, bottom);
  for (let x = -20; x <= W + 20; x += 12) {
    c.lineTo(x, y + Math.sin(x / per + ph) * amp + Math.sin(x / (per * 0.37) + ph * 1.7) * amp * 0.3);
  }
  c.lineTo(W + 20, bottom); c.fill();
}

/** radiating paper rays — the sunburst behind a reveal */
export function rays(c, cx, cy, n, rot, a, b) {
  const R = Math.hypot(W, H);
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = a0 + TAU / n / 2;
    c.fillStyle = i % 2 ? a : b; c.beginPath(); c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); c.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); c.fill();
  }
}

// tilt-shift: a quarter-size blurred copy faded in above and below a band
let tiltSmall = null;
export function tiltShift(ctx, focusY, band, amount = 1) {
  tiltSmall = tiltSmall || canvas(W / 4, H / 4);
  const s = tiltSmall.getContext('2d');
  s.clearRect(0, 0, W / 4, H / 4); s.filter = 'blur(3px)'; s.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); s.filter = 'none';
  const [buf, b] = buffer();
  b.drawImage(tiltSmall, 0, 0, W, H);
  const g = b.createLinearGradient(0, 0, 0, H), a = clamp((focusY - band) / H), z = clamp((focusY + band) / H);
  g.addColorStop(0, `rgba(0,0,0,${amount})`); g.addColorStop(a, 'rgba(0,0,0,0)');
  g.addColorStop(z, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${amount})`);
  b.globalCompositeOperation = 'destination-in'; b.fillStyle = g; b.fillRect(0, 0, W, H);
  ctx.drawImage(buf, 0, 0);
  used--;
}

/** wrap words to a width with the current font; returns [{words, w}] lines */
export function wrap(ctx, words, maxW) {
  const lines = []; let cur = [];
  for (const w of words) {
    const test = [...cur, w].map(x => x.text).join(' ');
    if (cur.length && ctx.measureText(test).width > maxW) { lines.push(cur); cur = [w]; } else cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines;
}
