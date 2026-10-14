// Shot 4 · 19.3–25.7 s · Congress. The U.S. Capitol at dusk, its windows lit; they go out one by
// one; a tally lands in the sky above the dome: 54%.
SCENES['hp_capitol'] = (() => {
  const { K, W, H, stack, box, dusk, put, glow, ease, move, pop, leaves } = RFP, D = HP, { clamp, lerp } = U;
  const DY = 60;
  const tally = () => RFP.sprite('hp_54', 420, 220, 210, 110, (g) => { g.strokeStyle = K.mag; g.lineWidth = 10; g.strokeRect(-190, -90, 380, 180); g.fillStyle = K.mag; g.font = '150px "Anton-400"'; g.textAlign = 'center'; g.fillText('54%', 0, 56); }, 3);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.06), fx: 540, fy: 1200 };
      const dark = Math.floor(clamp((lt - 0.8) * 7, 0, 99)), order = (i) => (i * 7) % D.CAPWIN.length;
      stack(c, [
        { sh: dusk('hp', 1300), d: 0.04, lift: 0 },
        { sh: D.capitol(), d: 0.15, lift: 0.8, y: DY },
        { fn: (g, ox) => { g.save(); g.translate(0, DY); D.capWindows(g, (i) => order(i) >= dark, ox); g.restore(); }, d: 0.15 },
        { fn: (g, ox) => { if (lt < 4.4) { g.fillStyle = '#ffe2a0'; g.fillRect(532 + ox, 785 + DY, 16, 22); glow(g, 540 + ox, 796 + DY, 60, 'rgba(255,214,140,', 0.5); } }, d: 0.15 },
        { fn: (g, ox) => { const kt = pop(lt, 1.6, 0.2); if (kt > 0) put(g, tally(), 540 + ox, 670, { sc: lerp(1.5, 0.9, Math.min(kt, 1)), rot: -0.05, lift: 0.4 }); }, d: 0.2 },
      ], cam);
      leaves(c, lt + 6, { n: 6, seed: 61, cam });
      box(c);
    },
  };
})();
