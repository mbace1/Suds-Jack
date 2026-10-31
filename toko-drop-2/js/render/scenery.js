// scenery.js — what stands round a world's floor, and the drain that opens
// in it (owner, 2026-10-23: the worlds, sim/worlds.js).
//
//   world 1  the grid: nothing round it but the void, as 1.x had it
//   world 2  the driveway: a concrete curb along the far side and the two
//            long ones with the lawn behind it, and the lawn meeting the
//            slab straight at the near side ("you can see there is a curb
//            and grass behind it, or just grass as the limit"); in summer
//            daylight since v66, the curb taller than the hero. Since v65
//            built to the owner's module sheet: the curb in pieces with a
//            rounded top and a seam between them, an L at each far corner,
//            a rounded end where it stops at the near side, its shadow on
//            the grass, and tufts of grass against it, thickest at the
//            corners. The sheet's cracks and storm drain are the floor's
//            (floor.js), and the drain that opens for the way down is this
//            file's, drawn as the same grate
//   world 3  the sewer: brick walls along the tunnel's two long sides, iron
//            bars across its two ends, and the dark past them. Since v70 built
//            to the World 3 brief: the walls in pieces under a stone capstone,
//            a pier at each corner, the gates framed, pipe mouths in the walls
//            with a green trickle out of each (the floor runs it on to the
//            channel), and shafts of sunlight through the street grates over
//            the pools of it the floor draws
//   world 4  the cistern (v71, its brief): stone columns standing in dark water,
//            lamps at the inner row's feet
//   worlds 5-9 (v72, a brief each, art-ref/briefs/): a SET of their own in
//            render/sets/ — the boiler room's boilers, pipes and steam; the
//            river running on past the floor with its stones, reeds and piles,
//            lily pads drifting the way the current pushes; the ice's crystal
//            clusters and drifts; the deep's kelp, boulders, anemones and
//            bubbles; the core's towers, rings and beams
//   the rest a SURROUND (v43, owner, 2026-10-24: "make the portrait mode
//            levels a bit bigger and put graphics on the sides"): a ground
//            that goes on past the floor and fades into the dark, a thin
//            glowing edge in the world's rail colour where the floor stops,
//            and props standing along the far side and the two sides — the
//            grid's lit bollards, now (world 1, NEON's floors, SURVIVAL).
//            Never along the near side: nothing stands between you and the
//            fight. One builder, every number in TUNING.scenery.surround[id]
//
// The floor itself is floor.js (its `style`); this is the rest. The camera
// follows the hero on worlds 2 and 3 and shows T.camera.follow.edge m past
// the floor, which is what the lawn and the walls are sized for. The lawn and
// the slab are pictures (unlit, as the floor is); the curb, the walls and the
// bars stand up, so they are lit by the scene's lights. Every number is
// TUNING.scenery.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, fract, sin, dot, floor as tfloor, mix, smoothstep, abs, positionWorld, positionLocal, normalWorld, normalView, clamp, max, min, length, step, fwidth, uv, attribute } from 'three/tsl';
import { GEL_TIME } from './gel.js?v=77';
import { hash, noise, seeded, motes } from './kit.js?v=77';
import { boiler } from './sets/boiler.js?v=77';
import { river } from './sets/river.js?v=77';
import { ice } from './sets/ice.js?v=77';
import { deep } from './sets/deep.js?v=77';
import { core } from './sets/core.js?v=77';

// worlds 5-9 (v72): a set of their own each, built to its brief (render/sets/)
const SETS = { boiler, river, ice, deep, core };

// the noise, the cracks and the seeded numbers are the kit's (v72: render/kit.js),
// and the floor still takes them from here
export { noise, cells } from './kit.js?v=77';

// the storm drain's grate (v65, the owner's world-2 sheet), in its own units
// (q, its frame's radius 1): x the grate, y a slot, z the frame. Rows of
// capsule slots, 4 6 6 6 4 as the sheet has them, every one whole inside
// the frame. The floor draws one into the slab, and the drain the way down
// opens through is the same
export const grate = Fn(([q]) => {
  const r = length(q), aa = max(fwidth(r), 1e-4);
  const disc = float(1).sub(smoothstep(float(1).sub(aa), float(1).add(aa), r));
  const frame = smoothstep(float(0.84).sub(aa), float(0.84).add(aa), r).mul(disc);
  const cx = tfloor(q.x.div(0.23)).add(0.5).mul(0.23), cy = tfloor(q.y.div(0.25).add(0.5)).mul(0.25);
  const keep = float(1).sub(step(0.74, length(vec2(abs(cx).add(0.085), abs(cy).add(0.06)))));
  const f = q.sub(vec2(cx, cy)), d = length(vec2(max(abs(f.x).sub(0.025), 0), f.y)).sub(0.06), da = max(fwidth(d), 1e-4);
  return vec3(disc, float(1).sub(smoothstep(da.negate(), da, d)).mul(keep).mul(disc), frame);
});

