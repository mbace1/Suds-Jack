// Click/tap-to-command. A screen point resolves two ways: which unit's
// visible SPRITE it lands on (units are drawn ~UNIT_H above their own tile's
// projected point, so a raw tile lookup misses their head and shoulders —
// `unitAtPoint` tests actual sprite bounds instead), and which grid tile
// it's over (render.js's inverse projection, for a plain move destination).
// Then: is a unit selected, and if so is this a legal move tile or an
// attackable target? `orderAttack` (combat.js) walks the unit into range
// first if it hasn't moved yet, so a single tap on a distant-but-reachable
// enemy both moves and swings.
import { screenToGrid, toScreen, TILE_W, UNIT_H } from './render.js?v=1';
import {
  selectUnit, moveUnit, orderAttack, movableTiles, attackableTargets,
  canUnitAct, endPlayerTurn, getUnit,
} from './combat.js?v=1';
import { key } from './grid.js?v=1';

export function createInputHandler({ canvas, getState, getLayout, onChange }) {
  function refreshSelectionOverlay(state) {
    const sel = state.selected ? getUnit(state, state.selected) : null;
    state.moveTiles = sel ? movableTiles(state, sel) : new Map();
    state.attackTiles = sel ? attackableTargets(state, sel) : [];
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
      const withinY = py >= a.y - UNIT_H * 1.7 && py <= a.y + 4;
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
    const state = getState();
    const layout = getLayout();
    const hit = unitAtPoint(state, layout, px, py);
    const { x, y } = screenToGrid(layout, px, py);
    handlePoint(hit, x, y);
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
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    const u = getUnit(state, uid);
    if (u && canUnitAct(u)) {
      selectUnit(state, uid);
      refreshSelectionOverlay(state);
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

  return {
    selectByUid,
    endTurn,
    refreshSelectionOverlay,
    destroy() {
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('touchend', onTouchEnd);
    },
  };
}
