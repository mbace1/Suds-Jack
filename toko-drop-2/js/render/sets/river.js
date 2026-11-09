// river.js — WORLD 6, THE RIVER (v72, from its brief,
// art-ref/briefs/world-6-river.md). The river runs on past both ends of the
// floor between its pebbled banks, old piles standing in it and the water
// foaming round them; past the banks wet mud and then grass, rounded river
// stones with moss on their tops, reeds and cattails, a log or two washed up.
// Lily pads float on the water and drift the way the current rule pushes
// (kit.js DRIFT), so the push is something you can see. Never along the near
// side. Every number TUNING.scenery.river; the water's own TUNING.worlds.floor.river
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, fract, sin, abs, max, mix, smoothstep, length, atan, uv, clamp, positionWorld, positionGeometry, normalGeometry, normalWorld } from 'three/tsl';
import { GEL_TIME } from '../gel.js?v=126';
import { noise, hash, seeded, put, groundPlane, edgeLine, stoneGeometry, bladeClump, lilyPads, DRIFT, motes } from '../kit.js?v=126';

const v3 = (a) => vec3(...a);

export function river(sc, hx, hz) {
  const V = sc.T.scenery.river, F = sc.T.worlds.floor.river, rnd = seeded(6);
  const alongX = hx >= hz, L = alongX ? hx : hz, Wd = alongX ? hz : hx, wet = Wd * F.bank;
  const xz = (a, c) => (alongX ? [a, c] : [c, a]);
  // the banks and the ends that are not the near side
  const banks = alongX ? [-1] : [-1, 1], ends = alongX ? [-1, 1] : [-1];

  // the ground: past the ends the river runs on between its pebbled banks, as
  // the floor draws it; past the banks wet mud, then the grass; into the dusk
  const G = V.ground, Pd = V.pads;
  groundPlane(sc, hx, hz, G.out, Fn(() => {
    const p = positionWorld.xz, a = alongX ? p.x : p.y, c = alongX ? p.y : p.x, ac = abs(c);
    const flow = a.sub(GEL_TIME.mul(F.flow));
    const streak = smoothstep(0.88, 1.0, sin(flow.mul(1.1).add(noise(vec2(flow.mul(0.25), c.mul(0.7))).mul(7)).add(noise(p.mul(0.9)).mul(2))).mul(0.5).add(0.5));
    let water = mix(v3(F.water), v3(F.waterHi), streak.mul(0.14).add(noise(vec2(flow.mul(0.6), c.mul(1.4))).mul(0.07)));
    const lp = lilyPads(p.sub(DRIFT), Pd.cell, Pd.keep);
    water = mix(water, mix(v3(Pd.lo), v3(Pd.hi), lp.y), lp.x).add(v3(Pd.flower).mul(lp.z));
    const peb = v3(F.pebble).mul(noise(p.mul(2.8)).mul(0.5).add(noise(p.mul(7.1)).mul(0.3)).add(0.45));
    // v99: the shore wanders as the floor's does (floor.js river), so the two meet at the floor's ends
    const wob = F.shore ? noise(vec2(a.mul(F.shore.scale), 3.7)).sub(0.5).mul(2 * F.shore.amp) : float(0), wetAt = wob.add(F.bank).mul(Wd);
    const inRiver = smoothstep(Wd + 0.05, Wd - 0.05, ac), inWater = smoothstep(wetAt.add(0.15), wetAt.sub(0.15), ac);
    const grass = mix(v3(G.grassLo), v3(G.grassHi), noise(p.mul(1.3)).mul(0.6).add(noise(p.mul(4.7)).mul(0.4)));
    const bank = mix(grass, v3(G.mud).mul(noise(p.mul(3.3)).mul(0.4).add(0.8)), smoothstep(Wd + G.mudW, Wd, ac));
    const col = mix(bank, mix(peb, water, inWater), inRiver);
    const dx = max(abs(p.x).sub(hx), 0), dz = max(abs(p.y).sub(hz), 0), far = clamp(length(vec2(dx, dz)).div(G.fade), 0, 1);
    return col.mul(float(1).sub(far.mul(far).mul(0.93)));
  })());
  edgeLine(sc, hx, hz, V.edge);

  // river stones: along the banks, and a few out in the water past the ends
  const S = V.stone, stones = [], wetStones = [];
  for (const s of banks) {
    const n = Math.floor((2 * (L + S.past)) / S.every);
    for (let i = 0; i < n; i++) {
      if (rnd() < S.skip) continue;
      const r = S.r[0] + rnd() * (S.r[1] - S.r[0]);   // clear of the floor by `out`: a stone never stands in the fight
      stones.push([...xz(-(L + S.past) + (i + 0.5 + (rnd() - 0.5) * 0.8) * S.every, s * (Wd + r * 1.3 + S.out[0] + rnd() * (S.out[1] - S.out[0]))), r]);
    }
  }
  for (const e of ends) for (let i = 0; i < S.inWater; i++) wetStones.push([...xz(e * (L + 1 + rnd() * S.waterPast), (rnd() * 2 - 1) * wet * 0.85), S.wetR[0] + rnd() * (S.wetR[1] - S.wetR[0])]);
  const stoneMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.78, metalness: 0 });
  stoneMat.colorNode = Fn(() => {
    const p = positionWorld, n = normalWorld;
    const base = mix(v3(S.lo), v3(S.hi), noise(p.xz.mul(2.3).add(p.y)).mul(0.7).add(noise(p.xz.mul(7)).mul(0.3)));
    const moss = smoothstep(0.5, 0.85, n.y).mul(smoothstep(0.3, 0.6, noise(p.xz.mul(1.9).add(p.y.mul(2)))));
    return mix(base, v3(S.moss), moss).mul(float(1).sub(smoothstep(0.22, 0, p.y).mul(0.5)));
  })();
  const all = [...stones, ...wetStones];
  const sm = sc._add(new THREE.InstancedMesh(stoneGeometry(61, 2, 0.28), stoneMat, all.length));
  all.forEach(([x, z, r], i) => put(sm, i, x, r * 0.18, z, r * (0.9 + rnd() * 0.4), r * 0.62, r * (0.9 + rnd() * 0.3), 0, rnd() * 6.28, 0));

  // reeds and cattails, in clumps along the banks
  const R = V.reed, reeds = [];
  for (const s of banks) {
    const n = Math.floor((2 * (L + R.past)) / R.every);
    for (let i = 0; i < n; i++) if (rnd() > R.skip) reeds.push(xz(-(L + R.past) + (i + 0.5 + (rnd() - 0.5) * 0.9) * R.every, s * (Wd + R.out[0] + rnd() * (R.out[1] - R.out[0]))));
  }
  const reedMat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
  reedMat.colorNode = mix(v3(R.lo), v3(R.hi), uv().y);
  const rm = sc._add(new THREE.InstancedMesh(bladeClump(rnd, R), reedMat, reeds.length));
  const tails = [];
  reeds.forEach(([x, z], i) => {
    const h = R.h[0] + rnd() * (R.h[1] - R.h[0]);
    put(rm, i, x, 0, z, h, h, h, 0, rnd() * 6.28, 0);
    for (let k = 0; k < R.tails; k++) if (rnd() < 0.6) tails.push([x + (rnd() - 0.5) * 0.5, z + (rnd() - 0.5) * 0.5, h * (0.95 + rnd() * 0.25), (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.2]);
  });
  const stalkMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...R.hi), roughness: 0.8 });
  const headMat = new THREE.MeshStandardNodeMaterial({ color: new THREE.Color(...R.head), roughness: 0.9 });
  const stalks = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.02, 1, 5).translate(0, 0.5, 0), stalkMat, tails.length));
  const heads = sc._add(new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 8), headMat, tails.length));
  tails.forEach(([x, z, h, tx, tz], i) => {
    put(stalks, i, x, 0, z, 1, h, 1, tx, 0, tz);
    put(heads, i, x + Math.sin(tz) * -h * 0.86, h * 0.86, z + Math.sin(tx) * h * 0.86, 1, 1, 1, tx, 0, tz);
  });

  // a log or two washed up on each bank: bark down its length, rings at its ends
  const Lg = V.log, logs = [];
  for (const s of banks) for (let i = 0; i < Lg.per; i++) logs.push([(rnd() * 2 - 1) * L * 0.8, s * (Wd + Lg.out[0] + rnd() * (Lg.out[1] - Lg.out[0])), Lg.len[0] + rnd() * (Lg.len[1] - Lg.len[0]), Lg.r[0] + rnd() * (Lg.r[1] - Lg.r[0])]);
  const logMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
  logMat.colorNode = Fn(() => {
    const g = positionGeometry, cap = smoothstep(0.6, 0.8, abs(normalGeometry.x));
    const bark = mix(v3(Lg.bark), v3(Lg.barkHi), smoothstep(0.45, 0.75, noise(vec2(g.x.mul(9), atan(g.z, g.y).mul(2.5)))));
    const rings = mix(v3(Lg.wood), v3(Lg.wood).mul(0.6), smoothstep(0.3, 0.5, abs(fract(length(g.yz).mul(6)).sub(0.5))));
    return mix(bark, rings, cap);
  })();
  const lm = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2), logMat, logs.length));
  logs.forEach(([a, c, len, r], i) => { const [x, z] = xz(a, c); put(lm, i, x, r * 0.8, z, len, r, r, 0, (alongX ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.5, 0); });

  // v77: fireflies over the banks at dusk
  const Mo = V.motes;
  motes(sc, banks.map((s) => { const [x, z] = xz(0, s * (Wd + Mo.out + Mo.deep / 2)); return alongX ? [x, z, 2 * (L + 4), Mo.deep, 0.3] : [x, z, Mo.deep, 2 * (L + 4), 0.3]; }), Mo);

  // old piles standing across the river past each end, the water foaming round them
  const Pl = V.pile, piles = [];
  for (const e of ends) for (const at of Pl.at) {
    const n = Math.max(2, Math.round((2 * wet) / Pl.every));
    for (let i = 0; i < n; i++) if (rnd() > Pl.skip) piles.push([...xz(e * (L + at + (rnd() - 0.5) * 0.4), -wet + ((i + 0.5) * 2 * wet) / n), Pl.h[0] + rnd() * (Pl.h[1] - Pl.h[0])]);
  }
  const pileMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
  pileMat.colorNode = Fn(() => mix(v3(Pl.wet), v3(Pl.wood), smoothstep(0.1, 0.6, positionWorld.y)).mul(noise(vec2(atan(positionGeometry.z, positionGeometry.x).mul(3), positionWorld.y.mul(4))).mul(0.3).add(0.8)))();
  const pm = sc._add(new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.08, 1, 9).translate(0, 0.5, 0), pileMat, piles.length));
  piles.forEach(([x, z, h], i) => { const r = Pl.r[0] + rnd() * (Pl.r[1] - Pl.r[0]); put(pm, i, x, -0.1, z, r, h, r, (rnd() - 0.5) * 0.12, rnd() * 6, (rnd() - 0.5) * 0.12); });
  // the foam round everything standing in the water
  const Fm = V.foam, foamAt = [...piles.map(([x, z]) => [x, z, 0.5]), ...wetStones.map(([x, z, r]) => [x, z, r])];
  const foamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });   // v104: foam is white water, not a glow
  foamMat.colorNode = v3(Fm.color);
  foamMat.opacityNode = Fn(() => {
    const d = length(uv().sub(0.5)).mul(2), ph = hash(positionWorld.xz.mul(0.73).floor());
    const k = fract(GEL_TIME.div(Fm.period).add(ph)), rad = mix(float(0.45), float(1), k);
    const ring = float(1).sub(smoothstep(0, 0.07, abs(d.sub(rad)))).mul(float(1).sub(k)), lap = float(1).sub(smoothstep(0.35, 0.55, d)).mul(0.45);
    return ring.add(lap).mul(smoothstep(0.35, 0.75, noise(uv().mul(9).add(GEL_TIME.mul(0.7))))).mul(Fm.gain);
  })();
  const fm = sc._add(new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), foamMat, foamAt.length));
  foamAt.forEach(([x, z, r], i) => put(fm, i, x, -0.012, z, r * Fm.r, 1, r * Fm.r));
}
