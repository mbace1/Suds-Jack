import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=70';

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
const _wish = new THREE.Vector3();

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
    this.dashEnabled = true;
    // Ability fields — modes.js applyAbilities() writes these. Defaults keep
    // a Player usable before any mode has been applied.
    this.maxJumps = MAX_JUMPS;
    this.glideEnabled = false;
    this.airDashes = 0;
    this.airDashLeft = 0;
    this.edgeMode = 'void';
    // The surface currently under the feet. The disc is flat at 0; a TRUCK
    // track writes this per frame (and -Infinity where there is no platform,
    // which is how "the floor left" becomes a fall rather than a special case).
    this.floorY = 0;
    this.overEdge = false;
    this.reset();
  }

  reset() {
    this.feet.set(0, 0, 6);
    this.velocity = this.velocity || new THREE.Vector3();
    this.velocity.set(0, 0, 0);
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
    this.justBunnyHopped = false;
    this.justDaggerJumped = false;
    this.jumpsLeft = MAX_JUMPS;
    this.jumpBuffer = 0;
    this.coyoteT = T.player.coyote;
    this.airTime = 0;
    this.landedAgo = 999;
    this.daggerJumpsLeft = T.player.daggerJumps;
    this.hopCount = 0;
    this.daggerJumpCount = 0;
    this.overEdge = false;
    this._sync();
  }

  get dashK() { return Math.max(0, this.dashT) / DASH_TIME; }
  get horizontalSpeed() { return Math.hypot(this.velocity.x, this.velocity.z); }
  get speedK() {
    return Math.max(0, Math.min(1,
      (this.horizontalSpeed - this.speed) / (T.player.airSpeedCap - this.speed)));
  }

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

    // Buffer jump presses so a press just before landing becomes a clean hop.
    // This is the timing skill in the target movement, replacing a free air jump.
    if (this.input.consumeJump()) this.jumpBuffer = T.player.jumpBuffer;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    let grounded = this.feet.y <= this.floorY + 0.001 && this.vy <= 0;
    this.landedAgo += dt;
    if (grounded) {
      this.coyoteT = T.player.coyote;
      this.airTime = 0;
      this.jumpsLeft = this.maxJumps;
      this.airDashLeft = this.airDashes;
      this.daggerJumpsLeft = T.player.daggerJumps;
    } else {
      this.coyoteT = Math.max(0, this.coyoteT - dt);
      this.airTime += dt;
    }

    if (this.jumpBuffer > 0 && this.coyoteT > 0 && this.jumpsLeft > 0) {
      const chained = grounded && this.landedAgo <= T.player.hopWindow;
      this.vy = JUMP_V;
      this.jumpsLeft--;
      this.jumpBuffer = 0;
      this.coyoteT = 0;
      grounded = false;
      this.justJumped = true;
      if (chained) {
        const boosted = Math.min(T.player.airSpeedCap, this.horizontalSpeed * T.player.hopBoost);
        const speed = this.horizontalSpeed;
        if (speed > 0.01) this.velocity.multiplyScalar(boosted / speed);
        this.justBunnyHopped = true;
        this.hopCount++;
      }
    }

    // Quake-style horizontal velocity: friction/acceleration on the floor,
    // much lighter steering in air, and no hidden normalization of carried
    // momentum. Combining forward + strafe earns the classic diagonal boost.
    const mv = this.input.getMove();
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    _fwd.set(-sin, 0, -cos);
    _right.set(cos, 0, -sin);
    const moveLen = Math.hypot(mv.x, mv.y);
    if (grounded) {
      const speed = this.horizontalSpeed;
      if (speed > 0) {
        const next = Math.max(0, speed - speed * T.player.groundFriction * dt);
        this.velocity.multiplyScalar(next / speed);
      }
    }
    if (moveLen > 0.01) {
      _wish.set(
        _right.x * mv.x + _fwd.x * mv.y, 0,
        _right.z * mv.x + _fwd.z * mv.y).normalize();
      const diagonal = Math.min(Math.abs(mv.x), Math.abs(mv.y));
      const wishSpeed = this.speed * Math.min(1, moveLen) *
        (1 + diagonal * T.player.diagonalBoost);
      const current = this.velocity.dot(_wish);
      const add = wishSpeed - current;
      if (add > 0) {
        const accel = grounded ? T.player.groundAccel : T.player.airAccel;
        this.velocity.addScaledVector(_wish, Math.min(add, accel * dt * wishSpeed));
      }
    }
    const horizontal = this.horizontalSpeed;
    if (horizontal > T.player.airSpeedCap) {
      this.velocity.multiplyScalar(T.player.airSpeedCap / horizontal);
    }

    // Dash: Shift bursts along the move direction (facing if standing
    // still); a stick flick bursts along the flick direction. Requests are
    // buffered briefly so a dash pressed just before cooldown ends still fires.
    this.dashCd -= dt;
    const flick = this.input.consumeDashFlick();
    const dashPressed = this.input.consumeDash();
    if (this.dashEnabled && (dashPressed || flick)) {
      this.dashBuf = T.dash.buffer;
      this.dashBufFlick = flick || null;
    } else if (this.dashBuf > 0) {
      this.dashBuf -= dt;
    }
    if (!this.dashEnabled) {
      this.dashBuf = 0;
      this.dashBufFlick = null;
      this.dashT = 0;
    }
    // AIR DASH — a mode with airDash charges may dash THROUGH the cooldown,
    // but only off the ground and only as many times as it was granted. The
    // charges refill on landing, so it buys air control, never infinite dash.
    const airCharge = this.dashEnabled && this.dashBuf > 0 && this.dashCd > 0
      && !grounded && this.airDashLeft > 0;
    if (airCharge) this.airDashLeft--;
    if (this.dashEnabled && this.dashBuf > 0 && (this.dashCd <= 0 || airCharge)) {
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
    this.feet.addScaledVector(this.velocity, dt);

    const r = Math.hypot(this.feet.x, this.feet.z);
    if (this.edgeMode === 'void') {
      this.overEdge = r > this.arenaR - 0.12;
    } else if (this.edgeMode === 'clamp') {
      this.overEdge = false;
      const max = this.arenaR - 0.8;
      if (r > max) {
        this.feet.x *= max / r;
        this.feet.z *= max / r;
        const nx = this.feet.x / max, nz = this.feet.z / max;
        const outward = this.velocity.x * nx + this.velocity.z * nz;
        if (outward > 0) {
          this.velocity.x -= nx * outward;
          this.velocity.z -= nz * outward;
        }
      }
    } else {
      this.overEdge = false;
    }

    // Vertical integration. A buffered landing press is consumed next frame,
    // before friction, which is what preserves speed through a bunny hop.
    const wasAbove = this.feet.y > this.floorY + 0.001;
    // GLIDE — hold jump while falling and the descent slows. Deliberately
    // only on the way DOWN: a glide that also lifts is a double jump with
    // extra steps, and the thing being tested here is hang time, not height.
    this.gliding = !!(this.glideEnabled && this.vy < 0 && !grounded
      && this.input.jumpHeld());
    this.vy += GRAVITY * (this.gliding ? T.player.glideGravity : 1) * dt;
    this.feet.y += this.vy * dt;
    if (this.feet.y < this.floorY) {
      this.feet.y = this.floorY;
      this.vy = 0;
      if (wasAbove) this.landedAgo = 0;
    }

    // Head-bob only while grounded and moving.
    const moving = this.horizontalSpeed > 0.8 && this.feet.y <= this.floorY + 0.001;
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

  /** A downward tap-burst converts recoil into a dagger jump. The first must
   *  happen just after takeoff; a second is accepted near the apex, matching
   *  the target's authored double-dagger-jump instead of a free air jump. */
  daggerJump(dir) {
    const used = T.player.daggerJumps - this.daggerJumpsLeft;
    const inWindow = used === 0
      ? this.airTime <= T.player.daggerJumpWindow
      : this.airTime <= T.player.daggerSecondWindow && this.vy <= T.player.daggerSecondMaxVy;
    if (this.feet.y <= 0.01 || !inWindow || this.daggerJumpsLeft <= 0 ||
        dir.y > T.player.daggerAimY) return false;
    const aimRange = 1 - Math.abs(T.player.daggerAimY);
    const down = Math.max(0, Math.min(1,
      (-dir.y - Math.abs(T.player.daggerAimY)) / aimRange));
    this.vy = Math.max(this.vy, T.player.daggerJumpV * (0.82 + down * 0.18));
    _wish.set(-dir.x, 0, -dir.z);
    if (_wish.lengthSq() > 0.001) {
      _wish.normalize();
      this.velocity.addScaledVector(_wish, T.player.daggerJumpPush);
      const speed = this.horizontalSpeed;
      if (speed > T.player.airSpeedCap) this.velocity.multiplyScalar(T.player.airSpeedCap / speed);
    }
    this.daggerJumpsLeft--;
    this.justDaggerJumped = true;
    this.daggerJumpCount++;
    return true;
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
