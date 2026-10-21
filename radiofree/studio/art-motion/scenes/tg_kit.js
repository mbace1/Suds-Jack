// THE KIT for "Tailgated" (The Brink 1): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline, at night
// in low Earth orbit. One question: who decides how close one satellite may come to another? A pale flat-panel radar
// satellite (a Finnish company's) scans the cloud deck; a darker winged one (a Russian military satellite) closes in
// behind it while a tag on the thread between them counts 350 KM down to 5 KM; a thick rulebook, ORBIT: RULES OF THE
// ROAD, is blank page after page until a red marker (rough.js, as ml_mark in ml_kit.js) circles its only words, DUE
// REGARD; and the two fly nose to tail along an orbit drawn as a road, under a minimum-distance sign with no number.
// Sober on purpose (plan/films/17-tailgated.md): no flags, no lights, no weapon shapes, nothing that claims intent.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs),
// so the tag lands on "within 5 km" and the marker on "due regard" in every language. Everything is a pure function
// of the shot's local time.
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, glow, fist, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
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
  /** the camera's small breath on a cut and a kick on each hit */
  function punch(lt, hits = [], { open = 0.04, settle = 0.35, kick = 0.025 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  /** a damped swing for something on a string: each kick [time, size] sets it going again */
  const swing = (lt, kicks, idle = 0.03) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 2.6) * Math.sin((lt - t) * 8.5) : 0), idle * Math.sin(lt * 1.7));
  const JP = '"NotoSansJP-800"';

  const C = {
    sky: ['#04060d', '#070a14', '#0a0f1d', '#0d1428', '#111a33', '#15203e', '#1a284b', '#1f3057'],
    ocean: '#0d2a3b', oceanL: '#123a4d', haze: '#1c5266', land: ['#1d4a3c', '#24533f', '#19402f'], lake: '#0f3346', light: '#f0b35a',
    cloud: ['#a9bdcb', '#90a6b7', '#c2d1db'], rim: 'rgba(127,216,234,',
    panel: '#c9ced4', panelD: '#7f8893', panelL: '#eef1f3', seam: '#99a2ac', gold: '#c9a04a', goldL: '#e8c872', goldD: '#97732c',
    gun: '#3d4454', gunD: '#2a303d', gunL: '#5b6479', wing: '#27375f', wingL: '#3c5286', wingD: '#1b2747',
    thread: '#ece2c6', tag: '#e3a33a', tagD: '#b77d22', ink: '#15120f', cream: '#efe6cf',
    cloth: '#1e4c55', clothD: '#153840', clothL: '#2b6571', title: '#dcb65c', page: '#f1e8d2', pageD: '#d6cbb0', pageB: '#e5dbc1', end: '#e2d3ae',
    red: '#d8402f', road: '#252a36', roadL: '#3a4152', signR: '#c9342b', signW: '#f2ede1',
  };

  // ── the sky: indigo to navy in hard cut bands, a drift of dust, pin-hole stars ─────────────────────────────────
  const sky = () => sheet('tg_sky', (g) => {
    g.fillStyle = C.sky[0]; g.fillRect(-90, -90, W + 180, H + 180);
    C.sky.forEach((col, i) => {
      if (!i) return;
      const y0 = -40 + i * 190; g.fillStyle = col; g.beginPath(); g.moveTo(-90, H + 90);
      for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, y0 + Math.sin(x * 0.009 + i * 1.9) * 12 + Math.sin(x * 0.031 + i * 0.7) * 5);
      g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    });
    const r = U.rng(41);
    for (let i = 0; i < 1100; i++) { const u = r(), x = lerp(-90, W + 90, u), y = lerp(1250, 160, u) + (r() - 0.5) * r() * 300; g.fillStyle = `rgba(214,224,255,${0.04 + r() * 0.1})`; g.fillRect(x, y, 1.6, 1.6); }
    for (let i = 0; i < 190; i++) {
      const x = r() * (W + 180) - 90, y = r() * 1450 - 90, s = r(), rad = 0.8 + s * s * 2.6;
      if (s > 0.82) { const gr = g.createRadialGradient(x, y, 0, x, y, rad * 6); gr.addColorStop(0, 'rgba(243,234,210,.32)'); gr.addColorStop(1, 'rgba(243,234,210,0)'); g.fillStyle = gr; g.fillRect(x - rad * 6, y - rad * 6, rad * 12, rad * 12); }
      g.fillStyle = `rgba(243,234,210,${0.4 + s * 0.6})`; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
  }, 10);
  const TW = (() => { const r = U.rng(77); return Array.from({ length: 16 }, () => ({ x: 80 + r() * 920, y: 120 + r() * 1100, p: r() * TAU, f: 1.5 + r() * 2.5 })); })();
  /** a few stars that breathe: the one live thing in the sky */
  function twinkle(c, lt, ox, oy) {
    for (const s of TW) { const a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(lt * s.f + s.p)); glow(c, s.x + ox, s.y + oy, 16, 'rgba(243,234,210,', a); c.fillStyle = C.cream; c.fillRect(s.x + ox - 1.5, s.y + oy - 1.5, 3, 3); }
  }

  // ── the Earth: a cut-card limb, land and moonlit cloud strips that slide by, a cyan rim of air ──────────────────
  const E = { x: 540, y: 2480, r: 1150 };
  const LIMB = (x) => E.y - Math.sqrt(Math.max(0, E.r * E.r - (x - E.x) * (x - E.x)));
  function wob(g, cx, cy, r, amp, seed) { g.beginPath(); for (let i = 0; i <= 720; i++) { const a = (i / 720) * TAU, rr = r + amp * (Math.sin(a * 37 + seed) * 0.6 + Math.sin(a * 91 + seed * 3) * 0.4); i ? g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)) : g.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } g.closePath(); }
  const earth = () => sheet('tg_earth', (g) => {
    g.fillStyle = C.haze; wob(g, E.x, E.y, E.r, 0, 0); g.fill();
    g.fillStyle = C.oceanL; wob(g, E.x, E.y, E.r - 24, 3, 2); g.fill();
    g.fillStyle = C.ocean; wob(g, E.x, E.y, E.r - 110, 5, 5); g.fill();
  }, 16);
  const pt = (th, d, phi) => [E.x + (E.r - d) * Math.sin(th + phi), E.y - (E.r - d) * Math.cos(th + phi)];
  const wrap = (a) => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const LAND = (() => {
    const r = U.rng(23), out = [];
    for (let i = 0; i < 34; i++) {
      const d0 = 18 + Math.pow(r(), 0.9) * 600;
      out.push({ th: r() * TAU, w: 0.12 + r() * 0.34, d0, h: (26 + r() * 80) * (0.45 + d0 / 260), col: C.land[i % 3], seed: i, full: 0.35,
        lakes: Array.from({ length: (r() * 3.4) | 0 }, () => ({ u: (r() - 0.5) * 0.6, v: 0.3 + r() * 0.4, s: 0.12 + r() * 0.14 })),
        lights: Array.from({ length: 3 + ((r() * 6) | 0) }, () => ({ u: (r() - 0.5) * 0.7, v: 0.2 + r() * 0.6 })) });
    }
    return out;
  })();
  const CLOUD = (() => { const r = U.rng(57); return Array.from({ length: 96 }, (_, i) => { const d0 = 4 + Math.pow(r(), 0.9) * 640; return { th: r() * TAU, w: 0.05 + r() * 0.28, d0, h: (5 + r() * 13) * (0.5 + d0 / 200), col: C.cloud[i % 3], seed: 100 + i, full: 0.6 }; }); })();
  /** one strip of land or cloud along the limb, in (angle, depth): a lens, its edges a little ragged */
  function strip(s, phi) {
    const N = 30, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, th = s.th - s.w / 2 + s.w * u, tp = Math.pow(Math.sin(Math.PI * u), s.full || 0.7), dc = s.d0 + s.h / 2;
      const nz = (k) => (U.hash(s.seed + k, i) - 0.5) * 0.6 + (U.hash(s.seed + k + 7, i >> 1) - 0.5) * 0.8;
      const n1 = nz(0) * s.h * 0.4, n2 = nz(50) * s.h * 0.4;
      top.push(pt(th, dc - s.h / 2 * tp + n1 * tp, phi)); bot.push(pt(th, dc + s.h / 2 * tp + n2 * tp, phi));
    }
    return U.poly([...top, ...bot.reverse()]);
  }
  /** the ground under the flight: land with its lakes and town lights, then the clouds above it, all turning with phi */
  function surface(c, phi, ox, oy) {
    c.save(); c.translate(ox, oy);
    const clip = new Path2D(); clip.arc(E.x, E.y, E.r - 18, 0, TAU); c.clip(clip);
    const vis = (s, p) => Math.abs(wrap(s.th + p)) < 0.78;
    const L = LAND.filter((s) => vis(s, phi)), Cl = CLOUD.filter((s) => vis(s, phi * 1.12));
    const P = L.map((s) => strip(s, phi));
    c.fillStyle = 'rgba(0,0,0,.35)'; P.forEach((p) => { c.save(); c.translate(3, 5); c.fill(p); c.restore(); });
    c.fillStyle = 'rgba(170,220,205,.16)'; P.forEach((p) => { c.save(); c.translate(-1.6, -1.6); c.fill(p); c.restore(); });
    L.forEach((s, i) => {
      c.fillStyle = s.col; c.fill(P[i]);
      const a = s.th + phi;
      for (const k of s.lakes) { const [x, y] = pt(s.th + k.u * s.w, s.d0 + k.v * s.h, phi), rx = s.w * E.r * k.s * (0.4 + s.d0 / 900); c.fillStyle = C.lake; c.beginPath(); c.ellipse(x, y, rx, rx * 0.32, a, 0, TAU); c.fill(); }
    });
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const s of L) for (const k of s.lights) { const [x, y] = pt(s.th + k.u * s.w, s.d0 + k.v * s.h, phi); c.fillStyle = 'rgba(240,179,90,.85)'; c.fillRect(x - 1.5, y - 1, 3, 2); }
    c.restore();
    const Q = Cl.map((s) => strip(s, phi * 1.12));
    c.fillStyle = 'rgba(0,0,0,.4)'; Q.forEach((p) => { c.save(); c.translate(6, 10); c.fill(p); c.restore(); });
    Cl.forEach((s, i) => { c.fillStyle = 'rgba(230,240,245,.35)'; c.save(); c.translate(-1.4, -1.4); c.fill(Q[i]); c.restore(); c.fillStyle = s.col; c.fill(Q[i]); });
    c.restore();
  }
  /** the air: a cyan rim along the limb, the one glow in the box that is not a light */
  function rim(c, ox, oy) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [w, a] of [[54, 0.05], [30, 0.1], [14, 0.2], [5, 0.45]]) { c.strokeStyle = C.rim + a + ')'; c.lineWidth = w; c.beginPath(); c.arc(E.x + ox, E.y + oy, E.r + 2, Math.PI * 1.5 - 0.7, Math.PI * 1.5 + 0.7); c.stroke(); }
    c.restore();
  }
  /** the whole backdrop of an orbit shot */
  const orbitLayers = (lt, phi) => [
    { sh: sky(), d: 0.02, lift: 0 },
    { fn: (g, ox, oy) => twinkle(g, lt, ox, oy), d: 0.02 },
    { sh: earth(), d: 0.08, lift: 0.5 },
    { fn: (g, ox, oy) => { surface(g, phi, ox, oy); rim(g, ox, oy); }, d: 0.08 },
  ];

  // ── the two satellites: neither has a flag, a light or a weapon; one is pale and flat, one dark and winged ─────
  /** the radar satellite: a long flat panel that faces the Earth, a gold-foil bus on its back. Faces +x. */
  const radar = () => sprite('tg_radar', 400, 170, 200, 120, (g) => {
    g.fillStyle = C.goldD; g.fillRect(-30, -24, 60, 12);
    g.save(); g.beginPath(); g.roundRect(-46, -98, 92, 78, 7); g.clip();
    g.fillStyle = C.gold; g.fillRect(-46, -98, 92, 78);
    const r = U.rng(5); for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? 'rgba(232,200,114,.7)' : 'rgba(151,115,44,.6)'; g.beginPath(); const x = -46 + r() * 92, y = -98 + r() * 78; g.moveTo(x, y); g.lineTo(x + 8 + r() * 18, y + (r() - 0.5) * 16); g.lineTo(x + (r() - 0.5) * 10, y + 10 + r() * 14); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = C.ink; g.fillRect(18, -116, 14, 20); g.fillStyle = C.gunL; g.fillRect(20, -114, 10, 4);
    g.strokeStyle = C.panelD; g.lineWidth = 3; g.beginPath(); g.moveTo(-30, -98); g.lineTo(-44, -132); g.stroke(); g.fillStyle = C.panelL; g.beginPath(); g.arc(-44, -134, 6, 0, TAU); g.fill();
    g.fillStyle = C.panelD; g.fillRect(-182, -6, 364, 24);
    g.fillStyle = C.panel; g.fillRect(-182, -14, 364, 22);
    g.fillStyle = C.panelL; g.fillRect(-182, -14, 364, 4);
    g.fillStyle = C.seam; for (let x = -182 + 36.4; x < 182; x += 36.4) g.fillRect(x - 1, -14, 2, 30);
  }, 8);
  /** the other satellite: a gunmetal box with one slate-blue wing on a boom, a dish that looks down. Faces +x. */
  const other = () => sprite('tg_other', 260, 380, 130, 300, (g) => {
    g.save(); g.translate(-30, -50); g.rotate(-0.2);
    g.strokeStyle = C.gunL; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -46); g.stroke();
    g.fillStyle = C.wingD; g.fillRect(-46, -246, 92, 204);
    g.fillStyle = C.wing; g.fillRect(-42, -242, 84, 196);
    g.fillStyle = C.wingL; for (let y = -238; y < -50; y += 24) for (let x = -38; x < 40; x += 20) g.fillRect(x, y, 16, 20);
    g.restore();
    g.fillStyle = C.gunD; g.beginPath(); g.moveTo(-54, -18); g.lineTo(-82, -30); g.lineTo(-82, 30); g.lineTo(-54, 18); g.closePath(); g.fill();
    g.fillStyle = C.gun; g.beginPath(); g.roundRect(-56, -44, 112, 88, 6); g.fill();
    g.fillStyle = C.gunL; g.fillRect(-56, -44, 112, 6);
    g.fillStyle = C.gunD; g.fillRect(-56, -2, 112, 3); g.fillRect(-2, -44, 3, 88);
    g.strokeStyle = C.gunL; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 44); g.lineTo(36, 64); g.stroke();
    g.fillStyle = C.panel; g.beginPath(); g.ellipse(38, 70, 22, 8, 0.1, 0, TAU); g.fill(); g.fillStyle = C.panelD; g.beginPath(); g.ellipse(38, 73, 16, 4, 0.1, 0, TAU); g.fill();
  }, 8);
  const RADAR_BACK = -182, OTHER_NOSE = 56;
  /** the radar's beam: a pale wedge from the panel down to the ground, a scan line running down it, its footprint lit */
  function scan(c, x, y, lt, a = 1, rot = 0, sc = 1) {
    c.save(); c.translate(x, y); c.rotate(rot); c.translate(-x, -y);
    const y0 = y + 18 * sc, y1 = LIMB(x) + 140, hw0 = 160 * sc, hw1 = 300 * sc;
    const gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(140,232,240,${0.2 * a})`); gr.addColorStop(1, `rgba(140,232,240,${0.04 * a})`);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = gr;
    c.beginPath(); c.moveTo(x - hw0, y0); c.lineTo(x + hw0, y0); c.lineTo(x + hw1, y1); c.lineTo(x - hw1, y1); c.closePath(); c.fill();
    for (const off of [0, 0.5]) { const k = (lt * 0.62 + off) % 1, yy = lerp(y0, y1, k), hw = lerp(hw0, hw1, k); c.strokeStyle = `rgba(205,250,255,${0.55 * a * Math.sin(Math.PI * k)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(x - hw, yy); c.lineTo(x + hw, yy); c.stroke(); }
    const f = c.createRadialGradient(x, y1 - 20, 0, x, y1 - 20, hw1); f.addColorStop(0, `rgba(160,240,250,${0.16 * a})`); f.addColorStop(1, 'rgba(160,240,250,0)');
    c.fillStyle = f; c.beginPath(); c.ellipse(x, y1 - 20, hw1, 70, 0, 0, TAU); c.fill();
    c.restore();
  }
  /** a glint where something far away catches the light */
  function glint(c, x, y, k) {
    if (k <= 0 || k >= 1) return; const s = Math.sin(Math.PI * k);
    glow(c, x, y, 80 * s, 'rgba(230,245,255,', 0.6 * s);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(240,250,255,${0.9 * s})`; c.translate(x, y); c.rotate(0.3);
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -3); c.lineTo(60 * s, 0); c.lineTo(0, 3); c.closePath(); c.fill(); }
    c.restore();
  }

  // ── the thread and its tag ───────────────────────────────────────────────────────────────────────────────────
  /** a cream thread from a to b with a little sag, drawn out to k (0..1); returns where its middle hangs */
  function thread(c, a, b, sag = 22, k = 1) {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2], q = (t) => [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * m[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * m[1] + t * t * b[1]];
    const e = q(k), cp = [lerp(a[0], m[0], k), lerp(a[1], m[1], k)];
    for (const [dx, dy, col, w] of [[6, 9, 'rgba(0,0,0,.35)', 3.5], [0, 0, C.thread, 3]]) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0] + dx, a[1] + dy); c.quadraticCurveTo(cp[0] + dx, cp[1] + dy, e[0] + dx, e[1] + dy); c.stroke(); }
    return q(0.5);
  }
  /** the luggage tag, one cached card per number: origin at the top of its string */
  const tagCard = (n) => sprite(`tg_tag_${n}`, 220, 180, 110, 6, (g) => {
    g.strokeStyle = C.thread; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46); g.stroke();
    g.fillStyle = C.tag; g.beginPath(); g.moveTo(-60, 40); g.lineTo(60, 40); g.lineTo(88, 62); g.lineTo(88, 150); g.lineTo(-88, 150); g.lineTo(-88, 62); g.closePath(); g.fill();
    g.fillStyle = C.tagD; g.fillRect(-88, 140, 176, 10);
    g.fillStyle = C.cream; g.beginPath(); g.arc(0, 58, 11, 0, TAU); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(0, 58, 5, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '400 58px "Anton-400"'; g.fillText(`${n} KM`, 0, 132);
  }, 7);
  /** hang the tag at point m, swinging; s is its scale as it drops on */
  function hang(c, m, n, rot, s = 1) { if (s > 0) put(c, tagCard(n), m[0], m[1] - 4, { rot, sc: s, lift: 0.9 }); }
  const COUNT = [350, 300, 250, 200, 150, 100, 70, 50, 30, 20, 10, 5];

  /** the where/what tag in the lower corner (CW.tag's look), with a Japanese face behind the Latin one */
  function tag(c, text, lt, dur, x = 110) {
    const y = R.SAFE_B - 66, a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // ═════════ 1 · tg_watch: the radar satellite at work; on "another" a second one glints in far behind ═════════
  const S1 = { o: [200, 650], os: 0.36 }, RS = 1.2;
  const radarAt = (lt0) => [622 + lt0 * 6, 930];
  SCENES.tg_watch = { draw(c, lt) {
    const id = 'tg_watch', dd = dur(id), tO = at(id, 'other', 2.03);
    const cam = { x: Math.sin(lt * 0.3) * 10, y: 0, z: punch(lt, [tO], { kick: 0.018 }) * lerp(1, 1.035, ease.io(lt / dd)), fx: 540, fy: 1000 };
    const [rx, ry0] = radarAt(lt), ry = ry0 + Math.sin(lt * 1.3) * 5, kO = clamp((lt - tO) / 0.32, 0, 1), kT = clamp((lt - tO - 0.12) / 0.3, 0, 1);
    stack(c, [...orbitLayers(lt, -0.03 * lt), { d: 0.3, fn: (g, ox, oy) => {
      scan(g, rx + ox, ry + oy, lt, 1, 0, RS);
      const o = [S1.o[0] + ox, S1.o[1] + oy + Math.sin(lt * 1.1) * 3];
      glint(g, o[0], o[1], (lt - tO + 0.06) / 0.5);
      if (kO > 0) put(g, other(), o[0], o[1], { sc: S1.os * ease.back(kO), lift: 0.35 });
      put(g, radar(), rx + ox, ry + oy, { lift: 1.3, sc: RS, rot: Math.sin(lt * 0.9) * 0.008 });
      if (kT > 0) {
        const m = thread(g, [o[0] + OTHER_NOSE * S1.os, o[1]], [rx + ox + RADAR_BACK * RS, ry + oy], 26, ease.out(kT));
        const kD = (lt - tO - 0.42) / 0.3; if (kD > 0) hang(g, m, 350, swing(lt, [[tO + 0.42, 0.25]]), ease.back(kD));
      }
    } }], cam);
    tag(c, ui('orbit', 'LOW EARTH ORBIT'), lt, dd);
    box(c);
  } };

  // ═════════ 2 · tg_close: it closes in behind; the tag counts 350 KM down to 5 KM on "within 5 km" ═════════
  const S2 = { o0: S1.o, os0: S1.os, o1: [262, 936], os1: 0.98 };
  const countAt = (lt, tC, tF) => { const n = COUNT.length; if (lt < tC) return 0; return Math.min(n - 1, Math.floor(((lt - tC) / (tF - tC)) * (n - 1) + 1e-6)); };
  SCENES.tg_close = { draw(c, lt) {
    const id = 'tg_close', dd = dur(id), tC = at(id, 'count', 0.15), tF = at(id, 'five', 1.77), n = COUNT.length;
    const steps = COUNT.map((_, i) => tC + (tF - tC) * i / (n - 1)), ci = countAt(lt, tC, tF);
    const k = ease.io((lt - tC) / (tF - tC)), settle = lt > tF ? Math.exp(-(lt - tF) * 3) * Math.sin((lt - tF) * 7) * 0.06 : 0;
    const os = lerp(S2.os0, S2.os1, k) * (1 + settle * 0.4);
    const cam = { x: Math.sin(lt * 0.3 + 1.9) * 8, y: 0, z: punch(lt, [tF], { kick: 0.03 }) * lerp(1.0, 1.06, ease.io(lt / dd)), fx: 470, fy: 960 };
    const rx = radarAt(6.43)[0] + lt * 5, ry = 930 + Math.sin((lt + 6.43) * 1.3) * 5;
    stack(c, [...orbitLayers(lt, -0.03 * (lt + 6.43)), { d: 0.3, fn: (g, ox, oy) => {
      scan(g, rx + ox, ry + oy, lt + 6.43, 1, 0, RS);
      const o = [lerp(S2.o0[0], S2.o1[0], k) + ox + settle * 40, lerp(S2.o0[1], S2.o1[1], k) + oy + Math.sin(lt * 1.1) * 3];
      put(g, other(), o[0], o[1], { sc: os, lift: lerp(0.35, 1.1, k) });
      put(g, radar(), rx + ox, ry + oy, { lift: 1.3, sc: RS, rot: Math.sin((lt + 6.43) * 0.9) * 0.008 });
      const m = thread(g, [o[0] + OTHER_NOSE * os, o[1]], [rx + ox + RADAR_BACK * RS, ry + oy], lerp(26, 16, k));
      const kicks = steps.slice(1).map((t, i) => [t, i === n - 2 ? 0.3 : 0.07]);
      const flipK = steps.map((t) => (lt >= t && lt < t + 0.12 ? (lt - t) / 0.12 : 1)).reduce((a, b) => Math.min(a, b), 1);
      hang(g, m, COUNT[ci], swing(lt, kicks), 1 + (ci === n - 1 ? 0.25 * Math.exp(-(lt - tF) * 6) : 0) - (1 - flipK) * 0.08);
    } }], cam);
    tag(c, ui('dateline', 'LEOLABS TRACKING · 15–16.10.2026'), lt, dd);
    box(c);
  } };

  // ── the book: ORBIT: RULES OF THE ROAD, thick, in teal cloth; its pages blank but for two words ────────────────
  const PG = { x0: 10, x1: 448, y0: -318, y1: 312 };
  /** the closed book: origin at the middle of its spine edge, so the cover can swing on it */
  const cover = () => sprite('tg_cover', 560, 740, 20, 350, (g) => {
    g.fillStyle = C.clothD; g.beginPath(); g.roundRect(18, -318, 504, 664, 10); g.fill();
    g.fillStyle = C.pageD; g.fillRect(10, -328, 500, 664); g.fillStyle = 'rgba(0,0,0,.14)'; for (let y = 300; y < 336; y += 4) g.fillRect(10, y, 500, 1.5); for (let x = 470; x < 510; x += 4) g.fillRect(x, -328, 1.5, 664);
    g.fillStyle = C.cloth; g.beginPath(); g.roundRect(0, -336, 474, 638, 10); g.fill();
    g.fillStyle = C.clothD; g.fillRect(0, -336, 34, 652);
    g.fillStyle = C.clothL; g.fillRect(34, -336, 3, 652);
    g.strokeStyle = C.title; g.lineWidth = 4; g.strokeRect(62, -302, 382, 570); g.lineWidth = 1.5; g.strokeRect(72, -292, 362, 550);
    g.fillStyle = C.title; g.textAlign = 'center';
    g.font = '400 132px "Anton-400"'; g.fillText('ORBIT', 260, -110);
    g.fillRect(140, -82, 240, 4);
    g.font = '400 70px "Anton-400"'; g.fillText('RULES OF', 260, 6); g.fillText('THE ROAD', 260, 84);
    g.strokeStyle = C.title; g.lineWidth = 4; g.beginPath(); g.ellipse(260, 178, 120, 30, -0.12, 0, TAU); g.stroke();
    g.beginPath(); g.arc(260, 178, 14, 0, TAU); g.fill(); g.fillRect(352, 150, 18, 10);
  }, 10);
  /** one half of the open spread: the board, the page block's edge and the page; side -1 is the left half */
  const half = (side) => sprite(`tg_half_${side}`, 520, 740, side < 0 ? 500 : 20, 350, (g) => {
    g.scale(side, 1);
    g.fillStyle = C.clothD; g.beginPath(); g.roundRect(0, -340, 478, 674, 10); g.fill();
    g.fillStyle = C.pageD; g.fillRect(6, -326, 452, 648);
    g.fillStyle = 'rgba(0,0,0,.13)'; for (let y = 316; y < 322; y += 2) g.fillRect(6, y, 452, 1);
    g.fillStyle = side < 0 ? C.pageB : C.page; g.fillRect(PG.x0, PG.y0, PG.x1 - PG.x0, PG.y1 - PG.y0);
    const gr = g.createLinearGradient(0, 0, 60, 0); gr.addColorStop(0, 'rgba(60,40,20,.28)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(PG.x0, PG.y0, 60, PG.y1 - PG.y0);
  }, 10);
  // the marks, with rough.js: each is its strokes, the time it is drawn over, and its ink
  const GEN = () => rough.generator();
  const SVG = () => document.createElementNS('http://www.w3.org/2000/svg', 'path');
  function mkMark(t0, dd, drawables) {
    const el = SVG();
    const parts = drawables.flatMap((dr) => GEN().toPaths(dr)).filter((p) => p.d && p.stroke !== 'none').map((p) => { el.setAttribute('d', p.d); return { p: new Path2D(p.d), d: p.d, len: el.getTotalLength(), stroke: p.stroke, w: p.strokeWidth || 6 }; });
    const first = parts[0], last = parts[parts.length - 1];
    el.setAttribute('d', first.d); const a = el.getPointAtLength(0); el.setAttribute('d', last.d); const b = el.getPointAtLength(last.len);
    return { t0, dur: dd, parts, total: parts.reduce((s, q) => s + q.len, 0), start: [a.x, a.y], end: [b.x, b.y] };
  }
  const ink = (seed, extra = {}) => ({ seed, roughness: 1.5, bowing: 1.3, stroke: C.red, strokeWidth: 7, ...extra });
  /** the marker running down a blank page: a long ragged line from the top of the page to the foot */
  const searchLine = (t0, dd, seed, y1 = 250) => mkMark(t0, dd, [GEN().curve([[120, -250], [104, -150], [126, -40], [108, 80], [124, 180], [110, y1]], ink(seed, { strokeWidth: 6 }))]);
  function drawMark(g, m, k) {
    let left = m.total * clamp(k, 0, 1), tip = null; const el = SVG();
    for (const q of m.parts) {
      if (left <= 0) break; const run = Math.min(q.len, left); left -= run;
      g.save(); g.strokeStyle = q.stroke; g.lineWidth = q.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([run, q.len + 10]); g.stroke(q.p); g.restore();
      if (run < q.len || left <= 0) { el.setAttribute('d', q.d); const p = el.getPointAtLength(run); tip = [p.x, p.y]; }
    }
    return tip;
  }
  /** a hand-written mark that is a word: the red '?' — revealed top to bottom as if written */
  function writeQ(g, x, y, k) {
    if (k <= 0) return; g.save(); g.beginPath(); g.rect(x - 90, y - 130, 180, 170 * clamp(k, 0, 1) + 10); g.clip();
    g.fillStyle = C.red; g.font = '600 168px "Caveat-600"'; g.textAlign = 'center'; g.fillText('?', x, y + 30); g.restore();
  }
  /** a page's contents in page coordinates: its marks at shot time lt, and the words if it has them */
  function pageFace(g, P, lt, tips) {
    if (P.words) { g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '700 46px "LibreBaskerville-700"'; g.fillText('DUE REGARD', P.words[0], P.words[1]); }
    for (const m of P.marks || []) { const k = (lt - m.t0) / m.dur; if (k <= 0) continue; const tp = drawMark(g, m, ease.out(k)); if (k < 1 && tips) tips.push(tp); }
    if (P.q) writeQ(g, P.q.x, P.q.y, (lt - P.q.t0) / 0.32);
  }
  /**
   * The book at B = {x, y, rot}: `open` 0..1 swings the cover over on its spine (and slides the book so the spread ends
   * up centred), `leaves` are the right-hand pages in order with their faces, `flips` the times each leaf turns over.
   * Returns where the pen is (in the layer's coordinates) when a mark is being drawn.
   */
  function book(g, B, lt, { open = 1, leaves = [], flips = [], flipDur = 0.26 } = {}) {
    const eo = ease.io(open), sx = Math.cos(Math.PI * eo), spine = lerp(-250, 0, eo), tips = [];
    g.save(); g.translate(B.x, B.y); g.rotate(B.rot);
    const started = flips.filter((t) => lt >= t).length, turning = flips.map((t, i) => ({ i, k: (lt - t) / flipDur })).filter((f) => f.k > 0 && f.k < 1);
    if (eo > 0) {
      put(g, half(1), spine, 0, { lift: 1.2 });
      if (sx < 0) { g.save(); g.translate(spine, 0); g.scale(-sx, 1); put(g, half(-1), 0, 0, { lift: 1.2 * -sx }); g.restore(); }
      const under = leaves[Math.min(started, leaves.length - 1)]; if (under) { g.save(); g.translate(spine, 0); pageFace(g, under, lt, tips); g.restore(); }
      for (const f of turning) {
        const s = Math.cos(Math.PI * f.k), lift = Math.sin(Math.PI * f.k);
        g.save(); g.translate(spine, 0); g.fillStyle = `rgba(0,0,0,${0.18 * lift})`; g.fillRect(s > 0 ? 0 : s * PG.x1, PG.y0 + 10, Math.abs(s) * PG.x1 + 30 * lift, PG.y1 - PG.y0); g.restore();
        g.save(); g.translate(spine, 0); g.transform(1, -0.06 * lift * Math.sign(s || 1), 0, 1, 0, 0); g.scale(s, 1);
        g.fillStyle = s > 0 ? C.page : C.pageB; g.fillRect(PG.x0, PG.y0, PG.x1 - PG.x0, PG.y1 - PG.y0);
        if (s > 0 && leaves[f.i]) pageFace(g, leaves[f.i], lt, null);
        g.fillStyle = `rgba(40,30,20,${0.22 * lift})`; g.fillRect(PG.x0, PG.y0, PG.x1 - PG.x0, PG.y1 - PG.y0);
        g.restore();
      }
    }
    if (sx > 0) { g.save(); g.translate(spine, 0); g.scale(sx, 1); put(g, cover(), 0, 0, { lift: 1.4 * sx + 0.2 }); g.restore(); }
    g.restore();
    const map = (p) => [B.x + Math.cos(B.rot) * (p[0] + spine) - Math.sin(B.rot) * p[1], B.y + Math.sin(B.rot) * (p[0] + spine) + Math.cos(B.rot) * p[1]];
    return tips.length ? map(tips[0]) : null;
  }
  /** the marker in a gloved hand, its tip at `pen` (layer coordinates) — the house's hand, as ml_mark draws it */
  function marker(g, pen, rot = -0.5) {
    const ax = Math.sin(-rot), ay = Math.cos(rot);
    g.save(); g.translate(pen[0], pen[1]); g.rotate(rot);
    g.fillStyle = C.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 26); g.lineTo(10, 26); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; g.fillRect(-16, 26, 32, 190); g.fillStyle = C.red; g.fillRect(-16, 196, 32, 22); g.restore();
    fist(g, pen[0] + ax * 120, pen[1] + ay * 120, 0.62, rot, { sleeve: K.green, cuff: K.red, len: 1500 });
  }
  /** where the pen is between marks: it glides from one mark's end to the next one's start, or to rest */
  function penAt(lt, keys) {
    if (lt <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (lt <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = ease.io((lt - t0) / Math.max(1e-3, t1 - t0)); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
    return keys[keys.length - 1][1];
  }
  const bookAt = (lt, drift = 0) => ({ x: 540, y: 1070 + Math.sin(lt * 0.9) * 4 + drift, rot: -0.025 + Math.sin(lt * 0.6) * 0.006 });
  const toLayer = (B, p) => [B.x + Math.cos(B.rot) * p[0] - Math.sin(B.rot) * p[1], B.y + Math.sin(B.rot) * p[0] + Math.cos(B.rot) * p[1]];
  const REST = [1180, 2050];

  // ═════════ 3 · tg_book: the rulebook drifts in, opens, riffles; on "minimum distance" the marker circles nothing ═════════
  let BOOK3 = null;
  /** shot 3's schedule (score.py mirrors it): the cover opens at tO — earlier if a language's pop comes early — and
   *  four pages riffle over, the last one settled 0.12 s before the pop, when the marker circles the empty page */
  const book3 = (tO, tN) => {
    if (BOOK3 && BOOK3.key === `${tO}|${tN}`) return BOOK3;
    const open = Math.min(tO, tN - 0.95), f0 = open + 0.34, step = (tN - 0.12 - 0.26 - f0) / 3;
    const flips = [0, 1, 2, 3].map((i) => f0 + i * step);
    const circle = mkMark(tN, 0.4, [GEN().ellipse(226, -10, 330, 300, ink(31, { strokeWidth: 8 }))]);
    const leaves = [{}, {}, {}, {}, { marks: [circle], q: { x: 226, y: 0, t0: tN + 0.42 } }];
    return (BOOK3 = { key: `${tO}|${tN}`, open, flips, leaves, circle });
  };
  SCENES.tg_book = { draw(c, lt) {
    const id = 'tg_book', dd = dur(id), tO = at(id, 'open', 1.1), tN = at(id, 'none', 2.09), S = book3(tO, tN);
    const B = bookAt(lt, 140 * (1 - ease.out(lt / 0.7))); B.rot += -0.06 * (1 - ease.out(lt / 0.7));
    const cam = { x: Math.sin(lt * 0.35) * 6, y: 0, z: punch(lt, [tN], { kick: 0.03 }) * lerp(1.0, 1.07, ease.io((lt - tN) / (dd - tN))), fx: 770, fy: 1060 };
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { fn: (g, ox, oy) => twinkle(g, lt, ox, oy), d: 0.02 }, { d: 1, fn: (g, ox, oy) => {
      const Bo = { x: B.x + ox, y: B.y + oy, rot: B.rot };
      const tip = book(g, Bo, lt, { open: (lt - S.open) / 0.36, leaves: S.leaves, flips: S.flips });
      const end = toLayer(Bo, S.circle.end), start = toLayer(Bo, S.circle.start);
      const pen = tip || penAt(lt, [[tN - 0.5, REST], [tN, start], [tN + 0.4, end], [tN + 0.42, [Bo.x + 226 + 40, Bo.y - 60]], [tN + 0.74, [Bo.x + 226 + 30, Bo.y + 40]], [tN + 1.4, [Bo.x + 380, Bo.y + 200]]]);
      marker(g, lt > tN + 0.42 && lt < tN + 0.74 ? [lerp(Bo.x + 266, Bo.x + 236, (lt - tN - 0.42) / 0.32), lerp(Bo.y - 110, Bo.y + 30, (lt - tN - 0.42) / 0.32)] : pen);
    } }], cam);
    box(c);
  } };

  // ═════════ 4 · tg_regard: two more blank pages, then the only words in the book; the marker circles DUE REGARD ═════════
  let BOOK4 = null;
  const WORDS = [224, -110];
  const book4 = (tF, tR, tN3) => {
    if (BOOK4 && BOOK4.key === `${tF}|${tR}`) return BOOK4;
    const b3 = book3(at('tg_book', 'open', 1.1), tN3);
    const was = { marks: b3.leaves[4].marks.map((m) => ({ ...m, t0: -10 })), q: { ...b3.leaves[4].q, t0: -10 } };
    // the schedule scales to the time the language gives before "due regard" (2 s in English); score.py mirrors it
    const sp = Math.max(1.2, tR - tF), flips = [tF, tF + 0.31 * sp];
    const search = searchLine(tF + 0.14 * sp, 0.15 * sp, 41);
    const reach = mkMark(tF + 0.53 * sp, 0.25 * sp, [GEN().curve([[214, -290], [206, -240], [216, -200], [208, -168]], ink(43, { strokeWidth: 6 }))]);
    const circle = mkMark(tR, 0.36, [GEN().ellipse(WORDS[0], WORDS[1] - 14, 436, 162, ink(45, { strokeWidth: 8 }))]);
    const under = mkMark(tR + 0.6, 0.38, [GEN().line(WORDS[0] - 150, WORDS[1] + 14, WORDS[0] + 150, WORDS[1] + 11, ink(47)), GEN().line(WORDS[0] - 138, WORDS[1] + 28, WORDS[0] + 140, WORDS[1] + 26, ink(49, { strokeWidth: 5 }))]);
    const leaves = [was, { marks: [search] }, { words: WORDS, marks: [circle, under] }];
    return (BOOK4 = { key: `${tF}|${tR}`, flips, leaves, search, reach, circle, under });
  };
  SCENES.tg_regard = { draw(c, lt) {
    const id = 'tg_regard', dd = dur(id), tF = at(id, 'flip', 0.3), tR = at(id, 'regard', 2.29), S = book4(tF, tR, at('tg_book', 'none', 2.09));
    const B = bookAt(lt + 6.43), tSet = S.flips[1] + 0.26, kz = ease.io((lt - tSet) / 0.9);
    const cam = { x: Math.sin((lt + 6.43) * 0.35) * 6 * (1 - kz), y: 0, z: punch(lt, [tR], { kick: 0.025, open: 0.02 }) * lerp(1.07, 1.3, kz), fx: lerp(770, 1000, kz), fy: 1060 };
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { fn: (g, ox, oy) => twinkle(g, lt, ox, oy), d: 0.02 }, { d: 1, fn: (g, ox, oy) => {
      const Bo = { x: B.x + ox, y: B.y + oy, rot: B.rot };
      const tip = book(g, Bo, lt, { open: 1, leaves: S.leaves, flips: S.flips });
      const L = (p) => toLayer(Bo, p);
      const keys = [[0, [Bo.x + 380, Bo.y + 200]], [tF + 0.06, L([490, 170])], [S.search.t0 - 0.04, L(S.search.start)], [S.search.t0 + S.search.dur, L(S.search.end)], [S.flips[1] + 0.12, L([500, 120])],
        [S.reach.t0, L(S.reach.start)], [S.reach.t0 + S.reach.dur, L(S.reach.end)], [tR, L(S.circle.start)], [tR + S.circle.dur, L(S.circle.end)], [tR + S.circle.dur + 0.1, L([WORDS[0] + 250, WORDS[1] + 40])],
        [S.under.t0, L(S.under.start)], [S.under.t0 + S.under.dur, L(S.under.end)], [S.under.t0 + 1.2, L([WORDS[0] + 230, WORDS[1] + 170])]];
      // held flatter here, so its body trails off to the right instead of lying across the two words
      marker(g, tip || penAt(lt, keys), -1.0);
    } }], cam);
    tag(c, ui('treaty', 'OUTER SPACE TREATY 1967 · ART. IX'), lt, dd);
    box(c);
  } };

  // ═════════ 5 · tg_tail: the orbit as a road; nose to tail at 5 KM; on "none" the minimum-distance sign, no number ═════════
  const ROAD = E.r + 205;
  const onRoad = (a, h) => [E.x + (ROAD + h) * Math.sin(a), E.y - (ROAD + h) * Math.cos(a)];
  const road = () => sheet('tg_road', (g) => {
    const a0 = Math.PI * 1.5 - 0.75, a1 = Math.PI * 1.5 + 0.75;
    g.strokeStyle = C.road; g.lineWidth = 70; g.beginPath(); g.arc(E.x, E.y, ROAD, a0, a1); g.stroke();
    g.strokeStyle = C.roadL; g.lineWidth = 4; for (const d of [-33, 33]) { g.beginPath(); g.arc(E.x, E.y, ROAD + d, a0, a1); g.stroke(); }
  }, 12);
  /** the dashed line down the middle of the road, scrolling back under the traffic */
  function dashes(c, lt, ox, oy) {
    c.save(); c.strokeStyle = C.cream; c.lineWidth = 7; c.setLineDash([52, 44]); c.lineDashOffset = lt * 210;
    c.beginPath(); c.arc(E.x + ox, E.y + oy, ROAD, Math.PI * 1.5 - 0.75, Math.PI * 1.5 + 0.75); c.stroke(); c.restore();
  }
  /** the sign: Europe's minimum-distance sign (two vehicles nose to tail in a red ring, the distance on a plate under
   *  them), with satellites for the cars, and where the number goes an empty box. v2 (owner, 21 Oct: "the end slide
   *  text and look may need polish"): the v1 sign hung on a thread through the caption and read as "minus KM". */
  const sign = () => sprite('tg_sign3', 330, 330, 165, 165, (g) => {
    g.fillStyle = C.signR; g.beginPath(); g.arc(0, 0, 150, 0, TAU); g.fill();
    g.fillStyle = C.signW; g.beginPath(); g.arc(0, 0, 117, 0, TAU); g.fill();
    g.fillStyle = C.ink;
    for (const x of [-46, 46]) {                                           // a satellite in profile: body, mast, panel
      g.beginPath(); g.roundRect(x - 22, -40, 44, 30, 5); g.fill();
      g.fillRect(x - 3, -56, 6, 16); g.fillRect(x - 38, -66, 76, 11);
    }
    g.strokeStyle = C.ink; g.lineWidth = 5; g.setLineDash([10, 7]);           // the plate: an empty box, then km
    g.beginPath(); g.roundRect(-66, 10, 70, 58, 6); g.stroke(); g.setLineDash([]);
    g.textAlign = 'left'; g.font = '400 60px "Anton-400"'; g.fillText('KM', 14, 64);
  }, 9);
  /** its post, origin at the foot */
  const post = () => sprite('tg_post2', 26, 330, 13, 330, (g) => {
    g.fillStyle = '#8d939c'; g.fillRect(-7, -330, 14, 330); g.fillStyle = '#b9bec5'; g.fillRect(-7, -330, 5, 330);
    g.fillStyle = '#5b616b'; g.fillRect(-12, -16, 24, 16);
  }, 6);
  const SIGN_A = 0.265;                                                       // where it stands on the road, right of the traffic
  SCENES.tg_tail = { draw(c, lt) {
    const id = 'tg_tail', dd = dur(id), tT = at(id, 'tag', 0.5), tN = at(id, 'none', 1.81), T = lt + 4 * 6.43;
    const cam = { x: Math.sin(lt * 0.3) * 8, y: 0, z: punch(lt, [tN], { kick: 0.03 }) * lerp(1.07, 1.02, ease.io(lt / dd)), fx: 540, fy: 1040 };
    const aR = 0.075 + Math.sin(lt * 0.8) * 0.004, aO = -0.215 + Math.sin(lt * 0.7 + 1) * 0.004, oS = 0.92, rS = 1.1;
    const pR = onRoad(aR, 66), pO = onRoad(aO, 30 + 44 * oS);
    stack(c, [...orbitLayers(lt, -0.03 * T), { sh: road(), d: 0.18, lift: 1.1 }, { fn: (g, ox, oy) => dashes(g, lt, ox, oy), d: 0.18 }, { d: 0.3, fn: (g, ox, oy) => {
      scan(g, pR[0] + ox, pR[1] + oy, T, 0.55, aR, rS);
      put(g, other(), pO[0] + ox, pO[1] + oy, { sc: oS, rot: aO, lift: 1.1 });
      put(g, radar(), pR[0] + ox, pR[1] + oy, { rot: aR, sc: rS, lift: 1.3 });
      const nose = [pO[0] + ox + Math.cos(aO) * OTHER_NOSE * oS, pO[1] + oy + Math.sin(aO) * OTHER_NOSE * oS], back = [pR[0] + ox + Math.cos(aR) * RADAR_BACK * rS, pR[1] + oy + Math.sin(aR) * RADAR_BACK * rS];
      const m = thread(g, nose, back, 14);
      hang(g, m, 5, swing(lt, [[tT, 0.22], [tN + 0.4, 0.12]]));
    } }, { d: 0.18, fn: (g, ox, oy) => {
      // on "none" the sign pops up from the roadside like a page in a pop-up book: it lies flat, swings up past
      // upright, settles, and rocks once
      const k = (lt - tN + 0.05) / 0.45; if (k <= 0) return;
      const [bx, by] = onRoad(SIGN_A, 36), up = -0.14 + (1 - ease.back(k)) * 1.5 + swing(lt, [[tN + 0.45, 0.05]], 0.01);
      g.save(); g.translate(bx + ox, by + oy); g.rotate(up);
      put(g, post(), 0, 0, { lift: 1.2 }); put(g, sign(), 0, -330 - 122, { lift: 1.4, sc: 0.9 });
      g.restore();
    } }], cam);
    box(c);
  } };
})();
