// Shot 1 · The question. A US city at night in card, every district lit: the banks, the mast that carries the
// internet, the power station, the water tower. On the pole in front, a tear-off calendar sheds a page a month, a
// year of them gone by the time the question lands ("getting ready?"): OCT 2026 to OCT 2027.
SCENES['dy_city'] = (() => {
  const { stack, box } = RFP, D = DY, ID = 'dy_city', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tF = D.at(ID, 'flip', 0.6), tR = D.at(ID, 'ready', 4.5), dur = D.dur(ID);
      const k = clamp((lt - tF) / Math.max(0.6, dur - 1.4 - tF), 0, 1) * 12;                   // a page a month, a year gone by the cut
      const cam = { x: Math.sin(lt * 0.35) * 8, y: 0, z: D.punch(lt, [tR]) * lerp(1.0, 1.05, D.ease.io(lt / dur)), fx: 540, fy: 1060 };
      stack(c, [
        { sh: D.night(), d: 0.03, lift: 0 },
        { sh: D.city(), d: 0.08, lift: 0.8 },
        { fn: (g, ox) => D.lights(g, [1, 1, 1, 1], lt, ox), d: 0.08 },
        { sh: D.pole(), d: 0.3, lift: 1.4 },
        { fn: (g, ox) => D.calendar(g, 187 + ox, 760, k, lt), d: 0.3 },
      ], cam);
      CW.tag(c, D.ui('dateline', 'AXIOS · 9.10.2026 · REPORTEDLY'), lt, dur);
      box(c);
    },
  };
})();
