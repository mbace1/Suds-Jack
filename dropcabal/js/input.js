// Drop Cabal — input: mouse aim + WASD/arrows run + LMB fire, Space roll, G/Shift/RMB grenade.
// Touch: DUAL VIRTUAL STICKS (toko-drop style) — left stick x = run, right stick steers
// the crosshair as a RATE (deflection = crosshair velocity, so your finger never covers
// the target) and autofires while held. Quick tap on EITHER stick = roll. DOM ✸ button
// = grenade (wired by main). Stick state is exposed via sticks() for the UI overlay.

export const STICK_R = 52;    // stick base radius in px (clamp + draw + rate normalize)

export class InputManager {
  constructor() {
    this.aim = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
    this.keys = new Set();
    this._firingMouse = false;
    this._firingTouch = false;
    this._rollEdge = false;
    this._nadeEdge = false;
    this._pauseEdge = false;
    this._anyEdge = false;      // "press anything" — title / restart screens

    // touch sticks: -1 = inactive
    this._left  = { id: -1, x0: 0, y0: 0, x: 0, y: 0, t0: 0, drift: 0 };
    this._right = { id: -1, x0: 0, y0: 0, x: 0, y: 0, t0: 0, drift: 0 };
    this.touchSeen = false;

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
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    const opts = { passive: false };
    window.addEventListener('touchstart', (e) => {
      this.touchSeen = true;
      for (const t of e.changedTouches) {
        if (t.target && t.target.closest && t.target.closest('button')) continue;
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

  // deflection of a stick, each axis clamped to [-1, 1]
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
    return Math.max(-1, Math.min(1, x));
  }

  // right-stick deflection driving crosshair velocity (main integrates it)
  aimRate(out) { return this._deflect(this._right, out); }

  get firing() { return this._firingMouse || this._firingTouch; }

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
}
