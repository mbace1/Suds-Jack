// The rider: a small robed figure on a board, and a scarf that is simulated
// rather than animated — a verlet chain blown back by the rider's own speed,
// the one moving thing on a still white mountain. Journey's traveller, on
// snow. The figure stands across the board (regular stance), leans into the
// edge, crouches into a tuck, and reaches for the board in a grab.
import { GRABS } from './tricks.js?v=1';
import * as THREE from 'three';
import { RIDER } from './palette.js?v=1';

const SCARF_N = 14, SCARF_SEG = 0.24, SCARF_W = 0.13;

export class Figure {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);

    const flat = c => new THREE.MeshLambertMaterial({ color: c });

    // the board: a slab with a lighter deck
    const board = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.05, 0.3), flat(RIDER.board));
    deck.position.y = 0.04;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.012, 0.24), flat(RIDER.boardTop));
    top.position.y = 0.07;
    board.add(deck, top);
    // the nose and tail turn up a little
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.3), flat(RIDER.board));
      tip.position.set(s * 0.86, 0.09, 0); tip.rotation.z = -s * 0.5;
      board.add(tip);
    }
    board.rotation.y = Math.PI / 2;        // the slab's long axis along the board's forward
    this.board = board;

    // the body: a tapered robe, a hood, two arms, all facing across the board
    const body = new THREE.Group();
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.34, 0.92, 9), flat(RIDER.robe));
    robe.position.y = 0.55;
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.12, 9), flat(RIDER.robeDark));
    hem.position.y = 0.1;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 9), flat(RIDER.hood));
    hood.position.y = 1.16;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), flat(0x14101a));
    face.position.set(0, 1.05, 0.11);
    this.arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.62, 6), flat(RIDER.robe));
      arm.geometry.translate(0, -0.31, 0);
      arm.position.set(s * 0.2, 0.98, 0);
      arm.rotation.z = s * 0.7;
      body.add(arm); this.arms.push(arm);
    }
    body.add(robe, hem, hood, face);
    body.rotation.y = -Math.PI / 2 + 0.9;   // regular stance: chest turned a little downhill
    this.body = body;

    this.rig = new THREE.Group();            // leans and crouches; root carries yaw + surface
    this.rig.add(board, body);
    this.root.add(this.rig);

    // the scarf: SCARF_N points, a ribbon of 2 verts per point
    this.pts = [], this.prev = [];
    for (let i = 0; i < SCARF_N; i++) { this.pts.push(new THREE.Vector3(0, 1.1, -i * SCARF_SEG)); this.prev.push(new THREE.Vector3(0, 1.1, -i * SCARF_SEG)); }
    const geo = new THREE.BufferGeometry();
    this.scarfPos = new Float32Array(SCARF_N * 2 * 3);
    const col = new Float32Array(SCARF_N * 2 * 3);
    const cA = new THREE.Color(RIDER.scarf), cB = new THREE.Color(RIDER.scarfDark);
    for (let i = 0; i < SCARF_N; i++) {
      const c = (i % 4 === 3) ? cB : cA;
      for (let k = 0; k < 2; k++) { const o = (i * 2 + k) * 3; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
    }
    const idx = [];
    for (let i = 0; i < SCARF_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(this.scarfPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    this.scarf = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.scarf.frustumCulled = false;
    scene.add(this.scarf);

    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion();
    this._f = new THREE.Vector3(); this._u = new THREE.Vector3(); this._r = new THREE.Vector3();
    this._neck = new THREE.Vector3(); this._tmp = new THREE.Vector3(); this._wind = new THREE.Vector3();
    this.tumbleSpin = 0;
    this.crouch = 0;
    this.lean = 0;
    this.reach = [0, 0];   // how far each hand is toward the deck
  }

  // s: rider state from physics.js; vel used for the scarf's wind
  update(s, dt, time, tuck = 0) {
    const up = this._u.set(s.up[0], s.up[1], s.up[2]).normalize();
    const f0 = this._f.set(Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    f0.addScaledVector(up, -f0.dot(up)).normalize();
    const r = this._r.crossVectors(f0, up).normalize();
    this._m.makeBasis(r, up, f0.clone().negate());   // basis: x=right, y=up, z=back  (three's -z forward)
    this.root.position.set(s.x, s.y, s.z);
    this.root.quaternion.setFromRotationMatrix(this._m);

    // lean into the edge, crouch into a tuck, curl into a tumble
    const k = Math.min(1, dt * 10);
    this.lean += (s.edge - this.lean) * k;
    const tuckTarget = s.tumble > 0 ? 1 : (s.grounded ? tuck * 0.8 : (s.grab ? 0.9 : 0.25));
    this.crouch += (tuckTarget - this.crouch) * k;
    this.rig.rotation.z = -this.lean * 0.62;
    this.rig.rotation.x = 0;
    this.body.position.y = -this.crouch * 0.22;
    this.body.scale.set(1 + this.crouch * 0.12, 1 - this.crouch * 0.28, 1 + this.crouch * 0.12);
    this.body.position.x = this.lean * 0.12;
    // ARMS, and from v9 they say WHICH grab it is. A trick that has a name you
    // cannot see is a line of text over a figure doing the same thing it does
    // for every other one — so the edge decides which hand goes down (the toe
    // side reaches across the toes, the heel side across the heels) and how far
    // along the board it reaches decides whether that arm swings toward the
    // nose or the tail. Both come out of the same GRABS table the name and the
    // score are read from, so a grab cannot look like one thing and pay another.
    const g = s.grab && s.grabKind ? GRABS[s.grabKind] : null;
    const grab = g ? 1 : 0;
    const toe = g ? g.edge === 'toe' : false;
    const along = g ? (g.along === 'nose' ? -0.75 : g.along === 'tail' ? 0.75 : 0) : 0;
    // AND THE ARM HAS TO REACH THE BOARD, which a 0.62 m stick on a pivot at
    // chest height does not: straight down it stops a third of a metre short of
    // the deck, so every rotation in the world still reads as a figure waving.
    // The reaching arm EXTENDS — the robe is a cone with no elbow in it, so the
    // reach is the only joint there is — and the other one throws out as the
    // counterweight it would really be.
    const takes = g ? (toe ? 1 : 0) : -1;         // the arm that actually goes down
    for (let i = 0; i < 2; i++) {
      const sgn = i === 0 ? -1 : 1;
      const down = i === takes ? 1 : 0;
      this.reach[i] += (down - this.reach[i]) * k;
      const d = this.reach[i];
      this.arms[i].rotation.z = sgn * 0.7 - sgn * d * 0.78 + grab * (1 - d) * sgn * 0.45
        + Math.sin(time * (1.7 + i * 0.2)) * 0.05 * sgn + (s.grounded ? 0 : 0.35) * sgn;
      this.arms[i].rotation.x = d * along;
      this.arms[i].scale.y = 1 + d * 0.58;   // 0.62 m -> 0.98: the hand meets the deck, it does not pass through it
    }
    if (s.tumble > 0) {
      this.tumbleSpin += dt * 9;
      this.rig.rotation.x = this.tumbleSpin;
      this.rig.position.y = 0.4 + Math.abs(Math.sin(this.tumbleSpin)) * 0.2;
    } else { this.tumbleSpin = 0; this.rig.position.y = 0; }

    // ---- the scarf ----
    const neck = this._neck.set(0, 1.12 - this.crouch * 0.28, 0).applyQuaternion(this.rig.quaternion).applyQuaternion(this.root.quaternion).add(this.root.position);
    const wind = this._wind.set(-s.vx, -s.vy * 0.4, -s.vz).multiplyScalar(0.55);
    wind.x += Math.sin(time * 2.3) * 0.8; wind.y += Math.sin(time * 3.1) * 0.6 + 0.6;
    const sub = 2, h = dt / sub;
    for (let it = 0; it < sub; it++) {
      for (let i = 1; i < SCARF_N; i++) {
        const p = this.pts[i], q = this.prev[i];
        const vx = (p.x - q.x) * 0.985, vy = (p.y - q.y) * 0.985, vz = (p.z - q.z) * 0.985;
        q.copy(p);
        p.x += vx + (wind.x) * h * h * 8; p.y += vy + (wind.y - 9.8) * h * h; p.z += vz + (wind.z) * h * h * 8;
      }
      this.pts[0].copy(neck); this.prev[0].copy(neck);
      for (let c = 0; c < 4; c++) {
        for (let i = 1; i < SCARF_N; i++) {
          const a = this.pts[i - 1], b = this.pts[i];
          const d = this._tmp.subVectors(b, a); const l = d.length() || 1e-4;
          const corr = (l - SCARF_SEG) / l;
          if (i === 1) b.addScaledVector(d, -corr);
          else { a.addScaledVector(d, corr * 0.5); b.addScaledVector(d, -corr * 0.5); }
        }
      }
    }
    // write the ribbon: each point widened along a vector perpendicular to the chain and up
    const P = this.scarfPos;
    for (let i = 0; i < SCARF_N; i++) {
      const a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(SCARF_N - 1, i + 1)];
      const d = this._tmp.subVectors(b, a).normalize();
      // side = d × up, falling back when the chain hangs straight down
      let sx = d.z * 1 - d.y * 0, sy = 0, sz = -d.x;
      const sl = Math.hypot(sx, sz);
      if (sl < 0.2) { sx = 1; sz = 0; } else { sx /= sl; sz /= sl; }
      const w = SCARF_W * (1 - i / SCARF_N * 0.45);
      const p = this.pts[i];
      const o = i * 6;
      P[o] = p.x + sx * w; P[o + 1] = p.y + sy * w; P[o + 2] = p.z + sz * w;
      P[o + 3] = p.x - sx * w; P[o + 4] = p.y - sy * w; P[o + 5] = p.z - sz * w;
    }
    this.scarf.geometry.attributes.position.needsUpdate = true;
    this.scarf.geometry.computeVertexNormals();
  }

  // the board's outside-edge point and the spray direction, in world space
  edgePoint(s, out, dir) {
    const side = s.edge >= 0 ? 1 : -1;
    out.set(side * 0.14, 0.05, 0).applyQuaternion(this.root.quaternion).add(this.root.position);
    dir.set(-side * 0.75, 0.55, 0.45).applyQuaternion(this.root.quaternion).normalize();
    return out;
  }
}
