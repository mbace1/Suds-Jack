// Props: the things a tech-satire set is made of, each a flat cut shape with
// one or two tones of the same card. They draw into whatever context they are
// given, so the same prop can be a sheet of its own or part of a bigger one.

import { TAU, PAL, round, rng, clamp } from './paper.js';
import { drawMasterBadge } from '../../toko/js/master.js';

/** the product: a brain in a jar. `glow` 0..1 lights it from inside */
export function jar(c, x, y, s, t, { glow = 0, lid = PAL.gold } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  // glass body
  round(c, -90, -200, 180, 200, 34); c.fillStyle = 'rgba(214,240,255,.92)'; c.fill();
  // the brain
  const bob = Math.sin(t * 2.2 + x) * 4;
  c.fillStyle = glow > 0 ? `rgb(255,${130 + glow * 60},${190 + glow * 30})` : PAL.pink;
  c.beginPath();
  for (const [bx, by, br] of [[-34, -110, 40], [0, -126, 44], [34, -110, 40], [-18, -80, 36], [20, -80, 36]]) {
    c.moveTo(bx + br, by + bob); c.arc(bx, by + bob, br, 0, TAU);
  }
  c.fill();
  c.strokeStyle = '#d4488c'; c.lineWidth = 5; c.lineCap = 'round';
  for (const [ax, ay] of [[-40, -118], [-6, -134], [28, -112], [-16, -88], [16, -92]]) {
    c.beginPath(); c.moveTo(ax, ay + bob); c.bezierCurveTo(ax + 10, ay - 12 + bob, ax + 18, ay + 12 + bob, ax + 26, ay + bob); c.stroke();
  }
  // liquid line and highlight
  c.fillStyle = 'rgba(90,184,255,.22)'; round(c, -84, -150, 168, 144, 28); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; round(c, -70, -186, 18, 120, 9); c.fill();
  // lid
  c.fillStyle = lid; round(c, -100, -226, 200, 34, 10); c.fill();
  c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-100, -200, 200, 8);
  c.restore();
}

/** a swinging price tag on a string from (x, y) */
export function tag(c, x, y, s, t, text, { color = PAL.card, ink = PAL.ink, swing = 1, font = 'Archivo Black' } = {}) {
  const a = Math.sin(t * 2.4 + x * 0.01) * 0.14 * swing;
  c.save(); c.translate(x, y); c.rotate(a);
  c.strokeStyle = PAL.inkSoft; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 46 * s); c.stroke();
  c.translate(0, 46 * s);
  const w = 150 * s, h = 84 * s;
  c.fillStyle = color; c.beginPath();
  c.moveTo(-w / 2 + 22 * s, 0); c.lineTo(w / 2 - 22 * s, 0); c.lineTo(w / 2, 22 * s); c.lineTo(w / 2, h);
  c.lineTo(-w / 2, h); c.lineTo(-w / 2, 22 * s); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(0, 14 * s, 6 * s, 0, TAU); c.fill();
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `${Math.round(38 * s)}px "${font}"`; c.fillText(text, 0, 54 * s);
  c.restore();
  return a;
}

/** an ink impression on a tag: rotated, roughened, a little transparent */
export function stampMark(c, x, y, s, text, k, color = PAL.red) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(-0.18); c.scale(s * (1.3 - 0.3 * k), s * (1.3 - 0.3 * k));
  c.globalAlpha = 0.9 * clamp(k * 2);
  c.strokeStyle = color; c.lineWidth = 7; round(c, -92, -44, 184, 88, 14); c.stroke();
  c.fillStyle = color; c.font = '64px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 0, 4);
  // starved ink: knock specks out of it
  const r = rng(Math.round(x + y));
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 40; i++) { c.beginPath(); c.arc((r() - 0.5) * 180, (r() - 0.5) * 84, 1 + r() * 3, 0, TAU); c.fill(); }
  c.restore();
}

/** the big rubber stamp. `drop` 0 = raised out of frame, 1 = on the paper */
export function stamp(c, x, y, s, drop) {
  const lift = (1 - drop) * 900;
  c.save(); c.translate(x, y - lift); c.scale(s, s);
  c.fillStyle = PAL.woodD; c.beginPath(); c.ellipse(0, -330, 70, 60, 0, 0, TAU); c.fill();       // knob
  c.fillStyle = PAL.wood; round(c, -26, -300, 52, 150, 16); c.fill();                            // neck
  c.fillStyle = PAL.wood; round(c, -130, -170, 260, 110, 22); c.fill();                          // block
  c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(-130, -90, 260, 30);
  c.fillStyle = PAL.red; round(c, -120, -62, 240, 62, 10); c.fill();                             // rubber
  c.restore();
}

