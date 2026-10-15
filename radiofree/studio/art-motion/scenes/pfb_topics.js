// Shot 3 · 12.9–19.3 s · Everything except AI. Over the wall, word-cards slap down one at a time, each
// lighting the screens it names: IMMIGRATION, HEALTH CARE, THE PRESIDENT — the topics NBC News
// names (ads about "Immigration and Customs Enforcement, President Donald Trump, health care and
// more") — then AND MORE, and the whole wall lights. Except the seven chips: they stay dark.
SCENES['pfb_topics'] = (() => {
  const { stack, put, ease } = RFP, F = PFB, { clamp, lerp } = U, C = F.C;
  const DUR = 12 * 60 / 112, B = 60 / 112;
  const CARDS = [['IMMIGRATION', 'imm'], ['HEALTH CARE', 'health'], ['THE PRESIDENT', 'pres'], ['AND MORE', 'all']];
  const T = CARDS.map((_, i) => 0.55 + i * 2 * B), CY = 1236;
  const LAST = CARDS.length - 1;
  const matches = (i, j) => (CARDS[j][1] === 'all' ? F.TOPICS[i] !== 'ai' : F.TOPICS[i] === CARDS[j][1]);
  /** the card now up: its index, or -1 before the first */
  const current = (lt) => { let j = -1; T.forEach((t, k) => { if (lt >= t) j = k; }); return j; };
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5 + 1) * 8, y: 0, z: 1 };
      const j = current(lt);
      stack(c, [
        { sh: F.wallpaper(), d: 0.03, lift: 0, soft: 1 },
        { sh: F.bunting(), d: 0.2, lift: 0.7, alpha: 0.35 },
        { fn: (g, ox, oy) => F.wall(g, ox, oy, (i) => {
          if (j < 0) return { sc: 1 };
          const q = F.GRID[i], hit = matches(i, j), t0 = T[j] + (j === LAST ? (Math.abs(q.r - 5.5) + Math.abs(q.k - 3.5)) * 0.035 : 0), k = clamp((lt - t0) / 0.3, 0, 1);
          if (hit) return { sc: 1 + 0.1 * (1 - k) * (lt >= t0 ? 1 : 0), lift: 0.9, flash: lt >= t0 ? (1 - k) * 0.8 : 0, ring: lt >= t0 ? 1 : 0 };
          return { sc: 1, dim: (j === LAST ? 0.6 : 0.55) * clamp((lt - T[j]) / 0.2, 0, 1) };
        }), d: 0.08 },
        { fn: (g, ox, oy) => {
          CARDS.forEach(([word], k) => {
            const tin = T[k], tout = k < LAST ? T[k + 1] - 0.04 : 99; if (lt < tin) return;
            const ki = ease.out((lt - tin) / 0.16), ko = clamp((lt - tout) / 0.3, 0, 1); if (ko >= 1) return;
            const side = k % 2 ? 1 : -1, rot = side * 0.045 + ko * side * 0.5, x = 540 + ox + ko * ko * side * 900, y = CY + oy + ko * 60;
            put(g, F.card(word), x, y, { sc: lerp(1.7, 1, ki), rot, lift: lerp(3, 1.4, ki), alpha: 0.45 });
          });
        }, d: 0.12 },
      ], cam);
      F.box(c);
    },
  };
})();
