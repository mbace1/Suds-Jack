// Shot 5 · 25.7–32.1 s · Who decides. A brass balance on a beech courtroom table. A laughing card face
// drops into the left pan; a hurt one — a plaster, a tear — into the right, tagged MISLEADS. The beam
// never settles: a court would weigh each case. (Plain card faces, not theatre's comedy and tragedy.)
SCENES['sat_scale'] = (() => {
  const { W, H, sheet, stack, put, glow, ease, move } = RFP, S = SAT, C = S.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, PX = 540, PY = 980, ARM = 290, HANG = 380, T1 = B, T2 = 2 * B, FALL = 0.38;
  const court = () => sheet('sat_court', (g) => {
    g.fillStyle = C.cream; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.beech; g.fillRect(-90, 900, W + 180, 800);
    g.fillStyle = C.beechD; for (let x = -60; x < W + 90; x += 180) { g.fillRect(x, 940, 150, 6); g.fillRect(x, 940, 6, 640); g.fillRect(x + 144, 940, 6, 640); g.fillRect(x, 1574, 150, 6); }
    g.fillStyle = C.beechL; g.fillRect(-90, 892, W + 180, 14);
    // two tall windows of warm light above the panelling
    for (const x of [130, 790]) { g.fillStyle = C.beechD; g.fillRect(x - 10, 300, 180, 560); g.fillStyle = C.sky4; g.fillRect(x, 310, 160, 540); g.fillStyle = C.beechL; g.fillRect(x + 74, 310, 12, 540); g.fillRect(x, 560, 160, 12); }
    // the bench's red dossal behind the scale
    g.fillStyle = C.redD; g.fillRect(380, 290, 320, 610);
    g.fillStyle = C.red; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(392 + k * 62, 290); g.quadraticCurveTo(380 + k * 62, 600, 392 + k * 62, 900); g.lineTo(436 + k * 62, 900); g.quadraticCurveTo(424 + k * 62, 600, 436 + k * 62, 290); g.fill(); }
    g.fillStyle = C.brass; g.fillRect(370, 280, 340, 16);
    g.fillStyle = C.beechDD; g.fillRect(-90, 1640, W + 180, H); g.fillStyle = C.beechD; g.fillRect(-90, 1640, W + 180, 18);   // the table
  }, 12);
  return {
    draw(c, lt) {
      // the beam: level, tipped left by the laugh, back right by the hurt, then see-sawing without end
      const d1 = clamp((lt - (T1 - FALL)) / FALL, 0, 1), d2 = clamp((lt - (T2 - FALL)) / FALL, 0, 1);
      let th = 0;
      if (lt >= T1) th = 0.2 * (1 - Math.exp(-(lt - T1) * 6));
      if (lt >= T2) th = 0.2 * Math.exp(-(lt - T2) * 0.6) * Math.cos((lt - T2) * 3.4) * 0.9 + 0.11 * Math.sin((lt - T2) * 2.3) * (1 - Math.exp(-(lt - T2) * 0.8));
      const cam = { x: Math.sin(lt * 0.55) * 10, y: 0, z: move(lt, 0, DUR, 1.0, 1.06), fx: PX, fy: 1250 };
      const settle = (t0) => (lt > t0 ? Math.exp(-(lt - t0) * 6) * Math.sin((lt - t0) * 24) * 0.05 : 0);
      stack(c, [
        { sh: court(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 210 + ox, 580, 320, 'rgba(255,230,180,', 0.3); glow(g, 870 + ox, 580, 320, 'rgba(255,230,180,', 0.3); }, d: 0.05 },
        { fn: (g, ox) => S.candle(g, 140 + ox, 1652, lt, 0.8), d: 0.12 },
        { fn: (g, ox) => {
          put(g, S.scalePost(680), PX + ox, 1660, { lift: 1.0 });
          S.balance(g, PX + ox, PY, ARM, HANG, th, (side, x, y) => {
            const d = side < 0 ? d1 : d2; if (d <= 0) return;
            const yy = lerp(-500, y - 98, d * d);
            put(g, S.face(side < 0 ? 'laugh' : 'hurt'), x, yy, { sc: 0.82, rot: (side < 0 ? -0.05 : 0.06) + (d < 1 ? Math.sin(d * 7) * 0.2 * (1 - d) : settle(side < 0 ? T1 : T2)), lift: 1.6 + (1 - d) * 2 });
          }, 290);
          // the hurt face's tag, hanging from its pan
          if (d2 > 0.99) { const Rx = PX + ARM * Math.cos(th) + ox, Ry = PY - ARM * Math.sin(th) + HANG; g.save(); g.translate(Rx + 80, Ry + 44); g.rotate(Math.sin(lt * 2.1) * 0.06); put(g, S.label('MISLEADS', 230, C.white, C.redD), 0, 0, { lift: 1.3 }); g.restore(); }
        }, d: 0.25 },
      ], cam);
      S.box(c);
    },
  };
})();
