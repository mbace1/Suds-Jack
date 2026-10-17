// Shot 5 · Everybody. Along the dais a yellow hard hat, SAFETY, is passed from hand to hand — gloved hands in
// different sleeves rising from below the rail, each catching it and tossing it on. On "Everybody" every hand goes
// up at once. Nobody keeps it, and it leaves the frame on the right.
SCENES['ct_hat'] = (() => {
  const { stack, box, put, glow } = RFP, D = CT, ID = 'ct_hat', { clamp, lerp } = U;
  const SLEEVES = [['#2c3340', '#d8d2c2'], ['#5b4a3a', '#e3a33a'], ['#2f4a3c', '#d8d2c2'], ['#4a2730', '#d8d2c2'], ['#3b3f46', '#9fb4c8'], ['#6a5a40', '#d8d2c2']];
  const XS = [150, 306, 462, 618, 774, 930], STEP = 0.62;
  return {
    draw(c, lt) {
      const t0 = D.at(ID, 'first', 0.5), tE = D.at(ID, 'pop', 1.5), tG = D.at(ID, 'gone', 5.6), dur = D.dur(ID);
      // the hat's path: it rises with hand 0, then hops from palm to palm, STEP seconds a hop; after the last hand it flies off right
      const hop = (lt - t0) / STEP, i = Math.floor(hop), f = hop - i;
      let hx, hy, hr;
      if (lt < t0) { hx = XS[0]; hy = 1560; hr = 0; }
      else if (i < XS.length - 1) { hx = lerp(XS[i], XS[i + 1], f); hy = 1010 - Math.sin(f * Math.PI) * 170; hr = Math.sin(f * Math.PI) * 0.5 * (i % 2 ? -1 : 1); }
      else { const k = (lt - (t0 + (XS.length - 1) * STEP)) / 0.6; hx = lerp(XS[XS.length - 1], 1400, k); hy = 1010 - Math.sin(Math.min(k, 1) * Math.PI * 0.6) * 220; hr = k * 1.2; }
      const up = (j) => {                                                       // how far hand j is raised: up for its catch, then back down — and all up on "Everybody"
        const tc = t0 + (j - 1) * STEP, a = clamp((lt - (tc - 0.25)) / 0.25, 0, 1) * clamp(((tc + STEP + 0.5) - lt) / 0.35, 0, 1);
        const all = clamp((lt - tE) / 0.25, 0, 1) * clamp(((tE + 1.6) - lt) / 0.4, 0, 1);
        return D.ease.out(Math.max(j === 0 ? clamp((lt - (t0 - 0.3)) / 0.3, 0, 1) * clamp(((t0 + STEP + 0.3) - lt) / 0.35, 0, 1) : a, all * (0.85 + 0.15 * Math.sin(lt * 7 + j))));
      };
      const S = 1.0 * D.punch(lt, [tE], { open: 0.06, kick: 0.05 }), cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1.04, fx: 540, fy: 1100 };
      c.save(); c.translate(540, 1100); c.scale(S, S); c.translate(-540, -1100);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0, soft: 2 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doors(g, 1, lt); D.doorLight(g, 0.5, lt); g.restore(); [230, 850].forEach((x) => D.lamp(g, x + ox, 520, 1, lt)); }, d: 0.06 },
        { fn: (g) => D.daylight(g, lt, 0.7), d: 0.08 },
        { fn: (g, ox) => XS.forEach((x, j) => put(g, D.arm(...SLEEVES[j]), x + ox + Math.sin(lt * 2 + j) * 4, lerp(1700, 1080, up(j)), { rot: Math.sin(lt * 1.5 + j) * 0.03, lift: 1.3 })), d: 0.25 },
        { fn: (g, ox) => { if (hx < 1300) put(g, D.hat(), hx + ox, hy, { sc: 0.62, rot: hr, lift: 2 }); }, d: 0.25 },
        { sh: D.daisFront(1250), d: 0.3, lift: 1.2 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
