// actors.js — the hero, the gels, their bullets and what is left of them.
//
// Reads the world, never writes it. Each body is drawn as
//   root (position) → squash (scale in WORLD axes, from the sim's spring)
//                   → turn (faces its target) → body + eyes
// so a gel flattened against a curb flattens along the curb whichever way it
// is looking. Gels glow in their own colour with a rim of light (DIRECTION:
// "the gels' own glow keeps them readable"); one TSL material each, so a hit
// can flash one gel and not its whole species.
import * as THREE from 'three/webgpu';
import { uniform, vec3, float, mix, normalWorld, positionWorld, cameraPosition } from 'three/tsl';
import { TUNING } from '../tuning.js?v=3';

const T = TUNING;
const HX = T.driveway.slab.width / 2, HZ = T.driveway.slab.depth / 2;
const BULLET_Y = 0.45;

function gelMaterial(hex) {
  const uColor = uniform(new THREE.Color(hex));
  const uFlash = uniform(0);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.28, metalness: 0 });
  const view = cameraPosition.sub(positionWorld).normalize();
  const rim = float(1).sub(normalWorld.dot(view).clamp(0, 1)).pow(2.2);
  m.colorNode = mix(uColor, vec3(1, 1, 1), uFlash);
  m.emissiveNode = uColor.mul(float(0.22).add(rim.mul(0.9))).add(vec3(uFlash).mul(0.7));
  return { m, uColor, uFlash };
}

// unit shapes standing on y = 0, about 2 units across
function blobGeometry() {
  const g = new THREE.SphereGeometry(1, 28, 18);
  g.scale(1, 0.86, 1); g.translate(0, 0.86, 0);
  return g;
}
function cubeGeometry() {
  const g = new THREE.BoxGeometry(2, 2, 2, 8, 8, 8), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  const inner = 0.62, round = 0.38;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.copy(v).clampScalar(-inner, inner);
    const n = v.sub(c);
    if (n.lengthSq() > 1e-8) n.normalize().multiplyScalar(round);
    p.setXYZ(i, c.x + n.x, c.y + n.y, c.z + n.z);
  }
  g.scale(0.9, 0.8, 0.9); g.translate(0, 0.8, 0);
  g.computeVertexNormals();
  return g;
}

