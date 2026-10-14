// Shot 1 · 0–6.4 s · City Hall. New York's City Hall at dusk, as it is: the long balustraded
// front, the two-storey portico, the clock stage and colonnaded cupola with gilt Justice on top —
// and lower Manhattan behind it (One World Trade Center, the Woolworth Building, the Municipal
// Building), so nobody wonders which city. A yellow cab crosses; the windows light one by one,
// the whole council coming in; on the beat a banner unrolls over the portico.
SCENES['cw_hall'] = (() => {
  const { K, W, H, sprite, stack, box, dusk, put, glow, ease, move, leaves } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_BANNER = 3 * B, DUR = 12 * B;
  const banner = () => sprite('cw_banner', 640, 200, 320, 0, (g) => { g.fillStyle = K.ochre; g.fillRect(-300, 0, 600, 170); g.strokeStyle = K.ink; g.lineWidth = 4; g.strokeRect(-286, 14, 572, 142); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '56px "Anton-400"'; g.fillText('COMMITTEE OF THE WHOLE', 0, 86); g.font = '32px "ArchivoBlack-400"'; g.fillText('OCT 5, 2026 · ALL 51 MEMBERS', 0, 134); }, 10);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: move(lt, 0, 6.4, 1.0, 1.08), fx: 540, fy: 1200 };
      const n = clamp(Math.floor((lt - 0.3) / 0.16), 0, 12), kb = ease.out(clamp((lt - T_BANNER) / 0.5, 0, 1));
      const kt = clamp((lt - 0.3) / 2.6, 0, 1);
      stack(c, [
        { sh: dusk('cw', 1300), d: 0.02, lift: 0 },
        { sh: D.skyline(), d: 0.05, lift: 0.4 },
        { fn: (g, ox) => { glow(g, 240 + ox, 340, 90, 'rgba(240,190,110,', 0.22); glow(g, 930 + ox, 400, 70, 'rgba(240,190,110,', 0.2); }, d: 0.05 },   // the floodlit crowns
        { fn: (g, ox) => glow(g, 540 + ox, 1000, 700, 'rgba(240,170,70,', 0.14), d: 0.08 },
        { sh: D.hall(), d: 0.15, lift: 0.8 },
        { fn: (g, ox) => { D.windows(g, n, ox); for (let i = 0; i < n; i++) { const [x, y] = [[200, 1200], [260, 1200], [820, 1200], [880, 1200], [140, 1200], [940, 1200], [200, 1400], [260, 1400], [820, 1400], [880, 1400], [140, 1400], [940, 1400]][i]; glow(g, x + ox, y + 60, 70, 'rgba(240,170,70,', 0.22); } glow(g, 540 + ox, 600, 50, 'rgba(255,214,140,', 0.35); }, d: 0.15 },
        { fn: () => leaves(c, lt + 4, { n: 6, seed: 51, cam }), d: 0 },   // the leaves fall behind the banner
        { fn: (g, ox) => { if (kb > 0) { g.save(); g.translate(540 + ox, 1150); g.scale(1, kb); put(g, banner(), 0, 0, { lift: 1.6 }); g.restore(); } }, d: 0.2 },
        { fn: (g, ox) => { for (let i = 0; i < 5; i++) { const k = clamp((lt - 2.6 - i * 0.45) / 2.4, 0, 1); if (k <= 0 || k >= 1) continue; RFP.walker(g, lerp(820 - i * 40, 560, k) + ox, lerp(1800, 1590, k), lerp(0.2, 0.13, k), { coat: ['#2e3236', '#3a3530', '#2a2f2c'][i % 3], scarf: K.ochre, t: lt + i, step: Math.sin(lt * 8 + i), led: false, lift: 0.6 }); } }, d: 0.22 },   // members climbing the steps
        { fn: (g, ox) => { for (const x of [110, 970]) { g.fillStyle = '#15120f'; g.fillRect(x - 5 + ox, 1520, 10, 300); g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(x + ox, 1510, 16, 0, Math.PI * 2); g.fill(); glow(g, x + ox, 1510, 160, 'rgba(255,214,140,', 0.4); } }, d: 0.3 },
        { fn: (g, ox) => { if (kt <= 0 || kt >= 1) return; const x = lerp(1260, -200, kt * kt * (3 - 2 * kt)) + ox; put(g, D.taxi(), x, 1850, { lift: 1.2 }); glow(g, x - 140, 1820, 70, 'rgba(255,230,170,', 0.35); }, d: 0.35 },   // a yellow cab crosses the foreground
        { fn: (g) => D.tag(g, 'CITY HALL · NEW YORK', lt, DUR), d: 0 },
      ], cam);
      box(c);
    },
  };
})();
