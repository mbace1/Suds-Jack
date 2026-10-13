// TEST 6 · Art Deco travel poster (after Cassandre's "Nord Express", 1927).
// Airbrushed gradients, a sunburst, a single machine rushing at you in steep
// perspective, overhead wires and rails converging, chrome speed whiskers,
// geometric lettering. Here: a Helsinki tram whose headlights are the two lenses
// of the glasses and whose destination blind reads KASSA (checkout), next to the
// red LED. The tagline is the joke: WHERE EVERYTHING YOU SEE IS FOR SALE.
SCENES['ts_deco'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U;
  const K = { cream: '#efe4c8', green: '#1f4a3c', greenD: '#12302a', greenL: '#4f9479', gold: '#d9a64a', goldL: '#f3d08a', black: '#141210', red: '#c8231c', sky1: '#e98a3a', sky2: '#f6cf86', sky3: '#1f3f36' };
  // airbrush: fine spray grain everywhere, so the gradients read as sprayed, not computed
  const spray = () => P.cached('ts_d_spray', W, H, (g) => {
    const im = g.createImageData(W, H), r = U.rng(5);
    for (let i = 0; i < im.data.length; i += 4) { const v = r(); im.data[i] = im.data[i + 1] = im.data[i + 2] = v > 0.5 ? 255 : 0; im.data[i + 3] = r() < 0.18 ? 22 : 0; }
    g.putImageData(im, 0, 0);
  });
  const VP = [540, 820];
  const T = { top: 470, bot: 1560, wt: 470, wb: 900 };
  const hw = (y) => lerp(T.wt, T.wb, (y - T.top) / (T.bot - T.top)) / 2;
  return {
    draw(c, lt) {
      // the sky: dusk green down into a sprayed sunset
      const sk = c.createLinearGradient(0, 0, 0, VP[1]); sk.addColorStop(0, K.sky3); sk.addColorStop(0.6, K.sky1); sk.addColorStop(1, K.sky2); c.fillStyle = sk; c.fillRect(0, 0, W, VP[1]);
      // the sunburst: alternate wedges from the vanishing point, turning slowly
      c.save(); c.beginPath(); c.rect(0, 0, W, VP[1]); c.clip(); c.fillStyle = 'rgba(255,236,190,.16)';
      for (let k = 0; k < 18; k++) { const a0 = Math.PI + k / 18 * Math.PI + lt * 0.03, a1 = a0 + Math.PI / 36; c.beginPath(); c.moveTo(VP[0], VP[1]); c.arc(VP[0], VP[1], 1400, a0, a1); c.closePath(); c.fill(); }
      c.restore();
      const sun = c.createRadialGradient(VP[0], VP[1], 10, VP[0], VP[1], 420); sun.addColorStop(0, 'rgba(255,244,210,.95)'); sun.addColorStop(1, 'rgba(255,244,210,0)'); c.fillStyle = sun; c.fillRect(0, 360, W, 460);
      // the ground: rails converging, sleepers rushing out toward you
      c.fillStyle = K.greenD; c.fillRect(0, VP[1], W, H - VP[1]);
      const gr = c.createLinearGradient(0, VP[1], 0, H); gr.addColorStop(0, 'rgba(246,207,134,.35)'); gr.addColorStop(0.4, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, VP[1], W, H - VP[1]);
      for (let k = 0; k < 12; k++) { const q = ((k / 12 + lt * 0.5) % 1), y = VP[1] + 10 + q * q * (H - VP[1]); c.strokeStyle = `rgba(239,228,200,${0.1 + q * 0.3})`; c.lineWidth = 2 + q * 18; c.beginPath(); c.moveTo(VP[0] - (y - VP[1]) * 1.4, y); c.lineTo(VP[0] + (y - VP[1]) * 1.4, y); c.stroke(); }
      c.strokeStyle = K.goldL; c.lineWidth = 7; for (const fx of [-1300, -420, 420, 1300]) { c.beginPath(); c.moveTo(VP[0], VP[1]); c.lineTo(VP[0] + fx, H); c.stroke(); }
      // the overhead wires, converging up into the sunset; poles striding past
      c.strokeStyle = K.black; c.lineWidth = 4; for (const fx of [-1200, 1200]) { c.beginPath(); c.moveTo(VP[0], VP[1] - 60); c.lineTo(VP[0] + fx, -200); c.stroke(); }
      c.lineWidth = 3; c.beginPath(); c.moveTo(VP[0], VP[1] - 60); c.lineTo(VP[0], -100); c.stroke();
      for (let k = 0; k < 4; k++) { const q = ((k / 4 + lt * 0.5) % 1), d = q * q, x = VP[0] + (k % 2 ? 1 : -1) * (40 + d * 900), yb = VP[1] + d * 900, ht = 80 + d * 1100; c.fillStyle = K.black; c.fillRect(x - (2 + d * 18), yb - ht, 4 + d * 36, ht); }
      // chrome speed whiskers streaming past both flanks
      for (let k = 0; k < 7; k++) { const y = 1000 + k * 70, q = (lt * 1.4 + k * 0.17) % 1;
        for (const sd of [-1, 1]) { const x0 = 540 + sd * (hw(y) + 20), ln = 160 + q * 260; const g = c.createLinearGradient(x0, 0, x0 + sd * ln, 0); g.addColorStop(0, 'rgba(243,208,138,.85)'); g.addColorStop(1, 'rgba(243,208,138,0)'); c.fillStyle = g; c.fillRect(Math.min(x0, x0 + sd * ln), y, ln, 10); } }
      // the pantograph on the roof, its shoe on the wire
      c.strokeStyle = K.black; c.lineWidth = 9; c.lineJoin = 'miter';
      const pz = Math.sin(lt * 3) * 6;
      c.beginPath(); c.moveTo(450, T.top - 4); c.lineTo(540, 330 + pz); c.lineTo(630, T.top - 4); c.moveTo(470, 380 + pz); c.lineTo(610, 380 + pz); c.stroke();
      c.lineWidth = 12; c.beginPath(); c.moveTo(470, 330 + pz); c.lineTo(610, 330 + pz); c.stroke();
      // the tram body, head-on: a trapezoid, sprayed from dark flanks to a lit centre
      const body = new Path2D(); body.moveTo(540 - T.wt / 2, T.top); body.lineTo(540 + T.wt / 2, T.top); body.lineTo(540 + T.wb / 2, T.bot); body.lineTo(540 - T.wb / 2, T.bot); body.closePath();
      const bg = c.createLinearGradient(540 - T.wb / 2, 0, 540 + T.wb / 2, 0); bg.addColorStop(0, K.greenD); bg.addColorStop(0.42, K.greenL); bg.addColorStop(0.58, K.greenL); bg.addColorStop(1, K.greenD);
      c.fillStyle = bg; c.fill(body);
      // the cream roof band, Helsinki's two-tone livery
      c.save(); c.clip(body); c.fillStyle = K.cream; c.fillRect(0, T.top, W, 100); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, T.top + 92, W, 8); c.restore();
      // the destination blind: KASSA, the red light beside it
      c.fillStyle = K.black; c.fillRect(400, T.top + 16, 280, 64);
      c.fillStyle = K.goldL; c.font = '46px "JosefinSans-700"'; c.textAlign = 'center'; c.fillText('3  KASSA', 524, T.top + 64);
      const on = Math.floor(lt * 4) % 2 === 0; c.fillStyle = on ? '#ff2a1c' : '#5a1210'; c.beginPath(); c.arc(652, T.top + 48, 16, 0, TAU); c.fill();
      if (on) { const gl = c.createRadialGradient(652, T.top + 48, 0, 652, T.top + 48, 70); gl.addColorStop(0, 'rgba(255,60,40,.6)'); gl.addColorStop(1, 'rgba(255,60,40,0)'); c.fillStyle = gl; c.fillRect(582, T.top - 22, 140, 140); }
      // the windscreen, with the sunset sprayed across it
      const ws = c.createLinearGradient(0, 600, 0, 900); ws.addColorStop(0, '#2a2420'); ws.addColorStop(1, '#6a4a2c'); c.fillStyle = ws;
      c.beginPath(); c.moveTo(310, 600); c.lineTo(770, 600); c.lineTo(800, 900); c.lineTo(280, 900); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,230,180,.22)'; c.beginPath(); c.moveTo(350, 610); c.lineTo(470, 610); c.lineTo(390, 890); c.lineTo(300, 890); c.closePath(); c.fill();
      c.strokeStyle = K.gold; c.lineWidth = 8; c.beginPath(); c.moveTo(540, 600); c.lineTo(540, 900); c.stroke();
      // chrome bands
      for (const y of [930, 1440, 1510]) { const ch = c.createLinearGradient(0, y, 0, y + 26); ch.addColorStop(0, K.goldL); ch.addColorStop(0.5, '#fff6dc'); ch.addColorStop(1, K.gold); c.fillStyle = ch; c.fillRect(540 - hw(y), y, hw(y) * 2, 24); }
      // THE HEADLIGHTS ARE THE GLASSES: two gold rings and a bridge, each lens a sprayed light
      const fl = 0.6 + 0.4 * Math.pow(Math.max(0, Math.sin(lt * Math.PI * 112 / 60)), 6);
      for (const sx of [-1, 1]) {
        const cx = 540 + sx * 205, cy = 1170;
        const beam = c.createRadialGradient(cx, cy, 60, cx, cy, 560 * fl); beam.addColorStop(0, 'rgba(255,248,220,.45)'); beam.addColorStop(1, 'rgba(255,248,220,0)'); c.fillStyle = beam; c.beginPath(); c.arc(cx, cy, 560 * fl, 0, TAU); c.fill();
        const lens = c.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 130); lens.addColorStop(0, '#fffdf2'); lens.addColorStop(0.55, '#f6d98e'); lens.addColorStop(1, '#b98a3a');
        c.fillStyle = lens; c.beginPath(); c.arc(cx, cy, 125, 0, TAU); c.fill();
        c.strokeStyle = K.gold; c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, 125, 0, TAU); c.stroke();
        c.strokeStyle = K.goldL; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, 125, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
      }
      c.strokeStyle = K.gold; c.lineWidth = 26; c.beginPath(); c.moveTo(455, 1160); c.quadraticCurveTo(540, 1120, 625, 1160); c.stroke();
      // the fender and its shadow on the sleepers
      c.fillStyle = K.black; c.beginPath(); c.moveTo(540 - hw(1540), 1540); c.lineTo(540 + hw(1540), 1540); c.lineTo(540 + hw(1540) - 30, 1600); c.lineTo(540 - hw(1540) + 30, 1600); c.closePath(); c.fill();
      // lettering: the city, huge and geometric; the tagline in a band
      c.fillStyle = K.black; c.fillRect(0, 1600, W, 320);
      c.fillStyle = K.goldL; c.font = '196px "JosefinSans-700"'; c.textAlign = 'center'; c.fillText('HELSINKI', 540, 1800);
      c.fillStyle = K.cream; c.font = '40px "JosefinSans-700"'; c.fillText('WHERE EVERYTHING YOU SEE IS FOR SALE', 540, 1872);
      c.fillStyle = K.cream; c.font = '44px "JosefinSans-700"'; c.fillText('V I S I T', 540, 110);
      c.save(); c.globalCompositeOperation = 'overlay'; c.drawImage(spray(), 0, 0); c.restore();
      c.textAlign = 'left';
    },
  };
})();
