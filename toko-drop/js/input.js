const STICK_RADIUS = 60;
const AIM_DEADZONE = 15;
const GP_DEADZONE  = 0.20;  // gamepad analog stick deadzone

export class InputManager {
  constructor() {
    this.left  = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.right = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
    this._touchMap = new Map(); // touch id → 'left' | 'right'
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this.onDash  = null;
    // v234: the RUSH ability needs a trigger of its OWN. v232 hung it on
    // onDash believing the dash button was unclaimed in Rush — but onDash is
    // fired BY the boost input (Space keyup, pad dash button), so the ability
    // was firing itself at the end of every boost. Separate callback, separate
    // bindings: Q / pad X or LB / a lower-left touch pad.
    this.onAbility = null;
    this._prevAbil = false;
    // v224 RUSH: boost is HELD, not tapped. On touch that means pushing the
    // move stick past 86% of its travel (the "RIM" scheme).
    //
    // v235: v224 also shipped a second scheme, ZONE — a held pad in the
    // lower-left margin — intending to settle the two by playing them. No
    // selector was ever built, so `boostScheme` was written once to 'rim' and
    // never again: every ZONE branch was unreachable from the day it landed.
    // v234 then gave that same margin to the RUSH ability pad, so ZONE has no
    // home left either. Removed rather than left as a decoy. If a held pad is
    // ever worth trying again it needs a region of its own and a way to pick it.
    this._padBoost   = false;
    this.onPause = null;
    // Gamepad state (read each frame via pollGamepad)
    this.gp = { connected: false, mx: 0, my: 0, ax: 0, ay: 0 };
    this.usingGamepad = false;  // true once the pad is actively driving input
    this._prevDash  = false;
    this._prevPause = false;
    this._init();
  }

  _init() {
    window.addEventListener('gamepadconnected',    () => { this.gp.connected = true; this.usingGamepad = true; });
    window.addEventListener('gamepaddisconnected', () => { this.gp.connected = false; this.usingGamepad = false; });
    window.addEventListener('keydown', e => { this.keys[e.code] = true; });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'Space')  this.onDash?.();
      if (e.code === 'KeyQ')   this.onAbility?.();   // v234 RUSH ability
      if (e.code === 'Escape') this.onPause?.();
    });
    window.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener('mousedown', () => { this.mouse.down = true; });
    window.addEventListener('mouseup',   () => { this.mouse.down = false; });

    const opt = { passive: false };
    const inUI = e => e.target?.closest?.('#dsgn, #upgrade-panel, #overlay, .arcade-home, #tded');   // v237: + the level editor's bars
    window.addEventListener('touchstart',  e => { if (inUI(e)) return; e.preventDefault(); this._touchStart(e); }, opt);
    window.addEventListener('touchmove',   e => { if (inUI(e)) return; e.preventDefault(); this._touchMove(e);  }, opt);
    window.addEventListener('touchend',    e => { if (inUI(e)) return; e.preventDefault(); this._touchEnd(e);   }, opt);
    window.addEventListener('touchcancel', e => { if (inUI(e)) return; e.preventDefault(); this._touchEnd(e);   }, opt);
  }

  _touchStart(e) {
    this.usingGamepad = false;  // a screen touch reverts to touch controls
    for (const t of e.changedTouches) {
      // Pause zone: top-centre strip (80 px wide, 56 px tall)
      if (t.clientY < 56 && Math.abs(t.clientX - window.innerWidth / 2) < 40) {
        this._touchMap.set(t.identifier, 'pause');
        this.onPause?.();
        continue;
      }
      // v234 RUSH ability pad: lower-left margin, checked ahead of stick
      // assignment so it can never steal the move stick.
      if (this.rushOn
          && t.clientX < window.innerWidth * 0.18 && t.clientY > window.innerHeight * 0.55) {
        this._touchMap.set(t.identifier, 'abil');
        this.onAbility?.();
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
      if (!side || side === 'abil') continue;
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
      if (side === 'abil') continue;   // v234: fired on touchstart, nothing to release
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
    this.gp.mx = this.gp.my = this.gp.ax = this.gp.ay = 0;
  }

  /** Poll the active gamepad once per frame: fills gp axes, edge-triggers dash/pause. */
  pollGamepad() {
    if (!this.gp.connected || !navigator.getGamepads) return;
    let pad = null;
    for (const p of navigator.getGamepads()) { if (p) { pad = p; break; } }
    if (!pad) return;

    const lx = pad.axes[0] || 0, ly = pad.axes[1] || 0;
    const rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
    const lLen = Math.hypot(lx, ly), rLen = Math.hypot(rx, ry);
    this.gp.mx = lLen > GP_DEADZONE ? lx : 0;
    this.gp.my = lLen > GP_DEADZONE ? ly : 0;
    this.gp.ax = rLen > GP_DEADZONE ? rx : 0;
    this.gp.ay = rLen > GP_DEADZONE ? ry : 0;

    // Dash: A button (0), right bumper (5), or right trigger (7)
    const dash = !!(pad.buttons[0]?.pressed || pad.buttons[5]?.pressed || pad.buttons[7]?.pressed);
    if (dash && !this._prevDash) this.onDash?.();
    this._prevDash = dash;
    this._padBoost = dash;   // v224 RUSH: the same button, but held

    // v234 RUSH ability: X (2) or left bumper (4) — deliberately none of the
    // dash/boost buttons (0/5/7), or holding boost would fire it.
    const abil = !!(pad.buttons[2]?.pressed || pad.buttons[4]?.pressed);
    if (abil && !this._prevAbil) this.onAbility?.();
    this._prevAbil = abil;

    // Pause: Start (9)
    const pause = !!pad.buttons[9]?.pressed;
    if (pause && !this._prevPause) this.onPause?.();
    this._prevPause = pause;

    // Any meaningful gamepad activity switches the UI into gamepad mode
    if (this.gp.mx || this.gp.my || this.gp.ax || this.gp.ay || dash || abil || pause) {
      this.usingGamepad = true;
    }
  }

  /** Returns {x, z} normalized world-space move direction. */
  /** v224 RUSH: is boost being HELD right now? Keyboard, pad, or the move
   *  stick pushed to its rim on touch. */
  getBoostHeld() {
    if (this.keys['Space']) return true;
    if (this._padBoost) return true;
    if (this.left.active) {
      return Math.hypot(this.left.dx, this.left.dy) >= STICK_RADIUS * 0.86;
    }
    return false;
  }

  getMoveDir() {
    if (this.gp.mx || this.gp.my) {
      let x = this.gp.mx, z = this.gp.my;
      const len = Math.hypot(x, z);
      if (len > 1) { x /= len; z /= len; }
      return { x, z };
    }
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
    if (this.gp.ax || this.gp.ay) {
      const len = Math.hypot(this.gp.ax, this.gp.ay);
      return { x: this.gp.ax / len, z: this.gp.ay / len, valid: true };  // auto-fire while pushed
    }
    if (this.right.active) {
      const len = Math.hypot(this.right.dx, this.right.dy);
      if (len < AIM_DEADZONE) return { x: 0, z: 0, valid: false };
      return { x: this.right.dx / len, z: this.right.dy / len, valid: true };
    }
    return { x: 0, z: 0, valid: false, useMouse: true };
  }
}
