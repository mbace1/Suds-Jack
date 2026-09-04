// Input — twin sticks on glass, keyboard on desktop, both collapsing into the
// one control struct the vehicle reads. Stick state is exposed via sticks() so
// the overlay can draw them, the same idiom the other cabinets here use.
//
// LEFT  stick  x = steer
//              y = throttle up / brake down. There is no auto-throttle: this
//                  build has a turbine with spool lag, and managing it is the
//                  point, so the stick has to be able to ask for part power.
// RIGHT stick  y = push forward to hold overdrive (it builds heat)
//              x = steer trim at half authority, for holding a slide straight
//
// Desktop: A/D steer, W throttle, S brake, Shift/Space overdrive, Esc pause.
export const STICK_R = 58;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class InputManager {
  constructor() {
    this.keys = {};
    this.touchSeen = false;
    this._left = { id: -1, x0: 0, y0: 0, x: 0, y: 0 };
    this._right = { id: -1, x0: 0, y0: 0, x: 0, y: 0 };
    this.onStart = null;
    this.onPause = null;
    this._init();
  }

  sticks() { return { left: this._left, right: this._right }; }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        if (e.code === 'Enter' || e.code === 'Space') this.onStart?.();
        if (e.code === 'Escape') this.onPause?.();
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });

    const opt = { passive: false };
    addEventListener('touchstart', e => { e.preventDefault(); this._start(e); }, opt);
    addEventListener('touchmove', e => { e.preventDefault(); this._move(e); }, opt);
    addEventListener('touchend', e => { e.preventDefault(); this._end(e); }, opt);
    addEventListener('touchcancel', e => { e.preventDefault(); this._end(e); }, opt);
  }

  _start(e) {
    this.touchSeen = true;
    this.onStart?.();
    for (const t of e.changedTouches) {
      if (t.target && t.target.tagName === 'BUTTON') continue;
      const s = t.clientX < innerWidth * 0.5 ? this._left : this._right;
      if (s.id !== -1) continue;
      s.id = t.identifier;
      s.x0 = s.x = t.clientX; s.y0 = s.y = t.clientY;
    }
  }

  _move(e) {
    for (const t of e.changedTouches) {
      for (const s of [this._left, this._right]) {
        if (s.id !== t.identifier) continue;
        s.x = t.clientX; s.y = t.clientY;
      }
    }
  }

  _end(e) {
    for (const t of e.changedTouches) {
      for (const s of [this._left, this._right]) {
        if (s.id !== t.identifier) continue;
        s.id = -1; s.x = s.x0; s.y = s.y0;
      }
    }
  }

  _def(s, out) {
    if (s.id === -1) { out.x = 0; out.y = 0; out.on = false; return out; }
    let dx = s.x - s.x0, dy = s.y - s.y0;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
    out.x = dx / STICK_R; out.y = dy / STICK_R; out.on = true;
    return out;
  }

  read(out) {
    const k = this.keys;
    let steer = 0;
    if (k.KeyA || k.ArrowLeft) steer -= 1;
    if (k.KeyD || k.ArrowRight) steer += 1;
    let throttle = (k.KeyW || k.ArrowUp) ? 1 : 0;
    let brake = !!(k.KeyS || k.ArrowDown);
    let overdrive = !!(k.Space || k.ShiftLeft || k.ShiftRight);

    const L = this._def(this._left, _L), R = this._def(this._right, _R);
    if (L.on || R.on) {
      steer = clamp(steer + L.x + R.x * 0.5, -1, 1);
      if (L.on) {
        throttle = clamp(-L.y * 1.35, 0, 1);
        brake = L.y > 0.45;
      } else throttle = Math.max(throttle, 0.75);
      if (R.y < -0.4) overdrive = true;
    }
    if (Math.abs(steer) < 0.09) steer = 0;
    out.steer = steer; out.throttle = throttle;
    out.brake = brake; out.overdrive = overdrive;
    return out;
  }
}

const _L = { x: 0, y: 0, on: false }, _R = { x: 0, y: 0, on: false };
