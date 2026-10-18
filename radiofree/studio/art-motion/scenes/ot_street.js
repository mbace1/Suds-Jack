// Shot 5 · The answer, from your own front door: the doorframe around the picture, the street beyond it, the labs
// and houses across the road with glowing trails into every door. One trail comes off the far pavement, across the
// road, growing as it comes; on "lets itself in" its last steps land on your WELCOME mat, which lights.
SCENES['ot_street'] = (() => {
  const { stack, box, put, sheet, glow } = RFP, O = OT, ID = 'ot_street', { clamp, lerp } = U, W = 1080, H = 1920;
  const ROW = 980, SC = 0.38, LABS = [[170, 'OPENAI · TEST LAB'], [745, 'ANTHROPIC · TEST LAB']];
  const HS = [[370, 'f', O.C.brick, O.C.brickD, O.C.doorG], [550, 'g', O.C.render, O.C.renderD, O.C.doorB], [935, 'h', O.C.brick2, O.C.brick2D, O.C.doorR], [1110, 'i', O.C.brick, O.C.brickD, O.C.doorB]];
  const OLD = [[170, 370], [170, 550], [745, 935], [745, 550], [745, 1110]].map(([a, b], i) => O.toDoor([a + 8, ROW + 10], b, ROW, SC, 6, [b - 15, ROW + 26 + (i % 2) * 12]));
  const MAT = [540, 1545], WALK = (() => { const pts = []; for (let i = 0; i < 11; i++) { const k = i / 10; pts.push([lerp(760, MAT[0], k) + Math.sin(k * 3.2) * 70, lerp(ROW + 40, MAT[1] - 62, Math.pow(k, 1.35))]); } return pts; })();
  const ground = () => sheet('ot_ground', (g) => {
    g.fillStyle = O.C.paveL; g.fillRect(-90, ROW, W + 180, 80); g.fillStyle = O.C.pave; for (let x = -90; x < W + 90; x += 60) g.fillRect(x, ROW, 2, 80);
    g.fillStyle = O.C.kerb; g.fillRect(-90, ROW + 80, W + 180, 12); g.fillStyle = O.C.road; g.fillRect(-90, ROW + 92, W + 180, 230);
    g.fillStyle = '#e8e2cf'; for (let x = -40; x < W + 90; x += 200) g.fillRect(x, ROW + 200, 110, 8);
    g.fillStyle = O.C.kerb; g.fillRect(-90, ROW + 322, W + 180, 18); g.fillStyle = O.C.pave; g.fillRect(-90, ROW + 340, W + 180, 120);
    g.fillStyle = O.C.paveL; for (let x = -90; x < W + 90; x += 150) g.fillRect(x, ROW + 340, 4, 120);
    g.fillStyle = O.C.stone; g.fillRect(-90, ROW + 460, W + 180, 50); g.fillStyle = O.C.stoneD; g.fillRect(-90, ROW + 505, W + 180, 8);   // your doorstep
    g.fillStyle = '#7b5a3c'; g.fillRect(-90, ROW + 513, W + 180, H); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = ROW + 560; y < H; y += 70) g.fillRect(-90, y, W + 180, 3);   // the hall floor
  }, 6);
  const frame = () => sheet('ot_doorframe', (g) => {                     // your own front door, open: the frame round the picture
    g.fillStyle = '#ece6d6'; g.fillRect(-90, -90, 225, ROW + 600); g.fillRect(W - 135, -90, 225, ROW + 600); g.fillRect(-90, -90, W + 180, 200);
    g.fillStyle = '#d4ccb8'; g.fillRect(118, 92, 17, ROW + 420); g.fillRect(W - 135, 92, 17, ROW + 420); g.fillRect(118, 92, W - 236, 18);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-90, 60, W + 180, 8); g.fillRect(70, 60, 8, ROW + 450); g.fillRect(W - 78, 60, 8, ROW + 450);
    g.fillStyle = '#2a4a6e'; g.beginPath(); g.moveTo(W - 136, 110); g.lineTo(W - 250, 160); g.lineTo(W - 250, ROW + 470); g.lineTo(W - 136, ROW + 512); g.closePath(); g.fill();   // your own door, swung open
    g.fillStyle = '#21405f'; g.beginPath(); g.moveTo(W - 230, 260); g.lineTo(W - 156, 230); g.lineTo(W - 156, 620); g.lineTo(W - 230, 640); g.closePath(); g.fill();
    g.fillStyle = '#c9a54e'; g.beginPath(); g.moveTo(W - 236, 900); g.lineTo(W - 160, 890); g.lineTo(W - 160, 912); g.lineTo(W - 236, 924); g.closePath(); g.fill();   // its letterbox
    g.beginPath(); g.arc(W - 232, 1000, 9, 0, Math.PI * 2); g.fill();
  }, 14);
  const sAt = (y) => lerp(0.32, 1.15, clamp((y - ROW) / (MAT[1] - ROW), 0, 1));
  return {
    draw(c, lt) {
      const tM = O.at(ID, 'mat', 4.2), dur = O.dur(ID), t0 = 0.35;
      const kt = clamp((lt - t0) / Math.max(0.6, tM - t0), 0, 1), km = clamp((lt - tM) / 0.3, 0, 1), fl = 0.85 + 0.15 * Math.sin(lt * 17);
      const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: O.punch(lt, [tM], { kick: 0.045 }) * lerp(1.0, 1.06, O.ease.io(lt / dur)), fx: 540, fy: 1450 };
      stack(c, [
        { sh: O.sky(), d: 0.02, lift: 0 },
        { fn: (g, ox) => {
          for (const [x, k, b, bd, dr] of HS) { put(g, O.house(k, b, bd, dr), x + ox, ROW, { sc: SC, lift: 0.6 }); O.houseLit(g, x + ox, ROW, SC, 0.8, 0.6, lt + x); }
          for (const [x, n] of LABS) { put(g, O.lab(n), x + ox, ROW, { sc: SC, lift: 0.7 }); O.testLight(g, x + ox, ROW - 600 * SC, lt); }
        }, d: 0.06 },
        { sh: ground(), d: 0.08, lift: 0 },
        { fn: (g, ox) => { for (const pts of OLD) O.trail(g, pts.map(([x, y]) => [x + ox, y]), 1, 0.28, lt); }, d: 0.06 },
        { fn: (g, ox) => {
          put(g, O.mat(), MAT[0] + ox, MAT[1], { sc: 0.82, lift: 0.8 });
          if (km > 0) { g.save(); g.globalAlpha = 0.14 * km * fl; g.fillStyle = O.C.cyan; g.beginPath(); g.roundRect(MAT[0] - 278 + ox, MAT[1] - 98, 556, 196, 12); g.fill(); g.restore(); glow(g, MAT[0] + ox, MAT[1] + 120, 460, 'rgba(63,240,230,', 0.4 * km * fl); }
          O.trail(g, WALK.map(([x, y]) => [x + ox, y]), kt + 1e-6, sAt, lt);
        }, d: 0.1 },
        { sh: frame(), d: 0.14, lift: 1.4 },
      ], cam);
      box(c);
    },
  };
})();
