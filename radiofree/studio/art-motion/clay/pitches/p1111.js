// PITCH STILLS, 11 Nov (owner: "Start pitching new videos with cool visuals and interesting stories. Render and approve").
// Three hero frames in the night kit (clay/kit/night.js), one per pitch; ?s=seabed | runway | quiet picks the scene.
//   seabed   Fitburg: an anchor dragged along the seabed catches a data cable (Helsinki District Court, 5 Nov; not final)
//   runway   Protective Fence 26: Highway 9 at Jännevirta is closed 18–25 Nov; fighter jets land on it
//   quiet    Jokela (Tuusula): the planned data center drawn on the field as a plan of light; the emails (Aamuposti)
// These are pitch frames: the copy on them is a first draft, and every figure is re-read from its source before a build.
import { THREE, mergeGeometries, W, H, TAU, DEG, Q, clamp, lerp, smooth, rng, C3, V, hash2, fbm, canvasTex, std, lum, mesh, rbox, tinted, glowTex, glow, jag, ni,
  shadowed, castAll, uvOf, snowMaps, normalTex, canvasOf, makeSky, toScreen, shoot, spruceGeo, treeMat, plant, caption, out } from '../kit/night.js';

const MAG = '#F0027F', AMBER = '#f2b83a';
const tag = (g, text, x, y, { size = 30, col = 'rgba(236,242,255,.92)', align = 'left', bg = null } = {}) => { g.save(); g.font = `700 ${size}px RobotoCondensed`; g.textAlign = align; g.textBaseline = 'middle';
  if (bg) { const w = g.measureText(text).width + 36, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w + 18 : x - 18; g.fillStyle = bg; g.beginPath(); g.roundRect(x0, y - size * 0.85, w, size * 1.7, 8); g.fill(); }
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 8; g.fillStyle = col; g.fillText(text, x, y); g.restore(); };
const strut = (a, b, r = 0.04, seg = 5) => { const d = new THREE.Vector3().subVectors(b, a), g = new THREE.CylinderGeometry(r, r, d.length(), seg); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate(a.x, a.y, a.z); return g; };
// the twelve edges of a box, as thin beams (a plan drawn in light)
const wireBox = (w, h, d, t, o = [0, 0, 0]) => { const P = (x, y, z) => new THREE.Vector3(o[0] + x * w / 2, o[1] + (y + 1) * h / 2, o[2] + z * d / 2), E = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) { E.push(strut(P(-1, a, b), P(1, a, b), t, 4), strut(P(a, -1, b), P(a, 1, b), t, 4), strut(P(a, b, -1), P(a, b, 1), t, 4)); } return E; };

