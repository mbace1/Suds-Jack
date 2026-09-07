// Drop Cabal — input: mouse aim + WASD/arrows run + LMB fire, Space roll, G/Shift/RMB grenade.
// Touch: DUAL VIRTUAL STICKS (toko-drop style) — left stick x = run, right stick steers
// the crosshair as a RATE (deflection = crosshair velocity, so your finger never covers
// the target) and autofires while held. Quick tap on EITHER stick = roll. DOM ✸ button
// = grenade (wired by main). Stick state is exposed via sticks() for the UI overlay.
//
// GAMEPAD is a third path, read natively here rather than through `hub/padkeys.js`:
// that bridge turns a pad into key events, which can carry running and the keyed
// actions but never aim — a crosshair needs an axis, not a keystroke, so this game
// is `pad: 'native'` in the catalogue and reads the sticks itself. Everything feeds
// the SAME getters the mouse and touch use (`moveX`, `firing`, `aimRate`), so nothing
// downstream knows which one is in your hands.
//
// Standard mapping: 0 A · 1 B · 2 X · 3 Y · 4 LB/L1 · 5 RB/R1 · 6 LT/L2 · 7 RT/R2
//                   8 Back · 9 Start · 12-15 d-pad U/D/L/R · axes 0,1 left · 2,3 right

export const STICK_R = 52;    // touch stick base radius in px (clamp + draw + rate normalize)

const PAD_DEAD = 0.18;        // sticks rest noisy; ignore anything under a deliberate push
const PAD_HOME_MS = 750;      // hub/shell.js owns Start HELD this long — don't also pause on it

// Fire sits on three buttons on purpose. R2 is the one that reads as a trigger, but
// some browsers and controller firmwares spend it on their own UI before the page
// ever sees it — the Gamepad API is polled, with no event to cancel, so a page
// cannot take it back. R1 and A are there so there is always a shot that works.
const PAD_FIRE  = [7, 5, 0];
const PAD_ROLL  = [1, 4];     // B / L1
const PAD_NADE  = [2, 6];     // X / L2
const PAD_START = 9;

export class InputManager {
  constructor() {
    this.aim = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
    this.keys = new Set();
    this._firingMouse = false;
    this._firingTouch = false;
    this._firingPad = false;
    this._rollEdge = false;
    this._nadeEdge = false;
    this._pauseEdge = false;
    this._anyEdge = false;      // "press anything" — title / restart screens

    // touch sticks: -1 = inactive
    this._left  = { id: -1, x0: 0, y0: 0, x: 0, y: 0, t0: 0, drift: 0 };
    this._right = { id: -1, x0: 0, y0: 0, x: 0, y: 0, t0: 0, drift: 0 };
    this.touchSeen = false;

    // gamepad
    this.padSeen = false;
    this._padMove = 0;
    this._padAim = { x: 0, y: 0 };
    this._padDown = new Map();
    this._padStartAt = 0;
    this._padDirLatch = false;  // stick must return to centre before it steps a menu again

    // menu edges (pause screen), fed by keyboard and pad alike
    this._menu = { dx: 0, dy: 0, ok: false, back: false };

    this._bind();
  }

