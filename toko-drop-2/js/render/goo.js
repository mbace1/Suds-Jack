// goo.js — goo you can watch fly, land, run and dry (owner, 2026-10-23: "more
// particle splatter and vfx, actually physical modelled vfx").
//
//   drops — goo-sim.js's droplets, drawn as glossy IMPOSTORS: one camera-
//           facing quad each, stretched along the drop's motion on screen and
//           shaded as a sphere from its uv (wrap light, a jelly rim, a wet
//           glint), alpha-tested so they write depth and need no sorting. One
//           draw call for every drop in the air, sliding or riding a body,
//           and one more for their soft shadows straight below them.
//   wall  — v81: the rail is a wall for the goo (goo-sim.js CLING), and the
//           wall has a film of its own: the same Film with the rail unwrapped
//           into one strip (perimetre × wall.h) and the flow turned on its
//           side, so a run of goo RUNS DOWN it and dries where it stops; drawn
//           as a decal on a strip standing just inside the rail, over
//           whatever the world's wall is (a curb, a brick wall, the void)
//   film  — the floor's goo as a THIN FILM over the arena: two HalfFloat
//           targets of two textures each, ping-ponged by fragment passes, so
//           it runs the same on WebGPU and on the WebGL 2 fallback:
//             wet  rgb = hue·h, a = h     goo still liquid, h millimetres deep
//             dry  rgb = hue·d, a = d     the stain it leaves as it dries
//           A drop's stamps add VOLUME to the wet film. Each film step the
//           wet goo spreads (a yield-stress flow: goo deeper than `yield`
//           runs toward its shallower neighbours, its colour carried with
//           it), is dragged by the bodies standing in it, and EVAPORATES at a
//           constant depth a second, so a thin smear dries in a moment and a
//           deep pool stays wet a while; what evaporates is laid down as the
//           dry stain (heaviest at the film's edge: the coffee ring), which
//           fades slowly.
//   the floor shades both (floor.js): the stain darkens the floor in its hue;
//           the wet film over it is jelly — a crisp contact line, the floor
//           seen through it (absorbed per channel, Beer–Lambert, so a thin
//           film barely tints and a deep pool is the goo's own colour), its
//           slope lit by the sun and a glint only where its surface curves
//           (the meniscus at its edge, a fresh blob's dome). The flat middle
//           of a pool does not mirror anything: the floor stays matte (owner,
//           2026-10-22).
//
// Cost (a phone draws every frame of it): the drops are two instanced draws;
// a film step is at most three small passes (the stamps, the footprints at a
// quarter of the film's texels, and one flow pass writing the wet film and the
// stain together) over a 608 × 352 film; the floor reads it in eight bilinear
// taps, its slope from the screen's own derivatives.
//
// The film steps at TUNING.goo.film.hz, not every frame, and goes quiet once
// everything on it has dried: then only the stain's slow fade runs, a pass
// every `idleEvery` s. Reads the world and its events, never writes them.
// Every number is TUNING.goo.
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, attribute, texture, uv, vec2, vec3, vec4, float, normalize, dot, length, max, min, clamp, pow, sqrt,
  mix, cameraViewMatrix, varying, select, positionGeometry, step, smoothstep, mrt, fwidth, dFdx, dFdy, exp, abs, normalLocal, cameraPosition, positionWorld,
} from 'three/tsl';
import { TUNING } from '../tuning.js?v=150';
import { GooSim, BODY, STAMP, wallLen, WALL_N, WALL_T } from './goo-sim.js?v=150';
import { GEL_SUN, GEL_GLINT } from './gel.js?v=150';
import { pickStyle, grainAt } from './style.js?v=150';

const T = TUNING, G = T.goo;
const MAX_BODIES = 256;

export class Goo {
  constructor(scene) {
    this.scene = scene;
    this.sim = new GooSim(G.cap, G);
    this.bodies = new Float32Array(MAX_BODIES * BODY); this.nb = 0;
    this.hx = 19; this.hz = 11; this.sim.setArena(19, 11);
    this.left = G.budget;        // drops this frame may still throw (a boss's death cannot stall a frame)
    this._buildDrops(G.cap);
    this.film = new Film(G.film);
    // v81: the wall's film, and the strip it is drawn on
    this.wall = G.wall?.on ? new Film({ ...G.wall.film, perMetre: G.wall.perMetre, rows: G.wall.rows, h: G.wall.h }, { wall: true }) : null;
    if (this.wall) this._buildWall();
  }

  get n() { return this.sim.n; }

  // v116: one stamp, too thin to see and off the film, on the floor's film and the wall's (actors.warmStep), and
  // the film's clock put past its step so the next frame draws it (on the title nothing steps the film): their
  // stamping shaders compile on the title, not at the run's first kill
  warm() { for (const f of [this.film, this.wall]) if (f) { f.add(1e4, 1e4, 1, 0, 0, 0.01, 1e-6, 1, 1, 1); f.dt = 1; } }

  setArena(hx, hz) { this.hx = hx; this.hz = hz; this.sim.setArena(hx, hz); this.film.setArena(hx, hz); if (this.wall) { this.wall.setArena(hx, hz); this._fitWall(hx, hz); } }

  // the title's SPLATTER switch: the strip draws nothing while the goo is off
  setOn(on) { if (this.strip) this.strip.visible = !!on; }

