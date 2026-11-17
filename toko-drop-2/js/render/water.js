// water.js — the water a world stands in, as WATER (v144).
//
// Owner, 2026-11-11, of the cistern: "the water vfx are too simple and subtle. Could entertain actual water
// physics." Until now every water in the game was a picture of water: rings drawn at a radius that grows, a net
// of light that wanders by itself. This is the thing itself, in the smallest form that behaves: the surface's
// HEIGHT over the floor, a number a texel, stepped by the wave equation
//
//     v += K × (the mean of the neighbours − h)      (K = 4 c² dt² / dx²: how fast a wave runs, c m/s)
//     h += v
//
// at a fixed `hz` steps a second, `perMetre` texels a metre, the arena exactly. What that buys, with nothing
// drawn by hand: a ring from a splash SPREADS, meets the wall and comes back; two rings pass through each other;
// a body running through leaves a wake that opens behind it; what stands on the floor (a column, an island)
// throws the waves back and leaves a calm behind it; a well in the floor swallows them.
//
// Two textures, swapped every step (as the goo's film, goo.js):
//   wave   r the height (m), g its speed (m a step), b SOLID (1 where something stands: a wave turns back),
//          a SINK (1 over a pit: a wave goes down it)
//   slope  rg the surface's slope along x and z (m/m: what bends the light), b its curvature (1/m: a crest is a
//          lens, so < 0 gathers light on the bed and > 0 thins it), a FOAM (where the water was thrown about,
//          fading)
// The floor (floor.js) reads `slope` once a pixel and does the optics: the bed moved along the slope
// (refraction), light gathered under the crests (caustics), the lamps glinting off the faces turned to them.
//
// What disturbs it is STAMPED in before the steps, added to the height:
//   a body moving     the water it pushed aside: up where it was a frame ago, down where it is now (a dipole
//                     along its way: standing still it makes nothing, the faster the stronger), and a faint bob
//   a splash          a dent with a raised rim round it that holds the dent's water (so the level stays), which
//                     the wave equation turns into rings
// Looks only: nothing in the sim reads it.
//
// v149: the same two textures and the same stamps also keep a TRAIL (`P.trail`, the ice's): not a height but how
// much of the snow has been SWEPT off a place, 0 to 1. A body going by paints the strip it crossed (a capsule from
// where it was to where it is), a burst a disc; the step lets it fill in again (`refill` s to half) and softens
// its edge a little; `slope` is then the way the swept field rises (so the furrow's walls can be lit) and its `a`
// the field itself. No wave runs in a trail
import * as THREE from 'three/webgpu';
import { uv, uniform, float, vec2, vec3, vec4, texture, attribute, positionGeometry, clamp, max, min, mix, mrt, abs, dot, smoothstep, step, length } from 'three/tsl';

const CAP = 512;        // stamps a frame
const MAX_SOLID = 96;   // things standing on the floor

