// Shot 5 · 12.8–15.0 s · The pocket. Close on a coat front cut from green card —
// lapels, a rust scarf, buttons, a patch pocket stitched on — with a sliver of dusk
// over the shoulder. A sleeved hand brings the folded glasses down and drops them in;
// the pocket takes them (they slide BEHIND its card); then the red light glows
// THROUGH the paper, the way light does through thin card, slower each time, and
// STILL LOOKING lands above it. The camera eases in.
SCENES['rfp_pocket'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, words, pop, ease, move, glow, put, hand } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const T_DROP = 13.7 - 12.857, T_GLOW = 14.2 - 12.857, COAT = '#2b3a30', COAT_L = '#3c5040';
  const PK = { x0: 300, x1: 780, y0: 1180, y1: 1560 };
  const town = () => sheet('rfp_pk_town', (g) => {
    g.fillStyle = K.roof; for (let x = -90; x < W + 90; x += 110) { const h = 120 + ((x * 37) % 90); g.fillRect(x, 520 - h, 104, h + 300); }
    g.fillStyle = K.lamp; for (const [x, y] of [[40, 420], [260, 380], [600, 440], [880, 400]]) g.fillRect(x, y, 20, 26);
  });
  const coat = () => sheet('rfp_pk_coat', (g) => {
    g.fillStyle = COAT; g.beginPath(); g.moveTo(-90, 560); g.quadraticCurveTo(200, 430, 420, 420); g.lineTo(660, 420); g.quadraticCurveTo(880, 430, W + 90, 560); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();
    g.fillStyle = COAT_L; g.beginPath(); g.moveTo(420, 420); g.lineTo(300, 1000); g.lineTo(540, 760); g.closePath(); g.fill(); g.beginPath(); g.moveTo(660, 420); g.lineTo(780, 1000); g.lineTo(540, 760); g.closePath(); g.fill();
    // the scarf: wound round the neck, one end hanging over the lapel with a fringe
    g.fillStyle = K.rust; g.beginPath(); g.moveTo(380, 360); g.quadraticCurveTo(540, 470, 700, 360); g.lineTo(712, 430); g.quadraticCurveTo(540, 550, 368, 430); g.closePath(); g.fill();
    g.fillStyle = '#a8441a'; g.beginPath(); g.moveTo(610, 450); g.lineTo(690, 440); g.lineTo(720, 760); g.lineTo(640, 772); g.closePath(); g.fill();
    g.fillStyle = K.rust; for (let k = 0; k < 6; k++) g.fillRect(642 + k * 13, 770 - k * 2, 7, 34);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(540, 760); g.lineTo(530, H + 90); g.lineTo(550, H + 90); g.closePath(); g.fill();
    g.fillStyle = K.ink; for (const y of [880, 1060, 1640]) { g.beginPath(); g.arc(590, y, 18, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(PK.x0 + 20, PK.y0 + 6, PK.x1 - PK.x0 - 40, 14);
  }, 18);
  const pocket = () => sprite('rfp_pk_pocket', PK.x1 - PK.x0 + 20, PK.y1 - PK.y0 + 20, 10, 10, (g) => {
    const w = PK.x1 - PK.x0, h = PK.y1 - PK.y0;
    g.fillStyle = COAT_L; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h - 40); g.quadraticCurveTo(w / 2, h + 20, 0, h - 40); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(244,234,210,.55)'; g.lineWidth = 4; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(16, 18); g.lineTo(w - 16, 18); g.lineTo(w - 16, h - 50); g.quadraticCurveTo(w / 2, h, 16, h - 50); g.closePath(); g.stroke();
  }, 10);
  const specs = () => sprite('rfp_pk_specs', 420, 200, 210, 100, (g) => {
    g.strokeStyle = K.ink; g.lineWidth = 16; for (const x of [-70, 50]) { g.beginPath(); g.arc(x, 0, 70, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(200,220,215,.35)'; for (const x of [-70, 50]) { g.beginPath(); g.arc(x, 0, 62, 0, TAU); g.fill(); }
    g.lineWidth = 12; g.beginPath(); g.moveTo(-140, -10); g.lineTo(150, -24); g.stroke();
  }, 8);
  return {
    draw(c, lt) {
      // ease in toward the pocket as the glasses go in
      const cam = { x: 0, y: 0, z: move(lt, T_DROP - 0.2, 0.9, 1, 1.12), fx: 540, fy: 1250 };
      // the glasses: carried down, let go, and they slide into the pocket and out of sight
      const carry = ease.out(clamp(lt / T_DROP, 0, 1)), fall = clamp((lt - T_DROP) / 0.22, 0, 1);
      const gx = lerp(820, 560, carry), gy = lerp(560, 1150, carry) + fall * fall * 260;
      const handOut = clamp((lt - T_DROP - 0.1) / 0.5, 0, 1);
      // the light through the card: pulses at T_GLOW, then slower
      const pulses = [0, 0.55, 1.25].map((d) => T_GLOW + d), glowK = Math.max(0, ...pulses.map((p) => (lt < p ? 0 : Math.min(1, (lt - p) / 0.07) * Math.exp(-(lt - p) * 3.2))));
      stack(c, [
        { sh: dusk('pk', 640), d: 0.06, lift: 0 },
        { sh: town(), d: 0.15, lift: 0.8 },
        { sh: coat(), d: 0.6, lift: 1.6, alpha: 0.6 },
        { fn: (g) => {
          // the glasses go behind the pocket card once they drop: clip to everything above the pocket mouth
          if (lt < T_DROP + 0.3) { g.save(); if (lt > T_DROP) { g.beginPath(); g.rect(0, 0, W, PK.y0 + 14); g.clip(); } put(g, specs(), gx, gy, { rot: lerp(-0.4, 0.05, carry), lift: 2 }); g.restore(); }
          // the light, seen through the card while the pocket holds it
          if (lt > T_DROP + 0.2) RFP.ledAt(g, 470, PK.y0 + 140, 12, 0.15 + glowK * 0.85);
        }, d: 0.62 },
        { fn: (g) => {
          put(g, pocket(), PK.x0 - 10, PK.y0 - 10, { lift: 1.4 });
          if (glowK > 0.01) { // light through thin card: a red bloom on the pocket's face, clipped to it, card fibre showing
            g.save(); g.beginPath(); g.rect(PK.x0, PK.y0, PK.x1 - PK.x0, PK.y1 - PK.y0 - 30); g.clip();
            g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(470, PK.y0 + 140, 0, 470, PK.y0 + 140, 300); gr.addColorStop(0, `rgba(255,70,36,${0.95 * glowK})`); gr.addColorStop(0.35, `rgba(255,50,24,${0.5 * glowK})`); gr.addColorStop(1, 'rgba(255,60,30,0)'); g.fillStyle = gr; g.fillRect(PK.x0, PK.y0, PK.x1 - PK.x0, PK.y1 - PK.y0);
            g.restore();
            glow(g, 470, PK.y0 + 140, 520, 'rgba(255,60,30,', 0.35 * glowK);
          }
        }, d: 0.62 },
        { fn: (g) => { if (handOut < 1) hand(g, gx + 110 + handOut * 300, gy - 110 - handOut * 900, 1.0, Math.PI + 0.45, { sleeve: COAT, cuff: K.rust }); }, d: 0.7 },
        { fn: (g) => {
          const k1 = pop(lt, T_GLOW, 0.26), k2 = pop(lt, T_GLOW + 0.12, 0.26);
          if (k1 > 0) put(g, words('STILL', '150px "ArchivoBlack-400"', K.card), 540, 700, { sc: k1, rot: -0.04, lift: 1.6 });
          if (k2 > 0) put(g, words('LOOKING', '150px "ArchivoBlack-400"', K.card), 540, 880, { sc: k2, rot: 0.03, lift: 1.6 });
        }, d: 0.7 },
      ], cam);
      RFP.leaves(c, lt + 17, { n: 6, seed: 51, cam });
      box(c);
    },
  };
})();
