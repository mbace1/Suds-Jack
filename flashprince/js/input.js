// Keyboard, pad and thumbs, reduced to the six things the man understands.
//
// He only ever needs: which way, up, down, jump, fire, and the pistol in or
// out. Everything expressive about the movement comes from how LONG a direction
// is held — a tap is one step, a hold is a run — so this counts frames on the
// direction and hands that count to the hero, and the hero decides what it
// meant. There is no analogue anything: an eight-way pad in 1991 and a thumb in
// 2026 both resolve to the same three values.
//
// v3 movement-lab rule: a committed animation may delay a command, but it must
// not silently eat a sensible command pressed near the transition. Edges are
// therefore remembered for a few simulation frames. The hero still decides
// WHEN an action is physically legal; Input only remembers WHAT the player
// asked for. This is commitment without dead controls.

const KEYS = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  fire: ['KeyX', 'KeyJ', 'Enter'], gun: ['KeyE', 'ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
};

const BUFFER_FRAMES = { jump: 8, fire: 6, gun: 6 };

export class Input {
  constructor(scr) {
    this.scr = scr;
    this.held = new Set();
    this.dir = 0; this.dirHeld = 0;
    this.up = false; this.down = false;
    this.jump = false; this.fire = false; this.gun = false;
    this.jumpPress = false; this.firePress = false; this.gunPress = false;
    this.pausePress = false; this.anyPress = false;
    this.buffer = { jump: 0, fire: 0, gun: 0 };
    this.touch = false;
    this.zones = [];
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

  remember(k) {
    if (BUFFER_FRAMES[k]) this.buffer[k] = BUFFER_FRAMES[k];
  }

  edge(k) {
    if (k === 'jump') { this.jumpPress = true; this.remember('jump'); }
    if (k === 'fire') { this.firePress = true; this.remember('fire'); }
    if (k === 'gun') { this.gunPress = true; this.remember('gun'); }
    if (k === 'pause') this.pausePress = true;
    this.anyPress = true;
  }

  consume(k) {
    if (!(k in this.buffer)) return;
    this.buffer[k] = 0;
    if (k === 'jump') this.jumpPress = false;
    if (k === 'fire') this.firePress = false;
    if (k === 'gun') this.gunPress = false;
  }

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

    if (J && !wasJump) { this.jumpPress = true; this.remember('jump'); }
    if (F && !wasFire) { this.firePress = true; this.remember('fire'); }
    if (G && !wasGun) { this.gunPress = true; this.remember('gun'); }
    if ((J && !wasJump) || (F && !wasFire) || (G && !wasGun)) this.anyPress = true;
    this.jump = J; this.fire = F; this.gun = G;

    this.jumpPress = this.jumpPress || this.buffer.jump > 0;
    this.firePress = this.firePress || this.buffer.fire > 0;
    this.gunPress = this.gunPress || this.buffer.gun > 0;
  }

  flush() {
    this.jumpPress = this.firePress = this.gunPress = false;
    this.pausePress = false; this.anyPress = false;
    for (const k of Object.keys(this.buffer)) {
      if (this.buffer[k] > 0) this.buffer[k]--;
    }
  }
}
