import { MovementHeroV3 } from './movement-hero-v3.js';

export const FLASH_PRINCE_MOVE_BUILD = 'FP-MOVE-7';

const visited = new Set();
const originalUpdate = MovementHeroV3.prototype.update;
MovementHeroV3.prototype.update = function patchedMovementUpdate(world, input, game) {
  const result = originalUpdate.call(this, world, input, game);
  visited.add(this.state);
  globalThis.__flashPrinceMovement = {
    build: FLASH_PRINCE_MOVE_BUILD,
    state: this.state,
    frame: this.f,
    x: this.x,
    y: this.y,
    grounded: this.grounded(world),
    faults: this.transitionFaults || 0,
    visited: [...visited],
    lastTransition: this.lastTransition || null,
  };
  return result;
};

function ensureOverlay() {
  let el = document.getElementById('fp-move-diag');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'fp-move-diag';
  Object.assign(el.style, {
    position: 'fixed',
    right: '8px',
    top: '8px',
    zIndex: '9999',
    font: '11px/1.25 monospace',
    color: '#d8f3ff',
    background: 'rgba(0,0,0,.72)',
    border: '1px solid rgba(216,243,255,.35)',
    padding: '5px 7px',
    pointerEvents: 'none',
    whiteSpace: 'pre',
  });
  document.body.appendChild(el);
  return el;
}

function paint() {
  const el = ensureOverlay();
  const d = globalThis.__flashPrinceMovement;
  if (!d) el.textContent = `${FLASH_PRINCE_MOVE_BUILD}  WAITING`;
  else {
    const faultMark = d.faults ? 'FAULT' : 'OK';
    const floorMark = d.grounded ? 'GROUND' : 'AIR';
    el.textContent = `${d.build}  ${faultMark} ${d.faults}\n${d.state} F${d.frame}  X${d.x.toFixed(1)} Y${d.y.toFixed(1)}  ${floorMark}`;
  }
  requestAnimationFrame(paint);
}

if (typeof document !== 'undefined') requestAnimationFrame(paint);
