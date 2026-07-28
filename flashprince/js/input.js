// Keyboard, pad and thumbs, reduced to the six things the man understands.
//
// He only ever needs: which way, up, down, jump, fire, and the pistol in or
// out. Everything expressive about the movement comes from how LONG a direction
// is held — a tap is one step, a hold is a run — so this counts frames on the
// direction and hands that count to the hero, and the hero decides what it
// meant. There is no analogue anything: an eight-way pad in 1991 and a thumb in
// 2026 both resolve to the same three values.

// Up is BOTH the direction and the jump, as it is in Prince of Persia — the
// same key that leaps also pulls you over a lip and stands you out of a crouch,
// because in all three of these games "up" means "commit upward" rather than
// "point upward". A code can therefore belong to two of these at once.
const KEYS = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  fire: ['KeyX', 'KeyJ', 'Enter'], gun: ['KeyE', 'ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
};

export class Input {
  constructor(scr) {
    this.scr = scr;
    this.held = new Set();
    this.dir = 0; this.dirHeld = 0;
    this.up = false; this.down = false;
    this.jump = false; this.fire = false; this.gun = false;
    this.jumpPress = false; this.firePress = false; this.gunPress = false;
    this.pausePress = false; this.anyPress = false;
    this.touch = false;
    this.zones = [];                // filled in by the HUD each frame
    this.pointers = new Map();
    this.padPrev = [];

    addEventListener('keydown', e => {
      if (e.repeat) return;
      const ks = this.names(e.code);
      if (!ks.length) return;
      e.preventDefault();
      for (const k of ks) { this.held.add(k); this.edge(k); }
    });
    addEventListener('keyup', e => {
      const ks = this.names(e.code);
      if (!ks.length) return;
      e.preventDefault();
      for (const k of ks) this.held.delete(k);
    });
    addEventListener('blur', () => this.held.clear());

    const surf = document.getElementById('screen');
    // A finger going down is an EDGE in its own right. A tap can begin and end
    // inside a single frame, so a poll that only looks at which pointers are
    // currently held will miss it entirely — which is what made the title
    // screen ignore taps while answering every key.
    const set = (id, on, x, y) => {
      this.touch = true;
      if (!on) { this.pointers.delete(id); return; }
      this.anyPress = true;
      this.pointers.set(id, this.scr.toPicture(x, y));
    };
    const down = e => {
      for (const t of e.changedTouches ?? [e]) set(t.identifier ?? 'm', true, t.clientX, t.clientY);
      e.preventDefault();
    };
    const up = e => {
      for (const t of e.changedTouches ?? [e]) set(t.identifier ?? 'm', false);
      e.preventDefault();
    };
    surf.addEventListener('touchstart', down, { passive: false });
    surf.addEventListener('touchmove', down, { passive: false });
    surf.addEventListener('touchend', up, { passive: false });
    surf.addEventListener('touchcancel', up, { passive: false });
    surf.addEventListener('contextmenu', e => e.preventDefault());
  }

  names(code) {
    const out = [];
    for (const k in KEYS) if (KEYS[k].includes(code)) out.push(k);
    return out;
  }

  edge(k) {
    if (k === 'jump') this.jumpPress = true;
    if (k === 'fire') this.firePress = true;
    if (k === 'gun') this.gunPress = true;
    if (k === 'pause') this.pausePress = true;
    this.anyPress = true;
  }

  // the on-screen pad. main.js declares where the buttons are so there is one
  // description of them and the drawing and the hit-testing cannot disagree.
  setZones(z) { this.zones = z; }

  zoneHeld(name) {
    const z = this.zones.find(q => q.name === name);
    if (!z) return false;
    for (const [, p] of this.pointers) {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) return true;
    }
    return false;
  }

  poll() {
    const wasJump = this.jump, wasFire = this.fire, wasGun = this.gun;
    let L = this.held.has('left'), R = this.held.has('right');
    let U = this.held.has('up'), D = this.held.has('down');
    let J = this.held.has('jump'), F = this.held.has('fire'), G = this.held.has('gun');

    if (this.touch) {
      L = L || this.zoneHeld('left'); R = R || this.zoneHeld('right');
      U = U || this.zoneHeld('up'); D = D || this.zoneHeld('down');
      // the up pad is the jump button too, same as the arrow key is
      J = J || this.zoneHeld('jump') || U; F = F || this.zoneHeld('fire'); G = G || this.zoneHeld('gunbtn');
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      L = L || ax < -0.4 || p.buttons[14]?.pressed;
      R = R || ax > 0.4 || p.buttons[15]?.pressed;
      U = U || ay < -0.5 || p.buttons[12]?.pressed;
      D = D || ay > 0.5 || p.buttons[13]?.pressed;
      J = J || p.buttons[0]?.pressed;
      F = F || p.buttons[2]?.pressed || p.buttons[7]?.pressed || p.buttons[5]?.pressed;
      G = G || p.buttons[3]?.pressed || p.buttons[1]?.pressed;
      if (p.buttons[9]?.pressed && !this.padPrev[9]) this.pausePress = true;
      this.padPrev = p.buttons.map(b => b.pressed);
      break;
    }

    const dir = R && !L ? 1 : L && !R ? -1 : 0;
    this.dirHeld = dir && dir === this.dir ? this.dirHeld + 1 : 0;
    this.dir = dir;
    this.up = U; this.down = D;

    // touch and pad have no keydown, so edges are derived here for everyone
    if (J && !wasJump) this.jumpPress = true;
    if (F && !wasFire) this.firePress = true;
    if (G && !wasGun) this.gunPress = true;
    if ((J && !wasJump) || (F && !wasFire) || (G && !wasGun)) this.anyPress = true;
    this.jump = J; this.fire = F; this.gun = G;
  }

  // called at the end of a frame: edges last exactly one frame
  flush() {
    this.jumpPress = this.firePress = this.gunPress = false;
    this.pausePress = false; this.anyPress = false;
  }
}
