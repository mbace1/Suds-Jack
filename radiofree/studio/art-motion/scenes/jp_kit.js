// TOKO IN JAPAN — three new styles for the Japanese personas (plan/toko-personas.md), 17.10.2026.
//   jp_kyoto_hanga    KYOTO TOKO as a shin-hanga woodblock print (the register of Kawase Hasui's rural dusks):
//                     a thatched farmhouse at dusk, a bare persimmon tree heavy with fruit, a lit shoji, Toko on the
//                     engawa with tea, a delivery drone waiting at the gate that he does not look at. Keyblock lines,
//                     flat colour, bokashi, the woodgrain ghost, a title cartouche, the 十湖 signature and Toko's seal.
//   jp_tokyo_manga    TOKYO TOKO as a manga page: three panels in ink and screentone — the last train (ガタン ゴトン),
//                     the phone (ブブブ, 未読99+), the 1K room at 1:07 (シーン). The purple mask is the only colour.
//   jp_tokyo_citypop  TOKYO TOKO as an 80s city-pop album cover: a glass tower's balcony at magic hour, the
//                     expressway curving below, three phones and a laptop, and he does not look up. 東京残業.
// No face is drawn anywhere: the mask is the face (RFM.mask, the traced master).
(() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S, shapes } = RFM;
  const rng = U.rng;
  const seal = (c, x, y, sz, col, paper) => {   // Toko's face cut in a red square: the publisher's seal
    c.fillStyle = col; c.fillRect(x, y, sz, sz);
    c.save(); c.translate(x + sz * 0.14, y + sz * 0.16); c.scale(sz * 0.72 / 700, sz * 0.72 / 700); c.fillStyle = paper; for (const k of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) c.fill(shapes[k]); c.restore();
  };
  const vtext = (c, s, x, y, size, font, col, gap = 1.08) => { c.save(); c.fillStyle = col; c.font = `${size}px "${font}"`; c.textAlign = 'center'; c.textBaseline = 'top'; [...s].forEach((ch, i) => c.fillText(ch, x, y + i * size * gap)); c.restore(); };

  // ================================================================== 1 · the woodblock
  SCENES['jp_kyoto_hanga'] = (() => {
    const K = { paper: '#ede3c9', key: '#24201b', ind: '#263a58', indM: '#3f5578', indL: '#6e809c', peach: '#ecb88a', rose: '#d99a86', mist: '#c9c3b0',
      hillA: '#56677a', hillB: '#7a8790', thatch: '#8c7048', thatchL: '#ad8d5e', thatchD: '#5f4a30', wood: '#4a3528', plaster: '#d8c7a2', shoji: '#f3dd9a', glow: '#f6c86a',
      kaki: '#e2652a', kakiD: '#b9471c', moss: '#5c7444', earth: '#7d6a4c', stone: '#9a958a', seal: '#c8231c', samue: '#2f3d5c', drone: '#7f8384' };
    const paper = () => P.cached('jpk_paper', W, H, (g) => {
      g.fillStyle = K.paper; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(120,95,60,.07)'; g.lineWidth = 2;
      for (let y = 0; y < H; y += 9) { g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.006 + y * 0.03) * 7 + P.fbm(x * 0.003, y * 0.01, 2) * 18); g.stroke(); }
      g.drawImage(P.grain('jpk', 0.04, [90, 70, 40], 0.12), 0, 0);
    });
    // the colour blocks, each printed as its own flat (and a hair off the key: registration is never perfect)
    const blocks = () => P.cached('jpk_blocks', W, H, (g) => {
      // sky: the bokashi from indigo down into a warm dusk, wiped
      const sk = g.createLinearGradient(0, 0, 0, 760); sk.addColorStop(0, K.ind); sk.addColorStop(0.4, K.indM); sk.addColorStop(0.72, K.rose); sk.addColorStop(1, K.peach);
      g.fillStyle = sk; g.fillRect(0, 0, W, 780);
      // far hills, two layers, each fading into mist at the foot
      const hill = (y0, amp, col, seed) => { const r = rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, 900);
        for (let x = 0; x <= W; x += 30) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.004 + seed)) * amp - r() * 10); g.lineTo(W, 900); g.closePath(); g.fill();
        const m = g.createLinearGradient(0, y0 - 40, 0, y0 + 140); m.addColorStop(0, 'rgba(201,195,176,0)'); m.addColorStop(1, K.mist); g.fillStyle = m; g.fillRect(0, y0 - 40, W, 180); };
      hill(640, 150, K.hillA, 2); hill(740, 90, K.hillB, 5);
      g.fillStyle = K.mist; g.fillRect(0, 860, W, 80);
      // the ground: earth to moss, a bokashi at the bottom edge
      const gr = g.createLinearGradient(0, 900, 0, H); gr.addColorStop(0, K.earth); gr.addColorStop(0.4, K.moss); gr.addColorStop(1, '#3d4d2e'); g.fillStyle = gr; g.fillRect(0, 900, W, H - 900);
    });
    function house(c) {
      // walls, posts, the lit shoji, the engawa
      c.fillStyle = K.plaster; c.fillRect(150, 1040, 640, 250);
      c.fillStyle = K.shoji; c.fillRect(270, 1080, 330, 190);
      c.strokeStyle = K.key; c.lineWidth = 3; c.strokeRect(150, 1040, 640, 250);
      c.lineWidth = 2; for (let x = 270; x <= 600; x += 41) { c.beginPath(); c.moveTo(x, 1080); c.lineTo(x, 1270); c.stroke(); } for (let y = 1080; y <= 1270; y += 38) { c.beginPath(); c.moveTo(270, y); c.lineTo(600, y); c.stroke(); }
      c.fillStyle = K.wood; for (const x of [150, 260, 610, 770]) { c.fillRect(x, 1040, 20, 250); c.strokeRect(x, 1040, 20, 250); }
      c.fillStyle = K.wood; c.fillRect(120, 1290, 700, 30); c.strokeRect(120, 1290, 700, 30);                 // the engawa
      for (const x of [140, 400, 790]) { c.fillRect(x, 1320, 16, 50); c.strokeRect(x, 1320, 16, 50); }
      // the thatch: a huge steep hip-and-gable, three tones of short combed strokes, a dark ridge with its crosspieces
      const roof = new Path2D(); roof.moveTo(70, 1060); roof.quadraticCurveTo(110, 900, 300, 690); roof.lineTo(640, 690); roof.quadraticCurveTo(830, 900, 880, 1060); roof.quadraticCurveTo(470, 1090, 70, 1060); roof.closePath();
      c.fillStyle = K.thatch; c.fill(roof);
      c.save(); c.clip(roof); const r = rng(11);
      for (let i = 0; i < 2600; i++) { const x = 60 + r() * 830, y = 690 + r() * 380, l = 14 + r() * 26; c.strokeStyle = r() < 0.45 ? K.thatchL : r() < 0.8 ? K.thatchD : '#6e5638'; c.lineWidth = 2 + r() * 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (x - 470) * 0.03, y + l); c.stroke(); }
      const sh = c.createLinearGradient(0, 960, 0, 1070); sh.addColorStop(0, 'rgba(36,32,27,0)'); sh.addColorStop(1, 'rgba(36,32,27,.45)'); c.fillStyle = sh; c.fillRect(60, 960, 830, 110);
      c.restore();
      c.strokeStyle = K.key; c.lineWidth = 4; c.stroke(roof);
      c.fillStyle = K.key; c.fillRect(290, 668, 360, 26);
      for (let x = 310; x <= 630; x += 40) { c.save(); c.translate(x, 668); c.rotate(-0.5); c.fillRect(-4, -26, 8, 40); c.rotate(1); c.fillRect(-4, -26, 8, 40); c.restore(); }
      // the light inside: the shoji glows, and its glow falls on the engawa
      c.save(); c.globalCompositeOperation = 'lighter'; const gl = c.createRadialGradient(435, 1175, 40, 435, 1175, 300); gl.addColorStop(0, 'rgba(246,200,106,.35)'); gl.addColorStop(1, 'rgba(246,200,106,0)'); c.fillStyle = gl; c.fillRect(135, 875, 600, 600); c.restore();
      // hoshigaki: persimmons drying in strings under the eaves
      const r2 = rng(4); for (let s = 0; s < 6; s++) { const x = 650 + s * 22; c.strokeStyle = K.key; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 1060); c.lineTo(x, 1200); c.stroke();
        for (let k = 0; k < 6; k++) { c.fillStyle = r2() < 0.5 ? K.kaki : K.kakiD; c.beginPath(); c.ellipse(x, 1078 + k * 22, 8, 10, 0, 0, TAU); c.fill(); } }
    }
    function toko(c, lt) {
      // on the engawa's edge, legs over it, a cup in both hands; the mask's green is the only green that is not moss
      const x = 400, y = 1300;
      c.strokeStyle = K.key; c.lineWidth = 3;
      c.fillStyle = K.samue; c.beginPath(); c.moveTo(x - 46, y); c.quadraticCurveTo(x - 50, y - 96, x, y - 104); c.quadraticCurveTo(x + 50, y - 96, x + 46, y); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 30, y); c.lineTo(x - 26, y + 46); c.lineTo(x - 6, y + 46); c.lineTo(x - 6, y); c.moveTo(x + 6, y); c.lineTo(x + 6, y + 46); c.lineTo(x + 26, y + 46); c.lineTo(x + 30, y); c.fill(); c.stroke();
      c.fillStyle = '#efe9da'; c.fillRect(x - 28, y + 46, 24, 10); c.fillRect(x + 4, y + 46, 24, 10);                       // tabi
      c.fillStyle = '#f1ede4'; c.beginPath(); c.ellipse(x, y - 102, 30, 9, 0, 0, TAU); c.fill(); c.stroke();                // the tenugui
      mask(c, x, y - 136, 36, S.GREEN, { strap: true, shade: false, face: K.paper, frame: K.key, ink: K.key });
      c.fillStyle = '#7a6a52'; c.fillRect(x - 10, y - 66, 20, 22); c.strokeRect(x - 10, y - 66, 20, 22);
      c.strokeStyle = 'rgba(237,227,201,.7)'; c.lineWidth = 2; for (let k = 0; k < 2; k++) { c.beginPath(); for (let i = 0; i < 12; i++) c.lineTo(x - 4 + k * 8 + Math.sin(i * 0.9 + lt * 3 + k) * 4, y - 70 - i * 6); c.stroke(); }
    }
    function tree(c) {
      // the persimmon: bare black branches across the right of the sky, fruit lit like lanterns
      c.strokeStyle = K.key; c.lineCap = 'round';
      const r = rng(23), fruits = [];
      const br = (x, y, a, len, w, d) => { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * 30, (y + y2) / 2 + (r() - 0.5) * 30, x2, y2); c.stroke();
        if (d > 0) { br(x2, y2, a - 0.4 - r() * 0.4, len * 0.72, w * 0.66, d - 1); br(x2, y2, a + 0.3 + r() * 0.4, len * 0.68, w * 0.62, d - 1); } else fruits.push([x2, y2]);
        if (d < 3 && r() < 0.7) fruits.push([lerp(x, x2, 0.7), lerp(y, y2, 0.7) + 14]); };
      br(1040, 1900, -1.66, 430, 46, 0); br(1020, 1490, -1.95, 250, 30, 4); br(1030, 1370, -1.3, 240, 26, 4);
      for (const [x, y] of fruits) { c.fillStyle = K.kaki; c.beginPath(); c.ellipse(x, y + 16, 19, 17, 0, 0, TAU); c.fill(); c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#3d4a28'; c.fillRect(x - 7, y - 2, 14, 6); }
    }
    function gate(c) {
      c.strokeStyle = K.key; c.lineWidth = 3; c.fillStyle = K.wood;
      for (const x of [110, 330]) { c.fillRect(x, 1420, 22, 260); c.strokeRect(x, 1420, 22, 260); }
      c.fillRect(90, 1410, 270, 18); c.strokeRect(90, 1410, 270, 18);
      for (let x = 0; x < 110; x += 14) { c.fillRect(x, 1520, 8, 160); c.strokeRect(x, 1520, 8, 160); } for (let x = 360; x < 520; x += 14) { c.fillRect(x, 1540, 8, 140); c.strokeRect(x, 1540, 8, 140); }
      // the stepping stones up to the house
      c.fillStyle = K.stone; for (const [x, y, w] of [[260, 1760, 120], [300, 1620, 100], [350, 1500, 86], [400, 1400, 70]]) { c.beginPath(); c.ellipse(x, y, w / 2, w / 5, 0, 0, TAU); c.fill(); c.stroke(); }
    }
    function drone(c, lt) {
      // a delivery drone, hovering at the gate with its parcel: drawn in the print's own language, flat grey and key
      const x = 222, y = 1300 + Math.sin(lt * 2.2) * 6;
      c.save(); c.translate(x, y); c.scale(1.55, 1.55); c.translate(-x, -y);
      c.strokeStyle = K.key; c.lineWidth = 3; c.fillStyle = K.drone;
      c.fillRect(x - 40, y - 8, 80, 16); c.strokeRect(x - 40, y - 8, 80, 16);
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(x + sx * 40, y); c.lineTo(x + sx * 64, y - 10); c.stroke(); c.beginPath(); c.ellipse(x + sx * 64, y - 14, 34, 5, 0, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(x - 10, y + 8); c.lineTo(x - 14, y + 34); c.moveTo(x + 10, y + 8); c.lineTo(x + 14, y + 34); c.stroke();
      c.fillStyle = '#c4a172'; c.fillRect(x - 26, y + 34, 52, 38); c.strokeRect(x - 26, y + 34, 52, 38); c.beginPath(); c.moveTo(x, y + 34); c.lineTo(x, y + 72); c.stroke();
      c.fillStyle = (Math.floor(lt * 2) % 2) ? K.seal : '#5a1410'; c.beginPath(); c.arc(x + 30, y, 4, 0, TAU); c.fill();
      c.restore();
    }
    function ground(c) {
      // grass in short combed strokes, persimmon leaves fallen red and brown
      const r = rng(8); c.lineCap = 'round';
      for (let i = 0; i < 900; i++) { const x = r() * W, y = 1380 + r() * 520; c.strokeStyle = r() < 0.5 ? 'rgba(36,32,27,.35)' : 'rgba(150,170,110,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y - 10 - r() * 16); c.stroke(); }
      for (let i = 0; i < 70; i++) { const x = 480 + r() * 600, y = 1420 + r() * 480; c.fillStyle = r() < 0.5 ? K.kakiD : '#8a4a26'; c.save(); c.translate(x, y); c.rotate(r() * TAU); c.beginPath(); c.ellipse(0, 0, 12, 5, 0, 0, TAU); c.fill(); c.restore(); }
    }
    function crows(c, lt) { c.fillStyle = K.key; for (const [x0, y0, s, ph] of [[180, 300, 1, 0], [260, 340, 0.8, 1.3], [330, 280, 0.7, 2.1]]) { const x = x0 + lt * 18, y = y0 + Math.sin(lt * 2 + ph) * 6, f = Math.sin(lt * 9 + ph) * 8 * s;
      c.beginPath(); c.moveTo(x - 30 * s, y - f); c.quadraticCurveTo(x - 12 * s, y - 8 * s, x, y); c.quadraticCurveTo(x + 12 * s, y - 8 * s, x + 30 * s, y - f); c.quadraticCurveTo(x + 12 * s, y + 2 * s, x, y + 5 * s); c.quadraticCurveTo(x - 12 * s, y + 2 * s, x - 30 * s, y - f); c.fill(); } }
    return {
      draw(c, lt) {
        c.drawImage(paper(), 0, 0);
        c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(blocks(), 2, -1); c.restore();   // the colour blocks, a hair off the key
        crows(c, lt); house(c); ground(c); gate(c); toko(c, lt); tree(c); drone(c, lt);
        // the title cartouche and the series cartouche, top right
        c.fillStyle = K.paper; c.fillRect(916, 70, 112, 380); c.strokeStyle = K.seal; c.lineWidth = 5; c.strokeRect(916, 70, 112, 380);
        vtext(c, '山里の秋', 972, 96, 72, 'NotoSerifJP-600', K.key);
        c.fillStyle = K.paper; c.fillRect(856, 70, 50, 250); c.strokeStyle = K.key; c.lineWidth = 3; c.strokeRect(856, 70, 50, 250);
        vtext(c, '京都北山', 881, 92, 40, 'NotoSerifJP-600', K.key, 1.12);
        // the artist's signature and the seal, bottom left: 十湖, the name Toko Midori signs with
        vtext(c, '十湖', 96, 1648, 54, 'NotoSerifJP-600', K.key);
        seal(c, 54, 1780, 84, K.seal, K.paper);
      },
    };
  })();

  // ================================================================== 2 · the manga page
  SCENES['jp_tokyo_manga'] = (() => {
    const INK = '#141414', PAGE = '#f6f5f1', PURPLE = S.PURPLE;
    // screentone: dot patterns at a few densities, and a gradient tone made of growing dots
    const tone = (key, pitch, r) => P.cached('jpm_tone_' + key, pitch * 2, pitch * 2, (g) => { g.fillStyle = INK; for (const [x, y] of [[0, 0], [pitch, pitch], [pitch * 2, 0], [0, pitch * 2], [pitch * 2, pitch * 2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } });
    const fillTone = (c, path, key, pitch, r) => { c.save(); c.clip(path); c.fillStyle = c.createPattern(tone(key, pitch, r), 'repeat'); c.fillRect(0, 0, W, H); c.restore(); };
    function gradTone(c, x0, y0, x1, y1, pitch, from, to) { c.fillStyle = INK; for (let y = y0; y < y1; y += pitch) { const k = (y - y0) / (y1 - y0), r = lerp(from, to, k) * pitch; if (r < 0.3) continue; for (let x = x0 + ((y / pitch) % 2) * pitch / 2; x < x1; x += pitch) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } } }
    const panel = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
    /** SFX lettering: heavy gothic, a white outline round a black fill, set at an angle */
    function sfx(c, s, x, y, size, rot, { vertical = false, fill = INK, stroke = PAGE, sw = 14 } = {}) {
      c.save(); c.translate(x, y); c.rotate(rot); c.font = `${size}px "IPAPGothic"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const chars = [...s]; chars.forEach((ch, i) => { const dx = vertical ? 0 : (i - (chars.length - 1) / 2) * size * 0.92, dy = vertical ? (i - (chars.length - 1) / 2) * size * 0.95 : 0;
        c.lineWidth = sw; c.strokeStyle = stroke; c.strokeText(ch, dx, dy); c.lineWidth = sw * 0.35; c.strokeStyle = fill; c.strokeText(ch, dx, dy); c.fillStyle = fill; c.fillText(ch, dx, dy); });
      c.restore();
    }
    function speedRadial(c, cx, cy, r0, r1, n, seed) { const r = rng(seed); c.fillStyle = INK; for (let i = 0; i < n; i++) { const a = r() * TAU, w = 0.004 + r() * 0.01, ri = r0 + r() * 60; c.beginPath(); c.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1); c.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri); c.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1); c.fill(); } }
    function figure(c, x, y, s, { maskCol = null, tone: tk = 'mid' } = {}) {
      // a commuter in coat, from the waist up: outline in ink, body in tone; Toko alone has a coloured mask
      c.save(); c.translate(x, y); c.scale(s, s);
      const body = new Path2D(); body.moveTo(-70, 200); body.quadraticCurveTo(-74, 40, -40, 20); body.lineTo(40, 20); body.quadraticCurveTo(74, 40, 70, 200); body.closePath();
      c.restore();
      c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = PAGE; c.fill(body); c.restore();
      const m = new DOMMatrix().translate(x, y).scale(s, s), bp = new Path2D(); bp.addPath(body, m);
      fillTone(c, bp, tk, tk === 'dark' ? 7 : 9, tk === 'dark' ? 2.6 : 1.7);
      c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(body);
      if (maskCol) mask(c, 0, -18, 38, maskCol, { strap: true, shade: false, face: PAGE, frame: INK, ink: INK });
      else { c.fillStyle = INK; c.beginPath(); c.arc(0, -18, 38, 0, TAU); c.fill(); }
      c.restore();
    }
    return {
      draw(c, lt) {
        c.fillStyle = PAGE; c.fillRect(0, 0, W, H);
        const M = 48, G = 22, p1 = [M, 70, W - 2 * M, 640], p2 = [M, 70 + 640 + G, W - 2 * M, 500], p3 = [M, 70 + 640 + G + 500 + G, W - 2 * M, 1850 - (70 + 640 + G + 500 + G)];
        // ---- panel 1: the last train
        let pp = panel(...p1); c.save(); c.clip(pp);
        gradTone(c, p1[0], p1[1], p1[0] + p1[2], p1[1] + 320, 10, 0.42, 0.12);                                      // the night outside
        c.strokeStyle = INK; c.lineWidth = 3; const r = rng(5); for (let i = 0; i < 40; i++) { const y = p1[1] + 40 + r() * 250, x = p1[0] + r() * p1[2]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 120 + r() * 200, y); c.stroke(); }   // the city streaking past
        c.fillStyle = PAGE; c.fillRect(p1[0], p1[1] + 330, p1[2], p1[3]); c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(p1[0], p1[1] + 330); c.lineTo(p1[0] + p1[2], p1[1] + 330); c.stroke();
        c.lineWidth = 5; c.beginPath(); c.moveTo(p1[0], p1[1] + 34); c.lineTo(p1[0] + p1[2], p1[1] + 34); c.stroke();     // the strap rail
        for (let i = 0; i < 9; i++) { const x = p1[0] + 50 + i * 112, sw = Math.sin(lt * 3 + i) * 4; c.beginPath(); c.moveTo(x, p1[1] + 34); c.lineTo(x + sw, p1[1] + 110); c.stroke(); c.beginPath(); c.arc(x + sw, p1[1] + 132, 22, 0, TAU); c.stroke(); }
        figure(c, 190, 480, 1.25, { tone: 'dark' }); figure(c, 860, 470, 1.3, { tone: 'mid' }); figure(c, 700, 560, 1.1, { tone: 'dark' }); figure(c, 340, 570, 1.05, { tone: 'mid' });
        figure(c, 520, 430, 1.45, { maskCol: PURPLE, tone: 'mid' });
        c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(560, 400); c.lineTo(600, 170); c.stroke(); c.beginPath(); c.arc(600 + Math.sin(lt * 3 + 5) * 4, 152, 22, 0, TAU); c.stroke();   // his arm up to a strap
        c.restore(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(pp);
        sfx(c, 'ガタン', 250, p1[1] + 230, 96, -0.12); sfx(c, 'ゴトン', 820, p1[1] + 260, 96, 0.1);
        c.fillStyle = PAGE; c.fillRect(p1[0] + 18, p1[1] + 352, 250, 76); c.lineWidth = 4; c.strokeRect(p1[0] + 18, p1[1] + 352, 250, 76);
        c.fillStyle = INK; c.font = '40px "IPAPGothic"'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('0:47 終電', p1[0] + 36, p1[1] + 391);
        // ---- panel 2: the phone
        pp = panel(...p2); c.save(); c.clip(pp);
        speedRadial(c, W / 2, p2[1] + 250, 230, 900, 260, 9);
        const px = W / 2 - 120 + Math.sin(lt * 40) * 3, py = p2[1] + 70;                                             // the phone, buzzing
        c.fillStyle = INK; c.beginPath(); c.roundRect(px, py, 240, 400, 34); c.fill();
        c.fillStyle = PAGE; c.beginPath(); c.roundRect(px + 14, py + 30, 212, 340, 18); c.fill();
        for (let i = 0; i < 5; i++) { const y = py + 60 + i * 56; c.fillStyle = INK; c.beginPath(); c.arc(px + 44, y + 16, 16, 0, TAU); c.fill(); c.fillRect(px + 70, y + 4, 120 - (i * 23 % 50), 8); c.fillRect(px + 70, y + 22, 80 + (i * 37 % 60), 6); }
        c.fillStyle = INK; c.beginPath(); c.roundRect(px + 40, py + 330, 160, 50, 25); c.fill(); c.fillStyle = PAGE; c.font = '34px "IPAPGothic"'; c.textAlign = 'center'; c.fillText('未読99+', px + 120, py + 357);
        // his purple glove round it
        c.fillStyle = PURPLE; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.ellipse(px + 10, py + 300, 46, 70, 0.2, 0, TAU); c.fill(); c.stroke();
        for (let k = 0; k < 3; k++) { c.beginPath(); c.roundRect(px + 200, py + 180 + k * 46, 60, 34, 16); c.fill(); c.stroke(); }
        c.lineWidth = 4; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(W / 2 + s * (150 + k * 22), py + 200, 40 + k * 22, s < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, s < 0 ? Math.PI * 1.2 : Math.PI * 0.2); c.stroke(); }
        c.restore(); c.lineWidth = 7; c.stroke(pp);
        sfx(c, 'ブブブ', 830, p2[1] + 110, 92, 0.18); sfx(c, 'ブブ', 190, p2[1] + 400, 80, -0.2);
        // ---- panel 3: the room at 1:07
        pp = panel(...p3); c.save(); c.clip(pp);
        const wall = new Path2D(); wall.rect(p3[0], p3[1], p3[2], p3[3] * 0.62); fillTone(c, wall, 'light', 11, 1.4);
        c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(p3[0], p3[1] + p3[3] * 0.62); c.lineTo(p3[0] + p3[2], p3[1] + p3[3] * 0.62); c.stroke();
        // the clock on the wall
        const CX = 930; c.fillStyle = PAGE; c.beginPath(); c.arc(CX, p3[1] + 110, 54, 0, TAU); c.fill(); c.stroke(); c.lineWidth = 4;
        c.beginPath(); c.moveTo(CX, p3[1] + 110); c.lineTo(CX + Math.cos(-Math.PI / 2 + 1 / 12 * TAU) * 26, p3[1] + 110 + Math.sin(-Math.PI / 2 + 1 / 12 * TAU) * 26); c.moveTo(CX, p3[1] + 110); c.lineTo(CX + Math.cos(-Math.PI / 2 + 7 / 60 * TAU) * 40, p3[1] + 110 + Math.sin(-Math.PI / 2 + 7 / 60 * TAU) * 40); c.stroke();
        // him, slumped against the wall on the floor, the laptop glowing on his knees: the only light
        const lx = 420, ly = p3[1] + 400;
        c.save(); c.globalCompositeOperation = 'source-over'; const gl = c.createRadialGradient(lx + 40, ly - 30, 20, lx + 40, ly - 30, 300); gl.addColorStop(0, 'rgba(246,245,241,1)'); gl.addColorStop(1, 'rgba(246,245,241,0)'); c.fillStyle = gl; c.fillRect(lx - 300, ly - 330, 700, 600); c.restore();
        figure(c, lx, ly - 70, 1.2, { maskCol: PURPLE, tone: 'mid' });
        c.fillStyle = INK; c.beginPath(); c.moveTo(lx - 30, ly + 120); c.lineTo(lx + 150, ly + 60); c.lineTo(lx + 170, ly + 90); c.lineTo(lx - 10, ly + 150); c.fill();   // the laptop's lid, from the side
        c.fillStyle = PAGE; c.strokeStyle = INK; c.lineWidth = 4; for (const [x, y] of [[700, ly + 160], [740, ly + 180]]) { c.beginPath(); c.roundRect(x, y, 34, 60, 6); c.fill(); c.stroke(); }   // cans
        c.beginPath(); c.moveTo(130, ly + 200); c.lineTo(200, ly + 100); c.lineTo(270, ly + 200); c.closePath(); c.fill(); c.stroke();                                   // the konbini bag
        c.restore(); c.lineWidth = 7; c.stroke(pp);
        sfx(c, 'シーン', 740, p3[1] + 330, 104, 0, { vertical: true });
        c.fillStyle = INK; c.font = '30px "IPAPGothic"'; c.textAlign = 'center'; c.fillText('1:07', 930, p3[1] + 196);
        c.font = '24px "Poppins-800"'; c.textAlign = 'right'; c.fillText('TOKYO TOKO · 01', W - M, 1890);
      },
    };
  })();

  // ================================================================== 3 · the city-pop sleeve
  SCENES['jp_tokyo_citypop'] = (() => {
    const C = { sky0: '#1e3a8a', sky1: '#3b82c4', sky2: '#f2a6b8', sky3: '#ffd2a1', sun: '#ffe7b0', glass: '#7fb8e6', glassD: '#3d6fa8', glassL: '#c9e6ff', conc: '#f1e6da', concD: '#d9c4b4',
      road: '#5a5f7a', lamp: '#ffd27a', rail: '#ffffff', shadow: '#2d3561', suit: '#f3efe8', suitD: '#c9c2b8', ink: '#1b2140', pink: '#ff6fa8', mint: '#7fe0c8' };
    const stat = () => P.cached('jpc_static', W, H, (g) => {
      const sk = g.createLinearGradient(0, 0, 0, 1300); sk.addColorStop(0, C.sky0); sk.addColorStop(0.42, C.sky1); sk.addColorStop(0.78, C.sky2); sk.addColorStop(1, C.sky3); g.fillStyle = sk; g.fillRect(0, 0, W, 1400);
      // the sun, low, cut by thin bands (the airbrush sleeve's signature)
      g.save(); g.beginPath(); g.arc(560, 1060, 170, 0, TAU); g.clip(); const sg = g.createLinearGradient(0, 890, 0, 1230); sg.addColorStop(0, '#fff3c4'); sg.addColorStop(1, '#ffb27a'); g.fillStyle = sg; g.fillRect(380, 880, 360, 360);
      g.fillStyle = C.sky2; for (let i = 0; i < 6; i++) g.fillRect(380, 1080 + i * 28, 360, 6 + i * 3); g.restore();
      // the skyline: flat glass towers with window grids and one hard shadow plane each
      const r = rng(17);
      for (let i = 0; i < 9; i++) { const x = -40 + i * 130 + r() * 30, w = 90 + r() * 70, h = 220 + r() * 400, y = 1300 - h; if (x < 690 && x + w > 430) continue;
        g.fillStyle = i % 3 ? C.glassD : C.glass; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(30,40,90,.35)'; g.fillRect(x + w * 0.62, y, w * 0.38, h);
        g.fillStyle = 'rgba(255,255,255,.5)'; for (let yy = y + 14; yy < 1300; yy += 18) for (let xx = x + 8; xx < x + w * 0.6; xx += 14) if (r() < 0.45) g.fillRect(xx, yy, 7, 7); }
      // a red-and-white lattice tower among them
      g.strokeStyle = '#ff5a4a'; g.lineWidth = 4; for (let k = 0; k < 10; k++) { const y = 1300 - k * 62, hw = 70 - k * 6.5; g.strokeStyle = k % 2 ? '#ff5a4a' : '#fff6f0'; g.strokeRect(820 - hw, y - 62, hw * 2, 62); g.beginPath(); g.moveTo(820 - hw, y); g.lineTo(820 + hw, y - 62); g.moveTo(820 + hw, y); g.lineTo(820 - hw, y - 62); g.stroke(); }
      // the expressway curving through below, its lamps already on
      g.fillStyle = C.road; g.beginPath(); g.moveTo(-50, 1340); g.bezierCurveTo(400, 1230, 700, 1420, 1130, 1300); g.lineTo(1130, 1350); g.bezierCurveTo(700, 1470, 400, 1280, -50, 1390); g.closePath(); g.fill();
      g.strokeStyle = C.rail; g.lineWidth = 4; g.beginPath(); g.moveTo(-50, 1340); g.bezierCurveTo(400, 1230, 700, 1420, 1130, 1300); g.stroke();
      for (let i = 0; i < 14; i++) { const t = i / 13, x = lerp(-50, 1130, t), y = 1335 + Math.sin(t * Math.PI * 1.4) * -40 + (t > 0.5 ? (t - 0.5) * 60 : 0); g.fillStyle = C.lamp; g.beginPath(); g.arc(x, y - 30, 6, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 26); g.stroke(); }
      // the balcony he stands on: a white concrete slab, a glass rail with one highlight
      g.fillStyle = C.conc; g.fillRect(0, 1420, W, 500); g.fillStyle = C.concD; g.fillRect(0, 1420, W, 24);
      g.fillStyle = 'rgba(201,230,255,.35)'; g.fillRect(0, 1240, W, 190); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(0, 1236, W, 8);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(120, 1250); g.lineTo(170, 1250); g.lineTo(90, 1424); g.lineTo(40, 1424); g.fill();
      g.drawImage(P.grain('jpc', 0.05, [40, 30, 60], 0.08), 0, 0);
    });
    function toko(c, lt) {
      // a light suit, a loosened tie, three phones and a laptop on the rail; his back to the sunset he paid for
      const x = 640, y = 1420;
      c.fillStyle = C.shadow; c.globalAlpha = 0.35; c.beginPath(); c.ellipse(x - 120, y + 30, 210, 26, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.fillStyle = C.ink; c.fillRect(x - 40, y - 230, 34, 230); c.fillRect(x + 8, y - 230, 34, 230);                    // trousers
      c.fillStyle = C.suit; c.beginPath(); c.moveTo(x - 80, y - 210); c.quadraticCurveTo(x - 92, y - 400, x, y - 420); c.quadraticCurveTo(x + 92, y - 400, x + 80, y - 210); c.closePath(); c.fill();
      c.fillStyle = C.suitD; c.beginPath(); c.moveTo(x + 20, y - 410); c.quadraticCurveTo(x + 92, y - 400, x + 80, y - 210); c.lineTo(x + 30, y - 210); c.closePath(); c.fill();
      c.fillStyle = C.pink; c.beginPath(); c.moveTo(x - 8, y - 404); c.lineTo(x + 8, y - 404); c.lineTo(x + 18, y - 300); c.lineTo(x, y - 280); c.lineTo(x - 14, y - 300); c.closePath(); c.fill();   // the tie, loosened
      mask(c, x, y - 470, 58, S.PURPLE, { strap: true, shade: false, face: '#fdf6ee', frame: C.ink, ink: C.ink });
      // phones: one at the ear, one in the hand, one buzzing on the rail
      c.fillStyle = C.ink; c.save(); c.translate(x + 64, y - 480); c.rotate(0.3); c.beginPath(); c.roundRect(-14, -30, 28, 60, 6); c.fill(); c.restore();
      c.fillStyle = S.PURPLE; c.beginPath(); c.ellipse(x + 60, y - 450, 18, 22, 0, 0, TAU); c.fill();
      c.fillStyle = C.ink; c.save(); c.translate(x - 110, y - 300); c.rotate(-0.4); c.beginPath(); c.roundRect(-15, -30, 30, 60, 6); c.fill(); c.fillStyle = C.mint; c.fillRect(-11, -24, 22, 44); c.restore();
      c.fillStyle = S.PURPLE; c.beginPath(); c.ellipse(x - 98, y - 280, 18, 22, 0, 0, TAU); c.fill();
      const bz = Math.sin(lt * 50) * 2; c.fillStyle = C.ink; c.beginPath(); c.roundRect(860 + bz, 1206, 60, 28, 5); c.fill(); c.fillStyle = C.pink; c.fillRect(866 + bz, 1210, 48, 20);
      c.fillStyle = '#d8dde6'; c.beginPath(); c.moveTo(300, 1236); c.lineTo(420, 1236); c.lineTo(440, 1170); c.lineTo(320, 1170); c.closePath(); c.fill();     // the laptop, open on the rail
      c.fillStyle = C.mint; c.beginPath(); c.moveTo(326, 1178); c.lineTo(432, 1178); c.lineTo(418, 1228); c.lineTo(312, 1228); c.closePath(); c.fill();
    }
    return {
      draw(c, lt) {
        c.drawImage(stat(), 0, 0);
        toko(c, lt);
        // the sleeve: an inner border, the title, the catalogue line
        c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeRect(40, 40, W - 80, H - 80);
        c.fillStyle = '#ffffff'; c.font = '150px "Exo2-800i"'; c.textAlign = 'left'; c.shadowColor = 'rgba(30,40,110,.45)'; c.shadowOffsetX = 8; c.shadowOffsetY = 8;
        c.fillText('TOKYO', 80, 230); c.fillText('OVERTIME', 80, 370); c.shadowColor = 'transparent';
        c.fillStyle = C.pink; c.font = '84px "IPAPGothic"'; c.fillText('東京残業', 86, 480);
        c.fillStyle = '#ffffff'; c.font = '30px "Poppins-800"'; c.fillText('TOKO MIDORI · SIDE A', 86, 540);
        c.font = '26px "Poppins-800"'; c.textAlign = 'right'; c.fillText('℗ 2026 · 33⅓', W - 80, H - 80);
      },
    };
  })();
})();
