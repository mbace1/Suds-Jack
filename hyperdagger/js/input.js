import { TUNING as T } from './tuning.js?v=70';

// all feel numbers live in tuning.js; these aliases keep the code readable
const STICK_R = T.touch.stickR;
const LOOK_DEADZONE = T.touch.lookDeadzone;
const TAP_MS = T.touch.tapMs;
const TAP_PX = T.touch.tapPx;
const FLICK_WINDOW = T.touch.flickWindow;
const FLICK_PX = T.touch.flickPx;

// --- stick shaping (controller-first aim) --------------------------------
const PAD_DZ = T.pad.deadzone;
const PAD_SAT = T.pad.saturation;
const LOOK_EXP = T.pad.lookExp;

/**
 * Radial deadzone + outer saturation, shaping MAGNITUDE only so the direction
 * a stick is pushed is the direction it reads. Deadzoning each axis
 * separately (the old path) notches diagonals: a stick pushed to a perfect
 * 45° gets both components trimmed, so it aims shallower than it points.
 *
 * `exp` applies a power curve to the shaped magnitude. On look that buys the
 * thing a linear rate can't: fine tracking near centre AND a fast top end
 * from one stick, instead of a single compromise sensitivity.
 */
function shapeStick(x, y, dz, sat = 1, exp = 1) {
  const len = Math.hypot(x, y);
  if (len <= dz) return { x: 0, y: 0 };
  let m = Math.min(1, (len - dz) / (sat - dz));
  if (exp !== 1) m = Math.pow(m, exp);
  return { x: (x / len) * m, y: (y / len) * m };
}

