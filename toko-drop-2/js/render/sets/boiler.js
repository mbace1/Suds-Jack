// boiler.js — WORLD 5, THE BOILER ROOM (v72, from its brief,
// art-ref/briefs/world-5-boiler.md). Riveted boilers stand along the far
// side, each a drum on end with a domed top, its firebox door glowing at its
// foot and throwing that light on the deck, a stack out of its dome with steam
// going up; along the two sides a run of steam pipes, flanged, with red valve
// wheels on risers that let off steam now and then, and smaller tanks behind
// them. A hazard-striped band round the floor, tread plate past it, going
// into the dark. Never along the near side. Every number TUNING.scenery.boiler
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, fract, sin, abs, min, max, mix, smoothstep, length, atan, uv, clamp, fwidth, floor as tfloor, positionWorld, positionGeometry, normalWorld } from 'three/tsl';
import { GEL_TIME } from '../gel.js?v=114';
import { noise, seeded, phase, put, groundPlane, edgeLine, frameGeometry, risers, motes, ledgeBlocks, ledgeMesh } from '../kit.js?v=114';

const v3 = (a) => vec3(...a);

// a drum standing on end: a foot ring, banded sides, a domed top
function drum(r, h, d, bands, seg = 28) {
  const prof = [[0.001, 0], [r + 0.14, 0], [r + 0.14, 0.18], [r + 0.02, 0.24]];
  for (const b of bands) prof.push([r, b - 0.09], [r + 0.045, b - 0.06], [r + 0.045, b + 0.06], [r, b + 0.09]);
  prof.push([r, h]);
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); prof.push([r * Math.cos(a) + 0.001, h + d * Math.sin(a)]); }
  return new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

// riveted iron: a row of rivets round each band, rust run down from them,
// soot at the foot
function ironFor(R, r, bands) {
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.62, metalness: 0.45 });
  mat.colorNode = Fn(() => {
    const g = positionGeometry, ang = atan(g.z, g.x), y = g.y;
    let dy = abs(y.sub(bands[0]));
    for (const b of bands.slice(1)) dy = min(dy, abs(y.sub(b)));
    const arc = abs(fract(ang.div(Math.PI * 2).mul(R.rivets)).sub(0.5)).mul((2 * Math.PI * r) / R.rivets);
    const rivet = float(1).sub(smoothstep(0.022, 0.042, length(vec2(arc, dy))));
    const streak = smoothstep(0.55, 0.9, noise(vec2(ang.mul(5), y.mul(0.45))));
    const soot = smoothstep(1.3, 0.1, y).mul(0.45);
    const col = mix(v3(R.iron), v3(R.rust), streak.mul(0.65)).mul(noise(vec2(ang.mul(11), y.mul(3))).mul(0.25).add(0.85)).mul(float(1).sub(soot));
    return mix(col, v3(R.rivet), rivet);
  })();
  return mat;
}

