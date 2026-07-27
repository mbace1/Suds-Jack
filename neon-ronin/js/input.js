// ── Keyboard + pointer-lock mouse + touch dual-stick input ────────────────────
// Desktop: buffered one-shot actions (attack/dash/swap) so a click landing
// mid-swing still chains the combo; mouse deltas accumulate until consumed.
// Touch: floating dual sticks — LEFT stick moves and FLICKING it in any
// direction dashes that way (dashQueued carries the flick vector); RIGHT
// stick orbits the camera (tap or lift = jump, again mid-air = double jump).
// While touch is driving, combat is automatic (see player.js) and the
// melee/ranged mode button above the right stick picks the fighting style.

const STICK_R = 56;        // px deflection that maps to full stick throw
const DEAD = 0.18;
const PAD_DEAD = 0.22;     // gamepad stick deadzone

// Standard-mapping gamepad buttons → actions. Combat stays MANUAL on a pad
// (unlike touch): there are plenty of buttons, so auto-combat isn't needed.
const PAD = {
  JUMP: 0,        // A / cross
  DASH: 1,        // B / circle
  ATTACK: 2,      // X / square
  HEAVY: 3,       // Y / triangle
  PARRY: 4,       // LB
  ULT: 5,         // RB
  CHARGE: 6,      // LT
  SWAP_CYCLE: 7,  // RT
  FORM0: 14,      // D-pad left
  FORM1: 12,      // D-pad up
  FORM2: 15,      // D-pad right
};
const FLICK_WINDOW = 90;   // ms of stick history a flick is measured over
const FLICK_PX = 30;       // displacement inside the window that reads as a flick
const FLICK_RESET = 12;    // stick must settle below this before the next flick

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.locked = false;
    this._dx = 0;
    this._dy = 0;
    this.attackQueued = false;
    this.heavyQueued = false;     // RMB / auto-mixed on touch
    this.parryQueued = false;     // F / touch button — timed block window
    this.ultQueued = false;       // R / charged form chip
    this.dashQueued = null;    // true (keyboard) or {x, y} flick vector (touch)
    this.jumpQueued = false;
    this.commandQueued = false;   // CHARGE order for the ally squad
    this.swapQueued = -1;      // -1 none, 0..2 form index, 3 = cycle
    this.mode = 'melee';       // 'melee' | 'ranged' (touch auto-combat style)
    this.touch = false;        // flips true on first touch and stays on
    this.pad = false;          // a gamepad has been seen this session
    this._padPrev = [];
    this._padL = { x: 0, y: 0 };
    this._padR = { x: 0, y: 0 };
    this._sticks = { L: null, R: null };
    this._stickEls = null;

    addEventListener('gamepadconnected', () => { this.pad = true; this.onPadChange?.(true); });
    addEventListener('gamepaddisconnected', () => {
      if (!navigator.getGamepads?.().some((g) => g)) { this.pad = false; this.onPadChange?.(false); }
    });

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.dashQueued = true;
      if (e.code === 'Digit1') this.swapQueued = 0;
      if (e.code === 'Digit2') this.swapQueued = 1;
      if (e.code === 'Digit3') this.swapQueued = 2;
      if (e.code === 'KeyQ') this.swapQueued = 3;
      if (e.code === 'KeyE') this.commandQueued = true;
      if (e.code === 'KeyF') this.parryQueued = true;
      if (e.code === 'KeyR') this.ultQueued = true;
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      if (e.button === 0) this.attackQueued = true;
      if (e.button === 2) this.heavyQueued = true;
    });
    addEventListener('contextmenu', (e) => { if (this.locked) e.preventDefault(); });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this._dx += e.movementX;
      this._dy += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });

    this._initTouch();
  }

  // touch play runs itself: melee swings / ranged fire happen automatically
  get autoCombat() { return this.touch; }

  _els() {
    if (!this._stickEls) {
      this._stickEls = {};
      for (const side of ['L', 'R']) {
        const base = document.getElementById(`stick${side}`);
        this._stickEls[side] = { base, nub: base.querySelector('.nub') };
      }
    }
    return this._stickEls;
  }

  _flagTouch() {
    if (this.touch) return;
    this.touch = true;
    document.body.classList.add('touch');
    this.onTouchDetected?.();
  }

  _initTouch() {
    // any touch anywhere (incl. the start overlay) switches to touch mode
    // BEFORE requestLock can run, so pointer lock never hijacks taps
    addEventListener('touchstart', () => this._flagTouch(), { passive: true });

    const opt = { passive: false };
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._flagTouch();
      for (const t of e.changedTouches) {
        const side = t.clientX < innerWidth / 2 ? 'L' : 'R';
        if (this._sticks[side]) continue;
        this._sticks[side] = {
          id: t.identifier, x0: t.clientX, y0: t.clientY, dx: 0, dy: 0,
          hist: [], flicked: false,
        };
        const el = this._els()[side];
        el.base.style.display = 'block';
        el.base.style.left = `${t.clientX}px`;
        el.base.style.top = `${t.clientY}px`;
        el.nub.style.transform = 'translate(-50%, -50%)';
      }
    }, opt);

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        for (const side of ['L', 'R']) {
          const s = this._sticks[side];
          if (!s || s.id !== t.identifier) continue;
          s.dx = t.clientX - s.x0;
          s.dy = t.clientY - s.y0;
          const len = Math.hypot(s.dx, s.dy);
          if (len > STICK_R) { s.dx *= STICK_R / len; s.dy *= STICK_R / len; }
          if (side === 'L') this._checkFlick(s);
          const el = this._els()[side];
          el.nub.style.transform = `translate(calc(-50% + ${s.dx}px), calc(-50% + ${s.dy}px))`;
        }
      }
    }, opt);

    const end = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        for (const side of ['L', 'R']) {
          const s = this._sticks[side];
          if (!s || s.id !== t.identifier) continue;
          // right stick: tap OR lift = jump. left stick dashes on flicks only.
          if (side === 'R') this.jumpQueued = true;
          this._sticks[side] = null;
          this._els()[side].base.style.display = 'none';
        }
      }
    };
    this.canvas.addEventListener('touchend', end, opt);
    this.canvas.addEventListener('touchcancel', end, opt);
  }

  // A flick = the stick moving fast: enough displacement inside a short
  // window. One flick fires one dash; the stick has to settle before the
  // next one so holding a full deflection doesn't machine-gun dashes.
  _checkFlick(s) {
    const now = performance.now();
    s.hist.push({ t: now, x: s.dx, y: s.dy });
    while (s.hist.length && now - s.hist[0].t > FLICK_WINDOW) s.hist.shift();
    const o = s.hist[0];
    const ddx = s.dx - o.x, ddy = s.dy - o.y;
    const d = Math.hypot(ddx, ddy);
    if (!s.flicked && d > FLICK_PX) {
      s.flicked = true;
      this.dashQueued = { x: ddx / d, y: -ddy / d };   // moveAxes convention
    } else if (s.flicked && d < FLICK_RESET) {
      s.flicked = false;
    }
  }

  // Polled once per frame from main. Writes into the same buffered one-shot
  // fields the keyboard uses, so player.js / main.js need no pad-specific code.
  pollPad() {
    const pads = navigator.getGamepads?.();
    if (!pads) return;
    let g = null;
    for (const p of pads) if (p && p.connected) { g = p; break; }
    if (!g) { this._padL.x = this._padL.y = this._padR.x = this._padR.y = 0; return; }
    this.pad = true;

    const dz = (v) => (Math.abs(v) < PAD_DEAD ? 0 : (v - Math.sign(v) * PAD_DEAD) / (1 - PAD_DEAD));
    this._padL.x = dz(g.axes[0] ?? 0);
    this._padL.y = dz(g.axes[1] ?? 0);
    this._padR.x = dz(g.axes[2] ?? 0);
    this._padR.y = dz(g.axes[3] ?? 0);

    const down = (i) => !!g.buttons[i]?.pressed;
    const hit = (i) => {                 // edge-triggered: fires once per press
      const now = down(i), was = this._padPrev[i];
      this._padPrev[i] = now;
      return now && !was;
    };
    for (let i = 0; i < g.buttons.length; i++) if (this._padPrev[i] === undefined) this._padPrev[i] = false;

    if (hit(PAD.ATTACK)) this.attackQueued = true;
    if (hit(PAD.HEAVY)) this.heavyQueued = true;
    if (hit(PAD.PARRY)) this.parryQueued = true;
    if (hit(PAD.ULT)) this.ultQueued = true;
    if (hit(PAD.JUMP)) this.jumpQueued = true;
    if (hit(PAD.CHARGE)) this.commandQueued = true;
    if (hit(PAD.DASH)) this.dashQueued = true;
    if (hit(PAD.SWAP_CYCLE)) this.swapQueued = 3;
    if (hit(PAD.FORM0)) this.swapQueued = 0;
    if (hit(PAD.FORM1)) this.swapQueued = 1;
    if (hit(PAD.FORM2)) this.swapQueued = 2;
  }

  requestLock() {
    if (this.touch || this.locked) return;
    this.canvas.requestPointerLock?.();
  }

  isDown(code) { return this.keys.has(code); }

  stick(side) {
    const s = this._sticks[side];
    if (!s) {
      // no touch stick down: fall through to the gamepad's equivalent stick
      const p = side === 'L' ? this._padL : this._padR;
      if (p.x || p.y) return { x: p.x, y: p.y, active: true, pad: true };
      return { x: 0, y: 0, active: false };
    }
    const x = s.dx / STICK_R, y = s.dy / STICK_R;
    if (Math.hypot(x, y) < DEAD) return { x: 0, y: 0, active: true };
    return { x, y, active: true };
  }

  moveAxes() {
    const L = this.stick('L');
    if (L.active) return { x: L.x, y: -L.y };   // screen-up = forward
    const x = (this.isDown('KeyD') || this.isDown('ArrowRight') ? 1 : 0) -
              (this.isDown('KeyA') || this.isDown('ArrowLeft') ? 1 : 0);
    const y = (this.isDown('KeyW') || this.isDown('ArrowUp') ? 1 : 0) -
              (this.isDown('KeyS') || this.isDown('ArrowDown') ? 1 : 0);
    return { x, y };
  }

  consumeMouse() {
    const d = { dx: this._dx, dy: this._dy };
    this._dx = 0;
    this._dy = 0;
    return d;
  }

  consumeAttack()  { const q = this.attackQueued;  this.attackQueued = false;  return q; }
  consumeHeavy()   { const q = this.heavyQueued;   this.heavyQueued = false;   return q; }
  consumeParry()   { const q = this.parryQueued;   this.parryQueued = false;   return q; }
  consumeUlt()     { const q = this.ultQueued;     this.ultQueued = false;     return q; }
  consumeDash()    { const q = this.dashQueued;    this.dashQueued = null;     return q; }
  consumeJump()    { const q = this.jumpQueued;    this.jumpQueued = false;    return q; }
  consumeSwap()    { const q = this.swapQueued;    this.swapQueued = -1;       return q; }
  consumeCommand() { const q = this.commandQueued; this.commandQueued = false; return q; }
}
