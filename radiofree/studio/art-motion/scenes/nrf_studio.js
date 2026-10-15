// Shot 2 · 6.4–12.9 s · THAT'S NOT ME. The real newsroom, from the studio camera's place: three
// newsreaders at the desk, front-on but FACELESS — dark card silhouettes rimmed in the studio's
// cyan (they are real people; the frame never gives them a face). The lights come up, the camera's
// tally goes red, and one after another they lift a white card: THAT'S NOT ME. Then the cards
// beat in time — a protest, on air.
SCENES['nrf_studio'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop } = RFP, D = NRF, N = D.N, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, DESK = 1400, T_LIVE = 0.9, T_CARD = [1.0, 1.3, 1.6], T_BEAT = 2.4;
  const ANCHORS = [[228, 'bob', '#0c1920'], [540, 'short', '#0e1c24'], [852, 'bun', '#0b171e']];
  const wall = () => sheet('nrf_studio_wall', (g) => {
    ['#081820', '#0b202a', '#0f2a36', '#123241', '#163a4a'].forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 300, W + 180, H); });
    g.strokeStyle = 'rgba(57,181,201,.28)'; g.lineWidth = 10; g.beginPath(); g.arc(540, 960, 430, 0, TAU); g.stroke();   // the set's big ring
    g.lineWidth = 4; g.beginPath(); g.arc(540, 960, 360, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(57,181,201,.18)'; for (const x of [70, 150, 930, 1010]) g.fillRect(x - 10, 600, 20, 800);            // LED strips
    g.fillStyle = '#071319'; g.fillRect(-90, 150, W + 180, 22); for (const x of [180, 400, 680, 900]) { g.fillRect(x - 4, 172, 8, 40); g.beginPath(); g.roundRect(x - 34, 206, 68, 70, [8, 8, 30, 30]); g.fill(); }   // the lighting truss
  }, 14);
  const desk = () => sheet('nrf_studio_desk', (g) => {
    g.fillStyle = N.white; g.beginPath(); g.moveTo(-90, DESK + 14); g.quadraticCurveTo(540, DESK - 30, W + 90, DESK + 14); g.lineTo(W + 90, DESK + 40); g.quadraticCurveTo(540, DESK - 4, -90, DESK + 40); g.closePath(); g.fill();
    g.fillStyle = N.teal3; g.beginPath(); g.moveTo(-90, DESK + 40); g.quadraticCurveTo(540, DESK - 4, W + 90, DESK + 40); g.lineTo(W + 90, 1700); g.lineTo(-90, 1700); g.closePath(); g.fill();
    g.fillStyle = N.cyan; g.fillRect(-90, 1520, W + 180, 14); g.fillStyle = 'rgba(147,221,232,.3)'; g.fillRect(-90, 1540, W + 180, 4);
    g.fillStyle = N.night0; g.fillRect(-90, 1700, W + 180, 400);
  }, 14);
  const card = () => sprite('nrf_notme', 300, 220, 150, 110, (g) => {
    g.fillStyle = N.white; g.fillRect(-128, -92, 256, 184); g.strokeStyle = N.ink; g.lineWidth = 5; g.strokeRect(-116, -80, 232, 160);
    g.fillStyle = N.ink; g.textAlign = 'center'; g.font = '64px "Anton-400"'; g.fillText("THAT'S", 0, -12); g.fillText('NOT ME', 0, 60);
  }, 8);
  /** a studio camera from behind, cropped by the frame: a dark body, its viewfinder lit, the tally on top */
  const camBack = () => sprite('nrf_camback', 420, 560, 210, 520, (g) => {
    g.fillStyle = N.cyanD; g.beginPath(); g.roundRect(-186, -436, 372, 250, 26); g.fill();
    g.fillStyle = '#081217'; g.beginPath(); g.roundRect(-180, -430, 360, 240, 22); g.fill(); g.fillRect(-30, -190, 60, 260); g.beginPath(); g.moveTo(-170, 40); g.lineTo(170, 40); g.lineTo(110, -20); g.lineTo(-110, -20); g.closePath(); g.fill();
    g.fillStyle = '#16323c'; g.beginPath(); g.roundRect(-120, -400, 240, 150, 10); g.fill();
    g.fillStyle = '#06141a'; g.fillRect(-250, -300, 80, 18); g.fillRect(170, -300, 80, 18);
  }, 12);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.07), fx: 540, fy: 1150 };
      const kl = ease.out(clamp((lt - 0.15) / 0.7, 0, 1)), live = lt > T_LIVE ? 1 : 0;
      const beat = (i) => (lt > T_BEAT ? Math.max(0, Math.sin(((lt - T_BEAT) / B) * Math.PI + i * 0.9)) * 14 : 0);
      stack(c, [
        { sh: wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => {
          for (const x of [180, 400, 680, 900]) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, 270, 0, 1300); gr.addColorStop(0, `rgba(147,221,232,${0.16 * kl})`); gr.addColorStop(1, 'rgba(147,221,232,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 30 + ox, 270); g.lineTo(x + 30 + ox, 270); g.lineTo(x + 170 + ox, 1300); g.lineTo(x - 170 + ox, 1300); g.closePath(); g.fill(); g.restore(); }
          for (const [x] of ANCHORS) glow(g, x + ox, 1040, 320, 'rgba(57,181,201,', 0.28 * kl);
        }, d: 0.05 },
        { fn: (g, ox) => {
          ANCHORS.forEach(([x, hair, body], i) => {
            put(g, D.front(hair, body), x + ox, DESK + 20, { sc: 0.9, lift: 1.2 });
            const k = pop(lt, T_CARD[i], 0.34), y = lerp(1560, 1215, Math.min(k, 1.08)) - beat(i), rot = (i - 1) * 0.04 + (lt > T_BEAT ? Math.sin((lt - T_BEAT) * 3 + i) * 0.02 : 0);
            if (k > 0) {
              g.save(); g.translate(x + ox, y); g.rotate(rot); g.scale(1.12, 1.12); put(g, card(), 0, 0, { lift: 1.8 });
              g.fillStyle = body; for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(sx * 128 - 24, 40, 48, 70, 20); g.fill(); g.strokeStyle = 'rgba(57,181,201,.6)'; g.lineWidth = 3; g.stroke(); }   // the hands, dark, on the card's lower corners
              g.restore();
            }
          });
        }, d: 0.18 },
        { sh: desk(), d: 0.22, lift: 1.2 },
        { fn: (g, ox) => { glow(g, 540 + ox, DESK, 520, 'rgba(241,246,246,', 0.08 * kl); }, d: 0.22 },
        { fn: (g, ox) => {
          put(g, camBack(), 120 + ox, 1960, { lift: 2, rot: 0.04 });
          RFP.ledAt(g, 214 + ox, 1512, 16, live);
          g.fillStyle = 'rgba(57,181,201,.45)'; g.fillRect(36 + ox, 1590, 196, 112);
        }, d: 0.4 },
      ], cam);
      D.box(c);
    },
  };
})();
