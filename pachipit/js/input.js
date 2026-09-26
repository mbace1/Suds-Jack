// Three input methods, one set of verbs. The handle is the only verb in the
// machine — how hard, and now — so keys, the wheel, a held mouse button, a
// thumb on FIRE and a pad trigger all end in the same two calls.

import { watchPad } from '../../hub/pad.js?v=9';   // the SAME token shell.js asks for: one reader on the page

const ORDER = ['atm', 'machine', 'vendor', 'door'];

export function bindInput(canvas, api) {
  const held = new Set();
  let mouseFire = false, padFire = false, keyFire = false;
  const fireState = () => api.hold(mouseFire || padFire || keyFire);

  addEventListener('keydown', ev => {
    if (ev.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(ev.key)) return;
    if (api.blocked()) { if (ev.key === 'Escape') api.pause(); return; }
    const st = api.station(), k = ev.key;
    held.add(k.toLowerCase());
    if (k === 'Escape' || k === 'p' || k === 'P') { api.pause(); return; }
    if (k === 'm' || k === 'M') { api.mute(); return; }
    if (k === 'q' || k === 'Q') { api.turn(ORDER[(ORDER.indexOf(st) + ORDER.length - 1) % ORDER.length]); return; }
    if (k === 'e' || k === 'E' || k === 'Tab') { ev.preventDefault(); api.turn(ORDER[(ORDER.indexOf(st) + 1) % ORDER.length]); return; }
    if (st === 'machine') {
      if (k === ' ') { ev.preventDefault(); keyFire = true; fireState(); api.tap(); }
      if (k === 'Enter') { ev.preventDefault(); api.lever(); }
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowUp') { ev.preventDefault(); api.nav(-1); return; }
    if (k === 'ArrowRight' || k === 'ArrowDown') { ev.preventDefault(); api.nav(1); return; }
    if (k === ' ') { ev.preventDefault(); api.activate(); return; }
    if (st === 'atm') {
      if (k === 'd' || k === 'D') api.deposit(Infinity);
      if (k === 'Enter') api.settleOrDeposit();
    }
    if (st === 'vendor') {
      if (['1', '2', '3'].includes(k)) api.buy(Number(k) - 1);
      if (k === 'r' || k === 'R') api.reroll();
      if (k === 'Enter') api.activate();
    }
    if (st === 'door') {
      if (['1', '2', '3'].includes(k)) api.pick(Number(k) - 1);
      if (k === 'Enter') api.activate();
    }
  });
  addEventListener('keyup', ev => {
    held.delete(ev.key.toLowerCase());
    if (ev.key === ' ') { keyFire = false; fireState(); }
  });
  addEventListener('blur', () => { held.clear(); keyFire = mouseFire = padFire = false; fireState(); });

  // the wheel turns the handle; a held button on the machine is a held handle
  canvas.addEventListener('wheel', ev => { ev.preventDefault(); api.nudgePower(-Math.sign(ev.deltaY) * 0.02); }, { passive: false });
  canvas.addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'mouse' || ev.button !== 0 || api.blocked()) return;
    if (api.station() !== 'machine') return;
    if (api.phase() === 'shift') { mouseFire = true; fireState(); api.tap(); }
    else if (api.phase() === 'idle') api.lever();
  });
  addEventListener('pointerup', ev => { if (ev.pointerType === 'mouse' && mouseFire) { mouseFire = false; fireState(); } });
  canvas.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse') return;
    api.look((ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1);
  });

  // A thumb on the room: SWIPE to turn your head (drag the world, the way a
  // photo sphere drags — finger left, you turn right), and TAP the machine
  // between shifts to pull the lever.
  const touches = new Map();
  canvas.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse') return;
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, t: performance.now() });
  });
  canvas.addEventListener('pointerup', ev => {
    const s = touches.get(ev.pointerId);
    touches.delete(ev.pointerId);
    if (!s || api.blocked()) return;
    const dx = ev.clientX - s.x, dy = ev.clientY - s.y, dt = performance.now() - s.t;
    const st = api.station();
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.6 && dt < 700) {
      const i = ORDER.indexOf(st === 'up' ? 'machine' : st);
      api.turn(ORDER[(i + (dx < 0 ? 1 : ORDER.length - 1)) % ORDER.length]);
      return;
    }
    if (Math.hypot(dx, dy) < 12 && dt < 400 && st === 'machine' && api.phase() !== 'shift') api.lever();
  });
  canvas.addEventListener('pointercancel', ev => touches.delete(ev.pointerId));

  // the pad: A or RT fires, the stick or d-pad turns the handle, bumpers turn
  // you round the room. Start pauses (a HOLD on Start is the shell's way home).
  watchPad({
    press(i) {
      if (api.blocked()) { if (i === 0 || i === 9) api.padConfirm(); return; }
      const st = api.station();
      if (i === 4) api.turn(ORDER[(ORDER.indexOf(st) + ORDER.length - 1) % ORDER.length]);
      if (i === 5) api.turn(ORDER[(ORDER.indexOf(st) + 1) % ORDER.length]);
      if (i === 9) api.pause();
      if (i === 1) api.turn('machine');
      if (st === 'machine') {
        if ((i === 0 || i === 7) && api.phase() === 'shift') { padFire = true; fireState(); api.tap(); }
        if ((i === 0 || i === 2) && api.phase() !== 'shift') api.lever();
      } else {
        if (i === 0) api.activate();
        if (i === 2 && st === 'atm') api.deposit(Infinity);
        if (i === 2 && st === 'vendor') api.reroll();
        if (i === 3 && st === 'atm') api.settleOrDeposit();
      }
    },
    release(i) { if (i === 0 || i === 7) { padFire = false; fireState(); } },
    dir(dx, dy) {
      if (api.blocked()) return;
      if (api.station() !== 'machine') { if (dx || dy) api.nav(dx || dy); }
    },
  });

  // continuous: held keys and the left stick move the handle smoothly
  return {
    tick(dt) {
      if (api.blocked()) return;
      if (api.station() === 'machine') {
        let d = 0;
        if (held.has('arrowleft') || held.has('a')) d -= 1;
        if (held.has('arrowright') || held.has('d')) d += 1;
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const p of pads) {
          if (!p || !p.connected) continue;
          const x = p.axes?.[0] ?? 0;
          if (Math.abs(x) > 0.18) d += (Math.abs(x) - 0.18) / 0.82 * Math.sign(x);
          if (p.buttons[14]?.pressed) d -= 1;
          if (p.buttons[15]?.pressed) d += 1;
          break;
        }
        if (d) api.nudgePower(d * dt * 0.45);
      }
    },
  };
}
