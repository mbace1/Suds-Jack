// core.js — WORLD 9, THE CORE (v72, from its brief, art-ref/briefs/world-9-core.md).
// The machine at the bottom of everything: a dark deck traced in a grid,
// power running in along the traces toward the floor in rings; towers along
// the far side and the two sides, lit windows in bands, capped, some with an
// antenna blinking at its tip and the tallest ringed by a hoop of neon a light
// chases round; beams of light standing along the far side, pulsing down the
// row; and the floor's edge with light running round it. Never along the near
// side. Every number TUNING.scenery.core
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, sin, abs, max, mix, smoothstep, length, clamp, fract, fwidth, atan, uv, instanceIndex, positionWorld, positionLocal, positionGeometry, normalGeometry } from 'three/tsl';
import { GEL_TIME } from '../gel.js?v=152';
import { noise, seeded, phase, put, stations, groundPlane } from '../kit.js?v=152';

const v3 = (a) => vec3(...a);
const hex = (h) => vec3(...new THREE.Color(h).toArray());

export function core(sc, hx, hz) {
  const C = sc.T.scenery.core, rnd = seeded(9), G = C.ground;

  // the deck: a grid of traces, power running in along them in rings, into the dark
  groundPlane(sc, hx, hz, G.out, Fn(() => {
    const p = positionWorld.xz;
    const c = p.div(G.cell), f = abs(fract(c).sub(0.5)).mul(2), aa = fwidth(c.x).add(fwidth(c.y));
    const line = smoothstep(float(0.94).sub(aa), float(0.985), max(f.x, f.y));
    const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0), dist = length(vec2(dx, dz));
    const pulse = smoothstep(0.8, 1, fract(dist.div(G.pulseEvery).add(GEL_TIME.mul(G.pulseSpeed))));
    const col = mix(v3(G.lo), v3(G.hi), noise(p.mul(0.4)).mul(0.7).add(noise(p.mul(1.7)).mul(0.3)))
      .add(mix(v3(G.line), v3(G.pulse), pulse).mul(line).mul(float(0.6).add(pulse.mul(1.6))));
    const far = clamp(dist.div(G.fade), 0, 1);
    return col.mul(float(1).sub(far.mul(far).mul(0.95)));
  })());

  // the edge: a glowing line with light running round it, the same way all the way round
  const E = C.edge, w = E.width;
  for (const [sx, sz, x, z, run] of [[2 * hx + 2 * w, w, 0, -(hz + w / 2), (p) => p.x], [2 * hx + 2 * w, w, 0, hz + w / 2, (p) => p.x.negate()],
    [w, 2 * hz, -(hx + w / 2), 0, (p) => p.z.negate()], [w, 2 * hz, hx + w / 2, 0, (p) => p.z]]) {
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.colorNode = Fn(() => {
      const dash = smoothstep(0.8, 1, fract(run(positionWorld).div(E.dash).sub(GEL_TIME.mul(E.speed))));
      return hex(E.color).mul(float(E.glow).add(dash.mul(E.dashGlow)));
    })();
    sc._add(new THREE.Mesh(new THREE.BoxGeometry(sx, E.height, sz), mat)).position.set(x, E.height / 2, z);
  }

  // v101: low NEON STUMPS (the approved module sheet's, at most 1.2 m: the towers before them made a city skyline
  // of the machine): a dark drum on a base, neon lines up its side, a bright rim round its top and the top
  // itself lit, rings going out across it. Along the far side and the two sides, never the near one
  const St = C.stump;
  if (St) {
    const ss = stations(hx, hz, rnd, { every: St.every, out: St.out, jitter: 0.6 });
    const stumps = ss.map(([x, z]) => [x, z, St.r[0] + rnd() * (St.r[1] - St.r[0]), St.h[0] + rnd() * (St.h[1] - St.h[0])]);
    const sm = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...St.color), roughness: 0.35, metalness: 0.55 });
    sm.emissiveNode = Fn(() => {
      const g = positionGeometry, top = smoothstep(0.5, 0.8, normalGeometry.y), a = atan(g.z, g.x), y = g.y.add(0.5);
      const lines = smoothstep(0.93, 0.99, sin(a.mul(St.lines)).mul(0.5).add(0.5)).mul(float(1).sub(top));
      const rimTop = float(1).sub(smoothstep(0, 0.05, float(1).sub(y))).mul(float(1).sub(top));
      const rimFoot = float(1).sub(smoothstep(0, 0.04, abs(y.sub(0.1)))).mul(float(1).sub(top));
      const rr = length(g.xz).mul(2), rings = smoothstep(0.8, 1, sin(rr.mul(18).sub(GEL_TIME.mul(St.ringSpeed)).add(phase().mul(6.283))).mul(0.5).add(0.5));
      const face = top.mul(float(St.topGlow).mul(float(1).sub(rr.mul(0.4))).add(rings.mul(St.ringGlow)));
      return hex(St.neon).mul(lines.mul(St.glowI).add(rimTop.mul(St.glowI * 1.4)).add(rimFoot.mul(St.glowI * 0.6)).add(face));
    })();
    const body = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.54, 1, 36), sm, stumps.length));
    const base = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.66, 0.72, 0.1, 36), new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...St.base), roughness: 0.5, metalness: 0.5 }), stumps.length));
    stumps.forEach(([x, z, r, h], i) => { put(body, i, x, h / 2 + 0.06, z, 2 * r, h, 2 * r); put(base, i, x, 0.05, z, 2 * r, 1, 2 * r); });
  } else {
    // the towers: lit windows in bands, a cap on each
    const Tw = C.tower, spots = stations(hx, hz, rnd, { every: Tw.every, out: Tw.out, jitter: 0.5 });
    const towers = spots.map(([x, z]) => [x, z, Tw.h[0] + rnd() * (Tw.h[1] - Tw.h[0]), Tw.w[0] + rnd() * (Tw.w[1] - Tw.w[0]), Tw.w[0] + rnd() * (Tw.w[1] - Tw.w[0])]);
    const towerMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...Tw.color), roughness: 0.4, metalness: 0.5 });
    towerMat.emissiveNode = Fn(() => {
      const y = positionGeometry.y.add(0.5), side = abs(positionGeometry.x).max(abs(positionGeometry.z));
      const band = float(1).sub(smoothstep(0.06, 0.1, abs(fract(y.mul(Tw.bands)).sub(0.5)))).mul(smoothstep(0.92, 0.88, y));
      const win = smoothstep(0.35, 0.45, abs(fract(positionGeometry.x.add(positionGeometry.z).mul(Tw.windows)).sub(0.5)));
      const on = smoothstep(0.35, 0.6, noise(vec2(phase().mul(37), tfloorY(y, Tw.bands)).add(GEL_TIME.mul(0.05))));
      return hex(Tw.glow).mul(band.mul(win).mul(on.mul(0.75).add(0.25)).mul(Tw.glowI).mul(smoothstep(0.45, 0.5, side)));
    })();
    const tm = sc._add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, towers.length));
    const capMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...Tw.cap), roughness: 0.35, metalness: 0.6 });
    const cm = sc._add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), capMat, towers.length));
    towers.forEach(([x, z, h, wx, wz], i) => { put(tm, i, x, h / 2, z, wx, h, wz); put(cm, i, x, h + 0.06, z, wx * 1.18, 0.12, wz * 1.18); });

    // antennas on some, a light blinking at each tip
    const A = C.antenna, ants = towers.filter(() => rnd() < A.chance).map(([x, z, h, wx, wz]) => [x + (rnd() - 0.5) * wx * 0.5, z + (rnd() - 0.5) * wz * 0.5, h + 0.12, A.h[0] + rnd() * (A.h[1] - A.h[0])]);
    const mast = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.04, 1, 6).translate(0, 0.5, 0), capMat, ants.length));
    const tipMat = new THREE.MeshBasicNodeMaterial();
    tipMat.colorNode = hex(A.color).mul(smoothstep(0.55, 0.75, sin(GEL_TIME.mul(A.rate).add(phase().mul(6.283))).mul(0.5).add(0.5)).mul(A.glow).add(0.15));
    const tips = sc._add(new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), tipMat, ants.length));
    ants.forEach(([x, z, y, h], i) => { put(mast, i, x, y, z, 1, h, 1); put(tips, i, x, y + h, z); });

    // a hoop of neon round the tallest, a light chasing round it, bobbing
    const R = C.ring, tall = towers.filter(([, , h]) => h >= R.minH);
    const ringMat = new THREE.MeshBasicNodeMaterial();
    ringMat.colorNode = Fn(() => {
      const a = atan(positionGeometry.z, positionGeometry.x).div(6.2832);
      const chase = smoothstep(0.75, 1, fract(a.sub(GEL_TIME.mul(R.speed)).add(phase())));
      return hex(R.color).mul(float(R.glow).add(chase.mul(R.chaseGlow)));
    })();
    ringMat.positionNode = positionLocal.add(vec3(0, sin(GEL_TIME.mul(R.bob).add(phase().mul(6.283))).mul(0.12), 0));
    const rm = sc._add(new THREE.InstancedMesh(new THREE.TorusGeometry(1, R.tube, 6, 40).rotateX(Math.PI / 2), ringMat, tall.length));
    tall.forEach(([x, z, h, wx, wz], i) => { const r = Math.max(wx, wz) * R.r; put(rm, i, x, h * R.at, z, r, 1, r); });

  }

  // beams of light standing along the far side, pulsing down the row
  const P = C.pillar, n = Math.max(2, Math.round((2 * hx) / P.every));
  const beamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  beamMat.colorNode = hex(P.color);
  beamMat.opacityNode = Fn(() => {
    const y = uv().y, pulse = smoothstep(0.5, 1, sin(GEL_TIME.mul(P.speed).sub(instanceIndex.toFloat().mul(P.lag))).mul(0.5).add(0.5));
    return float(P.alpha).mul(float(1).sub(y).pow(1.5)).mul(pulse.mul(0.8).add(0.2));
  })();
  const beams = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(P.r, P.r * 1.15, P.h, 18, 1, true).translate(0, P.h / 2, 0), beamMat, n));
  const padMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(P.color).multiplyScalar(P.padGlow) });
  const pads = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(P.r * 1.3, P.r * 1.5, 0.1, 18), padMat, n));
  for (let i = 0; i < n; i++) { const x = -hx + ((i + 0.5) * 2 * hx) / n; put(beams, i, x, 0, -(hz + P.out)); put(pads, i, x, 0.05, -(hz + P.out)); }
}

// which band of windows a point is in, as a number (so each band lights on its own)
const tfloorY = (y, bands) => y.mul(bands).floor();