  // The wall's strip (v81): one quad a wall, standing just inside the rail
  // and facing in, its u the rail unwrapped (goo-sim.js wallS) and its v the
  // height up the wall, so it reads the wall's film straight. Built once, its
  // corners moved by _fitWall when the arena changes.
  _buildWall() {
    const Wl = G.wall, K = Wl.look;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    geo.setAttribute('wTan', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(16 * 2), 2).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let k = 0; k < 4; k++) { const b = k * 4; idx.push(b, b + 2, b + 3, b, b + 3, b + 1); }   // wound so the inward face is the front
    geo.setIndex(idx);
    this.wWet = texture(this.wall.wetTexture); this.wDry = texture(this.wall.dryTexture);
    this.wSize = uniform(new THREE.Vector2(16, 16)); this.wDims = uniform(new THREE.Vector2(100, Wl.h));
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const Ld = normalize(vec3(...T.light.sun.position));
    const out = Fn(() => {
      const st = uv();
      const W = smoothRead(this.wWet, st, this.wSize), Dr = smoothRead(this.wDry, st, this.wSize);
      const h = W.a, hue = W.rgb.div(max(h, 1e-4)), d = Dr.a, dHue = Dr.rgb.div(max(d, 1e-4));
      const edgeOf = (v, at) => { const fw = fwidth(v).mul(0.75).add(1e-4); return smoothstep(float(at).sub(fw), float(at).add(fw), v); };
      // the slope in the wall's own plane from the screen's derivatives (floor.js's trick, in uv): along the wall, and up it
      const ax = dFdx(st), ay = dFdy(st), hX = dFdx(h), hY = dFdy(h);
      const det = ax.x.mul(ay.y).sub(ax.y.mul(ay.x)), inv = float(0.001).div(select(abs(det).greaterThan(1e-9), det, float(1e-9)));
      const su = hX.mul(ay.y).sub(hY.mul(ax.y)).mul(inv).div(this.wDims.x), sv = ax.x.mul(hY).sub(ay.x.mul(hX)).mul(inv).div(this.wDims.y);
      const n = normalize(vec3(su.mul(-K.bump), sv.mul(-K.bump), 1));          // in the wall's frame: along, up, out
      const tg = attribute('wTan', 'vec3'), nw = normalLocal;                 // the strip stands at the origin: local is world
      const L = vec3(dot(Ld, tg), Ld.y, dot(Ld, nw));
      const Vw = normalize(cameraPosition.sub(positionWorld)), Vf = vec3(dot(Vw, tg), Vw.y, dot(Vw, nw));
      const curve = smoothstep(K.curve[0], K.curve[1], length(vec2(su, sv)));
      const relief = dot(n, L).sub(L.z).mul(K.relief);
      const glint = pow(max(dot(n, normalize(L.add(Vf))), 0), float(K.shine)).mul(K.spec).mul(curve);
      const thick = float(1).sub(exp(h.div(K.absorb).negate()));
      const wetCol = hue.mul(K.scatter).mul(float(1).add(relief)).add(mix(hue, vec3(1), 0.5).mul(max(relief, 0)).mul(K.rim)).add(vec3(glint));
      const wetA = edgeOf(h, K.edge).mul(max(thick, float(0.35)));         // the thinnest film still shows as a tint
      const dryK = edgeOf(d, K.dryEdge).mul(mix(float(K.dryBase), float(1), float(1).sub(exp(d.div(K.dryDepth).negate())))).mul(K.dryAlpha);
      const dryCol = dHue.mul(K.dryTint);
      const a = wetA.add(dryK.mul(float(1).sub(wetA)));
      const col = wetCol.mul(wetA).add(dryCol.mul(dryK).mul(float(1).sub(wetA))).div(max(a, 1e-4));
      // v92, the STYLE switch (render/style.js), as the floor's film has it (floor.js goo): CEL a flat wash with
      // a crisp contour and an ink band, WATERCOLOR pigment pooling dark at its border, grained
      const CF = T.style.cel.film, WF = T.style.watercolor.film;
      const edgeHard = (v, at) => { const fw = fwidth(v).mul(0.3).add(1e-4); return smoothstep(float(at).sub(fw), float(at).add(fw), v); };
      const celIn = edgeHard(h, K.edge), celBand = celIn.sub(edgeHard(h, K.edge * CF.inkBand)), celDeep = edgeHard(h, K.edge * CF.inner);
      let celCol = hue.mul(CF.tone).mul(float(1).add(celDeep.mul(CF.innerLift)));
      celCol = mix(celCol, celCol.mul(1 - CF.ink), celBand);
      const celDryK = edgeHard(d, K.dryEdge).mul(K.dryAlpha), celA = celIn.add(celDryK.mul(float(1).sub(celIn)));
      const celOut = vec4(celCol.mul(celIn).add(dHue.mul(K.dryTint * CF.dryTone).mul(celDryK).mul(float(1).sub(celIn))).div(max(celA, 1e-4)), celA);
      const wIn = edgeOf(h, K.edge), wBleed = edgeOf(h, K.edge * WF.bleed);
      const wRim = float(1).sub(smoothstep(float(K.edge), float(K.edge * WF.rimTo), h));
      const wCol = hue.pow(vec3(WF.gamma)).mul(float(1).sub(wRim.mul(WF.rim))).mul(grainAt(st.mul(this.wDims), WF.grainScale, WF.grain));
      const wWet = wIn.mul(WF.alpha).add(wBleed.sub(wIn).mul(WF.alpha * 0.5));
      const dryRing = edgeOf(d, K.dryEdge).sub(edgeOf(d, K.dryEdge * 2.5));
      const wDryK = edgeOf(d, K.dryEdge).mul(K.dryAlpha), wA = wWet.add(wDryK.mul(float(1).sub(wWet)));
      const wDryCol = dHue.pow(vec3(WF.gamma)).mul(K.dryTint).mul(float(1).sub(dryRing.mul(WF.dryRim)));
      const wcOut = vec4(wCol.mul(wWet).add(wDryCol.mul(wDryK).mul(float(1).sub(wWet))).div(max(wA, 1e-4)), wA);
      return pickStyle(vec4(col, a), celOut, wcOut);
    })();
    mat.colorNode = out.rgb; mat.opacityNode = out.a;
    this.strip = new THREE.Mesh(geo, mat);
    this.strip.frustumCulled = false; this.strip.renderOrder = 2;
    this.scene.add(this.strip);
    this._fitWall(this.hx, this.hz);
  }

  _fitWall(hx, hz) {
    if (!this.strip) return;
    const Wl = G.wall, H = Wl.h, P = wallLen(hx, hz), inset = 0.012, g = this.strip.geometry;
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), tan = g.getAttribute('wTan'), uvs = g.getAttribute('uv');
    const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz], [-hx, -hz]];   // s runs round from the far wall's left end
    let s = 0, v = 0;
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k], [bx, bz] = corners[k + 1], len = Math.hypot(bx - ax, bz - az), N = WALL_N[k], Tg = WALL_T[k];
      for (const [px, pz, u] of [[ax, az, s / P], [bx, bz, (s + len) / P]]) for (const y of [0, H]) {
        pos.setXYZ(v, px + N[0] * inset, y, pz + N[1] * inset); nor.setXYZ(v, N[0], 0, N[1]); tan.setXYZ(v, Tg[0], 0, Tg[1]); uvs.setXY(v, u, y / H); v++;
      }
      s += len;
    }
    pos.needsUpdate = nor.needsUpdate = tan.needsUpdate = uvs.needsUpdate = true;
    this.wDims.value.set(P, H);
    this.wSize.value.set(1 / this.wall.texel.value.x, 1 / this.wall.texel.value.y);
  }

  _buildDrops(cap) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.iVel = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.iPos); geo.setAttribute('iVel', this.iVel); geo.setAttribute('iCol', this.iCol);
    geo.instanceCount = 0;
    const D = G.drop;
    const mat = new THREE.MeshBasicNodeMaterial({ alphaTest: 0.5 });
    // the camera's right and up in the world (the view matrix's rows)
    const V = cameraViewMatrix;
    const right = vec3(V[0].x, V[1].x, V[2].x), up = vec3(V[0].y, V[1].y, V[2].y);
    const P = attribute('iPos', 'vec4'), vel = attribute('iVel', 'vec3');
    // stretched along its motion on screen, as a fast drop smears in one frame
    const vr = dot(vel, right), vu = dot(vel, up), vs = length(vec2(vr, vu));
    const ax = select(vs.greaterThan(1e-3), vec2(vr, vu).div(max(vs, 1e-3)), vec2(1, 0));
    const stretch = min(float(1).add(vs.mul(D.stretch)), D.maxStretch);
    const axis = varying(ax, 'vAxis');
    const pos = positionGeometry;            // −0.5 … 0.5 across the quad
    const wAxis = right.mul(axis.x).add(up.mul(axis.y)), wPerp = right.mul(axis.y.negate()).add(up.mul(axis.x));
    // v102 (owner: "not enough goo vfx"): a drop is DRAWN `draw` × its radius — on a phone's portrait floor a metre is
    // ~18 px and a 5 cm drop was a pixel — while its volume, and so what it lays in the film, stays what it is
    const rDraw = P.w.mul(D.draw ?? 1);
    mat.positionNode = P.xyz.add(wAxis.mul(pos.x.mul(rDraw).mul(2).mul(stretch))).add(wPerp.mul(pos.y.mul(rDraw).mul(2)));
    // the sphere's normal from where on the quad this is (x runs along the stretch)
    const q = uv().mul(2).sub(1), d2 = dot(q, q);
    const nz = sqrt(max(float(0), float(1).sub(d2)));
    const nView = normalize(vec3(axis.x.mul(q.x).sub(axis.y.mul(q.y)), axis.y.mul(q.x).add(axis.x.mul(q.y)), nz));
    mat.colorNode = shadeDrop(attribute('iCol', 'vec3'), nView);
    mat.opacityNode = float(1).sub(step(float(1), d2));
    this.drops = new THREE.Mesh(geo, mat);
    this.drops.frustumCulled = false;
    this.scene.add(this.drops);
    // Each drop's shadow on the floor, from the same instances: a soft dark
    // disc straight under it, wider and fainter the higher it flies, so a
    // drop in the air reads as IN THE AIR and not as a dot on the floor
    // (the bodies' own contact shadows are drawn the same way, light.js).
    const S = G.shadow, sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const sgeo = new THREE.InstancedBufferGeometry();
    sgeo.index = base.index; sgeo.setAttribute('position', base.attributes.position); sgeo.setAttribute('uv', base.attributes.uv);
    sgeo.setAttribute('iPos', this.iPos); sgeo.instanceCount = 0;
    const lift = max(P.y.sub(P.w), 0), size = P.w.mul(G.drop.draw ?? 1).mul(float(S.size).add(lift.mul(S.grow)));
    sm.positionNode = vec3(P.x.add(pos.x.mul(size).mul(2)), S.y, P.z.sub(pos.y.mul(size).mul(2)));
    const ring = length(uv().sub(0.5)).mul(2);
    sm.colorNode = vec3(0);
    sm.opacityNode = clamp(float(1).sub(ring), 0, 1).mul(S.alpha).div(float(1).add(lift.mul(S.fade)));
    this.shadows = new THREE.Mesh(sgeo, sm);
    this.shadows.frustumCulled = false; this.shadows.renderOrder = -1;
    this.scene.add(this.shadows);
  }

  // the bodies a drop can land on: the hero (not mid-dash: he goes through
  // what he cuts) and every gel that is drawn (a brood waiting out its
  // parent's pop is not there yet, and a CLOAKER gone see-through sheds what
  // it carried rather than wearing it)
  setBodies(w, alpha) {
    let k = 0;
    const b = this.bodies, h = w.hero, dt = T.sim.dt;
    // (v84: mid-dash he is still a body for the spray and the tracks — shape 3, which nothing rides)
    if (h.alive) { b.set([h.px + (h.x - h.px) * alpha, h.pz + (h.z - h.pz) * alpha, T.hero.radius, T.hero.radius * 2, (h.x - h.px) / dt, (h.z - h.pz) / dt, -1, h.dash > 0 ? 3 : 2], 0); k++; }
    for (const g of w.gels) {
      if (k >= MAX_BODIES) break;
      if (!g.alive || (g.state === 'appear' && g.t < 0) || g.cloak > 0.5) continue;
      const cube = T.species[g.kind]?.family === 'cube';
      // v131: a dome's top is where its (flatter) shape puts it: its cut sphere × its species' squash
      const top = cube ? 1.8 : (1 + T.blob.domeCut) * (T.blob.shapes[g.kind]?.y ?? T.blob.shape.y) * (T.blob.squat ?? 1);
      b.set([g.px + (g.x - g.px) * alpha, g.pz + (g.z - g.pz) * alpha, g.r, g.r * top, (g.x - g.px) / dt, (g.z - g.pz) / dt, g.id, cube ? 1 : 0], k * BODY); k++;
    }
    this.nb = k;
  }

  // A spray: n drops from (x, y, z), `dx, dz` the mean way (a unit vector,
  // or none for all round), `cone` its half-angle, speed and lift ranges, in
  // a colour. Sizes are log-skewed (mostly fine, a few fat) and a fat drop
  // flies slower: it carries the same push in more mass. Returns how many flew.
  spray(x, y, z, n, hex, { dx = 0, dz = 0, cone = Math.PI, speed = [2, 7], up = [1.5, 6], size = G.size, inherit = null } = {}) {
    n = Math.min(n, this.left);
    if (n <= 0) return 0;
    const c = _c.setHex(hex), S = size, lo = Math.log(S.min), span = Math.log(S.max) - lo;
    const all = Math.hypot(dx, dz) <= 1e-6, base = all ? 0 : Math.atan2(dz, dx);
    let i = 0;
    for (; i < n; i++) {
      const r = Math.exp(lo + span * Math.random() ** S.skew);
      const a = all ? Math.random() * Math.PI * 2 : base + (Math.random() * 2 - 1) * cone;
      const k = Math.pow(S.min / r, G.sizeSpeed);
      const sp = (speed[0] + Math.random() * (speed[1] - speed[0])) * (0.55 + 0.45 * k);
      const vy = (up[0] + Math.random() * (up[1] - up[0])) * (0.6 + 0.4 * k);
      if (!this.sim.emit(x, y, z, Math.cos(a) * sp + (inherit?.[0] ?? 0), vy, Math.sin(a) * sp + (inherit?.[1] ?? 0), r, c.r, c.g, c.b)) break;
    }
    this.left -= i;
    return i;
  }

  // goo straight onto the floor (a trail, a cut's streak): VOLUME (m³) into the film
  pour(x, z, rad, vol, hex, dx = 1, dz = 0, len = 0) {
    const c = _c.setHex(hex);
    this.film.add(x, z, dx, dz, len, rad, vol, c.r, c.g, c.b);
    this.sim.wetAdd(x, z, vol, c.r, c.g, c.b);   // v84: the wet map knows
  }

  // a body's worth of goo slumping where it stood: not one disc but a few
  // lobes of it, thrown a little off the middle, so the pool's edge is
  // ragged before the flow takes it (a body does not burst evenly)
  puddle(x, z, rad, vol, hex) {
    const P = G.puddle, n = P.lobes, c = _c.setHex(hex), w = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const k = 0.4 + Math.random(); w.push(k); sum += k; }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : rad * P.spread * Math.sqrt(Math.random()), share = w[i] / sum;
      this.film.add(x + Math.cos(a) * d, z + Math.sin(a) * d, 1, 0, 0, rad * (P.size[0] + (P.size[1] - P.size[0]) * Math.sqrt(share * n / 2)), vol * share, c.r, c.g, c.b);
    }
    this.sim.wetAdd(x, z, vol, c.r, c.g, c.b);   // v84: the wet map knows
  }

  // the frame clock: the drops move, their stamps go to the film, the bodies'
  // footprints are noted, and the frame's budget comes back
  step(dt) {
    this.left = G.budget;
    if (dt <= 0) return;
    // a long frame is taken in steps of at most 1/30 s (and at most four)
    const n = Math.min(4, Math.ceil(dt * 30)), h = Math.min(dt / n, 1 / 30), s = this.sim.stamps;
    for (let k = 0; k < n; k++) {
      this.sim.step(h, this.bodies, this.nb, this.hx, this.hz);
      for (let i = 0; i < this.sim.ns; i++) {
        const o = i * STAMP;
        this.film.add(s[o], s[o + 1], s[o + 2], s[o + 3], s[o + 4], s[o + 5], s[o + 6], s[o + 7], s[o + 8], s[o + 9]);
      }
      // the wall's stamps (v81): up the wall is the strip's −z, as the floor's far is
      const ws = this.sim.wstamps;
      this.wallStamps = (this.wallStamps || 0) + this.sim.nws;
      if (this.wall) for (let i = 0; i < this.sim.nws; i++) {
        const o = i * STAMP;
        this.wall.add(ws[o], -ws[o + 1], ws[o + 2], -ws[o + 3], ws[o + 4], ws[o + 5], ws[o + 6], ws[o + 7], ws[o + 8], ws[o + 9]);
      }
    }
    this.film.feet(this.bodies, this.nb);
    this.film.dt += dt;
    if (this.wall) this.wall.dt += dt;
  }

  // the drops, as the GPU reads them: one contiguous run, uploaded as far as it goes
  sync() {
    const s = this.sim, n = s.n, P = this.iPos.array, V = this.iVel.array, C = this.iCol.array;
    for (let i = 0; i < n; i++) {
      P[i * 4] = s.x[i]; P[i * 4 + 1] = s.y[i]; P[i * 4 + 2] = s.z[i]; P[i * 4 + 3] = s.r[i];
      V[i * 3] = s.vx[i]; V[i * 3 + 1] = s.vy[i]; V[i * 3 + 2] = s.vz[i];
      C[i * 3] = s.cr[i]; C[i * 3 + 1] = s.cg[i]; C[i * 3 + 2] = s.cb[i];
    }
    for (const a of [this.iPos, this.iVel, this.iCol]) { a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(1, n) * a.itemSize); a.needsUpdate = true; }
    this.drops.geometry.instanceCount = n; this.shadows.geometry.instanceCount = n;
  }

  // `maxDt`: the longest step the film takes (a fast-forward catches up coarsely)
  render(renderer, maxDt) {
    this.film.render(renderer, maxDt);
    if (this.wall) { this.wall.render(renderer, maxDt); this.wWet.value = this.wall.wetTexture; this.wDry.value = this.wall.dryTexture; }
  }

  clear() { this.sim.clear(); this.drops.geometry.instanceCount = 0; this.shadows.geometry.instanceCount = 0; this.film.clear(); this.wall?.clear(); }
}