// ================================================================== A · THE SEABED (Fitburg)
function seabed() {
  const S = new THREE.Scene(), FOGC = C3('#03191a'); S.fog = new THREE.FogExp2(FOGC, 0.024); S.background = FOGC;
  const SUN = V([-0.5, 0.82, -0.28]).normalize();
  const sky = makeSky(S, { top: '#0c4644', hor: '#03191a', moon: SUN.toArray(), stars: 0 });
  S.add(new THREE.HemisphereLight('#2a8a78', '#02100e', 0.42));
  const sun = new THREE.DirectionalLight('#9ff0d8', 1.25); sun.target.position.set(0, 0, -8); sun.position.copy(sun.target.position).addScaledVector(SUN, 90); S.add(sun, sun.target);
  shadowed(sun, 2048, 5, 200, { once: true, bias: -0.0008, normalBias: 0.08 }); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 }); sun.shadow.camera.updateProjectionMatrix();
  // the drag: from far behind on the left to where the anchor is now
  const A0 = V([-34, 0, -54]), A1 = V([0.5, 0, -7]), DIR = A1.clone().sub(A0).normalize(), PERP = V([DIR.z, 0, -DIR.x]), LEN = A0.distanceTo(A1);
  const along = (x, z) => { const u = ((x - A0.x) * DIR.x + (z - A0.z) * DIR.z) / LEN; return [u, Math.abs((x - A0.x) * PERP.x + (z - A0.z) * PERP.z)]; };
  const gh = (x, z) => { const [u, d] = along(x, z), k = smooth((u + 0.05) / 0.1) * (1 - smooth((u - 0.985) / 0.03)); return (fbm(x / 9, z / 9, 3) - 0.5) * 0.9 + k * (-0.6 * Math.exp(-((d / 0.95) ** 2)) + 0.28 * Math.exp(-(((d - 1.7) / 0.7) ** 2))); };
  { const g = new THREE.PlaneGeometry(190, 190, 260, 260); g.rotateX(-Math.PI / 2); g.translate(0, 0, -40); const p = g.attributes.position, c = new Float32Array(p.count * 3), A = C3('#2f3d36'), B = C3('#141b18'), X = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), [u, d] = along(x, z); p.setY(i, gh(x, z)); X.copy(A).lerp(B, (u > 0 && u < 1 ? Math.exp(-((d / 1.1) ** 2)) * 0.85 : 0) + fbm(x / 3, z / 3, 2) * 0.25); c.set([X.r, X.g, X.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, std('#ffffff', { vertexColors: true, roughness: 1, ...snowMaps([46, 46]) })); m.userData.noCast = true; S.add(m); }
  // stones on the bottom
  { const g = ni(new THREE.IcosahedronGeometry(1, 2)), q = g.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i), k = 0.72 + fbm(x * 1.4 + 5, y * 1.4 + z * 1.9, 3) * 0.62; q.setXYZ(i, x * k, y * k * 0.55, z * k); } g.computeVertexNormals();
    const R = rng(4), list = []; for (let i = 0; i < 500 && list.length < 70; i++) { const x = (R() - 0.5) * 120, z = 20 - R() * 120; if (along(x, z)[1] < 4) continue; list.push([x, z, 0.25 + R() * R() * 1.6, R() * TAU]); }
    plant(S, g, std('#3d4a42', { roughness: 0.95, flatShading: true }), list, gh); }
  // the cable it has caught: pulled out of its line into a V, taut over the fluke
  const P0 = A1.clone().addScaledVector(DIR, -5.5), cablePts = [-60, -30, -13, -4].map((s) => P0.clone().addScaledVector(PERP, s).addScaledVector(DIR, s > -8 ? 4.2 : s > -20 ? 1.6 : 0)).concat([A1.clone().addScaledVector(DIR, 2.7).setY(0.34)], [4, 13, 30, 60].map((s) => P0.clone().addScaledVector(PERP, s).addScaledVector(DIR, s < 8 ? 4.2 : s < 20 ? 1.6 : 0)));
  cablePts.forEach((p, i) => { if (i !== 4) p.y = gh(p.x, p.z) + 0.16; });
  const cable = new THREE.CatmullRomCurve3(cablePts, false, 'catmullrom', 0.35);
  mesh(new THREE.TubeGeometry(cable, 400, 0.115, 10), std('#0b0c0e', { roughness: 0.45, metalness: 0.2 }), { parent: S });
  { const bands = []; for (let i = 6; i < 395; i += 9) { const p = cable.getPointAt(i / 400), t = cable.getTangentAt(i / 400); bands.push(new THREE.CylinderGeometry(0.125, 0.125, 0.3, 10).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t)).translate(p.x, p.y, p.z)); } mesh(mergeGeometries(bands), std('#d9b21c', { roughness: 0.6 }), { parent: S }); }
  // a second cable, already cut, back in the furrow: its fibres still carrying light
  for (const sgn of [-1, 1]) { const c0 = A0.clone().lerp(A1, 0.74).addScaledVector(PERP, sgn * 14), c1 = A0.clone().lerp(A1, 0.74).addScaledVector(PERP, sgn * 3.2).addScaledVector(DIR, 3.5), e = c1.clone().addScaledVector(PERP, -sgn * 1.2).addScaledVector(DIR, 1.2); [c0, c1].forEach((p) => { p.y = gh(p.x, p.z) + 0.16; }); e.y = gh(e.x, e.z) + 0.75;
    const cc = new THREE.CatmullRomCurve3([c0.clone().addScaledVector(PERP, sgn * 40), c0, c1, e]); mesh(new THREE.TubeGeometry(cc, 80, 0.115, 8), std('#0b0c0e', { roughness: 0.45 }), { parent: S });
    const R = rng(sgn + 3), tan = cc.getTangentAt(1); for (let k = 0; k < 11; k++) { const tip = e.clone().addScaledVector(tan, 0.3 + R() * 0.35).add(V([(R() - 0.5) * 0.4, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4])); S.add(new THREE.Mesh(strut(e, tip, 0.008, 4), std('#c8d2d0', { roughness: 0.3, metalness: 0.6 }))); mesh(new THREE.SphereGeometry(0.018, 6, 4), lum(3, 6, 7), { pos: tip.toArray(), parent: S }); glow(S, tip.toArray(), 0.5, 0.25, 0.75, 0.9); } }
  // the anchor: nose toward the ship that is pulling it, flukes dug in behind
  const AN = new THREE.Group(); S.add(AN); AN.position.copy(A1); AN.position.y = gh(A1.x, A1.z) + 0.62; AN.rotation.y = Math.atan2(DIR.x, DIR.z);
  const rustC = canvasOf(256, 256, (g) => { g.fillStyle = '#62544a'; g.fillRect(0, 0, 256, 256); const R = rng(8); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '150,80,40' : R() < 0.5 ? '30,26,24' : '110,100,90'},${0.08 + R() * 0.2})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 2 + R() * 14, 2 + R() * 9, R() * 3, 0, TAU); g.fill(); } });
  const rustT = new THREE.CanvasTexture(rustC); rustT.colorSpace = THREE.SRGBColorSpace; rustT.wrapS = rustT.wrapT = THREE.RepeatWrapping; const steel = std('#ffffff', { map: rustT, normalMap: normalTex(rustC, 3), roughness: 0.82, metalness: 0.35 });
  const shank = new THREE.Group(); AN.add(shank); shank.position.set(0, 0.7, -0.5); shank.rotation.x = -0.17;
  mesh(rbox(0.5, 0.56, 5.6, 0.1), steel, { pos: [0, 0, 2.8], parent: shank }); mesh(new THREE.TorusGeometry(0.5, 0.11, 8, 20), steel, { pos: [0, 0, 5.9], rot: [0, Math.PI / 2, 0], parent: shank }); mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 10), steel, { pos: [0, 0, 5.45], rot: [0, 0, Math.PI / 2], parent: shank });
  mesh(rbox(3.0, 1.0, 1.3, 0.22), steel, { pos: [0, 0.5, -0.5], parent: AN }); mesh(new THREE.CylinderGeometry(0.34, 0.34, 3.3, 14), steel, { pos: [0, 0.55, -0.5], rot: [0, 0, Math.PI / 2], parent: AN });
  for (const sx of [-1, 1]) { const f = new THREE.ConeGeometry(0.95, 3.4, 4); f.scale(1, 1, 0.3); mesh(f, steel, { pos: [sx * 1.12, -0.3, 0.9], rot: [Math.PI / 2 + 0.56, 0, 0], parent: AN }); mesh(rbox(0.62, 0.7, 1.0, 0.12), steel, { pos: [sx * 1.12, 0.45, -0.3], parent: AN }); mesh(rbox(0.5, 0.9, 0.5, 0.1), steel, { pos: [sx * 1.7, 0.75, -0.7], rot: [0, 0, -sx * 0.3], parent: AN }); }
  // the chain, link by link, up toward the ship
  { AN.updateMatrixWorld(true); const c0 = shank.localToWorld(V([0, 0, 6.4])), top = c0.clone().addScaledVector(DIR, 30).add(V([0, 46, 0])), pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(c0.clone().lerp(top, u).add(V([0, -11 * 4 * u * (1 - u) * (1 - u), 0]))); }
    const cc = new THREE.CatmullRomCurve3(pts), n = 96, link = new THREE.TorusGeometry(0.36, 0.09, 6, 14).scale(0.6, 1, 1), im = new THREE.InstancedMesh(link, steel, n), D = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * 0.9; D.position.copy(cc.getPointAt(u)); D.quaternion.setFromUnitVectors(up, cc.getTangentAt(u)).multiply(q2.setFromAxisAngle(up, (i % 2) * Math.PI / 2)); D.updateMatrix(); im.setMatrixAt(i, D.matrix); } S.add(im); }
  castAll(S);
  // silt thrown up behind the flukes and hanging in the furrow; marine snow everywhere
  { const R = rng(12); for (let i = 0; i < 40; i++) { const u = 0.99 - R() * 0.55, p = A0.clone().lerp(A1, u).addScaledVector(PERP, (R() - 0.5) * (3 + (1 - u) * 14)), sz = 2.2 + R() * 3.2 + Math.max(0, 1 - u) * 9, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.13, 0.17, 0.15), opacity: 0.16 + R() * 0.16, transparent: true, depthWrite: false })); sp.scale.set(sz * 1.5, sz, 1); sp.position.set(p.x, gh(p.x, p.z) + 0.3 + R() * sz * 0.35, p.z); S.add(sp); }
    const n = 2600, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([A1.x + (R() - 0.5) * 46, R() * 24, A1.z + (R() - 0.5) * 46], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    S.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 0.07, color: new THREE.Color(0.55, 0.95, 0.85), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  const cam = new THREE.PerspectiveCamera(58, W / H, 0.1, 4000); cam.position.copy(A1).addScaledVector(PERP, 3.4).addScaledVector(DIR, 12.2); cam.position.y = 5.0; { const L = A1.clone().addScaledVector(DIR, 0.2).addScaledVector(PERP, -1.2); cam.lookAt(L.x, 3.3, L.z); } cam.updateMatrixWorld(true); sky.follow(cam, 0);
  { const f = new THREE.PointLight('#d6f2ea', 430, 60, 2); f.position.copy(cam.position).add(V([0, 2.5, 0])).addScaledVector(PERP, 5); S.add(f); const r = new THREE.PointLight('#7fe6d0', 300, 40, 2); r.position.copy(A1).addScaledVector(DIR, -7).addScaledVector(PERP, -5).add(V([0, 5, 0])); S.add(r); }
  // shafts of light down through the water (the surface is far above the frame)
  { const sh = canvasTex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const gv = g.createLinearGradient(0, 0, 0, 256); gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.75, 'rgba(0,0,0,.25)'); gv.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gv; g.fillRect(0, 0, 64, 256); }), R = rng(19);
    for (let i = 0; i < 16; i++) { const w = 1.2 + R() * 3.4, m = new THREE.Mesh(new THREE.PlaneGeometry(w, 60), new THREE.MeshBasicMaterial({ map: sh, color: new THREE.Color(0.2, 0.62, 0.52), transparent: true, opacity: 0.1 + R() * 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.position.copy(A1).addScaledVector(DIR, -4 - R() * 40).addScaledVector(PERP, (R() - 0.5) * 34); m.position.y = 28; m.rotation.set(0, Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z), 0.2 + (R() - 0.5) * 0.08); S.add(m); } }
  const sc = uvOf(toScreen(cam, cam.position.clone().addScaledVector(SUN, 3000)));
  return { scene: S, cam, rays: null, grade: { exposure: 1.22, streak: 0.06, bloomA: 0.5, bloomB: 0.4, vignette: 0.62, lift: [0, 0.006, 0.008], gain: [0.95, 1.02, 1.02], contrast: 1.12 },
    overlay(g) { tag(g, 'GULF OF FINLAND · NEW YEAR 2025/26', 80, 150); tag(g, 'DRAGGED  079 / ~80 MILES', W - 80, 150, { align: 'right', col: AMBER });
      caption(g, ['An anchor,', 'dragged for', '[80 miles].'], 380, { size: 104, pop: AMBER }); tag(g, 'HELSINKI DISTRICT COURT · 5 NOV 2026 · NOT FINAL', W / 2, 1760, { align: 'center', bg: 'rgba(4,12,12,.72)' }); } };
}

