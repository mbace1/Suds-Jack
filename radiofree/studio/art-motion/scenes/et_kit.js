// EIGHT IN TEN — Kyoto Toko and Tokyo Toko, one news story in two rooms (plan/films/15-japan.md; research
// plan/research-japan.md §1). The owner's three Japan looks of 17 Oct: Kyoto in the shin-hanga woodblock
// (scenes/jp_kit.js jp_kyoto_hanga, drawn bare and extended here), Tokyo as a manga page and as the city-pop sleeve.
//   et_split   the same news in both: the farmhouse radio says it, three screens in the 1K flat pop it (ピコン)
//   et_tokyo   the city-pop sleeve: Tokyo Toko's evening as an album, EIGHT IN TEN, a 20代 78.2% hype sticker
//   et_cups    the number as a print: ten teacups; six hold a phone, two more phones drop in, two keep their tea
//   et_kyoto   the farmhouse at dusk: the survey runs along the wire, past the house, and never stops
//   et_card    Toko's card: his green glove pours tea into two cups
// No face is drawn anywhere: the mask is the face (RFM.mask, the traced master). Timings come from window.FILM_PLAN.
(() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S, shapes } = RFM, rng = U.rng;
  const FP = () => window.FILM_PLAN, shot = (id) => { const f = FP(); return f && f.shots.find((x) => x.id === id); };
  const cue = (id, k, d) => { const f = FP(), s = shot(id); return f && s && f.cues[`${id}.${k}`] != null ? f.cues[`${id}.${k}`] - s.t0 : d; };
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const back = (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const K = { paper: '#ede3c9', key: '#24201b', ind: '#263a58', peach: '#ecb88a', wood: '#4a3528', woodL: '#6b4f3a', kaki: '#e2652a', moss: '#5c7444', seal: '#c8231c',
    glaze: '#d9cfb6', glazeD: '#8e7f62', tea: '#7b8a3c', teaD: '#5d6a2a', steam: 'rgba(237,227,201,.7)', phone: '#2b2d33', glow: '#cfe3ff' };
  const INK = '#141414', PAGE = '#f6f5f1';
  const seal = (c, x, y, sz, col, paper) => { c.fillStyle = col; c.fillRect(x, y, sz, sz);
    c.save(); c.translate(x + sz * 0.14, y + sz * 0.16); c.scale(sz * 0.72 / 700, sz * 0.72 / 700); c.fillStyle = paper; for (const k of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) c.fill(shapes[k]); c.restore(); };
  const vtext = (c, s, x, y, size, font, col, gap = 1.08) => { c.save(); c.fillStyle = col; c.font = `${size}px "${font}"`; c.textAlign = 'center'; c.textBaseline = 'top'; [...s].forEach((ch, i) => c.fillText(ch, x, y + i * size * gap)); c.restore(); };
  const paper = () => P.cached('et_paper', W, H, (g) => { g.fillStyle = K.paper; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(120,95,60,.07)'; g.lineWidth = 2;
    for (let y = 0; y < H; y += 9) { g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.006 + y * 0.03) * 7 + P.fbm(x * 0.003, y * 0.01, 2) * 18); g.stroke(); }
    g.drawImage(P.grain('etp', 0.04, [90, 70, 40], 0.12), 0, 0); });
  const woodblock = (lt, extra) => { const cv = P.scratch('et_wb'), g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); SCENES['jp_kyoto_hanga'].draw(g, lt, { bare: true, extra }); return cv; };

  // ---- the manga kit: screentone, panels, sound effects, a commuter-shaped figure
  const tone = (key, pitch, r) => P.cached('et_tone_' + key, pitch * 2, pitch * 2, (g) => { g.fillStyle = INK; for (const [x, y] of [[0, 0], [pitch, pitch], [pitch * 2, 0], [0, pitch * 2], [pitch * 2, pitch * 2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } });
  const fillTone = (c, path, key, pitch, r) => { c.save(); c.clip(path); c.fillStyle = c.createPattern(tone(key, pitch, r), 'repeat'); c.fillRect(0, 0, W, H); c.restore(); };
  const rect = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
  function sfx(c, s, x, y, size, rot, lt, t0, { vertical = false } = {}) {
    const k = clamp((lt - t0) / 0.32); if (k <= 0) return; const sp = 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sp, sp); c.font = `${size}px "IPAPGothic"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    [...s].forEach((ch, i, a) => { const dx = vertical ? 0 : (i - (a.length - 1) / 2) * size * 0.92, dy = vertical ? (i - (a.length - 1) / 2) * size * 0.95 : 0;
      c.lineWidth = 14; c.strokeStyle = PAGE; c.strokeText(ch, dx, dy); c.lineWidth = 5; c.strokeStyle = INK; c.strokeText(ch, dx, dy); c.fillStyle = INK; c.fillText(ch, dx, dy); });
    c.restore();
  }
  function speed(c, cx, cy, r0, r1, n, seed) { const r = rng(seed); c.fillStyle = INK; for (let i = 0; i < n; i++) { const a = r() * TAU, w = 0.004 + r() * 0.01, ri = r0 + r() * 60;
    c.beginPath(); c.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1); c.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri); c.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1); c.fill(); } }
  /** Tokyo Toko from behind and a little to the side, at the desk: a hoodie in tone, the lanyard, the purple mask in profile */
  function tokyoToko(c, x, y, s, lt) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const body = new Path2D(); body.moveTo(-110, 260); body.quadraticCurveTo(-120, 60, -60, 30); body.lineTo(60, 30); body.quadraticCurveTo(120, 60, 110, 260); body.closePath();
    c.fillStyle = PAGE; c.fill(body); c.restore();
    const m = new DOMMatrix().translate(x, y).scale(s, s), bp = new Path2D(); bp.addPath(body, m); fillTone(c, bp, 'mid', 9, 1.8);
    c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(body);
    c.beginPath(); c.moveTo(-30, 34); c.quadraticCurveTo(0, 90, 30, 34); c.stroke();                                         // the hood's edge
    mask(c, 18, -30 + Math.sin(lt * 2) * 1.5, 56, S.PURPLE, { strap: true, shade: false, face: PAGE, frame: INK, ink: INK });
    c.restore();
  }
  /** a monitor: frame, stand, and what it shows (fn draws into its screen rect) */
  function monitor(c, x, y, w, h, fn) { c.fillStyle = INK; c.fillRect(x + w / 2 - 14, y + h, 28, 60); c.fillRect(x + w / 2 - 70, y + h + 54, 140, 14);
    c.beginPath(); c.roundRect(x - 12, y - 12, w + 24, h + 24, 10); c.fill(); c.fillStyle = PAGE; c.fillRect(x, y, w, h); c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); fn(x, y, w, h); c.restore(); }
  /** the push banner every screen gets: 生成AI 利用 8割へ */
  function banner(c, x, y, w, k) { if (k <= 0) return; const s = back(k / 0.6); c.save(); c.translate(x + w / 2, y + 60); c.scale(s, s);
    c.fillStyle = INK; c.beginPath(); c.roundRect(-w / 2 + 10, -40, w - 20, 80, 16); c.fill(); c.fillStyle = PAGE; c.font = `${Math.min(36, w / 10)}px "IPAPGothic"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('生成AI利用 8割へ', 0, 2); c.restore(); }

  // ================================================================== 1 · the same news, in both rooms
  SCENES['et_split'] = (() => {
    const radio = (c, lt) => { const x = 486, y = 1258, on = clamp((lt - 0.5) / 0.3);                  // a transistor radio on the engawa beside him
      c.strokeStyle = K.key; c.lineWidth = 3; c.fillStyle = '#b8a27a'; c.fillRect(x, y, 84, 34 + 0); c.strokeRect(x, y, 84, 34);
      c.fillStyle = K.key; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(x + 14 + i * 9, y + 9 + j * 8, 2.2, 0, TAU); c.fill(); }
      c.fillStyle = '#e9dcc0'; c.fillRect(x + 54, y + 8, 22, 12); c.strokeRect(x + 54, y + 8, 22, 12); c.beginPath(); c.moveTo(x + 76, y); c.lineTo(x + 104, y - 60); c.stroke();
      if (on > 0) { c.save(); c.globalAlpha = on; c.lineWidth = 3; for (let k = 0; k < 3; k++) { const r = 26 + k * 18 + ((lt * 30) % 18); c.beginPath(); c.arc(x + 84, y + 14, r, -0.9, 0.5); c.stroke(); } c.restore(); } };
    return {
      draw(c, lt) {
        const sh = shot('et_split'), news = cue('et_split', 'news', 1.0);
        // top: the woodblock, cropped to the farmhouse; the radio says it
        const wb = woodblock(lt + 0.6, radio);
        c.fillStyle = K.paper; c.fillRect(0, 0, W, H);
        c.drawImage(wb, 0, 560, W, 940, 0, 0, W, 940);
        c.fillStyle = K.paper; c.fillRect(70, 820, 128, 64); c.strokeStyle = K.seal; c.lineWidth = 4; c.strokeRect(70, 820, 128, 64);
        c.fillStyle = K.key; c.font = '44px "NotoSerifJP-600"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('京都', 134, 853);
        // the gutter
        c.fillStyle = '#fbfaf6'; c.fillRect(0, 940, W, 26); c.fillStyle = INK; c.fillRect(0, 940, W, 3); c.fillRect(0, 963, W, 3);
        // bottom: the manga panel, the flat at night; three screens pop the same news one after another
        const p = [36, 990, W - 72, 892], pp = rect(...p);
        c.fillStyle = PAGE; c.fillRect(p[0], p[1], p[2], p[3]); c.save(); c.clip(pp);
        const wall = rect(p[0], p[1], p[2], 560); fillTone(c, wall, 'light', 11, 1.3);
        speed(c, 540, 1310, 260, 900, 120, 3);
        const scr = [[100, 1060, 270, 180], [405, 1030, 270, 200], [710, 1060, 270, 180]];
        scr.forEach(([x, y, w, h], i) => monitor(c, x, y, w, h, (X, Y, Wd, Hd) => { c.fillStyle = INK; for (let k = 0; k < 5; k++) c.fillRect(X + 18, Y + 24 + k * 30, Wd * (0.4 + (k * 37 % 50) / 100), 8);
          banner(c, X, Y + 20, Wd, lt - news - i * 0.28); }));
        c.fillStyle = PAGE; c.fillRect(p[0], 1400, p[2], 30); c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(p[0], 1400); c.lineTo(p[0] + p[2], 1400); c.stroke();   // the desk's edge
        tokyoToko(c, 560, 1520, 1.25, lt);
        c.restore(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(pp);
        for (let i = 0; i < 3; i++) sfx(c, 'ピコン', [230, 540, 850][i], [1010, 990, 1010][i] + 0, 58, [-0.12, 0.04, 0.14][i], lt, news + i * 0.28);
        c.fillStyle = PAGE; c.fillRect(p[0] + 20, p[1] + p[3] - 90, 150, 70); c.lineWidth = 4; c.strokeRect(p[0] + 20, p[1] + p[3] - 90, 150, 70);
        c.fillStyle = INK; c.font = '44px "IPAPGothic"'; c.textAlign = 'center'; c.fillText('東京', p[0] + 95, p[1] + p[3] - 53);
        void sh;
      },
    };
  })();

  // ================================================================== 2 · Tokyo as the city-pop sleeve (the third of the owner's 17 Oct looks): the
  // record of his evening, EIGHT IN TEN on side A, and on the shrink-wrap a hype sticker: 20代 78.2%
  SCENES['et_tokyo'] = (() => ({
    draw(c, lt) {
      const stat = cue('et_tokyo', 'stat', 1.6);
      SCENES['jp_tokyo_citypop'].draw(c, lt + 1.0, { bare: true });
      // the sleeve: an inner border, the title low on the balcony's concrete, the catalogue line
      c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeRect(40, 40, W - 80, H - 80);
      c.save(); c.fillStyle = '#1b2140'; c.font = '118px "Exo2-800i"'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText('EIGHT', 80, 1610); c.fillText('IN TEN', 80, 1726); c.fillStyle = '#ff6fa8'; c.font = '70px "IPAPGothic"'; c.fillText('十人に八人', 86, 1810);
      c.fillStyle = '#1b2140'; c.font = '26px "Poppins-800"'; c.textAlign = 'right'; c.fillText('TOKO MIDORI · SIDE A', W - 80, 1840); c.restore();
      // the hype sticker on the shrink-wrap, slapped on at the stat
      const k = clamp((lt - stat) / 0.35); if (k > 0) { const sc = back(k / 0.8); c.save(); c.translate(830, 1580); c.rotate(-0.18); c.scale(sc, sc);
        c.fillStyle = '#ffe14a'; c.beginPath(); for (let i = 0; i < 32; i++) { const a = i / 32 * TAU, r = i % 2 ? 128 : 146; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill();
        c.strokeStyle = '#1b2140'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#1b2140'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '44px "IPAPGothic"'; c.fillText('20代', 0, -40); c.font = '62px "Poppins-800"'; c.fillText('78.2%', 0, 22); c.font = '22px "Poppins-800"'; c.fillText('ALREADY USING AI', 0, 74); c.restore(); }
    },
  }))();

  // ================================================================== 3 · the number as a print: ten cups
  SCENES['et_cups'] = (() => {
    const CUPS = []; for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) CUPS.push({ x: 160 + i * 190, y: row ? 1440 : 1110, row });
    function cup(c, x, y, tea, lt, i) {
      c.strokeStyle = K.key; c.lineWidth = 4;
      c.fillStyle = K.glaze; c.beginPath(); c.moveTo(x - 70, y - 60); c.quadraticCurveTo(x - 66, y + 54, x - 30, y + 70); c.lineTo(x + 30, y + 70); c.quadraticCurveTo(x + 66, y + 54, x + 70, y - 60); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = K.glazeD; c.fillRect(x - 64, y - 6, 128, 10);
      c.fillStyle = tea ? K.tea : K.key; c.beginPath(); c.ellipse(x, y - 60, 70, 16, 0, 0, TAU); c.fill(); c.stroke();
      if (tea) { c.strokeStyle = K.steam; c.lineWidth = 3; for (let k = 0; k < 2; k++) { c.beginPath(); for (let j = 0; j < 14; j++) c.lineTo(x - 12 + k * 24 + Math.sin(j * 0.8 + lt * 3 + k + i) * 7, y - 76 - j * 9); c.stroke(); } }
    }
    function phone(c, x, y, k, lt) { if (k <= 0) return; const drop = (1 - ease(k)) * -420, b = k >= 1 ? 0 : Math.sin(k * Math.PI) * 6;
      c.save(); c.translate(x, y - 60 + drop + b); c.rotate(Math.sin(x) * 0.08);
      c.fillStyle = K.phone; c.strokeStyle = K.key; c.lineWidth = 4; c.beginPath(); c.roundRect(-34, -150, 68, 150, 10); c.fill(); c.stroke();
      c.fillStyle = K.glow; c.fillRect(-26, -138, 52, 118); c.fillStyle = K.key; for (let j = 0; j < 4; j++) c.fillRect(-18, -126 + j * 24, 36 - j * 6, 6);
      c.restore(); }
    return {
      draw(c, lt) {
        const more = cue('et_cups', 'more', 2.2);
        c.drawImage(paper(), 0, 0);
        // the tray: two steps of dark wood, combed grain
        for (const [y, h] of [[1010, 200], [1340, 220]]) { c.fillStyle = K.wood; c.fillRect(60, y + 60, 960, h - 60); c.strokeStyle = K.key; c.lineWidth = 4; c.strokeRect(60, y + 60, 960, h - 60);
          c.strokeStyle = 'rgba(36,32,27,.35)'; c.lineWidth = 2; const r = rng(y); for (let i = 0; i < 26; i++) { const yy = y + 66 + r() * (h - 72); c.beginPath(); c.moveTo(64, yy); for (let x = 64; x < 1016; x += 30) c.lineTo(x, yy + Math.sin(x * 0.02 + i) * 3); c.stroke(); } }
        CUPS.forEach((u, i) => { const landed = i < 6 || (i < 8 && lt >= more + (i - 6) * 0.3 + 0.45); cup(c, u.x, u.y, !landed, lt, i);
          if (i < 6) phone(c, u.x, u.y, 1, lt); else if (i < 8) phone(c, u.x, u.y, clamp((lt - more - (i - 6) * 0.3) / 0.45), lt); });
        // the counts as a print would set them: 6 of 10 now, 8 of 10 wanted (stamped)
        c.fillStyle = K.key; c.font = '54px "NotoSerifJP-600"'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('今　58.8%', 90, 1760);
        { const k = clamp((lt - more - 0.5) / 0.3); if (k > 0) { c.save(); c.translate(760, 1740); c.rotate(-0.08); c.scale(1 + (1 - k) * 0.6, 1 + (1 - k) * 0.6); c.globalAlpha = k;
          c.strokeStyle = K.seal; c.lineWidth = 7; c.strokeRect(-150, -60, 300, 100); c.fillStyle = K.seal; c.font = '54px "NotoSerifJP-600"'; c.textAlign = 'center'; c.fillText('目標 80%', 0, 10); c.restore(); } }
        vtext(c, '十湖', 1000, 1600, 44, 'NotoSerifJP-600', K.key); seal(c, 964, 1720, 70, K.seal, K.paper);
      },
    };
  })();

  // ================================================================== 4 · the farmhouse at dusk: the survey runs along the wire and never stops
  SCENES['et_kyoto'] = (() => {
    const wire = (c, lt) => {
      const y = (x) => 560 + 0.00012 * (x - 540) * (x - 540) - x * 0.04;
      c.strokeStyle = K.key; c.lineWidth = 5; for (const x of [-10, 1060]) { c.fillRect(x, y(x) - 20, 22, 900); }
      c.lineWidth = 3; c.beginPath(); for (let x = -10; x <= 1090; x += 20) c.lineTo(x, y(x)); c.stroke(); c.beginPath(); for (let x = -10; x <= 1090; x += 20) c.lineTo(x, y(x) + 22); c.stroke();
      // the survey: little forms with a tick, riding the line from the city side to the next town, over the roof, past the house
      for (let i = 0; i < 7; i++) { const u = ((lt * 0.22 + i / 7) % 1), x = lerp(-60, 1140, u), yy = y(x) - 34 + Math.sin(u * 30 + i) * 3;
        c.save(); c.translate(x, yy); c.rotate(Math.sin(u * 20 + i) * 0.1); c.fillStyle = '#f7f1e2'; c.strokeStyle = K.key; c.lineWidth = 3; c.fillRect(-24, -30, 48, 60); c.strokeRect(-24, -30, 48, 60);
        c.lineWidth = 4; c.beginPath(); c.moveTo(-12, -2); c.lineTo(-3, 8); c.lineTo(14, -14); c.stroke(); c.lineWidth = 2; for (let j = 0; j < 2; j++) { c.beginPath(); c.moveTo(-14, 16 + j * 7); c.lineTo(14, 16 + j * 7); c.stroke(); } c.restore(); }
    };
    return { draw(c, lt) { c.drawImage(woodblock(lt + 2.5, wire), 0, 0); vtext(c, '十湖', 96, 1648, 54, 'NotoSerifJP-600', K.key); seal(c, 54, 1780, 84, K.seal, K.paper); } };
  })();

  // ================================================================== 5 · Toko's card: tea for two
  SCENES['et_card'] = (() => {
    function pot(c, x, y, a) {                                                   // a kyusu with a side handle, tilted by a
      c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = K.key; c.lineWidth = 5;
      c.fillStyle = '#5b3a28'; c.beginPath(); c.ellipse(0, 0, 120, 92, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#6e4834'; c.beginPath(); c.ellipse(0, -84, 64, 16, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(0, -104, 14, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#5b3a28'; c.beginPath(); c.moveTo(108, -24); c.lineTo(196, -70); c.lineTo(204, -54); c.lineTo(116, 18); c.closePath(); c.fill(); c.stroke();   // the spout
      c.beginPath(); c.moveTo(-110, -10); c.lineTo(-200, -50); c.lineTo(-206, -26); c.lineTo(-112, 22); c.closePath(); c.fill(); c.stroke();                  // the handle, out to the side
      c.fillStyle = S.GREEN; c.beginPath(); c.ellipse(-204, -36, 46, 34, -0.3, 0, TAU); c.fill(); c.stroke();                                                   // his green glove on it
      c.restore();
    }
    function cup2(c, x, y, fill, lt, i) { c.strokeStyle = K.key; c.lineWidth = 5; c.fillStyle = K.glaze;
      c.beginPath(); c.moveTo(x - 92, y - 70); c.quadraticCurveTo(x - 88, y + 70, x - 40, y + 92); c.lineTo(x + 40, y + 92); c.quadraticCurveTo(x + 88, y + 70, x + 92, y - 70); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = K.glazeD; c.fillRect(x - 86, y - 4, 172, 12);
      c.fillStyle = fill > 0.05 ? K.tea : '#3a2e22'; c.beginPath(); c.ellipse(x, y - 70, 92, 20, 0, 0, TAU); c.fill(); c.stroke();
      if (fill > 0.4) { c.strokeStyle = K.steam; c.lineWidth = 4; for (let k = 0; k < 2; k++) { c.beginPath(); for (let j = 0; j < 16; j++) c.lineTo(x - 16 + k * 32 + Math.sin(j * 0.8 + lt * 3 + k + i) * 9, y - 92 - j * 11); c.stroke(); } } }
    return {
      draw(c, lt) {
        const pour = cue('et_card', 'pour', 0.6);
        c.drawImage(paper(), 0, 0);
        // the engawa's boards, the edge of the shoji's glow, a persimmon on the board
        c.fillStyle = K.wood; c.fillRect(0, 1380, W, 540); c.strokeStyle = K.key; c.lineWidth = 4; for (let x = 0; x < W; x += 180) { c.beginPath(); c.moveTo(x, 1380); c.lineTo(x - 60, H); c.stroke(); }
        c.beginPath(); c.moveTo(0, 1380); c.lineTo(W, 1380); c.stroke();
        c.save(); c.globalCompositeOperation = 'multiply'; const gl = c.createRadialGradient(540, 1000, 50, 540, 1000, 800); gl.addColorStop(0, 'rgba(246,200,106,.25)'); gl.addColorStop(1, 'rgba(246,200,106,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H); c.restore();
        c.fillStyle = K.kaki; c.beginPath(); c.ellipse(900, 1560, 40, 36, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#3d4a28'; c.fillRect(888, 1520, 24, 10);
        // behind: the lit shoji, its lattice, the post; above, a persimmon branch across the corner
        c.fillStyle = '#f3dd9a'; c.fillRect(0, 760, W, 620); c.strokeStyle = K.key; c.lineWidth = 3; for (let x = 0; x <= W; x += 90) { c.beginPath(); c.moveTo(x, 760); c.lineTo(x, 1380); c.stroke(); }
        for (let y = 760; y <= 1380; y += 76) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.1 + 0.04 * Math.sin(lt * 6) * Math.sin(lt * 2.3); c.fillStyle = '#f6c86a'; c.fillRect(0, 760, W, 620); c.restore();
        c.fillStyle = K.wood; c.fillRect(0, 740, W, 26); c.strokeRect(0, 740, W, 26); c.fillRect(980, 740, 40, 640); c.strokeRect(980, 740, 40, 640);
        { c.strokeStyle = K.key; c.lineCap = 'round'; const br = [[1100, 60, 860, 200, 26], [960, 150, 900, 260, 14], [920, 180, 820, 150, 10]]; for (const [x0, y0, x1, y1, w] of br) { c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 30, x1, y1); c.stroke(); }
          c.lineWidth = 3; for (const [x, y] of [[870, 222], [905, 285], [826, 172], [960, 214]]) { c.fillStyle = K.kaki; c.beginPath(); c.ellipse(x, y + 18, 22, 20, 0, 0, TAU); c.fill(); c.stroke(); } }
        c.fillStyle = K.wood; c.fillRect(0, 1380, W, 540); c.strokeStyle = K.key; c.lineWidth = 4; for (let x = 0; x < W + 200; x += 180) { c.beginPath(); c.moveTo(x, 1380); c.lineTo(x - 60, H); c.stroke(); }
        c.beginPath(); c.moveTo(0, 1380); c.lineTo(W, 1380); c.stroke();
        c.fillStyle = K.kaki; c.beginPath(); c.ellipse(940, 1600, 40, 36, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#3d4a28'; c.fillRect(928, 1560, 24, 10);
        // two cups; the pot pours into the first, then the second
        // the pot tilts over the first cup, rises and moves to the second, tilts again, and sets down
        const C1 = 470, C2 = 790, k1 = clamp((lt - pour) / 1.1), k2 = clamp((lt - pour - 1.6) / 1.1);
        const tilt = (t0) => ease((lt - t0) / 0.3) * (1 - ease((lt - t0 - 1.0) / 0.3));
        const a = 0.55 * Math.max(tilt(pour - 0.15), tilt(pour + 1.45)), cx = lerp(C1, C2, ease((lt - pour - 1.05) / 0.4)) + (lt > pour + 2.55 ? ease((lt - pour - 2.55) / 0.5) * 60 : 0);
        cup2(c, C1, 1400, k1, lt, 0); cup2(c, C2, 1400, k2, lt, 1);
        const ox = 205 * Math.cos(a) + 62 * Math.sin(a), oy = 205 * Math.sin(a) - 62 * Math.cos(a), pcx = cx - ox, pcy = 1040 - oy;   // the spout's tip sits over the cup
        if (a > 0.35) { c.strokeStyle = K.tea; c.lineWidth = 9; c.beginPath(); c.moveTo(cx, pcy + oy); c.quadraticCurveTo(cx - 10, (pcy + oy + 1330) / 2, cx - 4, 1330); c.stroke(); }   // the stream
        pot(c, pcx, pcy, a);
        vtext(c, '十湖', 96, 1600, 54, 'NotoSerifJP-600', K.key); seal(c, 54, 1760, 96, K.seal, K.paper);
      },
    };
  })();
})();
