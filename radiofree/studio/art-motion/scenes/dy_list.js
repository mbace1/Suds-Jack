// Shot 4 · The list. In on the binder, open on the podium: RULES FOR THE DAY AFTER, numbered, mostly unreadable
// scribble — and number 5 types itself out in red as the caption reaches it: REQUIRED KILL SWITCH, then a highlighter
// swipes across it on "kill switch".
SCENES['dy_list'] = (() => {
  const { stack, box, sheet } = RFP, D = DY, ID = 'dy_list', { clamp, lerp } = U;
  const desk = () => sheet('dy_desk', (g) => { g.fillStyle = '#2b1c12'; g.fillRect(-90, -90, 1260, 2100); const r = U.rng(4); g.strokeStyle = 'rgba(90,58,34,.5)'; g.lineWidth = 3; for (let i = 0; i < 40; i++) { const y = r() * 1920; g.beginPath(); g.moveTo(-90, y); g.bezierCurveTo(300, y + 30, 700, y - 30, 1170, y + 10); g.stroke(); } }, 6);
  return {
    draw(c, lt) {
      const tK = D.at(ID, 'kill', 3.5), dur = D.dur(ID);
      const kType = clamp((lt - (tK - 0.9)) / 0.9, 0, 1), kHi = clamp((lt - tK) / 0.35, 0, 1);
      const cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: D.punch(lt, [tK]) * lerp(1.02, 1.12, D.ease.io(lt / dur)), fx: 540, fy: 1130 };
      stack(c, [
        { sh: desk(), d: 0.05, lift: 0 },
        { fn: (g, ox) => D.page(g, 540 + ox, 1130, lt, kHi, kType), d: 0.2 },
      ], cam);
      box(c);
    },
  };
})();
