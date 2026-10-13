// Shot 1 · 0–3.2 s · Senate Square at four o'clock. The cathedral cut from white card
// with its green domes (the real one: a big dome on a drum, four small ones, the
// portico, the steps), the town dark behind it with a few windows lit, a street
// clock reading 16:02 and the square's own blue sign. A masked walker in front holds
// an umbrella by its handle and says the wake word — a red card wedge pops out of
// the mask, HEY / LOOKSY! — and the red light on the glasses wakes and answers.
SCENES['rfp_square'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, leaves, words, pop, move, walker, hand, fist, glow, put } = RFP, { cathedral } = RFM, TAU = Math.PI * 2, { clamp, lerp } = U;
  const T_HEY = 0.55, T_LOOKSY = 0.85, T_WAKE = 1.5, T_ANSWER = 2.1;
  const sun = () => sheet('rfp_sq_sun', (g) => { g.fillStyle = '#b8642e'; g.beginPath(); g.arc(860, 1030, 150, 0, TAU); g.fill(); });
  const town = () => sheet('rfp_sq_town', (g) => {
    g.fillStyle = K.roof; const r = U.rng(4);
    for (let x = -90; x < W + 90; x += 84) { const h = 140 + r() * 140; g.fillRect(x, 1080 - h, 80, h + 900); if (r() < 0.6) { g.beginPath(); g.moveTo(x - 4, 1080 - h); g.lineTo(x + 40, 1080 - h - 50); g.lineTo(x + 84, 1080 - h); g.fill(); } if (r() < 0.4) g.fillRect(x + 50, 1080 - h - 70, 14, 50); }
    g.fillStyle = K.lamp; for (let i = 0; i < 26; i++) { const x = -60 + r() * (W + 120), y = 900 + r() * 160; g.fillRect(x, y, 18, 24); }
  });
  const church = () => sheet('rfp_sq_cath', (g) => { cathedral(g, 470, 1150, 0.62); });
  const square = () => sheet('rfp_sq_square', (g) => {
    g.fillStyle = K.stone; g.fillRect(-90, 1150, W + 180, H);
    g.fillStyle = K.stoneD; for (let y = 1190, k = 0; y < H + 90; y += 34 + k * 7, k++) g.fillRect(-90, y, W + 180, 5 + k);
  });
  const lamps = () => sheet('rfp_sq_lamps', (g) => {
    g.fillStyle = K.ink;
    for (const [x, top] of [[100, 760], [990, 820]]) { g.fillRect(x - 8, top, 16, 1400); g.beginPath(); g.moveTo(x - 34, top); g.lineTo(x + 34, top); g.lineTo(x + 22, top - 70); g.lineTo(x - 22, top - 70); g.closePath(); g.fill(); g.fillStyle = K.lamp; g.fillRect(x - 20, top - 60, 40, 54); g.fillStyle = K.ink; }
  });
  // the street clock and the square's sign, on one post, front left
  const clock = () => sprite('rfp_sq_clock', 340, 1100, 170, 150, (g) => {
    g.fillStyle = K.ink; g.fillRect(-12, 0, 24, 1000);
    g.fillStyle = K.card; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill(); g.strokeStyle = K.ink; g.lineWidth = 14; g.stroke();
    g.fillStyle = K.ink; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.fillRect(Math.cos(a) * 96 - 5, Math.sin(a) * 96 - 5, 10, 10); }
    g.lineCap = 'round'; const ha = -Math.PI / 2 + (4 + 2 / 60) / 12 * TAU, ma = -Math.PI / 2 + 2 / 60 * TAU;
    g.lineWidth = 14; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ha) * 58, Math.sin(ha) * 58); g.stroke();
    g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ma) * 90, Math.sin(ma) * 90); g.stroke();
    g.fillStyle = '#1d4f91'; g.beginPath(); g.roundRect(-150, 190, 300, 78, 8); g.fill();
    g.fillStyle = K.card; g.font = '34px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('SENAATINTORI', 0, 228); g.font = '22px "ArchivoBlack-400"'; g.fillText('SENATSTORGET', 0, 256);
  }, 9);
  const dome = () => sprite('rfp_sq_umb', 560, 260, 280, 230, (g) => {
    g.fillStyle = K.ink; g.beginPath(); g.moveTo(-260, 0); for (let k = 0; k <= 8; k++) { const x = -260 + k * 65; g.quadraticCurveTo(x - 32, -26, x, 0); } g.lineTo(260, 0); g.bezierCurveTo(240, -200, -240, -200, -260, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,240,210,.14)'; g.lineWidth = 4; for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(0, -150); g.lineTo(-260 + k * 65, 0); g.stroke(); }
    g.fillStyle = K.ink; g.fillRect(-5, -190, 10, 46);
  }, 10);
  // the wedge: a red card banner with a tail that ends at the mask
  function wedge(c, k, tipX, tipY) {
    if (k <= 0) return;
    const bx = 420, by = 330;
    c.save(); c.translate(tipX, tipY); c.scale(k, k); c.translate(-tipX, -tipY);
    put(c, sprite('rfp_sq_wedge', 760, 1100, 380, 160, (g) => {
      g.fillStyle = K.ochre; g.beginPath(); g.moveTo(-300, -120); g.lineTo(300, -150); g.lineTo(320, 110); g.lineTo(-290, 130); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(170, 100); g.lineTo(260, 108); g.lineTo(tipX - bx - 10, tipY - by - 20); g.closePath(); g.fill();
    }, 12), bx, by, { lift: 1.6 });
    c.restore();
  }
  return {
    draw(c, lt) {
      const wx = 770, wy = 1290, s = 1.22;
      // drift, then push onto the glasses as the light wakes
      const cam = { x: lerp(-36, 36, lt / 3.2), y: 0, z: move(lt, T_WAKE - 0.1, 0.8, 1, 1.09), fx: 600, fy: wy - 60 };
      stack(c, [
        { sh: dusk('sq', 1080), d: 0.05, lift: 0 },
        { sh: sun(), d: 0.08, lift: 0.4 },
        { fn: (g, ox) => glow(g, 860 + ox, 1030, 320, 'rgba(255,150,80,', 0.14) , d: 0.08 },
        { sh: town(), d: 0.18, lift: 0.8 },
        { sh: church(), d: 0.3 },
        { fn: (g, ox) => { glow(g, 470 + ox * 1, 860, 380, 'rgba(255,230,190,', 0.16); }, d: 0.3 },
        { sh: square(), d: 0.42, lift: 0.6 },
        { sh: lamps(), d: 0.5, lift: 1.2 },
        { fn: (g, ox) => { glow(g, 100 + ox, 730, 280, 'rgba(255,214,140,', 0.95); glow(g, 990 + ox, 790, 280, 'rgba(255,214,140,', 0.95); }, d: 0.5 },
        { fn: (g, ox) => put(g, clock(), 285 + ox, 1180, { lift: 1.6 }), d: 0.7 },
        { fn: (g, ox) => {
          const step = Math.sin(lt * 5.2), x = wx + ox;
          const led = lt < T_WAKE ? 0 : lt < T_ANSWER ? clamp((lt - T_WAKE) / 0.12, 0, 1) : (lt < T_ANSWER + 0.5 ? (Math.floor((lt - T_ANSWER) * 8) % 2 === 0 ? 1 : 0.15) : 1);
          walker(g, x, wy + Math.abs(step) * -6, s, { coat: '#2b3a30', scarf: K.rust, t: lt, tilt: Math.sin(lt * 2.2) * 0.04, step, led, lift: 2.2,
            umbrella: (u) => {
              // the umbrella held properly: shaft down to a closed fist at the chest, forearm down to the elbow, upper arm up the coat's side
              put(u, dome(), 30, -150, { rot: -0.1, lift: 2 }); u.strokeStyle = K.ink; u.lineWidth = 10; u.lineCap = 'round'; u.beginPath(); u.moveTo(30, -160); u.lineTo(78, 90); u.stroke();
              u.strokeStyle = '#2b3a30'; u.lineWidth = 50; u.beginPath(); u.moveTo(118, 50); u.lineTo(132, 230); u.stroke();
              fist(u, 72, 64, 0.62, -0.25, { sleeve: '#2b3a30', cuff: K.rust, len: 300 }); } });
          // the light answering: a ring that leaves the bead when it wakes
          if (lt > T_WAKE && lt < T_WAKE + 0.6) { const q = (lt - T_WAKE) / 0.6, lx = x + 73 * s, ly = wy - 54 * s; g.strokeStyle = `rgba(255,70,40,${1 - q})`; g.lineWidth = 6; g.beginPath(); g.arc(lx, ly, 10 + q * 120, 0, TAU); g.stroke(); }
          wedge(g, pop(lt, T_HEY, 0.32), x - 40, wy - 140);
          const kh = pop(lt, T_HEY + 0.06, 0.24), kl = pop(lt, T_LOOKSY, 0.28);
          if (kh > 0) put(g, words('HEY', '96px "ArchivoBlack-400"', K.ink), 300 + ox, 290, { sc: kh, rot: -0.05, lift: 0.8 });
          if (kl > 0) put(g, words('LOOKSY!', '112px "ArchivoBlack-400"', K.ink), 430 + ox, 420, { sc: kl, rot: -0.04, lift: 0.8 });
        }, d: 0.85 },
      ], cam);
      leaves(c, lt + 3, { n: 12, seed: 11, cam });
      box(c);
    },
  };
})();
