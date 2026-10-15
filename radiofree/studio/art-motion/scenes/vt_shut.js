// Shot 6 · 32.1–37.5 s · Until the phone rings again. Close on the Institute's brass plate: a little hand-lettered card
// drops onto a hook under it — OPEN · BY INVITATION — and swings. The camera eases back to the whole water: the boxes
// home, the door open, the strings still running across to the labs' reels. Then the red telephone on the far shore
// gives one small rattle, the two strings twitch, and the door clicks shut. The card swings on, still saying OPEN.
SCENES['vt_shut'] = (() => {
  const V = VT, { clamp, lerp } = U;
  const T_CARD = 0.5, T_LAND = 0.84, T_BACK = 2.05, T_RATTLE = 3.75, T_SHUT = 4.3, T_CLICK = 4.55;
  return {
    draw(c, lt) {
      const k = V.io((lt - T_BACK) / 1.35), kd = clamp((lt - T_CARD) / (T_LAND - T_CARD), 0, 1);
      const swing = lt > T_LAND ? 0.42 * Math.exp(-(lt - T_LAND) * 1.9) * Math.sin((lt - T_LAND) * 7) : 0.12 * (1 - kd);
      const slam = lt > T_CLICK ? 0.26 * Math.exp(-(lt - T_CLICK) * 2.6) * Math.sin((lt - T_CLICK) * 9) : 0;
      const kr = (lt - T_RATTLE) / 0.36, rattle = kr > 0 && kr < 1 ? 0.5 * Math.sin(kr * Math.PI) : 0;
      const ks = clamp((lt - T_SHUT) / (T_CLICK - T_SHUT), 0, 1), open = 1 - ks * ks;
      const shake = lt > T_CLICK ? Math.exp(-(lt - T_CLICK) * 14) * Math.sin((lt - T_CLICK) * 80) * 3 : 0;
      const twitch = kr > 0.15 && kr < 0.75;
      V.shore(c, lt, {
        cx: lerp(778, 540, k), cy: lerp(1332, 960, k) + shake, z: lerp(1.9, 1, k), ring: rattle,
        reel: [-1, -1], spin: 1.2 + (twitch ? 0.25 : 0), open, taut: [twitch, twitch], jolt: twitch ? 1 : 0,
        cardRot: lt < T_CARD ? null : swing + slam, cardDrop: 300 * (1 - kd * kd), glint: (lt - 1.2) / 0.7,
      });
      V.frame(c);
    },
  };
})();
