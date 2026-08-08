// ── Input ──────────────────────────────────────────────────────────────────
// Follows the house InputManager shape (hyperdagger/js/input.js): getters with
// touch → keyboard → gamepad fallthrough so nothing downstream knows which is
// in use, pollGamepad() once per frame in the main loop, drawTouchUI() on the
// overlay canvas, and flicks judged from a trailing history window rather than
// per-event.
//
// TOUCH is always Skate-style flick-it:
//   left half   steer + push (a plain stick)
//   right half  the BOARD. Drag down to load, then release or flick up to pop. The direction of
//               the flick picks the trick, the speed picks the height:
//                 flick up             ollie / grab in the air
//                 flick up-left        kickflip
//                 flick up-right       heelflip
//                 flick sideways       shuvit
//   The camera follows automatically, as it does in Skate — the right stick is
//   busy being the board.
//
// GAMEPAD can run either scheme, so the two can be compared on the same park:
//   'skate'  right stick is the board (flick-it, as above), camera auto-follows
//   'thps'   A = ollie (hold to charge), X/Y/B = tricks, right stick = camera
//
// Keyboard works in both: WASD steer, Space ollie (hold = higher), Q/E/F/C tricks.

const STICK_R = 60;          // px of thumb travel to full deflection
const DZ = 0.18;             // gamepad stick deadzone
const LOOK_RATE = 2.6;       // rad/sec of camera orbit at full right-stick tilt
const LOOK_DEADZONE = 0.12;

// Flick-it thresholds, in stick units and stick-units/second. Shared by touch
// and gamepad because both feed the gesture normalized deflection.
const LOAD_Y = 0.42;         // how far down counts as loaded (crouched)
const POP_Y = -0.2;          // must cross above this to count as a pop
const POP_SPEED = 3.0;       // stick units/sec of upward travel to pop
const RELEASE_Y = 0.15;      // springing/releasing toward centre also pops
const RELEASE_SPEED = 1.8;   // deliberately forgiving for touch + real pads
const SHUV_SPEED = 3.4;      // sideways speed that turns a load into a shuvit
// A real thumb flick crosses the stick in 50–80 ms, so ~14 units/s is a hard
// one and a lazy one lands near 5. Set too low and every pop maxes out and the
// analog gesture stops meaning anything.
const FULL_SPEED = 14.0;
const GESTURE_COOL = 0.12;   // one gesture, one action
// Re-arming an airborne trick: the stick must come back inside this radius, or
// slow to this fraction of the pop threshold. Holding the stick out at full
// deflection must NOT keep firing.
const REARM_MAG = 0.45;
const REARM_SPEED = 0.35;

export const SCHEMES = ['skate', 'thps'];

// ── The flick-it gesture ───────────────────────────────────────────────────
// Skate's actual primitive is two-phase: LOAD the stick down (the skater
// crouches), then FLICK it out. That is what makes it feel like Skate rather
// than like a jump button, and it is why the pop has to cross *above* centre —
// a gamepad stick springing back to neutral on its own must not count as a
// flick, or every crouch would fire an ollie on release.
export class FlickIt {
  constructor() { this.reset(); }

  reset() {
    this.loaded = false;
    this.depth = 0;
    this.px = 0; this.py = 0;
    this.cool = 0;
    this.armed = true;     // one gesture, one trick — see the airborne branch
    this.primed = false;   // visual: crouching
  }

