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
import { uv, vec2, vec3, float, length, clamp, pow } from 'three/tsl';
import { TUNING } from '../tuning.js?v=19';

const T = TUNING, A = T.light.arena;
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
    shadeMat.colorNode = vec3(0); shadeMat.opacityNode = falloff.mul(A.shadow.strength);
    Object.assign(shadeMat, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.MaxEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
    this.pools = quads(A.cap, lightMat);
    this.shades = quads(A.shadow.cap, shadeMat);
    this.scene.add(this.shades, this.pools);
    this.bursts = [];   // { x, z, r, k, life, max, hex }
    this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this._prev = new THREE.Color();
  }

  get texture() { return this.rt.texture; }

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
    for (const bl of w.bullets) {
      if (n >= A.cap) break;
      const B = bl.hero ? P.hero : P.gel;
      this._put(this.pools, n++, bl.px + (bl.x - bl.px) * alpha, bl.pz + (bl.z - bl.pz) * alpha, B.r, bl.color, B.k);
    }
    for (const b of this.bursts) {
      if (n >= A.cap) break;
      const t = b.life / b.max;
      this._put(this.pools, n++, b.x, b.z, b.r, b.hex, b.k * t * t);
    }
    let s = 0;
    const S = A.shadow, h = w.hero;
    // the hero's shadow narrows as it falls into a world from high up, and goes with it down a drain
    if (h.alive) this._put(this.shades, s++, h.px + (h.x - h.px) * alpha, h.pz + (h.z - h.pz) * alpha, T.hero.radius * S.r * (1 - 0.6 * (h.fall || 0)) * (1 - (h.sink || 0)), 0, 0);
    for (const g of w.gels) {
      if (s >= S.cap) break;
      if (g.state === 'appear' && g.t < 0) continue;              // a brood still waiting out its parent's pop is not there yet
      const v = views?.get(g.id);
      if (v && v.root && !v.root.visible) continue;
      const grow = g.child || !(g.t < T.gel.swell) ? 1 : smooth(g.t / T.gel.swell);
      const r = g.r * S.r * grow * (v?.shadow ?? 1);
      if (r > 0.02) this._put(this.shades, s++, g.px + (g.x - g.px) * alpha, g.pz + (g.z - g.pz) * alpha, r, 0, 0);
    }
    for (const [m, c] of [[this.pools, n], [this.shades, s]]) {
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

  // no run on the floor: no light and no shadow (the menu's arena is bare)
  clear() { this.pools.count = 0; this.shades.count = 0; }
}
