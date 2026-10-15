// Shot 2 · 6.4–12.9 s · The copy. A masked person (a generic face, a Toko mask in orange) stands by a
// beech-and-red copying press. Its lens reads them; the platen comes down on the beat four times and
// each time a copy slides out to the row along the bottom — the face, the face again, the voice (a
// sound wave), the moves (a figure mid-step) — and each copy gets its © tag.
SCENES['sat_copy'] = (() => {
  const { W, H, sheet, stack, put, glow, ease, move, pop, walker } = RFP, S = SAT, C = S.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, PX = 650, PY = 1290, STAMP = [2, 4, 6, 8].map((k) => k * B), SLIDE = 0.5;
  const MASK = RFM.S.ORANGE, COAT = C.copperD;
  const SPOTS = [[235, 1690], [450, 1690], [665, 1690], [880, 1690]];
  const room = () => sheet('sat_workshop', (g) => {
    g.fillStyle = C.cream; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.beech; g.fillRect(-90, 1180, W + 180, 400); g.fillStyle = C.beechL; g.fillRect(-90, 1176, W + 180, 10);
    g.fillStyle = 'rgba(140,104,56,.18)'; for (let x = -60; x < W + 90; x += 120) g.fillRect(x, 1190, 4, 380);
    g.fillStyle = C.beechD; g.fillRect(-90, 1570, W + 180, H); g.fillStyle = C.beechDD; g.fillRect(-90, 1570, W + 180, 8);
    g.fillStyle = C.red; g.fillRect(-90, 1160, W + 180, 16);
  }, 12);
  function platenY(lt) {   // the platen's bottom: up at PY − 420, slammed to the bed on each beat
    let y = PY - 420;
    for (const t of STAMP) { const a = lt - (t - 0.12); if (a < 0 || a > 0.6) continue; y = a < 0.12 ? lerp(PY - 420, PY - 14, (a / 0.12) ** 2) : a < 0.2 ? PY - 14 : lerp(PY - 14, PY - 420, ease.out((a - 0.2) / 0.4)); }
    return y;
  }
  function copy(g, i, x, y, sc, ox) {
    if (i < 2) { put(g, RFP.sprite('sat_copyback', 200, 200, 100, 100, (q) => { q.fillStyle = C.white; S.rr(q, -92, -92, 184, 184, 14); }, 8), x + ox, y, { sc, lift: 1.2 }); S.person(g, x + ox, y, 74 * sc, MASK); }
    else put(g, i === 2 ? S.voiceCard() : S.movesCard(COAT), x + ox, y, { sc: sc * 0.92, lift: 1.2 });
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: move(lt, 0, DUR, 1.0, 1.05), fx: 540, fy: 1300 };
      const ks = clamp((lt - 0.25) / 0.7, 0, 1), py = platenY(lt);
      stack(c, [
        { sh: room(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { S.candle(g, 920 + ox, 1166, lt, 0.7); }, d: 0.05 },
        { fn: (g, ox) => {
          walker(g, 214 + ox, 1010, 0.82, { coat: COAT, scarf: C.red, color: MASK, t: lt, tilt: Math.sin(lt * 1.1) * 0.03, look: 0.3, led: false, lift: 1.2 });
          // the lens reading them: a light that sweeps down the mask
          if (ks > 0 && ks < 1) { const yy = lerp(900, 1020, Math.sin(ks * Math.PI * 2) * 0.5 + 0.5); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,110,${0.22 * Math.sin(ks * Math.PI)})`; g.beginPath(); g.moveTo(PX - 306 + ox, PY - 526 + 0); g.lineTo(250 + ox, yy - 76); g.lineTo(250 + ox, yy + 76); g.closePath(); g.fill(); g.restore(); g.fillStyle = `rgba(255,90,80,${0.8 * Math.sin(ks * Math.PI)})`; g.fillRect(150 + ox, yy - 3, 160, 6); }
          // the press: the screw, the platen, the body
          g.fillStyle = C.brassD; g.fillRect(PX - 14 + ox, PY - 500, 28, Math.max(10, py - (PY - 500) - 60)); g.fillStyle = C.brassL; for (let y = PY - 500; y < py - 60; y += 18) g.fillRect(PX - 14 + ox, y, 28, 5);
          put(g, S.pressBody(), PX + ox, PY, { lift: 1.2 });
          // what is on the bed, just stamped (before it slides away)
          STAMP.forEach((t, i) => { if (lt >= t && lt < t + 0.18) copy(g, i, PX, PY - 96, 0.86, ox); });
          put(g, S.platen(), PX + ox, py, { lift: 1.4 });
        }, d: 0.2 },
        { fn: (g, ox) => {
          // the copies: out of the press, down to their places, then the © tag
          STAMP.forEach((t, i) => {
            const k = clamp((lt - t - 0.18) / SLIDE, 0, 1); if (lt < t + 0.18) return;
            const [sx, sy] = SPOTS[i], e = ease.out(k), x = lerp(PX, sx, e), y = lerp(PY - 96, sy, e) - Math.sin(k * Math.PI) * 90;
            copy(g, i, x, y, lerp(0.86, 0.8, e), ox);
            const kt = pop(lt, t + 0.18 + SLIDE + 0.05, 0.3); if (kt > 0) { g.save(); g.translate(sx + 70 + ox, sy - 80); g.rotate(Math.sin(lt * 3 + i) * 0.08 * Math.exp(-(lt - t - 0.7) * 1.5) - 0.12); g.scale(kt, kt); put(g, S.ctag(84, 64), 0, 0, { lift: 1.3 }); g.restore(); }
          });
        }, d: 0.24 },
      ], cam);
      S.box(c);
    },
  };
})();