export function boiler(sc, hx, hz) {
  const B = sc.T.scenery.boiler, rnd = seeded(5);
  const D = B.deck, E = B.edge, H = B.band, ew = E.width, bw = H.w;

  // the deck past the floor: tread plate, its lugs crossing cell by cell, into the dark
  groundPlane(sc, hx, hz, D.out, Fn(() => {
    const p = positionWorld.xz, u = p.div(D.tread), i = tfloor(u), f = fract(u).sub(0.5);
    const alt = fract(i.x.add(i.y).mul(0.5)).mul(2);
    const d = mix(length(vec2(f.x.mul(3.2), f.y)), length(vec2(f.x, f.y.mul(3.2))), alt);
    const lug = float(1).sub(smoothstep(0.3, 0.4, d)).mul(float(1).sub(smoothstep(0.12, 0.35, fwidth(u.x))));
    const col = mix(v3(D.lo), v3(D.hi), lug.mul(0.6).add(noise(p.mul(0.7)).mul(0.4)));
    const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0), far = clamp(length(vec2(dx, dz)).div(D.fade), 0, 1);
    return col.mul(float(1).sub(far.mul(far).mul(0.96)));
  })());

  // the glowing edge, and the hazard band round it: yellow and black, worn
  edgeLine(sc, hx, hz, E);
  const bandMat = new THREE.MeshBasicNodeMaterial();
  bandMat.colorNode = Fn(() => {
    const p = positionWorld.xz, s = p.x.add(p.y).div(H.stripe), tri = abs(fract(s).sub(0.5)).mul(2), aa = fwidth(s).mul(2);
    const yel = smoothstep(float(0.5).sub(aa), float(0.5).add(aa), tri);
    const wear = smoothstep(0.55, 0.85, noise(p.mul(2.7))).mul(0.55);
    return mix(mix(v3(H.black), v3(H.yellow), yel), v3(H.worn), wear);
  })();
  const band = sc._add(new THREE.Mesh(frameGeometry(hx, hz, ew, bw, 0), bandMat));
  band.position.y = -0.006; band.renderOrder = 1;

  // v101: the LOW STEEL WALL round the deck (the approved module sheet's riveted panels; never along the near
  // side, where the hazard band stays the edge): panels `len` m long on the band, two rows of rivets, a lighter
  // cap, lit orange at their foot by the fire in the deck's seams (floor.js boiler `veins`)
  const Wl = B.wall;
  if (Wl) {
    const wm = new THREE.MeshStandardNodeMaterial({ roughness: 0.55, metalness: 0.6 });
    wm.colorNode = Fn(() => {
      const p = positionWorld, top = smoothstep(0.55, 0.85, normalWorld.y), y = p.y;
      const along = p.x.add(p.z), rq = fract(along.div(Wl.rivetEvery)).sub(0.5).mul(Wl.rivetEvery);
      const row = min(abs(y.sub(Wl.rivetY[0])), abs(y.sub(Wl.rivetY[1])));
      const rivet = float(1).sub(smoothstep(0.022, 0.036, length(vec2(rq, row))));
      const grime = noise(vec2(along.mul(1.7), y.mul(3))).mul(0.25).add(0.8).mul(mix(float(Wl.footDark), float(1), smoothstep(0, 0.4, y)));
      return mix(v3(Wl.steel).mul(grime).add(v3(Wl.rivet).mul(rivet)), v3(Wl.cap), top);
    })();
    wm.emissiveNode = Fn(() => v3(Wl.glow).mul(float(1).sub(smoothstep(0, Wl.glowH, positionWorld.y)).mul(Wl.footGlow))
      .mul(float(1).sub(smoothstep(0.55, 0.85, normalWorld.y))))();
    ledgeMesh(sc, ledgeBlocks(hx, hz, Wl, 101), wm);
  }

  // the boilers, along the far side and past both its corners
  const R = B.boiler, run = 2 * (hx + R.side), nb = Math.max(2, Math.round(run / R.every)), zb = -(hz + R.out);
  const xs = Array.from({ length: nb }, (_, i) => -(hx + R.side) + ((i + 0.5) * run) / nb);
  const boilers = sc._add(new THREE.InstancedMesh(drum(R.r, R.h, R.dome, R.bands), ironFor(R, R.r, R.bands), nb));
  const plain = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...R.stackColor), roughness: 0.55, metalness: 0.55 });
  const stacks = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(R.stackR, R.stackR * 1.12, R.stack, 14), plain, nb));
  const caps = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(R.stackR * 1.4, R.stackR * 1.4, 0.16, 14), plain, nb));
  const frames = sc._add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), plain, nb));
  // the firebox door: an arched window, barred, the fire behind it breathing
  const fl = () => float(0.8).add(sin(GEL_TIME.mul(11).add(phase().mul(40))).mul(0.1)).add(sin(GEL_TIME.mul(23.7).add(phase().mul(17))).mul(0.07));
  const doorMat = new THREE.MeshBasicNodeMaterial();
  doorMat.colorNode = Fn(() => {
    const v = uv(), x = v.x.sub(0.5).mul(2), y = v.y, sp = 0.6;
    const square = smoothstep(0.8, 0.76, abs(x)).mul(smoothstep(0.1, 0.14, y)).mul(smoothstep(sp + 0.02, sp - 0.02, y));
    const arch = smoothstep(1.02, 0.96, length(vec2(x.div(0.78), y.sub(sp).div(0.32)))).mul(smoothstep(sp - 0.02, sp + 0.02, y));
    const win = max(square, arch), bar = smoothstep(0.32, 0.4, abs(fract(x.mul(2.2).add(0.5)).sub(0.5)));
    const fire = mix(v3(R.fireHi), v3(R.fireLo), y).mul(fl()).mul(R.fireGlow);
    return mix(v3(R.frame), fire, win.mul(float(1).sub(bar)));
  })();
  const doors = sc._add(new THREE.InstancedMesh(new THREE.PlaneGeometry(R.door[0], R.door[1]), doorMat, nb));
  // its light thrown on the deck in front of it
  const poolMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  poolMat.colorNode = v3(R.fireLo);
  poolMat.opacityNode = Fn(() => { const d = length(uv().sub(0.5)).mul(2); return float(1).sub(smoothstep(0, 1, d)).pow(2).mul(R.poolGain).mul(fl()); })();
  const pools = sc._add(new THREE.InstancedMesh(new THREE.PlaneGeometry(2 * R.pool, 2 * R.pool).rotateX(-Math.PI / 2), poolMat, nb));
  const top = R.h + R.dome - 0.06;
  xs.forEach((x, i) => {
    const jx = x + (rnd() - 0.5) * 0.4;
    put(boilers, i, jx, 0, zb, 1, 1, 1, 0, rnd() * 6.28, 0);
    put(stacks, i, jx, top + R.stack / 2, zb);
    put(caps, i, jx, top + R.stack, zb);
    put(frames, i, jx, R.doorY, zb + R.r - 0.06, R.door[0] + 0.18, R.door[1] + 0.18, 0.34);
    put(doors, i, jx, R.doorY, zb + R.r + 0.115);
    put(pools, i, jx, -0.016, zb + R.r + R.pool * 0.5);
    xs[i] = jx;
  });
  // steam out of every stack
  risers(sc, xs.map((x) => [x, top + R.stack + 0.1, zb]), B.steam);

  // the pipe run down each side: two pipes, flanged, standing off the floor
  const P = B.pipe, z0 = -(hz + P.back), z1 = hz + P.front, len = z1 - z0, zc = (z0 + z1) / 2;
  // v77: embers rising off the boilers and over the pipe runs, never over the floor
  const Mo = B.motes;
  motes(sc, [[0, zb, 2 * (hx + R.side), Mo.far, 0.5], [-(hx + P.out), 0, Mo.side, 2 * hz, 0.8], [hx + P.out, 0, Mo.side, 2 * hz, 0.8]], Mo);
  const pipeMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...P.color), roughness: 0.45, metalness: 0.7 });
  const flangeMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...P.flange), roughness: 0.4, metalness: 0.75 });
  const nf = Math.floor(len / P.every);
  const runs = [], flanges = [];
  for (const s of [-1, 1]) P.r.forEach((r, k) => runs.push([s * (hx + P.out), P.y[k], r]));
  const pipes = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2), pipeMat, runs.length));
  runs.forEach(([x, y, r], i) => { put(pipes, i, x, y, zc, r, r, len); for (let j = 0; j < nf; j++) flanges.push([x, y, z0 + (j + 0.5) * P.every, r]); });
  const fm = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2), flangeMat, flanges.length));
  flanges.forEach(([x, y, z, r], i) => put(fm, i, x, y, z, r * 1.22, r * 1.22, 0.16));
  // the valves: a riser off the top pipe, a red wheel on it, and steam let off now and then
  const V = B.valve, valves = [];
  for (const s of [-1, 1]) { const n = Math.max(1, Math.floor((2 * hz) / V.every)); for (let j = 0; j < n; j++) valves.push([s * (hx + P.out), -hz + ((j + 0.5) * 2 * hz) / n]); }
  const yTop = P.y[1] + P.r[1];
  const risersM = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.085, V.h, 10), flangeMat, valves.length));
  const wheelMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...V.color), roughness: 0.5, metalness: 0.35 });
  const wheels = sc._add(new THREE.InstancedMesh(new THREE.TorusGeometry(V.r, 0.035, 6, 20).rotateX(Math.PI / 2), wheelMat, valves.length));
  const spokes = sc._add(new THREE.InstancedMesh(new THREE.BoxGeometry(2 * V.r, 0.03, 0.04), wheelMat, 2 * valves.length));
  valves.forEach(([x, z], i) => {
    put(risersM, i, x, yTop + V.h / 2, z);
    put(wheels, i, x, yTop + V.h, z, 1, 1, 1, 0, rnd() * 3, 0);
    put(spokes, 2 * i, x, yTop + V.h, z, 1, 1, 1, 0, 0.4, 0); put(spokes, 2 * i + 1, x, yTop + V.h, z, 1, 1, 1, 0, 0.4 + Math.PI / 2, 0);
  });
  risers(sc, valves.map(([x, z]) => [x, yTop + V.h + 0.15, z]), B.vent);

  // smaller tanks behind the pipes, down both sides
  const K = B.tank, tanks = [];
  for (const s of [-1, 1]) { const n = Math.max(1, Math.floor((2 * hz) / K.every)); for (let j = 0; j < n; j++) tanks.push([s * (hx + K.out), -hz + ((j + 0.5 + (rnd() - 0.5) * 0.3) * 2 * hz) / n]); }
  const tm = sc._add(new THREE.InstancedMesh(drum(K.r, K.h, K.dome, K.bands, 22), ironFor(R, K.r, K.bands), tanks.length));
  tanks.forEach(([x, z], i) => put(tm, i, x, 0, z, 1, 1, 1, 0, rnd() * 6.28, 0));
}
