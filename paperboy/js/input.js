// Input — ride with a left-hand stick (x = steer, y = throttle); throw with a
// button (or Z/X/Space).  Houses are on the left, so a throw always sails left.
const STICK_R = 64;

export class InputManager {
  constructor() {
    this.stick = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._touch = new Map();
    this.keys = {};
    this.onThrow = null;
    this.onStart = null;
    this.onPause = null;
    this._init();
  }

  get throwBtn() {
    const r = Math.min(innerWidth, innerHeight) * 0.12;
    return { x: innerWidth - r * 1.5, y: innerHeight - r * 1.5, r };
  }
  _inBtn(b, x, y) { return Math.hypot(x - b.x, y - b.y) < b.r; }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'KeyM') this.onThrow?.();
        if (e.code === 'Enter') this.onStart?.();
        if (e.code === 'Escape') this.onPause?.();
      }
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'Space') { this.onStart?.(); this.onThrow?.(); }
    });
    const opt = { passive: false };
    addEventListener('touchstart', e => { e.preventDefault(); this._tStart(e); }, opt);
    addEventListener('touchmove', e => { e.preventDefault(); this._tMove(e); }, opt);
    addEventListener('touchend', e => { e.preventDefault(); this._tEnd(e); }, opt);
    addEventListener('touchcancel', e => { e.preventDefault(); this._tEnd(e); }, opt);
  }

  _tStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (this._inBtn(this.throwBtn, x, y)) { this._touch.set(t.identifier, 'throw'); this.onThrow?.(); continue; }
      if (!this.stick.active && x < innerWidth * 0.6) {
        this._touch.set(t.identifier, 'stick');
        this.stick.active = true; this.stick.ox = x; this.stick.oy = y; this.stick.dx = 0; this.stick.dy = 0;
      }
    }
  }
  _tMove(e) {
    for (const t of e.changedTouches) {
      if (this._touch.get(t.identifier) !== 'stick') continue;
      this.stick.dx = t.clientX - this.stick.ox; this.stick.dy = t.clientY - this.stick.oy;
    }
  }
  _tEnd(e) {
    for (const t of e.changedTouches) {
      if (this._touch.get(t.identifier) === 'stick') { this.stick.active = false; this.stick.dx = 0; this.stick.dy = 0; }
      this._touch.delete(t.identifier);
    }
  }

  getSteer() {
    if (this.stick.active) return Math.max(-1, Math.min(1, this.stick.dx / STICK_R));
    let s = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) s -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) s += 1;
    return s;
  }
  getThrottle() {
    if (this.stick.active) return Math.max(-1, Math.min(1, -this.stick.dy / STICK_R));
    let t = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) t += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) t -= 1;
    return t;
  }
}
