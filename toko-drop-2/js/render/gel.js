// gel.js — the gelatin: 1.x's satin gel material and its body shapes.
//
// A port of 1.x's WebGPU path (js/enemy.js at v268: makeSatinMat +
// applyGooNodes, the dome SDF and the rounded cube), which already ran as a
// TSL node graph on three's WebGPURenderer. The surface is a physical
// material — clearcoat, sheen, a little transmission — and everything that
// moves is in the vertex graph: three octaves of lumps that simmer at rest,
// a ripple that spreads from where a bullet landed, and the death thrash
// that inflates the body before it pops. A soft translucency glow (light
// bleeding through from behind, plus wrap lighting) rides on the emissive.
//
// The numbers are TUNING.material and TUNING.blob, which are 1.x's own.
import * as THREE from 'three/webgpu';
import {
  uniform, positionLocal, normalLocal, normalView, positionViewDirection, cameraViewMatrix,
  materialEmissive, modelScale, vec3, vec4, float, sin, cos, exp, dot, normalize, clamp,
} from 'three/tsl';
import { TUNING } from '../tuning.js?v=43';

const T = TUNING;

// One clock for every gel, written once a frame by main.js.
export const GEL_TIME = uniform(0);

// The light the translucency is computed against: 1.x's sun.
const SUN_DIR = new THREE.Vector3(...T.light.sun.position).normalize();

// 1.x's contrast floor: a body darker than `minLum` gets a rim in its own hue,
// lifted toward white, so its silhouette reads against the floor.
const JELLY_FAMILIES = new Set(['blob', 'cube']);
const lumOf = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
function contrastRim(lum) {
  const C = T.material.contrast;
  return Math.max(0, Math.min(1, (C.minLum - lum) / C.minLum)) * C.rim;
}
function contrastLift(col) {
  const C = T.material.contrast, L = lumOf(col), want = C.minLum * C.lift;
  if (L >= want || L <= 0) return col;
  return col.multiplyScalar(Math.min(want / L, 6));
}

// fam: 'blob' or 'cube' (per-family overrides in TUNING.material.families).
// radius: the body's world radius, so every size gets the same lump count.
// `jelly`: 2.0's see-through jelly (TUNING.material.jelly) or 1.x's satin.
// The gel bodies are jelly (the blob and cube families) unless the tuning
// turns it off; the crystals, the wheel and the stalk keep their tuned satin
// (their looks set their own transmission), and the hero never is.
export function gelMaterial(hex, fam, radius, { wobble, jelly = T.material.jelly.on && JELLY_FAMILIES.has(fam) } = {}) {
  const M = T.material, ov = M.families[fam] || {}, J = { ...M.jelly, ...(ov.jelly || {}) };
  const col = new THREE.Color(hex);
  const baseLum = lumOf(col);
  contrastLift(col);
  // the hue at full strength (brightest channel 1): what white light becomes
  // after `attenuation` radii of jelly
  const deep = col.clone().multiplyScalar(1 / Math.max(col.r, col.g, col.b, 1e-3));
  const m = new THREE.MeshPhysicalNodeMaterial({
    color: jelly ? col.clone().lerp(new THREE.Color(0xffffff), J.tintWhite) : col, metalness: 0,
    roughness: jelly ? J.roughness : ov.roughness ?? M.roughness,
    clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness,
    sheen: M.sheen, sheenColor: col.clone().lerp(new THREE.Color(0xffffff), 0.4), sheenRoughness: 0.35,
    transmission: jelly ? J.transmission : ov.transmission ?? M.transmission,
    thickness: jelly ? J.thickness : M.thickness, ior: jelly ? J.ior : M.ior,
    attenuationColor: jelly ? deep : col, attenuationDistance: 1.2,
    dispersion: jelly ? J.dispersion : 0,
  });
  // absorption scales with the body: the views are pooled at unit size and
  // scaled, so the distance is in radii of the mesh as it stands
  if (jelly) m.attenuationDistanceNode = float(J.attenuation).mul(modelScale.x);
  const u = {
    phase: uniform(Math.random() * Math.PI * 2),
    wobble: uniform(wobble ?? (fam === 'blob' ? 1.0 : 0.35)),
    radius: uniform(radius),
    hit: uniform(0),                                // 1 at impact, decays to 0
    hitDir: uniform(new THREE.Vector2(0, 0)),       // object-space xz toward the impact
    tear: uniform(0),                               // 1 at death onset, decays
    stretch: uniform(0),
    stretchDir: uniform(new THREE.Vector2(0, 0)),
    sss: uniform(jelly ? J.sss : M.sss),
    sssColor: uniform(col.clone().lerp(new THREE.Color(0xffffff), 0.25)),
    lightDir: uniform(SUN_DIR.clone()),
    thick: uniform(jelly ? J.thickness : M.thickness),
    rim: uniform(contrastRim(baseLum)),
    rimPow: uniform(M.contrast.rimPow),
    rimColor: uniform(col.clone().lerp(new THREE.Color(0xffffff), M.contrast.rimWhite)),
    core: uniform(jelly ? J.core : 0),
    corePow: uniform(J.corePow),
    coreColor: uniform(deep.clone()),
  };
  // ── the vertex graph: lumps, hit ripple, death thrash, stretch ──
  // (the displacement is gelDisplacement, shared with the SDF field, sdf.js)
  let p = positionLocal.add(normalLocal.mul(gelDisplacement(positionLocal.div(u.radius), u).mul(u.radius)));
  // pressure before the pop: the death thrash inflates the body about its floor contact
  p = p.mul(float(1.0).add(u.tear.mul(DISP.inflate)));
  const sdir = vec3(u.stretchDir.x, 0.0, u.stretchDir.y);
  p = p.add(sdir.mul(dot(p, sdir)).mul(u.stretch));
  m.positionNode = vec3(p.x, p.y.mul(float(1.0).sub(u.stretch.mul(0.4))), p.z);

  // ── the glow and the dome's refraction depth ──
  m.emissiveNode = gelGlow(u, materialEmissive);
  m.thicknessNode = gelThickness(u, positionLocal.y);
  m.gel = u;
  m.userData.jelly = jelly;
  // the real uniforms and the family, for the SDF bodies (sdf.js): a cube look
  // swaps `mat.gel` for stand-ins after build, and a custom look clears it
  m.userData.u = u; m.userData.fam = fam;
  return m;
}

