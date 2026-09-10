// Contextual teaching reads real encounter state; it never drives an action.
export function fieldGuide(state) {
  if (!state) return 'Choose an operator from the crew row to see their options.';
  if (state.result) return state.result === 'win' ? 'Block complete. Continue to keep your crew moving.' : 'Crew down. Run it back and use the enemy plans to choose safer positions.';
  if (state.turn !== 'player') return 'Watch the rivals carry out their plans. Your next turn starts automatically.';
  const crew = state.units.filter(u => u.faction === 'player' && u.hp > 0);
  if (crew.every(u => u.actedMove && u.actedAction)) return 'Your crew has finished. End Turn to let the rivals act.';
  const selected = crew.find(u => u.uid === state.selected);
  if (!selected) return '1 · Choose an operator below. Their movement range and attack odds appear on the board.';
  if (state.aimUid) return 'Choose a highlighted firing position, or tap the rival again to take the suggested position. Cancel backs out.';
  if (selected.actedMove && selected.actedAction) return 'This operator has finished. Choose another crew member, or End Turn when you are ready.';
  if (selected.actedAction) return 'Your action is spent, but you can still move. Find cover before ending the turn.';
  if (!selected.actedMove) return '2 · Tap a highlighted tile to move. Moving builds momentum; read the incoming threats before committing.';
  if (state.forecasts?.size) return '3 · Check the odds and damage shown on each rival, then tap a target. An ability can spend your momentum instead.';
  return 'No attack is in reach. Keep your momentum for protection, choose another operator, then End Turn.';
}

export function bindActivation(element, action) {
  let last = -Infinity;
  const run = e => {
    if (element.disabled) return;
    if (e.type === 'click' && e.detail !== 0) return;
    e.preventDefault();
    const now = performance.now();
    if (now - last < 300) return;
    last = now;
    action(e);
  };
  for (const event of ['pointerup', 'touchend', 'click']) element.addEventListener(event, run);
}
