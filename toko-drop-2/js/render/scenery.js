// scenery.js — what stands round a world's floor, and the drain that opens
// in it (owner, 2026-10-23: the worlds, sim/worlds.js).
//
//   world 1  the grid: nothing round it but the void, as 1.x had it
//   world 2  the driveway: a concrete curb along the far side and the two
//            long ones with the lawn behind it, and the lawn meeting the
//            slab straight at the near side ("you can see there is a curb
//            and grass behind it, or just grass as the limit")
//   world 3  the sewer: brick walls along the tunnel's two long sides, iron
//            bars across its two ends, and the dark past them
//   the rest a SURROUND (v43, owner, 2026-10-24: "make the portrait mode
//            levels a bit bigger and put graphics on the sides"): a ground
//            that goes on past the floor and fades into the dark, a thin
//            glowing edge in the world's rail colour where the floor stops,
//            and props standing along the far side and the two sides — the
//            grid's neon posts, the cistern's columns, the boiler's pipes and
//            stacks, the river's rocks and reeds, the ice's shards, the
//            deep's spires and kelp, the core's towers. Never along the near
//            side: nothing stands between you and the fight. One builder,
//            every number in TUNING.scenery.surround[world id]
//
// The floor itself is floor.js (its `style`); this is the rest. The camera
// follows the hero on worlds 2 and 3 and shows T.camera.follow.edge m past
// the floor, which is what the lawn and the walls are sized for. The lawn and
// the slab are pictures (unlit, as the floor is); the curb, the walls and the
// bars stand up, so they are lit by the scene's lights. Every number is
// TUNING.scenery.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, fract, sin, dot, floor as tfloor, mix, smoothstep, abs, positionWorld, positionLocal, clamp, max, min, length, select } from 'three/tsl';

