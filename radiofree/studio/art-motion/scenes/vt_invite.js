// Shot 2 · 6.4–12.9 s · By invitation. Inside the Institute: painted panelling, a sash window on the morning and the
// tower, a long table. On it the three sealed boxes, their strings running away off the table to the left. Three
// masked testers in lab coats wait behind them with their tea. A hand-written tag drops under each box: BY INVITATION.
// Then one tester leans in for a closer look, and the middle box is twitched back on its string, out of reach.
SCENES['vt_invite'] = (() => {
  const { stack, put, pop } = RFP, V = VT, { clamp, lerp } = U, TOP = V.TOP;
  const XS = [250, 520, 790], MEN = [385, 655, 925], T_TAG = [0.8, 0.55, 1.05], T_PEEK = 3.45, T_YANK = 3.95;
  const SIPS = [[1.7, 2.7], null, [4.5, 5.5]];
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 }, kz = V.eo((lt - 0.3) / 2.4);
      const peek = clamp((lt - T_PEEK) / 0.4, 0, 1) * (1 - clamp((lt - T_YANK - 0.1) / 0.3, 0, 1));
      const yank = lt < T_YANK ? 0 : V.eo((lt - T_YANK) / 0.16);
      const jerk = lt < T_YANK ? 0 : Math.exp(-(lt - T_YANK) * 5) * Math.sin((lt - T_YANK) * 30);
      c.save(); V.camera(c, lerp(540, 545, kz), lerp(960, 1080, kz), lerp(1, 1.1, kz));
      stack(c, [
        { sh: V.room(), d: 0.06, lift: 0 },
        { fn: (g, ox) => RFP.glow(g, 240 + ox, 980, 420, 'rgba(230,236,240,', 0.18), d: 0.06 },
        { fn: (g, ox) => {
          MEN.forEach((x, i) => {
            const lean = i === 1 ? -peek : 0, sip = SIPS[i] ? Math.sin(clamp((lt - SIPS[i][0]) / (SIPS[i][1] - SIPS[i][0]), 0, 1) * Math.PI) : 0;
            const startle = i === 1 && lt > T_YANK ? Math.exp(-(lt - T_YANK) * 4) * 0.5 : 0;
            V.tester(g, x + ox + lean * 30, 1122 - startle * 14, 0.55, { t: lt + i, look: lean * 1.2 + Math.sin(lt * 0.9 + i * 2) * 0.12 + startle, tilt: lean * 0.12 + Math.sin(lt * 0.7 + i) * 0.03, lift: 0.6 });
            V.cup(g, lerp(x + ox + 38, x + ox + 18, sip) + lean * 30, lerp(1226, 1124, sip), 0.62, { heat: 0.8, t: lt + i, rot: -0.45 * sip });
          });
        }, d: 0.1 },
        { sh: V.table(), d: 0.14, lift: 0.7 },
        { fn: (g, ox) => {
          // the strings first: each runs from its box along the table and away off to the left
          XS.forEach((x, i) => { const bx = x + ox - (i === 1 ? 52 * yank : 0); V.string(g, [[bx - 80, TOP - 34], [-RFP.M - 20, TOP - 10 + i * 7]], { wob: i === 1 && lt > T_YANK - 0.05 && lt < T_YANK + 0.5 ? 0 : 2.5, t: lt + i }); });
          XS.forEach((x, i) => {
            const bx = x + ox - (i === 1 ? 52 * yank : 0), sc = i === 1 ? 1.0 : 0.82, kp = pop(lt, T_TAG[i], 0.3);
            V.put2(g, V.parcel(), bx, TOP, { sc: 1, rot: i === 1 ? jerk * 0.05 : 0, lift: 0.9 });
            if (kp <= 0) return;
            const t = lt - T_TAG[i], sw = 0.3 * Math.exp(-t * 2.2) * Math.sin(t * 6.5) + Math.sin(lt * 1.6 + i) * 0.03 + (i === 1 ? jerk * 0.25 : 0);
            V.string(g, [[bx + 22, TOP - 6], [bx + 26, TOP + 30]], { w: 2.4 });
            V.put2(g, V.ticket(), bx + 26, TOP + 30, { sc: sc * Math.min(kp, 1.08), rot: sw, lift: 1.3 });
          });
        }, d: 0.14 },
      ], cam);
      c.restore();
      V.frame(c);
    },
  };
})();