// where world 3's sunlight falls and its pipes run out (v70): the scenery
// stands the shafts and the pipe mouths on these, and the floor lays the
// pools of light and the rivulets on the same, so the two cannot disagree.
// `a` runs along the tunnel, `c` across it
export function sewerSpots(T, hx, hz) {
  const S = T.scenery.sewer, alongX = hx >= hz, L = alongX ? hx : hz, Wd = alongX ? hz : hx;
  const n = Math.max(1, Math.floor((2 * L) / S.sun.every));
  const pools = Array.from({ length: n }, (_, k) => ({ a: (k - (n - 1) / 2) * S.sun.every, c: (k % 2 ? 1 : -1) * S.sun.c }));
  const m = Math.max(1, Math.floor((2 * L) / S.pipe.every - 0.5)), pipes = [];
  for (const side of [-1, 1]) for (let j = 0; j < m; j++) pipes.push({ a: (j - (m - 1) / 2) * S.pipe.every + (side * S.pipe.every) / 4, side });
  return { alongX, L, Wd, pools, pipes, perSide: m };
}

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

  // ── world 2: the lawn round the slab, the curb on three sides, the tufts ──
  _driveway(hx, hz) {
    const S = this.T.scenery.driveway, out = S.lawnOut, W = S.curbWidth;
    const lawnMat = new THREE.MeshBasicNodeMaterial();
    lawnMat.colorNode = Fn(() => {
      const p = positionWorld.xz;
      // blades: fine noise; the mower's stripes, across the long way; tufts
      const blade = noise(p.mul(S.bladeScale)), tuft = noise(p.mul(S.tuftScale).add(7.3));
      const stripe = smoothstep(-0.15, 0.15, sin(p.x.mul(Math.PI / S.stripe)));
      const lo = vec3(...S.grassLo), hi = vec3(...S.grassHi);
      const col = mix(lo, hi, blade.mul(0.55).add(tuft.mul(0.25)).add(stripe.mul(0.2)));
      // the curb's shadow on the grass along its outside, as far as its near ends
      const past = length(max(vec2(abs(p.x).sub(hx + W), p.y.negate().sub(hz + W)), 0));
      const shade = float(1).sub(smoothstep(0, S.curbShadowW, past)).mul(float(1).sub(smoothstep(hz - S.curbNose, hz + 0.1, p.y)));
      // it goes into the summer haze the further it is from the slab (v66; it fell into the night)
      const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0);
      const far = clamp(length(vec2(dx, dz)).div(S.fade), 0, 1);
      return mix(col.mul(float(1).sub(shade.mul(S.curbShadow))), vec3(...S.haze), far.mul(S.fadeTo));
    })();
    const lawn = this._add(new THREE.Mesh(new THREE.PlaneGeometry(2 * (hx + out), 2 * (hz + out)).rotateX(-Math.PI / 2), lawnMat));
    // drawn after the floor (v68; it was drawn first), so the depth test throws
    // away the grass under the slab before it is shaded
    lawn.position.y = -0.02; lawn.renderOrder = 1;
    this._curb(S, hx, hz);
    this._tufts(S, hx, hz);
  }

  // the curb (v65, the owner's module sheet): straight pieces with the top
  // rounded off and a seam between them, an L at each far corner (two arms
  // mitred where they meet), and the end rounded down to the grass where it
  // stops at the open near side. One mesh: three runs, each in its own frame
  // — out from the slab's edge (u), up (v) and along it (s, N × up, so every
  // run winds its faces the same way)
  _curb(S, hx, hz) {
    const W = S.curbWidth, H = S.curbHeight, R = S.curbRound, gap = S.curbGap, E = 0.05, rnd = seeded(65);
    // the cross-section, from the slab's side over the top to the grass's
    const prof = [[0, 0]];
    for (let i = 0; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); prof.push([R - R * Math.cos(a), H - R + R * Math.sin(a)]); }
    for (let i = 0; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); prof.push([W - R + R * Math.sin(a), H - R + R * Math.cos(a)]); }
    prof.push([W, 0]);
    const np = prof.length, pos = [], kerb = [], idx = [];
    // a piece from s0 to s1 of a run; each end 'joint' (square, a seam to the
    // next), 'mitre' (the corner's other arm) or 'nose' (rounded down). A ring
    // is the cross-section at s (a function of u at a mitre), its height × k,
    // and e: 0 at a seam, 1 a few cm in, which the colour darkens toward
    const piece = (run, s0, s1, a, b) => {
      const nose = (from, dir) => Array.from({ length: 6 }, (_, i) => { const f = (i / 5) * (Math.PI / 2); return { s: from + dir * S.curbNose * (1 - Math.cos(f)), k: Math.sin(f), e: 1 }; });
      const end = (at, dir, kind) => kind === 'nose' ? nose(at, dir)
        : kind === 'mitre' ? [{ s: (u) => at - dir * (u - gap * 0.71), k: 1, e: 0 }, { s: (u) => at - dir * (u - gap * 0.71 - E), k: 1, e: 1 }]
          : [{ s: at + dir * (gap / 2), k: 1, e: 0 }, { s: at + dir * (gap / 2 + E), k: 1, e: 1 }];
      const rings = [...end(s0, 1, a), ...end(s1, -1, b).reverse()], tone = rnd() * 2 - 1;
      const put = (g) => { for (const [u, v] of prof) { const s = typeof g.s === 'function' ? g.s(u) : g.s; pos.push(run.o[0] + run.n[0] * u + run.a[0] * s, v * g.k, run.o[1] + run.n[1] * u + run.a[1] * s); kerb.push(g.e, tone); } };
      const at = pos.length / 3;
      rings.forEach(put);
      for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < np - 1; i++) { const p = at + j * np + i, q = p + np; idx.push(p, q + 1, p + 1, p, q, q + 1); }
      // a square end gets a face of its own (its own vertices, so the edge stays hard)
      for (const [g, back] of [[a !== 'nose' && rings[0], false], [b !== 'nose' && rings[rings.length - 1], true]]) {
        if (!g) continue;
        const c = pos.length / 3;
        put({ ...g, e: 0 });
        for (let i = 1; i < np - 1; i++) back ? idx.push(c, c + i + 1, c + i) : idx.push(c, c + i, c + i + 1);
      }
    };
    // the pieces between s0 and s1, about curbJoint m each
    const pieces = (run, s0, s1, a, b) => {
      const n = Math.max(1, Math.round((s1 - s0) / S.curbJoint)), l = (s1 - s0) / n;
      for (let i = 0; i < n; i++) piece(run, s0 + i * l, s0 + (i + 1) * l, i ? 'joint' : a, i < n - 1 ? 'joint' : b);
    };
    const arm = S.curbArm, far = { o: [-hx, -hz], n: [0, -1], a: [1, 0] }, right = { o: [hx, -hz], n: [1, 0], a: [0, 1] }, left = { o: [-hx, hz], n: [-1, 0], a: [0, -1] };
    piece(far, 0, arm, 'mitre', 'joint'); pieces(far, arm, 2 * hx - arm, 'joint', 'joint'); piece(far, 2 * hx - arm, 2 * hx, 'joint', 'mitre');
    piece(right, 0, arm, 'mitre', 'joint'); pieces(right, arm, 2 * hz, 'joint', 'nose');
    pieces(left, 0, 2 * hz - arm, 'nose', 'joint'); piece(left, 2 * hz - arm, 2 * hz, 'joint', 'mitre');
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('kerb', new THREE.Float32BufferAttribute(kerb, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
    mat.colorNode = Fn(() => {
      const p = positionWorld, k = attribute('kerb', 'vec2'), n = abs(normalWorld);
      // grit on every face the same, whichever way it looks (a noise across each of the three planes)
      const grit = noise(p.xy.mul(9)).mul(n.z).add(noise(p.zy.mul(9)).mul(n.x)).add(noise(p.xz.mul(9)).mul(n.y)).div(n.x.add(n.y).add(n.z)).mul(0.12);
      // each piece a shade of its own, dark toward its seams and where it stands in the grass
      const seam = mix(float(0.5), float(1), smoothstep(0.1, 1, k.x)), foot = mix(float(1 - S.curbShade), float(1), smoothstep(0, H * 0.3, p.y));
      return vec3(...S.curb).mul(float(0.92).add(grit)).mul(k.y.mul(S.curbTone).add(1)).mul(seam).mul(foot);
    })();
    this._add(new THREE.Mesh(geo, mat));
  }

  // grass tufts against the curb's outside (v65): one clump of tapering
  // blades bent out from its middle, instanced along the curb, gathered at its
  // corners and beside its near ends — never along the near side
  _tufts(S, hx, hz) {
    const U = S.tuft, W = S.curbWidth, rnd = seeded(2);
    // the clump is made a metre tall and scaled to each tuft's height
    const pos = [], uvs = [], idx = [];
    for (let b = 0; b < U.blades; b++) {
      // where it grows in the clump, which way it bends (out from the middle) and how far
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * U.r, h = 0.55 + rnd() * 0.45, lean = U.bend * (0.4 + rnd() * 0.8);
      const ox = Math.cos(a), oz = Math.sin(a), tw = (rnd() - 0.5) * 0.6, wx = -oz * Math.cos(tw) - ox * Math.sin(tw), wz = ox * Math.cos(tw) - oz * Math.sin(tw);
      for (let r = 0; r <= 3; r++) {
        const t = r / 3, hw = (U.w / 2) * (1 - 0.9 * t), bend = lean * t * t * h;
        for (const sd of [-1, 1]) { pos.push(ox * d + wx * sd * hw + ox * bend, t * h, oz * d + wz * sd * hw + oz * bend); uvs.push((sd + 1) / 2, t); }
      }
      for (let r = 0; r < 3; r++) { const p = b * 8 + r * 2; idx.push(p, p + 1, p + 3, p, p + 3, p + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
    mat.colorNode = mix(vec3(...U.lo), vec3(...U.hi), uv().y);   // dark at the root, light at the tip
    // where: along the outside of the far curb and the two long ones, a few
    // left out; three to a far corner; one beside each near end
    const spots = [], off = () => U.out[0] + rnd() * (U.out[1] - U.out[0]);
    const line = (len, put) => { const n = Math.floor(len / U.every); for (let i = 0; i < n; i++) if (rnd() > U.skip) put(-len / 2 + (i + 0.5 + (rnd() - 0.5) * 0.7) * (len / n), 0.8 + rnd() * 0.4); };
    line(2 * (hx + W), (x, k) => spots.push([x, -(hz + W + off()), k]));
    for (const sx of [-1, 1]) {
      line(2 * hz + W, (z, k) => spots.push([sx * (hx + W + off()), z - W / 2, k]));
      for (const [dx, dz, k] of [[0.15, 0.15, 1.35], [0.65, 0.05, 1.1], [0.05, 0.7, 1.15]]) spots.push([sx * (hx + W + dx), -(hz + W + dz), k]);
      spots.push([sx * (hx + W * 0.4), hz + 0.25, 1.1]);
    }
    const inst = this._add(new THREE.InstancedMesh(geo, mat, spots.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3(), c = new THREE.Color();
    spots.forEach(([x, z, k], i) => {
      e.set(0, rnd() * Math.PI * 2, 0); q.setFromEuler(e);
      const size = (U.h[0] + rnd() * (U.h[1] - U.h[0])) * k;
      s.set(size, size, size); t.set(x, 0, z);
      inst.setMatrixAt(i, m.compose(t, q, s));
      const v = 0.85 + rnd() * 0.3;
      inst.setColorAt(i, c.setRGB(v * (1 + (rnd() - 0.5) * 0.2), v, v * 0.9));
    });
  }

  // ── world 3: the tunnel (v70, the World 3 brief): its walls in pieces under
  // a capstone, a pier at each corner, the gates framed across its ends, pipe
  // mouths with a trickle out of each, and shafts of sunlight ──
  _sewer(hx, hz) {
    const S = this.T.scenery.sewer, sp = sewerSpots(this.T, hx, hz), { alongX, L, Wd } = sp;
    // a point of the tunnel, `a` along it, `c` across, `y` up, in the world
    const at = (a, c, y) => (alongX ? [a, y, c] : [c, y, a]);
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
    const stone = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
    stone.colorNode = Fn(() => vec3(...S.cap.color).mul(noise(positionWorld.xz.mul(7)).mul(0.25).add(0.85)))();
    const iron = new THREE.MeshStandardNodeMaterial({ color: S.bar, roughness: 0.5, metalness: 0.6 });
    const box = () => new THREE.BoxGeometry(1, 1, 1), m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), t = new THREE.Vector3();
    // a box `la` long down the tunnel, `h` tall and `lc` across it, its middle at (a, c, y)
    const place = (inst, i, a, c, y, la, h, lc) => { t.set(...at(a, c, y)); sc.set(alongX ? la : lc, h, alongX ? lc : la); inst.setMatrixAt(i, m.compose(t, q.identity(), sc)); };
    const T2 = S.wallThick, Hc = S.cap.h, Hb = S.wallHeight - Hc, P = S.pier;
    // the walls: pieces `segment` m long with a seam between, a capstone over each
    const n = Math.max(1, Math.round((2 * L) / S.segment)), l = (2 * L) / n;
    const walls = this._add(new THREE.InstancedMesh(box(), brick, 2 * n));
    const caps = this._add(new THREE.InstancedMesh(box(), stone, 2 * n + 4));
    let i = 0;
    for (const s of [-1, 1]) for (let k = 0; k < n; k++, i++) {
      const a = -L + (k + 0.5) * l, c = s * (Wd + T2 / 2);
      place(walls, i, a, c, Hb / 2, l - S.seam, Hb, T2);
      place(caps, i, a, c, Hb + Hc / 2, l - S.seam, Hc, T2 + 2 * S.cap.over);
    }
    // a pier where each wall meets a gate, capped
    const piers = this._add(new THREE.InstancedMesh(box(), brick.clone(), 4));
    i = 0;
    for (const sa of [-1, 1]) for (const s of [-1, 1]) {
      const a = sa * (L + P.w / 2 - 0.05), c = s * (Wd + P.w / 2);   // flush with the wall's face
      place(piers, i, a, c, (P.h - P.cap) / 2, P.w, P.h - P.cap, P.w);
      place(caps, 2 * n + i, a, c, P.h - P.cap / 2, P.w + 0.1, P.cap, P.w + 0.1);
      i++;
    }
    // the gates: iron bars between posts, a rail along the top and the foot, the dark through them
    const G = S.gate, np = Math.max(1, Math.round((2 * Wd) / G.every)), nb = Math.ceil((2 * Wd) / S.barGap);
    const posts = this._add(new THREE.InstancedMesh(box(), iron, 2 * (np + 1)));
    const rails = this._add(new THREE.InstancedMesh(box(), iron.clone(), 4));
    const bars = this._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(S.barR, S.barR, S.barHeight, 8), iron.clone(), 2 * (nb + 1)));
    let ip = 0, ir = 0, ib = 0;
    for (const sa of [-1, 1]) {
      const a = sa * (L + S.barR);
      for (let k = 0; k <= np; k++) place(posts, ip++, a, -Wd + (k * 2 * Wd) / np, (S.barHeight + 0.1) / 2, G.post, S.barHeight + 0.1, G.post);
      place(rails, ir++, a, 0, S.barHeight, G.rail, G.rail, 2 * Wd);
      place(rails, ir++, a, 0, 0.16, G.rail, G.rail, 2 * Wd);
      for (let k = 0; k <= nb; k++) { t.set(...at(a, -Wd + (k * 2 * Wd) / nb, S.barHeight / 2)); bars.setMatrixAt(ib++, m.makeTranslation(t.x, t.y, t.z)); }
    }
    // the pipe mouths: a short pipe out of the wall's face, a lip round it, dark
    // inside, and a trickle of green water from its lip down to the floor
    const R = S.pipe, N = sp.pipes.length, len = R.out + T2 / 2;
    const pipeMat = new THREE.MeshStandardNodeMaterial({ color: R.color, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide });
    const pipes = this._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(R.r, R.r, len, 20, 1, true), pipeMat, N));
    const lips = this._add(new THREE.InstancedMesh(new THREE.TorusGeometry(R.r, R.wall, 8, 24), pipeMat.clone(), N));
    const holes = this._add(new THREE.InstancedMesh(new THREE.CircleGeometry(R.r * 0.98, 20), new THREE.MeshBasicNodeMaterial({ color: 0x020505 }), N));
    const trickle = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    trickle.colorNode = vec3(...R.trickle);
    trickle.opacityNode = Fn(() => { const v = uv(); return noise(vec2(v.x.mul(5), v.y.mul(3).add(GEL_TIME.mul(2.4)))).mul(0.5).add(0.25).mul(smoothstep(0, 0.2, v.x).mul(smoothstep(1, 0.8, v.x))); })();
    const falls = this._add(new THREE.InstancedMesh(new THREE.PlaneGeometry(R.trickleW, R.y - R.r), trickle, N));
    const up = new THREE.Vector3(0, 1, 0), across = alongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0), face = new THREE.Vector3();
    sp.pipes.forEach(({ a, side }, k) => {
      face.copy(across).multiplyScalar(-side);   // the way its mouth looks: into the tunnel
      t.set(...at(a, side * (Wd - R.out + len / 2), R.y)); q.setFromUnitVectors(up, face); pipes.setMatrixAt(k, m.compose(t, q, sc.set(1, 1, 1)));
      const into = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
      t.set(...at(a, side * (Wd - R.out), R.y)); lips.setMatrixAt(k, m.compose(t, into, sc));
      t.set(...at(a, side * (Wd - R.out * 0.35), R.y)); holes.setMatrixAt(k, m.compose(t, into, sc));
      t.set(...at(a, side * (Wd - R.out - 0.03), (R.y - R.r) / 2)); falls.setMatrixAt(k, m.compose(t, into, sc));
    });
    // the sunlight: a shaft over each pool of it the floor draws, leaning toward the sun
    const U = S.sun;
    const shaftMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    shaftMat.colorNode = vec3(...U.color);
    shaftMat.opacityNode = Fn(() => { const y = uv().y; return float(U.shaftAlpha).mul(smoothstep(0, 0.1, y)).mul(float(1).sub(smoothstep(0.3, 1, y))); })();
    const shafts = this._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(U.shaftR * 1.3, U.shaftR, U.shaft, 24, 1, true), shaftMat, sp.pools.length));
    q.setFromEuler(new THREE.Euler(U.tilt, 0, -U.tilt));
    const lift = new THREE.Vector3(0, U.shaft / 2, 0).applyQuaternion(q);
    sp.pools.forEach(({ a, c }, k) => { t.set(...at(a, c, 0)).add(lift); shafts.setMatrixAt(k, m.compose(t, q, sc.set(1, 1, 1))); });
    // v77: dust drifting down in each shaft
    motes(this, sp.pools.map(({ a, c }) => { const [x, , z] = at(a, c, 0); return [x, z, S.motes.box, S.motes.box, 0.2]; }), S.motes);
  }

  // ── every other world: a ground past the floor, its edge, props round it ──
  _surround(id, hx, hz) {
    if (id === 'cistern') { this._cistern(hx, hz); return; }   // v71: built to its brief, as worlds 2 and 3
    if (SETS[id]) { SETS[id](this, hx, hz); return; }           // v72: worlds 5-9, the same
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
    ground.position.y = -0.03; ground.renderOrder = 1;   // after the floor, as the lawn (v68)

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
    const rnd = seeded([...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7));
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

  // ── world 4: the cistern (v71, the World 4 brief): stone columns in two
  // rows standing in still dark water round the platform, rings round their
  // feet, warm lamps at the inner row's feet and their light on the water, a
  // stone kerb round the platform and its glowing edge. Never along the near side ──
  _cistern(hx, hz) {
    const C = this.T.scenery.cistern, W = C.water;
    // the water: dark, rippling slowly, going into the dark with distance
    const waterMat = new THREE.MeshBasicNodeMaterial();
    waterMat.colorNode = Fn(() => {
      const p = positionWorld.xz, t = GEL_TIME;
      const n1 = noise(p.mul(W.scale).add(vec2(t.mul(0.05), t.mul(0.03)))), n2 = noise(p.mul(W.scale * 3.3).sub(vec2(t.mul(0.08), 0)));
      const sheen = smoothstep(0.6, 0.92, sin(n1.mul(8).add(n2.mul(3))).mul(0.5).add(0.5));
      const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0);
      const far = clamp(length(vec2(dx, dz)).div(W.fade), 0, 1);
      return mix(vec3(...W.lo), vec3(...W.hi), n1.mul(0.6).add(sheen.mul(0.4))).mul(float(1).sub(far.mul(far).mul(0.92)));
    })();
    const water = this._add(new THREE.Mesh(new THREE.PlaneGeometry(2 * (hx + W.out), 2 * (hz + W.out)).rotateX(-Math.PI / 2), waterMat));
    water.position.y = -0.03; water.renderOrder = 1;   // after the floor, as every ground (v68)
    // the platform's glowing edge, and a stone kerb round it
    const E = C.edge, K = C.kerb, edgeMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(E.color).multiplyScalar(E.glow) });
    const kerbMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
    kerbMat.colorNode = Fn(() => vec3(...K.color).mul(noise(positionWorld.xz.mul(6)).mul(0.3).add(0.8)))();
    const ew = E.width, kw = K.w, ko = ew + kw / 2;
    for (const [sx, sz, x, z] of [[2 * hx + 2 * ew, ew, 0, -(hz + ew / 2)], [2 * hx + 2 * ew, ew, 0, hz + ew / 2], [ew, 2 * hz, -(hx + ew / 2), 0], [ew, 2 * hz, hx + ew / 2, 0]]) {
      this._add(new THREE.Mesh(new THREE.BoxGeometry(sx, E.height, sz), edgeMat.clone())).position.set(x, E.height / 2, z);
    }
    for (const [sx, sz, x, z] of [[2 * (hx + ew + kw), kw, 0, -(hz + ko)], [2 * (hx + ew + kw), kw, 0, hz + ko], [kw, 2 * (hz + ew), -(hx + ko), 0], [kw, 2 * (hz + ew), hx + ko, 0]]) {
      this._add(new THREE.Mesh(new THREE.BoxGeometry(sx, K.h, sz), kerbMat.clone())).position.set(x, K.h / 2 - 0.02, z);
    }
    // where the columns stand: along the far side and both long sides, each
    // row `out` m from the edge; [x, z, row, the way to the platform]
    const spots = [];
    C.rows.forEach((out, row) => {
      const fl = 2 * (hx + out), fn = Math.max(1, Math.round(fl / C.every));
      for (let i = 0; i <= fn; i++) spots.push([-(hx + out) + (i * fl) / fn, -(hz + out), row, [0, 1]]);
      const sl = 2 * hz + out, sn = Math.max(1, Math.round(sl / C.every));
      for (const sd of [-1, 1]) for (let i = 1; i <= sn; i++) spots.push([sd * (hx + out), -(hz + out) + (i * sl) / sn, row, [-sd, 0]]);
    });
    // a column: its base block, a lathed shaft (a moulding at its foot, a slight
    // taper, a flared capital) and the square slab over it, all stone that is
    // dark and wet at the waterline
    const [bw, bh] = C.base, H1 = C.h - bh - C.abacus, r = C.r;
    const prof = [[0.001, 0], [r * 1.16, 0], [r * 1.16, 0.1], [r * 1.05, 0.2], [r, 0.3], [r * 0.9, H1 * 0.86], [r * 0.95, H1 * 0.88], [r * 1.15, H1 * 0.94], [r * 1.42, H1], [0.001, H1]].map(([x, y]) => new THREE.Vector2(x, y));
    const stone = new THREE.MeshStandardNodeMaterial({ roughness: 0.92, metalness: 0 });
    stone.colorNode = Fn(() => {
      const p = positionWorld, grit = noise(vec2(p.x.add(p.z), p.y).mul(6)).mul(0.18).add(0.85);
      const wet = float(1).sub(smoothstep(0.25, 1.1, p.y));
      return vec3(...C.stone).mul(grit).mul(float(1).sub(wet.mul(0.5))).add(vec3(0, 0.02, 0.025).mul(wet));
    })();
    const N = spots.length, m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), t = new THREE.Vector3(), c = new THREE.Color();
    const shafts = this._add(new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 20), stone, N));
    const blocks = this._add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stone.clone(), 2 * N));
    // the columns a lamp stands at: warmed by it (v71: no lamp is a real light; the tint says it)
    const lit = new Set(spots.map((sp, i) => (sp[2] === 0 && i % C.lampEvery === 0 ? i : -1)));
    spots.forEach(([x, z, row], i) => {
      c.setRGB(...C.tint[row]);
      if (lit.has(i)) c.multiply(new THREE.Color(...C.lamp.warm));
      shafts.setMatrixAt(i, m.compose(t.set(x, bh, z), q.identity(), sc.set(1, 1, 1))); shafts.setColorAt(i, c);
      blocks.setMatrixAt(2 * i, m.compose(t.set(x, bh / 2 - 0.1, z), q, sc.set(bw, bh + 0.2, bw))); blocks.setColorAt(2 * i, c);
      blocks.setMatrixAt(2 * i + 1, m.compose(t.set(x, C.h - C.abacus / 2, z), q, sc.set(r * 3.1, C.abacus, r * 3.1))); blocks.setColorAt(2 * i + 1, c);
    });
    // rings spreading round every column's foot, each on its own beat
    const R = C.ripple, ringMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    ringMat.colorNode = vec3(...R.color);
    ringMat.opacityNode = Fn(() => {
      const d = length(uv().sub(0.5)).mul(2), ph = hash(tfloor(positionWorld.xz.mul(0.37)));
      const k = fract(GEL_TIME.div(R.period).add(ph)), rad = mix(float(bw / 2 / R.r * 1.3), float(1), k);
      return float(1).sub(smoothstep(0, 0.05, abs(d.sub(rad)))).mul(float(1).sub(k)).mul(R.gain);
    })();
    const rings = this._add(new THREE.InstancedMesh(new THREE.PlaneGeometry(2 * R.r, 2 * R.r).rotateX(-Math.PI / 2), ringMat, N));
    spots.forEach(([x, z], i) => rings.setMatrixAt(i, m.makeTranslation(x, -0.015, z)));
    // the lamps: at every `lampEvery`th column of the inner row, on its platform
    // side, a warm bulb on a thin iron post, and its pool of light on the water
    const Lp = C.lamp, lamps = spots.filter(([, , row], i) => row === 0 && i % C.lampEvery === 0).map(([x, z, , d]) => [x + d[0] * (bw / 2 + 0.25), z + d[1] * (bw / 2 + 0.25)]);
    const bulbMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(...Lp.color).multiplyScalar(Lp.glow) });
    const bulbs = this._add(new THREE.InstancedMesh(new THREE.SphereGeometry(Lp.r, 12, 8), bulbMat, lamps.length));
    const posts = this._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(Lp.post, Lp.post, Lp.y, 6), new THREE.MeshStandardNodeMaterial({ color: 0x2a2d32, roughness: 0.5, metalness: 0.6 }), lamps.length));
    const poolMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    poolMat.colorNode = vec3(...Lp.color);
    poolMat.opacityNode = Fn(() => { const d = length(uv().sub(0.5)).mul(2); return float(1).sub(smoothstep(0, 1, d)).pow(2).mul(Lp.poolGain).mul(sin(GEL_TIME.mul(7.3).add(positionWorld.x)).mul(0.05).add(0.95)); })();
    const pools = this._add(new THREE.InstancedMesh(new THREE.PlaneGeometry(2 * Lp.pool, 2 * Lp.pool).rotateX(-Math.PI / 2), poolMat, lamps.length));
    // and a soft halo round each bulb
    const haloMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(...Lp.color) });
    haloMat.opacityNode = normalView.z.max(0).pow(3).mul(Lp.haloGain);   // bright in the middle, gone at the rim
    const halos = this._add(new THREE.InstancedMesh(new THREE.SphereGeometry(Lp.r * Lp.halo, 12, 8), haloMat, lamps.length));
    // v77: motes hanging in each lamp's light
    motes(this, lamps.map(([x, z]) => [x, z, C.motes.box, C.motes.box, 0.1]), C.motes);
    lamps.forEach(([x, z], i) => {
      halos.setMatrixAt(i, m.makeTranslation(x, Lp.y + Lp.r * 0.6, z));
      bulbs.setMatrixAt(i, m.makeTranslation(x, Lp.y + Lp.r * 0.6, z));
      posts.setMatrixAt(i, m.makeTranslation(x, Lp.y / 2, z));
      pools.setMatrixAt(i, m.makeTranslation(x, -0.01, z));
    });
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

  // ── the drain that opens where world 2's boss went down: the storm drain's
  // grate (v65, the owner's sheet; it was a square of six bars), a round iron
  // frame round rows of slots, set a little proud of the slab ──
  _drain() {
    const D = this.T.scenery.drain, g = new THREE.Group();
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.7 });
    const c = (hex) => vec3(...new THREE.Color(hex).toArray());
    mat.colorNode = Fn(() => {
      const k = grate(vec2(positionLocal.x, positionLocal.z).div(D.r));
      return mix(mix(c(D.iron), c(D.frame), k.z), c(D.slot), k.y);
    })();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(D.r, D.r * 1.04, 0.05, 48), mat);
    g.add(disc);
    return g;
  }

  // v74: the drain drawn once, tiny and far under the floor, on the title
  // (actors.warmStep), so its shader is not compiled on the frame it first
  // rises out of world 2's slab
  warmDrain(on) {
    this.drain.visible = on;
    this.drain.position.set(0, on ? -50 : 0, 0); this.drain.scale.setScalar(on ? 1e-4 : 1);
    this.drain.traverse((c) => { c.frustumCulled = !on; });
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
