// Three input methods, one decision path. A screen point (mouse/touch)
// resolves to a unit hit + a grid tile (see fromScreenPoint); a keyboard or
// gamepad instead drives a CURSOR tile directly. Either way the result lands
// in the same handlePoint(hit, x, y) — nothing downstream (combat.js) knows
// or cares which input method was used, the same discipline hub/padkeys.js
// uses to bridge a pad onto a game that never grew one.
import { screenToGrid, toScreen, TILE_W, SPRITE_H } from './render.js?v=8';
import {
  selectUnit, moveUnit, orderAttack, movableTiles, attackableTargets,
  canUnitAct, endPlayerTurn, getUnit,
} from './combat.js?v=5';
import { key } from './grid.js?v=2';
import { watchPad } from '../../hub/pad.js?v=9';

export function createInputHandler({ canvas, getState, getLayout, onChange }) {
  // The keyboard/gamepad cursor: a grid tile, live only once one of those
  // two has actually been used (mouse/touch clears it right back off —
  // gameoflife's :focus-visible rule, applied to a canvas instead of the
  // DOM: a cursor nobody asked for is noise for a pointer player).
  let cursor = null;
  let cursorActive = false;

  function refreshSelectionOverlay(state) {
    const sel = state.selected ? getUnit(state, state.selected) : null;
    state.moveTiles = sel ? movableTiles(state, sel) : new Map();
    state.attackTiles = sel ? attackableTargets(state, sel) : [];
  }

  function syncCursorField(state) {
    state.cursor = cursorActive ? cursor : null;
  }

  function defaultCursorTile(state) {
    const alive = state.units.find(u => u.faction === 'player' && u.hp > 0);
    return alive ? { x: alive.x, y: alive.y } : { x: 0, y: 0 };
  }

  function clientToInternal(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return { px: (clientX - rect.left) * scaleX, py: (clientY - rect.top) * scaleY };
  }

  // Prefer whichever live unit's sprite bounds actually contain the point;
  // when two overlap, the one drawn on top (highest x+y depth, same order
  // render.js paints in) wins, matching what the eye sees.
  function unitAtPoint(state, layout, px, py) {
    let best = null, bestDepth = -Infinity;
    for (const u of state.units) {
      if (u.hp <= 0) continue;
      const a = toScreen(layout, u.x, u.y);
      const withinX = Math.abs(px - a.x) <= TILE_W * 0.3;
      const withinY = py >= a.y - SPRITE_H - 8 && py <= a.y + 4;
      if (!withinX || !withinY) continue;
      const depth = u.x + u.y;
      if (depth > bestDepth) { bestDepth = depth; best = u; }
    }
    return best;
  }

  function handlePoint(hit, x, y) {
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    if (!hit && (x < 0 || y < 0 || x >= state.grid.cols || y >= state.grid.rows)) return;

    if (state.selected) {
      const sel = getUnit(state, state.selected);
      if (hit && hit.uid === sel.uid) {
        // re-tapping yourself: stay selected
      } else if (hit && hit.faction !== sel.faction && (state.attackTiles || []).includes(hit.uid)) {
        orderAttack(state, sel.uid, hit.uid);
      } else if (!hit && (state.moveTiles || new Map()).has(key(x, y))) {
        moveUnit(state, sel.uid, x, y);
      } else if (hit && hit.faction === sel.faction && canUnitAct(hit)) {
        selectUnit(state, hit.uid);
      } else {
        state.selected = null; // tapping open ground/an unreachable target cancels
      }
    } else if (hit && hit.faction === 'player' && canUnitAct(hit)) {
      selectUnit(state, hit.uid);
    }
    refreshSelectionOverlay(state);
    onChange();
  }

  function fromScreenPoint(px, py) {
    cursorActive = false; // a real pointer takes over from the keyboard/pad cursor
    const state = getState();
    const layout = getLayout();
    const hit = unitAtPoint(state, layout, px, py);
    const { x, y } = screenToGrid(layout, px, py);
    handlePoint(hit, x, y);
    syncCursorField(getState());
  }

  // pointerup AND touchend, never click (AGENTS.md §3): a touchstart
  // cancelled upstream of this canvas turns into pointercancel and pointerup
  // never fires at all, which has cost this repo two separate bugs already.
  // Touch owns touchend exclusively (pointerup skips pointerType 'touch') so
  // a normal tap — which fires both, pointerup first — is never handled
  // twice.
  function onPointerUp(evt) {
    if (evt.pointerType === 'touch') return;
    evt.preventDefault();
    const { px, py } = clientToInternal(evt.clientX, evt.clientY);
    fromScreenPoint(px, py);
  }
  function onTouchEnd(evt) {
    evt.preventDefault();
    const t = evt.changedTouches[0];
    if (!t) return;
    const { px, py } = clientToInternal(t.clientX, t.clientY);
    fromScreenPoint(px, py);
  }
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('touchend', onTouchEnd);

  function selectByUid(uid) {
    cursorActive = false; // this is always a mouse/touch click on the squad panel
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    const u = getUnit(state, uid);
    if (u && canUnitAct(u)) {
      selectUnit(state, uid);
      refreshSelectionOverlay(state);
      syncCursorField(state);
      onChange();
    }
  }

  function endTurn() {
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    endPlayerTurn(state);
    state.moveTiles = new Map();
    state.attackTiles = [];
    onChange();
  }

  // ── keyboard + gamepad cursor ────────────────────────────────────────
  // moveCursor/confirmAtCursor/cancelSelection are the three primitives
  // both input methods reduce to; confirmAtCursor reads whichever unit
  // sits exactly on the cursor's tile and hands it to the same
  // handlePoint() a tap uses, so a move, an attack, or a selection made
  // this way is indistinguishable downstream from one made by tapping.
  function moveCursor(dx, dy) {
    if (!dx && !dy) return;
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    if (!cursor) cursor = defaultCursorTile(state);
    cursorActive = true;
    cursor = {
      x: Math.min(state.grid.cols - 1, Math.max(0, cursor.x + dx)),
      y: Math.min(state.grid.rows - 1, Math.max(0, cursor.y + dy)),
    };
    syncCursorField(state);
    onChange();
  }

  function confirmAtCursor() {
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    cursorActive = true;
    if (!cursor) cursor = defaultCursorTile(state); // e.g. A pressed before any stick input
    const hit = state.units.find(u => u.hp > 0 && u.x === cursor.x && u.y === cursor.y) || null;
    handlePoint(hit, cursor.x, cursor.y);
    syncCursorField(getState());
  }

  // activateCursor stays true for the keyboard/pad path (Esc/B) — cancelling
  // there means the player IS the cursor now. The on-screen Cancel button
  // passes false: a touch player tapping it never asked for the reticle,
  // same "a cursor nobody asked for is noise" rule as the rest of this file.
  function cancelSelection(activateCursor = true) {
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    if (activateCursor) {
      cursorActive = true;
      if (!cursor) cursor = defaultCursorTile(state);
    }
    if (state.selected) {
      state.selected = null;
      refreshSelectionOverlay(state);
    }
    syncCursorField(state);
    onChange();
  }

  // Arrows or WASD move the cursor, Enter/Space confirms, Escape cancels,
  // E ends the turn — never Start/Tab/anything the shell or the browser
  // already owns. Mostly here so the whole board is testable without a
  // physical gamepad; a keyboard player gets the same reticle a pad does.
  const KEY_DIR = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
  };
  function onKeyDown(evt) {
    if (evt.metaKey || evt.ctrlKey || evt.altKey) return;
    const d = KEY_DIR[evt.key];
    if (d) { evt.preventDefault(); moveCursor(d[0], d[1]); return; }
    if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); confirmAtCursor(); return; }
    if (evt.key === 'Escape') { evt.preventDefault(); cancelSelection(); return; }
    if (evt.key === 'e' || evt.key === 'E') { evt.preventDefault(); endTurn(); }
  }
  window.addEventListener('keydown', onKeyDown);

  // Gamepad, via the site's one shared reader (hub/pad.js — the same one
  // sudsjack/hyperdagger/dropcabal read natively). A confirms, B cancels,
  // Y ends the turn. Never Start: that's the arcade shell's hold-for-home,
  // and colliding with it is a documented house mistake (see hub/shell.js).
  const pad = watchPad({
    dir: (dx, dy) => moveCursor(dx, dy),
    press: i => {
      if (i === 0) confirmAtCursor();
      else if (i === 1) cancelSelection();
      else if (i === 3) endTurn();
    },
  });

  return {
    selectByUid,
    endTurn,
    cancelSelection,
    refreshSelectionOverlay,
    destroy() {
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      pad.stop();
    },
  };
}
