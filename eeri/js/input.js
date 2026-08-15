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

import { art } from './glyphs.js?v=15';
import { t } from './lang.js?v=15';

// which string names each control, for the accessible name on its button
const CTL_KEY = {
  left: 'ctlLeft', right: 'ctlRight', up: 'ctlUp',
  down: 'ctlDown', jump: 'ctlJump', action: 'ctlAction',
};

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  KeyE: 'action', Enter: 'action',
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
      if (!el.innerHTML.trim()) el.innerHTML = art(name);
      el.setAttribute('aria-label', t(CTL_KEY[name] || 'ctlJump'));
      el.type = 'button';
    }
  }
}
