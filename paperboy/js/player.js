import * as THREE from 'three';
import { COL } from './palette.js';

export const DRIVE_HALF   = 7.4;   // how far the bike may stray laterally (road + kerbs)
export const PLAYER_R     = 0.55;
const STEER_SPEED  = 7.5;          // lateral units/s at full lock
const MERCY_DUR    = 1.6;
const GHOST_COUNT  = 6;
const GHOST_LIFE   = 0.26;

export class Player {
  constructor(scene) {
    this.scene   = scene;
    this.alive   = false;
    this.baseSpeed = 9;
    this.speed   = 0;
    this._mercyT = 0;
    this._ghostT = 0;
    this._lean   = 0;
    this._wheelSpin = 0;

    this.group = new THREE.Group();
    scene.add(this.group);

    // Gel rider body (the toko-drop translucent look, warm cream tint)
    const bodyGeo = new THREE.SphereGeometry(PLAYER_R, 20, 14);
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: COL.rider, emissive: COL.riderGlow, emissiveIntensity: 0.6,
      roughness: 0.05, metalness: 0.0,
      transmission: 0.5, thickness: 0.8, ior: 1.35,
      clearcoat: 0.8, clearcoatRoughness: 0.05,
      transparent: true, opacity: 0.96,
    });
    this.body = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.body.position.y = 0.95;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Low-poly coral bike: frame bar + two wheels
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: COL.bike, emissive: 0x3a0e00, emissiveIntensity: 0.4,
      roughness: 0.25, metalness: 0.1, clearcoat: 0.7,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 1.5), frameMat);
    frame.position.y = 0.5; frame.castShadow = true;
    this.group.add(frame);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), frameMat);
    bar.position.set(0, 0.7, -0.6);
    this.group.add(bar);

    const wheelGeo = new THREE.TorusGeometry(0.42, 0.12, 8, 18);
    const wheelMat = new THREE.MeshPhysicalMaterial({
      color: COL.wheel, roughness: 0.4, metalness: 0.2, clearcoat: 0.5,
    });
    this.wheelF = new THREE.Mesh(wheelGeo, wheelMat);
    this.wheelB = new THREE.Mesh(wheelGeo, wheelMat);
    this.wheelF.position.set(0, 0.42, -0.62);
    this.wheelB.position.set(0, 0.42,  0.62);
    this.wheelF.castShadow = this.wheelB.castShadow = true;
    this.group.add(this.wheelF, this.wheelB);

    // Kirby eyes (signature toko-drop touch)
    const eyeGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.scale.set(0.55, 1.15, 0.4);
    this.eyeR.scale.set(0.55, 1.15, 0.4);
    const reflGeo = new THREE.SphereGeometry(0.042, 5, 4);
    const reflMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [this.eyeL, this.eyeR].forEach(e => {
      const r = new THREE.Mesh(reflGeo, reflMat); r.position.set(0.04, 0.05, -0.06); e.add(r);
    });
    this.eyeL.position.set(-0.17, 1.05, -0.42);
    this.eyeR.position.set( 0.17, 1.05, -0.42);
    this.body.add(this.eyeL, this.eyeR);

    // Speed-line ghosts
    this._ghosts = Array.from({ length: GHOST_COUNT }, () => {
      const m = new THREE.Mesh(bodyGeo,
        new THREE.MeshBasicMaterial({ color: COL.subscriber, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; scene.add(m);
      return { mesh: m, life: 0 };
    });
  }

  get position() { return this.group.position; }
  get invincible() { return this._mercyT > 0; }

  reset() {
    this.alive = true;
    this._mercyT = 0;
    this.group.position.set(0, 0, 0);
    this.group.visible = true;
    this.bodyMat.opacity = 0.96;
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
  }

  setBaseSpeed(s) { this.baseSpeed = s; }

  crash() {
    if (this.invincible || !this.alive) return false;
    this._mercyT = MERCY_DUR;
    return true;
  }

  update(dt, steer, throttle) {
    if (!this.alive) return;

    // Forward speed: base ± throttle trim (clamped so you can't fully stop)
    this.speed = this.baseSpeed * (1 + 0.4 * throttle);
    this.speed = Math.max(this.baseSpeed * 0.45, this.speed);
    this.group.position.z -= this.speed * dt;

    // Lateral steering, clamped to the drivable strip
    this.group.position.x += steer * STEER_SPEED * dt;
    this.group.position.x = Math.max(-DRIVE_HALF, Math.min(DRIVE_HALF, this.group.position.x));

    // Visual lean + wheel spin
    this._lean += ((-steer * 0.5) - this._lean) * Math.min(1, dt * 10);
    this.group.rotation.z = this._lean;
    this._wheelSpin -= this.speed * dt * 1.6;
    this.wheelF.rotation.x = this.wheelB.rotation.x = this._wheelSpin;

    // Gentle bob
    this.body.position.y = 0.95 + Math.sin(performance.now() / 140) * 0.04;

    // Mercy flicker after a crash
    if (this._mercyT > 0) {
      this._mercyT -= dt;
      this.bodyMat.opacity = 0.3 + 0.66 * Math.abs(Math.sin(this._mercyT * 16));
      if (this._mercyT <= 0) this.bodyMat.opacity = 0.96;
    }

    // Ghost trail when moving quick
    this._ghostT -= dt;
    if (this._ghostT <= 0) {
      this._ghostT = 0.03;
      const g = this._ghosts.find(g => g.life <= 0);
      if (g) {
        g.mesh.position.copy(this.body.getWorldPosition(new THREE.Vector3()));
        g.life = GHOST_LIFE; g.mesh.visible = true;
      }
    }
    for (const g of this._ghosts) {
      if (g.life > 0) {
        g.life -= dt;
        if (g.life <= 0) g.mesh.visible = false;
        else { const t = g.life / GHOST_LIFE; g.mesh.material.opacity = t * 0.32; g.mesh.scale.setScalar(0.6 + 0.4 * t); }
      }
    }
  }

  hide() { this.alive = false; this.group.visible = false;
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; } }
}