  // x, y in stick units (y positive = down). Returns an action or null.
  sample(x, y, dt, airborne) {
    const vx = (x - this.px) / Math.max(dt, 1 / 240);
    const vy = (y - this.py) / Math.max(dt, 1 / 240);
    this.px = x; this.py = y;

    const cooling = this.cool > 0;
    if (cooling) this.cool -= dt;

    // RE-ARMING RUNS EVEN WHILE COOLING. The return stroke of a flick lands
    // inside the cooldown window, so gating it behind the cooldown leaves the
    // gesture permanently disarmed and the second flick of a left-right pair
    // never fires.
    if (airborne && !this.armed) {
      if (Math.hypot(x, y) < REARM_MAG
          || Math.hypot(vx, vy) < POP_SPEED * REARM_SPEED) this.armed = true;
    }
    if (cooling) return null;

    let act = null;

    if (airborne) {
      // Once you are off the ground there is nothing left to load against, so
      // any committed flick is a trick — but it has to be ONE trick per
      // gesture. The stick has to come back toward centre (or stop moving)
      // before it can fire again, otherwise holding a flick out registers a
      // fresh trick every time the cooldown lapses.
      const speed = Math.hypot(vx, vy);
      const mag = Math.hypot(x, y);
      if (this.armed && speed >= POP_SPEED && mag > 0.35) {
        act = { dir: dominant(vx, vy), power: power(speed, 1) };
        this.armed = false;
      }
    } else if (!this.loaded) {
      if (y > LOAD_Y) { this.loaded = true; this.depth = y; }
    } else {
      this.depth = Math.max(this.depth, y);
      if (y < POP_Y && vy <= -POP_SPEED) {
        // Popped. WHERE the stick ended up picks the flip, not the velocity
        // ratio — a flick to up-left is a kickflip even though its upward
        // component is the larger one.
        act = {
          dir: Math.abs(x) > 0.4 ? (x < 0 ? 'left' : 'right') : 'up',
          power: power(Math.hypot(vx, vy), this.depth),
        };
      } else if (y < RELEASE_Y && vy <= -RELEASE_SPEED) {
        // A physical stick springs to centre and a touchscreen thumb lifts.
        // Both are legitimate releases of a loaded ollie. Requiring the input
        // to cross above centre made quick pops vanish on phones and made real
        // pads feel broken unless the player exaggerated every gesture.
        act = { dir: 'up', power: power(Math.hypot(vx, vy), this.depth) };
      } else if (Math.abs(vx) >= SHUV_SPEED && Math.abs(vx) > Math.abs(vy) * 1.5 && y > 0.15) {
        // Genuinely sideways, not the sideways part of a diagonal pop.
        act = { dir: 'down', power: power(Math.abs(vx), this.depth) };
      } else if (y < LOAD_Y * 0.35 && vy > -POP_SPEED) {
        // Eased back out without committing. The speed guard matters: without
        // it, a flick fast enough to cross neutral in one frame un-loads on the
        // way past and the pop never fires.
        this.loaded = false;
      }
    }

    if (act) { this.loaded = false; this.depth = 0; this.cool = GESTURE_COOL; }
    this.primed = this.loaded;
    return act;
  }

  // Touchend can happen between animation frames. Preserve a loaded pop when
  // the thumb lifts instead of resetting the gesture before it is observed.
  release(airborne) {
    if (airborne || !this.loaded || this.cool > 0) return null;
    const act = { dir: 'up', power: power(POP_SPEED, this.depth) };
    this.loaded = false;
    this.depth = 0;
    this.cool = GESTURE_COOL;
    this.primed = false;
    return act;
  }
}

const power = (speed, depth) =>
  Math.max(0.35, Math.min(speed / FULL_SPEED, 1)) * (0.62 + 0.38 * Math.min(depth, 1));

