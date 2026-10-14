// Shot 1 · 0–6.4 s · The post. Night, a desk lamp, and a card on the dark: a post types
// itself out — "I resigned from Anthropic today. … Neither company is acting responsibly."
// The first and third sentences of the post, unaltered; the ellipsis marks what is left out.
SCENES['hp_post'] = (() => {
  const { K, W, H, sheet, stack, box, glow, ease, move } = RFP, D = HP, { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.05), fx: 540, fy: 1160 };
      const n = Math.floor(D.POSTLEN * clamp((lt - 0.5) / 2.6, 0, 1));
      stack(c, [
        { sh: sheet('hp_night', (g) => { g.fillStyle = '#16140f'; g.fillRect(-90, -90, W + 180, H + 180); g.fillStyle = '#211d16'; g.fillRect(-90, 1500, W + 180, H); }), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 180 + ox, 780, 800, 'rgba(240,170,70,', 0.34); g.fillStyle = 'rgba(255,230,180,.35)'; const r = U.rng(4); for (let i = 0; i < 24; i++) g.fillRect((r() * 900 + lt * 10 * r() + ox) % W, 700 + (r() * 900 + lt * 16 * r()) % 900, 3, 3); }, d: 0.05 },
        { fn: (g, ox) => { g.save(); g.translate(540 + ox, 1160 + Math.sin(lt * 1.1) * 8); g.rotate(Math.sin(lt * 0.7) * 0.012); g.scale(1.06, 1.06); D.post(g, 0, 0, n, lt); g.restore(); }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
