// light.js — the arena's light: what the bullets and the blasts throw on the
// floor, and the soft shadow every body stands in.
//
// Owner, 2026-10-22: the graphics pass's third step, light on the arena, but
// no reflective floor ("we have concrete in the beginning, or a grid like
// now; later we may test other surfaces"). So the floor stays matte and the
// light is painted onto it. 1.x's floor is unlit (a picture, floor.js), so
// nothing in the scene's lighting can reach it: instead, every frame a small
// top-down LIGHT MAP of the arena is drawn,
//   rgb — light: a soft pool under every bullet in its colour, the flash of
//         the hero's muzzle, the burst of a kill and of the dash boom
//   a   — shadow: a soft disc under every body, overlapping ones taking the
//         darker (max), never adding up to black
// and the floor's shader reads it (floor.js): a shadow darkens what is under
// it, and light lifts the floor a little and its grid lines a lot, the way a
// lit surface shows its texture. No surface needs to know what lit it, so a
// concrete floor can read the same map.
//
// Reads the world and its events, never writes them. Every number is
// TUNING.light.arena.
import * as THREE from 'three/webgpu';
import { uv, vec2, vec3, float, length, clamp, pow, uniform, mix, smoothstep, abs, max, step, instanceColor } from 'three/tsl';
import { TUNING } from '../tuning.js?v=143';

const T = TUNING, A = T.light.arena, _Y = new THREE.Vector3(0, 1, 0);
// v131: how tall a thing stands, in its radii, for the length of its shadow in a low sun: a dome its cut sphere ×
// its species' squash, a cube 1.8, the rest about one and a half; a bollard 2.5, the beach ball 2
const POST_H = { bollard: 2.5, ball: 2 };
function bodyHeight(kind) {
  const S = T.species[kind], B = T.blob;
  if (S?.family === 'cube') return 1.8;
  if (S?.family === 'blob') return (1 + B.domeCut) * (B.shapes[kind]?.y ?? B.shape.y) * (B.squat ?? 1);
  return 1.5;
}
// v132: what a body's shadow is the shadow of, and the radius of the foot it stands on, in its radii: a dome its
// widest (its species' shape across), a cube half its side (1.8 radii a side, render/gel.js), anything else its radius
function formOf(kind) { const f = T.species[kind]?.family; return f === 'cube' ? 'box' : 'dome'; }
function footOf(kind) {
  const S = T.species[kind], B = T.blob;
  if (S?.family === 'cube') return 0.9;
  if (S?.family === 'blob') { const sh = B.shapes[kind] ?? B.shape; return (sh.x + sh.z) / 2; }
  return 1;
}
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

function quads(cap, mat) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.setColorAt(0, new THREE.Color());
  m.count = 0; m.frustumCulled = false;
  return m;
}

