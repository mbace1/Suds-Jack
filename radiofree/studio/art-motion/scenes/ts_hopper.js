// TEST 1 · Hopper night tram. Hard-edged light (the skill's 24_hopper "double
// version": paint everything once in shadow, once in light, clip the lit version
// into the light shapes). A lit Helsinki tram at a stop; three masked passengers
// sit facing out, each in the glasses, each red light on; the windows throw hard
// light onto the wet street and the light slides as the tram creeps; on the kerb
// a lone masked figure stands in a lamp's cone. Rain shows only inside the light.
SCENES['ts_hopper'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S } = RFM;
  const SH = { sky: '#22332f', sky2: '#3b4a3c', bld: '#26302b', bldW: '#4e5a4e', street: '#1f2420', kerb: '#3a3f37', body: '#264a3a', upper: '#8f8a6e', coat: '#1c1f1d', skin: '#7c6a55', strap: '#151815' };
  const LT = { street: '#7a6a45', kerb: '#b39a62', body: '#3f7d58', upper: '#efdfae', coat: '#5a4636', inside: '#f3d27c', insideD: '#d9a94e', lamp: '#f6dc9a' };
  const brush = () => P.cached('ts_h_brush', W, H, (g) => {           // Hopper's flat, barely-there drag of the brush
    const s = P.canvas(W / 4, H / 4), sg = s.getContext('2d'), im = sg.createImageData(W / 4, H / 4);
    for (let y = 0; y < H / 4; y++) for (let x = 0; x < W / 4; x++) { const v = 128 + P.fbm(x * 0.24, y * 0.024, 3) * 90 + P.fbm(x * 0.08 + y * 0.08, 3.1, 2) * 30, i = (y * W / 4 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    sg.putImageData(im, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, W, H);
  });
  const TRAM_Y = 760, TRAM_H = 520;
  function city(c) {
    const g = c.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, '#152320'); g.addColorStop(1, SH.sky2); c.fillStyle = g; c.fillRect(0, 0, W, 800);
    const r = U.rng(5);
    for (const [x, w, h] of [[-20, 300, 560], [260, 260, 640], [500, 330, 520], [810, 300, 600]]) {
      c.fillStyle = SH.bld; c.fillRect(x, 800 - h, w, h);
      for (let yy = 800 - h + 40; yy < 760; yy += 70) for (let xx = x + 26; xx < x + w - 40; xx += 64) {
        const lit = r() < 0.18; c.fillStyle = lit ? '#e9c470' : SH.bldW; c.fillRect(xx, yy, 34, 44);
        if (lit) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(xx, yy + 44 * (0.2 + r() * 0.5), 34, 4); }   // a blind half down
      }
    }
  }
  // the tram body, in one palette or the other
  function tram(c, k, x0, pal) {
    c.fillStyle = pal.body; c.fillRect(x0, TRAM_Y + 300, 1400, 220);
    c.fillStyle = pal.upper; c.fillRect(x0, TRAM_Y, 1400, 300);
    c.fillStyle = pal.body; c.fillRect(x0, TRAM_Y - 40, 1400, 44);
    c.fillStyle = '#121513'; for (let i = 0; i < 6; i++) c.fillRect(x0 + 40 + i * 230 + 190, TRAM_Y + 30, 16, 250);   // pillars
  }
  const WINS = (x0) => Array.from({ length: 6 }, (_, i) => [x0 + 40 + i * 230, TRAM_Y + 30, 190, 250]);
  function insides(c, x0, lt) {
    WINS(x0).forEach(([x, y, w, h], i) => {
      c.fillStyle = LT.inside; c.fillRect(x, y, w, h);
      c.fillStyle = LT.insideD; c.fillRect(x, y + h * 0.72, w, h * 0.28);                 // the seat backs
      c.fillStyle = '#fff4cc'; c.fillRect(x, y + 6, w, 8);                               // the ceiling strip light
      c.strokeStyle = '#6b5530'; c.lineWidth = 4; c.beginPath(); c.ellipse(x + w * 0.7, y + 60, 12, 18, 0, 0, TAU); c.stroke();   // a strap loop
      if (i % 2 === 0 || i === 3) {                                                      // a passenger, facing out
        const px = x + w / 2, py = y + 120;
        c.fillStyle = '#3d2f25'; c.beginPath(); c.moveTo(px - 70, y + h); c.quadraticCurveTo(px - 70, py + 40, px, py + 38); c.quadraticCurveTo(px + 70, py + 40, px + 70, y + h); c.fill();
        mask(c, px, py, 46, [S.ORANGE, S.RED, S.GREEN, '#f0027f'][i % 4], { glasses: true, led: true, t: lt + i * 0.31, tilt: Math.sin(i) * 0.05, strap: true, ink: '#2a2018', shade: true });
      }
    });
  }
  return {
    draw(c, lt) {
      const x0 = -120 - lt * 22;                                     // the tram creeps; its light slides with it
      // ── the SHADOW version of everything ──
      city(c);
      c.fillStyle = SH.street; c.fillRect(0, 1280, W, 640);
      c.fillStyle = SH.kerb; c.fillRect(0, 1560, W, 26);
      tram(c, 0, x0, SH);
      insides(c, x0, lt);
      // reflections of the lit windows in the wet street: soft vertical streaks
      c.save(); c.globalAlpha = 0.28; c.filter = 'blur(6px)';
      WINS(x0).forEach(([x, y, w]) => { const g = c.createLinearGradient(0, 1290, 0, 1560); g.addColorStop(0, LT.inside); g.addColorStop(1, 'rgba(243,210,124,0)'); c.fillStyle = g; c.fillRect(x + 10, 1290, w - 20, 270); });
      c.restore();
      // ── the LIGHT shapes: each window's light on the street; the lamp's cone on the kerb ──
      const patches = WINS(x0).map(([x, y, w, h]) => [[x + 30, 1300], [x + w + 30, 1300], [x + w + 170, 1540], [x + 170, 1540]]);
      const cone = [[730, 700], [910, 700], [1080, 1920], [430, 1920]];
      P.litClip(c, [...patches, cone], (g) => {
        g.fillStyle = LT.street; g.fillRect(0, 1280, W, 640);
        g.fillStyle = LT.kerb; g.fillRect(0, 1560, W, 26);
        // rain is only visible inside the light
        g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = 2; g.beginPath(); const r = U.rng(9);
        for (let i = 0; i < 160; i++) { const x = r() * W, y = 1080 + ((lt * 1300 + r() * 840) % 840); g.moveTo(x, y); g.lineTo(x - 6, y + 34); } g.stroke();
      });
      // the lamp, and the lone figure on the kerb — painted dark, then lit inside the cone
      c.fillStyle = '#1a1d1b'; c.fillRect(960, 690, 16, 1230); c.fillRect(820, 684, 156, 12); c.fillStyle = LT.lamp; c.beginPath(); c.ellipse(820, 700, 60, 20, 0, 0, TAU); c.fill();
      const fig = (g, pal, lit) => {
        g.save(); g.translate(765, 1900); g.scale(1.75, 1.75); g.translate(-765, -1880);   // the hero: big, in the light
        g.fillStyle = pal.coat; g.beginPath(); g.moveTo(650, 1880); g.lineTo(670, 1500); g.quadraticCurveTo(760, 1440, 850, 1500); g.lineTo(880, 1880); g.closePath(); g.fill();
        g.fillStyle = lit ? '#c8382b' : '#5a201a'; g.fillRect(700, 1480, 130, 30);
        mask(g, 765, 1410, 64, lit ? S.YELLOW : '#8a6e10', { glasses: true, led: true, t: lt, tilt: -0.08, face: lit ? '#fbf3dc' : '#8a8270', frame: lit ? '#e2b34a' : '#6a5a2a', ink: '#151815' });
        g.restore();
      };
      fig(c, SH, false);
      P.litClip(c, [cone], (g) => fig(g, LT, true));
      // the hard light also catches the tram's lower body edge nearest the lamp
      c.save(); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = 0.2; c.drawImage(brush(), 0, 0); c.restore();
      c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.5; c.drawImage(P.grain('ts_h', 0.04, [40, 30, 20], 0.2), 0, 0); c.restore();
      // the stop sign: KALLIO 3
      c.fillStyle = '#e8d9a8'; c.fillRect(120, 1180, 220, 70); c.fillStyle = '#1c1f1d'; c.font = '52px "Anton-400"'; c.fillText('KALLIO 3', 138, 1235);
    },
  };
})();
