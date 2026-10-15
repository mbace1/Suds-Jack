// The kit for "Paid For By" (Radio Free Helsinki · Coxon #3) — built on RFP (the papercut box).
// Its own palette, not the house's dark autumn: a daytime American campaign ad seen in a living
// room — cream paper, navy, flag red, brass. Magenta is kept for the money and nothing else.
// The set: a living room (striped wallpaper, a walnut sideboard, the TV, a braided rug, the sofa
// with a viewer seen from behind), the ad on the TV (a waving flag, an eagle, a diner, and the
// PAID FOR BY fine print along its foot), the wall of 95 small screens, a keyboard and the cash.
window.PFB = (() => {
  const { W, H, sheet, sprite, put, glow, ease, pop } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112;
  const C = {
    cream: '#efe6d2', creamL: '#f8f2e4', creamD: '#ddd0b4', stripe: '#e5d9bf',
    navy: '#1f2a44', navyL: '#33426a', navyD: '#141c30',
    red: '#b8322a', redL: '#d04a3e', redD: '#8c241d',
    brass: '#d9a441', brassL: '#efc66c', brassD: '#a8792a',
    mag: '#f0027f', magL: '#ff5aa8', magD: '#b3005d', magDD: '#80003f',
    sky: '#9ec6db', skyL: '#cfe3ec', skyD: '#7aaecb', grass: '#86ad62', grassD: '#62893f', grassL: '#a9c784',
    walnut: '#6e4a2c', walnutL: '#8a6038', walnutD: '#4e331d', floor: '#cf9c60', floorD: '#b5834a', floorL: '#dcae74',
    tv: '#23262e', tvL: '#3a3e48', ink: '#151a26', steel: '#8a8478', hilite: '#ffe24a',
  };
  const cv = RFP.canvas;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  function star(g, x, y, r, inner = 0.42, rot = -Math.PI / 2) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = rot + k * Math.PI / 5, q = k % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }
  const measure = (text, font) => { const m = cv(10, 10).getContext('2d'); m.font = font; return m.measureText(text).width; };

  // ---------------------------------------------------------------- the flag
  let FLAG = null;
  function flagTex() {
    if (FLAG) return FLAG;
    const w = 390, h = 206, c = cv(w, h), g = c.getContext('2d');
    for (let s = 0; s < 13; s++) { g.fillStyle = s % 2 ? C.creamL : C.red; g.fillRect(0, Math.floor(s * h / 13), w, Math.ceil(h / 13) + 1); }
    const cw = w * 0.4, ch = Math.round(h * 7 / 13); g.fillStyle = C.navy; g.fillRect(0, 0, cw, ch);
    g.fillStyle = C.creamL; for (let r = 0; r < 9; r++) { const n = r % 2 ? 5 : 6; for (let k = 0; k < n; k++) star(g, cw * ((k + (r % 2 ? 1 : 0.5)) / 6), ch * (r + 1) / 10, 4.6); }
    return (FLAG = c);
  }
  /** a waving flag pinned at its left edge: top-left (x, y), w × h; the wave runs away from the pole */
  function flag(g, x, y, w, h, t, amp = 0.08) {
    const tex = flagTex(), n = 26, sw = tex.width / n;
    for (let i = 0; i < n; i++) {
      const u = i / n, ph = u * 6.5 - t * 5.2, off = Math.sin(ph) * h * amp * (0.25 + u), k = Math.cos(ph);
      g.drawImage(tex, i * sw, 0, sw + 0.5, tex.height, x + u * w, y + off, w / n + 0.8, h);
      g.fillStyle = k > 0 ? `rgba(255,250,235,${(0.16 * k).toFixed(3)})` : `rgba(10,14,30,${(-0.2 * k).toFixed(3)})`; g.fillRect(x + u * w, y + off, w / n + 0.8, h);
    }
  }

  // ---------------------------------------------------------------- the eagle (side on, flying left)
  function eagle(g, x, y, s, f) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const k = Math.sin(f);
    const wing = (col, dx, sc) => { g.save(); g.translate(dx, -4); g.scale(1, sc); g.fillStyle = col; g.beginPath();
      g.moveTo(-26, 0); g.lineTo(-40, -30); g.lineTo(-46, -62); g.lineTo(-40, -92); g.lineTo(-30, -82); g.lineTo(-22, -98); g.lineTo(-12, -84); g.lineTo(-2, -96); g.lineTo(6, -80); g.lineTo(16, -88); g.lineTo(20, -64); g.lineTo(26, -30); g.lineTo(22, 0); g.closePath(); g.fill(); g.restore(); };
    wing('#3a2818', 12, 0.55 + 0.45 * k);
    g.fillStyle = C.creamL; g.beginPath(); g.moveTo(38, -6); g.lineTo(80, -18); g.lineTo(86, 0); g.lineTo(80, 16); g.lineTo(38, 6); g.closePath(); g.fill();   // the white tail
    g.fillStyle = '#4a3322'; g.beginPath(); g.ellipse(0, 0, 48, 16, 0.04, 0, TAU); g.fill();
    g.fillStyle = '#e8b830'; g.beginPath(); g.ellipse(24, 15, 10, 4, 0, 0, TAU); g.fill();
    g.fillStyle = C.creamL; g.beginPath(); g.ellipse(-50, -7, 19, 14, -0.2, 0, TAU); g.fill();                                   // the white head
    g.beginPath(); g.moveTo(-40, -16); g.lineTo(-26, -6); g.lineTo(-38, 8); g.closePath(); g.fill();
    g.fillStyle = '#e8b830'; g.beginPath(); g.moveTo(-63, -13); g.lineTo(-82, -9); g.quadraticCurveTo(-85, -1, -78, 2); g.lineTo(-62, -2); g.closePath(); g.fill();   // the hooked beak
    g.fillStyle = C.ink; g.beginPath(); g.arc(-56, -11, 2.6, 0, TAU); g.fill();
    wing('#5d3f27', -4, 0.66 + 0.5 * k);
    g.restore();
  }

  // ---------------------------------------------------------------- the diner
  function diner(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#6a6458'; g.fillRect(-150, -10, 300, 10);
    g.fillStyle = '#cfc9bb'; rr(g, -146, -98, 292, 90, 28);
    g.fillStyle = '#eeeadf'; rr(g, -140, -86, 280, 78, 14);
    g.fillStyle = C.red; g.fillRect(-140, -30, 280, 11); g.fillRect(-140, -86, 280, 7);
    g.fillStyle = C.navy; for (let i = 0; i < 8; i++) if (i !== 4) rr(g, -128 + i * 32, -72, 24, 34, 3);
    g.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 8; i++) if (i !== 4) g.fillRect(-124 + i * 32, -70, 5, 30);
    g.fillStyle = C.red; rr(g, 2, -78, 26, 68, 3); g.fillStyle = C.sky; g.fillRect(8, -72, 14, 16);
    g.fillStyle = '#8a8478'; g.fillRect(-2, -10, 34, 6); g.fillRect(-6, -4, 42, 6);
    g.fillStyle = C.brassD; g.fillRect(-42, -124, 6, 30); g.fillRect(36, -124, 6, 30);
    g.fillStyle = C.red; rr(g, -68, -154, 136, 40, 6); g.strokeStyle = C.creamL; g.lineWidth = 3; g.strokeRect(-61, -147, 122, 26);
    g.fillStyle = C.creamL; g.font = '22px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('DINER', 0, -125);
    g.restore();
  }

  /** the fine print along the foot of an ad: a dark strip that plainly says PAID FOR BY, then a name too small to read */
  function finePrint(g, w, h, size = 1) {
    const sh = 26 * size;
    g.fillStyle = 'rgba(21,26,38,.88)'; g.fillRect(0, h - sh, w, sh);
    g.fillStyle = C.creamL; g.font = `${Math.round(15 * size)}px "ArchivoBlack-400"`; g.textAlign = 'left'; g.fillText('PAID FOR BY', 12 * size, h - 7.5 * size);
    const r = U.rng(7); let x = 132 * size; g.fillStyle = 'rgba(248,242,228,.7)';
    while (x < w * 0.7) { const ww = (5 + r() * 20) * size; g.fillRect(x, h - 15 * size, ww, 3.2 * size); x += ww + 4 * size; }
  }

  /** the campaign ad on the living-room TV, live in a w × h screen: a banded morning sky with a sunburst,
   *  the flag on its pole, an eagle crossing, the diner on the hill, and the fine print */
  function heroAd(g, w, h, t, { print = true } = {}) {
    g.save(); g.scale(w / 688, h / 388);
    ['#8fbcd6', '#9ec6db', '#b2d2e0', '#cddfe2', '#e8e2c6', '#f2d69a', '#f2c878'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 36, 688, 400); });
    g.save(); g.translate(470, 262); g.rotate(t * 0.12); g.fillStyle = 'rgba(255,246,214,.4)';
    for (let k = 0; k < 16; k++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 440, k * TAU / 16, k * TAU / 16 + TAU / 32); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = '#f6c45a'; g.beginPath(); g.arc(470, 262, 64, 0, TAU); g.fill();
    g.fillStyle = C.grassL; g.beginPath(); g.moveTo(0, 268); g.quadraticCurveTo(200, 220, 420, 262); g.quadraticCurveTo(560, 286, 688, 246); g.lineTo(688, 400); g.lineTo(0, 400); g.fill();
    g.fillStyle = C.grass; g.beginPath(); g.moveTo(0, 322); g.quadraticCurveTo(300, 286, 688, 314); g.lineTo(688, 400); g.lineTo(0, 400); g.fill();
    diner(g, 486, 320, 0.95);
    g.fillStyle = '#8a8478'; g.fillRect(104, 50, 6, 300); g.fillStyle = C.brass; g.beginPath(); g.arc(107, 48, 8, 0, TAU); g.fill();
    flag(g, 110, 58, 214, 116, t);
    const k = (t % 14) / 14; eagle(g, lerp(800, -140, k), 112 + Math.sin(t * 1.3) * 10 - k * 30, 0.95, t * 4.2);
    if (print) finePrint(g, 688, 388);
    g.restore();
  }

  /** the ad's last card: cream, the flag, a navy band of stars, and the disclaimer. s = the fine print's scale:
   *  1 as broadcast, shrinking; under ~0.25 the letters run together into a dot. show=false once the dot has gone */
  const DOT = { x: 344, y: 312, r: 22 };
  function endCard(g, w, h, t, s = 1, show = true, jx = 0) {
    g.save(); g.scale(w / 688, h / 388);
    g.fillStyle = C.creamL; g.fillRect(0, 0, 688, 388);
    g.fillStyle = C.red; g.fillRect(0, 0, 688, 10); g.fillRect(0, 378, 688, 10);
    flag(g, 232, 30, 224, 122, t, 0.07);
    g.fillStyle = C.navy; g.fillRect(0, 176, 688, 58); g.fillStyle = C.red; g.fillRect(0, 170, 688, 5); g.fillRect(0, 235, 688, 5);
    g.fillStyle = C.brass; for (const x of [244, 344, 444]) star(g, x, 205, 20);
    if (show) {
      g.save(); g.translate(DOT.x + jx, DOT.y);
      const kt = clamp((s - 0.12) / 0.2, 0, 1);
      if (kt > 0) { g.save(); g.globalAlpha = kt; g.scale(s, s); g.fillStyle = C.navy; g.font = '40px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('PAID FOR BY', 0, 4);
        const r = U.rng(11); let x = -170; while (x < 170) { const ww = 8 + r() * 30; g.fillRect(x, 22, Math.min(ww, 170 - x), 7); x += ww + 7; } g.restore(); }
      if (kt < 1) { g.globalAlpha = 1 - kt; g.fillStyle = C.navy; g.beginPath(); g.arc(0, 0, DOT.r * clamp(1.4 - kt, 0.6, 1), 0, TAU); g.fill(); }
      g.restore();
    }
    g.restore();
  }

  // ---------------------------------------------------------------- the living room
  const WP = (g) => {
    g.fillStyle = C.cream; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.stripe; for (let x = -90; x < W + 90; x += 80) g.fillRect(x, -90, 30, H + 180);
    g.fillStyle = 'rgba(184,50,42,.2)'; for (let x = -90, i = 0; x < W + 90; x += 80, i++) for (let y = -60 + (i % 2) * 48; y < H + 90; y += 96) star(g, x + 55, y, 7);
  };
  /** the plain wallpaper: wide cream stripes and a scatter of small red stars */
  const wallpaper = () => sheet('pfb_wallpaper', WP, 10);
  /** the room's wall: the wallpaper, a sash window with red drapes, a framed picture */
  const roomWall = () => sheet('pfb_roomwall', (g) => {
    WP(g);
    g.save(); g.translate(0, -80);   // the whole set sits 80 px higher than first drawn (room for the sofa)
    // the window: sky, a cloud, a far tree line, the sashes
    g.fillStyle = C.creamL; g.fillRect(84, 330, 300, 470);
    g.fillStyle = '#a9cfe3'; g.fillRect(104, 350, 260, 420);
    g.fillStyle = '#c4def0'; g.fillRect(104, 350, 260, 120);
    g.fillStyle = '#ffffff'; for (const [x, y, r] of [[170, 450, 30], [204, 438, 38], [244, 452, 28]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#7da35a'; for (let x = 104; x < 364; x += 26) { g.beginPath(); g.arc(x + 13, 700, 24 + ((x * 7) % 11), 0, TAU); g.fill(); }
    g.fillStyle = '#a9c784'; g.fillRect(104, 706, 260, 64);
    g.fillStyle = C.creamL; g.fillRect(104, 556, 260, 14); g.fillRect(226, 350, 14, 420);
    g.fillStyle = C.creamD; g.fillRect(70, 796, 328, 18);
    // drapes, red, gathered at the sides; a navy valance on a brass rod
    g.fillStyle = C.red; for (const [x0, dir] of [[48, 1], [420, -1]]) { g.beginPath(); g.moveTo(x0, 300); g.lineTo(x0 + dir * 70, 300); g.quadraticCurveTo(x0 + dir * 40, 560, x0 + dir * 74, 860); g.lineTo(x0 - dir * 4, 860); g.closePath(); g.fill(); }
    g.fillStyle = C.redD; for (const x of [70, 398]) g.fillRect(x - 3, 320, 6, 520);
    g.fillStyle = C.brass; g.fillRect(30, 292, 410, 10);
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(40, 300); g.lineTo(430, 300); g.lineTo(430, 350); for (let i = 0; i <= 6; i++) g.quadraticCurveTo(430 - i * 65 + 32, 380, 430 - (i + 1) * 65 + 0, 350); g.lineTo(40, 300); g.fill();
    // the framed picture: a little painted mountain
    g.fillStyle = C.brassD; g.fillRect(724, 560, 250, 196); g.fillStyle = C.brass; g.fillRect(734, 570, 230, 176);
    g.fillStyle = '#e8e2c6'; g.fillRect(750, 586, 198, 144);
    g.fillStyle = C.navyL; g.beginPath(); g.moveTo(750, 730); g.lineTo(820, 630); g.lineTo(860, 680); g.lineTo(900, 612); g.lineTo(948, 690); g.lineTo(948, 730); g.closePath(); g.fill();
    g.fillStyle = C.creamL; g.beginPath(); g.moveTo(888, 630); g.lineTo(900, 612); g.lineTo(912, 632); g.lineTo(900, 640); g.closePath(); g.fill();
    g.fillStyle = C.red; g.beginPath(); g.arc(790, 622, 16, 0, TAU); g.fill();
    // the skirting board
    g.fillStyle = C.creamD; g.fillRect(-90, 1446, W + 180, 30);
    g.restore();
  }, 10);
  const floor = () => sheet('pfb_floor', (g) => {
    g.fillStyle = C.floor; g.fillRect(-90, 1390, W + 180, 640);
    let y = 1390, k = 0; while (y < 2010) { const hgt = 22 + k * 7; g.fillStyle = k % 2 ? C.floorL : C.floor; g.fillRect(-90, y, W + 180, hgt); g.fillStyle = C.floorD; g.fillRect(-90, y + hgt - 3, W + 180, 3);
      const r = U.rng(31 + k); for (let x = -90 + r() * 200; x < W + 90; x += 220 + r() * 160) g.fillRect(x, y, 3, hgt); y += hgt; k++; }
  }, 8);
  /** the walnut sideboard and the TV standing on it; the screen itself is drawn live over SCR */
  const TV = { x: 180, y: 726, w: 720, h: 418 }, SCR = { x: 196, y: 742, w: 688, h: 386 }, TOP = 1182;   // TOP: the sideboard's top
  const furniture = () => sheet('pfb_furniture', (g) => {
    g.translate(0, -80);
    // the floor lamp, left
    g.fillStyle = C.brassD; g.fillRect(114, 860, 8, 610); g.beginPath(); g.ellipse(118, 1478, 46, 12, 0, 0, TAU); g.fill();
    g.fillStyle = C.creamL; g.beginPath(); g.moveTo(66, 760); g.lineTo(170, 760); g.lineTo(196, 880); g.lineTo(40, 880); g.closePath(); g.fill();
    g.fillStyle = C.brass; g.fillRect(40, 872, 156, 8); g.fillRect(66, 756, 104, 6);
    // the sideboard
    g.fillStyle = C.walnutD; for (const x of [160, 330, 750, 920]) { g.beginPath(); g.moveTo(x - 9, 1470); g.lineTo(x + 9, 1470); g.lineTo(x + 4, 1508); g.lineTo(x - 4, 1508); g.closePath(); g.fill(); }
    g.fillStyle = C.walnut; g.fillRect(124, 1282, 832, 192);
    g.fillStyle = C.walnutL; g.fillRect(110, 1262, 860, 22);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(124, 1284, 832, 8);
    g.strokeStyle = C.walnutD; g.lineWidth = 4; for (let i = 0; i < 4; i++) g.strokeRect(140 + i * 204, 1302, 188, 156);
    g.fillStyle = C.brass; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i % 2 ? 152 + i * 204 : 316 + i * 204, 1380, 7, 0, TAU); g.fill(); }
    // the TV: a stand, a dark bezel
    g.fillStyle = C.tv; g.fillRect(500, 1220, 80, 36); g.fillStyle = C.tvL; rr(g, 420, 1250, 240, 14, 4);
    g.translate(0, 80);
    g.fillStyle = C.tv; rr(g, TV.x, TV.y, TV.w, TV.h, 12);
    g.fillStyle = C.tvL; g.fillRect(TV.x + 8, TV.y + TV.h - 10, TV.w - 16, 3);
    g.fillStyle = '#0b0d12'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  }, 14);
  /** the braided oval rug: rings of navy, cream, red and brass, each with its braid */
  const RUG = { x: 560, y: 1566, rx: 400, ry: 86 };
  const rug = () => sprite('pfb_rug', 840, 220, 420, 110, (g) => {
    const rings = [C.navy, C.creamL, C.red, C.cream, C.brass, C.navyL, C.red, C.creamL, C.brassL];
    rings.forEach((col, i) => { const f = 1 - i / rings.length; g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, RUG.rx * f, RUG.ry * f, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; g.setLineDash([7, 6]); g.beginPath(); g.ellipse(0, 0, RUG.rx * (f - 0.5 / rings.length), RUG.ry * (f - 0.5 / rings.length), 0, 0, TAU); g.stroke(); g.setLineDash([]); });
  }, 6);
  /** a lump under the rug at (x, y): a raised ridge, lit on its top-left, shadowed below-right */
  function lump(c, x, y, k = 1, sq = 0) {
    if (k <= 0) return;
    const rx = 66 * (1 + sq), ry = 24 * (1 - 0.3 * sq), hgt = 24 * (1 - 0.5 * sq);
    c.save(); c.globalAlpha = k;
    c.fillStyle = 'rgba(30,18,10,.38)'; c.beginPath(); c.ellipse(x + 10, y + 8, rx * 1.05, ry * 1.1, 0, 0, TAU); c.fill();       // its shadow, down-right
    c.save(); c.beginPath(); c.ellipse(x, y - hgt * 0.5, rx, ry + hgt * 0.5, 0, 0, TAU); c.clip();                                     // the raised rug: the rings again, lifted
    c.translate(0, -hgt); put(c, rug(), RUG.x, RUG.y, { lift: 0, alpha: 0 }); c.restore();
    const gr = c.createLinearGradient(x - rx, y - ry - hgt, x + rx, y + ry); gr.addColorStop(0, 'rgba(255,250,235,.5)'); gr.addColorStop(0.5, 'rgba(255,250,235,0)'); gr.addColorStop(1, 'rgba(30,18,10,.32)');
    c.fillStyle = gr; c.beginPath(); c.ellipse(x, y - hgt * 0.5, rx, ry + hgt * 0.5, 0, 0, TAU); c.fill();
    c.restore();
  }
  /** the sofa's back across the foreground, a red throw cushion, and a viewer from behind in a red cap */
  const sofa = () => sheet('pfb_sofa', (g) => {
    g.translate(0, -70);
    g.save(); g.translate(340, 1760); g.scale(1.15, 1.15); g.translate(-340, -1760);
    // the viewer: shoulders in a navy-and-cream plaid, the back of a head, a red ball cap seen from behind
    g.fillStyle = '#3b4a72'; g.beginPath(); g.moveTo(170, 1880); g.quadraticCurveTo(180, 1742, 300, 1730); g.lineTo(380, 1730); g.quadraticCurveTo(500, 1742, 510, 1880); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(248,242,228,.35)'; g.lineWidth = 6; for (let x = 200; x < 500; x += 34) { g.beginPath(); g.moveTo(x, 1736); g.lineTo(x, 1880); g.stroke(); } for (let y = 1752; y < 1880; y += 34) { g.beginPath(); g.moveTo(170, y); g.lineTo(510, y); g.stroke(); }
    g.fillStyle = '#c99b7a'; g.fillRect(310, 1700, 60, 40);
    g.fillStyle = '#5a3a24'; g.beginPath(); g.ellipse(340, 1662, 62, 70, 0, 0, TAU); g.fill();
    g.fillStyle = '#c99b7a'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(340 + sx * 62, 1668, 11, 19, 0, 0, TAU); g.fill(); }
    g.fillStyle = C.red; g.beginPath(); g.ellipse(340, 1626, 66, 48, 0, Math.PI, TAU); g.fill(); g.fillRect(274, 1622, 132, 14);
    g.fillStyle = '#5a3a24'; rr(g, 318, 1622, 44, 22, 8); g.fillStyle = C.redD; g.fillRect(318, 1630, 44, 5);   // the strap's gap at the back
    g.fillStyle = C.redD; g.beginPath(); g.arc(340, 1578, 7, 0, TAU); g.fill();
    g.restore();
    // the sofa back: two cushions, piping, the arm on the right
    g.fillStyle = C.navyD; g.fillRect(-90, 1790, W + 180, 300);
    g.fillStyle = C.navy; rr(g, -90, 1760, 650, 300, 40); rr(g, 540, 1760, 720, 300, 40);
    g.fillStyle = 'rgba(255,255,255,.07)'; rr(g, -60, 1770, 590, 20, 10); rr(g, 570, 1770, 660, 20, 10);
    g.fillStyle = C.brassD; g.fillRect(-90, 1792, W + 180, 5);   // brass piping along the seam
  }, 14);
  /** a banknote, magenta (the only magenta in the film is money) */
  const bill = () => sprite('pfb_bill', 110, 50, 55, 25, (g) => {
    g.fillStyle = C.mag; rr(g, -52, -23, 104, 46, 3);
    g.strokeStyle = C.magL; g.lineWidth = 3; g.strokeRect(-46, -17, 92, 34);
    g.fillStyle = C.magD; g.beginPath(); g.ellipse(0, 0, 15, 15, 0, 0, TAU); g.fill();
    g.fillStyle = C.magL; star(g, 0, 1, 9); for (const [x, y] of [[-38, -10], [38, 10]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
  }, 4);
  /** the room as a stack; o = { t, screen(g) drawing the TV picture, dot(g) the escaped dot, lump(g), bills(g), tag(g) } */
  function room(o) {
    return [
      { sh: roomWall(), d: 0.03, lift: 0, soft: 1 },
      { fn: (g, ox) => glow(g, 240 + ox, 560, 420, 'rgba(255,246,214,', 0.28), d: 0.03 },
      { sh: floor(), d: 0.06, lift: 0 },
      { sh: furniture(), d: 0.1, lift: 0.9, alpha: 0.4 },
      { fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); g.beginPath(); g.rect(SCR.x, SCR.y, SCR.w, SCR.h); g.clip(); g.translate(SCR.x, SCR.y); o.screen(g, SCR.w, SCR.h);
          const gl = g.createLinearGradient(0, 0, SCR.w, SCR.h); gl.addColorStop(0, 'rgba(255,255,255,.10)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,.06)'); gl.addColorStop(0.56, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, SCR.w, SCR.h); g.restore(); }, d: 0.1 },
      { fn: (g, ox, oy) => { if (o.dot) { g.save(); g.translate(ox, oy); o.dot(g); g.restore(); } }, d: 0.12 },
      { fn: (g, ox, oy) => { put(g, rug(), RUG.x + ox, RUG.y + oy, { lift: 0.25, alpha: 0.3 }); if (o.lump) { g.save(); g.translate(ox, oy); o.lump(g); g.restore(); } }, d: 0.14 },
      { fn: (g, ox, oy) => { if (o.bills) { g.save(); g.translate(ox, oy); o.bills(g); g.restore(); } }, d: 0.2 },
      { sh: sofa(), d: 0.3, lift: 1.3, alpha: 0.45, y: o.sofaDy || 0 },
      { fn: (g) => { if (o.tag) o.tag(g); }, d: 0 },
    ];
  }

  // ---------------------------------------------------------------- the wall of 95 screens
  // 11 rows of 8 and a last row of 7: 95. Each screen's picture is a different ad, drawn small.
  const GRID = (() => { const out = []; for (let r = 0; r < 12; r++) { const n = r < 11 ? 8 : 7, x0 = 98 + (8 - n) * 56; for (let k = 0; k < n; k++) out.push({ r, k, x: x0 + k * 112 + 52, y: 728 + r * 86 + 37 }); } return out; })();
  const at = (r, k) => GRID.findIndex((q) => q.r === r && q.k === k);
  const HERO = at(5, 4);
  const AI = [[1, 5], [2, 1], [4, 6], [6, 2], [7, 6], [9, 3], [11, 1]].map(([r, k]) => at(r, k));
  // the pictures, each drawn into a 100 × 62 frame (the fine print strip goes under it). topic: which word-card lights it.
  const MOT = {
    flag: { bgs: ['#9ec6db', '#f2d69a', '#cddfe2'], draw: (g, v) => { g.fillStyle = '#8a8478'; g.fillRect(18, 6, 3, 56); flag(g, 21, 10, 62, 36, 1.3 + v * 2.1, 0.1); } },
    eagle: { bgs: [C.navy, '#9ec6db', C.redD], draw: (g) => { g.fillStyle = '#4a3322'; g.beginPath(); g.moveTo(52, 62); g.lineTo(100, 62); g.lineTo(100, 24); g.lineTo(78, 22); g.lineTo(60, 40); g.closePath(); g.fill(); g.fillStyle = C.creamL; g.beginPath(); g.ellipse(64, 26, 26, 18, -0.3, 0, TAU); g.fill(); g.beginPath(); g.moveTo(46, 38); g.lineTo(80, 30); g.lineTo(70, 50); g.closePath(); g.fill(); g.fillStyle = '#e8b830'; g.beginPath(); g.moveTo(42, 18); g.lineTo(22, 22); g.quadraticCurveTo(16, 32, 24, 36); g.lineTo(28, 30); g.lineTo(44, 32); g.closePath(); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(50, 21, 2.6, 0, TAU); g.fill(); } },
    diner: { bgs: ['#f2d69a', '#9ec6db'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 50, 100, 12); diner(g, 50, 52, 0.3); } },
    sunrise: { bgs: ['#f2c878', '#9ec6db'], draw: (g) => { g.fillStyle = '#f6c45a'; g.beginPath(); g.arc(50, 44, 18, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,246,214,.6)'; for (let k = 0; k < 8; k++) { g.save(); g.translate(50, 44); g.rotate(-Math.PI + k * Math.PI / 7); g.fillRect(22, -2, 22, 4); g.restore(); } g.fillStyle = C.grass; g.beginPath(); g.moveTo(0, 50); g.quadraticCurveTo(50, 36, 100, 50); g.lineTo(100, 62); g.lineTo(0, 62); g.fill(); } },
    mountains: { bgs: ['#9ec6db', '#f2d69a'], draw: (g) => { g.fillStyle = C.navyL; g.beginPath(); g.moveTo(0, 62); g.lineTo(28, 22); g.lineTo(46, 40); g.lineTo(66, 12); g.lineTo(100, 56); g.lineTo(100, 62); g.fill(); g.fillStyle = C.creamL; g.beginPath(); g.moveTo(58, 23); g.lineTo(66, 12); g.lineTo(74, 23); g.lineTo(66, 27); g.closePath(); g.fill(); g.fillStyle = C.grass; g.fillRect(0, 54, 100, 8); } },
    barn: { topic: 'more', bgs: ['#9ec6db', '#cddfe2'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 50, 100, 12); g.fillStyle = C.red; g.beginPath(); g.moveTo(26, 52); g.lineTo(26, 28); g.lineTo(38, 16); g.lineTo(62, 16); g.lineTo(74, 28); g.lineTo(74, 52); g.fill(); g.strokeStyle = C.creamL; g.lineWidth = 2.5; g.strokeRect(40, 32, 20, 20); g.beginPath(); g.moveTo(40, 32); g.lineTo(60, 52); g.moveTo(60, 32); g.lineTo(40, 52); g.stroke(); g.fillStyle = C.steel; g.fillRect(78, 14, 12, 38); g.beginPath(); g.arc(84, 14, 6, Math.PI, TAU); g.fill(); } },
    tractor: { bgs: ['#cddfe2', '#f2d69a'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 48, 100, 14); g.fillStyle = C.red; g.fillRect(30, 26, 40, 16); g.fillRect(56, 14, 14, 16); g.fillStyle = C.ink; g.beginPath(); g.arc(64, 44, 13, 0, TAU); g.fill(); g.beginPath(); g.arc(34, 48, 8, 0, TAU); g.fill(); g.fillStyle = C.brass; g.beginPath(); g.arc(64, 44, 5, 0, TAU); g.fill(); g.fillRect(36, 18, 3, 8); } },
    wheat: { bgs: ['#f2c878', '#cddfe2'], draw: (g) => { g.fillStyle = C.brassL; g.fillRect(0, 40, 100, 22); g.strokeStyle = C.brassD; g.lineWidth = 2; for (let x = 8; x < 100; x += 10) { g.beginPath(); g.moveTo(x, 62); g.lineTo(x + 3, 22); g.stroke(); g.fillStyle = C.brass; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + 3, 24 + k * 5, 2.6, 4, 0, 0, TAU); g.fill(); } } } },
    cow: { bgs: [C.grassL, '#9ec6db'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 50, 100, 12); g.fillStyle = C.creamL; rr(g, 26, 22, 42, 22, 8); rr(g, 64, 16, 16, 16, 5); g.fillRect(30, 40, 5, 12); g.fillRect(58, 40, 5, 12); g.fillStyle = C.ink; for (const [x, y, r] of [[38, 30, 6], [54, 28, 5], [46, 38, 4]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } g.fillStyle = '#e8a0a0'; rr(g, 72, 26, 9, 6, 2); } },
    factory: { bgs: ['#9ec6db', '#f2d69a'], draw: (g) => { g.fillStyle = C.navy; g.beginPath(); g.moveTo(12, 62); g.lineTo(12, 34); for (let i = 0; i < 4; i++) { g.lineTo(12 + i * 18 + 18, 24); g.lineTo(12 + i * 18 + 18, 34); } g.lineTo(84, 62); g.fill(); g.fillRect(20, 10, 7, 26); g.fillRect(34, 14, 7, 22); g.fillStyle = C.creamL; for (const [x, y, r] of [[24, 6, 5], [30, 2, 6], [38, 9, 4]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } g.fillStyle = C.brassL; for (let i = 0; i < 4; i++) g.fillRect(18 + i * 16, 44, 8, 8); } },
    hardhat: { bgs: [C.navy, '#9ec6db'], draw: (g) => { g.fillStyle = '#f2c230'; g.beginPath(); g.ellipse(50, 42, 26, 22, 0, Math.PI, TAU); g.fill(); g.fillRect(18, 40, 64, 7); g.fillStyle = C.brassD; g.fillRect(46, 20, 8, 22); } },
    tools: { bgs: [C.red, C.navy], draw: (g) => { g.save(); g.translate(50, 32); g.fillStyle = C.creamL; g.rotate(0.7); g.fillRect(-3, -24, 6, 48); g.fillRect(-11, -26, 22, 9); g.rotate(-1.4); g.fillRect(-3, -22, 6, 44); g.beginPath(); g.arc(0, -24, 8, 0, TAU); g.fill(); g.restore(); } },
    bridge: { bgs: ['#9ec6db', '#f2c878'], draw: (g) => { g.fillStyle = C.navyL; g.fillRect(0, 48, 100, 14); g.fillStyle = C.red; g.fillRect(24, 10, 6, 40); g.fillRect(70, 10, 6, 40); g.fillRect(0, 36, 100, 4); g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(27, 6, 27, 10); g.quadraticCurveTo(50, 38, 73, 10); g.quadraticCurveTo(80, 18, 100, 28); g.stroke(); } },
    truck: { bgs: ['#9ec6db', '#f2d69a'], draw: (g) => { g.fillStyle = C.steel; g.fillRect(0, 50, 100, 12); g.fillStyle = C.red; rr(g, 14, 30, 70, 16, 4); rr(g, 46, 18, 26, 16, 4); g.fillStyle = C.skyL; g.fillRect(52, 21, 14, 9); g.fillStyle = C.ink; for (const x of [28, 70]) { g.beginPath(); g.arc(x, 48, 7, 0, TAU); g.fill(); } } },
    cart: { bgs: [C.creamL, '#f2d69a'], draw: (g) => { g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(12, 14); g.lineTo(22, 14); g.lineTo(30, 42); g.lineTo(78, 42); g.lineTo(84, 22); g.lineTo(26, 22); g.stroke(); g.fillStyle = C.red; g.fillRect(34, 10, 14, 14); g.fillStyle = C.brass; g.fillRect(50, 12, 18, 10); g.fillStyle = C.grass; g.beginPath(); g.arc(72, 16, 7, 0, TAU); g.fill(); g.fillStyle = C.navy; for (const x of [34, 74]) { g.beginPath(); g.arc(x, 50, 5, 0, TAU); g.fill(); } } },
    house: { bgs: ['#9ec6db', '#cddfe2'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 50, 100, 12); g.fillStyle = C.creamL; g.fillRect(30, 28, 40, 24); g.fillStyle = C.navy; g.beginPath(); g.moveTo(24, 30); g.lineTo(50, 10); g.lineTo(76, 30); g.fill(); g.fillStyle = C.red; g.fillRect(46, 38, 9, 14); g.fillStyle = C.skyD; g.fillRect(34, 34, 8, 7); g.fillRect(58, 34, 8, 7); g.fillStyle = C.creamL; for (let x = 2; x < 100; x += 7) { g.beginPath(); g.moveTo(x, 58); g.lineTo(x, 48); g.lineTo(x + 2.5, 45); g.lineTo(x + 5, 48); g.lineTo(x + 5, 58); g.fill(); } } },
    family: { bgs: ['#f2c878', '#9ec6db'], draw: (g) => { g.fillStyle = C.navy; for (const [x, s] of [[28, 1], [46, 0.66], [60, 0.66], [76, 1]]) { g.beginPath(); g.arc(x, 62 - 44 * s, 7 * s, 0, TAU); g.fill(); rr(g, x - 8 * s, 62 - 36 * s, 16 * s, 36 * s, 6 * s); } } },
    bus: { bgs: ['#9ec6db', '#cddfe2'], draw: (g) => { g.fillStyle = C.steel; g.fillRect(0, 52, 100, 10); g.fillStyle = '#f2b630'; rr(g, 10, 22, 78, 28, 5); g.fillStyle = C.navy; for (let i = 0; i < 5; i++) g.fillRect(16 + i * 13, 27, 9, 9); g.fillRect(10, 40, 78, 3); g.fillStyle = C.ink; for (const x of [26, 74]) { g.beginPath(); g.arc(x, 51, 6, 0, TAU); g.fill(); } } },
    pie: { bgs: [C.red, C.creamL], draw: (g) => { g.fillStyle = 'rgba(248,242,228,.4)'; for (let x = 0; x < 100; x += 16) g.fillRect(x, 0, 8, 62); g.fillStyle = C.brassL; g.beginPath(); g.ellipse(50, 38, 32, 14, 0, 0, TAU); g.fill(); g.fillStyle = C.brass; g.fillRect(18, 38, 64, 10); g.strokeStyle = C.brassD; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(50 + k * 11, 26); g.lineTo(50 + k * 11, 50); g.stroke(); } } },
    church: { bgs: ['#9ec6db', '#f2d69a'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 52, 100, 10); g.fillStyle = C.creamL; g.fillRect(34, 30, 34, 24); g.fillRect(44, 16, 12, 16); g.beginPath(); g.moveTo(42, 16); g.lineTo(50, 2); g.lineTo(58, 16); g.fill(); g.beginPath(); g.moveTo(30, 30); g.lineTo(51, 20); g.lineTo(72, 30); g.fill(); g.fillStyle = C.red; rr(g, 46, 40, 10, 14, 4); } },
    ball: { bgs: [C.grassL, '#9ec6db'], draw: (g) => { g.save(); g.translate(60, 30); g.rotate(-0.6); g.fillStyle = '#b07a46'; rr(g, -4, -26, 9, 50, 4); g.restore(); g.fillStyle = C.creamL; g.beginPath(); g.arc(34, 38, 13, 0, TAU); g.fill(); g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.arc(24, 38, 10, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(44, 38, 10, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); } },
    // immigration (NBC: ads about Immigration and Customs Enforcement)
    badge: { topic: 'imm', bgs: [C.navy, C.red], draw: (g) => { g.fillStyle = C.brass; star(g, 50, 33, 24, 0.5); g.fillStyle = C.brassD; g.beginPath(); g.arc(50, 34, 9, 0, TAU); g.fill(); g.fillStyle = C.brassL; g.beginPath(); g.arc(50, 34, 5, 0, TAU); g.fill(); } },
    torch: { topic: 'imm', bgs: ['#9ec6db', C.navy], draw: (g) => { g.fillStyle = '#6fa58f'; g.beginPath(); g.moveTo(42, 62); g.lineTo(46, 30); g.lineTo(56, 30); g.lineTo(60, 62); g.fill(); g.fillRect(44, 26, 14, 6); g.fillStyle = '#f2b630'; g.beginPath(); g.moveTo(44, 26); g.quadraticCurveTo(40, 12, 51, 2); g.quadraticCurveTo(62, 14, 58, 26); g.fill(); g.fillStyle = C.red; g.beginPath(); g.moveTo(47, 24); g.quadraticCurveTo(46, 14, 51, 9); g.quadraticCurveTo(56, 16, 55, 24); g.fill(); } },
    passport: { topic: 'imm', bgs: [C.creamL, '#f2d69a'], draw: (g) => { g.fillStyle = C.navy; rr(g, 32, 6, 38, 52, 4); g.fillStyle = C.brass; g.beginPath(); g.arc(51, 28, 10, 0, TAU); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.arc(51, 28, 6, 0, TAU); g.fill(); g.fillStyle = C.brass; g.fillRect(40, 44, 22, 3); g.fillRect(43, 50, 16, 2); } },
    fence: { topic: 'imm', bgs: ['#f2c878', '#9ec6db'], draw: (g) => { g.fillStyle = '#c9a77a'; g.fillRect(0, 48, 100, 14); g.strokeStyle = C.steel; g.lineWidth = 2; for (let x = 0; x < 100; x += 8) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 52); g.stroke(); } g.lineWidth = 1.5; for (let x = -40; x < 100; x += 8) { g.beginPath(); g.moveTo(x, 52); g.lineTo(x + 38, 14); g.stroke(); g.beginPath(); g.moveTo(x + 38, 52); g.lineTo(x, 14); g.stroke(); } g.fillStyle = C.navy; g.fillRect(0, 12, 100, 4); } },
    // health care
    cross: { topic: 'health', bgs: [C.creamL, '#cddfe2'], draw: (g) => { g.fillStyle = C.red; g.fillRect(42, 10, 16, 44); g.fillRect(28, 24, 44, 16); } },
    stetho: { topic: 'health', bgs: ['#cddfe2', C.creamL], draw: (g) => { g.strokeStyle = C.navy; g.lineWidth = 3.5; g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(28, 40, 50, 40); g.quadraticCurveTo(72, 40, 68, 8); g.moveTo(50, 40); g.quadraticCurveTo(50, 54, 66, 52); g.stroke(); g.fillStyle = C.steel; g.beginPath(); g.arc(70, 50, 8, 0, TAU); g.fill(); g.fillStyle = C.creamL; g.beginPath(); g.arc(70, 50, 4, 0, TAU); g.fill(); } },
    pills: { topic: 'health', bgs: ['#f2d69a', '#9ec6db'], draw: (g) => { g.fillStyle = '#e8862a'; rr(g, 32, 18, 34, 40, 4); g.fillStyle = C.creamL; rr(g, 30, 8, 38, 12, 3); g.fillRect(36, 30, 26, 16); g.fillStyle = C.red; g.save(); g.translate(78, 48); g.rotate(0.6); rr(g, -10, -4, 20, 8, 4); g.restore(); } },
    hospital: { topic: 'health', bgs: ['#9ec6db', '#cddfe2'], draw: (g) => { g.fillStyle = C.creamL; g.fillRect(20, 16, 60, 46); g.fillStyle = C.skyD; for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) if (!(r === 2 && (k === 1 || k === 2))) g.fillRect(26 + k * 13, 26 + r * 11, 8, 6); g.fillStyle = C.red; g.fillRect(46, 2, 8, 20); g.fillRect(40, 8, 20, 8); g.fillStyle = C.navy; g.fillRect(42, 50, 16, 12); } },
    // the President (NBC: ads about President Donald Trump) — a lectern and a seal, never a face
    podium: { topic: 'pres', bgs: [C.navy, C.redD], draw: (g) => { g.fillStyle = C.brass; for (let i = 0; i < 5; i++) star(g, 14 + i * 18, 10, 4); g.fillStyle = '#7a5434'; g.beginPath(); g.moveTo(30, 62); g.lineTo(34, 26); g.lineTo(66, 26); g.lineTo(70, 62); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.arc(50, 40, 9, 0, TAU); g.fill(); g.fillStyle = C.brass; g.beginPath(); g.arc(50, 40, 6, 0, TAU); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(46, 26); g.lineTo(42, 14); g.stroke(); } },
    whitehouse: { topic: 'pres', bgs: ['#9ec6db', '#f2d69a'], draw: (g) => { g.fillStyle = C.grass; g.fillRect(0, 52, 100, 10); g.fillStyle = C.creamL; g.fillRect(14, 30, 72, 24); g.fillRect(36, 22, 28, 32); g.beginPath(); g.moveTo(34, 24); g.lineTo(50, 14); g.lineTo(66, 24); g.fill(); g.fillStyle = C.creamD; for (let i = 0; i < 5; i++) g.fillRect(39 + i * 5.5, 28, 2.5, 24); g.fillStyle = C.skyD; for (const x of [18, 26, 70, 78]) g.fillRect(x, 36, 5, 8); g.fillStyle = C.red; g.fillRect(49, 4, 2, 12); g.fillRect(51, 4, 8, 5); } },
    seal: { topic: 'pres', bgs: [C.navy, '#cddfe2'], draw: (g) => { g.fillStyle = C.brass; g.beginPath(); g.arc(50, 31, 25, 0, TAU); g.fill(); g.fillStyle = C.navy; g.beginPath(); g.arc(50, 31, 20, 0, TAU); g.fill(); g.fillStyle = C.brassL; g.beginPath(); g.moveTo(32, 26); g.lineTo(46, 32); g.lineTo(50, 22); g.lineTo(54, 32); g.lineTo(68, 26); g.lineTo(58, 40); g.lineTo(42, 40); g.closePath(); g.fill(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; g.beginPath(); g.arc(50 + Math.cos(a) * 22.5, 31 + Math.sin(a) * 22.5, 1.4, 0, TAU); g.fill(); } } },
    bell: { bgs: [C.creamL, '#9ec6db'], draw: (g) => { g.fillStyle = '#7a5434'; g.fillRect(28, 6, 44, 7); g.fillStyle = C.brassD; g.beginPath(); g.moveTo(38, 14); g.quadraticCurveTo(36, 40, 26, 50); g.lineTo(74, 50); g.quadraticCurveTo(64, 40, 62, 14); g.closePath(); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(48, 50); g.lineTo(46, 40); g.lineTo(50, 32); g.lineTo(47, 24); g.stroke(); } },
    star: { bgs: [C.red, C.navy], draw: (g) => { g.fillStyle = C.creamL; star(g, 50, 33, 26); g.fillStyle = C.navy; star(g, 50, 33, 12); } },
    // the seven that mention AI: a chip, and on it the letters
    chip: { topic: 'ai', bgs: ['#cddfe2', '#9ec6db'], draw: (g) => { g.fillStyle = C.navy; for (let i = 0; i < 5; i++) { g.fillRect(28 + i * 10, 4, 4, 8); g.fillRect(28 + i * 10, 50, 4, 8); g.fillRect(18, 14 + i * 8, 8, 4); g.fillRect(74, 14 + i * 8, 8, 4); } rr(g, 24, 10, 52, 42, 5); g.fillStyle = C.brassL; g.font = '26px "Anton-400"'; g.textAlign = 'center'; g.fillText('AI', 50, 42); } },
  };
  const TOPIC = (m) => MOT[m].topic || 'more';
  // who shows what: the hero (the living-room ad), seven chips, and 87 others — no motif twice in a row or a column
  const ASSIGN = (() => {
    const names = Object.keys(MOT).filter((m) => m !== 'chip'), r = U.rng(2026), nm = new Array(GRID.length).fill(null), used = {};
    nm[HERO] = 'hero'; AI.forEach((i) => (nm[i] = 'chip'));
    let bag = [];
    const refill = () => { bag = names.slice(); for (let j = bag.length - 1; j > 0; j--) { const q = Math.floor(r() * (j + 1)); [bag[j], bag[q]] = [bag[q], bag[j]]; } };
    for (let i = 0; i < GRID.length; i++) {
      if (nm[i]) continue;
      const left = i > 0 && GRID[i - 1].r === GRID[i].r ? nm[i - 1] : null, upI = at(GRID[i].r - 1, GRID[i].k), up = upI >= 0 ? nm[upI] : null;
      for (let tries = 0; tries < 40 && !nm[i]; tries++) { if (!bag.length) refill(); const m = bag.pop(); if (m !== left && m !== up) nm[i] = m; else bag.unshift(m); }
      if (!nm[i]) { if (!bag.length) refill(); nm[i] = bag.pop(); }
    }
    return nm.map((m, i) => { if (m === 'chip') return { m, v: AI.indexOf(i) }; used[m] = (used[m] || 0) + 1; return { m, v: used[m] - 1 }; });
  })();
  const TOPICS = ASSIGN.map((q) => (q.m === 'hero' ? 'more' : TOPIC(q.m)));
  /** one small TV: dark bezel, the picture, its own fine print strip; origin at its centre (104 × 74) */
  const cell = (i) => sprite('pfb_cell_' + i, 104, 74, 52, 37, (g) => {
    const { m, v } = ASSIGN[i];
    g.fillStyle = C.tv; rr(g, -52, -37, 104, 74, 6);
    g.save(); g.beginPath(); g.rect(-46, -31, 92, 62); g.clip(); g.translate(-46, -31);
    if (m === 'hero') heroAd(g, 92, 62, 3.2);
    else {
      const d = MOT[m]; g.scale(92 / 100, 62 / 70); g.fillStyle = d.bgs[v % d.bgs.length]; g.fillRect(0, 0, 100, 70);
      g.save(); if (v % 2 === 1 && m !== 'chip') { g.translate(100, 0); g.scale(-1, 1); } d.draw(g, v); g.restore();
      g.fillStyle = 'rgba(21,26,38,.88)'; g.fillRect(0, 63, 100, 7); g.fillStyle = 'rgba(248,242,228,.75)'; g.fillRect(4, 65.5, 22, 2); for (let x = 30; x < 70; x += 9) g.fillRect(x, 65.5, 6, 2);
    }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(-46, -31); g.lineTo(0, -31); g.lineTo(-46, 10); g.closePath(); g.fill();
  }, 5);
  /** a cell whose ad is hero is drawn LIVE at any size (used while the living-room TV shrinks into its slot) */
  function heroScreen(g, cx, cy, w, h, t) {
    const b = Math.max(6, w * 0.022);
    g.save(); g.shadowColor = 'rgba(10,8,4,.35)'; g.shadowBlur = 12; g.shadowOffsetX = 8; g.shadowOffsetY = 10; g.fillStyle = C.tv; rr(g, cx - w / 2 - b, cy - h / 2 - b, w + 2 * b, h + 2 * b, b); g.restore();
    g.save(); g.beginPath(); g.rect(cx - w / 2, cy - h / 2, w, h); g.clip(); g.translate(cx - w / 2, cy - h / 2); heroAd(g, w, h, t); g.restore();
  }

  /** the campaign bunting along the top of the wall: three pleated fans, stars on navy, then cream and red */
  const bunting = () => sheet('pfb_bunting', (g) => {
    for (const x of [160, 540, 920]) {
      const R = 190, rings = [[R, C.red], [R * 0.8, C.creamL], [R * 0.62, C.red], [R * 0.45, C.navy]];
      for (const [r, col] of rings) { g.fillStyle = col; g.beginPath(); g.moveTo(x, 40); g.arc(x, 40, r, 0, Math.PI); g.closePath(); g.fill(); }
      g.fillStyle = C.creamL; for (let k = 0; k < 5; k++) { const a = 0.35 + k * 0.6; star(g, x + Math.cos(a) * R * 0.3, 40 + Math.sin(a) * R * 0.3, 8); }
      g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 3; for (let k = 1; k < 12; k++) { const a = k / 12 * Math.PI; g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.45, 40 + Math.sin(a) * R * 0.45); g.lineTo(x + Math.cos(a) * R, 40 + Math.sin(a) * R); g.stroke(); }
      g.fillStyle = C.brass; g.beginPath(); g.arc(x, 44, 12, 0, TAU); g.fill();
    }
    g.fillStyle = C.navy; g.fillRect(-90, 26, W + 180, 18);
  }, 10);
  /** draw the whole wall of cells; f(i) → {sc, alpha, lift, dim, ring, flash} or null to skip a cell */
  function wall(g, ox, oy, f) {
    for (let i = 0; i < GRID.length; i++) {
      const q = GRID[i], o = f(i); if (!o || o.sc <= 0.001) continue;
      const x = q.x + ox + (o.dx || 0), y = q.y + oy + (o.dy || 0);
      if (o.under) o.under(g, x, y);
      g.save(); if (o.alpha != null) g.globalAlpha = o.alpha; put(g, cell(i), x, y, { sc: o.sc, lift: o.lift ?? 0.6, alpha: 0.4, rot: o.rot || 0 }); g.restore();
      if (o.flash) { g.save(); g.globalAlpha = o.flash; g.fillStyle = '#fffaf0'; g.fillRect(x - 46 * o.sc, y - 31 * o.sc, 92 * o.sc, 62 * o.sc); g.restore(); }
      if (o.dim) { g.save(); g.globalAlpha = o.dim; g.fillStyle = C.navyD; g.fillRect(x - 52 * o.sc, y - 37 * o.sc, 104 * o.sc, 74 * o.sc); g.restore(); }
      if (o.ring) { g.save(); g.globalAlpha = o.ring; g.strokeStyle = o.ringCol || C.brass; g.lineWidth = 6; g.beginPath(); g.roundRect(x - 57 * o.sc, y - 42 * o.sc, 114 * o.sc, 84 * o.sc, 9); g.stroke(); g.restore(); }
      if (o.over) o.over(g, x, y);
    }
  }

  /** a word-card: a navy placard, cream lettering, a red rule and two brass stars */
  const card = (text) => {
    const font = '92px "Anton-400"', tw = measure(text, font), w = Math.ceil(tw + 170), h = 168;
    return sprite('pfb_card_' + text, w, h, w / 2, h / 2, (g) => {
      g.fillStyle = C.navy; rr(g, -w / 2, -h / 2, w, h, 10);
      g.strokeStyle = C.creamL; g.lineWidth = 4; g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
      g.fillStyle = C.red; g.fillRect(-tw / 2, 50, tw, 10);
      g.fillStyle = C.creamL; g.font = font; g.textAlign = 'center'; g.fillText(text, 0, 38);
      g.fillStyle = C.brass; star(g, -tw / 2 - 44, 4, 20); star(g, tw / 2 + 44, 4, 20);
    }, 10);
  };

  /** a highlighter, chisel tip at the origin, the barrel running up and right */
  const highlighter = () => sprite('pfb_hl', 200, 520, 30, 500, (g) => {
    g.save(); g.rotate(0.5);
    g.fillStyle = C.hilite; g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -18); g.lineTo(18, -60); g.lineTo(-18, -60); g.closePath(); g.fill();   // the felt tip
    g.fillStyle = C.navy; rr(g, -30, -110, 60, 54, 8);
    g.fillStyle = C.hilite; rr(g, -34, -420, 68, 316, 14);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-24, -410, 10, 290);
    g.fillStyle = C.navy; g.fillRect(-34, -330, 68, 16);
    g.restore();
  }, 10);

  /** a banded brick of cash in three-quarter view: the top bill, the stacked edge, a paper band round its middle */
  const brick = () => sprite('pfb_brick2', 230, 200, 115, 168, (g) => {
    const w = 152, d = 76, th = 52, r = U.rng(4);
    g.fillStyle = C.magDD; g.fillRect(-w / 2, -th, w, th);                                                        // the stacked edge, bill on bill
    for (let y = -th + 3; y < 0; y += 4) { g.fillStyle = r() < 0.5 ? 'rgba(255,170,210,.55)' : 'rgba(255,120,180,.35)'; g.fillRect(-w / 2 + (r() - 0.5) * 4, y, w, 1.6); }
    g.fillStyle = C.magD; g.fillRect(w / 2 - 6, -th - d + 6, 6, d);                                                 // the right-hand side, in shade
    g.fillStyle = C.mag; rr(g, -w / 2, -th - d, w, d, 4);                                                       // the top bill
    g.strokeStyle = C.magL; g.lineWidth = 3; g.strokeRect(-w / 2 + 8, -th - d + 7, w - 16, d - 14);
    g.fillStyle = C.magD; g.beginPath(); g.ellipse(-38, -th - d / 2, 18, 21, 0, 0, TAU); g.fill(); g.fillStyle = C.magL; star(g, -38, -th - d / 2 + 1, 12);
    g.fillStyle = C.magL; for (const [x, y] of [[56, -th - d + 18], [56, -th - 18]]) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
    g.fillStyle = C.creamL; g.fillRect(0, -th - d, 32, d + th); g.fillStyle = C.brass; g.fillRect(0, -th - d, 32, 7); g.fillRect(0, -th - 5, 32, 5);   // the paper band round its middle
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, -th, 32, th);
  }, 10);

  /** a magenta glove — the money — closed, its index finger out to type; origin at the fingertip, the sleeve running down and right */
  const typingHand = () => sprite('pfb_hand2', 460, 720, 70, 30, (g) => {
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(-6, 236); g.lineTo(150, 206); g.lineTo(350, 680); g.lineTo(150, 700); g.closePath(); g.fill();   // the suit sleeve
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(90, 300); g.lineTo(130, 290); g.lineTo(260, 690); g.lineTo(220, 690); g.closePath(); g.fill();
    g.save(); g.translate(72, 214); g.rotate(-0.19); g.fillStyle = C.creamL; g.fillRect(-84, -16, 168, 32); g.fillStyle = C.brass; g.beginPath(); g.arc(44, 0, 8, 0, TAU); g.fill(); g.restore();   // the shirt cuff, a cufflink
    g.fillStyle = C.mag; g.beginPath(); g.roundRect(-34, 66, 166, 150, 42); g.fill();                                                   // the palm
    for (let i = 0; i < 3; i++) { g.beginPath(); g.roundRect(26 + i * 36, 44 + i * 6, 36, 70, 17); g.fill(); }                          // three curled fingers
    g.beginPath(); g.roundRect(-20, -8, 42, 140, 21); g.fill();                                                                         // the typing finger
    g.save(); g.translate(-30, 150); g.rotate(-0.5); g.beginPath(); g.roundRect(-14, -18, 74, 36, 18); g.fill(); g.restore();          // the thumb, tucked
    g.strokeStyle = C.magD; g.lineWidth = 3; g.beginPath(); g.moveTo(-8, 52); g.lineTo(10, 52); g.moveTo(60, 104); g.lineTo(60, 122); g.moveTo(96, 110); g.lineTo(96, 128); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.roundRect(-12, 0, 10, 80, 5); g.fill();
  }, 12);

  /** the where/what tag: a small brass card in the box's lower corner */
  function tag(c, text, lt, dur, x = 96, y = 1772) {
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = '32px "ArchivoBlack-400"'; const w = c.measureText(text).width + 44; if (x === 'right') x = W - 96 - w;
    c.shadowColor = 'rgba(10,8,4,.45)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.brass; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = C.navy; c.textAlign = 'left'; c.fillText(text, x + 22, y + 45); c.restore();
  }
  /** the box: a deep navy-painted frame with a brass bead round the opening; its top and left edges throw a soft shadow in */
  function box(c) {
    c.save();
    const sh = c.createLinearGradient(0, 56, 0, 136); sh.addColorStop(0, 'rgba(14,18,34,.42)'); sh.addColorStop(1, 'rgba(14,18,34,0)'); c.fillStyle = sh; c.fillRect(56, 56, W - 112, 80);
    const sl = c.createLinearGradient(56, 0, 128, 0); sl.addColorStop(0, 'rgba(14,18,34,.34)'); sl.addColorStop(1, 'rgba(14,18,34,0)'); c.fillStyle = sl; c.fillRect(56, 56, 72, H - 112);
    c.fillStyle = C.navy; c.beginPath(); c.rect(0, 0, W, H); c.rect(56, 56, W - 112, H - 112); c.fill('evenodd');
    c.strokeStyle = C.brass; c.lineWidth = 5; c.strokeRect(53.5, 53.5, W - 107, H - 107);
    c.strokeStyle = 'rgba(255,240,210,.12)'; c.lineWidth = 2; c.strokeRect(20, 20, W - 40, H - 40);
    c.restore();
  }
  /** the camera: screen = (540, ay) + (world − p) · z */
  function view(c, z, px, py, ay = 1260) { c.translate(540, ay); c.scale(z, z); c.translate(-px, -py); }

  return { C, B, star, rr, measure, flag, eagle, diner, finePrint, heroAd, endCard, DOT, TV, SCR, RUG, room, wallpaper, roomWall, floor, furniture, rug, lump, sofa, bill,
    GRID, HERO, AI, ASSIGN, TOPICS, cell, heroScreen, bunting, wall, card, highlighter, brick, typingHand, tag, box, view };
})();
