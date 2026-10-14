// Shot 3 · 12.9–19.3 s · The many. The globe in its one hand, high up; from below, hands rise —
// dozens, cut in coat colours, reaching for it. A tally lands among them: 62%.
SCENES['hp_hands'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move, pop } = RFP, D = HP, { clamp, lerp } = U;
  const B = 60 / 112, R = U.rng(21), HANDS = Array.from({ length: 22 }, (_, i) => ({ x: 70 + (i / 21) * 940 + (R() - 0.5) * 40, t: 0.2 + R() * 1.8, top: 1180 + R() * 330, s: 0.8 + R() * 0.45, c: D.COATS[i % 6], k: 0.6 + R() * 0.8, ph: R() * 6 }));
  const tally = () => RFP.sprite('hp_62', 420, 220, 210, 110, (g) => { g.strokeStyle = K.mag; g.lineWidth = 10; g.strokeRect(-190, -90, 380, 180); g.fillStyle = K.mag; g.font = '150px "Anton-400"'; g.textAlign = 'center'; g.fillText('62%', 0, 56); }, 3);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 3.0, 1.06, 1.0), fx: 540, fy: 1100 };
      stack(c, [
        { sh: sheet('hp_dark', (g) => { g.fillStyle = '#14161a'; g.fillRect(-90, -90, W + 180, H + 180); }), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 820, 520, 'rgba(240,170,70,', 0.3); const gy = 790 - ease.out(clamp((lt - 3.2) / 1.6, 0, 1)) * 60 + Math.sin(lt * 1.4) * 6; D.globe(g, 540 + ox, gy, 120, lt * 0.5 + 3.2); put(g, D.reach('#23272b', 0.5), 540 + ox, gy - 150, { sc: 0.7, rot: Math.PI, lift: 1.4 }); }, d: 0.12 },
        { fn: (g, ox) => {
          for (const h of HANDS) { const k = ease.out(clamp((lt - h.t) / 0.8, 0, 1)); if (k <= 0) continue; put(g, D.reach(h.c, h.k), h.x + ox + Math.sin(lt * 1.3 + h.ph) * 6, lerp(2100, h.top, k) + Math.sin(lt * 2.6 + h.ph) * 16, { sc: h.s, rot: (h.x - 540) * -0.0003 + Math.sin(lt + h.ph) * 0.02, lift: 1.4 }); }
        }, d: 0.3 },
        { fn: (g, ox) => { const kt = pop(lt, 2.0, 0.2); if (kt > 0) put(g, tally(), 540 + ox, 1300, { sc: lerp(1.5, 1, Math.min(kt, 1)), rot: -0.06, lift: 0.4 }); }, d: 0.3 },
      ], cam);
      D.tag(c, 'REUTERS/IPSOS · US VOTERS', lt, 6.43);
      box(c);
    },
  };
})();