export class Actors {
  constructor(scene, paint) {
    this.scene = scene; this.paint = paint;
    this.geo = { blob: blobGeometry(), cube: cubeGeometry(), eye: new THREE.SphereGeometry(1, 12, 8), disc: new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2) };
    this.eyeWhite = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
    this.pupil = new THREE.MeshBasicNodeMaterial({ color: 0x08080a });
    this.shadowMat = new THREE.MeshBasicNodeMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false });
    this.views = new Map();
    this.hero = this._makeBody('blob', T.hero.color, T.hero.radius, 1.18);
    scene.add(this.hero.root);

    const sphere = new THREE.SphereGeometry(1, 10, 8);
    const bmat = new THREE.MeshBasicNodeMaterial();
    this.bullets = new THREE.InstancedMesh(sphere, bmat, T.bullets.max);
    this.bullets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bullets.setColorAt(0, new THREE.Color());
    this.bullets.count = 0; this.bullets.frustumCulled = false;
    scene.add(this.bullets);

    // chunks of the dead: they fly, bounce, settle, and become paint
    this.chunkMax = 220;
    this.chunks = [];
    this.chunkMesh = new THREE.InstancedMesh(sphere, new THREE.MeshStandardNodeMaterial({ roughness: 0.35 }), this.chunkMax);
    this.chunkMesh.setColorAt(0, new THREE.Color());
    this.chunkMesh.count = 0; this.chunkMesh.frustumCulled = false;
    scene.add(this.chunkMesh);
    this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
  }

  _makeBody(shape, hex, r, eyeScale = 1) {
    const root = new THREE.Group(), squash = new THREE.Group(), turn = new THREE.Group();
    const mat = gelMaterial(hex);
    const body = new THREE.Mesh(this.geo[shape], mat.m);
    body.scale.setScalar(r);
    turn.add(body);
    // Eyes near the CROWN, leaning toward where it looks: the camera is over
    // the slab, so eyes on the front face vanish whenever you aim up it.
    const eyeY = (shape === 'cube' ? 1.42 : 1.5) * r, eyeZ = (shape === 'cube' ? 0.5 : 0.42) * r;
    for (const s of [-1, 1]) {
      const white = new THREE.Mesh(this.geo.eye, this.eyeWhite);
      white.scale.setScalar(0.21 * r * eyeScale); white.position.set(s * 0.34 * r, eyeY, eyeZ);
      const pupil = new THREE.Mesh(this.geo.eye, this.pupil);
      pupil.scale.setScalar(0.11 * r * eyeScale); pupil.position.set(s * 0.34 * r, eyeY + 0.06 * r * eyeScale, eyeZ + 0.13 * r * eyeScale);
      turn.add(white, pupil);
    }
    squash.add(turn); root.add(squash);
    const shadow = new THREE.Mesh(this.geo.disc, this.shadowMat);
    shadow.scale.setScalar(r * 1.05); shadow.position.y = 0.012;
    root.add(shadow);
    return { root, squash, turn, mat, shadow, r };
  }

  reset() {
    for (const v of this.views.values()) this._drop(v);
    this.views.clear();
    this.chunks.length = 0;
  }

  _drop(v) { this.scene.remove(v.root); v.mat.m.dispose(); }

  // where a world point is, for anything that needs the hero on screen
  heroPosition(w, alpha, out) {
    const h = w.hero;
    return out.set(h.px + (h.x - h.px) * alpha, 0.5, h.pz + (h.z - h.pz) * alpha);
  }

  sync(w, alpha, time) {
    // the hero
    const h = w.hero, hv = this.hero;
    this._place(hv, h.px + (h.x - h.px) * alpha, 0, h.pz + (h.z - h.pz) * alpha, h.body, h.aimX, h.aimZ);
    hv.root.visible = h.alive && !(h.mercy > 0 && Math.floor(time * 14) % 2);
    hv.mat.uFlash.value = h.dash > 0 ? 0.35 : 0;

    // the gels
    const seen = new Set();
    for (const g of w.gels) {
      seen.add(g.id);
      let v = this.views.get(g.id);
      if (!v) {
        const S = T.species[g.kind];
        v = this._makeBody(S.shape, S.color, S.radius);
        this.views.set(g.id, v); this.scene.add(v.root);
      }
      let x = g.px + (g.x - g.px) * alpha, z = g.pz + (g.z - g.pz) * alpha, y = g.y;
      const outside = Math.abs(x) > HX || z > HZ;
      if (g.state === 'rustle') { x += Math.sin(time * 47 + g.id) * 0.07; z += Math.cos(time * 41 + g.id) * 0.04; }
      if (outside && Math.abs(x) > HX) y += T.driveway.lawn.y;
      this._place(v, x, y, z, g.body, g.faceX, g.faceZ);
      v.shadow.position.y = 0.012 - y + (outside && Math.abs(x) > HX ? T.driveway.lawn.y : 0);
      v.mat.uFlash.value = g.flash > 0 ? 1 : g.windup ? 0.18 + 0.18 * Math.sin(time * 30) : 0;
    }
    for (const [id, v] of this.views) if (!seen.has(id)) { this._drop(v); this.views.delete(id); }

    // bullets
    const bm = this.bullets;
    let n = 0;
    for (const b of w.bullets) {
      const x = b.px + (b.x - b.px) * alpha, z = b.pz + (b.z - b.pz) * alpha;
      const s = b.r * (b.hero ? 1.05 : 1.15);
      this._m.makeScale(s, s, s).setPosition(x, BULLET_Y, z);
      bm.setMatrixAt(n, this._m);
      bm.setColorAt(n, this._c.setHex(b.color));
      n++;
    }
    bm.count = n;
    bm.instanceMatrix.needsUpdate = true;
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
  }

  _place(v, x, y, z, b, fx, fz) {
    v.root.position.set(x, y, z);
    v.squash.scale.set(1 + b.ex, Math.max(0.4, 1 + b.wy - (b.ex + b.ez) * 0.5), 1 + b.ez);
    if (fx || fz) v.turn.rotation.y = Math.atan2(fx, fz);
  }

  // A death: chunks thrown from the body, a splat where it stood.
  burst(x, z, r, hex, rng = Math.random) {
    this.paint.splat(x, z, r * T.paint.killSplat, hex, T.paint.alpha);
    const n = Math.round(2 + r * 4);
    for (let i = 0; i < n && this.chunks.length < this.chunkMax; i++) {
      const a = rng() * Math.PI * 2, sp = 2 + rng() * 4.5;
      this.chunks.push({ x, y: r * 0.8, z, vx: Math.cos(a) * sp, vy: 3 + rng() * 4, vz: Math.sin(a) * sp, s: r * (0.18 + rng() * 0.16), hex, rest: 0 });
    }
  }

  stepChunks(dt) {
    const cm = this.chunkMesh;
    let n = 0;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.vy -= 22 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.y < c.s * 0.5) {
        c.y = c.s * 0.5;
        if (c.vy < 0) c.vy *= -0.35;
        c.vx *= 0.7; c.vz *= 0.7;
        if (Math.abs(c.vy) < 0.6 && Math.hypot(c.vx, c.vz) < 0.4) c.rest += dt;
      }
      // off the slab the curbs stop them
      if (Math.abs(c.x) > HX - c.s) { c.x = Math.sign(c.x) * (HX - c.s); c.vx *= -0.4; }
      if (Math.abs(c.z) > HZ - c.s) { c.z = Math.sign(c.z) * (HZ - c.s); c.vz *= -0.4; }
      if (c.rest > 0.15) {                        // settled: it becomes part of the painting
        this.paint.splat(c.x, c.z, c.s * T.paint.chunkSplat, c.hex, T.paint.alpha * 0.8, 0);
        this.chunks.splice(i, 1);
        continue;
      }
    }
    for (const c of this.chunks) {
      this._m.makeScale(c.s, c.s * 0.8, c.s).setPosition(c.x, c.y, c.z);
      cm.setMatrixAt(n, this._m); cm.setColorAt(n, this._c.setHex(c.hex)); n++;
    }
    cm.count = n;
    cm.instanceMatrix.needsUpdate = true;
    if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
  }
}
