// Shot 1 · 0–6.4 s · The feed. A winter night in Helsinki: the Cathedral floodlit through the
// window, snow coming down. A phone in a knitted mitten; the feed flicks up and stops on a
// Sponsored post — a generic NEWS desk (no channel's name or logo: imitating them is the scam) —
// and a cardboard newsreader pops up out of it like a pop-up book: a blank oval for a face,
// GET RICH WITH CRYPTO on its sign, coins spilling out of the phone.
SCENES['nrf_feed'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop } = RFP, D = NRF, N = D.N, TAU = Math.PI * 2, { clamp, lerp } = U;
  const DUR = 12 * 60 / 112, PX = 590, PY = 1235, SW = 452, SH = 880, SX = PX - SW / 2, SY = PY - SH / 2;
  const T_LAND = 1.5, T_POP = 1.65, T_COIN = 2.15;
  const POSTS = [{ h: 600 }, { h: 600, k: 1 }, { h: 700, ad: true }, { h: 600, k: 2 }], AD_Y = 1200, TOP = 72, IMG_Y = 84, IMG_H = 520;
  const WIN = { x0: 100, x1: 980, y0: 120, y1: 880 };
  const wall = () => sheet('nrf_feed_wall', (g) => {
    g.fillStyle = N.teal; g.beginPath(); g.rect(-90, -90, W + 180, H + 180); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.fill('evenodd');
    g.fillStyle = N.teal2; g.fillRect(-90, WIN.y1 + 40, W + 180, 30);                                                  // the sill
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -60; x < W + 90; x += 180) g.fillRect(x, WIN.y1 + 70, 6, H);           // panelling below
  }, 16);
  const frame = () => sheet('nrf_feed_frame', (g) => {
    g.fillStyle = N.teal3; g.beginPath(); g.rect(WIN.x0 - 26, WIN.y0 - 26, WIN.x1 - WIN.x0 + 52, WIN.y1 - WIN.y0 + 52); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.fill('evenodd');
    g.fillRect((WIN.x0 + WIN.x1) / 2 - 12, WIN.y0, 24, WIN.y1 - WIN.y0); g.fillRect(WIN.x0, 500, WIN.x1 - WIN.x0, 22);
  }, 12);
  const view = () => sheet('nrf_feed_view', (g) => {
    ['#06121a', '#0a1c27', '#0e2633', '#13323f', '#1a4250'].forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, WIN.y0 + i * 120 - 40, W + 180, 200); });
    g.fillStyle = '#0a1b23'; let x = WIN.x0 - 40; const r = U.rng(4);
    while (x < WIN.x1 + 40) { const w = 70 + r() * 90, h = 120 + r() * 120; g.fillRect(x, 840 - h, w, h + 60); g.beginPath(); g.moveTo(x - 6, 840 - h); g.lineTo(x + w / 2, 800 - h - r() * 20); g.lineTo(x + w + 6, 840 - h); g.fill(); x += w + 4; }   // roofs
    g.fillStyle = N.white; g.globalAlpha = 0.85; x = WIN.x0 - 40; const r2 = U.rng(4);
    while (x < WIN.x1 + 40) { const w = 70 + r2() * 90, h = 120 + r2() * 120; g.beginPath(); g.moveTo(x - 6, 840 - h); g.lineTo(x + w / 2, 800 - h - r2() * 20); g.lineTo(x + w + 6, 840 - h); g.lineTo(x + w + 6, 834 - h); g.lineTo(x + w / 2, 812 - h); g.lineTo(x - 6, 834 - h); g.fill(); x += w + 4; }   // snow on the roofs
    g.globalAlpha = 1; g.fillStyle = 'rgba(232,197,71,.6)'; const r3 = U.rng(9); for (let i = 0; i < 60; i++) if (r3() < 0.5) g.fillRect(WIN.x0 + r3() * (WIN.x1 - WIN.x0), 700 + r3() * 160, 8, 11);
    D.cathedral(g, 300, 850, 0.52);
    g.fillStyle = N.white; g.fillRect(-90, 846, W + 180, 60);                                                          // the snowy square
  }, 6);
  const phone = () => sprite('nrf_phone', 540, 1000, 270, 500, (g) => { g.fillStyle = '#10181c'; g.beginPath(); g.roundRect(-250, -470, 500, 940, 56); g.fill(); g.fillStyle = '#26333a'; g.beginPath(); g.roundRect(-244, -464, 488, 928, 52); g.fill(); g.fillStyle = '#0a1216'; g.beginPath(); g.roundRect(-SW / 2, -SH / 2, SW, SH, 36); g.fill(); }, 14);
  const mitten = () => sprite('nrf_mitten', 420, 640, 160, 120, (g) => {
    g.fillStyle = N.teal3; g.beginPath(); g.moveTo(-40, 180); g.lineTo(150, 170); g.lineTo(240, 560); g.lineTo(20, 560); g.closePath(); g.fill();   // the coat sleeve
    g.fillStyle = N.white; g.beginPath(); g.roundRect(-130, -60, 290, 250, 90); g.fill();                              // the mitten
    g.beginPath(); g.roundRect(-196, -150, 100, 190, 50); g.fill();                                                     // its thumb, over the screen's edge
    g.fillStyle = N.cyan; g.fillRect(-70, 150, 240, 34); g.fillStyle = N.white; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-56 + i * 38, 160); g.lineTo(-44 + i * 38, 150); g.lineTo(-32 + i * 38, 160); g.lineTo(-44 + i * 38, 172); g.fill(); }
    g.fillStyle = N.cyan; for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { g.save(); g.translate(-80 + i * 48 + (j % 2) * 24, -10 + j * 44); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); }   // the knit's diamonds
  }, 10);
  function feedPost(g, p, y, lt) {
    g.fillStyle = '#0f1d24'; g.fillRect(0, y, SW, p.h - 8);
    if (p.ad) {
      g.fillStyle = N.gold; g.beginPath(); g.arc(40, y + 42, 24, 0, TAU); g.fill(); g.strokeStyle = N.goldD; g.lineWidth = 4; g.beginPath(); g.arc(40, y + 42, 14, 0, TAU); g.stroke();
      g.fillStyle = N.paperD; g.beginPath(); g.roundRect(78, y + 22, 170, 18, 9); g.fill();
      g.font = '26px "RobotoCondensed"'; g.textAlign = 'left'; g.fillText('Sponsored', 78, y + 70);
      D.newsSet(g, 0, y + IMG_Y, SW, IMG_H);
      g.fillStyle = N.gold; g.beginPath(); g.roundRect(16, y + IMG_Y + IMG_H + 18, SW - 32, 58, 10); g.fill();
      g.strokeStyle = N.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(SW - 60, y + IMG_Y + IMG_H + 34); g.lineTo(SW - 46, y + IMG_Y + IMG_H + 47); g.lineTo(SW - 60, y + IMG_Y + IMG_H + 60); g.stroke();
      return;
    }
    g.fillStyle = '#3a4a52'; g.beginPath(); g.arc(40, y + 42, 24, 0, TAU); g.fill(); g.fillStyle = '#34454d'; g.beginPath(); g.roundRect(78, y + 24, 150 + p.k * 30, 18, 9); g.fill(); g.beginPath(); g.roundRect(78, y + 52, 90, 14, 7); g.fill();
    g.fillStyle = p.k === 1 ? '#2a5a6a' : '#3a5560'; g.fillRect(0, y + 84, SW, 400);
    g.fillStyle = N.paperD; g.beginPath(); g.ellipse(SW * 0.5, y + 484, SW * 0.7, 120, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#0f2a2a'; for (const tx of [90, 150, 340]) { g.beginPath(); g.moveTo(tx, y + 300); g.lineTo(tx - 40, y + 420); g.lineTo(tx + 40, y + 420); g.closePath(); g.fill(); }
    g.fillStyle = '#34454d'; g.beginPath(); g.roundRect(16, y + 506, 300, 16, 8); g.fill(); g.beginPath(); g.roundRect(16, y + 534, 220, 16, 8); g.fill();
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.45) * 8, y: 0, z: move(lt, 0.4, 5.6, 1.0, 1.16), fx: PX, fy: 1150 };
      const scroll = (AD_Y - TOP) * ease.out(clamp(lt / T_LAND, 0, 1)), tilt = Math.sin(lt * 0.8) * 0.012 - 0.03;
      stack(c, [
        { sh: view(), d: 0.03, lift: 0 },
        { fn: (g, ox) => { g.save(); g.beginPath(); g.rect(WIN.x0 + ox, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.clip(); glow(g, 300 + ox, 640, 260, 'rgba(200,235,240,', 0.18); D.snow(g, lt, { n: 70, seed: 7, x0: WIN.x0 + ox, x1: WIN.x1 + ox, y0: WIN.y0, y1: WIN.y1, sp: 60 }); g.restore(); }, d: 0.03 },
        { sh: wall(), d: 0.08, lift: 1 },
        { sh: frame(), d: 0.09, lift: 0.8 },
        { fn: (g, ox) => { glow(g, PX + ox, PY - 100, 620, 'rgba(57,181,201,', 0.18 + 0.1 * clamp((lt - T_POP) / 0.6, 0, 1)); }, d: 0.2 },
        { fn: (g, ox) => {
          g.save(); g.translate(PX + ox, PY); g.rotate(tilt); g.translate(-PX, -PY);
          put(g, phone(), PX, PY, { lift: 2 });
          g.save(); g.beginPath(); g.roundRect(SX, SY, SW, SH, 36); g.clip(); g.translate(SX, SY);
          g.fillStyle = '#0a1216'; g.fillRect(0, 0, SW, SH);
          let y = TOP - scroll; for (const p of POSTS) { feedPost(g, p, y, lt); y += p.h; }
          // the pop-up: the cardboard newsreader stands up out of the post, then sways on its foot
          const iy = TOP - scroll + AD_Y + IMG_Y, base = iy + IMG_H * 0.95, kp = pop(lt, T_POP, 0.42);
          if (lt > T_POP - 0.4) { g.fillStyle = N.boardD; g.fillRect(SW / 2 - 130, base - 4, 260, 8); }
          if (kp > 0) { g.save(); g.beginPath(); g.rect(0, iy, SW, IMG_H); g.clip(); g.translate(SW / 2, base); g.rotate(Math.sin((lt - T_POP) * 2.2) * 0.02 * clamp(lt - T_POP - 0.3, 0, 1)); g.scale(1, kp); put(g, D.standee(), 0, 0, { sc: 0.5, lift: 1.4 }); g.restore();
            glow(g, SW / 2, base - 240, 120, 'rgba(247,226,142,', 0.22 * (0.6 + 0.4 * Math.sin(lt * 5)) * clamp(kp, 0, 1)); }
          g.fillStyle = 'rgba(10,18,22,.92)'; g.fillRect(0, 0, SW, 60); g.fillStyle = N.cyan; g.fillRect(0, 58, SW, 3);   // the app's bar
          g.fillStyle = '#2a3a42'; for (let i = 0; i < 3; i++) { g.beginPath(); g.roundRect(20 + i * 60, 22, 40, 16, 8); g.fill(); }
          g.restore();
          g.restore();
        }, d: 0.25 },
        { fn: (g, ox) => {
          // coins spill out of the ad and tumble out of the phone, one every beat-and-a-half
          for (let i = 0; i < 16; i++) {
            const t0 = T_COIN + i * 0.24, age = lt - t0; if (age < 0 || age > 1.6) continue;
            const r = U.rng(40 + i), side = i % 2 ? 1 : -1, vx = side * (260 + r() * 260), vy = -420 - r() * 360, x = PX + side * 150 + vx * age + ox, y = 1120 + vy * age + 1700 * age * age;
            D.spin(g, x, y, 1.15 + r() * 0.45, age * (7 + r() * 5) + i, 2.4);
          }
        }, d: 0.3 },
        { fn: (g, ox) => put(g, mitten(), PX + 250 + ox, PY + 380, { rot: -0.18, lift: 2.2 }), d: 0.3 },
        { fn: (g) => D.tag(g, 'YLE · MTV UUTISET', lt, DUR, 110, 1740), d: 0 },
      ], cam);
      D.box(c);
    },
  };
})();
