// Shot 4 · 19.3–25.7 s · The cabinet. Doodle's filing cabinet — its wordmark and YOUR SEARCHES on the
// header — so big that the camera has to pull back to get it in, a small masked visitor at its foot
// for scale. Three paper tapes of searches run into the slot on top, and the drawers, too full to
// stay shut, burst open one after another, paper bulging out of them.
SCENES['irr_cabinet'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop, walker } = RFP, I = IRR, C = I.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, CX = 540, CB = 1800, CWD = 860, CHT = 1060, COLS = 3, ROWS = 6, HEAD = 200;
  const DW = (CWD - 30) / COLS, DH = (CHT - HEAD - 30) / ROWS, DY0 = CB - CHT + HEAD + 16;
  const BURST = [[2, 1], [0, 0], [4, 2], [1, 2], [3, 0], [5, 1], [0, 1], [2, 2], [4, 0]].map(([r, q], i) => ({ r, q, t: 2.95 + i * B / 2 }));
  const TAPES = [
    I.path(I.curve([-60, 700], [260, 690], [470, 640], [470, CB - CHT + 6], 22)),
    I.path(I.curve([720, 420], [700, 600], [545, 600], [545, CB - CHT + 6], 22)),
    I.path(I.curve([1140, 760], [860, 760], [618, 640], [618, CB - CHT + 6], 22)),
  ];
  const hall = () => sheet('irr_hall', (g) => {
    g.fillStyle = '#e9edf2'; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = '#dde3ea'; for (let x = -40; x < W + 90; x += 220) g.fillRect(x, -90, 110, 1700);
    g.fillStyle = C.sky3; for (const x of [-20, 860]) { g.fillRect(x, 260, 240, 1100); }   // tall windows, daylight
    g.fillStyle = '#ffffff'; for (const x of [-20, 860]) { for (let k = 1; k < 4; k++) g.fillRect(x, 260 + k * 275, 240, 10); g.fillRect(x + 115, 260, 10, 1100); }
    g.fillStyle = '#cfd5dd'; g.fillRect(-90, 1640, W + 180, H);
    g.fillStyle = '#c3cad3'; for (let y = 1660; y < H + 90; y += 46) g.fillRect(-90, y, W + 180, 4);
  }, 12);
  /** what spills out of a drawer that will not shut: loops of the tape, hanging down over its front */
  function spill(g, x, top, k, lt, seed) {
    const r = U.rng(seed);
    // the jam in the gap: crumpled tape bulging out of the drawer
    for (let i = 0; i < 7; i++) { const px = x - DW * 0.38 + r() * DW * 0.76, py = top - 6 - r() * 22 * k; g.fillStyle = i % 2 ? C.paper : '#efeadc'; g.beginPath(); g.ellipse(px, py, 22 + r() * 18, (10 + r() * 12) * k, (r() - 0.5) * 0.6, 0, TAU); g.fill(); g.strokeStyle = C.paperD; g.lineWidth = 2; g.stroke(); }
    // two strands hanging down over the front
    for (let i = 0; i < 2; i++) {
      const sx = x + (i ? 1 : -1) * DW * (0.18 + r() * 0.12), len = (150 + r() * 130) * k, sw = Math.sin(lt * 2.2 + i * 2 + seed) * 10 * k, dir = i ? 1 : -1;
      const P = I.path(I.curve([sx, top - 8], [sx + dir * 30, top - 30 * k], [sx + dir * 30 + sw, top + len * 0.5], [sx + dir * 12 + sw * 1.6, top + len], 18));
      I.tape(g, P, 0, { w: 30, speed: 0 });
    }
  }
  return {
    draw(c, lt) {
      const kz = ease.out(clamp(lt / 2.7, 0, 1));
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 };
      c.save(); I.view(c, lerp(1.22, 1.0, kz), 540, lerp(930, 1250, kz), 540, lerp(1060, 1250, kz));
      stack(c, [
        { sh: hall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 100 + ox, 800, 420, 'rgba(255,255,255,', 0.3); glow(g, 980 + ox, 800, 420, 'rgba(255,255,255,', 0.3); }, d: 0.05 },
        { fn: (g, ox) => {
          g.save(); g.translate(ox, 0); for (const P of TAPES) I.tape(g, P, lt, { w: 32, speed: 130 }); g.restore();
          put(g, I.cabinet('s4', CWD, CHT, COLS, ROWS, HEAD), CX + ox, CB, { lift: 1.0 });
          // the drawers that burst: the face thrown forward and jiggling, the dark inside, the tape spilling out over the front
          const open = BURST.filter((b) => lt >= b.t).sort((a, b) => a.r - b.r);
          for (const b of open) {
            const x = CX - CWD / 2 + 15 + b.q * DW + DW / 2 + ox, y = DY0 + b.r * DH + DH / 2;
            g.fillStyle = 'rgba(14,20,36,.8)'; I.rr(g, x - DW / 2 + 5, y - DH / 2 + 5, DW - 10, DH - 10, 5);
          }
          for (const b of open) {
            const k = pop(lt, b.t, 0.3), x = CX - CWD / 2 + 15 + b.q * DW + DW / 2 + ox, y = DY0 + b.r * DH + DH / 2, jig = Math.exp(-(lt - b.t) * 5) * Math.sin((lt - b.t) * 26);
            const fy = y + 22 * Math.min(k, 1.2) + jig * 3;
            put(g, I.drawer(DW - 10, DH - 10), x, fy, { sc: 1 + 0.07 * k, lift: 1 + 1.8 * k, rot: jig * 0.02 });
            spill(g, x, fy - (DH - 10) / 2 * (1 + 0.07 * k), Math.min(1, k), lt, b.r * 7 + b.q);
          }
          // a visitor at its foot, looking up — for scale
          walker(g, 236 + ox, 1586, 0.36, { coat: C.eu, scarf: C.gold, color: RFM.S.SKY, t: lt, tilt: -0.22, look: -0.15, led: false, lift: 0.8 });
        }, d: 0.2 },
      ], cam);
      c.restore();
      I.box(c);
    },
  };
})();
