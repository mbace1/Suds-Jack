// Shot 3 · 12.9–19.3 s · The bill. A desk in Copenhagen, candle-lit, the copper spire in the window.
// The bill slides onto the desk — tabled, literally: L 49 — and on the wall the calendar's pages tear
// away, October to January 2027, until the 1st; a red pencil circles it. A target date, not a result.
SCENES['sat_bill'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move } = RFP, S = SAT, C = S.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, T_BILL = B, CX = 740, CY = 760;
  const PAGES = [['OCTOBER', 2026, 8], ['NOVEMBER', 2026, 1], ['DECEMBER', 2026, 1], ['JANUARY', 2027, 1]];
  const TEAR = [3 * B, 3.75 * B, 4.5 * B], T_CIRCLE = 6 * B;
  const room = () => sheet('sat_study', (g) => {
    g.fillStyle = C.cream; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = 'rgba(140,104,56,.06)'; for (let y = -90; y < 1360; y += 60) g.fillRect(-90, y, W + 180, 2);
    // the window, and Christiansborg's spire in it
    g.fillStyle = C.beechD; g.fillRect(90, 620, 380, 560); g.fillStyle = C.sky3; g.fillRect(110, 640, 340, 520);
    g.fillStyle = C.sky1; g.fillRect(110, 640, 340, 200); g.fillStyle = C.sky2; g.fillRect(110, 840, 340, 140);
    g.fillStyle = C.copper; g.beginPath(); g.moveTo(268, 1160); g.lineTo(268, 900); g.bezierCurveTo(264, 870, 286, 866, 284, 840); g.lineTo(296, 840); g.bezierCurveTo(294, 866, 316, 870, 312, 900); g.lineTo(312, 1160); g.fill();
    g.beginPath(); g.moveTo(284, 840); g.lineTo(290, 740); g.lineTo(296, 840); g.fill(); g.fillStyle = C.brass; g.fillRect(286, 760, 8, 8);
    g.fillStyle = C.copperD; g.fillRect(110, 1060, 340, 100); g.fillStyle = C.stoneD; g.fillRect(110, 1080, 340, 80);
    g.fillStyle = C.beechL; g.fillRect(270, 640, 20, 520); g.fillRect(110, 890, 340, 18);
    g.fillStyle = C.beechD; g.fillRect(70, 1170, 420, 26);
    // the desk
    g.fillStyle = C.beechL; g.fillRect(-90, 1350, W + 180, 170); g.fillStyle = C.beech; g.fillRect(-90, 1350, W + 180, 8);
    g.fillStyle = 'rgba(140,104,56,.16)'; for (let k = 0; k < 9; k++) { g.beginPath(); for (let x = -90; x < W + 90; x += 30) g.lineTo(x, 1370 + k * 17 + Math.sin(x * 0.01 + k) * 3); g.lineTo(W + 90, 1372 + k * 17); g.lineTo(-90, 1372 + k * 17); g.fill(); }
    g.fillStyle = C.beechDD; g.fillRect(-90, 1520, W + 180, H); g.fillStyle = C.beechD; g.fillRect(-90, 1520, W + 180, 16);
  }, 12);
  const pencil = () => sprite('sat_pencil', 420, 60, 30, 30, (g) => { g.fillStyle = C.red; g.fillRect(40, -12, 300, 24); g.fillStyle = C.redD; g.fillRect(40, 2, 300, 10); g.fillStyle = '#e8d6a8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(40, -12); g.lineTo(40, 12); g.closePath(); g.fill(); g.fillStyle = C.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(14, -4); g.lineTo(14, 4); g.closePath(); g.fill(); g.fillStyle = C.brassD; g.fillRect(340, -12, 26, 24); }, 6);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 };
      const kb = ease.out(clamp((lt - (T_BILL - 0.4)) / 0.4, 0, 1)), slap = lt > T_BILL ? Math.exp(-(lt - T_BILL) * 9) * Math.sin((lt - T_BILL) * 30) : 0;
      const kz = ease.out(clamp((lt - 2.0) / 2.6, 0, 1));
      const shown = TEAR.filter((t) => lt >= t).length;
      c.save(); S.view(c, lerp(1.0, 1.1, kz), lerp(540, 600, kz), lerp(1250, 1180, kz), 540, lerp(1250, 1190, kz));
      stack(c, [
        { sh: room(), d: 0.08, lift: 0 },
        { fn: (g, ox) => glow(g, 280 + ox, 900, 380, 'rgba(255,220,160,', 0.25), d: 0.08 },
        { fn: (g, ox) => {
          // the calendar: the current page, and the torn ones flying off
          g.fillStyle = C.inkL; g.beginPath(); g.arc(CX + ox, CY - 6, 7, 0, TAU); g.fill();
          put(g, S.calPage(...PAGES[shown]), CX + ox, CY, { lift: 1.0 });
          if (lt >= T_CIRCLE) {
            const k = ease.out(clamp((lt - T_CIRCLE) / 0.55, 0, 1));
            g.save(); g.strokeStyle = C.red; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
            for (let a = 0; a <= k * TAU * 1.08; a += 0.05) g.lineTo(CX + ox + Math.cos(a - 1.9) * (118 + a * 3), CY + 268 + Math.sin(a - 1.9) * (138 + a * 2));
            g.stroke(); g.restore();
            if (k < 1) put(g, pencil(), CX + ox + Math.cos(k * TAU * 1.08 - 1.9) * 124, CY + 268 + Math.sin(k * TAU * 1.08 - 1.9) * 142, { rot: -0.7, lift: 2 });
          }
          TEAR.forEach((t, i) => { const a = lt - t; if (a < 0 || a > 0.9) return; put(g, S.calPage(...PAGES[i]), CX + ox + a * 520, CY - a * 380 + a * a * 600, { rot: a * 2.4, sc: 1 - a * 0.2, lift: 1.4 + a * 3, alpha: 0.4 }); });
        }, d: 0.12 },
        { fn: (g, ox) => {
          const x = lerp(-300, 360, kb), r = lerp(-0.5, -0.05, kb);
          g.save(); g.translate(x + ox, 1440 + slap * 4); g.scale(1, 0.78); put(g, S.bill(), 0, 0, { rot: r, sc: 0.78, lift: lerp(3, 0.6, kb) }); g.restore();
          S.candle(g, 880 + ox, 1440, lt, 0.85);
        }, d: 0.2 },
      ], cam);
      c.restore();
      S.tag(c, 'BILL L 49 · TABLED 8.10.2026', lt, DUR);
      S.box(c);
    },
  };
})();
