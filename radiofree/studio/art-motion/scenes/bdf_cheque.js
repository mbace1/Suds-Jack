// Shot 1 · 0–3.2 s · The cheque. A dark spruce forest in rows of card with mist
// between them; a moose grazing between the trunks. A giant ochre cheque from Doodle
// comes down into the trees on two strings and lands with a bounce — €13 000 000 000,
// and on the memo line, small: FOR LOCAL BIODIVERSITY. Its light falls on the
// trees. The moose lifts its head to look at it.
SCENES['bdf_cheque'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, leaves, put, glow, pop, ease, move } = RFP, { C, row, mist, moose } = BDF, TAU = Math.PI * 2, { clamp, lerp } = U;
  const T_LAND = 1.0, T_LOOK = 1.25;
  const cheque = () => sprite('bdf_cheque', 860, 420, 430, 210, (g) => {
    g.fillStyle = K.ochre; g.beginPath(); g.roundRect(-400, -180, 800, 360, 10); g.fill();
    g.strokeStyle = K.ink; g.lineWidth = 3; g.strokeRect(-380, -160, 760, 320);
    g.fillStyle = K.ink; g.font = '58px "PlayfairDisplay-700"'; g.fillText('Doodle', -360, -98);
    g.font = '24px "RobotoCondensed"'; g.fillText('9.9.2026', 250, -110);
    g.fillText('PAY', -360, -40); g.fillRect(-300, -36, 640, 3); g.font = '40px "RobotoCondensed"'; g.fillText('Finland', -290, -46);
    g.font = '70px "Anton-400"'; g.fillText('€13 000 000 000', -360, 50);
    g.font = '30px "RobotoCondensed"'; g.fillText('INCL.: local biodiversity, education…', -360, 122);   // INCL., not FOR: the fund is part of the €13 bn, not all of it
    g.lineWidth = 3; g.beginPath(); g.moveTo(130, 110); g.bezierCurveTo(170, 60, 200, 140, 240, 90); g.bezierCurveTo(270, 60, 300, 120, 350, 96); g.stroke();
  }, 14);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.6) * 14, y: 0, z: move(lt, T_LAND - 0.05, 0.6, 1, 1.05), fx: 540, fy: 800 };
      // the cheque: lowered on strings, a little bounce on landing, then swinging
      const k = clamp(lt / T_LAND, 0, 1), drop = 1 - Math.pow(1 - k, 3), bounce = lt > T_LAND ? Math.sin((lt - T_LAND) * 14) * Math.exp(-(lt - T_LAND) * 5) * 18 : 0;
      const cy = lerp(-320, 820, drop) + bounce, sw = Math.sin(lt * 1.3) * 0.03;
      const lightK = clamp((lt - 0.4) / 0.8, 0, 1);
      stack(c, [
        { sh: dusk('bdf', 900), d: 0.04, lift: 0 },
        { sh: row('far', 1000, 20, 340, C.far, null, 3), d: 0.12, lift: 0.5 },
        { sh: mist('m1', 960, 90, 2), d: 0.16, lift: 0.2, alpha: 0.2 },
        { sh: row('mid', 1180, 11, 560, C.mid, C.edge, 5), d: 0.25, lift: 0.8 },
        { fn: (g, ox) => glow(g, 540 + ox, cy + 60, 620, 'rgba(240,170,70,', 0.32 * lightK), d: 0.25 },
        { sh: sheet('bdf_ground', (g) => { g.fillStyle = C.ground; g.beginPath(); g.moveTo(-90, H + 90); for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 1500 + Math.sin(x * 0.05) * 10 + (x * 13 % 7) * 4); g.lineTo(W + 90, H + 90); g.closePath(); g.fill(); g.fillStyle = 'rgba(40,42,28,.6)'; for (let i = 0; i < 14; i++) { const x = (i * 97) % (W + 100) - 50, y = 1520 + (i * 53) % 340; g.beginPath(); g.ellipse(x, y, 30 + (i % 3) * 14, 10, 0, 0, Math.PI * 2); g.fill(); } }), d: 0.5, lift: 0.6 },
        { fn: (g, ox) => { glow(g, 560 + ox, 1430, 380, 'rgba(240,170,70,', 0.3); moose(g, 330 + ox, 1760, 1.35, ease.out((lt - T_LOOK) / 0.5), 2.2); }, d: 0.6 },   // the cheque's light behind the moose, so it reads against the dark
        { fn: (g, ox) => {
          g.strokeStyle = K.cardD; g.lineWidth = 3; for (const sx of [-300, 300]) { g.beginPath(); g.moveTo(540 + sx + ox, -50); g.lineTo(540 + sx * 0.98 + ox + Math.sin(sw) * 200, cy - 170); g.stroke(); }
          put(g, cheque(), 540 + ox, cy, { rot: sw, lift: 3 });
        }, d: 0.5 },
        // two spruces close to us, cropped by the frame, so the forest has a front
        { fn: (g, ox) => { put(g, BDF.tree(1150, C.near, 11), 20 + ox, 1720, { lift: 2.4 }); put(g, BDF.tree(1050, C.near, 12), 1070 + ox, 1700, { lift: 2.4 }); }, d: 0.8 },
      ], cam);
      leaves(c, lt + 2, { n: 8, seed: 61, cam });
      box(c);
    },
  };
})();
