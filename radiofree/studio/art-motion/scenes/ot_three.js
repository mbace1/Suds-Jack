// Shot 3 · Anthropic. Close on the ANTHROPIC test lab, then the camera pulls back down the terrace: three ordinary
// houses beyond it. From "walk" three trails of footprints leave the lab's door, one to each house; on
// "organisations" all three doors light, and their windows after them.
SCENES['ot_three'] = (() => {
  const { stack, box, put } = RFP, O = OT, ID = 'ot_three', { clamp, lerp } = U, SILL = 1480, SC = 0.58;
  const LAB = 180, HOUSES = [[450, 'p', O.C.brick, O.C.brickD, O.C.doorG], [690, 'q', O.C.render, O.C.renderD, O.C.doorR], [920, 'r', O.C.brick2, O.C.brick2D, O.C.doorB]];
  const TRAILS = HOUSES.map(([x], i) => O.toDoor([LAB + 20, SILL + 18], x, SILL, SC, 5 + i * 2, [x - 25, SILL + 30 + i * 22]));
  return {
    draw(c, lt) {
      const tW = O.at(ID, 'walk', 0.4), tL = O.at(ID, 'lit', 4.2), dur = O.dur(ID);
      const z = lerp(1.32, 1.0, O.ease.io(clamp(lt / (tL - 0.3), 0, 1))) * O.punch(lt, [tL], { open: 0 });
      const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: 1 };
      c.save(); c.translate(LAB + 90, 1200); c.scale(z, z); c.translate(-(LAB + 90), -1200);
      stack(c, [
        { sh: O.sky(), d: 0.03, lift: 0 },
        { fn: (g, ox) => {
          for (let i = HOUSES.length - 1; i >= 0; i--) { const [x, k, b, bd, dr] = HOUSES[i]; put(g, O.house(k, b, bd, dr), x + ox, SILL, { sc: SC, lift: 1 }); }
          HOUSES.forEach(([x], i) => O.houseLit(g, x + ox, SILL, SC, clamp((lt - tL - i * 0.08) / 0.25, 0, 1), clamp((lt - tL - 0.4 - i * 0.15) / 1.3, 0, 1), lt));
          put(g, O.lab('ANTHROPIC · TEST LAB'), LAB + ox, SILL, { sc: SC, lift: 1.2 });
          O.testLight(g, LAB + ox, SILL - 600 * SC, lt); O.sign(g, LAB + ox, SILL - 250 * SC, 0.55);
        }, d: 0.15 },
        { sh: O.pavement(SILL), d: 0.15, lift: 0 },
        { fn: (g, ox) => TRAILS.forEach((pts, i) => { const t0 = tW + i * 0.3; O.trail(g, pts.map(([x, y]) => [x + ox, y]), clamp((lt - t0) / Math.max(0.5, tL - 0.05 - t0), 0, 1) + 1e-6, 0.6, lt); }), d: 0.15 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
