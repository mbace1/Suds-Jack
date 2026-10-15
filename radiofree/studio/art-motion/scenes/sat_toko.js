// Shot 6 · 32.1–37.5 s · The sign-off (the joke). Toko, the station's masked presenter, at the costume
// rail. He takes the plain card mask on its stick — tagged SATIRE ONLY, a generic face — and holds it up
// over his own: "This has been satire." Two seconds of nothing; then, on "Probably.", the balance from
// the court swings in beside him on its cord and see-saws, and the card face tips toward it.
SCENES['sat_toko'] = (() => {
  const { W, H, stack, put, glow, ease, move, walker } = RFP, S = SAT, C = S.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 10 * B, RY = 720, TX = 360, TY = 1060, TS = 1.15, T_TAKE = 0.2, T_UP = 1.15, T_PROB = 2.7;
  const FACE = [TX, TY - 46 * TS];               // where his own mask is
  const REST = [800, 890];                       // the stick mask on the rail
  const CORD = [890, 640], LEN = 320;            // the balance hangs from here, below the captions (final review: the cord crossed "satire.")
  const COAT = '#2e3236';
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, DUR, 1.0, 1.04), fx: 540, fy: 1200 };
      // the mask: on the rail, then lifted by his hand in an arc to his face
      const ku = ease.out(clamp((lt - T_TAKE) / (T_UP - T_TAKE), 0, 1)), arc = Math.sin(ku * Math.PI) * -80;
      const tip = -0.1 * ku + (lt > T_PROB + 0.5 ? ease.out(clamp((lt - T_PROB - 0.5) / 0.5, 0, 1)) * 0.26 + Math.sin((lt - T_PROB) * 3) * 0.02 : 0);
      const mx = lerp(REST[0], FACE[0] - 62, ku), my = lerp(REST[1], FACE[1] + 14, ku) + arc + (ku >= 1 ? Math.sin(lt * 2.2) * 3 : 0);
      const hand = [mx + 4, my + 250 * 0.86];
      // the balance: a pendulum on its cord swinging in from the right, its beam see-sawing
      const kp = lt < T_PROB ? -1 : (lt - T_PROB), phi = kp < 0 ? 1.1 : 1.1 * Math.exp(-kp * 3.0) * Math.cos(kp * 4.2);
      const bx = CORD[0] + Math.sin(phi) * LEN * 1.25, by = CORD[1] + Math.cos(phi) * LEN;
      const th = kp < 0 ? 0 : Math.sin(kp * 3.1) * 0.22 * (0.6 + 0.4 * Math.exp(-kp));
      stack(c, [
        { sh: S.wardrobe(), d: 0.05, lift: 0 },
        { fn: (g, ox) => glow(g, 460 + ox, 1000, 640, 'rgba(255,200,120,', 0.24), d: 0.05 },
        { sh: S.rail(RY), d: 0.12, lift: 0.8 },
        { fn: (g, ox) => {   // the rest of the rail: people's faces on hangers, behind him
          [[180, RFM.S.GREEN], [300, RFM.S.SKY], [650, RFM.S.PURPLE]].forEach(([x, col], i) => {
            g.save(); g.translate(x + ox, RY - 20); g.rotate(Math.sin(lt * 1.2 + i * 2) * 0.03);
            put(g, S.hanger(), 0, 0, { lift: 0.8 }); g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, 120); g.stroke();
            S.person(g, 0, 190, 60, col); g.save(); g.translate(0, 252); put(g, S.ctag(70, 52), 0, 0, { lift: 0.9 }); g.restore();
            g.restore();
          });
          if (ku <= 0) { put(g, S.hanger(), REST[0] + ox, RY - 20, { lift: 0.8 }); g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); g.moveTo(REST[0] + ox, RY + 40); g.lineTo(REST[0] + ox, REST[1] - 100); g.stroke(); }
          else put(g, S.hanger(), REST[0] + ox, RY - 20, { lift: 0.8, rot: Math.sin(lt * 7) * 0.12 * Math.exp(-(lt - T_TAKE) * 2) });
        }, d: 0.14 },
        { fn: (g, ox) => {
          walker(g, TX + ox, TY, TS, { coat: COAT, scarf: C.amber, t: lt, tilt: Math.sin(lt * 1.3) * 0.02, look: 0, led: false, lift: 1.4 });
          // the mask on its stick, its SATIRE ONLY tag, and his arm and hand holding it
          g.save(); g.translate(mx + ox, my); g.rotate(tip);
          put(g, S.face('plain', true), 0, 0, { sc: 0.86, lift: 1.6 + Math.sin(ku * Math.PI) });
          g.save(); g.translate(-96, 30); g.rotate(Math.sin(lt * 2.6) * 0.07 - tip); g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); g.moveTo(10, -30); g.lineTo(0, 0); g.stroke(); put(g, S.label('SATIRE ONLY', 240), 0, 0, { lift: 1.4 }); g.restore();
          g.restore();
          if (ku > 0) {
            const sh = [TX + 104 * TS + ox, TY + 60 * TS], hx = hand[0] + ox + Math.sin(tip) * 200, hy = hand[1];
            g.strokeStyle = COAT; g.lineWidth = 70; g.lineCap = 'round'; g.beginPath(); g.moveTo(sh[0], sh[1]); g.quadraticCurveTo(sh[0] + 70, (sh[1] + hy) / 2 + 60, hx + 30, hy + 10); g.stroke();
            g.fillStyle = C.amber; g.beginPath(); g.ellipse(hx + 24, hy + 12, 40, 32, -0.6, 0, TAU); g.fill();
            g.fillStyle = C.ink; g.beginPath(); g.roundRect(hx - 30, hy - 30, 60, 62, 20); g.fill(); g.beginPath(); g.roundRect(hx - 40, hy - 8, 30, 22, 10); g.fill();
          }
        }, d: 0.22 },
        { fn: (g, ox) => {
          if (kp < 0) return;
          g.strokeStyle = C.inkL; g.lineWidth = 3; g.beginPath(); g.moveTo(CORD[0] + ox, CORD[1] - 200); g.lineTo(bx + ox, by - 30); g.stroke();
          g.fillStyle = C.brass; g.beginPath(); g.arc(bx + ox, by - 30, 14, 0, TAU); g.fill(); g.fillStyle = C.brassD; g.fillRect(bx - 5 + ox, by - 24, 10, 26);
          S.balance(g, bx + ox, by, 140, 210, th, (side, x, y) => put(g, S.face(side < 0 ? 'laugh' : 'hurt'), x, y - 64, { sc: 0.5, lift: 1.4 }), 160);
        }, d: 0.26 },
      ], cam);
      S.box(c);
    },
  };
})();
