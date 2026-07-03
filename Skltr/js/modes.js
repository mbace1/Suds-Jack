// Experimental preview toggles, picked from the title screen, off by default.
// visualTest: extra color/VFX pass (enemy accent colors, adrenaline-tinted hero,
//   richer kill/dash particles, bigger bloom) layered on top of the white-sketch look.
// depthTest: swaps in a bigger arena with giant terrain features (valley + cave)
//   instead of the normal-scale canyons, to explore a larger sense of scale.
const KV = 'skltrVisualTest', KD = 'skltrDepthTest';
export let visualTest = localStorage.getItem(KV) === '1';
export let depthTest = localStorage.getItem(KD) === '1';
export function setVisualTest(v) { visualTest = v; localStorage.setItem(KV, v ? '1' : '0'); }
export function setDepthTest(v) { depthTest = v; localStorage.setItem(KD, v ? '1' : '0'); }
