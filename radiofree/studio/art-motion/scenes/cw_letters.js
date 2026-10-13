// Shot 2 · 6.4–12.9 s · The invitations. The Speaker's desk from above, five envelopes on it.
// META turns over on its own: YES. Then a magenta SUBPOENA stamp thumps down, and DOODLE,
// OPENAI and — last — ANTHROPIC turn over: YES. SPACEXAI stays face down and goes dim.
SCENES['cw_letters'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move, pop } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_META = B, T_STAMP = 3 * B, ENV = [['META', 300, 860, B], ['DOODLE', 780, 860, 3 * B + 0.5], ['OPENAI', 300, 1150, 3 * B + 0.8], ['ANTHROPIC', 780, 1150, 3 * B + 1.6], ['SPACEXAI', 540, 1440, 99]];
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.6) * 8, y: 0, z: move(lt, T_STAMP, 0.8, 1.0, 1.03), fx: 540, fy: 1100 };
      stack(c, [
        { sh: sheet('cw_desk', (g) => { g.fillStyle = '#2e1e14'; g.fillRect(-90, -90, W + 180, H + 180); g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 3; for (let y = 40; y < H; y += 30) { g.beginPath(); g.moveTo(-90, y); g.bezierCurveTo(300, y + 10, 700, y - 10, W + 90, y + 4); g.stroke(); } }), d: 0.05, lift: 0 },
        { fn: (g, ox) => glow(g, 400 + ox, 900, 800, 'rgba(240,170,70,', 0.24), d: 0.05 },
        { fn: (g, ox) => {
          for (const [label, x, y, t] of ENV) {
            const f = clamp((lt - t) / 0.3, 0, 1), sx = Math.abs(Math.cos(f * Math.PI)), turned = f > 0.5;
            g.save(); g.translate(x + ox, y); g.scale(Math.max(0.04, sx), 1); if (label === 'SPACEXAI' && lt > 4.2) g.globalAlpha = lerp(1, 0.45, clamp((lt - 4.2) / 0.6, 0, 1));
            put(g, D.envelope(label, turned ? 'YES' : null), 0, 0, { rot: (x % 7 - 3) * 0.01, lift: 1.2 + Math.sin(f * Math.PI) * 2 }); g.restore();
          }
          const ks = pop(lt, T_STAMP, 0.16); if (ks > 0) put(g, D.stampMark('SUBPOENA', 540), 540 + ox, 650, { sc: lerp(1.5, 1, Math.min(ks, 1)), rot: -0.06, lift: 0.3 });
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