// A cubic B-spline read of a film in four bilinear taps (Sigg and Hadwiger's
// trick; floor.js has the same): a bilinear read draws a stain as the outline
// of the texels it fell in, a staircase, and the spline's contour is round
function smoothRead(tex, st, size) {
  const t = st.mul(size).sub(0.5), i = t.floor(), f = t.sub(i);
  const f2 = f.mul(f), f3 = f2.mul(f);
  const w0 = float(1).sub(f).pow(3).div(6), w1 = float(4).sub(f2.mul(6)).add(f3.mul(3)).div(6);
  const w2 = float(1).add(f.mul(3)).add(f2.mul(3)).sub(f3.mul(3)).div(6), w3 = f3.div(6);
  const g0 = w0.add(w1), g1 = w2.add(w3);
  const h0 = i.sub(0.5).add(w1.div(g0)), h1 = i.add(1.5).add(w3.div(g1));
  const a = h0.div(size), b = h1.div(size);
  const top = tex.sample(vec2(a.x, a.y)).mul(g0.x).add(tex.sample(vec2(b.x, a.y)).mul(g1.x));
  const bot = tex.sample(vec2(a.x, b.y)).mul(g0.x).add(tex.sample(vec2(b.x, b.y)).mul(g1.x));
  return top.mul(g0.y).add(bot.mul(g1.y));
}

