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
//            and props standing along the far side and the two sides.
//            Never along the near side: nothing stands between you and the
//            fight. One builder, every number in TUNING.scenery.surround[id]
//   world 1 (v123, owner, 2026-11-08: "super minimalistic, only some moving
//            neon lines in the void around the arena"): no ground and no
//            props — the arena alone in the void, and loops of neon round it,
//            each deeper and further out, lines running round them (_neon);
//            NEON's floors and SURVIVAL wear it too. Flat on the void, never
//            standing up, so the near side's loops hide nothing
//
// The floor itself is floor.js (its `style`); this is the rest. The camera
// follows the hero on worlds 2 and 3 and shows T.camera.follow.edge m past
// the floor, which is what the lawn and the walls are sized for. The lawn and
// the slab are pictures (unlit, as the floor is); the curb, the walls and the
// bars stand up, so they are lit by the scene's lights. Every number is
// TUNING.scenery.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, fract, sin, cos, dot, texture, floor as tfloor, mix, smoothstep, abs, positionWorld, positionLocal, normalWorld, normalView, clamp, max, min, length, step, fwidth, uv, attribute } from 'three/tsl';
import { GEL_TIME } from './gel.js?v=152';
import { hash, noise, seeded, motes, phase, groundGeo, sunk } from './kit.js?v=152';
import { SUN_AT } from './sun.js?v=152';
import { treeAtlas } from './trees.js?v=152';
import { LeafLitter } from './leaves.js?v=152';
import { boiler } from './sets/boiler.js?v=152';
import { river } from './sets/river.js?v=152';
import { ice } from './sets/ice.js?v=152';
import { deep } from './sets/deep.js?v=152';
import { core } from './sets/core.js?v=152';

// worlds 5-9 (v72): a set of their own each, built to its brief (render/sets/)
const SETS = { boiler, river, ice, deep, core };

