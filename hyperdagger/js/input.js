const STICK_R = 60;
const LOOK_DEADZONE = 0.12;
const TAP_MS = 250;      // max duration for a tap
const TAP_PX = 12;       // max travel for a tap
const FLICK_MS = 260;    // max duration for a flick
const FLICK_PX = 36;     // min travel for a flick

/**
 * Unified input. Desktop: pointer-lock mouse look, WASD, hold LMB for the
 * dagger stream, Space = jump / double jump, Shift = dash. Touch: left
 * on-screen stick moves (quick tap = jump / double jump), right stick looks
 * and auto-fires while held; a fast flick on either stick dashes in the
 * flick direction. No on-screen buttons.
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseDown = false;
    this.touchMode = false;
    this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0 };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0 };
    this._touchMap = new Map(); // touch id → 'left' | 'right'
    this._lookX = 0;
    this._lookY = 0;
    this._jump = false;
    this._dash = false;
    this._dashFlick = null; // {x, y} normalized screen-space flick direction
    this._init();
  }

  _init() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) this._jump = true;
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) this._dash = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.addEventListener('mousedown', e => { if (e.button === 0) this.mouseDown = true; });
    document.addEventListener('mouseup', e => { if (e.button === 0) this.mouseDown = false; });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        // Some browsers report one giant bogus delta right after locking.
        if (Math.hypot(e.movementX, e.movementY) > 400) return;
        this._lookX += e.movementX;
        this._lookY += e.movementY;
      }
    });

    const opt = { passive: false };
    window.addEventListener('touchstart', e => {
      if (this._uiTouch(e)) return; // let DOM buttons (pause/options) work
      e.preventDefault();
      this._touchStart(e);
    }, opt);
    window.addEventListener('touchmove', e => { e.preventDefault(); this._touchMove(e); }, opt);
    window.addEventListener('touchend', e => { e.preventDefault(); this._touchEnd(e); }, opt);
    window.addEventListener('touchcancel', e => { e.preventDefault(); this._touchEnd(e); }, opt);
  }

  /** True when the touch began on an interactive DOM control. */
  _uiTouch(e) {
    const t = e.target;
    return !!(t && t.closest && t.closest('button, #pauseBtn'));
  }

  _touchStart(e) {
    this.touchMode = true;
    for (const t of e.changedTouches) {
      const side = t.clientX < window.innerWidth / 2 ? 'left' : 'right';
      const stick = this[side];
      if (!stick.active) {
        this._touchMap.set(t.identifier, side);
        stick.active = true;
        stick.ox = t.clientX; stick.oy = t.clientY;
        stick.dx = 0; stick.dy = 0;
        stick.t0 = performance.now();
      }
    }
  }

  _touchMove(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      if (!side) continue;
      const stick = this[side];
      stick.dx = t.clientX - stick.ox;
      stick.dy = t.clientY - stick.oy;
    }
  }

  _touchEnd(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      this._touchMap.delete(t.identifier);
      if (!side) continue;
      const stick = this[side];
      const dur = performance.now() - stick.t0;
      const dist = Math.hypot(stick.dx, stick.dy);
      if (side === 'left' && dur < TAP_MS && dist < TAP_PX) {
        this._jump = true; // tap the move stick = jump / double jump
      } else if (dur < FLICK_MS && dist >= FLICK_PX) {
        this._dashFlick = { x: stick.dx / dist, y: stick.dy / dist };
      }
      stick.active = false;
      stick.dx = 0; stick.dy = 0;
    }
  }

  /** Accumulated pointer-lock mouse pixels since last call. */
  consumeLook() {
    const r = { dx: this._lookX, dy: this._lookY };
    this._lookX = 0; this._lookY = 0;
    return r;
  }

  /** Right-stick deflection, each axis in [-1, 1], deadzoned. */
  getLookRate() {
    if (!this.right.active) return { x: 0, y: 0 };
    let x = Math.max(-1, Math.min(1, this.right.dx / STICK_R));
    let y = Math.max(-1, Math.min(1, this.right.dy / STICK_R));
    if (Math.hypot(x, y) < LOOK_DEADZONE) return { x: 0, y: 0 };
    return { x, y };
  }

  /** {x: strafe right, y: forward}, length ≤ 1. */
  getMove() {
    if (this.left.active) {
      let x = this.left.dx / STICK_R;
      let y = -this.left.dy / STICK_R;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y };
    }
    let x = 0, y = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y -= 1;
    const len = Math.hypot(x, y);
    return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  get firing() {
    return this.touchMode ? this.right.active : this.mouseDown;
  }

  consumeJump() {
    const j = this._jump;
    this._jump = false;
    return j;
  }

  consumeDash() {
    const d = this._dash;
    this._dash = false;
    return d;
  }

  consumeDashFlick() {
    const f = this._dashFlick;
    this._dashFlick = null;
    return f;
  }

  /** Draw the two sticks on the HUD canvas (touch mode only). */
  drawTouchUI(ctx) {
    if (!this.touchMode) return;
    const w = window.innerWidth, h = window.innerHeight;
    const rest = { left: [w * 0.16, h - 140], right: [w * 0.84, h - 140] };
    for (const side of ['left', 'right']) {
      const s = this[side];
      const [bx, by] = s.active ? [s.ox, s.oy] : rest[side];
      ctx.strokeStyle = side === 'right' ? 'rgba(200,30,30,0.55)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, STICK_R, 0, Math.PI * 2);
      ctx.stroke();
      let kx = bx, ky = by;
      if (s.active) {
        const len = Math.hypot(s.dx, s.dy);
        const k = len > STICK_R ? STICK_R / len : 1;
        kx += s.dx * k; ky += s.dy * k;
      }
      ctx.fillStyle = side === 'right' ? 'rgba(200,30,30,0.3)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(kx, ky, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
