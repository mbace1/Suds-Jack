// Input — free-look aiming in every direction, with a gesture layer on the sticks:
//   tap a stick        → JUMP (grounded) / AIR-DASH (airborne)
//   swipe a stick      → DASH in that direction (ground or air)
//   hold left stick    → move (push far to sprint)
//   hold right stick   → free-look aim + fire   (horizontal axis is REVERSED)
// Desktop: WASD move · mouse aim (any direction) · hold LMB fire · Space jump/air-dash
//          Q dash · Shift sprint · T toggle auto-aim · Enter start · Esc pause
const STICK_R = 60, LOOK_DEAD = 10, TURN_RATE = 2.8, PITCH_RATE = 0.7;   // vertical look far less sensitive
const ARROW_SENS = 2.2, MOUSE_SENS = 0.0023, MOUSE_PITCH = 0.5, PITCH_MAX = 1.45;
const TAP_MS = 220, TAP_DIST = 18, SWIPE_MIN = 42, SWIPE_MS = 280, SWIPE_VEL = 1100;   // px/s flick → dash

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.locked = false;
    this.yaw = 0; this.pitch = -0.15;
    this._mouseDown = false;
    this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0, dashing: false, lx: 0, ly: 0, lt: 0 };   // move
    this.look = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0, dashing: false, lx: 0, ly: 0, lt: 0 };   // aim + fire
    this._touch = new Map();
    this.btns = [];
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.onStart = this.onPause = this.onTap = this.onSwipe = this.onDashKey = this.onToggleAim = null;
    this._init();
  }

  getMove() {
    if (this.left.active) {
      let x = this.left.dx / STICK_R, z = -this.left.dy / STICK_R;
      const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
      return { x, z };
    }
    let x = 0, z = 0;
    if (this.keys['KeyW']) z += 1; if (this.keys['KeyS']) z -= 1;
    if (this.keys['KeyD']) x += 1; if (this.keys['KeyA']) x -= 1;
    const l = Math.hypot(x, z); return l > 0 ? { x: x / l, z: z / l } : { x: 0, z: 0 };
  }
  get moveMag() {
    if (this.left.active) return Math.min(1, Math.hypot(this.left.dx, this.left.dy) / STICK_R);
    const m = this.getMove(); return Math.hypot(m.x, m.z);
  }
  get sprint() { return !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || (this.left.active && this.moveMag > 0.86); }
  get firing() { return this._mouseDown || this.look.active; }
  get dashHeld() { return !!this.keys['KeyQ'] || this.left.dashing || this.look.dashing; }   // hold to extend the dash

  updateLook(dt) {
    if (!this.look.active) return;
    if (Math.hypot(this.look.dx, this.look.dy) < LOOK_DEAD) return;
    this.yaw -= (this.look.dx / STICK_R) * TURN_RATE * dt;              // reversed horizontal
    this.pitch = clampPitch(this.pitch - (this.look.dy / STICK_R) * PITCH_RATE * dt);
  }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        if (e.code === 'Space') this.onTap?.();
        else if (e.code === 'KeyQ') this.onDashKey?.();
        else if (e.code === 'KeyT') this.onToggleAim?.();
        else if (e.code === 'Enter') this.onStart?.();
        else if (e.code === 'Escape') this.onPause?.();
      }
      if (e.code === 'Space') e.preventDefault();
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });

    this._arrowTimer = setInterval(() => {
      if (this.keys['ArrowLeft'])  this.yaw -= ARROW_SENS * 0.016;
      if (this.keys['ArrowRight']) this.yaw += ARROW_SENS * 0.016;
      if (this.keys['ArrowUp'])    this.pitch = clampPitch(this.pitch + ARROW_SENS * 0.006);
      if (this.keys['ArrowDown'])  this.pitch = clampPitch(this.pitch - ARROW_SENS * 0.006);
    }, 16);

    addEventListener('mousedown', e => {
      if (e.button === 0) { this._mouseDown = true; this.onStart?.('click'); if (!this.locked) this.canvas.requestPointerLock?.(); }
    });
    addEventListener('mouseup', e => { if (e.button === 0) this._mouseDown = false; });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; });
    addEventListener('mousemove', e => {
      if (this.isTouch) return;
      this.yaw += (e.movementX || 0) * MOUSE_SENS;
      this.pitch = clampPitch(this.pitch - (e.movementY || 0) * MOUSE_SENS * MOUSE_PITCH);
    });

    const opt = { passive: false };
    addEventListener('touchstart', e => { e.preventDefault(); this._tStart(e); }, opt);
    addEventListener('touchmove', e => { e.preventDefault(); this._tMove(e); }, opt);
    addEventListener('touchend', e => { e.preventDefault(); this._tEnd(e); }, opt);
    addEventListener('touchcancel', e => { e.preventDefault(); this._tEnd(e); }, opt);
  }

  _hitBtn(x, y) { for (const b of this.btns) if (Math.hypot(x - b.x, y - b.y) < b.r) return b; return null; }

  _tStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (y < 56 && Math.abs(x - innerWidth / 2) < 40) { this._touch.set(t.identifier, 'pause'); this.onPause?.(); continue; }
      if (this._hitBtn(x, y)) { this._touch.set(t.identifier, 'btn'); continue; }
      const now = performance.now();
      if (x < innerWidth * 0.5) {
        if (this.left.active) continue;
        this._touch.set(t.identifier, 'move'); this.left = { active: true, ox: x, oy: y, dx: 0, dy: 0, t0: now, dashing: false, lx: x, ly: y, lt: now };
      } else {
        if (this.look.active) continue;
        this._touch.set(t.identifier, 'look'); this.look = { active: true, ox: x, oy: y, dx: 0, dy: 0, t0: now, dashing: false, lx: x, ly: y, lt: now };
      }
    }
  }
  _tMove(e) {
    for (const t of e.changedTouches) {
      const r = this._touch.get(t.identifier);
      const s = r === 'move' ? this.left : r === 'look' ? this.look : null;
      if (!s) continue;
      const now = performance.now();
      s.dx = t.clientX - s.ox; s.dy = t.clientY - s.oy;
      const mvx = t.clientX - s.lx, mvy = t.clientY - s.ly, mt = Math.max(1, now - s.lt);
      const vel = Math.hypot(mvx, mvy) / mt * 1000;                 // px/s
      s.lx = t.clientX; s.ly = t.clientY; s.lt = now;
      // a fast flick mid-drag starts a (holdable) dash in the flicked direction
      if (!s.dashing && vel > SWIPE_VEL && Math.hypot(s.dx, s.dy) > 22) {
        s.dashing = true; const l = Math.hypot(s.dx, s.dy) || 1; this.onSwipe?.(s.dx / l, s.dy / l);
      }
    }
  }
  _classify(s) {
    const dur = performance.now() - s.t0, dist = Math.hypot(s.dx, s.dy);
    if (dist >= SWIPE_MIN && dur <= SWIPE_MS) this.onSwipe?.(s.dx / dist, s.dy / dist);   // slow swipe → one-shot dash
    else if (dist <= TAP_DIST && dur <= TAP_MS) this.onTap?.();                            // tap → jump / air-dash
  }
  _tEnd(e) {
    const blank = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0, dashing: false, lx: 0, ly: 0, lt: 0 };
    for (const t of e.changedTouches) {
      const r = this._touch.get(t.identifier); this._touch.delete(t.identifier);
      if (r === 'move') { if (!this.left.dashing) this._classify(this.left); this.left = { ...blank }; }   // dashing release just ends the held dash
      else if (r === 'look') { if (!this.look.dashing) this._classify(this.look); this.look = { ...blank }; }
    }
  }
}
const clampPitch = p => Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));
