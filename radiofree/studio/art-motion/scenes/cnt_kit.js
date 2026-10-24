// THE KIT for "Count the Trees" (Doodle 5): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline, and
// the first film of the strand seen FROM ABOVE, the way the satellite pictures of the Muhos site were. One question:
// how do you count a forest that is gone? Everyone counts in the unit that suits them: the regulator in hectares
// (over 300, cleared before the assessment), a newspaper in trees (an estimated 250,000), citizens in names (over
// 50,000 in days, for data-centre rules), and Doodle in what it will plant: 130 hectares.
// A forest of card crowns (spruce, pine and October birch) seen from directly overhead, a gravel road and a dark stream;
// a red marker draws the site's boundary and on "gone" the crowns inside it go in harvester lanes, leaving soil,
// ruts, slash and a stump where every tree stood; a hectare grid fills the clearing row by row; a loupe crosses it,
// ticking stumps; signatures fall on everything like the first snow; and saplings come up in rows over part of it.
// Kept apart from the earlier Doodle films on purpose: no side-on spruces tipping over, no cheque, no stamp, no crowd.
// Fair on purpose (plan/films/25-count-the-trees.md): the 250,000 is the Guardian's estimate and says so; "over 300"
// is the regulator's own figure; the sapling patch is drawn at 40 % of the clearing (130 of about 330 hectares).
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs),
// so every hit lands on its word in every language. Everything is a pure function of the shot's local time.
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, glow, K, canvas } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.428571 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  function punch(lt, hits = [], { open = 0.04, settle = 0.35, kick = 0.025 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const swing = (lt, kicks) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 3.2) * Math.sin((lt - t) * 9) : 0), 0);
  const JP = '"NotoSansJP-800"';

  const C = {
    floor: '#121a14', floorL: '#18221a', moss: '#1d2a1d', bog: '#3b3f2a', bogL: '#4a4e33',
    spruce: ['#173022', '#1b3726', '#14291d'], spruceL: '#2c5139', pine: ['#2a4529', '#30502f'], pineL: '#47703f',
    birch: ['#c8962a', '#d9a62e', '#b5801c', '#c48a24'], birchL: '#ecc664', bare: '#6d5a44',
    soil: '#5b4632', soilL: '#6c573d', soilD: '#46362a', rut: '#3f3024', slash: '#3a2c1f', slashL: '#5a4630', stump: '#d7c49a', stumpD: '#8f7650',
    road: '#857a66', roadL: '#9c907a', roadD: '#6c6252', stream: '#162a37', streamL: '#244256',
    marker: '#d8402f', cream: '#efe6cf', creamD: '#d6cbb0', ink: '#15120f', news: '#ece6d6', newsD: '#cfc7b3',
    sap: '#7fcf5a', sapD: '#3e7a32', slip: '#f6f2e8', slipD: '#d9d2c2', blue: '#2b55b0',
  };

  // ── the site: a clear-cut block with forestry's straight edges, in frame coordinates ──────────────────────────
  const SITE = [[205, 545], [520, 508], [858, 584], [884, 930], [828, 1356], [470, 1388], [196, 1270], [168, 880]];
  const inside = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const BOX = { x0: 160, x1: 890, y0: 500, y1: 1395 };
  /** the planting patch: the clearing below Y_PATCH, chosen so it is 40 % of the clearing (130 of ~330 hectares) */
  const Y_PATCH = (() => {
    const pts = []; for (let x = BOX.x0; x < BOX.x1; x += 6) for (let y = BOX.y0; y < BOX.y1; y += 6) if (inside(SITE, x, y)) pts.push(y);
    pts.sort((a, b) => b - a); return pts[Math.floor(pts.length * 0.4)];
  })();
  const inPatch = (x, y) => y >= Y_PATCH && inside(SITE, x, y);

  // ── the trees: a jittered grid of crowns over the whole frame (and its margin); each knows what it is ─────────
  const TREES = (() => {
    const r = U.rng(41), out = [], S = 30;
    for (let y = -110; y < H + 110; y += S * 0.87) for (let x = -110 + ((y / (S * 0.87)) % 2) * S / 2; x < W + 110; x += S) {
      const px = x + (r() - 0.5) * S * 0.8, py = y + (r() - 0.5) * S * 0.8;
      // a bog north-east of the site, and the road and the stream, have no trees on them
      const bog = ((px - 960) / 150) ** 2 + ((py - 420) / 110) ** 2 < 1;
      if (bog || onRoad(px, py, 26) || onStream(px, py, 34) || r() < 0.06) continue;
      const patch = Math.sin(px * 0.011 + 1.3) + Math.sin(py * 0.009 - 0.4) + Math.sin((px + py) * 0.006);
      const kind = patch > 1.45 ? 'birch' : r() < 0.28 ? 'pine' : 'spruce';
      out.push({ x: px, y: py, r: 11 + r() * 8, kind, v: (r() * 4) | 0, inSite: inside(SITE, px, py), k: r() });
    }
    return out;
  })();
  function roadY(x) { return 1500 + Math.sin(x * 0.004) * 30 - x * 0.12; }                     // the gravel road under the site
  function onRoad(x, y, m) { return x > -120 && Math.abs(y - roadY(x)) < m; }
  function streamX(y) { return 1010 + Math.sin(y * 0.006) * 40 + Math.sin(y * 0.017) * 14; }  // the stream on the right
  function onStream(x, y, m) { return Math.abs(x - streamX(y)) < m; }
  const IN = TREES.filter((t) => t.inSite), OUT = TREES.filter((t) => !t.inSite);

  // a crown seen from above, with its own shadow down-right: drawn once per kind × size × variant
  const CROWN = {};
  function crown(kind, rr, v) {
    const key = `${kind}${Math.round(rr)}${v}`; if (CROWN[key]) return CROWN[key];
    const s = Math.ceil(rr * 2 + 20), c = canvas(s, s), g = c.getContext('2d'), cx = s / 2 - 3, cy = s / 2 - 3, rnd = U.rng(rr * 13 + v * 7 + kind.length);
    const shape = (R0, jag) => { g.beginPath(); const n = kind === 'spruce' ? 10 : 14; for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU, rad = kind === 'spruce' ? (i % 2 ? R0 * 0.72 : R0) : R0 * (0.82 + rnd() * jag); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.closePath(); };
    g.save(); g.translate(rr * 0.38, rr * 0.48); g.filter = 'blur(2px)'; g.fillStyle = 'rgba(0,0,0,.5)'; shape(rr, 0.3); g.fill(); g.restore(); g.filter = 'none';
    const pal = kind === 'spruce' ? C.spruce : kind === 'pine' ? C.pine : C.birch, lit = kind === 'spruce' ? C.spruceL : kind === 'pine' ? C.pineL : C.birchL;
    g.fillStyle = pal[v % pal.length]; shape(rr, 0.32); g.fill();
    g.save(); g.translate(-rr * 0.18, -rr * 0.2); g.fillStyle = lit; g.globalAlpha = 0.55; shape(rr * 0.55, 0.4); g.fill(); g.restore();
    if (kind === 'birch') { g.fillStyle = 'rgba(70,45,20,.35)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + (rnd() - 0.5) * rr, cy + (rnd() - 0.5) * rr, rr * 0.16, 0, TAU); g.fill(); } }
    else { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(cx, cy, rr * 0.16, 0, TAU); g.fill(); }
    return (CROWN[key] = { c, ox: s / 2, oy: s / 2 });
  }
  function drawTree(g, t, sc = 1, a = 1) {
    if (sc <= 0.02 || a <= 0.01) return; const cr = crown(t.kind, t.r, t.v);
    g.save(); g.globalAlpha *= a; g.translate(t.x, t.y); g.scale(sc, sc); g.drawImage(cr.c, -cr.ox, -cr.oy); g.restore();
  }

  // ── the ground: forest floor, the bog, the road, the stream, and the cleared site's soil with its ruts, slash and stumps
  const ground = () => sheet('cnt_ground', (g) => {
    g.fillStyle = C.floor; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(7);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? C.moss : C.floorL; g.beginPath(); g.ellipse(r() * (W + 180) - 90, r() * (H + 180) - 90, 30 + r() * 70, 18 + r() * 40, r() * 3, 0, TAU); g.fill(); }
    // the bog: pale sedge in cut bands
    for (const [rx, ry, col] of [[160, 120, C.bog], [120, 86, C.bogL], [70, 46, '#5a5d3c']]) { g.fillStyle = col; g.beginPath(); g.ellipse(960, 420, rx, ry, -0.2, 0, TAU); g.fill(); }
    // the stream
    for (const [w, col] of [[44, '#0d1c26'], [30, C.stream], [8, C.streamL]]) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); for (let y = -90; y <= H + 90; y += 20) { const x = streamX(y) + (w === 8 ? -6 : 0); y === -90 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    // the road, gravel, with its verges
    for (const [w, col] of [[52, C.roadD], [40, C.road], [6, C.roadL]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let x = -120; x <= W + 120; x += 20) { const y = roadY(x) + (w === 6 ? -8 : 0); x === -120 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
    // the site: soil, then everything a harvester leaves
    g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = C.soil; g.fill(); g.clip();
    for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? C.soilL : C.soilD; g.beginPath(); g.ellipse(BOX.x0 + r() * (BOX.x1 - BOX.x0), BOX.y0 + r() * (BOX.y1 - BOX.y0), 20 + r() * 60, 8 + r() * 20, r() * 3, 0, TAU); g.fill(); }
    // the harvester's ruts: paired lines in lanes, a little wavy, the way the machine drove
    g.strokeStyle = C.rut; g.lineWidth = 4;
    for (let x = BOX.x0 + 30; x < BOX.x1; x += 64) for (const dx of [-7, 7]) { g.beginPath(); for (let y = BOX.y0; y <= BOX.y1; y += 30) { const xx = x + dx + Math.sin(y * 0.01 + x) * 6; y === BOX.y0 ? g.moveTo(xx, y) : g.lineTo(xx, y); } g.stroke(); }
    // slash: brash heaps between the lanes
    for (let i = 0; i < 46; i++) { const x = BOX.x0 + 62 + Math.floor(r() * 11) * 64, y = BOX.y0 + r() * (BOX.y1 - BOX.y0); g.fillStyle = C.slash; g.beginPath(); g.ellipse(x, y, 14 + r() * 10, 6 + r() * 4, 1.5 + (r() - 0.5) * 0.4, 0, TAU); g.fill(); g.strokeStyle = C.slashL; g.lineWidth = 1.5; for (let j = 0; j < 5; j++) { const a = r() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); g.stroke(); } }
    // a stump where every tree in the site stood
    for (const t of IN) { const rr = 3 + t.r * 0.18; g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(t.x + 1.5, t.y + 2, rr, 0, TAU); g.fill(); g.fillStyle = C.stump; g.beginPath(); g.arc(t.x, t.y, rr, 0, TAU); g.fill(); g.fillStyle = C.stumpD; g.beginPath(); g.arc(t.x, t.y, rr * 0.45, 0, TAU); g.fill(); }
    g.restore();
  }, 6);
  /** the forest around the site as one sheet, so its shadow falls into the clearing the way real crowns' do */
  const forest = () => sheet('cnt_forest', (g) => { for (const t of OUT) drawTree(g, t); }, 8);

  /** the where/what tag in the lower corner (CW.tag's look), with a Japanese face behind the Latin one */
  function tag(c, text, lt, dd, x = 110, t0 = 0.5) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((dd - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  /** a counter card lying on the map: a label over a big number; style 'card' or 'news' (a clipping) */
  function counter(c, x, y, label, value, { style = 'card', w = 380, a = 1, rot = -0.03 } = {}) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot);
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14; c.shadowOffsetX = 8; c.shadowOffsetY = 11;
    c.fillStyle = style === 'news' ? C.news : C.cream;
    if (style === 'news') { c.beginPath(); c.moveTo(0, 0); for (let i = 0; i <= 12; i++) c.lineTo((w * i) / 12, (i % 2) * 5); c.lineTo(w, 128); for (let i = 12; i >= 0; i--) c.lineTo((w * i) / 12, 128 - (i % 2) * 5); c.closePath(); c.fill(); }
    else { c.beginPath(); c.roundRect(0, 0, w, 128, 10); c.fill(); }
    c.shadowColor = 'transparent';
    c.fillStyle = C.ink; c.textAlign = 'left';
    c.font = `30px "ArchivoBlack-400", ${JP}`; c.fillText(label, 22, 42);
    if (style === 'news') { c.fillStyle = 'rgba(21,18,15,.25)'; for (let i = 0; i < 4; i++) c.fillRect(w - 128, 18 + i * 12, 104, 4); c.fillStyle = C.ink; }
    c.font = '400 70px "Anton-400"'; c.fillText(value, 22, 112);
    c.restore();
  }
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  /** the camera for a top-down shot: a slow drift and a zoom about a focus */
  const camOf = (lt, dd, hits, { z0 = 1, z1 = 1.04, fx = 525, fy = 960, kick = 0.022 } = {}) =>
    ({ x: Math.sin(lt * 0.31) * 5, y: Math.cos(lt * 0.27) * 4, z: punch(lt, hits, { kick }) * lerp(z0, z1, ease.io(lt / dd)), fx, fy });
  /** the inside crowns: present until they are felled at their own time `gone(t)` */
  function insideTrees(g, gone) {
    // the forest floor under every crown still standing, so the stumps in the ground sheet do not show through the gaps
    g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    for (const t of IN) { const a = 1 - clamp(gone(t) + 0.15, 0, 1); if (a <= 0) continue; g.fillStyle = `rgba(18,26,20,${a})`; g.beginPath(); g.arc(t.x, t.y, 24, 0, TAU); g.fill(); }
    g.restore();
    for (const t of IN) {
      const tg = gone(t), k = clamp(tg, 0, 1);
      if (k >= 1) continue;
      drawTree(g, t, 1 - 0.7 * ease.io(k), 1 - k);
    }
  }

  // ═════════ 1 · cnt_wood: the forest from above; a red marker draws the site's boundary; on "gone" the crowns inside
  //            it go, lane by lane, leaving soil, ruts, slash and stumps ═════════
  const RING = (() => {                                       // the boundary, densified, with a hand's small wobble
    const pts = [], r = U.rng(11), P = [...SITE, SITE[0]];
    for (let i = 0; i < P.length - 1; i++) { const [a, b] = [P[i], P[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14); for (let j = 0; j < n; j++) { const k = j / n; pts.push([lerp(a[0], b[0], k) + (r() - 0.5) * 4, lerp(a[1], b[1], k) + (r() - 0.5) * 4]); } }
    pts.push([...pts[0]]); let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
    return { pts, cum, L };
  })();
  /** the boundary drawn to fraction k, and the marker's tip at its end */
  function ringTo(g, k, { pen = true, a = 1 } = {}) {
    if (k <= 0) return; const { pts, cum, L } = RING, end = k * L;
    g.save(); g.globalAlpha = a; g.strokeStyle = C.marker; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([18, 12]);
    g.beginPath(); g.moveTo(...pts[0]); let tip = pts[0];
    for (let i = 1; i < pts.length; i++) { if (cum[i] <= end) { g.lineTo(...pts[i]); tip = pts[i]; } else { const f = (end - cum[i - 1]) / (cum[i] - cum[i - 1]); tip = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; g.lineTo(...tip); break; } }
    g.stroke(); g.restore();
    if (pen && k < 1) marker(g, tip[0], tip[1]);
  }
  /** a red marker pen seen from above, nib at (x, y) */
  function marker(g, x, y) {
    g.save(); g.translate(x, y); g.rotate(-0.85);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(14, 4, 170, 30);
    g.fillStyle = C.marker; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -10); g.lineTo(26, 10); g.closePath(); g.fill();
    g.fillStyle = '#e8e2d4'; g.fillRect(26, -14, 120, 28); g.fillStyle = C.marker; g.fillRect(146, -15, 40, 30); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(30, -12, 114, 6);
    g.restore();
  }
  /** when a crown inside the site goes: from the pop, a front sweeping the clearing lane by lane from the road side */
  const fellAt = (t, tP) => { const lane = Math.floor((t.x - BOX.x0) / 64), along = (BOX.y1 - t.y) / (BOX.y1 - BOX.y0); return tP - 0.05 + lane * 0.1 + along * 0.28 + t.k * 0.08; };   // score.py mirrors this
  SCENES.cnt_wood = { draw(c, lt) {
    const id = 'cnt_wood', dd = dur(id), tP = at(id, 'gone', 3.0);
    const cam = camOf(lt, dd, [tP], { z0: 1.0, z1: 1.05, kick: 0.03 });
    const kRing = ease.io((lt - 0.12) / Math.max(0.6, tP - 0.17));   // the boundary closes on the pop
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 },
      { d: 0.1, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); insideTrees(g, (t) => (lt - fellAt(t, tP)) / 0.18); g.restore(); } },
      { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy); ringTo(g, kRing, { pen: true });
        // a puff of sawdust where each crown has just gone
        for (const t of IN) { const k = (lt - fellAt(t, tP) - 0.05) / 0.4; if (k <= 0 || k >= 1) continue; g.fillStyle = `rgba(230,205,150,${0.35 * (1 - k)})`; g.beginPath(); g.arc(t.x, t.y, 6 + 16 * k, 0, TAU); g.fill(); }
        g.restore();
      } }], cam);
    tag(c, ui('place', 'MUHOS, FINLAND'), lt, dd);
    box(c);
  } };

  // ═════════ 2 · cnt_ha: the regulator's unit. A hectare grid fills the clearing row by row and a card counts to
  //            300+; on "assessment" the assessment card slides in, its box still empty ═════════
  const SQ = 38;                                              // one hectare, at this map's scale
  const CELLS = (() => { const out = []; for (let y = BOX.y0 + 4; y < BOX.y1; y += SQ) for (let x = BOX.x0 + 4; x < BOX.x1; x += SQ) if (inside(SITE, x + SQ / 2, y + SQ / 2)) out.push([x, y]); return out; })();
  const ROWS = [...new Set(CELLS.map(([, y]) => y))];
  function hectares(g, k, flash = 0) {
    const n = Math.floor(k * ROWS.length + 1e-6), part = k * ROWS.length - n;
    g.save(); g.lineWidth = 2.5;
    for (const [x, y] of CELLS) {
      const ri = ROWS.indexOf(y); if (ri > n) continue;
      const a = ri < n ? 1 : part; if (a <= 0) continue;
      g.strokeStyle = `rgba(239,230,207,${0.6 * a})`; g.strokeRect(x, y, SQ, SQ);
      if (ri === n - 1 || ri === n) { g.fillStyle = `rgba(239,230,207,${0.16 * a})`; g.fillRect(x, y, SQ, SQ); }
      if (flash > 0) { g.fillStyle = `rgba(227,163,58,${0.25 * flash})`; g.fillRect(x, y, SQ, SQ); }
    }
    g.restore();
  }
  /** the assessment: an index card with its title and an empty tick box */
  const eiaCard = () => sprite('cnt_eia', 380, 210, 0, 0, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(0, 0, 370, 200, 10); g.fill();
    g.fillStyle = C.blue; g.fillRect(0, 0, 370, 14);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = `400 34px "Anton-400", ${JP}`;
    g.fillText(ui('eiaTitle', 'ENVIRONMENTAL IMPACT'), 22, 62); g.fillText(ui('eiaTitle2', 'ASSESSMENT'), 22, 102);
    g.fillStyle = 'rgba(21,18,15,.18)'; for (let i = 0; i < 2; i++) g.fillRect(22, 126 + i * 20, 210, 5);
    g.strokeStyle = C.ink; g.lineWidth = 5; g.strokeRect(278, 120, 58, 58);
  }, 6);
  SCENES.cnt_ha = { draw(c, lt) {
    const id = 'cnt_ha', dd = dur(id), tG = at(id, 'grid', 0.6), tE = at(id, 'eia', 3.2);
    const cam = camOf(lt, dd, [tE], { z0: 1.02, z1: 1.06, kick: 0.025 });
    const kG = clamp((lt - tG) / Math.max(0.8, tE - tG - 0.35), 0, 1), flash = lt > tE ? Math.exp(-(lt - tE) * 4) : 0;
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); hectares(g, kG, flash); ringTo(g, 1, { pen: false, a: 0.85 }); g.restore(); } }], cam);
    counter(c, 120, 1410, ui('haLabel', 'HECTARES'), kG >= 1 ? '300+' : fmt(300 * kG), { a: clamp((lt - tG + 0.2) / 0.3, 0, 1) });
    const kE = (lt - tE + 0.12) / 0.4;
    if (kE > 0) put(c, eiaCard(), lerp(1120, 560, ease.back(kE)), 1352 + swing(lt, [[tE + 0.3, 6]]), { rot: 0.03, lift: 1.1 });
    tag(c, ui('halt', 'LVV ORDERED A HALT · 6.10.2026'), lt, dd, 110, 0.6);
    box(c);
  } };

  // ═════════ 3 · cnt_trees: a newspaper's unit. Closer in: a loupe crosses the clearing, ticking stumps, and the
  //            clipping counts up to an estimated 250,000 on the pop ═════════
  const LOUPE = (lt, t0, t1) => { const k = ease.io((lt - t0) / (t1 - t0)); return [lerp(260, 760, k) + Math.sin(k * 7) * 60, lerp(700, 1180, k) + Math.sin(k * 4.4 + 1) * 90]; };
  SCENES.cnt_trees = { draw(c, lt) {
    const id = 'cnt_trees', dd = dur(id), tL = at(id, 'loupe', 0.6), tC = at(id, 'count', 3.0);
    const cam = camOf(lt, dd, [tC], { z0: 1.24, z1: 1.32, fx: 520, fy: 960, kick: 0.02 });
    const tEnd = dd - 0.3, [lx, ly] = LOUPE(lt, tL - 0.2, tEnd), LR = 120, MAG = 2.0;
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy);
        // every stump the loupe has passed keeps an ochre ring: counted
        g.strokeStyle = 'rgba(255,192,74,.95)'; g.lineWidth = 2.5;
        for (const t of IN) { if (!passed(t, lt, tL - 0.2, tEnd, LR)) continue; g.beginPath(); g.arc(t.x, t.y, 7.5, 0, TAU); g.stroke(); }
        // the lens: the ground under it, twice the size, and its brass rim and handle
        if (lt > tL - 0.3) {
          const sh = ground(); g.save(); g.beginPath(); g.arc(lx, ly, LR, 0, TAU); g.clip();
          g.translate(lx, ly); g.scale(MAG, MAG); g.translate(-lx, -ly); g.drawImage(sh.c, -sh.m, -sh.m); g.restore();
          g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(lx - 30, ly - 34, LR * 0.5, 0, TAU); g.fill();
          g.save(); g.translate(lx, ly); g.rotate(0.7);
          g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(LR + 6, -14 + 10, 150, 30);
          g.fillStyle = '#3a2618'; g.fillRect(LR - 2, -13, 150, 26); g.fillStyle = '#5a3a24'; g.fillRect(LR - 2, -13, 150, 7);
          g.restore();
          g.strokeStyle = '#c8a050'; g.lineWidth = 12; g.beginPath(); g.arc(lx, ly, LR, 0, TAU); g.stroke();
          g.strokeStyle = '#ead08a'; g.lineWidth = 3; g.beginPath(); g.arc(lx, ly, LR - 3, Math.PI, Math.PI * 1.7); g.stroke();
        }
        g.restore();
      } }], cam);
    const kN = clamp((lt - tL) / (tC - tL), 0, 1);
    counter(c, 120, 1410, ui('treesLabel', 'TREES · ESTIMATE'), fmt(250000 * Math.pow(kN, 1.6)), { style: 'news', w: 420, a: clamp((lt - tL + 0.2) / 0.3, 0, 1), rot: -0.025 });
    tag(c, ui('guardian', "THE GUARDIAN'S ESTIMATE · 22.10.2026"), lt, dd, 110, 0.6);
    box(c);
  } };
  /** has the loupe passed over this stump by now (it moved from t0 to t1)? */
  function passed(t, lt, t0, t1, LR) {
    if (lt < t0) return false;
    for (let s = t0; s <= Math.min(lt, t1); s += 0.05) { const [x, y] = LOUPE(s, t0, t1); if ((t.x - x) ** 2 + (t.y - y) ** 2 < (LR * 0.8) ** 2) return true; }
    return false;
  }

  // ═════════ 4 · cnt_names: the citizens' unit. Signatures fall on everything like the first snow; the card counts
  //            past 50,000 on "rules" ═════════
  const SLIPS = (() => { const r = U.rng(23), out = []; for (let i = 0; i < 150; i++) out.push({ x: 120 + r() * 840, y: 520 + r() * 900, t: Math.pow(r(), 0.7), sway: r() * TAU, rot: (r() - 0.5) * 1.2, seed: i }); return out; })();
  const slip = (i) => sprite('cnt_slip' + (i % 5), 70, 46, 35, 23, (g) => {
    g.fillStyle = C.slip; g.fillRect(-32, -20, 64, 40); g.fillStyle = C.slipD; g.fillRect(-32, 14, 64, 6);
    const r = U.rng(i * 7 + 3); g.strokeStyle = '#1f3c8a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-24, 4);
    for (let k = 0; k < 6; k++) g.bezierCurveTo(-20 + k * 8, -10 + r() * 12, -16 + k * 8, 8 - r() * 10, -14 + k * 8, 2); g.stroke();
  }, 4);
  SCENES.cnt_names = { draw(c, lt) {
    const id = 'cnt_names', dd = dur(id), tS = at(id, 'snow', 0.6), tN = at(id, 'names', 3.0);
    const cam = camOf(lt, dd, [tN], { z0: 0.98, z1: 1.01, kick: 0.02 });
    const span = Math.max(1.6, tN - tS + 0.9);                // the snow keeps falling past the pop
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy); ringTo(g, 1, { pen: false, a: 0.6 });
        for (const s of SLIPS) {
          const t0 = tS - 0.1 + s.t * span, k = (lt - t0) / 0.9; if (k <= 0) continue;
          const f = ease.out(k), y = lerp(s.y - 700, s.y, f), x = s.x + Math.sin(s.sway + lt * 3) * 26 * (1 - f), rot = s.rot + Math.sin(s.sway + lt * 4) * 0.5 * (1 - f);
          put(g, slip(s.seed), x, y, { rot, sc: 1 + 0.25 * (1 - f), lift: 0.3 + 1.6 * (1 - f) });
        }
        g.restore();
      } }], cam);
    const kN = clamp((lt - tS) / (tN - tS), 0, 1), v = 50000 * ease.io(kN);
    counter(c, 120, 1410, ui('namesLabel', 'NAMES'), kN >= 1 ? '50,000+' : fmt(v), { a: clamp((lt - tS + 0.2) / 0.3, 0, 1), rot: 0.02 });
    tag(c, ui('initiative', "CITIZENS' INITIATIVE · 15.9.2026"), lt, dd, 110, 0.6);
    box(c);
  } };

  // ═════════ 5 · cnt_end: Doodle's unit. The clearing again; the clipping says what was felled; on line 2 saplings
  //            come up in rows across 40 % of the clearing; on "130 hectares" its label lands, with the wordmark ═════════
  const SAPS = (() => { const out = []; let row = 0; for (let y = Y_PATCH + 12; y < BOX.y1; y += 24, row++) for (let x = BOX.x0 + 10 + (row % 2) * 12; x < BOX.x1; x += 24) if (inPatch(x, y)) out.push([x, y, row]); return out; })();
  const NROW = SAPS.reduce((m, s) => Math.max(m, s[2]), 0) + 1;
  const patchLabel = () => sprite('cnt_patch', 400, 200, 0, 0, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(0, 0, 390, 190, 10); g.fill();
    BDF.doodleLogo(g, 22, 50, 38);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = `26px "ArchivoBlack-400", ${JP}`; g.fillText(ui('planting', 'PLANTING PLANNED'), 22, 92);
    g.font = '400 70px "Anton-400"'; g.fillText(ui('patchHa', '130 ha'), 22, 168);
    g.fillStyle = C.sapD; g.fillRect(0, 180, 390, 10);
  }, 6);
  SCENES.cnt_end = { draw(c, lt) {
    const id = 'cnt_end', dd = dur(id), tF = at(id, 'felled', 0.5), tPl = at(id, 'plant', 1.8), tH = at(id, 'ha', 3.0);
    const cam = camOf(lt, dd, [tH], { z0: 1.02, z1: 1.07, fy: 1000, kick: 0.03 });
    const kS = clamp((lt - tPl) / 1.5, 0, 1);                // the rows keep coming up past the pop
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy);
        ringTo(g, 1, { pen: false, a: 0.6 });
        // the patch's own outline, dashed, from the first sapling on
        // the patch: a green wash over the planted part, so 40 % reads as 40 %, and its dashed edge
        if (kS > 0) { g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); g.fillStyle = `rgba(127,207,90,${0.16 * clamp(kS * 3, 0, 1)})`; g.fillRect(BOX.x0 - 10, Y_PATCH, BOX.x1 - BOX.x0 + 20, BOX.y1 - Y_PATCH + 10); g.strokeStyle = 'rgba(150,225,110,.9)'; g.lineWidth = 5; g.setLineDash([12, 9]); g.beginPath(); g.moveTo(BOX.x0 - 10, Y_PATCH); g.lineTo(BOX.x1 + 10, Y_PATCH); g.stroke(); g.restore(); }
        for (const [x, y, row] of SAPS) {
          const k = (kS * NROW - row) / 1.2; if (k <= 0) continue; const s = ease.back(clamp(k, 0, 1));
          g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + 2.5, y + 3.5, 7.5 * s, 0, TAU); g.fill();
          g.fillStyle = C.sapD; g.beginPath(); g.arc(x, y, 8.5 * s, 0, TAU); g.fill(); g.fillStyle = C.sap; g.beginPath(); g.arc(x - 2, y - 2, 5.2 * s, 0, TAU); g.fill();
        }
        const kL = (lt - tH + 0.1) / 0.35;
        // the label sits on the bare soil just above the patch, its green foot on the patch's edge
        if (kL > 0) put(g, patchLabel(), 330, Y_PATCH - 196, { sc: ease.back(kL), rot: -0.03 + swing(lt, [[tH + 0.25, 0.04]]), lift: 1.0 });
        g.restore();
      } }], cam);
    counter(c, 120, 1410, ui('felledLabel', 'FELLED · ESTIMATE'), '≈250,000', { style: 'news', w: 420, a: clamp((lt - tF + 0.1) / 0.3, 0, 1), rot: -0.025 });
    box(c);
  } };

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // THE VIRAL CUT (papercut/count-the-trees-viral, plan/films/25b-count-the-trees-viral.md). Owner, 23 Oct: "Doodle 5 is
  // now becoming more of bigger news so we should highlight that and make it a viral video." The same map, the same
  // helpers; five short shots at the Doodle tempo. Frame 0 IS the hook (the forest already going under a big clipping);
  // the story escalates (before the assessment → a police inquiry → headlines in six languages) and the last frame
  // hands back to the first: the camera ends exactly where frame 0 starts, the clipping in the same place, so a replay
  // reads as one more turn of the same thing. v1's scenes above are untouched.
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const V = { z0: 1.03, fx: 525, fy: 960 };                  // frame 0's camera, and the last frame's
  /** a viral-cut camera: a drift that is 0 at both ends of the shot, a zoom path, and kicks on the hits */
  const vcam = (lt, dd, { z = () => 1, hits = [], kick = 0.03, amp = 4 } = {}) => {
    let zz = z(lt); for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx: V.fx, fy: V.fy };
  };
  /** a zoom on the whole map, under the clipping and the box: the stack's per-layer zoom is ~10 % of z, too little to read
   *  as a camera move. 1 on frame 0 and on the last frame, so the loop still matches */
  const camZ = (c, z, fx = V.fx, fy = V.fy) => { if (z !== 1) { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); } };
  /** the big clipping on frame 0 (and on the last frame, in the same place): torn newsprint, label over the number */
  function bigClip(c, label, value, { k = 1, a = 1, dy = 0 } = {}) {
    if (a <= 0) return;
    const x = 130, y = 1398 + dy, w = 780, h = 206, sc = 1 + 0.05 * (1 - ease.out(k));
    c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(-0.022); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18; c.shadowOffsetX = 9; c.shadowOffsetY = 13;
    c.fillStyle = C.news; c.beginPath(); c.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) c.lineTo((w * i) / 16, (i % 2) * 7);
    c.lineTo(w, h); for (let i = 16; i >= 0; i--) c.lineTo((w * i) / 16, h - (i % 2) * 7); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = C.ink; c.textAlign = 'left'; c.font = `30px "ArchivoBlack-400", ${JP}`; c.fillText(label, 26, 46);
    c.font = '400 150px "Anton-400"'; c.fillText(value, 24, 190);
    c.fillStyle = 'rgba(21,18,15,.22)'; for (let i = 0; i < 5; i++) c.fillRect(w - 250, 78 + i * 22, 220 - (i % 2) * 40, 7);
    c.restore();
  }
  /** the hook's felling front: faster than v1's, and already moving at frame 0 (t0 < 0) */
  const fellV = (t, t0) => { const lane = Math.floor((t.x - BOX.x0) / 64), along = (BOX.y1 - t.y) / (BOX.y1 - BOX.y0); return t0 + lane * 0.075 + along * 0.2 + t.k * 0.06; };   // score.py mirrors this
  const HOOK_LEAD = 1.05;                                    // the front finishes this long after it starts: on "Gone."

  // ── v2 (owner: "330 ha is huge"): ONE football pitch to the clearing's own scale, then as many as tile it. SITE is
  //    552,990 px² and the clearing ~330 ha, so 0.409 px/m and a 105 × 68 m pitch (0.714 ha) is 43.0 × 27.8 px; 330 / 0.714 =
  //    462, and 463 cells of the grid have their centre inside the red line. The patch (the lowest 40 %) holds ~185 of them
  //    (130 / 0.714 = 182). Trees, road and car are drawn at the map's illustrative scale; only the area is to scale.
  const PXM = (() => { let a = 0; SITE.forEach(([x1, y1], i) => { const [x2, y2] = SITE[(i + 1) % SITE.length]; a += x1 * y2 - x2 * y1; }); return Math.sqrt(Math.abs(a) / 2 / 3.3e6); })();
  const PW = 105 * PXM, PH = 68 * PXM, P0 = { x: 525.5, y: 931.5 };          // P0: the first pitch, near the middle
  const PITCHES = (() => {
    const gx = P0.x - PW * 8.5, gy = P0.y - PH * 15.5, out = [];
    for (let j = -2; j < 40; j++) for (let i = -2; i < 22; i++) { const x = gx + PW * (i + 0.5), y = gy + PH * (j + 0.5); if (inside(SITE, x, y)) out.push({ x, y, d: Math.hypot(x - P0.x, (y - P0.y) * 1.25), patch: y >= Y_PATCH }); }
    const dm = Math.max(...out.map((p) => p.d)); out.forEach((p) => (p.d /= dm)); return out;
  })();
  const PS = 4;                                              // drawn at 4× the map, so it holds up under the 3× push-in
  const pitchSp = () => sprite('cntv_pitch', PW * PS, PH * PS, (PW * PS) / 2, (PH * PS) / 2, (g) => {
    const w = PW * PS, h = PH * PS, m = PXM * PS; g.translate(-w / 2, -h / 2);
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#4f8f38' : '#5da043'; g.fillRect((w * i) / 10, 0, w / 10 + 0.6, h); }
    g.strokeStyle = '#f5f2e6'; g.lineWidth = 4; const L = 1.5 * m;
    g.strokeRect(L, L, w - 2 * L, h - 2 * L); g.beginPath(); g.moveTo(w / 2, L); g.lineTo(w / 2, h - L); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 9.15 * m, 0, TAU); g.stroke();
    for (const side of [0, 1]) {
      const bx = side ? w - L - 16.5 * m : L, gx = side ? w - L - 5.5 * m : L;
      g.strokeRect(bx, h / 2 - 20.15 * m, 16.5 * m, 40.3 * m); g.strokeRect(gx, h / 2 - 9.15 * m, 5.5 * m, 18.3 * m);
    }
  }, 4);
  /** the pitches tiled over the clearing, each appearing at its own time (kAt(p) → 0..1), cut to the red line */
  function tilePitches(g, kAt) {
    g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    const sp = pitchSp();
    g.globalAlpha = 0.88; for (const p of PITCHES) { const k = kAt(p); if (k <= 0) continue; put(g, sp, p.x, p.y, { sc: ease.back(clamp(k, 0, 1)) / PS, lift: 0 }); }
    g.restore();
  }
  /** a tag in screen space, centred: newsprint, one line */
  function screenTag(c, text, x, y, { a = 1, size = 36 } = {}) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `${size}px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 48, h = size + 34;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.news; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 8); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'center'; c.fillText(text, x, y + size * 0.36); c.restore();
  }

  /** v3 (owner, 24 Oct: "where and when ... more clarity"): the place, on a newsprint tag above the clipping, with
   *  Doodle in its own colours (BDF.doodleLogo, as in Trade Secret): NEW Doodle DATA CENTRE · MUHOS, FINLAND */
  function placeTag(c, { a = 1, dy = 0 } = {}) {
    if (a <= 0) return;
    const pre = ui('placePre', 'NEW '), post = ui('placePost', ' DATA CENTRE · MUHOS, FINLAND'), size = 30, ls = size * 1.32;
    c.save(); c.globalAlpha = a; c.font = `${size}px "ArchivoBlack-400", ${JP}`;
    const wPre = pre ? c.measureText(pre).width : 0, wPost = c.measureText(post).width;
    c.font = ls + 'px "Poppins-600"'; const wLogo = c.measureText('Doodle').width - ls * 0.1;
    const w = wPre + wLogo + wPost + 48, h = size + 34, x = 130 + 8, y = 1398 - 20 + dy - h;
    c.save(); c.translate(x, y); c.rotate(-0.022);
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.news; c.beginPath(); c.roundRect(0, 0, w, h, 8); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'left'; c.font = `${size}px "ArchivoBlack-400", ${JP}`;
    const by = h / 2 + size * 0.36; let px = 24;
    if (pre) { c.fillText(pre, px, by); px += wPre; }
    BDF.doodleLogo(c, px, by + 1, ls); px += wLogo;
    c.fillStyle = C.ink; c.font = `${size}px "ArchivoBlack-400", ${JP}`; c.fillText(post, px, by);
    c.restore(); c.restore();
  }

  // ═════════ V1 · cntv_hook: frame 0 — the forest inside the red line is already going, lane by lane, under the
  //            clipping "TREES · THE GUARDIAN'S ESTIMATE / 250,000"; the last lane falls on "Gone." ═════════
  SCENES.cntv_hook = { draw(c, lt) {
    const id = 'cntv_hook', dd = dur(id), tP = at(id, 'gone', 0.7), t0 = tP - HOOK_LEAD;
    const cam = vcam(lt, dd, { z: (l) => 1 + 0.03 * (1 - ease.out(l / 0.4)), hits: [tP], kick: 0.035 });
    c.save(); camZ(c, 1 + 0.035 * ease.io((lt - tP - 0.2) / (dd - tP - 0.2)), V.fx, 950);   // a slow push on the empty site
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 },
      { d: 0.1, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); insideTrees(g, (t) => (lt - fellV(t, t0)) / 0.16); g.restore(); } },
      { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy); ringTo(g, 1, { pen: false });
        for (const t of IN) { const k = (lt - fellV(t, t0) - 0.04) / 0.35; if (k <= 0 || k >= 1) continue; g.fillStyle = `rgba(230,205,150,${0.4 * (1 - k)})`; g.beginPath(); g.arc(t.x, t.y, 6 + 18 * k, 0, TAU); g.fill(); }
        // on "Gone.": the whole clearing flashes once, so the hit lands in the picture too
        if (lt > tP) { const f = Math.exp(-(lt - tP) * 5) * 0.35; g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = `rgba(255,236,190,${f})`; g.fill(); g.restore(); }
        g.restore();
      } }], cam);
    c.restore();
    placeTag(c);
    bigClip(c, ui('treesLabel', 'TREES · THE GUARDIAN’S ESTIMATE'), ui('treesValue', '250,000'), { k: lt / 0.25 });
    box(c);
  } };

  // ═════════ V1b · cntv_pitch (v2): close on ONE football pitch on the cleared ground, tagged; then the camera pulls back
  //            while it multiplies outward until the clearing is tiled, ~460 of them, the last landing on "460" ═════════
  SCENES.cntv_pitch = { draw(c, lt) {
    const id = 'cntv_pitch', dd = dur(id), tOne = at(id, 'pitch', 0.1), tT = at(id, 'tile', 1.15), tN = at(id, 'n', 2.2);
    const kB = ease.io((lt - tT + 0.15) / (tN - tT + 0.55)), Z = lerp(2.4, 1.12, kB) * (1 + 0.012 * ease.io((lt - tN) / (dd - tN)));
    const cam = vcam(lt, dd, { z: () => 1.03, hits: [tN], kick: 0.03, amp: 2 });
    c.save(); camZ(c, Z, P0.x, P0.y);
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy);
        tilePitches(g, (p) => (p.d === 0 ? (lt - tOne) / 0.25 : (lt - tT - p.d * (tN - tT - 0.08)) / 0.16));
        // the first pitch: a white rim that breathes until it multiplies
        const kR = clamp((lt - tOne - 0.2) / 0.2, 0, 1) * (1 - clamp((lt - tT) / 0.3, 0, 1));
        if (kR > 0) { g.strokeStyle = `rgba(255,252,235,${0.9 * kR})`; g.lineWidth = 1.6 + 0.5 * Math.sin(lt * 9); g.strokeRect(P0.x - PW / 2 - 2, P0.y - PH / 2 - 2, PW + 4, PH + 4); }
        ringTo(g, 1, { pen: false, a: 0.9 });
        if (lt > tN) { const f = Math.exp(-(lt - tN) * 6) * 0.22; g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = `rgba(255,248,215,${f})`; g.fill(); g.restore(); }
        g.restore();
      } }], cam);
    c.restore();
    // the tag, in screen space, under the one pitch while it is alone
    screenTag(c, ui('pitchTag', 'ONE FOOTBALL PITCH · 105 × 68 m'), P0.x, P0.y + (PH / 2) * Z + 70, { a: clamp((lt - tOne - 0.25) / 0.2, 0, 1) * (1 - clamp((kB - 0.15) / 0.25, 0, 1)) });
    box(c);
  } };

  // ═════════ V2 · cntv_eia: the cleared site; on "assessment" the assessment card slams down on it, its box empty ═════════
  SCENES.cntv_eia = { draw(c, lt) {
    const id = 'cntv_eia', dd = dur(id), tE = at(id, 'eia', 1.3);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.02, 1.06, ease.io(l / dd)), hits: [tE], kick: 0.035 });
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); ringTo(g, 1, { pen: false, a: 0.9 }); g.restore(); } }], cam);
    const k = (lt - tE + 0.1) / 0.22;
    if (k > 0) { const sc = lerp(2.4, 1.55, ease.out(k)); put(c, eiaCard(), 540 - 190 * sc, 980 - 105 * sc + swing(lt, [[tE + 0.15, 5]]), { sc, rot: -0.04, lift: 1.4 * (1 - 0.6 * ease.out(k)) + 0.5 }); }
    tag(c, ui('halt', 'LVV ORDERED A HALT · 6.10.2026'), lt, dd, 110, 0.35);
    box(c);
  } };

  // ═════════ V3 · cntv_police: a patrol car comes along the road under the site, its light bar strobing blue over the
  //            clearing; on "inquiry" the inquiry card slams down ═════════
  const car = () => sprite('cntv_car', 110, 200, 55, 100, (g) => {
    g.fillStyle = '#e9edf0'; g.beginPath(); g.roundRect(-44, -92, 88, 184, 24); g.fill();
    g.fillStyle = '#2a5bb8'; g.fillRect(-44, -30, 88, 18); g.fillStyle = '#f2c230'; g.fillRect(-44, -12, 88, 8);
    g.fillStyle = '#1d2733'; g.beginPath(); g.roundRect(-34, -70, 68, 30, 8); g.fill(); g.beginPath(); g.roundRect(-34, 50, 68, 26, 8); g.fill();
    g.fillStyle = '#cfd6dc'; g.beginPath(); g.roundRect(-36, -38, 72, 84, 10); g.fill();
    g.fillStyle = '#20262e'; g.fillRect(-30, -6, 60, 14);                     // the light bar, unlit; its lamps are drawn live
  }, 6);
  const inqCard = () => sprite('cntv_inq', 520, 240, 260, 120, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(-250, -112, 500, 224, 12); g.fill();
    g.fillStyle = '#2a5bb8'; g.fillRect(-250, -112, 500, 52);
    g.fillStyle = '#f6f2e8'; g.textAlign = 'left'; g.font = `30px "ArchivoBlack-400", ${JP}`; g.fillText(ui('policeHead', 'POLICE · OULU'), -226, -74);
    g.fillStyle = C.ink; g.font = `400 52px "Anton-400", ${JP}`; g.fillText(ui('inqTitle', 'PRELIMINARY'), -226, 6); g.fillText(ui('inqTitle2', 'INQUIRY'), -226, 66);
    g.fillStyle = 'rgba(21,18,15,.2)'; for (let i = 0; i < 3; i++) g.fillRect(40, -20 + i * 24, 180 - i * 30, 7);
    g.fillStyle = '#9aa3ad'; g.fillRect(150, -128, 16, 64); g.strokeStyle = '#7d868f'; g.lineWidth = 5; g.beginPath(); g.roundRect(146, -132, 24, 72, 10); g.stroke();   // the paper clip
  }, 6);
  const CAR_SC = 0.3;                                         // v2 (owner: "police car is too big"): ~26 × 55 px, half the road
  SCENES.cntv_police = { draw(c, lt) {
    const id = 'cntv_police', dd = dur(id), tC = at(id, 'car', 0.1), tI = at(id, 'inq', 1.35);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.04, 1.08, ease.io(l / dd)), hits: [tI], kick: 0.03 });
    // the car runs along the road and pulls up under the site by the time the card lands
    const kc = ease.out((lt - tC) / Math.max(0.6, tI - tC - 0.1)), cx = lerp(-160, 470, kc), cy = roadY(cx) - 4, ang = Math.atan2(roadY(cx + 5) - roadY(cx - 5), 10) + Math.PI / 2;
    const strobe = (lt * 8) % 1 < 0.5, on = lt > tC;
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy); ringTo(g, 1, { pen: false, a: 0.9 });
        if (on) {
          // the blue light sweeping over the clearing from the car: two lobes, alternating
          const R0 = 760, lx = cx + (strobe ? -70 : 70), ly = cy - 90, rg = g.createRadialGradient(lx, ly, 6, lx, ly, R0);
          rg.addColorStop(0, 'rgba(70,130,255,.5)'); rg.addColorStop(0.35, 'rgba(70,130,255,.2)'); rg.addColorStop(1, 'rgba(70,130,255,0)');
          g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(lx - R0, ly - R0, R0 * 2, R0 * 2); g.restore();
        }
        put(g, car(), cx, cy, { rot: ang, sc: CAR_SC, lift: 0.3 });
        if (on) { g.save(); g.translate(cx, cy); g.rotate(ang); for (const [dx, lit] of [[-18, strobe], [18, !strobe]]) { const x = dx * CAR_SC; g.fillStyle = lit ? '#9cc4ff' : '#1d3a7a'; g.beginPath(); g.roundRect(x - 4, -2, 8, 4.5, 1.5); g.fill(); if (lit) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(120,170,255,.6)'; g.beginPath(); g.arc(x, 0, 15, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; } } g.restore(); }
        g.restore();
      } }], cam);
    const k = (lt - tI + 0.1) / 0.22;
    // v2: smaller, and over the top of the site, so the stumps and the car on the road below stay in view
    if (k > 0) { const sc = lerp(1.35, 0.92, ease.out(k)); put(c, inqCard(), 540, 655 + swing(lt, [[tI + 0.15, 5]]), { sc, rot: 0.035, lift: 1.4 * (1 - 0.6 * ease.out(k)) + 0.5 }); }
    tag(c, ui('police', 'OULU, FINLAND · OCTOBER 2026'), lt, dd, 110, 0.35);
    box(c);
  } };

  // ═════════ V4 · cntv_world: headlines in six languages land on the map, one after another; on "worldwide" the
  //            seventh, the biggest, lands on top. Real reported phrasings; no mastheads, no outlet names ═════════
  const HEADS = [   // [text, language chip, x, y, rot, size] — each phrase as reported (plan/films/25b, the re-check)
    ['250 MIL ÁRVORES', 'PT', 128, 560, -0.05, 64],
    ['SUTE DE MII DE COPACI', 'RO', 362, 718, 0.04, 54],
    ['METSÄHAKKUUT MUHOKSELLA', 'FI', 120, 880, -0.03, 52],
    ['500 FUSSBALLFELDER WALD', 'DE', 330, 1040, 0.035, 50],
    ['CHOCA CON UN BOSQUE', 'ES', 140, 1200, -0.045, 56],
    ['250,000 TREES', 'EN', 300, 1370, 0.03, 64],
  ];
  function headSlip(c, [text, chip, x, y, rot, size], { k = 1, sc = 1 } = {}) {
    if (k <= 0) return;
    c.save(); c.font = `400 ${size}px "Anton-400"`; const tw = c.measureText(text).width, w = Math.min(780, tw + 108), h = size + 92;
    const x1 = Math.min(x, 905 - w * sc);                     // never into the right-hand rail
    const kk = ease.out(k), dy = (1 - kk) * -260, s2 = sc * (1 + 0.5 * (1 - kk));
    c.globalAlpha = clamp(k * 3, 0, 1); c.translate(x1 + w / 2, y + h / 2 + dy); c.rotate(rot + (1 - kk) * 0.4); c.scale(s2, s2); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14 + 20 * (1 - kk); c.shadowOffsetX = 7 + 14 * (1 - kk); c.shadowOffsetY = 10 + 20 * (1 - kk);
    c.fillStyle = C.news; c.beginPath(); c.moveTo(0, 0); for (let i = 0; i <= 10; i++) c.lineTo((w * i) / 10, (i % 2) * 6); c.lineTo(w, h); for (let i = 10; i >= 0; i--) c.lineTo((w * i) / 10, h - (i % 2) * 6); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = C.ink; c.textAlign = 'left'; c.fillText(text, 24, size + 22);
    c.fillStyle = 'rgba(21,18,15,.22)'; for (let i = 0; i < 2; i++) c.fillRect(24, size + 40 + i * 18, (w - 150) * (1 - i * 0.3), 6);
    c.fillStyle = C.marker; c.beginPath(); c.roundRect(w - 92, h - 52, 68, 36, 6); c.fill();
    c.fillStyle = '#fff'; c.font = '26px "ArchivoBlack-400"'; c.fillText(chip, w - 82, h - 24);
    c.restore();
  }
  const SLIP_EVERY = 0.19;                                   // score.py mirrors this
  SCENES.cntv_world = { draw(c, lt) {
    const id = 'cntv_world', dd = dur(id), tS = at(id, 'slips', 0.05), tW = at(id, 'world', 1.5);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.02, 0.97, ease.io(l / dd)), hits: [tW], kick: 0.04 });
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); ringTo(g, 1, { pen: false, a: 0.8 }); g.restore(); } }], cam);
    HEADS.slice(0, 5).forEach((hd, i) => headSlip(c, hd, { k: (lt - tS - i * SLIP_EVERY) / 0.2 }));
    // the last, English, slip is the biggest and lands ON the pop word
    headSlip(c, HEADS[5], { k: (lt - tW + 0.06) / 0.2, sc: 1.18 });
    if (lt > tW) { const f = Math.exp(-(lt - tW) * 6) * 0.25; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); }
    // v2: this shot has no caption (the pitch beat took the third fact), so its label stands where a caption would
    screenTag(c, ui('world', 'HEADLINES IN SIX LANGUAGES'), W / 2, 300, { a: clamp((lt - 0.25) / 0.25, 0, 1) * clamp((dd - 0.15 - lt) / 0.25, 0, 1), size: 44 });
    box(c);
  } };

  // ═════════ V5 · cntv_end (v2). Owner: "ending too abruptly", "the visual seems small for 130ha". The camera comes in
  //            until the clearing fills the frame; the planted 40 % is bright, dense and edged, across the clearing's
  //            whole width, with the pitch grid faint over everything so it reads as ~180 of the ~460; the label stands
  //            on the bare ground above it with an arrow down, never on it. Then a long hold and a slow ease back out to
  //            frame 0's exact framing; the clipping rises into place on "clip", and the frame holds still while the
  //            score's last chord rings: the join into the sign-off, and the loop ═════════
  const SAPSV = (() => { const out = []; let row = 0; for (let y = Y_PATCH + 9; y < BOX.y1; y += 16, row++) for (let x = BOX.x0 + 6 + (row % 2) * 8; x < BOX.x1; x += 16) if (inPatch(x, y)) out.push([x, y, row]); return out; })();
  const NROWV = SAPSV.reduce((m, s) => Math.max(m, s[2]), 0) + 1;
  const patchLabelV = () => sprite('cntv_patch', 400, 250, 0, 0, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(0, 0, 390, 240, 10); g.fill();
    BDF.doodleLogo(g, 22, 50, 38);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = `26px "ArchivoBlack-400", ${JP}`; g.fillText(ui('planting', 'PLANTING PLANNED'), 22, 92);
    g.font = '400 70px "Anton-400"'; g.fillText(ui('patchHa', '130 ha'), 22, 166);
    g.fillStyle = '#2f6b26'; g.font = `24px "ArchivoBlack-400", ${JP}`; g.fillText(ui('pitches', '≈ 180 FOOTBALL PITCHES'), 22, 212);   // v2/v3 label (kept for older builds)
    g.fillStyle = C.sapD; g.fillRect(0, 230, 390, 10);
  }, 6);
  // v4 (owner: "What's the end learning?"): the label says the learning, 130 OF ~330 ha · UNDER HALF, in place of
  //    the pitches line, and a second, red-edged tag pops on the bare part on "half" (the rest of the clearing)
  const patchLabelV4 = () => sprite('cntv_patch4', 430, 250, 0, 0, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(0, 0, 420, 240, 10); g.fill();
    BDF.doodleLogo(g, 22, 50, 38);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = `26px "ArchivoBlack-400", ${JP}`; g.fillText(ui('planting', 'PLANTING PLANNED'), 22, 92);
    g.font = '400 70px "Anton-400"'; g.fillText(ui('patchHa', '130 ha'), 22, 166);
    g.fillStyle = '#b8321f'; let fs = 26; g.font = `${fs}px "ArchivoBlack-400", ${JP}`; const t = ui('underHalf', '130 OF ~330 ha · UNDER HALF');
    while (g.measureText(t).width > 380 && fs > 16) { fs -= 1; g.font = `${fs}px "ArchivoBlack-400", ${JP}`; } g.fillText(t, 22, 212);
    g.fillStyle = C.sapD; g.fillRect(0, 230, 420, 10);
  }, 6);
  SCENES.cntv_end = { draw(c, lt) {
    const id = 'cntv_end', dd = dur(id), tPl = at(id, 'plant', 0.9), tH = at(id, 'ha', 1.5), tB = at(id, 'back', dd - 2.6), tC = at(id, 'clip', dd - 1.1);
    const tL = Math.min(dd - 0.4, tC + 0.35);                 // home: frame 0's framing from here to the last frame
    const kR = ease.io((lt - tB) / (tL - tB));                // the return
    const cam = vcam(lt, dd, { z: (l) => lerp(1.03 + 0.06 * ease.io((l - tPl + 0.3) / 0.6), V.z0, kR), hits: [tH], kick: 0.03, amp: 3 });
    cam.x *= 1 - kR; cam.y *= 1 - kR;
    // the push: in until the clearing fills the frame by the pop, on slowly through the hold, back to 1 by home
    const zP = 1 + 0.24 * ease.io((lt + 0.25) / (tH + 0.15)) + 0.06 * ease.io((lt - tH - 0.2) / (tB - tH - 0.2)), Z = lt >= tL ? 1 : lerp(zP, 1, kR);
    if (lt >= tL) { cam.x = 0; cam.y = 0; cam.z = V.z0; }
    // the saplings come up row by row over ~2.4 s, most of them by the pop, the rest still settling through the hold
    const kS = ease.out(clamp((lt - tPl) / 2.4, 0, 1));
    c.save(); camZ(c, Z, V.fx, 1010);
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 }, { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy);
        g.save(); g.beginPath(); SITE.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
        if (kS > 0) {
          const a = clamp(kS * 3, 0, 1);
          g.fillStyle = `rgba(118,205,80,${0.34 * a})`; g.fillRect(BOX.x0 - 10, Y_PATCH, BOX.x1 - BOX.x0 + 20, BOX.y1 - Y_PATCH + 10);
          for (const [x, y, row] of SAPSV) {
            const k = (kS * NROWV - row) / 1.4; if (k <= 0) continue; const s = ease.back(clamp(k, 0, 1)) * (1 + 0.03 * Math.sin(lt * 2.2 + x * 0.05));
            g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + 2, y + 3, 6.2 * s, 0, TAU); g.fill();
            g.fillStyle = '#3f8a32'; g.beginPath(); g.arc(x, y, 7 * s, 0, TAU); g.fill(); g.fillStyle = '#9be36a'; g.beginPath(); g.arc(x - 1.6, y - 1.6, 4.4 * s, 0, TAU); g.fill();
          }
        }
        // the pitch grid, faint over the whole clearing, so the planted 40 % reads as ~180 of the ~460
        g.strokeStyle = `rgba(250,246,230,${0.26 * clamp((lt - 0.1) / 0.5, 0, 1)})`; g.lineWidth = 1.2;
        for (const p of PITCHES) g.strokeRect(p.x - PW / 2, p.y - PH / 2, PW, PH);
        if (kS > 0) {   // the patch's edge: one bright solid line across the clearing's whole width, with a glow
          const a = clamp(kS * 3, 0, 1);
          g.strokeStyle = `rgba(160,240,110,${0.35 * a})`; g.lineWidth = 16; g.beginPath(); g.moveTo(BOX.x0, Y_PATCH); g.lineTo(BOX.x1, Y_PATCH); g.stroke();
          g.strokeStyle = `rgba(200,255,160,${0.95 * a})`; g.lineWidth = 5; g.beginPath(); g.moveTo(BOX.x0, Y_PATCH); g.lineTo(BOX.x1, Y_PATCH); g.stroke();
        }
        g.restore();
        ringTo(g, 1, { pen: false });
        // the label on the bare ground above the patch, an arrow down into it
        const kL = (lt - tH + 0.08) / 0.25;
        if (kL > 0) {
          const ax = 525, a0 = Y_PATCH - 62, a1 = Y_PATCH + 40, kA = clamp((lt - tH - 0.1) / 0.25, 0, 1);
          put(g, patchLabelV4(), 350, Y_PATCH - 262, { sc: 0.82 * ease.back(kL), rot: -0.02 + swing(lt, [[tH + 0.2, 0.03]]), lift: 1.0 });
          if (kA > 0) { const y1 = lerp(a0, a1, ease.out(kA)); g.save(); g.strokeStyle = C.cream; g.fillStyle = C.cream; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 8; g.shadowOffsetX = 4; g.shadowOffsetY = 6; g.beginPath(); g.moveTo(ax, a0); g.lineTo(ax, y1 - 14); g.stroke(); g.beginPath(); g.moveTo(ax - 17, y1 - 20); g.lineTo(ax + 17, y1 - 20); g.lineTo(ax, y1 + 4); g.closePath(); g.fill(); g.restore(); }
        }
        g.restore();
      } }], cam);
    c.restore();
    // the clipping comes back up from below and lands on "clip", so the punchline has the frame to itself until then
    const kC = clamp((lt - tC + 0.32) / 0.32, 0, 1);
    placeTag(c, { a: clamp(kC * 2.5, 0, 1), dy: 320 * (1 - ease.out(kC)) });
    bigClip(c, ui('treesLabel', 'TREES · THE GUARDIAN’S ESTIMATE'), ui('treesValue', '250,000'), { a: clamp(kC * 2.5, 0, 1), dy: 320 * (1 - ease.out(kC)) });
    box(c);
  } };
})();
