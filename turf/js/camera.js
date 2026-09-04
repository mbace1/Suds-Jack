// The camera — zoom, pan, and follow.
//
// WHY THIS EXISTS. Through v24 the board was always fitted whole into the
// stage, which sounds right and is wrong on a phone: a wide grid (backlot is
// 11 tiles across) is width-bound in portrait, so the fit lands at ~1.0-1.3x
// and a 32px tile arrives as a 32px tile. The owner's verdict on that build
// was "things are hard to see", and no amount of trimming SIDE_MARGIN fixes
// it — fitting the whole board and making it legible are simply different
// requests once the screen is narrow enough.
//
// So the board is allowed to be BIGGER than the viewport now, and this owns
// what that costs: somewhere to look, and a way to look elsewhere.
//
// NO SECOND rAF. anim.js owns the only animation loop in this game and that
// rule has already saved this repo from leaked loops more than once. The
// follow here is a CSS transition on `transform` — the browser's own
// compositor does the easing, there is no per-frame work, and a drag simply
// switches the transition off for its duration. A camera that cost a rAF
// while nothing was moving would be a worse camera.

// The smallest a tile is allowed to be on screen, in CSS pixels. 32 (the
// source TILE_W) is what v24 shipped and what got called hard to see; 46
// puts a unit's head and its HP bar comfortably apart at arm's length, and
// is close to the 44px touch floor the rest of this repo builds to.
export const MIN_TILE_W = 46;
// Follow duration. Long enough to read as a camera move rather than a cut,
// short enough that four enemies acting in sequence do not become a wait.
const FOLLOW_MS = 260;
// How far a pointer may travel and still count as a tap. Below this, the
// gesture belongs to input.js (select/move/attack); above it, it was a pan
// and the tap that ends it must be swallowed, or every drag would also
// order a move.
const DRAG_SLOP = 10;

export function createCamera({ stage, canvas, getLayout, getScale }) {
  let tx = 0, ty = 0;              // current pan, in CSS pixels
  let dragging = false, panned = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;

  // How much slack there is to pan into, per axis. Zero when the board fits:
  // a board smaller than its viewport must not be draggable, or the player
  // can shove it off screen and has no way to know how to get it back.
  function limits() {
    const l = getLayout(), s = getScale();
    if (!l) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (l.width * s - stage.clientWidth) / 2),
      y: Math.max(0, (l.height * s - stage.clientHeight) / 2),
    };
  }

  function clamp() {
    const lim = limits();
    tx = Math.min(lim.x, Math.max(-lim.x, tx));
    ty = Math.min(lim.y, Math.max(-lim.y, ty));
  }

  // ONE transform, written to the stage as a custom property, and BOTH the
  // board and the encounter plate under it read it (`transform: var(--cam)`).
  // The plate is seated on the board's own diamond (main.js's fitPlate), so
  // a pan that moved only the canvas would slide the grid off the yard it
  // was carefully placed on — one property keeps them a single object.
  function apply(animate) {
    const t = animate ? `transform ${FOLLOW_MS}ms ease-out` : 'none';
    canvas.style.transition = t;
    stage.style.setProperty('--cam', `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`);
    const plate = stage.querySelector('#plate');
    if (plate) plate.style.transition = t;
  }

  // Put a board point in the middle of the viewport, as near as the clamp
  // allows. Takes BOARD coordinates (render.js's toScreen output), so callers
  // never deal in CSS pixels.
  function centerOn(bx, by, animate = true) {
    const l = getLayout(), s = getScale();
    if (!l) return;
    tx = (l.width / 2 - bx) * s;
    ty = (l.height / 2 - by) * s;
    clamp();
    apply(animate);
  }

  function recenter() { clamp(); apply(false); }

  // ── drag to pan ────────────────────────────────────────────────────
  // On the STAGE, not the canvas: at high zoom the canvas overflows its
  // container, and the part of the viewport a thumb naturally lands on may
  // be stage rather than board. Capture phase so the gesture is recognised
  // before input.js sees the pointer at all.
  function onDown(evt) {
    const lim = limits();
    if (!lim.x && !lim.y) return;   // nothing to pan; leave the event alone
    dragging = true; panned = false;
    const p = point(evt);
    startX = p.x; startY = p.y; baseX = tx; baseY = ty;
  }
  function onMove(evt) {
    if (!dragging) return;
    const p = point(evt);
    const dx = p.x - startX, dy = p.y - startY;
    if (!panned && Math.hypot(dx, dy) < DRAG_SLOP) return;
    panned = true;
    evt.preventDefault();
    tx = baseX + dx; ty = baseY + dy;
    clamp(); apply(false);
  }
  function onUp() { dragging = false; }
  function point(evt) {
    const t = evt.touches && evt.touches[0];
    return t ? { x: t.clientX, y: t.clientY } : { x: evt.clientX, y: evt.clientY };
  }

  stage.addEventListener('pointerdown', onDown, true);
  stage.addEventListener('pointermove', onMove, true);
  stage.addEventListener('pointerup', onUp, true);
  stage.addEventListener('pointercancel', onUp, true);
  stage.addEventListener('touchstart', onDown, { capture: true, passive: true });
  stage.addEventListener('touchmove', onMove, { capture: true, passive: false });
  stage.addEventListener('touchend', onUp, true);

  return {
    centerOn,
    recenter,
    // True when the gesture that just ended was a pan. input.js asks this
    // and skips its tap handling — a drag must never also order a move.
    consumedDrag: () => panned,
    clearDrag: () => { panned = false; },
    canPan: () => { const l = limits(); return !!(l.x || l.y); },
    destroy() {
      stage.removeEventListener('pointerdown', onDown, true);
      stage.removeEventListener('pointermove', onMove, true);
      stage.removeEventListener('pointerup', onUp, true);
      stage.removeEventListener('pointercancel', onUp, true);
      stage.removeEventListener('touchstart', onDown, true);
      stage.removeEventListener('touchmove', onMove, true);
      stage.removeEventListener('touchend', onUp, true);
    },
  };
}
