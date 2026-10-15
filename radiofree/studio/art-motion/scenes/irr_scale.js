// Shot 5 · 25.7–32.1 s · Both sides. In the court, between two white marble columns on an EU-blue
// wall, two speech cards face off: Doodle's (its four colours, its wordmark) slides in from the left,
// then the EU's (blue, the ring of stars) from the right, and they lean in at each other by turns —
// the case is not decided. No padlock here, and no balance scale (final review: Satire Excepted uses
// one in the same shot, and the films should not look alike).
SCENES['irr_scale'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move } = RFP, I = IRR, C = I.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, PX = 540, PY = 1000, ARM = 300, HANG = 360, T1 = 2 * B, T2 = 6 * B, FALL = 0.42;
  const room = () => sheet('irr_courtroom', (g) => {
    g.fillStyle = C.eu; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.euL; for (let x = 240; x < 860; x += 120) g.fillRect(x, -90, 60, 1720);   // the wall's panels
    for (const x0 of [-30, 870]) {   // two marble columns
      g.fillStyle = C.marbleD; g.fillRect(x0, -90, 240, 1720);
      g.fillStyle = C.marble; g.fillRect(x0 + 14, -90, 212, 1720);
      g.fillStyle = 'rgba(120,110,95,.14)'; for (let k = 0; k < 5; k++) g.fillRect(x0 + 34 + k * 40, -90, 10, 1720);   // flutes
      g.fillStyle = C.marbleL; g.fillRect(x0 - 16, 1560, 272, 60);
    }
    g.fillStyle = C.marbleD; g.fillRect(-90, 1620, W + 180, H); g.fillStyle = C.marble; g.fillRect(-90, 1634, W + 180, H);
    g.fillStyle = 'rgba(120,110,95,.12)'; for (let y = 1680; y < H + 90; y += 70) g.fillRect(-90, y, W + 180, 3);
  }, 12);
  function beamAngle(lt) {   // positive: the left side down
    const a1 = (t) => 0.2 * (1 - Math.exp(-t * 5) * Math.cos(t * 9));
    if (lt < T1) return 0;
    if (lt < T2) return a1(lt - T1);
    const t = lt - T2, a0 = a1(T2 - T1);
    return a0 * Math.exp(-t * 1.4) * Math.cos(t * 5.2) + 0.012 * Math.sin(lt * 1.9) * (1 - Math.exp(-t * 1.4));
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.55) * 10, y: 0, z: move(lt, 0, DUR, 1.0, 1.05), fx: PX, fy: 1250 };
      stack(c, [
        { sh: room(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, PX + ox, 1050, 650, 'rgba(255,236,170,', 0.22); I.ring(g, PX + ox, 790, 116, 17, 'rgba(244,196,48,.55)'); }, d: 0.05 },
        { fn: (g, ox) => {
          // after both have arrived they take turns leaning in, as if each were speaking
          const talk = (side) => (lt > T2 + 0.3 ? Math.max(0, Math.sin((lt - T2) * 3.3 + (side < 0 ? 0 : Math.PI))) * 26 : 0);
          for (const side of [-1, 1]) {
            const t0 = side < 0 ? T1 : T2, k = ease.out(clamp((lt - (t0 - 0.45)) / 0.45, 0, 1));
            if (k <= 0) continue;
            const home = side < 0 ? 330 : 750, from = side < 0 ? -320 : 1400;
            const x = lerp(from, home, k) - side * talk(side), y = 1150 + (side < 0 ? -40 : 40);
            const card = side < 0 ? I.doodleCard(380, 262, -1) : I.euCard(380, 262, 1);
            const wob = k < 1 ? 0 : (lt > t0 ? Math.exp(-(lt - t0) * 6) * Math.sin((lt - t0) * 24) * 0.05 : 0);
            put(g, card, x + ox, y, { rot: (side < 0 ? 0.05 : -0.05) + wob - side * talk(side) * 0.002, lift: 1.6 });
          }
        }, d: 0.25 },
      ], cam);
      I.box(c);
    },
  };
})();
