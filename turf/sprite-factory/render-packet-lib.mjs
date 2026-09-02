export function validateTarget(manifest, { character, action, direction, frame }) {
  const char = manifest.characters.find(c => c.id === character);
  if (!char) throw new Error(`Unknown character: ${character}`);
  const actionDef = manifest.actions[action];
  if (!actionDef) throw new Error(`Unknown action: ${action}`);
  if (!manifest.directions.includes(direction)) throw new Error(`Unknown direction: ${direction}`);
  if (!Number.isInteger(frame) || frame < 1 || frame > actionDef.targetFrames) {
    throw new Error(`Invalid frame ${frame}; ${action} requires 1..${actionDef.targetFrames}`);
  }
  return { char, actionDef };
}

export function oppositePhaseFrame(actionDef, action, frame) {
  if (action !== 'move' || actionDef.targetFrames % 2 !== 0) return null;
  const half = actionDef.targetFrames / 2;
  return frame <= half ? frame + half : frame - half;
}

export function findApproved(records, query) {
  return records.find(r =>
    r.character === query.character &&
    r.action === query.action &&
    r.direction === query.direction &&
    r.frame === query.frame &&
    r.status === 'approved'
  ) || null;
}

export function buildRenderPacket(manifest, candidates, target) {
  const { char, actionDef } = validateTarget(manifest, target);
  const records = candidates.records || [];
  const previous = target.frame > 1 ? findApproved(records, { ...target, frame: target.frame - 1 }) : null;
  const next = target.frame < actionDef.targetFrames ? findApproved(records, { ...target, frame: target.frame + 1 }) : null;
  const oppositeFrame = oppositePhaseFrame(actionDef, target.action, target.frame);
  const opposite = oppositeFrame ? findApproved(records, { ...target, frame: oppositeFrame }) : null;
  const phase = actionDef.phases?.[target.frame - 1] || null;

  return {
    contract: 'TURF clean render packet v2',
    character: { id: char.id, label: char.label, source: char.source },
    target: {
      action: target.action,
      direction: target.direction,
      frame: target.frame,
      phase,
      targetFrames: actionDef.targetFrames,
      pairedOppositeFrame: oppositeFrame
    },
    invariants: [
      'character identity', 'face and hair', 'costume design', 'palette family',
      'camera and facing', 'apparent scale', 'game-space origin',
      'weapon state unless action requires change'
    ],
    references: {
      characterMaster: char.source,
      previousApprovedFrame: previous?.asset || null,
      nextApprovedFrame: next?.asset || null,
      pairedOppositePhaseFrame: opposite?.asset || null
    },
    motion: {
      requiresLedger: Boolean(actionDef.requiresMotionLedger),
      phase,
      rule: actionDef.requiresMotionLedger
        ? 'Pixels must satisfy the motion-state ledger before approval. Opposite locomotion phase is the paired half-cycle frame in the SAME facing.'
        : 'No locomotion ledger required for this action.'
    },
    output: {
      count: 1,
      background: manifest.validation.background,
      text: false,
      shadow: false,
      vfx: false,
      preferredPlate: manifest.validation.preferredPlate,
      quantise: manifest.validation.quantise
    },
    rule: 'Render exactly one production sprite. Do not include the Sprite Bible, historical discussion, scoring language, phase tables, legends, posters, contact sheets or rejected imagery.'
  };
}
