// Input — twin sticks on glass, keyboard on desktop, both collapsing into the
// one control struct the vehicle reads. Stick state is exposed via sticks() so
// the overlay can draw them, the same idiom the other cabinets here use.
//
// LEFT  stick  x = steer
//              y = throttle up / brake down. There is no auto-throttle: this
//                  build has a turbine with spool lag, and managing it is the
//                  point, so the stick has to be able to ask for part power.
// RIGHT stick  x = camera pan, left/right round the sled
//              y = WEIGHT. Pull back and you boost and the nose lifts, like a
//                  hot rod on the launch. Push forward and the nose is pressed
//                  down — a front spoiler — without scrubbing any speed. This
//                  is the snowboarder's lean: back to float over the deep
//                  stuff, forward to make the front edge bite.
//
// GAMEPAD is the scheme's natural home, because both of the axes this build
// added are analog: the turbine has spool lag so part throttle is a real
// choice, and weight is a lean, not a button. Keyboard flattens both to on
// and off. The pad feeds the SAME control struct — nothing downstream knows
// which device is driving. Left stick steer + throttle/brake, right stick pan
// + weight, and RT/LT additionally as throttle/brake for anyone who expects a
// racer to work that way; whichever input asks for more throttle wins.
//
// Desktop: A/D steer, W throttle, S brake, Space / Shift boost (lean back),
//          arrow up = spoiler (lean forward), arrows left/right = pan camera,
//          F = swap chassis on the menu, Esc pause.
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
    this.onSwap = null;
    this.gamepad = false;
    this._pad = { steer: 0, throttle: 0, brake: false, pan: 0, lean: 0 };
    this._padPrev = { start: false, pause: false, swap: false };
    this._init();
  }

  sticks() { return { left: this._left, right: this._right }; }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        if (e.code === 'Enter') this.onStart?.();
        if (e.code === 'Escape') this.onPause?.();
        if (e.code === 'KeyF') this.onSwap?.();
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
    for (const t of e.changedTouches) {
      if (t.target && t.target.tagName === 'BUTTON') continue;
      this.onStart?.();
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

  /**
   * Poll the first connected pad once per frame. Buttons are edge-detected
   * here so the callbacks fire once, the same way the keyboard path does.
   * Standard mapping: 0 A, 3 Y, 6 LT, 7 RT, 8 Back, 9 Start.
   */
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    let gp = null;
    if (pads) for (const q of pads) if (q && q.connected) { gp = q; break; }
    if (!gp) {
      this.gamepad = false;
      this._pad.steer = this._pad.throttle = this._pad.pan = this._pad.lean = 0;
      this._pad.brake = false;
      this._padPrev.start = this._padPrev.pause = this._padPrev.swap = false;
      return;
    }
    this.gamepad = true;
    const DZ = 0.16;
    const ax = i => {
      const v = gp.axes[i] || 0;
      return Math.abs(v) < DZ ? 0 : (v - Math.sign(v) * DZ) / (1 - DZ);
    };
    const val = i => (gp.buttons[i] ? gp.buttons[i].value : 0);
    const hit = i => !!(gp.buttons[i] && gp.buttons[i].pressed);

    const ly = ax(1);
    this._pad.steer = ax(0);
    // stick forward is -y, and RT is the racing convention: take whichever
    // is asking for more power
    this._pad.throttle = Math.max(Math.max(0, -ly), val(7));
    this._pad.brake = Math.max(Math.max(0, ly), val(6)) > 0.35;
    this._pad.pan = ax(2);
    // stick BACK (+y) is lean back — boost and nose up, matching the touch
    // stick and the way you would shift your weight on a board
    this._pad.lean = ax(3);

    const start = hit(0), pause = hit(9), swap = hit(3);
    if (start && !this._padPrev.start) this.onStart?.();
    if (pause && !this._padPrev.pause) this.onPause?.();
    if (swap && !this._padPrev.swap) this.onSwap?.();
    this._padPrev.start = start; this._padPrev.pause = pause; this._padPrev.swap = swap;
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
    let steer = 0, pan = 0, lean = 0;
    if (k.KeyA) steer -= 1;
    if (k.KeyD) steer += 1;
    if (k.ArrowLeft) pan -= 1;
    if (k.ArrowRight) pan += 1;
    let throttle = k.KeyW ? 1 : 0;
    let brake = !!k.KeyS;
    if (k.Space || k.ShiftLeft || k.ShiftRight || k.ArrowDown) lean = 1;   // back: boost, nose up
    if (k.ArrowUp) lean = -1;                                             // forward: spoiler

    const L = this._def(this._left, _L), R = this._def(this._right, _R);
    if (L.on || R.on) {
      steer = clamp(steer + L.x, -1, 1);
      if (L.on) {
        throttle = clamp(-L.y * 1.35, 0, 1);
        brake = L.y > 0.45;
      } else throttle = Math.max(throttle, 0.75);
      if (R.on) {
        pan = clamp(R.x * 1.2, -1, 1);
        // screen-down is +y: pulling the stick back is lean > 0
        lean = Math.abs(R.y) > 0.18 ? clamp(R.y * 1.25, -1, 1) : 0;
      }
    }
    // the pad last, and merged rather than exclusive, so a stick in one hand
    // and a keyboard under the other still works
    if (this.gamepad) {
      const P = this._pad;
      if (P.steer) steer = clamp(steer + P.steer, -1, 1);
      throttle = Math.max(throttle, P.throttle);
      brake = brake || P.brake;
      if (P.pan) pan = clamp(pan + P.pan, -1, 1);
      if (P.lean) lean = clamp(lean + P.lean, -1, 1);
    }
    if (Math.abs(steer) < 0.09) steer = 0;
    out.steer = steer; out.throttle = throttle; out.brake = brake;
    out.lean = lean; out.pan = pan;
    out.overdrive = lean > 0.45;
    return out;
  }
}

const _L = { x: 0, y: 0, on: false }, _R = { x: 0, y: 0, on: false };
