// Shot 1 · 0–6.4 s · City Hall. New York's City Hall at night, white against the dark — the
// cupola, its clock, Justice on top. The windows light one by one, the whole council coming in;
// on the beat a banner unrolls over the portico: COMMITTEE OF THE WHOLE · 5.10.2026.
SCENES['cw_hall'] = (() => {
  const { K, W, H, sprite, stack, box, dusk, put, glow, ease, move, leaves } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_BANNER = 3 * B, DY = 120;
  const banner = () => sprite('cw_banner', 640, 200, 320, 0, (g) => { g.fillStyle = K.ochre; g.fillRect(-300, 0, 600, 170); g.strokeStyle = K.ink; g.lineWidth = 4; g.strokeRect(-286, 14, 572, 142); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '56px "Anton-400"'; g.fillText('COMMITTEE OF THE WHOLE', 0, 86); g.font = '32px "ArchivoBlack-400"'; g.fillText('OCT 5, 2026 · ALL 51 MEMBERS', 0, 134); }, 10);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: move(lt, 0, 6.4, 1.0, 1.08), fx: 540, fy: 1200 };
      const n = clamp(Math.floor((lt - 0.3) / 0.16), 0, 12), kb = ease.out(clamp((lt - T_BANNER) / 0.5, 0, 1));
      stack(c, [
        { sh: dusk('cw', 1300), d: 0.04, lift: 0 },
        { fn: (g, ox) => glow(g, 540 + ox, 900 + DY, 700, 'rgba(240,170,70,', 0.16), d: 0.04 },
        { sh: D.hall(), d: 0.15, lift: 0.8, y: DY },
        { fn: (g, ox) => { g.save(); g.translate(0, DY); D.windows(g, n, ox); for (let i = 0; i < n; i++) glow(g, [30, 120, 210, 870, 960, 1050][i % 6] + ox, i < 6 ? 1180 : 1350, 70, 'rgba(240,170,70,', 0.25); g.restore(); }, d: 0.15 },
        { fn: () => leaves(c, lt + 4, { n: 6, seed: 51, cam }), d: 0 },   // the leaves fall behind the banner
        { fn: (g, ox) => { if (kb > 0) { g.save(); g.translate(540 + ox, 1050 + DY); g.scale(1, kb); put(g, banner(), 0, 0, { lift: 1.6 }); g.restore(); } }, d: 0.2 },
        { fn: (g, ox) => { for (let i = 0; i < 5; i++) { const k = clamp((lt - 2.6 - i * 0.45) / 2.4, 0, 1); if (k <= 0 || k >= 1) continue; RFP.walker(g, lerp(380 + i * 70, 540, k) + ox, lerp(1690, 1450, k) + DY * 0.3, lerp(0.2, 0.12, k), { coat: ['#2e3236', '#3a3530', '#2a2f2c'][i % 3], scarf: K.ochre, t: lt + i, step: Math.sin(lt * 8 + i), led: false, lift: 0.6 }); } }, d: 0.22 },   // members climbing the steps
        { fn: (g, ox) => { for (const x of [130, 950]) { g.fillStyle = '#15120f'; g.fillRect(x - 5 + ox, 1440, 10, 300); g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(x + ox, 1430, 16, 0, Math.PI * 2); g.fill(); glow(g, x + ox, 1430, 160, 'rgba(255,214,140,', 0.4); } }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
