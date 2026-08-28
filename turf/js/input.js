// Click/tap-to-command. One pointer event maps a screen point to a grid
// tile (render.js's inverse projection) and then asks: is a unit selected,
// and if so is this a legal move tile or an attackable target? `orderAttack`
// (combat.js) walks the unit into range first if it hasn't moved yet, so a
// single tap on a distant-but-reachable enemy both moves and swings.
import { screenToGrid } from './render.js';
import {
  selectUnit, moveUnit, orderAttack, movableTiles, attackableTargets,
  canUnitAct, endPlayerTurn, getUnit,
} from './combat.js';
import { key } from './grid.js';

export function createInputHandler({ canvas, getState, getLayout, onChange }) {
  function refreshSelectionOverlay(state) {
    const sel = state.selected ? getUnit(state, state.selected) : null;
    state.moveTiles = sel ? movableTiles(state, sel) : new Map();
    state.attackTiles = sel ? attackableTargets(state, sel) : [];
  }

  function pointerToGrid(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    const px = (evt.clientX - rect.left) * scaleX;
    const py = (evt.clientY - rect.top) * scaleY;
    return screenToGrid(getLayout(), px, py);
  }

  function handleTileClick(x, y) {
    const state = getState();
    if (state.turn !== 'player' || state.result) return;
    if (x < 0 || y < 0 || x >= state.grid.cols || y >= state.grid.rows) return;
    const hit = state.units.find(u => u.hp > 0 && u.x === x && u.y === y);

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

  function onPointerUp(evt) {
    evt.preventDefault();
    const { x, y } = pointerToGrid(evt);
    handleTileClick(x, y);
  }
  canvas.addEventListener('pointerup', onPointerUp);

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
    destroy() { canvas.removeEventListener('pointerup', onPointerUp); },
  };
}
