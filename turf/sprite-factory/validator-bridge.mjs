export function validatorProfile(action) {
  if (action === 'move') return { region: 'lower', rhythm: true };
  if (action === 'idle' || action === 'melee' || action === 'ranged') return { region: 'upper', rhythm: false };
  return { region: 'full', rhythm: false };
}

export function mechanicalFailure(validation = {}) {
  const phase = validation.mechanical?.phase || {};
  const drift = validation.mechanical?.drift || {};
  const values = [phase.verdict, drift.origin, drift.scale, drift.rhythm, validation.pairedOpposition, validation.motionContract, validation.adjacentContinuity]
    .map(v => String(v || '').toLowerCase());
  return values.some(v => ['fail', 'rejected', 'mirror', 'near-duplicate'].includes(v));
}