/** a customer: a paper person with a laptop, looking `look` (-1..1) */
export function person(c, x, y, s, t, { body = PAL.blue, skin = '#f2c3a0', hair = PAL.ink, look = 0, screen = 0.8, sip = 0 } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const breathe = Math.sin(t * 2 + x) * 2;
  c.fillStyle = body; round(c, -58, -230 + breathe, 116, 230 - breathe, 40); c.fill();       // coat
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-4, -200 + breathe, 8, 200);
  c.fillStyle = skin; c.beginPath(); c.arc(0, -282 + breathe, 50, 0, TAU); c.fill();         // head
  c.fillStyle = hair; c.beginPath(); c.arc(0, -292 + breathe, 52, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  c.fillStyle = PAL.ink;                                                                      // eyes
  for (const ex of [-18, 18]) { c.beginPath(); c.arc(ex + look * 12, -280 + breathe, 6, 0, TAU); c.fill(); }
  // laptop held at the chest, lighting the face
  c.fillStyle = '#3a3a4a'; round(c, -70, -150, 140, 16, 6); c.fill();
  c.save(); c.translate(0, -150); c.rotate(-0.35);
  c.fillStyle = '#2a2a38'; round(c, -66, -96, 132, 96, 8); c.fill();
  c.fillStyle = `rgba(120,220,255,${screen})`; round(c, -58, -88, 116, 80, 5); c.fill();
  c.restore();
  if (sip > 0) { // a coffee cup raised to the mouth
    const k = Math.sin(clamp(sip) * Math.PI);
    c.fillStyle = PAL.card; round(c, 48, -250 - k * 30, 34, 44, 6); c.fill();
    c.fillStyle = PAL.coral; c.fillRect(48, -236 - k * 30, 34, 10);
  }
  c.restore();
}

/** the exit: a door frame with a door that swings open by `open` 0..1 */
export function door(c, x, y, s, open, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = PAL.inkSoft; c.fillRect(-120, -520, 240, 520);                 // frame
  // what is outside: daylight
  const g = c.createLinearGradient(0, -500, 0, 0); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#fff3c4');
  c.fillStyle = g; c.fillRect(-100, -500, 200, 500);
  // the door, foreshortened as it opens toward us
  const w = 200 * (1 - open * 0.85);
  c.fillStyle = PAL.coral; c.fillRect(-100, -500, w, 500);
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-100 + w - 10, -500, 10, 500);
  c.fillStyle = PAL.sun; c.beginPath(); c.arc(-100 + w - 26, -250, 10, 0, TAU); c.fill();
  // the sign, glowing
  c.fillStyle = PAL.green; round(c, -90, -600, 180, 64, 10); c.fill();
  c.fillStyle = '#eafff2'; c.font = '44px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.globalAlpha = 0.85 + 0.15 * Math.sin(t * 9); c.fillText('EXIT', 0, -566); c.globalAlpha = 1;
  c.restore();
}

/** a tumbleweed rolling along a floor line */
export function tumbleweed(c, x, y, s, t) {
  c.save(); c.translate(x, y - 60 * s + Math.abs(Math.sin(t * 5)) * -30 * s); c.rotate(t * 5); c.scale(s, s);
  c.strokeStyle = '#b08850'; c.lineWidth = 5;
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, b = a + 1 + r() * 2.5, rr = 30 + r() * 30;
    c.beginPath(); c.arc(0, 0, rr, a, b); c.stroke();
  }
  c.restore();
}

/** a stack of `n` coins, bottom at (x, y) */
export function coins(c, x, y, s, n, { face = PAL.gold, edge = '#c98d1e' } = {}) {
  for (let i = 0; i < n; i++) {
    const cy = y - i * 22 * s, dx = Math.sin(i * 1.7) * 4 * s;
    c.fillStyle = edge; c.beginPath(); c.ellipse(x + dx, cy, 80 * s, 26 * s, 0, 0, TAU); c.fill();
    c.fillStyle = face; c.beginPath(); c.ellipse(x + dx, cy - 8 * s, 80 * s, 26 * s, 0, 0, TAU); c.fill();
  }
}

