// Input for the action-roguelike — toko-drop-style twin floating sticks on touch,
// keyboard+mouse on desktop.
//   Desktop:  WASD move · mouse aim (click locks pointer) · hold LMB fire · Shift sprint
//             Space jump · RMB secondary · Q dash · R nova · F interact · Enter/Esc
//   Touch:    left half = move stick (push far to sprint); right half = aim/fire stick
//             (drag turns the camera, holding fires); on-screen skill buttons + pause tap.
const STICK_R = 60, LOOK_DEAD = 12, TURN_RATE = 2.7, PITCH_RATE = 1.4, ARROW_SENS = 2.2, MOUSE_SENS = 0.0024;

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.locked = false;
    this.yaw = 0; this.pitch = 0.66;
    this._mouseDown = false;
    this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };   // move stick
    this.look = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };   // aim/turn + fire stick
    this._touch = new Map();          // id → 'move' | 'look' | 'pause' | 'btn'
    this.btns = [];                   // on-screen buttons, set by the HUD each frame
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.onStart = this.onPause = this.onSecondary = this.onUtility = this.onSpecial = this.onInteract = this.onJump = null;
    this._init();
  }

  // ── resolved inputs ──
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
  get sprint() { return !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || (this.left.active && this.moveMag > 0.85); }
  get jump()   { return !!this.keys['Space']; }
  get firing() { return this._mouseDown || this.look.active; }

  // continuous camera turn from the right stick (called each frame while playing)
  updateLook(dt) {
    if (!this.look.active) return;
    if (Math.hypot(this.look.dx, this.look.dy) < LOOK_DEAD) return;
    this.yaw += (this.look.dx / STICK_R) * TURN_RATE * dt;
    this.pitch = clampPitch(this.pitch + (this.look.dy / STICK_R) * PITCH_RATE * dt);
  }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        switch (e.code) {
          case 'KeyQ': this.onUtility?.(); break;
          case 'KeyR': this.onSpecial?.(); break;
          case 'KeyE': case 'KeyF': this.onInteract?.(); break;
          case 'Enter': this.onStart?.(); break;
          case 'Escape': this.onPause?.(); break;
        }
      }
      if (e.code === 'Space') e.preventDefault();
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });

    // arrow-key camera fallback (keyboard-only / headless testing)
    this._arrowTimer = setInterval(() => {
      if (this.keys['ArrowLeft'])  this.yaw -= ARROW_SENS * 0.016;
      if (this.keys['ArrowRight']) this.yaw += ARROW_SENS * 0.016;
      if (this.keys['ArrowUp'])    this.pitch = clampPitch(this.pitch - ARROW_SENS * 0.012);
      if (this.keys['ArrowDown'])  this.pitch = clampPitch(this.pitch + ARROW_SENS * 0.012);
    }, 16);

    addEventListener('mousedown', e => {
      if (e.button === 0) { this._mouseDown = true; this.onStart?.('click'); if (!this.locked) this.canvas.requestPointerLock?.(); }
      if (e.button === 2) this.onSecondary?.();
    });
    addEventListener('mouseup', e => { if (e.button === 0) this._mouseDown = false; });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; });
    addEventListener('mousemove', e => {
      if (this.isTouch) return;
      this.yaw += (e.movementX || 0) * MOUSE_SENS;
      this.pitch = clampPitch(this.pitch + (e.movementY || 0) * MOUSE_SENS);
    });

    const opt = { passive: false };
    addEventListener('touchstart', e => { e.preventDefault(); this._tStart(e); }, opt);
    addEventListener('touchmove', e => { e.preventDefault(); this._tMove(e); }, opt);
    addEventListener('touchend', e => { e.preventDefault(); this._tEnd(e); }, opt);
    addEventListener('touchcancel', e => { e.preventDefault(); this._tEnd(e); }, opt);
  }

  _hitBtn(x, y) { for (const b of this.btns) if (Math.hypot(x - b.x, y - b.y) < b.r) return b; return null; }
  _fireBtn(id) {
    if (id === 'q') this.onUtility?.(); else if (id === 'r') this.onSpecial?.();
    else if (id === 'm2') this.onSecondary?.(); else if (id === 'f') this.onInteract?.();
    else if (id === 'jump') this.onJump?.();
  }

  _tStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      // pause zone — top-centre strip (toko-drop)
      if (y < 56 && Math.abs(x - innerWidth / 2) < 40) { this._touch.set(t.identifier, 'pause'); this.onPause?.(); continue; }
      const b = this._hitBtn(x, y);
      if (b) { this._touch.set(t.identifier, 'btn'); this._fireBtn(b.id); continue; }
      if (x < innerWidth * 0.5) {
        if (this.left.active) continue;
        this._touch.set(t.identifier, 'move'); this.left = { active: true, ox: x, oy: y, dx: 0, dy: 0 };
      } else {
        if (this.look.active) continue;
        this._touch.set(t.identifier, 'look'); this.look = { active: true, ox: x, oy: y, dx: 0, dy: 0 };
      }
    }
  }
  _tMove(e) {
    for (const t of e.changedTouches) {
      const role = this._touch.get(t.identifier);
      if (role === 'move') { this.left.dx = t.clientX - this.left.ox; this.left.dy = t.clientY - this.left.oy; }
      else if (role === 'look') { this.look.dx = t.clientX - this.look.ox; this.look.dy = t.clientY - this.look.oy; }
    }
  }
  _tEnd(e) {
    for (const t of e.changedTouches) {
      const role = this._touch.get(t.identifier); this._touch.delete(t.identifier);
      if (role === 'move') this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
      else if (role === 'look') this.look = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    }
  }
}
const clampPitch = p => Math.max(0.34, Math.min(1.0, p));   // keep a sane 3rd-person range
