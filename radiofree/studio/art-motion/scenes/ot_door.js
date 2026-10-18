// Shot 1 · The question. Close on a test lab's door in pale daylight: OPENAI · TEST LAB on the plate, the red TEST
// light, TESTING IN PROGRESS / DO NOT ENTER on the glass. On "glow" cyan light starts to leak from under the door; on
// "test" the door shudders, the sign swings, and the first glowing footprints step out onto the pavement.
SCENES['ot_door'] = (() => {
  const { stack, box, put, glow } = RFP, O = OT, ID = 'ot_door', { clamp, lerp } = U, SILL = 1460, SC = 1.5;
  return {
    draw(c, lt) {
      const tG = O.at(ID, 'glow', 0.8), tT = O.at(ID, 'test', 3.6), dur = O.dur(ID);
      const kg = clamp((lt - tG) / 1.2, 0, 1), hit = lt > tT ? Math.exp(-(lt - tT) * 3.2) : 0, fl = 0.8 + 0.2 * Math.sin(lt * 19) * Math.sin(lt * 7.3);
      const shake = lt > tT ? Math.sin((lt - tT) * 42) * 7 * Math.exp(-(lt - tT) * 6) : 0, wob = lt > tT ? Math.sin((lt - tT) * 11) * 0.16 * Math.exp(-(lt - tT) * 2.2) : 0;
      const steps = lt > tT + 0.35 ? Math.min(4, 1 + Math.floor((lt - tT - 0.35) / 0.38)) : 0;
      const pts = O.path([560, SILL + 60], [800, SILL + 280], 4);
      const cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: O.punch(lt, [tT]) * lerp(1.0, 1.06, O.ease.io(lt / dur)), fx: 540, fy: 1150 };
      stack(c, [
        { sh: O.sky(), d: 0.03, lift: 0 },
        { fn: (g, ox) => { put(g, O.house('a', O.C.brick, O.C.brickD, O.C.doorG), -170 + ox, SILL, { sc: SC, lift: 1 }); put(g, O.house('b', O.C.brick2, O.C.brick2D, O.C.doorB), 1250 + ox, SILL, { sc: SC, lift: 1 }); }, d: 0.12 },
        { fn: (g, ox) => {
          put(g, O.lab('OPENAI · TEST LAB', { mark: false }), 540 + ox, SILL, { sc: SC, lift: 1.4 });
          O.testLight(g, 540 + ox, SILL - 600 * SC, lt);
          g.save(); g.translate(shake, 0); O.sign(g, 540 + ox, SILL - 390, 1.25, 0, wob); g.restore();
        }, d: 0.2 },
        { sh: O.pavement(SILL), d: 0.2, lift: 0 },
        { fn: (g, ox) => {
          if (kg > 0) { const a = kg * fl * (1 + hit * 0.8);
            g.save(); g.globalAlpha = clamp(a, 0, 1); g.fillStyle = O.C.cyan; g.fillRect(540 - 160 + ox + shake, SILL - 8, 320, 9); g.restore();
            glow(g, 540 + ox, SILL + 30, 260 + 120 * hit, 'rgba(63,240,230,', 0.5 * a); glow(g, 540 + ox, SILL - 140, 200, 'rgba(63,240,230,', 0.18 * a); }
          if (steps) O.trail(g, pts.map(([x, y]) => [x + ox, y]), steps / pts.length + 1e-6, 1.25, lt);
        }, d: 0.22 },
      ], cam);
      box(c);
    },
  };
})();
