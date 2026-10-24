// input.js — touch, keys + mouse, and pad, reduced to one frame of input,
// as 1.x read them (js/input.js at v268; docs/port-1x/player-controls.md
// §6, §8.1, §10-§13).
//
// Touch is 1.x's twin-stick: a touch on the left half of the screen is a
// floating move stick (analog, no deadzone, full at 60 px), a touch on the
// right half a floating aim stick that aims and fires past 15 px. 1.x
// dashed on every let-go of the aim stick; since v18 only a FLICK of it
// dashes (owner, 2026-10-23), and how long and how fast the flick was says
// how far and how fast the dash goes (js/flick.js reads it, hero.js
// dashPlan prices it). A plain let-go, a tap or the system cancelling the
// touch is no dash. A second finger on a side already held is ignored; the
// side is decided where the thumb lands. The top-centre strip is the pause
// button.
// Keys: WASD / arrows move (normalised), Space dashes when it is RELEASED (1.x
// since its first prototype), Esc pauses. 1.x paused on Esc's keyup
// (input.js:48); here it is the keydown, because the pause menu (ui.js)
// takes Esc on keydown to resume and a keyup pause would then pause the run
// again on the same press. P is a second pause key, 2.0's own. The mouse
// aims where it points and fires while any button is held. Pad: the left
// stick moves and the right stick aims and fires past a radial deadzone (the
// raw values beyond it, as 1.x), A / RB / RT dash, Start pauses.
//
// The three are MERGED the way 1.x merged them (input.js:170-208), not
// switched: a pad stick that is pushed wins, then a touch stick that is held,
// then the keys and the mouse. `source` is what the HUD reads (which hint,
// whether to draw the sticks); each frame's `out.source` says which device
// the aim came from, so main.js knows when to cast the mouse ray.
//
// Output is in SCREEN terms (x right, y down); main.js turns it into the
// world, because only it knows where the camera is. `dash` is false, true
// (a button: 1.x's own dash) or a flick's gesture { kind: 'flick', sL, sV,
// dirX, dirY }, its direction in screen axes too.
import { TUNING } from './tuning.js?v=41';
import { analyseTouch } from './flick.js?v=41';

const I = TUNING.input;
// the standard Gamepad mapping, bound as 1.x bound it (input.js:135-150)
const PAD_DASH = [0, 5, 7];        // A / Cross, RB / R1, RT / R2, one edge for the three
const PAD_PAUSE = 9;               // Start / Options

