// Shot 4 · 19.3–25.7 s · The ledger (Reuters, Nov 2025, on Meta's internal documents). A ledger
// opens on a dark desk: SUSPECTED SCAMMER on the left page, an arrow across the gutter, PRICE and a
// gold arrow going up on the right, the coin stacks climbing. A magnifying glass passes over it —
// the reporting. Then Meta's side, pinned beside it, big enough to read: META: A DETERRENT.
SCENES['nrf_ledger'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop } = RFP, D = NRF, N = D.N, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, T_OPEN = 0.35, T_WORD = 1.0, T_ARROW = 1.5, T_PRICE = 1.85, T_UP = 2.05, T_NOTE = 3.2;
  const L0 = 120, L1 = 960, Y0 = 690, Y1 = 1480, SP = 540;
  const desk = () => sheet('nrf_ledger_desk', (g) => {
    g.fillStyle = '#0c2029'; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = 'rgba(147,221,232,.05)'; for (let y = -60; y < H + 90; y += 34) g.fillRect(-90, y, W + 180, 2);       // the desk's grain
    g.save(); g.translate(150, 1640); g.rotate(-0.12); g.fillStyle = '#2c4a55'; g.fillRect(-120, -160, 300, 380); g.restore();   // loose papers under the book
    g.save(); g.translate(930, 600); g.rotate(0.2); g.fillStyle = '#25424d'; g.fillRect(-140, -180, 300, 380); g.restore();
  }, 14);
  /** one page with its strip of cover: the right one is a sheet, the left one (the cover's inside) swings over */
  function page(g, a, b, coverSide) {
    g.fillStyle = N.teal3; g.beginPath(); g.roundRect(coverSide < 0 ? a - 22 : a, Y0 - 22, b - a + 22, Y1 - Y0 + 44, 14); g.fill();
    g.strokeStyle = N.goldD; g.lineWidth = 4; g.beginPath(); g.roundRect(coverSide < 0 ? a - 12 : a, Y0 - 12, b - a + 12, Y1 - Y0 + 24, 10); g.stroke();
    g.fillStyle = N.paperD; g.fillRect(a, Y0 + 6, b - a, Y1 - Y0); g.fillStyle = '#eef3f1'; g.fillRect(a, Y0, b - a, Y1 - Y0 - 6);
    g.fillStyle = 'rgba(57,181,201,.28)'; for (let y = Y0 + 70; y < Y1 - 20; y += 46) g.fillRect(a + 20, y, b - a - 40, 2);
    const sg = g.createLinearGradient(coverSide < 0 ? b - 40 : a, 0, coverSide < 0 ? b : a + 40, 0); sg.addColorStop(coverSide < 0 ? 0 : 1, 'rgba(0,20,30,0)'); sg.addColorStop(coverSide < 0 ? 1 : 0, 'rgba(0,20,30,.28)'); g.fillStyle = sg; g.fillRect(coverSide < 0 ? b - 40 : a, Y0, 40, Y1 - Y0);   // the gutter's shadow
  }
  const right = () => sheet('nrf_ledger_right', (g) => page(g, SP, L1 + 22, 1), 16);
  const left = () => sprite('nrf_ledger_left', SP - L0 + 70, Y1 - Y0 + 70, SP - L0 + 35, 35 - Y0, (g) => page(g, L0 - SP, 0, -1), 10);
  const cover = () => sprite('nrf_ledger_cover', SP - L0 + 60, Y1 - Y0 + 60, 10, (Y1 - Y0 + 60) / 2, (g) => {
    g.fillStyle = N.teal4; g.beginPath(); g.roundRect(0, -(Y1 - Y0) / 2 - 22, SP - L0 + 22, Y1 - Y0 + 44, 12); g.fill();
    g.strokeStyle = N.gold; g.lineWidth = 6; g.strokeRect(30, -(Y1 - Y0) / 2 + 10, SP - L0 - 38, Y1 - Y0 - 20);
    g.fillStyle = N.gold; g.fillRect(140, -40, SP - L0 - 260, 80);
  }, 10);
  const note = () => sprite('nrf_deterrent', 540, 260, 270, 130, (g) => {
    g.fillStyle = N.white; g.fillRect(-240, -104, 480, 208);
    g.fillStyle = N.cyan; g.fillRect(-240, -104, 480, 14);
    g.fillStyle = N.cyanD; g.textAlign = 'center'; g.font = '46px "ArchivoBlack-400"'; g.fillText('META:', 0, -30);
    g.fillStyle = N.ink; g.font = '92px "Anton-400"'; g.fillText('A DETERRENT', 0, 72);
  }, 10);
  const pin = () => sprite('nrf_pin', 60, 60, 30, 30, (g) => { g.fillStyle = N.cyanD; g.beginPath(); g.arc(2, 3, 18, 0, TAU); g.fill(); g.fillStyle = N.cyan; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(-6, -6, 5, 0, TAU); g.fill(); }, 4);
  /** a left-to-right wipe of whatever draw() paints, k = 0…1 */
  function wipe(g, k, x0, x1, draw) { if (k <= 0) return; g.save(); g.beginPath(); g.rect(x0, 0, (x1 - x0) * k, H); g.clip(); draw(); g.restore(); }
  /** the pages' writing, in frame coordinates — drawn once on the page and again inside the lens */
  function writing(g, lt, ox) {
    const kw = clamp((lt - T_WORD) / 0.45, 0, 1), ka = ease.out(clamp((lt - T_ARROW) / 0.35, 0, 1)), kp = clamp((lt - T_PRICE) / 0.3, 0, 1), ku = ease.out(clamp((lt - T_UP) / 0.6, 0, 1));
    const lx = (L0 + SP) / 2 + ox, rx = (SP + L1) / 2 + ox;
    wipe(g, kw, L0 + ox, SP + ox, () => {
      D.crookMask(g, lx - 10, 870, 170);
      g.fillStyle = N.ink; g.textAlign = 'center'; g.font = '72px "Anton-400"'; g.fillText('SUSPECTED', lx - 10, 1000); g.fillText('SCAMMER', lx - 10, 1080);
    });
    const kr = clamp((lt - T_PRICE) / 0.8, 0, 1);
    if (kr > 0) { // more entries down the page, faint: the same line, again and again
      g.save(); g.globalAlpha = 0.32; for (let i = 0; i < 4; i++) { const y = 1190 + i * 64, k = clamp(kr * 4 - i, 0, 1); if (k <= 0) continue;
        D.crookMask(g, 190 + ox, y - 12, 70); g.fillStyle = N.ink; g.fillRect(240 + ox, y - 18, 160 * k * (0.7 + 0.3 * U.hash(i, 2)), 12); g.fillRect(430 + ox, y - 18, 50 * k, 12); } g.restore();
    }
    if (ka > 0) { // the arrow across the gutter
      const x0 = SP - 46 + ox, x1 = lerp(x0, SP + 34 + ox, ka), y = 1016; g.strokeStyle = N.ink; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      if (ka > 0.6) { g.fillStyle = N.ink; g.beginPath(); g.moveTo(x1 + 26, y); g.lineTo(x1 - 8, y - 26); g.lineTo(x1 - 8, y + 26); g.closePath(); g.fill(); }
    }
    wipe(g, kp, SP + ox, L1 + ox, () => { g.fillStyle = N.ink; g.textAlign = 'center'; g.font = '92px "Anton-400"'; g.fillText('PRICE', 716 + ox, 1050); });
    if (ku > 0) { // the gold arrow going up, and three coin stacks climbing under PRICE
      const ax = 888 + ox, yb = 1110, yt = lerp(yb, 800, ku);
      g.fillStyle = N.goldD; g.fillRect(ax - 22 + 4, yt + 40 + 5, 44, yb - yt - 40); g.fillStyle = N.gold; g.fillRect(ax - 22, yt + 40, 44, Math.max(0, yb - yt - 40));
      g.beginPath(); g.moveTo(ax, yt - 20); g.lineTo(ax - 62, yt + 52); g.lineTo(ax + 62, yt + 52); g.closePath(); g.fill();
      [3, 5, 8].forEach((n, i) => { const m = Math.round(n * ku); for (let j = 0; j < m; j++) { const x = 650 + ox + i * 92, y = 1350 - j * 20; g.fillStyle = N.goldD; g.beginPath(); g.ellipse(x, y + 6, 36, 12, 0, 0, TAU); g.fill(); g.fillStyle = N.gold; g.beginPath(); g.ellipse(x, y, 36, 12, 0, 0, TAU); g.fill(); } });
    }
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.05), fx: 540, fy: 1150 };
      const ko = ease.out(clamp((lt - T_OPEN) / 0.6, 0, 1)), flip = Math.cos(Math.PI * ko);
      const km = clamp((lt - 1.05) / 1.3, 0, 1), mx = lerp(150, 470, km), my = 1030 + Math.sin(km * Math.PI) * -20 + 1400 * Math.pow(clamp((lt - 2.4) / 0.6, 0, 1), 2);
      stack(c, [
        { sh: desk(), d: 0.05, lift: 0 },
        { fn: (g, ox) => glow(g, 300 + ox, 500, 900, 'rgba(147,221,232,', 0.16), d: 0.05 },
        { sh: right(), d: 0.15, lift: 1.4 },
        { fn: (g, ox) => {
          // the cover swings over from the right page to the left; its inside is the left page
          g.save(); g.translate(SP + ox, 0); g.scale(Math.max(0.02, Math.abs(flip)), 1);
          if (flip >= 0) put(g, cover(), 0, (Y0 + Y1) / 2, { lift: 1 + (1 - flip) * 3 }); else put(g, left(), 0, 0, { lift: 1 + (1 + flip) * 3 });
          g.restore();
          writing(g, lt, ox);
        }, d: 0.15 },
        { fn: (g, ox) => {
          // the magnifying glass — the reporting — sweeps in, reads, and goes
          if (km <= 0 || my > H + 300) return; const R = 112, x = mx + ox, y = my;
          g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip(); g.fillStyle = '#eef3f1'; g.fillRect(x - R, y - R, 2 * R, 2 * R);
          g.translate(x, y); g.scale(1.3, 1.3); g.translate(-x, -y); writing(g, lt, ox); g.restore();
          g.fillStyle = 'rgba(147,221,232,.14)'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
          g.save(); g.translate(x, y); g.rotate(0.75); put(g, sprite('nrf_lens2', 420, 420, 210, 210, (q) => { q.strokeStyle = N.ink; q.lineWidth = 18; q.beginPath(); q.arc(0, 0, 118, 0, TAU); q.stroke(); q.strokeStyle = N.goldD; q.lineWidth = 5; q.beginPath(); q.arc(0, 0, 111, 0, TAU); q.stroke(); q.fillStyle = N.ink; q.beginPath(); q.roundRect(122, -17, 170, 34, 14); q.fill(); }, 10), 0, 0, { lift: 3 }); g.restore();
        }, d: 0.25 },
        { fn: (g, ox) => {
          const kn = pop(lt, T_NOTE, 0.3); if (kn <= 0) return;
          put(g, note(), 720 + ox, lerp(1300, 1540, Math.min(kn, 1)), { sc: lerp(1.3, 1, Math.min(kn, 1)), rot: 0.05, lift: lerp(4, 1.6, Math.min(kn, 1)) });
          if (lt > T_NOTE + 0.18) put(g, pin(), 720 + ox - 6, 1540 - 84, { lift: 0.8 });
        }, d: 0.25 },
        { fn: (g) => D.tag(g, 'REUTERS · NOV 2025', lt, DUR, 110, 1730), d: 0 },
      ], cam);
      D.box(c);
    },
  };
})();
