// Shot 4 · 14 Oct, the EU. Both test labs side by side. Two blue envelopes with the gold stars fly in — REQUEST FOR
// INFORMATION — and on "questions" they go through the labs' letterboxes. On "But the Act exempts testing" a red
// EXEMPT is stamped under each lab's DO NOT ENTER sign.
SCENES['ot_letter'] = (() => {
  const { stack, box, put } = RFP, O = OT, ID = 'ot_letter', { clamp, lerp } = U, SILL = 1500, SC = 0.8, SLOT = SILL - 75;
  const LABS = [[290, 'OPENAI · TEST LAB'], [790, 'ANTHROPIC · TEST LAB']];
  function slot(g, x, flap) { g.fillStyle = '#7d6a3a'; g.beginPath(); g.roundRect(x - 58, SLOT - 11, 116, 22, 4); g.fill(); g.fillStyle = '#0c0f11'; g.fillRect(x - 48, SLOT - 4, 96, 8);
    g.save(); g.translate(x, SLOT - 6); g.scale(1, Math.cos(flap)); g.fillStyle = '#b89a52'; g.fillRect(-50, 0, 100, 10); g.restore(); }
  return {
    draw(c, lt) {
      const tP = O.at(ID, 'post', 2.6), tE = O.at(ID, 'exempt', 4.6), dur = O.dur(ID);
      const cam = { x: Math.sin(lt * 0.33) * 6, y: 0, z: O.punch(lt, [tP, tE]) * lerp(1.0, 1.05, O.ease.io(lt / dur)), fx: 540, fy: 1250 };
      stack(c, [
        { sh: O.sky(), d: 0.03, lift: 0 },
        { fn: (g, ox) => { put(g, O.house('d', O.C.brick, O.C.brickD, O.C.doorG), -150 + ox, SILL, { sc: SC, lift: 1 }); put(g, O.house('e', O.C.brick2, O.C.brick2D, O.C.doorR), 1230 + ox, SILL, { sc: SC, lift: 1 }); }, d: 0.1 },
        { fn: (g, ox) => LABS.forEach(([x, name], i) => {
          const tA = tP + i * 0.12, flap = lt > tA ? Math.sin((lt - tA) * 26) * 0.9 * Math.exp(-(lt - tA) * 7) : 0;
          put(g, O.lab(name), x + ox, SILL, { sc: SC, lift: 1.3 }); O.testLight(g, x + ox, SILL - 600 * SC, lt + i);
          O.sign(g, x + ox, SILL - 250 * SC, 0.8, clamp((lt - tE - i * 0.14) / 0.22, 0, 1));
          slot(g, x + ox, flap);
        }), d: 0.18 },
        { sh: O.pavement(SILL), d: 0.18, lift: 0 },
        { fn: (g, ox) => LABS.forEach(([x], i) => {                     // the letters: in from above, then through the slot
          const tA = tP + i * 0.12, kf = clamp((lt - (tA - 0.75)) / 0.55, 0, 1), ks = clamp((lt - (tA - 0.2)) / 0.2, 0, 1);
          if (kf <= 0 || ks >= 1) return;
          const e = O.ease.out(kf), sc = lerp(0.95, 0.3, e), ex = lerp(x + (i ? 260 : -260), x, e) + ox, ey = lerp(560, SLOT - 34, e) + ks * 70, rot = lerp(i ? 0.7 : -0.7, 0, e);
          g.save(); g.beginPath(); g.rect(0, 0, 1080, SLOT); g.clip(); put(g, O.envelope(), ex, ey, { sc, rot, lift: lerp(3, 0.6, e) }); g.restore();
        }), d: 0.18 },
      ], cam);
      CW.tag(c, O.ui('dateline', 'EU AI OFFICE · 14.10.2026'), lt, dur);
      box(c);
    },
  };
})();
