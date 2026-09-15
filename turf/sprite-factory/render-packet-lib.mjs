export function validateTarget(manifest, { character, action, direction, frame }) {
  const char = manifest.characters.find(c => c.id === character);
  if (!char) throw new Error(`Unknown character: ${character}`);
  const actionDef = manifest.actions[action];
  if (!actionDef) throw new Error(`Unknown action: ${action}`);
  if (!manifest.directions.includes(direction)) throw new Error(`Unknown direction: ${direction}`);
  if (!['front_iso', 'rear_iso'].includes(direction)) throw new Error(`Forbidden production direction: ${direction}; TURF authors only front_iso/rear_iso`);
  if (!Number.isInteger(frame) || frame < 1 || frame > actionDef.targetFrames) throw new Error(`Invalid frame ${frame}; ${action} requires 1..${actionDef.targetFrames}`);
  return { char, actionDef };
}

export function oppositePhaseFrame(actionDef, action, frame) {
  if (action !== 'move') return null;
  const offset = actionDef.oppositePhaseOffset ?? (actionDef.targetFrames % 2 === 0 ? actionDef.targetFrames / 2 : null);
  if (!offset || offset * 2 !== actionDef.targetFrames) return null;
  return frame <= offset ? frame + offset : frame - offset;
}

export function findApproved(records, query) {
  return records.find(r => r.character === query.character && r.action === query.action && r.direction === query.direction && r.frame === query.frame && r.status === 'approved') || null;
}

export function buildRenderPacket(manifest, candidates, target) {
  const { char, actionDef } = validateTarget(manifest, target);
  const records = candidates.records || [];
  const previous = target.frame > 1 ? findApproved(records, { ...target, frame: target.frame - 1 }) : null;
  const next = target.frame < actionDef.targetFrames ? findApproved(records, { ...target, frame: target.frame + 1 }) : null;
  const oppositeFrame = oppositePhaseFrame(actionDef, target.action, target.frame);
  const opposite = oppositeFrame ? findApproved(records, { ...target, frame: oppositeFrame }) : null;
  const phase = actionDef.phases?.[target.frame - 1] || null;
  const facing = target.direction === 'front_iso' ? 'front three-quarter tactical diagonal' : 'rear three-quarter tactical diagonal';

  return {
    contract: 'TURF clean render packet v3',
    visibility: 'internal_until_approved',
    character: { id: char.id, label: char.label, source: char.source },
    target: { action: target.action, direction: target.direction, facing, frame: target.frame, phase, targetFrames: actionDef.targetFrames, pairedOppositeFrame: oppositeFrame },
    invariants: ['character identity','face and hair','costume design','palette family','fixed three-quarter isometric camera','apparent scale','game-space origin','weapon state unless action requires change'],
    forbidden: ['side view','profile view','cardinal view','turnaround','direction sheet','multiple directions','poster','dashboard','UI','labels','frame numbers','legend','notes','cast shadow','VFX','contact sheet','unapproved output'],
    references: { characterMaster: char.source, previousApprovedFrame: previous?.asset || null, nextApprovedFrame: next?.asset || null, pairedOppositePhaseFrame: opposite?.asset || null },
    motion: { requiresLedger: Boolean(actionDef.requiresMotionLedger), phase, rule: actionDef.requiresMotionLedger ? 'Pixels must satisfy the motion-state ledger. Opposite locomotion phase is the paired half-cycle frame in the SAME facing.' : 'No locomotion ledger required for this action.' },
    output: { count: 1, oneCharacter: true, oneDirection: true, oneAnimation: true, background: manifest.validation.background, text: false, shadow: false, vfx: false, preferredPlate: manifest.validation.preferredPlate, quantise: manifest.validation.quantise },
    releaseGate: ['correct front_iso/rear_iso facing','no side/profile view','unique mechanically useful pose','no duplicate or near-duplicate frame','stable identity/anatomy/scale/origin','clean artifact profile','human approved'],
    rule: 'Render exactly ONE production sprite in the requested three-quarter tactical isometric facing. Never render a side/profile view or multi-direction sheet. Keep all candidates and failures hidden; only approved final assets may be surfaced.'
  };
}
