// SUDS JACK — input.
//
// Two verbs, three ways in, and every path feeds the SAME two getters so
// nothing downstream knows which one you are using: `spin()` is -1..1 around
// the rim, `dive()` is an edge-triggered request.
//
// The touch control is the one worth explaining. A tube is a ring, and a
// virtual stick on a ring is a lie — you would be aiming at a lane instead of
// travelling along the rim. So touch is a DRAG: move your thumb sideways
// anywhere on the screen and the rim turns with it, one screen-width to about
// two-thirds of the way round. A tap that goes nowhere is a dive. That means
// the same thumb does both and there is nothing on screen to cover the tube.

const RIM_PER_PX = 2.6;      // rim units per screen width of drag
const TAP_MS = 250;
const TAP_PX = 14;

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this._dive = false;
    this._drag = 0;           // -1..1, decays each frame it is read
    this._touch = null;
    this._padDive = false;
    this._padPrev = false;
    this.sawTouch = false;

    addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyS'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') this._dive = true;
    });
    addEventListener('keyup', e => this.keys.delete(e.code));

    const start = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      if (e.target.closest && e.target.closest('button, a')) return;
      this.sawTouch = true;
      this._touch = { id: t.identifier ?? 'mouse', x: t.clientX, x0: t.clientX, t0: performance.now(), moved: 0 };
      e.preventDefault();
    };
    const move = (e) => {
      if (!this._touch) return;
      const list = e.changedTouches ? [...e.changedTouches] : [e];
      const t = list.find(x => (x.identifier ?? 'mouse') === this._touch.id);
      if (!t) return;
      const dx = t.clientX - this._touch.x;
      this._touch.x = t.clientX;
      this._touch.moved += Math.abs(dx);
      this._drag += (dx / innerWidth) * RIM_PER_PX;
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
    if (a && !this._padPrev) this._dive = true;
    this._padPrev = a;
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
}
