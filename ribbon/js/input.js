// Input for RIBBON — four directional reactions plus menu taps.
//
// Desktop:  ↑/W/Space = JUMP   ↓/S = SLIDE   ←/A = DODGE LEFT   →/D = DODGE RIGHT
//           Enter = start/confirm   Esc = pause   1/2/3 = pick a tune-up perk
// Touch:    swipe up/down/left/right anywhere to react; tap a card/button to confirm.
const SWIPE_MIN = 28;       // px of travel before a touch counts as a directional swipe

export class InputManager {
  constructor() {
    this.keys = {};
    this._touches = new Map();  // id → { x0, y0, t0 }
    this.onAction = null;       // (dir) — 'up' | 'down' | 'left' | 'right'
    this.onStart  = null;
    this.onPause  = null;
    this.onPerk   = null;       // (index 0..n)
    this.onTap    = null;       // (x, y) — generic tap fallback (start screens)
    this.tapTargets = [];       // [{ x, y, w, h, fn }] — set by the HUD while a menu is up
    this._init();
  }

  _hitTarget(x, y) {
    for (const t of this.tapTargets) {
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) { t.fn(); return true; }
    }
    return false;
  }

  _init() {
    addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        switch (e.code) {
          case 'ArrowUp': case 'KeyW': case 'Space': this.onAction?.('up'); break;
          case 'ArrowDown': case 'KeyS':             this.onAction?.('down'); break;
          case 'ArrowLeft': case 'KeyA':             this.onAction?.('left'); break;
          case 'ArrowRight': case 'KeyD':            this.onAction?.('right'); break;
          case 'Enter':                              this.onStart?.(); break;
          case 'Escape':                             this.onPause?.(); break;
          case 'Digit1': case 'Numpad1':             this.onPerk?.(0); break;
          case 'Digit2': case 'Numpad2':             this.onPerk?.(1); break;
          case 'Digit3': case 'Numpad3':             this.onPerk?.(2); break;
        }
      }
      if (e.code === 'Space') e.preventDefault();   // stop the page from scrolling
      this.keys[e.code] = true;
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });

    const opt = { passive: false };
    addEventListener('touchstart', e => { e.preventDefault();
      for (const t of e.changedTouches) this._touches.set(t.identifier, { x0: t.clientX, y0: t.clientY, t0: performance.now() });
    }, opt);
    addEventListener('touchend', e => { e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this._touches.get(t.identifier); this._touches.delete(t.identifier);
        if (!s) continue;
        const dx = t.clientX - s.x0, dy = t.clientY - s.y0;
        if (Math.abs(dx) > SWIPE_MIN || Math.abs(dy) > SWIPE_MIN) {
          if (Math.abs(dx) > Math.abs(dy)) this.onAction?.(dx > 0 ? 'right' : 'left');
          else                             this.onAction?.(dy > 0 ? 'down' : 'up');
        } else {
          // A tap: route to a menu target first, otherwise the generic handler.
          if (!this._hitTarget(t.clientX, t.clientY)) this.onTap?.(t.clientX, t.clientY);
        }
      }
    }, opt);
    addEventListener('touchcancel', e => { for (const t of e.changedTouches) this._touches.delete(t.identifier); }, opt);

    // Mouse clicks drive the menus on desktop too (gameplay is keyboard).
    addEventListener('mousedown', e => {
      if (!this._hitTarget(e.clientX, e.clientY)) this.onTap?.(e.clientX, e.clientY);
    });
  }
}
