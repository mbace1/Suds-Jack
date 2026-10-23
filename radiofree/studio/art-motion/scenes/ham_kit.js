// THE KIT for "Trade Secret" (Doodle 6): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline, a VIRAL
// cut from its first version (plan/films/26-trade-secret.md). Hamina, Finland: Doodle's data centre on the old paper
// mill by the sea. A map from above, drawn as cut card after the satellite pictures the owner sent (HS, 23 Oct 2026):
// the sea to the west and south, the mill's long sheds along the shore, a breakwater, forest to the east, a dashed
// site boundary and, in yellow, the flying squirrel forest that was not to be cut. In 2018–19, 1.3 ha of it was felled
// without a permit; Doodle asked the authority by email to keep the papers secret, and they were kept as trade secrets.
// The film: frame 0 is the 2021 map coming clear out of a blur (it was asked to be kept secret), the clipping MAP: HIDDEN;
// 2007 (the forest, the bare patch already there), the year turns (2021: halls, sand; the zones red where the clearing
// covers them), the papers go into a folder, TRADE SECRET comes down on the map, and it blurs out: frame 0 again.
// Fair on purpose: the map is illustrative, after the published graphic, not a survey; the zones felled on screen are
// the ones the 2021 picture shows cleared; nobody is drawn; the authority is named on a tag, as HS names it.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs).
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, K, canvas } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
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
  const swing = (lt, kicks) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 3.2) * Math.sin((lt - t) * 9) : 0), 0);
  const JP = '"NotoSansJP-800"';

  const C = {
    sea: '#13283a', seaL: '#1c3a52', seaD: '#0c1c2a', foam: '#3d6680',
    floor: '#152018', floorL: '#1b281d', moss: '#20301f',
    spruce: ['#173022', '#1b3726', '#14291d'], spruceL: '#2c5139', pine: ['#2a4529', '#30502f'], pineL: '#47703f',
    birch: ['#3a5a2a', '#456a30', '#2f4d24'], birchL: '#6e8f45',   // leaf trees in green: yellow belongs to the zones alone
    sand: '#b9a27c', sandL: '#cdb892', sandD: '#9c8763', yard: '#8d8775', yardL: '#a19b88',
    roof: '#5b5f63', roofL: '#7a7f84', roofD: '#43474b', hall: '#c9ccc8', hallL: '#e4e6e2', hallD: '#9a9e9b', tank: '#1a1c1e',
    road: '#a59a83', roadD: '#80765f', house: '#8e4a36', houseL: '#a9604a',
    zone: '#f2c230', zoneL: '#ffe07a', gone: '#d8402f', bound: '#f2efe6',
    cream: '#efe6cf', ink: '#15120f', news: '#ece6d6', bar: '#0b0b0c', manila: '#d6b25c', manilaD: '#b8933f', stamp: '#c8321f',
    sq: '#b3ab9c', sqD: '#857d70', sqL: '#d8d1c2', sqBelly: '#ece4d2',
  };

  // ── the map: drawn in the reference graphic's own coordinates (an 834-px square, as published) and mapped once onto
  //    the frame, 1080 wide, its top at y 470. Everything beyond the square continues it (sea south, forest north).
  const MS = 1.295, MX = (x) => (x - 32) * MS, MY = (y) => 470 + (y - 643) * MS, m = ([x, y]) => [MX(x), MY(y)];
  const poly = (pts) => pts.map(m);
  const path = (g, P) => { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const inside = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

  /** the sea: west of the shore and south of it, with the bay to the south-east */
  const SEA = poly([[-60, 726], [45, 720], [60, 800], [76, 862], [100, 962], [128, 1040], [176, 1078], [200, 1122], [250, 1182], [300, 1240],
    [360, 1300], [420, 1342], [470, 1386], [520, 1418], [560, 1446], [604, 1428], [640, 1392], [690, 1336], [760, 1314], [900, 1302], [900, 2200], [-60, 2200]]);
  const ISLES = [[722, 1402, 34, 18, -0.3], [812, 1372, 26, 14, 0.2], [860, 1440, 40, 20, 0.1], [640, 1470, 30, 16, 0.4]].map(([x, y, rx, ry, r]) => [MX(x), MY(y), rx * MS, ry * MS, r]);
  const inSea = (x, y) => inside(SEA, x, y) && !ISLES.some(([cx, cy, rx, ry, r]) => { const dx = x - cx, dy = y - cy, c = Math.cos(-r), s = Math.sin(-r), u = dx * c - dy * s, v = dx * s + dy * c; return (u / rx) ** 2 + (v / ry) ** 2 < 1; });
  /** the mill's yard and its sheds, along the shore (there in 2007 and in 2021) */
  const YARD = poly([[60, 760], [150, 760], [250, 860], [360, 950], [380, 1060], [360, 1150], [330, 1250], [300, 1240], [250, 1182], [200, 1122], [176, 1078], [128, 1040], [100, 962], [76, 862]]);
  const SHEDS = [[265, 1040, 230, 54, 0.88, 'roof'], [318, 1112, 120, 46, 0.88, 'roof'], [214, 958, 120, 40, 0.88, 'roofL'], [300, 960, 70, 30, 0.88, 'roofD'],
    [350, 1185, 60, 34, 0.88, 'roofL'], [160, 905, 60, 26, 0.88, 'roofD']].map(([x, y, w, h, r, col]) => [MX(x), MY(y), w * MS, h * MS, r, col]);
  const TANKS = [[96, 850, 11], [98, 880, 11], [330, 905, 13]].map(([x, y, r]) => [MX(x), MY(y), r * MS]);
  /** the data-centre halls of 2021: two big grey blocks north of the mill, two white ones in the new ground */
  const HALLS = [[226, 930, 110, 70, 0.8, 'hall'], [176, 990, 100, 60, 0.8, 'hall'], [452, 1094, 56, 30, 0.8, 'hallL'], [420, 1168, 70, 64, 0.8, 'hallL'], [520, 1240, 40, 26, 0.8, 'hallL']]
    .map(([x, y, w, h, r, col]) => [MX(x), MY(y), w * MS, h * MS, r, col]);
  /** the ground cleared by 2021: sand between the mill and the eastern forest */
  const CLEAR = poly([[395, 1000], [470, 960], [560, 990], [600, 1100], [612, 1270], [592, 1352], [566, 1404], [500, 1384], [420, 1332], [362, 1270], [342, 1150]]);
  /** ground already open in 2007, east of the long zone (the bare patch in the 2007 photograph): treeless in both years */
  const OPEN07 = poly([[482, 1004], [530, 990], [566, 1040], [580, 1150], [566, 1232], [528, 1240], [494, 1172], [478, 1082]]);
  /** the site boundary, dashed white, as on the published map */
  const BOUND = poly([[95, 738], [175, 790], [330, 860], [440, 830], [436, 738], [490, 694], [640, 772], [760, 940], [830, 1000], [820, 1150], [862, 1212], [800, 1290], [650, 1300], [596, 1284], [574, 1310], [540, 1420]]);
  /** the flying squirrel forest: seven yellow zones, after the published map. `gone`: cleared by the 2021 picture */
  const ZONES = [
    { P: poly([[420, 900], [441, 896], [454, 930], [433, 937]]), gone: false },
    { P: poly([[520, 963], [528, 976], [470, 1004], [452, 1034], [450, 1072], [436, 1066], [438, 1028], [458, 994]]), gone: true },
    { P: poly([[540, 1222], [560, 1226], [568, 1250], [548, 1254]]), gone: true },
    { P: poly([[570, 1272], [594, 1276], [596, 1292], [572, 1290]]), gone: true },
    { P: poly([[577, 1322], [585, 1323], [586, 1340], [576, 1338]]), gone: true },
    { P: poly([[556, 1360], [570, 1362], [568, 1388], [552, 1386]]), gone: true },
    { P: (() => { const out = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, u = Math.cos(a) * 72, v = Math.sin(a) * 24, r = -0.42; out.push([733 + u * Math.cos(r) - v * Math.sin(r), 1255 + u * Math.sin(r) + v * Math.cos(r)]); } return poly(out); })(), gone: false },
  ];
  const inZone = (x, y) => ZONES.findIndex((z) => inside(z.P, x, y));
  const ROADS = [
    [[470, 600], [540, 690], [622, 790], [700, 732], [780, 700], [900, 712]].map(m),
    [[622, 790], [600, 880], [566, 990], [530, 1110], [500, 1220], [470, 1330]].map(m),
    [[360, 860], [420, 960], [470, 1060], [530, 1170], [600, 1290]].map(m),
    [[436, 738], [540, 690]].map(m),
  ];
  const HOUSES = (() => { const r = U.rng(5), out = []; for (let i = 0; i < 16; i++) { const x = 690 + r() * 180, y = 660 + r() * 120; if (Math.abs(y - (712 - (x - 780) * -0.1)) < 14) continue; out.push([MX(x), MY(y), 14 + r() * 8, 10 + r() * 6, r() * 0.6 - 0.3]); } return out; })();
  const nearRoad = (x, y, d) => ROADS.some((L) => L.some(([ax, ay], i) => { if (!i) return false; const [bx, by] = L[i - 1], dx = bx - ax, dy = by - ay, k = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(x - ax - dx * k, y - ay - dy * k) < d; }));
  const inBox = ([x, y, w, h, r], px, py, pad = 0) => { const dx = px - x, dy = py - y, c = Math.cos(-r), s = Math.sin(-r), u = dx * c - dy * s, v = dx * s + dy * c; return Math.abs(u) < w / 2 + pad && Math.abs(v) < h / 2 + pad; };

  // ── the trees: a jittered grid of crowns on all the land; each knows whether 2021 cleared it and which zone it is in
  const TREES = (() => {
    const r = U.rng(23), out = [], S = 26;
    for (let y = -110; y < H + 110; y += S * 0.87) for (let x = -110 + ((y / (S * 0.87)) % 2) * S / 2; x < W + 110; x += S) {
      const px = x + (r() - 0.5) * S * 0.8, py = y + (r() - 0.5) * S * 0.8;
      if (inSea(px, py) || inside(YARD, px, py) || nearRoad(px, py, 16) || HOUSES.some((h) => Math.hypot(px - h[0], py - h[1]) < 26)) continue;
      if (r() < 0.05) continue;
      const patch = Math.sin(px * 0.013 + 1.3) + Math.sin(py * 0.011 - 0.4) + Math.sin((px + py) * 0.007);
      const kind = patch > 1.5 ? 'birch' : r() < 0.35 ? 'pine' : 'spruce';
      if (inside(OPEN07, px, py)) continue;                  // already bare in 2007
      const z = inZone(px, py), clr = inside(CLEAR, px, py);
      out.push({ x: px, y: py, r: 9 + r() * 7, kind, v: (r() * 3) | 0, z, clr, k: r() });
    }
    return out;
  })();
  const KEEP = TREES.filter((t) => !t.clr), CUT = TREES.filter((t) => t.clr);
  const CROWN = {};
  function crown(kind, rr, v) {
    const key = `${kind}${Math.round(rr)}${v}`; if (CROWN[key]) return CROWN[key];
    const s = Math.ceil(rr * 2 + 20), c = canvas(s, s), g = c.getContext('2d'), cx = s / 2 - 3, cy = s / 2 - 3, rnd = U.rng(rr * 13 + v * 7 + kind.length);
    const shape = (R0, jag) => { g.beginPath(); const n = kind === 'spruce' ? 9 : 13; for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU, rad = kind === 'spruce' ? (i % 2 ? R0 * 0.72 : R0) : R0 * (0.82 + rnd() * jag); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.closePath(); };
    g.save(); g.translate(rr * 0.38, rr * 0.48); g.filter = 'blur(2px)'; g.fillStyle = 'rgba(0,0,0,.5)'; shape(rr, 0.3); g.fill(); g.restore(); g.filter = 'none';
    const pal = kind === 'spruce' ? C.spruce : kind === 'pine' ? C.pine : C.birch, lit = kind === 'spruce' ? C.spruceL : kind === 'pine' ? C.pineL : C.birchL;
    g.fillStyle = pal[v % pal.length]; shape(rr, 0.32); g.fill();
    g.save(); g.translate(-rr * 0.18, -rr * 0.2); g.fillStyle = lit; g.globalAlpha = 0.55; shape(rr * 0.55, 0.4); g.fill(); g.restore();
    return (CROWN[key] = { c, ox: s / 2, oy: s / 2 });
  }
  function drawTree(g, t, sc = 1, a = 1) {
    if (sc <= 0.02 || a <= 0.01) return; const cr = crown(t.kind, t.r, t.v);
    g.save(); g.globalAlpha *= a; g.translate(t.x, t.y); g.scale(sc, sc); g.drawImage(cr.c, -cr.ox, -cr.oy); g.restore();
  }
  function rbox(g, [x, y, w, h, r], col, edge) {
    g.save(); g.translate(x, y); g.rotate(r);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    if (edge) { g.fillStyle = edge; g.fillRect(-w / 2, -h / 2, w, 4); for (let i = 1; i < 4; i++) g.fillRect(-w / 2 + (w * i) / 4, -h / 2, 2, h); }
    g.restore();
  }

  // ── the ground sheet: sea (cut in bands toward the shore), islands, the mill yard and sheds, roads, houses, and the
  //    2021 clearing's sand. In 2007 that sand is under forest: the cut trees are drawn live over it, each on a floor disc
  const ground = () => sheet('ham_ground', (g) => {
    g.fillStyle = C.floor; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(9);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? C.moss : C.floorL; g.beginPath(); g.ellipse(r() * (W + 180) - 90, r() * (H + 180) - 90, 30 + r() * 70, 18 + r() * 40, r() * 3, 0, TAU); g.fill(); }
    g.save(); path(g, SEA); g.fillStyle = C.sea; g.fill(); g.clip();
    // cut-card bands along the shore: lighter water near the land
    g.strokeStyle = C.seaL; g.lineWidth = 26; g.lineJoin = 'round'; path(g, SEA); g.stroke();
    g.strokeStyle = 'rgba(61,102,128,.55)'; g.lineWidth = 7; path(g, SEA); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const y = 600 + i * 34, x = r() * 600; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 80 + r() * 160, y + 6); g.stroke(); }
    g.restore();
    for (const [cx, cy, rx, ry, rot] of ISLES) { g.fillStyle = C.floorL; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); g.fill(); g.strokeStyle = C.seaL; g.lineWidth = 6; g.stroke(); }
    // the breakwater and a pier
    for (const [a, b, w] of [[[176, 1080], [84, 1078], 9], [[300, 1244], [262, 1270], 7], [[420, 1342], [400, 1372], 6]]) { g.strokeStyle = C.yardL; g.lineWidth = w * MS; g.lineCap = 'round'; g.beginPath(); g.moveTo(...m(a)); g.lineTo(...m(b)); g.stroke(); }
    // the yard
    path(g, YARD); g.fillStyle = C.yard; g.fill();
    for (let i = 0; i < 30; i++) { const x = MX(80 + r() * 280), y = MY(780 + r() * 440); if (!inside(YARD, x, y)) continue; g.fillStyle = r() < 0.5 ? C.yardL : '#7c7665'; g.fillRect(x, y, 20 + r() * 40, 8 + r() * 14); }
    // the 2021 clearing: sand, tracks, piles
    g.save(); path(g, CLEAR); g.fillStyle = C.sand; g.fill(); g.clip();
    for (let i = 0; i < 50; i++) { g.fillStyle = r() < 0.5 ? C.sandL : C.sandD; g.beginPath(); g.ellipse(MX(340 + r() * 280), MY(960 + r() * 450), 14 + r() * 40, 6 + r() * 16, r() * 3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(120,100,70,.5)'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(MX(360 + i * 30), MY(1000)); g.lineTo(MX(330 + i * 34), MY(1390)); g.stroke(); }
    g.restore();
    // roads
    for (const L of ROADS) for (const [w, col] of [[20, C.roadD], [14, C.road]]) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    // the sheds and the tanks
    for (const b of SHEDS) rbox(g, b, C[b[5]], 'rgba(255,255,255,.12)');
    for (const [x, y, rr] of TANKS) { g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + 3, y + 5, rr, 0, TAU); g.fill(); g.fillStyle = C.tank; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.strokeStyle = C.roofL; g.lineWidth = 3; g.stroke(); }
    for (const [x, y, w, h, rr] of HOUSES) rbox(g, [x, y, w, h, rr], C.house, 'rgba(255,220,190,.15)');
  }, 6);
  /** the forest that stands in both years, as one sheet */
  const forest = () => sheet('ham_forest', (g) => { for (const t of KEEP) drawTree(g, t); }, 8);
  /** the trees of the 2021 clearing, live: each gone at its own time (gone(t) → 0..1, ≥1 gone) */
  function cutTrees(g, gone) {
    g.save(); path(g, CLEAR); g.clip();
    for (const t of CUT) { const a = 1 - clamp(gone(t) + 0.15, 0, 1); if (a <= 0) continue; g.fillStyle = `rgba(21,32,24,${a})`; g.beginPath(); g.arc(t.x, t.y, 21, 0, TAU); g.fill(); }
    g.restore();
    for (const t of CUT) { const k = clamp(gone(t), 0, 1); if (k < 1) drawTree(g, t, 1 - 0.7 * ease.io(k), 1 - k); }
  }
  /** the halls, each scaling up at its own time (k 0..1) */
  function halls(g, k) { HALLS.forEach((b, i) => { const kk = ease.back(clamp(k * 1.6 - i * 0.15, 0, 1)); if (kk <= 0) return; const [x, y, w, h, r, col] = b; rbox(g, [x, y, w * kk, h * kk, r], C[col], C.hallD); }); }
  /** the boundary, dashed white */
  function bound(g, a = 1) { g.save(); g.globalAlpha = a; g.strokeStyle = C.bound; g.lineWidth = 5; g.setLineDash([16, 11]); g.lineJoin = 'round'; g.beginPath(); BOUND.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); }
  /** the zones: yellow rims with a wash; state(i) → { a, gone (0..1), pulse } */
  function zones(g, lt, state = () => ({ a: 1 })) {
    ZONES.forEach((z, i) => {
      const s = state(i); if (!s.a) return; const gk = clamp(s.gone || 0, 0, 1), p = s.pulse ? 0.5 + 0.5 * Math.sin(lt * 7 + i) : 0;
      g.save(); g.globalAlpha = s.a; path(g, z.P);
      g.lineJoin = 'round'; g.shadowColor = 'rgba(255,214,80,.9)'; g.shadowBlur = 14 + 10 * p;
      g.fillStyle = `rgba(242,194,48,${0.5 + 0.15 * p})`; g.fill(); g.shadowColor = 'transparent';
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 11; g.stroke();
      g.strokeStyle = C.zoneL; g.lineWidth = 6 + 2 * p; g.stroke();
      // the felled part: only where the 2021 clearing (traced from the 2021 photograph) covers the zone; no claim
      // beyond the picture about which zone made up the 1.3 ha
      if (gk > 0) { g.save(); path(g, CLEAR); g.clip(); g.globalAlpha = s.a * gk; path(g, z.P); g.fillStyle = 'rgba(216,64,47,.75)'; g.fill(); g.strokeStyle = C.gone; g.lineWidth = 7; g.setLineDash([10, 7]); g.stroke(); g.restore(); }
      g.restore();
    });
  }

  const ZC = ZONES.map((z) => { const xs = z.P.map((p) => p[0]), ys = z.P.map((p) => p[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; });

  function bar(c, b, k = 1, dx = 0) {
    if (k <= 0) return; const kk = ease.back(clamp(k, 0, 1));
    c.save(); c.translate(b.x + dx, b.y); c.rotate(b.r); c.scale(lerp(1.25, 1, kk), lerp(1.25, 1, kk));
    c.globalAlpha = clamp(k * 4, 0, 1); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 16; c.shadowOffsetX = 8; c.shadowOffsetY = 11;
    c.fillStyle = C.bar; c.beginPath(); c.moveTo(-b.w / 2, -b.h / 2); for (let i = 0; i <= 8; i++) c.lineTo(-b.w / 2 + (b.w * i) / 8, -b.h / 2 + (i % 2) * 3); c.lineTo(b.w / 2, b.h / 2); for (let i = 8; i >= 0; i--) c.lineTo(-b.w / 2 + (b.w * i) / 8, b.h / 2 - (i % 2) * 3); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(-b.w / 2 + 8, -b.h / 2 + 6, b.w - 16, 5);
    c.restore();
  }

  // ── the flying squirrel: peeking (front, head and paws over an edge) and gliding (from above, its skin spread)
  const SQ_PEEK = () => sprite('ham_sq_peek', 150, 130, 75, 110, (g) => {
    // ears, head, the big night eyes a flying squirrel has, a pale muzzle, two paws on the edge
    for (const s of [-1, 1]) { g.fillStyle = C.sqD; g.beginPath(); g.ellipse(s * 34, -82, 13, 17, s * 0.4, 0, TAU); g.fill(); g.fillStyle = '#c99c86'; g.beginPath(); g.ellipse(s * 34, -80, 7, 10, s * 0.4, 0, TAU); g.fill(); }
    g.fillStyle = C.sq; g.beginPath(); g.ellipse(0, -46, 52, 46, 0, 0, TAU); g.fill();
    g.fillStyle = C.sqL; g.beginPath(); g.ellipse(-12, -62, 26, 16, -0.3, 0, TAU); g.fill();
    g.fillStyle = C.sqBelly; g.beginPath(); g.ellipse(0, -24, 26, 18, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = '#3a2f2a'; g.beginPath(); g.ellipse(s * 21, -50, 9, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#090807'; g.beginPath(); g.arc(s * 21, -49, 13, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 21 - 4, -54, 4, 0, TAU); g.fill(); }
    g.fillStyle = '#4a3a34'; g.beginPath(); g.ellipse(0, -30, 5, 3.5, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = C.sqD; g.beginPath(); g.ellipse(s * 30, 2, 15, 9, 0, 0, TAU); g.fill(); g.fillStyle = C.sq; g.beginPath(); g.ellipse(s * 30, 0, 13, 7, 0, 0, TAU); g.fill(); }
  }, 6);
  const SQ_GLIDE = () => sprite('ham_sq_glide', 170, 230, 85, 110, (g) => {
    // the patagium: a square of skin between the four legs, a flat tail behind, the head in front (pointing up = -y)
    g.fillStyle = C.sqD; g.beginPath(); g.moveTo(-70, -40); g.quadraticCurveTo(0, -30, 70, -40); g.quadraticCurveTo(58, 10, 66, 52); g.quadraticCurveTo(0, 40, -66, 52); g.quadraticCurveTo(-58, 10, -70, -40); g.fill();
    g.fillStyle = C.sq; g.beginPath(); g.moveTo(-62, -34); g.quadraticCurveTo(0, -26, 62, -34); g.quadraticCurveTo(52, 8, 58, 44); g.quadraticCurveTo(0, 34, -58, 44); g.quadraticCurveTo(-52, 8, -62, -34); g.fill();
    g.fillStyle = C.sqL; g.beginPath(); g.ellipse(0, -2, 22, 40, 0, 0, TAU); g.fill();
    g.fillStyle = C.sqD; g.beginPath(); g.ellipse(0, 86, 18, 40, 0, 0, TAU); g.fill(); g.fillStyle = C.sq; g.beginPath(); g.ellipse(0, 84, 13, 34, 0, 0, TAU); g.fill();
    g.fillStyle = C.sq; g.beginPath(); g.ellipse(0, -56, 22, 20, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = '#090807'; g.beginPath(); g.arc(s * 10, -62, 6, 0, TAU); g.fill(); g.fillStyle = C.sqD; g.beginPath(); g.ellipse(s * 15, -74, 6, 8, s * 0.4, 0, TAU); g.fill(); }
  }, 6);

  // ── type: fitted fonts and the tags
  function fitFont(c, text, size, maxW, face) { let s = size; c.font = `${face.replace('$', s)}`; while (c.measureText(text).width > maxW && s > 20) { s -= 2; c.font = face.replace('$', s); } return s; }
  /** the where/what tag in the lower corner, as the other films have it */
  function tag(c, text, lt, dd, x = 110, t0 = 0.4) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((dd - 0.5 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, 32, 905 - x - 44, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  /** a year card on the map, upper right of the subject (the published map's own device) */
  function yearCard(c, text, x, y, { a = 1, flip = 1 } = {}) {
    if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(1, Math.max(0.02, Math.abs(flip)));
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.cream; c.beginPath(); c.roundRect(-110, -46, 220, 92, 8); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'center'; c.font = '400 72px "Anton-400"'; c.fillText(text, 0, 26); c.restore();
  }
  /** a newsprint tag in screen space, centred */
  function screenTag(c, text, x, y, { a = 1, size = 34, bg = C.news, fg = C.ink } = {}) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, size, 820, `$px "ArchivoBlack-400", ${JP}`); const s = parseFloat(c.font), w = c.measureText(text).width + 44, h = s + 32;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = bg; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 8); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = fg; c.textAlign = 'center'; c.fillText(text, x, y + s * 0.36); c.restore();
  }
  /** the big clipping on frame 0 (and on the last frame, in the same place): torn newsprint, label over a big word */
  function bigClip(c, label, value, { k = 1, a = 1, dy = 0 } = {}) {
    if (a <= 0) return;
    const x = 130, y = 1398 + dy, w = 760, h = 206, sc = 1 + 0.05 * (1 - ease.out(k));
    c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(-0.022); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18; c.shadowOffsetX = 9; c.shadowOffsetY = 13;
    c.fillStyle = C.news; c.beginPath(); c.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) c.lineTo((w * i) / 16, (i % 2) * 7);
    c.lineTo(w, h); for (let i = 16; i >= 0; i--) c.lineTo((w * i) / 16, h - (i % 2) * 7); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = C.ink; c.textAlign = 'left'; fitFont(c, label, 30, w - 52, `$px "ArchivoBlack-400", ${JP}`); c.fillText(label, 26, 46);
    fitFont(c, value, 138, w - 52, `400 $px "Anton-400", ${JP}`); c.fillText(value, 24, 184);
    c.restore();
  }
  /** a rubber stamp, rotated, with a double rim and worn ink */
  function stampMark(c, text, x, y, { k = 1, sc = 1, rot = -0.2, size = 92 } = {}) {
    if (k <= 0) return; const kk = ease.out(clamp(k, 0, 1)), s = sc * lerp(1.9, 1, kk);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = clamp(k * 3, 0, 1) * 0.92;
    fitFont(c, text, size, 760, `400 $px "Anton-400", ${JP}`); const tw = c.measureText(text).width, fs = parseFloat(c.font), w = tw + 70, h = fs + 56;
    c.strokeStyle = C.stamp; c.lineWidth = 9; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6); c.stroke();
    c.fillStyle = C.stamp; c.textAlign = 'center'; c.fillText(text, 0, fs * 0.36);
    // worn: the paper shows through in specks
    c.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7 + 3);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 2 + r() * 4, 1 + r() * 3); }
    c.restore();
  }

  // ── the camera: drift 0 at both ends of a shot, kicks on hits; and a zoom about a focus under the clip and the box
  const V = { z0: 1.0, fx: 540, fy: 1000 };
  const vcam = (lt, dd, { z = () => 1, hits = [], kick = 0.03, amp = 4 } = {}) => {
    let zz = z(lt); for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx: V.fx, fy: V.fy };
  };
  const camZ = (c, z, fx = V.fx, fy = V.fy) => { if (z !== 1) { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); } };
  const ZF = { x: MX(560), y: MY(1150) };                   // the zones' middle: where the shots push in
  const HZ = 1.3;                                            // frame 0's zoom, and the last frame's: the bars read big


  /** the map, 2021 (frame 0's and the last frame's), or any state: halls k, cut trees gone(t), zones state */
  function map(c, lt, cam, { hallsK = 1, gone = () => 2, zstate, extra } = {}) {
    stack(c, [{ sh: ground(), d: 0.08, lift: 0.2 },
      { d: 0.1, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); cutTrees(g, gone); halls(g, hallsK); g.restore(); } },
      { sh: forest(), d: 0.1, lift: 0.9 },
      { d: 0.12, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); bound(g, 0.85); zones(g, lt, zstate); if (extra) extra(g); g.restore(); } }], cam);
  }
  const BLUR = 16;                                           // frame 0's blur, and the last frame's: the map kept from view

  // ═════════ 1 · tsv_hook: frame 0 — the 2021 map, its yellow zones already under four black bars, a flying squirrel
  //            peeking over one; the clipping says MAP: HIDDEN. On "secret" the bars thump and the squirrel ducks ═════════
  SCENES.tsv_hook = { draw(c, lt) {
    const id = 'tsv_hook', dd = dur(id), tS = at(id, 'secret', 1.6);
    const cam = vcam(lt, dd, { z: (l) => 1 + 0.03 * (1 - ease.out(l / 0.4)), hits: [tS], kick: 0.035 });
    // frame 0 opens on the map blurred (the last frame's state), it comes clear, and on "secret" it blurs again
    const bl = BLUR * (1 - ease.io(lt / 0.6)) + (lt > tS ? 0.55 * BLUR * ease.out((lt - tS) / 0.35) : 0);
    c.save(); camZ(c, HZ * (1 + 0.04 * ease.io(lt / dd)), ZF.x, ZF.y); if (bl > 0.3) c.filter = `blur(${bl.toFixed(1)}px)`;
    map(c, lt, cam, { zstate: (i) => ({ a: 1, gone: 1 }) }); c.filter = 'none';
    c.restore();
    bigClip(c, ui('clipLabel', 'DOODLE DATA CENTRE · HAMINA, FINLAND'), ui('clipValue', 'MAP: HIDDEN'), { k: lt / 0.25, dy: 420 * ease.io((lt - dd + 0.55) / 0.5) });
    box(c);
  } };

  // ═════════ 2 · tsv_map: the bars lift away; 2007, the forest standing; the yellow zones pulse; on "not to be cut" a
  //            flying squirrel glides from one zone to the next ═════════
  SCENES.tsv_map = { draw(c, lt) {
    const id = 'tsv_map', dd = dur(id), tN = at(id, 'cut', 2.0), tG = at(id, 'glide', tN - 0.7);
    const cam = vcam(lt, dd, { z: () => 1, hits: [tN], kick: 0.03 });
    const Z = lerp(HZ * 1.04, 1.5, ease.io((lt - 0.2) / (dd - 0.3)));
    c.save(); camZ(c, Z, ZF.x, ZF.y);
    const bl2 = 0.55 * BLUR * (1 - ease.out(lt / 0.35)); if (bl2 > 0.3) c.filter = `blur(${bl2.toFixed(1)}px)`;
    map(c, lt, cam, { hallsK: 0, gone: () => -1, zstate: (i) => ({ a: 1, pulse: lt > 0.4 }) }); c.filter = 'none';
    // the glide: from the ellipse by the bay to the long zone, over the forest, banking
    const kg = (lt - tG) / 1.3;
    if (kg > 0 && kg < 1) {
      const a = ZC[6], b = ZC[1], e = ease.io(kg), x = lerp(a.x - 30, b.x + 10, e), y = lerp(a.y - 10, b.y + 20, e) - Math.sin(e * Math.PI) * 60;
      const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      put(c, SQ_GLIDE(), x, y, { sc: 0.42 * (1 + 0.25 * Math.sin(e * Math.PI)), rot: ang + Math.sin(kg * 9) * 0.08, lift: 2.2 });
    }
    // the bars leave: sliding off to the right and up, one after another
    c.restore();
    yearCard(c, '2007', 210, 700, { a: clamp((lt - 0.35) / 0.25, 0, 1) });
    screenTag(c, ui('zoneTag', 'FLYING SQUIRREL FOREST'), 520, 1490, { a: clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dd - 0.2 - lt) / 0.3, 0, 1), bg: C.zone, size: 40 });
    box(c);
  } };

  // ═════════ 3 · tsv_fell: the year turns 2007 → 2021; the cleared ground goes in a front from the mill side, the halls
  //            come up, and the zones in it turn red and dashed; on "permit" a card says 1.3 ha · 2018–2019 ═════════
  const fellAt = (t, t0) => t0 + ((t.x - MX(340)) / (MX(620) - MX(340))) * 0.9 + t.k * 0.12;   // score.py mirrors 0.9
  SCENES.tsv_fell = { draw(c, lt) {
    const id = 'tsv_fell', dd = dur(id), tY = at(id, 'year', 0.2), tF = at(id, 'fell', 0.5), tP = at(id, 'permit', 2.4);
    const cam = vcam(lt, dd, { z: () => 1, hits: [tP], kick: 0.03 });
    c.save(); camZ(c, lerp(1.5, 1.6, ease.io(lt / dd)), ZF.x, ZF.y);
    map(c, lt, cam, { hallsK: clamp((lt - tF - 0.5) / 0.9, 0, 1), gone: (t) => (lt - fellAt(t, tF)) / 0.18,
      zstate: (i) => { const t0 = fellAt({ x: ZC[i].x, k: 0.5 }, tF) + 0.15; return { a: 1, gone: (lt - t0) / 0.2 }; },
      extra: (g) => { for (const t of CUT) { const k = (lt - fellAt(t, tF) - 0.04) / 0.35; if (k <= 0 || k >= 1) continue; g.fillStyle = `rgba(230,205,150,${0.4 * (1 - k)})`; g.beginPath(); g.arc(t.x, t.y, 5 + 14 * k, 0, TAU); g.fill(); } } });
    c.restore();
    // the year card flips over on "year"
    const kf = clamp((lt - tY) / 0.3, 0, 1); yearCard(c, kf < 0.5 ? '2007' : '2021', 210, 700, { flip: Math.cos(kf * Math.PI) });
    // the card: 1.3 ha · 2018–2019, slammed in on "permit"
    const k = (lt - tP + 0.1) / 0.22;
    if (k > 0) {
      const sc = lerp(2.0, 1, ease.out(k)), x = 540, y = 1440 + swing(lt, [[tP + 0.15, 5]]);
      c.save(); c.translate(x, y); c.rotate(-0.03); c.scale(sc, sc);
      c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 16; c.shadowOffsetX = 8; c.shadowOffsetY = 12; c.fillStyle = C.cream; c.beginPath(); c.roundRect(-330, -100, 660, 200, 12); c.fill();
      c.shadowColor = 'transparent'; c.fillStyle = C.gone; c.fillRect(-330, -100, 18, 200);
      c.fillStyle = C.ink; c.textAlign = 'left'; fitFont(c, ui('felledLabel', 'FLYING SQUIRREL FOREST FELLED'), 30, 600, `$px "ArchivoBlack-400", ${JP}`); c.fillText(ui('felledLabel', 'FLYING SQUIRREL FOREST FELLED'), -296, -50);
      fitFont(c, ui('felledValue', '1.3 ha · 2018–2019'), 96, 600, `400 $px "Anton-400", ${JP}`); c.fillText(ui('felledValue', '1.3 ha · 2018–2019'), -296, 62);
      c.restore();
    }
    tag(c, ui('place', 'HAMINA, FINLAND'), lt, dd, 110, 0.3);
    box(c);
  } };

  // ═════════ 4 · tsv_secret: on the authority's desk, the map's papers slide into a manila folder; on "secrets" a
  //            TRADE SECRET stamp comes down on the folder ═════════
  const PRINT = () => sprite('ham_print', 520, 640, 260, 320, (g) => {
    g.fillStyle = '#f4efe2'; g.fillRect(-260, -320, 520, 640);
    // the map, small, from the same sheets: the published picture in miniature
    g.save(); g.beginPath(); g.rect(-230, -250, 460, 460); g.clip();
    const sc = 460 / 1080; g.translate(-230, -250); g.scale(sc, sc); g.translate(0, -470);
    const gs = ground(), fs = forest(); g.drawImage(gs.c, -gs.m, -gs.m); cutTrees(g, () => -1); g.drawImage(fs.c, -fs.m, -fs.m); bound(g, 0.9); zones(g, 0); g.restore();
    g.strokeStyle = C.ink; g.lineWidth = 2; g.strokeRect(-230, -250, 460, 460);
    g.fillStyle = C.ink; g.font = `22px "ArchivoBlack-400", ${JP}`; g.textAlign = 'left'; g.fillText(ui('printHead', 'HAMINA · DETAILED PLAN'), -230, -270);
    g.fillStyle = 'rgba(21,18,15,.25)'; for (let i = 0; i < 4; i++) g.fillRect(-230, 234 + i * 18, 400 - i * 60, 7);
  }, 8);
  const EMAIL = () => sprite('ham_email', 470, 300, 235, 150, (g) => {
    g.fillStyle = '#fbfaf6'; g.fillRect(-235, -150, 470, 300);
    g.fillStyle = '#e8e4da'; g.fillRect(-235, -150, 470, 54);
    BDF.doodleLogo(g, -212, -112, 30);
    g.fillStyle = C.ink; g.font = `24px "ArchivoBlack-400", ${JP}`; g.textAlign = 'left'; g.fillText(ui('emailHead', 'EMAIL'), 60, -114);
    g.fillStyle = 'rgba(21,18,15,.22)'; for (let i = 0; i < 6; i++) g.fillRect(-206, -60 + i * 30, 400 - (i % 3) * 70, 9);
  }, 8);
  function folder(c, x, y, k, label) {      // k: 0 open … 1 closed (the front flap comes down)
    c.save(); c.translate(x, y);
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 16; c.shadowOffsetX = 8; c.shadowOffsetY = 12;
    c.fillStyle = C.manilaD; c.beginPath(); c.roundRect(-330, -390, 660, 760, 10); c.fill();
    c.beginPath(); c.roundRect(-330, -430, 240, 60, 8); c.fill();
    c.restore();
    return () => {                       // the front: drawn after the papers
      c.save(); c.translate(x, y);
      const fh = 760 * ease.io(k); if (fh > 2) {
        c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = -8; c.fillStyle = C.manila; c.beginPath(); c.roundRect(-330, 370 - fh, 660, fh, 10); c.fill();
        c.shadowColor = 'transparent'; if (k > 0.85) { c.fillStyle = C.ink; c.textAlign = 'left'; fitFont(c, label, 30, 560, `$px "ArchivoBlack-400", ${JP}`); c.globalAlpha = clamp((k - 0.85) / 0.15, 0, 1); c.fillText(label, -300, -320); c.fillStyle = 'rgba(21,18,15,.25)'; c.fillRect(-300, -300, 420, 4); }
      }
      c.restore();
    };
  }
  const desk = () => sheet('ham_desk', (g) => {
    g.fillStyle = '#2a1f17'; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(3); for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#33261c' : '#231a13'; g.fillRect(-90, r() * (H + 180) - 90, W + 180, 3 + r() * 10); }
  }, 6);
  SCENES.tsv_secret = { draw(c, lt) {
    const id = 'tsv_secret', dd = dur(id), tE = at(id, 'email', 0.15), tC = at(id, 'close', 1.4), tS = at(id, 'secrets', 2.6);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.0, 1.04, ease.io(l / dd)), hits: [tS], kick: 0.035 });
    stack(c, [{ sh: desk(), d: 0.06, lift: 0.2 }], cam);
    const fx = 560, fy = 1150, front = folder(c, fx, fy, clamp((lt - tC) / 0.35, 0, 1), ui('folderLabel', 'FLYING SQUIRREL FELLINGS · HAMINA'));
    // the email, from Doodle, slides in first (the request); then the print slides into the folder
    const ke = ease.out((lt - tE) / 0.35);
    put(c, EMAIL(), lerp(-320, 290, ke), 690 + lerp(40, 0, ke), { rot: -0.06, sc: 0.9, lift: 1.2 });
    const kp = ease.out((lt - 0.2) / 0.45);
    put(c, PRINT(), fx + lerp(700, 0, kp), fy + 10, { rot: lerp(0.15, 0.02, kp), lift: 1.0 });
    front();
    stampMark(c, ui('stamp', 'TRADE SECRET'), fx, fy + 40, { k: (lt - tS + 0.08) / 0.16, rot: -0.18, size: 110 });
    if (lt > tS) { const f = Math.exp(-(lt - tS) * 7) * 0.2; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); }
    tag(c, ui('authority', 'SOUTHEAST FINLAND ELY CENTRE'), lt, dd, 110, 0.3);
    box(c);
  } };

  // ═════════ 5 · tsv_end: the 2021 map; on "trade secret" the stamp comes down on the map itself, over the cleared ground;
  //            the squirrel peeks from behind the stamp; a hold; then on "back" the stamp lifts away and the four bars
  //            slide back over the zones, the clipping rises on "clip": frame 0 again ═════════
  SCENES.tsv_end = { draw(c, lt) {
    const id = 'tsv_end', dd = dur(id), tT = at(id, 'ts', 1.4), tB = at(id, 'back', dd - 2.4), tC = at(id, 'clip', dd - 1.0);
    const tL = Math.min(dd - 0.35, tC + 0.3), kR = ease.io((lt - tB) / (tL - tB));
    const cam = vcam(lt, dd, { z: () => 1, hits: [tT], kick: 0.035, amp: 3 }); cam.x *= 1 - kR; cam.y *= 1 - kR; if (lt >= tL) { cam.x = cam.y = 0; cam.z = 1; }
    // in from the fell's framing to a closer one for the stamp, then home: frame 0's zoom (1 + 0.04 at its start = 1)
    const zIn = lerp(1.6, 1.42, ease.io(lt / (tT + 0.2))), Z = lt >= tL ? HZ : lerp(zIn, HZ, kR);
    const bl = lt >= tL ? BLUR : BLUR * ease.io((lt - tB - 0.2) / (tL - tB - 0.2));
    c.save(); camZ(c, Z, ZF.x, ZF.y); if (bl > 0.3) c.filter = `blur(${bl.toFixed(1)}px)`;
    map(c, lt, cam, { zstate: (i) => ({ a: 1, gone: 1 }) }); c.filter = 'none';
    c.restore();
    // the stamp on the map (screen space), and the squirrel looking out from under it
    // on "back" the stamp lifts off the paper: it rises a little toward the camera and fades (never through the caption)
    const kS = (lt - tT + 0.08) / 0.16, kUp = ease.io((lt - tB) / 0.45), sx = 540, sy = 1010 - 50 * kUp;
    if (kUp < 1) { c.save(); c.globalAlpha = 1 - kUp; c.translate(sx, sy); c.scale(1 + 0.15 * kUp, 1 + 0.15 * kUp); c.translate(-sx, -sy);
      const kq = clamp((lt - tT - 0.5) / 0.35, 0, 1);
      if (kq > 0) { c.save(); c.beginPath(); c.rect(0, 0, W, sy - 40); c.clip(); put(c, SQ_PEEK(), sx + 170, sy - 40 + 90 * (1 - ease.out(kq)), { sc: 0.9, lift: 0.4 }); c.restore(); }
      stampMark(c, ui('stamp', 'TRADE SECRET'), sx, sy, { k: kS, rot: -0.14, size: 128 });
      c.restore();
    }
    if (lt > tT) { const f = Math.exp(-(lt - tT) * 7) * 0.22; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); }
    const kC = clamp((lt - tC + 0.32) / 0.32, 0, 1);
    bigClip(c, ui('clipLabel', 'DOODLE DATA CENTRE · HAMINA, FINLAND'), ui('clipValue', 'MAP: HIDDEN'), { a: clamp(kC * 2.5, 0, 1), dy: 320 * (1 - ease.out(kC)) });
    box(c);
  } };
})();
