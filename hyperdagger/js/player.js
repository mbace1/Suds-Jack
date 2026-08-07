import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=49';

// all feel numbers live in tuning.js; these aliases keep the code readable
const EYE = T.player.eye;
const GRAVITY = T.player.gravity;
const JUMP_V = T.player.jumpV;
const MOUSE_SENS = T.look.mouseSens;
const STICK_YAW_RATE = T.look.touchYaw;   // touch (proven feel, stays put)
const STICK_PITCH_RATE = T.look.touchPitch;
// Gamepad-only look tuning. The response curve in input.js protects precision
// near centre, which is what lets the pad's base rates sit higher than a
// linear stick could. Touch keeps the flat rates above — it was already good.
const PAD_YAW_RATE = T.look.padYaw;
const PAD_PITCH_RATE = T.look.padPitch;
const RAMP_T = T.look.rampT;
const RAMP_MAX = T.look.rampMax;
const RAMP_PUSH = T.look.rampPush;
const DASH_SPEED = T.dash.speed;
const DASH_TIME = T.dash.time;
const DASH_CD = T.dash.cooldown;
const MAX_JUMPS = T.player.maxJumps;

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
    this.speed = T.player.speed;
    this.sens = 1; // look sensitivity multiplier (pause-menu option)
    this.aimAssist = 1; // <1 slows stick look near a target; main sets it per frame
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
    this.turnRamp = 0;
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
    if (this.input.gamepad) {
      // Turn ramp (pad only): hold the stick over and the turn accelerates,
      // so whipping 180° onto something behind you is quick while
      // flick-and-settle stays precise. Decays 3× faster than it builds —
      // releasing the stick must drop straight back to fine aim, or the next
      // small correction inherits spin speed and overshoots.
      const push = Math.hypot(rate.x, rate.y);
      this.turnRamp = push > RAMP_PUSH
        ? Math.min(1, this.turnRamp + dt / RAMP_T)
        : Math.max(0, this.turnRamp - dt * 3 / RAMP_T);
      // aimAssist only ever scales the pad term — mouse and touch never see it
      const k = this.sens * this.aimAssist * (1 + this.turnRamp * (RAMP_MAX - 1)) * dt;
      this.yaw -= rate.x * PAD_YAW_RATE * k;
      this.pitch -= rate.y * PAD_PITCH_RATE * k;
    } else {
      // touch path — untouched, the shipped feel
      this.turnRamp = 0;
      this.yaw -= rate.x * STICK_YAW_RATE * this.sens * dt;
      this.pitch -= rate.y * STICK_PITCH_RATE * this.sens * dt;
    }
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
      this.dashBuf = T.dash.buffer;
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
