const STICK_RADIUS = 60;
const AIM_DEADZONE = 15;

export class InputManager {
  constructor() {
    this.left  = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._touchMap = new Map(); // touch id → 'left' | 'right'
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this.onDash  = null;
    this.onPause = null;
    this._init();
  }

  _init() {
    window.addEventListener('keydown', e => { this.keys[e.code] = true; });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'Space')  this.onDash?.();
      if (e.code === 'Escape') this.onPause?.();
    });
    window.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener('mousedown', () => { this.mouse.down = true; });
    window.addEventListener('mouseup',   () => { this.mouse.down = false; });

    const opt = { passive: false };
    const inUI = e => e.target?.closest?.('#dsgn, #upgrade-panel');
    window.addEventListener('touchstart',  e => { if (inUI(e)) return; e.preventDefault(); this._touchStart(e); }, opt);
    window.addEventListener('touchmove',   e => { if (inUI(e)) return; e.preventDefault(); this._touchMove(e);  }, opt);
    window.addEventListener('touchend',    e => { if (inUI(e)) return; e.preventDefault(); this._touchEnd(e);   }, opt);
    window.addEventListener('touchcancel', e => { if (inUI(e)) return; e.preventDefault(); this._touchEnd(e);   }, opt);
  }

  _touchStart(e) {
    for (const t of e.changedTouches) {
      // Pause zone: top-centre strip (80 px wide, 56 px tall)
      if (t.clientY < 56 && Math.abs(t.clientX - window.innerWidth / 2) < 40) {
        this._touchMap.set(t.identifier, 'pause');
        this.onPause?.();
        continue;
      }
      const side = t.clientX < window.innerWidth / 2 ? 'left' : 'right';
      const stick = side === 'left' ? this.left : this.right;
      if (!stick.active) {
        this._touchMap.set(t.identifier, side);
        stick.active = true;
        stick.ox = t.clientX; stick.oy = t.clientY;
        stick.dx = 0; stick.dy = 0;
      }
    }
  }

  _touchMove(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      if (!side) continue;
      const stick = side === 'left' ? this.left : this.right;
      stick.dx = t.clientX - stick.ox;
      stick.dy = t.clientY - stick.oy;
    }
  }

  _touchEnd(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      if (!side) continue;
      this._touchMap.delete(t.identifier);
      if (side === 'right') this.onDash?.();
      const stick = side === 'left' ? this.left : this.right;
      stick.active = false;
      stick.dx = 0; stick.dy = 0;
    }
  }

  reset() {
    this.left  = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._touchMap.clear();
  }

  /** Returns {x, z} normalized world-space move direction. */
  getMoveDir() {
    if (this.left.active) {
      let x = this.left.dx / STICK_RADIUS;
      let z = this.left.dy / STICK_RADIUS;
      const len = Math.hypot(x, z);
      if (len > 1) { x /= len; z /= len; }
      return { x, z };
    }
    let x = 0, z = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  z += 1;
    const len = Math.hypot(x, z);
    return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
  }

  /**
   * Returns {x, z, valid} normalized world-space aim direction.
   * Sets useMouse:true when no touch stick is active (caller should use raycasting).
   */
  getAimDir() {
    if (this.right.active) {
      const len = Math.hypot(this.right.dx, this.right.dy);
      if (len < AIM_DEADZONE) return { x: 0, z: 0, valid: false };
      return { x: this.right.dx / len, z: this.right.dy / len, valid: true };
    }
    return { x: 0, z: 0, valid: false, useMouse: true };
  }
}
