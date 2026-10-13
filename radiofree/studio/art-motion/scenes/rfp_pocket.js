// Shot 5 · 12.8–15.0 s · The pocket. Close on a coat front cut from green card —
// lapels, the end of a rust scarf, buttons, a patch pocket stitched on — cropped so
// the collar is above the frame (v2: the first cut showed an empty, headless coat).
// A sleeved fist brings the MASK down by its strap (v2: no glasses — the mask is the
// device) and drops it in; the pocket takes it (it slides BEHIND the card); then the
// red light on the strap glows THROUGH the paper, slower each time, and STILL LOOKING
// lands above it. Taking it off does not switch it off. The camera eases in.
SCENES['rfp_pocket'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, words, pop, ease, move, glow, put, fist } = RFP, { mask } = RFM, TAU = Math.PI * 2, { clamp, lerp } = U;
  const T_DROP = 13.7 - 12.857, T_GLOW = 14.2 - 12.857, COAT = '#2b3a30', COAT_L = '#3c5040';
  const PK = { x0: 300, x1: 780, y0: 1180, y1: 1560 };
  const town = () => sheet('rfp_pk_town', (g) => {
    g.fillStyle = K.roof; for (let x = -90; x < W + 90; x += 110) { const h = 120 + ((x * 37) % 90); g.fillRect(x, 520 - h, 104, h + 300); }
    g.fillStyle = K.lamp; for (const [x, y] of [[40, 420], [260, 380], [600, 440], [880, 400]]) g.fillRect(x, y, 20, 26);
  });
  const coat = () => sheet('rfp_pk_coat', (g) => {
    g.save(); g.translate(0, -470);                                                     // the collar sits above the frame
    g.fillStyle = COAT; g.beginPath(); g.moveTo(-90, 560); g.quadraticCurveTo(200, 430, 420, 420); g.lineTo(660, 420); g.quadraticCurveTo(880, 430, W + 90, 560); g.lineTo(W + 90, H + 600); g.lineTo(-90, H + 600); g.closePath(); g.fill();
    g.fillStyle = COAT_L; g.beginPath(); g.moveTo(420, 420); g.lineTo(300, 1000); g.lineTo(540, 760); g.closePath(); g.fill(); g.beginPath(); g.moveTo(660, 420); g.lineTo(780, 1000); g.lineTo(540, 760); g.closePath(); g.fill();
    // the scarf: wound round the neck, one end hanging over the lapel with a fringe
    g.fillStyle = K.rust; g.beginPath(); g.moveTo(380, 360); g.quadraticCurveTo(540, 470, 700, 360); g.lineTo(712, 430); g.quadraticCurveTo(540, 550, 368, 430); g.closePath(); g.fill();
    g.fillStyle = '#a8441a'; g.beginPath(); g.moveTo(610, 450); g.lineTo(690, 440); g.lineTo(720, 760); g.lineTo(640, 772); g.closePath(); g.fill();
    g.fillStyle = K.rust; for (let k = 0; k < 6; k++) g.fillRect(642 + k * 13, 770 - k * 2, 7, 34);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(540, 760); g.lineTo(530, H + 600); g.lineTo(550, H + 600); g.closePath(); g.fill();
    g.fillStyle = K.ink; for (const y of [880, 1060, 1640, 2120]) { g.beginPath(); g.arc(590, y, 18, 0, TAU); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(PK.x0 + 20, PK.y0 + 6, PK.x1 - PK.x0 - 40, 14);
  }, 18);
  const pocket = () => sprite('rfp_pk_pocket', PK.x1 - PK.x0 + 20, PK.y1 - PK.y0 + 20, 10, 10, (g) => {
    const w = PK.x1 - PK.x0, h = PK.y1 - PK.y0;
    g.fillStyle = COAT_L; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h - 40); g.quadraticCurveTo(w / 2, h + 20, 0, h - 40); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(244,234,210,.55)'; g.lineWidth = 4; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(16, 18); g.lineTo(w - 16, 18); g.lineTo(w - 16, h - 50); g.quadraticCurveTo(w / 2, h, 16, h - 50); g.closePath(); g.stroke();
  }, 10);
  // the mask off the face: magenta, the traced face, its strap and the light on it
  const theMask = () => sprite('rfp_pk_mask', 300, 300, 150, 150, (g) => { mask(g, 0, 0, 110, K.mag, { glasses: false, led: false, strap: true, shade: false, face: K.card, ink: K.ink }); }, 9);
  return {
    draw(c, lt) {
      // ease in toward the pocket as the glasses go in
      const cam = { x: 0, y: 0, z: move(lt, T_DROP - 0.2, 0.9, 1, 1.12), fx: 540, fy: 1250 };
      // the mask: carried down by its strap, let go, and it slides into the pocket and out of sight
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
          if (lt < T_DROP + 0.3) {
            g.save(); if (lt > T_DROP) { g.beginPath(); g.rect(0, 0, W, PK.y0 + 14); g.clip(); }
            const sw = Math.sin(lt * 5) * 0.12 * (1 - fall); put(g, theMask(), gx, gy, { rot: sw, lift: 2 });
            g.save(); g.translate(gx, gy); g.rotate(sw); RFP.ledAt(g, 112, -12, 13, Math.floor(lt * 4) % 2 === 0 ? 1 : 0.25); g.restore();
            if (lt < T_DROP) { g.strokeStyle = K.ink; g.lineWidth = 10; g.beginPath(); g.moveTo(gx - 100, gy - 14); g.quadraticCurveTo(gx - 20, gy - 240, gx + 60, gy - 170); g.stroke(); }   // the strap, up to the fist
            g.restore();
          }
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
        { fn: (g) => {
          if (handOut >= 1) return;
          // the arm: the sleeve runs on up and out of the frame (v2: it used to end in a flat cut on the chest)
          const hx = gx + 70 + handOut * 300, hy = gy - 170 - handOut * 900, dx = 0.435, dy = -0.9;
          g.strokeStyle = COAT; g.lineWidth = 150; g.lineCap = 'butt'; g.beginPath(); g.moveTo(hx + dx * 120, hy + dy * 120); g.lineTo(hx + dx * 1600, hy + dy * 1600); g.stroke();
          fist(g, hx, hy, 0.95, Math.PI + 0.45, { sleeve: COAT, cuff: K.rust, len: 300 });
        }, d: 0.7 },
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
