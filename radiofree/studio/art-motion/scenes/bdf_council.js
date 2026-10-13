// Shot 1 · 0–3.2 s · The council. Muhos at night, in the rain: the council hall's one
// long lit window, and behind it a row of silhouettes at a table raising their hands
// one by one — the zoning plan approved in March, under a land-use agreement worth
// €26 million to the municipality. An ochre card lands in the window: APPROVED.
// Outside, in the dark, the residents stand in the rain and watch through the glass;
// nobody asked them in. One of them pins a single sheet to the notice board: 1 APPEAL.
SCENES['bdf_council'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, pop, walker, words } = RFP, { C } = BDF, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_APPROVED = 2 * B, T_APPEAL = 4 * B, WX0 = 120, WX1 = 960, WY0 = 520, WY1 = 900;
  const hall = () => sheet('bdf_hall_front', (g) => {
    g.fillStyle = '#3a3a34'; g.beginPath(); g.rect(-90, 300, W + 180, 1000); g.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); g.fill('evenodd');
    g.fillStyle = '#2c2c27'; g.beginPath(); g.moveTo(-90, 300); g.lineTo(540, 160); g.lineTo(W + 90, 300); g.closePath(); g.fill();   // the roof
    g.fillStyle = K.ink; for (let x = WX0; x <= WX1; x += (WX1 - WX0) / 6) g.fillRect(x - 7, WY0, 14, WY1 - WY0); g.fillRect(WX0 - 10, WY1, WX1 - WX0 + 20, 16);
    g.fillStyle = K.card; g.font = '34px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('MUHOS · KUNNANVALTUUSTO', 540, 440); g.font = '22px "RobotoCondensed"'; g.fillText('MUNICIPAL COUNCIL', 540, 474);
  });
  const room = () => sheet('bdf_room', (g) => {
    g.fillStyle = '#c98a44'; g.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
    g.fillStyle = '#5a3a22'; g.fillRect(WX0, 800, WX1 - WX0, 100);                                    // the long table
  });
  const person = () => sprite('bdf_councillor', 120, 200, 60, 190, (g) => { g.fillStyle = '#2a1d15'; g.beginPath(); g.arc(0, -150, 26, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-50, 0); g.quadraticCurveTo(-48, -110, 0, -116); g.quadraticCurveTo(48, -110, 50, 0); g.closePath(); g.fill(); }, 4);
  const board = () => sprite('bdf_board', 260, 420, 130, 400, (g) => {
    g.fillStyle = '#4a3626'; g.fillRect(-10, -150, 20, 150); g.fillRect(-120, -390, 240, 250);
    g.fillStyle = K.cardD; g.fillRect(-100, -370, 120, 150); g.fillStyle = 'rgba(21,18,15,.5)'; for (let i = 0; i < 7; i++) g.fillRect(-90, -350 + i * 18, 96, 6);   // the posted plan
  }, 8);
  // a resident from behind: coat, hood, the mask's strap across the back of the head — they are facing the window, not us
  const back = () => sprite('bdf_back', 300, 480, 150, 460, (g) => {
    g.fillStyle = '#26332b'; g.beginPath(); g.moveTo(-120, 0); g.lineTo(-104, -250); g.quadraticCurveTo(-90, -310, -40, -320); g.lineTo(40, -320); g.quadraticCurveTo(90, -310, 104, -250); g.lineTo(120, 0); g.closePath(); g.fill();
    g.fillStyle = '#7a3a22'; g.beginPath(); g.roundRect(-60, -336, 120, 34, 14); g.fill();
    g.fillStyle = '#3a2c22'; g.beginPath(); g.ellipse(0, -390, 64, 72, 0, 0, TAU); g.fill();
    g.fillStyle = K.ink; g.fillRect(-66, -404, 132, 12);
  }, 10);
  const label = () => sprite('bdf_approved', 560, 200, 280, 100, (g) => { g.fillStyle = K.card; g.beginPath(); g.roundRect(-250, -76, 500, 152, 8); g.fill(); g.strokeStyle = K.ink; g.lineWidth = 6; g.strokeRect(-236, -62, 472, 124); g.fillStyle = K.ink; g.font = '100px "Anton-400"'; g.textAlign = 'center'; g.fillText('APPROVED', 0, 36); }, 10);
  const appeal = () => sprite('bdf_appeal', 200, 220, 100, 110, (g) => {
    g.fillStyle = K.card; g.fillRect(-70, -90, 140, 180); g.fillStyle = K.ink; g.font = '30px "Anton-400"'; g.textAlign = 'center'; g.fillText('1 APPEAL', 0, -40);
    g.fillStyle = 'rgba(21,18,15,.5)'; for (let i = 0; i < 5; i++) g.fillRect(-56, -10 + i * 16, 112, 5); g.fillStyle = K.mag; g.beginPath(); g.arc(0, -82, 7, 0, TAU); g.fill();
  }, 6);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.6) * 16, y: 0, z: move(lt, 0, 3.2, 1.06, 1), fx: 540, fy: 900 };
      stack(c, [
        { sh: dusk('bdf', 700), d: 0.04, lift: 0 },
        { sh: room(), d: 0.15, lift: 0 },
        { fn: (g, ox) => {
          // the councillors, hands going up one after another
          for (let i = 0; i < 7; i++) {
            const x = WX0 + 70 + i * 116 + ox, up = clamp((lt - 0.15 - i * 0.12) / 0.15, 0, 1);
            put(g, person(), x, 820, { lift: 0.6 });
            g.strokeStyle = '#2a1d15'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 30, 730); g.lineTo(x + 34 + up * 10, lerp(760, 620, up)); g.stroke();
          }
          glow(g, 540 + ox, 700, 520, 'rgba(240,170,70,', 0.28);
        }, d: 0.15 },
        { sh: hall(), d: 0.25, lift: 1.2 },
        { fn: (g, ox) => { const k = pop(lt, T_APPROVED, 0.22); if (k > 0) put(g, label(), 540 + ox, 700, { sc: k, rot: -0.04, lift: 1.6 }); }, d: 0.25 },
        { sh: sheet('bdf_street', (g) => { g.fillStyle = '#1a1714'; g.fillRect(-90, 1300, W + 180, H); g.fillStyle = 'rgba(227,163,58,.12)'; g.fillRect(WX0 - 40, 1300, WX1 - WX0 + 80, 160); }), d: 0.4, lift: 0.6 },
        { fn: (g, ox) => {
          // the board, and the one sheet pinned to it
          put(g, board(), 150 + ox, 1560, { lift: 1.6 });
          const ka = pop(lt, T_APPEAL, 0.2); if (ka > 0) put(g, appeal(), 210 + ox, 1300, { sc: ka, rot: 0.06, lift: 1.4 });
          // the residents, outside in the rain, looking in
          for (const [x, s, t] of [[470, 1.05, 0], [700, 1.2, 0.6], [910, 1.0, 1.1]]) put(g, back(), x + ox + Math.sin(lt * 1.1 + t) * 3, 1820, { sc: s, lift: 2 });
        }, d: 0.6 },
      ], cam);
      // rain: thin pale strokes in front of everything
      c.strokeStyle = 'rgba(200,210,200,.28)'; c.lineWidth = 2; c.beginPath(); const r = U.rng(5);
      for (let i = 0; i < 120; i++) { const x = r() * (W + 200) - 100, y = ((lt * 1500 * (0.8 + r() * 0.4) + r() * 2200) % 2200) - 200; c.moveTo(x, y); c.lineTo(x - 10, y + 50); } c.stroke();
      box(c);
    },
  };
})();
