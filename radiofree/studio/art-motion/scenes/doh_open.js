// Shot 5 · 25.7–32.1 s · Both sites were in the plan. The same gate as shot 1. The chains
// let go and ON HOLD drops, face up, into a puddle on the road; the two leaves swing open
// on their hinges; floodlights come on over the site; the cranes slew round; three workers,
// seen from behind in hi-vis, the lights on their mask straps blinking, walk away into the site.
SCENES['doh_open'] = (() => {
  const { K, W, H, sheet, stack, box, dusk, put, glow, ease, move, leaves } = RFP, { C, row } = BDF, D = DOH, { clamp, lerp } = U;
  const B = 60 / 112, T_DROP = 0.5, T_OPEN = 2 * B, T_LIGHT = 3 * B, T_CRANE = 3.5 * B, T_WALK = 4 * B, SX = 540, SY = 1190;
  const WORKERS = [[380, 470, 0], [700, 600, 0.35], [520, 540, 0.7]];      // [start x on the road, end x in the site, delay]
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 12, y: 0, z: move(lt, 0.4, 5.6, 1.1, 1.0), fx: SX, fy: SY };   // shot 1's push, given back
      const fk = clamp((lt - T_DROP) / 0.4, 0, 1), fall = fk * fk;
      const sy = lerp(SY, 1610, fall), sx = lerp(SX, 700, fall), srot = lerp(0, -0.16, fall), sflat = lerp(1, 0.42, ease.out(clamp((lt - T_DROP - 0.4) / 0.12, 0, 1)));
      const open = ease.out(clamp((lt - T_OPEN) / 1.1, 0, 1)), light = clamp((lt - T_LIGHT) / 0.15, 0, 1) * (0.9 + 0.1 * Math.sin(lt * 23));
      const slew = ease.out(clamp((lt - T_CRANE) / 2.4, 0, 1));
      stack(c, [
        { sh: dusk('doh', 1150), d: 0.04, lift: 0 },
        { sh: row('doh_far', 1170, 16, 300, C.far, null, 41), d: 0.1, lift: 0.4 },
        { fn: (g, ox) => { D.crane(g, 200 + ox, 1190, 500, 470, lerp(0.15, 1.1, slew), lt); D.crane(g, 880 + ox, 1200, 420, 400, lerp(Math.PI - 0.25, Math.PI + 0.9, slew), lt + 0.4); }, d: 0.14 },
        { sh: D.site(), d: 0.2, lift: 0.4 },
        { fn: (g, ox) => {
          // floodlights on two poles: a bar of lamps and a cone of light down onto the site
          for (const [x, y] of [[420, 960], [700, 940]]) {
            g.fillStyle = '#1b1a17'; g.fillRect(x - 5 + ox, y, 10, 220); g.fillRect(x - 40 + ox, y - 16, 80, 22);
            g.fillStyle = light > 0.05 ? '#ffe6b0' : '#4a4236'; g.fillRect(x - 34 + ox, y - 12, 68, 12);
            if (light > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, y, 0, y + 420); gr.addColorStop(0, `rgba(255,214,140,${0.22 * light})`); gr.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 34 + ox, y); g.lineTo(x + 34 + ox, y); g.lineTo(x + 170 + ox, y + 420); g.lineTo(x - 170 + ox, y + 420); g.closePath(); g.fill(); g.restore(); glow(g, x + ox, y + 200, 300, 'rgba(240,170,70,', 0.25 * light); }
          }
        }, d: 0.24 },
        { fn: (g, ox) => {
          // the leaves swing open on their outer hinges — a leaf turning towards us narrows
          const sc = lerp(1, 0.16, open);
          for (const [dir, hx] of [[1, D.GX0], [-1, D.GX1]]) { g.save(); g.translate(hx + ox, D.GY1); g.scale(sc, 1); put(g, D.leaf(dir), 0, 0, { lift: 0.6 + open * 0.8 }); g.restore(); }
          if (lt < T_DROP) { const top = D.GY0 + 30; D.chain(g, SX - 160 + ox, top, SX - 160 + ox, SY - 72); D.chain(g, SX + 160 + ox, top, SX + 160 + ox, SY - 72); }
        }, d: 0.3 },
        { sh: D.hoarding(), d: 0.3, lift: 1.2 },
        { fn: (g, ox) => glow(g, 980 + ox, 760, 520, 'rgba(240,170,70,', 0.22), d: 0.3 },
        { sh: D.road(), d: 0.4, lift: 0.6 },
        { fn: (g, ox) => {
          // the sign falls in front of the gate and lands flat on the road
          g.save(); g.translate(sx + ox, sy); g.scale(1, sflat); put(g, D.sign(), 0, 0, { rot: srot, lift: lerp(2, 0.3, fall) }); g.restore();
          // the workers walk in: from the road at our feet, through the open gate, small into the light
          for (const [x0, x1, dl] of WORKERS) {
            const k = clamp((lt - T_WALK - dl) / 2.6, 0, 1); if (k <= 0) continue;
            const e = ease.out(k), y = lerp(2050, 1190, e), s = lerp(1.0, 0.3, e);
            D.worker(g, lerp(x0, x1, e) + ox, y, s, lt + dl * 3, lerp(1.6, 0.6, e));
          }
        }, d: 0.4 },
      ], cam);
      leaves(c, lt + 8, { n: 6, seed: 92, cam });
      D.tag(c, '9.9.2026 · KAJAANI · MUHOS', 110, 1690, D.tagA(lt, 6.43));
      box(c);
    },
  };
})();
