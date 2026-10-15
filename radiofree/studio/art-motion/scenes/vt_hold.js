// Shot 4 · 19.3–25.7 s · The hold lasted 17 days. The Institute's room again: a tear-off calendar on the panelling,
// DAY 1. Its pages tear away, on the beat and then faster, while the window beside it goes day, night, day; the cup
// on the table stops steaming and its tea goes cold; the one box that stayed waits beside it with its tag. The last
// page lands: DAY 17, in the telephone's red, and the camera settles on it.
SCENES['vt_hold'] = (() => {
  const { stack, put } = RFP, V = VT, { clamp, lerp } = U, B = V.B;
  const TEARS = [1, 1.5, 2, 2.5, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75].map((b) => b * B);
  const NX = 646, NY = 650, DY = 240;
  const night = (lt) => { const all = [0, ...TEARS]; for (let i = 0; i < all.length - 1; i++) if (lt >= all[i] && lt < all[i + 1]) { const p = (lt - all[i]) / (all[i + 1] - all[i]); return 0.5 - 0.5 * Math.cos(p * Math.PI * 2); } return 0; };
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.55) * 8, y: 0, z: 1 }, torn = TEARS.filter((t) => lt >= t).length, kz = V.eo((lt - 3.2) / 1.3);
      c.save(); V.camera(c, lerp(540, 640, kz), lerp(960, 1000, kz), lerp(1, 1.12, kz));
      stack(c, [
        { sh: V.room(), d: 0.06, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); g.beginPath(); g.rect(128, V.WIN.y0, 222, V.WIN.y1 - V.WIN.y0); g.clip(); V.paneView(g, night(lt)); V.sashBars(g); g.restore(); }, d: 0.06 },
        { fn: (g, ox) => {
          const x = NX + ox;
          put(g, V.calBoard(), x, NY, { lift: 0.8 });
          if (torn < 16) put(g, V.calPage(torn + 2), x, NY + 52, { lift: 0.3 });
          put(g, V.calPage(torn + 1), x, NY + 52, { lift: 1 });
          for (let i = 0; i < torn; i++) {
            const t = lt - TEARS[i], side = i % 2 ? 1 : -1; if (t > 0.5) continue;
            put(g, V.calPage(i + 1), x + side * (40 + t * 1900), NY + 60 - t * 520 + t * t * 2600, { rot: side * (0.25 + t * 6), sc: 0.9, lift: 2 + t * 3 });
          }
          if (torn === 16) { const k = clamp((lt - TEARS[15]) / 0.5, 0, 1); RFP.glow(g, x, NY + 320, 380, 'rgba(255,236,200,', 0.25 * Math.sin(k * Math.PI)); }
        }, d: 0.1 },
        { sh: V.table(), d: 0.14, lift: 0.7, y: DY },
        { fn: (g, ox) => {
          const top = V.TOP + DY;
          V.string(g, [[835 + ox - 72, top - 28], [520 + ox, top - 6], [-RFP.M - 20, top - 2]], { wob: 2.5, t: lt });
          V.put2(g, V.parcel(), 835 + ox, top, { sc: 0.9, lift: 0.9 });
          V.string(g, [[835 + ox + 20, top - 6], [835 + ox + 24, top + 30]], { w: 2.4 });
          V.put2(g, V.ticket(), 835 + ox + 24, top + 30, { sc: 0.8, rot: Math.sin(lt * 1.5) * 0.05, lift: 1.3 });
          V.cup(g, 300 + ox, top + 2, 1.45, { heat: 1 - clamp((lt - 0.3) / 3.0, 0, 1), cold: clamp((lt - 0.6) / 3.2, 0, 1), t: lt });
        }, d: 0.14 },
      ], cam);
      c.restore();
      V.frame(c);
    },
  };
})();
