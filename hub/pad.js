// A gamepad, read the same way everywhere on the site.
//
// The Gamepad API has no events for button presses — you poll it — so this is
// one rAF loop that edge-detects the buttons and deadzones the sticks, and
// hands the result to whoever asked. Both the arcade (to move between
// cabinets) and every game page (to get back here) use it, so a controller
// behaves identically across the whole site rather than per-game.
//
// Standard mapping button indices:
//   0 A/cross   1 B/circle   2 X/square   3 Y/triangle
//   8 Back/View 9 Start/Menu 12-15 d-pad up/down/left/right

const DEAD = 0.45;          // sticks are noisy; only a deliberate push counts
const REPEAT_FIRST = 420;   // ms before a held direction starts repeating
const REPEAT_NEXT = 130;

export function padPresent() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return [...pads].some(p => p && p.connected);
}

// handlers: { dir(dx, dy), press(index), release(index), hold(index, ms) }
// `hold` fires once when a button has been held for `holdMs`; `press` fires on
// the way down and `release` on the way back up, because anything standing in
// for a key has to let go of it — a held button is a held key.
export function watchPad({ dir, press, release, hold, holdMs = 700, holdButtons = [] } = {}) {
  let raf = 0, dead = false;
  const wasDown = new Map();
  const heldSince = new Map();
  const fired = new Set();
  let dirHeld = null, dirAt = 0, dirNext = 0;

  function pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  function tick(now) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const p = pad();
    if (!p) { wasDown.clear(); heldSince.clear(); fired.clear(); dirHeld = null; return; }

    // buttons
    const btns = p.buttons || [];
    for (let i = 0; i < btns.length; i++) {
      const down = !!(btns[i] && (btns[i].pressed || btns[i].value > 0.5));
      const before = wasDown.get(i) || false;
      if (down && !before) {
        heldSince.set(i, now);
        if (!holdButtons.includes(i)) press?.(i);
      }
      if (!down && before) {
        // a hold button that was released early counts as a plain press
        if (holdButtons.includes(i) && !fired.has(i)) press?.(i);
        release?.(i);
        heldSince.delete(i);
        fired.delete(i);
      }
      if (down && holdButtons.includes(i) && !fired.has(i)) {
        const held = now - (heldSince.get(i) ?? now);
        hold?.(i, held);
        if (held >= holdMs) { fired.add(i); }
      }
      wasDown.set(i, down);
    }

    // direction: d-pad or the left stick, whichever is being asked for
    const ax = p.axes || [];
    let dx = 0, dy = 0;
    if (btns[14]?.pressed) dx = -1; else if (btns[15]?.pressed) dx = 1;
    if (btns[12]?.pressed) dy = -1; else if (btns[13]?.pressed) dy = 1;
    if (!dx && Math.abs(ax[0] ?? 0) > DEAD) dx = Math.sign(ax[0]);
    if (!dy && Math.abs(ax[1] ?? 0) > DEAD) dy = Math.sign(ax[1]);

    const key = `${dx},${dy}`;
    // Releasing has to be reported too. A menu only cares about the moment a
    // direction is pushed, but anything holding a key down on the game's
    // behalf needs to hear the stick come back to centre — without this a
    // bridged run key stays down for the rest of the run.
    if (!dx && !dy) {
      if (dirHeld) { dirHeld = null; dir?.(0, 0); }
    }
    else if (dirHeld !== key) {
      dirHeld = key; dirAt = now; dirNext = now + REPEAT_FIRST;
      dir?.(dx, dy);
    } else if (now >= dirNext) {
      dirNext = now + REPEAT_NEXT;
      dir?.(dx, dy);
    }
  }
  raf = requestAnimationFrame(tick);

  return { stop() { dead = true; cancelAnimationFrame(raf); } };
}
