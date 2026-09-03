// Three input methods, one decision path. A screen point (mouse/touch)
// resolves to a unit hit + a grid tile (see fromScreenPoint); a keyboard or
// gamepad instead drives a CURSOR tile directly. Either way the result lands
// in the same handlePoint(hit, x, y) — nothing downstream (combat.js) knows
// or cares which input method was used, the same discipline hub/padkeys.js
// uses to bridge a pad onto a game that never grew one.
import { screenToGrid, toScreen, TILE_W, SPRITE_H } from './render.js?v=21';
import {
  selectUnit, moveUnit, orderAttack, movableTiles, attackableTargets,
  canUnitAct, endPlayerTurn, getUnit, useAbility, previewAttack, reloadUnit,
  firingOptions, attackFrom,
} from './combat.js?v=16';
import { abilityTargets, findAbility } from './abilities.js?v=1';
import { key } from './grid.js?v=3';
import { watchPad } from '../../hub/pad.js?v=9';

export function createInputHandler({
  canvas, getState, getLayout, onChange, consumedDrag, clearDrag, getAbilities,
}) {
  // The ability the player has armed but not yet aimed. While this is set the
  // board is in a different mode: taps resolve the ability instead of moving
  // or attacking, and state.abilityTiles carries what render.js should light
  // up. Deliberately a single id and not a stack — an armed action the player
  // has forgotten about would fire on their next tap, which in a game about
  // committed decisions is the worst possible surprise.
  let armed = null;
  // The enemy the player has pointed at but not yet committed to, when the
  // shot would MOVE them. Through v27 a tap ran orderAttack immediately and
  // walked the operator to a tile the engine chose — which after v24-v27 was
  // the wrong tile 80% of the time by momentum and 20% by cover. Now: if you
  // can already fire from where you stand, one tap fires; if the tap would
  // move you, it offers the firing positions first. No extra taps in the
  // case where there was nothing to decide.
  let aimUid = null;
  // The keyboard/gamepad cursor: a grid tile, live only once one of those
  // two has actually been used (mouse/touch clears it right back off —
  // gameoflife's :focus-visible rule, applied to a canvas instead of the
  // DOM: a cursor nobody asked for is noise for a pointer player).
  let cursor = null;
  let cursorActive = false;

  function refreshSelectionOverlay(state) {
    const sel = state.selected ? getUnit(state, state.selected) : null;
    if (!sel) { armed = null; aimUid = null; }
    state.aimUid = aimUid;
    state.aimTiles = aimUid && sel ? firingOptions(state, sel.uid, aimUid) : null;
    state.moveTiles = sel && !armed ? movableTiles(state, sel) : new Map();
    state.attackTiles = sel && !armed ? attackableTargets(state, sel) : [];
    state.abilityTiles = armed && sel
      ? abilityTargets(state, sel, findAbility(getAbilities(), armed)) : null;
    state.armedAbility = armed;
    // The odds for every target this operator could hit, recomputed with the
    // overlay rather than on hover: touch has no hover, and these have to
    // stay correct after a move (which changes cover AND momentum), so they
    // belong on the same refresh as the highlights they sit on top of.
    state.forecasts = new Map();
    if (sel && !armed) {
      for (const uid of state.attackTiles) {
        const f = previewAttack(state, sel.uid, uid);
        if (f) state.forecasts.set(uid, f);
      }
    }
  }

  // Arming is a toggle: pressing the same button again puts the board back
  // to ordinary move/attack rather than leaving the player to hunt for a way
  // out of a mode they entered by accident.
  function armAbility(id) {
    const state = getState();
    if (state.turn !== 'player' || state.result || !state.selected) return;
    aimUid = null; // arming an ability leaves aim mode
    armed = armed === id ? null : id;
    refreshSelectionOverlay(state);
    onChange();
  }
  function disarm() {
    if (!armed) return;
    armed = null;
    refreshSelectionOverlay(getState());
  }

  // Resolving an armed ability. Returns true when the tap was consumed —
  // including when it MISSED every legal target, because in that case the
  // right behaviour is to disarm rather than silently fall through to a move
  // order the player did not intend.
  function resolveArmed(state, hit, x, y) {
    const sel = getUnit(state, state.selected);
    const ability = findAbility(getAbilities(), armed);
    if (!sel || !ability) { armed = null; return false; }
    const legal = state.abilityTiles || [];
    let target = null;
    if (ability.shape === 'self') target = legal[0] || null;
    else if (ability.shape === 'adjacent-all') target = legal[0] || null;
    else if (ability.shape === 'empty-tile') target = legal.find(t => t.x === x && t.y === y) || null;
    else target = hit && legal.find(t => t.uid === hit.uid) ? hit.uid : null;
    if (target != null) useAbility(state, sel.uid, armed, target, getAbilities());
    armed = null;
    return true;
  }

  function syncCursorField(state) {
    state.cursor = cursorActive ? cursor : null;
  }

  function defaultCursorTile(state) {
    const alive = state.units.find(u => u.faction === 'player' && u.hp > 0);
    return alive ? { x: alive.x, y: alive.y } : { x: 0, y: 0 };
  }

  // Client point -> BOARD coordinates. Scaled off layout, NOT canvas.width:
  // the backing store is SUPERSAMPLE x the board's logical size (render.js),
  // so canvas.width would land every tap 3x out. Everything downstream —
  // screenToGrid, unitAtPoint, TILE_W, SPRITE_H — is in board units.
  function clientToInternal(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const layout = getLayout();
    const scaleX = layout.width / rect.width, scaleY = layout.height / rect.height;
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

    if (armed && state.selected) {
      if (resolveArmed(state, hit, x, y)) {
        refreshSelectionOverlay(state);
        onChange();
        return;
      }
    }

    if (state.selected) {
      const sel = getUnit(state, state.selected);
      if (hit && hit.uid === sel.uid) {
        // re-tapping yourself: stay selected
      } else if (aimUid && !hit && (state.aimTiles || []).some(t => t.x === x && t.y === y)) {
        // Committing to a chosen firing position.
        attackFrom(state, sel.uid, aimUid, { x, y });
        aimUid = null;
      } else if (hit && hit.uid === aimUid) {
        // Tapping the same rival again takes the default — the best tile,
        // which is the one already marked. One extra tap, never two.
        orderAttack(state, sel.uid, hit.uid);
        aimUid = null;
      } else if (hit && hit.faction !== sel.faction && (state.attackTiles || []).includes(hit.uid)) {
        const opts = firingOptions(state, sel.uid, hit.uid);
        const here = opts.find(t => t.x === sel.x && t.y === sel.y);
        if (here || opts.length <= 1) {
          // Nothing to decide: the shot is on from where they stand, or
          // there is exactly one place to take it from.
          orderAttack(state, sel.uid, hit.uid);
          aimUid = null;
        } else {
          aimUid = hit.uid;
        }
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
  // A gesture that panned the camera is not a tap. camera.js recognises the
  // drag in the capture phase and answers here; without this check, dragging
  // the board at phone zoom would also order a move to wherever the thumb
  // stopped — the drag and the order share one pointerup.
  function droppedByPan() {
    if (!consumedDrag || !consumedDrag()) return false;
    clearDrag && clearDrag();
    return true;
  }
  function onPointerUp(evt) {
    if (evt.pointerType === 'touch') return;
    if (droppedByPan()) return;
    evt.preventDefault();
    const { px, py } = clientToInternal(evt.clientX, evt.clientY);
    fromScreenPoint(px, py);
  }
  function onTouchEnd(evt) {
    if (droppedByPan()) return;
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

  // Reload, from the button, the R key or the pad's X. One path, like every
  // other command here — combat.js never learns which input asked.
  function reloadSelected() {
    const state = getState();
    if (state.turn !== 'player' || state.result || !state.selected) return;
    const r = reloadUnit(state, state.selected);
    if (!r.ok) return;
    armed = null;
    refreshSelectionOverlay(state);
    onChange();
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
    // One press backs out of the ability; a second clears the selection. Two
    // meanings on one button, in the order the player wants them.
    if (armed || aimUid) {
      armed = null; aimUid = null;
      refreshSelectionOverlay(state);
      onChange();
      return;
    }
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
    if (evt.key === 'r' || evt.key === 'R') { evt.preventDefault(); reloadSelected(); return; }
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
      else if (i === 2) reloadSelected();   // X — never Start, that's the shell's hold-for-home
      else if (i === 3) endTurn();
    },
  });

  return {
    selectByUid,
    // A tap, in BOARD coordinates, down the same path a finger takes —
    // handlePoint and all. Exposed so a test can exercise the real input
    // decision path instead of synthesising pointer events at guessed pixel
    // offsets and silently missing the sprite.
    tapBoard: (px, py) => fromScreenPoint(px, py),
    reloadSelected,
    armAbility,
    disarm,
    armedAbility: () => armed,
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
