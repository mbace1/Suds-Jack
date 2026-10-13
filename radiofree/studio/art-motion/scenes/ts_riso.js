// TEST 7 · Risograph print. Three fluorescent spot inks plus a black key on cream
// paper, each its own plate, MULTIPLIED down with its own registration error, so
// overlaps make the extra colours for free; tone is halftone, never a gradient.
// The scene is a pedestrian crossing seen from straight above: umbrellas in the
// three inks, the zebra stripes left as bare paper, and in the middle one person
// who has tipped the umbrella back to look UP at you — mask, glasses, the red
// light. Each umbrella is tagged with a price, like a surveillance diagram.
SCENES['ts_riso'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp } = U, { mask, S } = RFM;
  const INK = { pink: '#ff48b0', yellow: '#ffd800', teal: '#00a29a', key: '#24201c' }, PAPER = '#f4ecdc';
  const plates = {};
  const plate = (k) => (plates[k] ||= P.canvas(W, H));
  function halftone(g, x0, y0, w, h, val, cell = 14, ang = 0.3) {
    const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(w, h);
    g.beginPath();
    for (let u = -R; u < R; u += cell) for (let v = -R; v < R; v += cell) {
      const x = x0 + w / 2 + u * ca - v * sa, y = y0 + h / 2 + u * sa + v * ca;
      if (x < x0 - cell || x > x0 + w + cell || y < y0 - cell || y > y0 + h + cell) continue;
      const k = val(x, y); if (k <= 0.02) continue;
      const r = Math.sqrt(clamp(k, 0, 1)) * cell * 0.62; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU);
    }
    g.fill();
  }
  // hand-placed: two lanes either side of the one who stops, tags pointing outward
  const UMB = [
    { x: 230, y: 330, R: 140, ink: 'pink', tag: '$249', side: 1 },
    { x: 830, y: 470, R: 150, ink: 'yellow', tag: '$20/MO', side: -1 },
    { x: 250, y: 720, R: 130, ink: 'teal', tag: '$100/MO', side: 1 },
    { x: 860, y: 900, R: 125, ink: 'pink', tag: '$249', side: -1 },
    { x: 210, y: 1180, R: 150, ink: 'yellow', tag: '$20/MO', side: 1, down: true },
    { x: 840, y: 1320, R: 140, ink: 'teal', tag: '$100/MO', side: -1 },
    { x: 360, y: 1560, R: 130, ink: 'pink', tag: '$249', side: -1 },
  ].map((u, i) => ({ ...u, ph: i * 0.9, v: 22 + (i % 3) * 8 }));
  function brolly(g, x, y, R, ph, rib = 5) {
    g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + ph; g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = rib; g.beginPath();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + ph; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); }
    g.stroke(); g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill(); g.restore();
  }
  return {
    draw(c, lt) {
      for (const k in INK) { const g = plate(k).getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.fillStyle = '#000'; g.strokeStyle = '#000'; }
      const pk = plate('pink').getContext('2d'), ye = plate('yellow').getContext('2d'), te = plate('teal').getContext('2d'), ky = plate('key').getContext('2d');
      // the road: teal halftone, denser toward the kerbs; zebra stripes and the title band left as bare paper
      te.save(); te.beginPath(); te.rect(0, 0, W, H);
      for (let i = 0; i < 8; i++) te.rect(150, 150 + i * 200, 780, 110);
      te.rect(0, 1760, W, 160);
      te.clip('evenodd'); halftone(te, 0, 0, W, H, (x) => 0.3 + 0.42 * Math.abs(x - 540) / 540, 16, 0.4); te.restore();
      // a yellow ramp from the top (the shop lights) — halftone, not a gradient
      halftone(ye, 0, 0, W, 640, (x, y) => 0.55 * (1 - y / 640), 18, 1.1);
      // the crowd, walking down the crossing
      for (const u of UMB) {
        const y = u.y + ((lt * u.v) % 80), x = u.x + Math.sin(lt * 1.2 + u.ph) * 5, g = { pink: pk, yellow: ye, teal: te }[u.ink];
        brolly(g, x, y, u.R, u.ph + lt * 0.15);
        // the diagram: dashed ring, a leader line and a tag, on the key plate
        ky.save(); ky.setLineDash([14, 10]); ky.lineDashOffset = -lt * 40; ky.lineWidth = 4; ky.beginPath(); ky.arc(x, y, u.R + 22, 0, TAU); ky.stroke(); ky.restore();
        const dy = u.down ? 1 : -1, ex = x + u.side * (u.R + 22) * 0.7, ey = y + dy * (u.R + 22) * 0.7, lx = ex + u.side * 50, ly = ey + dy * 40;
        ky.lineWidth = 4; ky.beginPath(); ky.moveTo(ex, ey); ky.lineTo(lx, ly); ky.stroke();
        ky.font = '44px "AlfaSlabOne-400"'; const tw = ky.measureText(u.tag).width;
        const bx = u.side > 0 ? lx : lx - tw - 28;
        ky.fillRect(bx, ly - 30, tw + 28, 56);
        pk.fillRect(bx + 6, ly - 24, tw + 16, 44);                      // the tag's pink lining shows through the misregistration
        ky.save(); ky.globalCompositeOperation = 'destination-out'; ky.fillText(u.tag, bx + 14, ly + 15); ky.restore();
      }
      // the one who stops and looks up: shoulders from above, the umbrella tipped back behind the head
      const fx = 560, fy = 1010;
      ye.save(); ye.translate(fx + 40, fy - 120); ye.scale(1, 0.55); brolly(ye, 0, 0, 230, 0.2, 7); ye.restore();
      ky.lineWidth = 8; ky.beginPath(); ky.moveTo(fx + 20, fy + 40); ky.lineTo(fx + 40, fy - 120); ky.stroke();
      pk.beginPath(); pk.ellipse(fx, fy + 70, 190, 110, 0, 0, TAU); pk.fill();
      halftone(te, fx - 190, fy - 40, 380, 220, (x, y) => (Math.hypot(x - fx, y - fy - 70) < 190 ? 0.35 : 0), 12, 0.8);
      // the title band
      ky.font = '64px "AlfaSlabOne-400"'; ky.textAlign = 'center'; ky.fillText('LOOK UP. SMILE.', 540, 1838);
      pk.font = '64px "AlfaSlabOne-400"'; pk.textAlign = 'center'; pk.fillText('CHECKOUT.', 540, 1900);
      ky.textAlign = 'left'; pk.textAlign = 'left';
      // print: paper, then each plate tinted and multiplied with its own registration error
      c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
      const jr = U.rng(Math.floor(lt * 8) + 3);
      const reg = { yellow: [jr() * 6 - 3, jr() * 6 - 3], teal: [-4 + jr() * 2, 3 + jr() * 2], pink: [5 + jr() * 2, -4 + jr() * 2], key: [0, 0] };
      const tint = P.scratch('ts_r_tint'), tg = tint.getContext('2d');
      for (const k of ['yellow', 'teal', 'pink', 'key']) {
        tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(plate(k), 0, 0);
        tg.globalCompositeOperation = 'source-in'; tg.fillStyle = INK[k]; tg.fillRect(0, 0, W, H);
        c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = k === 'key' ? 0.95 : 0.9; c.drawImage(tint, reg[k][0], reg[k][1]); c.restore();
      }
      // the face that looks up: printed on top as a sticker (it must read)
      mask(c, fx, fy - 10, 112, S.GREEN, { glasses: true, led: true, t: lt, tilt: Math.sin(lt * 0.9) * 0.06, face: PAPER, frame: INK.key, ink: INK.key, shade: false });
      c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.5; c.drawImage(P.grain('ts_r', 0.06, [60, 50, 40], 0.22), 0, 0); c.restore();
    },
  };
})();
