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
const LATCH = 4;              // frames a released key goes on counting for

const KEYS = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
  fire: ['KeyX', 'KeyJ', 'Enter'], gun: ['KeyE', 'KeyQ'],
  // Shift is Prince of Persia's own careful-step key, and it keeps that job
  // here: held, a direction places one foot instead of taking a stride, and
  // with the sword out it is the parry.
  careful: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
  // the bench's own: swapping between driving him and looking at one animation
  mode: ['Tab', 'KeyG'],
  // and the bench's other one: nothing here can hurt him, so H hits him.
  // Held with SHIFT it is the energy hit instead of the knockback.
  hit: ['KeyH'],
  // and the sound off, because a bench you have to mute at the tab is worse
  mute: ['KeyM'],
};

export class Input {
  constructor(scr) {
    this.scr = scr;
    this.held = new Set();
    this.dir = 0; this.dirHeld = 0;
    this.up = false; this.down = false;
    this.jump = false; this.fire = false; this.gun = false; this.careful = false;
    this.jumpPress = false; this.firePress = false; this.gunPress = false;
    this.carefulPress = false;
    this.pausePress = false; this.anyPress = false;
    this.pause = false;
    this.modeHeld = false; this.modePress = false;
    this.touch = false;
    // A touchscreen says so before it is touched. Waiting for the first tap
    // meant a phone showed an empty control panel until you guessed where to
    // press — the same media query the arcade shell uses for its own button.
    this.coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
    // A key pressed and released between two polls never happened at all.
    // At sixty frames a second a frame is 16ms and a brisk tap is shorter than
    // that, so every held key is kept alive for a few frames after it comes up
    // — which is what makes a TAP mean one step, one turn, one climb, instead
    // of meaning nothing. The presses (jump, fire) already had edges; the holds
    // (left, right, up, down, careful) had nothing and were being dropped.
    this.latch = {};
    this.zones = [];                // filled in by the HUD each frame
    this.pointers = new Map();
    this.padPrev = [];

    addEventListener('keydown', e => {
      if (e.repeat) return;
      const ks = this.names(e.code);
      if (!ks.length) return;
      e.preventDefault();
      for (const k of ks) { this.held.add(k); this.latch[k] = LATCH; this.edge(k); }
    });
    addEventListener('keyup', e => {
      const ks = this.names(e.code);
      if (!ks.length) return;
      e.preventDefault();
      for (const k of ks) this.held.delete(k);
    });
    addEventListener('blur', () => { this.held.clear(); this.latch = {}; });

    const surf = document.getElementById('screen');
    // A finger going down is an EDGE in its own right. A tap can begin and end
    // inside a single frame, so a poll that only looks at which pointers are
    // currently held will miss it entirely — which is what made the title
    // screen ignore taps while answering every key.
    const set = (id, on, x, y) => {
      this.touch = true;
      if (!on) { this.pointers.delete(id); return; }
      this.anyPress = true;
      // latch whichever button it landed on, so a quick tap survives to the
      // next poll the way a key press does
      const p = this.scr.toDisplay(x, y);
      for (const q of this.zones) {
        if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) this.latch[q.name] = LATCH;
      }
      // display space, not picture space: the pad is drawn on the display
      // canvas, and in portrait it is not over the picture at all
      this.pointers.set(id, this.scr.toDisplay(x, y));
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

    // The editor needs a POINTER, which nothing else here does — the game is
    // played with a stick and four buttons. Kept as raw client coordinates and
    // converted by whoever is looking, because only the editor knows it wants
    // picture space rather than display space.
    const track = (e, down) => {
      this.point = { x: e.clientX, y: e.clientY };
      if (down !== null) {
        if (down && !this.pointDown) this.pointPress = true;
        if (!down && this.pointDown) this.pointRelease = true;
        this.pointDown = down;
        this.pointButton = e.button ?? 0;
      }
    };
    surf.addEventListener('pointerdown', e => track(e, true));
    surf.addEventListener('pointermove', e => track(e, null));
    surf.addEventListener('pointerup', e => track(e, false));
    surf.addEventListener('pointercancel', e => track(e, false));
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
    if (k === 'careful') this.carefulPress = true;
    if (k === 'pause') this.pausePress = true;
    if (k === 'mode') this.modePress = true;
    if (k === 'hit') this.hitPress = true;
    if (k === 'mute') this.mutePress = true;
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
    const wasJump = this.jump, wasFire = this.fire, wasGun = this.gun, wasCareful = this.careful, wasPause = this.pause;
    const on = k => this.held.has(k) || this.latch[k] > 0;
    let L = on('left'), R = on('right');
    let U = on('up'), D = on('down');
    let J = on('jump'), F = on('fire'), G = on('gun');
    let K = on('careful');
    let MO = on('mode');
    let P = on('pause');

    if (this.touch) {
      // same latch as the keys: a thumb can go down and up inside one frame
      const z = n => this.zoneHeld(n) || this.latch[n] > 0;
      L = L || z('left'); R = R || z('right');
      U = U || z('up'); D = D || z('down');
      // the up pad is the jump button too, same as the arrow key is
      J = J || z('jump') || U; F = F || z('fire'); G = G || z('gunbtn');
      K = K || z('careful');
      MO = MO || z('mode');
      P = P || z('menu');
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      L = L || ax < -0.4 || p.buttons[14]?.pressed;
      R = R || ax > 0.4 || p.buttons[15]?.pressed;
      U = U || ay < -0.5 || p.buttons[12]?.pressed;
      D = D || ay > 0.5 || p.buttons[13]?.pressed;
      J = J || p.buttons[0]?.pressed || (p.axes[3] ?? 0) < -0.55 || p.buttons[11]?.pressed;
      F = F || p.buttons[2]?.pressed || p.buttons[7]?.pressed || p.buttons[5]?.pressed;
      G = G || p.buttons[3]?.pressed;
      K = K || p.buttons[1]?.pressed || p.buttons[4]?.pressed || p.buttons[6]?.pressed;
      P = P || p.buttons[9]?.pressed;
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
    if (K && !wasCareful) this.carefulPress = true;
    if (P && !wasPause) this.pausePress = true;
    if ((J && !wasJump) || (F && !wasFire) || (G && !wasGun) || (K && !wasCareful)) this.anyPress = true;
    if (MO && !this.modeHeld) this.modePress = true;
    this.modeHeld = MO;
    this.jump = J; this.fire = F; this.gun = G; this.careful = K;
    this.pause = P;
    // one tick off every latch, once, at the end — decrementing inside the
    // tests above would take several off a key read more than once
    for (const k in this.latch) if (this.latch[k] > 0) this.latch[k]--;
  }

  // called at the end of a frame: edges last exactly one frame
  flush() {
    this.jumpPress = this.firePress = this.gunPress = this.carefulPress = false;
    this.pausePress = false; this.anyPress = false;
    this.modePress = false; this.hitPress = false; this.mutePress = false;
    this.pointPress = false; this.pointRelease = false;
  }
}
