// deep.js — WORLD 8, THE DEEP (v72, from its brief, art-ref/briefs/world-8-deep.md).
// The seabed round the floor: silt in slow ripples going into the black, lit
// only by what lives there. Kelp in clumps along the far side and the two
// sides, ribbons swaying in the swell with their tips glowing; boulders with
// barnacles on their tops; anemones at their feet, their tentacles' tips
// lit; and vents breathing bubbles up out of the silt. Never along the near
// side. Every number TUNING.scenery.deep
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, sin, cos, abs, max, mix, smoothstep, length, clamp, fract, uv, positionWorld, positionLocal, positionGeometry, normalWorld } from 'three/tsl';
import { GEL_TIME } from '../gel.js?v=130';
import { noise, seeded, phase, put, stations, groundPlane, edgeLine, stoneGeometry, risers, merge, motes, ledgeBlocks, ledgeMesh } from '../kit.js?v=130';

const v3 = (a) => vec3(...a);

// a sway for an instanced thing a metre tall (scaled up): its foot holds,
// its top swings, on a beat of its own
const sway = (amp, speed, bend) => Fn(() => {
  const h = positionGeometry.y.max(0), ph = phase().mul(6.283), t = GEL_TIME.mul(speed);
  const k = h.pow(bend).mul(amp);
  return positionLocal.add(vec3(sin(t.add(ph)).mul(k), 0, cos(t.mul(0.83).add(ph.mul(1.7))).mul(k).mul(0.7)));
})();

