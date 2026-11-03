// ice.js — WORLD 7, THE ICE (v72, from its brief, art-ref/briefs/world-7-ice.md).
// A snowfield round the floor, ribbed by the wind and with snow blowing over
// it; clusters of ice crystals along the far side and the two sides, each a
// few six-sided prisms coming to a point and leaning out from one root, lit
// from inside and brighter at the edge; drifts banked against their feet, and
// rocks with snow on their tops between them. Never along the near side.
// Every number TUNING.scenery.ice; the floor's frost and bubbles are floor.js
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, sin, abs, max, mix, smoothstep, length, clamp, positionWorld, positionGeometry, normalView, normalWorld } from 'three/tsl';
import { GEL_TIME } from '../gel.js?v=115';
import { noise, seeded, put, stations, groundPlane, edgeLine, stoneGeometry, motes, ledgeBlocks, ledgeMesh } from '../kit.js?v=115';

const v3 = (a) => vec3(...a);

export function ice(sc, hx, hz) {
  const I = sc.T.scenery.ice, rnd = seeded(7), G = I.ground;

  // the snowfield: ridged by the wind, snow blowing across it, into the night
  groundPlane(sc, hx, hz, G.out, Fn(() => {
    const p = positionWorld.xz;
    const rid = sin(p.x.mul(1.3).add(p.y.mul(0.4)).add(noise(p.mul(0.35)).mul(5))).mul(0.5).add(0.5);
    let col = mix(v3(G.lo), v3(G.hi), rid.mul(0.3).add(noise(p.mul(1.1)).mul(0.7)));
    const wisp = smoothstep(0.6, 0.92, noise(vec2(p.x.mul(0.22).sub(GEL_TIME.mul(G.wind)), p.y.mul(1.4)))).mul(noise(p.mul(0.4).add(GEL_TIME.mul(0.08))));
    col = col.add(v3(G.wisp).mul(wisp.mul(G.wispGain)));
    const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0), far = clamp(length(vec2(dx, dz)).div(G.fade), 0, 1);
    // v100: into the day's haze (the world's sky), not into the dark: the night was taken off the ice in v95, and
    // fading to black left a dark band across the top of a portrait view between the snowfield and the sky
    return mix(col, v3(sc.T.worlds.floor.ice.sky), far.mul(far).mul(0.94));
  })());
  edgeLine(sc, hx, hz, I.edge);

  // v100: the LEDGE — the approved picture's frozen river runs between raised banks of ice, cut straight down
  // where they meet it. Blocks along the far side and both long sides (never the near side), each its own
  // length, depth and height so the top steps, now and then a lower step in front; their face clear blue from
  // its foot to a pale lip, streaked where melt ran down it and lit from inside at the foot; snow on top
  const Lg = I.ledge;
  if (Lg) {
    const blocks = ledgeBlocks(hx, hz, Lg, 100);
    const lm = new THREE.MeshStandardNodeMaterial({ roughness: Lg.rough, metalness: 0 });   // glossy, it mirrored the pale sky and read grey
    lm.colorNode = Fn(() => {
      const p = positionWorld, hgt = positionGeometry.y, top = smoothstep(0.55, 0.85, normalWorld.y);
      const melt = noise(vec2(p.x.add(p.z).mul(5.3), p.y.mul(0.9))).mul(Lg.melt).add(1 - Lg.melt * 0.5);
      const face = mix(v3(Lg.foot), v3(Lg.face), smoothstep(0, 0.75, hgt)).mul(melt);
      const lip = smoothstep(0.84, 1, hgt).mul(float(1).sub(top)).mul(Lg.rim);
      const snow = v3(Lg.snow).mul(noise(p.xz.mul(3.1)).mul(0.08).add(0.94));
      return mix(mix(face, v3(Lg.lip), lip), snow, top);
    })();
    // the face is lit from inside: daylight through the ice (`through`, all up it) and glowing at its foot (`footGlow`)
    lm.emissiveNode = Fn(() => {
      const hgt = positionGeometry.y, side = float(1).sub(smoothstep(0.55, 0.85, normalWorld.y));
      return v3(Lg.glow).mul(float(1).sub(smoothstep(0, 0.45, hgt)).mul(Lg.footGlow).add(Lg.through)).mul(side);
    })();
    ledgeMesh(sc, blocks, lm);
  }

  // v77: snow falling over the whole view
  motes(sc, [[0, 0, 2 * (hx + I.motes.out), 2 * (hz + I.motes.out), 0]], I.motes);

  // the crystal clusters: a tall one near upright, the rest shorter and leaning out
  const C = I.crystal, roots = stations(hx, hz, rnd, { every: C.every, out: C.out, jitter: 0.7 }), crystals = [];
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion(), m = new THREE.Matrix4(), s = new THREE.Vector3(), t = new THREE.Vector3();
  for (const [x, z] of roots) {
    const k = C.n[0] + Math.floor(rnd() * (C.n[1] - C.n[0] + 1)), big = C.h[0] + rnd() * (C.h[1] - C.h[0]);
    for (let j = 0; j < k; j++) {
      const a = rnd() * Math.PI * 2, lean = j ? C.lean[0] + rnd() * (C.lean[1] - C.lean[0]) : rnd() * 0.15, off = j ? 0.15 + rnd() * C.spread : 0;
      const h = j ? big * (0.35 + rnd() * 0.45) : big, r = h * (C.thick[0] + rnd() * (C.thick[1] - C.thick[0]));
      crystals.push([x + Math.cos(a) * off, z + Math.sin(a) * off, Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean), r, h]);
    }
  }
  const geo = new THREE.LatheGeometry([[0.0001, -0.12], [1, -0.12], [0.92, 0.74], [0.0001, 1]].map(([a, b]) => new THREE.Vector2(a, b)), 6);
  const iceMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.12, metalness: 0, flatShading: true });
  iceMat.colorNode = mix(v3(C.deep), v3(C.pale), positionGeometry.y.clamp(0, 1));
  iceMat.emissiveNode = Fn(() => {
    const rim = float(1).sub(abs(normalView.z)).pow(2);
    return v3(C.glow).mul(rim.mul(C.rim).add(positionGeometry.y.clamp(0, 1).mul(C.inner)));
  })();
  const cm = sc._add(new THREE.InstancedMesh(geo, iceMat, crystals.length));
  crystals.forEach(([x, z, dx, dy, dz, r, h], i) => {
    q.setFromUnitVectors(up, dir.set(dx, dy, dz).normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(up, rnd() * Math.PI));
    cm.setMatrixAt(i, m.compose(t.set(x, 0, z), q, s.set(r, h, r)));
  });

  // drifts banked against the clusters' feet, and between them
  const D = I.drift, drifts = [];
  roots.forEach(([x, z, nx, nz]) => { if (rnd() < D.chance) drifts.push([x + nx * (0.3 + rnd() * 0.3) + (rnd() - 0.5) * 0.8 * nz, z + nz * (0.3 + rnd() * 0.3) + (rnd() - 0.5) * 0.8 * nx, nx, nz]); });
  const snowMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  snowMat.colorNode = Fn(() => mix(v3(D.lo), v3(D.hi), noise(positionWorld.xz.mul(1.7)).mul(0.5).add(normalWorld.y.mul(0.5))))();
  const dm = sc._add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 22, 12), snowMat, drifts.length));
  drifts.forEach(([x, z, nx, nz], i) => {
    const l = D.len[0] + rnd() * (D.len[1] - D.len[0]);
    put(dm, i, x, -D.h * 0.15, z, l, D.h * (0.7 + rnd() * 0.6), l * D.w, 0, Math.atan2(nx, nz) + (rnd() - 0.5) * 0.4, 0);
  });

  // rocks with snow on their tops, between the clusters
  const R = I.rock, rocks = stations(hx, hz, rnd, { every: R.every, out: R.out, jitter: 0.9 });
  const rockMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0, flatShading: true });
  rockMat.colorNode = Fn(() => mix(v3(R.lo).mul(noise(positionWorld.xz.mul(3)).mul(0.5).add(0.75)), v3(R.snow), smoothstep(0.45, 0.72, normalWorld.y)))();
  const rkm = sc._add(new THREE.InstancedMesh(stoneGeometry(71, 1, 0.35), rockMat, rocks.length));
  rocks.forEach(([x, z], i) => { const r = R.r[0] + rnd() * (R.r[1] - R.r[0]); put(rkm, i, x, r * 0.2, z, r, r * (0.6 + rnd() * 0.4), r * (0.8 + rnd() * 0.4), 0, rnd() * 6.28, 0); });
}
