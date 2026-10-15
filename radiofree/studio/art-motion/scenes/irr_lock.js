// Shot 6 · 32.1–37.5 s · The lock (the joke). Close on Doodle's search bar, the wordmark over it. A
// padlock — Doodle's, its wordmark on the body — swings in and snaps shut on a hasp on the bar's
// front, facing out: your searches, protected. Through the glass, Doodle's own hand (the four-colour
// cuff) keeps copying the tape onto a second tape of its own, which runs out of the bar's end and down
// into Doodle's cabinet. The camera leans in on the hand as the second line lands.
SCENES['irr_lock'] = (() => {
  const { W, H, sprite, stack, put, glow, ease, move } = RFP, I = IRR, C = I.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 10 * B, BX = 540, BY = 1130, BS = 0.94, G = I.geom(1000, 360), T_SNAP = 1.1 * B, T_PUSH = 2.4;
  const HX = BX - 150, HY = BY + G.h / 2 * BS + 2;   // the hasp, on the frame's lower edge
  const CAB = [892, 1850];
  const TOP = -78, BOT = 80, SPEED = 120, PEN = 30;   // the two tapes inside, and the pencil's x (bar-local)
  const mark = () => sprite('irr_mark6', 560, 200, 280, 150, (g) => I.wordmark(g, 0, 0, 150), 8);
  const hasp = () => sprite('irr_hasp', 120, 120, 60, 20, (g) => { g.fillStyle = C.steelDD; I.rr(g, -44, -18, 88, 50, 8); g.fillStyle = C.steelD; I.rr(g, -36, -12, 72, 38, 6); g.strokeStyle = C.steelDD; g.lineWidth = 14; g.beginPath(); g.arc(0, 40, 20, 0, Math.PI); g.stroke(); }, 6);
  // the copy tape leaves the bar's right end and drops into the cabinet's slot
  const P_OUT = I.path(I.curve([BX + (G.w / 2 - 30) * BS, BY + BOT * BS], [CAB[0] + 60, BY + BOT * BS], [CAB[0], BY + 200], [CAB[0], CAB[1] - 412], 22));
  return {
    draw(c, lt) {
      const kp = ease.out(clamp((lt - T_PUSH) / 1.5, 0, 1));
      const cam = { x: Math.sin(lt * 0.5) * 6, y: 0, z: 1 };
      // the lock: swings in from lower left with its shackle up, snaps down on the beat, then sways
      const ki = ease.out(clamp((lt - 0.05) / (T_SNAP - 0.15), 0, 1)), snapped = lt >= T_SNAP;
      const sway = snapped ? Math.exp(-(lt - T_SNAP) * 3.2) * Math.sin((lt - T_SNAP) * 9) * 0.12 : 0;
      const lx = lerp(HX - 260, HX, ki), ly = lerp(HY + 300, HY, ki), lrot = lerp(-0.7, 0, ki) + sway;
      const shk = snapped ? 0 : 40;   // the shackle raised until it snaps
      const jit = Math.sin(lt * 31) * 7 + Math.sin(lt * 13) * 4;   // the pencil scribbling
      const inner = (g) => {
        I.tape(g, I.path([[G.fx0 - 40, TOP], [G.w / 2 + 40, TOP]]), lt, { w: 46, speed: SPEED });
        // the copy: blank until the pencil has been over it, the same words downstream of the point
        I.tape(g, I.path([[G.fx0 - 40, BOT], [G.w / 2 + 40, BOT]]), lt, { w: 46, speed: SPEED, from: PEN - G.fx0 + 40 + jit });
        put(g, I.pencilHand(), PEN + jit, BOT - 12, { sc: 0.8, lift: 1.4 });
      };
      c.save(); I.view(c, lerp(1.0, 1.32, kp), lerp(540, 640, kp), lerp(1250, 1210, kp), 540, lerp(1250, 1190, kp));
      stack(c, [
        { sh: I.sky('f', 1500), d: 0.02, lift: 0 },
        { sh: I.plaza('f', 1560), d: 0.1, lift: 0.3 },
        { fn: (g, ox) => put(g, I.cabinet('s6', 300, 420, 2, 4, 130), CAB[0] + ox, CAB[1], { lift: 1 }), d: 0.12 },
        { fn: (g, ox) => {
          g.save(); g.translate(ox, 0); I.tape(g, P_OUT, lt, { w: 46 * BS, speed: SPEED * BS }); g.restore();
          put(g, mark(), BX + ox, BY - 220, { lift: 1.1 });
          I.bar(g, BX + ox, BY, BS, lt, { G, inner, cursor: false, lift: 1.4 });
          // the padlock: the shackle hooked through the hasp's staple, the body hanging from it
          g.save(); g.translate(lx + ox, ly + 38); g.rotate(lrot); put(g, I.shackle(), 0, -shk, { lift: 1.6 }); g.restore();
          put(g, hasp(), HX + ox, HY, { lift: 1.2 });
          g.save(); g.translate(lx + ox, ly + 38); g.rotate(lrot); put(g, I.lockBody(), 0, 168, { lift: 1.8 }); g.restore();
          if (snapped && lt < T_SNAP + 0.5) glow(g, HX + ox, HY + 30, 120, 'rgba(255,240,190,', 0.4 * (1 - (lt - T_SNAP) / 0.5));
        }, d: 0.22 },
      ], cam);
      c.restore();
      I.box(c);
    },
  };
})();
