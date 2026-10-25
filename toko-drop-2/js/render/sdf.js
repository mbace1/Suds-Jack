// sdf.js — the SDF gels: the title's GELS · SDF.
//
// A gel body whose geometry is the shared dome (gel.js domeGeometry) or a
// cube look's rounded box is drawn as a ray-marched signed distance field
// instead of as a displaced mesh. Everything else about the body stays: the
// Mesh, its place in the view's groups and every transform the core and the
// look write (squash, silhouette, breath, smear, tumble, size, the death
// swell), its onBeforeRender death poses and its visibility. Only two things
// on the Mesh change:
//
//  - the geometry is a fitted proxy hull — an icosphere round the dome's
//    sphere, a box round the cube — scaled every frame in the vertex stage by
//    how far the displacement can reach (gel.js gelReach), so a miss costs as
//    few pixels as it can (a discarded pixel still runs the shading on WebGPU);
//  - the material is ONE physical jelly per species (and per `transparent`),
//    shared by all its views, so a new enemy does not build a shader. What
//    differs per gel — hit, hit direction, tear, phase, wobble, the glow
//    (flash, tell, VOLATILE, strobes), the colour and the opacity (CLOAKER) —
//    is read off the view's own classic material as each body is drawn
//    (onObjectUpdate). That material is no longer drawn but is still the one
//    the core and the looks write, so none of them knows the difference.
//
// The march runs in the mesh's LOCAL frame (any affine transform keeps a ray
// straight), in world distance along an unnormalised local direction; a hit
// is a step under a fraction of a pixel. The field is the dome or rounded box
// minus gel.js's own displacement taken at the REST point (the mesh moves each
// rest vertex along its rest normal; taken at the query point instead, the
// death thrash grows folds and droplets the mesh never has), so the step
// bound is 0.9/√(1+T²) with T from the hit, tear and wobble. The march is one
// shared variable that the depth, the mask and the normals all read.
//
// Numbers: TUNING.sdf. The hero, the jelly-death halves and the custom
// bodies (crystals, wheels, stalks, ribbons) stay meshes.
import * as THREE from 'three/webgpu';
import {
  Fn, Loop, Break, If, uniform, float, int, vec3, vec4, abs, max, min, length, normalize, clamp, select, sign,
  positionLocal, positionWorld, cameraPosition, modelWorldMatrixInverse, modelViewMatrix, cameraNear, cameraFar,
  viewZToPerspectiveDepth, transformNormalToView,
} from 'three/tsl';
import { TUNING } from '../tuning.js?v=48';
import { gelDisplacement, gelReach, gelGlow, gelThickness, DISP } from './gel.js?v=48';

const T = TUNING, B = T.blob;

// ── the proxies: unit hulls, scaled in the vertex stage ─────────────
// The icosphere's faces sit inside its vertices; scaling by 1/inradius makes
// the FACES circumscribe the sphere the dome lives in.
let ICO = null, ICO_IN = 1, BOX = null;
function ico() {
  if (ICO) return ICO;
  ICO = new THREE.IcosahedronGeometry(1, 2);
  const p = ICO.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  let inr = 1;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(b.clone().sub(a)).normalize();
    inr = Math.min(inr, Math.abs(n.dot(a)));
  }
  ICO_IN = inr;
  return ICO;
}
const box = () => (BOX ||= new THREE.BoxGeometry(2, 2, 2));

// ── the shared materials ────────────────────────────────────────────
const SHARED = new Map();
// a few numbers the readout and the tests read
export const sdfStats = { materials: 0, bodies: 0 };

// The per-gel values, read off the view's classic material as each body is
// drawn. `s` is mesh.userData.sdfSrc = { mat, u }: u is the REAL uniforms
// (mat.userData.u); a cube look's mat.gel is stand-ins that stay 0 for the
// mesh too, so a cube never ripples or thrashes in either style.
const per = (init, read) => uniform(init).onObjectUpdate(({ object }) => read(object.userData.sdfSrc));

