// Shot 4 · 19.3–25.7 s · The odds. The companies' table, four nameplates — META, DOODLE,
// OPENAI, ANTHROPIC — four microphones. A card comes down from the dais: THE ODDS? At each
// place a gloved hand holds up an answer card, one after another. Every one is blank.
SCENES['cw_odds'] = (() => {
  const { K, W, H, sprite, stack, box, put, glow, ease, move, pop, hand } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_Q = 0.5, T_A = 4 * B, PLACES = [['META', 180], ['DOODLE', 410], ['OPENAI', 640], ['ANTHROPIC', 870]];
  const q = () => sprite('cw_q', 520, 200, 260, 100, (g) => { g.fillStyle = K.card; g.beginPath(); g.roundRect(-230, -80, 460, 160, 10); g.fill(); g.strokeStyle = K.ink; g.lineWidth = 5; g.strokeRect(-216, -66, 432, 132); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '92px "Anton-400"'; g.fillText('THE ODDS?', 0, 34); }, 10);
  const blank = () => sprite('cw_blank', 200, 240, 100, 120, (g) => { g.fillStyle = '#e8e2d4'; g.fillRect(-80, -100, 160, 200); g.fillStyle = 'rgba(21,18,15,.22)'; g.font = '120px "Anton-400"'; g.textAlign = 'center'; g.fillText('?', 0, 44); }, 6);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, T_A, 2.4, 1.0, 1.05), fx: 540, fy: 1250 };
      const kq = ease.out(clamp((lt - 0.3) / 0.45, 0, 1)), qy = lerp(-200, 740, kq) + Math.sin(lt * 1.6) * 6;
      stack(c, [
        { sh: D.chamber(), d: 0.06, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 1200, 700, 'rgba(240,170,70,', 0.22); g.strokeStyle = K.cardD; g.lineWidth = 3; if (qy > 680) { g.beginPath(); g.moveTo(540 + ox, 640); g.lineTo(540 + ox, qy - 80); g.stroke(); } put(g, q(), 540 + ox, qy, { rot: Math.sin(lt * 1.1) * 0.03, lift: 2 }); }, d: 0.12 },
        { fn: (g, ox) => {
          PLACES.forEach(([name, x], i) => {
            const ka = pop(lt, T_A + i * 0.32, 0.25);
            if (ka > 0) { hand(g, x + ox, 1250 + (1 - Math.min(ka, 1)) * 200, 0.6, 0, { sleeve: '#23272b', cuff: '#e8e2d4' }); put(g, blank(), x + ox, 1120 + (1 - Math.min(ka, 1)) * 200, { sc: Math.min(ka, 1.1) * 0.95, rot: (i - 1.5) * 0.04, lift: 1.6 }); }
          });
        }, d: 0.3 },
        { sh: D.table(), d: 0.3, lift: 1.2, y: -40 },
        { fn: (g, ox) => PLACES.forEach(([name, x]) => { D.mic(g, x + 50 + ox, 1440, lt, 0.2, 0.7); put(g, D.plate(name, 196, 22), x + ox, 1520, { lift: 1.4 }); }), d: 0.3 },   // one plate size for all four
      ], cam);
      box(c);
    },
  };
})();
