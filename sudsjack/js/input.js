// SUDS JACK — input.
//
// Three verbs, three ways in, and every path feeds the SAME getters so
// nothing downstream knows which one you are using: `spin()` is -1..1 across
// the channel, `dive()` and `jump()` are edge-triggered requests.
//
// The touch control is the one worth explaining. A tube is a ring, and a
// virtual stick on a channel is a lie — you would be aiming at a lane instead
// of travelling across the floor. So touch is a DRAG: move your thumb sideways
// anywhere on the screen and Jack rides with it. A tap that goes nowhere is a
// dive, and a flick UP is a jump. That means one thumb does all three and
// there is nothing on screen covering the channel.

const RIM_PER_PX = 2.6;      // rim units per screen width of drag
const TAP_MS = 250;
const TAP_PX = 14;

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this._dive = false;
    this._jump = false;
    this._drag = 0;           // -1..1, decays each frame it is read
    this._touch = null;
    this._padDive = false;
    this._padPrev = false;
    this._padStartPrev = false;
    this._start = false;      // edge-triggered "get me into a run"
    this.sawTouch = false;

    addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS', 'KeyW'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') this._dive = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this._jump = true;
    });
    addEventListener('keyup', e => this.keys.delete(e.code));

    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (e.target.closest && e.target.closest('button, a')) return;
      this.sawTouch = true;
      this._touch = { id: t.identifier ?? 'mouse', x: t.clientX, y: t.clientY, y0: t.clientY, t0: performance.now(), moved: 0, up: 0 };
      e.preventDefault();
    };
    const move = (e) => {
      if (!this._touch) return;
      const list = e.changedTouches ? [...e.changedTouches] : [e];
      const t = list.find(x => (x.identifier ?? 'mouse') === this._touch.id);
      if (!t) return;
      const dx = t.clientX - this._touch.x;
      const dy = t.clientY - this._touch.y;
      this._touch.x = t.clientX;
      this._touch.y = t.clientY;
      this._touch.moved += Math.abs(dx);
      this._touch.up = Math.max(this._touch.up, this._touch.y0 - t.clientY);
      // a flick UP is a jump, and it must not also read as a ride: a thumb
      // travelling upward is not asking to go sideways
      if (this._touch.up > 46 && Math.abs(dy) > Math.abs(dx)) {
        this._jump = true;
        this._touch.y0 = t.clientY;      // one jump per flick
      } else {
        this._drag += (dx / innerWidth) * RIM_PER_PX;
      }
      e.preventDefault();
    };
    const end = (e) => {
      if (!this._touch) return;
      const quick = performance.now() - this._touch.t0 < TAP_MS;
      if (quick && this._touch.moved < TAP_PX) this._dive = true;
      this._touch = null;
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
    canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') start(e); });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') move(e); });
    canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') end(e); });
  }

  // Called once a frame, before the getters. A pad feeds the same two values
  // as everything else — nothing downstream has a branch for it.
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = [...pads].find(Boolean);
    if (!p) { this._padAxis = 0; return; }
    const dead = v => (Math.abs(v) < 0.2 ? 0 : v);
    let x = dead(p.axes[0] || 0);
    if (p.buttons[14] && p.buttons[14].pressed) x = -1;
    if (p.buttons[15] && p.buttons[15].pressed) x = 1;
    this._padAxis = x;
    const a = !!(p.buttons[0] && p.buttons[0].pressed);
    const st = !!(p.buttons[9] && p.buttons[9].pressed);
    if (a && !this._padPrev) { this._dive = true; this._start = true; }
    if (st && !this._padStartPrev) this._start = true;
    this._padPrev = a;
    this._padStartPrev = st;
    // X or Y — whichever the pad calls them, the two face buttons that are
    // not the dive
    const jumpBtn = !!(p.buttons[2] && p.buttons[2].pressed)
      || !!(p.buttons[3] && p.buttons[3].pressed);
    if (jumpBtn && !this._padJumpPrev) this._jump = true;
    this._padJumpPrev = jumpBtn;
  }

  spin() {
    let v = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) v -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) v += 1;
    if (v === 0 && this._padAxis) v = this._padAxis;
    if (v === 0 && this._drag) {
      v = Math.max(-1, Math.min(1, this._drag * 9));
    }
    // the drag is a rate, not a position: it bleeds away so a thumb held
    // still does not keep turning the rim
    this._drag *= 0.55;
    if (Math.abs(this._drag) < 1e-4) this._drag = 0;
    return v;
  }

  dive() { const d = this._dive; this._dive = false; return d; }

  jump() { const j = this._jump; this._jump = false; return j; }

  // A / Start off the pad, read only when there is no run to be in. Keyboard
  // and pointer have their own ways in on the buttons themselves.
  start() { const s = this._start; this._start = false; return s; }

  // Called whenever a run begins or ends. Without this the SAME press that
  // starts a run is still sitting in `_dive` when the first frame reads it,
  // so Jack leaves the mouth before you have seen the level — and a press
  // spent diving during play would still be in `_start` at the recap and
  // restart it under you.
  clearPending() { this._dive = false; this._jump = false; this._start = false; this._drag = 0; }
}
