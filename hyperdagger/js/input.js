const STICK_R = 60;
const LOOK_DEADZONE = 0.12;

/**
 * Unified input. Desktop: pointer-lock mouse look, WASD, LMB press = shotgun
 * burst / hold = dagger stream, Space jump, Shift dash. Touch: left on-screen
 * stick moves, right stick looks and auto-fires while held (a quick tap on the
 * right half fires the shotgun), centre DASH + JUMP buttons.
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseDown = false;
    this.touchMode = false;
    this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0 };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0 };
    this._touchMap = new Map(); // touch id → 'left' | 'right' | 'jump' | 'dash'
    this._lookX = 0;
    this._lookY = 0;
    this._jump = false;
    this._dash = false;
    this._shotgun = false;
    this._init();
  }

  _init() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) this._jump = true;
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) this._dash = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this.mouseDown = true;
      this._shotgun = true;
    });
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
    window.addEventListener('touchstart', e => { e.preventDefault(); this._touchStart(e); }, opt);
    window.addEventListener('touchmove', e => { e.preventDefault(); this._touchMove(e); }, opt);
    window.addEventListener('touchend', e => { e.preventDefault(); this._touchEnd(e); }, opt);
    window.addEventListener('touchcancel', e => { e.preventDefault(); this._touchEnd(e); }, opt);
  }

  jumpButton() {
    return { x: window.innerWidth / 2 + 56, y: window.innerHeight - 74, r: 38, label: 'JUMP' };
  }

  dashButton() {
    return { x: window.innerWidth / 2 - 56, y: window.innerHeight - 74, r: 38, label: 'DASH' };
  }

  _touchStart(e) {
    this.touchMode = true;
    const jb = this.jumpButton();
    const db = this.dashButton();
    for (const t of e.changedTouches) {
      if (Math.hypot(t.clientX - jb.x, t.clientY - jb.y) < jb.r + 12) {
        this._touchMap.set(t.identifier, 'jump');
        this._jump = true;
        continue;
      }
      if (Math.hypot(t.clientX - db.x, t.clientY - db.y) < db.r + 12) {
        this._touchMap.set(t.identifier, 'dash');
        this._dash = true;
        continue;
      }
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
      if (side !== 'left' && side !== 'right') continue;
      const stick = this[side];
      stick.dx = t.clientX - stick.ox;
      stick.dy = t.clientY - stick.oy;
    }
  }

  _touchEnd(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      this._touchMap.delete(t.identifier);
      if (side !== 'left' && side !== 'right') continue;
      const stick = this[side];
      // quick tap on the look side = shotgun burst
      if (side === 'right'
          && performance.now() - stick.t0 < 250
          && Math.hypot(stick.dx, stick.dy) < 12) {
        this._shotgun = true;
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

  consumeShotgun() {
    const s = this._shotgun;
    this._shotgun = false;
    return s;
  }

  /** Draw sticks + dash/jump buttons on the HUD canvas (touch mode only). */
  drawTouchUI(ctx) {
    if (!this.touchMode) return;
    const w = window.innerWidth, h = window.innerHeight;
    const rest = { left: [w * 0.16, h - 140], right: [w * 0.84, h - 140] };
    for (const side of ['left', 'right']) {
      const s = this[side];
      const [bx, by] = s.active ? [s.ox, s.oy] : rest[side];
      ctx.strokeStyle = side === 'right' ? 'rgba(255,47,214,0.5)' : 'rgba(255,210,74,0.5)';
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
      ctx.fillStyle = side === 'right' ? 'rgba(255,47,214,0.35)' : 'rgba(255,210,74,0.35)';
      ctx.beginPath();
      ctx.arc(kx, ky, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of [this.dashButton(), this.jumpButton()]) {
      ctx.strokeStyle = 'rgba(120,255,220,0.55)';
      ctx.fillStyle = 'rgba(120,255,220,0.12)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,255,220,0.8)';
      ctx.fillText(b.label, b.x, b.y);
    }
  }
}
