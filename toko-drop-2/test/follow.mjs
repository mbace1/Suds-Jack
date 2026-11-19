#!/usr/bin/env node
// follow.mjs — the touch sticks FOLLOW the thumb (v156, TUNING.input.follow; js/input.js _touch), in bare node.
// Owner, 19 Nov: the aim felt like "16 sub directions instead of closer to 360 degrees". Nothing rounds the aim; 1.x's
// stick kept its centre where the thumb landed, so a thumb drifted far out turned the aim less and less. With FOLLOW the
// centre is dragged behind the thumb past `followAim` (the aim stick) or the stick's radius (the move stick).
globalThis.innerWidth = 1000; globalThis.innerHeight = 500;
globalThis.addEventListener ??= () => {};
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
const { Input } = await import('../js/input.js?v=156');
const { TUNING: T } = await import('../js/tuning.js?v=156');

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); } };
const deg = (o) => Math.atan2(o.ay, o.ax) * 180 / Math.PI;
// a thumb that lands on the aim half (x 700), slides 100 px right, then nudges up; and a 30 px circle where it ended
function thumb(follow) {
  const inp = new Input({ addEventListener() {} }); inp.enabled = true; inp._live = true; inp.follow = follow;
  let ts = 0; const ev = (x, y) => ({ timeStamp: (ts += 16), changedTouches: [{ identifier: 7, clientX: x, clientY: y }] });
  inp._touch(ev(700, 300), 'start');
  for (let x = 710; x <= 800; x += 10) inp._touch(ev(x, 300), 'move');
  const right = deg(inp.read());
  inp._touch(ev(800, 290), 'move');
  const nudge = deg(inp.read());
  const seen = new Set();
  for (let i = 0; i <= 360; i++) { const r = i * Math.PI / 180; inp._touch(ev(800 + 15 * Math.cos(r), 290 + 15 * Math.sin(r)), 'move'); seen.add(Math.round(deg(inp.read()))); }
  const centre = Math.hypot(inp.right.dx, inp.right.dy);
  return { right, nudge, headings: seen.size, centre, inp };
}
check('FOLLOW is on by default', T.input.follow === true && new Input({ addEventListener() {} }).follow === true);
const off = thumb(false), on = thumb(true);
check('both aim straight right after the slide', Math.abs(off.right) < 1e-9 && Math.abs(on.right) < 1e-9);
check(`a 10 px nudge at 100 px out turns the aim more with FOLLOW (${Math.abs(on.nudge).toFixed(1)}° against ${Math.abs(off.nudge).toFixed(1)}°)`, Math.abs(on.nudge) > 2 * Math.abs(off.nudge));
check(`a 30 px thumb circle covers far more headings with FOLLOW (${on.headings} against ${off.headings})`, on.headings >= 3 * off.headings);
check(`with FOLLOW the thumb is never further than followAim (${T.input.followAim} px) from the centre`, on.centre <= T.input.followAim + 1e-6, on.centre.toFixed(2));
check('without it the centre stays where the thumb landed', off.inp.right.ox === 700 && off.inp.right.oy === 300);
// the move stick: past its radius its centre follows, so full speed is kept and a reversal is immediate
{
  const inp = new Input({ addEventListener() {} }); inp.enabled = true; inp._live = true; inp.follow = true;
  let ts = 0; const ev = (x, y) => ({ timeStamp: (ts += 16), changedTouches: [{ identifier: 3, clientX: x, clientY: y }] });
  inp._touch(ev(200, 300), 'start');
  for (let x = 210; x <= 400; x += 10) inp._touch(ev(x, 300), 'move');
  const full = inp.read();
  inp._touch(ev(400 - inp.stickRadius * 2, 300), 'move');
  const back = inp.read();
  check('the move stick: full speed right after a long slide', Math.abs(full.mx - 1) < 1e-9);
  check('…and one stick-width back is full speed left at once', Math.abs(back.mx + 1) < 1e-9, back.mx.toFixed(3));
}
// a tap is still a tap (the flick and tap reads follow the thumb's own path, not the centre)
{
  const inp = new Input({ addEventListener() {} }); inp.enabled = true; inp._live = true; inp.follow = true; inp.dashBy = 'flick';
  let ts = 0; const ev = (x, y) => ({ timeStamp: (ts += 16), changedTouches: [{ identifier: 9, clientX: x, clientY: y }] });
  inp._touch(ev(700, 300), 'start'); inp._touch(ev(701, 300), 'end');
  check('a tap on the aim stick still reads as a tap', inp.lastGesture?.kind === 'tap', inp.lastGesture?.kind);
}
console.log(failed ? `\n✗ follow: ${failed} failed, ${passed} passed` : `✔ follow: ${passed} checks`);
process.exit(failed ? 1 : 0);