/** a pie cut to `k` (0..1) of the way round, starting at twelve o'clock */
export function pie(c, x, y, r, k, a = PAL.mint, b = PAL.card) {
  c.fillStyle = b; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = a; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.closePath(); c.fill();
}

/** a balloon of radius r on a string down to (x, y) */
export function balloon(c, x, y, r, t, color = PAL.coral) {
  const cx = x + Math.sin(t * 1.4) * 14, cy = y - 260 - r;
  c.strokeStyle = PAL.inkSoft; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y - 90, cx - 30, cy + r + 80, cx, cy + r + 10); c.stroke();
  c.fillStyle = color; c.beginPath(); c.ellipse(cx, cy, r * 0.92, r, Math.sin(t * 1.4) * 0.06, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(cx - 14, cy + r + 14); c.lineTo(cx + 14, cy + r + 14); c.lineTo(cx, cy + r - 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.14, r * 0.26, -0.5, 0, TAU); c.fill();
  return { cx, cy };
}

/** a chain of links along a quadratic curve, drawn to fraction `k` */
export function chain(c, x0, y0, qx, qy, x1, y1, k, s = 1) {
  const n = 22, m = Math.floor(n * clamp(k));
  for (let i = 0; i < m; i++) {
    const u = i / n, v = 1 - u;
    const x = v * v * x0 + 2 * v * u * qx + u * u * x1, y = v * v * y0 + 2 * v * u * qy + u * u * y1;
    const dx = 2 * v * (qx - x0) + 2 * u * (x1 - qx), dy = 2 * v * (qy - y0) + 2 * u * (y1 - qy);
    c.save(); c.translate(x, y); c.rotate(Math.atan2(dy, dx) + (i % 2 ? Math.PI / 2 : 0) * 0.0);
    c.strokeStyle = i % 2 ? '#9aa3b5' : '#c5ccd9'; c.lineWidth = 7 * s;
    c.beginPath(); c.ellipse(0, 0, 18 * s, (i % 2 ? 5 : 10) * s, 0, 0, TAU); c.stroke();
    c.restore();
  }
}

/** a padlock; `shut` 0..1 closes the shackle */
export function padlock(c, x, y, s, shut) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#9aa3b5'; c.lineWidth = 18;
  c.beginPath(); c.arc(0, -60 - (1 - shut) * 40, 44, Math.PI, 0); c.lineTo(44, -60 + shut * 10 - (1 - shut) * 40); c.stroke();
  c.fillStyle = PAL.gold; round(c, -72, -64, 144, 120, 18); c.fill();
  c.fillStyle = PAL.ink; c.beginPath(); c.arc(0, -16, 14, 0, TAU); c.fill(); c.fillRect(-6, -16, 12, 40);
  c.restore();
}

/** Toko, the original traced face as a clay badge on a puppet rod */
export function toko(c, x, y, r, t, { rod = true, pop = 1, tilt = 0 } = {}) {
  if (pop <= 0) return;
  if (rod) { c.fillStyle = PAL.woodD; c.fillRect(x - 6, y, 12, 1200); }
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.7) * 0.07 + tilt); c.scale(pop, pop);
  drawMasterBadge(c, 0, 0, r, { ground: PAL.toko, ink: '#ffffff' });
  // clay: a soft top-left light and a darker rim
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,0,40,.38)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.restore();
}

/** the shop front: awning stripes and a sign, across the top of frame */
export function awning(c, y, t, sign) {
  const n = 9, w = 1080 / n + 1;
  for (let i = 0; i < n; i++) {
    c.fillStyle = i % 2 ? PAL.card : PAL.coral;
    c.beginPath(); c.moveTo(i * w, y); c.lineTo(i * w + w, y); c.lineTo(i * w + w, y + 120);
    c.arc(i * w + w / 2, y + 120, w / 2, 0, Math.PI); c.closePath(); c.fill();
  }
  c.fillStyle = PAL.deep; round(c, 90, y - 150, 900, 130, 22); c.fill();
  c.fillStyle = PAL.sun; c.font = '70px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(sign, 540, y - 84);
}
