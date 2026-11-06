// THE KIT for "Five Pins" (RFH Helsinki): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline, a VIRAL
// cut from its first version (plan/films/35-five-pins.md). On 2 Nov 2026 Helsinki's City Board adopted its data-centre
// siting principles: five possible areas (Salmisaari, Malmi, Heikinlaakso, Myllypuro, Östersundom), their waste heat
// into district heating, not in the most valuable nature. The film: a cut-card Helsinki pinned to a dark board; frame 0
// has five red pins hanging over it, their shadows already on the spots; they drop one by one and are named; heat runs
// from them along pipes and the houses' roofs warm; then Muhos, where the last trees fall and only AFTER that does
// Google's site stake go in. Map first in Helsinki; forest first in Muhos.
// Fair on purpose: the map is illustrative (the city's general shape, not a survey; each pin stands on its district,
// not on a plot); the houses are generic; Google is plain type (owner, 2 Nov), no logo; nobody is drawn.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs).
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 4 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    in: (k) => Math.pow(clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  const swing = (lt, kicks) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 3.2) * Math.sin((lt - t) * 9) : 0), 0);
  const JP = '"NotoSansJP-800"';
  const C = {
    wall: '#18202b', wallL: '#1f2935',
    margin: '#efe8d6', land: '#d8cdb0', landL: '#e3d9c0', shore: '#c7b996', forest: '#8a9a6c', forestD: '#76885b', field: '#cfc28f',
    sea: '#2f5876', seaL: '#3d6c8c', seaS: '#4f80a0', road: '#f6f0e2', tack: '#c9a24a', tackD: '#8f6e2a',
    pin: '#d8402f', pinD: '#9c2a1d', pinL: '#ff9b7c', steel: '#c9ccd1', steelD: '#7b8088',
    flag: '#f6efe0', ink: '#15120f', roof: '#8a7b69', roofD: '#6c6052', roofW: '#e58a3a', heat: '#f2a23a', heatL: '#ffd889', pipe: '#7a4a24',
    // Muhos
    sky: ['#121820', '#18202b', '#1f2836', '#283141', '#36394a', '#4b4550', '#655553', '#7c6455'],
    far: '#26352d', mid: '#1b2821', sand: ['#7f6e55', '#8d7a5e', '#9b8767', '#a89370', '#b49f7a'], slash: '#4a3a2a', rut: '#6e5f49',
    post: '#7a5a3a', postL: '#9a7650', tape: '#f0027f', news: '#ece6d6', stamp: '#c8321f', cream: '#efe6cf',
  };

  // ── type, as the other viral cuts
  function fitFont(c, text, size, maxW, face) { let s = size; c.font = face.replace('$', s); while (c.measureText(text).width > maxW && s > 20) { s -= 2; c.font = face.replace('$', s); } return s; }
  /** the where/what tag in the lower corner */
  function tag(c, text, lt, dd, x = 110, t0 = 0.4, { bg = K.ochre, t1 = dd - 0.5 } = {}) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((t1 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, 30, 905 - x - 44, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = bg; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  function bigClip(c, label, value, { k = 1, a = 1, dy = 0, red = false } = {}) {
    if (a <= 0) return;
    const x = 130, y = 1398 + dy, w = 760, h = 206, sc = 1 + 0.05 * (1 - ease.out(k));
    c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(-0.022); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18; c.shadowOffsetX = 9; c.shadowOffsetY = 13;
    c.fillStyle = C.news; c.beginPath(); c.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) c.lineTo((w * i) / 16, (i % 2) * 7);
    c.lineTo(w, h); for (let i = 16; i >= 0; i--) c.lineTo((w * i) / 16, h - (i % 2) * 7); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'left';
    fitFont(c, label, 30, w - 52, `$px "ArchivoBlack-400", ${JP}`); c.fillText(label, 26, 46);
    c.fillStyle = red ? C.stamp : C.ink; fitFont(c, value, 138, w - 52, `400 $px "Anton-400", ${JP}`); c.fillText(value, 24, 184);
    c.restore();
  }
  const vcam = (lt, dd, { hits = [], kick = 0.03, amp = 4, fx = 540, fy = 1000 } = {}) => {
    let zz = 1; for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx, fy };
  };
  const camZ = (c, z, fx = 540, fy = 1000) => { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); };
  const flash = (c, lt, t, k = 0.2) => { if (lt > t) { const f = Math.exp(-(lt - t) * 7) * k; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); } };

  // ══ THE MAP ═════════════════════════════════════════════════════════════════════════════════════════════════
  // Helsinki in degrees, onto a card 900 wide (v1b: 940 cropped at the frame once the camera pushed in): lon 24.83–25.26 × lat 60.305–60.12, at the true aspect for 60.2° N
  const MAP = { x: 90, y: 640, w: 900 }, LON0 = 24.83, LON1 = 25.26, LAT0 = 60.305, LAT1 = 60.12;
  const KX = MAP.w / (LON1 - LON0), KY = KX / Math.cos((60.2 * Math.PI) / 180); MAP.h = (LAT0 - LAT1) * KY;
  const P = ([lon, lat]) => [MAP.x + (lon - LON0) * KX, MAP.y + (LAT0 - lat) * KY];
  const path = (g, pts, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); };
  /** the mainland, west to east along the shore, then round the north (by hand from the city's general shape) */
  const COAST = [[24.80, 60.180], [24.825, 60.177], [24.840, 60.183], [24.852, 60.190], [24.866, 60.193], [24.876, 60.186], [24.884, 60.179], [24.893, 60.173],
    [24.900, 60.168], [24.906, 60.164], [24.910, 60.159], [24.916, 60.155], [24.922, 60.150], [24.929, 60.148], [24.937, 60.153], [24.946, 60.155], [24.954, 60.154],
    [24.961, 60.157], [24.966, 60.161], [24.976, 60.162], [24.986, 60.165], [24.983, 60.169], [24.972, 60.171], [24.962, 60.174], [24.958, 60.179], [24.966, 60.182],
    [24.976, 60.184], [24.984, 60.189], [24.988, 60.197], [24.982, 60.204], [24.992, 60.211], [25.006, 60.214], [25.016, 60.207], [25.012, 60.199], [25.002, 60.191],
    [25.010, 60.185], [25.024, 60.183], [25.036, 60.176], [25.040, 60.166], [25.048, 60.158], [25.062, 60.157], [25.072, 60.165], [25.068, 60.176], [25.078, 60.186],
    [25.090, 60.193], [25.108, 60.197], [25.124, 60.194], [25.138, 60.190], [25.152, 60.189], [25.158, 60.197], [25.170, 60.205], [25.188, 60.210], [25.198, 60.219],
    [25.214, 60.226], [25.232, 60.229], [25.252, 60.233], [25.275, 60.236], [25.30, 60.240], [25.30, 60.34], [24.80, 60.34]].map(P);
  const ell = (lon, lat, rx, ry, rot = 0, n = 26, seed = 1) => { const r = U.rng(seed), [cx, cy] = P([lon, lat]), ax = rx * KX, ay = ry * KY; const out = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, j = 0.86 + r() * 0.22, u = Math.cos(a) * ax * j, v = Math.sin(a) * ay * j; out.push([cx + u * Math.cos(rot) - v * Math.sin(rot), cy + u * Math.sin(rot) + v * Math.cos(rot)]); }
    return out; };
  const ISLES = [ell(24.877, 60.157, 0.017, 0.0092, 0.25, 30, 3), ell(25.046, 60.147, 0.012, 0.0055, -0.1, 24, 5), ell(24.986, 60.146, 0.0055, 0.0032, 0.4, 16, 7),
    ell(24.995, 60.140, 0.004, 0.0024, 0.2, 14, 8), ell(25.086, 60.179, 0.008, 0.0045, 0.3, 18, 9), ell(24.887, 60.183, 0.004, 0.0028, 0, 14, 11),
    ell(25.105, 60.170, 0.006, 0.003, 0.5, 14, 12), ell(25.180, 60.185, 0.007, 0.0035, -0.3, 16, 13), ell(24.955, 60.140, 0.0035, 0.002, 0.2, 12, 14),
    ell(25.125, 60.160, 0.005, 0.0025, 0.1, 12, 15), ell(25.230, 60.212, 0.006, 0.003, 0.4, 14, 16), ell(24.915, 60.135, 0.003, 0.0018, 0, 12, 17)];
  /** green: Central Park, Haltiala, Viikki's fields, the eastern forests (Uutela, Mustavuori, Östersundom, Sipoonkorpi's edge) */
  const GREEN = [[24.928, 60.208, 0.008, 0.006], [24.933, 60.222, 0.009, 0.007], [24.938, 60.238, 0.010, 0.008], [24.946, 60.256, 0.012, 0.008], [24.955, 60.272, 0.014, 0.009],
    [25.045, 60.198, 0.008, 0.005], [25.162, 60.199, 0.008, 0.005], [25.172, 60.236, 0.014, 0.008], [25.215, 60.252, 0.018, 0.010], [25.245, 60.282, 0.022, 0.012],
    [25.205, 60.290, 0.015, 0.008], [24.880, 60.232, 0.008, 0.006], [25.110, 60.240, 0.010, 0.006]];
  const FIELDS = [[25.022, 60.225, 0.012, 0.006], [24.985, 60.288, 0.012, 0.006]];
  const ROADS = [
    [[24.83, 60.205], [24.87, 60.225], [24.92, 60.237], [24.97, 60.240], [25.01, 60.235], [25.06, 60.220], [25.08, 60.212]],     // Ring I
    [[24.83, 60.290], [24.95, 60.296], [25.05, 60.291], [25.12, 60.277], [25.20, 60.271], [25.30, 60.270]],                    // Ring III
    [[24.97, 60.190], [25.02, 60.200], [25.08, 60.212], [25.14, 60.215], [25.19, 60.218]],                                    // Itäväylä
    [[24.98, 60.200], [25.03, 60.240], [25.07, 60.265], [25.10, 60.310]],                                                    // Lahdenväylä
    [[24.95, 60.200], [24.96, 60.250], [24.975, 60.310]],                                                                    // Tuusulanväylä
    [[24.93, 60.195], [24.89, 60.240], [24.86, 60.310]],                                                                     // Hämeenlinnanväylä
    [[24.91, 60.165], [24.877, 60.160], [24.83, 60.170]],                                                                    // Länsiväylä over Lauttasaari
    [[25.08, 60.212], [25.15, 60.235], [25.30, 60.252]],                                                                     // to Porvoo
  ].map((L) => L.map(P));

  /** the five pins, on their districts (illustrative), each with where its name flag goes */
  const PINS = [
    { key: 'p0', name: 'SALMISAARI', ll: [24.905, 60.163], flag: 'below', hx: 250 },
    { key: 'p1', name: 'MALMI', ll: [25.020, 60.250], flag: 'left', hx: 225 },
    { key: 'p2', name: 'HEIKINLAAKSO', ll: [25.095, 60.270], flag: 'above', hx: 165 },
    { key: 'p3', name: 'MYLLYPURO', ll: [25.075, 60.226], flag: 'below', hx: 255 },
    { key: 'p4', name: 'ÖSTERSUNDOM', ll: [25.190, 60.255], flag: 'below', hx: 210 },
  ].map((p) => ({ ...p, xy: P(p.ll) }));
  /** the houses each pin's heat goes to: a cluster or two near it (generic houses, no address meant) */
  const CLUSTERS = [
    { pin: 0, ll: [24.938, 60.170] }, { pin: 0, ll: [24.918, 60.176] },
    { pin: 1, ll: [25.045, 60.255] }, { pin: 1, ll: [24.995, 60.240] },
    { pin: 2, ll: [25.118, 60.262] }, { pin: 2, ll: [25.070, 60.280] },
    { pin: 3, ll: [25.115, 60.230] }, { pin: 3, ll: [25.035, 60.232] },
    { pin: 4, ll: [25.222, 60.262] }, { pin: 4, ll: [25.160, 60.262] },
  ].map((c, i) => { const r = U.rng(31 + i * 7), [cx, cy] = P(c.ll), hs = [];
    for (const [dx, dy] of [[-17, -6], [15, -9], [-6, 16], [22, 14]]) hs.push({ x: cx + dx + (r() - 0.5) * 8, y: cy + dy + (r() - 0.5) * 6, w: 24 + r() * 6, h: 17 + r() * 5, rot: (r() - 0.5) * 0.1 });
    hs.sort((a, b) => a.y - b.y);
    return { ...c, xy: [cx, cy], hs }; });

  const wallSheet = () => sheet('fpn_wall', (g) => {
    g.fillStyle = C.wall; g.fillRect(-90, -90, W + 180, H + 180);
    for (let x = -60; x < W + 60; x += 120) { g.fillStyle = C.wallL; g.fillRect(x, -90, 3, H + 180); }
    const gr = g.createRadialGradient(540, 1000, 80, 540, 1020, 820); gr.addColorStop(0, 'rgba(255,226,170,.15)'); gr.addColorStop(1, 'rgba(255,226,170,0)'); g.fillStyle = gr; g.fillRect(-90, 200, W + 180, 1600);
  }, 8);
  const mapSheet = () => sheet('fpn_map', (g) => {
    const { x, y, w, h } = MAP;
    g.fillStyle = C.margin; g.fillRect(x - 16, y - 16, w + 32, h + 32);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = C.sea; g.fillRect(x, y, w, h);
    // the shallows: the land drawn fat in two lighter blues before the land itself
    // (v1b: the islets' light rings read as glowing bubbles; they get one darker, narrower ring)
    for (const [lw, col] of [[30, C.seaL], [12, C.seaS]]) { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; path(g, COAST); g.stroke(); }
    g.strokeStyle = C.seaL; g.lineWidth = 10; for (const I of ISLES) { path(g, I); g.stroke(); }
    g.fillStyle = C.shore; path(g, COAST); g.fill(); for (const I of ISLES) { path(g, I); g.fill(); }
    g.save(); g.translate(-2, -2); g.fillStyle = C.land; path(g, COAST); g.fill(); for (const I of ISLES) { path(g, I); g.fill(); } g.restore();
    g.save(); path(g, COAST); g.clip();
    for (const [lon, lat, rx, ry] of FIELDS) { const E = ell(lon, lat, rx, ry, 0.2, 22, Math.round(lon * 1000)); g.fillStyle = C.field; path(g, E); g.fill(); }
    GREEN.forEach(([lon, lat, rx, ry], i) => { const E = ell(lon, lat, rx, ry, (i % 3) * 0.3, 26, 40 + i); g.fillStyle = C.forestD; g.save(); g.translate(2, 3); path(g, E); g.fill(); g.restore(); g.fillStyle = C.forest; path(g, E); g.fill(); });
    g.restore();
    g.strokeStyle = C.road; g.globalAlpha = 0.7; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; for (const L of ROADS) { path(g, L, false); g.stroke(); } g.globalAlpha = 1;
    // the names on the card: the city, faint on the land; the sea, faint on the water
    g.fillStyle = 'rgba(21,18,15,.30)'; g.textAlign = 'left'; fitFont(g, ui('city', 'HELSINKI'), 58, 200, `400 $px "Anton-400", ${JP}`); g.fillText(ui('city', 'HELSINKI'), x + 22, y + 108);
    g.fillStyle = 'rgba(236,244,250,.42)'; g.textAlign = 'center'; fitFont(g, ui('sea', 'GULF OF FINLAND'), 30, 420, `$px "ArchivoBlack-400", ${JP}`); g.fillText(ui('sea', 'GULF OF FINLAND'), x + 560, y + h - 34);
    // north
    g.fillStyle = 'rgba(21,18,15,.55)'; g.beginPath(); g.moveTo(x + w - 46, y + 30); g.lineTo(x + w - 60, y + 66); g.lineTo(x + w - 46, y + 58); g.lineTo(x + w - 32, y + 66); g.closePath(); g.fill();
    g.font = '24px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('N', x + w - 46, y + 92);
    g.restore();
    // four brass tacks hold the card to the board
    for (const [tx, ty] of [[x - 2, y - 2], [x + w + 2, y - 2], [x - 2, y + h + 2], [x + w + 2, y + h + 2]]) {
      g.fillStyle = C.tackD; g.beginPath(); g.arc(tx + 2, ty + 2, 11, 0, TAU); g.fill(); g.fillStyle = C.tack; g.beginPath(); g.arc(tx, ty, 11, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,240,200,.6)'; g.beginPath(); g.arc(tx - 3, ty - 3, 4, 0, TAU); g.fill();
    }
  }, 12);
  /** a house as a map pictogram, standing on (x, y): v1b, the top-down roofs read as bricks, and the pop word is
   *  "homes"; warm = its windows lit and its roof warm */
  function house(g, hh, warm) {
    const w = hh.w, b = hh.h;
    g.save(); g.translate(hh.x, hh.y); g.rotate(hh.rot);
    g.fillStyle = warm ? '#f1dcb6' : '#b8ad99'; g.fillRect(-w / 2, -b, w, b);
    g.fillStyle = warm ? C.roofW : C.roof; g.beginPath(); g.moveTo(-w / 2 - 4, -b + 1); g.lineTo(0, -b - w * 0.55); g.lineTo(w / 2 + 4, -b + 1); g.closePath(); g.fill();
    g.fillStyle = warm ? '#ffd56a' : '#5c544a'; g.fillRect(-w * 0.34, -b * 0.78, w * 0.24, b * 0.32); g.fillRect(w * 0.1, -b * 0.78, w * 0.24, b * 0.32);
    g.fillStyle = warm ? '#8a4a22' : '#4a433a'; g.fillRect(-w * 0.1, -b * 0.4, w * 0.2, b * 0.4);
    g.restore();
  }
  /** the houses, cold (they warm live in shot 3) */
  const housesSheet = () => sheet('fpn_houses', (g) => { for (const cl of CLUSTERS) for (const hh of cl.hs) house(g, hh, false); }, 6);
  function warmHouses(c, k) {
    if (k <= 0) return;
    for (const cl of CLUSTERS) {
      const kk = clamp(typeof k === 'function' ? k(cl) : k, 0, 1); if (kk <= 0) continue;
      R.glow(c, cl.xy[0], cl.xy[1] - 10, 70, 'rgba(255,170,70,', 0.35 * kk);
      c.save(); c.globalAlpha = kk; for (const hh of cl.hs) house(c, hh, true); c.restore();
      for (const hh of cl.hs) R.glow(c, hh.x, hh.y - hh.h * 0.62, 16, 'rgba(255,214,120,', 0.5 * kk);
    }
  }
  /** the pipe from a pin to a cluster: along the streets (one bend), drawn out with k, the heat marching with ph */
  const pipePts = (p, cl) => { const [x0, y0] = p.xy, [x1, y1] = cl.xy; return [[x0, y0], [x1, y0], [x1, y1]]; };
  function pipe(c, pts, k, ph) {
    if (k <= 0) return;
    const L = pts.slice(1).reduce((a, [x, y], i) => a + Math.hypot(x - pts[i][0], y - pts[i][1]), 0), dl = L * clamp(k, 0, 1);
    const sub = []; let acc = 0; sub.push(pts[0]);
    for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], s = Math.hypot(bx - ax, by - ay); if (acc + s >= dl) { const f = (dl - acc) / s; sub.push([lerp(ax, bx, f), lerp(ay, by, f)]); break; } sub.push([bx, by]); acc += s; }
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 15; c.save(); c.translate(3, 4); path(c, sub, false); c.stroke(); c.restore();
    c.strokeStyle = C.pipe; c.lineWidth = 14; path(c, sub, false); c.stroke();
    c.strokeStyle = C.heat; c.lineWidth = 8; c.setLineDash([18, 11]); c.lineDashOffset = -ph * 60; path(c, sub, false); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,190,90,.4)'; c.lineWidth = 22; c.setLineDash([]); path(c, sub, false); c.stroke();
    c.restore();
  }

  // ── a red map pin: origin at the needle's tip, where it goes into the card
  const PIN = () => sprite('fpn_pin', 80, 90, 40, 82, (g) => {
    g.strokeStyle = C.steelD; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(1, 1); g.lineTo(-9, -34); g.stroke();
    g.strokeStyle = C.steel; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, -34); g.stroke();
    g.fillStyle = C.pinD; g.beginPath(); g.arc(-10, -50, 25, 0, TAU); g.fill();
    g.fillStyle = C.pin; g.beginPath(); g.arc(-12, -52, 23, 0, TAU); g.fill();
    g.fillStyle = C.pinL; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(-20, -61, 8, 5, -0.6, 0, TAU); g.fill();
  }, 6);
  /** where the pin will go: a soft shadow that tightens as the pin comes down (h = height above the card) */
  function pinShadow(c, x, y, h) {
    const r = 16 + h * 0.08, a = clamp(0.62 - h * 0.0009, 0.38, 0.62), cx = x + 4 + h * 0.04, cy = y + 3 + h * 0.02, gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, `rgba(8,10,14,${a})`); gr.addColorStop(0.55, `rgba(8,10,14,${a * 0.6})`); gr.addColorStop(1, 'rgba(8,10,14,0)');
    c.save(); c.fillStyle = gr; c.translate(cx, cy); c.scale(1, 0.6); c.translate(-cx, -cy); c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
  }
  /** v1b: a hanging pin read as a pin stuck in the wrong place; a dashed line from its tip to its spot says where it will go */
  function dropLine(c, x, y, h, a = 1) {
    if (h < 12 || a <= 0) return;
    c.save(); c.globalAlpha = 0.5 * a; c.strokeStyle = C.flag; c.lineWidth = 3; c.setLineDash([7, 8]); c.beginPath(); c.moveTo(x, y - h + 4); c.lineTo(x, y - 6); c.stroke();
    c.setLineDash([]); c.lineWidth = 3; c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9); c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9); c.stroke(); c.restore();
  }
  function drawPin(c, p, h, { sq = 0, sc = 1, line = 0 } = {}) {
    const [x, y] = p.xy; pinShadow(c, x, y, h); dropLine(c, x, y, h, line);
    c.save(); c.translate(x, y - h); c.scale(sc * (1 + sq * 0.12), sc * (1 - sq * 0.12)); put(c, PIN(), 0, 0, { lift: 0.5 }); c.restore();
  }
  /** the cream name flag beside a pin; k pops it */
  function flag(c, p, k) {
    if (k <= 0) return; const text = ui(p.key, p.name), e = ease.back(k), [px, py] = p.xy, hx = py - 52;
    c.save(); fitFont(c, text, 30, 300, `$px "ArchivoBlack-400", ${JP}`); const tw = c.measureText(text).width, fw = tw + 30, fh = 46;
    let x, y; if (p.flag === 'below') { x = px - 10 - fw / 2; y = py + 22; } else if (p.flag === 'above') { x = px - 10 - fw / 2; y = py - 136; } else if (p.flag === 'left') { x = px - 46 - fw; y = hx - fh / 2; } else { x = px + 24; y = hx - fh / 2; }
    x = clamp(x, MAP.x + 6, MAP.x + MAP.w - 6 - fw);
    c.translate(x + fw / 2, y + fh / 2); c.scale(e, e); c.rotate(((p.key.charCodeAt(1) % 3) - 1) * 0.025);
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 8; c.shadowOffsetX = 4; c.shadowOffsetY = 6; c.fillStyle = C.flag; c.beginPath(); c.roundRect(-fw / 2, -fh / 2, fw, fh, 7); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'center'; c.fillText(text, 0, 11); c.restore();
  }
  /** the board at time lt: wall, map card, houses; `over` draws on the card (pins, pipes, flags) */
  function board(c, cam, { z = 1, over = () => {}, warm = 0 } = {}) {
    c.save(); camZ(c, z * cam.z, 540, 1000);
    // soft: 0 — the stack blurs near-flat sheets as if far away, and a map with names on it must stay sharp
    stack(c, [{ sh: wallSheet(), d: 0.02, lift: 0 }, { sh: mapSheet(), d: 0.05, lift: 1.2, soft: 0 }, { sh: housesSheet(), d: 0.06, lift: 0.4, soft: 0 },
      { d: 0.06, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); warmHouses(g, warm); g.restore(); } },
      { d: 0.07, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); over(g); g.restore(); } }], cam);
    c.restore();
  }
  /** v2 (owner, 6 Nov: "nature line should be longer, maybe highlighted"): the City Board's nature rule is no longer a
   *  corner tag for two seconds but a highlighted note pinned onto the sea corner of the map, the empty water below the
   *  pins. It arrives once the five pins are down and stays through the heat shot, until the cut to Muhos. */
  const NOTE = { x: 526, y: 1044, w: 466, h: 304 };   // v3: wider, so the fuller rule sets larger
  function leaf(g, x, y, sc) {
    g.save(); g.translate(x, y); g.rotate(0.55); g.fillStyle = '#3f7a3a'; g.beginPath(); g.ellipse(0, 0, 10 * sc, 19 * sc, 0, 0, TAU); g.fill();
    g.strokeStyle = '#dcebb4'; g.lineWidth = 2.4 * sc; g.beginPath(); g.moveTo(0, -16 * sc); g.lineTo(0, 17 * sc); g.stroke(); g.restore();
  }
  function natureNote(g, k, glow = 0) {
    if (k <= 0) return;
    const { x, y, w, h } = NOTE, cx = x + w / 2, cy = y + h / 2;
    const head = ui('natureHead', 'CITY RULE'), body = ui('natureBody', 'NO DATA CENTERS / IN HELSINKI\'S / MOST VALUABLE / NATURE AREAS').split('/').map((t) => t.trim());
    if (glow > 0.01) R.glow(g, cx, cy, 300, 'rgba(255,214,110,', 0.45 * glow);
    g.save(); g.globalAlpha = clamp(k * 3, 0, 1); g.translate(cx, cy); g.rotate(0.028); const sc = lerp(1.2, 1, ease.out(k)); g.scale(sc, sc);
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 16 * sc; g.shadowOffsetX = 8; g.shadowOffsetY = 12;
    g.fillStyle = '#f4c542'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill(); g.shadowColor = 'transparent';
    g.strokeStyle = '#b8862a'; g.lineWidth = 4; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 7); g.stroke();
    leaf(g, -w / 2 + 40, -h / 2 + 46, 1.1);
    g.fillStyle = '#2f5a24'; g.textAlign = 'left'; fitFont(g, head, 30, w - 110, `$px "ArchivoBlack-400", ${JP}`); g.fillText(head, -w / 2 + 66, -h / 2 + 57);
    let fs = 48; body.forEach((t) => { fs = Math.min(fs, fitFont(g, t, 48, w - 48, `$px "ArchivoBlack-400", ${JP}`)); });
    g.font = `${fs}px "ArchivoBlack-400", ${JP}`; g.fillStyle = C.ink; g.textAlign = 'center';
    body.forEach((t, i) => g.fillText(t, 0, -h / 2 + 116 + i * (fs + 9)));
    g.restore();
    if (k > 0.55) { const q = clamp((k - 0.55) / 0.45, 0, 1); g.save(); g.globalAlpha = q; put(g, PIN(), cx + 14, y + 30 - (1 - q) * 30, { lift: 0.5 }); g.restore(); }
  }
  const hov = (p, lt, i) => p.hx + Math.sin(lt * 1.6 + i * 1.3) * 10;   // a hanging pin's height, swaying
  const BYDEPTH = PINS.map((p, i) => i).sort((a, b) => PINS[a].xy[1] - PINS[b].xy[1]);   // back (north) to front

  // ═════════ 1 · fpn_hook: frame 0 — the cut-card Helsinki on the board, five red pins already hanging over it, their
  //            shadows on the five spots; on "go" every pin twitches down a little ═════════
  SCENES.fpn_hook = { draw(c, lt) {
    const id = 'fpn_hook', dd = dur(id), tG = at(id, 'go', 1.3);
    const cam = vcam(lt, dd, { hits: [tG], kick: 0.025 });
    board(c, cam, { z: lerp(1.02, 1.0, ease.io(lt / dd)), over: (g) => {
      BYDEPTH.forEach((i) => { const p = PINS[i], tw = lt > tG + i * 0.05 ? 22 * Math.exp(-(lt - tG - i * 0.05) * 6) : 0; drawPin(g, p, hov(p, lt, i) - tw, { sc: 1.3, line: 1 }); });
    } });
    tag(c, ui('boardTag', 'HELSINKI CITY BOARD · 2.11.2026'), lt, dd, 110, 0.15, { bg: C.cream });
    box(c);
  } };

  // ═════════ 2 · fpn_pins: the pins drop, west to east, one every 0.34 s; each lands with a squash and a ring on the
  //            card, and its name flag pops; the rule on the tag ═════════
  const GAP = 0.34, FALL = 0.26;
  const landOf = (tD, i) => tD + i * GAP + FALL;
  SCENES.fpn_pins = { draw(c, lt) {
    const id = 'fpn_pins', dd = dur(id), tD = at(id, 'drop', 0.15), tM = at(id, 'map', 0.8);
    const cam = vcam(lt, dd, { hits: PINS.map((_, i) => landOf(tD, i)), kick: 0.012 });
    board(c, cam, { z: lerp(1.0, 0.99, ease.io(lt / dd)), over: (g) => {
      BYDEPTH.forEach((i) => {
        const p = PINS[i], t0 = tD + i * GAP, tl = t0 + FALL;
        if (lt < t0) { drawPin(g, p, hov(p, lt + 3.43, i), { sc: 1.3, line: 1 }); return; }
        if (lt < tl) { const k = ease.in((lt - t0) / FALL); drawPin(g, p, lerp(hov(p, t0 + 3.43, i), 0, k), { sc: lerp(1.3, 1, k), line: 1 - k }); return; }
        const q = lt - tl, sq = Math.exp(-q * 14) * Math.cos(q * 40) * 0.8;
        if (q < 0.5) { const r = 14 + q * 120; g.save(); g.globalAlpha = (1 - q / 0.5) * 0.8; g.strokeStyle = C.flag; g.lineWidth = 4; g.beginPath(); g.ellipse(p.xy[0], p.xy[1], r, r * 0.6, 0, 0, TAU); g.stroke(); g.restore(); }
        drawPin(g, p, 0, { sq });
      });
      PINS.forEach((p, i) => flag(g, p, (lt - landOf(tD, i) - 0.04) / 0.28));
      if (lt > tM) PINS.forEach((p) => R.glow(g, p.xy[0] - 10, p.xy[1] - 50, 60, 'rgba(255,120,90,', 0.3 * Math.exp(-(lt - tM) * 4)));
      const tN = Math.max(1.75, landOf(tD, PINS.length - 1) + 0.15);                 // v2: the nature rule, pinned once the five are down
      natureNote(g, (lt - tN) / 0.4, lt > tN + 0.4 ? Math.exp(-(lt - tN - 0.4) * 2.2) : 0);
    } });
    box(c);
  } };

  // ═════════ 3 · fpn_heat: from each pin, district-heating pipes run out along the streets to a few houses; as the heat
  //            arrives each cluster's roofs warm; on "homes" the whole map glows warm ═════════
  SCENES.fpn_heat = { draw(c, lt) {
    const id = 'fpn_heat', dd = dur(id), tF = at(id, 'flow', 0.25), tH = at(id, 'homes', 1.0);
    const cam = vcam(lt, dd, { hits: [tH], kick: 0.025 });
    const pk = (cl) => clamp((lt - tF - (cl.pin * 0.05) - (CLUSTERS.indexOf(cl) % 2) * 0.12) / 0.55, 0, 1);
    board(c, cam, { z: lerp(1.0, 1.04, ease.io(lt / dd)), warm: (cl) => (pk(cl) - 0.75) / 0.25 * 0.9 + (lt > tH ? 0.1 * Math.exp(-(lt - tH) * 2) : 0), over: (g) => {
      CLUSTERS.forEach((cl) => pipe(g, pipePts(PINS[cl.pin], cl), ease.out(pk(cl)), lt));
      PINS.forEach((p) => drawPin(g, p, 0));
      PINS.forEach((p) => flag(g, p, 1));
      natureNote(g, 1);                                                              // v2: the nature rule stays pinned through the heat shot
      if (lt > tH) { const f = Math.exp(-(lt - tH) * 3); R.glow(g, 600, 900, 520, 'rgba(255,170,80,', 0.22 * f); }
    } });
    flash(c, lt, tH, 0.12);
    tag(c, ui('heatTag', 'WASTE HEAT → DISTRICT HEATING'), lt, dd, 110, 0.35);
    box(c);
  } };

  // ══ MUHOS ═══════════════════════════════════════════════════════════════════════════════════════════════════
  const HZ = 880;   // the horizon: the far forest edge stands on it
  const skySheet = () => sheet('fpn_sky', (g) => {
    const n = C.sky.length, step = (HZ + 90) / n;
    C.sky.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, -90 + i * step); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, -90 + i * step + Math.sin(x * 0.006 + i) * 10); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
  }, 10);
  /** stumps on the cleared ground, far (small) to near (big); the standing trees' own stumps are left out (they appear as each falls) */
  const STANDING = [[170, 1190, 430], [290, 1230, 470], [400, 1170, 400], [520, 1260, 500], [650, 1200, 440], [770, 1250, 480], [890, 1180, 420]];
  const STUMPS = (() => { const r = U.rng(77), out = [];
    for (let i = 0; i < 70; i++) { const y = HZ + 40 + Math.pow(r(), 0.85) * 900, x = 60 + r() * 960, s = lerp(0.35, 1.7, (y - HZ) / 960);
      if (STANDING.some(([sx, sy]) => Math.hypot(sx - x, (sy - y) * 2) < 70)) continue; if (Math.abs(x - 560) < 120 && y > 1180 && y < 1340) continue; out.push([x, y, Math.round(s * 10) / 10]); }
    return out.sort((a, b) => a[1] - b[1]); })();
  const groundSheet = () => sheet('fpn_ground', (g) => {
    const bands = C.sand, n = bands.length; let y0 = HZ - 10;
    bands.forEach((col, i) => { const y1 = HZ + Math.pow((i + 1) / n, 1.6) * (H - HZ + 90); g.fillStyle = col; g.beginPath(); g.moveTo(-90, y0); for (let x = -90; x <= W + 90; x += 50) g.lineTo(x, y0 + Math.sin(x * 0.01 + i * 2) * 6); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); y0 = y1; });
    // two ruts from the machines, running back to the forest
    g.strokeStyle = C.rut; g.lineCap = 'round';
    for (const [xa, xb] of [[300, 520], [700, 560]]) { g.lineWidth = 18; g.beginPath(); g.moveTo(xa, H + 60); g.quadraticCurveTo((xa + xb) / 2 + 40, 1300, xb, HZ + 20); g.stroke(); }
    // slash: branches left on the ground
    const r = U.rng(9); g.strokeStyle = C.slash;
    for (let i = 0; i < 90; i++) { const y = HZ + 30 + r() * 950, s = lerp(0.4, 1.8, (y - HZ) / 950), x = r() * W, a = r() * TAU, l = (18 + r() * 30) * s; g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.35); g.stroke(); }
    for (const [x, y, s] of STUMPS) put(g, BDF.stump(s), x, y, { lift: 0.6 });
  }, 8);
  const farRow = () => BDF.row('fpn_far', HZ, 34, 120, C.far, null, 5);
  const midRow = () => BDF.row('fpn_mid', HZ + 12, 26, 170, C.mid, '#2b4235', 8);
  /** the stake that goes in after the trees: a post with marking tape and a cream board, Google in plain type */
  const STAKE = () => sprite('fpn_stake', 340, 330, 170, 320, (g) => {
    g.fillStyle = C.post; g.fillRect(-9, -250, 18, 250); g.fillStyle = C.postL; g.fillRect(-9, -250, 5, 250);
    g.fillStyle = C.flag; g.beginPath(); g.roundRect(-150, -318, 300, 130, 8); g.fill();
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(-150, -214, 300, 26);
    g.fillStyle = C.ink; g.textAlign = 'center'; fitFont(g, ui('stake1', 'GOOGLE'), 64, 270, `400 $px "Anton-400", ${JP}`); g.fillText(ui('stake1', 'GOOGLE'), 0, -246);
    fitFont(g, ui('stake2', 'DATA CENTER SITE'), 26, 270, `$px "ArchivoBlack-400", ${JP}`); g.fillText(ui('stake2', 'DATA CENTER SITE'), 0, -204);
  }, 8);
  function tape(c, x, y, lt) {
    const sw = Math.sin(lt * 5) * 0.15;
    c.save(); c.translate(x + 8, y); c.fillStyle = C.tape;
    for (const [l, a] of [[70, 0.25 + sw], [56, 0.55 + sw * 1.3]]) { c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, -5); c.lineTo(l, -3); c.lineTo(l - 6, 6); c.lineTo(0, 5); c.closePath(); c.fill(); c.restore(); }
    c.restore();
  }

  // ═════════ 4 · fpn_muhos: Muhos, the clearing: the last standing spruces fall in a front, left to right, the last one
  //            lands on "first"; each leaves a stump. THEN the stake goes in: GOOGLE / DATA CENTER SITE. The clipping
  //            rises on "clip": MUHOS · CLEARED BEFORE THE ASSESSMENT / ~330 ha ═════════
  SCENES.fpn_muhos = { draw(c, lt) {
    const id = 'fpn_muhos', dd = dur(id), tF = at(id, 'fall', 0.2), tFi = at(id, 'first', 1.2), tC = at(id, 'clip', dd - 2.2);
    const DUR = 0.42, n = STANDING.length, g8 = Math.max(0.04, (tFi - DUR - tF) / (n - 1));
    const tS = tFi + 0.55;
    const cam = vcam(lt, dd, { hits: [tFi, tS + 0.25], kick: 0.03, fy: 1150 });
    c.save(); camZ(c, lerp(1.07, 1.0, ease.io(lt / dd)) * cam.z, 540, 1150);
    stack(c, [{ sh: skySheet(), d: 0.01, lift: 0 }, { sh: farRow(), d: 0.03, lift: 0.3 }, { sh: midRow(), d: 0.045, lift: 0.5 }, { sh: groundSheet(), d: 0.06, lift: 0.6 },
      { d: 0.08, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy);
        const items = STANDING.map(([x, y, h], i) => ({ x, y, h, i, t0: tF + i * g8 })).sort((a, b) => a.y - b.y);
        // the stake stands among them, in depth order
        const kS = (lt - tS) / 0.35, stakeY = 1290;
        let stakeDrawn = false;
        const drawStake = () => { if (kS <= 0) return; const e = ease.back(kS); g.save(); g.translate(560, stakeY); g.scale(1, e); put(g, STAKE(), 0, 0, { lift: 1 }); g.restore(); if (kS > 0.6) tape(g, 560, stakeY - 150, lt); };
        for (const it of items) {
          if (!stakeDrawn && it.y > stakeY) { drawStake(); stakeDrawn = true; }
          const s = lerp(0.35, 1.7, (it.y - HZ) / 960);
          if (lt >= it.t0) put(g, BDF.stump(Math.round(s * 10) / 10), it.x, it.y, { lift: 0.6 });
          const k = (lt - it.t0) / DUR; if (k >= 1.6) continue;
          const rot = k <= 0 ? Math.sin(lt * 1.3 + it.i) * 0.015 : k < 1 ? ease.in(k) * 1.5 : 1.5 + Math.exp(-(k - 1) * 9) * Math.sin((k - 1) * 30) * 0.05;
          const a = k < 1 ? 1 : clamp(1 - (k - 1) / 0.6, 0, 1);
          g.save(); g.globalAlpha = a; put(g, BDF.tree(it.h, C.mid, 11 + it.i), it.x, it.y - 6, { rot, lift: 1 }); g.restore();
          if (k >= 1 && k < 1.6) { const q = (k - 1) / 0.6; g.save(); g.globalAlpha = (1 - q) * 0.5; g.fillStyle = '#b49f7a'; g.beginPath(); g.ellipse(it.x + it.h * 0.75, it.y + 4, 40 + q * 90, 12 + q * 18, 0, 0, TAU); g.fill(); g.restore(); }
        }
        if (!stakeDrawn) drawStake();
        g.restore();
      } }], cam);
    c.restore();
    flash(c, lt, tFi, 0.14);
    tag(c, ui('muhosTag', 'MUHOS, NORTHERN FINLAND · 2026'), lt, dd, 110, 0.3, { t1: tC - 0.25 });
    const kC = clamp((lt - tC + 0.32) / 0.32, 0, 1);
    bigClip(c, ui('clipLabel', 'MUHOS · CLEARED BEFORE THE ASSESSMENT'), ui('clipValue', '~330 ha'), { a: clamp(kC * 2.5, 0, 1), dy: 320 * (1 - ease.out(kC)), red: true });
    box(c);
  } };
})();
