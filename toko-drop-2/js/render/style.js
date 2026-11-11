// style.js — the STYLE switch (v92; owner, 2026-10-31: "Do you have the 3
// visual options, watercolor, cell shaded, physical 3d?" and "Test the
// 'splatter' in multiple styles, as now it's the most washed out watercolor
// look"). PHYSICAL is the game as it was: jelly that bends light (gel.js,
// MeshPhysicalNodeMaterial). CEL-SHADED and WATERCOLOR are painted by the
// shading here, from the same bodies, the same displacement (gelDisplacement)
// and the same goo sims: a style changes how a thing is painted, never what it
// does, so the smoke's numbers are the same in every style.
//   - a gel body is BUILT in a style (gel.js gelMaterial(..., { style })): a
//     stylised body paints itself with a fragmentNode, so the physical lighting
//     and the transmission pass are skipped; the switch rebuilds the views
//     (actors.setStyle, as the GELS switch does) and the title warms the new ones
//   - the floor's film, the wall's film and the drops are one shader each and
//     read STYLE_U live (pickStyle)
// Tones are factors on the body's own colour (TUNING.style), so a species'
// colour survives the switch, as it must survive any light.
import { uniform, float, vec2, vec3, vec4, select, step, smoothstep, dot, normalize, mix, clamp, fract, sin, cameraViewMatrix, normalView, positionViewDirection } from 'three/tsl';
import { TUNING as T } from '../tuning.js?v=147';

export const STYLES = ['physical', 'cel', 'watercolor'];
export const STYLE_U = uniform(0);       // 0 physical, 1 cel, 2 watercolor: what the single shaders read
let current = 'physical';
export const styleName = () => current;
export function setStyle(s) { current = STYLES.includes(s) ? s : 'physical'; STYLE_U.value = STYLES.indexOf(current); return current; }
// a single shader's three answers, picked by the live uniform
export const pickStyle = (phys, cel, wc) => select(STYLE_U.greaterThan(1.5), wc, select(STYLE_U.greaterThan(0.5), cel, phys));

// a cheap hash in 0..1, and a grain factor round 1 from it (the pigment's granulation, the paper's tooth)
export const hash21 = (p) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
export const grainAt = (p, scale, amount) => float(1).add(hash21(p.mul(scale).floor()).sub(0.5).mul(amount));

// CEL-SHADED: three flat tones cut at the terminator, a hard highlight dot, an ink line where the body turns away
export function celBody(base, N, V, L) {
  const C = T.style.cel;
  const nl = dot(N, L).mul(0.5).add(0.5);
  const lit = step(float(C.lit), nl), mid = step(float(C.mid), nl);
  const tone = mix(float(C.shadow), float(1), mid.mul(C.midTone).add(lit.mul(1 - C.midTone)));
  const spec = step(float(C.specAt), dot(N, normalize(L.add(V))));
  const ink = step(float(C.inkAt), float(1).sub(clamp(dot(N, V), 0, 1)));
  const col = base.mul(tone).add(vec3(spec.mul(C.spec)));
  return mix(col, col.mul(C.ink), ink);
}
// WATERCOLOR: pigment (the colour deepened), a soft shade part-banded, DARK AT THE EDGES where the wash pools
// (the mark of the medium; the washed-out look is the one without it), grained, over a little paper
export function watercolorBody(base, N, V, L, p) {
  const W = T.style.watercolor;
  const nl = dot(N, L).mul(0.5).add(0.5);
  const soft = smoothstep(float(W.shadeFrom), float(W.shadeTo), nl), bands = nl.mul(W.bands).floor().div(W.bands);
  const tone = mix(float(W.shadow), float(1), mix(soft, bands, W.banding));
  const pig = base.pow(vec3(W.gamma));
  const edge = float(1).sub(clamp(dot(N, V), 0, 1)).pow(W.edgePow);
  let col = mix(pig.mul(tone), pig.mul(W.edgeDark), edge.mul(W.edge));
  col = col.mul(grainAt(p, W.grainScale, W.grain));
  return mix(col, vec3(1), W.paper);
}
// a body's colour in `style`, in view space: `base` its colour (a node), `p` an object-space xz for the grain,
// `lightDir` the sun's direction (a vec3 node or uniform)
export function styledBody(style, base, p, lightDir) {
  const N = normalize(normalView), V = positionViewDirection, L = normalize(cameraViewMatrix.mul(vec4(lightDir, 0.0)).xyz);
  return style === 'cel' ? celBody(base, N, V, L) : watercolorBody(base, N, V, L, p);
}