function dominant(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export class InputManager {
  constructor() {
    this.scheme = 'skate';
    try {
      const s = localStorage.getItem('tinyHawkScheme');
      if (SCHEMES.includes(s)) this.scheme = s;
    } catch (e) { /* private mode */ }

    this.enabled = false;
    this.touchMode = false;
    this.gamepad = false;
    this.airborne = false;

    this.keys = {};
    this.left = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._touchMap = new Map();

    this.actions = [];
    this.uiActions = [];
    // Every action the input has ever emitted, newest last. The game never
    // reads this — it exists so the gesture layer can be asserted on its own.
    this.actionLog = [];

    this.touchFlick = new FlickIt();
    this.padFlick = new FlickIt();
    this._pad = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 }, board: { x: 0, y: 0 } };
    this._padPrev = {};
    this._charging = false;
    this._charge = 0;
    this.flash = null;
    this.t = 0;
    this._touchSampleAt = 0;
    this._mouseSampleAt = 0;

    this.layout();
    addEventListener('resize', () => this.layout());
    this._init();
  }

  setScheme(s) {
    if (!SCHEMES.includes(s)) return;
    this.scheme = s;
    try { localStorage.setItem('tinyHawkScheme', s); } catch (e) { /* ignore */ }
  }

  // Sticks live in the bottom corners, under where the thumbs already are. Both
  // the radius and the rest position come off the SHORT edge: a landscape phone
  // is ~340px tall, and a fixed `h - 130` puts the rings in the middle of the
  // screen, on top of the HUD, nowhere near a thumb.
  // STICK_R stays a FIXED number of CSS pixels on every device, because the
  // flick threshold is measured in stick units per second and a stick unit is
  // STICK_R of thumb travel — scale the radius per screen and the same physical
  // flick crosses the threshold on one phone and not on another.
  layout() {
    const m = STICK_R + 16;
    this.restL = { x: m, y: innerHeight - m };
    this.restR = { x: innerWidth - m, y: innerHeight - m };
  }

  fire(dir, powerV) {
    this.actions.push({ dir, power: powerV });
    this.actionLog.push({ dir, power: powerV });
    if (this.actionLog.length > 40) this.actionLog.shift();
    this.flash = { dir, t: 0.3 };
  }

  // ── Wiring ───────────────────────────────────────────────────────────────
  _init() {
    const TRICK = { KeyQ: 'left', KeyE: 'right', KeyF: 'up', KeyC: 'down' };
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (!this.enabled || e.repeat) return;
      if (e.code === 'Space') { this._charging = true; this._charge = 0; e.preventDefault(); }
      else if (TRICK[e.code]) { this.fire(TRICK[e.code], 1); e.preventDefault(); }
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space' && this._charging) {
        if (this.enabled) this.fire('up', Math.max(0.35, Math.min(this._charge / 0.4, 1)));
        this._charging = false;
      }
    });
    addEventListener('blur', () => {
      this.keys = {};
      this._charging = false;
      this.left.active = this.right.active = false;
    });

    // Only ever preventDefault a touch WE claimed. Cancelling touchmove or
    // touchend unconditionally suppresses the click the browser would otherwise
    // synthesise, which kills every DOM button under a thumb — the menu is then
    // unstartable on a phone even though the game booted fine.
    const opt = { passive: false };
    addEventListener('touchstart', (e) => {
      // Even a tap on the menu tells us this is a touch device, so the sticks
      // are already drawn the moment the run starts.
      this.touchMode = true;
      if (!this.enabled || this._uiTouch(e)) return;   // let DOM controls work
      e.preventDefault();
      this._touchStart(e);
    }, opt);
    addEventListener('touchmove', (e) => {
      if (!this._claimed(e)) return;
      e.preventDefault();
      this._touchMove(e);
    }, opt);
    const end = (e) => {
      if (!this._claimed(e)) return;
      e.preventDefault();
      this._touchEnd(e);
    };
    addEventListener('touchend', end, opt);
    addEventListener('touchcancel', end, opt);

    // Mouse drives the same on-screen sticks, so the touch scheme is usable and
    // testable in a desktop browser without a touchscreen.
    addEventListener('mousedown', (e) => {
      if (!this.enabled || this._uiTarget(e.target)) return;
      const side = e.clientX < innerWidth / 2 ? 'left' : 'right';
      const s = this[side];
      s.active = true; s.ox = e.clientX; s.oy = e.clientY; s.dx = 0; s.dy = 0;
      this._mouseSide = side;
      this.touchMode = true;
    });
    addEventListener('mousemove', (e) => {
      if (!this._mouseSide) return;
      const s = this[this._mouseSide];
      s.dx = e.clientX - s.ox; s.dy = e.clientY - s.oy;
      if (this._mouseSide === 'right') this._sampleScreenFlick(this.touchFlick, s, e.timeStamp, '_mouseSampleAt');
    });
    addEventListener('mouseup', () => {
      if (!this._mouseSide) return;
      const s = this[this._mouseSide];
      if (this._mouseSide === 'right') {
        const act = this.touchFlick.release(this.airborne);
        if (act) this.fire(act.dir, act.power);
      }
      s.active = false; s.dx = 0; s.dy = 0;
      this._mouseSide = null;
    });
  }

  // `.arcade-home` is the hub button the site shell injects into every game.
  _uiTarget(t) { return !!(t && t.closest && t.closest('button, a, .ui-click, .arcade-home')); }
  _uiTouch(e) { return this._uiTarget(e.target); }

  /** True when this event carries a touch we took ownership of on touchstart. */
  _claimed(e) {
    for (const t of e.changedTouches) {
      if (this._touchMap.has(t.identifier)) return true;
    }
    return false;
  }

  _touchStart(e) {
    this.touchMode = true;
    if (!this.enabled) return;
    for (const t of e.changedTouches) {
      const side = t.clientX < innerWidth / 2 ? 'left' : 'right';
      const s = this[side];
      if (!s.active) {
        this._touchMap.set(t.identifier, side);
        s.active = true; s.ox = t.clientX; s.oy = t.clientY; s.dx = 0; s.dy = 0;
        if (side === 'right') {
          this.touchFlick.reset();
          this._touchSampleAt = e.timeStamp / 1000;
        }
      } else {
        this._touchMap.set(t.identifier, 'extra');
      }
    }
  }

  _touchMove(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      if (side !== 'left' && side !== 'right') continue;
      const s = this[side];
      s.dx = t.clientX - s.ox;
      s.dy = t.clientY - s.oy;
      if (side === 'right') this._sampleScreenFlick(this.touchFlick, s, e.timeStamp, '_touchSampleAt');
    }
  }

  _touchEnd(e) {
    for (const t of e.changedTouches) {
      const side = this._touchMap.get(t.identifier);
      this._touchMap.delete(t.identifier);
      if (side !== 'left' && side !== 'right') continue;
      const s = this[side];
      if (side === 'right') {
        const act = this.touchFlick.release(this.airborne);
        if (act) this.fire(act.dir, act.power);
      }
      s.active = false; s.dx = 0; s.dy = 0;
      if (side === 'right') this.touchFlick.reset();
    }
  }

  _sampleScreenFlick(flick, stick, timeStamp, clockKey) {
    const now = timeStamp / 1000;
    const before = this[clockKey] || now - 1 / 60;
    const dt = Math.max(1 / 240, Math.min(now - before, 0.1));
    this[clockKey] = now;
    const act = flick.sample(
      clampUnit(stick.dx / STICK_R), clampUnit(stick.dy / STICK_R),
      dt, this.airborne
    );
    if (act) this.fire(act.dir, act.power);
  }

  // ── Gamepad ──────────────────────────────────────────────────────────────
  // Polled once per frame from the main loop. Feeds the same getters as touch
  // and keyboard, so nothing downstream needs to know a pad is in use.
  pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    let gp = null;
    if (pads) for (const p of pads) { if (p && p.connected) { gp = p; break; } }
    if (!gp) {
      this.gamepad = false;
      this._pad.move = { x: 0, y: 0 };
      this._pad.look = { x: 0, y: 0 };
      this._padPrev = {};
      return;
    }
    this.gamepad = true;
    const ax = (i) => {
      const v = gp.axes[i] || 0;
      return Math.abs(v) < DZ ? 0 : (v - Math.sign(v) * DZ) / (1 - DZ);
    };
    let mx = ax(0), my = -ax(1);
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    this._pad.move = { x: mx, y: my };

    const rx = ax(2), ry = ax(3);
    const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const edge = (name, now) => {
      const was = !!this._padPrev[name];
      this._padPrev[name] = now;
      return now && !was;
    };

    if (!this.enabled) {
      if (edge('uiConfirm', btn(0) || btn(9))) this.uiActions.push('confirm');
      if (edge('uiBack', btn(1) || btn(8))) this.uiActions.push('back');
      const ux = (btn(15) ? 1 : 0) - (btn(14) ? 1 : 0) || Math.sign(mx) * (Math.abs(mx) > 0.62 ? 1 : 0);
      const uy = (btn(13) ? 1 : 0) - (btn(12) ? 1 : 0) || Math.sign(-my) * (Math.abs(my) > 0.62 ? 1 : 0);
      const dir = ux ? (ux > 0 ? 'right' : 'left') : uy ? (uy > 0 ? 'down' : 'up') : '';
      if (dir && dir !== this._uiPrevDir) this.uiActions.push(dir);
      this._uiPrevDir = dir;
      return;
    }
    this._uiPrevDir = '';

    if (this.scheme === 'skate') {
      // Right stick is the board. Camera follows on its own; the bumpers give
      // a manual nudge for when you want to look around.
      this._pad.look = { x: (btn(5) ? 1 : 0) - (btn(4) ? 1 : 0), y: 0 };
      const act = this.padFlick.sample(rx, ry, dt, this.airborne);
      if (act) this.fire(act.dir, act.power);
    } else {
      // THPS: right stick is the camera, tricks are on the face buttons, and
      // the ollie is a hold-and-release charge on A.
      this._pad.look = { x: rx, y: ry };
      const a = btn(0);
      if (a && !this._padPrev.a) { this._charging = true; this._charge = 0; }
      if (!a && this._padPrev.a && this._charging) {
        this.fire('up', Math.max(0.35, Math.min(this._charge / 0.4, 1)));
        this._charging = false;
      }
      this._padPrev.a = a;
      if (edge('x', btn(2))) this.fire('left', 1);
      if (edge('b', btn(1))) this.fire('right', 1);
      if (edge('y', btn(3))) this.fire('up', 1);
      if (edge('lb', btn(4))) this.fire('down', 1);
    }
  }

  // ── Per-frame ────────────────────────────────────────────────────────────
  update(dt) {
    this.t += dt;
    if (this._charging) this._charge += dt;
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }

    // Touch/mouse gestures are sampled at event time so a complete flick that
    // happens between two render frames cannot disappear.
  }

  /** {x: right, y: forward}, length ≤ 1. Touch → keyboard → gamepad. */
  getMove() {
    if (this.left.active) {
      let x = this.left.dx / STICK_R, y = -this.left.dy / STICK_R;
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

  /** Camera orbit rate in radians/sec. Zero under the Skate scheme on touch —
   *  the camera is the game's job there, not the player's. */
  getLookRate() {
    const p = this._pad.look;
    if (Math.hypot(p.x, p.y) > LOOK_DEADZONE) {
      return { x: p.x * LOOK_RATE, y: p.y * LOOK_RATE * 0.5 };
    }
    return { x: 0, y: 0 };
  }

  consumeActions() {
    const a = this.actions;
    this.actions = [];
    return a;
  }

  consumeUIActions() {
    const actions = this.uiActions;
    this.uiActions = [];
    return actions;
  }

  // Drain the press that selected a menu item. Without this, holding A to
  // enter a run becomes an ollie charge on the very next frame.
  drainGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    let gp = null;
    if (pads) for (const pad of pads) { if (pad && pad.connected) { gp = pad; break; } }
    if (!gp) return;
    const pressed = index => !!(gp.buttons[index] && gp.buttons[index].pressed);
    this._padPrev.a = pressed(0);
    this._padPrev.x = pressed(2);
    this._padPrev.b = pressed(1);
    this._padPrev.y = pressed(3);
    this._padPrev.lb = pressed(4);
    this._padPrev.uiConfirm = pressed(0) || pressed(9);
    this._padPrev.uiBack = pressed(1) || pressed(8);
    this.padFlick.reset();
  }

  setAirborne(v) { this.airborne = v; }

  /** True while a pop is loaded but not yet released. The skater crouches on
   *  this — seeing the load is what makes a two-phase gesture legible. */
  get loading() {
    return this.touchFlick.primed || this.padFlick.primed || this._charging;
  }

  clear() {
    this.keys = {};
    this.left.active = this.right.active = false;
    this.left.dx = this.left.dy = this.right.dx = this.right.dy = 0;
    this.actions.length = 0;
    this.uiActions.length = 0;
    this._charging = false;
    this._charge = 0;
    this.flash = null;
    this.touchFlick.reset();
    this.padFlick.reset();
  }

  // ── Touch UI ─────────────────────────────────────────────────────────────
  drawTouchUI(ctx) {
    if (!this.enabled || !this.touchMode) return;
    const ink = '244,241,232';
    const accent = '111,240,208';

    for (const side of ['left', 'right']) {
      const s = this[side];
      const rest = side === 'left' ? this.restL : this.restR;
      const bx = s.active ? s.ox : rest.x;
      const by = s.active ? s.oy : rest.y;

      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${ink},${s.active ? 0.4 : 0.18})`;
      ctx.beginPath(); ctx.arc(bx, by, STICK_R, 0, Math.PI * 2); ctx.stroke();

      if (side === 'right') {
        // The load zone: the arc you drag into before you flick. Lights up
        // when the gesture is primed, which is the only tell that the two-phase
        // gesture is two-phase.
        const primed = this.touchFlick.primed;
        ctx.strokeStyle = primed ? `rgba(${accent},0.85)` : `rgba(${ink},0.22)`;
        ctx.lineWidth = primed ? 4 : 2;
        ctx.beginPath();
        ctx.arc(bx, by, STICK_R - 5, Math.PI * 0.18, Math.PI * 0.82);
        ctx.stroke();
        if (this.flash) {
          const k = Math.max(0, this.flash.t / 0.3);
          const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.flash.dir];
          ctx.strokeStyle = `rgba(${accent},${k})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(bx, by, STICK_R + 6 + (1 - k) * 12, a - 0.5, a + 0.5);
          ctx.stroke();
        }
      }

      let kx = bx, ky = by;
      if (s.active) {
        const len = Math.hypot(s.dx, s.dy);
        const k = len > STICK_R ? STICK_R / len : 1;
        kx += s.dx * k; ky += s.dy * k;
      }
      ctx.fillStyle = `rgba(${ink},${s.active ? 0.5 : 0.24})`;
      ctx.beginPath(); ctx.arc(kx, ky, 25, 0, Math.PI * 2); ctx.fill();

      if (!s.active) {
        ctx.fillStyle = `rgba(${ink},0.32)`;
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        // Above the ring when there is no room beneath it.
        const below = by + STICK_R + 17;
        ctx.fillText(side === 'left' ? 'PUSH · STEER' : 'LOAD ↓ FLICK ↑',
          bx, below > innerHeight - 4 ? by - STICK_R - 9 : below);
      }
    }
  }
}

function clampUnit(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }
