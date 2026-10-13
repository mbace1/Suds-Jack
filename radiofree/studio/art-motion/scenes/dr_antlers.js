// Shot 5 · 25.7–32.1 s · Clip after clip. The hall: a warm wall lit by a lamp low on the
// left, the coat rack with its curved hooks. The hound trots in and stops beside the rack —
// and on the wall its big shadow wears the rack's hooks as antlers. A notification badge
// ticks over as it goes: DEER ×2, ×3, ×4.
SCENES['dr_antlers'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, put, glow, ease, move, pop, canvas } = RFP, D = DR, { clamp, lerp } = U;
  const B = 60 / 112, T_GO = 0.3, T_STOP = 2.2, S = 1.5, GY = 1700;
  let sil = null;                                                                     // the wall's shadow, drawn as one silhouette
  /** the shadow transform: a low lamp on the left throws things big and up the wall */
  const proj = (g) => { g.translate(-250, -800); g.scale(S, S); };
  return {
    draw(c, lt) {
      const k = ease.out(clamp((lt - T_GO) / (T_STOP - T_GO), 0, 1)), x = lerp(-120, 430, k), trot = lt > T_GO && lt < T_STOP ? 1 - Math.pow(k, 6) : 0;
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, T_STOP, 2.0, 1.0, 1.05), fx: 640, fy: 1000 };
      const n = lt < 2.7 ? 2 : lt < 3.2 ? 3 : 4;
      stack(c, [
        { sh: sheet('dr_hall', (g) => { g.fillStyle = '#4a3f32'; g.fillRect(-90, -90, W + 180, 1700); g.fillStyle = 'rgba(0,0,0,.06)'; for (let x = -90; x < W + 90; x += 70) g.fillRect(x, -90, 28, 1700); g.fillStyle = '#2e241a'; g.fillRect(-90, 1590, W + 180, 24); g.fillStyle = D.C.floor; g.fillRect(-90, 1610, W + 180, H); }), d: 0.08, lift: 0 },
        { fn: (g, ox) => {
          glow(g, -40 + ox, 1300, 900, 'rgba(240,170,70,', 0.34);
          // the shadows on the wall: the dog's (moving) and the rack's hooks, which the dog's head walks into
          if (!sil) sil = canvas(W, H);
          const s = sil.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, W, H);
          s.save(); proj(s); D.dog(s, x, GY - 220, 1.0, { dir: 1, t: lt, trot, lift: 0 }); s.restore();
          const ka = RFP.ease.back(clamp((lt - T_STOP + 0.05) / 0.3, 0, 1));   // the antlers grow only once the head is under them
          if (ka > 0) { s.save(); proj(s); s.translate(658, 1144); s.scale(ka, ka); s.translate(-658, -1144); s.drawImage(hooks(), 0, 0); s.restore(); }
          s.globalCompositeOperation = 'source-in'; s.fillStyle = 'rgba(12,8,5,.55)'; s.fillRect(0, 0, W, H); s.globalCompositeOperation = 'source-over';
          g.drawImage(sil, ox * 0.5, 0);
        }, d: 0.1 },
        { fn: (g, ox) => {
          put(g, D.rack(), 230 + ox, 1640, { lift: 1.4 });
          D.dog(g, x + ox, GY, 1.0, { dir: 1, t: lt, trot, look: lt > T_STOP ? 0.08 : 0 });
        }, d: 0.3 },
      ], cam);
      // the badge: the brief's tally, ticking
      [2.1, 2.7, 3.2].forEach((t0, i) => { const kb = pop(lt, t0, 0.22); if (kb > 0) { c.save(); c.translate(290 + i * 34, 740 + i * 76); c.rotate((i - 1) * 0.05); D.label(c, 'DEER', 0, 0, kb * 1.2); c.restore(); } });   // the tags pile up; no count (no source gives one)
      box(c);
    },
  };
  /** the rack's hooks as they fall on the wall, positioned to crown the shadow's head where the dog stops */
  function hooks() {
    if (hooks.c) return hooks.c;
    const c = RFP.canvas(W, H), g = c.getContext('2d'); g.strokeStyle = '#000'; g.lineWidth = 12; g.lineCap = 'round';
    const hx = 430 + 228, hy = 1700 - 220 - 336;                                     // the crown of the dog's head at its stop, in the dog's own space
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + s * 46, hy - 6, hx + s * 60, hy - 58); g.moveTo(hx, hy + 30); g.quadraticCurveTo(hx + s * 74, hy + 30, hx + s * 88, hy - 26); g.stroke(); }
    g.lineWidth = 12; g.beginPath(); g.moveTo(hx, hy - 30); g.lineTo(hx, hy + 60); g.stroke();
    return (hooks.c = c);
  }
})();