// ── the displacement law, shared by the mesh (above) and the SDF field ──
// The surface moves along its rest normal by gelDisplacement(q) radii, q the
// rest point in radii (positionLocal / radius): three octaves of lumps that
// simmer, a ripple from where a bullet landed, 2.0's dent, and the death
// thrash. DISP holds its amplitudes, so gelReach (the most it can move, which
// sizes the SDF proxy) cannot fall out of step with it.
export const DISP = { lump: 0.13, simmer: 0.028, simmerHit: 0.075, ripple: 0.11, thrash: 0.22, inflate: 0.2 };

// 2.0's dent: pushed in where the shot landed, springing back through an
// overshoot (TUNING.blob.dent); the seconds since the hit come off `hit`,
// which runs from 1 to 0 over the ripple's life
function dentSpring(u) {
  const D = T.blob.dent, since = float(1.0).sub(u.hit).mul(T.blob.hitRipple);
  return cos(since.mul(D.freq)).mul(exp(since.mul(-D.damp))).mul(clamp(u.hit.mul(40.0), 0.0, 1.0));
}

export function gelDisplacement(q, u, t = GEL_TIME) {
  const D = T.blob.dent;
  const wave = sin(q.x.mul(3.6).add(t.mul(2.1)).add(u.phase))
    .add(sin(q.y.mul(4.2).add(t.mul(1.6)).add(u.phase.mul(1.3))))
    .add(sin(q.z.mul(4.8).add(t.mul(2.5)).add(u.phase.mul(0.7))))
    .mul(0.3333);
  const hd = dot(normalize(q), vec3(u.hitDir.x, 0.0, u.hitDir.y));
  const ripple = sin(hd.mul(9.0).sub(float(1.0).sub(u.hit).mul(16.0))).mul(u.hit).mul(DISP.ripple);
  const focus = exp(float(1.0).sub(hd).mul(-D.focus));
  const te = sin(q.x.mul(15.0).add(t.mul(34.0)))
    .add(sin(q.y.mul(17.0).sub(t.mul(29.0))))
    .add(sin(q.z.mul(13.0).add(t.mul(38.0))))
    .mul(0.3333);
  // a finer octave keeps the surface simmering, and seethes while a ripple is live
  const oct2 = sin(q.x.mul(8.3).add(t.mul(4.7)).add(u.phase.mul(2.1)))
    .add(sin(q.y.mul(9.1).sub(t.mul(3.9)).add(u.phase)))
    .add(sin(q.z.mul(7.7).add(t.mul(5.3))))
    .mul(0.3333);
  return wave.mul(u.wobble.mul(DISP.lump))
    .add(ripple)
    .sub(focus.mul(dentSpring(u)).mul(D.depth))
    .add(te.mul(u.tear.mul(DISP.thrash)))
    .add(oct2.mul(u.wobble.mul(float(DISP.simmer).add(u.hit.mul(DISP.simmerHit)))));
}

