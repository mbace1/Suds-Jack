// Drop Cabal — the little gel commando. Runs along the foreground strip (fixed z),
// aims a gun at the 3D crosshair point, dodge-rolls with i-frames, flickers on mercy.

import * as THREE from 'three';
import { PAL } from './palette.js';

export const PLAYER_Z = 8;
export const PLAYER_X_MAX = 14;

const RUN_SPEED = 15;
const FIRE_SLOW = 0.55;   // Cabal feel: you plant while shooting
const ROLL_TIME = 0.36;
const ROLL_SPEED = 27;
const ROLL_CD = 0.85;

export class Player {
  constructor(scene) {
    this.x = 0;
    this.lastDir = 1;
    this.rollT = 0;
    this.rollDir = 1;
    this.rollCd = 0;
    this.mercyT = 0;
    this._t = 0;

    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshBasicMaterial({ color: PAL.PLAYER });
    this.body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), bodyMat);
    this.body.position.y = 0.62;
    this.group.add(this.body);

    const footMat = new THREE.MeshBasicMaterial({ color: PAL.PLAYER_DARK });
    this.feet = [];
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), footMat);
      f.position.set(sx * 0.3, 0.16, 0.1);
      this.group.add(f);
      this.feet.push(f);
    }

    // eyes face +z (toward the camera)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1028 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), eyeMat);
      eye.position.set(sx * 0.22, 0.78, 0.52);
      this.group.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), pupilMat);
      pupil.position.set(sx * 0.22, 0.78, 0.63);
      this.group.add(pupil);
    }

    // gun pivot: lookAt points its +z toward the aim point, barrel extends +z
    this.gun = new THREE.Group();
    this.gun.position.set(0, 0.95, 0);
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 1.0),
      new THREE.MeshBasicMaterial({ color: PAL.GUN }),
    );
    barrel.position.z = 0.5;
    this.gun.add(barrel);
    this.group.add(this.gun);

    this.group.scale.setScalar(1.3);   // big readable foreground sprite, Cabal-style
    this.group.position.set(0, 0, PLAYER_Z);
    scene.add(this.group);

    this._tip = new THREE.Vector3();
  }

  get rolling() { return this.rollT > 0; }
  get evading() { return this.rollT > 0 || this.mercyT > 0; }

  tryRoll(dir) {
    if (this.rollCd > 0 || this.rollT > 0) return false;
    this.rollDir = dir !== 0 ? Math.sign(dir) : this.lastDir;
    this.rollT = ROLL_TIME;
    this.rollCd = ROLL_CD;
    return true;
  }

  // returns true if the hit lands (not evading)
  hurt() {
    if (this.evading) return false;
    this.mercyT = 2.0;
    return true;
  }

  update(dt, moveX, firing, aimPoint) {
    this._t += dt;
    if (this.rollCd > 0) this.rollCd -= dt;
    if (this.mercyT > 0) this.mercyT -= dt;

    if (this.rollT > 0) {
      this.rollT -= dt;
      this.x += this.rollDir * ROLL_SPEED * dt;
      this.body.rotation.z -= this.rollDir * dt * 16;
    } else {
      this.body.rotation.z *= Math.max(0, 1 - dt * 12);
      if (moveX !== 0) this.lastDir = Math.sign(moveX);
      this.x += moveX * RUN_SPEED * (firing ? FIRE_SLOW : 1) * dt;
    }
    this.x = Math.max(-PLAYER_X_MAX, Math.min(PLAYER_X_MAX, this.x));

    // run bob + gel squish
    const running = this.rollT <= 0 && moveX !== 0;
    const bob = running ? Math.abs(Math.sin(this._t * 11)) * 0.14 : 0;
    const squish = 1 + Math.sin(this._t * (running ? 11 : 4)) * 0.05;
    this.body.scale.set(1 / squish, squish, 1 / squish);
    this.feet[0].position.z = running ? Math.sin(this._t * 11) * 0.22 : 0.1;
    this.feet[1].position.z = running ? -Math.sin(this._t * 11) * 0.22 : 0.1;

    this.group.position.set(this.x, bob, PLAYER_Z);
    this.gun.lookAt(aimPoint);

    // mercy flicker
    this.group.visible = this.mercyT > 0 ? Math.floor(this.mercyT * 18) % 2 === 0 : true;
  }

  gunTip() {
    this.gun.updateWorldMatrix(true, false);
    this._tip.set(0, 0, 1.0);
    return this.gun.localToWorld(this._tip);
  }

  reset() {
    this.x = 0;
    this.rollT = 0;
    this.rollCd = 0;
    this.mercyT = 0;
    this.group.visible = true;
  }
}
