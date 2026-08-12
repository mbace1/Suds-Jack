// Retro — the PlayStation-era render tricks that do the heavy lifting on the
// look. The console had no sub-pixel precision in its rasteriser: vertices were
// snapped to a coarse screen grid, so geometry visibly wobbled as it moved.
// We reproduce that by snapping gl_Position in NDC inside every lit material's
// vertex shader. Combined with the low internal resolution, flat shading and
// nearest-filtered textures in the rest of the demo, that is most of the era.
import * as THREE from 'three';

const GRID = new THREE.Vector2(160, 120);

const SNAP = `
  if (gl_Position.w > 0.0) {
    gl_Position.xyz /= gl_Position.w;
    gl_Position.xy = floor(gl_Position.xy * uGrid) / uGrid;
    gl_Position.xyz *= gl_Position.w;
  }`;

/** Patch one material for vertex snapping. Idempotent. */
export function ps1(mat) {
  if (!mat || mat.userData.__ps1 || mat.isShaderMaterial) return mat;
  mat.userData.__ps1 = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uGrid = { value: GRID };
    shader.vertexShader = 'uniform vec2 uGrid;\n' + shader.vertexShader.replace(
      '#include <project_vertex>', '#include <project_vertex>' + SNAP);
  };
  mat.needsUpdate = true;
  return mat;
}

/** Patch everything already in a subtree. Materials are shared, so calling
 *  this once after setup covers every prop spawned later from the same pool. */
export function patchAll(root) {
  root.traverse(o => {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(ps1); else ps1(m);
  });
}
