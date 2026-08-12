// Input — twin sticks on glass, keyboard on desktop, both collapsing into the
// one control struct the craft reads. Stick state is exposed via sticks() so
// the HUD overlay can draw them, same as dropcabal and hyperdagger.
//
// LEFT  stick  x = carve, the whole game
//              y = weight: push forward to tuck, pull back to scrub speed off
// RIGHT stick  y = push forward to hold the afterburner
//              x = counter-steer trim at half authority — enough to hold a
//                  slide straight with the left stick still loaded up, and
//                  the spin axis once you are off the ground
//
// Desktop: A/D or ←/→ carve, W/↑ tuck, S/↓ scrub, Space/Shift burn,
//          Enter start, Esc pause.
export const STICK_R = 56;

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
      // floating origin per half: the stick appears wherever the thumb lands
      const stick = t.clientX < innerWidth * 0.5 ? this._left : this._right;
      if (stick.id !== -1) continue;
      stick.id = t.identifier;
      stick.x0 = stick.x = t.clientX;
      stick.y0 = stick.y = t.clientY;
    }
  }

  _move(e) {
    for (const t of e.changedTouches) {
      for (const stick of [this._left, this._right]) {
        if (stick.id !== t.identifier) continue;
        stick.x = t.clientX;
        stick.y = t.clientY;
      }
    }
  }

  _end(e) {
    for (const t of e.changedTouches) {
      for (const stick of [this._left, this._right]) {
        if (stick.id !== t.identifier) { continue; }
        stick.id = -1;
        stick.x = stick.x0; stick.y = stick.y0;
      }
    }
  }

  /** Stick deflection, each axis in [-1, 1], screen-up negative. */
  _def(stick, out) {
    if (stick.id === -1) { out.x = 0; out.y = 0; out.on = false; return out; }
    let dx = stick.x - stick.x0, dy = stick.y - stick.y0;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
    out.x = dx / STICK_R;
    out.y = dy / STICK_R;
    out.on = true;
    return out;
  }

  /** Collapse every input path into the one control struct the craft wants. */
  read() {
    const k = this.keys;
    let steer = 0;
    if (k.KeyA || k.ArrowLeft) steer -= 1;
    if (k.KeyD || k.ArrowRight) steer += 1;
    let tuck = !!(k.KeyW || k.ArrowUp);
    let brake = !!(k.KeyS || k.ArrowDown);
    let boost = !!(k.Space || k.ShiftLeft || k.ShiftRight);

    const L = this._def(this._left, _L), R = this._def(this._right, _R);
    if (L.on || R.on) {
      steer = clamp(steer + L.x + R.x * 0.5, -1, 1);
      // Tucking is the resting state on touch — the hill supplies the speed,
      // so the stick is there to take it away, not to ask for it.
      if (L.on) { tuck = L.y <= 0.1; brake = L.y > 0.45; }
      else tuck = true;
      if (R.y < -0.4) boost = true;
    }
    if (Math.abs(steer) < 0.10) steer = 0;
    return { steer, tuck, brake, boost };
  }
}

const _L = { x: 0, y: 0, on: false }, _R = { x: 0, y: 0, on: false };
