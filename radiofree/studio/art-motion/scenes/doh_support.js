// Shot 3 · 12.9–19.3 s · The support, 1 September 2026. The Government Palace at night,
// its long neoclassical front and a few windows still lit. An envelope comes down on a
// single string and hangs there, turning slightly: SUPPORT ≈ €30 M / YEAR, the scheme
// that was to replace the tax relief in the 2027 budget. A pair of scissors comes in
// from the right and, on the beat, cuts the string; the envelope drops out of the box.
SCENES['doh_support'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, leaves } = RFP, D = DOH, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_IN = 0.75, T_CUT = 6.5 * B, EX = 560, EY = 780, CUTY = 610;
  const palace = () => sheet('doh_palace', (g) => {
    g.fillStyle = '#5c564a'; g.fillRect(-90, 980, W + 180, 520);                                      // the long front
    g.fillStyle = '#6a6354'; g.fillRect(-90, 960, W + 180, 30); g.fillRect(-90, 1220, W + 180, 16);   // cornice and string course
    g.fillStyle = '#625b4d'; g.beginPath(); g.moveTo(330, 960); g.lineTo(540, 870); g.lineTo(750, 960); g.closePath(); g.fill();   // the pediment
    g.fillStyle = '#4a453b'; g.beginPath(); g.moveTo(370, 950); g.lineTo(540, 885); g.lineTo(710, 950); g.closePath(); g.fill();
    g.fillStyle = '#6e6757'; for (let i = 0; i < 6; i++) g.fillRect(360 + i * 66, 990, 26, 500);         // the portico's columns
    for (let r = 0; r < 2; r++) for (let x = -40; x < W + 60; x += 110) { if (x > 320 && x < 760) continue; g.fillStyle = '#2b2822'; g.fillRect(x, 1040 + r * 230, 54, 120); }   // windows, dark; the lit ones are drawn live
    g.fillStyle = '#3a3630'; g.fillRect(-90, 1490, W + 180, 30);
    g.fillStyle = '#211e19'; g.fillRect(-90, 1520, W + 180, H);                                        // the square
    g.strokeStyle = 'rgba(255,240,210,.05)'; g.lineWidth = 2; for (let y = 1540; y < H; y += 34) { g.beginPath(); g.moveTo(-90, y); g.lineTo(W + 90, y); g.stroke(); }
  }, 14);
  const envelope = () => sprite('doh_envelope', 520, 320, 260, 20, (g) => {
    g.fillStyle = K.card; g.beginPath(); g.roundRect(-230, 0, 460, 280, 8); g.fill();
    g.strokeStyle = K.cardD; g.lineWidth = 4; g.beginPath(); g.moveTo(-230, 0); g.lineTo(0, 130); g.lineTo(230, 0); g.stroke();
    g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '44px "ArchivoBlack-400"'; g.fillText('SUPPORT', 0, 196);
    g.font = '40px "Anton-400"'; g.fillText('UP TO €30 M / YEAR', 0, 246);
    g.fillStyle = '#7a2a1a'; g.beginPath(); g.arc(0, 118, 18, 0, TAU); g.fill();                         // the seal
  }, 10);
  const scissors = (open) => {
    const k = Math.round(open * 6) / 6;
    return sprite('doh_scissors_' + k, 460, 260, 120, 130, (g) => {
      for (const s of [-1, 1]) {
        g.save(); g.rotate(s * k * 0.32);
        g.fillStyle = '#8f8f88'; g.beginPath(); g.moveTo(0, 0); g.lineTo(320, -6 * s); g.lineTo(300, 12 * s); g.lineTo(0, 14 * s); g.closePath(); g.fill();
        g.strokeStyle = K.ochre; g.lineWidth = 16; g.beginPath(); g.ellipse(-60, 30 * s, 52, 30, 0, 0, TAU); g.stroke();
        g.restore();
      }
      g.fillStyle = '#3a3a34'; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
    }, 8);
  };
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 12, y: 0, z: move(lt, 0, 6.4, 1.04, 1.0), fx: 540, fy: 1100 };
      // the envelope: lowered in, then turning gently on its string; after the cut, it falls
      const kin = ease.out(clamp(lt / T_IN, 0, 1)), sway = Math.sin(lt * 1.7) * 0.06;
      const fall = Math.max(0, lt - T_CUT), ey = lerp(-400, EY, kin) + 900 * fall * fall, rot = sway + fall * fall * 1.4;
      // the scissors: slide in, open, close on the beat, then withdraw
      const sIn = ease.out(clamp((lt - (T_CUT - 1.0)) / 0.6, 0, 1)), sOut = ease.out(clamp((lt - T_CUT - 0.5) / 0.6, 0, 1));
      const open = lt < T_CUT - 0.25 ? 1 : lt < T_CUT ? (T_CUT - lt) / 0.25 : 0;
      stack(c, [
        { sh: dusk('doh_s', 940), d: 0.04, lift: 0 },
        { sh: palace(), d: 0.15, lift: 0.8 },
        { fn: (g, ox) => {
          // the lit windows go out one by one after the cut: the budget session is over
          [[70, 0], [840, 0], [950, 0], [180, 1], [180, 0]].forEach(([x, r], i) => { if (lt < T_CUT + 0.9 + i * 0.32) { g.fillStyle = '#c98a44'; g.fillRect(x + ox * 1.0, 1040 + r * 230, 54, 120); } });
        }, d: 0.15 },
        { fn: (g, ox) => { RFP.leaves(g, lt + 5, { n: 5, seed: 33, cam }); }, d: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 1100, 560, 'rgba(240,170,70,', 0.16); glow(g, EX + ox, Math.min(ey, 1400) + 140, 360, 'rgba(240,170,70,', 0.2); }, d: 0.15 },
        { fn: (g, ox) => {
          g.strokeStyle = K.cardD; g.lineWidth = 3;
          if (lt < T_CUT) { g.beginPath(); g.moveTo(EX + ox, -40); g.lineTo(EX + ox + Math.sin(sway) * 20, ey + 20); g.stroke(); }
          else { const up = ease.out((lt - T_CUT) / 0.5); g.beginPath(); g.moveTo(EX + ox, -40); g.lineTo(EX + ox, lerp(CUTY, -40, up)); g.stroke(); if (ey < H + 400) { g.beginPath(); g.moveTo(EX + ox, ey + 20); g.lineTo(EX + ox + 6, Math.min(ey + 20, CUTY + 900 * fall * fall)); g.stroke(); } }
          if (ey < H + 400) put(g, envelope(), EX + ox, ey, { rot, lift: 2.2 });
          const sx = lerp(W + 460, EX + 210, sIn) + sOut * 760;   // the blades meet the string about 210 px from the pivot
          if (lt > T_CUT - 1.0 && sOut < 1) put(g, scissors(open), sx + ox, CUTY, { rot: Math.PI, lift: 2.6 });
        }, d: 0.4 },
      ], cam);
      D.tag(c, '1.9.2026 · BUDGET 2027', 110, 1690, D.tagA(lt, 6.43));
      box(c);
    },
  };
})();
