// One-time tutorial toasts for brand-new players, following modes.js's persisted-flag
// pattern. Each flag fires its hint at most once ever, across all runs/sessions —
// entirely toast-based, nothing added to the (already crowded) title screen.
const K = {
  seenWelcome: 'skltrSeenWelcome', seenDash: 'skltrSeenDash', seenDoubleJump: 'skltrSeenDoubleJump',
  seenHazard: 'skltrSeenHazard', seenObjective: 'skltrSeenObjective',
};
export let seenWelcome = localStorage.getItem(K.seenWelcome) === '1';
export let seenDash = localStorage.getItem(K.seenDash) === '1';
export let seenDoubleJump = localStorage.getItem(K.seenDoubleJump) === '1';
export let seenHazard = localStorage.getItem(K.seenHazard) === '1';
export let seenObjective = localStorage.getItem(K.seenObjective) === '1';

export function markWelcome() { seenWelcome = true; localStorage.setItem(K.seenWelcome, '1'); }
export function markDash() { seenDash = true; localStorage.setItem(K.seenDash, '1'); }
export function markDoubleJump() { seenDoubleJump = true; localStorage.setItem(K.seenDoubleJump, '1'); }
export function markHazard() { seenHazard = true; localStorage.setItem(K.seenHazard, '1'); }
export function markObjective() { seenObjective = true; localStorage.setItem(K.seenObjective, '1'); }
