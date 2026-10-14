// STYLE 1 — Aardman plasticine.
//
// Matte modelling clay you can see the thumbs in, chunky forms, a set of clay
// and corrugated card, one warm practical lamp doing the work and the cold
// window behind. Focus sits on the mask; the city goes to soft bokeh.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boot } from './lib/stage.js';
import { surface } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { buildKid, buildArms, buildToy } from './lib/cast.js';
import { skyPlane, facadeFlat, cathedral, rainStreaks, canvas, tex, dropMaterial } from './lib/city.js';

boot(async ({ scene, camera, renderer, q }) => {
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // ---------------------------------------------------------------- clays
  const clay = (color, o = {}) => surface({ color, wrap: 0.45, wrapTint: '#ffc6a0', rough: 0.6, bump: 1, lump: 0.05, lumpF: 0.5, thumb: 0.035, thumbCell: 2.0, ridge: 0.12, tool: 0.8, grain: 0.004, grainF: 8, mottle: 0.10, specks: 0.6, roughVar: 0.12, ...o });
  const M = {
    jumper: clay('#bf8d2f', { thumbCell: 1.5, thumb: 0.05, tool: 1.3 }),
    collar: clay('#c47f26'),
    trousers: clay('#3a5682', { thumb: 0.045, tool: 1.2 }),
    socks: clay('#2f6f6a'),
    skin: clay('#e3a07a', { specks: 0.3 }),
    hat: clay('#b8432b', { tool: 1.2, thumbCell: 1.5 }),
    hatBrim: clay('#a63b26', { thumb: 0.04, ridge: 0.09, tool: 1.6, thumbCell: 1.0 }),
    pompom: clay('#efe2c4', { thumb: 0.06, ridge: 0.08, thumbCell: 0.7, lump: 0.08, lumpF: 1.6 }),
    hair: clay('#5a3420', { tool: 1.6, thumbCell: 0.8 }),
    head: clay('#5a3420', { tool: 2.0, thumbCell: 0.9, ridge: 0.1, thumb: 0.05 }),
    maskDisc: clay('#d4026f', { rough: 0.62, thumb: 0.03, thumbCell: 1.5, mottle: 0.06, specks: 0.3, speckColor: '#5a0730' }),
    maskInk: clay('#fbf4e6', { rough: 0.55, thumb: 0.015, thumbCell: 0.9, mottle: 0.04, specks: 0.25 }),
    strap: clay('#2a2523', { thumb: 0.01, rough: 0.5 }),
    redLed: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.5, 0.35) }),
    body: clay('#ece0c8', { thumbCell: 1.4, thumb: 0.045, tool: 1.2, mottle: 0.12, lump: 0.08, lumpF: 0.7 }),
    belly: clay('#f7f1e6', { thumb: 0.025 }),
    ear: clay('#e2d3bb'),
    antenna: clay('#3a3634', { thumb: 0.01 }),
    bobble: clay('#e86a4a', { thumb: 0.02 }),
    eye: clay('#16120f', { rough: 0.22, thumb: 0.004, mottle: 0.02, specks: 0 }),
    eyeGlint: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 2.0, 2.0) }),
    smile: clay('#2a1d18', { rough: 0.4, thumb: 0.006 }),
    cheek: clay('#ee8f86', { thumb: 0.01 }),
    bezel: clay('#4c4a48', { rough: 0.35, thumb: 0.008 }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 7.0, 8.0) }),
    cushion: clay('#9a3a2c', { thumbCell: 2.6, tool: 1.0 }),
    wall: clay('#5e4c36', { lump: 0.08, lumpF: 0.3, thumb: 0.025, thumbCell: 3.2, mottle: 0.16, rough: 0.8 }),
    rail: clay('#5c3f25', { lump: 0.05, mottle: 0.1, rough: 0.7 }),
    frame: clay('#e9dfc8', { lump: 0.04, thumb: 0.03, thumbCell: 2.6, mottle: 0.07, rough: 0.55, specks: 0.9 }),
    card: surface({ color: '#a77d4f', rough: 0.95, lump: 0.01, thumb: 0.0, tool: 0, grain: 0.012, grainF: 14, mottle: 0.18, specks: 1.0, speckColor: '#5d4027' }),
    curtain: clay('#2f5a40', { tool: 1.4, thumbCell: 2.4, ridge: 0.14, mottle: 0.12 }),
    lampBase: clay('#3e6b52', { rough: 0.45 }),
    shade: surface({ color: '#f2d29a', rough: 0.9, lump: 0.01, thumb: 0.004, grain: 0.01, grainF: 20, side: THREE.DoubleSide }),
    mug: clay('#c94f3c', { rough: 0.4 }),
    cocoa: clay('#4a2a1c', { rough: 0.25, thumb: 0.004 }),
  };
  M.shade.userData.U.uGlow.value.set(1.3, 0.72, 0.28); M.shade.userData.U.uGlowPow.value = 0.6;

  // ------------------------------------------------------------- the set
  const set = new THREE.Group(); scene.add(set);
  const WX = 12.5, WY0 = -1, WY1 = 50, WALLZ = 7, DEEP = 13;
  const GZ = WALLZ - DEEP; // glass plane
  {
    const sh = new THREE.Shape([[-80, -40], [80, -40], [80, 90], [-80, 90]].map(([x, y]) => new THREE.Vector2(x, y)));
    sh.holes.push(new THREE.Path([[-WX, WY0], [-WX, WY1], [WX, WY1], [WX, WY0]].map(([x, y]) => new THREE.Vector2(x, y))));
    let g = new THREE.ExtrudeGeometry(sh, { depth: DEEP, bevelEnabled: false, curveSegments: 1 });
    mesh(lumpy(g, 0.14, 0.25, 71), M.wall, { pos: [0, 0, GZ], parent: set });
  }
  // a dado rail of rolled clay across the wall
  for (const [a, b] of [[-80, -WX - 0.6], [WX + 0.6, 80]])
    mesh(lumpy(sausage([[a, -3.5, WALLZ + 0.5], [b, -3.5, WALLZ + 0.5]], [0.8, 0.8], { steps: 80 }), 0.07, 0.6, 72 + a), M.rail, { parent: set });

  // the window: cream frame, mullion, transom, at the back of the reveal
  const bar = (x, y, w, h, d = 2.2, seed = 80) => mesh(lumpy(new RoundedBoxGeometry(w, h, d, 3, 0.5), 0.09, 0.45, seed), M.frame, { pos: [x, y, GZ + d / 2 - 0.4], parent: set });
  bar(0, WY1 - 1.2, WX * 2, 2.6, 2.4, 81); bar(0, WY0 + 1.0, WX * 2, 2.0, 2.4, 82);
  bar(-WX + 1.2, (WY0 + WY1) / 2, 2.4, WY1 - WY0, 2.4, 83); bar(WX - 1.2, (WY0 + WY1) / 2, 2.4, WY1 - WY0, 2.4, 84);
  bar(0, (WY0 + WY1) / 2, 1.8, WY1 - WY0, 2.0, 85);
  bar(0, 36, WX * 2, 1.6, 2.0, 86);
  // the seat cushion, quilted with thumb-pressed buttons
  const CD = DEEP + 3; // it stands proud of the wall by 3
  mesh(lumpy(new RoundedBoxGeometry(WX * 2 + 3, 4.0, CD, 6, 1.8), 0.24, 0.3, 90), M.cushion, { pos: [0, -1.9, GZ + CD / 2], parent: set });
  for (const [x, z] of [[-9, 2], [9, 2], [-11, 9], [11, 9]]) mesh(lumpy(ball(0.55, 1, 0.5, 1, 16), 0.03, 1, 91 + x), M.cushion, { pos: [x, 0.05, GZ + 2 + z], parent: set, cast: false });
  // the seat box under it, corrugated card with its flutes showing
  mesh(lumpy(new RoundedBoxGeometry(WX * 2 + 4, 30, 2, 2, 0.4), 0.08, 0.4, 92), M.card, { pos: [0, -19, GZ + CD - 3.6], parent: set });
  for (let i = 0; i < 16; i++) mesh(new THREE.CylinderGeometry(0.26, 0.26, 26, 6), M.card, { pos: [-WX - 1.5 + i * 1.85, -18, GZ + CD - 2.5], parent: set, cast: false });
  // a heavy clay curtain on the left, folds rolled by hand
  for (let i = 0; i < 6; i++) {
    const x = -WX - 7 + i * 1.9, ph = i * 1.7;
    const pts = []; for (let k = 0; k <= 6; k++) { const y = 62 - k * 11; pts.push([x + Math.sin(ph + k * 0.6) * 0.5 + (k > 3 ? (k - 3) * 0.5 : 0), y, WALLZ + 1.4 + (i % 2) * 1.1]); }
    mesh(lumpy(sausage(pts, [1.25, 1.2, 1.3, 1.2, 1.25, 1.35, 1.4], { up: [0, 0, 1], steps: 80 }), 0.12, 0.35, 140 + i), M.curtain, { parent: set });
  }
  mesh(lumpy(sausage([[-30, 63, WALLZ + 2.5], [30, 63, WALLZ + 2.5]], [0.6, 0.6], { steps: 40 }), 0.04, 0.5, 149), M.rail, { parent: set });

  // ------------------------------------------------------------- outside
  const out = new THREE.Group(); scene.add(out);
  // a forced-perspective backdrop, close behind the glass the way a set has it
  out.add(skyPlane(400, 120, [[0, '#0b1633'], [0.3, '#1d335e'], [0.55, '#4a5578'], [0.7, '#9a7476'], [0.82, '#d08a5c'], [1, '#5a3a2a']], { pos: [0, 62, -180], intensity: 1.0 }));
  {
    const far = facadeFlat({ w: 240, h: 60, px: 8, seed: 11, wall: ['#2a3350', '#2e3753', '#283049'], frame: '#1a2030', lit: ['#ffcf7a'], litP: 0.12, dark: '#1e2437', winW: 1.1, winH: 1.6, winGapX: 1.5, winGapY: 1.7, blockW: 18, topMin: 0.38, topVar: 0.14, glow: 1.6 });
    far.position.set(-10, 25, -112); out.add(far);
    const c = canvas(600, 420), g = c.getContext('2d');
    g.fillStyle = '#374868'; cathedral(g, 300, 420, 6.2);
    // the green of the copper on the domes, and a lit window or two in the drum
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 0, 0, 420); gr.addColorStop(0, '#5d8a83'); gr.addColorStop(0.42, '#46706c'); gr.addColorStop(0.45, '#3e4f6c'); gr.addColorStop(1, '#2f3c58');
    g.fillStyle = gr; g.fillRect(0, 0, 600, 420);
    g.fillStyle = '#ffd38a'; for (const x of [-7, -2.5, 2.5, 7]) g.fillRect(300 + x * 6.2 - 6, 420 - 33 * 6.2, 9, 22);
    for (const x of [-20, -12, 12, 20]) for (const y of [8, 15]) g.fillRect(300 + x * 6.2 - 5, 420 - y * 6.2, 8, 14);
    const cat = new THREE.Mesh(new THREE.PlaneGeometry(30, 21), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }));
    cat.position.set(3, 47.5, -104); out.add(cat);
    // the facade across the street
    const mid = facadeFlat({ w: 150, h: 60, px: 10, seed: 23, wall: ['#4c4038', '#433b3a', '#57483c'], frame: '#2a2322', lit: ['#ffc366', '#ffdb94', '#ff9f5a'], litP: 0.36, dark: '#2c2a30', winW: 1.6, winH: 2.4, winGapX: 1.7, winGapY: 2.0, blockW: 18, topMin: 0.08, topVar: 0.14, glow: 2.6 });
    mid.position.set(0, 8, -62); out.add(mid);
    // tram wires across the street
    const wire = new THREE.MeshBasicMaterial({ color: '#07090d' });
    for (const [y0, y1] of [[47, 38], [45.2, 36.2]]) out.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-60, y0, -40), new THREE.Vector3(60, y1, -36)), 2, 0.08, 4), wire));
    out.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 70, 6), wire).translateX(-16).translateY(10).translateZ(-40));
  }
  out.add(rainStreaks(700, [-40, 40, -10, 75, -58, -10], { len: 4.5, w: 0.04, opacity: 0.38, seed: 3 }));
  // drops of clear resin on the glass, a few run
  {
    const r = rng(17), n = 46;
    const dropMat = dropMaterial({ sky: '#6e83ad', dark: '#110f15', glint: '#ffd7a0', lightDir: [0.8, 0.3, 0.9], glintAmt: 3, opacity: 0.8 });
    const runMat = new THREE.MeshPhysicalMaterial({ color: '#cfe0ff', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.16, specularIntensity: 1 });
    const geo = new THREE.SphereGeometry(1, 20, 12); geo.scale(1, 1.08, 0.5);
    const im = new THREE.InstancedMesh(geo, dropMat, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const x = -WX + 2.5 + r() * (WX * 2 - 5), y = WY0 + 3 + r() * (WY1 - WY0 - 5), s = 0.22 + r() * r() * r() * 0.9;
      m.compose(new THREE.Vector3(x, y, GZ - 0.2), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      im.setMatrixAt(i, m);
    }
    scene.add(im);
    for (let i = 0; i < 3; i++) {
      const x = -WX + 3 + r() * (WX * 2 - 6), y = WY0 + 16 + r() * 28, len = 2.5 + r() * 3, pts = [];
      for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k * 1.3 + i) * 0.4, y - len * k / 6, GZ - 0.2]);
      mesh(sausage(pts, [0.5, 0.2, 0.16, 0.22, 0.42], { seg: 8, steps: 24, flat: 0.45, up: [0, 0, 1] }), runMat, { parent: scene, cast: false });
    }
  }

  {
    const c = canvas(256, 512), g = c.getContext('2d');
    let gr = g.createRadialGradient(205, 300, 4, 205, 300, 120); gr.addColorStop(0, 'rgba(255,190,120,0.55)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    gr = g.createLinearGradient(0, 512, 0, 380); gr.addColorStop(0, 'rgba(200,215,235,0.30)'); gr.addColorStop(1, 'rgba(200,215,235,0)');
    g.fillStyle = gr; g.fillRect(0, 380, 256, 132);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WX * 2, WY1 - WY0), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glass.position.set(0, (WY0 + WY1) / 2, GZ - 0.05); scene.add(glass);
  }

  // ------------------------------------------------------------- actors
  const T = [0.2, 7.0, 7.0], TR = 3.6;
  const kid = buildKid(M, { lump: 0.2, lumpF: 0.3, legPose: 'cross', pitch: 0.46, roll: -0.27, yaw: 0.0, headY: 15.9 });
  kid.position.set(-0.5, 0.2, GZ + 7.0);
  kid.rotation.y = 0.2;
  scene.add(kid);
  kid.add(buildArms(M, { lump: 0.16, t: T, tr: TR }));
  const toy = buildToy(M, { r: TR, lean: 0.36, lump: 0.16 });
  toy.position.set(...T);
  kid.add(toy);

  // a mug of cocoa on the seat, gone cold
  {
    const mug = new THREE.Group();
    mesh(lumpy(lathe([[0.01, 0], [2.0, 0], [2.15, 0.3], [2.1, 4.2], [1.8, 4.2], [1.75, 0.6], [0.01, 0.6]], 40), 0.06, 0.6, 120), M.mug, { parent: mug });
    mesh(lumpy(new THREE.TorusGeometry(1.15, 0.38, 10, 24, Math.PI * 1.2).rotateZ(-Math.PI * 0.6), 0.04, 0.8, 121), M.mug, { pos: [2.2, 2.2, 0], parent: mug });
    mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.1, 30), M.cocoa, { pos: [0, 3.5, 0], parent: mug });
    mug.position.set(-8.5, 0.1, GZ + 11.5); mug.rotation.y = 0.6; scene.add(mug);
  }

  // the lamp, near camera right, out of focus
  {
    const lamp = new THREE.Group();
    mesh(lumpy(lathe([[0.01, 0], [3.8, 0], [3.9, 0.6], [2.6, 2.0], [1.0, 4.0], [0.6, 4.4], [0.6, 15], [0.01, 15]], 40), 0.1, 0.4, 130), M.lampBase, { parent: lamp });
    mesh(lumpy(lathe([[4.2, 0], [7.2, 0.2], [7.4, 0.6], [4.6, 9.0], [4.0, 9.2]], 48), 0.12, 0.35, 131), M.shade, { pos: [0, 12, 0], parent: lamp, cast: false });
    mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 5.5, 2.6) }), { pos: [0, 15.5, 0], parent: lamp, cast: false });
    lamp.position.set(21, -3.5, 24);
    scene.add(lamp);
  }

  // --------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight('#5d6f9a', '#4a2f1c', 0.5));
  const key = new THREE.SpotLight('#ffc48c', 4600, 0, 0.9, 0.75, 2);
  key.position.set(21, 13, 24); key.target.position.set(-1, 11, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 4; key.shadow.camera.far = 120;
  scene.add(key, key.target);
  const fill = new THREE.PointLight('#ffd8b0', 700, 0, 2); fill.position.set(-8, 34, 52); scene.add(fill);
  const cool = new THREE.PointLight('#7f9fe0', 500, 0, 2); cool.position.set(-26, 30, 30); scene.add(cool);
  const win = new THREE.DirectionalLight('#8eb0ff', 2.8);
  win.position.set(-14, 40, -80); win.target.position.set(0, 10, 0);
  win.castShadow = true; win.shadow.mapSize.set(2048, 2048); win.shadow.radius = 4; win.shadow.bias = -0.0004; win.shadow.normalBias = 0.03;
  Object.assign(win.shadow.camera, { left: -40, right: 40, top: 50, bottom: -30, near: 1, far: 200 });
  scene.add(win, win.target);
  scene.updateMatrixWorld(true);
  const ledP = toy.userData.body.localToWorld(toy.userData.ledLocal.clone());
  const led = new THREE.PointLight('#5fe8ff', 60, 0, 2); led.position.copy(ledP); scene.add(led);
  led.castShadow = true; led.shadow.mapSize.set(512, 512); led.shadow.radius = 3; led.shadow.bias = -0.002; led.shadow.camera.near = 0.5; led.shadow.camera.far = 60;
  const bounce = new THREE.PointLight('#c0603e', 160, 0, 2); bounce.position.set(2, -2, GZ + 34); scene.add(bounce);

  // -------------------------------------------------------------- camera
  camera.fov = 31; camera.near = 5; camera.far = 1200;
  camera.position.set(12, 28, 101);
  camera.lookAt(0.5, 17.5, 0);
  camera.updateProjectionMatrix();
  const maskP = kid.userData.mask.getWorldPosition(new THREE.Vector3());
  if (q.get('cam') === 'legs') { const lp = new THREE.Vector3(0, 4, 8); camera.position.lerp(lp, 0.7); camera.lookAt(lp); }
  if (q.get('cam') === 'head') { camera.position.lerp(maskP, 0.72); camera.lookAt(maskP.x, maskP.y - 3, maskP.z); }
  const focus = camera.position.distanceTo(maskP);

  return {
    focus, aperture: 26, maxBlur: 30, radScale: 0.8,
    threshold: 1.3, knee: 0.5, bloomA: 0.3, bloomB: 0.14,
    exposure: 1.15, vignette: 0.45, grain: 0.03, sat: 1.08, contrast: 1.04, lift: [0.015, 0.01, 0.02], gain: [1.02, 1.0, 0.97], toe: 0.05,
  };
});