/**
 * Unified input. Desktop: pointer-lock mouse look, WASD, LMB tap = shotgun
 * burst / hold = stream (main.js reads the raw held state and does the
 * tap-vs-hold timing), Space = jump,
 * RMB spends homing ammo at LV3+, Shift = dash in the HYPER remix. Gamepad:
 * left stick moves, right stick looks, RT/RB fire, LT homing, A jumps, B dashes
 * in HYPER. Touch: left stick moves,
 * right stick looks/fires; a left tap jumps, a right tap fires the burst, and
 * a second finger can tap either occupied half without releasing its stick.
 * A fast flick on either stick dashes in the flick direction. Flicks are
 * judged by the LAST 150 ms of movement before release. No buttons.
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this._reap = false;
    this.mouseDown = false;
    this.mouseAltDown = false;
    this.touchMode = false;
    this.gamepad = false; // a controller is connected + active
    this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0, hist: [] };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, t0: 0, hist: [] };
    this._touchMap = new Map(); // touch id → 'left' | 'right'
    this._lookX = 0;
    this._lookY = 0;
    this._jump = false;
    this._fireTap = false;
    this._dash = false;
    this._dashFlick = null; // {x, y} normalized screen-space flick direction
    this._pad = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, firing: false, altFiring: false };
    this._padPrev = { jump: false, dash: false, up: false, down: false, a: false, b: false, start: false };
    this._ui = { up: false, down: false, a: false, b: false, start: false }; // menu edges
    this._init();
  }

  _init() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) this._jump = true;
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) this._dash = true;
      if ((e.code === 'KeyR' || e.code === 'KeyE') && !e.repeat) this._reap = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    document.addEventListener('mousedown', e => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.mouseAltDown = true;
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.mouseAltDown = false;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        // Some browsers report one giant bogus delta right after locking.
        if (Math.hypot(e.movementX, e.movementY) > 400) return;
        this._lookX += e.movementX;
        this._lookY += e.movementY;
      }
    });

    const opt = { passive: false };
    window.addEventListener('touchstart', e => {
      if (this._uiTouch(e)) return; // let DOM buttons (pause/options) work
      e.preventDefault();
      this._touchStart(e);
    }, opt);
    window.addEventListener('touchmove', e => { e.preventDefault(); this._touchMove(e); }, opt);
    window.addEventListener('touchend', e => { e.preventDefault(); this._touchEnd(e); }, opt);
    window.addEventListener('touchcancel', e => { e.preventDefault(); this._touchEnd(e); }, opt);
  }

  /** True when the touch began on an interactive DOM control. */
  _uiTouch(e) {
    const t = e.target;
    return !!(t && t.closest && t.closest('button, #pauseBtn, .arcade-home'));
  }

  _touchStart(e) {
    this.touchMode = true;
    const now = performance.now();
    for (const t of e.changedTouches) {
      const side = t.clientX < window.innerWidth / 2 ? 'left' : 'right';
      const stick = this[side];
      if (!stick.active) {
        this._touchMap.set(t.identifier, side);
        stick.active = true;
        stick.ox = t.clientX; stick.oy = t.clientY;
        stick.dx = 0; stick.dy = 0;
        stick.t0 = now;
        stick.hist = [{ x: t.clientX, y: t.clientY, t: now }];
      } else {
        // A second finger can trigger the action without releasing the stick:
        // left = jump while moving, right = burst while holding an aim angle.
        if (side === 'right') this._fireTap = true;
        else this._jump = true;
        this._touchMap.set(t.identifier, 'tap');
      }
    }
  }

  _touchMove(e) {
    const now = performance.now();
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      if (side !== 'left' && side !== 'right') continue;
      const stick = this[side];
      stick.dx = t.clientX - stick.ox;
      stick.dy = t.clientY - stick.oy;
      stick.hist.push({ x: t.clientX, y: t.clientY, t: now });
      while (stick.hist.length > 2 && stick.hist[0].t < now - FLICK_WINDOW * 2) {
        stick.hist.shift();
      }
    }
  }

  _touchEnd(e) {
    const now = performance.now();
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      this._touchMap.delete(t.identifier);
      if (side !== 'left' && side !== 'right') continue;
      const stick = this[side];
      const dur = now - stick.t0;
      const dist = Math.hypot(stick.dx, stick.dy);
      if (dur < TAP_MS && dist < TAP_PX) {
        if (side === 'right') this._fireTap = true;
        else this._jump = true;
      } else {
        // flick = fast travel within the last FLICK_WINDOW ms before release,
        // so a flick at the end of a long look-drag still dashes
        const endX = stick.ox + stick.dx, endY = stick.oy + stick.dy;
        let ref = stick.hist[0];
        for (const s of stick.hist) {
          if (s.t >= now - FLICK_WINDOW) { ref = s; break; }
        }
        const fx = endX - ref.x, fy = endY - ref.y;
        const flen = Math.hypot(fx, fy);
        if (flen >= FLICK_PX) this._dashFlick = { x: fx / flen, y: fy / flen };
      }
      stick.active = false;
      stick.dx = 0; stick.dy = 0;
      stick.hist = [];
    }
  }

  /** Is the jump control HELD right now (not the edge)? Glide needs a held
   *  read; every other jump path is edge-triggered. */
  jumpHeld() {
    if (this.keys['Space']) return true;
    const gp = this._gp;
    if (gp && gp.buttons[0]?.pressed) return true;
    // touch: a held left stick is movement, not a jump — so touch glides
    // from the pad/key paths only, deliberately.
    return false;
  }

  /** Poll the first connected controller once per frame. Feeds the same
   *  move/look/fire/jump/dash paths as mouse+keyboard, so nothing downstream
   *  needs to know a pad is in use. Buttons are edge-detected here. */
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    let gp = null;
    if (pads) for (const p of pads) { if (p && p.connected) { gp = p; break; } }
    if (!gp) {
      this.gamepad = false;
      this._gp = null;
      this._pad.move = { x: 0, y: 0 };
      this._pad.look = { x: 0, y: 0 };
      this._pad.firing = false;
      this._pad.altFiring = false;
      this._padPrev = { jump: false, dash: false, up: false, down: false, a: false, b: false, start: false };
      return;
    }
    this.gamepad = true;
    this._gp = gp;
    // the whole layer assumes the standard mapping — warn once if this pad
    // reports something else (rare: some Linux/Firefox + DualSense combos)
    if (gp.mapping !== 'standard' && !this._warnedMapping) {
      this._warnedMapping = true;
      console.warn(`[hyperdagger] gamepad "${gp.id}" reports mapping "${gp.mapping}" — buttons may be scrambled (standard mapping expected)`);
    }
    const raw = i => gp.axes[i] || 0;
    // left stick → move (screen-up is forward, so invert y). Move stays
    // LINEAR: you want full walk speed without shoving the stick to the rim.
    this._pad.move = shapeStick(raw(0), -raw(1), PAD_DZ, PAD_SAT);
    // right stick → look, through the response curve
    this._pad.look = shapeStick(raw(2), raw(3), PAD_DZ, PAD_SAT, LOOK_EXP);
    const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    this._pad.firing = btn(7) || btn(5); // RT / RB hold to fire
    this._pad.altFiring = btn(6);        // LT spends banked homing daggers
    const jumpNow = btn(0);              // A = jump
    const dashNow = btn(1);              // B = dash (HYPER mode only)
    const reapNow = btn(2) || btn(4);    // X / LB = reap
    if (jumpNow && !this._padPrev.jump) this._jump = true;
    if (dashNow && !this._padPrev.dash) this._dash = true;
    if (reapNow && !this._padPrev.reap) this._reap = true;
    this._padPrev.reap = reapNow;
    this._padPrev.jump = jumpNow;
    this._padPrev.dash = dashNow;
    // menu-facing edges: d-pad (12/13) or left-stick Y past ±0.55 moves focus,
    // A activates, B backs out of pause, Start (9) toggles pause
    const upNow = btn(12) || (gp.axes[1] || 0) < -0.55;
    const downNow = btn(13) || (gp.axes[1] || 0) > 0.55;
    const startNow = btn(9);
    if (upNow && !this._padPrev.up) this._ui.up = true;
    if (downNow && !this._padPrev.down) this._ui.down = true;
    if (jumpNow && !this._padPrev.a) this._ui.a = true;
    if (dashNow && !this._padPrev.b) this._ui.b = true;
    if (startNow && !this._padPrev.start) this._ui.start = true;
    this._padPrev.up = upNow;
    this._padPrev.down = downNow;
    this._padPrev.a = jumpNow;
    this._padPrev.b = dashNow;
    this._padPrev.start = startNow;
  }

  /** Fire a dual-rumble pulse on the connected pad, if it supports one
   *  (DualSense + Xbox pads do in Chromium). Silently no-ops elsewhere. */
  rumble(strong, weak, ms) {
    const act = this._gp?.vibrationActuator;
    if (!act?.playEffect) return;
    act.playEffect('dual-rumble', {
      duration: ms,
      strongMagnitude: Math.min(1, strong),
      weakMagnitude: Math.min(1, weak),
    }).catch(() => {});
  }

  /** Edge-detected gamepad UI actions since last call (menus + pause). */
  consumeUi() {
    const u = this._ui;
    this._ui = { up: false, down: false, a: false, b: false, start: false };
    return u;
  }

  /** Accumulated pointer-lock mouse pixels since last call. */
  consumeLook() {
    const r = { dx: this._lookX, dy: this._lookY };
    this._lookX = 0; this._lookY = 0;
    return r;
  }

  /** Right-stick deflection (touch or gamepad), each axis in [-1, 1].
   *  Touch keeps its original linear response (it already feels right);
   *  only the GAMEPAD path goes through the response curve. */
  getLookRate() {
    if (this.right.active) {
      let x = Math.max(-1, Math.min(1, this.right.dx / STICK_R));
      let y = Math.max(-1, Math.min(1, this.right.dy / STICK_R));
      if (Math.hypot(x, y) < LOOK_DEADZONE) return { x: 0, y: 0 };
      return { x, y };
    }
    const p = this._pad.look;
    return (p.x || p.y) ? { x: p.x, y: p.y } : { x: 0, y: 0 };
  }

  /** {x: strafe right, y: forward}, length ≤ 1. */
  getMove() {
    if (this.left.active) {
      let x = this.left.dx / STICK_R;
      let y = -this.left.dy / STICK_R;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y };
    }
    let x = 0, y = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y -= 1;
    const len = Math.hypot(x, y);
    if (len > 0) return { x: x / len, y: y / len };
    const p = this._pad.move;
    return (p.x || p.y) ? { x: p.x, y: p.y } : { x: 0, y: 0 };
  }

  get firing() {
    if (this.touchMode) return this.right.active;
    return this.mouseDown || this._pad.firing;
  }

  get altFiring() {
    if (this.touchMode) return false;
    return this.mouseAltDown || this._pad.altFiring;
  }

  consumeJump() {
    const j = this._jump;
    this._jump = false;
    return j;
  }

  consumeFireTap() {
    const f = this._fireTap;
    this._fireTap = false;
    return f;
  }

  consumeDash() {
    const d = this._dash;
    this._dash = false;
    return d;
  }

  /** REAP — spend the bone-yard. Edge-triggered like jump/dash. */
  consumeReap() {
    const r = this._reap;
    this._reap = false;
    return r;
  }

  consumeDashFlick() {
    const f = this._dashFlick;
    this._dashFlick = null;
    return f;
  }

  /** Draw the two sticks on the HUD canvas (touch mode only). */
  drawTouchUI(ctx) {
    if (!this.touchMode) return;
    const w = window.innerWidth, h = window.innerHeight;
    const rest = { left: [w * 0.16, h - 140], right: [w * 0.84, h - 140] };
    for (const side of ['left', 'right']) {
      const s = this[side];
      const [bx, by] = s.active ? [s.ox, s.oy] : rest[side];
      ctx.strokeStyle = side === 'right' ? 'rgba(200,30,30,0.55)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, STICK_R, 0, Math.PI * 2);
      ctx.stroke();
      let kx = bx, ky = by;
      if (s.active) {
        const len = Math.hypot(s.dx, s.dy);
        const k = len > STICK_R ? STICK_R / len : 1;
        kx += s.dx * k; ky += s.dy * k;
      }
      ctx.fillStyle = side === 'right' ? 'rgba(200,30,30,0.3)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(kx, ky, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
