// Shot 3 · 6.4–9.6 s · The fund. The clearing: stumps to the treeline, what is left
// of the forest thin on the horizon. In the middle, the trunks stacked end-on into
// one tidy pile. The last log drops onto the top; a tag tied to it swings round and
// reads BIODIVERSITY FUND. The moose stands beside it; its ear turns. Camera eases in.
SCENES['bdf_pile'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, pop } = RFP, { C, row, mist, moose, logEnd, stump } = BDF, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_LOG = B, T_TAG = 2 * B, T_EAR = 3.2 * B, BASE = 1500, R = 52;
  // the pile: rows of log ends, five, four, three, two, then the last one on top
  const SLOTS = []; for (let rI = 0; rI < 4; rI++) for (let i = 0; i < 5 - rI; i++) SLOTS.push([540 + (i - (4 - rI) / 2) * R * 2.02, BASE - R - rI * R * 1.74]);
  const TOP = [540, BASE - R - 4 * R * 1.74];
  const tag = () => sprite('bdf_tag', 520, 330, 40, 40, (g) => {
    g.strokeStyle = K.cardD; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(40, 100); g.stroke();
    g.save(); g.translate(40, 100); g.rotate(0.06);
    g.fillStyle = K.card; g.beginPath(); g.moveTo(0, 0); g.lineTo(420, 0); g.lineTo(420, 150); g.lineTo(0, 150); g.lineTo(-40, 75); g.closePath(); g.fill();
    g.fillStyle = K.ink; g.beginPath(); g.arc(-8, 75, 10, 0, TAU); g.fill();
    g.font = '58px "Anton-400"'; g.fillText('BIODIVERSITY', 24, 70); g.fillStyle = K.mag; g.fillText('FUND', 24, 132); g.restore();
  }, 10);
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 12, y: 0, z: move(lt, 0, 3.2, 1, 1.1), fx: 620, fy: 1150 };
      // the last log: dropped from above, a hop when it lands
      const kd = clamp(lt / T_LOG, 0, 1), ly = lerp(-200, TOP[1], kd * kd) - (lt > T_LOG ? Math.abs(Math.sin((lt - T_LOG) * 16)) * Math.exp(-(lt - T_LOG) * 9) * 30 : 0);
      // the tag: hangs edge-on, then swings round to face us — its width is the turn
      const turn = lt < T_TAG ? 0.08 : clamp(ease.back((lt - T_TAG) / 0.35), 0.08, 1.15), swing = Math.sin(lt * 2.2) * 0.05;
      stack(c, [
        { sh: dusk('bdf', 900), d: 0.04, lift: 0 },
        { sh: row('thin', 1060, 9, 300, C.far, null, 17), d: 0.12, lift: 0.5 },
        { sh: mist('m1', 1030, 80, 6), d: 0.16, lift: 0.2, alpha: 0.18 },
        { sh: sheet('bdf_clear', (g) => { g.fillStyle = '#231d16'; g.fillRect(-90, 1080, W + 180, H); g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 1120; y < H; y += 60) g.fillRect(-90, y, W + 180, 3); }), d: 0.22, lift: 0.4 },
        { fn: (g, ox) => { const r = U.rng(5); for (let i = 0; i < 26; i++) { const y = 1110 + r() * 700, s = 0.4 + (y - 1100) / 700 * 1.2; put(g, stump(Math.round(s * 10) / 10), r() * W + ox, y, { lift: 0.5 + s * 0.6 }); } }, d: 0.3 },
        { fn: (g, ox) => {
          for (const [x, y] of SLOTS) put(g, logEnd(R), x + ox, y, { lift: 1.4 });
          put(g, logEnd(R), TOP[0] + ox, ly, { lift: 1.6 + (1 - kd) * 2 });
          if (lt > T_LOG * 0.6) { g.save(); g.translate(TOP[0] + 30 + ox, ly + 10); g.rotate(swing); g.scale(turn * 0.82, 0.82); put(g, tag(), 0, 0, { lift: 1.2 }); g.restore(); }   // 0.82: at full size the swing carried its far end past the frame
        }, d: 0.45 },
        { fn: (g, ox) => {
          glow(g, 260 + ox, BASE - 160, 260, 'rgba(240,170,70,', 0.22); moose(g, 150 + ox, BASE + 60, 0.8, 0.4, 1.8);      // left of the pile, so the tag swings out clear of it
          // the ear turns: a small card flick on the head
          if (lt > T_EAR && lt < T_EAR + 0.6) glow(g, 128 + ox, BASE - 180, 40, 'rgba(240,170,70,', 0.15);
        }, d: 0.5 },
      ], cam);
      RFP.leaves(c, lt + 9, { n: 7, seed: 71, cam });
      box(c);
    },
  };
})();