// a hash and value noise on the world plane, cheap enough for a picture
const hash = (p) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
export const noise = Fn(([p]) => {
  const i = tfloor(p), f = fract(p), u = f.mul(f).mul(float(3).sub(f.mul(2)));
  const a = hash(i), b = hash(i.add(vec2(1, 0))), c = hash(i.add(vec2(0, 1))), d = hash(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

export class Scenery {
  constructor(scene, T) {
    this.scene = scene; this.T = T;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.parts = [];
    this.drain = this._drain();
    this.drain.visible = false;
    scene.add(this.drain);
  }

  // world n's surroundings for an arena of half sizes hx × hz: the driveway's
  // lawn and curb and the sewer's walls on the STREET look, a surround for
  // every other floor (`id` names it: a world's id, or 'grid' for world 1,
  // NEON's floors, SURVIVAL and the campaign's rooms)
  build(n, hx, hz, { look = 'street', id = null } = {}) {
    this.clear();
    // what was built, for the smoke: 'driveway', 'sewer', or 'surround:<the spec it used>'
    if (look === 'street' && n === 2) { this._driveway(hx, hz); this.kind = 'driveway'; }
    else if (look === 'street' && n === 3) { this._sewer(hx, hz); this.kind = 'sewer'; }
    else {
      const want = id ?? this.T.worlds.list[n - 1]?.id ?? 'grid', got = this.T.scenery.surround[want] ? want : 'grid';
      this._surround(got, hx, hz); this.kind = `surround:${got}`;
    }
    this.drain.visible = false;
  }

  clear() {
    for (const m of this.parts) { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.parts.length = 0;
  }

  _add(mesh) { this.group.add(mesh); this.parts.push(mesh); return mesh; }

  // ── world 2: the lawn round the slab, and the curb on three sides ──
  _driveway(hx, hz) {
    const S = this.T.scenery.driveway, out = S.lawnOut;
    const lawnMat = new THREE.MeshBasicNodeMaterial();
    lawnMat.colorNode = Fn(() => {
      const p = positionWorld.xz;
      // blades: fine noise; the mower's stripes, across the long way; tufts
      const blade = noise(p.mul(S.bladeScale)), tuft = noise(p.mul(S.tuftScale).add(7.3));
      const stripe = smoothstep(-0.15, 0.15, sin(p.x.mul(Math.PI / S.stripe)));
      const lo = vec3(...S.grassLo), hi = vec3(...S.grassHi);
      const col = mix(lo, hi, blade.mul(0.55).add(tuft.mul(0.25)).add(stripe.mul(0.2)));
      // it falls into the night the further it is from the slab
      const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0);
      const far = clamp(length(vec2(dx, dz)).div(S.fade), 0, 1);
      return col.mul(float(1).sub(far.mul(0.85)));
    })();
    const lawn = this._add(new THREE.Mesh(new THREE.PlaneGeometry(2 * (hx + out), 2 * (hz + out)).rotateX(-Math.PI / 2), lawnMat));
    lawn.position.y = -0.02; lawn.renderOrder = -2;

    // the curb: a low concrete kerb just outside the slab, its top rounded
    // off by a narrower cap; none along the near side
    const curbMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
    curbMat.colorNode = Fn(() => {
      const p = positionWorld;
      const grit = noise(vec2(p.x.add(p.y.mul(3)), p.z).mul(9)).mul(0.12);
      // a joint every curbJoint m along it: the distance to the nearest, in m
      const along = select(abs(p.x).greaterThan(hx), p.z, p.x);
      const toJoint = float(0.5).sub(abs(fract(along.div(S.curbJoint)).sub(0.5))).mul(S.curbJoint);
      const joint = float(1).sub(smoothstep(0.012, 0.03, toJoint));
      return vec3(...S.curb).mul(float(0.92).add(grit)).mul(mix(float(1), float(0.5), joint));
    })();
    const W = S.curbWidth, H = S.curbHeight;
    const sides = [
      [2 * (hx + W), W, 0, -(hz + W / 2)],          // the far side
      [W, 2 * hz + W, -(hx + W / 2), -W / 2],       // left
      [W, 2 * hz + W, hx + W / 2, -W / 2],          // right
    ];
    for (const [sx, sz, x, z] of sides) {
      const body = this._add(new THREE.Mesh(new THREE.BoxGeometry(sx, H * 0.8, sz), curbMat.clone()));
      body.position.set(x, H * 0.4, z);
      const cap = this._add(new THREE.Mesh(new THREE.BoxGeometry(sx - (sx === W ? W * 0.3 : 0.04), H * 0.2, sz - (sz === W ? W * 0.3 : 0.04)), curbMat.clone()));
      cap.position.set(x, H * 0.9, z);
    }
  }

  // ── world 3: the tunnel's walls and the bars across its ends ──
  _sewer(hx, hz) {
    const S = this.T.scenery.sewer;
    // the tunnel runs along the arena's long axis
    const alongX = hx >= hz, L = alongX ? hx : hz, Wd = alongX ? hz : hx;
    const brick = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
    brick.colorNode = Fn(() => {
      const p = positionWorld;
      const u = (alongX ? p.x : p.z).div(S.brick[0]), v = p.y.div(S.brick[1]);
      const row = tfloor(v), off = fract(row.mul(0.5)).mul(2).mul(0.5);
      const bu = fract(u.add(off)), bv = fract(v);
      const mortar = max(smoothstep(0.94, 0.985, bu), smoothstep(0.88, 0.96, bv)).max(float(1).sub(smoothstep(0.02, 0.06, bu)));
      const tone = noise(vec2(tfloor(u.add(off)), row).mul(1.7)).mul(0.35).add(0.75);
      const damp = smoothstep(S.damp, 0, p.y).mul(0.35);   // darker and wetter near the water line
      const col = vec3(...S.brickColor).mul(tone).mul(float(1).sub(damp));
      return mix(col, vec3(...S.mortar), mortar);
    })();
    const H = S.wallHeight, T2 = S.wallThick, len = 2 * (L + S.beyond);
    for (const s of [-1, 1]) {
      const geo = alongX ? new THREE.BoxGeometry(len, H, T2) : new THREE.BoxGeometry(T2, H, len);
      const wall = this._add(new THREE.Mesh(geo, brick.clone()));
      if (alongX) wall.position.set(0, H / 2, s * (Wd + T2 / 2)); else wall.position.set(s * (Wd + T2 / 2), H / 2, 0);
    }
    // the bars: iron, upright, across each end, the dark showing through them
    const barMat = new THREE.MeshStandardNodeMaterial({ color: S.bar, roughness: 0.5, metalness: 0.6 });
    const n = Math.ceil((2 * Wd) / S.barGap);
    const geo = new THREE.CylinderGeometry(S.barR, S.barR, S.barHeight, 8);
    for (const s of [-1, 1]) {
      const bars = this._add(new THREE.InstancedMesh(geo.clone(), barMat.clone(), n + 1));
      const m = new THREE.Matrix4();
      for (let i = 0; i <= n; i++) {
        const t = -Wd + (i * 2 * Wd) / n;
        m.makeTranslation(alongX ? s * (L + S.barR) : t, S.barHeight / 2, alongX ? t : s * (L + S.barR));
        bars.setMatrixAt(i, m);
      }
    }
    geo.dispose();
    // and a rail across the top of each, so they read as a grate and not a fence
    for (const s of [-1, 1]) {
      const rail = this._add(new THREE.Mesh(alongX ? new THREE.BoxGeometry(0.12, 0.12, 2 * Wd) : new THREE.BoxGeometry(2 * Wd, 0.12, 0.12), barMat.clone()));
      if (alongX) rail.position.set(s * (L + S.barR), S.barHeight, 0); else rail.position.set(0, S.barHeight, s * (L + S.barR));
    }
  }

  // ── every other world: a ground past the floor, its edge, props round it ──
  _surround(id, hx, hz) {
    const S = this.T.scenery.surround[id];
    const G = S.ground, out = G.out;
    // the ground: two tones of noise, a grid or traces if the world has one,
    // falling into the dark the further it lies from the floor
    const groundMat = new THREE.MeshBasicNodeMaterial();
    groundMat.colorNode = Fn(() => {
      const p = positionWorld.xz;
      const n1 = noise(p.mul(G.scale ?? 0.6)), n2 = noise(p.mul((G.scale ?? 0.6) * 4.1).add(5.7));
      let col = mix(vec3(...G.lo), vec3(...G.hi), n1.mul(0.7).add(n2.mul(0.3)));
      if (G.line) {
        const c = p.div(G.cell), f = abs(fract(c).sub(0.5)).mul(2);
        const ln = smoothstep(0.92, 0.985, max(f.x, f.y));
        col = col.add(vec3(...G.line).mul(ln));
      }
      const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0);
      const far = clamp(length(vec2(dx, dz)).div(G.fade), 0, 1);
      return col.mul(float(1).sub(far.mul(far).mul(0.97)));
    })();
    const ground = this._add(new THREE.Mesh(new THREE.PlaneGeometry(2 * (hx + out), 2 * (hz + out)).rotateX(-Math.PI / 2), groundMat));
    ground.position.y = -0.03; ground.renderOrder = -2;

    // the edge: a thin line glowing in the world's rail colour, all four sides
    if (S.edge) {
      const E = S.edge, mat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(E.color).multiplyScalar(E.glow ?? 1) });
      const w = E.width;
      for (const [sx, sz, x, z] of [[2 * hx + 2 * w, w, 0, -(hz + w / 2)], [2 * hx + 2 * w, w, 0, hz + w / 2], [w, 2 * hz, -(hx + w / 2), 0], [w, 2 * hz, hx + w / 2, 0]]) {
        const m = this._add(new THREE.Mesh(new THREE.BoxGeometry(sx, E.height, sz), mat.clone()));
        m.position.set(x, E.height / 2, z);
      }
    }

    // the props: placed by a fixed hash, so a world stands the same every time
    let seed = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const range = (v) => (Array.isArray(v) ? v[0] + rnd() * (v[1] - v[0]) : v);
    for (const P of S.props ?? []) {
      if (P.shape === 'pipe') { this._pipes(P, hx, hz); continue; }
      // stations along the left side, the right side and the far side
      const spots = [];
      for (const side of ['left', 'right', 'far']) {
        const len = side === 'far' ? 2 * (hx + (P.out[1] ?? P.out[0])) : 2 * hz + (P.out[1] ?? P.out[0]);
        const n = Math.max(1, Math.floor(len / P.every));
        for (let i = 0; i < n; i++) {
          const along = -len / 2 + (i + 0.5 + (rnd() - 0.5) * (P.jitter ?? 0.6)) * (len / n), off = range(P.out);
          if (side === 'far') spots.push([along, -(hz + off)]);
          else spots.push([(side === 'left' ? -1 : 1) * (hx + off), along - (P.out[1] ?? P.out[0]) / 2]);
        }
      }
      const geo = {
        post: () => new THREE.BoxGeometry(1, 1, 1), tower: () => new THREE.BoxGeometry(1, 1, 1),
        column: () => new THREE.CylinderGeometry(1, 1.12, 1, 14), stack: () => new THREE.CylinderGeometry(1, 1, 1, 16),
        rock: () => new THREE.DodecahedronGeometry(1, 0), reed: () => new THREE.ConeGeometry(1, 1, 5), shard: () => new THREE.ConeGeometry(1, 1, 5),
        kelp: () => new THREE.CylinderGeometry(0.55, 1, 1, 6),
      }[P.shape]();
      const mat = new THREE.MeshStandardNodeMaterial({ color: P.color, roughness: P.rough ?? 0.8, metalness: P.metal ?? 0, flatShading: P.shape === 'rock' || P.shape === 'shard' });
      if (P.glow != null) {
        // posts and kelp glow toward their tops, stacks in a band under the rim,
        // towers in stripes, shards all over and faintly
        const y = positionLocal.y.add(0.5), g = vec3(...new THREE.Color(P.glow).toArray()).mul(P.glowI ?? 1);
        mat.emissiveNode = P.shape === 'tower' ? g.mul(float(1).sub(smoothstep(0.06, 0.1, abs(fract(y.mul(P.stripes ?? 6)).sub(0.5)))))
          : P.shape === 'stack' ? g.mul(smoothstep(0.78, 0.84, y).mul(float(1).sub(smoothstep(0.9, 0.95, y))))
          : P.shape === 'shard' ? g
          : g.mul(smoothstep(0.35, 1.0, y));
      }
      const inst = this._add(new THREE.InstancedMesh(geo, mat, spots.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
      spots.forEach(([x, z], i) => {
        const h = range(P.h), r = range(P.r ?? P.w ?? 0.5);
        e.set(P.tilt ? (rnd() - 0.5) * P.tilt : 0, rnd() * Math.PI * 2, P.tilt ? (rnd() - 0.5) * P.tilt : 0);
        q.setFromEuler(e);
        s.set(r, h, r);
        t.set(x, P.shape === 'rock' ? h * 0.35 : h / 2, z);
        m.compose(t, q, s);
        inst.setMatrixAt(i, m);
      });
    }
  }

  // the boiler's pipes: one long run down each side, banded every few metres
  _pipes(P, hx, hz) {
    const mat = new THREE.MeshStandardNodeMaterial({ color: P.color, roughness: 0.45, metalness: 0.75 });
    const band = new THREE.MeshStandardNodeMaterial({ color: P.band ?? 0x6a5a48, roughness: 0.4, metalness: 0.8 });
    const len = 2 * (hz + 14);
    for (const s of [-1, 1]) for (const [k, off] of P.out.entries()) {
      const r = P.r * (k ? 0.7 : 1), x = s * (hx + off), y = P.y + k * P.r * 1.9;
      const pipe = this._add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18).rotateX(Math.PI / 2), mat.clone()));
      pipe.position.set(x, y, 0);
      const n = Math.floor(len / P.every);
      const rings = this._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.22, 18).rotateX(Math.PI / 2), band.clone(), n));
      const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { m.makeTranslation(x, y, -len / 2 + (i + 0.5) * P.every); rings.setMatrixAt(i, m); }
    }
  }

  // ── the drain that opens where world 2's boss went down ──
  _drain() {
    const D = this.T.scenery.drain, g = new THREE.Group();
    const iron = new THREE.MeshStandardNodeMaterial({ color: D.iron, roughness: 0.55, metalness: 0.7 });
    const frame = new THREE.Mesh(new THREE.RingGeometry(D.r * 0.82, D.r, 4, 1).rotateX(-Math.PI / 2).rotateY(Math.PI / 4), iron);
    frame.position.y = 0.02;
    g.add(frame);
    const slot = D.r * 1.15 / D.bars;
    for (let i = 0; i < D.bars; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(slot * 0.42, 0.05, D.r * 1.16), iron);
      bar.position.set(-D.r * 0.575 + slot * (i + 0.5), 0.03, 0);
      g.add(bar);
    }
    // the dark under the bars
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(D.r * 1.16, D.r * 1.16).rotateX(-Math.PI / 2), new THREE.MeshBasicNodeMaterial({ color: 0x020306 }));
    hole.position.y = 0.012;
    g.add(hole);
    return g;
  }

  // the drain at (x, z), `k` 0 → 1 as it rises out of the slab
  showDrain(x, z, k) {
    this.drain.visible = k > 0;
    this.drain.position.set(x, 0, z);
    const s = Math.min(1, k * 1.15);
    this.drain.scale.set(s, 1, s);
  }

  dispose() { this.clear(); this.scene.remove(this.group); this.scene.remove(this.drain); }
}