const _c = new THREE.Color();

// a drop: wrap light, a fresnel jelly rim and a wet glint in the view's own
// frame (1.x v222's goo chunks), and a little light of its own so a drop
// over the dark floor keeps its colour
function shadeDrop(col, N) {
  const D = G.drop;
  // v128: lit by the world's sun (gel.js GEL_SUN, where it was 1.x's for every world), with the sun's own GLINT in
  // its colour where the world has one, and its light coming THROUGH the drop on the side away from it (`through`)
  const L = normalize(cameraViewMatrix.mul(vec4(GEL_SUN, 0)).xyz);
  const Vd = vec3(0, 0, 1), H = normalize(L.add(Vd));
  const wrap = clamp(dot(N, L).mul(0.5).add(0.5), 0, 1);
  const fres = pow(float(1).sub(clamp(dot(N, Vd), 0, 1)), float(2.5));
  const nh = clamp(dot(N, H), 0, 1), spec = pow(nh, float(D.gloss));
  const sunK = GEL_GLINT.r.add(GEL_GLINT.g).add(GEL_GLINT.b).div(3);
  const glint = GEL_GLINT.mul(pow(nh, float(D.sunPow ?? 160)).mul(D.sunGlint ?? 0));
  const through = col.mul(pow(clamp(dot(N, L.negate()), 0, 1), float(1.2)).mul(sunK).mul(D.through ?? 0));
  const physical = col.mul(wrap.mul(D.diffuse).add(D.ambient)).add(mix(col, vec3(1), 0.6).mul(fres).mul(D.rim)).add(vec3(spec.mul(D.glint))).add(col.mul(D.glow)).add(glint).add(through);
  // v92, the STYLE switch (render/style.js): CEL two flat tones and an ink rim, WATERCOLOR pigment dark at the edge
  const CD = T.style.cel.drop, WD = T.style.watercolor.drop;
  const celTone = mix(float(CD.shadow), float(1), step(float(CD.lit), wrap)), celInk = step(float(CD.inkAt), float(1).sub(clamp(dot(N, Vd), 0, 1)));
  const cel = mix(col.mul(celTone), col.mul(celTone).mul(CD.ink), celInk);
  const wEdge = pow(float(1).sub(clamp(dot(N, Vd), 0, 1)), float(WD.edgePow)), wPig = col.pow(vec3(T.style.watercolor.gamma));
  const wc = mix(wPig.mul(mix(float(WD.shadow), float(1), wrap)), wPig.mul(WD.edgeDark), wEdge.mul(WD.edge));
  return pickStyle(physical, cel, wc);
}

