// Drop Cabal — input: mouse aim + WASD/arrows run + LMB fire, Space roll, G/Shift/RMB grenade.
// Touch: right-half finger = crosshair + autofire, left-half horizontal drag = run,
// quick left-half tap = roll, DOM ✸ button = grenade (wired by main).

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

    // touch state
    this._moveId = -1;
    this._moveStartX = 0;
    this._moveStartT = 0;
    this._moveDrift = 0;
    this._stickX = 0;
    this._aimId = -1;
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
        if (t.clientX < window.innerWidth * 0.42) {
          if (this._moveId === -1) {
            this._moveId = t.identifier;
            this._moveStartX = t.clientX;
            this._moveStartT = performance.now();
            this._moveDrift = 0;
            this._stickX = 0;
          }
        } else if (this._aimId === -1) {
          this._aimId = t.identifier;
          this.aim.x = t.clientX;
          this.aim.y = t.clientY;
          this._firingTouch = true;
        }
      }
    }, opts);

    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._moveId) {
          e.preventDefault();
          const dx = t.clientX - this._moveStartX;
          this._moveDrift = Math.max(this._moveDrift, Math.abs(dx));
          this._stickX = Math.max(-1, Math.min(1, dx / 48));
        } else if (t.identifier === this._aimId) {
          e.preventDefault();
          this.aim.x = t.clientX;
          this.aim.y = t.clientY;
        }
      }
    }, opts);

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._moveId) {
          const quick = performance.now() - this._moveStartT < 250 && this._moveDrift < 12;
          if (quick) this._rollEdge = true;
          this._moveId = -1;
          this._stickX = 0;
        } else if (t.identifier === this._aimId) {
          this._aimId = -1;
          this._firingTouch = false;
        }
      }
    };
    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);
  }

  get moveX() {
    let x = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    x += this._stickX;
    return Math.max(-1, Math.min(1, x));
  }

  get firing() { return this._firingMouse || this._firingTouch; }

  aimNDC(out) {
    out.x = (this.aim.x / window.innerWidth) * 2 - 1;
    out.y = -(this.aim.y / window.innerHeight) * 2 + 1;
    return out;
  }

  pressGrenade() { this._nadeEdge = true; }

  consumeRoll()  { const v = this._rollEdge;  this._rollEdge = false;  return v; }
  consumeNade()  { const v = this._nadeEdge;  this._nadeEdge = false;  return v; }
  consumePause() { const v = this._pauseEdge; this._pauseEdge = false; return v; }
  consumeAny()   { const v = this._anyEdge;   this._anyEdge = false;   return v; }
}
