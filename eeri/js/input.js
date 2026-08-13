// EERI — input. Keyboard + on-screen touch buttons, all feeding the same
// named flags so nothing downstream knows which is in use.

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
  KeyE: 'action', Enter: 'action',
};

export class Input {
  constructor() {
    this.down = {};      // held state by name
    this.pressed = {};   // edge: went down since last consume
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
    }
  }
}
