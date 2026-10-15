// Shot 2 · 6.4–12.9 s · The court. Luxembourg: the Court of Justice of the EU — its twin gold towers,
// the golden ring on its pilotis, the white steps, an EU flag and Luxembourg's. Doodle's briefcase
// (charcoal, the four-colour band) hops up the steps one at a time; at the top a speech card rises
// out of it with Doodle's reported words: "IRREVERSIBLE HARM" (in quote marks — they are its words).
SCENES['irr_court'] = (() => {
  const { W, sprite, stack, put, glow, ease, move, pop } = RFP, I = IRR, C = I.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, T_H0 = 0.54, HOP = B / 2, N = 9, T_TOP = T_H0 + (N - 1) * HOP + 0.24, T_CARD = 6 * B;
  const CX0 = 880, CX1 = 720, CW = 520, CH = 470;
  // the card: Doodle's words on white, its four colours along the foot
  const card = () => sprite('irr_harm', CW + 20, CH + 20, CW / 2 + 10, 10, (g) => {
    g.fillStyle = '#ffffff'; I.rr(g, -CW / 2, 0, CW, CH, 14);
    I.stripe(g, -CW / 2, CH - 40, CW, 40, true);
    g.fillStyle = '#ffffff'; g.fillRect(-CW / 2, CH - 52, CW, 12);
    g.fillStyle = C.ink; g.textAlign = 'center';
    let fs = 120; const fit = (s) => { g.font = fs + 'px "Anton-400"'; while (g.measureText(s).width > CW - 70 && fs > 40) g.font = --fs + 'px "Anton-400"'; };
    fit('“IRREVERSIBLE'); const f1 = fs; g.fillText('“IRREVERSIBLE', 0, 70 + f1 * 0.9);
    g.font = '150px "Anton-400"'; g.fillText('HARM”', 0, 70 + f1 * 0.9 + 190);
  }, 10);
  const level = (k) => (k < 0 ? 1830 : I.stepY(k));
  function casePos(lt) {
    for (let i = N - 1; i >= -1; i--) {
      const ts = T_H0 + i * HOP; if (i >= 0 && lt < ts) continue;
      if (i < 0) return { x: CX0, y: level(-1), sq: 0 };
      const u = clamp((lt - ts) / 0.24, 0, 1), y0 = level(i - 1), y1 = level(i), k = (i + u) / N;
      const sq = u >= 1 ? Math.exp(-(lt - ts - 0.24) * 14) : 0;
      return { x: lerp(CX0, CX1, k), y: lerp(y0, y1, u) - Math.sin(u * Math.PI) * 46, sq };
    }
    return { x: CX0, y: level(-1), sq: 0 };
  }
  function luxFlag(g, x, y, t) {
    g.fillStyle = C.steelDD; g.fillRect(x - 3, y - 300, 6, 300); g.fillStyle = C.gold; g.beginPath(); g.arc(x, y - 304, 7, 0, TAU); g.fill();
    for (let i = 0; i < 12; i++) { const u = i / 12, off = Math.sin(u * 5 - t * 4 + 1.3) * 6 * u; [['#ed2939', 0], ['#ffffff', 27], ['#00a1de', 54]].forEach(([col, dy]) => { g.fillStyle = col; g.fillRect(x + 3 + u * 120, y - 296 + dy + off, 120 / 12 + 0.8, 28); }); }
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.45) * 12, y: 0, z: move(lt, 0, DUR, 1.0, 1.05), fx: 640, fy: 1300 };
      const p = casePos(lt), s = lerp(1.18, 1.0, clamp((p.x - CX0) / (CX1 - CX0), 0, 1));
      const kc = ease.out(clamp((lt - T_CARD) / 0.8, 0, 1)), sway = lt > T_CARD + 0.8 ? Math.sin((lt - T_CARD - 0.8) * 2.2) * 0.012 : 0;
      const caseTop = p.y - 190 * s;
      stack(c, [
        { sh: I.sky('b', 1300), d: 0.02, lift: 0 },
        { fn: (g, ox) => { put(g, I.cloud(1), 760 + ox - lt * 5, 860, { lift: 0.3, alpha: 0.2 }); put(g, I.cloud(0.7), 420 + ox - lt * 3, 680, { lift: 0.3, alpha: 0.2, sc: 0.7 }); }, d: 0.03 },
        { sh: I.court(), d: 0.1, lift: 0.7 },
        { fn: (g, ox) => { glow(g, 280 + ox, 900, 260, 'rgba(255,226,140,', 0.18); }, d: 0.1 },
        { fn: (g, ox) => { I.euFlag(g, 120 + ox, 1460, 0.8, lt, 0); luxFlag(g, 955 + ox, 1460, lt); }, d: 0.14 },
        { fn: (g, ox) => {
          if (kc > 0) {   // the card rising out of the case, clipped at the case's mouth
            g.save(); g.beginPath(); g.rect(CX1 - CW / 2 - 40 + ox, 0, CW + 80, caseTop + 26); g.clip();
            put(g, card(), CX1 + ox, caseTop + 26 - CH * kc, { rot: sway, lift: 1.5 });
            g.restore();
          }
          g.save(); g.translate(p.x + ox, p.y); g.scale(s * (1 + p.sq * 0.08), s * (1 - p.sq * 0.1)); put(g, I.briefcase(), 0, 0, { lift: 1.2 }); g.restore();
        }, d: 0.18 },
        { fn: (g) => I.tag(g, 'EU GENERAL COURT · LUXEMBOURG', lt, DUR), d: 0 },
      ], cam);
      I.box(c);
    },
  };
})();
