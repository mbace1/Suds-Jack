export const ROUTE_SAVE = 'flashPrinceRouteV68';

export function decodeRouteSave(raw, roomCount) {
  try {
    const s = JSON.parse(raw || 'null');
    if (!s || s.schema !== 1) return null;
    return {
      checkpointRoom: Math.max(0, Math.min(roomCount - 1, s.checkpointRoom | 0)),
      facilityPower: s.facilityPower ? 1 : 0,
      hybridOutcome: ['allied', 'slain'].includes(s.hybridOutcome) ? s.hybridOutcome : null,
      bioSeed: s.bioSeed ? 1 : 0,
      tapes: Math.max(0, s.tapes | 0),
      parts: Math.max(0, s.parts | 0),
      missionComplete: !!s.missionComplete,
      wildlifeChoice: ['spared', 'hunted'].includes(s.wildlifeChoice) ? s.wildlifeChoice : null,
      defeated: Array.isArray(s.defeated) ? s.defeated.filter(x => typeof x === 'string') : [],
      collected: Array.isArray(s.collected) ? s.collected.filter(x => typeof x === 'string') : [],
    };
  } catch { return null; }
}

export function encodeRouteSave(state) {
  return JSON.stringify({
    schema: 1, checkpointRoom: state.checkpointRoom,
    facilityPower: state.facilityPower, hybridOutcome: state.hybridOutcome,
    bioSeed: state.bioSeed, tapes: state.tapes, parts: state.parts,
    missionComplete: state.missionComplete, wildlifeChoice: state.wildlifeChoice,
    defeated: [...state.defeated], collected: [...state.collected],
  });
}
