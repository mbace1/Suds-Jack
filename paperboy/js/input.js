// Input — steer + throttle on the left, two throw buttons on the right.
// Desktop: A/D or ←/→ steer, W/S or ↑/↓ throttle/brake,
//          Z = throw left, X or M = throw right, Space/Enter = start/throw-nearest.
const STICK_RADIUS = 64;

export class InputManager {
  constructor() {
    this.stick = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._touchMap = new Map(); // id → 'stick' | 'throwL' | 'throwR'
    this.keys = {};
    this.onThrowLeft  = null;
    this.onThrowRight = null;
    this.onStart      = null;
    this.onPause      = null;
    this._init();
  }

  // Throw-button hit rects (also used by the HUD to draw them).
  get throwBtnR() {
    const r = Math.min(innerWidth, innerHeight) * 0.11;
    return { x: innerWidth - r * 1.4, y: innerHeight - r * 1.5, r };
  }
  get throwBtnL() {
    const r = Math.min(innerWidth, innerHeight) * 0.11;
    return { x: innerWidth - r * 4.0, y: innerHeight - r * 1.5, r };
  }
  _inBtn(b, x, y) { return Math.hypot(x - b.x, y - b.y) < b.r; }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        if (e.code === 'KeyZ')                        this.onThrowLeft?.();
        if (e.code === 'KeyX' || e.code === 'KeyM')   this.onThrowRight?.();
        if (e.code === 'Enter')                       this.onStart?.();
        if (e.code === 'Escape')                      this.onPause?.();
      }
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => {
      this.keys[e.code] = false;
      // Space throws toward whichever way you're leaning (start handled in main).
      if (e.code === 'Space') this.onStart?.();
    });

    const opt = { passive: false };
    addEventListener('touchstart',  e => { e.preventDefault(); this._tStart(e); }, opt);
    addEventListener('touchmove',   e => { e.preventDefault(); this._tMove(e);  }, opt);
    addEventListener('touchend',    e => { e.preventDefault(); this._tEnd(e);   }, opt);
    addEventListener('touchcancel', e => { e.preventDefault(); this._tEnd(e);   }, opt);
  }

  _tStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (this._inBtn(this.throwBtnR, x, y)) { this._touchMap.set(t.identifier, 'throwR'); this.onThrowRight?.(); continue; }
      if (this._inBtn(this.throwBtnL, x, y)) { this._touchMap.set(t.identifier, 'throwL'); this.onThrowLeft?.(); continue; }
      if (!this.stick.active && x < innerWidth * 0.6) {
        this._touchMap.set(t.identifier, 'stick');
        this.stick.active = true;
        this.stick.ox = x; this.stick.oy = y; this.stick.dx = 0; this.stick.dy = 0;
      }
    }
  }
  _tMove(e) {
    for (const t of e.changedTouches) {
      if (this._touchMap.get(t.identifier) !== 'stick') continue;
      this.stick.dx = t.clientX - this.stick.ox;
      this.stick.dy = t.clientY - this.stick.oy;
    }
  }
  _tEnd(e) {
    for (const t of e.changedTouches) {
      const role = this._touchMap.get(t.identifier);
      this._touchMap.delete(t.identifier);
      if (role === 'stick') { this.stick.active = false; this.stick.dx = 0; this.stick.dy = 0; }
    }
  }

  // -1 (left) .. +1 (right)
  getSteer() {
    if (this.stick.active) return Math.max(-1, Math.min(1, this.stick.dx / STICK_RADIUS));
    let s = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  s -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) s += 1;
    return s;
  }

  // -1 (brake) .. +1 (faster).  Up = faster.
  getThrottle() {
    if (this.stick.active) return Math.max(-1, Math.min(1, -this.stick.dy / STICK_RADIUS));
    let t = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])   t += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) t -= 1;
    return t;
  }
}
