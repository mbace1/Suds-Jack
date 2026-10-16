// The kit for "Irreversible" (Radio Free Helsinki · Doodle #3) — built on RFP (the papercut box).
// Its own look, not the house's dark autumn: Brussels daylight — EU blue, star gold, white marble,
// a pale clear sky. Doodle's four colours appear only on what is Doodle's: its wordmark, the
// stripe on its briefcase, its speech card, its lock and the cuff of its hand.
// The set: the Doodle search bar (a white frame round a glass field, the paper TAPE of searches
// running through it), Doodle's filing cabinet, the Berlaymont with its flags, the Court of
// Justice in Luxembourg (the twin gold towers and the golden ring), the law book, the scale.
window.IRR = (() => {
  const { W, H, sheet, sprite, put, glow, ease } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112;
  const C = {
    eu: '#1d3f8f', euL: '#2f56b0', euD: '#142c66', euDD: '#0d1d48',
    gold: '#f4c430', goldL: '#ffdc6a', goldD: '#c99a1c', goldDD: '#9a7412',
    marble: '#f1eee7', marbleL: '#fbfaf6', marbleD: '#dcd7cc', marbleDD: '#bfb8aa',
    sky0: '#9fc2e6', sky1: '#b1cdec', sky2: '#c3d9f1', sky3: '#d5e5f5', sky4: '#e6eff8',
    ink: '#16213a', inkL: '#3a4660', steel: '#cdd2da', steelL: '#e3e6eb', steelD: '#a7aeb9', steelDD: '#7c8594',
    paper: '#fdfbf4', paperD: '#e8e2d2', stone: '#e6e1d6', stoneD: '#cfc8b9', stoneDD: '#b5ad9d',
    dB: '#4a82e0', dR: '#de4a3c', dY: '#f4bd2a', dG: '#3aa35a',
  };
  const D4 = [C.dB, C.dR, C.dY, C.dG];
  const cv = RFP.canvas;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };

  // ---------------------------------------------------------------- marks
  /** a five-pointed star */
  function star(g, x, y, r, rot = -Math.PI / 2, inner = 0.42) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = rot + k * Math.PI / 5, q = k % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }
  /** the ring of twelve stars, upright as on the flag; sc(i) scales star i (0 hides it) */
  function ring(g, x, y, R, r, col = C.gold, sc = () => 1) { g.fillStyle = col; for (let i = 0; i < 12; i++) { const k = sc(i); if (k <= 0) continue; const a = -Math.PI / 2 + i * TAU / 12; star(g, x + Math.cos(a) * R, y + Math.sin(a) * R, r * k); } }
  /** the Doodle wordmark in its colours (blue red yellow blue green red), a round geometric sans */
  const DOODLE = [C.dB, C.dR, C.dY, C.dB, C.dG, C.dR];
  function wordmark(g, x, y, size, { align = 'center', outline = 0, out = '#ffffff' } = {}) {
    g.save(); g.font = size + 'px "Poppins-600"'; g.textAlign = 'left'; g.lineJoin = 'round';
    const L = 'Doodle'.split(''), ws = L.map((ch) => g.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0) - size * 0.02 * 5;
    let px = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    for (let i = 0; i < 6; i++) {
      if (outline) { g.strokeStyle = out; g.lineWidth = outline * 2; g.strokeText(L[i], px, y); }
      g.fillStyle = DOODLE[i]; g.fillText(L[i], px, y); px += ws[i] - size * 0.02;
    }
    g.restore();
  }
  /** Doodle's four colours as a band of stripes (cuffs, the briefcase) */
  function stripe(g, x, y, w, h, vertical = false) { for (let i = 0; i < 4; i++) { g.fillStyle = D4[i]; if (vertical) g.fillRect(x + i * w / 4, y, w / 4 + 0.5, h); else g.fillRect(x, y + i * h / 4, w, h / 4 + 0.5); } }
  /** a little EU flag on a pole, waving: pole foot at (x, y) */
  function euFlag(g, x, y, s, t, ph = 0) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = C.steelDD; g.fillRect(-3, -300, 6, 300); g.fillStyle = C.gold; g.beginPath(); g.arc(0, -304, 7, 0, TAU); g.fill();
    const n = 12, fw = 120, fh = 82;
    for (let i = 0; i < n; i++) { const u = i / n, off = Math.sin(u * 5 - t * 4 + ph) * 6 * u; g.fillStyle = C.eu; g.fillRect(3 + u * fw, -296 + off, fw / n + 0.8, fh); }
    g.fillStyle = 'rgba(255,255,255,.10)'; for (let i = 0; i < n; i += 2) { const u = i / n, off = Math.sin(u * 5 - t * 4 + ph) * 6 * u; g.fillRect(3 + u * fw, -296 + off, fw / n, fh); }
    const cx = 3 + fw * 0.5, cy = -296 + fh / 2 + Math.sin(2.5 - t * 4 + ph) * 3;
    ring(g, cx, cy, 24, 5);
    g.restore();
  }

  // ---------------------------------------------------------------- the paper tape of searches
  /** a polyline path → arc-length lookups */
  function path(pts) {
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const at = (s) => { s = clamp(s, 0, L[L.length - 1]); let i = 1; while (i < L.length - 1 && L[i] < s) i++; const k = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return [lerp(x0, x1, k), lerp(y0, y1, k), Math.atan2(y1 - y0, x1 - x0)]; };
    return { pts, len: L[L.length - 1], at };
  }
  /** a quadratic/cubic curve sampled into points */
  function curve(p0, p1, p2, p3, n = 24) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push(p3 ? [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]] : [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return out; }
  /** the typed searches: word-shaped marks repeating with period PER along the tape (never legible) */
  const PER = 640;
  const WORDS = (() => { const r = U.rng(61), out = []; let s = 0; while (s < PER - 40) { const n = 2 + ((r() * 3) | 0); for (let k = 0; k < n && s < PER - 40; k++) { const w = 14 + r() * 42; out.push([s, w]); s += w + 9; } out.push([s + 4, -1]); s += 34; } return out; })();
  /** draw a tape along a path: its edge, the paper, the sprocket dots, the words moving at `speed` px/s.
   *  from/to (arc length) limit where words are printed — the copy tape is blank until the pencil */
  function tape(g, P, lt, { w = 30, speed = 110, shadow = true, from = -1e9, to = 1e9, col = C.paper } = {}) {
    const trace = () => { g.beginPath(); P.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
    g.save(); g.lineJoin = 'round'; g.lineCap = 'butt';
    if (shadow) { g.strokeStyle = 'rgba(20,33,58,.16)'; g.lineWidth = w + 2; g.save(); g.translate(5, 8); trace(); g.stroke(); g.restore(); }
    g.strokeStyle = C.paperD; g.lineWidth = w + 3; trace(); g.stroke();
    g.strokeStyle = col; g.lineWidth = w; trace(); g.stroke();
    // the words
    g.strokeStyle = 'rgba(22,33,58,.62)'; g.fillStyle = 'rgba(22,33,58,.62)'; g.lineWidth = Math.max(3, w * 0.24); g.lineCap = 'round';
    const off = (lt * speed) % PER;
    for (let k = -1; k * PER < P.len + PER; k++) for (const [s0, wl] of WORDS) {
      const s = s0 + off + k * PER; if (s < Math.max(0, from) || s > Math.min(P.len, to)) continue;
      if (wl < 0) { const [x, y] = P.at(s); g.beginPath(); g.arc(x, y, w * 0.1, 0, TAU); g.fill(); continue; }
      const e = Math.min(s + wl, P.len, to); g.beginPath(); for (let q = s; q <= e; q += 5) { const [x, y] = P.at(q); q === s ? g.moveTo(x, y) : g.lineTo(x, y); } const [xe, ye] = P.at(e); g.lineTo(xe, ye); g.stroke();
    }
    // sprocket dots along one edge
    g.fillStyle = 'rgba(22,33,58,.18)';
    for (let s = (lt * speed) % 22; s < P.len; s += 22) { const [x, y, a] = P.at(s); g.beginPath(); g.arc(x - Math.sin(a) * w * 0.36, y + Math.cos(a) * w * 0.36, 2.2, 0, TAU); g.fill(); }
    g.restore();
  }

  // ---------------------------------------------------------------- the search bar
  // A geometry per size, in local units centred on the bar: a pill w × h, the magnifier at its left,
  // the glass field between. The standard bar is 760 × 124 (field x −291…330, y −38…38).
  const geom = (w = 760, h = 124) => ({ w, h, r: h / 2, fx0: -w / 2 + h * 0.72, fx1: w / 2 - h * 0.4, fy0: -h * 0.31, fy1: h * 0.31, mx: -w / 2 + h * 0.36 });
  const BAR = geom();
  /** the bar's white frame with the field cut out of it, and the magnifier */
  const barFrame = (G = BAR) => sprite(`irr_barframe_${G.w}_${G.h}`, G.w + 40, G.h + 36, G.w / 2 + 20, G.h / 2 + 18, (g) => {
    const fw = G.fx1 - G.fx0, fh = G.fy1 - G.fy0, fr = Math.min(14, fh * 0.2), k = G.h / 124;
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(-G.w / 2, -G.h / 2, G.w, G.h, G.r); g.roundRect(G.fx0, G.fy0, fw, fh, fr); g.fill('evenodd');
    g.strokeStyle = C.steel; g.lineWidth = 3 * k; g.beginPath(); g.roundRect(-G.w / 2 + 1.5 * k, -G.h / 2 + 1.5 * k, G.w - 3 * k, G.h - 3 * k, G.r - 1.5 * k); g.stroke();
    g.strokeStyle = C.steelD; g.lineWidth = 2 * k; g.beginPath(); g.roundRect(G.fx0 - k, G.fy0 - k, fw + 2 * k, fh + 2 * k, fr + 1); g.stroke();
    g.strokeStyle = C.inkL; g.lineWidth = 8 * k; g.lineCap = 'round'; g.beginPath(); g.arc(G.mx, -6 * k, 17 * k, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(G.mx + 12 * k, 6 * k); g.lineTo(G.mx + 26 * k, 20 * k); g.stroke();
  }, 9);
  /** the whole bar at (x, y), scale s. inner(g, G) draws what is behind the glass, in bar-local units
   *  (by default the tape running left to right through the field). */
  function bar(c, x, y, s, lt, { G = BAR, inner = null, speed = 110, cursor = true, lift = 1.2 } = {}) {
    const fw = G.fx1 - G.fx0, fh = G.fy1 - G.fy0, k = G.h / 124;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.save(); c.beginPath(); c.roundRect(G.fx0, G.fy0, fw, fh, Math.min(14, fh * 0.2)); c.clip();
    c.fillStyle = '#f2f7fc'; c.fillRect(G.fx0, G.fy0, fw, fh);
    if (inner) inner(c, G);
    else tape(c, path([[G.fx0 - 40, 0], [G.w / 2 + 40, 0]]), lt, { w: 34 * k, speed, shadow: true });
    // the glass: a cool tint, a diagonal glint that drifts, a bright top lip, the frame's shade
    c.fillStyle = 'rgba(190,215,240,.20)'; c.fillRect(G.fx0, G.fy0, fw, fh);
    const gx = G.fx0 + ((lt * 60) % (fw + 300)) - 120, sl = fh * 0.55;
    c.fillStyle = 'rgba(255,255,255,.40)'; c.beginPath(); c.moveTo(gx, G.fy0); c.lineTo(gx + 46 * k, G.fy0); c.lineTo(gx + 46 * k - sl, G.fy1); c.lineTo(gx - sl, G.fy1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(gx + 64 * k, G.fy0); c.lineTo(gx + 78 * k, G.fy0); c.lineTo(gx + 78 * k - sl, G.fy1); c.lineTo(gx + 64 * k - sl, G.fy1); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(G.fx0, G.fy0, fw, 5 * k);
    c.fillStyle = 'rgba(20,33,58,.10)'; c.fillRect(G.fx0, G.fy0 + 5 * k, fw, 6 * k);
    if (cursor && Math.floor(lt * 2.2) % 2 === 0) { c.fillStyle = C.ink; c.fillRect(G.fx0 + 22 * k, -24 * k, 4 * k, 48 * k); }
    c.restore();
    put(c, barFrame(G), 0, 0, { lift });
    c.restore();
  }
  /** the bar's right end in world coordinates, where the tape comes out */
  const barEnd = (x, y, s, G = BAR) => [x + G.w / 2 * s, y];

  // ---------------------------------------------------------------- Doodle's filing cabinet
  /** a steel cabinet, cols × rows of drawers, a header plate with the wordmark and YOUR SEARCHES,
   *  a slot in its top for the tape. Origin at the bottom centre. */
  const cabinet = (key, w, h, cols, rows, head = 150) => sprite('irr_cab_' + key, w + 20, h + 20, w / 2 + 10, h + 10, (g) => {
    const x0 = -w / 2, y0 = -h;
    g.fillStyle = C.steelD; rr(g, x0, y0, w, h, 10);
    g.fillStyle = C.steel; rr(g, x0 + 8, y0 + 8, w - 16, h - 16, 8);
    // the header: a white plate with the wordmark, and a card label under it
    const hs = head / 150;
    g.fillStyle = '#ffffff'; rr(g, x0 + 24, y0 + 22, w - 48, head * 0.62, 8);
    wordmark(g, 0, y0 + 22 + head * 0.5, Math.min(head * 0.5, (w - 80) / 3.4));
    g.fillStyle = C.ink; rr(g, -Math.min(w * 0.36, 330 * hs), y0 + 22 + head * 0.68, Math.min(w * 0.72, 660 * hs), head * 0.3, 6);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; let fs = Math.round(head * 0.2); g.font = fs + 'px "ArchivoBlack-400"';
    while (g.measureText('YOUR SEARCHES').width > Math.min(w * 0.72, 660 * hs) - 30 && fs > 10) g.font = --fs + 'px "ArchivoBlack-400"';
    g.fillText('YOUR SEARCHES', 0, y0 + 22 + head * 0.68 + head * 0.15 + fs * 0.36);
    // the slot the tape goes into
    g.fillStyle = C.ink; rr(g, -w * 0.18, y0 + 4, w * 0.36, 10, 4);
    // drawers
    const dy0 = y0 + head + 16, dh = (h - head - 30) / rows, dw = (w - 30) / cols;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) drawerFace(g, x0 + 15 + q * dw + 5, dy0 + r * dh + 5, dw - 10, dh - 10);
    g.fillStyle = C.steelDD; g.fillRect(x0 + 14, -12, w - 28, 12);
  }, 12);
  function drawerFace(g, x, y, w, h) {
    g.fillStyle = C.steelL; rr(g, x, y, w, h, 5);
    g.fillStyle = 'rgba(20,33,58,.10)'; g.fillRect(x, y + h - 6, w, 6);
    g.fillStyle = '#ffffff'; g.strokeStyle = C.steelDD; g.lineWidth = 2; g.fillRect(x + w / 2 - w * 0.17, y + h * 0.2, w * 0.34, h * 0.22); g.strokeRect(x + w / 2 - w * 0.17, y + h * 0.2, w * 0.34, h * 0.22);
    g.fillStyle = C.steelDD; rr(g, x + w / 2 - w * 0.16, y + h * 0.56, w * 0.32, Math.max(6, h * 0.12), 4);
  }
  /** one drawer face as its own card (for the drawers that burst open) */
  const drawer = (w, h) => sprite(`irr_drawer_${w | 0}_${h | 0}`, w + 10, h + 10, w / 2 + 5, h / 2 + 5, (g) => drawerFace(g, -w / 2, -h / 2, w, h), 7);

  // ---------------------------------------------------------------- the order
  /** the envelope: white paper, an EU-blue flap, the ring of stars as its seal, SHARE DATA */
  const envelope = () => sprite('irr_env', 360, 250, 180, 125, (g) => {
    g.fillStyle = C.paper; rr(g, -170, -112, 340, 224, 8);
    g.fillStyle = C.paperD; g.beginPath(); g.moveTo(-170, 112); g.lineTo(0, 10); g.lineTo(170, 112); g.closePath(); g.fill();
    g.fillStyle = C.paper; g.beginPath(); g.moveTo(-162, 112); g.lineTo(0, 18); g.lineTo(162, 112); g.closePath(); g.fill();
    g.fillStyle = C.eu; g.beginPath(); g.moveTo(-170, -112); g.lineTo(170, -112); g.lineTo(0, 6); g.closePath(); g.fill();
    g.fillStyle = C.eu; g.beginPath(); g.arc(0, 4, 40, 0, TAU); g.fill(); ring(g, 0, 4, 27, 5.4);
    g.fillStyle = C.eu; g.textAlign = 'center'; g.font = '40px "ArchivoBlack-400"'; g.fillText('SHARE DATA', 0, 92);
  }, 8);

  // ---------------------------------------------------------------- Brussels: the Berlaymont
  /** the Commission's building seen across the Schuman roundabout: a star-shaped block of glass
   *  louvres — a tall core, wings swinging away to each side, the louvres in long horizontal bands */
  const berlaymont = () => sheet('irr_berlaymont', (g) => {
    const top = 1010, base = 1520;
    const louvres = (x0, x1, y0, y1, a, b) => { g.fillStyle = a; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = b; for (let y = y0 + 10; y < y1 - 6; y += 17) g.fillRect(x0, y, x1 - x0, 7); };
    // the far wings, receding: narrower, a touch darker
    g.fillStyle = '#c9d3df'; g.beginPath(); g.moveTo(-90, top + 120); g.lineTo(250, top + 50); g.lineTo(250, base); g.lineTo(-90, base); g.closePath(); g.fill();
    g.fillStyle = '#c9d3df'; g.beginPath(); g.moveTo(W + 90, top + 120); g.lineTo(830, top + 50); g.lineTo(830, base); g.lineTo(W + 90, base); g.closePath(); g.fill();
    g.fillStyle = 'rgba(120,138,160,.35)'; for (let y = top + 140; y < base; y += 17) { g.fillRect(-90, y, 340, 6); g.fillRect(830, y, 340, 6); }
    // the near core: the front, louvred, a darker band where the floors show
    louvres(250, 830, top, base, '#dfe6ee', 'rgba(130,148,170,.42)');
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(250, top, 580, 10);
    g.fillStyle = '#b8c4d2'; g.fillRect(250, top - 26, 580, 26);   // the roof plant, set back
    g.fillStyle = '#a8b6c6'; g.fillRect(250, base - 120, 580, 120);  // the glazed ground floor
    g.fillStyle = 'rgba(255,255,255,.25)'; for (let x = 266; x < 830; x += 46) g.fillRect(x, base - 112, 22, 104);
    // its edges: the curve of the wing turning away
    g.fillStyle = 'rgba(80,96,120,.18)'; g.fillRect(250, top, 18, base - top); g.fillRect(812, top, 18, base - top);
  }, 10);
  /** the sky: Brussels daylight, banded like cut card */
  const sky = (key, horizon = 1300) => sheet('irr_sky_' + key, (g) => {
    const bands = [C.sky0, C.sky1, C.sky2, C.sky3, C.sky4, '#f3f7fb'];
    const step = horizon / bands.length;
    bands.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, -90 + (i ? i * step : -90)); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, i * step + Math.sin(x * 0.005 + i * 1.7) * 12); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
  }, 8);
  /** a cloud of card: three overlapping discs on a flat bottom */
  const cloud = (k = 1) => sprite('irr_cloud_' + k, 360, 160, 180, 130, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-80, -40, 48 * k, 0, TAU); g.arc(-10, -70, 66 * k, 0, TAU); g.arc(70, -44, 52 * k, 0, TAU); g.fill(); g.fillRect(-128, -40, 248, 40); }, 10);
  /** the plaza: pale stone in bands */
  const plaza = (key, y0 = 1500) => sheet('irr_plaza_' + key, (g) => {
    g.fillStyle = C.stoneD; g.fillRect(-90, y0, W + 180, H + 90 - y0);
    g.fillStyle = C.stone; for (let y = y0 + 10, k = 0; y < H + 90; y += 34 + k * 6, k++) g.fillRect(-90, y, W + 180, 24 + k * 5);
  }, 10);

  // ---------------------------------------------------------------- Luxembourg: the Court of Justice
  /** the twin gold towers, the golden ring on its pilotis, the dark glazed hall, white steps */
  const court = () => sheet('irr_court', (g) => {
    const tower = (x, top, w, base) => {
      g.fillStyle = '#b48a20'; g.beginPath(); g.moveTo(x + w, top); g.lineTo(x + w + 34, top + 16); g.lineTo(x + w + 34, base); g.lineTo(x + w, base); g.closePath(); g.fill();   // the side, in shade
      g.fillStyle = 'rgba(90,64,8,.35)'; for (let y = top + 34; y < base; y += 24) { g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + 34, y + 16); g.lineTo(x + w + 34, y + 19); g.lineTo(x + w, y + 3); g.fill(); }
      const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#f6d266'); gr.addColorStop(0.5, '#e9b42e'); gr.addColorStop(1, '#d29c1e'); g.fillStyle = gr; g.fillRect(x, top, w, base - top);
      g.fillStyle = 'rgba(120,86,10,.55)'; for (let y = top + 22; y < base; y += 24) g.fillRect(x, y, w, 4);   // the floors
      g.fillStyle = 'rgba(120,86,10,.22)'; for (let xx = x + 10; xx < x + w - 4; xx += 12) g.fillRect(xx, top, 3, base - top);   // the mesh
      g.fillStyle = '#a07a14'; g.beginPath(); g.moveTo(x - 4, top); g.lineTo(x + w, top); g.lineTo(x + w + 34, top + 16); g.lineTo(x + 30, top + 16); g.closePath(); g.fill();
      g.fillStyle = '#f9e08e'; g.fillRect(x, top, 6, base - top);
    };
    tower(140, 720, 140, 1240); tower(320, 790, 140, 1240);
    // the old Palais, dark, behind the ring
    g.fillStyle = '#5b5148'; g.fillRect(-90, 1170, W + 180, 280);
    g.fillStyle = '#4a423a'; for (let x = -60; x < W + 90; x += 70) g.fillRect(x, 1210, 26, 240);
    // the golden ring: a long gold band on thin pilotis
    g.fillStyle = '#a07a14'; g.fillRect(-90, 1092, W + 180, 104);
    g.fillStyle = '#e9b42e'; g.fillRect(-90, 1106, W + 180, 82);
    g.fillStyle = 'rgba(120,86,10,.4)'; for (let x = -90; x < W + 90; x += 14) g.fillRect(x, 1106, 4, 82);
    g.fillStyle = '#f9e08e'; g.fillRect(-90, 1100, W + 180, 6);
    g.fillStyle = '#e9e4da'; for (let x = -40; x < W + 90; x += 110) g.fillRect(x, 1196, 12, 254);   // pilotis
    // the glazed entrance hall
    g.fillStyle = '#3c4a5c'; g.fillRect(260, 1260, 560, 190); g.fillStyle = 'rgba(200,220,240,.25)'; for (let x = 270; x < 820; x += 40) g.fillRect(x, 1268, 18, 176);
    // the steps: nine, each a pale tread over a shaded riser
    for (let k = 0; k < 9; k++) { const y = 1446 + k * 36; g.fillStyle = k % 2 ? '#f1ede5' : '#e9e4da'; g.fillRect(-90, y, W + 180, 26); g.fillStyle = C.stoneDD; g.fillRect(-90, y + 26, W + 180, 10); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-90, y, W + 180, 3); }
    g.fillStyle = C.stoneD; g.fillRect(-90, 1770, W + 180, H);
    g.fillStyle = C.stone; for (let y = 1790; y < H + 90; y += 40) g.fillRect(-90, y, W + 180, 24);
  }, 12);
  /** the tread a thing on the court steps stands on: k = 0 bottom … 8 top */
  const stepY = (k) => 1446 + (8 - k) * 36 + 24;

  /** Doodle's briefcase: charcoal, gold clasps, the four-colour band, origin at its bottom centre */
  const briefcase = () => sprite('irr_case', 260, 220, 130, 200, (g) => {
    g.fillStyle = '#2b2f38'; g.beginPath(); g.roundRect(-30, -190, 60, 40, [14, 14, 0, 0]); g.fill(); g.fillStyle = C.steelL; g.fillRect(-18, -178, 36, 28);   // the handle
    g.fillStyle = '#2b2f38'; rr(g, -118, -156, 236, 156, 14);
    g.fillStyle = '#383d48'; rr(g, -110, -150, 220, 40, 10);
    stripe(g, -118, -96, 236, 28);
    g.fillStyle = C.gold; for (const x of [-70, 58]) rr(g, x, -126, 14, 22, 3);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-108, -60, 216, 6);
  }, 8);

  // ---------------------------------------------------------------- speech cards
  /** Doodle's speech card: white, a four-colour border, the wordmark; tail to lower left (side −1) or right */
  const doodleCard = (w = 300, h = 210, side = 1) => sprite(`irr_dcard_${w}_${h}_${side}`, w + 60, h + 80, w / 2 + 30, h / 2 + 20, (g) => {
    const bub = () => { g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 26); g.moveTo(side * w * 0.12, h / 2 - 4); g.lineTo(side * w * 0.3, h / 2 + 52); g.lineTo(side * w * 0.32, h / 2 - 4); g.closePath(); };
    g.save(); bub(); g.clip(); for (let i = 0; i < 4; i++) { g.fillStyle = D4[i]; g.fillRect(-w / 2 - 10 + i * (w + 20) / 4, -h / 2 - 10, (w + 20) / 4 + 1, h + 80); } g.restore();
    g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 18); g.fill();
    wordmark(g, 0, 22, Math.min(78, w * 0.26));
  }, 9);
  /** the EU's speech card: EU blue, the ring of stars */
  const euCard = (w = 300, h = 210, side = -1) => sprite(`irr_ecard_${w}_${h}_${side}`, w + 60, h + 80, w / 2 + 30, h / 2 + 20, (g) => {
    g.fillStyle = C.euD; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 26); g.moveTo(side * w * 0.12, h / 2 - 4); g.lineTo(side * w * 0.3, h / 2 + 52); g.lineTo(side * w * 0.32, h / 2 - 4); g.closePath(); g.fill();
    g.fillStyle = C.eu; g.beginPath(); g.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 18); g.fill();
    ring(g, 0, 0, Math.min(w, h) * 0.33, Math.min(w, h) * 0.065);
  }, 9);

  // ---------------------------------------------------------------- Doodle's hand
  /** a white glove with Doodle's four-colour cuff on a dark sleeve, holding a pencil whose point is the
   *  origin. arm turns the arm (0 = straight up from the point; positive swings it round to the right),
   *  pen turns the pencil the same way */
  const pencilHand = (arm = 1.15, pen = 1.0) => sprite(`irr_phand_${arm}_${pen}`, 1300, 1300, 650, 650, (g) => {
    g.save(); g.rotate(pen);
    g.fillStyle = '#e8d6a8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -38); g.lineTo(12, -38); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, -12); g.lineTo(4, -12); g.closePath(); g.fill();
    g.fillStyle = C.steelD; g.fillRect(-12, -260, 24, 222); g.fillStyle = C.steel; g.fillRect(-12, -260, 9, 222);
    g.fillStyle = C.steelDD; g.fillRect(-13, -282, 26, 24);
    g.restore();
    g.save(); g.rotate(arm);
    g.fillStyle = '#3a4152'; g.beginPath(); g.moveTo(-60, -280); g.lineTo(60, -280); g.lineTo(76, -640); g.lineTo(-76, -640); g.closePath(); g.fill();   // the sleeve
    stripe(g, -70, -300, 140, 46, true);                                                                                                        // the cuff, Doodle's four
    g.fillStyle = '#f6f3ec'; rr(g, -60, -262, 120, 126, 32);                                                                                     // the glove's back
    g.fillStyle = '#e6e1d5'; rr(g, -62, -150, 108, 42, 18); rr(g, -52, -116, 88, 34, 16);                                                       // curled fingers
    g.fillStyle = '#f6f3ec'; rr(g, -78, -206, 42, 92, 20);                                                                                       // the thumb, on the near side
    g.strokeStyle = 'rgba(20,33,58,.22)'; g.lineWidth = 3; for (const x of [-20, 6, 30]) { g.beginPath(); g.moveTo(x, -250); g.lineTo(x, -216); g.stroke(); }
    g.restore();
  }, 10);

  // ---------------------------------------------------------------- Doodle's lock
  /** a padlock in two cards: the steel shackle (origin at its top) and the body, white, carrying the
   *  wordmark and a keyhole (origin where the shackle's legs enter it) */
  const shackle = () => sprite('irr_shackle', 220, 240, 110, 30, (g) => {
    g.strokeStyle = C.steelD; g.lineWidth = 30; g.lineCap = 'butt'; g.beginPath(); g.moveTo(-72, 190); g.lineTo(-72, 72); g.arc(0, 72, 72, Math.PI, 0); g.lineTo(72, 190); g.stroke();
    g.strokeStyle = C.steelL; g.lineWidth = 8; g.beginPath(); g.moveTo(-80, 190); g.lineTo(-80, 72); g.arc(0, 72, 80, Math.PI, Math.PI * 1.5); g.stroke();
  }, 9);
  const lockBody = () => sprite('irr_lockbody', 280, 230, 140, 30, (g) => {
    g.fillStyle = C.steelDD; rr(g, -124, -18, 248, 210, 26);
    g.fillStyle = '#ffffff'; rr(g, -116, -10, 232, 194, 22);
    wordmark(g, 0, 66, 54);
    g.fillStyle = C.ink; g.beginPath(); g.arc(0, 110, 18, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-9, 114); g.lineTo(9, 114); g.lineTo(14, 160); g.lineTo(-14, 160); g.closePath(); g.fill();
  }, 10);

  // ---------------------------------------------------------------- the scale
  const scalePost = () => sprite('irr_post', 360, 900, 180, 880, (g) => {
    g.fillStyle = C.goldDD; g.beginPath(); g.moveTo(-150, 0); g.lineTo(150, 0); g.lineTo(110, -50); g.lineTo(-110, -50); g.closePath(); g.fill();
    g.fillStyle = C.goldD; g.beginPath(); g.moveTo(-130, -8); g.lineTo(130, -8); g.lineTo(96, -46); g.lineTo(-96, -46); g.closePath(); g.fill();
    g.fillStyle = C.goldD; g.fillRect(-20, -760, 40, 714); g.fillStyle = C.gold; g.fillRect(-14, -760, 14, 714);
    g.fillStyle = C.gold; g.beginPath(); g.moveTo(-34, -760); g.lineTo(34, -760); g.lineTo(0, -830); g.closePath(); g.fill();
  }, 12);
  const scaleBeam = (arm) => sprite('irr_beam_' + arm, arm * 2 + 80, 70, arm + 40, 35, (g) => {
    g.fillStyle = C.goldD; g.beginPath(); g.moveTo(-arm, -10); g.quadraticCurveTo(0, -26, arm, -10); g.lineTo(arm, 10); g.quadraticCurveTo(0, -4, -arm, 10); g.closePath(); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.arc(0, -8, 22, 0, TAU); g.fill(); for (const x of [-arm, arm]) { g.beginPath(); g.arc(x, 0, 12, 0, TAU); g.fill(); }
  }, 8);
  const scalePan = () => sprite('irr_pan', 340, 90, 170, 20, (g) => { g.fillStyle = C.goldD; g.beginPath(); g.moveTo(-150, 0); g.lineTo(150, 0); g.quadraticCurveTo(110, 56, 0, 58); g.quadraticCurveTo(-110, 56, -150, 0); g.fill(); g.fillStyle = C.gold; g.fillRect(-150, -7, 300, 10); }, 8);

  // ---------------------------------------------------------------- the box and the tag
  /** the box: a white-marble frame with a gold bead and an EU-blue fillet round the opening */
  let FRAME = null;
  function frame() {
    if (FRAME) return FRAME;
    const c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = '#ece8df'; g.beginPath(); g.rect(0, 0, W, H); g.rect(56, 56, W - 112, H - 112); g.fill('evenodd');
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(56, 56, W - 112, H - 112); g.clip('evenodd');
    const r = U.rng(23);
    for (let i = 0; i < 46; i++) { let x = r() * W, y = r() * H, a = r() * TAU; g.strokeStyle = `rgba(120,110,95,${0.10 + r() * 0.16})`; g.lineWidth = 0.8 + r() * 1.8; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 16; y += Math.sin(a) * 16; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, W, 6); g.fillRect(0, 0, 6, H);
    g.fillStyle = 'rgba(40,40,60,.10)'; g.fillRect(0, H - 8, W, 8); g.fillRect(W - 8, 0, 8, H);
    g.restore();
    return (FRAME = c);
  }
  function box(c) {
    c.save();
    const sh = c.createLinearGradient(0, 56, 0, 132); sh.addColorStop(0, 'rgba(14,29,72,.30)'); sh.addColorStop(1, 'rgba(14,29,72,0)'); c.fillStyle = sh; c.fillRect(56, 56, W - 112, 76);
    const sl = c.createLinearGradient(56, 0, 124, 0); sl.addColorStop(0, 'rgba(14,29,72,.24)'); sl.addColorStop(1, 'rgba(14,29,72,0)'); c.fillStyle = sl; c.fillRect(56, 56, 68, H - 112);
    c.drawImage(frame(), 0, 0);
    c.strokeStyle = C.eu; c.lineWidth = 6; c.strokeRect(53, 53, W - 106, H - 106);
    c.strokeStyle = C.gold; c.lineWidth = 3; c.strokeRect(48.5, 48.5, W - 97, H - 97);
    c.restore();
  }
  /** the where/what tag in the lower corner: EU blue card, gold letters; '\n' breaks a line */
  function tag(c, text, lt, dur, x = 96, yb = 1800) {
    yb = Math.min(yb, RFP.SAFE_B);   // above Instagram's caption and channel line
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    const lines = text.split('\n');
    c.save(); c.globalAlpha = a; c.font = '32px "ArchivoBlack-400"'; const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 44, h = 22 + lines.length * 42;
    if (x === 'right') x = W - 160 - w;   // clear of Instagram's button column on the right
    const y = yb - h;
    c.shadowColor = 'rgba(14,29,72,.35)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.eu; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = C.gold; c.textAlign = 'left'; lines.forEach((l, i) => c.fillText(l, x + 22, y + 45 + i * 42)); c.restore();
  }

  /** a real camera move: world point (px, py) lands on screen at (sx, sy), scaled z — for the push-ins
   *  (the stack's own z scales each sheet by its depth, which is a parallax, not a push) */
  function view(c, z, px, py, sx = 540, sy = 1250) { c.translate(sx, sy); c.scale(z, z); c.translate(-px, -py); }

  return { C, D4, B, view, star, ring, wordmark, stripe, euFlag, path, curve, tape, BAR, bar, barFrame, barEnd, cabinet, drawer, drawerFace, envelope, berlaymont, sky, cloud, plaza, geom,
    court, stepY, briefcase, doodleCard, euCard, pencilHand, shackle, lockBody, scalePost, scaleBeam, scalePan, box, tag, rr };
})();
