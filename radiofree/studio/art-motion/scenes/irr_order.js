// Shot 1 · 0–6.4 s · The order. Brussels daylight: the Berlaymont behind its row of EU flags, and
// on the plaza a big Doodle search bar — a white frame round a glass field, the paper tape of
// everyone's searches running through it and out of its end into Doodle's cabinet (set up here,
// paid off in shot 6). The ring of stars lights one star at a time; an envelope drops out of it
// and lands on the bar: SHARE DATA.
SCENES['irr_order'] = (() => {
  const { W, sprite, stack, put, glow, ease, move, pop } = RFP, I = IRR, C = I.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, T_DROP = 1.55, T_LAND = 5.5 * B;
  const BX = 470, BY = 1330, BS = 0.98, RX = 540, RY = 840, RR = 168;
  const CAB = [898, 1745];
  const disc = () => sprite('irr_emblem', RR * 2 + 20, RR * 2 + 20, RR + 10, RR + 10, (g) => { g.fillStyle = C.euD; g.beginPath(); g.arc(0, 0, RR, 0, TAU); g.fill(); g.fillStyle = C.eu; g.beginPath(); g.arc(0, 0, RR - 9, 0, TAU); g.fill(); }, 10);
  const mark = () => sprite('irr_mark1', 340, 130, 170, 100, (g) => I.wordmark(g, 0, 0, 98), 6);
  const P_OUT = I.path(I.curve(I.barEnd(BX, BY, BS), [CAB[0] - 10, BY], [CAB[0], BY + 14], [CAB[0], CAB[1] - 322], 20));
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: move(lt, 0, DUR, 1.0, 1.06), fx: 540, fy: 1320 };
      const kd = pop(lt, 0.05, 0.4);
      // the envelope: out of the emblem, small, then swinging down and growing until it lands on the bar
      const ke = clamp((lt - T_DROP) / (T_LAND - T_DROP), 0, 1), fall = ke * ke;
      const ex = lerp(RX, 742, fall) + Math.sin(ke * Math.PI * 2.2) * 70 * (1 - ke), ey = lerp(RY, BY - 61 - 70, fall);
      const land = lt > T_LAND ? Math.exp(-(lt - T_LAND) * 7) * Math.cos((lt - T_LAND) * 22) : 0;
      const erot = lt < T_LAND ? Math.sin(ke * 9) * 0.35 * (1 - ke) - 0.05 : -0.05 + land * 0.06;
      const bump = lt > T_LAND ? Math.exp(-(lt - T_LAND) * 9) * Math.sin((lt - T_LAND) * 30) * 5 : 0;
      stack(c, [
        { sh: I.sky('a', 1350), d: 0.02, lift: 0 },
        { fn: (g, ox) => { put(g, I.cloud(1), 230 + ox + lt * 6, 1000, { lift: 0.3, alpha: 0.2 }); put(g, I.cloud(0.8), 900 + ox + lt * 4, 760, { lift: 0.3, alpha: 0.2, sc: 0.8 }); }, d: 0.03 },
        { sh: I.berlaymont(), d: 0.06, lift: 0.4 },
        { fn: (g, ox) => { for (let i = 0; i < 6; i++) I.euFlag(g, 150 + i * 104 + ox, 1600, 0.6, lt, i * 0.7); }, d: 0.08 },
        { sh: I.plaza('a', 1520), d: 0.12, lift: 0.3 },
        { fn: (g, ox) => {
          if (kd > 0) { g.save(); g.translate(RX + ox, RY); g.scale(kd, kd); put(g, disc(), 0, 0, { lift: 1.2 }); g.restore(); }
          I.ring(g, RX + ox, RY, RR * 0.7, 23, C.gold, (i) => pop(lt, 0.25 + i * 0.09, 0.3));
          if (lt > 0.25 + 11 * 0.09 && lt < 3) glow(g, RX + ox, RY, 260, 'rgba(255,220,110,', 0.25 * Math.sin(clamp((lt - 1.24) / 1.6, 0, 1) * Math.PI));
        }, d: 0.1 },
        { fn: (g, ox) => {
          g.fillStyle = C.steelDD; for (const px of [250, 690]) { g.fillRect(px - 9 + ox, BY + 40, 18, 290); g.fillStyle = C.steelD; g.fillRect(px - 9 + ox, BY + 40, 7, 290); g.fillStyle = C.steelDD; }
          g.save(); g.translate(ox, 0); I.tape(g, P_OUT, lt, { w: 33, speed: 108 }); g.restore();
          put(g, mark(), BX - 36 + ox, BY - 132, { lift: 1.1 });
          I.bar(g, BX + ox, BY + bump, BS, lt, { speed: 110 });
        }, d: 0.2 },
        { fn: (g, ox) => put(g, I.cabinet('s1', 232, 330, 2, 3, 120), CAB[0] + ox, CAB[1], { lift: 1.2 }), d: 0.2 },
        { fn: (g, ox) => { if (lt > T_DROP - 0.05) put(g, I.envelope(), ex + ox, ey + bump, { sc: lerp(0.22, 0.62, ease.out(ke)), rot: erot, lift: lerp(2.6, 1.1, ke) }); }, d: 0.24 },
        { fn: (g) => I.tag(g, 'EUROPEAN COMMISSION\nDIGITAL MARKETS ACT', lt, DUR), d: 0 },
      ], cam);
      I.box(c);
    },
  };
})();
