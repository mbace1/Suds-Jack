// ── Keyboard + pointer-lock mouse + touch dual-stick input ────────────────────
// Desktop: buffered one-shot actions (attack/dash/swap) so a click landing
// mid-swing still chains the combo; mouse deltas accumulate until consumed.
// Touch: floating dual sticks — LEFT stick moves (tap or lift = dash), RIGHT
// stick orbits the camera (tap or lift = jump, again mid-air = double jump).
// While touch is driving, combat is automatic (see player.js) and the
// melee/ranged mode button above the right stick picks the fighting style.

const STICK_R = 56;      // px deflection that maps to full stick throw
const DEAD = 0.18;

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.locked = false;
    this._dx = 0;
    this._dy = 0;
    this.attackQueued = false;
    this.dashQueued = false;
    this.jumpQueued = false;
    this.swapQueued = -1;      // -1 none, 0..2 form index, 3 = cycle
    this.mode = 'melee';       // 'melee' | 'ranged' (touch auto-combat style)
    this.touch = false;        // flips true on first touch and stays on
    this._sticks = { L: null, R: null };
    this._stickEls = null;

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

    this._initTouch();
  }

  // touch play runs itself: melee swings / ranged fire happen automatically
  get autoCombat() { return this.touch; }

  _els() {
    if (!this._stickEls) {
      this._stickEls = {};
      for (const side of ['L', 'R']) {
        const base = document.getElementById(`stick${side}`);
        this._stickEls[side] = { base, nub: base.querySelector('.nub') };
      }
    }
    return this._stickEls;
  }

  _flagTouch() {
    if (this.touch) return;
    this.touch = true;
    document.body.classList.add('touch');
    this.onTouchDetected?.();
  }

  _initTouch() {
    // any touch anywhere (incl. the start overlay) switches to touch mode
    // BEFORE requestLock can run, so pointer lock never hijacks taps
    addEventListener('touchstart', () => this._flagTouch(), { passive: true });

    const opt = { passive: false };
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._flagTouch();
      for (const t of e.changedTouches) {
        const side = t.clientX < innerWidth / 2 ? 'L' : 'R';
        if (this._sticks[side]) continue;
        this._sticks[side] = { id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 };
        const el = this._els()[side];
        el.base.style.display = 'block';
        el.base.style.left = `${t.clientX}px`;
        el.base.style.top = `${t.clientY}px`;
        el.nub.style.transform = 'translate(-50%, -50%)';
      }
    }, opt);

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        for (const side of ['L', 'R']) {
          const s = this._sticks[side];
          if (!s || s.id !== t.identifier) continue;
          s.dx = t.clientX - s.x0;
          s.dy = t.clientY - s.y0;
          const len = Math.hypot(s.dx, s.dy);
          if (len > STICK_R) { s.dx *= STICK_R / len; s.dy *= STICK_R / len; }
          const el = this._els()[side];
          el.nub.style.transform = `translate(calc(-50% + ${s.dx}px), calc(-50% + ${s.dy}px))`;
        }
      }
    }, opt);

    const end = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        for (const side of ['L', 'R']) {
          const s = this._sticks[side];
          if (!s || s.id !== t.identifier) continue;
          // tap OR lift fires the stick's action
          if (side === 'L') this.dashQueued = true;
          else this.jumpQueued = true;
          this._sticks[side] = null;
          this._els()[side].base.style.display = 'none';
        }
      }
    };
    this.canvas.addEventListener('touchend', end, opt);
    this.canvas.addEventListener('touchcancel', end, opt);
  }

  requestLock() {
    if (this.touch || this.locked) return;
    this.canvas.requestPointerLock?.();
  }

  isDown(code) { return this.keys.has(code); }

  stick(side) {
    const s = this._sticks[side];
    if (!s) return { x: 0, y: 0, active: false };
    const x = s.dx / STICK_R, y = s.dy / STICK_R;
    if (Math.hypot(x, y) < DEAD) return { x: 0, y: 0, active: true };
    return { x, y, active: true };
  }

  moveAxes() {
    const L = this.stick('L');
    if (L.active) return { x: L.x, y: -L.y };   // screen-up = forward
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
  consumeJump()   { const q = this.jumpQueued;   this.jumpQueued = false;   return q; }
  consumeSwap()   { const q = this.swapQueued;   this.swapQueued = -1;      return q; }
}
