// Input for the action-roguelike.
//   Move: WASD          Sprint: Shift     Jump: Space      Fire: hold LMB
//   Secondary: RMB / E… (M2)  Utility/Dash: Q   Special: R   Interact (chest/teleporter): F
//   Aim: move the mouse (click to lock the pointer) or the Arrow keys.
//   Enter: start / restart    Esc: pause
// Touch: left half = move stick; right half drag = aim + fire; on-screen skill buttons.
const LOOK_SENS = 0.0024, ARROW_SENS = 2.2;

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.yaw = 0; this.pitch = 0.66;
    this.firing = false;
    this._mouseDown = false;
    this.locked = false;

    this.onStart = this.onPause = this.onSecondary = this.onUtility = this.onSpecial = this.onInteract = null;

    // touch state
    this.move = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, id: -1 };
    this.look = { active: false, id: -1, lx: 0 };
    this.btns = [];                 // filled by HUD: [{id,x,y,r,label}]
    this._init();
  }

  // resolved planar move input, camera-relative axes (z forward = +1)
  getMove() {
    if (this.move.active) {
      const R = 60;
      return { x: clamp(this.move.dx / R), z: clamp(-this.move.dy / R) };
    }
    let x = 0, z = 0;
    if (this.keys['KeyW']) z += 1; if (this.keys['KeyS']) z -= 1;
    if (this.keys['KeyD']) x += 1; if (this.keys['KeyA']) x -= 1;
    return { x, z };
  }
  get sprint() { return !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight']; }
  get jump()   { return !!this.keys['Space']; }

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

    // arrow keys also turn/pitch the camera (keyboard-only fallback)
    this._arrowTimer = setInterval(() => {
      if (this.keys['ArrowLeft'])  this.yaw -= ARROW_SENS * 0.016;
      if (this.keys['ArrowRight']) this.yaw += ARROW_SENS * 0.016;
      if (this.keys['ArrowUp'])    this.pitch = clampPitch(this.pitch - ARROW_SENS * 0.012);
      if (this.keys['ArrowDown'])  this.pitch = clampPitch(this.pitch + ARROW_SENS * 0.012);
    }, 16);

    addEventListener('mousedown', e => {
      if (e.button === 0) { this._mouseDown = true; this.firing = true; this.onStart?.('click'); if (!this.locked) this.canvas.requestPointerLock?.(); }
      if (e.button === 2) this.onSecondary?.();
    });
    addEventListener('mouseup', e => { if (e.button === 0) { this._mouseDown = false; this.firing = false; } });
    addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; });
    addEventListener('mousemove', e => {
      const mx = e.movementX || 0, my = e.movementY || 0;
      this.yaw += mx * LOOK_SENS; this.pitch = clampPitch(this.pitch + my * LOOK_SENS);
    });

    const opt = { passive: false };
    addEventListener('touchstart', e => { e.preventDefault(); this._tStart(e); }, opt);
    addEventListener('touchmove', e => { e.preventDefault(); this._tMove(e); }, opt);
    addEventListener('touchend', e => { e.preventDefault(); this._tEnd(e); }, opt);
    addEventListener('touchcancel', e => { e.preventDefault(); this._tEnd(e); }, opt);
  }

  _hitBtn(x, y) { for (const b of this.btns) if (Math.hypot(x - b.x, y - b.y) < b.r) return b; return null; }
  _fireBtn(b) {
    if (b.id === 'q') this.onUtility?.(); else if (b.id === 'r') this.onSpecial?.();
    else if (b.id === 'm2') this.onSecondary?.(); else if (b.id === 'f') this.onInteract?.();
    else if (b.id === 'start') this.onStart?.();
  }

  _tStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      const b = this._hitBtn(x, y);
      if (b) { this._fireBtn(b); continue; }
      if (x < innerWidth * 0.5 && !this.move.active) {
        this.move = { active: true, ox: x, oy: y, dx: 0, dy: 0, id: t.identifier };
      } else if (!this.look.active) {
        this.look = { active: true, id: t.identifier, lx: x }; this.firing = true;  // right side = aim+fire
      }
    }
  }
  _tMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.move.id) { this.move.dx = t.clientX - this.move.ox; this.move.dy = t.clientY - this.move.oy; }
      if (t.identifier === this.look.id) { this.yaw += (t.clientX - this.look.lx) * 0.01; this.look.lx = t.clientX; }
    }
  }
  _tEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.move.id) this.move = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, id: -1 };
      if (t.identifier === this.look.id) { this.look = { active: false, id: -1, lx: 0 }; this.firing = false; }
    }
  }
}
const clamp = v => Math.max(-1, Math.min(1, v));
const clampPitch = p => Math.max(0.34, Math.min(1.0, p));   // keep a sane 3rd-person range