// ================================================================== B · RUNWAY 9 (Protective Fence 26)
function hornet() {   // nose toward +z
  const G = new THREE.Group(), grey = std('#8a929d', { roughness: 0.55, metalness: 0.25 }), dark = std('#3a4048', { roughness: 0.6, metalness: 0.4 }), slime = lum(0.45, 1.05, 0.36);
  mesh(new THREE.CapsuleGeometry(0.78, 10.5, 8, 18), grey, { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.86], parent: G });
  mesh(new THREE.ConeGeometry(0.74, 3.6, 18), grey, { pos: [0, -0.02, 7.7], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.86], parent: G });
  mesh(new THREE.SphereGeometry(1, 18, 12), std('#0a0f18', { roughness: 0.06, metalness: 0.7, emissive: C3('#0c1422') }), { pos: [0, 0.62, 4.1], scale: [0.6, 0.52, 2.3], parent: G });
  const plan = (pts, t = 0.14) => { const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z))); pts.slice().reverse().forEach(([x, z]) => s.lineTo(-x, z)); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g; };
  mesh(plan([[0.5, 6.2], [1.35, 2.6], [1.55, 1.5], [5.75, -1.3], [5.75, -2.7], [1.2, -3.4]]), grey, { pos: [0, 0.2, 0], parent: G });
  mesh(plan([[0.9, -5.0], [3.4, -6.7], [3.4, -7.7], [0.9, -7.3]], 0.1), grey, { pos: [0, 0.05, 0], parent: G });
  for (const sx of [-1, 1]) { const s = new THREE.Shape(); [[-3.5, 0], [-5.5, 3.2], [-6.7, 3.2], [-6.3, 0]].forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath(); const fin = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }); fin.rotateY(-Math.PI / 2);
    mesh(fin, grey, { pos: [sx * 0.95, 0.45, 0], rot: [0, 0, -sx * 0.36], parent: G }); mesh(new THREE.BoxGeometry(0.03, 0.9, 0.1), slime, { pos: [sx * 1.6, 2.3, -5.9], rot: [0, 0, -sx * 0.36], parent: G });
    mesh(rbox(0.85, 0.75, 3.4, 0.2), grey, { pos: [sx * 1.1, -0.42, 1.2], parent: G }); mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), std('#050608'), { pos: [sx * 1.1, -0.42, 2.92], parent: G });
    mesh(new THREE.CylinderGeometry(0.52, 0.46, 2.4, 16, 1, true), dark, { pos: [sx * 0.58, -0.08, -6.6], rot: [Math.PI / 2, 0, 0], parent: G }); mesh(new THREE.CircleGeometry(0.44, 20), lum(5.5, 1.5, 0.3), { pos: [sx * 0.58, -0.08, -7.2], rot: [0, Math.PI, 0], parent: G }); glow(G, [sx * 0.58, -0.08, -7.95], 1.5, 1.0, 0.5, 0.16);
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.9, 8), std('#d8dce2', { roughness: 0.4 }), { pos: [sx * 5.9, 0.16, -1.6], rot: [Math.PI / 2, 0, 0], parent: G }); mesh(new THREE.ConeGeometry(0.09, 0.4, 8), std('#d8dce2'), { pos: [sx * 5.9, 0.16, 0.05], rot: [Math.PI / 2, 0, 0], parent: G });
    mesh(new THREE.SphereGeometry(0.07, 8, 6), sx < 0 ? lum(8, 0.3, 0.2) : lum(0.3, 8, 1.5), { pos: [sx * 5.78, 0.2, -1.3], parent: G }); glow(G, [sx * 5.78, 0.2, -1.2], 1.3, sx < 0 ? 1 : 0.08, sx < 0 ? 0.06 : 1, sx < 0 ? 0.05 : 0.3);
    mesh(new THREE.BoxGeometry(0.03, 0.12, 1.6), slime, { pos: [sx * 0.8, 0.25, 5.2], parent: G }); mesh(new THREE.BoxGeometry(1.4, 0.03, 0.12), slime, { pos: [sx * 4.9, 0.3, -2.0], parent: G });
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 8), dark, { pos: [sx * 1.35, -1.25, -0.9], rot: [0, 0, sx * 0.2], parent: G }); mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 16), std('#101114', { roughness: 0.9 }), { pos: [sx * 1.55, -2.0, -0.9], rot: [0, 0, Math.PI / 2], parent: G }); }
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), dark, { pos: [0, -1.5, 4.3], parent: G }); for (const sx of [-0.16, 0.16]) mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 14), std('#101114', { roughness: 0.9 }), { pos: [sx, -2.25, 4.3], rot: [0, 0, Math.PI / 2], parent: G });
  const lamp = mesh(new THREE.SphereGeometry(0.11, 10, 8), lum(14, 14, 12.5), { pos: [0, -1.2, 4.42], parent: G }); glow(G, [0, -1.2, 4.5], 7.5, 1.0, 0.98, 0.9); G.userData.lamp = lamp;
  mesh(new THREE.SphereGeometry(0.05, 8, 6), lum(9, 9, 9), { pos: [0, 0.95, -1.0], parent: G }); glow(G, [0, 0.95, -1.0], 1.6, 0.9, 0.9, 1.0);
  return G;
}
function runway() {
  const S = new THREE.Scene(), FOGC = C3('#0f2141'); S.fog = new THREE.Fog(FOGC, 0.011, 8.0045); S.background = FOGC;
  const MOON = V([0.42, 0.34, -0.84]).normalize(), sky = makeSky(S, { top: '#030611', hor: '#0f2141', moon: MOON.toArray(), aurora: 0.42, auroraAz: -0.55, stars: 1700 });
  S.add(new THREE.HemisphereLight('#3a5688', '#070a0e', 0.7));
  const moon = new THREE.DirectionalLight('#9dbcff', 2.2); moon.target.position.set(0, 0, -120); moon.position.copy(moon.target.position).addScaledVector(MOON, 320); S.add(moon, moon.target);
  shadowed(moon, 4096, 10, 800, { once: true, bias: -0.0006, normalBias: 0.3 }); Object.assign(moon.shadow.camera, { left: -180, right: 180, top: 260, bottom: -260 }); moon.shadow.camera.updateProjectionMatrix();
  // the highway: bare asphalt down the middle, packed snow toward the edges, banks, then the cleared verge and the forest
  const RW = 7.2, gy = (x, z) => { const a = Math.abs(x); return a < RW ? 0 : 0.55 * smooth((a - RW) / 1.2) * (1 - 0.6 * smooth((a - RW - 2.2) / 3)) + smooth((a - 16) / 30) * (fbm(x / 30, z / 30, 3) - 0.3) * 3; };
  { const g = new THREE.PlaneGeometry(360, 760, 240, 300); g.rotateX(-Math.PI / 2); g.translate(0, 0, -300); const p = g.attributes.position, c = new Float32Array(p.count * 3), A = C3('#14171c'), B = C3('#a9b8d2'), X = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.abs(x); p.setY(i, gy(x, z)); const snow = a < RW ? clamp(smooth((a - 4.9) / 1.7) + 0.5 * Math.exp(-((a / 0.5) ** 2)) + (fbm(x * 1.3, z / 14, 2) - 0.5) * 0.35 - 0.3 * (Math.exp(-(((a - 1.8) / 0.55) ** 2)) + Math.exp(-(((a - 3.6) / 0.5) ** 2))), 0.04, 1) : 1; X.copy(A).lerp(B, snow); c.set([X.r, X.g, X.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); const sm = snowMaps([90, 190]); sm.normalScale.set(0.28, 0.28); const m = new THREE.Mesh(g, std('#ffffff', { vertexColors: true, roughness: 0.9, ...sm })); m.userData.noCast = true; S.add(m); }
  { const marks = []; for (let z = 30; z > -640; z -= 12) marks.push(new THREE.BoxGeometry(0.16, 0.02, 3).translate(0, 0.015, z)); for (const sx of [-1, 1]) marks.push(new THREE.BoxGeometry(0.14, 0.02, 700).translate(sx * 5.6, 0.012, -310)); mesh(mergeGeometries(marks), std('#aab2c0', { roughness: 0.8 }), { parent: S }).userData.noShadow = true; }
  { const R = rng(31), sp = [], sp2 = []; for (let i = 0; i < 9000 && sp.length + sp2.length < 1500; i++) { const x = (R() - 0.5) * 300, z = 40 - R() * 640; if (Math.abs(x) < 17 + fbm(z / 40, 3, 2) * 9) continue; (R() < 0.55 ? sp : sp2).push([x, z, 0.8 + R() * 0.9, R() * TAU, (R() - 0.5) * 0.08]); }
    const tm = treeMat(); plant(S, spruceGeo(5, 7), tm, sp, gy); plant(S, spruceGeo(8, 6), tm, sp2, gy); }
  // snow stakes with reflectors, and the exercise's portable edge lights running off to a point
  { const poles = [], refl = [], pts = []; for (let z = 24; z > -620; z -= 25) for (const sx of [-1, 1]) { poles.push(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5).translate(sx * 8.3, 1.0, z)); refl.push(new THREE.BoxGeometry(0.07, 0.16, 0.07).translate(sx * 8.3, 1.55, z)); }
    for (let z = -6; z > -640; z -= 30) for (const sx of [-1, 1]) pts.push(sx * 6.6, 0.35, z);
    mesh(mergeGeometries(poles), std('#d8641e', { roughness: 0.7 }), { parent: S }); mesh(mergeGeometries(refl), lum(2.2, 1.9, 1.2), { parent: S });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); S.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 2.6, color: new THREE.Color(3.2, 2.8, 1.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  // the road block: two boards, amber flashers, a sign in both languages
  { const G = new THREE.Group(); S.add(G); G.position.set(0, 0, 6);
    const stripe = canvasTex(256, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f2ee' : '#c8201c'; g.fillRect(i * 32, 0, 32, 32); } });
    for (const [x, w] of [[-3.1, 5.4], [3.4, 4.8]]) { mesh(new THREE.BoxGeometry(w, 0.3, 0.05), std('#ffffff', { map: stripe, roughness: 0.6, emissive: C3('#ffffff'), emissiveMap: stripe, emissiveIntensity: 0.22 }), { pos: [x, 1.0, 0], parent: G }); for (const sx of [-1, 1]) { mesh(new THREE.BoxGeometry(0.07, 1.2, 0.5), std('#30333a'), { pos: [x + sx * (w / 2 - 0.3), 0.6, 0], parent: G }); mesh(new THREE.SphereGeometry(0.1, 10, 8), lum(9, 4.6, 0.6), { pos: [x + sx * (w / 2 - 0.3), 1.35, 0], parent: G }); glow(G, [x + sx * (w / 2 - 0.3), 1.35, 0.05], 1.9, 1.0, 0.5, 0.08); } }
    const sign = canvasTex(512, 300, (g) => { g.fillStyle = '#f2c81e'; g.fillRect(0, 0, 512, 300); g.strokeStyle = '#101010'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 280); g.fillStyle = '#101010'; g.textAlign = 'center'; g.font = '92px "Anton-400"'; g.fillText('TIE SULJETTU', 256, 128); g.font = '74px "Anton-400"'; g.fillText('ROAD CLOSED', 256, 236); });
    mesh(new THREE.BoxGeometry(2.3, 1.35, 0.05), std('#ffffff', { map: sign, emissive: C3('#ffffff'), emissiveMap: sign, emissiveIntensity: 0.3, roughness: 0.5 }), { pos: [0.15, 2.3, 0], parent: G }); mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), std('#30333a'), { pos: [0.15, 1.2, -0.05], parent: G }); }
  // the jets: one over the threshold with its landing light on, one behind it on approach
  const J = hornet(); S.add(J); J.position.set(-0.3, 8.0, -13); J.rotation.set(0.12, Math.PI, -0.035); castAll(J);
  
  const land = new THREE.SpotLight('#fff6e0', 16000, 320, 0.3, 0.9, 2); land.position.set(-0.3, 6.7, -18); land.target.position.set(0, 0, -120); S.add(land, land.target);
  castAll(S);
  { const R = rng(41); for (let i = 0; i < 26; i++) { const z = -9 - R() * 44, sz = 3 + R() * 6, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.42, 0.48, 0.62), opacity: 0.1 + R() * 0.1, transparent: true, depthWrite: false })); sp.scale.set(sz * 1.6, sz, 1); sp.position.set((R() - 0.5) * 12, 0.6 + R() * 2.4, z); S.add(sp); } }
  // our own headlights, and snow in them
  for (const sx of [-0.7, 0.7]) { const h = new THREE.SpotLight('#ffe9c4', 900, 90, 0.42, 0.8, 2); h.position.set(1.8 + sx, 0.75, 24); h.target.position.set(1.8 + sx * 2, 0, -20); S.add(h, h.target); }
  { const R = rng(3), n = 2200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(R() - 0.5) * 34, R() * 15, 26 - R() * 70], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    S.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 0.1, color: new THREE.Color(1.0, 1.05, 1.2), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  const cam = new THREE.PerspectiveCamera(56, W / H, 0.2, 6000); cam.position.set(1.8, 1.3, 26); cam.lookAt(0.2, 7.4, -36); cam.updateMatrixWorld(true); sky.follow(cam, 0);
  S.updateMatrixWorld(true); const lc = uvOf(toScreen(cam, J.localToWorld(V([0, -0.08, -7.6]))));
  return { scene: S, cam, rays: lc ? { c: lc, k: 0.35, r: 0.2, cut: 3.5 } : null, grade: { exposure: 1.22, streak: 0.24 },
    overlay(g) {   // the dashboard and its sat-nav
      g.save(); const y0 = 1500; const gr = g.createLinearGradient(0, y0 - 40, 0, H); gr.addColorStop(0, 'rgba(6,8,12,0)'); gr.addColorStop(0.12, 'rgba(6,8,12,.97)'); gr.addColorStop(1, '#030407'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, y0 + 60); g.quadraticCurveTo(W / 2, y0 - 70, W, y0 + 60); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
      g.fillStyle = 'rgba(4,5,8,.96)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(46, 0); g.lineTo(0, 620); g.closePath(); g.fill(); g.beginPath(); g.moveTo(W, 0); g.lineTo(W - 46, 0); g.lineTo(W, 620); g.closePath(); g.fill();
      const x = 170, y = 1560, w = 740, h = 290; g.shadowColor = 'rgba(80,160,255,.35)'; g.shadowBlur = 40; g.fillStyle = '#0b1220'; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#2a3550'; g.lineWidth = 4; g.stroke();
      g.save(); g.beginPath(); g.roundRect(x, y, w, h, 22); g.clip(); g.strokeStyle = '#1d2b47'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(x + i * 70 - 60, y); g.lineTo(x + i * 70 + 40, y + h); g.stroke(); }
      g.strokeStyle = '#3c5a9a'; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 150, y + h + 10); g.lineTo(x + 150, y + 60); g.stroke(); g.strokeStyle = MAG; g.lineWidth = 10; g.setLineDash([16, 14]); g.beginPath(); g.moveTo(x + 150, y + 150); g.lineTo(x + 150, y + 40); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + 150, y + 190); g.lineTo(x + 128, y + 240); g.lineTo(x + 150, y + 228); g.lineTo(x + 172, y + 240); g.closePath(); g.fill(); g.restore();
      g.fillStyle = MAG; g.beginPath(); g.roundRect(x + 250, y + 34, 450, 62, 10); g.fill(); g.font = '700 38px RobotoCondensed'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('ROAD 9 CLOSED AHEAD', x + 475, y + 67);
      g.textAlign = 'left'; g.fillStyle = '#dfe7fa'; g.font = '600 36px RobotoCondensed'; g.fillText('Reason: fighter jets', x + 252, y + 142); g.fillStyle = '#8fa3cc'; g.font = '600 30px RobotoCondensed'; g.fillText('JÄNNEVIRTA · 18–25 NOV', x + 252, y + 192); g.fillText('Rerouting…', x + 252, y + 238); g.restore();
      caption(g, ['In 300 meters,', 'give way to', '[fighter jets].'], 330, { size: 100, pop: AMBER }); } };
}

