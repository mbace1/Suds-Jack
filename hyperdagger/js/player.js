import * as THREE from 'three';

const EYE = 1.6;
const GRAVITY = -24;
const JUMP_V = 8.6;
const MOUSE_SENS = 0.0023;   // rad per pixel
const STICK_YAW_RATE = 3.8;  // rad/s at full right-stick deflection
const STICK_PITCH_RATE = 2.8;
const DASH_SPEED = 30;
const DASH_TIME = 0.16;
const DASH_CD = 1.0;
const MAX_JUMPS = 2; // ground jump + one air jump

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();

/** First-person controller: yaw/pitch look, WASD/stick strafe, jump, head-bob. */
export class Player {
  constructor(camera, input, arenaR) {
    this.camera = camera;
    this.input = input;
    this.arenaR = arenaR;
    camera.rotation.order = 'YXZ';
    this.feet = new THREE.Vector3();
    this.speed = 12;
    this.sens = 1; // look sensitivity multiplier (pause-menu option)
    this.reset();
  }

  reset() {
    this.feet.set(0, 0, 6);
    this.vy = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.bobT = 0;
    this.bobK = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.dashDir = this.dashDir || new THREE.Vector3();
    this.dashBuf = 0;
    this.dashBufFlick = null;
    this.justDashed = false;
    this.justJumped = false;
    this.jumpsLeft = MAX_JUMPS;
    this._sync();
  }

  get dashK() { return Math.max(0, this.dashT) / DASH_TIME; }

  get eyePos() { return this.camera.position; }

  update(dt) {
    // Look: mouse pixels (pointer lock) + right-stick deflection rate.
    const look = this.input.consumeLook();
    this.yaw -= look.dx * MOUSE_SENS * this.sens;
    this.pitch -= look.dy * MOUSE_SENS * this.sens;
    const rate = this.input.getLookRate();
    this.yaw -= rate.x * STICK_YAW_RATE * this.sens * dt;
    this.pitch -= rate.y * STICK_PITCH_RATE * this.sens * dt;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));

    // Move relative to yaw. Camera faces -z at yaw 0.
    const mv = this.input.getMove();
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    _fwd.set(-sin, 0, -cos);
    _right.set(cos, 0, -sin);
    this.feet.x += (_right.x * mv.x + _fwd.x * mv.y) * this.speed * dt;
    this.feet.z += (_right.z * mv.x + _fwd.z * mv.y) * this.speed * dt;

    // Dash: Shift bursts along the move direction (facing if standing
    // still); a stick flick bursts along the flick direction. Requests are
    // buffered briefly so a dash pressed just before cooldown ends still fires.
    this.dashCd -= dt;
    const flick = this.input.consumeDashFlick();
    if (this.input.consumeDash() || flick) {
      this.dashBuf = 0.25;
      this.dashBufFlick = flick || null;
    } else if (this.dashBuf > 0) {
      this.dashBuf -= dt;
    }
    if (this.dashBuf > 0 && this.dashCd <= 0) {
      const bufFlick = this.dashBufFlick;
      this.dashBuf = 0;
      this.dashBufFlick = null;
      if (bufFlick) {
        // flick is screen-space: x = right, y = down → -y = forward
        this.dashDir.set(
          _right.x * bufFlick.x - _fwd.x * bufFlick.y, 0,
          _right.z * bufFlick.x - _fwd.z * bufFlick.y).normalize();
      } else {
        const len = Math.hypot(mv.x, mv.y);
        if (len > 0.15) {
          this.dashDir.set(
            (_right.x * mv.x + _fwd.x * mv.y) / len, 0,
            (_right.z * mv.x + _fwd.z * mv.y) / len);
        } else {
          this.dashDir.set(_fwd.x, 0, _fwd.z);
        }
      }
      this.dashT = DASH_TIME;
      this.dashCd = DASH_CD;
      this.justDashed = true;
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.feet.addScaledVector(this.dashDir, DASH_SPEED * dt);
    }

    // Keep inside the arena.
    const r = Math.hypot(this.feet.x, this.feet.z);
    const max = this.arenaR - 0.8;
    if (r > max) {
      this.feet.x *= max / r;
      this.feet.z *= max / r;
    }

    // Jump + double jump + gravity.
    if (this.feet.y <= 0.001 && this.vy <= 0) this.jumpsLeft = MAX_JUMPS;
    if (this.input.consumeJump() && this.jumpsLeft > 0) {
      this.vy = this.jumpsLeft === MAX_JUMPS ? JUMP_V : JUMP_V * 0.92;
      this.jumpsLeft--;
      this.justJumped = true;
    }
    this.vy += GRAVITY * dt;
    this.feet.y += this.vy * dt;
    if (this.feet.y < 0) { this.feet.y = 0; this.vy = 0; }

    // Head-bob only while grounded and moving.
    const moving = Math.hypot(mv.x, mv.y) > 0.15 && this.feet.y <= 0.001;
    this.bobK += ((moving ? 1 : 0) - this.bobK) * Math.min(1, dt * 8);
    this.bobT += dt * 11 * this.bobK;

    this._sync();
  }

  _sync() {
    this.camera.position.set(
      this.feet.x,
      this.feet.y + EYE + Math.sin(this.bobT) * 0.045 * this.bobK,
      this.feet.z,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** External horizontal shove (e.g. the Leviathan's drag). */
  nudge(dx, dz) {
    this.feet.x += dx;
    this.feet.z += dz;
    this._sync();
  }

  /** Push the player horizontally out of a solid at (x, z) with radius r. */
  pushOut(x, z, r) {
    const dx = this.feet.x - x, dz = this.feet.z - z;
    const d = Math.hypot(dx, dz);
    if (d >= r || d === 0) return;
    this.feet.x = x + (dx / d) * r;
    this.feet.z = z + (dz / d) * r;
    this._sync();
  }
}
