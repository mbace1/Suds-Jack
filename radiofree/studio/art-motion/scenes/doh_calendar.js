// Shot 4 · 19.3–25.7 s · Eight days. A tear-off calendar on a dark wall under a lamp,
// SEPTEMBER 2026, open on Tuesday the 1st. On every half-beat a page tears off and flutters
// away — 2, 3, 4 … — until it reads Wednesday the 9th. Then the cheque from the first film
// comes down in front of it on its two strings and lands: €13 000 000 000, dated 9.9.2026.
SCENES['doh_calendar'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, put, glow, ease, move } = RFP, D = DOH, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T0 = 0.6, STEP = B / 2, T_CHQ = T0 + 8 * STEP + 0.35, T_LAND = T_CHQ + 0.7, CX = 540, CY = 800;
  const DAYS = ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY'];
  const wall = () => sheet('doh_wallpaper', (g) => {
    g.fillStyle = '#26201b'; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = 'rgba(255,230,190,.035)'; for (let x = -90; x < W + 90; x += 60) g.fillRect(x, -90, 22, H + 180);
    g.fillStyle = '#1c1814'; g.fillRect(-90, 1640, W + 180, H);                                           // the skirting and floor
  }, 14);
  const page = (d) => sprite('doh_page_' + d, 560, 600, 280, 0, (g) => {
    g.fillStyle = K.card; g.fillRect(-250, 0, 500, 560);
    g.fillStyle = d === 9 ? K.mag : K.ink; g.font = '360px "Anton-400"'; g.textAlign = 'center'; g.fillText(String(d), 0, 410);
    g.fillStyle = K.ink; g.font = '40px "ArchivoBlack-400"'; g.fillText(DAYS[d - 1], 0, 500);
    g.fillStyle = 'rgba(21,18,15,.35)'; for (let x = -230; x < 230; x += 24) g.fillRect(x, 4, 12, 6);  // the perforation
  }, 8);
  const header = () => sprite('doh_calhead', 600, 220, 300, 200, (g) => {
    g.fillStyle = K.ink; g.beginPath(); g.roundRect(-270, -170, 540, 170, 10); g.fill();
    g.fillStyle = K.card; g.font = '58px "Anton-400"'; g.textAlign = 'center'; g.fillText('SEPTEMBER', 0, -88); g.font = '34px "ArchivoBlack-400"'; g.fillText('2026', 0, -36);
    g.fillStyle = '#8a8a80'; g.beginPath(); g.arc(0, -150, 9, 0, TAU); g.fill();                         // the nail
  }, 10);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.6) * 12, y: 0, z: move(lt, T_LAND - 0.1, 1.4, 1.0, 1.06), fx: CX, fy: 1300 };
      const torn = clamp(Math.floor((lt - T0) / STEP) + 1, 0, 8);                 // how many pages are gone
      const k = clamp((lt - T_CHQ) / (T_LAND - T_CHQ), 0, 1), drop = 1 - Math.pow(1 - k, 3);
      // the cheque swings in from the right on its strings and settles — it never crosses the captions above
      const settle = lt > T_LAND ? Math.sin((lt - T_LAND) * 6) * Math.exp(-(lt - T_LAND) * 3) : 0;
      const qx = lerp(CX + 900, CX, drop) + settle * 40, qy = 1580 - Math.sin(clamp(1 - drop, 0, 1) * Math.PI / 2) * 140, qs = lerp(-0.35, 0, drop) - settle * 0.05 + Math.sin(lt * 1.3) * 0.02;
      stack(c, [
        { sh: wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => {
          glow(g, CX + ox, 700, 700, 'rgba(240,170,70,', 0.28);
          // the block: the page underneath, then the current one
          if (torn < 8) put(g, page(torn + 2), CX + ox, CY, { lift: 0.4 });
          put(g, page(torn + 1), CX + ox, CY, { lift: 1.2 });
          put(g, header(), CX + ox, CY + 10, { lift: 1.6 });
          // the pages in the air: each one peels, lifts and drifts down to the left or right
          for (let i = 0; i < torn; i++) {
            const t = lt - (T0 + i * STEP), side = i % 2 ? 1 : -1; if (t > 0.45) continue;
            const x = CX + ox + side * (60 + t * 2300), y = CY + 40 - t * 500 + t * t * 3000, r = side * (0.3 + t * 7);
            put(g, page(i + 1), x, y, { rot: r, sc: 0.86, lift: 2 + t * 3 });
          }
        }, d: 0.25 },
        { fn: (g, ox) => {
          if (lt < T_CHQ) return;
          glow(g, qx + ox, qy + 40, 520, 'rgba(240,170,70,', 0.28 * k);
          g.strokeStyle = K.cardD; g.lineWidth = 3; for (const sx of [-300, 300]) { g.beginPath(); g.moveTo(CX + sx + ox, -50); g.lineTo(qx + sx * Math.cos(qs) + ox + 170 * Math.sin(qs), qy - 170 * Math.cos(qs) + sx * Math.sin(qs)); g.stroke(); }
          put(g, D.cheque(), qx + ox, qy, { rot: qs, lift: 3 });
        }, d: 0.45 },
      ], cam);
      box(c);
    },
  };
})();
