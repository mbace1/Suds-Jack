import * as THREE from 'three';
import { COL } from './palette.js?v=4';

export const DRIVE_HALF   = 7.4;   // how far the bike may stray laterally (road + kerbs)
export const PLAYER_R     = 0.55;
const STEER_SPEED  = 7.5;          // lateral units/s at full lock
const MERCY_DUR    = 1.6;

export class Player {
  constructor(scene) {
    this.scene   = scene;
    this.alive   = false;
    this.baseSpeed = 9;
    this.speed   = 0;
    this._mercyT = 0;
    this._lean   = 0;
    this._wheelSpin = 0;

    this.group = new THREE.Group();
    scene.add(this.group);

    const flat = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, ...opts });

    // ── Little BMX kid (flat-shaded, Paperboy-style) ──────────────────────────
    // Torso (red jersey)
    this.torsoMat = flat(COL.rider);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.42), this.torsoMat);
    torso.position.y = 1.06; torso.castShadow = true;
    this.group.add(torso);
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), flat(COL.skin));
    head.position.y = 1.6; head.castShadow = true;
    this.group.add(head);
    // Cap / helmet
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat(COL.helmet));
    cap.position.y = 1.66; cap.castShadow = true;
    this.group.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.22), flat(COL.helmet));
    brim.position.set(0, 1.62, -0.26);
    this.group.add(brim);
    // Arms reaching to the bars
    const armMat = flat(COL.rider);
    for (const sx of [-0.32, 0.32]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), armMat);
      arm.position.set(sx, 1.06, -0.34); arm.rotation.x = 0.5;
      this.group.add(arm);
    }

    // ── BMX bike ──────────────────────────────────────────────────────────────
    const frameMat = flat(COL.bike);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 1.4), frameMat);
    frame.position.y = 0.5; frame.castShadow = true;
    this.group.add(frame);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), frameMat);
    bar.position.set(0, 0.72, -0.6);
    this.group.add(bar);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.28), flat(0x222222));
    seat.position.set(0, 0.72, 0.5);
    this.group.add(seat);

    // Wheels: bake the axle along X (lateral) so rotation.x rolls them properly.
    const tireGeo = new THREE.TorusGeometry(0.4, 0.1, 10, 20); tireGeo.rotateY(Math.PI / 2);
    const hubGeo  = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 8); hubGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(0.05, 0.64, 0.05);
    const mkWheel = () => {
      const w = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, flat(COL.wheel)); tire.castShadow = true;
      const hub  = new THREE.Mesh(hubGeo,  flat(0xb9bcc2));
      const s1 = new THREE.Mesh(spokeGeo, flat(0xb9bcc2));
      const s2 = new THREE.Mesh(spokeGeo, flat(0xb9bcc2)); s2.rotation.x = Math.PI / 2;
      w.add(tire, hub, s1, s2);
      return w;
    };
    this.wheelF = mkWheel(); this.wheelB = mkWheel();
    this.wheelF.position.set(0, 0.42, -0.62);
    this.wheelB.position.set(0, 0.42,  0.62);
    this.group.add(this.wheelF, this.wheelB);

    // Collect meshes whose opacity we flicker during crash mercy frames.
    this._parts = [torso, head, cap, brim, frame, bar, seat];
  }

  get position() { return this.group.position; }
  get invincible() { return this._mercyT > 0; }

  reset() {
    this.alive = true;
    this._mercyT = 0;
    this.group.position.set(0, 0, 0);
    this.group.visible = true;
    this._setOpacity(1);
  }

  setBaseSpeed(s) { this.baseSpeed = s; }

  crash() {
    if (this.invincible || !this.alive) return false;
    this._mercyT = MERCY_DUR;
    return true;
  }

  _setOpacity(o) {
    const transparent = o < 1;
    for (const m of this._parts) { m.material.transparent = transparent; m.material.opacity = o; }
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
    this._lean += ((-steer * 0.45) - this._lean) * Math.min(1, dt * 10);
    this.group.rotation.z = this._lean;
    this._wheelSpin -= this.speed * dt * 1.6;
    this.wheelF.rotation.x = this.wheelB.rotation.x = this._wheelSpin;

    // Mercy flicker after a crash
    if (this._mercyT > 0) {
      this._mercyT -= dt;
      this._setOpacity(0.35 + 0.6 * Math.abs(Math.sin(this._mercyT * 16)));
      if (this._mercyT <= 0) this._setOpacity(1);
    }
  }

  hide() { this.alive = false; this.group.visible = false; }
}
