// Three ways in, one reading out. Keys, a pad polled every frame, and touch:
// the left half of the screen is a lean (drag sideways; drag down to brake),
// the right half is the board (tap to pop, hold to tuck / grab).
//
// read() returns { lean, tuck, brake, jump, grab, any } — `jump` is an edge,
// true once per press, and `any` is any fresh press (a way to start).

const LEAN_PX = 90;

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.jumpQueued = false;
    this.anyQueued = false;
    this.startQueued = false;
    this.touchLean = 0; this.touchBrake = 0; this.touchTuck = 0;
    this.left = null; this.right = null;
    this.padPrev = { a: false, b: false, x: false, start: false };
    this.padSeen = false; this.touchSeen = false;
    this.pad = { lean: 0, tuck: 0, brake: 0, grab: 0 };

    addEventListener('keydown', e => {
      if (e.repeat) return;
      if (e.target && /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) e.preventDefault();
      if (['Space', 'KeyX', 'KeyK'].includes(e.code)) this.jumpQueued = true;
      if (['Enter', 'Space'].includes(e.code)) this.startQueued = true;
      this.anyQueued = true;
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    const isLeft = e => e.clientX < innerWidth / 2;
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      canvas.setPointerCapture?.(e.pointerId);
      this.touchSeen = e.pointerType !== 'mouse' || this.touchSeen;
      const t = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now() };
      if (isLeft(e) && !this.left) this.left = t;
      else if (!this.right) { this.right = t; this.touchTuck = 1; }
      this.anyQueued = true;
    });
    canvas.addEventListener('pointermove', e => {
      for (const t of [this.left, this.right]) if (t && t.id === e.pointerId) { t.x = e.clientX; t.y = e.clientY; }
      if (this.left) {
        this.touchLean = Math.max(-1, Math.min(1, (this.left.x - this.left.x0) / LEAN_PX));
        this.touchBrake = Math.max(0, Math.min(1, (this.left.y - this.left.y0 - 30) / 70));
      }
    });
    const up = e => {
      if (this.left && this.left.id === e.pointerId) { this.left = null; this.touchLean = 0; this.touchBrake = 0; }
      if (this.right && this.right.id === e.pointerId) {
        const dt = performance.now() - this.right.t0, d = Math.hypot(e.clientX - this.right.x0, e.clientY - this.right.y0);
        if (dt < 260 && d < 14) { this.jumpQueued = true; this.startQueued = true; }
        this.right = null; this.touchTuck = 0;
      }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) { this.pad.lean = 0; this.pad.tuck = 0; this.pad.brake = 0; this.pad.grab = 0; return; }
    this.padSeen = true;
    const ax = gp.axes[0] ?? 0;
    const dz = Math.abs(ax) < 0.12 ? 0 : (Math.abs(ax) - 0.12) / 0.88 * Math.sign(ax);
    let lean = dz * Math.abs(dz) ** 0.6 * Math.sign(dz || 1) * (dz ? 1 : 0);
    if (gp.buttons[14]?.pressed) lean = -1; else if (gp.buttons[15]?.pressed) lean = 1;
    this.pad.lean = lean;
    const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const v = i => gp.buttons[i]?.value ?? (b(i) ? 1 : 0);
    this.pad.tuck = Math.max(v(7), v(6), b(12) ? 1 : 0);
    this.pad.brake = (b(1) || b(13)) ? 1 : 0;
    this.pad.grab = b(2) || b(3) ? 1 : 0;
    const a = b(0);
    if (a && !this.padPrev.a) { this.jumpQueued = true; this.startQueued = true; this.anyQueued = true; }
    this.padPrev.a = a;
  }

  read() {
    this.pollPad();
    const k = this.keys;
    let lean = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) lean -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) lean += 1;
    lean += this.touchLean + this.pad.lean;
    const tuck = Math.max((k.has('ArrowUp') || k.has('KeyW') || k.has('ShiftLeft') || k.has('ShiftRight')) ? 1 : 0, this.touchTuck, this.pad.tuck);
    const brake = Math.max((k.has('ArrowDown') || k.has('KeyS')) ? 1 : 0, this.touchBrake, this.pad.brake);
    const grab = (k.has('KeyZ') || k.has('KeyJ') || k.has('ControlLeft')) ? 1 : Math.max(this.touchTuck, this.pad.grab);
    const out = { lean: Math.max(-1, Math.min(1, lean)), tuck, brake, jump: this.jumpQueued, grab: !!grab, any: this.anyQueued, start: this.startQueued };
    this.jumpQueued = false; this.anyQueued = false; this.startQueued = false;
    return out;
  }
  // drop a queued press (a start press must not also be a pop)
  clearPending() { this.jumpQueued = false; this.anyQueued = false; this.startQueued = false; }
}
