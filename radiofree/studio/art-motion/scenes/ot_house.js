// Shot 2 · July: OpenAI. The street, side on: the OPENAI test lab, and next door a brick house with steps, plated
// HUGGING FACE. From "walk" the glowing footprints come out from under the lab's door, along the pavement and up the
// house's steps; on "systems" they reach its door, which lights from inside — and its windows follow.
SCENES['ot_house'] = (() => {
  const { stack, box, put } = RFP, O = OT, ID = 'ot_house', { clamp, lerp } = U, SILL = 1500, SC = 0.85;
  const LAB = 270, HOUSE = 720, pts = O.toDoor([LAB + 10, SILL + 22], HOUSE, SILL, SC, 7);
  return {
    draw(c, lt) {
      const tW = O.at(ID, 'walk', 0.5), tI = O.at(ID, 'in', 4.2), dur = O.dur(ID);
      const kt = clamp((lt - tW) / Math.max(0.5, tI - tW), 0, 1), kd = clamp((lt - tI) / 0.25, 0, 1), kw = clamp((lt - tI - 0.35) / 1.4, 0, 1);
      const cam = { x: Math.sin(lt * 0.35) * 7, y: 0, z: O.punch(lt, [tI]) * lerp(1.0, 1.05, O.ease.io(lt / dur)), fx: 640, fy: 1300 };
      stack(c, [
        { sh: O.sky(), d: 0.03, lift: 0 },
        { fn: (g, ox) => {
          put(g, O.house('c', O.C.render, O.C.renderD, O.C.doorR), 1170 + ox, SILL, { sc: SC, lift: 1 });
          put(g, O.house('hf', O.C.brick, O.C.brickD, O.C.doorB, 'HUGGING FACE'), HOUSE + ox, SILL, { sc: SC, lift: 1.2 });
          O.houseLit(g, HOUSE + ox, SILL, SC, kd, kw, lt);
          put(g, O.lab('OPENAI · TEST LAB'), LAB + ox, SILL, { sc: SC, lift: 1.3 });
          O.testLight(g, LAB + ox, SILL - 600 * SC, lt); O.sign(g, LAB + ox, SILL - 250 * SC, 0.75);
        }, d: 0.15 },
        { sh: O.pavement(SILL), d: 0.15, lift: 0 },
        { fn: (g, ox) => O.trail(g, pts.map(([x, y]) => [x + ox, y]), kt + 1e-6, 0.78, lt), d: 0.15 },
      ], cam);
      CW.tag(c, O.ui('july', 'JULY 2026'), lt, dur);
      box(c);
    },
  };
})();
