// Shot 5 · 25.7–32.1 s · The court. Frankfurt by night through the window — the Messeturm's
// pencil top, the Commerzbank tower's mast — and before it a robed judge, front-on and faceless
// (a real office-holder: dark card, rimmed by the window's light). No gavel: German judges do not
// use them. The judgment comes across the table to us, headed URTEIL and the court's name, and the
// magenta stamp comes down on it: LIABLE.
SCENES['nrf_court'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop } = RFP, D = NRF, N = D.N, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, T_PAPER = 0.35, T_STAMP = 2.5, BENCH = 1200;
  const WIN = { x0: 210, x1: 870, y0: 620, y1: 1140 };
  const wall = () => sheet('nrf_court_wall', (g) => {
    g.fillStyle = '#183440'; g.beginPath(); g.rect(-90, -90, W + 180, H + 180); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.fill('evenodd');
    g.fillStyle = '#1f414e'; for (const x of [-60, 70, 900, 1010]) g.fillRect(x, 560, 100, 700);                         // tall wall panels either side
    g.fillStyle = 'rgba(0,0,0,.2)'; for (const x of [-60, 70, 900, 1010]) g.fillRect(x + 86, 560, 14, 700);
    g.fillStyle = '#244a58'; g.fillRect(-90, 520, W + 180, 22);                                                        // the cornice
  }, 16);
  const mullions = () => sheet('nrf_court_mullions', (g) => {
    g.fillStyle = '#244a58'; g.beginPath(); g.rect(WIN.x0 - 24, WIN.y0 - 24, WIN.x1 - WIN.x0 + 48, WIN.y1 - WIN.y0 + 48); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.fill('evenodd');
    for (const x of [430, 650]) g.fillRect(x - 8, WIN.y0, 16, WIN.y1 - WIN.y0); g.fillRect(WIN.x0, 800, WIN.x1 - WIN.x0, 14);
  }, 10);
  const chair = () => sprite('nrf_court_chair', 360, 560, 180, 540, (g) => { g.fillStyle = '#0d1d24'; g.beginPath(); g.roundRect(-150, -520, 300, 540, [60, 60, 8, 8]); g.fill(); g.strokeStyle = 'rgba(57,181,201,.35)'; g.lineWidth = 4; g.beginPath(); g.roundRect(-150, -520, 300, 540, [60, 60, 8, 8]); g.stroke(); }, 10);
  const bench = () => sheet('nrf_court_bench', (g) => {
    g.fillStyle = N.teal3; g.fillRect(-90, BENCH, W + 180, 300); g.fillStyle = N.gold; g.fillRect(-90, BENCH, W + 180, 12); g.fillStyle = N.goldD; g.fillRect(-90, BENCH + 60, W + 180, 4);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 40; x < W; x += 200) g.fillRect(x, BENCH + 90, 8, 210);
    g.fillStyle = '#3a2618'; g.fillRect(-90, 1500, W + 180, 400); g.fillStyle = '#5a3a24'; g.fillRect(-90, 1500, W + 180, 14);   // the table in front of us
  }, 14);
  const paper = () => sprite('nrf_urteil', 640, 460, 320, 230, (g) => {
    g.fillStyle = N.paperD; g.fillRect(-296, -206, 600, 420); g.fillStyle = N.white; g.fillRect(-300, -210, 600, 420);
    g.fillStyle = N.ink; g.textAlign = 'center'; g.font = '84px "Anton-400"'; g.fillText('URTEIL', 0, -100);
    g.font = '600 26px "RobotoCondensed"'; g.fillText('LANDGERICHT FRANKFURT AM MAIN', 0, -56); g.fillRect(-240, -38, 480, 4);
    g.fillStyle = 'rgba(7,19,25,.32)'; for (let i = 0; i < 6; i++) g.fillRect(-240, -2 + i * 32, 480 - (i % 3) * 70 - (i === 5 ? 200 : 0), 10);
  }, 10);
  return {
    draw(c, lt) {
      const hit = lt > T_STAMP ? Math.exp(-(lt - T_STAMP) * 7) : 0, shake = hit * Math.sin((lt - T_STAMP) * 44) * 9;
      const cam = { x: Math.sin(lt * 0.5) * 8 + shake, y: 0, z: move(lt, 0, 6.4, 1.0, 1.06) * (1 + 0.03 * hit), fx: 560, fy: 1250 };
      const kp = ease.out(clamp((lt - T_PAPER) / 0.65, 0, 1));
      stack(c, [
        { sh: D.frankfurt(), d: 0.03, lift: 0, soft: 0 },
        { fn: (g, ox) => glow(g, 540 + ox, 1100, 520, 'rgba(147,221,232,', 0.12), d: 0.03 },
        { sh: wall(), d: 0.08, lift: 1 },
        { sh: mullions(), d: 0.09, lift: 0.8 },
        { fn: (g, ox) => { put(g, chair(), 540 + ox, BENCH, { lift: 1.2 }); put(g, D.front('short', '#08100f', N.cyanL, true), 540 + ox, BENCH + 10, { sc: 0.86, lift: 1.4 }); }, d: 0.12 },
        { sh: bench(), d: 0.16, lift: 1.4 },
        { fn: (g, ox) => {
          // the judgment comes across to us, then the stamp
          const x = lerp(540, 560, kp) + ox, y = lerp(BENCH - 10, 1440, kp), s = lerp(0.45, 1, kp);
          if (lt > T_PAPER - 0.05) put(g, paper(), x, y, { sc: s, rot: lerp(0.02, -0.035, kp), lift: lerp(1, 2.2, kp) * (1 - 0.5 * kp) + 0.6 });
          D.slam(g, D.stamp('LIABLE', 470, 150), 580 + ox, 1500, lt, T_STAMP, -0.1);
          if (hit > 0.02) glow(g, 580 + ox, 1500, 420, 'rgba(240,2,127,', 0.25 * hit);
        }, d: 0.2 },
        { fn: (g) => D.tag(g, 'FRANKFURT REGIONAL COURT · 16.9.2026\nCAN BE APPEALED', lt, DUR, 110, 1696), d: 0 },
      ], cam);
      D.box(c);
    },
  };
})();
