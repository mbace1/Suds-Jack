// LINO-NOIR B · Pitkäsilta in the rain. Test 5's composition — the bridge on a
// steep diagonal, rain in two fields of slanted strokes, the far bank and Kallio's
// tower in mist — lit like test 1: lamps on the rail receding up the bridge, each
// throwing a pool of ochre on the wet deck and a column into the river. One walker
// close to us under an umbrella; the magenta mask is the only colour that isn't
// autumn. Painted flat, then carved over — see LN.cut.
SCENES['ln_bridge'] = (() => {
  const { C, W, H, TAU, leaf, cut, face, glints } = LN, { clamp, lerp } = U;
  const A = [-80, 1760], B = [W + 80, 1100], DEPTH = 150;
  const nearY = (x) => lerp(A[1], B[1], (x - A[0]) / (B[0] - A[0])), farY = (x) => nearY(x) - DEPTH * lerp(1, 0.45, (x - A[0]) / (B[0] - A[0]));
  const LAMPS = [[220, 1], [640, 0.7], [930, 0.5]];
  const P_ = { sky0: '#2f3f37', sky1: '#727c63', mist: '#7c826b', roofs: '#5d6352', tower: '#4a4f42', river0: '#56675b', river1: '#2f3b34', deck: '#8e7656', face_: '#3a2c20', dark: '#20190f', lit: '#f4b848', coat: '#3a2f25', rim: '#a8844a', brolly: '#2c241c' };
  const WX = 450;
  const inCoat = (x, y, wy) => y > wy - 560 && y < wy + 40 && Math.abs(x - WX) < 150;
  return {
    draw(c, lt) {
      const wx = WX + lt * 10, wy = nearY(wx) - 30, br = Math.abs(Math.sin(lt * 3.5)) * 6;
      cut(c, lt, {
        seed: 5,
        angle: (x, y) => {
          if (inCoat(x, y, wy)) return Math.PI / 2 + 0.05;
          if (y > farY(x) && y < nearY(x)) return Math.atan2(nearY(x) - farY(x), -30);      // across the planks
          return 0.04 * Math.sin(x * 0.012 + y * 0.05);
        },
        paint: (g) => {
          const sk = g.createLinearGradient(0, 0, 0, 640); sk.addColorStop(0, P_.sky0); sk.addColorStop(1, P_.sky1); g.fillStyle = sk; g.fillRect(0, 0, W, 660);
          // the far bank in mist, its roofs, Kallio's tower, one lit window
          g.fillStyle = P_.mist; g.fillRect(0, 640, W, 220);
          g.fillStyle = P_.roofs; const r = U.rng(6); for (let x = 0; x < W; x += 90) { const h = 40 + r() * 70; g.fillRect(x, 860 - h - 40, 86, h + 40); }
          g.fillStyle = P_.tower; g.fillRect(278, 560, 46, 300); g.beginPath(); g.moveTo(270, 560); g.lineTo(301, 470); g.lineTo(332, 560); g.closePath(); g.fill();
          g.fillStyle = P_.lit; g.fillRect(600, 760, 30, 40);
          // the river, darkening toward us, carrying each lamp
          const rv = g.createLinearGradient(0, 860, 0, H); rv.addColorStop(0, P_.river0); rv.addColorStop(1, P_.river1); g.fillStyle = rv; g.fillRect(0, 860, W, H - 860);
          for (const [x, s] of LAMPS) { const gr = g.createLinearGradient(0, nearY(x) + 80, 0, H); gr.addColorStop(0, 'rgba(244,184,72,.95)'); gr.addColorStop(1, 'rgba(244,184,72,.15)'); g.fillStyle = gr; g.fillRect(x - 46 * s, nearY(x) + 80, 92 * s, H); }
          // the deck: its walking surface (light, wet wood) with the lamps' pools, the dark front face, the piles
          g.fillStyle = P_.deck; g.beginPath(); g.moveTo(A[0], farY(A[0])); g.lineTo(B[0], farY(B[0])); g.lineTo(B[0], nearY(B[0])); g.lineTo(A[0], nearY(A[0])); g.closePath(); g.fill();
          for (const [x, s] of LAMPS) { const y = (farY(x) + nearY(x)) / 2, pg = g.createRadialGradient(x + 30 * s, y, 0, x + 30 * s, y, 220 * s); pg.addColorStop(0, 'rgba(250,200,110,1)'); pg.addColorStop(1, 'rgba(250,200,110,0)'); g.save(); g.beginPath(); g.moveTo(A[0], farY(A[0])); g.lineTo(B[0], farY(B[0])); g.lineTo(B[0], nearY(B[0])); g.lineTo(A[0], nearY(A[0])); g.closePath(); g.clip(); g.fillStyle = pg; g.fillRect(x - 260, y - 200, 520, 400); g.restore(); }
          g.fillStyle = P_.face_; g.beginPath(); g.moveTo(A[0], nearY(A[0])); g.lineTo(B[0], nearY(B[0])); g.lineTo(B[0], nearY(B[0]) + 80); g.lineTo(A[0], nearY(A[0]) + 80); g.closePath(); g.fill();
          g.fillStyle = P_.dark; for (let x = 40; x < W; x += 170) g.fillRect(x, nearY(x) + 70, 26, H);
          // the rail, its posts, the lamp posts and the lamps with their halos
          g.strokeStyle = P_.dark; g.lineCap = 'round';
          g.lineWidth = 10; g.beginPath(); g.moveTo(A[0], farY(A[0]) - 110); g.lineTo(B[0], farY(B[0]) - 60); g.stroke();
          for (let i = 0; i <= 26; i++) { const x = lerp(A[0], B[0], i / 26), d = lerp(110, 60, i / 26); g.lineWidth = lerp(8, 4, i / 26); g.beginPath(); g.moveTo(x, farY(x)); g.lineTo(x, farY(x) - d); g.stroke(); }
          for (const [k, [x, s]] of LAMPS.entries()) {
            const y = farY(x) - 420 * s, f = 1 + 0.06 * Math.sin(lt * 11 + k * 3);
            const hl = g.createRadialGradient(x, y, 0, x, y, 220 * s * f); hl.addColorStop(0, 'rgba(250,210,130,.95)'); hl.addColorStop(1, 'rgba(250,210,130,0)'); g.fillStyle = hl; g.fillRect(x - 230 * s, y - 230 * s, 460 * s, 460 * s);
            g.lineWidth = 14 * s; g.beginPath(); g.moveTo(x, farY(x)); g.lineTo(x, y + 30 * s); g.stroke();
            g.fillStyle = P_.lit; g.beginPath(); g.arc(x, y, 30 * s, 0, TAU); g.fill();
          }
          // the walker: coat with the near lamp's light on its edge, umbrella tilted into the rain
          const top = wy - 560 - br;
          g.fillStyle = P_.coat; g.beginPath(); g.moveTo(wx - 40, top); g.lineTo(wx + 40, top); g.quadraticCurveTo(wx + 116, top + 30, wx + 136, top + 100); g.lineTo(wx + 150, wy + 40); g.lineTo(wx - 150, wy + 40); g.lineTo(wx - 136, top + 100); g.quadraticCurveTo(wx - 116, top + 30, wx - 40, top); g.closePath(); g.fill();
          g.fillStyle = P_.rim; g.beginPath(); g.moveTo(wx - 104, top + 40); g.quadraticCurveTo(wx - 130, top + 70, wx - 138, top + 120); g.lineTo(wx - 152, wy + 40); g.lineTo(wx - 136, wy + 40); g.lineTo(wx - 118, top + 130); g.closePath(); g.fill();
          g.save(); g.translate(wx + 20, wy - 770 - br); g.rotate(-0.22);
          g.fillStyle = P_.brolly; g.beginPath(); g.moveTo(-420, 40); g.quadraticCurveTo(0, -330, 420, 40); g.quadraticCurveTo(0, -30, -420, 40); g.fill();
          g.strokeStyle = '#6a6250'; g.lineWidth = 6; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(k * 16, -240); g.lineTo(k * 100, 22); g.stroke(); }
          g.strokeStyle = P_.rim; g.lineWidth = 12; g.beginPath(); g.moveTo(-420, 40); g.quadraticCurveTo(-210, -210, 0, -244); g.stroke();
          g.restore();
          g.strokeStyle = P_.dark; g.lineWidth = 9; g.beginPath(); g.moveTo(wx + 70, wy - 1000 - br); g.lineTo(wx + 120, wy - 430 - br); g.stroke();
        },
        top: (c, lt) => {
          c.fillStyle = C.rust; c.beginPath(); const r = U.rng(5);
          for (let i = 0; i < 10; i++) { const x = r() * W + Math.sin(lt * 1.3 + i) * 60, y = ((lt * 110 + r() * 2000) % 2000) - 40; leaf(c, x, y, 1.3, lt * 2 + i); }
          for (let i = 0; i < 18; i++) { const x = r() * W, k = r(); leaf(c, x, lerp(farY(x), nearY(x), k), 1 + k, r() * 6); }
          c.fill();
          face(c, wx - 6, wy - 640 - br, 90, Math.sin(lt * 1.1) * 0.05);
          glints(c, lt, 110, 0.12, 1500, 31); glints(c, lt, 70, 0.24, 1800, 37, 'rgba(220,210,180,.4)');
          c.fillStyle = 'rgba(230,215,180,.5)'; c.font = '30px "Caveat-600"'; c.fillText('B · 9/30   "Pitkäsilta, sade"', 70, H - 30);
        },
      });
    },
  };
})();
