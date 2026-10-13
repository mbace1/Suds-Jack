// Masks: Toko's traced original face worn as a mask (owner's idea, 2026-10-13:
// "maybe masks… use a different color toko face"). The face is the master trace
// unchanged (scenes/toko_master.js, generated from toko/js/master.js); the carrier
// colour is one flat per mask, any of the nine (BRAND.md §2c — a colour may carry
// a mood). A mask gives a figure a FRONT without the code ever drawing a face.
window.RFM = (() => {
  const { C, TAU } = RFA, P = PAINT, { clamp, lerp } = U, M = window.TOKO_MASTER;
  const S = M.sticker;
  // the four ink shapes as Path2D in the 700-unit frame, built once
  const shapes = Object.fromEntries(Object.entries(M.shapes).map(([k, a]) => { const p = new Path2D(); for (let i = 0; i < a.length; i += 2) i ? p.lineTo(a[i], a[i + 1]) : p.moveTo(a[i], a[i + 1]); p.closePath(); return [k, p]; }));

  /** one mask: a carrier disc, the white face, a halftone shade, a strap; optional smart glasses */
  function mask(c, x, y, r, color, { glasses = false, led = false, t = 0, tilt = 0, strap = true, shade = true, glint = 0, face = C.cream, frame = C.ruska, ink = C.ink } = {}) {
    c.save(); c.translate(x, y); c.rotate(tilt);
    if (strap) { c.fillStyle = ink; c.fillRect(-r * 1.08, -r * 0.18, r * 2.16, r * 0.14); }
    c.fillStyle = color; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    // the face: the master trace, placed by its own frame (it sits a little low — part of the drawing)
    const s = (r * 2 * 0.72) / 700;
    c.save(); c.translate(-350 * s, -350 * s + r * 0.06); c.scale(s, s); c.fillStyle = face; for (const k of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) c.fill(shapes[k]); c.restore();
    if (shade) { // a pressed-tin shade: halftone dots on the lower right, clipped to the disc
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); c.globalAlpha = 0.28;
      c.fillStyle = P.dotPattern(c, 'rfm_shade', Math.max(6, r / 9), Math.max(1.6, r / 34), C.ink);
      c.beginPath(); c.arc(r * 0.55, r * 0.55, r * 1.05, 0, TAU); c.fill(); c.restore();
      c.strokeStyle = 'rgba(21,19,17,.55)'; c.lineWidth = Math.max(2, r * 0.035); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    }
    if (glint) { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * 0.45, -r * 0.5, r * 0.18, r * 0.08, -0.6, 0, TAU); c.fill(); }
    if (glasses) { // the smart glasses, worn over the mask's eyes — ochre frames, the red light
      const gy = -r * 0.22, gr = r * 0.3;
      c.lineWidth = Math.max(3, r * 0.07); c.strokeStyle = frame;
      for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * r * 0.36, gy, gr, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(-r * 0.06, gy); c.lineTo(r * 0.06, gy); c.stroke();
      c.beginPath(); c.moveTo(-r * 0.66, gy); c.lineTo(-r * 1.0, gy - r * 0.04); c.moveTo(r * 0.66, gy); c.lineTo(r * 1.0, gy - r * 0.04); c.stroke();
      if (led) { const on = Math.floor(t * 4) % 2 === 0; c.fillStyle = on ? C.red : '#7a1510'; c.beginPath(); c.arc(r * 0.82, gy - r * 0.2, Math.max(4, r * 0.08), 0, TAU); c.fill(); }
    }
    c.restore();
  }

  /** a figure facing us in a mask: coat with lapels, a scarf, a mask for a head */
  function front(c, x, y, s, { color = S.YELLOW, coat = C.ink, scarf = C.red, glasses = true, led = true, t = 0, tilt = 0, umbrella = false, step = 0, hands = null } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = C.ink;
    for (const [sx, sw] of [[-1, step], [1, -step]]) { c.beginPath(); c.moveTo(sx * 32 - 22, 270); c.lineTo(sx * 32 + 22, 270); c.lineTo(sx * 32 + 22 + sw * 18, 420); c.lineTo(sx * 32 - 22 + sw * 18, 420); c.closePath(); c.fill(); }
    c.fillStyle = coat; c.beginPath(); c.moveTo(-74, 40); c.quadraticCurveTo(-118, 48, -124, 120); c.lineTo(-138, 300); c.lineTo(138, 300); c.lineTo(124, 120); c.quadraticCurveTo(118, 48, 74, 40); c.closePath(); c.fill();
    c.fillStyle = 'rgba(244,236,214,.16)'; c.beginPath(); c.moveTo(-74, 40); c.lineTo(0, 170); c.lineTo(-30, 40); c.fill(); c.beginPath(); c.moveTo(74, 40); c.lineTo(0, 170); c.lineTo(30, 40); c.fill();   // lapels
    c.fillStyle = C.sub; for (const by of [190, 240]) { c.beginPath(); c.arc(0, by, 7, 0, TAU); c.fill(); }
    c.fillStyle = scarf; c.fillRect(-58, 28, 116, 30); c.fillRect(20, 40, 30, 90);
    if (hands) hands(c);
    mask(c, 0, -46, 72, color, { glasses, led, t, tilt });
    if (umbrella) { c.fillStyle = C.ink; c.beginPath(); c.arc(0, -150, 210, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 7; c.beginPath(); c.moveTo(0, -150); c.lineTo(0, 120); c.stroke(); }
    c.restore();
  }

  /** a gloved hand on a sleeve — no knuckle curve (it read as a smile: a face on an object) */
  function hand(c, x, y, s, rot = 0, { sleeve = C.ink, cuff = C.red, open = 0 } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.fillStyle = sleeve; c.beginPath(); c.moveTo(-60, 120); c.lineTo(60, 120); c.lineTo(80, 420); c.lineTo(-80, 420); c.closePath(); c.fill();
    c.fillStyle = cuff; c.fillRect(-66, 96, 132, 28);
    c.fillStyle = C.ink; c.beginPath(); c.roundRect(-62, 0, 124, 104, 30); c.fill();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-58 + i * 30, -60 - open * 20 + Math.abs(i - 1.5) * 8, 26, 80, 13); c.fill(); }
    c.beginPath(); c.roundRect(-98, 22, 52, 30, 15); c.fill();
    c.strokeStyle = C.sub; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-30 + i * 30, 6); c.lineTo(-30 + i * 30, 26); c.stroke(); }   // straight creases
    c.restore();
  }
  /** dusk at four o'clock: the paper goes dark from the top, a low red sun */
  const dusk = (key, sunY = 760) => P.cached('rfm_dusk_' + key, RFA.W, RFA.H, (g) => {
    g.drawImage(RFA.paper(key), 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, sunY + 300); gr.addColorStop(0, 'rgba(21,19,17,.96)'); gr.addColorStop(0.62, 'rgba(43,30,24,.86)'); gr.addColorStop(1, 'rgba(43,30,24,0)');
    g.fillStyle = gr; g.fillRect(0, 0, RFA.W, sunY + 300);
    g.fillStyle = 'rgba(200,35,28,.9)'; g.beginPath(); g.arc(RFA.W * 0.72, sunY, 210, 0, TAU); g.fill();
    g.fillStyle = 'rgba(21,19,17,.35)'; for (let i = 0; i < 9; i++) g.fillRect(0, sunY - 150 + i * 34, RFA.W, 6 + i * 1.6);   // the sun cut by bands, like a print
    g.drawImage(P.grain('rfm_' + key, 0.05, [80, 60, 20], 0.12), 0, 0);
  });
  /** Helsinki Cathedral: white, a big green dome on a drum, four small domes, columns, the steps */
  function cathedral(c, cx, base, s) {
    c.save(); c.translate(cx, base); c.scale(s, s);
    const W_ = '#f2ecdc', G = S.GREEN, sh = 'rgba(21,19,17,.22)';
    c.fillStyle = '#d9cfb8'; for (let i = 0; i < 9; i++) c.fillRect(-330 - i * 24, -i * 22 - 22, 660 + i * 48, 22);       // steps, widening down
    c.fillStyle = W_; c.fillRect(-250, -440, 500, 230);                                                             // the body
    c.fillStyle = sh; for (let i = 0; i < 6; i++) c.fillRect(-180 + i * 64, -400, 16, 180);                            // columns
    c.fillStyle = W_; c.beginPath(); c.moveTo(-200, -440); c.lineTo(0, -520); c.lineTo(200, -440); c.fill();         // pediment
    c.fillRect(-120, -640, 240, 200);                                                                                 // drum
    c.fillStyle = sh; for (let i = 0; i < 7; i++) c.fillRect(-100 + i * 32, -620, 10, 150);
    c.fillStyle = G; c.beginPath(); c.ellipse(0, -640, 136, 150, 0, Math.PI, 0); c.fill();                           // the green dome
    c.fillStyle = '#e0b84a'; c.fillRect(-12, -830, 24, 50); c.fillRect(-4, -880, 8, 60); c.fillRect(-18, -862, 36, 6); // lantern and cross, gilt
    for (const sx of [-1, 1]) { c.fillStyle = W_; c.fillRect(sx * 250 - 40, -560, 80, 120); c.fillStyle = G; c.beginPath(); c.ellipse(sx * 250, -560, 50, 58, 0, Math.PI, 0); c.fill(); }
    c.restore();
  }
  return { mask, front, hand, S, dusk, cathedral, shapes };
})();
