// Shot 2 · 3.2–6.4 s · Over the shoulder at the bakery window (v2: replaces the
// through-the-glasses view — there are no glasses now; the MASK is the device). The
// back of the walker's head fills the bottom left: hood, the mask's strap tied across
// it, the red light on the strap. Through the lit window: shelves, loaves, three cakes.
// The light blinks, card brackets snap onto the middle cake, and on the beat an ochre
// ORDERED label slams onto the glass over it; two beats later ALSO ORDERED? lands on
// the loaves. The camera slams in on the cut and then leans toward the cake.
SCENES['rfp_window'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, words, pop, ease, move, glow, put, ledAt } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_SNAP = 0.45, T_ORD = 2 * B, T_ALSO = 4 * B;
  const WX0 = 150, WX1 = 930, WY0 = 520, WY1 = 1180, CAKE = [560, 1000];
  const interior = () => sheet('rfp_w_in', (g) => {
    g.fillStyle = '#b8783a'; g.fillRect(WX0 - 60, WY0 - 60, WX1 - WX0 + 120, WY1 - WY0 + 120);
    g.fillStyle = '#8a5428'; for (const y of [700, 820]) g.fillRect(WX0 - 60, y, WX1 - WX0 + 120, 16);
    const r = U.rng(3); for (let i = 0; i < 12; i++) { g.fillStyle = r() < 0.5 ? '#7a4420' : '#94582a'; g.beginPath(); g.ellipse(WX0 + 30 + i * 66, 682, 30, 18, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(WX0 + 50 + i * 66, 802, 26, 16, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#5a3a22'; g.fillRect(WX0 - 60, 1010, WX1 - WX0 + 120, 200);                    // the counter
  });
  const cake = (key, top, mid) => sprite('rfp_w_cake_' + key, 300, 380, 150, 350, (g) => {
    g.fillStyle = '#3a2618'; g.fillRect(-10, -30, 20, 30); g.beginPath(); g.ellipse(0, 0, 86, 16, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0, -34, 116, 14, 0, 0, TAU); g.fill();
    g.fillStyle = mid; g.fillRect(-100, -150, 200, 112); g.fillStyle = top; g.fillRect(-68, -238, 136, 90);
    g.fillStyle = K.card; for (const [y, w] of [[-150, 100], [-238, 68]]) { g.beginPath(); g.moveTo(-w, y); for (let k = 0; k <= 8; k++) g.lineTo(-w + k * w / 4, y + (k % 2 ? 20 : 8)); g.lineTo(w, y - 10); g.lineTo(-w, y - 10); g.closePath(); g.fill(); }
    g.fillStyle = '#8a1e14'; g.beginPath(); g.arc(0, -262, 18, 0, TAU); g.fill();
  }, 8);
  const facade = () => sheet('rfp_w_facade', (g) => {
    g.fillStyle = '#33241c'; g.beginPath(); g.rect(-90, -90, W + 180, H + 180); g.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); g.fill('evenodd');
    g.fillStyle = '#271a14'; for (let y = 40; y < 1300; y += 44) for (let x = (y / 44 % 2) * 60; x < W; x += 120) { if (y > WY0 - 40 && y < WY1 + 20 && x > WX0 - 120 && x < WX1 + 20) continue; g.fillRect(x, y, 110, 6); }
    g.fillStyle = '#5a2614'; g.fillRect(WX0 - 50, WY0 - 120, WX1 - WX0 + 100, 70);                 // the awning's edge
    g.fillStyle = K.ink; g.fillRect(WX0 - 18, WY0, 18, WY1 - WY0); g.fillRect(WX1, WY0, 18, WY1 - WY0); g.fillRect(WX0 - 18, WY1, WX1 - WX0 + 36, 24); g.fillRect(538, WY0, 14, WY1 - WY0);
    g.fillStyle = K.ochre; g.font = '86px "PlayfairDisplay-700"'; g.textAlign = 'center'; g.fillText('LEIPOMO', 540, 330);
  });
  const pave = () => sheet('rfp_w_pave', (g) => { g.fillStyle = '#2e2620'; g.fillRect(-90, 1220, W + 180, H); g.fillStyle = '#3c322a'; for (let y = 1250; y < H + 90; y += 46) g.fillRect(-90, y, W + 180, 5); });
  // the back of the head: hood, the strap tied across, a knot; shoulders of the coat
  const back = () => sprite('rfp_w_back', 760, 760, 380, 330, (g) => {
    g.fillStyle = '#29473a'; g.beginPath(); g.moveTo(-370, 430); g.quadraticCurveTo(-330, 170, -150, 140); g.lineTo(150, 140); g.quadraticCurveTo(330, 170, 370, 430); g.closePath(); g.fill();
    g.fillStyle = '#9a4422'; g.beginPath(); g.roundRect(-150, 110, 300, 70, 30); g.fill();
    g.fillStyle = '#2a1f18'; g.beginPath(); g.ellipse(0, -10, 172, 196, 0, 0, TAU); g.fill();            // the hood, from behind
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(40, 10, 120, 170, 0, 0, TAU); g.fill();
    g.fillStyle = K.ink; g.fillRect(-178, -40, 356, 26);                                               // the mask's strap
    g.beginPath(); g.ellipse(-20, -27, 30, 22, 0.3, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-30, -20); g.lineTo(-60, 40); g.lineTo(-40, 44); g.closePath(); g.fill();
  }, 12);
  function brackets(c, cx, cy, w, h, k) {
    if (k <= 0) return; const sc = lerp(1.8, 1, ease.out(k));
    c.save(); c.translate(cx, cy); c.scale(sc, sc); c.globalAlpha = clamp(k * 3, 0, 1); c.strokeStyle = K.card; c.lineWidth = 9; c.lineCap = 'square';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * w, sy * (h - 44)); c.lineTo(sx * w, sy * h); c.lineTo(sx * (w - 44), sy * h); c.stroke(); }
    c.restore();
  }
  const label = (text, bg, fg, font, padX = 30) => sprite(`rfp_w_lab_${text}`, 640, 160, 320, 80, (g) => {
    g.font = font; const tw = g.measureText(text).width;
    g.fillStyle = bg; g.beginPath(); g.roundRect(-tw / 2 - padX, -56, tw + padX * 2, 112, 8); g.fill();
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(-tw / 2 - padX + 12, -44, tw + padX * 2 - 24, 88);
    g.fillStyle = fg; g.textAlign = 'center'; g.fillText(text, 0, parseInt(font) * 0.36);
  }, 10);
  return {
    draw(c, lt) {
      const slam = 1 + 0.16 * (1 - ease.out(lt / 0.26)), lean = move(lt, 0.4, 2.6, 1, 1.07);
      const cam = { x: Math.sin(lt * 0.8) * 16, y: 0, z: slam * lean, fx: CAKE[0], fy: CAKE[1] - 120 };
      const look = ease.out((lt - T_SNAP + 0.2) / 0.3) * 0.5;
      stack(c, [
        { sh: dusk('w', 600), d: 0.05, lift: 0 },
        { sh: interior(), d: 0.18, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 640, 520, 'rgba(255,200,120,', 0.4); for (const [x, k, t, m] of [[290, 'a', '#c98a9a', '#9a4a5a'], [CAKE[0], 'b', '#e8c8a0', '#c48a50'], [800, 'c', '#a8b890', '#6a7a50']]) put(g, cake(k, t, m), x + ox, 1012, { sc: x === CAKE[0] ? 1.1 : 0.85, lift: 1.2 }); }, d: 0.24 },
        { fn: (g, ox) => { brackets(g, CAKE[0] + ox, CAKE[1] - 150, 150, 200, (lt - T_SNAP) / 0.16); }, d: 0.24 },
        { sh: facade(), d: 0.36, lift: 1.4 },
        { fn: (g, ox) => { g.save(); g.globalAlpha = 0.08; g.fillStyle = '#fff6e0'; g.beginPath(); g.moveTo(WX0 + 100 + ox, WY0); g.lineTo(WX0 + 260 + ox, WY0); g.lineTo(WX0 + 60 + ox, WY1); g.lineTo(WX0 - 100 + ox, WY1); g.closePath(); g.fill(); g.restore(); glow(g, 540 + ox, 300, 300, 'rgba(240,170,70,', 0.18); }, d: 0.36 },
        { sh: pave(), d: 0.5, lift: 0.6 },
        { fn: (g, ox) => {
          // the labels, slammed onto the glass
          const ko = pop(lt, T_ORD, 0.18), ka = pop(lt, T_ALSO, 0.18);
          if (ko > 0) put(g, label('ORDERED', K.ochre, K.ink, '92px "Anton-400"'), CAKE[0] + ox, 740, { sc: lerp(1.6, 1, Math.min(1, (lt - T_ORD) / 0.12)) * Math.min(1, ko + 0.3), rot: -0.07, lift: 2 });
          if (ka > 0) put(g, label('ALSO ORDERED?', K.card, K.ink, '54px "Anton-400"', 22), 330 + ox, 600, { sc: lerp(1.5, 1, Math.min(1, (lt - T_ALSO) / 0.12)), rot: 0.06, lift: 1.8 });
        }, d: 0.4 },
        { fn: (g, ox) => {
          // the head, turning a little toward the cake as the brackets land; the light on the strap
          const hx = 300 + ox + look * 30, hy = 1520;
          put(g, back(), hx, hy, { rot: look * 0.12, lift: 2.6 });
          g.save(); g.translate(hx, hy); g.rotate(look * 0.12);
          const on = lt > T_SNAP - 0.05 && lt < T_SNAP + 0.5 ? (Math.floor((lt - T_SNAP) * 10) % 2 === 0 ? 1 : 0.2) : (Math.floor(lt * 4) % 2 === 0 ? 1 : 0.25);
          ledAt(g, 168, -27, 15, on); g.restore();
        }, d: 0.9 },
      ], cam);
      RFP.leaves(c, lt + 5, { n: 9, seed: 21, cam });
      box(c);
    },
  };
})();
