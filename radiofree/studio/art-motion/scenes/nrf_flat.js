// Shot 6 · 32.1–37.5 s · Flat. Inside the ad now: the NEWS desk set and the cardboard newsreader
// with its blank oval and its GET RICH WITH CRYPTO sign — and from behind its shoulder a receipt is
// already curling out. It rocks, its sign slips out of its hands, and it tips over flat — a paper-
// theatre topple, in the picture plane, so the blank face and the suit are still what you see lying
// there. Behind it, on the desk: a brass cash register in scam gold, printing an INVOICE that runs
// over the desk, under the fallen cut-out and out of the frame. On the last hit the drawer flies
// open — ka-ching — and it prints faster.
SCENES['nrf_flat'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop } = RFP, D = NRF, N = D.N, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_ROCK = 1.15, T_DET = 1.45, T_TIP = 1.5, T_LAND = 2.1, T_CHING = 3.4;
  const SX = 320, SS = 0.58, BASE = 1380, PIVX = SX + 247 * SS, RS = 0.4, RX = SX, RY = 1195;
  const UPPER = [[355, 1008], [358, 950], [376, 900], [418, 880], [466, 894], [492, 944], [500, 1030], [504, 1140], [512, 1192], [536, 1206], [552, 1260], [556, 1380]];
  const LOWER = [[556, 1380], [560, 1440], [610, 1510], [680, 1580], [740, 1690], [780, 1960]];
  const set = () => sheet('nrf_flat_set2', (g) => {
    const gr = g.createLinearGradient(0, 0, 0, BASE); gr.addColorStop(0, '#0e3644'); gr.addColorStop(0.55, '#1d7586'); gr.addColorStop(1, '#2a95a8'); g.fillStyle = gr; g.fillRect(-90, -90, W + 180, BASE + 90);
    g.strokeStyle = 'rgba(241,246,246,.22)'; g.lineWidth = 6; const cx = 540, cy = 960, R = 440;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.lineWidth = 3;
    for (const k of [-0.6, -0.25, 0.1, 0.45]) { g.beginPath(); g.ellipse(cx, cy + k * R, R * Math.sqrt(1 - k * k), R * 0.1, 0, 0, TAU); g.stroke(); }
    for (const k of [0.35, 0.75]) { g.beginPath(); g.ellipse(cx, cy, R * k, R, 0, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(241,246,246,.12)'; for (let i = 0; i < 5; i++) g.fillRect(-90, 620 + i * 46, W + 180, 6);
    g.fillStyle = '#0a2029'; g.fillRect(-90, BASE, W + 180, 700);                                                       // the studio floor
    g.fillStyle = 'rgba(57,181,201,.12)'; for (let i = 0; i < 7; i++) g.fillRect(-90, BASE + 24 + i * i * 12, W + 180, 3);
  }, 12);
  const desk = () => sheet('nrf_flat_desk2', (g) => {
    g.fillStyle = N.white; g.fillRect(110, RY - 8, 860, 24); g.fillStyle = N.teal2; g.fillRect(122, RY + 16, 836, BASE - RY - 16);
    g.fillStyle = N.gold; g.fillRect(122, RY + 140, 836, 10); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(122, RY + 16, 836, 10);
    g.fillStyle = N.white; g.font = '64px "Anton-400"'; g.textAlign = 'right'; g.fillText('NEWS', 930, RY + 110);
  }, 12);
  /** the topple: phi 0 upright … PI/2 lying on its side; it rocks back first, falls, and bounces flat */
  function phi(lt) {
    if (lt < T_ROCK) return 0;
    if (lt < T_TIP) return -0.06 * Math.sin(((lt - T_ROCK) / (T_TIP - T_ROCK)) * Math.PI);
    if (lt < T_LAND) { const p = (lt - T_TIP) / (T_LAND - T_TIP); return (Math.PI / 2) * p * p; }
    const b = lt - T_LAND; return Math.PI / 2 - 0.14 * Math.abs(Math.sin(b * 11)) * Math.exp(-b * 8);
  }
  function standee(g, ox, a, lt) {
    g.save(); g.translate(PIVX + ox, BASE); g.rotate(a); g.translate(-PIVX - ox, -BASE);
    put(g, lt < T_DET ? D.standee() : D.standeeBare(), SX + ox, BASE, { sc: SS, lift: 1.4 + 1.2 * Math.sin(Math.max(0, a)) });
    g.restore();
  }
  /** the sign slips out of its hands and drops to the floor in front, face up */
  function sign(g, ox, lt) {
    if (lt < T_DET) return;
    const a = clamp((lt - T_DET) / 0.55, 0, 1), y0 = BASE - 467 * SS, bounce = lt > T_DET + 0.55 ? Math.abs(Math.sin((lt - T_DET - 0.55) * 12)) * Math.exp(-(lt - T_DET - 0.55) * 8) * 22 : 0;
    const x = lerp(SX, 286, a) + ox, y = lerp(y0, 1590, a * a) - bounce, rot = lerp(0, -0.1, a) + Math.sin(a * 8) * 0.1 * (1 - a), sq = lerp(1, 0.7, a);
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(SS * 1.12, SS * 1.12 * sq); put(g, D.signCard(), 0, 0, { lift: 1 + 3 * (1 - a) + bounce / 10 }); g.restore();
  }
  return {
    draw(c, lt) {
      const a = phi(lt), ching = lt > T_CHING ? Math.exp(-(lt - T_CHING) * 6) : 0, landed = lt > T_LAND ? Math.exp(-(lt - T_LAND) * 9) : 0;
      const cam = { x: Math.sin(lt * 0.5) * 8 + landed * Math.sin((lt - T_LAND) * 50) * 10, y: landed * 10, z: move(lt, 0, 5.4, 1.0, 1.05) * (1 + 0.035 * ching), fx: 540, fy: 1200 };
      const scroll = 170 * lt + (lt > T_CHING ? 340 * (lt - T_CHING) : 0), kd = pop(lt, T_CHING, 0.2), reveal = clamp((lt - T_TIP - 0.2) / 0.5, 0, 1);
      let upLen = 0;
      stack(c, [
        { sh: set(), d: 0.04, lift: 0 },
        { fn: (g, ox) => { glow(g, 360 + ox, 940, 520, 'rgba(147,221,232,', 0.16 * (1 - reveal)); glow(g, RX + ox, 1080, 420, 'rgba(247,226,142,', 0.26 * reveal + 0.4 * ching); }, d: 0.04 },
        { sh: desk(), d: 0.12, lift: 1.2 },
        { fn: (g, ox) => {
          put(g, D.register(), RX + ox, RY, { sc: RS, lift: 1.4 });
          g.save(); g.translate(RX + ox, RY); g.scale(RS, RS); D.display(g, 0, -415, lt, lt > T_CHING ? 16 : 6); D.drawer(g, 0, 0, Math.min(kd, 1.05)); g.restore();
          const P = D.receipt(g, UPPER.map(([x, y]) => [x + ox, y]), scroll, 72, 'INVOICE', 520); for (let i = 1; i < P.length; i++) upLen += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
        }, d: 0.12 },
        { fn: (g, ox) => {
          standee(g, ox, a, lt);
          if (lt > T_LAND && lt < T_LAND + 0.7) { const t = lt - T_LAND, r = U.rng(5); g.fillStyle = N.paper; for (let i = 0; i < 28; i++) { const x = PIVX + ox + r() * 540, y = BASE - 8 - t * (160 + r() * 220) + 520 * t * t; g.globalAlpha = 1 - t / 0.7; g.fillRect(x + (r() - 0.5) * 60 * t, y, 5 + r() * 6, 5 + r() * 6); } g.globalAlpha = 1; }   // dust and paper bits along where it lands
          D.receipt(g, LOWER.map(([x, y]) => [x + ox, y]), scroll - upLen, 72, 'INVOICE', 520);   // the same paper, out from under the fallen cut-out
          sign(g, ox, lt);
          if (kd > 0) for (let i = 0; i < 8; i++) { const t = lt - T_CHING - i * 0.04; if (t < 0 || t > 1.7) continue; const r = U.rng(90 + i), vx = (r() - 0.3) * 600, vy = -820 - r() * 380; D.spin(g, RX + ox + vx * t, RY - 20 + vy * t + 1800 * t * t, 0.75 + r() * 0.35, t * 9 + i, 2.6); }
        }, d: 0.2 },
      ], cam);
      D.box(c);
    },
  };
})();