export function deep(sc, hx, hz) {
  const D = sc.T.scenery.deep, rnd = seeded(8), G = D.ground;

  // the seabed: silt in slow ripples, faintly blue, into the black
  groundPlane(sc, hx, hz, G.out, Fn(() => {
    const p = positionWorld.xz;
    const rip = smoothstep(0.62, 1, sin(p.x.mul(1.3).add(p.y.mul(0.55)).add(noise(p.mul(0.4)).mul(5))).mul(0.5).add(0.5));
    const col = mix(v3(G.lo), v3(G.hi), rip.mul(0.45).add(noise(p.mul(1.3)).mul(0.55)));
    const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0), far = clamp(length(vec2(dx, dz)).div(G.fade), 0, 1);
    return col.mul(float(1).sub(far.mul(far).mul(0.96)));
  })());
  edgeLine(sc, hx, hz, D.edge);

  // v101: the BANKS — the approved picture's seabed is sunk between raised rims of rock, a cold blue light running
  // down their faces from the lip; silt on their tops. Never along the near side (kit.js ledgeBlocks)
  const Bk = D.bank;
  if (Bk) {
    const bm = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
    bm.colorNode = Fn(() => {
      const top = smoothstep(0.55, 0.85, normalWorld.y), p = positionWorld;
      const grit = noise(vec2(p.x.add(p.z).mul(4.1), p.y.mul(6))).mul(0.35).add(0.75);
      return mix(v3(Bk.face).mul(grit), v3(Bk.top).mul(noise(p.xz.mul(2.7)).mul(0.4).add(0.8)), top);
    })();
    bm.emissiveNode = Fn(() => {
      const hgt = positionGeometry.y, side = float(1).sub(smoothstep(0.55, 0.85, normalWorld.y));
      const fall = noise(vec2(positionWorld.x.add(positionWorld.z).mul(3.3), hgt.mul(1.5))).mul(0.5).add(0.6);   // light running down in streaks
      return v3(Bk.glow).mul(hgt.pow(3).mul(Bk.lipGlow).add(Bk.faceGlow).mul(fall)).mul(side);
    })();
    ledgeMesh(sc, ledgeBlocks(hx, hz, Bk, 108), bm);
  }

  // v77: marine snow sinking through the whole view
  motes(sc, [[0, 0, 2 * (hx + D.motes.out), 2 * (hz + D.motes.out), 0]], D.motes);

  // kelp: ribbons a metre tall twisting up their length, in clumps, swaying
  const K = D.kelp, clumps = stations(hx, hz, rnd, { every: K.every, out: K.out, jitter: 0.8 }), blades = [];
  for (const [x, z] of clumps) { const n = K.n[0] + Math.floor(rnd() * (K.n[1] - K.n[0] + 1)); for (let j = 0; j < n; j++) blades.push([x + (rnd() - 0.5) * 1.1, z + (rnd() - 0.5) * 1.1, K.h[0] + rnd() * (K.h[1] - K.h[0])]); }
  const ribbon = new THREE.PlaneGeometry(K.w, 1, 1, 14).translate(0, 0.5, 0), rp = ribbon.getAttribute('position');
  for (let i = 0; i < rp.count; i++) { const y = rp.getY(i), a = y * K.twist, x = rp.getX(i) * (1 - 0.55 * y); rp.setXYZ(i, x * Math.cos(a), y, x * Math.sin(a)); }
  ribbon.computeVertexNormals();
  const kelpMat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.7, metalness: 0 });
  kelpMat.colorNode = mix(v3(K.lo), v3(K.hi), uv().y);
  // beads of light down its middle, twinkling, and a little at its tip
  kelpMat.emissiveNode = Fn(() => {
    const v = uv(), bead = float(1).sub(smoothstep(0.1, 0.2, length(vec2(v.x.sub(0.5).mul(0.7), fract(v.y.mul(K.beads)).sub(0.5)))));
    const tw = sin(GEL_TIME.mul(1.7).add(phase().mul(9)).sub(v.y.mul(6))).mul(0.5).add(0.5);
    return v3(K.glow).mul(bead.mul(tw).mul(smoothstep(0.15, 0.4, v.y)).add(smoothstep(0.9, 1, v.y).mul(0.4)).mul(K.glowI));
  })();
  kelpMat.positionNode = sway(K.sway, K.speed, 1.6);
  const km = sc._add(new THREE.InstancedMesh(ribbon, kelpMat, blades.length));
  km.frustumCulled = false;
  blades.forEach(([x, z, h], i) => put(km, i, x, 0, z, h * (0.8 + rnd() * 0.4), h, h * (0.8 + rnd() * 0.4), 0, rnd() * 6.28, 0));

  // boulders, barnacles on their tops
  const B = D.boulder, bs = stations(hx, hz, rnd, { every: B.every, out: B.out, jitter: 0.9 });
  const rockMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
  rockMat.colorNode = Fn(() => {
    const p = positionWorld, top = smoothstep(0.2, 0.7, normalWorld.y);
    const base = mix(v3(B.lo), v3(B.hi), noise(p.xz.mul(2.1).add(p.y)).mul(0.7).add(noise(p.xz.mul(6.3)).mul(0.3)));
    const bar = smoothstep(0.72, 0.8, noise(vec2(p.x.add(p.y), p.z.sub(p.y)).mul(B.barnacles))).mul(top);
    return mix(base, v3(B.barnacle), bar);
  })();
  const bm = sc._add(new THREE.InstancedMesh(stoneGeometry(81, 2, 0.3), rockMat, bs.length));
  const feet = [];
  bs.forEach(([x, z, nx, nz], i) => {
    const r = B.r[0] + rnd() * (B.r[1] - B.r[0]), push = Math.max(0, r * 1.25 - (Math.abs(nx) ? Math.abs(x) - hx : Math.abs(z) - hz));
    const bx = x - nx * push, bz = z - nz * push;   // never over the edge: pushed back from the floor if it would be
    put(bm, i, bx, r * 0.25, bz, r * (0.9 + rnd() * 0.3), r * (0.7 + rnd() * 0.3), r * (0.9 + rnd() * 0.3), 0, rnd() * 6.28, 0);
    if (rnd() < B.anemone) feet.push([bx + nx * (r * 1.05) + (rnd() - 0.5) * 0.6 * nz, bz + nz * (r * 1.05) + (rnd() - 0.5) * 0.6 * nx]);
  });

  // anemones at the boulders' feet: tentacles round a root, their tips lit, swaying
  const A = D.anemone, cones = [];
  for (let j = 0; j < A.n; j++) {
    const az = (j / A.n) * Math.PI * 2 + (j % 2) * 0.2, lean = 0.25 + (j % 3) * 0.22, c = new THREE.ConeGeometry(A.r, 1, 6, 4).translate(0, 0.5, 0);
    c.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(az) * lean, 0, -Math.cos(az) * lean))).translate(Math.cos(az) * 0.08, 0, Math.sin(az) * 0.08);
    cones.push(c);
  }
  const anMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.6, metalness: 0 });
  anMat.colorNode = mix(v3(A.lo), v3(A.hi), positionGeometry.y.clamp(0, 1));
  anMat.emissiveNode = Fn(() => {
    const tip = smoothstep(0.55, 0.95, positionGeometry.y);
    return mix(v3(A.glow), v3(A.glow2), phase().greaterThan(0.5).select(float(1), float(0))).mul(tip.mul(A.glowI).mul(sin(GEL_TIME.mul(2.1).add(phase().mul(17))).mul(0.25).add(0.75)));
  })();
  anMat.positionNode = sway(A.sway, A.speed, 1.4);
  const am = sc._add(new THREE.InstancedMesh(merge(cones), anMat, feet.length));
  am.frustumCulled = false;
  feet.forEach(([x, z], i) => { const s = A.h[0] + rnd() * (A.h[1] - A.h[0]); put(am, i, x, 0, z, s, s, s, 0, rnd() * 6.28, 0); });

  // vents in the silt breathing bubbles up
  const vents = stations(hx, hz, rnd, { every: D.vent.every, out: D.vent.out, jitter: 0.9 });
  const ventMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(...D.vent.color) });
  const vm = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.32, 0.18, 10), ventMat, vents.length));
  vents.forEach(([x, z], i) => put(vm, i, x, 0.09, z));
  risers(sc, vents.map(([x, z]) => [x, 0.2, z]), D.bubbles);
}