export class Water {
  constructor() {
    // (the textures WRAP, for a water that flows — below; where a wall stands instead, the step clamps its own reads)
    const opt = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping };
    this.rt = [0, 1].map(() => {
      const rt = new THREE.RenderTarget(16, 16, { ...opt, count: 2 });
      rt.textures[0].name = 'wave'; rt.textures[1].name = 'slope';
      return rt;
    });
    this.maskRt = new THREE.RenderTarget(16, 16, { depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.cur = 0; this.on = false; this.P = null; this.acc = 0; this.dirty = true; this.maskDirty = false; this.sig = 0;
    this.hx = 8; this.hz = 8; this.t = 0; this.stepped = 0; this.carry = 0;
    // v146: a water that FLOWS (the river) is simulated in the WATER'S OWN FRAME: the texture is carried along with the
    // stream (`drift` m along the floor's long axis, wrapping round its ends), so what stands still in the stream moves
    // through the water — and leaves a wake — and nothing is smeared by being pushed along a grid. `driftUV` is where
    // the floor finds a point of itself in the texture; `wrapU` which way the texture goes round
    this.flow = null; this.drift = 0; this.alongX = false; this.driftUV = uniform(new THREE.Vector2(0, 0)); this.wrapU = uniform(new THREE.Vector2(0, 0));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    this.cam.position.set(0, 20, 0); this.cam.up.set(0, 0, -1); this.cam.lookAt(0, 0, 0);
    this.bodies = []; this.nb = 0;   // [x, z, r, vx, vz, id] a body, as the last sync left them
    this.posts = [];                 // what stands on the floor (the sim's posts), as the last sync left them
    this.sources = [];               // what never stops: [{ x, z, r, rate, amp, size }] (a fall landing)
    const add = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, transparent: true, depthTest: false, depthWrite: false };
    const quad = new THREE.PlaneGeometry(1, 1);
    const instanced = (attrs) => {
      const g = new THREE.InstancedBufferGeometry();
      g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
      for (const [name, a] of Object.entries(attrs)) g.setAttribute(name, a);
      g.instanceCount = 0;
      return g;
    };

    // ── the stamps: [x, z, R, amp] and [dx, dz, dip] — where it is, how big, the splash's depth (m; < 0 a dent),
    // the way it came since the last frame (m) and how much of the water it pushed aside goes into the wave
    this.wA = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.wB = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const sm = new THREE.MeshBasicNodeMaterial(add);
    const A = attribute('wA', 'vec4'), B = attribute('wB', 'vec3');
    const half = vec2(A.z.add(abs(B.x).mul(0.5)), A.z.add(abs(B.y).mul(0.5))), mid = A.xy.sub(B.xy.mul(0.5));
    // (the quad's y goes to −z, as a plane laid flat does: the top-down camera sees its front — goo.js)
    const at = mid.add(positionGeometry.xy.mul(vec2(1, -1)).mul(half.mul(2)));
    sm.positionNode = vec3(at.x, 0, at.y);
    const wp = mid.add(uv().sub(0.5).mul(vec2(1, -1)).mul(half.mul(2)));   // this fragment, on the floor
    const q1 = wp.sub(A.xy), q0 = q1.add(B.xy), R2 = A.z.mul(A.z);
    const bump = (q) => { const m = clamp(float(1).sub(dot(q, q).div(R2)), 0, 1); return m.mul(m); };
    // a dent and the rim that holds its water: (1 − u)² (1 − 4u) over the disc sums to nothing
    const u1 = dot(q1, q1).div(R2), m1 = clamp(float(1).sub(u1), 0, 1), hat = m1.mul(m1).mul(float(1).sub(u1.mul(4)));
    const dh = bump(q0).sub(bump(q1)).mul(B.z).add(hat.mul(A.w));
    // (a trail's stamp: the strip between where the body was and where it is, A.w of the way to swept, soft at its edge)
    this.paintU = uniform(0);
    const tq = clamp(dot(q0, B.xy).div(max(dot(B.xy, B.xy), 1e-8)), 0, 1), dv = q0.sub(B.xy.mul(tq));
    const swept = smoothstep(0, 0.4, clamp(float(1).sub(dot(dv, dv).div(R2)), 0, 1)).mul(A.w);
    sm.fragmentNode = mrt({ wave: vec4(mix(dh, swept, this.paintU), 0, 0, 0), slope: vec4(0) });
    this.stamps = new THREE.Mesh(instanced({ wA: this.wA, wB: this.wB }), sm);
    this.stamps.frustumCulled = false;
    this.stampScene = new THREE.Scene(); this.stampScene.add(this.stamps);
    this.ns = 0;

    // ── what stands in the water: discs, r solid (a post, an island's piece), g a sink (a pit)
    this.mA = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SOLID * 4), 4).setUsage(THREE.DynamicDrawUsage);   // x, z, r, pit
    const mm = new THREE.MeshBasicNodeMaterial(add);
    const M = attribute('mA', 'vec4'), mat = M.xy.add(positionGeometry.xy.mul(vec2(1, -1)).mul(M.z.mul(2)));
    mm.positionNode = vec3(mat.x, 0, mat.y);
    const inDisc = step(length(uv().sub(0.5)).mul(2), float(1));
    mm.outputNode = vec4(inDisc.mul(float(1).sub(M.w)), inDisc.mul(M.w), 0, 1);
    this.solids = new THREE.Mesh(instanced({ mA: this.mA }), mm);
    this.solids.frustumCulled = false;
    this.maskScene = new THREE.Scene(); this.maskScene.add(this.solids);

    // ── the step
    this.texel = uniform(new THREE.Vector2(1 / 16, 1 / 16));
    const U = this.U = { K: uniform(0.4), damp: uniform(0.99), level: uniform(0.999), sink: uniform(0.2), dx: uniform(0.1),
      foam0: uniform(0.01), foam1: uniform(0.03), foamKeep: uniform(0.98), trail: uniform(0), blur: uniform(0.03) };
    this.waveIn = texture(this.rt[0].textures[0]); this.slopeIn = texture(this.rt[0].textures[1]); this.maskIn = texture(this.maskRt.texture);
    const p = uv(), tx = this.texel, c = this.waveIn.sample(p);
    // a neighbour something stands in reads as this texel's own height: the wave meets a wall and turns back
    // (past the arena's edge the texture clamps, which is the same wall)
    const lo = tx.mul(0.5), hi = vec2(1).sub(tx.mul(0.5));
    const rd = (ox, oz) => { const q = p.add(vec2(tx.x.mul(ox), tx.y.mul(oz))), n = this.waveIn.sample(mix(clamp(q, lo, hi), q, this.wrapU)); return mix(n.r, c.r, min(n.b, 1)); };
    const hE = rd(1, 0), hW = rd(-1, 0), hS = rd(0, 1), hN = rd(0, -1), hD = rd(1, 1).add(rd(-1, 1)).add(rd(1, -1)).add(rd(-1, -1));
    // nine points, so a ring is round (five draw it a little square: the grid's own axes run faster)
    const lap = hE.add(hW).add(hS).add(hN).mul(4).add(hD).sub(c.r.mul(20)).div(6);
    const open = float(1).sub(min(c.b, 1)), keep = float(1).sub(min(c.a, 1).mul(U.sink));
    const v = c.g.add(lap.mul(U.K)).mul(U.damp).mul(keep).mul(open);
    const h = c.r.add(v).mul(U.level).mul(keep).mul(open);
    const foam = max(this.slopeIn.sample(p).a.mul(U.foamKeep), smoothstep(U.foam0, U.foam1, abs(v))).mul(open);
    // (a trail: no wave — what was swept stays, softens a little, and fills in again)
    const hT = clamp(c.r.add(lap.mul(U.blur)), 0, 1).mul(U.level);
    const sm2 = new THREE.NodeMaterial(); sm2.depthTest = false; sm2.depthWrite = false;
    sm2.fragmentNode = mrt({ wave: vec4(mix(h, hT, U.trail), mix(v, 0, U.trail), c.b, c.a), slope: vec4(hE.sub(hW).div(U.dx.mul(2)), hS.sub(hN).div(U.dx.mul(2)), lap.div(U.dx.mul(U.dx)), mix(foam, hT, U.trail)) });
    this.stepQuad = new THREE.QuadMesh(sm2);
    // what stands in it, written into the wave's b and a (and the water taken out of where it stands)
    const rm = new THREE.NodeMaterial(); rm.depthTest = false; rm.depthWrite = false;
    const mk = this.maskIn.sample(p), solid = min(mk.r, 1), pit = min(mk.g, 1);
    rm.fragmentNode = mrt({ wave: vec4(c.r.mul(float(1).sub(solid)), c.g.mul(float(1).sub(solid)), solid, pit), slope: this.slopeIn.sample(p) });
    this.maskQuad = new THREE.QuadMesh(rm);
    const z = new THREE.NodeMaterial(); z.depthTest = false; z.depthWrite = false;
    z.fragmentNode = mrt({ wave: vec4(0), slope: vec4(0) });
    this.zeroQuad = new THREE.QuadMesh(z);
    this._prev = new THREE.Color();
  }

  get waveTexture() { return this.rt[this.cur].textures[0]; }
  get slopeTexture() { return this.rt[this.cur].textures[1]; }

  // this world's water (TUNING.water[its floor]), or none
  use(P) {
    this.P = P ?? null; this.on = !!P; this.sources = [];
    if (this.on) this.setArena(this.hx, this.hz); else for (const rt of this.rt) rt.setSize(16, 16);
  }

  setArena(hx, hz) {
    this.hx = hx; this.hz = hz;
    if (!this.on) return;
    const P = this.P;
    Object.assign(this.cam, { left: -hx, right: hx, top: hz, bottom: -hz }); this.cam.updateProjectionMatrix();
    // (never more than `maxTexels` a side: a campaign's biggest room is no bigger a texture than the arcade's)
    const per = Math.min(P.perMetre, P.maxTexels / (2 * Math.max(hx, hz)));
    const w = Math.max(16, Math.round(2 * hx * per)), h = Math.max(16, Math.round(2 * hz * per));
    for (const rt of this.rt) rt.setSize(w, h);
    this.maskRt.setSize(w, h);
    this.texel.value.set(1 / w, 1 / h); this.px = 2 * hx / w;
    const U = this.U, dt = 1 / P.hz;
    this.flow = P.flow ?? null; this.alongX = hx >= hz; this.drift = 0; this.driftUV.value.set(0, 0);
    this.wrapU.value.set(this.flow && this.alongX ? 1 : 0, this.flow && !this.alongX ? 1 : 0);
    U.dx.value = this.px;
    const Tr = this.trail = P.trail ?? null;
    U.trail.value = Tr ? 1 : 0; this.paintU.value = Tr ? 1 : 0;
    if (Tr) { U.level.value = Math.pow(0.5, dt / Tr.refill); U.blur.value = Tr.blur; U.sink.value = 0; }
    else {
      U.K.value = Math.min(1.6, 4 * (P.c * dt / this.px) ** 2);
      U.damp.value = Math.pow(0.5, dt / P.half); U.level.value = Math.pow(0.5, dt / P.settle); U.sink.value = P.sink;
      U.foam0.value = P.foam.at[0] * dt; U.foam1.value = P.foam.at[1] * dt; U.foamKeep.value = Math.pow(0.5, dt / P.foam.half);
    }
    this.clear();
  }

  clear() { this.dirty = true; this.ns = 0; this.acc = 0; this.sig = NaN; this.nb = 0; this.posts = []; }

  // the bodies in the water, as this frame draws them: the hero and every gel that is there
  setBodies(w, alpha, simDt) {
    if (!this.on) return;
    const b = this.bodies, h = w.hero;
    let k = 0;
    const put = (x, z, r, vx, vz, id) => { const o = b[k] ?? (b[k] = [0, 0, 0, 0, 0, 0]); o[0] = x; o[1] = z; o[2] = r; o[3] = vx; o[4] = vz; o[5] = id; k++; };
    if (h.alive) put(h.px + (h.x - h.px) * alpha, h.pz + (h.z - h.pz) * alpha, this.P.body.hero, (h.x - h.px) / simDt, (h.z - h.pz) / simDt, 0);
    for (const g of w.gels) {
      if (k >= 200) break;
      if (!g.alive || (g.state === 'appear' && g.t < 0)) continue;
      put(g.px + (g.x - g.px) * alpha, g.pz + (g.z - g.pz) * alpha, g.r, (g.x - g.px) / simDt, (g.z - g.pz) / simDt, g.id);
    }
    this.nb = k;
    // what stands on the floor, when it has changed (a post that drifts changes every frame — and in a flowing water
    // every post does: the mask is drawn in the water's frame)
    const posts = this.posts = w.posts ?? [];
    if (this.trail) return;   // (a trail has no walls: what stands on the ice sweeps it as the bodies do — step())
    let sig = posts.length + this.drift * 31.7;
    for (const q of posts) sig = sig * 1.37 + q.x * 7.1 + q.z * 13.3 + q.r;
    if (sig !== this.sig) {
      this.sig = sig;
      let n = 0;
      for (const q of posts) {
        if (n >= MAX_SOLID) break;
        let x = q.x, z = q.z; const r = q.r * (q.pit ? 1 : this.P.solid);
        if (this.flow) { if (this.alongX) x = this._along(x); else z = this._along(z); }
        this.mA.setXYZW(n++, x, z, r, q.pit ? 1 : 0);
        if (this.flow && n < MAX_SOLID) {   // across the seam: once more at the other end
          const h = this.alongX ? this.hx : this.hz, a = this.alongX ? x : z, sh = a + r > h ? -2 * h : a - r < -h ? 2 * h : 0;
          if (sh) this.mA.setXYZW(n++, this.alongX ? x + sh : x, this.alongX ? z : z + sh, r, q.pit ? 1 : 0);
        }
      }
      this.solids.geometry.instanceCount = n; this.mA.clearUpdateRanges(); this.mA.addUpdateRange(0, Math.max(1, n) * 4); this.mA.needsUpdate = true;
      this.maskDirty = true;
    }
  }

  // a point of the floor, in the water's frame (a flowing water's has drifted `drift` m along the long axis, and wraps)
  _along(v) { const h = this.alongX ? this.hx : this.hz, L = 2 * h; return ((((v - this.drift + h) % L) + L) % L) - h; }
  // a stamp at a point of the floor: put in the water's frame, and twice where it lies across the texture's seam
  _stamp(x, z, R, amp, dx, dz, dip) {
    if (this.flow) { if (this.alongX) x = this._along(x); else z = this._along(z); }
    const put = (px, pz) => { if (this.ns >= CAP) return; const i = this.ns++; this.wA.setXYZW(i, px, pz, R, amp); this.wB.setXYZ(i, dx, dz, dip); };
    put(x, z);
    if (this.flow) {
      const h = this.alongX ? this.hx : this.hz, a = this.alongX ? x : z, reach = R + Math.abs(this.alongX ? dx : dz);
      if (a + reach > h) this.alongX ? put(x - 2 * h, z) : put(x, z - 2 * h); else if (a - reach < -h) this.alongX ? put(x + 2 * h, z) : put(x, z + 2 * h);
    }
  }
  // is a point of the floor in the water at all (a river has banks: `flow.bank` of the half width from its middle)
  _wet(x, z) { return !this.flow?.bank || Math.abs(this.alongX ? z : x) < this.flow.bank * (this.alongX ? this.hz : this.hx); }

  // a dent `amp` m deep and `r` m round, and its rim
  splash(x, z, r, amp) {
    if (!this.on || !this._wet(x, z)) return;
    this._stamp(x, z, Math.max(r, this.px * 2.5), this.trail ? Math.min(1, Math.abs(amp) * this.trail.splash) : -amp, 0, 0, 0);
  }

  // the frame clock: the bodies' way since the last frame goes in, and whatever never stops
  step(dt) {
    if (!this.on || dt <= 0) return;
    const P = this.P, Bd = P.body, t0 = this.t, t1 = (this.t += dt);
    this.acc += dt;
    // a flowing water: the texture is carried on, and everything below is put down in ITS frame, moving through it
    const Fl = this.flow, ux = Fl && this.alongX ? Fl.speed : 0, uz = Fl && !this.alongX ? Fl.speed : 0;
    if (Fl) {
      const L = 2 * (this.alongX ? this.hx : this.hz);
      this.drift = (this.drift + Fl.speed * dt) % L;
      this.driftUV.value.set(this.alongX ? this.drift / L : 0, this.alongX ? 0 : this.drift / L);
    }
    if (this.trail) {
      // what slides over the ice sweeps it: the strip each body crossed this frame, the harder the faster it went (to
      // `full` m/s); and what stands on it (a block of ice adrift) keeps its own footprint swept, so it trails one too
      const Tr = this.trail;
      for (let i = 0; i < this.nb && this.ns < CAP; i++) {
        const [x, z, r, bx, bz] = this.bodies[i], sp = Math.hypot(bx, bz);
        if (sp < Tr.minSpeed) continue;
        const l = sp * dt, cut = l > 3 ? 3 / l : 1;   // (a frame's way, never a jump across the floor: a body put somewhere new)
        this._stamp(x, z, Math.max(r * Bd.foot, this.px * 1.5), Math.min(1, Tr.rate * dt * Math.min(1, sp / Tr.full)), bx * dt * cut, bz * dt * cut, 0);
      }
      for (const q of this.posts) if (!q.pit && this.ns < CAP) this._stamp(q.x, q.z, Math.max(q.r * Tr.block, this.px * 1.5), Math.min(1, Tr.rate * dt), 0, 0, 0);
      return;
    }
    for (let i = 0; i < this.nb && this.ns < CAP; i++) {
      const [x, z, r, bx, bz, id] = this.bodies[i], vx = bx - ux, vz = bz - uz, R = Math.max(r * Bd.foot, this.px * 2.5), w = Bd.bobHz * 6.283 * (0.8 + 0.4 * ((id * 0.618) % 1));
      if (!this._wet(x, z)) continue;
      // (a step no longer than the body is wide: a dash's dipole is not torn into two bumps)
      const l = Math.hypot(vx, vz) * dt, cut = l > R * 1.5 ? (R * 1.5) / l : 1;
      this._stamp(x, z, R, Bd.bob * r * (Math.sin(w * t1 + id) - Math.sin(w * t0 + id)), vx * dt * cut, vz * dt * cut, Bd.dip * Math.min(r, Bd.rMax));
    }
    // and what STANDS in a flowing water moves through it too: each post parts the stream (a pit takes none of it)
    if (Fl) for (const q of this.posts) if (!q.pit && this._wet(q.x, q.z)) this._stamp(q.x, q.z, Math.max(q.r * P.solid, this.px * 2.5), 0, -ux * dt, -uz * dt, Bd.dip * Math.min(q.r, Bd.rMax) * (Fl.post ?? 1));
    // drips from the vault: `rate` a second over 100 m² of floor
    const D = P.drip;
    if (D) {
      this.carry += D.rate * dt * (4 * this.hx * this.hz) / 100;
      while (this.carry >= 1) { this.carry -= 1; this.splash((Math.random() * 2 - 1) * this.hx, (Math.random() * 2 - 1) * this.hz, D.r, D.amp * (0.5 + Math.random())); }
    }
    for (const s of this.sources) {
      s.carry = (s.carry ?? 0) + s.rate * dt;
      while (s.carry >= 1) {
        s.carry -= 1;
        const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * s.r;
        this.splash(s.x + Math.cos(a) * d, s.z + Math.sin(a) * d, s.size * (0.7 + 0.6 * Math.random()), s.amp * (Math.random() * 2 - 0.6));
      }
    }
  }

  // the sim's events the water answers
  onEvent(e) {
    if (!this.on) return;
    const E = this.P.events, k = E[e.type];
    if (!k || e.x == null) return;
    const r = e.r ?? k.r ?? 0.6;
    this.splash(e.x, e.z, r * k.size, k.amp * Math.min(r, k.rMax ?? 2));
  }

  render(renderer) {
    if (!this.on) return;
    const P = this.P;
    let n = Math.min(P.maxSteps, Math.floor(this.acc * P.hz));
    this.acc = Math.min(this.acc - n / P.hz, 2 / P.hz);
    if (!n && !this.ns && !this.dirty && !this.maskDirty) return;
    const prevT = renderer.getRenderTarget(), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
    renderer.getClearColor(this._prev);
    renderer.setClearColor(0x000000, 0);
    if (this.dirty) {
      for (const rt of this.rt) { renderer.setRenderTarget(rt); renderer.clear(); this.zeroQuad.render(renderer); }
      this.dirty = false; this.maskDirty = true;
    }
    const swap = (quad) => {
      const a = this.cur, b = 1 - a;
      this.waveIn.value = this.rt[a].textures[0]; this.slopeIn.value = this.rt[a].textures[1];
      renderer.setRenderTarget(this.rt[b]); quad.render(renderer);
      this.cur = b;
    };
    if (this.maskDirty) {
      renderer.autoClear = true;
      renderer.setRenderTarget(this.maskRt); renderer.render(this.maskScene, this.cam);
      this.maskIn.value = this.maskRt.texture;
      swap(this.maskQuad);
      this.maskDirty = false;
    }
    if (this.ns) {
      const g = this.stamps.geometry;
      g.instanceCount = this.ns;
      for (const at of [this.wA, this.wB]) { at.clearUpdateRanges(); at.addUpdateRange(0, this.ns * at.itemSize); at.needsUpdate = true; }
      renderer.autoClear = false;
      renderer.setRenderTarget(this.rt[this.cur]);
      renderer.render(this.stampScene, this.cam);
      this.ns = 0;
    }
    for (; n > 0; n--) { swap(this.stepQuad); this.stepped++; }
    renderer.autoClear = prevAuto;
    renderer.setRenderTarget(prevT); renderer.setClearColor(this._prev, prevA);
  }

  // a look check: the surface over a square of the floor, read back — its mean |height| and the biggest
  async probe(renderer, x = 0, z = 0, n = 64) {
    const W = this.rt[0].width, H = this.rt[0].height, nx = Math.min(n, W, H);
    if (this.flow) { if (this.alongX) x = this._along(x); else z = this._along(z); }
    const cx = Math.round((x / (2 * this.hx) + 0.5) * W), cy = Math.round((z / (2 * this.hz) + 0.5) * H);
    const x0 = Math.max(0, Math.min(W - nx, cx - nx / 2));
    let y0 = Math.max(0, Math.min(H - nx, cy - nx / 2));
    if (renderer.backend?.isWebGLBackend) y0 = H - nx - y0;
    const px = await renderer.readRenderTargetPixelsAsync(this.rt[this.cur], x0, y0, nx, nx, 0);
    let sum = 0, top = 0, bad = 0;
    for (let i = 0; i < px.length; i += 4) {
      const a = px instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat(px[i]) : px[i];
      if (!Number.isFinite(a)) { bad++; continue; }
      sum += Math.abs(a); if (Math.abs(a) > top) top = Math.abs(a);
    }
    return { mean: sum / (px.length / 4), top, bad, steps: this.stepped, size: [W, H] };
  }
}
