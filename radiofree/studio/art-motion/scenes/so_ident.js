// The station's sign-off, papercut (3.0 s, after every papercut film; the clay films get the clay
// one). Helsinki at night in card: the Cathedral's green domes over the rooftops, and in front a
// rooftop with Toko's pirate antenna. The jingle sets the clock: the ON AIR lamp clicks on at
// 0.4 s, three notes at 0.5 / 0.77 / 1.04 send three rings out of the mast, the chord at 1.05 lights
// the mask. The top 700 px stay dark sky for the lettering (subs/signoff.ass).
SCENES['so_ident'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, walker, ledAt } = RFP, { clamp, lerp } = U, TAU = Math.PI * 2;
  const T_ON = 0.4, RINGS = [0.5, 0.77, 1.04], T_CHORD = 1.05;
  const city = () => sheet('so_city', (g) => {
    g.fillStyle = '#1d2228'; for (const [a, b, top] of [[-90, 160, 1190], [140, 300, 1150], [760, 900, 1170], [880, 1170, 1210]]) g.fillRect(a, top, b - a, 700);
    // the Cathedral: white drum and green dome on a columned front, four small domes at the corners
    const WH = '#cfc6b0', WD = '#a89f8a', GR = '#3f7a62', GD = '#2e5a48';
    g.fillStyle = WH; g.fillRect(330, 1010, 420, 260); g.fillStyle = WD; g.fillRect(330, 1250, 420, 24);
    g.fillStyle = WH; g.beginPath(); g.moveTo(400, 1030); g.lineTo(540, 970); g.lineTo(680, 1030); g.closePath(); g.fill();       // the pediment
    g.fillStyle = WD; for (let i = 0; i < 6; i++) g.fillRect(410 + i * 52, 1040, 14, 200);
    g.fillStyle = WH; g.fillRect(470, 830, 140, 150); g.fillStyle = WD; for (let i = 0; i < 6; i++) g.fillRect(478 + i * 24, 846, 8, 120);
    g.fillStyle = GR; g.beginPath(); g.ellipse(540, 832, 82, 96, 0, Math.PI, TAU); g.fill(); g.fillStyle = GD; g.beginPath(); g.ellipse(560, 832, 40, 92, 0, Math.PI * 1.5, TAU); g.fill();
    g.fillStyle = WH; g.fillRect(532, 708, 16, 34); g.fillStyle = '#c9a24a'; g.fillRect(538, 676, 4, 34);                          // lantern and spire
    for (const x of [350, 730]) { g.fillStyle = WH; g.fillRect(x - 26, 960, 52, 70); g.fillStyle = GR; g.beginPath(); g.ellipse(x, 962, 30, 34, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#c9a24a'; g.fillRect(x - 2, 918, 4, 14); }
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#9a917d' : '#b5ac96'; g.fillRect(330 - k * 34, 1274 + k * 20, 420 + k * 68, 20); }   // the Senate Square steps
    g.fillStyle = 'rgba(224,166,80,.55)'; let r = 11;
    for (const [a, b, top] of [[-90, 160, 1190], [140, 300, 1150], [760, 900, 1170], [880, 1170, 1210]]) for (let y = top + 24; y < 1420; y += 30) for (let x = a + 14; x < b - 10; x += 22) { r = (r * 9301 + 49297) % 233280; if (r / 233280 < 0.22) g.fillRect(x, y, 9, 12); }
  }, 6);
  const row = () => sheet('so_row', (g) => {
    const B = [[-90, 120, 1390], [110, 260, 1420], [250, 400, 1440], [390, 710, 1466], [700, 860, 1430], [850, 1000, 1400], [990, 1170, 1420]];
    g.fillStyle = '#191d22'; for (const [a, b, top] of B) { g.fillRect(a, top, b - a, 400); g.beginPath(); g.moveTo(a - 6, top); g.lineTo((a + b) / 2, top - 40); g.lineTo(b + 6, top); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(224,166,80,.6)'; let r = 5; for (const [a, b, top] of B) for (let y = top + 22; y < 1560; y += 34) for (let x = a + 16; x < b - 12; x += 30) { r = (r * 9301 + 49297) % 233280; if (r / 233280 < 0.3) g.fillRect(x, y, 10, 14); }
  }, 8);
  const roof = () => sheet('so_roof', (g) => {
    g.fillStyle = '#2a2420'; g.beginPath(); g.moveTo(-90, 1560); g.lineTo(W + 90, 1500); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();   // the tin roof
    g.strokeStyle = '#3a322b'; g.lineWidth = 6; for (let x = -60; x < W + 90; x += 70) { g.beginPath(); g.moveTo(x, 1560 - (x + 90) * 0.05); g.lineTo(x - 40, H + 90); g.stroke(); }
    g.fillStyle = '#3a2c24'; g.fillRect(120, 1380, 110, 170); g.fillStyle = '#2a201a'; g.fillRect(110, 1366, 130, 22);                // a chimney
  }, 12);
  const mast = () => sprite('so_mast', 220, 900, 110, 880, (g) => {
    g.strokeStyle = '#8a8070'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(-70, 0); g.lineTo(-6, -820); g.moveTo(70, 0); g.lineTo(6, -820); g.stroke();
    g.lineWidth = 4; for (let k = 0; k < 9; k++) { const y0 = -k * 90, y1 = -(k + 1) * 90, w0 = 70 - k * 7, w1 = 70 - (k + 1) * 7; g.beginPath(); g.moveTo(-w0, y0); g.lineTo(w1, y1); g.moveTo(w0, y0); g.lineTo(-w1, y1); g.moveTo(-w1, y1); g.lineTo(w1, y1); g.stroke(); }
    g.fillStyle = '#5a5248'; g.fillRect(-90, -10, 180, 20);
  }, 8);
  const onair = () => sprite('so_onair', 230, 90, 115, 45, (g) => { g.fillStyle = '#2a201a'; g.beginPath(); g.roundRect(-110, -40, 220, 80, 10); g.fill(); g.fillStyle = '#5a1410'; g.font = '40px "Anton-400"'; g.textAlign = 'center'; g.fillText('ON AIR', 0, 15); }, 6);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.7) * 8, y: 0, z: move(lt, 0, 3.0, 1.0, 1.06), fx: 540, fy: 1300 };
      const on = lt >= T_ON, lamp = on ? 0.8 + 0.2 * Math.sin(lt * 9) : 0, chord = clamp((lt - T_CHORD) / 0.25, 0, 1);
      const MX = 850, MY = 1530, TOPY = MY - 820;
      stack(c, [
        { sh: dusk('so', 1300), d: 0.02, lift: 0 },
        { fn: (g, ox) => { for (let i = 0; i < 40; i++) { const x = (i * 263 + 71) % 1080, y = 120 + (i * 151) % 620, tw = 0.3 + 0.3 * Math.sin(lt * 3 + i); g.fillStyle = `rgba(230,220,200,${tw * 0.5})`; g.fillRect(x + ox, y, 3, 3); } }, d: 0.02 },   // stars
        { sh: city(), d: 0.06, lift: 0.5 },
        { fn: (g, ox) => glow(g, 540 + ox, 840, 260, 'rgba(120,200,160,', 0.08), d: 0.06 },
        { sh: row(), d: 0.12, lift: 0.6 },
        { sh: roof(), d: 0.2, lift: 0.8 },
        { fn: (g, ox) => {
          // the rings: magenta card arcs that open out of the mast top, one per note, the last on the chord
          for (const [i, t0] of RINGS.entries()) { const k = clamp((lt - t0) / 1.4, 0, 1); if (k <= 0 || k >= 1) continue; const r = lerp(30, 520, ease.out(k)); g.save(); g.globalAlpha = (1 - k) * (i === 2 ? 1 : 0.8); g.strokeStyle = K.mag; g.lineWidth = lerp(16, 4, k); for (const s of [-1, 1]) { g.beginPath(); g.arc(MX + ox, TOPY, r, s > 0 ? -0.55 : Math.PI - 0.55 + 1.1 - 1.1, s > 0 ? 0.55 : Math.PI + 0.55); g.stroke(); } g.restore(); }
          put(g, mast(), MX + ox, MY, { lift: 1.4 });
          ledAt(g, MX + ox, TOPY - 12, 12, on ? 0.6 + 0.4 * Math.sin(lt * 6) : 0); if (on) glow(g, MX + ox, TOPY - 12, 90, 'rgba(255,60,40,', 0.4);
          put(g, onair(), 175 + ox, 1320, { lift: 1.2 }); if (on) { g.save(); g.fillStyle = `rgba(255,${lerp(60, 90, lamp)},60,${lamp})`; g.font = '40px "Anton-400"'; g.textAlign = 'center'; g.fillText('ON AIR', 175 + ox, 1335); g.restore(); glow(g, 175 + ox, 1320, 150, 'rgba(255,70,50,', 0.35 * lamp); }
          if (chord > 0) glow(g, 430 + ox, 1590, 260, 'rgba(240,2,127,', 0.25 * chord);   // the mask lights on the chord
          walker(g, 430 + ox, 1590, 0.95, { coat: '#2e3236', scarf: K.ochre, t: lt, step: 0, tilt: Math.sin(lt * 1.3) * 0.03, look: 0.25, led: chord > 0 && Math.sin(lt * 8) > 0, lift: 1.4 });
          g.strokeStyle = '#4a443c'; g.lineWidth = 8; g.beginPath(); g.moveTo(560 + ox, 1900); g.lineTo(540 + ox, 1660); g.lineTo(505 + ox, 1630); g.stroke();   // the mic stand
          g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(498 + ox, 1624, 18, 26, -0.6, 0, TAU); g.fill(); g.fillStyle = '#5a5a5a'; g.beginPath(); g.ellipse(494 + ox, 1618, 9, 14, -0.6, 0, TAU); g.fill();
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
