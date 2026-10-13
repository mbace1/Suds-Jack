// Shot 2 · 3.2–6.4 s · Through the glasses. The front sheet is the inside of the
// yellow mask from shot 1, cut with two lens holes and rimmed in black; through the
// left lens, the bakery across the square (a cake on a stand, the AR corners snapping
// onto it); through the right, a birch branch and one leaf. On the beat a red card
// wedge drives up out of the bottom and ORDERED rides on it; two beats later a tag
// is stamped under the leaf: ALSO ORDERED?
SCENES['rfp_lens'] = (() => {
  const { K, W, H, sheet, sprite, stack, layer, box, dusk, leafSprite, words, pop, ease, glow, put, ledAt } = RFP, { S } = RFM, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_SNAP = 0.3, T_WEDGE = 2 * B, T_ALSO = 4 * B;
  const L = [300, 760], R = [780, 760], RAD = 214, RY = 370;
  const lens = (p, [x, y], grow = 0) => p.ellipse(x, y, RAD + grow, RY + grow, 0, 0, TAU);
  const hole = (p) => { lens(p, L); p.moveTo(R[0] + RAD, R[1]); lens(p, R); };
  const front = () => sheet('rfp_ln_front', (g) => {
    g.fillStyle = S.YELLOW; g.beginPath(); g.rect(-90, -90, W + 180, H + 180); hole(g); g.fill('evenodd');
    g.strokeStyle = K.ink; g.lineWidth = 34; for (const p of [L, R]) { g.beginPath(); lens(g, p, 15); g.stroke(); }
    g.lineWidth = 30; g.beginPath(); g.moveTo(L[0] + RAD + 10, L[1] - 150); g.quadraticCurveTo(540, L[1] - 210, R[0] - RAD - 10, R[1] - 150); g.stroke();
    // the mask's own card shows its back: a strap slot and a crease
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-90, 1260, W + 180, 8);
  }, 18);
  const bakeryBack = () => sheet('rfp_ln_bak', (g) => {
    g.fillStyle = '#e39a52'; g.fillRect(-90, -90, 700, H);
    g.fillStyle = '#7a3e1e'; for (const y of [520, 1100]) g.fillRect(-90, y, 700, 22);
    const r = U.rng(3); for (let i = 0; i < 9; i++) { g.fillStyle = r() < 0.5 ? '#b8692c' : '#d48a3a'; g.beginPath(); g.ellipse(80 + i * 60 + r() * 10, 498, 30, 20, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,240,200,.35)'; g.fillRect(-90, 430, 700, 20);
  });
  const cake = () => sprite('rfp_ln_cake', 380, 480, 190, 440, (g) => {
    g.fillStyle = '#5a3a24'; g.fillRect(-12, -40, 24, 40); g.beginPath(); g.ellipse(0, 0, 110, 20, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, -44, 150, 18, 0, 0, TAU); g.fill();
    g.fillStyle = '#e46a8f'; g.fillRect(-130, -190, 260, 140); g.fillStyle = '#f3a7c0'; g.fillRect(-90, -300, 180, 112);
    g.fillStyle = K.card; for (const [y, w] of [[-190, 130], [-300, 90]]) { g.beginPath(); g.moveTo(-w, y); for (let k = 0; k <= 10; k++) { const x = -w + k * w / 5; g.lineTo(x, y + (k % 2 ? 26 : 10)); } g.lineTo(w, y - 12); g.lineTo(-w, y - 12); g.closePath(); g.fill(); }
    g.fillStyle = K.red; g.beginPath(); g.arc(0, -330, 24, 0, TAU); g.fill(); g.strokeStyle = '#3a5a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -352); g.quadraticCurveTo(10, -380, 26, -388); g.stroke();
  }, 8);
  const branch = () => sheet('rfp_ln_branch', (g) => {
    g.fillStyle = '#f2ece0'; g.beginPath(); g.moveTo(880, -90); g.lineTo(940, -90); g.lineTo(920, H); g.lineTo(860, H); g.closePath(); g.fill();
    g.fillStyle = K.ink; const r = U.rng(8); for (let i = 0; i < 30; i++) { const y = r() * 1400; g.fillRect(870 + r() * 40, y, 24 + r() * 20, 6); }
    g.strokeStyle = '#3a2a1e'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(900, 520); g.quadraticCurveTo(780, 560, 640, 520); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(745, 548); g.lineTo(742, 610); g.stroke();
  });
  // the AR corners, cream card, snapping in from wide
  function corners(c, cx, cy, w, h, k) {
    if (k <= 0) return; const sc = lerp(1.7, 1, ease.out(k));
    c.save(); c.translate(cx, cy); c.scale(sc, sc); c.strokeStyle = K.card; c.lineWidth = 8; c.lineCap = 'square'; c.globalAlpha = clamp(k * 3, 0, 1);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * w, sy * (h - 40)); c.lineTo(sx * w, sy * h); c.lineTo(sx * (w - 40), sy * h); c.stroke(); }
    c.restore();
  }
  const wedge = () => sprite('rfp_ln_wedge', 1200, 1050, 300, 120, (g) => {
    g.fillStyle = K.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(900, 520); g.lineTo(900, 900); g.lineTo(-60, 200); g.closePath(); g.fill();
  }, 14);
  const tag = () => sprite('rfp_ln_tag', 470, 150, 235, 75, (g) => {
    g.fillStyle = K.card; g.beginPath(); g.roundRect(-220, -60, 440, 120, 10); g.fill();
    g.strokeStyle = K.red; g.lineWidth = 7; g.strokeRect(-204, -46, 408, 92);
    g.fillStyle = K.red; g.font = '58px "Anton-400"'; g.textAlign = 'center'; g.fillText('ALSO ORDERED?', 0, 22);
  }, 8);
  return {
    draw(c, lt) {
      const slam = 1 + 0.22 * (1 - ease.out(lt / 0.26)), cam = { x: Math.sin(lt * 0.9) * 22, y: 0, z: slam };
      const sway = Math.sin(lt * 2.1) * 0.25;
      // the world through the left lens
      c.save(); c.beginPath(); lens(c, L, 4); c.clip();
      stack(c, [
        { sh: bakeryBack(), d: 0.25, lift: 0 },
        { fn: (g, ox) => { put(g, cake(), L[0] + 10 + ox, 1100, { lift: 1.4, sc: 1.4 }); glow(g, L[0] + ox, 520, 300, 'rgba(255,220,160,', 0.3); }, d: 0.35 },
        { fn: (g, ox) => { corners(g, L[0] + 10 + ox, 830, 196, 300, (lt - T_SNAP) / 0.18); }, d: 0.35 },
      ], cam);
      c.restore();
      // the world through the right lens: dusk, a birch, one leaf
      c.save(); c.beginPath(); lens(c, R, 4); c.clip();
      stack(c, [
        { sh: dusk('ln', 1300), d: 0.1, lift: 0 },
        { sh: branch(), d: 0.3 },
        { fn: (g, ox) => put(g, leafSprite('birch', K.birch), 740 + ox, 760, { rot: sway, sc: 4.6, lift: 2.4 }), d: 0.3 },
      ], cam);
      c.restore();
      // the inside of the mask, its rims, the light on the hinge
      stack(c, [{ sh: front(), d: 0.9, lift: 2.2, alpha: 0.7 }], cam);
      c.save(); c.translate(W / 2, H / 2); c.scale(1 + (cam.z - 1) * 0.9, 1 + (cam.z - 1) * 0.9); c.translate(-W / 2 - cam.x * 0.9, -H / 2);
      ledAt(c, R[0] + RAD - 30, R[1] - RY + 70, 16, Math.floor(lt * 4) % 2 === 0 ? 1 : 0.2);
      c.restore();
      // the wedge drives up out of the bottom on the beat, ORDERED riding on it
      const kw = lt < T_WEDGE ? 0 : ease.back((lt - T_WEDGE) / 0.22);
      if (kw > 0) {
        const dx = lerp(700, 0, kw), dy = lerp(500, 0, kw);
        put(c, wedge(), 320 + dx, 1170 + dy, { lift: 2.4 });
        c.save(); c.translate(740 + dx, 1570 + dy); c.rotate(0.6); put(c, words('ORDERED', '120px "ArchivoBlack-400"', K.card), 0, 0, { lift: 0.8 }); c.restore();
      }
      const ka = pop(lt, T_ALSO, 0.2);
      if (ka > 0) put(c, tag(), 760, 1230, { rot: 0.08, sc: lerp(1.5, 1, Math.min(1, (lt - T_ALSO) / 0.12)) * Math.min(1, ka + 0.2), lift: 1.8 });
      box(c);
    },
  };
})();