// ── the thin film ───────────────────────────────────────────────────────
// Stamps and footprints are drawn top-down over the arena, as the light map
// is (light.js): an orthographic camera over the floor, far edge at the top.
class Film {
  // `wall` (v81): the rail's film — one strip, the rail unwrapped (x = metres
  // along it, the camera's far = metres UP it), and the flow runs down
  constructor(F, { wall = false } = {}) {
    this.F = F; this.wall = wall;
    const opt = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    // each target holds the wet film and the stain (textures 0 and 1), so one
    // pass steps both: on a phone's tiled GPU every pass is a trip through memory
    this.rt = [0, 1].map(() => {
      const rt = new THREE.RenderTarget(16, 16, { ...opt, count: 2 });
      rt.textures[0].name = 'wet'; rt.textures[1].name = 'dry';
      return rt;
    });
    this.vel = new THREE.RenderTarget(16, 16, opt);
    this.cur = 0; this.dt = 0; this.dirty = true;
    this.quiet = Infinity;       // seconds since goo last reached the film
    this.stepped = 0;            // film steps run, for a look at what it costs
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    this.cam.position.set(0, 20, 0); this.cam.up.set(0, 0, -1); this.cam.lookAt(0, 0, 0);
    this.stampScene = new THREE.Scene(); this.velScene = new THREE.Scene();
    const add = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, transparent: true, depthTest: false, depthWrite: false };
    const quad = new THREE.PlaneGeometry(1, 1);   // −0.5 … 0.5 in x and y; laid flat by the vertex code below
    const instanced = (attrs) => {
      const g = new THREE.InstancedBufferGeometry();
      g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
      for (const [name, a] of Object.entries(attrs)) g.setAttribute(name, a);
      g.instanceCount = 0;
      return g;
    };

