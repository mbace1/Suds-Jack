// Shot 3 · 12.9–19.3 s · The call. A paper ocean. On the far shore the White House in pale silhouette with the
// Washington Monument behind it, and beside it two generic labs, each with a reel. Between them sits a red telephone,
// its cord running from the White House; it rings at the LABS' end (review: the White House asked the two US labs,
// not the Institute). On the near shore the Institute's door is open on the three boxes. The labs' reels turn: two of
// the strings snap taut, and two boxes are pulled out of the door, over the quay and away across the water. The third
// stays. Tag: THE WHITE HOUSE · WASHINGTON · 24.9.2026.
SCENES['vt_call'] = (() => {
  const V = VT, { clamp, lerp } = U;
  const RINGS = [[0.55, 1.2], [1.5, 2.15]], T_A = 2.35, T_B = 2.62;
  const ringAt = (lt) => { for (const [a, b] of RINGS) if (lt >= a && lt < b) return Math.min(1, (lt - a) / 0.08, (b - lt) / 0.08); return 0; };
  // a box's journey: out over the steps in half a second, then across the water, slowing as it reaches its reel
  const trip = (lt, t0) => { const t = lt - t0; if (t <= 0) return 0; if (t < 0.5) return 0.3 * (t / 0.5); return 0.3 + 0.7 * V.eo((t - 0.5) / 2.1); };
  return {
    draw(c, lt) {
      const k = V.io((lt - 1.9) / 1.2), uA = trip(lt, T_A), uB = trip(lt, T_B);
      V.shore(c, lt, {
        cx: 540, cy: lerp(830, 960, k), z: lerp(1.08, 1, k), ring: ringAt(lt),
        reel: [uA, uB], spin: (uA + uB) * 34, open: 1, taut: [lt > T_A - 0.08, lt > T_B - 0.08], cardRot: null,
      });
      V.tag(c, 'THE WHITE HOUSE · WASHINGTON · 24.9.2026', lt, V.DUR);
      V.frame(c);
    },
  };
})();
