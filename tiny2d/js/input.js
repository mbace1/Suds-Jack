// ── Input ──────────────────────────────────────────────────────────────────
// Endless is a one-button game and the button is "anywhere". Hold to press,
// release to pop. The only secondary verb is a trick, which has to be reachable
// with the same thumb that is already holding — so it is an upward flick during
// the hold, or a second finger tapping anywhere. On desktop it is a key.
//
// Touches that start on a DOM control are left alone so the menu and pause
// buttons stay tappable (same rule as hyperdagger/js/input.js).

const PRESS_KEYS = new Set(['Space', 'ArrowDown', 'KeyS']);
const TRICK_KEYS = new Set(['ArrowUp', 'KeyW', 'KeyX', 'KeyJ']);
const FLICK_PX   = 42;    // upward travel that counts as a trick flick
const FLICK_MS   = 260;

export class Input {
  constructor(el = window) {
    this.keyPress = false;
    this.pointerPress = false;
    this.trickQ = 0;
    this.enabled = true;
    this.pointers = new Map();   // id -> { y0, t0, flicked }

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (PRESS_KEYS.has(e.code)) { this.keyPress = true; e.preventDefault(); }
      if (TRICK_KEYS.has(e.code)) { this.trickQ++; e.preventDefault(); }
    });
    addEventListener('keyup', (e) => {
      if (PRESS_KEYS.has(e.code)) { this.keyPress = false; e.preventDefault(); }
    });
    addEventListener('blur', () => {
      this.keyPress = false;
      this.pointerPress = false;
      this.pointers.clear();
    });

    const isControl = (t) => t && t.closest && t.closest('button, a, .ui-click');

    el.addEventListener('pointerdown', (e) => {
      if (isControl(e.target)) return;
      // A second finger while one is already down is the trick tap.
      if (this.pointers.size > 0) this.trickQ++;
      this.pointers.set(e.pointerId, { y0: e.clientY, t0: performance.now(), flicked: false });
      this.pointerPress = true;
    }, { passive: true });

    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p || p.flicked) return;
      const dy = e.clientY - p.y0;
      const dt = performance.now() - p.t0;
      if (dy < -FLICK_PX && dt < FLICK_MS) {
        p.flicked = true;
        this.trickQ++;
      } else if (dt > FLICK_MS) {
        // Past the window: re-arm from the current position so a later flick
        // in the same long hold still reads.
        p.y0 = e.clientY;
        p.t0 = performance.now();
      }
    }, { passive: true });

    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.pointerPress = false;
    };
    el.addEventListener('pointerup', up, { passive: true });
    el.addEventListener('pointercancel', up, { passive: true });
  }

  get pressing() { return this.enabled && (this.keyPress || this.pointerPress); }

  consumeTrick() {
    if (!this.enabled || this.trickQ === 0) return false;
    this.trickQ = 0;
    return true;
  }

  clear() {
    this.keyPress = false;
    this.pointerPress = false;
    this.trickQ = 0;
    this.pointers.clear();
  }
}
