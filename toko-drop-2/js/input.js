// input.js — touch, keys + mouse, and pad, reduced to one frame of input.
//
// Touch is 1.x's twin-stick (js/input.js at v268): a touch on the left half
// of the screen is a floating move stick, a touch on the right half a
// floating aim stick that fires while it is held, and LETTING GO of the aim
// stick dashes. The top-centre strip is the pause button. Keys: WASD/arrows
// move, the mouse aims, hold the button to fire, Space dashes, Esc pauses.
// Pad: left stick moves, right stick aims and fires, RT fires, A/RB/LB
// dash, Start pauses. Whichever was touched last is the one in charge.
//
// Output is in SCREEN terms (x right, y down); main.js turns it into the
// world, because only it knows where the camera is.
import { TUNING } from './tuning.js?v=4';

const I = TUNING.input;

export class Input {
  constructor(target) {
    this.left = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.right = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, seen: false };
    this.source = 'touch';
    this._dash = false;          // edges, consumed by read()
    this._pause = false;
    this._padPrev = {};
    this.enabled = false;        // menus have the screen until play starts

    const opt = { passive: false };
    const ui = (e) => e.target?.closest?.('button, .menu, #pausebtn');
    target.addEventListener('touchstart', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'start'); }, opt);
    target.addEventListener('touchmove', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'move'); }, opt);
    target.addEventListener('touchend', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'end'); }, opt);
    target.addEventListener('touchcancel', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'end'); }, opt);

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code); this.source = 'keys';
      if (e.code === 'Space') { this._dash = true; e.preventDefault(); }
      if (e.code === 'Escape' || e.code === 'KeyP') this._pause = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; this._release(this.left); this._release(this.right); });
    target.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.seen = true; this.source = 'keys'; });
    target.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.down = true; this.source = 'keys'; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
  }

  _release(s) { s.active = false; s.id = null; s.dx = 0; s.dy = 0; }

  _touch(e, kind) {
    this.source = 'touch';
    for (const t of e.changedTouches) {
      if (kind === 'start') {
        if (!this.enabled) continue;
        if (t.clientY < I.pauseStripHeight && Math.abs(t.clientX - innerWidth / 2) < I.pauseStripHalfWidth) { this._pause = true; continue; }
        const s = t.clientX < innerWidth / 2 ? this.left : this.right;
        if (s.active) continue;
        Object.assign(s, { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 });
      } else {
        const s = this.left.id === t.identifier ? this.left : this.right.id === t.identifier ? this.right : null;
        if (!s) continue;
        if (kind === 'move') { s.dx = t.clientX - s.ox; s.dy = t.clientY - s.oy; }
        else {
          if (s === this.right) this._dash = true;     // 1.x: releasing the aim stick dashes
          this._release(s);
        }
      }
    }
  }

  // One frame of input. `heroScreen` is where the hero is on screen (for the
  // mouse); the result is in screen axes, x right, y down.
  read(heroScreen) {
    const out = { mx: 0, my: 0, ax: 0, ay: 0, aim: false, fire: false, dash: false, pause: false, source: this.source };
    this._pad(out);
    if (out.source === 'pad') { this.source = 'pad'; }

    if (this.source === 'touch') {
      const R = I.stickRadius;
      const L = this.left, Rt = this.right;
      if (L.active) { const l = Math.hypot(L.dx, L.dy); const k = l > R ? R / l : 1; out.mx = (L.dx * k) / R; out.my = (L.dy * k) / R; }
      if (Rt.active) {
        const l = Math.hypot(Rt.dx, Rt.dy);
        if (l > I.aimDeadzone) { out.ax = Rt.dx / l; out.ay = Rt.dy / l; out.aim = true; out.fire = true; }
      }
    } else if (this.source === 'keys') {
      const k = this.keys;
      out.mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      out.my = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
      const l = Math.hypot(out.mx, out.my); if (l > 1) { out.mx /= l; out.my /= l; }
      if (this.mouse.seen && heroScreen) {
        const dx = this.mouse.x - heroScreen.x, dy = this.mouse.y - heroScreen.y, d = Math.hypot(dx, dy);
        if (d > 4) { out.ax = dx / d; out.ay = dy / d; out.aim = true; }
      }
      out.fire = this.mouse.down;
    }
    out.dash ||= this._dash; out.pause ||= this._pause;
    this._dash = false; this._pause = false;
    if (!this.enabled) { out.mx = out.my = 0; out.aim = out.fire = out.dash = false; }
    return out;
  }

  // The pad is polled (the Gamepad API has no events for sticks); buttons are
  // edge-detected here so a held button is one press.
  _pad(out) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = [...pads].find((x) => x && x.connected);
    if (!p) return;
    const dz = I.padDeadzone;
    const ax = (i) => { const v = p.axes[i] || 0; return Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz); };
    const btn = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const edge = (i) => { const now = btn(i), was = this._padPrev[i]; this._padPrev[i] = now; return now && !was; };
    const mx = ax(0), my = ax(1), rx = ax(2), ry = ax(3);
    const dash = edge(0) || edge(4) || edge(5), pause = edge(9), menuFire = btn(7);
    if (mx || my || rx || ry || dash || pause || menuFire) out.source = 'pad';
    if (out.source !== 'pad') return;
    out.mx = mx; out.my = my;
    const al = Math.hypot(rx, ry);
    if (al > 0.15) { out.ax = rx / al; out.ay = ry / al; out.aim = true; out.fire = true; }
    if (menuFire) out.fire = true;
    out.dash = dash; out.pause = pause;
  }
}
