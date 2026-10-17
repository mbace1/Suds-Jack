// MORE STYLES for the personas (plan/toko-personas.md), 17.10.2026 — owner: "Also consider others".
//   st_sumie       KYOTO TOKO in sumi-e ink wash: mountains in wet ink and mist, a hut on a ledge, a pine, one
//                  telephone wire down the mountain, and a haiku — 電話鳴る / 山は答えず / 秋の暮.
//   st_jrpg        TOKYO TOKO as a 16-bit JRPG screen: his 1K room top-down, a status window (HP 3/99), and the
//                  dialogue box — 未読メッセージが 99+件 あります。 ▶読む 寝る.
//   st_lino        MÖKKI TOKO as a two-block linocut: a midsummer lake, a sauna smoking, birches, the jetty, his
//                  phone face down beside the rod. MÖKILLÄ · 湖畔の小屋.
//   st_riso        KALLIO TOKO as a risograph zine: pink, blue and yellow inks off register — the church tower, a
//                  tram, Toko and his dog, and the home camera's verdict PEURA 92% · 鹿.
//   st_kamishibai  THE PEN PALS as kamishibai, street paper theatre: the wooden stage on a bicycle, its doors
//                  open on a card — Kyoto Toko and Mökki Toko faxing each other across the world — the next card
//                  half pulled. ペンパル · KIRJEKAVERIT.
// No face is drawn anywhere: the mask is the face (RFM.mask, the traced master).
(() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S, shapes } = RFM, rng = U.rng;
  const seal = (c, x, y, sz, col, paper) => { c.fillStyle = col; c.fillRect(x, y, sz, sz); c.save(); c.translate(x + sz * 0.14, y + sz * 0.16); c.scale(sz * 0.72 / 700, sz * 0.72 / 700); c.fillStyle = paper; for (const k of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) c.fill(shapes[k]); c.restore(); };
  const vtext = (c, s, x, y, size, font, col, gap = 1.08) => { c.save(); c.fillStyle = col; c.font = `${size}px "${font}"`; c.textAlign = 'center'; c.textBaseline = 'top'; [...s].forEach((ch, i) => c.fillText(ch, x, y + i * size * gap)); c.restore(); };

  // ================================================================== sumi-e
  SCENES['st_sumie'] = (() => {
    const PAPER = '#f2ecdf', INK = '#1b1a18';
    /** a brush stroke: a ribbon whose width swells and tapers, with dry-brush streaks breaking its tail */
    function brush(c, pts, w0, w1, { col = INK, dry = 0.5, seed = 1 } = {}) {
      const r = rng(seed), n = pts.length, L = [], R = [];
      for (let i = 0; i < n; i++) { const [x, y] = pts[i], [x2, y2] = pts[Math.min(n - 1, i + 1)], [x0, y0] = pts[Math.max(0, i - 1)], dx = x2 - x0, dy = y2 - y0, l = Math.hypot(dx, dy) || 1, t = i / (n - 1), w = lerp(w0, w1, t) * Math.sin(Math.PI * Math.min(1, t * 1.6 + 0.15)) * (0.85 + r() * 0.3);
        L.push([x - dy / l * w / 2, y + dx / l * w / 2]); R.push([x + dy / l * w / 2, y - dx / l * w / 2]); }
      c.fillStyle = col; c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); for (let i = n - 1; i >= 0; i--) c.lineTo(...R[i]); c.closePath(); c.fill();
      c.strokeStyle = PAPER; c.lineWidth = 1.4; for (let k = 0; k < 6 * dry; k++) { const off = r() - 0.5, from = Math.floor(n * (0.5 + r() * 0.3)); c.beginPath(); for (let i = from; i < n; i++) { const a = L[i], b = R[i]; c.lineTo(lerp(a[0], b[0], 0.5 + off), lerp(a[1], b[1], 0.5 + off)); } c.stroke(); }
    }
    const stat = () => P.cached('st_sumie', W, H, (g) => {
      g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
      const r = rng(3); g.strokeStyle = 'rgba(160,140,110,.12)'; g.lineWidth = 1; for (let i = 0; i < 1400; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 10 + r() * 40; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 6, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      // mountains: wet ink washes, blurred at the foot where the mist eats them, a dry ridge on top
      const mount = (pts, alpha, blur, seed) => { g.save(); g.filter = `blur(${blur}px)`; const gr = g.createLinearGradient(0, Math.min(...pts.map((p) => p[1])), 0, Math.max(...pts.map((p) => p[1])) + 200); gr.addColorStop(0, `rgba(27,26,24,${alpha})`); gr.addColorStop(0.55, `rgba(27,26,24,${alpha * 0.45})`); gr.addColorStop(1, 'rgba(27,26,24,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], pts[0][1] + 400); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1] + 400); g.closePath(); g.fill(); g.restore();
        const rr = rng(seed); for (let i = 1; i < pts.length; i++) brush(g, [pts[i - 1], [lerp(pts[i - 1][0], pts[i][0], 0.5), lerp(pts[i - 1][1], pts[i][1], 0.5) + (rr() - 0.5) * 20], pts[i]], 9 * alpha * 2, 4, { seed: seed + i, dry: 1 }); };
      mount([[-40, 760], [140, 520], [260, 610], [420, 300], [560, 470], [700, 380], [880, 560], [1120, 470]], 0.32, 10, 5);
      mount([[-40, 1000], [120, 860], [300, 940], [460, 760], [620, 900], [820, 820], [1120, 980]], 0.55, 6, 9);
      // the ledge, the hut on it: a few strokes of thatch, a dark doorway
      mount([[-40, 1330], [200, 1210], [380, 1180], [560, 1250], [700, 1400]], 0.85, 4, 13);
      brush(g, [[250, 1150], [330, 1060], [420, 1150]], 26, 12, { seed: 21, dry: 1.4 }); brush(g, [[270, 1150], [270, 1210]], 9, 7, { seed: 22 }); brush(g, [[400, 1150], [400, 1205]], 9, 7, { seed: 23 });
      g.fillStyle = 'rgba(27,26,24,.75)'; g.fillRect(318, 1160, 34, 46);
      // the telephone wire: one fine line from the hut, down the mountain, out of the picture
      g.strokeStyle = 'rgba(27,26,24,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(410, 1120); g.quadraticCurveTo(600, 1200, 760, 1150); g.quadraticCurveTo(900, 1230, 1100, 1180); g.stroke();
      brush(g, [[760, 1148], [760, 1330]], 7, 5, { seed: 31 });
      // the pine in the foreground: a leaning trunk, needle clusters
      for (let k = 0; k < 4; k++) { const o = (k - 1.5) * 9; g.strokeStyle = `rgba(27,26,24,${0.55 + k * 0.1})`; g.lineCap = 'round'; g.lineWidth = 26 - k * 4; g.beginPath(); g.moveTo(985 + o, 1930); g.bezierCurveTo(940 + o, 1700, 880 + o * 0.6, 1500, 640 + o * 0.3, 1362); g.stroke(); }
      brush(g, [[990, 1900], [940, 1700], [880, 1520]], 18, 8, { seed: 41, dry: 2, col: 'rgba(27,26,24,.6)' });
      brush(g, [[880, 1560], [960, 1470], [1060, 1450]], 26, 8, { seed: 42, dry: 1.5 });
      const needles = (cx, cy, rad, seed) => { const rr = rng(seed); g.strokeStyle = 'rgba(27,26,24,.85)'; g.lineWidth = 2.2; for (let i = 0; i < 70; i++) { const a = -Math.PI + rr() * Math.PI, l = rad * (0.5 + rr() * 0.5); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l * 0.55); g.stroke(); } };
      for (const [x, y, rad, s] of [[640, 1350, 90, 1], [760, 1390, 80, 2], [1040, 1440, 90, 3], [900, 1500, 70, 4]]) needles(x, y, rad, 50 + s);
      g.drawImage(P.grain('st_sumie', 0.03, [60, 50, 40], 0.1), 0, 0);
    });
    return {
      draw(c, lt) {
        c.drawImage(stat(), 0, 0);
        // a drift of mist across the middle mountains
        c.save(); c.globalAlpha = 0.55; const mx = (lt * 14) % 400; const gr = c.createLinearGradient(0, 900, 0, 1100); gr.addColorStop(0, 'rgba(242,236,223,0)'); gr.addColorStop(0.5, 'rgba(242,236,223,1)'); gr.addColorStop(1, 'rgba(242,236,223,0)');
        c.fillStyle = gr; for (let k = -1; k < 4; k++) { c.beginPath(); c.ellipse(k * 400 + mx, 1000, 260, 70, 0, 0, TAU); c.fill(); } c.restore();
        // Toko on the hut's step, the green of his mask the only colour but the seal
        c.fillStyle = 'rgba(27,26,24,.85)'; c.beginPath(); c.moveTo(352, 1206); c.quadraticCurveTo(350, 1166, 370, 1160); c.quadraticCurveTo(392, 1166, 390, 1206); c.closePath(); c.fill();
        mask(c, 371, 1146, 15, S.GREEN, { strap: false, shade: false, face: '#f2ecdf', frame: '#1b1a18', ink: '#1b1a18' });
        c.strokeStyle = 'rgba(242,236,223,.8)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 8; i++) c.lineTo(392 + Math.sin(i + lt * 3) * 3, 1180 - i * 5); c.stroke();
        // the haiku, three columns, read right to left
        vtext(c, '電話鳴る', 990, 120, 70, 'NotoSerifJP-600', '#1b1a18');
        vtext(c, '山は答えず', 900, 190, 70, 'NotoSerifJP-600', '#1b1a18');
        vtext(c, '秋の暮', 810, 260, 70, 'NotoSerifJP-600', '#1b1a18');
        seal(c, 790, 520, 74, '#c8231c', '#f2ecdf');
        c.fillStyle = '#c8231c'; c.fillRect(800, 610, 54, 110); vtext(c, '十湖', 827, 616, 46, 'NotoSerifJP-600', '#f2ecdf', 1.05);
      },
    };
  })();

  // ================================================================== JRPG
  SCENES['st_jrpg'] = (() => {
    const LW = 270, LH = 480;   // the game's own resolution; shown ×4
    const pal = { ink: '#0d0b14', wall: '#3a3552', wallD: '#2a2640', floor: '#8a5a3a', floorL: '#a06a44', bed: '#c84a5a', bedL: '#e87a7a', sheet: '#e8e2d0', desk: '#6a4a32', pc: '#1a1a24', glow: '#7ff0ff', night: '#141a3a', city: '#ffd27a', neon: '#ff4fd8', win0: '#1d2a6e', win1: '#3d5ab8', border: '#f4f4f4', skin: '#7c1d96', face: '#fff4e8', hood: '#3a3d44' };
    function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
    function windowBox(g, x, y, w, h) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, pal.win1); gr.addColorStop(1, pal.win0); g.fillStyle = gr; g.fillRect(x, y, w, h); g.strokeStyle = pal.border; g.lineWidth = 2; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); g.strokeStyle = pal.ink; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    function sprite(g, x, y, lt) {   // 16×24: the purple mask, a hoodie, two feet; he bobs on the idle frame
      const b = Math.floor(lt * 2) % 2;
      px(g, x + 3, y + 12 + b, 10, 9, pal.hood); px(g, x + 2, y + 14 + b, 1, 5, pal.hood); px(g, x + 13, y + 14 + b, 1, 5, pal.hood);
      px(g, x + 4, y + 21, 3, 3, pal.ink); px(g, x + 9, y + 21, 3, 3, pal.ink);
      g.fillStyle = pal.skin; g.beginPath(); g.arc(x + 8, y + 7 + b, 6.5, 0, TAU); g.fill();
      px(g, x + 5, y + 5 + b, 2, 1, pal.face); px(g, x + 9, y + 5 + b, 2, 1, pal.face); px(g, x + 5, y + 6 + b, 1, 1, pal.face); px(g, x + 10, y + 6 + b, 1, 1, pal.face);
      px(g, x + 5, y + 8 + b, 1, 1, pal.face); px(g, x + 6, y + 9 + b, 4, 1, pal.face); px(g, x + 10, y + 8 + b, 1, 1, pal.face);
      px(g, x + 12, y + 14 + b, 3, 4, pal.ink); px(g, x + 12, y + 15 + b, 3, 2, pal.glow);   // the phone, lit
    }
    return {
      draw(c, lt) {
        const lc = P.scratch('st_jrpg_low'); lc.width = LW; lc.height = LH; const g = lc.getContext('2d'); g.imageSmoothingEnabled = false;
        // the room, top-down three-quarter
        px(g, 0, 0, LW, LH, pal.ink);
        px(g, 20, 70, 230, 80, pal.wall); px(g, 20, 140, 230, 10, pal.wallD);
        for (let y = 150; y < 380; y += 8) for (let x = 20; x < 250; x += 24) px(g, x + ((y / 8) % 2) * 12, y, 23, 7, ((x + y) / 8) % 3 ? pal.floor : pal.floorL);
        px(g, 20, 380, 230, 4, pal.wallD);
        // the window: the city at night, one neon sign, lights blinking
        px(g, 95, 82, 80, 50, pal.night); const r = rng(7);
        for (let i = 0; i < 9; i++) { const bx = 97 + i * 9, bh = 10 + r() * 30; px(g, bx, 132 - bh, 8, bh, '#232a5a'); for (let k = 0; k < bh / 5; k++) if ((r() + Math.floor(lt * 2 + i) * 0.37) % 1 < 0.45) px(g, bx + 2 + (k % 2) * 3, 132 - bh + 2 + k * 4, 2, 2, pal.city); }
        px(g, 150, 88, 18, 8, Math.floor(lt * 3) % 2 ? pal.neon : '#7a2a6a'); g.fillStyle = pal.ink; g.font = '6px "PressStart2P-400"'; g.fillText('24H', 151, 95);
        g.strokeStyle = '#7a6a8a'; g.lineWidth = 2; g.strokeRect(95, 82, 80, 50); px(g, 134, 82, 2, 50, '#7a6a8a');
        // the bed (unmade), the desk with its PC, the konbini bag, cans, a wall clock at 1:07
        px(g, 28, 160, 60, 96, pal.bed); px(g, 28, 160, 60, 22, pal.sheet); for (let i = 0; i < 6; i++) px(g, 32 + i * 9, 190 + (i % 2) * 6, 7, 3, pal.bedL);
        px(g, 186, 156, 60, 30, pal.desk); px(g, 186, 186, 4, 18, pal.desk); px(g, 242, 186, 4, 18, pal.desk);
        px(g, 200, 136, 34, 24, pal.pc); px(g, 203, 139, 28, 16, Math.floor(lt * 4) % 2 ? pal.glow : '#5fd0e0'); px(g, 214, 160, 6, 4, pal.pc);
        px(g, 196, 222, 12, 14, '#f0f0ea'); px(g, 199, 219, 6, 3, '#f0f0ea'); for (const [x, y] of [[214, 228], [222, 232], [168, 300]]) { px(g, x, y, 5, 8, '#3f7fd8'); px(g, x, y, 5, 2, '#d8d8d8'); }
        g.fillStyle = '#e8e2d0'; g.beginPath(); g.arc(60, 102, 9, 0, TAU); g.fill(); px(g, 60, 95, 1, 7, pal.ink); px(g, 60, 102, 4, 1, pal.ink);
        sprite(g, 128, 262, lt);
        // the status window
        windowBox(g, 8, 8, 118, 52);
        g.fillStyle = pal.border; g.font = '10px "IPAPGothic"'; g.textBaseline = 'top'; g.fillText('トコ', 16, 13); g.font = '7px "PressStart2P-400"'; g.fillText('Lv 27', 66, 15);
        g.fillText('HP', 16, 30); g.fillText('3/99', 40, 30); g.fillText('MP', 16, 43); g.fillText('0/99', 40, 43);
        px(g, 82, 31, 38, 5, '#3a2030'); px(g, 82, 31, 2, 5, '#ff3a3a');
        // the dialogue box, and the choice
        windowBox(g, 8, 392, 254, 80);
        g.fillStyle = pal.border; g.font = '13px "IPAPGothic"'; g.fillText('未読メッセージが', 18, 402); g.fillText('99+件 あります。', 18, 420);
        g.fillText('▶ 読む', 28, 446); g.fillText('寝る', 120, 446);
        if (Math.floor(lt * 2.5) % 2) { g.fillStyle = pal.border; g.beginPath(); g.moveTo(244, 456); g.lineTo(252, 456); g.lineTo(248, 462); g.fill(); }
        c.imageSmoothingEnabled = false; c.drawImage(lc, 0, 0, LW * 4, LH * 4); c.imageSmoothingEnabled = true;
      },
    };
  })();

  // ================================================================== linocut
  SCENES['st_lino'] = (() => {
    const PAPER = '#efe7d4', INK = '#151515', LAKE = '#2e5f8a';
    /** ink that does not quite cover: paper specks pushed through a filled shape */
    function specks(g, path, n, seed) { const r = rng(seed); g.save(); g.clip(path); g.fillStyle = PAPER; for (let i = 0; i < n; i++) { g.globalAlpha = 0.25 + r() * 0.5; g.fillRect(r() * W, r() * H, 1 + r() * 2.5, 1 + r() * 2); } g.restore(); }
    /** a gouge cut: a white line with ragged width */
    function gouge(g, pts, w, seed) { const r = rng(seed); g.strokeStyle = PAPER; g.lineCap = 'round'; for (let i = 1; i < pts.length; i++) { g.lineWidth = w * (0.6 + r() * 0.7); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } }
    const stat = () => P.cached('st_lino', W, H, (g) => {
      g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
      // the blue block: the lake, cut with ripples
      const lake = new Path2D(); lake.rect(0, 860, W, 760); g.fillStyle = LAKE; g.fill(lake); specks(g, lake, 7000, 2);
      const r = rng(5); for (let y = 880; y < 1620; y += 22) { const pts = []; let x = -20; while (x < W + 20) { pts.push([x, y + Math.sin(x * 0.02 + y) * 4]); x += 40 + r() * 40; } gouge(g, pts, 5 + (y - 880) / 140, y); }
      // the key block: the sky's cut lines, the low midsummer sun as carved rings
      const sky = new Path2D(); sky.rect(0, 0, W, 860); g.fillStyle = INK; g.fill(sky);
      g.fillStyle = PAPER; g.beginPath(); g.arc(700, 760, 150, 0, TAU); g.fill();
      for (let k = 0; k < 4; k++) { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.arc(700, 760, 40 + k * 32, 0, TAU); g.stroke(); }
      for (let y = 40; y < 640; y += 30) { const pts = []; for (let x = -20; x < W + 40; x += 60) pts.push([x, y + Math.sin(x * 0.01 + y * 0.1) * 8]); gouge(g, pts, 4 + (y / 640) * 4, y + 3); }
      specks(g, sky, 9000, 3);
      // the far shore: a spruce forest in jagged black, its reflection broken in the lake
      g.fillStyle = INK; g.beginPath(); g.moveTo(0, 880); for (let x = 0; x <= W; x += 18) g.lineTo(x, 860 - (x % 36 ? 30 + r() * 50 : 0) - Math.abs(Math.sin(x * 0.004)) * 60); g.lineTo(W, 880); g.closePath(); g.fill();
      g.globalAlpha = 0.6; for (let x = 0; x < W; x += 18) g.fillRect(x, 884 + r() * 10, 8, 20 + r() * 40); g.globalAlpha = 1;
      // the sauna on the left shore, smoke curling from its chimney
      g.fillStyle = INK; g.fillRect(70, 760, 190, 120); g.beginPath(); g.moveTo(50, 770); g.lineTo(165, 690); g.lineTo(280, 770); g.closePath(); g.fill(); g.fillRect(210, 660, 22, 70);
      for (let k = 0; k < 6; k++) gouge(g, [[90, 790 + k * 14], [240, 790 + k * 14]], 3, 70 + k);
      g.fillStyle = PAPER; g.fillRect(130, 800, 34, 40);
      g.strokeStyle = PAPER; g.lineWidth = 6; g.beginPath(); for (let i = 0; i < 30; i++) g.lineTo(221 + Math.sin(i * 0.5) * 18 + i * 2, 650 - i * 9); g.stroke();
      // the jetty, plank by plank, out into the lake; the rowing boat tied to it
      for (let i = 0; i < 18; i++) { const y = 1260 + i * 0, x0 = 300 + i * 30; g.fillStyle = INK; g.fillRect(x0, 1240, 26, 40); }
      g.fillRect(300, 1280, 540, 10); for (const x of [320, 520, 720, 830]) g.fillRect(x, 1280, 10, 90);
      g.beginPath(); g.moveTo(560, 1330); g.quadraticCurveTo(700, 1420, 850, 1330); g.lineTo(820, 1350); g.quadraticCurveTo(700, 1400, 590, 1350); g.closePath(); g.fill();
      // birches in the foreground: white trunks, black marks, the linocut's own tree
      for (const [x, w, top] of [[34, 56, 0], [1016, 54, 90], [910, 28, 420]]) { g.fillStyle = INK; g.fillRect(x - w / 2 - 6, top, w + 12, H - top); g.fillStyle = PAPER; g.fillRect(x - w / 2, top, w, H - top);
        const rr = rng(x); for (let y = top + 20; y < H; y += 40 + rr() * 60) { g.fillStyle = INK; g.beginPath(); g.ellipse(x + (rr() - 0.5) * w * 0.4, y, w * (0.25 + rr() * 0.3), 5 + rr() * 6, 0, 0, TAU); g.fill(); } }
      // the cut title, bottom: Finnish, and the Japanese for it
      g.fillStyle = INK; g.fillRect(0, 1640, W, 280); specks(g, (() => { const p = new Path2D(); p.rect(0, 1640, W, 280); return p; })(), 3000, 9);
      g.fillStyle = PAPER; g.font = '150px "AlfaSlabOne-400"'; g.textAlign = 'center'; g.fillText('MÖKILLÄ', 540, 1800);
      g.font = '54px "NotoSerifJP-600"'; g.fillText('湖畔の小屋', 540, 1880);
    });
    return {
      draw(c, lt) {
        c.drawImage(stat(), 0, 0);
        // Mökki Toko at the end of the jetty: the rod out over the water, the phone face down beside him
        const x = 760, y = 1240;
        c.fillStyle = INK; c.beginPath(); c.moveTo(x - 34, y); c.quadraticCurveTo(x - 38, y - 80, x, y - 86); c.quadraticCurveTo(x + 38, y - 80, x + 34, y); c.closePath(); c.fill();
        c.fillRect(x - 26, y, 18, 44); c.fillRect(x + 8, y, 18, 44);
        mask(c, x, y - 112, 30, S.SKY, { strap: true, shade: false, face: PAPER, frame: INK, ink: INK });
        const sw = Math.sin(lt * 1.3) * 0.03; c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 20, y - 40); c.lineTo(x + 200, y - 230 + sw * 300); c.stroke();
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 200, y - 230 + sw * 300); c.lineTo(x + 230, y + 120); c.stroke();
        c.fillStyle = PAPER; c.beginPath(); c.arc(x + 230, y + 120 + Math.sin(lt * 2.4) * 3, 7, 0, TAU); c.fill();
        c.fillStyle = INK; c.fillRect(x - 110, y - 12, 40, 12); c.fillStyle = PAPER; c.fillRect(x - 106, y - 9, 32, 2);   // the phone, face down
      },
    };
  })();

  // ================================================================== risograph
  SCENES['st_riso'] = (() => {
    const PAPER = '#f4f0e6', INKS = { pink: ['#ff48b0', [3, -2]], blue: ['#0078bf', [-2, 2]], yellow: ['#ffe800', [1, 3]] };
    /** each ink is drawn as a grey mask on its own sheet, then printed in its colour, multiplied and off register */
    function sheet(key, draw) { return P.cached('st_riso_' + key, W, H, (g) => { g.fillStyle = '#000'; draw(g); }); }
    function dots(g, x, y, w, h, pitch, rad) { for (let yy = y; yy < y + h; yy += pitch) for (let xx = x + ((yy / pitch) % 2) * pitch / 2; xx < x + w; xx += pitch) { g.beginPath(); g.arc(xx, yy, rad, 0, TAU); g.fill(); } }
    const pink = () => sheet('pink', (g) => {
      g.fillRect(0, 0, W, 300); g.clearRect(60, 60, W - 120, 180);
      dots(g, 0, 300, W, 700, 14, 3.2);                                           // the sky, a pink screen
      g.beginPath(); g.arc(540, 1460, 50, 0, TAU); g.fill();                      // Toko's mask disc (the original magenta, in fluoro pink)
      g.fillRect(470, 1510, 140, 170); g.fillRect(690, 1585, 120, 60);             // his coat; the dog's coat
      
    });
    const blue = () => sheet('blue', (g) => {
      // Kallio church's tower, the blocks of flats, the tram
      g.fillRect(380, 360, 150, 560); g.beginPath(); g.moveTo(370, 370); g.lineTo(455, 220); g.lineTo(540, 370); g.closePath(); g.fill(); g.fillRect(450, 160, 10, 70);
      for (const [x, w, h] of [[0, 360, 520], [560, 520, 600]]) { g.fillRect(x, 1000 - h + 400, w, h); }
      g.clearRect(40, 960, 260, 10); for (let y = 1000; y < 1380; y += 60) for (let x = 30; x < 330; x += 60) g.clearRect(x, y, 30, 36); for (let y = 960; y < 1380; y += 60) for (let x = 600; x < 1060; x += 60) g.clearRect(x, y, 30, 36);
      g.fillRect(0, 1700, W, 220);                                                 // the street
      g.fillRect(120, 1420, 780, 220); g.clearRect(160, 1450, 700, 80);             // the tram, its windows
      dots(g, 0, 1640, W, 60, 10, 2.6);
    });
    const yellow = () => sheet('yellow', (g) => {
      for (let y = 1000; y < 1380; y += 60) for (let x = 30; x < 330; x += 60) if ((x * 7 + y) % 3) g.fillRect(x, y, 30, 36);     // lit windows
      for (let y = 960; y < 1380; y += 60) for (let x = 600; x < 1060; x += 60) if ((x * 3 + y) % 4) g.fillRect(x, y, 30, 36);
      g.fillRect(160, 1450, 700, 80); dots(g, 380, 360, 150, 560, 12, 2.4);
      g.beginPath(); g.arc(860, 330, 70, 0, TAU); g.fill();
    });
    return {
      draw(c, lt) {
        c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
        c.save(); c.globalCompositeOperation = 'multiply';
        for (const [k, fn] of [['yellow', yellow], ['blue', blue], ['pink', pink]]) {
          const [col, [ox, oy]] = INKS[k], m = fn(), t = P.scratch('st_riso_tint_' + k), tg = t.getContext('2d');
          tg.clearRect(0, 0, W, H); tg.globalCompositeOperation = 'source-over'; tg.drawImage(m, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, W, H);
          c.globalAlpha = 0.92; c.drawImage(t, ox, oy);
        }
        c.restore();
        c.drawImage(P.grain('st_riso', 0.05, [60, 40, 60], 0.12), 0, 0);
        // the drawing on top, in the blue ink as a line: Toko walking the dog, the camera on the wall
        const step = Math.sin(lt * 6);
        c.strokeStyle = '#0d3a66'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(500, 1680); c.lineTo(500 + step * 14, 1720); c.moveTo(580, 1680); c.lineTo(580 - step * 14, 1720); c.stroke();
        mask(c, 540, 1460, 50, '#ff48b0', { strap: true, shade: false, face: PAPER, frame: '#0d3a66', ink: '#0d3a66' });
        c.beginPath(); c.moveTo(600, 1560); c.quadraticCurveTo(660, 1600, 700, 1590); c.stroke();                                    // the lead
        c.beginPath(); c.moveTo(700, 1590); c.lineTo(700 + step * 8, 1650); c.moveTo(800, 1590); c.lineTo(800 - step * 8, 1650); c.moveTo(810, 1585); c.lineTo(840, 1550); c.stroke();
        c.beginPath(); c.arc(845, 1545, 18, 0, TAU); c.stroke();
        c.fillStyle = '#0d3a66'; c.fillRect(250, 1100, 60, 34); c.beginPath(); c.arc(300, 1117, 9, 0, TAU); c.fill();                 // the home camera, on the wall
        c.setLineDash([10, 8]); c.lineWidth = 3; c.beginPath(); c.moveTo(300, 1134); c.lineTo(690, 1560); c.stroke(); c.setLineDash([]);
        c.fillStyle = PAPER; c.fillRect(70, 1160, 330, 150); c.strokeStyle = '#ff48b0'; c.lineWidth = 8; c.strokeRect(70, 1160, 330, 150);
        c.fillStyle = '#0d3a66'; c.font = '64px "Anton-400"'; c.textAlign = 'center'; c.fillText('PEURA 92%', 235, 1240); c.font = '40px "IPAPGothic"'; c.fillText('鹿', 235, 1292);
        c.fillStyle = '#0d3a66'; c.font = '150px "Anton-400"'; c.textAlign = 'center'; c.fillText('KALLIO', 540, 218);
        c.fillStyle = '#0d3a66'; c.font = '32px "Poppins-800"'; c.fillText('TOKO ZINE · NRO 1 · カッリオ', 540, 285);
      },
    };
  })();

  // ================================================================== kamishibai
  SCENES['st_kamishibai'] = (() => {
    const WOOD = '#8a5a34', WOODD = '#5e3a20', WOODL = '#b07a48', CARD = '#f6efdc', INK = '#2a2420';
    const card = () => P.cached('st_kami_card', 800, 600, (g) => {
      // a painted card in poster colour: two worlds, a fax ribbon arcing between them
      g.fillStyle = '#9fd1e8'; g.fillRect(0, 0, 400, 600); g.fillStyle = '#f4b37a'; g.fillRect(400, 0, 400, 600);
      g.fillStyle = '#4d7a3c'; g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(200, 360, 400, 430); g.lineTo(400, 600); g.lineTo(0, 600); g.fill();               // Finland: a lake shore
      g.fillStyle = '#2e5f8a'; g.fillRect(0, 470, 400, 130);
      g.fillStyle = '#6b4a2a'; g.fillRect(60, 330, 110, 90); g.fillStyle = '#3a2a1a'; g.beginPath(); g.moveTo(45, 335); g.lineTo(115, 280); g.lineTo(185, 335); g.fill();
      g.fillStyle = '#7a8a3c'; g.beginPath(); g.moveTo(400, 430); g.quadraticCurveTo(600, 330, 800, 420); g.lineTo(800, 600); g.lineTo(400, 600); g.fill();          // Japan: hills and a thatched house
      g.fillStyle = '#a8864e'; g.beginPath(); g.moveTo(570, 380); g.quadraticCurveTo(640, 260, 710, 380); g.fill(); g.fillStyle = '#e8dcc0'; g.fillRect(585, 380, 110, 60);
      g.fillStyle = '#e2652a'; for (const [x, y] of [[740, 300], [760, 330], [730, 350]]) { g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); }
      // the fax, curling from one machine to the other
      g.strokeStyle = '#ffffff'; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(250, 400); g.bezierCurveTo(300, 80, 500, 80, 560, 420); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3; for (let k = 0; k < 9; k++) { const t = 0.12 + k * 0.09, x = (1 - t) ** 3 * 250 + 3 * (1 - t) ** 2 * t * 300 + 3 * (1 - t) * t * t * 500 + t ** 3 * 560, y = (1 - t) ** 3 * 400 + 3 * (1 - t) ** 2 * t * 80 + 3 * (1 - t) * t * t * 80 + t ** 3 * 420; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.stroke(); }
      for (const [x, y] of [[250, 410], [560, 430]]) { g.fillStyle = '#e8e2d0'; g.fillRect(x - 40, y, 80, 40); g.fillStyle = INK; g.fillRect(x - 30, y + 8, 60, 6); }
      g.drawImage(P.grain('st_kami', 0.06, [60, 40, 20], 0.16), 0, 0, 800, 600, 0, 0, 800, 600);
    });
    return {
      draw(c, lt) {
        // the street behind: a soft evening wall, the bicycle's rack under the stage
        const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2b3a4a'); bg.addColorStop(1, '#151b22'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
        c.fillStyle = '#20262c'; c.fillRect(0, 1500, W, 420);
        c.strokeStyle = '#111'; c.lineWidth = 14; c.beginPath(); c.moveTo(260, 1480); c.lineTo(820, 1480); c.moveTo(300, 1480); c.lineTo(380, 1700); c.moveTo(780, 1480); c.lineTo(700, 1700); c.stroke();
        c.lineWidth = 12; c.beginPath(); c.arc(540, 1760, 150, 0, TAU); c.stroke(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + lt * 0.2; c.lineWidth = 2; c.beginPath(); c.moveTo(540, 1760); c.lineTo(540 + Math.cos(a) * 150, 1760 + Math.sin(a) * 150); c.stroke(); }
        // the stage (butai): a wooden box, its two doors open, a header board with the name
        c.fillStyle = WOODD; c.fillRect(120, 440, 840, 1040); c.fillStyle = WOOD; c.fillRect(150, 470, 780, 980);
        const doorAng = clamp(lt / 1.2), dw = 260 * (1 - doorAng * 0.75);
        c.fillStyle = WOODL; c.fillRect(150 - dw * 0.9, 480, dw * 0.9, 960); c.fillRect(930, 480, dw * 0.9, 960);
        c.fillStyle = WOODD; c.fillRect(120, 330, 840, 120); c.fillStyle = CARD; c.fillRect(380, 350, 320, 80);
        c.fillStyle = INK; c.font = '64px "NotoSerifJP-600"'; c.textAlign = 'center'; c.fillText('紙芝居', 540, 412);
        // the card in the window, the next one being pulled out sideways
        c.drawImage(card(), 140, 650, 800, 600);
        const pull = 0.22 * clamp((lt - 1.6) / 1.6);
        c.save(); c.beginPath(); c.rect(190, 520, 700, 880); c.clip();
        c.fillStyle = CARD; c.fillRect(190, 520, 700, 880); c.fillStyle = INK; c.font = '56px "IPAPGothic"'; c.textAlign = 'right'; c.fillText('つづく', 870, 1220); c.font = '40px "AlfaSlabOne-400"'; c.fillText('JATKUU', 870, 1276);
        c.drawImage(card(), 0, 0, 800, 600, 190 - pull * 320, 620, 700 * 1.0, 525);
        // the two pen pals on the card, as poster figures: Mökki Toko (sky) left, Kyoto Toko (green) right
        mask(c, 300 - pull * 320, 1030, 46, S.SKY, { strap: true, shade: false, face: CARD, frame: INK, ink: INK });
        mask(c, 780 - pull * 320, 1040, 46, S.GREEN, { strap: true, shade: false, face: CARD, frame: INK, ink: INK });
        c.fillStyle = '#2f3d5c'; c.fillRect(746 - pull * 320, 1080, 68, 90); c.fillStyle = '#7a3a2a'; c.fillRect(266 - pull * 320, 1072, 68, 90);
        c.restore();
        c.strokeStyle = WOODD; c.lineWidth = 16; c.strokeRect(190, 520, 700, 880);
        // the storyteller's hand at the right edge, drawing the card out
        c.fillStyle = '#d9a37a'; c.beginPath(); c.ellipse(900 - pull * 40, 980, 60, 44, 0.3, 0, TAU); c.fill();
        c.fillStyle = '#3a4a5c'; c.fillRect(940 - pull * 40, 950, 160, 70);
        // the title under the stage, in the two languages it is about
        c.fillStyle = '#f6efdc'; c.font = '72px "IPAPGothic"'; c.textAlign = 'center'; c.fillText('ペンパル', 540, 220);
        c.font = '56px "AlfaSlabOne-400"'; c.fillText('KIRJEKAVERIT', 540, 296);
      },
    };
  })();
})();
