// Shot 5 · The answer. The emergency box on the briefing room's wall: the real kill switch, behind glass. Its plate:
// IN CASE OF DISASTER — and on "the day after", stamped in red under it, OPEN THE DAY AFTER. On "Until then", Kill
// Switch's own sticky note slaps onto the glass in front of it, and stays.
SCENES['dy_end'] = (() => {
  const { stack, box, put } = RFP, D = DY, ID = 'dy_end', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tA = D.at(ID, 'after', 1.6), tN = D.at(ID, 'note', 3.2), dur = D.dur(ID);
      const kp = clamp((lt - tA) / 0.3, 0, 1), kn = clamp((lt - tN) / 0.22, 0, 1);
      const cam = { x: Math.sin(lt * 0.35) * 5, y: 0, z: D.punch(lt, [tA, tN], { kick: 0.04 }) * lerp(1.0, 1.07, D.ease.io(lt / dur)), fx: 540, fy: 1150 };
      stack(c, [
        { sh: CT.wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => D.second(g, lt, ox), d: 0.05 },
        { fn: (g, ox) => [230, 850].forEach((x, i) => CT.lamp(g, x + ox, 560, 1, lt, i)), d: 0.12 },
        { fn: (g, ox) => {
          put(g, D.ebox(), 540 + ox, 1180, { lift: 1.5 }); D.glassFront(g, 540 + ox, 1180); D.plate(g, 540 + ox, 700 + 30, kp);
          if (kn > 0) D.note(g, 420 + ox, 1300, lerp(1.4, 0.82, D.ease.out(kn)), lerp(-0.4, -0.1, D.ease.out(kn)) + (lt > tN + 0.22 ? Math.sin((lt - tN) * 14) * 0.03 * Math.exp(-(lt - tN) * 4) : 0));
        }, d: 0.22 },
      ], cam);
      box(c);
    },
  };
})();
