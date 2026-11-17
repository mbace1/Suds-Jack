// sun.js — the world's sun, for the shaders that paint its light by hand (v93):
// the slab's curb shadows (floor.js concrete) and the lawn's (scenery.js) read
// where it stands and throw their shadows away from it, as the light map
// throws every body's (light.js setSun). main.js applyLight sets both from the
// world's light rig (TUNING.worlds.light[id].at), so the painted shadows and
// the lit bodies agree on where the sun is.
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

export const SUN_AT = uniform(new THREE.Vector3(8, 20, 10));
export function setSceneSun(x, y, z) { SUN_AT.value.set(x, y, z); }
