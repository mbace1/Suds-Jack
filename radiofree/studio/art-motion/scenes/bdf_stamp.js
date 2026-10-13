// Shot 4 · 9.6–12.8 s · The order. A desk at the supervisory agency under a lamp:
// the letter slides in — FROM: LUPA- JA VALVONTAVIRASTO, TO: DOODLE, RE: MUHOS, KAJAANI
// — lines of type, a paper clip. A gloved hand in a sleeve raises the rubber stamp and
// brings it down on the beat: SUSPEND BY 23.10. The camera slams in on the stamp.
SCENES['bdf_stamp'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, put, glow, ease, move, fist } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_STAMP = 2 * B, LX = 540, LY = 1000;
  const desk = () => sheet('bdf_desk', (g) => {
    g.fillStyle = '#2a1d15'; g.fillRect(-90, -90, W + 180, H + 180);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; for (let y = 40; y < H; y += 26) { g.beginPath(); g.moveTo(-90, y); g.bezierCurveTo(300, y + 8, 700, y - 8, W + 90, y + 4); g.stroke(); }
  });
  const letter = () => sprite('bdf_letter', 780, 1060, 390, 530, (g) => {
    g.fillStyle = K.card; g.fillRect(-360, -500, 720, 1000);
    g.fillStyle = K.ink; g.font = '30px "RobotoCondensed"'; g.fillText('LUPA- JA VALVONTAVIRASTO', -320, -420);
    g.font = '24px "RobotoCondensed"'; g.fillText('7.10.2026', 200, -420);
    g.fillText('TO: Doodle (Finland)', -320, -350); g.fillText('RE: MUHOS · KAJAANI', -320, -312);
    g.fillStyle = 'rgba(21,18,15,.55)'; const r = U.rng(4); for (let i = 0; i < 14; i++) g.fillRect(-320, -240 + i * 40, 520 + r() * 120, 12);
    g.fillStyle = K.ink; g.font = '26px "RobotoCondensed"'; g.fillText('Written explanation by 14.10.', -320, 400);   // only what the order is reported to say: no paraphrase on the agency's letterhead
    g.strokeStyle = '#8a8a86'; g.lineWidth = 6; g.beginPath(); g.moveTo(-250, -520); g.lineTo(-250, -440); g.lineTo(-220, -440); g.lineTo(-220, -500); g.stroke();   // a paper clip
  }, 14);
  // the stamp: a wooden handle, a dark base; the impression it leaves
  const stamp = () => sprite('bdf_stamp_tool', 360, 420, 180, 400, (g) => {
    g.fillStyle = '#5a3a22'; g.beginPath(); g.ellipse(0, -330, 54, 46, 0, 0, TAU); g.fill(); g.fillRect(-20, -300, 40, 150);
    g.fillStyle = '#2b2620'; g.fillRect(-160, -150, 320, 130); g.fillStyle = '#1a1612'; g.fillRect(-150, -20, 300, 20);
  }, 12);
  const mark = () => sprite('bdf_mark', 760, 240, 380, 120, (g) => {
    g.strokeStyle = K.mag; g.lineWidth = 10; g.strokeRect(-350, -100, 700, 200);
    g.fillStyle = K.mag; g.font = '96px "Anton-400"'; g.textAlign = 'center'; g.fillText('SUSPEND BY 23.10', 0, 36);
  }, 3);
  return {
    draw(c, lt) {
      const slam = lt < T_STAMP ? 1 : 1 + 0.12 * Math.exp(-(lt - T_STAMP) * 6) * (1 - Math.exp(-(lt - T_STAMP) * 40));
      const cam = { x: Math.sin(lt * 0.9) * 18, y: Math.sin(lt * 0.7) * 8, z: slam * move(lt, 0, 1.0, 1, 1.03) * move(lt, T_STAMP + 0.25, 1.4, 1, 1.22), fx: LX, fy: LY + 150 };   // after the stamp, push in on what it says
      const slide = ease.out(clamp(lt / 0.32, 0, 1));
      // the stamp: lifted, held, down on the beat, then back up
      const down = (lt - (T_STAMP - 0.25)) / 0.25;                                   // 0..1 over the last quarter second, accelerating
      const up = lt < T_STAMP - 0.25 ? 1 : lt < T_STAMP ? 1 - down * down : lt < T_STAMP + 0.35 ? 0 : ease.out((lt - T_STAMP - 0.35) / 0.7) * 3.2;   // then lifted away out of the frame
      const hover = up > 0.95 ? Math.sin(lt * 5.5) * 10 : 0;                                // the raised hand is never quite still
      const sy = LY + 120 - 380 * up + hover;
      stack(c, [
        { sh: desk(), d: 0.1, lift: 0 },
        { fn: (g) => { glow(g, 300, 300, 900, 'rgba(240,180,90,', 0.26 + 0.03 * Math.sin(lt * 13)); g.fillStyle = 'rgba(255,230,180,.45)'; const r = U.rng(8); for (let i = 0; i < 30; i++) g.fillRect((r() * 900 + lt * 14 * (r() + 0.3)) % W, 100 + (r() * 900 + lt * 22 * r()) % 1000, 3, 3); }, d: 0.1 },
        { fn: (g) => {
          put(g, letter(), LX + lerp(700, 0, slide), LY, { rot: lerp(0.3, -0.03, slide), lift: 1.4 });
          if (lt >= T_STAMP) put(g, mark(), LX, LY + 150, { rot: -0.08, lift: 0 });
        }, d: 0.2 },
        { fn: (g) => {
          put(g, stamp(), LX, sy, { rot: -0.08, lift: 1 + Math.min(up, 1) * 3 });
          fist(g, LX + 10, sy - 330, 1.2, Math.PI + 0.35, { sleeve: '#2a2f2c', cuff: '#6a5a4a', len: 900 });
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