// the noise, the cracks and the seeded numbers are the kit's (v72: render/kit.js),
// and the floor still takes them from here
export { noise, cells } from './kit.js?v=152';

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
// v129 (the owner on v128: "The tree shadows look weird"): the TREES' shade past a slab of `hx` × `hz` (floor.js
// daylight, and the lawn round it), 0 in the open sun and up to `k` under a crown. Each tree is a silhouette drawn
// once (trees.js: trunk, forking limbs, leaves in clumps), standing `out` m past the edge at `at` [fx, fz] (fractions
// of the half sizes), `h` m tall and its silhouette `w` m across (tile `tile` of the atlas, `flip`ped or not). A point
// on the ground is in its shadow where the sun's ray from it, climbing at the sun's elevation, meets the silhouette:
// its height on the tree is how far the point lies from the foot along the shadow × tan θ (cot θ held to `cotMax`).
// The higher the leaf, the softer its shadow (`penumbra` mip levels at the top), and the crown sways (`sway`)
export function treeShade(wp, C, hx, hz, cotMax) {
  const tex = treeAtlas(C);
  const sunH = max(length(SUN_AT.xz), 1e-3), cot = min(sunH.div(max(SUN_AT.y, 1e-3)), cotMax);
  const away = vec2(SUN_AT.x.negate(), SUN_AT.z.negate()).div(sunH), side = vec2(away.y.negate(), away.x);
  let shade = float(0);
  C.at.forEach(([fx, fz, out, h, w, tile, flip], i) => {
    const bx = fx * hx + (Math.abs(fx) >= 1 ? Math.sign(fx) * out : 0), bz = fz * hz + (Math.abs(fz) >= 1 ? Math.sign(fz) * out : 0);
    const q = wp.sub(vec2(bx, bz)), v = dot(q, away).div(cot.mul(h));
    let u = dot(q, side).div(w).add(0.5).add(sin(GEL_TIME.mul(0.9).add(i * 1.7)).mul(C.sway).mul(v));
    if (flip) u = float(1).sub(u);
    const inside = step(0, v).mul(step(v, 1)).mul(step(0, u)).mul(step(u, 1));
    const t = texture(tex, vec2(clamp(u, 0.002, 0.998).add(tile).div(C.n), clamp(v, 0, 1)), clamp(v, 0, 1).mul(C.penumbra)).r;
    shade = max(shade, t.mul(inside));
  });
  return shade.mul(C.k);
}

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
    this.waterSources = [];   // v144: what a set pours into its world's simulated water (render/water.js)
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
    this.neon = null;
    this.leaves = null;
  }
  // v138: what in the set answers the fight (the driveway's leaves): the world is read, never written
  sync(w, dt) { this.leaves?.sync(w, dt); }
  onEvent(e) { this.leaves?.onEvent(e); }

  // v123: world 1's lines of neon (TUNING.scenery.surround.grid.neon). Every loop is a thin flat band round the
  // arena, and all of them are ONE mesh with ONE shader (v116: one compiled graph): each vertex carries where it is
  // along its loop (aS, m) and across it (aX, -1 … 1), and its loop's numbers. The lines are drawn by the shader off
  // the game's clock (GEL_TIME), so nothing moves on the CPU: at `s` m along the loop, d = how far behind the
  // nearest head it lies, and the line is bright at the head and fades over its tail. Added light on the void, so a
  // line passing a line is brighter; the floor is opaque and stands over the deeper loops where they pass behind it
  _neon(N, hx, hz) {
    const pos = [], aS = [], aX = [], aSeg = [], aV = [], aL = [], aPh = [], aCol = [], idx = [], rnd = seeded(123), loops = [];
    for (const L of N.loops) {
      const a = hx + L.out, b = hz + L.out, P = 4 * a + 4 * b, w = L.w / 2, ph = rnd() * P;
      const corners = [[-a, -b, 0], [a, -b, 2 * a], [a, b, 2 * a + 2 * b], [-a, b, 4 * a + 2 * b], [-a, -b, P]];
      const col = new THREE.Color(L.color).multiplyScalar(L.i), base = pos.length / 3;
      for (const [x, z, sAt] of corners) {
        const sx = Math.sign(x), sz = Math.sign(z);
        for (const k of [-1, 1]) {   // inner, outer
          pos.push(x + k * sx * w, L.y, z + k * sz * w); aS.push(sAt); aX.push(k);
          aSeg.push(P / L.n); aV.push(L.speed); aL.push(L.tail); aPh.push(ph); aCol.push(col.r, col.g, col.b);
        }
      }
      for (let i = 0; i < 4; i++) { const v = base + i * 2; idx.push(v, v + 1, v + 3, v, v + 3, v + 2); }
      loops.push({ ...L, a, b, P, ph });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    for (const [name, arr, n] of [['aS', aS, 1], ['aX', aX, 1], ['aSeg', aSeg, 1], ['aV', aV, 1], ['aL', aL, 1], ['aPh', aPh, 1], ['aCol', aCol, 3]]) g.setAttribute(name, new THREE.Float32BufferAttribute(arr, n));
    g.setIndex(idx);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    mat.colorNode = Fn(() => {
      const s = attribute('aS', 'float'), x = attribute('aX', 'float'), seg = attribute('aSeg', 'float'), v = attribute('aV', 'float');
      const tail = attribute('aL', 'float'), ph = attribute('aPh', 'float'), col = attribute('aCol', 'vec3');
      const dir = step(0, v).mul(2).sub(1);                                        // +1 round one way, -1 the other
      const d = fract(ph.add(v.mul(GEL_TIME)).sub(s).mul(dir).div(seg)).mul(seg);  // m behind the nearest head
      const t = clamp(float(1).sub(d.div(tail)), 0, 1);
      const tip = float(1).sub(smoothstep(0, 0.4, d));                            // the head, white-hot for 40 cm
      const core = float(1).sub(smoothstep(0.45, 1, abs(x)));                     // full across the middle, soft at the edges
      return col.mul(t.mul(t).add(N.track)).add(vec3(1, 1, 1).mul(tip.mul(N.tip))).mul(core);
    })();
    const m = this._add(new THREE.Mesh(g, mat));
    m.renderOrder = 2; m.frustumCulled = false;
    this.neon = { loops, hx, hz };
  }

  // v123: where the neon's lit lines are now (the same sum the shader does, at the game's `time`): light of its
  // colour thrown onto the floor's edge by each line — `light.along` pools down its streak from the head, each
  // `light.step` m behind the last and weaker, so the light runs along the edge with the line and turns its
  // corners with it (render/light.js `extra`); none where the world has no neon
  lightsAt(time) {
    const out = (this._lit ||= []);   // the same objects every frame (v116: nothing made per frame)
    let n = 0;
    for (const L of this.neon?.loops ?? []) {
      if (!L.light) continue;
      const G = L.light, seg = L.P / L.n, dir = Math.sign(L.speed) || 1;
      for (let j = 0; j < L.n; j++) {
        const head = L.ph + L.speed * time + j * seg;
        for (let m = 0; m < G.along.length; m++) {
          const s = (((head - dir * m * G.step) % L.P) + L.P) % L.P, o = (out[n++] ||= {});
          if (s < 2 * L.a) { o.x = -L.a + s; o.z = -L.b; }
          else if (s < 2 * L.a + 2 * L.b) { o.x = L.a; o.z = -L.b + (s - 2 * L.a); }
          else if (s < 4 * L.a + 2 * L.b) { o.x = L.a - (s - 2 * L.a - 2 * L.b); o.z = L.b; }
          else { o.x = -L.a; o.z = L.b - (s - 4 * L.a - 2 * L.b); }
          o.r = G.r; o.hex = L.color; o.k = G.k * G.along[m];
        }
      }
    }
    out.length = n;
    return out;
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
      let col = mix(lo, hi, blade.mul(0.55).add(tuft.mul(0.25)).add(stripe.mul(0.2)));
      // v138: rough and lived in — darker clumps, and a paler dry patch here and there
      if (S.rough) col = col.mul(float(1).sub(smoothstep(0.45, 0.75, noise(p.mul(S.clump).add(3.7))).mul(S.rough))).mul(float(1).add(smoothstep(0.62, 0.85, tuft).mul(0.25)));
      // the curb's shadow on the grass along its outside, as far as its near ends — v93: thrown away from the
      // world's sun (sun.js), so only the sides that face away from it are shaded, cot θ × the curb's height out
      const sunH = max(length(SUN_AT.xz), 1e-3), cot = min(sunH.div(max(SUN_AT.y, 1e-3)), 2.2);
      const awayX = SUN_AT.x.negate().div(sunH), awayZ = SUN_AT.z.negate().div(sunH), ch = cot.mul(S.curbHeight);
      const bandOf = (past, len) => float(1).sub(smoothstep(len.sub(0.3), len.add(0.3), past)).mul(step(0, past)).mul(step(0.05, len));
      const shade = max(max(bandOf(p.x.sub(hx + W), ch.mul(max(awayX, 0))), bandOf(p.x.negate().sub(hx + W), ch.mul(max(awayX.negate(), 0)))), bandOf(p.y.negate().sub(hz + W), ch.mul(max(awayZ.negate(), 0))))
        .mul(float(1).sub(smoothstep(hz - S.curbNose, hz + 0.1, p.y)));
      // it goes into the summer haze the further it is from the slab (v66; it fell into the night)
      const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0);
      const far = clamp(length(vec2(dx, dz)).div(S.fade), 0, 1);
      // v128: under the driveway's DAYLIGHT (TUNING.worlds.lit.concrete) the grass is lit as the slab is — the sun
      // warm where it reaches, the sky's cool where the curb or the trees take it — kept at the brightness it had
      const DL = this.T.worlds.lit?.concrete?.daylight;
      if (DL) {
        const vis = float(1).sub(shade).mul(float(1).sub(treeShade(p, DL.trees, hx, hz, this.T.worlds.floor.concrete.sunShadow.cotMax)));
        const E = vec3(...DL.sky).add(vec3(...DL.sun).mul(vis)).div((DL.sky[1] + DL.sun[1]) * (DL.lawn ?? 1));
        return mix(col.mul(E), vec3(...S.haze), far.mul(S.fadeTo));
      }
      return mix(col.mul(float(1).sub(shade.mul(S.curbShadow))), vec3(...S.haze), far.mul(S.fadeTo));
    })();
    const lawn = this._add(new THREE.Mesh(groundGeo(2 * (hx + out), 2 * (hz + out)), sunk(lawnMat)));   // (v144: in small pieces, kit.js)
    // drawn after the floor (v68; it was drawn first), so the depth test throws
    // away the grass under the slab before it is shaded
    lawn.position.y = -0.02; lawn.renderOrder = 1;
    this._curb(S, hx, hz);
    this._tufts(S, hx, hz);
    if (S.daisies) this._daisies(S, hx, hz);
    // v138: its fallen leaves (render/leaves.js)
    if (S.leaves) { this.leaves = new LeafLitter(); this.leaves.build(hx, hz, (m) => this._add(m)); }
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
          : S.stone ? [{ s: at + dir * (gap / 2), k: 1 - S.stone.round, w: 1 - S.stone.round * 0.5, e: 0 }, { s: at + dir * (gap / 2 + S.stone.end * 0.4), k: 1 - S.stone.round * 0.25, w: 1 - S.stone.round * 0.1, e: 0.55 }, { s: at + dir * (gap / 2 + S.stone.end), k: 1, e: 1 }]
            : [{ s: at + dir * (gap / 2), k: 1, e: 0 }, { s: at + dir * (gap / 2 + E), k: 1, e: 1 }];
      const rings = [...end(s0, 1, a), ...end(s1, -1, b).reverse()], tone = rnd() * 2 - 1;
      // v138 (the owner's concept: worn STONES, each its own): a piece stands a little taller or shorter than the
      // next (`tall`), a little out of line (`out`), and a ring may be narrower than the stone (`w`: its rounded ends)
      const St = S.stone, tall = St ? 1 + (rnd() * 2 - 1) * St.tall : 1, du = St ? (rnd() * 2 - 1) * St.out : 0, lean = St ? (rnd() * 2 - 1) * St.lean : 0;
      const put = (g) => { for (const [u0, v] of prof) { const s = typeof g.s === 'function' ? g.s(u0) : g.s, gw = g.w ?? 1, u = W / 2 + (u0 - W / 2) * gw + du, t01 = (s - s0) / Math.max(1e-6, s1 - s0); pos.push(run.o[0] + run.n[0] * u + run.a[0] * s, v * g.k * tall * (1 + lean * (t01 - 0.5)), run.o[1] + run.n[1] * u + run.a[1] * s); kerb.push(g.e, tone); } };
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
      // v138: no two stones the same length
      const cut = Array.from({ length: n + 1 }, (_, i) => s0 + (i + (i && i < n && S.stone ? (rnd() * 2 - 1) * S.stone.vary : 0)) * l);
      for (let i = 0; i < n; i++) piece(run, cut[i], cut[i + 1], i ? 'joint' : a, i < n - 1 ? 'joint' : b);
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
      const base = vec3(...S.curb).mul(float(0.92).add(grit)).mul(k.y.mul(S.curbTone).add(1)).mul(seam).mul(foot);
      if (!S.stone) return base;
      // v138: weathered — broad stains down its faces, lichen pale on its top, moss dark in its seams and where it
      // stands in the ground
      const St = S.stone, stain = noise(vec2(p.x.add(p.z).mul(0.7), p.y.mul(2.2))).mul(St.stain);
      const top = smoothstep(0.75, 0.95, normalWorld.y), lichen = smoothstep(0.62, 0.8, noise(p.xz.mul(1.9).add(4.4))).mul(top).mul(St.lichen);
      const mossy = max(float(1).sub(smoothstep(0.05, 0.7, k.x)).mul(0.8), float(1).sub(smoothstep(0.0, H * St.mossTo, p.y)).mul(smoothstep(0.35, 0.6, noise(p.xz.mul(1.3).add(p.y)))));
      return mix(mix(base.mul(float(1).sub(stain)), vec3(...St.lichenCol), lichen), vec3(...St.moss), mossy.mul(St.mossK));
    })();
    this._add(new THREE.Mesh(geo, mat));
  }

  // v138: daisies in the lawn (the owner's concept): a ring of white petals round a yellow eye on a short stalk,
  // in clumps past the curb on the far side and the long ones — one instanced draw
  _daisies(S, hx, hz) {
    const D = S.daisies, W = S.curbWidth, rnd = seeded(D.seed), pos = [], col = [], idx = [];
    const tri = (a, b, c, k) => { const at = pos.length / 3; pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(...k); idx.push(at, at + 1, at + 2); };
    // a metre-wide flower a metre up: petals drooping a little from the eye, the eye a low cone, the stalk a sliver
    for (let k = 0; k < D.petals; k++) {
      const a0 = (k / D.petals) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / D.petals) * 0.8, am = (a0 + a1) / 2;
      tri([Math.cos(a0) * 0.16, 1, Math.sin(a0) * 0.16], [Math.cos(am) * 0.5, 0.93, Math.sin(am) * 0.5], [Math.cos(a1) * 0.16, 1, Math.sin(a1) * 0.16], D.white);
    }
    for (let k = 0; k < 6; k++) { const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2; tri([0, 1.06, 0], [Math.cos(a1) * 0.17, 1.005, Math.sin(a1) * 0.17], [Math.cos(a0) * 0.17, 1.005, Math.sin(a0) * 0.17], D.eye); }
    tri([-0.03, 0, 0], [0.03, 0, 0], [0, 1, 0], [0.12, 0.3, 0.06]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
    const spots = [];
    for (let c = 0; c < D.n; c++) {
      const out = W + 0.5 + rnd() * D.out, side = rnd();
      const cx = side < 0.55 ? (rnd() * 2 - 1) * (hx + W) : (side < 0.775 ? -1 : 1) * (hx + out), cz = side < 0.55 ? -(hz + out) : -hz + rnd() * (2 * hz - 3);
      const n = D.per[0] + Math.floor(rnd() * (D.per[1] - D.per[0] + 1));
      for (let k = 0; k < n; k++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * D.spread; spots.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d]); }
    }
    const inst = this._add(new THREE.InstancedMesh(geo, mat, spots.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), t = new THREE.Vector3();
    spots.forEach(([x, z], i) => {
      const r = D.r[0] + rnd() * (D.r[1] - D.r[0]), h = D.h[0] + rnd() * (D.h[1] - D.h[0]);
      e.set((rnd() - 0.5) * 0.5, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.5); q.setFromEuler(e);
      sc.set(r * 2, h, r * 2); t.set(x, 0, z);
      inst.setMatrixAt(i, m.compose(t, q, sc));
    });
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
    if (SETS[id]) {                                              // v72: worlds 5-9, the same
      SETS[id](this, hx, hz);
      // v141: what lies loose on its floor and answers the fight, as the driveway's leaves do (render/leaves.js)
      const kind = { ice: 'chips', deep: 'crabs' }[id];
      if (kind && this.T.scenery[id][kind]) { this.leaves = new LeafLitter(kind); this.leaves.build(hx, hz, (m) => this._add(m)); }
      return;
    }
    const S = this.T.scenery.surround[id];
    if (S.ground) this._ground(S.ground, hx, hz);
    this._edgeAndProps(S, id, hx, hz);
    if (S.neon) this._neon(S.neon, hx, hz);   // v123: world 1's lines of neon in the void
  }

  // the ground: two tones of noise, a grid or traces if the world has one,
  // falling into the dark the further it lies from the floor
  _ground(G, hx, hz) {
    const out = G.out;
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
    const ground = this._add(new THREE.Mesh(groundGeo(2 * (hx + out), 2 * (hz + out)), sunk(groundMat)));   // (v144: in small pieces, kit.js)
    ground.position.y = -0.03; ground.renderOrder = 1;   // after the floor, as the lawn (v68)
  }

  _edgeAndProps(S, id, hx, hz) {
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
    const water = this._add(new THREE.Mesh(groundGeo(2 * (hx + W.out), 2 * (hz + W.out)), sunk(waterMat)));   // (v144: in small pieces, kit.js)
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
    halos.visible = false;   // v104 (owner: "No cheap effects like glow"): the bulb lights its pool on the water, and has no halo
    // v77: motes hanging in each lamp's light
    motes(this, lamps.map(([x, z]) => [x, z, C.motes.box, C.motes.box, 0.1]), C.motes);
    lamps.forEach(([x, z], i) => {
      halos.setMatrixAt(i, m.makeTranslation(x, Lp.y + Lp.r * 0.6, z));
      bulbs.setMatrixAt(i, m.makeTranslation(x, Lp.y + Lp.r * 0.6, z));
      posts.setMatrixAt(i, m.makeTranslation(x, Lp.y / 2, z));
      pools.setMatrixAt(i, m.makeTranslation(x, -0.01, z));
    });
    // v98: the light through the roof, falling onto the floor's key pool
    const lt = this.T.worlds.lit?.cistern?.lights ?? [];
    if (C.rays) this._rays(C.rays, lt.find((l) => l.shafts) ?? lt[0], hx, hz);
    // v144: THE FALL — where the water comes in. This is the level under the sewer, and what the sewer's channel
    // carries comes down through the same breach in the vault the light does (owner, 2026-11-11: "many of these
    // levels are about dropping down a level to go lower in the sewers"). Not in a room too small to give it room
    this.waterSources = [];
    if (C.fall && hx * hz >= C.fall.minArea) this._fall(C.fall, lt.find((l) => l.shafts) ?? lt[0], hx, hz);
    // v148: what floats on it, carried from the fall to the wells (render/leaves.js 'flotsam')
    if (C.flotsam) { this.leaves = new LeafLitter('flotsam'); this.leaves.build(hx, hz, (m) => this._add(m), this.waterSources); }
  }

  // v144: a stream of water falling `h` m onto the floor at the light's pool: `r` m round where it lands and `top`×
  // that where it comes out of the dark (it has spread and torn by the time it lands). Drawn as falling water is
  // seen: strands running down it, stretched the further they have fallen (it falls FASTER the further it has
  // fallen, so the pattern is laid along √depth), thick and white through its middle and thin at its edges,
  // breaking into separate strands toward the foot; a skirt of thrown water round where it lands, and spray
  // hanging over that. What it does to the water it lands in is the simulation's (`waterSources`, render/water.js)
  _fall(F, key, hx, hz) {
    const x = (key?.frac?.[0] ?? -0.6) * hx + (F.off?.[0] ?? 0), z = (key?.frac?.[1] ?? -0.7) * hz + (F.off?.[1] ?? 0);
    const stream = (rTop, rFoot, h, y0, P) => {
      const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const fell = float(1).sub(uv().y).mul(h).add(P.head), run = fell.sqrt().mul(P.stretch).sub(GEL_TIME.mul(P.speed));
      const a = noise(vec2(uv().x.mul(P.strands), run)), b = noise(vec2(uv().x.mul(P.strands * 2.3).add(3.1), run.mul(1.7).add(5.3)));
      const body = a.mul(0.65).add(b.mul(0.35)), torn = uv().y.oneMinus().mul(P.tear);
      const thick = abs(normalView.z).pow(P.edge);
      mat.colorNode = mix(vec3(...F.dark), vec3(...F.light), smoothstep(0.35, 0.8, body));
      mat.opacityNode = smoothstep(torn.add(P.cut), torn.add(P.cut + 0.25), body).mul(thick).mul(smoothstep(0, P.fadeIn, uv().y.oneMinus())).mul(P.alpha);
      const g = new THREE.CylinderGeometry(rTop, rFoot, h, 28, 1, true); g.translate(0, h / 2, 0);
      const m = this._add(new THREE.Mesh(g, mat)); m.position.set(x, y0, z); m.renderOrder = 6;
      return m;
    };
    stream(F.r * F.top, F.r, F.h, 0, F.stream);
    stream(F.r * 0.55, F.r * 0.8, F.h, 0, { ...F.stream, alpha: F.stream.alpha * 0.9, strands: F.stream.strands * 0.6, speed: F.stream.speed * 1.2 });   // its core
    // the skirt: what the landing throws up and out
    const S = F.skirt, sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const up = uv().y, n1 = noise(vec2(uv().x.mul(S.strands), up.mul(2.2).sub(GEL_TIME.mul(S.speed))));
    sm.colorNode = vec3(...F.light);
    sm.opacityNode = smoothstep(up.mul(0.75).add(0.2), up.mul(0.75).add(0.5), n1).mul(up.oneMinus().pow(0.7)).mul(S.alpha);
    const sg = new THREE.CylinderGeometry(F.r * S.top, F.r * S.foot, S.h, 28, 1, true); sg.translate(0, S.h / 2, 0);
    const skirt = this._add(new THREE.Mesh(sg, sm)); skirt.position.set(x, 0, z); skirt.renderOrder = 6;
    if (F.spray) motes(this, [[x, z, F.r * 5, F.r * 5, 0.1]], F.spray);
    this.waterSources.push({ x, z, ...F.source });
  }

  // v98: shafts of light through an opening in the roof, falling along `dir`
  // onto a pool of the floor's light `key` (its `frac` of the half sizes). The
  // light spreads as it falls, so the shafts FAN: their feet `spread` m across
  // the pool, their tops gathered to `mouth` of that at the opening `len` m up
  // the fall, each an open cone `r` m round at its foot and `top`× that at the
  // roof (the first try had them widening upward and they read as searchlights
  // shining up off the floor). Seen as a volume: brightest where the eye looks
  // through the most of it (|n·v|), fading in from the floor over `foot` of the
  // way and out into the roof over the last `roof`, `lift`× brighter where it
  // is narrow, breathing `breathe` as the sky over the roof moves. Dust turns
  // in boxes stacked up each shaft, so it stays in the light it lies in
  _rays(Ry, key, hx, hz) {
    const px = (key?.frac?.[0] ?? -0.4) * hx, pz = (key?.frac?.[1] ?? -0.45) * hz;
    const d = new THREE.Vector3(...Ry.dir).normalize(), up = new THREE.Vector3(0, 1, 0);
    const across = new THREE.Vector3(-d.z, 0, d.x).normalize();   // the way the feet fan out
    const mouth = new THREE.Vector3(px, 0, pz).addScaledVector(d, -Ry.len);   // the opening in the roof
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    mat.colorNode = vec3(...Ry.color);
    mat.opacityNode = Fn(() => {
      const y = uv().y, ph = phase();
      const ends = smoothstep(0, Ry.foot, y).mul(float(1).sub(smoothstep(float(1 - Ry.roof), 1, y)));
      const sky = sin(GEL_TIME.mul(0.29).add(ph.mul(6.283))).mul(sin(GEL_TIME.mul(0.11).add(ph.mul(3.7)))).mul(0.5).add(0.5);
      return float(Ry.alpha).mul(abs(normalView.z).pow(1.6)).mul(ends).mul(mix(float(1), float(Ry.lift), y)).mul(float(1).sub(sky.mul(Ry.breathe)));
    })();
    const rnd = seeded(98), inst = this._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(Ry.r * Ry.top, Ry.r, 1, 20, 1, true), mat, Ry.n));
    inst.frustumCulled = false;
    const q = new THREE.Quaternion(), m = new THREE.Matrix4(), c = new THREE.Color(), s = new THREE.Vector3();
    const feet = [], dust = [], Dm = Ry.dust;
    for (let i = 0; i < Ry.n; i++) {
      const k = Ry.n > 1 ? i / (Ry.n - 1) - 0.5 : 0, w = 0.75 + rnd() * 0.5;
      const foot = new THREE.Vector3(px, 0, pz).addScaledVector(across, k * Ry.spread + (rnd() - 0.5) * 0.6).addScaledVector(d, (rnd() - 0.5) * 1.4);
      const top = mouth.clone().addScaledVector(across, k * Ry.spread * Ry.mouth);
      const axis = top.clone().sub(foot), L = axis.length(); axis.divideScalar(L);
      feet.push(foot);
      inst.setMatrixAt(i, m.compose(foot.clone().add(top).multiplyScalar(0.5), q.setFromUnitVectors(up, axis), s.set(w, L, w)));
      inst.setColorAt(i, c.setScalar(1 - Ry.vary * rnd()));
      // dust in boxes stacked up the lit part of the shaft, each as tall as its loop and as wide as the light there
      if (Dm) for (let y0 = 0.25; y0 < top.y * (1 - Ry.roof) * 0.75; y0 += Dm.h) {
        const f = y0 / top.y, at = foot.clone().addScaledVector(axis, y0 / axis.y), wd = Ry.r * w * (1 + (Ry.top - 1) * f) * 1.1;
        dust.push([at.x, at.z, wd, wd, at.y]);
      }
    }
    if (Dm && dust.length) motes(this, dust, Dm);
    return feet;
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