// ================================================================== C · KEEP IT QUIET (Jokela)
function quiet() {
  const S = new THREE.Scene(), FOGC = C3('#0d1c38'); S.fog = new THREE.Fog(FOGC, 0.0042, 7.0026); S.background = FOGC;
  const MOON = V([-0.48, 0.3, -0.82]).normalize(), sky = makeSky(S, { top: '#02050f', hor: '#0d1c38', moon: MOON.toArray(), aurora: 0.5, auroraAz: 0.5, stars: 2000 });
  S.add(new THREE.HemisphereLight('#3a5688', '#070a0e', 0.7));
  const moon = new THREE.DirectionalLight('#a9c2ff', 2.1); moon.target.position.set(0, 0, -90); moon.position.copy(moon.target.position).addScaledVector(MOON, 420); S.add(moon, moon.target);
  shadowed(moon, 4096, 10, 1000, { once: true, bias: -0.0006, normalBias: 0.3 }); Object.assign(moon.shadow.camera, { left: -240, right: 240, top: 240, bottom: -240 }); moon.shadow.camera.updateProjectionMatrix();
  const gy = (x, z) => (fbm(x / 60 + 3, z / 60 + 1, 3) - 0.5) * 2.4 * smooth((-z - 20) / 60) + smooth((-z - 330) / 160) * 9;
  { const g = new THREE.PlaneGeometry(900, 900, 220, 220); g.rotateX(-Math.PI / 2); g.translate(0, 0, -330); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, gy(p.getX(i), p.getZ(i))); g.computeVertexNormals();
    const m = new THREE.Mesh(g, std('#a9b8d2', { roughness: 0.95, ...snowMaps([220, 220]) })); m.userData.noCast = true; S.add(m); }
  // the village street in front: wooden houses, snow on the roofs, somebody still up in each
  const house = (x, z, w, d, h, ry, col, lit) => { const G = new THREE.Group(); S.add(G); G.position.set(x, gy(x, z), z); G.rotation.y = ry; const wall = std(col, { roughness: 0.9 }), white = std('#e9e6dd'), warm = lum(2.6, 1.7, 0.7);
    mesh(new THREE.BoxGeometry(w, h, d), wall, { pos: [0, h / 2, 0], parent: G }); const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.5, 0); s.lineTo(0, w * 0.36); s.lineTo(w / 2 + 0.5, 0); s.closePath();
    mesh(new THREE.ExtrudeGeometry(s, { depth: d + 0.9, bevelEnabled: false }).translate(0, h, -d / 2 - 0.45), std('#b9c6dc', { roughness: 1, ...snowMaps([3, 3]) }), { parent: G });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, h, 0.2), white, { pos: [sx * w / 2, h / 2, sz * d / 2], parent: G });
    const n = Math.max(2, Math.round(w / 3.2)); for (let i = 0; i < n; i++) { const wx = -w / 2 + (i + 0.5) * w / n; for (const sz of [-1, 1]) { mesh(new THREE.BoxGeometry(1.3, 1.5, 0.08), white, { pos: [wx, h * 0.55, sz * (d / 2 + 0.02)], parent: G }); const on = lit.includes(i); mesh(new THREE.PlaneGeometry(1.08, 1.28), on ? warm : std('#0c1220', { roughness: 0.2 }), { pos: [wx, h * 0.55, sz * (d / 2 + 0.07)], rot: [0, sz > 0 ? 0 : Math.PI, 0], parent: G }); if (on) glow(G, [wx, h * 0.55, sz * (d / 2 + 0.3)], 2.6, 0.8, 0.45, 0.16); } }
    mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), std('#5a4a44'), { pos: [w * 0.22, h + w * 0.36, 0], parent: G }); for (let k = 0; k < 5; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.58, 0.72), transparent: true, opacity: 0.2 - k * 0.03, depthWrite: false })); sp.position.set(w * 0.22 + k * 1.0, h + w * 0.36 + 1.4 + k * 2.2, -k * 0.5); sp.scale.setScalar(2 + k * 1.6); G.add(sp); } return G; };
  house(-13, -6, 10, 7, 3.6, 0.22, '#8a241b', [0, 2]); house(8, -15, 9, 6.5, 3.4, -0.3, '#c9a03c', [1]); house(-4, -40, 11, 7, 3.8, 0.1, '#e4dfd2', [0, 1]); house(27, -34, 8.5, 6, 3.3, 0.5, '#8a241b', [1]); house(-34, -30, 9, 6.5, 3.5, -0.15, '#6f8c9a', [2]); house(16, -62, 9.5, 6.5, 3.5, 0.2, '#c9a03c', []);
  { const pts = []; for (const [x, z] of [[-2, -3], [-1, -24], [10, -46], [-18, -20]]) { mesh(new THREE.CylinderGeometry(0.06, 0.09, 6, 8), std('#3a3f52'), { pos: [x, gy(x, z) + 3, z], parent: S }); mesh(new THREE.SphereGeometry(0.2, 10, 8), lum(7, 4.6, 2), { pos: [x, gy(x, z) + 6.1, z], parent: S }); glow(S, [x, gy(x, z) + 6.1, z], 2.6, 1.0, 0.62, 0.25); const l = new THREE.PointLight('#ffb468', 120, 34, 2); l.position.set(x, gy(x, z) + 5.9, z); S.add(l); } }
  { const R = rng(17), sp = [], sp2 = []; for (let i = 0; i < 9000 && sp.length + sp2.length < 1500; i++) { const x = (R() - 0.5) * 760, z = 30 - R() * 720, field = x > -170 && x < 230 && z < -50 && z > -330, village = Math.abs(x) < 46 && z > -74; if (field || village) continue; if (fbm(x / 60 + 7, z / 60, 2) < 0.4 && z > -340) continue; (R() < 0.55 ? sp : sp2).push([x, z, 0.8 + R() * 0.9, R() * TAU, (R() - 0.5) * 0.08]); }
    const tm = treeMat(); plant(S, spruceGeo(5, 7), tm, sp, gy); plant(S, spruceGeo(8, 6), tm, sp2, gy); }
  castAll(S);
  // the plan, drawn on the field in light: 76 diesel generators in two rows, the hall behind them, the 110 kV line going away
  const beams = [], hot = [], G0 = V([-60, 0, -62]), STEP = V([3.5, 0, -1.25]), ROWV = V([-5.2, 0, -14.6]);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 38; i++) { const p = G0.clone().addScaledVector(STEP, i).addScaledVector(ROWV, r), y = gy(p.x, p.z) + 0.25, yaw = Math.atan2(ROWV.x, ROWV.z);
    const parts = [...wireBox(3.0, 3.3, 11.5, 0.12), ...wireBox(0.7, 2.6, 0.7, 0.08, [0.6, 3.3, -3.6]), ...wireBox(2.2, 0.8, 3.2, 0.08, [0, 3.3, 2.6])].map((g) => g.rotateY(yaw).translate(p.x, y, p.z)); ((i + r * 2) % 5 === 0 ? hot : beams).push(...parts); }
  for (let i = 0; i <= 38; i += 2) { const a = G0.clone().addScaledVector(STEP, i - 0.5).addScaledVector(ROWV, -0.6), b = a.clone().addScaledVector(ROWV, 2.2); a.y = gy(a.x, a.z) + 0.2; b.y = gy(b.x, b.z) + 0.2; beams.push(strut(a, b, 0.05, 3)); }
  for (const k of [-0.6, 0.5, 1.6]) { const a = G0.clone().addScaledVector(STEP, -0.5).addScaledVector(ROWV, k), b = G0.clone().addScaledVector(STEP, 38.5).addScaledVector(ROWV, k); a.y = gy(a.x, a.z) + 0.2; b.y = gy(b.x, b.z) + 0.2; beams.push(strut(a, b, 0.05, 3)); }
  const HALL = V([12, 0, -168]); beams.push(...wireBox(150, 17, 78, 0.2).map((g) => g.rotateY(0.34).translate(HALL.x, gy(HALL.x, HALL.z), HALL.z)), ...wireBox(150, 0.1, 26, 0.12, [0, 17, 0]).map((g) => g.rotateY(0.34).translate(HALL.x, gy(HALL.x, HALL.z), HALL.z)));
  for (let k = -3; k <= 3; k++) beams.push(...wireBox(0.3, 17, 78, 0.07, [k * 21.4, 0, 0]).map((g) => g.rotateY(0.34).translate(HALL.x, gy(HALL.x, HALL.z), HALL.z)));
  for (let k = 0; k < 4; k++) { const p = V([120 + k * 62, 0, -150 - k * 46]), y = gy(p.x, p.z), T0 = (x, yy) => new THREE.Vector3(p.x + x, y + yy, p.z); beams.push(strut(T0(-3, 0), T0(-0.6, 34), 0.1, 4), strut(T0(3, 0), T0(0.6, 34), 0.1, 4), strut(T0(-9, 27), T0(9, 27), 0.1, 4), strut(T0(-6, 31), T0(6, 31), 0.1, 4), strut(T0(-3, 0), T0(3, 12), 0.07, 4), strut(T0(3, 0), T0(-3, 12), 0.07, 4));
    if (k < 3) for (const sx of [-9, 0, 9]) beams.push(strut(T0(sx, 27), new THREE.Vector3(p.x + 62 + sx, gy(p.x + 62, p.z - 46) + 27, p.z - 46), 0.04, 3)); }
  const plan = new THREE.Mesh(mergeGeometries(beams), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.9, 2.6), transparent: true, opacity: 0.92, fog: false })), planHot = new THREE.Mesh(mergeGeometries(hot), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.5, 0.3), fog: false })); S.add(plan, planHot);
  { const R = rng(9); for (let i = 0; i < 46; i++) { const p = G0.clone().addScaledVector(STEP, R() * 38).addScaledVector(ROWV, R()), sz = 14 + R() * 20, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.05, 0.3, 0.42), opacity: 0.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(sz * 1.8, sz * 0.5, 1); sp.position.set(p.x, gy(p.x, p.z) + sz * 0.18, p.z); S.add(sp); } }
  { const R = rng(3), n = 1800, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(R() - 0.5) * 60, R() * 26, 40 - R() * 80], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    S.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 0.12, color: new THREE.Color(1.0, 1.05, 1.2), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  const cam = new THREE.PerspectiveCamera(56, W / H, 0.3, 6000); cam.position.set(0, 7.5, 36); cam.lookAt(3, 13.5, -80); cam.updateMatrixWorld(true); sky.follow(cam, 0);
  const mc = uvOf(toScreen(cam, cam.position.clone().addScaledVector(MOON, 3000)));
  return { scene: S, cam, rays: mc ? { c: mc, k: 0.5, r: 0.3 } : null, grade: { exposure: 1.2, streak: 0.16 },
    overlay(g) {   // the phone's volume slider, dragged all the way down
      const x = 300, y = 150, w = 480, h = 92; g.save(); g.fillStyle = 'rgba(16,20,30,.86)'; g.beginPath(); g.roundRect(x, y, w, h, 46); g.fill(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 6; g.lineJoin = 'round'; const sx = x + 44, sy = y + h / 2; g.beginPath(); g.moveTo(sx - 12, sy - 9); g.lineTo(sx - 2, sy - 9); g.lineTo(sx + 12, sy - 20); g.lineTo(sx + 12, sy + 20); g.lineTo(sx - 2, sy + 9); g.lineTo(sx - 12, sy + 9); g.closePath(); g.fill();
      g.strokeStyle = MAG; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx + 26, sy - 14); g.lineTo(sx + 54, sy + 14); g.moveTo(sx + 54, sy - 14); g.lineTo(sx + 26, sy + 14); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 10; g.beginPath(); g.moveTo(x + 130, sy); g.lineTo(x + w - 46, sy); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 130, sy, 15, 0, TAU); g.fill(); g.restore();
      caption(g, ['The town asked for', 'help keeping it', '[quiet].'], 400, { size: 96 });
      tag(g, 'PLANNED · 96 MW · 76 DIESEL BACKUP GENERATORS', W / 2, 760, { align: 'center', col: '#8fe9ff', bg: 'rgba(4,10,20,.6)' });
      tag(g, 'EMAILS TO ITS PR AGENCY · AAMUPOSTI', W / 2, 1700, { align: 'center', bg: 'rgba(6,8,14,.72)' }); tag(g, 'THE TOWN: NOTHING WAS HIDDEN', W / 2, 1764, { align: 'center', col: AMBER, bg: 'rgba(6,8,14,.72)' }); } };
}

const BUILD = { seabed, runway, quiet }, which = Q.get('s') || 'seabed'; let X = null;
function frame() { X = X || BUILD[which](); const g = shoot(X.scene, X.cam, { K: Number(Q.get('k') || 4), grade: X.grade, rays: X.rays, seed: 3 }); if (X.overlay && !Q.get('clean')) X.overlay(g); return out; }
window.__film = { fps: 30, frames: 1, events: { end: 1 }, report: { look: 'night kit', pitch: which }, frame() { return frame().toDataURL('image/jpeg', 0.92); }, still() { return frame().toDataURL('image/png'); } };
window.__ready = true;
