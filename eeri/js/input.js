// EERI — input. Gamepad, keyboard and on-screen buttons, all feeding the
// same named flags so nothing downstream knows which is in use.
//
// CONTROLLER FIRST (DESIGN.md §5, house convention). The pad is read here
// natively rather than having hub/padkeys.js synthesise key events at us —
// synthetic key events are untrusted, and a game that reads a pad itself
// does not need the bridge. Nothing in this game wants a second stick, a
// trigger or a pointer: a direction, Ⓐ to jump, Ⓑ to act.
//
// The poll only ever acts on EDGES of its own previous state, so a pad
// being idle never clobbers a key being held, and the three paths coexist.

import { art } from './glyphs.js?v=30';
import { t } from './lang.js?v=30';

// which string names each control, for the accessible name on its button
const CTL_KEY = {
  left: 'ctlLeft', right: 'ctlRight', up: 'ctlUp',
  down: 'ctlDown', jump: 'ctlJump', action: 'ctlAction', menu: 'ctlMenu',
};

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  KeyE: 'action', Enter: 'action',
  // SELECT and START both open the menu, and so does Esc — the house key
  // for "let me out of this" on every other cabinet here
  Escape: 'menu', Backquote: 'menu',
};

const DEAD = 0.4;   // generous: a six-year-old rests a thumb on the stick

export class Input {
  constructor() {
    this.down = {};      // held state by name
    this.pressed = {};   // edge: went down since last consume
    this.padSeen = false;
    addEventListener('keydown', (e) => {
      const n = KEYS[e.code]; if (!n) return;
      if (!this.down[n]) this.pressed[n] = true;
      this.down[n] = true;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => {
      const n = KEYS[e.code]; if (n) this.down[n] = false;
    });
    // A THUMB TAKES THE CONTROLS BACK. `padSeen` strips the on-screen pad
    // (main.js), and a pad that has gone quiet is not a pad that has gone
    // away — only a touch says that. Without this, unplugging a controller
    // mid-run leaves a phone with no way to move.
    addEventListener('touchstart', () => { this.padSeen = false; }, { passive: true });
  }

  // The Gamepad API has no press events, so this is polled once a frame.
  // D-pad OR left stick for direction; A = jump, B (or X) = action.
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) return;
    const prev = this._pad || (this._pad = {});
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const lx = gp.axes[0] || 0, ly = gp.axes[1] || 0;
    const now = {
      left:   b(14) || lx < -DEAD,
      right:  b(15) || lx > DEAD,
      up:     b(12) || ly < -DEAD,
      down:   b(13) || ly > DEAD,
      jump:   b(0),
      action: b(1) || b(2),
      // 8 = Select/Back, 9 = Start/Menu on every standard mapping
      menu:   b(8) || b(9),
    };
    for (const k in now) {
      if (now[k] === prev[k]) continue;
      prev[k] = now[k];
      if (now[k]) { this.press(k); this.padSeen = true; } else this.release(k);
    }
  }

  // ← −1 · 0 · +1 →
  axis() { return (this.down.right ? 1 : 0) - (this.down.left ? 1 : 0); }

  take(name) { const v = !!this.pressed[name]; this.pressed[name] = false; return v; }

  // programmatic path — the touch buttons and the smoke test both use it
  press(name)   { if (!this.down[name]) this.pressed[name] = true; this.down[name] = true; }
  release(name) { this.down[name] = false; }

  // Touch: four fixed buttons (≥44px, styled in index.html). pointerdown/up,
  // never click — the shell.js lesson.
  bindButtons(map) {
    for (const [id, name] of Object.entries(map)) {
      const el = document.getElementById(id); if (!el) continue;
      const on = (e) => { e.preventDefault(); this.press(name); };
      const off = (e) => { e.preventDefault(); this.release(name); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);

      // …and DRESSED here too: an illustrated face from `glyphs.js` and an
      // accessible name from `lang.js`. Both belong at the binding, because
      // this is the one place that already knows which button means which
      // action — putting the picture in the markup would let the glyph set
      // and the input map disagree about what ▲ does.
      if (!el.innerHTML.trim() && name !== 'menu') el.innerHTML = art(name);
      if (name === 'menu' && !el.innerHTML.trim()) el.textContent = id === 'tSt' ? 'START' : 'SELECT';
      el.setAttribute('aria-label', t(CTL_KEY[name] || 'ctlJump'));
      el.type = 'button';
    }
  }

  // ONE ZONE INSTEAD OF FOUR (owner, 2026-08-15). Every other cabinet here
  // that takes a thumb reads a stick, and the reason is not fashion: four
  // rectangles have three seams, and a thumb that drifts onto a seam stops
  // steering with no way to feel why. A stick has no seams — it has a
  // centre, and every direction is measured from it.
  //
  // Direction is the OFFSET FROM THE CONTROL'S CENTRE, not from where the
  // thumb landed. That matters on a drawn plate: the picture of the d-pad
  // is at a fixed place, so a stick that re-centred itself under the thumb
  // would drift away from the art within a few presses.
  //
  // The deadzone is deliberately generous — a six-year-old rests a thumb on
  // the control between moves, and the same 0.4 the gamepad uses.
  bindStick(id) {
    const el = document.getElementById(id); if (!el) return;
    const knob = el.querySelector('i');
    const DZ = 0.34;                 // of the half-size, per axis
    let held = null;

    const clear = () => {
      for (const n of ['left', 'right', 'up', 'down']) this.release(n);
      el.classList.remove('on');
      if (knob) knob.style.transform = '';
    };
    const aim = (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      // press() only latches an edge, release() is idempotent, so calling
      // both every move is safe and keeps held state honest
      if (nx < -DZ) this.press('left'); else this.release('left');
      if (nx > DZ) this.press('right'); else this.release('right');
      if (ny < -DZ) this.press('up'); else this.release('up');
      if (ny > DZ) this.press('down'); else this.release('down');
      if (knob) {
        const c = (v) => Math.max(-1, Math.min(1, v)) * 33;
        knob.style.transform = `translate(${c(nx)}%, ${c(ny)}%)`;
      }
    };

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      held = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('on');
      aim(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (held !== e.pointerId) return;
      e.preventDefault();
      aim(e);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      el.addEventListener(ev, (e) => {
        if (held !== e.pointerId) return;
        held = null;
        clear();
      });
    }
  }
}