// The most gelDisplacement can move the surface, in radii: every sum of
// three sines is at most 1, so this is the sum of the terms' amplitudes.
export function gelReach(u) {
  return u.wobble.mul(float(DISP.lump + DISP.simmer).add(u.hit.mul(DISP.simmerHit)))
    .add(u.hit.mul(DISP.ripple))
    .add(dentSpring(u).abs().mul(T.blob.dent.depth))
    .add(u.tear.mul(DISP.thrash));
}

// The glow: translucency (light bleeding through from behind), wrap light,
// the death flare and the contrast rim, on top of `emissive` (the flash, the
// tell). Reads normalView, so it follows whatever normal the material shades.
export function gelGlow(u, emissive) {
  const V = positionViewDirection;
  const L = normalize(cameraViewMatrix.mul(vec4(u.lightDir, 0.0)).xyz);
  const N = normalize(normalView);
  const H = normalize(L.add(N.mul(0.45)));
  const sss = clamp(dot(V, H.negate()), 0.0, 1.0).pow(2.2).mul(u.sss);
  const wrap = clamp(dot(N, L).mul(0.5).add(0.5), 0.0, 1.0);
  const fres = float(1.0).sub(clamp(dot(N, V), 0.0, 1.0)).pow(3.0);
  const rimF = float(1.0).sub(clamp(dot(N, V), 0.0, 1.0)).pow(u.rimPow);
  return emissive
    .add(u.sssColor.mul(sss.add(wrap.mul(0.18).mul(u.sss)).add(u.tear.mul(fres.mul(1.1).add(0.7)))))
    .add(u.rimColor.mul(rimF).mul(u.rim))
    // the jelly's inner glow: the full hue where the body faces you
    .add(u.coreColor.mul(clamp(dot(N, V), 0.0, 1.0).pow(u.corePow)).mul(u.core));
}

// dome refraction: thick at the belly, thin at the crown (y local)
export function gelThickness(u, y) {
  return u.thick.mul(clamp(float(1.25).sub(y.div(u.radius).mul(0.41)), 0.55, 1.25));
}

// ── shapes ─────────────────────────────────────────────────────────

function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }

// Shrink-wrap a dense sphere onto an SDF's zero crossing; normals from the
// SDF gradient (1.x sdfGeometry).
function sdfGeometry(sdf, detail) {
  const geo = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.66));
  const pos = geo.attributes.position, nor = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let lo = 0.05, hi = 2.4;
    for (let it = 0; it < 24; it++) { const mid = (lo + hi) * 0.5; if (sdf(v.x * mid, v.y * mid, v.z * mid) < 0) lo = mid; else hi = mid; }
    const s = (lo + hi) * 0.5, qx = v.x * s, qy = v.y * s, qz = v.z * s, e = 0.003;
    pos.setXYZ(i, qx, qy, qz);
    const nx = sdf(qx + e, qy, qz) - sdf(qx - e, qy, qz),
          ny = sdf(qx, qy + e, qz) - sdf(qx, qy - e, qz),
          nz = sdf(qx, qy, qz + e) - sdf(qx, qy, qz - e);
    const inv = 1 / Math.hypot(nx, ny, nz);
    nor.setXYZ(i, nx * inv, ny * inv, nz * inv);
  }
  return geo;
}

// The gel dome every blob shares: most of a ball with a rounded-off flat
// bottom, origin at the floor contact so squash and breathe anchor to the
// ground. Unit radius; a body scales it by radius × its species' shape.
export function domeGeometry() {
  const { domeCut, domeRound } = T.blob;
  const g = sdfGeometry((x, y, z) => smax(Math.hypot(x, y, z) - 1, -y - domeCut, domeRound), 72);
  g.translate(0, domeCut, 0);
  g.userData.sdf = { shape: 'dome' };     // sdf.js draws it as a field
  return g;
}

// The cube family: a rounded box 1.8 radii on a side (1.x RoundedBoxGeometry,
// 4 segments, 0.18 corner), standing on y = 0. Unit radius.
export function cubeGeometry() {
  const side = 1.8, round = 0.18 / 0.75;          // 1.x's corner at a typical 0.75 radius
  const g = new THREE.BoxGeometry(side, side, side, 10, 10, 10);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), inner = side / 2 - round;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.copy(v).clampScalar(-inner, inner);
    const n = v.sub(c);
    if (n.lengthSq() > 1e-10) n.normalize().multiplyScalar(round);
    p.setXYZ(i, c.x + n.x, c.y + n.y, c.z + n.z);
  }
  g.translate(0, side / 2, 0);
  g.computeVertexNormals();
  return g;
}

// The hero: a plain sphere, r 1 (scaled), resting on the floor.
export function heroGeometry() {
  const g = new THREE.SphereGeometry(1, 40, 28);
  g.translate(0, 1, 0);
  return g;
}
