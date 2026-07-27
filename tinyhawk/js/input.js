// ── Input ──────────────────────────────────────────────────────────────────
// Twin sticks, and the idea the whole control scheme rests on: the right stick
// discriminates by GESTURE SPEED. Move it slowly and you are orbiting the
// camera; move it fast and you are doing something. One stick, two jobs, no
// mode button (design doc §4).
//
//   left stick   grounded: steer + push      airborne: ←/→ spin, ↑/↓ flip
//   right slow   orbit the camera
//   right flick  ↑ ollie (magnitude = height) / airborne: ↑ grab ←→ flip ↓ shuv
//
// Desktop mirrors it: WASD, mouse look, Space (hold = higher ollie), QEFC tricks.
//
// FLICK_SPEED is measured in STICK UNITS PER SECOND, not pixels, so the split
// behaves identically on a phone and a 4K monitor. It is the single most
// important number in the game and it is live-tunable from __th.debug.

const STICK_R = 62;        // px from the touch origin to full deflection
const LOOK_GAIN = 1.4;     // stick units -> radians of camera orbit
const MOUSE_GAIN = 0.0022; // px -> radians
// Just long enough that one gesture cannot fire twice on consecutive frames.
// Re-arming is done by the stick SLOWING DOWN, not by a timer — a long timer
// deadens the first quarter of every air, which is exactly when you want to be
// throwing a trick.
const FLICK_COOLDOWN = 0.08;
const FLICK_REARM = 0.5;       // fraction of flickSpeed you must drop below
const FLICK_MIN_TRAVEL = 0.3;  // stick units, so a twitch is not a trick

export class Input {
  constructor(canvasUI) {
    this.ui = canvasUI;
    this.enabled = false;

    // Tunables surfaced for the P0 feel pass.
    this.flickSpeed = 4.6;   // stick units/sec that separates drag from flick
    this.flickFull = 11;     // stick units/sec that counts as a full-power flick

    this.move = { x: 0, y: 0 };
    this.lookDelta = { x: 0, y: 0 };
    this.actions = [];
    // Every flick the discriminator has ever accepted, newest last. The game
    // never reads this — it exists so the drag/flick split can be asserted
    // independently of whatever the skater happened to do with the action.
    this.actionLog = [];

    this.left = null;   // { id, ox, oy, x, y }
    this.right = null;  // { id, ox, oy, x, y, px, py, pt, cool }
    this.keys = new Set();
    this.charge = 0;
    this.charging = false;
    this.pointerLocked = false;

    this._bindKeys();
    this._bindPointer();
  }

  // ── Keyboard + mouse ─────────────────────────────────────────────────────
  _bindKeys() {
    const TRICK = { KeyQ: 'left', KeyE: 'right', KeyF: 'up', KeyC: 'down' };
    addEventListener('keydown', (e) => {
      if (e.repeat || !this.enabled) return;
      if (e.code === 'Space') { this.charging = true; this.charge = 0; e.preventDefault(); }
      else if (TRICK[e.code]) { this.actions.push({ dir: TRICK[e.code], power: 1 }); e.preventDefault(); }
      else this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        // Hold-to-charge is the desktop stand-in for flick magnitude.
        if (this.charging && this.enabled) {
          this.actions.push({ dir: 'up', power: Math.max(0.35, Math.min(this.charge / 0.4, 1)) });
        }
        this.charging = false;
        this.charge = 0;
      }
      this.keys.delete(e.code);
    });
    addEventListener('blur', () => { this.keys.clear(); this.charging = false; this.left = this.right = null; });

