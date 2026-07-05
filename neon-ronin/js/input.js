// ── Keyboard + pointer-lock mouse input ───────────────────────────────────────
// Buffered one-shot actions (attack/dash/swap) so a click landing mid-swing
// still chains the combo. Mouse deltas accumulate until consumed each frame.

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.locked = false;
    this._dx = 0;
    this._dy = 0;
    this.attackQueued = false;
    this.dashQueued = false;
    this.swapQueued = -1;      // -1 none, 0..2 form index, 3 = cycle

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.dashQueued = true;
      if (e.code === 'Digit1') this.swapQueued = 0;
      if (e.code === 'Digit2') this.swapQueued = 1;
      if (e.code === 'Digit3') this.swapQueued = 2;
      if (e.code === 'KeyQ') this.swapQueued = 3;
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) this.attackQueued = true;
    });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this._dx += e.movementX;
      this._dy += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });
  }

  requestLock() {
    if (!this.locked) this.canvas.requestPointerLock?.();
  }

  isDown(code) { return this.keys.has(code); }

  moveAxes() {
    const x = (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0) -
              (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
    const y = (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0) -
              (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
    return { x, y };
  }

  consumeMouse() {
    const d = { dx: this._dx, dy: this._dy };
    this._dx = 0;
    this._dy = 0;
    return d;
  }

  consumeAttack() { const q = this.attackQueued; this.attackQueued = false; return q; }
  consumeDash()   { const q = this.dashQueued;   this.dashQueued = false;   return q; }
  consumeSwap()   { const q = this.swapQueued;   this.swapQueued = -1;      return q; }
}
