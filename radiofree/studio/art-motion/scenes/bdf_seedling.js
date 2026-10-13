// Shot 5 · 12.8–15.0 s · The replanting. Close on one seedling going into bare
// ground beside a masked planter; the camera pulls back and back: the planter is small, the clearing
// runs to the horizon in rows of stumps, and where the forest stood the data hall
// glows, its row of red lights blinking. Two tallies land — CUT 330 HA, PLANTED
// 130 HA — and then the line the film ends on: IMPACT ASSESSMENT PENDING.
SCENES['bdf_seedling'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, walker, ledAt } = RFP, { C, row, mist, stump, tree } = BDF, TAU = Math.PI * 2, { clamp, lerp } = U;
  const T_SET = 13.7 - 12.857, T_TALLY = 13.9 - 12.857, T_LINE = 14.2 - 12.857, SX = 560, SY = 1600;
  const hall = () => sheet('bdf_hall', (g) => {
    g.fillStyle = C.hall; g.fillRect(80, 900, 920, 150); g.fillRect(260, 860, 240, 40); g.fillRect(620, 870, 200, 30);
    g.fillStyle = K.ochre; for (let i = 0; i < 18; i++) g.fillRect(110 + i * 49, 950, 26, 14);
    g.fillStyle = '#3a3e40'; for (let i = 0; i < 6; i++) g.fillRect(140 + i * 140, 840, 50, 60);   // the cooling stacks
  }, 10);
  const seedling = () => sprite('bdf_seedling', 120, 160, 60, 150, (g) => BDF.spruceShape(g, 130, '#2f5a3e', '#4f7a5a', 3), 4);
  function tally(c, x, y, text, col, k, rot) {
    if (k <= 0) return; c.save(); c.translate(x, y); c.rotate(rot); c.scale(lerp(1.5, 1, ease.out(k)), lerp(1.5, 1, ease.out(k))); c.globalAlpha = clamp(k * 3, 0, 1);
    c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 16; c.shadowOffsetX = 8; c.shadowOffsetY = 12; c.font = '70px "Anton-400"'; const tw = c.measureText(text).width;
    c.fillStyle = K.card; c.fillRect(-tw / 2 - 30, -62, tw + 60, 96); c.shadowColor = 'transparent'; c.fillStyle = col; c.textAlign = 'center'; c.fillText(text, 0, 12); c.restore();
  }
  return {
    draw(c, lt) {
      // the pull: from the seedling to the whole clearing
      const z = move(lt, 0.15, 1.2, 5, 1);
      const cam = { x: lt > 1.3 ? (lt - 1.3) * 20 : 0, y: 0, z, fx: SX, fy: SY - 60 };
      stack(c, [
        { sh: dusk('bdf', 900), d: 0.05, lift: 0 },
        { sh: row('edge', 1000, 7, 260, C.far, null, 23, -80, 260), d: 0.12, lift: 0.4 },
        { sh: hall(), d: 0.16, lift: 0.8 },
        { fn: (g) => { glow(g, 540, 960, 560, 'rgba(240,170,70,', 0.22); for (let i = 0; i < 9; i++) ledAt(g, 130 + i * 105, 890, 7, Math.floor(lt * 4 + i * 0.5) % 2 === 0 ? 1 : 0.2); }, d: 0.16 },
        { sh: mist('m1', 1010, 70, 9), d: 0.2, lift: 0.2, alpha: 0.16 },
        { sh: sheet('bdf_clear2', (g) => { g.fillStyle = '#231d16'; g.fillRect(-90, 1050, W + 180, H); }), d: 0.25, lift: 0.3 },
        { fn: (g) => { for (let rI = 0; rI < 9; rI++) { const y = 1080 + rI * rI * 10 + rI * 30, s = 0.25 + rI * 0.16; for (let i = 0; i < 9 + (8 - rI); i++) put(g, stump(Math.round(s * 10) / 10), ((i + (rI % 2) * 0.5) / (9 + (8 - rI))) * (W + 200) - 100, y, { lift: 0.3 + s * 0.5 }); } }, d: 0.3 },
        { fn: (g) => {
          // the planter, kneeling: a crouched coat and the mask, at the seedling's side
          walker(g, SX - 170, SY - 40, 0.62, { coat: '#2b3a30', scarf: K.rust, t: lt, tilt: 0.12, led: true, lift: 1.4 });
          const k = ease.out(clamp(lt / T_SET, 0, 1)); put(g, seedling(), SX, lerp(SY - 160, SY, k), { lift: 1 + (1 - k) * 2 });
        }, d: 0.4 },
      ], cam);
      RFP.leaves(c, lt + 13, { n: 9, seed: 81, cam });
      tally(c, 330, 330, 'CUT 330 HA', K.ink, (lt - T_TALLY) / 0.16, -0.05);
      tally(c, 740, 470, 'PLANTED 130 HA', '#2f5a3e', (lt - T_TALLY - 0.15) / 0.16, 0.04);
      if (lt > T_LINE) { const k = clamp((lt - T_LINE) / 0.2, 0, 1); c.save(); c.globalAlpha = k; c.fillStyle = K.mag; c.font = '64px "Anton-400"'; c.textAlign = 'center'; c.fillText('IMPACT ASSESSMENT', 540, 640 + (1 - k) * 20); c.fillText('PENDING', 540, 716 + (1 - k) * 20); c.restore(); }
      box(c);
    },
  };
})();