    addEventListener('mousemove', (e) => {
      if (!this.enabled || !this.pointerLocked) return;
      // Some browsers emit one enormous delta right after locking.
      if (Math.hypot(e.movementX, e.movementY) > 400) return;
      this.lookDelta.x += e.movementX * MOUSE_GAIN;
      this.lookDelta.y += e.movementY * MOUSE_GAIN;
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement != null;
    });
  }

  // ── Touch ────────────────────────────────────────────────────────────────
  _bindPointer() {
    const isControl = (t) => t && t.closest && t.closest('button, a, .ui-click');

    addEventListener('pointerdown', (e) => {
      if (!this.enabled || isControl(e.target)) return;
      if (e.pointerType === 'mouse') return;   // mouse uses pointer lock instead
      const rightHalf = e.clientX > innerWidth / 2;
      const stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      // Always (re)claim the half. If a pointerup is ever missed — a cancelled
      // touch, a browser quirk — a stick that only binds when the slot is free
      // leaves that half of the screen permanently dead. Stealing it costs
      // nothing real: a second finger on an occupied half is rare and this
      // recovers on the next touch instead of never.
      if (rightHalf) this.right = { ...stick, px: 0, py: 0, pt: performance.now(), cool: 0, armed: true };
      else this.left = stick;
    }, { passive: true });

    addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      if (this.left && e.pointerId === this.left.id) {
        this.left.x = clampUnit((e.clientX - this.left.ox) / STICK_R);
        this.left.y = clampUnit((e.clientY - this.left.oy) / STICK_R);
      } else if (this.right && e.pointerId === this.right.id) {
        const r = this.right;
        r.x = clampUnit((e.clientX - r.ox) / STICK_R);
        r.y = clampUnit((e.clientY - r.oy) / STICK_R);

        const now = performance.now();
        const dt = Math.max((now - r.pt) / 1000, 1 / 240);
        const dx = r.x - r.px, dy = r.y - r.py;
        const travel = Math.hypot(dx, dy);
        const speed = travel / dt;

        const verdict = this.classify(dx, dy, dt, r.armed, r.cool > 0);
        if (verdict.kind === 'flick') {
          this.actions.push({ dir: verdict.dir, power: verdict.power });
          this.actionLog.push({ dir: verdict.dir, power: verdict.power, speed });
          if (this.actionLog.length > 40) this.actionLog.shift();
          r.armed = false;
          r.cool = FLICK_COOLDOWN;
        } else if (verdict.kind === 'drag') {
          if (verdict.rearm) r.armed = true;
          this.lookDelta.x += dx * LOOK_GAIN;
          this.lookDelta.y += dy * LOOK_GAIN;
        }
        // 'ignore' is a fast stroke that is not allowed to fire — a return
        // stroke, or the tail of a gesture inside the cooldown. It must not
        // orbit the camera either, or every trick would whip the view around.
        r.px = r.x; r.py = r.y; r.pt = now;
      }
    }, { passive: true });

    const up = (e) => {
      if (this.left && e.pointerId === this.left.id) this.left = null;
      if (this.right && e.pointerId === this.right.id) this.right = null;
    };
    addEventListener('pointerup', up, { passive: true });
    addEventListener('pointercancel', up, { passive: true });
  }

  // ── The discriminator ────────────────────────────────────────────────────
  // The whole control scheme is this function. Kept pure — (dx, dy, dt) in,
  // verdict out — so the thresholds can be asserted with exact timings instead
  // of via synthesized touch events, where the harness's own event latency is
  // the same order as a real flick and swamps the measurement.
  //
  //   flick   fast enough, far enough, and armed  -> an action
  //   ignore  fast but disarmed or still cooling  -> nothing, and NO camera
  //   drag    slow                                -> orbit the camera
  //
  // Re-arming happens on the stick SLOWING DOWN rather than on a timer, so one
  // continuous stroke is one action however long it lasts, and the very start
  // of an air is not deadened by a cooldown.
  classify(dx, dy, dt, armed, cooling) {
    const travel = Math.hypot(dx, dy);
    const speed = travel / Math.max(dt, 1 / 240);
    if (cooling) return { kind: 'ignore', speed };
    if (speed >= this.flickSpeed && travel >= FLICK_MIN_TRAVEL) {
      if (!armed) return { kind: 'ignore', speed };
      return {
        kind: 'flick',
        dir: dominant(dx, dy),
        power: Math.max(0.35, Math.min(speed / this.flickFull, 1)),
        speed,
      };
    }
    return { kind: 'drag', rearm: speed < this.flickSpeed * FLICK_REARM, speed };
  }

  // ── Per-frame ────────────────────────────────────────────────────────────
  update(dt) {
    if (this.charging) this.charge += dt;
    if (this.right && this.right.cool > 0) this.right.cool = Math.max(0, this.right.cool - dt);

    let mx = 0, my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my -= 1;
    if (this.left) { mx += this.left.x; my -= this.left.y; }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    this.move.x = mx; this.move.y = my;
  }

  consumeLook() {
    const d = { x: this.lookDelta.x, y: this.lookDelta.y };
    this.lookDelta.x = 0; this.lookDelta.y = 0;
    return d;
  }

  consumeActions() {
    const a = this.actions;
    this.actions = [];
    return a;
  }

  clear() {
    this.keys.clear();
    this.left = this.right = null;
    this.actions.length = 0;
    this.lookDelta.x = this.lookDelta.y = 0;
    this.charging = false;
    this.charge = 0;
  }

  // ── Stick rendering ──────────────────────────────────────────────────────
  draw() {
    const c = this.ui;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    if (!this.enabled) return;
    const dpr = c.width / innerWidth;
    const ring = (s, label) => {
      if (!s) return;
      g.save();
      g.scale(dpr, dpr);
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(244,241,232,0.28)';
      g.beginPath(); g.arc(s.ox, s.oy, STICK_R, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(244,241,232,0.42)';
      g.beginPath(); g.arc(s.ox + s.x * STICK_R, s.oy + s.y * STICK_R, 17, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    ring(this.left);
    ring(this.right);
  }
}

function clampUnit(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

function dominant(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
