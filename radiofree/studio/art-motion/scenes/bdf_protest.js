// Shot 6 · 16.1–18.2 s · The people. Helsinki at night outside Doodle's glass office,
// its name lit in ochre over the lobby. A crowd in magenta masks — in city coats, not the
// Muhos residents' — holds up placards cut as spruces, rising on the beat and all at
// once on the last hit; a tag says what it was: about 100, Arkadiankatu, 12.10. Above it,
// on a card of its own, the OTHER thing that happened: the citizens' initiative to
// parliament, 50 000 signatures within days. Two events, kept apart on screen (v2
// review: one picture made them read as 50 000 people at Doodle's door).
SCENES['bdf_protest'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, pop, walker } = RFP, { C } = BDF, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_HIT = 1.28;
  const office = () => sheet('bdf_office', (g) => {
    g.fillStyle = '#20231f'; g.fillRect(-90, 200, W + 180, 1100);
    g.fillStyle = '#3b3a2c'; for (let y = 260; y < 1100; y += 120) for (let x = 40; x < W; x += 140) g.fillRect(x, y, 110, 90);    // the glass, dark floors
    g.fillStyle = '#5a4a2c'; for (const [x, y] of [[320, 380], [600, 500], [180, 620], [880, 380]]) g.fillRect(x, y, 110, 90);    // a few floors still lit
    g.fillStyle = '#c98a44'; g.fillRect(200, 980, 680, 260);                                                                          // the lobby
    g.fillStyle = K.ochre; g.font = '120px "PlayfairDisplay-700"'; g.textAlign = 'center'; g.fillText('Doodle', 540, 940);
    g.fillStyle = K.card; g.font = '22px "RobotoCondensed"'; g.fillText('ARKADIANKATU · HELSINKI', 540, 975);
  });
  const placard = (k) => sprite('bdf_placard_' + k, 200, 420, 100, 400, (g) => {
    g.fillStyle = '#6a5038'; g.fillRect(-6, -160, 12, 160);
    g.save(); g.translate(0, -150); BDF.spruceShape(g, 250, ['#2f5a3e', '#3f6a4a', '#294f38'][k], '#5a8a66', k + 2); g.restore();
  }, 8);
  const ROWS = [[1420, 0.62, 9], [1560, 0.8, 7], [1730, 1.0, 5]];
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.9) * 14, y: 0, z: move(lt, 0, 2.1, 1.12, 1), fx: 540, fy: 1400 };
      const all = lt >= T_HIT;
      stack(c, [
        { sh: dusk('bdf', 600), d: 0.04, lift: 0 },
        { sh: office(), d: 0.18, lift: 0.8 },
        { fn: (g, ox) => glow(g, 540 + ox, 1100, 520, 'rgba(240,170,70,', 0.3), d: 0.18 },
        { sh: sheet('bdf_pave', (g) => { g.fillStyle = '#1a1714'; g.fillRect(-90, 1260, W + 180, H); }), d: 0.3, lift: 0.5 },
        { fn: (g, ox) => {
          // the crowd, back rows first; placards bob on the beat, then all go up together on the hit
          for (const [ri, [y, s, n]] of ROWS.entries()) for (let i = 0; i < n; i++) {
            const x = ((i + 0.5 + (ri % 2) * 0.3) / n) * (W + 120) - 60 + ox * (0.5 + ri * 0.25), ph = i * 0.7 + ri;
            const bob = all ? -60 * ease.back((lt - T_HIT) / 0.25) : -Math.max(0, Math.sin((lt / B) * Math.PI + ph)) * 26;
            put(g, placard((i + ri) % 3), x + 60 * s, y - 120 * s + bob * s, { sc: s, rot: Math.sin(lt * 2 + ph) * 0.05, lift: 1 + ri * 0.5 });
            walker(g, x, y, s, { coat: ['#3a3530', '#4a3a2c', '#2e3236', '#5a4630'][(i + ri) % 4], scarf: ['#8a7a5a', K.ochre, '#5a5a52'][(i * 2 + ri) % 3], t: lt + ph, tilt: Math.sin(lt * 2.4 + ph) * 0.05, led: false, lift: 1.2 + ri * 0.5 });
          }
        }, d: 0.5 },
      ], cam);
      // the signatures: sheets falling like leaves, and the counter
      // the crowd's own tag: what this was, and how many
      c.save(); c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(110, 1180, 500, 70, 8); c.fill(); c.restore();
      c.fillStyle = K.ink; c.font = '34px "ArchivoBlack-400"'; c.fillText('≈100 · ARKADIANKATU · 12.10', 130, 1228);
      // the initiative, on a card of its own: signatures to parliament, not people at the door
      const n = all ? 50000 : Math.round(50000 * Math.pow(clamp(lt / T_HIT, 0, 1), 0.6) / 1000) * 1000;
      c.save(); c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 18; c.shadowOffsetX = 10; c.shadowOffsetY = 14; c.fillStyle = K.card; c.beginPath(); c.roundRect(170, 130, 740, 300, 12); c.fill(); c.restore();
      c.fillStyle = K.ink; c.font = '30px "ArchivoBlack-400"'; c.textAlign = 'center'; c.fillText("CITIZENS' INITIATIVE", 540, 186);
      c.fillStyle = K.mag; c.font = '130px "Anton-400"'; c.fillText(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), 540, 326);
      c.fillStyle = K.ink; c.font = '34px "ArchivoBlack-400"'; c.fillText('SIGNED · TO PARLIAMENT', 540, 392); c.textAlign = 'left';
      box(c);
    },
  };
})();
