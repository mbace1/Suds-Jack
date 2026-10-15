// Shot 3 · 12.9–19.3 s · The law. On a white marble desk against an EU-blue wall, the Digital Markets
// Act: an EU-blue book with the ring of stars. The cover swings open, three pages turn, and on the
// right-hand page the recital's words stand out — irreversibly altered — and a gold line draws
// itself under them while the camera leans in.
SCENES['irr_law'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move } = RFP, I = IRR, C = I.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, SP = 540, PW = 450, Y0 = 985, Y1 = 1535, T_OPEN = 0.35, T_PAGES = 1.25, T_LINE = 5.5 * B;
  const KEY = { y: 1300, x0: SP + 44, x1: SP + PW - 44 };
  const wall = () => sheet('irr_lawwall', (g) => {
    g.fillStyle = C.eu; g.fillRect(-90, -90, W + 180, 1560);
    g.fillStyle = C.euL; for (let x = -60; x < W + 90; x += 180) g.fillRect(x, -90, 90, 1560);   // a panelled wall, two blues
    g.fillStyle = 'rgba(244,196,48,.16)'; I.ring(g, 540, 700, 330, 44, 'rgba(244,196,48,.18)');
    g.fillStyle = C.marbleD; g.fillRect(-90, 1440, W + 180, H);
    g.fillStyle = C.marble; g.fillRect(-90, 1454, W + 180, H);
    const r = U.rng(5); g.strokeStyle = 'rgba(120,110,95,.18)'; g.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { let x = r() * W, y = 1470 + r() * 420, a = r() * TAU; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 12; k++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 18; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); }
  }, 12);
  /** a page of text: grey bars in lines, a recital number; key = draw the legible line */
  function page(g, x0, side, key, num = side > 0 ? '(61)' : '(60)') {
    g.fillStyle = '#fffdf6'; g.fillRect(x0, Y0, PW, Y1 - Y0);
    const gr = g.createLinearGradient(SP - 40 * side, 0, SP, 0); gr.addColorStop(0, 'rgba(20,33,58,0)'); gr.addColorStop(1, 'rgba(20,33,58,.16)'); g.fillStyle = gr; g.fillRect(Math.min(SP, SP - 40 * side), Y0, 40, Y1 - Y0);
    const r = U.rng(side > 0 ? 3 : 11), lx0 = x0 + 44, lw = PW - 88;
    g.fillStyle = 'rgba(22,33,58,.30)';
    for (let y = Y0 + 70, i = 0; y < Y1 - 50; y += 44, i++) {
      if (key && Math.abs(y - KEY.y) < 30) continue;
      if (i === 0) { g.fillStyle = 'rgba(22,33,58,.62)'; g.font = '34px "EBGaramond-600"'; g.textAlign = 'left'; g.fillText(num, lx0, y + 8); g.fillStyle = 'rgba(22,33,58,.30)'; I.rr(g, lx0 + 74, y - 8, lw - 74 - r() * 40, 12, 6); continue; }
      let x = lx0; const end = lx0 + lw - (r() < 0.15 ? 120 : 0);
      while (x < end - 20) { const w = Math.min(20 + r() * 70, end - x); I.rr(g, x, y - 8, w, 12, 6); x += w + 12; }
    }
    if (key) { g.fillStyle = C.ink; g.font = '44px "EBGaramond-600"'; g.textAlign = 'center'; g.fillText('irreversibly altered', (KEY.x0 + KEY.x1) / 2, KEY.y + 12); }
  }
  const leftPage = () => sprite('irr_pageL', PW + 20, Y1 - Y0 + 20, 10, 10, (g) => { g.translate(-(SP - PW), -Y0); page(g, SP - PW, -1, false); }, 4);
  const rightPage = () => sprite('irr_pageR', PW + 20, Y1 - Y0 + 20, 10, 10, (g) => { g.translate(-SP, -Y0); page(g, SP, 1, true); }, 4);
  const blank = () => sprite('irr_pageB', PW + 20, Y1 - Y0 + 20, 10, 10, (g) => { g.translate(-SP, -Y0); page(g, SP, 1, false, '(58)'); }, 4);
  const coverF = () => sprite('irr_coverF', PW + 30, Y1 - Y0 + 40, 15, 20, (g) => {
    g.fillStyle = C.euD; I.rr(g, -6, -10, PW + 16, Y1 - Y0 + 20, 8); g.fillStyle = C.eu; I.rr(g, 0, -4, PW + 4, Y1 - Y0 + 8, 6);
    I.ring(g, PW / 2, 230, 120, 20);
    g.fillStyle = C.gold; g.textAlign = 'center'; g.font = '86px "Anton-400"'; g.fillText('DMA', PW / 2, 450);
    g.fillRect(PW / 2 - 110, 476, 220, 5);
  }, 9);
  const coverIn = () => sprite('irr_coverI', PW + 30, Y1 - Y0 + 40, 15, 20, (g) => { g.fillStyle = C.euD; I.rr(g, -6, -10, PW + 16, Y1 - Y0 + 20, 8); g.fillStyle = '#c9d6ec'; I.rr(g, 8, 4, PW - 10, Y1 - Y0 - 8, 4); }, 9);
  /** a leaf turning about the spine: a = 0 lies right, a = π lies left; front shows while a < π/2 */
  function leaf(g, ox, a, front, back) {
    const k = Math.cos(a), lift = Math.sin(a), sp = SP + ox;
    if (Math.abs(k) < 0.01) return;
    g.save(); g.translate(sp + (k < 0 ? PW * k : 0), Y0 - lift * 26); g.scale(Math.abs(k), 1 + lift * 0.05);
    put(g, k > 0 ? front() : back(), 0, 0, { lift: 0.5 + lift * 2.5 });
    g.restore();
  }
  return {
    draw(c, lt) {
      const ko = ease.out(clamp((lt - T_OPEN) / 0.9, 0, 1)), ac = ko * Math.PI;
      const pages = [0, 1, 2].map((i) => ease.out(clamp((lt - T_PAGES - i * 0.27) / 0.55, 0, 1)) * Math.PI * (1 - i * 0.004));
      const shift = lerp(-PW / 2, 0, ko);   // the closed book sits centred; it slides as it opens
      const kz = ease.out(clamp((lt - 2.3) / 2.6, 0, 1));
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 };
      const ku = clamp((lt - T_LINE) / 0.6, 0, 1);
      c.save(); I.view(c, lerp(1.0, 1.5, kz), lerp(540, (KEY.x0 + KEY.x1) / 2, kz), lerp(1250, KEY.y, kz), 540, lerp(1250, 1180, kz));
      stack(c, [
        { sh: wall(), d: 0.06, lift: 0 },
        { fn: (g, ox) => glow(g, 540 + ox, 1200, 700, 'rgba(255,240,200,', 0.14), d: 0.06 },
        { fn: (g, ox) => {
          const x = ox + shift;
          const bl = SP - PW * ko;   // the boards' left edge: only the back board until the cover has swung over
          g.fillStyle = 'rgba(20,33,58,.22)'; g.fillRect(bl + x + 10, Y1 + 4, SP + PW - bl + 8, 22);   // the book's shadow on the desk
          g.fillStyle = C.euD; I.rr(g, bl - 10 + x, Y0 - 8, SP + PW - bl + 20, Y1 - Y0 + 22, 8);       // the boards
          g.fillStyle = '#efe9da'; for (let k = 0; k < 4; k++) g.fillRect(bl + x - 2, Y1 + 2 + k * 3, SP + PW - bl + 4, 2);   // page edges
          if (ac >= Math.PI) put(g, coverIn(), SP - PW + x, Y0, { lift: 0.3 });
          if (pages.some((p) => p >= Math.PI)) put(g, leftPage(), SP - PW + x, Y0, { lift: 0.4 });
          put(g, rightPage(), SP + x, Y0, { lift: 0.4 });
          // the gold line under the words, drawn left to right
          if (ku > 0) { g.save(); g.strokeStyle = C.gold; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); const xa = KEY.x0 + 8 + x, xb = lerp(xa, KEY.x1 - 8 + x, ease.out(ku)); for (let q = xa; q <= xb; q += 6) g.lineTo(q, KEY.y + 26 + Math.sin(q * 0.05) * 2.5); g.stroke(); g.restore(); }
          for (let i = 2; i >= 0; i--) if (pages[i] < Math.PI) leaf(g, x, pages[i], blank, leftPage);   // pages not yet turned lie on the right, over the recital
          if (ac < Math.PI) leaf(g, x, ac, coverF, coverIn);
        }, d: 0.2 },
      ], cam);
      c.restore();
      I.tag(c, 'DMA · RECITAL 61', lt, DUR);
      I.box(c);
    },
  };
})();
