// actors.js — the hero, the gels, their bullets and what is left of them.
//
// Reads the world, never writes it. Every body is 1.x's satin gel (gel.js):
//   root (position) → squash (the sim's spring, in WORLD axes)
//                   → body (1.x's per-frame shape: species silhouette ×
//                     breath × the smear it drags along the floor)
// so a gel flattened against a wall flattens along the wall whichever way it
// is moving. A bullet sets off a ripple from where it landed. A kill is 1.x's:
// the body thrashes, glows and swells to 2.3x for 0.28 s while chunks and
// droplets of goo fly out, squash where they land and shrink away, and a
// puddle with its satellites springs in and fades (splats.js); a big body's
// death sends a shockwave through the gels around it. Views are pooled per
// species, so a gel's material is built once and reused, never compiled
// mid-fight.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=4';
import { gelMaterial, domeGeometry, cubeGeometry, heroGeometry } from './gel.js?v=4';

const T = TUNING;
const B = T.blob, D = T.death;
const rand = (a, b) => a + Math.random() * (b - a);
const BULLET_Y = 0.45;

export class Actors {
  constructor(scene, splats) {
    this.scene = scene; this.splats = splats; this.hx = 19; this.hz = 11; this.heat = 0;
    this.geo = { blob: domeGeometry(), cube: cubeGeometry(), hero: heroGeometry(), eye: new THREE.SphereGeometry(1, 12, 8) };
    this.views = new Map();      // live gels by id
    this.pool = {};              // released views by species
    this.dying = [];             // killed gels playing out their last beat

    this.hero = this._makeHero();
    scene.add(this.hero.root);

    const sphere = new THREE.SphereGeometry(1, 10, 8);
    this.bullets = new THREE.InstancedMesh(sphere, new THREE.MeshBasicNodeMaterial(), T.bullets.max);
    this.bullets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bullets.setColorAt(0, new THREE.Color());
    this.bullets.count = 0; this.bullets.frustumCulled = false;
    scene.add(this.bullets);

    // chunks of the dead: smooth goo for blobs, angular for cubes (1.x v83)
    this.chunkMax = 300;
    this.chunks = [];
    const chunkMat = () => new THREE.MeshPhysicalNodeMaterial({ roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.45 });
    this.chunkMesh = { blob: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), chunkMat(), this.chunkMax),
                       cube: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 3), chunkMat(), this.chunkMax) };
    for (const m of Object.values(this.chunkMesh)) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color());
      m.count = 0; m.frustumCulled = false;
      scene.add(m);
    }
    this._m = new THREE.Matrix4(); this._c = new THREE.Color();
  }

  // The arena this run plays on.
  setArena(hx, hz) { this.hx = hx; this.hz = hz; }

  _makeHero() {
    const L = T.heroLook, r = T.hero.radius;
    const root = new THREE.Group(), squash = new THREE.Group();
    const mat = gelMaterial(T.hero.color, 'blob', 1, { wobble: L.wobble });
    const body = new THREE.Mesh(this.geo.hero, mat);
    body.scale.setScalar(r);
    squash.add(body); root.add(squash);
    // 1.x's black oval eyes, facing the last shot. 1.x sat them a little
    // inside the body, so they vanished whenever it stretched toward its aim;
    // these stand just proud of the surface, with the glint in front.
    const black = new THREE.MeshBasicNodeMaterial({ color: 0x111111 }), white = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
    const eyes = new THREE.Group();
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      const ball = new THREE.Mesh(this.geo.eye, black);
      ball.scale.set(L.eye.r * L.eye.scale[0], L.eye.r * L.eye.scale[1], L.eye.r * L.eye.scale[2]);
      const glint = new THREE.Mesh(this.geo.eye, white);
      glint.scale.setScalar(L.eye.glint * 0.6);
      glint.position.set(0.02, 0.06, L.eye.r * L.eye.scale[2] * 0.9);
      eye.add(ball, glint);
      eye.position.set(s * L.eye.side, r + L.eye.up, L.eye.forward);
      eyes.add(eye);
    }
    root.add(eyes);
    return { root, squash, body, mat, eyes };
  }

  _makeGel(kind) {
    const S = T.species[kind];
    const root = new THREE.Group(), squash = new THREE.Group();
    const mat = gelMaterial(S.color, S.shape, 1);
    const body = new THREE.Mesh(this.geo[S.shape], mat);
    squash.add(body); root.add(squash);
    return {
      kind, S, root, squash, body, mat,
      shape: S.shape === 'blob' ? (B.shapes[kind] || B.shape) : null,
      phase: Math.random() * Math.PI * 2, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0,
    };
  }

  _take(kind) {
    const v = this.pool[kind]?.pop() || this._makeGel(kind);
    v.vx = v.vz = 0; v.hit = 0; v.dyingT = 0;
    v.mat.gel.hit.value = 0; v.mat.gel.tear.value = 0; v.mat.emissive.setScalar(0);
    this.scene.add(v.root);
    return v;
  }

  _release(v) { this.scene.remove(v.root); (this.pool[v.kind] ||= []).push(v); }

  reset() {
    for (const v of this.views.values()) this._release(v);
    for (const v of this.dying) this._release(v);
    this.views.clear(); this.dying.length = 0; this.chunks.length = 0; this.heat = 0;
  }

  // the sim's events that only the view cares about
  onEvent(e, w) {
    if (e.type === 'hit') {
      const v = this.views.get(e.id), g = v && w.gels.find((x) => x.id === e.id);
      if (!v || !g) return;
      // the ripple starts where the bullet landed, in the body's own frame
      const dx = e.x - g.x, dz = e.z - g.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c, l = Math.hypot(lx, lz) || 1;
      v.hit = 1; v.mat.gel.hitDir.value.set(lx / l, lz / l);
    } else if (e.type === 'kill') {
      this.burst(e, w);
      const v = this.views.get(e.id);
      if (!v) return;
      this.views.delete(e.id);
      v.dyingT = B.death;
      v.mat.emissive.setHex(e.color).lerp(_white, D.whiten);
      this.dying.push(v);
    }
  }

  // The rest of a kill, all at the killing hit (1.x onKill): goo thrown out,
  // the puddle and its satellites, and — for a big body — a shockwave.
  burst(e, w) {
    const big = e.r >= D.big, fam = T.species[e.kind]?.shape === 'cube' ? 'cube' : 'blob', y = e.r * 0.8;
    this.heat = Math.min(1, this.heat + D.heatPerKill);
    const throwOut = (n, size, speed, up) => {
      for (let i = 0; i < n && this.chunks.length < this.chunkMax; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(...speed);
        this.chunks.push({ fam, x: e.x, y, z: e.z, vx: Math.cos(a) * sp, vy: rand(...up), vz: Math.sin(a) * sp,
          s: rand(...size), hex: e.color, life: D.chunkLife, sq: 1, sqV: 0 });
      }
    };
    throwOut(Math.round(rand(D.chunks[0], D.chunks[1] + 0.99) - 0.49), [D.chunkSize, D.chunkSize], D.chunkSpeed, D.chunkUp);
    throwOut(Math.round((big ? D.dropletsBig : D.droplets) * (1 + this.heat)), D.dropletSize, [D.dropletSpeed, D.dropletSpeed + 4 * (1 + 0.5 * this.heat)], D.dropletUp);
    if (this.splats) {
      this.splats.puddle(e.x, e.z, e.r * D.puddle, e.color);
      const sats = big ? 3 : this.heat > 0.5 ? 2 : 1;
      for (let i = 0; i < sats; i++) {
        const a = Math.random() * Math.PI * 2, d = rand(...D.satellites);
        this.splats.puddle(e.x + Math.cos(a) * d, e.z + Math.sin(a) * d, e.r * rand(...D.satelliteSize), e.color);
      }
    }
    if (big && w) {
      for (const g of w.gels) {
        const v = this.views.get(g.id);
        if (!v || g.id === e.id || Math.hypot(g.x - e.x, g.z - e.z) > D.shockRadius) continue;
        v.hit = Math.max(v.hit, D.shockRipple);
        const dx = g.x - e.x, dz = g.z - e.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw), l = Math.hypot(dx, dz) || 1;
        v.mat.gel.hitDir.value.set(-(dx * c - dz * s) / l, -(dx * s + dz * c) / l);
      }
    }
    return big;
  }

  sync(w, alpha, time) {
    // the hero
    const h = w.hero, hv = this.hero;
    hv.root.position.set(h.px + (h.x - h.px) * alpha, 0, h.pz + (h.z - h.pz) * alpha);
    const hb = h.body;
    hv.squash.scale.set(1 + hb.ex, Math.max(0.4, 1 + hb.wy - (hb.ex + hb.ez) * 0.5), 1 + hb.ez);
    hv.eyes.rotation.y = Math.atan2(h.aimX, h.aimZ);
    hv.root.visible = h.alive && !(h.mercy > 0 && Math.floor(time * 14) % 2);
    hv.mat.emissive.setScalar(h.dash > 0 ? 0.35 : 0);

    // the gels
    const seen = new Set();
    for (const g of w.gels) {
      seen.add(g.id);
      let v = this.views.get(g.id);
      if (!v) { v = this._take(g.kind); this.views.set(g.id, v); }
      const x = g.px + (g.x - g.px) * alpha, z = g.pz + (g.z - g.pz) * alpha;
      v.root.position.set(x, 0, z);
      // velocity, smoothed the way 1.x smoothed it (0.3 a frame)
      v.vx += ((g.x - g.px) / T.sim.dt - v.vx) * 0.3;
      v.vz += ((g.z - g.pz) / T.sim.dt - v.vz) * 0.3;
      const b = g.body;
      v.squash.scale.set(1 + b.ex, Math.max(0.4, 1 + b.wy - (b.ex + b.ez) * 0.5), 1 + b.ez);
      const grow = g.state === 'appear' ? 0.15 + 0.85 * smooth(g.t / T.gel.appear) : 1;
      this._shape(v, time, grow, g.windup);
      v.mat.emissive.setScalar(g.flash > 0 ? 0.6 : g.windup ? 0.12 + 0.12 * Math.sin(time * 30) : 0);
    }
    for (const [id, v] of this.views) if (!seen.has(id)) { this._release(v); this.views.delete(id); }

    // bullets
    const bm = this.bullets;
    let n = 0;
    for (const bl of w.bullets) {
      const x = bl.px + (bl.x - bl.px) * alpha, z = bl.pz + (bl.z - bl.pz) * alpha;
      const s = bl.r * (bl.hero ? 1.05 : 1.15);
      this._m.makeScale(s, s, s).setPosition(x, BULLET_Y, z);
      bm.setMatrixAt(n, this._m);
      bm.setColorAt(n, this._c.setHex(bl.color));
      n++;
    }
    bm.count = n;
    bm.instanceMatrix.needsUpdate = true;
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
  }

  // 1.x's per-frame body: silhouette × breath × the smear it drags along the
  // floor (nose lifts, rear drags), all anchored at the floor contact.
  _shape(v, time, grow, windup) {
    const r = v.S.radius * grow;
    const breathe = (v.kind === 'splitta' ? B.breatheAmpSplitta : B.breatheAmp) * Math.sin(time * B.breatheHz + v.phase);
    const sp = Math.hypot(v.vx, v.vz);
    if (sp > 0.4) v.yaw = Math.atan2(v.vx, v.vz);
    if (v.shape) {
      const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
      const inflate = windup ? 0.12 : 0;
      v.body.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
      v.body.scale.set(
        r * v.shape.x * (1 - breathe * 0.5) * (1 + inflate),
        r * v.shape.y * (1 + breathe - drag * 0.25) * (1 + inflate),
        r * v.shape.z * (1 - breathe * 0.5 + drag) * (1 + inflate));
    } else {
      v.body.rotation.set(0, v.yaw, 0);
      v.body.scale.set(r * (1 - breathe * 0.25), r * (1 + breathe * 0.5), r * (1 - breathe * 0.25));
    }
  }

  // Everything that runs on the frame clock rather than the sim's: ripples
  // dying out, the dying playing out their last beat, chunks in flight.
  stepFx(dt, time) {
    for (const v of this.views.values()) {
      if (v.hit > 0) { v.hit = Math.max(0, v.hit - dt / B.hitRipple); v.mat.gel.hit.value = v.hit; }
    }
    // the dying: 1.x updateDeath — swell to 2.3x and thrash out over 0.28 s
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const v = this.dying[i];
      v.dyingT -= dt;
      const t = Math.min(1, 1 - v.dyingT / B.death);
      this._shape(v, time, 1 + t * B.deathSwell, false);
      v.mat.gel.tear.value = Math.max(0, v.dyingT / B.death);
      if (v.dyingT <= 0) { this._release(v); this.dying.splice(i, 1); }
    }
    this.heat = Math.max(0, this.heat - D.heatDecay * dt);

    // goo in flight: 1.x's chunk physics — gravity, a squash and a skid where
    // it lands, its own wobble, and a shrink over its last moments
    const HX = this.hx, HZ = this.hz, k = Math.min(3, dt * 60);
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      if ((c.life -= dt) <= 0) { this.chunks.splice(i, 1); continue; }
      c.vy -= D.gravity * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.y < c.s * 0.5) {
        c.y = c.s * 0.5;
        if (c.vy < 0) { c.sqV -= 0.4 * Math.abs(c.vy) * 0.25; c.vy = 0; c.vx *= D.floorKeep; c.vz *= D.floorKeep; }
      }
      c.sqV = (c.sqV - (c.sq - 1) * 0.32 * k) * Math.pow(0.8, k);
      c.sq = Math.max(0.3, Math.min(1.7, c.sq + c.sqV * k));
      if (Math.abs(c.x) > HX - c.s) { c.x = Math.sign(c.x) * (HX - c.s); c.vx *= -0.4; }
      if (Math.abs(c.z) > HZ - c.s) { c.z = Math.sign(c.z) * (HZ - c.s); c.vz *= -0.4; }
    }
    const n = { blob: 0, cube: 0 };
    for (const c of this.chunks) {
      const fade = Math.min(1, c.life / D.shrink), s = c.s * fade, sx = s / Math.sqrt(c.sq);
      this._m.makeScale(sx, s * c.sq, sx).setPosition(c.x, c.y, c.z);
      const m = this.chunkMesh[c.fam];
      m.setMatrixAt(n[c.fam], this._m); m.setColorAt(n[c.fam], this._c.setHex(c.hex)); n[c.fam]++;
    }
    for (const [fam, m] of Object.entries(this.chunkMesh)) {
      m.count = n[fam];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}

const _white = new THREE.Color(0xffffff);
const smooth = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