    // a stamp: a capsule from its centre along (dx, dz), its goo a dome
    // profile that integrates to the stamp's volume (the colour carries hue × h0)
    const cap = F.stampCap;
    this.sA = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);   // x, z, dx, dz
    this.sB = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2).setUsage(THREE.DynamicDrawUsage);   // len, wid
    this.sCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage); // hue × h0, h0
    const sm = new THREE.MeshBasicNodeMaterial(add);
    const A = attribute('sA', 'vec4'), Bv = attribute('sB', 'vec2'), L = Bv.x, W = Bv.y;
    // the quad's y goes to −z, as a plane laid flat by rotateX(−π/2) does, so
    // the top-down camera sees its front
    const along = vec2(A.z, A.w), across = vec2(A.w, A.z.negate());
    const local = positionGeometry.xy.mul(vec2(L.add(W.mul(2)), W.mul(2)));          // metres from the capsule's centre
    const world = A.xy.add(along.mul(local.x)).add(across.mul(local.y));
    sm.positionNode = vec3(world.x, 0, world.y);
    const capsule = Fn(() => {
      const p = uv().sub(0.5).mul(vec2(L.add(W.mul(2)), W.mul(2)));
      const ax = clamp(p.x, L.mul(-0.5), L.mul(0.5));
      const d = length(vec2(p.x.sub(ax), p.y)).div(W);
      return pow(clamp(float(1).sub(d.mul(d)), 0, 1), float(1.5));
    })();
    sm.fragmentNode = mrt({ wet: attribute('sCol', 'vec4').mul(capsule), dry: vec4(0) });   // added: the stain is left as it is
    this.stamps = new THREE.Mesh(instanced({ sA: this.sA, sB: this.sB, sCol: this.sCol }), sm);
    this.stamps.frustumCulled = false;
    this.stampScene.add(this.stamps);
    this.ns = 0;

    // a body's footprint: its velocity × a weight falling off from its middle, and the weight
    this.fA = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BODIES * 3), 3).setUsage(THREE.DynamicDrawUsage);   // x, z, R
    this.fV = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BODIES * 2), 2).setUsage(THREE.DynamicDrawUsage);   // vx, vz
    const vm = new THREE.MeshBasicNodeMaterial(add);
    const fa = attribute('fA', 'vec3');
    const fp = fa.xy.add(positionGeometry.xy.mul(vec2(1, -1)).mul(fa.z.mul(2)));
    vm.positionNode = vec3(fp.x, 0, fp.y);
    const fall = pow(clamp(float(1).sub(length(uv().sub(0.5)).mul(2)), 0, 1), float(0.7));
    vm.outputNode = vec4(attribute('fV', 'vec2').mul(fall), fall, float(0));
    this.footMesh = new THREE.Mesh(instanced({ fA: this.fA, fV: this.fV }), vm);
    this.footMesh.frustumCulled = false;
    this.velScene.add(this.footMesh);
    this.nf = 0;

    // the flow: the wet film spreads, is dragged, evaporates; the stain takes
    // what evaporated and fades. One pass writes both, reading the last pair.
    this.texel = uniform(new THREE.Vector2(1 / 16, 1 / 16));
    this.uDt = uniform(1 / 30); this.uSize = uniform(new THREE.Vector2(38, 22));
    this.wetIn = texture(this.rt[0].textures[0]); this.dryIn = texture(this.rt[0].textures[1]); this.velIn = texture(this.vel.texture);
    const wetFlow = Fn(() => {
      const p = uv(), tx = this.texel;
      let q = p;
      if (!wall) {
        // the bodies drag the film along: look back along their mean velocity
        const vv = this.velIn.sample(p);
        const u = select(vv.z.greaterThan(1e-3), vv.xy.div(max(vv.z, 1e-3)).mul(min(vv.z, 1)).mul(F.drag), vec2(0));
        q = p.sub(u.mul(this.uDt).div(this.uSize));
      }
      const c = this.wetIn.sample(q);
      // flux between two texels: the difference in mobile goo (above the
      // yield) × a mobility that grows with how much is mobile, so deep goo
      // runs and thin goo creeps to a stop at the yield. `spread` ≤ 0.2 keeps
      // the explicit step stable (the 2D limit is 0.25 a side).
      const Y = float(F.yield), K = float(F.spread), Hr = float(F.ref);
      const mob = (h) => max(h.sub(Y), 0);
      const flux = (n) => {
        const mi = mob(c.a), mj = mob(n.a);
        const f = mj.sub(mi).mul(K).mul(min(mi.add(mj).mul(0.5).div(Hr), 1));      // > 0: in from n
        const hue = select(f.greaterThan(0), n.rgb.div(max(n.a, 1e-4)), c.rgb.div(max(c.a, 1e-4)));
        return vec4(hue.mul(f), f);
      };
      const nE = this.wetIn.sample(q.add(vec2(tx.x, 0))), nW = this.wetIn.sample(q.sub(vec2(tx.x, 0)));
      let o = c.add(flux(nE)).add(flux(nW));
      if (!wall) {
        const nN = this.wetIn.sample(q.add(vec2(0, tx.y))), nS = this.wetIn.sample(q.sub(vec2(0, tx.y)));
        o = o.add(flux(nN)).add(flux(nS));
      } else {
        // on a wall the goo RUNS: the mobile depth of the texel above comes
        // down into this one and this one's goes on down, `run` of it a step
        // (the top row takes nothing in; the bottom row lets nothing out — the
        // bead at the wall's foot — so the strip conserves what it is given)
        const Kg = float(F.run);
        const up = this.wetIn.sample(q.add(vec2(0, tx.y))), hasUp = step(q.y.add(tx.y), float(1)), hasDown = step(tx.y, q.y);
        const mu = mob(up.a), mc = mob(c.a);
        const gin = mu.mul(Kg).mul(min(mu.div(Hr), 1)).mul(hasUp), gout = mc.mul(Kg).mul(min(mc.div(Hr), 1)).mul(hasDown);
        o = o.add(vec4(up.rgb.div(max(up.a, 1e-4)).mul(gin), gin)).sub(vec4(c.rgb.div(max(c.a, 1e-4)).mul(gout), gout));
      }
      // evaporation: a constant depth a second, whatever the depth
      const e = min(o.a, float(F.evap).mul(this.uDt));
      const keep = select(o.a.greaterThan(1e-4), o.a.sub(e).div(max(o.a, 1e-4)), float(0));
      return o.mul(keep);
    })();
    // The coffee ring: a drying film is fed from inside toward its edge,
    // where evaporation is fastest, so what it carried is laid down at the
    // rim. A wet texel with a dry neighbour is the edge: it keeps `ring` ×
    // what it lost, the middle `deposit` ×, so a dried pool is a darker ring
    // round a lighter stain rather than a flat coin.
    const dryFlow = Fn(() => {
      const p = uv(), tx = this.texel;
      const c = this.wetIn.sample(p), d = this.dryIn.sample(p);
      const e = min(c.a, float(F.evap).mul(this.uDt));
      const got = select(c.a.greaterThan(1e-4), c.mul(e.div(max(c.a, 1e-4))), vec4(0));
      const mn = min(min(this.wetIn.sample(p.add(vec2(tx.x, 0))).a, this.wetIn.sample(p.sub(vec2(tx.x, 0))).a),
        min(this.wetIn.sample(p.add(vec2(0, tx.y))).a, this.wetIn.sample(p.sub(vec2(0, tx.y))).a));
      const rim = float(1).sub(smoothstep(0, F.ringAt, mn));
      return d.mul(pow(float(0.5), this.uDt.div(F.dryHalfLife))).add(got.mul(mix(float(F.deposit), float(F.ring), rim)));
    })();
    const m = new THREE.NodeMaterial(); m.depthTest = false; m.depthWrite = false;
    m.fragmentNode = mrt({ wet: wetFlow, dry: dryFlow });
    this.flowQuad = new THREE.QuadMesh(m);
    // the wipe: both textures to nothing. A pass, not renderer.clear(): on a
    // two-texture target the clear reached only the first (v81: the wall's
    // stain started at a millimetre everywhere and faded from there)
    const z = new THREE.NodeMaterial(); z.depthTest = false; z.depthWrite = false;
    z.fragmentNode = mrt({ wet: vec4(0), dry: vec4(0) });
    this.zeroQuad = new THREE.QuadMesh(z);
    this._prev = new THREE.Color();
  }

  get wetTexture() { return this.rt[this.cur].textures[0]; }
  get dryTexture() { return this.rt[this.cur].textures[1]; }

  // the film covers the arena exactly, at perMetre texels a metre; the wall's
  // covers the rail unwrapped, `rows` texels up its `h` metres
  setArena(hx, hz) {
    if (this.wall) {
      const P = wallLen(hx, hz), w = Math.max(16, Math.round(P * this.F.perMetre)), h = Math.max(4, this.F.rows);
      Object.assign(this.cam, { left: 0, right: P, top: this.F.h, bottom: 0 }); this.cam.updateProjectionMatrix();
      for (const rt of this.rt) rt.setSize(w, h);
      this.texel.value.set(1 / w, 1 / h); this.uSize.value.set(P, this.F.h); this.px = P / w;
      this.clear();
      return;
    }
    Object.assign(this.cam, { left: -hx, right: hx, top: hz, bottom: -hz }); this.cam.updateProjectionMatrix();
    const w = Math.max(16, Math.round(2 * hx * this.F.perMetre)), h = Math.max(16, Math.round(2 * hz * this.F.perMetre));
    for (const rt of this.rt) rt.setSize(w, h);
    // the footprints are soft and a body is a metre across: a quarter of the
    // film's texels hold them, and the flow reads them filtered
    this.vel.setSize(Math.max(4, Math.round(w / 4)), Math.max(4, Math.round(h / 4)));
    this.texel.value.set(1 / w, 1 / h); this.uSize.value.set(2 * hx, 2 * hz); this.px = 2 * hx / w;
    this.clear();
  }

  clear() { this.dirty = true; this.ns = 0; this.stamps.geometry.instanceCount = 0; this.quiet = Infinity; }

  // `vol` m³ of goo in a capsule; its depth is kept in millimetres, where a
  // half float is precise
  add(x, z, dx, dz, len, wid, vol, r, g, b) {
    if (this.ns >= this.F.stampCap || !(vol > 0)) return;
    const i = this.ns++, W = Math.max(wid, this.px * this.F.minWid);
    // the dome profile (1 − ρ²)^1.5 holds 0.4 of its disc and about 0.5 of
    // its rectangle: the depth at the middle that holds `vol`
    const area = Math.PI * W * W * 0.4 + 2 * W * len * 0.5, h0 = 1000 * vol / Math.max(area, 1e-6);
    const m = Math.max(r, g, b, 1e-3);
    this.sA.setXYZW(i, x, z, dx, dz); this.sB.setXY(i, len, W);
    this.sCol.setXYZW(i, r / m * h0, g / m * h0, b / m * h0, h0);
    this.quiet = 0;
  }

  feet(bodies, nb) {
    if (this.wall) return;   // nothing walks on a wall
    let k = 0;
    for (let i = 0; i < nb && k < MAX_BODIES; i++) {
      const o = i * BODY;
      this.fA.setXYZ(k, bodies[o], bodies[o + 1], bodies[o + 2] * this.F.foot); this.fV.setXY(k, bodies[o + 4], bodies[o + 5]); k++;
    }
    this.nf = k;
  }

  // The smoke and the look checks: how much goo lies round (x, z), read back
  // from the film — depth summed over a 64-texel square (4 m) on (x, z), wet
  // and dry, and how many of those reads hold any. WebGL reads its rows from
  // the BOTTOM of a target and WebGPU from the top, so on WebGL the square is
  // counted from the other edge (v98: until then a WebGL probe read the
  // mirror of (x, z) across the middle row, and world 3's smoke, its gel dying
  // 3–5 m off the middle, read nothing where 500–700 texels of goo lay)
  async probe(renderer, x, z, n = 64) {
    const out = { wet: 0, dry: 0, covered: 0 };
    const W = this.rt[0].width, H = this.rt[0].height;
    // the wall's strip is small: the whole of it is read
    let nx = Math.min(n, W, H), ny = nx, x0 = 0, y0 = 0;
    if (this.wall) { nx = W; ny = H; } else {
      const S = this.uSize.value, cx = Math.round((x / S.x + 0.5) * W), cy = Math.round((z / S.y + 0.5) * H);
      x0 = Math.max(0, Math.min(W - nx, cx - nx / 2)); y0 = Math.max(0, Math.min(H - ny, cy - ny / 2));
      if (renderer.backend?.isWebGLBackend) y0 = H - ny - y0;
    }
    for (const [i, key] of [[0, 'wet'], [1, 'dry']]) {
      const px = await renderer.readRenderTargetPixelsAsync(this.rt[this.cur], x0, y0, nx, ny, i);
      for (let i = 3; i < px.length; i += 4) {
        const a = px instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat(px[i]) : px[i];
        if (a > 0) { out[key] += a; if (a > 0.05) out.covered++; }
      }
    }
    return out;
  }

  render(renderer, maxDt = 1 / 10) {
    const F = this.F;
    // Quiet: nothing has reached the film for longer than the deepest wet
    // goo takes to dry, so the wet film is empty and the stain only fades.
    const idle = this.quiet > F.wetFor && !this.dirty;
    const every = idle ? F.idleEvery : 1 / F.hz;
    if (this.dt < every && !this.dirty) return;
    const dt = Math.min(this.dt, idle ? F.idleEvery : maxDt); this.dt = 0;
    this.quiet += dt;
    const prevT = renderer.getRenderTarget(), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
    renderer.getClearColor(this._prev);
    renderer.setClearColor(0x000000, 0);
    if (this.dirty) {
      for (const rt of this.rt) { renderer.setRenderTarget(rt); renderer.clear(); this.zeroQuad.render(renderer); }
      this.dirty = false;
    }
    const a = this.cur, b = 1 - a;
    if (!idle) {
      // 1. the stamps since the last step, added to the wet film where they lie
      if (this.ns) {
        const g = this.stamps.geometry;
        g.instanceCount = this.ns;
        for (const at of [this.sA, this.sB, this.sCol]) { at.clearUpdateRanges(); at.addUpdateRange(0, this.ns * at.itemSize); at.needsUpdate = true; }
        renderer.autoClear = false;
        renderer.setRenderTarget(this.rt[a]);
        renderer.render(this.stampScene, this.cam);
        this.ns = 0;
      }
      // 2. the bodies' footprints (the floor's: nothing walks on a wall)
      if (!this.wall) {
        const fg = this.footMesh.geometry;
        fg.instanceCount = this.nf;
        for (const at of [this.fA, this.fV]) { at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(1, this.nf) * at.itemSize); at.needsUpdate = true; }
        renderer.autoClear = true;
        renderer.setRenderTarget(this.vel); renderer.render(this.velScene, this.cam);
      }
    }
    // 3. the flow: the wet film and the stain together, from the current pair into the other
    this.uDt.value = dt;
    this.wetIn.value = this.rt[a].textures[0]; this.dryIn.value = this.rt[a].textures[1]; this.velIn.value = this.vel.texture;
    renderer.setRenderTarget(this.rt[b]); this.flowQuad.render(renderer);
    this.cur = b; this.stepped++;
    renderer.autoClear = prevAuto;
    renderer.setRenderTarget(prevT); renderer.setClearColor(this._prev, prevA);
  }
}
