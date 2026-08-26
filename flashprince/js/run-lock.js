import RUN from './run-v15-data.js';

export { RUN };
export const START_N = 6;
export const RUN_HOLD = [5, 4, 3, 3, 4, 3, 3, 4, 5, 4, 3, 3, 4, 3, 3, 4, 5, 4, 3, 3];
export const RUN_SPEED = 1.22;
export const RUN_SIGNATURE = 'ff0dd32f';
export const LOCKED_RUN_COLOURS = [
  '#8fc8c0', '#518480', '#4f78a8', '#2a4665',
  '#be704e', '#17191c', '#d6e8dc',
];

export function runSignature() {
  let hash = 2166136261;
  const source = `${RUN.join('|')}|${RUN_HOLD.join(',')}|${START_N}|${RUN_SPEED}`;
  for (const char of source) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

if (RUN.length !== 20 || runSignature() !== RUN_SIGNATURE) {
  throw new Error('Approved Flash Prince v18 run changed');
}

export function frameFromHolds(frame, holds = RUN_HOLD, loop = false) {
  const total = holds.reduce((sum, hold) => sum + hold, 0);
  let t = loop ? ((frame % total) + total) % total : Math.max(0, Math.min(total - 1, frame));
  for (let i = 0; i < holds.length; i++) {
    if (t < holds[i]) return i;
    t -= holds[i];
  }
  return holds.length - 1;
}
