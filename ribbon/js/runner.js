import * as THREE from 'three';
import { WHITE_MAT, inkMat, ACCENT } from './track.js?v=1';

// A minimalist vector runner: white outlined boxes over a tiny skeleton, animated
// procedurally. Faces forward (−z); the world scrolls past so it runs "in place",
// with jump / slide / dodge / stumble overlaid on the run cycle.
const TORSO = 0.55, HEAD = 0.26, ARM = 0.30, FORE = 0.26, THIGH = 0.42, SHIN = 0.40;
const SHOULDER_X = 0.20, HIP_X = 0.13, HIP_Y = 0.86;
export const DODGE_X = 0.95;   // how far a dodge slides the runner sideways

// A bone: an outlined box that hangs down (−y) from a pivot, with a `tip` for the next joint.
class Bone {
  constructor(parent, len, thick) {
    this.pivot = new THREE.Object3D(); parent.add(this.pivot);
    const geo = new THREE.BoxGeometry(thick, len, thick);
    geo.translate(0, -len / 2, 0);
    this.pivot.add(new THREE.Mesh(geo, WHITE_MAT));
    this.pivot.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), inkMat()));
    this.tip = new THREE.Object3D(); this.tip.position.y = -len; this.pivot.add(this.tip);
  }
}

function upBox(parent, w, h, d, y) {                 // an outlined box standing up from `y`
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, y + h / 2, 0);
  parent.add(new THREE.Mesh(geo, WHITE_MAT));
  parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), inkMat()));
}

const lerp = (a, b, t) => a + (b - a) * t;

export class Runner {
  constructor(scene) {
    this.group = new THREE.Group();           // pelvis anchor, moved through the world
    scene.add(this.group);
    this.body = new THREE.Object3D();          // tips forward / crouches; child of group
    this.group.add(this.body);

    upBox(this.body, 0.18, TORSO, 0.12, 0);                       // torso
    upBox(this.body, HEAD, HEAD, HEAD, TORSO + 0.04);            // head

    // a little accent scarf at the neck — the run's one spot of colour
    const sgeo = new THREE.BoxGeometry(0.22, 0.07, 0.16); sgeo.translate(0, TORSO + 0.01, 0.02);
    this.body.add(new THREE.Mesh(sgeo, new THREE.MeshBasicMaterial({ color: ACCENT })));

    const shL = new THREE.Object3D(); shL.position.set(-SHOULDER_X, TORSO - 0.04, 0); this.body.add(shL);
    const shR = new THREE.Object3D(); shR.position.set( SHOULDER_X, TORSO - 0.04, 0); this.body.add(shR);
    this.armL = new Bone(shL, ARM, 0.08); this.foreL = new Bone(this.armL.tip, FORE, 0.07);
    this.armR = new Bone(shR, ARM, 0.08); this.foreR = new Bone(this.armR.tip, FORE, 0.07);

    const hpL = new THREE.Object3D(); hpL.position.set(-HIP_X, 0, 0); this.body.add(hpL);
    const hpR = new THREE.Object3D(); hpR.position.set( HIP_X, 0, 0); this.body.add(hpR);
    this.thighL = new Bone(hpL, THIGH, 0.10); this.shinL = new Bone(this.thighL.tip, SHIN, 0.09);
    this.thighR = new Bone(hpR, THIGH, 0.10); this.shinR = new Bone(this.thighR.tip, SHIN, 0.09);

    this.phase = 0;
    this.action = 'run';     // run | jump | slide | left | right | stumble
    this.actT = 0; this.actDur = 1;
    this.x = 0; this.xTarget = 0;   // lateral dodge position
    this.reset();
  }

  reset() {
    this.action = 'run'; this.actT = 0; this.phase = 0;
    this.x = this.xTarget = 0;
    this.visible(true);
  }
  visible(v) { this.group.visible = v; }

  trigger(dir) {
    this.action = dir === 'up' ? 'jump' : dir === 'down' ? 'slide' : dir;
    this.actDur = dir === 'up' ? 0.62 : dir === 'down' ? 0.55 : 0.42;
    this.actT = this.actDur;
    this.xTarget = dir === 'left' ? -DODGE_X : dir === 'right' ? DODGE_X : 0;
  }
  stumble() { this.action = 'stumble'; this.actDur = 0.55; this.actT = this.actDur; this.xTarget = 0; }

  update(dt, cadence) {
    if (this.actT > 0) { this.actT -= dt; if (this.actT <= 0) { this.action = 'run'; this.xTarget = 0; } }
    this.phase += dt * cadence;
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    const p = this.actT > 0 ? 1 - this.actT / this.actDur : 0;   // 0..1 through the current action

    // base run cycle (legs swing on x, arms counter-swing)
    let swing = 0.7, knee = 0.9, armSw = 0.6, lean = 0.16;
    let yLift = 0, crouch = 0, roll = 0, jitter = 0;

    if (this.action === 'jump') {
      const a = Math.sin(Math.PI * p);
      yLift = a * 1.35; swing = lerp(swing, 0.15, a); knee = lerp(knee, 1.4, a); armSw = lerp(armSw, -0.9, a);
      lean = 0.05;
    } else if (this.action === 'slide') {
      const a = Math.sin(Math.PI * p);
      crouch = a * 0.55; lean = 0.16 + a * 0.9; swing = lerp(swing, 0.25, a); knee = lerp(knee, 0.2, a);
    } else if (this.action === 'left' || this.action === 'right') {
      roll = (this.action === 'left' ? 1 : -1) * Math.sin(Math.PI * p) * 0.35;
    } else if (this.action === 'stumble') {
      jitter = (1 - p); armSw = -1.1; swing = 0.2; lean = -0.25 * (1 - p);
    }

    // ease lateral position toward the dodge target then back to centre
    this.x = lerp(this.x, this.xTarget, Math.min(1, dt * 14));

    const bob = Math.abs(s) * 0.045;
    this.group.position.x = this.x + (jitter ? (Math.random() - 0.5) * 0.12 : 0);
    this.group.position.y = HIP_Y + yLift - crouch + bob;
    this.body.rotation.set(lean, 0, roll + (jitter ? (Math.random() - 0.5) * 0.3 : 0));

    // legs
    this.thighL.pivot.rotation.x =  s * swing;  this.thighR.pivot.rotation.x = -s * swing;
    this.shinL.pivot.rotation.x  = Math.max(0, -s) * knee;
    this.shinR.pivot.rotation.x  = Math.max(0,  s) * knee;
    // arms (counter to legs, with a bent forearm)
    this.armL.pivot.rotation.x = -s * armSw;  this.armR.pivot.rotation.x =  s * armSw;
    this.foreL.pivot.rotation.x = 0.5 + Math.max(0,  s) * 0.5;
    this.foreR.pivot.rotation.x = 0.5 + Math.max(0, -s) * 0.5;

    return c; // footfall hint (unused but handy)
  }
}
