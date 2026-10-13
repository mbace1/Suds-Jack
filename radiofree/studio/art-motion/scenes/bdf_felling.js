// Shot 2 · 3.2–6.4 s · The felling. The forest from the side; a harvester with a lit
// cab and the red light works along the front row from right to left. On each beat a
// big spruce tips over and lies down with its shadow, a burst of sawdust at its foot;
// behind it the middle row goes over in a wave as the machine passes. A card counter
// at the top climbs in hectares: 66 a tree, 330 by the end — the figure reported for
// Muhos alone.
SCENES['bdf_felling'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, ledAt } = RFP, { C, row, mist, tree, harvester } = BDF, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, GROUND = 1660;
  const FRONT = [[930, 1], [760, 2], [590, 3], [420, 4], [250, 5]].map(([x, k]) => ({ x, t: k * B, h: 860 + (k % 2) * 80 }));
  const MID = Array.from({ length: 13 }, (_, i) => ({ x: 1120 - i * 92 + (i * 37 % 30), h: 470 + (i * 53 % 90) }));
  const fallAng = (lt, t0) => { if (lt < t0) return 0; const k = clamp((lt - t0) / 0.36, 0, 1), a = k * k * (Math.PI / 2 - 0.04); return a + (k >= 1 ? Math.sin((lt - t0 - 0.36) * 20) * Math.exp(-(lt - t0 - 0.36) * 8) * 0.05 : 0); };
  return {
    draw(c, lt) {
      const hx = lerp(1180, 120, clamp(lt / 3.0, 0, 1));
      const cam = { x: lerp(30, -30, lt / 3.2), y: 0, z: 1 };
      const fallen = FRONT.filter((f) => lt >= f.t + 0.3).length;
      stack(c, [
        { sh: dusk('bdf', 900), d: 0.04, lift: 0 },
        { sh: row('far', 1000, 20, 340, C.far, null, 3), d: 0.12, lift: 0.5 },
        { sh: mist('m1', 960, 90, 2), d: 0.16, lift: 0.2, alpha: 0.2 },
        { sh: sheet('bdf_flat', (g) => { g.fillStyle = C.ground; g.fillRect(-90, 1180, W + 180, H); }), d: 0.25, lift: 0.4 },
        { fn: (g, ox) => {
          // the middle row goes over in a wave behind the machine
          for (const [i, m] of MID.entries()) { const tf = (1180 - m.x) / (1180 - 120) * 3.0 + 0.1; put(g, tree(m.h, C.mid, 40 + i), m.x + ox, 1200, { rot: fallAng(lt, tf) * 0.98, lift: 0.9 }); }
        }, d: 0.3 },
        { sh: sheet('bdf_near_ground', (g) => { g.fillStyle = '#19150f'; g.fillRect(-90, GROUND - 10, W + 180, H); }), d: 0.55, lift: 0.8 },
        { fn: (g, ox) => {
          // the front row, and the harvester working along it
          for (const [i, f] of FRONT.entries()) put(g, tree(f.h, C.near, 70 + i), f.x + ox, GROUND, { rot: fallAng(lt, f.t), lift: 2 });
          put(g, harvester(), hx + 120 + ox, GROUND + 6, { sc: 0.8, lift: 2.2 });
          ledAt(g, hx + 120 + ox + 26, GROUND + 6 - 330 * 0.8 + 6, 11, Math.floor(lt * 4) % 2 === 0 ? 1 : 0.3);
          glow(g, hx + 120 + ox, GROUND - 210, 220, 'rgba(240,170,70,', 0.25);
          // sawdust at the foot of each tree as it goes
          for (const f of FRONT) { const q = lt - f.t; if (q < 0 || q > 0.6) continue; const r = U.rng(f.x); g.fillStyle = K.ochre; for (let k = 0; k < 18; k++) { const a = -Math.PI * r(), sp = 120 + r() * 260; g.fillRect(f.x + ox + Math.cos(a) * sp * q, GROUND - 20 + Math.sin(a) * sp * q + 300 * q * q, 6, 4); } }
        }, d: 0.6 },
      ], cam);
      // the counter: card, top centre, climbing a tree at a time
      const ha = 66 * fallen;
      c.save(); c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 18; c.shadowOffsetX = 10; c.shadowOffsetY = 14;
      c.fillStyle = K.ochre; c.beginPath(); c.roundRect(300, 170, 480, 170, 12); c.fill(); c.restore();
      c.fillStyle = K.ink; c.font = '120px "Anton-400"'; c.textAlign = 'right'; c.fillText(String(ha), 610, 305); c.textAlign = 'left'; c.font = '64px "Anton-400"'; c.fillText('HA', 640, 300);
      c.font = '24px "RobotoCondensed"'; c.fillText('MUHOS · FELLED', 320, 205);
      box(c);
    },
  };
})();
