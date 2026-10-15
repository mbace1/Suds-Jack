// Shot 5 · 25.7–32.1 s · Leave it out. A desk, a monitor, a keyboard cropped tight. The A and I keys
// glow; two banded bricks of cash drop onto them and pin them down. Then a magenta glove — the money —
// types the next ad, one finger at a time: HEALTH CARE, IMMIGRATION. Every A and every I, the finger
// pokes the cash and nothing happens, so the monitor reads HE_LTH C_RE / _MM_GR_T_ON.
SCENES['pfb_keys'] = (() => {
  const { stack, put, ease, glow, sheet, sprite } = RFP, F = PFB, { clamp, lerp } = U, C = F.C, W = 1080, TAU = Math.PI * 2;
  const DUR = 12 * 60 / 112, B = 60 / 112, T_A = 2 * B, T_I = 3 * B, T_TYPE = 4 * B, DT = 0.13;
  const PITCH = 94, KW = 84, KH = 80, FACE = 18, PRESS = 12;
  const ROWS = [['QWERTYUIOP', 75, 1110], ['ASDFGHJKL', 107, 1214], ['ZXCVBNM', 151, 1318]];
  const KEYS = {};
  ROWS.forEach(([s, x0, y]) => [...s].forEach((ch, k) => (KEYS[ch] = { x: x0 + k * PITCH, y, w: KW })));
  KEYS[' '] = { x: 300, y: 1422, w: 480 };
  const PINNED = { A: T_A, I: T_I };
  // what the glove types, one slot a beat-and-a-bit apart; '\n' is a breath between the lines
  const LINES = ['HEALTH CARE', 'IMMIGRATION'];
  const SEQ = [...LINES[0], '\n', ...LINES[1]].map((ch, i) => ({ ch, t: T_TYPE + i * DT })), TYPED = SEQ.filter((s) => s.ch !== '\n');
  const keyTop = (ch) => sprite('pfb_key_' + ch, KEYS[ch].w + 4, KH + 4, 2, 2, (g) => {
    const w = KEYS[ch].w; g.fillStyle = C.creamL; g.beginPath(); g.roundRect(0, 0, w, KH, 10); g.fill();
    g.fillStyle = 'rgba(0,0,0,.05)'; g.beginPath(); g.roundRect(6, 6, w - 12, KH - 12, 8); g.fill();
    if (ch !== ' ') { g.fillStyle = C.navy; g.font = '40px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText(ch, w / 2, 54); }
  }, 4);
  const desk = () => sheet('pfb_desk', (g) => {
    g.fillStyle = C.floor; g.fillRect(-90, 1030, W + 180, 1000);
    g.strokeStyle = 'rgba(120,70,30,.25)'; g.lineWidth = 3; for (let y = 1060; y < 2010; y += 46) { g.beginPath(); g.moveTo(-90, y); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, y + Math.sin(x * 0.01 + y) * 6); g.stroke(); }
    g.fillStyle = C.floorD; g.fillRect(-90, 1030, W + 180, 10);
    // the monitor: stand, base, bezel, screen (drawn live)
    g.fillStyle = C.tv; g.fillRect(500, 980, 80, 70); g.fillStyle = C.tvL; g.beginPath(); g.ellipse(540, 1056, 150, 20, 0, 0, TAU); g.fill();
    g.fillStyle = C.tv; g.beginPath(); g.roundRect(150, 586, 780, 404, 14); g.fill();
    // the keyboard's case
    g.fillStyle = C.navyD; g.beginPath(); g.roundRect(14, 1094, 1052, 470, 24); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.roundRect(14, 1080, 1052, 452, 24); g.fill();
    // a campaign button on the desk: red rim, cream face, navy star
    g.fillStyle = C.red; g.beginPath(); g.arc(150, 1690, 62, 0, TAU); g.fill(); g.fillStyle = C.creamL; g.beginPath(); g.arc(150, 1690, 46, 0, TAU); g.fill(); g.fillStyle = C.navy; F.star(g, 150, 1693, 34);
  }, 14);
  /** how far down a key is at time lt (0..PRESS) */
  function depth(ch, lt) {
    if (PINNED[ch] != null) { const k = clamp((lt - PINNED[ch] - 0.22) / 0.06, 0, 1); return k * PRESS; }
    let d = 0; for (const s of SEQ) if (s.ch === ch) { const u = (lt - s.t) / 0.11; if (u > 0 && u < 1) d = Math.max(d, PRESS * Math.sin(u * Math.PI)); }
    return d;
  }
  /** where the glove's fingertip is: over its key, dipping on the press; on A and I it lands on the cash */
  function target(ch) { const k = KEYS[ch]; if (PINNED[ch] != null) return { x: k.x + k.w / 2, y: k.y + KH + PRESS - 90 }; return { x: k.x + k.w / 2, y: k.y + 40 }; }
  function finger(lt) {
    const typed = TYPED;
    if (lt < typed[0].t - 0.1) { const k = ease.out((lt - (T_I + 0.15)) / 0.45), t0 = target(typed[0].ch); return { x: lerp(t0.x + 500, t0.x, k), y: lerp(t0.y + 900, t0.y, k), dip: 0 }; }
    let i = 0; while (i < typed.length - 1 && lt >= typed[i + 1].t - 0.08) i++;
    const cur = typed[i], nxt = typed[i + 1], p = target(cur.ch);
    let x = p.x, y = p.y;
    if (nxt && lt > nxt.t - 0.08) { const k = ease.out((lt - (nxt.t - 0.08)) / 0.08), q = target(nxt.ch); x = lerp(p.x, q.x, k); y = lerp(p.y, q.y, k) - Math.sin(k * Math.PI) * 30; }
    const u = (lt - cur.t) / 0.11, dip = u > 0 && u < 1 ? Math.sin(u * Math.PI) * (PINNED[cur.ch] != null ? 5 : PRESS) : 0;
    if (!nxt && lt > cur.t + 0.25) { const k = ease.out((lt - cur.t - 0.25) / 0.5); return { x: x + k * 140, y: y + k * 260, dip: 0 }; }
    return { x, y, dip };
  }
  /** a brick's drop: from above the frame, landing with a squash at T, then sitting on its key */
  function brickAt(ch, lt) {
    const T = PINNED[ch], k = KEYS[ch], x = k.x + k.w / 2, rest = k.y + KH + PRESS, u = clamp((lt - T) / 0.22, 0, 1);
    const y = lerp(rest - 1400, rest, u * u), sq = lt > T + 0.22 ? Math.exp(-(lt - T - 0.22) * 14) * Math.cos((lt - T - 0.22) * 40) * 0.12 : 0;
    let wob = 0; for (const s of SEQ) if (s.ch === ch) { const v = (lt - s.t) / 0.25; if (v > 0 && v < 1) wob = Math.sin(v * Math.PI * 3) * 0.04 * (1 - v); }
    return { x, y, sx: 1 + sq, sy: 1 - sq, rot: wob, on: lt >= T - 0.3 };
  }
  /** the monitor: the next ad, as typed so far — a gap where every A and I should be */
  const FONT = '104px "Anton-400"', GAP = 54;
  let LAYOUT = null;   // measured at the first frame, once the face has loaded (measured earlier, it is the fallback font's width)
  const layout = (g) => LINES.map((line) => { g.font = FONT; const items = [...line].map((ch) => ({ ch, w: ch === ' ' ? 30 : PINNED[ch] != null ? GAP : g.measureText(ch).width + 3 })); const tw = items.reduce((a, b) => a + b.w, 0); let x = 540 - tw / 2; items.forEach((it) => { it.x = x; x += it.w; }); return items; });
  function screen(g, lt) {
    if (!LAYOUT) LAYOUT = layout(g);
    g.save(); g.beginPath(); g.rect(170, 606, 740, 364); g.clip();
    g.fillStyle = C.creamL; g.fillRect(170, 606, 740, 364);
    g.fillStyle = C.navy; g.fillRect(170, 606, 740, 52); g.fillStyle = C.brass; for (const x of [500, 540, 580]) F.star(g, x, 632, 13); g.fillStyle = C.red; g.fillRect(170, 658, 740, 6);
    let cx = LAYOUT[0][0].x - 10, cy = 0; const ys = [790, 920];
    LAYOUT.forEach((items, li) => items.forEach((it, idx) => {
      const s = TYPED[(li ? LAYOUT[0].length : 0) + idx];
      if (lt < s.t) return;
      const y = ys[li];
      if (PINNED[it.ch] != null) {
        const f = clamp(1 - (lt - s.t) / 0.4, 0, 1);
        g.fillStyle = f > 0 ? `rgba(240,2,127,${(0.25 * f).toFixed(3)})` : 'rgba(0,0,0,0)'; g.fillRect(it.x + 6, y - 86, it.w - 12, 86);
        g.strokeStyle = C.brass; g.lineWidth = 4; g.setLineDash([10, 8]); g.strokeRect(it.x + 6, y - 86, it.w - 12, 86); g.setLineDash([]);
        g.fillStyle = C.brass; g.fillRect(it.x + 6, y + 8, it.w - 12, 8);
      } else if (it.ch !== ' ') { g.fillStyle = C.navy; g.font = FONT; g.textAlign = 'left'; g.fillText(it.ch, it.x, y); }
      cx = it.x + it.w; cy = y;
    }));
    if (Math.floor(lt * 2.4) % 2 === 0) { g.fillStyle = C.red; g.fillRect(cx + 6, (cy || 790) - 86, 10, 96); }
    const gl = g.createLinearGradient(170, 606, 910, 970); gl.addColorStop(0, 'rgba(255,255,255,.12)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(170, 606, 740, 364);
    g.restore();
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 };
      const z = lerp(1.0, 1.02, ease.out(lt / DUR)), f = finger(lt);
      c.save(); F.view(c, z, 540, 1260);
      stack(c, [
        { sh: F.wallpaper(), d: 0.03, lift: 0, soft: 1 },
        { sh: desk(), d: 0.08, lift: 0.8, alpha: 0.4 },
        { fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); screen(g, lt); g.restore(); }, d: 0.08 },
        { fn: (g, ox, oy) => {   // the keys, back row first; then the cash on A and I
          for (const ch of Object.keys(KEYS)) {
            const k = KEYS[ch], d = depth(ch, lt), x = k.x + ox, y = k.y + oy;
            g.fillStyle = '#c4b594'; g.beginPath(); g.roundRect(x, y + d + KH - 12, k.w, FACE - d + 12, [0, 0, 10, 10]); g.fill();
            if (PINNED[ch] != null && lt < PINNED[ch] + 0.2) { const pulse = 0.5 + 0.5 * Math.sin(lt * 12); glow(g, x + k.w / 2, y + KH / 2, 120, 'rgba(255,214,90,', 0.5 * pulse * clamp(lt / 0.4, 0, 1)); }
            put(g, keyTop(ch), x - 2, y + d - 2, { lift: 0.35 * (1 - d / PRESS) + 0.05, alpha: 0.4 });
            if (PINNED[ch] != null && lt < PINNED[ch] + 0.2) { g.strokeStyle = C.brass; g.lineWidth = 6; g.beginPath(); g.roundRect(x - 6, y - 6, k.w + 12, KH + 12, 14); g.stroke(); }
          }
          for (const ch of ['I', 'A']) { const b = brickAt(ch, lt); if (!b.on) continue; g.save(); g.translate(b.x + ox, b.y + oy); g.rotate(b.rot); g.scale(b.sx, b.sy); put(g, F.brick(), 0, 0, { lift: lt < PINNED[ch] + 0.22 ? 3 : 0.8, alpha: 0.45 }); g.restore(); }
        }, d: 0.1 },
        { fn: (g, ox, oy) => put(g, F.typingHand(), f.x + ox, f.y + f.dip + oy, { lift: 1.6, alpha: 0.35, rot: -0.12 }), d: 0.14 },
      ], cam);
      c.restore();
      F.box(c);
    },
  };
})();