// pixels → world at distance 1 from the camera, off the projection itself (the
// game's camera is an off-axis view offset, so not from its fov)
const _size = new THREE.Vector2();
const PX_ANGLE = uniform(0.001).onRenderUpdate(({ renderer, camera }) =>
  2 / (Math.abs(camera.projectionMatrix.elements[5]) * Math.max(1, renderer.getDrawingBufferSize(_size).y)));

function makeShared(name, classic, P) {
  const S = T.sdf, u0 = classic.userData.u, transparent = classic.transparent;
  const U = {
    phase: per(0, (s) => s.u.phase.value),
    wobble: per(0, (s) => s.u.wobble.value),
    radius: per(1, (s) => s.u.radius.value),
    hit: per(0, (s) => s.u.hit.value),
    hitDir: per(new THREE.Vector2(), (s) => s.u.hitDir.value),
    tear: per(0, (s) => s.u.tear.value),
    emissive: per(new THREE.Color(), (s) => s.mat.emissive),
    color: per(new THREE.Color(), (s) => s.mat.color),
    opacity: per(1, (s) => s.mat.opacity),
  };
  const m = new THREE.MeshPhysicalNodeMaterial();
  for (const k of ['metalness', 'roughness', 'clearcoat', 'clearcoatRoughness', 'sheen', 'sheenRoughness', 'transmission',
    'thickness', 'ior', 'attenuationDistance', 'dispersion', 'transparent', 'depthWrite', 'depthTest', 'side', 'blending']) m[k] = classic[k];
  for (const k of ['color', 'sheenColor', 'attenuationColor']) m[k].copy(classic[k]);
  m.name = `gel-sdf ${name}`;
  m.userData = { sdf: P.shape, jelly: classic.userData.jelly };
  m.attenuationDistanceNode = classic.attenuationDistanceNode;   // modelScale: per object already

  // ── the field, in the mesh's unit frame ──
  const R = U.radius, s = float(1).add(U.tear.mul(DISP.inflate));   // the thrash's inflate, about the floor contact
  const dome = P.shape === 'dome', cut = B.domeCut, inner = dome ? 0 : P.half - P.round;
  const k = B.domeRound, smaxH = (a, b) => max(float(k).sub(abs(a.sub(b))), 0).div(k);
  const smax = (a, b) => { const h = smaxH(a, b); return max(a, b).add(h.mul(h).mul(k * 0.25)); };
  const sph = (x) => length(x.sub(vec3(0, cut, 0))).sub(1);
  const base = dome
    ? (x) => smax(sph(x), x.y.negate())                                              // gel.js domeGeometry
    : (x) => { const q = abs(x).sub(inner); return length(max(q, 0)).add(min(max(q.x, max(q.y, q.z)), 0)).sub(P.round); };
  // the rest point: x moved back along the base's own gradient by its
  // distance, which is where the mesh's vertex came from (the mesh moves
  // each rest vertex along its rest normal). On the dome that gradient is
  // the sphere's radial blended into the floor's (0,-1,0) by smax's weight —
  // radial alone throws a skirt off the floor contact.
  const rest = dome
    ? (x, b) => {
      const a = sph(x), fl = x.y.negate(), h = smaxH(a, fl), wa = select(a.greaterThan(fl), float(1).sub(h.mul(0.5)), h.mul(0.5));
      const n = normalize(x.sub(vec3(0, cut, 0))).mul(wa).sub(vec3(0, float(1).sub(wa), 0));
      return x.sub(normalize(n).mul(b));
    }
    : (x, b) => x.sub(normalize(max(abs(x).sub(inner), 0).mul(sign(x)).add(x.mul(1e-4))).mul(b));
  const field = Fn(([x]) => {
    const x0 = x.div(s), b = base(x0);
    return b.sub(gelDisplacement(rest(x0, b).div(R), U).mul(R)).mul(s);
  }).setLayout({ name: 'gelField', type: 'float', inputs: [{ name: 'x', type: 'vec3' }] });
  const restField = Fn(([x]) => base(x.div(s)).mul(s))
    .setLayout({ name: 'gelRest', type: 'float', inputs: [{ name: 'x', type: 'vec3' }] });

  // ── the hull: the sphere (dome) or box (cube) the surface lives in ──
  const disp = gelReach(U).mul(R).toVar('sdfReach');               // the most the surface moves off the base
  const reach = disp.add(S.pad);
  const centre = dome ? vec3(0, float(cut).mul(s), 0) : vec3(0);
  const extent = float(dome ? 1 : P.half).add(reach).mul(s);       // sphere radius / box half size
  ico();
  m.positionNode = centre.add(positionLocal.mul(dome ? extent.div(ICO_IN) : extent));

  // ── the march ──
  const T_ = U.wobble.mul(S.lip.wobble).add(U.hit.mul(S.lip.hit)).add(U.tear.mul(S.lip.tear));
  const kstep = float(S.relax).div(float(1).add(T_.mul(T_)).sqrt());
  const marchOf = (stats) => Fn(() => {
    const Mi = modelWorldMatrixInverse;
    const rd = normalize(positionWorld.sub(cameraPosition));
    const o = Mi.mul(vec4(cameraPosition, 1)).xyz.toVar('sdfO');
    const d = Mi.mul(vec4(rd, 0)).xyz.toVar('sdfD');               // unnormalised: t stays world distance
    const dl = length(d).toVar('sdfDl');
    // enter and leave the hull's own sphere or box, analytically
    const tIn = float(0).toVar('sdfIn'), tOut = float(-1).toVar('sdfOut');
    if (dome) {
      const oc = o.sub(centre), a = d.dot(d), b = oc.dot(d), c = oc.dot(oc).sub(extent.mul(extent));
      const disc = b.mul(b).sub(a.mul(c));
      If(disc.greaterThan(0), () => { const q = disc.sqrt(); tIn.assign(b.negate().sub(q).div(a)); tOut.assign(b.negate().add(q).div(a)); });
    } else {
      const inv = vec3(1).div(d), t0 = extent.negate().sub(o).mul(inv), t1 = extent.sub(o).mul(inv);
      const lo = min(t0, t1), hi = max(t0, t1);
      tIn.assign(max(lo.x, max(lo.y, lo.z))); tOut.assign(min(hi.x, min(hi.y, hi.z)));
    }
    const t = max(tIn, 0).toVar('sdfT'), hit = float(0).toVar('sdfHitF'), dmin = float(1e9).toVar('sdfDmin'), tmin = t.toVar('sdfTmin');
    const dpx = float(1e9).toVar('sdfDpx'), n = float(0).toVar('sdfN');
    // the budget: S.steps, and more while a hit or the death thrash runs (the
    // step is shortest then, and a ray grazing one lump must still reach the next)
    const budget = float(S.steps).add(max(U.hit, U.tear).mul(S.burstSteps)).ceil().toVar('sdfBudget');
    Loop({ start: 0, end: int(budget), type: 'int', condition: '<' }, () => {
      If(t.greaterThan(tOut), () => { Break(); });
      const x = o.add(d.mul(t)).toVar('sdfX');
      const fw = field(x).div(dl).toVar('sdfFw');                    // ≈ world distance to the surface
      // farther from the base shape than the displacement reaches, the base
      // alone bounds the distance and the step need not be Lipschitz-short
      const far = base(x.div(s)).sub(disp).mul(s).div(dl);
      const fp = t.mul(PX_ANGLE);                                    // a pixel's footprint here
      dpx.assign(fw.div(fp));
      If(dpx.lessThan(dmin), () => { dmin.assign(dpx); tmin.assign(t); });
      If(dpx.lessThan(S.epsPx), () => { hit.assign(1); Break(); });
      t.addAssign(max(max(fw.mul(kstep), far), fp.mul(S.minStepPx)));
      n.addAssign(1);
    });
    // out of steps (not out of the hull) and close to the surface: take it
    const exhausted = n.greaterThan(budget.sub(0.5)).and(t.lessThanEqual(tOut));
    If(hit.lessThan(0.5).and(t.lessThanEqual(tOut)).and(dpx.lessThan(S.acceptPx)), () => { hit.assign(1); });
    // the coverage: 1 on a hit; a near miss feathers the edge (alpha to coverage)
    const cov = S.aa && !transparent
      ? max(hit, clamp(float(0.5).sub(dmin), 0, 0.5))   // only pixels within half a pixel of the surface: a wider feather grew every silhouette (globbo +13%) and drew a dark fringe
      : hit;
    // TUNING.sdf.debug 'steps': red the steps taken, green a ray taken out of
    // steps, blue a miss inside the hull (magenta: a miss out of steps)
    if (stats) return vec4(n.div(S.steps + S.burstSteps), select(exhausted.and(hit.greaterThan(0.5)), 1, 0), select(hit.lessThan(0.5), 1, 0), select(exhausted, 1, 0));
    return vec4(o.add(d.mul(select(hit.greaterThan(0.5), t, tmin))), select(tOut.greaterThan(0), cov, 0));
  });
  const march = marchOf(false)().toVar('sdfMarch');
  const hp = march.xyz, cov = march.w;

  // normals: the field's gradient (lumps and dents shade) or the bare dome's
  const nf = S.normals === 'rest' ? restField : field, e = S.normalEps;
  const k1 = vec3(1, -1, -1), k2 = vec3(-1, -1, 1), k3 = vec3(-1, 1, -1), k4 = vec3(1, 1, 1);
  const g = k1.mul(nf(hp.add(k1.mul(e)))).add(k2.mul(nf(hp.add(k2.mul(e)))))
    .add(k3.mul(nf(hp.add(k3.mul(e))))).add(k4.mul(nf(hp.add(k4.mul(e)))));
  m.normalNode = transformNormalToView(normalize(g)).normalize();
  m.clearcoatNormalNode = m.normalNode;            // or the clearcoat reads the proxy's flat faces
  m.maskNode = cov.greaterThan(0);
  m.depthNode = viewZToPerspectiveDepth(modelViewMatrix.mul(vec4(hp, 1)).z, cameraNear, cameraFar);
  if (classic.thicknessNode) m.thicknessNode = gelThickness({ thick: u0.thick, radius: R }, hp.y);
  m.emissiveNode = gelGlow({ ...u0, tear: U.tear }, U.emissive);
  m.colorNode = U.color;
  // a CLOAKER blends: its opacity is the look's, and its edge stays a discard
  if (S.aa && !transparent) { m.opacityNode = U.opacity.mul(cov); m.alphaToCoverage = true; }
  else m.opacityNode = U.opacity;
  if (S.debug === 'steps') {
    const st = marchOf(true)();
    m.transmission = 0; m.colorNode = vec3(0); m.maskNode = null; m.opacityNode = float(1); m.alphaToCoverage = false;
    m.emissiveNode = vec3(st.x.add(st.w), st.y, st.z);
  }
  sdfStats.materials++;
  return m;
}

// Convert a freshly built view: every Mesh under its root drawn with a
// gel.js material on the dome or a tagged rounded box. Returns how many.
export function toSdf(v) {
  let n = 0;
  v.root.traverse((o) => {
    const cm = o.material, P = o.geometry?.userData?.sdf;
    if (!o.isMesh || !P || !cm?.userData?.u || o.userData.sdfSrc) return;
    const key = `${v.kind}:${n}:${cm.transparent ? 't' : 'o'}`;
    let m = SHARED.get(key);
    if (!m) SHARED.set(key, (m = makeShared(key, cm, P)));
    o.userData.sdfSrc = { mat: cm, u: cm.userData.u };
    o.material = m;
    o.geometry = P.shape === 'dome' ? ico() : box();
    o.frustumCulled = false;                 // the hull is resized in the vertex stage; the arena is all on screen
    o.raycast = () => {};
    n++;
  });
  sdfStats.bodies += n;
  return n;
}