  _bind() {
    window.addEventListener('mousemove', (e) => {
      this.aim.x = e.clientX;
      this.aim.y = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      this._anyEdge = true;
      if (e.button === 0) this._firingMouse = true;
      if (e.button === 2) this._nadeEdge = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this._firingMouse = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this._anyEdge = true;
      if (e.code === 'Space') { this._rollEdge = true; e.preventDefault(); }
      if (e.code === 'KeyG' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this._nadeEdge = true;
      if (e.code === 'Escape' || e.code === 'KeyP') this._pauseEdge = true;
      // menu steps: the same keys that move you also move a highlight
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') this._menu.dx -= 1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this._menu.dx += 1;
      if (e.code === 'ArrowUp'    || e.code === 'KeyW') this._menu.dy -= 1;
      if (e.code === 'ArrowDown'  || e.code === 'KeyS') this._menu.dy += 1;
      if (e.code === 'Enter' || e.code === 'Space') this._menu.ok = true;
      if (e.code === 'Escape') this._menu.back = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    const opts = { passive: false };
    window.addEventListener('touchstart', (e) => {
      this.touchSeen = true;
      for (const t of e.changedTouches) {
        if (t.target && t.target.closest && t.target.closest('button, .arcade-home')) continue;
        e.preventDefault();
        this._anyEdge = true;
        const side = t.clientX < window.innerWidth * 0.5 ? this._left : this._right;
        if (side.id !== -1) continue;
        side.id = t.identifier;
        side.x0 = side.x = t.clientX;
        side.y0 = side.y = t.clientY;
        side.t0 = performance.now();
        side.drift = 0;
        if (side === this._right) this._firingTouch = true;
      }
    }, opts);

    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        const side = t.identifier === this._left.id ? this._left
                   : t.identifier === this._right.id ? this._right : null;
        if (!side) continue;
        e.preventDefault();
        side.x = t.clientX;
        side.y = t.clientY;
        side.drift = Math.max(side.drift, Math.hypot(t.clientX - side.x0, t.clientY - side.y0));
      }
    }, opts);

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        const side = t.identifier === this._left.id ? this._left
                   : t.identifier === this._right.id ? this._right : null;
        if (!side) continue;
        // quick tap on either stick = roll
        if (performance.now() - side.t0 < 250 && side.drift < 12) this._rollEdge = true;
        side.id = -1;
        if (side === this._right) this._firingTouch = false;
      }
    };
    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);
  }

  // ---------------------------------------------------------------- gamepad
  // Called once per frame from the game loop (the Gamepad API has no events).
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null;
    for (const q of pads) if (q && q.connected) { p = q; break; }
    if (!p) {
      if (this._firingPad || this._padMove || this._padAim.x || this._padAim.y) {
        this._firingPad = false;
        this._padMove = 0;
        this._padAim.x = this._padAim.y = 0;
      }
      this._padDown.clear();
      return;
    }
    this.padSeen = true;
    const now = performance.now();
    const ax = p.axes || [];
    const btns = p.buttons || [];
    const down = (i) => !!(btns[i] && (btns[i].pressed || btns[i].value > 0.5));

    // left stick / d-pad → run
    let mx = dz(ax[0] ?? 0);
    if (down(14)) mx = -1; else if (down(15)) mx = 1;
    this._padMove = mx;

    // right stick → crosshair velocity. Squaring the magnitude keeps small
    // pushes genuinely small, which is the difference between picking off a far
    // row and sweeping past it.
    const rx = dz(ax[2] ?? 0), ry = dz(ax[3] ?? 0);
    this._padAim.x = rx * Math.abs(rx);
    this._padAim.y = ry * Math.abs(ry);

    this._firingPad = PAD_FIRE.some(down);

    // edge-detected actions
    for (let i = 0; i < btns.length; i++) {
      const isDown = down(i);
      const was = this._padDown.get(i) || false;
      if (isDown && !was) {
        this._anyEdge = true;
        if (PAD_ROLL.includes(i)) this._rollEdge = true;
        if (PAD_NADE.includes(i)) this._nadeEdge = true;
        if (i === 0) this._menu.ok = true;
        if (i === 1) this._menu.back = true;
        if (i === PAD_START) this._padStartAt = now;
      }
      // Start pauses on RELEASE, and only if it was a tap: held, it belongs to
      // the shell's hold-to-leave, and pausing on the way there would leave the
      // game frozen behind the arcade.
      if (!isDown && was && i === PAD_START && now - this._padStartAt < PAD_HOME_MS) {
        this._pauseEdge = true;
      }
      this._padDown.set(i, isDown);
    }

    // menu steps from the d-pad or left stick, one per push
    let dx = 0, dy = 0;
    if (down(14)) dx = -1; else if (down(15)) dx = 1;
    if (down(12)) dy = -1; else if (down(13)) dy = 1;
    if (!dx && Math.abs(ax[0] ?? 0) > 0.6) dx = Math.sign(ax[0]);
    if (!dy && Math.abs(ax[1] ?? 0) > 0.6) dy = Math.sign(ax[1]);
    if (!dx && !dy) this._padDirLatch = false;
    else if (!this._padDirLatch) {
      this._padDirLatch = true;
      this._menu.dx += dx;
      this._menu.dy += dy;
    }
  }

  // deflection of a touch stick, each axis clamped to [-1, 1]
  _deflect(side, out) {
    if (side.id === -1) { out.x = 0; out.y = 0; return out; }
    out.x = Math.max(-1, Math.min(1, (side.x - side.x0) / STICK_R));
    out.y = Math.max(-1, Math.min(1, (side.y - side.y0) / STICK_R));
    return out;
  }

  get moveX() {
    let x = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this._left.id !== -1)
      x += Math.max(-1, Math.min(1, (this._left.x - this._left.x0) / (STICK_R * 0.9)));
    x += this._padMove;
    return Math.max(-1, Math.min(1, x));
  }

  // deflection driving crosshair velocity (main integrates it): pad first, then touch
  aimRate(out) {
    if (this._padAim.x || this._padAim.y) {
      out.x = this._padAim.x;
      out.y = this._padAim.y;
      return out;
    }
    return this._deflect(this._right, out);
  }

  get firing() { return this._firingMouse || this._firingTouch || this._firingPad; }

  aimNDC(out) {
    out.x = (this.aim.x / window.innerWidth) * 2 - 1;
    out.y = -(this.aim.y / window.innerHeight) * 2 + 1;
    return out;
  }

  // stick state for the UI overlay renderer
  sticks() { return { left: this._left, right: this._right }; }

  pressGrenade() { this._nadeEdge = true; }

  consumeRoll()  { const v = this._rollEdge;  this._rollEdge = false;  return v; }
  consumeNade()  { const v = this._nadeEdge;  this._nadeEdge = false;  return v; }
  consumePause() { const v = this._pauseEdge; this._pauseEdge = false; return v; }
  consumeAny()   { const v = this._anyEdge;   this._anyEdge = false;   return v; }

  consumeMenu() {
    const m = this._menu;
    const out = { dx: Math.sign(m.dx), dy: Math.sign(m.dy), ok: m.ok, back: m.back };
    m.dx = m.dy = 0;
    m.ok = m.back = false;
    return out;
  }

  // dropped so a queued action can't fire the instant play resumes
  clearEdges() {
    this._rollEdge = this._nadeEdge = this._pauseEdge = this._anyEdge = false;
    this.consumeMenu();
  }
}

function dz(v) {
  const a = Math.abs(v);
  return a < PAD_DEAD ? 0 : Math.sign(v) * ((a - PAD_DEAD) / (1 - PAD_DEAD));
}
