// One controller, read the THPS way. The Gamepad API has no press events, so
// this is a tiny edge detector over the standard mapping: 0 cross / 1 circle /
// 2 square / 3 triangle, 4-5 L1 R1, 6-7 L2 R2, 8 Create, 9 Options, 12-15 d-pad.
// A DualSense reports itself by name, which is what picks the glyph set.
export function firstPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

export function padKind(p) {
  if (!p) return null;
  const id = (p.id || '').toLowerCase();
  if (/dualsense|dualshock|054c|sony|playstation|wireless controller/.test(id)) return 'ps';
  if (/xbox|045e|xinput/.test(id)) return 'xbox';
  return 'generic';
}

export function isDown(btn) {
  return !!(btn && (btn.pressed || btn.value > 0.5));
}

// tick(now) -> { pad, kind, pressed:Set, down:Set, dx, dy, step }
// `step` fires once on a new direction and then repeats while it is held, so
// a menu can be walked by holding the stick. `drain()` swallows whatever is
// held right now, which is how a cross press that confirmed DROP IN does not
// also ollie on the first frame of the run.
export function createPadEdge() {
  let prev = [], dirHeld = null, dirNext = 0;
  function read(now, emit) {
    const p = firstPad();
    const out = { pad: p, kind: padKind(p), pressed: new Set(), down: new Set(), dx: 0, dy: 0, step: false };
    if (!p) { prev = []; dirHeld = null; return out; }
    const btns = p.buttons || [];
    for (let i = 0; i < btns.length; i++) {
      const d = isDown(btns[i]);
      if (d) out.down.add(i);
      if (emit && d && !prev[i]) out.pressed.add(i);
      prev[i] = d;
    }
    const ax = p.axes || [];
    let dx = 0, dy = 0;
    if (btns[14]?.pressed) dx = -1; else if (btns[15]?.pressed) dx = 1;
    if (btns[12]?.pressed) dy = -1; else if (btns[13]?.pressed) dy = 1;
    if (!dx && Math.abs(ax[0] || 0) > 0.5) dx = Math.sign(ax[0]);
    if (!dy && Math.abs(ax[1] || 0) > 0.5) dy = Math.sign(ax[1]);
    out.dx = dx; out.dy = dy;
    const key = dx || dy ? `${dx},${dy}` : null;
    if (!key) dirHeld = null;
    else if (dirHeld !== key) { dirHeld = key; dirNext = now + 420; out.step = emit; }
    else if (now >= dirNext) { dirNext = now + 130; out.step = emit; }
    return out;
  }
  return {
    tick: (now = performance.now()) => read(now, true),
    drain: (now = performance.now()) => read(now, false),
  };
}
