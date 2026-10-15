// Shot 1 · 0–6.4 s · The living room. An American living room in card, daytime: striped wallpaper,
// a sash window, the walnut sideboard, a braided rug, a viewer in a plain grey cap on the sofa. On the TV a
// campaign ad: a waving flag, an eagle crossing, a diner on the hill — and along its foot the fine
// print, a dark strip that says PAID FOR BY (the setup for the last shot; a light runs along it).
// The camera eases in toward that strip; on the second half, magenta money drifts down into the room.
SCENES['pfb_room'] = (() => {
  const { stack, put, ease } = RFP, F = PFB, { clamp, lerp } = U;
  const DUR = 12 * 60 / 112, T_GLINT = 3.4, T_MONEY = 2.9;
  const BILLS = (() => { const r = U.rng(55), out = []; for (let i = 0; i < 12; i++) out.push({ t0: T_MONEY + i * 0.2 + r() * 0.1, x: 130 + r() * 820, land: 1560 + r() * 150, v: 640 + r() * 180, sw: 30 + r() * 40, ph: r() * 6, sc: 0.7 + r() * 0.35 }); return out; })();
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: 1 };
      const kz = ease.out(clamp(lt / DUR, 0, 1)), z = lerp(1.0, 1.08, kz), py = lerp(1260, 1200, kz);
      c.save(); F.view(c, z, 540, py);
      stack(c, F.room({
        screen: (g, w, h) => {
          F.heroAd(g, w, h, lt);
          const k = clamp((lt - T_GLINT) / 0.9, 0, 1);   // a light runs along the fine print, once
          if (k > 0 && k < 1) { const sh = 26 * h / 388, x = lerp(-120, w + 120, k), gr = g.createLinearGradient(x - 90, 0, x + 90, 0);
            gr.addColorStop(0, 'rgba(255,226,120,0)'); gr.addColorStop(0.5, 'rgba(255,226,120,.55)'); gr.addColorStop(1, 'rgba(255,226,120,0)'); g.fillStyle = gr; g.fillRect(0, h - sh, w, sh); }
        },
        bills: (g) => {
          for (const b of BILLS) {
            const tt = lt - b.t0; if (tt <= 0) continue;
            const y = Math.min(-80 + tt * b.v, b.land), landed = y >= b.land, k = landed ? (b.land + 80) / b.v : tt;
            const x = b.x + Math.sin(k * 2.4 + b.ph) * b.sw, rot = landed ? Math.sin(b.ph) * 0.5 : Math.sin(k * 3.1 + b.ph) * 0.7 + b.ph;
            put(g, F.bill(), x, y, { rot, sc: b.sc * (landed ? 1 : 0.85 + 0.15 * Math.abs(Math.cos(k * 4 + b.ph))), lift: landed ? 0.15 : 1.4, alpha: 0.35 });
          }
        },
      }), cam);
      c.restore();
      F.tag(c, 'US MIDTERMS · NOV 3', lt, DUR, 'right');
      F.box(c);
    },
  };
})();