export class ArenaLight {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    this.cam.position.set(0, 20, 0); this.cam.up.set(0, 0, -1); this.cam.lookAt(0, 0, 0);
    this.rt = new THREE.RenderTarget(16, 16, { type: THREE.HalfFloatType, depthBuffer: false });
    const falloff = pow(clamp(float(1).sub(length(uv().sub(vec2(0.5, 0.5))).mul(2)), 0, 1), float(A.pow));
    // light: added straight into rgb (its colour × strength is the instance colour), alpha left alone
    const lightMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    lightMat.colorNode = vec3(falloff);
    Object.assign(lightMat, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    // shadow: rgb left alone, the darkest shadow kept in alpha
    const shadeMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    // v128: a world in a low sun throws HARDER, darker shadows (TUNING.worlds.light[…].shadow: `k` × the strength, and
    // `hard` of the way from the soft falloff to an edge `edge` wide); 1 and 0 where a world says nothing
    this.shadeK = uniform(1); this.shadeHard = uniform(0);
    const disc = length(uv().sub(vec2(0.5, 0.5))).mul(2), edgy = float(1).sub(smoothstep(float(1).sub(A.shadow.edge ?? 0.35), 1, disc));
    shadeMat.colorNode = vec3(0); shadeMat.opacityNode = mix(falloff, edgy, this.shadeHard).mul(A.shadow.strength).mul(this.shadeK);
    Object.assign(shadeMat, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.MaxEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
    this.pools = quads(A.cap, lightMat);
    this.shades = quads(A.shadow.cap, shadeMat);
    // v132 (owner, 2026-11-09: "Shadows should not be as circular at the point where they connect with character,
    // because now that makes them look like they are floating"): where a world casts hard shadows (`cast`), a body's
    // shadow is its own projection — the foot it stands on, then the rest of it laid out away from the sun, AS WIDE
    // AS THE BODY WHERE IT LEAVES IT (no neck, no round cap at the foot), sharpest and darkest at the foot, softer and
    // lighter toward its tip. v128-v131 drew an ellipse whose round end met the body narrower than the body, darkest
    // two radii out, with (v131) a round shade all round the foot: a ball hanging over a blob, as the owner saw.
    // One quad a body, its foot's radius 1 across; its numbers ride in the instance colour — (L, n, e): its far end in
    // foot radii, its outline's power (2 round, `box` for a cube) and 1 where past the foot it is half an ellipse
    // (a dome, a ball: the projection of a dome is its foot and half of the ellipse its top throws), 0 where it runs
    // straight on to a cap (a bollard, a cube)
    this.castNear = uniform(0.1); this.castFar = uniform(0.5); this.castTip = uniform(0.6);
    {
      const P = instanceColor, Lf = P.x, n = P.y;
      const u = mix(float(-1), Lf, uv().x), v = abs(uv().y.sub(0.5).mul(2));
      const past = mix(max(u.sub(Lf.sub(1)), 0), u.div(Lf), P.z);             // past the foot: straight on, or the half-ellipse
      const dx = max(u.negate(), 0).add(past.mul(step(0, u)));
      const f = pow(pow(dx, n).add(pow(v, n)), float(1).div(n));
      const t = clamp(u.div(Lf), 0, 1), e = mix(this.castNear, this.castFar, t);
      const castMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
      castMat.colorNode = vec3(0);
      castMat.opacityNode = float(1).sub(smoothstep(float(1).sub(e), 1, f)).mul(mix(float(1), this.castTip, smoothstep(0, 1, t)))
        .mul(A.shadow.strength).mul(this.shadeK);
      Object.assign(castMat, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor,
        blendEquationAlpha: THREE.MaxEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
      this.casts = quads(A.shadow.cap, castMat);
    }
    this.scene.add(this.casts, this.shades, this.pools);
    this.sunOff = { x: 0, z: 0 };   // where a caustic slides to, away from the world's sun (setSun)
    this.sunDir = { dx: 1, dz: 0, cot: 0, stretch: 1 };   // v93: the way the sun's shadows fall; straight down until setSun
    this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.bursts = [];   // { x, z, r, k, life, max, hex }
    this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this._prev = new THREE.Color();
  }

  get texture() { return this.rt.texture; }

  // the world's sun stands at (x, y, z) (main.js applyLight): a caustic (actors.js)
  // slides `offset` × its radius away from it along the floor
  // v121: how strong the hero's own light is in the world on now (TUNING.worlds.light[…].hero, 1 where unsaid)
  // v123: and how strong the bullets' (`shots`), and whether every body is a light of its own (`bodies`)
  heroK = 1; shotK = 1; bodyLight = null;
  extra = [];   // v123: pools of light from outside the floor, { x, z, r, hex, k } (scenery.lightsAt)
  setWorldLight(L = {}) {
    this.heroK = L.hero ?? 1; this.shotK = L.shots ?? 1; this.bodyLight = L.bodies ?? null;
    this.shadeK.value = L.shadow?.k ?? 1; this.shadeHard.value = L.shadow?.hard ?? 0;   // v128
    // v128: and a hard shadow drawn where a ball's would fall (`r` × the radius across, its middle `offset` × cot θ × r
    // on), not the soft one's wider disc, whose sun side would show as a dark rim round the body's foot
    this.shadeR = L.shadow?.r != null ? L.shadow.r / A.shadow.r : 1; this.shadeOff = L.shadow?.offset ?? A.shadow.sun.offset;
    // v132: and where it casts hard ones, each body throws its own projection (`cast`; _putShade)
    this.cast = L.shadow?.cast ?? null;
    if (this.cast) { this.castNear.value = this.cast.near ?? 0.1; this.castFar.value = this.cast.far ?? 0.5; this.castTip.value = this.cast.tip ?? 0.6; }
  }
  shadeR = 1; shadeOff = A.shadow.sun.offset;
  setSun(x, y, z) {
    const l = Math.hypot(x, z) || 1, lean = l / (Math.abs(y) || 1);
    this.sunOff.x = (-x / l) * Math.min(1, lean) * A.caustic.offset; this.sunOff.z = (-z / l) * Math.min(1, lean) * A.caustic.offset;
    // v93: the shadow a body throws goes AWAY from the sun and grows as the sun stands lower — cot θ of its
    // elevation, held to `cotMax` so a sun on the horizon does not throw a shadow across the floor
    const h = Math.hypot(x, z);   // straight overhead (h = 0) throws the disc it always was
    const cot = h < 1e-6 ? 0 : Math.min(A.shadow.sun.cotMax, h / Math.max(1e-3, Math.abs(y)));
    this.sunDir = h < 1e-6 ? { dx: 1, dz: 0, cot: 0, stretch: 1 } : { dx: -x / h, dz: -z / h, cot, stretch: Math.sqrt(1 + cot * cot) };   // 1 / sin θ
  }

  // a body's shadow (v93): what the world's sun throws of a ball standing on the floor — an ellipse `stretch`
  // times as long along the way from the sun as it is across, its middle `offset` × cot θ × r on from the foot,
  // so it still starts under the body (a contact shadow, not a cast one, keeps a body readable at its foot).
  // Before v93 every world's shadow was a disc straight under the body, whatever its light said.
  // `r` the body's radius (m), `H` how tall it stands in radii, `form` what it is ('dome' | 'ball' | 'post' |
  // 'box'), `foot` the radius it stands on in radii, `soft` × the soft ellipse's size where a world casts no `cast`
  _putShade(x, z, r, H = 1.4, form = 'dome', foot = 1, soft = 1) {
    const d = this.sunDir, C = this.cast;
    this._q.setFromAxisAngle(_Y, Math.atan2(-d.dz, d.dx));
    if (C) {
      // v132: the foot (radius R, under the body) and the run of it away from the sun: a dome's or a ball's top lands
      // `H r cot θ` on, and its shadow is the foot and half the ellipse that reaches √(R² + run²); a bollard's or a
      // cube's runs straight on that far and ends in a cap of the foot's own size
      if (this._ncast >= A.shadow.cap) return;
      const R = r * foot, run = H * r * d.cot * (form === 'dome' ? (C.dome ?? 1) : 1), round = form === 'dome' || form === 'ball';
      const L = Math.max(1.001, round ? Math.hypot(R, run) / R : (run + R) / R), mid = (R * (L - 1)) / 2;
      this._s.set(R * (L + 1), 1, 2 * R); this._p.set(x + d.dx * mid, 0, z + d.dz * mid);
      this.casts.setMatrixAt(this._ncast, this._m.compose(this._p, this._q, this._s));
      this.casts.setColorAt(this._ncast++, this._c.setRGB(L, form === 'box' ? (C.box ?? 6) : 2, round ? 1 : 0));
      return;
    }
    if (this._ns >= A.shadow.cap) return;
    r *= A.shadow.r * soft * this.shadeR;
    const off = r * d.cot * this.shadeOff;
    this._s.set(r * 2 * d.stretch, 1, r * 2); this._p.set(x + d.dx * off, 0, z + d.dz * off);
    this.shades.setMatrixAt(this._ns, this._m.compose(this._p, this._q, this._s));
    this.shades.setColorAt(this._ns++, this._c.setHex(0));
  }

  // the map covers the arena exactly, at A.perMetre texels a metre
  setArena(hx, hz) {
    Object.assign(this.cam, { left: -hx, right: hx, top: hz, bottom: -hz });
    this.cam.updateProjectionMatrix();
    this.rt.setSize(Math.max(16, Math.round(2 * hx * A.perMetre)), Math.max(16, Math.round(2 * hz * A.perMetre)));
  }

  onEvent(e) {
    if (this.bursts.length >= A.burstCap) return;
    const B = A.burst;
    if (e.type === 'kill') {
      const k = e.boss ? B.kill.boss : e.big ? B.kill.big : 1;
      this.bursts.push({ x: e.x, z: e.z, r: e.r * B.kill.r * Math.sqrt(k), k: B.kill.k * k, life: B.kill.life, max: B.kill.life, hex: e.color });
    } else if (e.type === 'dashBoom') {
      this.bursts.push({ x: e.x, z: e.z, r: B.dash.r, k: B.dash.k, life: B.dash.life, max: B.dash.life, hex: T.hero.dashBoom.color });
    } else if (e.type === 'shot' && !e.round) {
      this.bursts.push({ x: e.x, z: e.z, r: B.muzzle.r, k: B.muzzle.k, life: B.muzzle.life, max: B.muzzle.life, hex: T.bullets.heroColor });
    }
  }

  step(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) if ((this.bursts[i].life -= dt) <= 0) this.bursts.splice(i, 1);
  }

  _put(mesh, n, x, z, r, hex, k) {
    this._m.makeScale(r * 2, 1, r * 2).setPosition(x, 0, z);
    mesh.setMatrixAt(n, this._m);
    mesh.setColorAt(n, this._c.setHex(hex).multiplyScalar(k));
  }

  // `views` (the actors' live views by gel id) says which bodies are drawn:
  // a body its look hides, or shrinks with `shadow`, casts that much shadow
  sync(w, alpha, views) {
    let n = 0;
    const P = A.bullet;
    // v104 (owner: "more HD graphics and light. No cheap effects like glow"): the hero carries a light — a
    // wide pool on the floor round it (the floor lit, as a bullet lights it), where a halo used to glow. First, so
    // a floor full of bullets and bodies (v123: every body a light) cannot crowd it out of the map's `cap`
    const HL = A.hero, hh = w.hero;
    if (HL && hh.alive) this._put(this.pools, n++, hh.px + (hh.x - hh.px) * alpha, hh.pz + (hh.z - hh.pz) * alpha, HL.r, HL.color, HL.k * this.heroK);
    for (const bl of w.bullets) {
      if (n >= A.cap) break;
      const B = bl.hero ? P.hero : P.gel;
      this._put(this.pools, n++, bl.px + (bl.x - bl.px) * alpha, bl.pz + (bl.z - bl.pz) * alpha, B.r, bl.color, B.k * this.shotK);
    }
    for (const b of this.bursts) {
      if (n >= A.cap) break;
      const t = b.life / b.max;
      this._put(this.pools, n++, b.x, b.z, b.r, b.hex, b.k * t * t);
    }
    // v123: light from round the floor (main.js sets it each frame: world 1's neon lines as they pass the edge)
    for (const e of this.extra) { if (n >= A.cap) break; this._put(this.pools, n++, e.x, e.z, e.r, e.hex, e.k); }
    // v123 (owner, 2026-11-08: "push for more lights"): in the neon world every body is a light — a pool in its
    // colour round its foot, so the grid lights up wherever one stands (TUNING.worlds.light[…].bodies: `r` × its
    // radius plus `add` m, `k` strong, a boss × `boss`; the worlds a sun lights have none)
    const BL = this.bodyLight;
    if (BL) for (const g of w.gels) {
      if (n >= A.cap) break;
      if (!g.alive || (g.state === 'appear' && g.t < 0)) continue;
      const v = views?.get(g.id);
      if (v && v.root && !v.root.visible) continue;
      const grow = g.child || !(g.t < T.gel.swell) ? 1 : smooth(g.t / T.gel.swell);
      if (grow <= 0.01) continue;
      this._put(this.pools, n++, g.px + (g.x - g.px) * alpha, g.pz + (g.z - g.pz) * alpha, (g.r * BL.r + BL.add) * grow,
        T.species[g.kind]?.color ?? 0xffffff, BL.k * (g.isBoss ? BL.boss : 1));
    }
    this._ns = 0; this._ncast = 0;
    const h = w.hero;
    // the hero's shadow narrows as it falls into a world from high up, and goes with it down a drain (a ball: v132)
    if (h.alive) this._putShade(h.px + (h.x - h.px) * alpha, h.pz + (h.z - h.pz) * alpha, T.hero.radius * (1 - 0.6 * (h.fall || 0)) * (1 - (h.sink || 0)), 2, 'ball', this.cast?.ball ?? 0.9);
    for (const g of w.gels) {
      if (g.state === 'appear' && g.t < 0) continue;              // a brood still waiting out its parent's pop is not there yet
      const v = views?.get(g.id);
      if (v && v.root && !v.root.visible) continue;
      const grow = g.child || !(g.t < T.gel.swell) ? 1 : smooth(g.t / T.gel.swell);
      // v132: as wide as the body is drawn now (a squashed body spreads; its look may shrink its shadow)
      const spread = Math.max(0.6, Math.min(1.6, v?.squash?.scale?.x ?? 1));
      const r = g.r * grow * (v?.shadow ?? 1);
      if (r * A.shadow.r > 0.02) this._putShade(g.px + (g.x - g.px) * alpha, g.pz + (g.z - g.pz) * alpha, r, bodyHeight(g.kind), formOf(g.kind), footOf(g.kind) * spread);
    }
    // v108: what stands on a later world's floor stands in its own shadow (sim/posts.js)
    // v137: a pit throws none; an island's circles and a foot are low (`H` is in radii), and what stands on a foot or an
    // island throws its own from the top of it
    for (const p of w.posts ?? []) {
      if (p.pit) continue;
      const x = p.px + (p.x - p.px) * alpha, z = p.pz + (p.z - p.pz) * alpha;
      if (p.kind === 'island') { this._putShade(x, z, p.r, p.h / p.r, 'post', 1, A.postShade ?? 1.15); continue; }
      if (p.foot) {
        this._putShade(x, z, p.r, p.foot / p.r, 'post', 1, A.postShade ?? 1.15);
        this._putShade(x, z, p.prop, (POST_H[p.kind] ?? 2) + p.foot / p.prop, 'post', 1, A.postShade ?? 1.15);
        continue;
      }
      this._putShade(x, z, p.r, POST_H[p.kind] ?? 2, p.kind === 'ball' ? 'ball' : 'post', 1, A.postShade ?? 1.15);
    }
    for (const q of w.props ?? []) this._putShade(q.x, q.z, q.s, (POST_H[q.kind] ?? 2) + q.y / q.s, q.kind === 'shrub' ? 'ball' : 'post', 1, A.postShade ?? 1.15);
    for (const [m, c] of [[this.pools, n], [this.shades, this._ns], [this.casts, this._ncast]]) {
      m.count = c;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  // draw the map: cleared to no light and no shadow, then every pool and disc
  render(renderer) {
    const prevTarget = renderer.getRenderTarget(), prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this._prev);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(this.scene, this.cam);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(this._prev, prevAlpha);
  }

  reset() { this.bursts.length = 0; }

  // no run on the floor: no light and no shadow (the menu's arena is bare) — but while the title's warm-up holds
  // one of each (v116, warm), they stay
  clear() { if (this.warming) return; this.pools.count = 0; this.shades.count = 0; this.casts.count = 0; }

  // v116: one pool and one shadow drawn at nothing's size for a frame on the title (actors.warmStep), so the first
  // light and the first shadow of a run do not compile their shaders mid-fight
  warm(on) {
    this.warming = on;
    if (!on) { this.clear(); return; }
    this._m.makeScale(0, 0, 0);
    for (const m of [this.pools, this.shades, this.casts]) { m.setMatrixAt(0, this._m); m.count = 1; m.instanceMatrix.needsUpdate = true; }
  }
}
