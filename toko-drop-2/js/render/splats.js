// splats.js — puddles on the floor: 1.x's SplatPool (main.js:1461-1586, v190).
//
// One instanced mesh of flat discs with a colour and an opacity per instance,
// so dozens of puddles are one draw call and nothing is allocated per death.
// A puddle springs in from nothing, then fades out linearly over its life.
// When the pool is full, the one with the least life left makes room.
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { TUNING } from '../tuning.js?v=37';

const S = TUNING.splats;

export class Splats {
  constructor(scene) {
    const n = S.capacity;
    const geo = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
    this.color = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aColor', this.color);
    geo.setAttribute('aAlpha', this.alpha);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    mat.colorNode = attribute('aColor');
    mat.opacityNode = attribute('aAlpha');
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
    this.s = Array.from({ length: n }, () => ({ on: false, x: 0, z: 0, r: 0, life: 0, max: 1, op: 0, sq: 0, sqV: 0 }));
    this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    this.clear();
  }

  clear() { for (let i = 0; i < this.s.length; i++) { this.s[i].on = false; this._hide(i); } this._flush(); }

  // a puddle of colour `hex`, radius r, at (x, z)
  puddle(x, z, r, hex) {
    let i = this.s.findIndex((p) => !p.on);
    if (i < 0) { let least = Infinity; this.s.forEach((p, k) => { if (p.life < least) { least = p.life; i = k; } }); }
    const p = this.s[i];
    Object.assign(p, { on: true, x, z, r, life: S.life, max: S.life, op: S.opacity, sq: 0, sqV: 0 });
    this._c.setHex(hex);
    this.color.setXYZ(i, this._c.r, this._c.g, this._c.b);
  }

  // SURVIVAL's floor shrank (sim/reshape.js): the puddles past its walls are
  // over the void now, and go
  prune(hx, hz) {
    for (let i = 0; i < this.s.length; i++) {
      const p = this.s[i];
      if (p.on && (Math.abs(p.x) > hx + p.r * 0.5 || Math.abs(p.z) > hz + p.r * 0.5)) { p.on = false; this._hide(i); }
    }
    this._flush();
  }

  _hide(i) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); this.alpha.setX(i, 0); }
  _flush() { this.mesh.instanceMatrix.needsUpdate = true; this.color.needsUpdate = true; this.alpha.needsUpdate = true; }

  step(dt) {
    const k = Math.min(3, dt * 60);          // 1.x's spring was per frame at 60 Hz
    for (let i = 0; i < this.s.length; i++) {
      const p = this.s[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; this._hide(i); continue; }
      p.sqV = (p.sqV - (p.sq - 1) * S.spring * k) * Math.pow(S.damp, k);
      p.sq = Math.max(0, p.sq + p.sqV * k);
      const s = p.r * Math.min(p.sq, 1.5);
      this._m.makeScale(s, 1, s).setPosition(p.x, S.y, p.z);
      this.mesh.setMatrixAt(i, this._m);
      this.alpha.setX(i, p.op * p.life / p.max);
    }
    this._flush();
  }
}
