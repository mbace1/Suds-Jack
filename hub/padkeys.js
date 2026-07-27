// Controller support for the games that never grew their own.
//
// Six of the cabinets read a pad natively (Hyper Dagger, Toko Drop, SKLTR,
// Tiny Hawk, sudz, voxel) and this stays out of their way entirely. The rest
// are driven by the keyboard, by a pointer, or by DOM buttons — and all three
// of those can be fed from a pad without touching a line of the game's own
// code, which matters because half of them live on the deployed site rather
// than in this repo.
//
// Three modes, declared per game in games.js under `pad`:
//
//   { keys: { left: 'KeyA', a: 'Space', ... } }   stick/buttons -> key events
//   { pointer: true }                             A -> pointerdown/up on the canvas
//   { ui: true }                                  d-pad walks the page's own buttons
//
// The honest limits, stated once here rather than implied: a synthetic key
// event is not a trusted one, so this drives games that listen for keydown /
// keyup (all of these do) but cannot press a browser shortcut. And mouse-aimed
// games — Drop Cabal's crosshair, Neon Ronin's camera — get movement and their
// keyed actions from the pad, not aim. Aiming needs the game's own code.

import { watchPad } from './pad.js?v=7';

const KEY_LABEL = { Space: ' ', Escape: 'Escape', Enter: 'Enter' };
const keyOf = code => KEY_LABEL[code] ?? (code.startsWith('Key') ? code.slice(3).toLowerCase() : code);

function sendKey(type, code) {
  const ev = new KeyboardEvent(type, {
    code, key: keyOf(code), bubbles: true, cancelable: true,
    // a few of these games read e.keyCode, which is deprecated but still what
    // an older listener looks at
    keyCode: code.startsWith('Key') ? code.charCodeAt(3) : (code === 'Space' ? 32 : 0),
  });
  // ONE dispatch. It used to go to the focused element and to window, so a
  // listener on window heard every key twice — harmless for a held-keys map,
  // wrong for anything that counts presses (Tiny 2D's trick queue increments
  // per keydown, so a flick scored two). The event bubbles, so dispatching it
  // on the focused element reaches document and window listeners as well.
  (document.activeElement ?? document.body).dispatchEvent(ev);
}

// held state, so a stick pushed and kept there reads as a key held down
function keyBridge(map) {
  const down = new Set();
  const set = (code, want) => {
    if (!code) return;
    if (want && !down.has(code)) { down.add(code); sendKey('keydown', code); }
    else if (!want && down.has(code)) { down.delete(code); sendKey('keyup', code); }
  };
  return { set, all: () => [...down] };
}

// the canvas a game actually draws on, for the pointer-driven ones
const surface = () =>
  document.querySelector('canvas') ?? document.body;

function sendPointer(type, el) {
  const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
  const opts = {
    bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true,
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, buttons: type === 'pointerup' ? 0 : 1,
  };
  el.dispatchEvent(new PointerEvent(type, opts));
  // a game may only listen for the mouse pair
  el.dispatchEvent(new MouseEvent(type === 'pointerdown' ? 'mousedown' : 'mouseup', opts));
}

// DOM-button games (The Game of Life is all buttons): walk what is on screen
function uiTargets() {
  return [...document.querySelectorAll('button:not([disabled]), a[href]')]
    .filter(el => el.offsetParent !== null && !el.classList.contains('arcade-home'));
}

export function attachPad(cfg) {
  if (!cfg) return null;
  const bridge = cfg.keys ? keyBridge(cfg.keys) : null;
  let held = false;      // pointer mode: is A down
  let uiAt = -1;

  function uiMove(step) {
    const t = uiTargets();
    if (!t.length) return;
    uiAt = (uiAt + step + t.length) % t.length;
    t[uiAt].focus({ preventScroll: true });
    t[uiAt].scrollIntoView({ block: 'nearest' });
  }

  return watchPad({
    dir(dx, dy) {
      if (cfg.ui) { uiMove(dy || dx); return; }
      if (!bridge) return;
      const k = cfg.keys;
      bridge.set(k.left, dx < 0); bridge.set(k.right, dx > 0);
      bridge.set(k.up, dy < 0); bridge.set(k.down, dy > 0);
      // a stick released should let every direction go, which the calls above
      // already do because dx/dy are 0 then
    },
    press(i) {
      if (cfg.ui) {
        if (i === 0) (document.activeElement?.click?.() ?? uiMove(0));
        return;
      }
      if (cfg.pointer) {
        if (i === 0 && !held) { held = true; sendPointer('pointerdown', surface()); }
        return;
      }
      // A face button stands in for a key, so it behaves like one: down while
      // it is held, up when it is let go. Tiny 2D's whole game is holding the
      // press into the hill and letting go at the lip — a button that tapped
      // and released a frame later could not play it at all.
      bridge?.set(cfg.keys?.[`b${i}`], true);
    },
    release(i) {
      if (cfg.pointer) {
        if (i === 0 && held) { held = false; sendPointer('pointerup', surface()); }
        return;
      }
      bridge?.set(cfg.keys?.[`b${i}`], false);
    },
  });
}
