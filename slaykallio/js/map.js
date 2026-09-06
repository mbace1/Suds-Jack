// The route, as a torn-paper map.
//
// Owner's reference (2026-09-05): a city map of Kallio made of torn dark
// paper — layered districts, a tape line for the walked route, coloured paper
// discs pinned where something is. The route data was already the whole map
// (`buildRoute` rolls every step up front); this draws it, so the fork becomes
// a place on a map you can see ahead on, rather than a row of buttons.
//
// Everything is drawn from `pos(step, option)`, which is the one place the
// orientation lives: landscape runs the route left to right, portrait runs it
// bottom to top, and the text stays upright in both because nothing is
// rotated — only the positions swap axes. The paper is tinted by the hour, so
// the same map is kraft in the afternoon and near-black at night.
//
// Nothing here knows what a "fight" is beyond its kind: the caller hands in a
// `nameOf(node)` for the labels.

const KIND_TINT = { fight: '#c9973a', elite: '#b8412c', event: '#5d8ea8', rest: '#7aa35a', boss: '#8a1e1e' };

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = i => Math.round(((pa >> (16 - i * 8)) & 255) * (1 - t) + ((pb >> (16 - i * 8)) & 255) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}
function shade(rgb, k) {
  const m = rgb.match(/\d+/g).map(Number);
  return `rgb(${m.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
}

// a torn edge: a polygon whose sides wander, with a pale fibre rim where the
// paper's core shows — that rim is what makes an edge torn rather than cut
function tornPath(ctx, pts, rnd, amp = 4) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    const segs = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * amp, y = y0 + (y1 - y0) * t + (rnd() - 0.5) * amp;
      if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}
function tornPiece(ctx, pts, fill, rnd, { rim = 'rgba(235,225,200,0.55)', shadow = true, amp = 4 } = {}) {
  if (shadow) { ctx.save(); ctx.translate(2, 3); ctx.fillStyle = 'rgba(0,0,0,0.35)'; tornPath(ctx, pts, rng(7), amp); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = fill; tornPath(ctx, pts, rnd, amp); ctx.fill();
  ctx.strokeStyle = rim; ctx.lineWidth = 1.2; ctx.stroke();
}

function paperTexture(ctx, w, h, rnd, dark) {
  // fibres and specks: a paper is a felt of short light lines and dark dots
  for (let i = 0; i < w * h / 260; i++) {
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 3 + rnd() * 9;
    ctx.strokeStyle = rnd() > 0.5 ? `rgba(255,248,230,${dark ? 0.05 : 0.14})` : `rgba(20,14,8,${dark ? 0.16 : 0.08})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  for (let i = 0; i < w * h / 900; i++) { ctx.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`; ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd()); }
}

function tape(ctx, x, y, w, h, angle, rnd) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(232,214,160,0.55)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(255,250,235,0.25)';
  for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + rnd() * w, -h / 2, 1, h);
  ctx.restore();
}

function symbol(ctx, kind, x, y, r, ink) {
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = Math.max(1.6, r * 0.16); ctx.lineCap = 'round';
  switch (kind) {
    case 'fight':                                                  // two crossed sticks
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.5, y + r * 0.5); ctx.moveTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x - r * 0.5, y + r * 0.5); ctx.stroke(); break;
    case 'elite': {                                                 // a star
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.28 : r * 0.62; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); break;
    }
    case 'event':                                                  // an eye: something is there
      ctx.beginPath(); ctx.moveTo(x - r * 0.6, y); ctx.quadraticCurveTo(x, y - r * 0.7, x + r * 0.6, y); ctx.quadraticCurveTo(x, y + r * 0.7, x - r * 0.6, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    case 'rest':                                                   // a moon
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x + r * 0.28, y - r * 0.18, r * 0.48, 0, Math.PI * 2); ctx.fill(); ctx.restore(); break;
    case 'boss':                                                   // a paw
      for (const [dx, dy] of [[-0.42, -0.36], [-0.14, -0.55], [0.14, -0.55], [0.42, -0.36]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * 0.16, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.18, r * 0.4, r * 0.34, 0, 0, Math.PI * 2); ctx.fill(); break;
    default: break;
  }
}

// Draws the map and returns where every pin landed (CSS pixels), so the caller
// can lay real buttons over the ones that can be chosen.
export function drawMap(cv, { route, act, hour = 0, portrait = false, nameOf = () => '', bossName = '', seed = 1 } = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = rng(seed * 31 + act * 7);
  const dark = hour > 0.5;
  const t = Math.max(0, Math.min(1, hour));

  // ── the paper, tinted by the hour ──
  const base = lerpHex('#c9b58f', '#2b2a30', t), district = lerpHex('#b9a47c', '#38363e', t), street = lerpHex('#e2d3ae', '#4a4852', t);
  const ink = lerpHex('#2a2018', '#e8e0d0', t), faint = lerpHex('#6a5a42', '#8a8898', t);
  ctx.clearRect(0, 0, w, h);
  tornPiece(ctx, [[6, 8], [w - 8, 4], [w - 4, h - 10], [10, h - 6]], base, rnd, { amp: 5, shadow: false });
  ctx.save(); tornPath(ctx, [[6, 8], [w - 8, 4], [w - 4, h - 10], [10, h - 6]], rng(seed * 31 + act * 7), 5); ctx.clip();
  // districts: three or four big pieces of a darker paper laid on top, with streets between
  for (let i = 0; i < 4; i++) {
    const cx = rnd() * w, cy = rnd() * h, rw = 90 + rnd() * w * 0.32, rh = 70 + rnd() * h * 0.42;
    const pts = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + rnd() * 0.4; pts.push([cx + Math.cos(a) * rw, cy + Math.sin(a) * rh]); }
    tornPiece(ctx, pts, shade(district, 0.9 + rnd() * 0.25), rnd, { rim: dark ? 'rgba(200,196,210,0.22)' : 'rgba(240,232,210,0.5)', amp: 6 });
  }
  ctx.strokeStyle = street; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(rnd() * w, rnd() * h); ctx.lineTo(rnd() * w, rnd() * h); ctx.stroke(); }
  ctx.globalAlpha = 1;
  paperTexture(ctx, w, h, rnd, dark);
  ctx.restore();

  // ── positions: the one place the orientation lives ──
  const S = route.steps.length;
  const m = portrait ? { a: 54, b: 40 } : { a: 64, b: 48 };
  const pos = (i, j, n) => {
    const along = (i + 0.5) / (S + 1);                        // steps 0..S-1, the boss at S
    const spread = n <= 1 ? 0 : (j / (n - 1) - 0.5);
    if (portrait) return { x: w / 2 + spread * (w - 2 * m.b) * 0.8, y: h - m.a - along * (h - 2 * m.a) };
    return { x: m.a + along * (w - 2 * m.a), y: h / 2 + spread * (h - 2 * m.b) * 0.7 };
  };
  const bossAt = pos(S, 0, 1);

  // the trunk: a faint tape from the start to the boss, along the middle
  const start = portrait ? { x: w / 2, y: h - m.a * 0.55 } : { x: m.a * 0.55, y: h / 2 };
  ctx.strokeStyle = faint; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(bossAt.x, bossAt.y); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;

  // the walked route: a strip of tape through the spans you chose
  const walked = [start, ...route.done.map((node, i) => { const j = route.steps[i].indexOf(node); return pos(i, Math.max(0, j), route.steps[i].length); })];
  if (walked.length > 1) {
    ctx.strokeStyle = 'rgba(232,214,160,0.75)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); walked.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,40,30,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
  }
  // threads from where you stand to what you can choose next
  const here = walked[walked.length - 1];
  const cur = route.step;
  if (cur < S) {
    ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]); ctx.globalAlpha = 0.7;
    route.steps[cur].forEach((_, j) => { const p = pos(cur, j, route.steps[cur].length); ctx.beginPath(); ctx.moveTo(here.x, here.y); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  // ── the pins ──
  const pins = [];
  const pin = (x, y, r, kind, { done = false, current = false, future = false, big = false } = {}) => {
    const tint = KIND_TINT[kind] ?? '#888';
    ctx.save();
    if (future) ctx.globalAlpha = 0.42;
    // a paper disc, torn, on a shadow; the pinhead above it
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, r, 0, Math.PI * 2); ctx.fill();
    const disc = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; disc.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    ctx.fillStyle = done ? shade(tint, 0.62) : tint; tornPath(ctx, disc, rng(x * 3 + y), r * 0.14); ctx.fill();
    ctx.strokeStyle = 'rgba(245,238,220,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    symbol(ctx, kind, x, y, r, done ? 'rgba(20,14,8,0.5)' : '#14100c');
    if (current) { ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.arc(x, y - r - 3, big ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.arc(x - 1, y - r - 4, big ? 2 : 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  route.steps.forEach((opts, i) => {
    opts.forEach((node, j) => {
      const p = pos(i, j, opts.length);
      const done = i < cur && route.done[i] === node, passed = i < cur && !done;
      const current = i === cur, future = i > cur;
      const r = current ? 17 : 13;
      if (passed) { ctx.save(); ctx.globalAlpha = 0.28; pin(p.x, p.y, 10, node.kind); ctx.restore(); }
      else pin(p.x, p.y, r, node.kind, { done, current, future });
      pins.push({ i, j, x: p.x, y: p.y, r, node, done, current, future });
      // the current step is labelled; a future span keeps its name until you are near it
      if (current) {
        // below the pin in both formats; near a sheet edge the text runs
        // inward from the pin instead of centring on it and running off
        ctx.fillStyle = ink; ctx.font = '700 12px "Avenir Next Condensed", "Arial Narrow", system-ui, sans-serif';
        const label = nameOf(node), max = portrait ? 22 : 26;
        const text = label.length > max ? label.slice(0, max - 2) + '…' : label;
        const tw = ctx.measureText(text).width;
        ctx.textAlign = p.x - tw / 2 < 14 ? 'left' : p.x + tw / 2 > w - 14 ? 'right' : 'center';
        const lx = ctx.textAlign === 'left' ? p.x - r : ctx.textAlign === 'right' ? p.x + r : p.x;
        // three across a phone's width collide below the pins, so the middle
        // one takes the shelf above its pin instead
        const above = portrait && opts.length >= 3 && j % 2 === 1;
        ctx.fillText(text, lx, above ? p.y - r - 10 : p.y + r + 16);
      }
    });
  });
  // the boss, big, at the end of the tape
  pin(bossAt.x, bossAt.y, 22, 'boss', { big: true, future: cur < S });
  ctx.fillStyle = ink; ctx.font = '800 12px "Avenir Next Condensed", "Arial Narrow", system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(bossName.toUpperCase(), bossAt.x, bossAt.y + 40);
  // you
  ctx.fillStyle = '#e8e0d0'; ctx.strokeStyle = '#14100c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(here.x, here.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // two strips of tape holding the map down
  tape(ctx, 26, 16, 46, 14, -0.5, rnd); tape(ctx, w - 30, h - 14, 52, 14, 0.4, rnd);
  return { pins, boss: bossAt, here };
}