export class Input {
  constructor(target) {
    this.left = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, hist: [], wander: 0 };
    this.right = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, hist: [], wander: 0 };
    this.lastGesture = null;     // the aim stick's last let-go as flick.js read it (the ?fps readout, the tests)
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, seen: false };
    this.pad = { mx: 0, my: 0, ax: 0, ay: 0 };
    this.source = 'touch';
    this._dash = false;          // edges, consumed by read()
    this._pause = false;
    this._space = false;         // Space went down during play, so its release is a dash
    this._padDash = false;       // last poll's buttons, for the edges
    this._padPause = false;
    this.enabled = false;        // menus have the screen until play starts
    this._live = false;          // enabled at the last read too: the press that started the run is not a dash
    try { this.haptics = localStorage.getItem('toko2.haptics') !== '0'; } catch { this.haptics = true; }   // opt-out (haptics.js:13)

    const opt = { passive: false };
    const ui = (e) => e.target?.closest?.('button, .menu, #pausebtn');
    target.addEventListener('touchstart', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'start'); }, opt);
    target.addEventListener('touchmove', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'move'); }, opt);
    target.addEventListener('touchend', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'end'); }, opt);
    target.addEventListener('touchcancel', (e) => { if (ui(e)) return; e.preventDefault(); this._touch(e, 'cancel'); }, opt);

    addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && this.enabled) this._space = true; }
      if (e.repeat) return;
      this.keys.add(e.code); this.source = 'keys';
      // in a menu the menu has Esc (ui.js); here it only pauses a run in play
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.enabled) this._pause = true;
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space' && this._space) { this._space = false; this._dash = true; }   // 1.x input.js:46
    });
    // let go of everything when the page loses focus or is hidden (a phone
    // switching apps hides the page; 1.x reset on neither: trap T11)
    addEventListener('blur', () => this.reset());
    addEventListener('visibilitychange', () => { if (typeof document !== 'undefined' && document.hidden) this.reset(); });
    target.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.seen = true; this.source = 'keys'; });
    // any button fires (1.x input.js:51-52)
    target.addEventListener('mousedown', (e) => { if (ui(e)) return; this.mouse.down = true; this.mouse.seen = true; this.source = 'keys'; });
    addEventListener('mouseup', () => { this.mouse.down = false; });
    target.addEventListener('contextmenu', (e) => { if (this.enabled) e.preventDefault(); });   // the right button is a trigger in play
  }

  _release(s) { s.active = false; s.id = null; s.dx = 0; s.dy = 0; s.hist = []; s.wander = 0; }

  // keys, buttons and sticks let go of; a stick let go of this way is no dash
  reset() {
    this.keys.clear(); this.mouse.down = false; this._space = false;
    this._release(this.left); this._release(this.right);
  }

  _touch(e, kind) {
    this.source = 'touch';
    for (const t of e.changedTouches) {
      if (kind === 'start') {
        if (!this.enabled) continue;
        // the pause strip is mapped to no stick, so its finger never moves one (trap T5)
        if (t.clientY < I.pauseStripHeight && Math.abs(t.clientX - innerWidth / 2) < I.pauseStripHalfWidth) { this._pause = true; continue; }
        const s = t.clientX < innerWidth / 2 ? this.left : this.right;
        if (s.active) continue;
        Object.assign(s, { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0, hist: [{ x: t.clientX, y: t.clientY, t: e.timeStamp }], wander: 0 });
      } else {
        const s = this.left.id === t.identifier ? this.left : this.right.id === t.identifier ? this.right : null;
        if (!s) continue;
        if (kind === 'move') {
          s.dx = t.clientX - s.ox; s.dy = t.clientY - s.oy;
          s.wander = Math.max(s.wander, Math.hypot(s.dx, s.dy));
          s.hist.push({ x: t.clientX, y: t.clientY, t: e.timeStamp });
          // the touchdown and the last 2 × strokeMs are all a flick can need
          while (s.hist.length > 3 && s.hist[1].t < e.timeStamp - 2 * I.flick.strokeMs) s.hist.splice(1, 1);
        } else {
          if (s === this.right && kind === 'end') this._letGo(s, t, e.timeStamp);
          this._release(s);
        }
      }
    }
  }

  // the aim stick let go: a flick dashes, as far and as fast as it was
  // flicked; anything else is the thumb coming off the glass
  _letGo(s, t, stamp) {
    const F = I.flick;
    s.hist.push({ x: t.clientX, y: t.clientY, t: stamp });
    const g = analyseTouch(s.hist, F, I.stickRadius);
    g.wander = Math.max(g.wander, s.wander);
    g.lenPx = g.L * I.stickRadius; g.pxPerMs = (g.V * I.stickRadius) / 1000;   // for the ?fps readout, in the units a thumb knows
    if (g.kind === 'tap' && s.wander > F.tapPx) g.kind = 'release';
    this.lastGesture = g;
    if (g.kind === 'flick' || (g.kind === 'tap' && F.tap)) this._dash = g.kind === 'flick' ? g : true;
  }

  // One frame of input. `heroScreen` is where the hero is on screen (a
  // fallback mouse aim, before main.js casts its ray); the result is in
  // screen axes, x right, y down.
  read(heroScreen) {
    const out = { mx: 0, my: 0, ax: 0, ay: 0, aim: false, fire: false, dash: false, pause: false, source: this.source };
    const live = this.enabled && this._live;
    this._live = this.enabled;
    this._pollPad();
    const P = this.pad, R = I.stickRadius, L = this.left, Rt = this.right;

    // move: the pad's stick, else the touch stick, else the keys (input.js:170-191)
    if (P.mx || P.my) {
      const l = Math.hypot(P.mx, P.my), k = l > 1 ? 1 / l : 1;
      out.mx = P.mx * k; out.my = P.my * k;
    } else if (L.active) {
      const l = Math.hypot(L.dx, L.dy), k = l > R ? R / l : 1;
      out.mx = (L.dx * k) / R; out.my = (L.dy * k) / R;
    } else {
      const k = this.keys;
      const x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const y = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
      const l = Math.hypot(x, y);
      if (l > 0) { out.mx = x / l; out.my = y / l; }
    }

    // aim, which is also the trigger: the pad's stick, else the touch stick,
    // else the mouse while a button is held (input.js:197-208, main.js:9228-9237)
    if (P.ax || P.ay) {
      const l = Math.hypot(P.ax, P.ay);
      out.ax = P.ax / l; out.ay = P.ay / l; out.aim = out.fire = true; out.source = 'pad';
    } else if (Rt.active) {
      const l = Math.hypot(Rt.dx, Rt.dy);
      if (l >= I.aimDeadzone) { out.ax = Rt.dx / l; out.ay = Rt.dy / l; out.aim = out.fire = true; }
      out.source = 'touch';
    } else if (this.mouse.seen) {
      out.source = 'keys';
      out.fire = this.mouse.down;
      if (heroScreen) {
        const dx = this.mouse.x - heroScreen.x, dy = this.mouse.y - heroScreen.y, d = Math.hypot(dx, dy);
        if (d > 0) { out.ax = dx / d; out.ay = dy / d; out.aim = true; }
      }
    }

    out.dash = live && this._dash; out.pause = live && this._pause;
    this._dash = false; this._pause = false;
    if (!this.enabled) { out.mx = out.my = 0; out.aim = out.fire = false; }
    return out;
  }

  // The pad is polled (the Gamepad API has no events for sticks), once a
  // frame (1.x pollGamepad, input.js:121-156): a stick inside the radial
  // deadzone is still, past it the RAW values (no rescale from the edge, so
  // the slowest walk is a fifth of full speed); the three dash buttons are
  // one edge, so holding one and pressing another is not a second dash.
  _pollPad() {
    const P = this.pad;
    P.mx = P.my = P.ax = P.ay = 0;
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null;
    for (const x of pads) if (x && x.connected) { p = x; break; }
    if (!p) { this._padDash = this._padPause = false; return; }
    const dz = I.padDeadzone;
    const lx = p.axes[0] || 0, ly = p.axes[1] || 0, rx = p.axes[2] || 0, ry = p.axes[3] || 0;
    if (Math.hypot(lx, ly) > dz) { P.mx = lx; P.my = ly; }
    if (Math.hypot(rx, ry) > dz) { P.ax = rx; P.ay = ry; }
    const btn = (i) => !!p.buttons[i]?.pressed;
    const dash = PAD_DASH.some(btn), pause = btn(PAD_PAUSE);
    if (dash && !this._padDash) this._dash = true;
    if (pause && !this._padPause) this._pause = true;
    this._padDash = dash; this._padPause = pause;
    if (P.mx || P.my || P.ax || P.ay || dash || pause) this.source = 'pad';
  }

  // 1.x's buzz (haptics.js; Android Chrome only, a silent no-op elsewhere),
  // for main.js to hand the sim's events to: a short one for a hit, a
  // shaped one for the last.
  feel(e) {
    if (!this.haptics || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    // Chrome refuses (and logs) a buzz before the page has had a tap or a
    // click; a pad press is not one, so a pad-only player never gets here
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    const V = TUNING.heroLook.haptics;
    if (e.type === 'hurt' && e.lives > 0) navigator.vibrate(V.hit);
    else if (e.type === 'over') navigator.vibrate(V.death);
  }
}
