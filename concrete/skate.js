import { createEffects } from './effects.js?v=2';
import { loadArt } from './art.js?v=5';
import { createSkater } from './skater.js?v=2';
import { createLook } from './look.js?v=1';
import { createPadEdge } from './pad.js?v=1';
import * as T from './vendor/three.module.min.js?v=185';

// The DualSense is the reference controller and the layout is THPS's own:
// cross ollie, square flip, circle grab, triangle grind, L1/R1 spin in the
// air, R2 push, Options pause, Create resets. Every other input is mapped
// onto that — the keyboard letters and the touch buttons are those buttons.
const PAD_KEYS = [[0, ' '], [2, 'j'], [1, 'k'], [3, 'l']];

// Every prop in the room, on BOTH tiers: where it stands (the Blender room's
// positions, art-source/export.py), its footprint and height — what the
// physics rides onto or bumps into — and whether its top edges take a grind.
// The procedural tier draws these; the Blender tier already holds them.
const PROPS = [
    { kind: 'crate', x: 24, z: -26, w: 1.8, d: 1.8, h: 1.75, grind: true },
    { kind: 'crate', x: 24, z: -22, w: 1.8, d: 1.8, h: 1.75, grind: true },
    { kind: 'crate', x: -25, z: -23, w: 1.8, d: 1.8, h: 1.75, grind: true },
    { kind: 'crate', x: -25, z: 17, w: 1.8, d: 1.8, h: 1.75, grind: true },
    { kind: 'cabinet', x: -25, z: -30, w: 1.2, d: 0.45, h: 1.8 },
    { kind: 'cabinet', x: 25, z: 18, w: 1.2, d: 0.45, h: 1.8 },
    { kind: 'locker', x: -25.8, z: -16, w: 1.25, d: 0.72, h: 2.35 },
    { kind: 'locker', x: -25.8, z: -13.5, w: 1.25, d: 0.72, h: 2.35 },
    { kind: 'locker', x: -25.8, z: -11, w: 1.25, d: 0.72, h: 2.35 },
    { kind: 'bench', x: -25.4, z: -7.5, w: 1.15, d: 3.8, h: 0.69, grind: true },
    { kind: 'bench', x: -25.4, z: 7.5, w: 1.15, d: 3.8, h: 0.69, grind: true },
    // The Blender room stands its bins inside the east quarter pipe; they live
    // by the rolling door here until that room is re-exported.
    { kind: 'bin', x: 25.8, z: -35, w: 1.15, d: 1.35, h: 1.4, color: '#e2632c' },
    { kind: 'bin', x: 25.8, z: -32.9, w: 1.15, d: 1.35, h: 1.4, color: '#bfe83d' },
    { kind: 'bin', x: 25.8, z: -30.8, w: 1.15, d: 1.35, h: 1.4, color: '#64737a' },
    { kind: 'reel', x: 25, z: 12, w: 1.4, d: 1.3, h: 1.3 },
    { kind: 'reel', x: -25, z: 23, w: 1.4, d: 1.3, h: 1.3 },
    { kind: 'cone', x: -23, z: -27, w: 0.5, d: 0.5, h: 0.65 },
    { kind: 'cone', x: -23, z: -24, w: 0.5, d: 0.5, h: 0.65 },
];
// The platform behind each coping — THPS quarter pipes have a deck, and
// without one the ground function was promising 3.6 m over empty air.
const DECKS = [
    { x0: -16, x1: 16, z0: -37.8, z1: -35.1 },
    { x0: -26, x1: -6, z0: 34.1, z1: 37.8 },
    { x0: 17, x1: 27, z0: 28.1, z1: 37.8 },
];
// Where a transition ends in a lip: the coping's z and which way the room is.
const LIPS = [
    { test: (x, z) => Math.abs(x) < 16 && z < -29, z: -35, inward: 1 },
    { test: (x, z) => x > -26 && x < -6 && z > 28, z: 34, inward: -1 },
    { test: (x, z) => x > 17 && x < 27 && z > 22, z: 28, inward: -1 },
];
const lipOf = (x, z) => LIPS.find(l => l.test(x, z)) || null;
// A grindable line runs along one axis; `along` and `across` are measured
// against it so a rail down z and a crate edge along x share every rule.
function nearRail(r, x, z, tol, ext) {
    const along = r.axis === 'x' ? x - r.x : z - r.z, across = r.axis === 'x' ? z - r.z : x - r.x;
    return Math.abs(across) < tol && Math.abs(along) < r.len / 2 + ext;
}
function crossesRail(r, x0, z0, x1, z1) {
    const a0 = r.axis === 'x' ? z0 - r.z : x0 - r.x, a1 = r.axis === 'x' ? z1 - r.z : x1 - r.x;
    const along = r.axis === 'x' ? x1 - r.x : z1 - r.z;
    return a0 * a1 < 0 && Math.abs(along) < r.len / 2;
}

export function createGame(host, update, options = {}) {
    const params = new URLSearchParams(location.search);
    const mobileCompat = params.get('quality') === 'mobile' ||
        (params.get('quality') !== 'desktop' &&
            (matchMedia('(pointer:coarse)').matches || innerWidth < 700));
    const scene = new T.Scene();
    scene.background = new T.Color('#26333d');
    scene.fog = new T.FogExp2('#26333d', 0.014);
    const camera = new T.PerspectiveCamera(57, host.clientWidth / host.clientHeight, 0.1, 180);
    const renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.info.autoReset = false;
    if (mobileCompat) {
        renderer.shadowMap.enabled = false;
        renderer.toneMapping = T.NoToneMapping;
        renderer.outputColorSpace = T.SRGBColorSpace;
    }
    host.appendChild(renderer.domElement);
    scene.add(new T.HemisphereLight(0xb6d8ff, 0x363129, 2));
    const sun = new T.DirectionalLight(0xffd39a, 4.5);
    sun.position.set(14, 24, -15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
        left: -38,
        right: 38,
        top: 40,
        bottom: -40,
        near: 0.1,
        far: 90,
    });
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.08;
    scene.add(sun);
    const mat = (color, roughness = 0.7, metalness = 0) => mobileCompat
        ? new T.MeshBasicMaterial({ color })
        : new T.MeshStandardMaterial({ color, roughness, metalness });
    const steel = mat('#26343a', 0.4, 0.75), wood = mat('#8b6f50'), black = mat('#161d22'), concrete = mat('#596468'), trim = mat('#d7dba0', 0.4, 0.6), glow = mobileCompat ? new T.MeshBasicMaterial({ color: '#bfe83d' }) : new T.MeshStandardMaterial({
        color: '#dcfa73',
        emissive: '#bded38',
        emissiveIntensity: 1.7,
    });
    const environment = new T.Group(); scene.add(environment);
    function box(w, h, d, x, y, z, m, parent = environment) {
        const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
        o.position.set(x, y, z);
        o.castShadow = true;
        o.receiveShadow = true;
        parent.add(o);
        return o;
    }
    // Concrete has fine aggregate and wear, generated as a material texture.
    const texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = 256;
    const ctx = texCanvas.getContext('2d');
    ctx.fillStyle = '#858b8a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) {
        const v = Math.random() * 70 + 90;
        ctx.fillStyle = `rgba(${v},${v},${v},.13)`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 3 + 1, 1);
    }
    const texture = new T.CanvasTexture(texCanvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(18, 24);
    concrete.map = texture;
    box(58, 0.3, 76, 0, -0.2, 0, concrete);
    box(58, 13, 0.5, 0, 6.4, -38, mat('#53616a'));
    box(0.5, 13, 76, -29, 6.4, 0, mat('#586066'));
    box(0.5, 13, 76, 29, 6.4, 0, mat('#424f58'));
    box(58, 13, 0.5, 0, 6.4, 38, mat('#4b575c'));
    for (let z = -36; z <= 36; z += 12) {
        for (const x of [-28, 28]) {
            box(0.5, 13, 0.7, x, 6.5, z, steel);
            box(1, 1, 1, x, 0.5, z, concrete);
        }
        box(56, 0.35, 0.4, 0, 12, z, steel);
        for (let x = -24; x < 28; x += 8) {
            const brace = box(8.5, 0.12, 0.12, x + 4, 11.4, z, steel);
            brace.rotation.z = x % 16 === 0 ? 0.16 : -0.16;
        }
    }
    // High windows and suspended warehouse lights.
    const windowMat = mobileCompat ? new T.MeshBasicMaterial({ color: '#7aa8b8' }) : new T.MeshStandardMaterial({
        color: '#bde8f8',
        emissive: '#b7ddfa',
        emissiveIntensity: 0.8,
    });
    for (let z = -30; z <= 30; z += 12) {
        for (const x of [-28.7, 28.7]) {
            box(0.1, 3, 7, x, 9, z, windowMat);
            for (let k = -3; k <= 3; k += 1.5)
                box(0.2, 3.1, 0.08, x, 9, z + k, steel);
            box(0.2, 0.08, 7, x, 9, z, steel);
        }
        for (const x of [-14, 14]) {
            box(3, 0.09, 0.7, x, 11, z, windowMat);
            box(0.035, 1, 0.035, x, 11.5, z, steel);
        }
    }
    for (let z = -36; z < 38; z += 4)
        box(57, 0.012, 0.018, 0, -0.035, z, mat('#636c6d'));
    for (let x = -28; x < 29; x += 4)
        box(0.018, 0.012, 75, x, -0.03, 0, mat('#636c6d'));
    function sign(text, x, y, z, size, color = '#e5e7d8', rot = 0) {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = color;
        g.font = '900 italic 130px Arial';
        g.textAlign = 'center';
        g.fillText(text, 512, 170);
        const t = new T.CanvasTexture(c);
        const o = new T.Mesh(new T.PlaneGeometry(size, size / 4), new T.MeshBasicMaterial({
            map: t,
            transparent: true,
            side: T.DoubleSide,
        }));
        o.position.set(x, y, z);
        o.rotation.y = rot;
        environment.add(o);
    }
    sign('CONCRETE', 0, 7, -37.65, 26);
    sign('NO BAD LINES.', -28.65, 5, 8, 16, '#bfce78', Math.PI / 2);
    sign('01', 22, 4, -37.6, 6, '#dafa45');
    // Quarter pipes: geometry and ride height use the same parabolic surface.
    function quarter(x, z, w, dir) {
        const geo = new T.BufferGeometry();
        const pos = [], idx = [];
        for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            for (const sx of [-w / 2, w / 2])
                pos.push(x + sx, 3.6 * t * t, z + dir * t * 6);
        }
        for (let i = 0; i < 24; i++) {
            const a = i * 2;
            idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({
            color: '#957757',
            roughness: 0.65,
            side: T.DoubleSide,
        }));
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        environment.add(mesh);
        box(w, 0.18, 0.22, x, 3.6, z + dir * 6, trim);
        box(w, 3.5, 0.2, x, 1.75, z + dir * 6, wood);
        for (let s = -w / 2; s <= w / 2; s += 2)
            box(0.045, 0.04, 6, x + s, 0.015, z + dir * 3, steel);
    }
    quarter(0, -29, 32, -1);
    quarter(-16, 28, 20, 1);
    quarter(22, 22, 10, 1);
    // Central funbox, bank and grind rails.
    const rampGeo = new T.BufferGeometry();
    const rp = [
        -4.5, 0, -3, 4.5, 0, -3, -4.5, 1.5, 1, 4.5, 1.5, 1, -4.5, 1.5, 5, 4.5, 1.5,
        5, -4.5, 0, 9, 4.5, 0, 9,
    ];
    rampGeo.setAttribute('position', new T.Float32BufferAttribute(rp, 3));
    rampGeo.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 4, 6, 5, 5, 6, 7]);
    rampGeo.computeVertexNormals();
    const ramp = new T.Mesh(rampGeo, mobileCompat ? new T.MeshBasicMaterial({ color: '#8c745a', side: T.DoubleSide }) : new T.MeshStandardMaterial({ color: '#8c745a', side: T.DoubleSide }));
    ramp.receiveShadow = true;
    environment.add(ramp);
    for (const x of [-4.55, 4.55])
        box(0.1, 1.5, 4, x, 0.75, 3, steel);
    const rails = [
        { x: 10, z: -4, y: 1, len: 20, axis: 'z', kind: 'rail' },
        { x: -10, z: -8, y: 0.85, len: 16, axis: 'z', kind: 'rail' },
        { x: 0, z: 3, y: 2.3, len: 4, axis: 'z', kind: 'rail' },
        // The funbox is a box: every top edge is a ledge.
        { x: 0, z: 1, y: 1.5, len: 9, axis: 'x', kind: 'ledge' },
        { x: 0, z: 5, y: 1.5, len: 9, axis: 'x', kind: 'ledge' },
        { x: -4.5, z: 3, y: 1.5, len: 4, axis: 'z', kind: 'ledge' },
        { x: 4.5, z: 3, y: 1.5, len: 4, axis: 'z', kind: 'ledge' },
    ];
    for (const p of PROPS) {
        if (!p.grind) continue;
        if (p.kind === 'crate') {
            for (const dz of [-0.75, 0.75]) rails.push({ x: p.x, z: p.z + dz, y: p.h, len: 1.5, axis: 'x', kind: 'ledge' });
            for (const dx of [-0.75, 0.75]) rails.push({ x: p.x + dx, z: p.z, y: p.h, len: 1.5, axis: 'z', kind: 'ledge' });
        }
        if (p.kind === 'bench') for (const dx of [-0.575, 0.575]) rails.push({ x: p.x + dx, z: p.z, y: p.h, len: 3.8, axis: 'z', kind: 'ledge' });
    }
    for (const r of rails) {
        if (r.kind !== 'rail') continue;
        box(0.13, 0.13, r.len, r.x, r.y, r.z, trim);
        box(0.04, 0.035, r.len, r.x, r.y + 0.07, r.z, glow);
        for (const z of [r.z - r.len / 2 + 0.5, r.z + r.len / 2 - 0.5])
            box(0.12, r.y, 0.12, r.x, r.y / 2, z, steel);
        box(1.3, 0.015, r.len + 1, r.x, 0.012, r.z, mat('#575e57'));
    }
    // Shared with the Blender tier: the decks the copings never had, and a
    // lit strip on every ledge so a grindable edge reads as one.
    const props = new T.Group(); scene.add(props);
    for (const d of DECKS) {
        const o = box(d.x1 - d.x0, 3.6, d.z1 - d.z0, (d.x0 + d.x1) / 2, 1.8, (d.z0 + d.z1) / 2, wood, props);
        box(d.x1 - d.x0, 0.06, d.z1 - d.z0, (d.x0 + d.x1) / 2, 3.61, (d.z0 + d.z1) / 2, mat('#7a6650'), props);
    }
    for (const r of rails) {
        if (r.kind !== 'ledge') continue;
        if (r.axis === 'x') box(r.len, 0.03, 0.05, r.x, r.y + 0.015, r.z, glow, props);
        else box(0.05, 0.03, r.len, r.x, r.y + 0.015, r.z, glow, props);
    }
    for (const x of [-23, 23]) {
        box(0.08, 0.015, 40, x, 0.02, 0, mat('#c2bf78'));
        for (let z = -20; z < 20; z += 3)
            box(0.45, 0.02, 1, x, 0.025, z, mat('#b8ab62'));
    }
    // The dressing is the prop table, so what the procedural tier draws is
    // what both tiers ride into. (v4's shelves, lockers and stair set stood
    // in the ramp run-ups and existed on no other tier; they are gone.)
    for (const p of PROPS) {
        if (p.kind === 'crate') {
            box(1.8, 0.25, 1.8, p.x, 0.125, p.z, wood);
            box(1.5, 1.5, 1.5, p.x, 1, p.z, mat('#9a7a55'));
            for (const dx of [-0.69, 0.69]) box(0.09, 1.6, 1.6, p.x + dx, 1, p.z, steel);
        }
        else if (p.kind === 'cabinet') {
            box(1.2, 1.8, 0.45, p.x, 0.9, p.z, mat('#64737a'));
            box(0.35, 0.35, 0.02, p.x, 1.5, p.z + 0.24, glow);
        }
        else if (p.kind === 'locker') {
            box(1.25, 2.35, 0.72, p.x, 1.18, p.z, mat('#465c68'));
            box(0.035, 0.28, 0.08, p.x + 0.71, 1.2, p.z + 0.34, trim);
        }
        else if (p.kind === 'bench') {
            box(1.15, 0.14, 3.8, p.x, 0.62, p.z, wood);
            box(0.9, 0.1, 3.55, p.x, 0.22, p.z, steel);
            for (const dz of [-1.55, 1.55]) box(0.1, 0.62, 0.1, p.x, 0.31, p.z + dz, steel);
        }
        else if (p.kind === 'bin') {
            box(1.15, 1.28, 1.35, p.x, 0.66, p.z, mat(p.color));
            box(1.25, 0.13, 1.45, p.x, 1.33, p.z, black);
        }
        else if (p.kind === 'reel') {
            const spool = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 1.3, 12), black);
            spool.rotation.z = Math.PI / 2; spool.position.set(p.x, 0.65, p.z); spool.castShadow = true; environment.add(spool);
            for (const dx of [-0.65, 0.65]) {
                const disk = new T.Mesh(new T.CylinderGeometry(0.65, 0.65, 0.07, 16), wood);
                disk.rotation.z = Math.PI / 2; disk.position.set(p.x + dx, 0.65, p.z); disk.castShadow = true; environment.add(disk);
            }
        }
        else if (p.kind === 'cone') {
            const cone = new T.Mesh(new T.ConeGeometry(0.22, 0.65, 12), mat('#e2632c'));
            cone.position.set(p.x, 0.4, p.z); cone.castShadow = true; environment.add(cone);
            box(0.6, 0.08, 0.6, p.x, 0.04, p.z, black);
        }
    }
    // The rider: a group the physics moves, holding the board and the skater.
    const rider = new T.Group();
    scene.add(rider);
    const body = new T.Group();
    rider.add(body);
    const deck = new T.Group();
    rider.add(deck);
    box(0.32, 0.075, 1.02, 0, 0.13, 0, black, deck);
    box(0.34, 0.035, 0.92, 0, 0.09, 0, mat('#dafa45'), deck);
    for (const z of [-0.34, 0.34]) {
        box(0.4, 0.04, 0.07, 0, 0.08, z, steel, deck);
        for (const x of [-0.2, 0.2]) {
            const wheel = new T.Mesh(new T.CylinderGeometry(0.065, 0.065, 0.065, 12), mat('#e8ded0'));
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.055, z);
            deck.add(wheel);
        }
    }
    const skater = createSkater();
    body.add(skater.group);
    const art = loadArt({ scene, rider, deck, body, environment, renderer, host, skater: options.skater === 'blender' ? 'blender' : 'thps' });
    const look = createLook({ renderer, scene, camera, mobile: art.mobile });
    const dustGeo = new T.BufferGeometry(), dustPos = new Float32Array(450);
    for (let i = 0; i < 450; i += 3) {
        dustPos[i] = (Math.random() - 0.5) * 56;
        dustPos[i + 1] = Math.random() * 11;
        dustPos[i + 2] = (Math.random() - 0.5) * 70;
    }
    dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3));
    const dust = new T.Points(dustGeo, new T.PointsMaterial({
        color: '#ffe0ae',
        size: 0.045,
        transparent: true,
        opacity: 0.45,
    }));
    scene.add(dust);
    const effects = createEffects(scene, art.mobile);
    function burst(n, spark = false) { effects.burst(rider.position.clone().add(new T.Vector3(0, .12, 0)), n, spark); }
    const keys = {}, pressed = {};
    let lookX = 0, lookY = 0, analogX = 0, analogY = 0, active = false, paused = false, score = 0, best = 0, time = 120, speed = 0, angle = 0, vy = 0, combo = 0, mult = 1, trick = '', trickTimer = 0, air = false, airAngle = 0, flip = 0, grab = 0, grinding = -1, grindLock = 0, grindBuffer = 0, camOrbit = 0, camPitch = 0, device = 'KEYBOARD', padKind = null, last = performance.now(), raf = 0, hudTick = 0, bail = 0, landingTurn = 0, vert = false, spin = 0, slide = false, pitch = 0, deckSlide = 0, steer = 0, throttle = 0, stall = 0, stallLip = null, grindDir = 1, grindsDone = 0, lastGrind = '', stallsDone = 0, transfers = 0;
    try {
        best = Number(localStorage.getItem('concrete-best') || 0);
    }
    catch { }
    rider.position.set(8, 0, 16);
    angle = Math.PI;
    camera.position.set(24, 9, 29);
    camera.lookAt(0, 1, -5);
    // The ride height everywhere. Every ramp in the room is in here, and the
    // slope of this function is what the physics rides: gravity along it,
    // the rider's pitch, and where a quarter pipe turns into a vert launch.
    function ground(x, z) {
        if (Math.abs(x) < 16 && z < -29)
            return 3.6 * Math.pow(Math.min(6, -z - 29) / 6, 2);
        if (x > -26 && x < -6 && z > 28)
            return 3.6 * Math.pow(Math.min(6, z - 28) / 6, 2);
        if (x > 17 && x < 27 && z > 22)
            return 3.6 * Math.pow(Math.min(6, z - 22) / 6, 2);
        if (Math.abs(x) < 4.5 && z > -3 && z < 9)
            return Math.max(0, Math.min(1.5, ((z + 3) / 4) * 1.5, ((9 - z) / 4) * 1.5));
        for (const p of PROPS)
            if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) return p.h;
        return 0;
    }
    // Rise per metre of travel along a heading: positive climbing, negative descending.
    function slopeAlong(x, z, a) {
        const e = 0.12, dx = Math.sin(a) * e, dz = Math.cos(a) * e;
        return (ground(x + dx, z + dz) - ground(x - dx, z - dz)) / (2 * e);
    }
    function addTrick(name, points) {
        combo += points;
        mult = Math.min(12, mult + 1);
        note(name);
    }
    // A line item with no multiplier step: ollies, transfers and ramp airs
    // are how you get to a trick, not the trick.
    function note(name, points = 0) {
        combo += points;
        trick = trick ? `${trick} + ${name}` : name;
        if (trick.length > 75)
            trick = name;
        trickTimer = 2;
    }
    function key(k, v) {
        if (v && !keys[k])
            pressed[k] = true;
        keys[k] = v;
        if (v && k === 'l') grindBuffer = 1.25;
    }
    const down = (e) => {
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
            e.preventDefault();
        key(e.key.toLowerCase(), true);
        device = 'KEYBOARD';
    };
    const up = (e) => key(e.key.toLowerCase(), false);
    const blur = () => {
        for (const k in keys)
            keys[k] = false;
        for (const k in pressed)
            delete pressed[k];
        analogX = analogY = lookX = lookY = 0;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    let drag = false;
    const pointerDown = (e) => {
        drag = true;
        renderer.domElement.setPointerCapture(e.pointerId);
    };
    const pointerUp = () => {
        drag = false;
    };
    const pointerMove = (e) => {
        if (drag) {
            camOrbit -= e.movementX * 0.005;
            camPitch = T.MathUtils.clamp(camPitch + e.movementY * 0.012, -1, 4);
        }
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.style.touchAction = 'none';
    function settle() {
        speed = 0; vy = 0; air = false; vert = false; grinding = -1; combo = 0; mult = 1; flip = 0; grab = 0; bail = 0; spin = 0; slide = false; stall = 0;
        deckSlide = 0; deck.position.z = 0; deck.rotation.set(0, 0, 0);
    }
    function reset() {
        rider.position.set(8, 0, 16);
        angle = Math.PI;
        settle();
    }
    // Getting up after a bail happens where you fell — the old build put the
    // skater back at the start of the room, which turned every slam into a
    // walk across the warehouse.
    function recover() {
        const x = rider.position.x, z = rider.position.z;
        settle();
        rider.position.y = ground(x, z);
    }
    function bank() {
        if (combo) {
            const points = Math.floor(combo * mult);
            score += points;
            trick = `${points.toLocaleString()} BANKED`;
            trickTimer = 2;
            combo = 0;
            mult = 1;
            if (score > best) {
                best = score;
                try {
                    localStorage.setItem('concrete-best', String(best));
                }
                catch { }
            }
        }
    }
    function launch(launchSpeed) {
        // Off the lip of a transition the board goes UP, not on along the
        // last tangent: the vert is where the ramp would have been, so the
        // skater turns around at the top and comes back down the same face.
        air = true; vert = true;
        vy = launchSpeed * 0.6 + 2;
        speed = launchSpeed * 0.1 + 0.4;
        angle += Math.PI;
        airAngle = angle; spin = 0;
        if (launchSpeed > 6) { note('Ramp air', 200); burst(8); }
    }
    function slam(text) {
        combo = 0;
        mult = 1;
        trick = text;
        trickTimer = 2;
        bail = 1.1;
        deckSlide = 0;
        flip = 0; grab = 0; grinding = -1; slide = false;
        burst(20);
    }
    // Triangle at the coping: the board hangs on the lip for a beat. The
    // direction held names it, cross ollies out, and letting it run drops in.
    function stallAt(lip) {
        stall = 0.75; stallLip = lip;
        rider.position.z = lip.z; rider.position.y = 3.66;
        speed = 0; vy = 0; air = false; vert = false; grindBuffer = 0;
        const name = throttle < -0.5 ? 'Rock to Fakie' : Math.abs(steer) > 0.5 ? (steer > 0 ? 'Nose stall' : 'Tail stall') : 'Axle stall';
        addTrick(name, 300);
        stallsDone++; host.dataset.lastStall = name;
        burst(6, true);
    }
    function land(g) {
        rider.position.y = g;
        air = false; vert = false; vy = 0;
        const rel = angle - airAngle, turn = Math.abs(Math.sin(rel));
        landingTurn = turn;
        if (turn > 0.85 && speed > 8) {
            slam('BAIL — GET BACK UP');
        }
        else {
            const halves = Math.round(Math.abs(spin) / Math.PI);
            if (halves >= 1) addTrick(`${halves * 180}`, halves * 100);
            if (turn < 0.6) angle = airAngle + Math.round(rel / Math.PI) * Math.PI; // THPS straightens a near landing
            bank();
            burst(12);
        }
        flip = 0;
        grab = 0;
        spin = 0;
    }
    const padEdge = createPadEdge();
    const padWasDown = [];
    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.033);
        last = now;
        raf = requestAnimationFrame(frame);
        steer = analogX; throttle = -analogY;
        const pe = padEdge.tick(now), pad = pe.pad;
        camOrbit -= lookX * dt * 2;
        camPitch = T.MathUtils.clamp(camPitch + lookY * dt * 3, -1, 4);
        let padSteer = 0, padThrottle = 0, spinInput = 0;
        if (pad) {
            padKind = pe.kind;
            device = pe.kind === 'ps' ? 'DUALSENSE' : 'CONTROLLER';
            if (Math.abs(pad.axes[0]) > 0.12) padSteer = pad.axes[0];
            if (Math.abs(pad.axes[1]) > 0.12) padThrottle = -pad.axes[1];
            if (pad.buttons[14]?.pressed) padSteer = -1; else if (pad.buttons[15]?.pressed) padSteer = 1;
            if (pad.buttons[12]?.pressed) padThrottle = 1; else if (pad.buttons[13]?.pressed) padThrottle = -1;
            const r2 = pad.buttons[7]?.value || (pad.buttons[7]?.pressed ? 1 : 0), l2 = pad.buttons[6]?.value || (pad.buttons[6]?.pressed ? 1 : 0);
            if (r2 > 0.05) padThrottle = Math.max(padThrottle, r2);
            if (l2 > 0.05) padThrottle = Math.min(padThrottle, -l2);
            if (pad.buttons[4]?.pressed) spinInput -= 1;
            if (pad.buttons[5]?.pressed) spinInput += 1;
            camOrbit -= (pad.axes[2] || 0) * dt * 2;
            camPitch = T.MathUtils.clamp(camPitch + (pad.axes[3] || 0) * dt * 3, -1, 4);
            for (const [i, k] of PAD_KEYS) {
                const d = pe.down.has(i);
                if (pe.pressed.has(i)) key(k, true);
                else if (padWasDown[i] && !d) key(k, false);
                padWasDown[i] = d;
            }
            if (pe.pressed.has(8)) pressed.r = true;
        }
        else padKind = null;
        if (active && !paused && time > 0) {
            grindBuffer = Math.max(0, grindBuffer - dt);
            time = Math.max(0, time - dt);
            if (time === 0) {
                bank();
                active = false;
            }
            if (pressed.r)
                reset();
            steer +=
                (keys.a || keys.arrowleft ? 1 : 0) -
                    (keys.d || keys.arrowright ? 1 : 0); // Positive rotation turns left with forward -Z.
            if (analogX || pad)
                steer =
                    -(analogX || padSteer) +
                        (keys.a ? 1 : 0) -
                        (keys.d ? 1 : 0);
            throttle +=
                (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
            if (pad && !analogY) throttle += padThrottle;
            steer = T.MathUtils.clamp(steer, -1, 1);
            throttle = T.MathUtils.clamp(throttle, -1, 1);
            if (bail > 0) {
                bail -= dt;
                speed *= 0.9;
                deckSlide = Math.min(1.6, deckSlide + 3 * dt);
                deck.position.z = deckSlide;
                deck.rotation.y += 5 * dt;
                if (air) {
                    // A slam in the air still has to reach the floor.
                    vy -= 18 * dt;
                    rider.position.y += vy * dt;
                    const g = ground(rider.position.x, rider.position.z);
                    if (rider.position.y <= g) { rider.position.y = g; air = false; vert = false; vy = 0; }
                }
                if (bail <= 0)
                    recover();
            }
            else if (stall > 0) {
                stall = Math.max(0, stall - dt);
                const lip = stallLip, inward = lip.inward > 0 ? 0 : Math.PI;
                if (pressed[' ']) {
                    stall = 0;
                    angle = inward; airAngle = angle; spin = 0;
                    air = true; vy = 6.5;
                    rider.position.z = lip.z + lip.inward * 0.3;
                    note('Ollie', 100);
                    burst(8);
                }
                else if (stall <= 0) {
                    angle = inward;
                    speed = 1.5;
                    rider.position.z = lip.z + lip.inward * 0.35;
                    rider.position.y = ground(rider.position.x, rider.position.z);
                    bank();
                }
            }
            else {
                const jump = pressed[' '];
                grindLock = Math.max(0, grindLock - dt);
                const airSteer = air && spinInput ? -spinInput : steer;
                const turn = airSteer * dt * (air ? 2.6 : 1.7) * Math.min(1, speed / 2 + 0.3);
                angle += turn;
                if (air) spin += turn;
                const ox = rider.position.x, oz = rider.position.z, oldGround = ground(ox, oz);
                if (grinding >= 0) {
                    const rail = rails[grinding];
                    if (rail.axis === 'z') { rider.position.x = rail.x; rider.position.z += grindDir * Math.max(speed, 5) * dt; }
                    else { rider.position.z = rail.z; rider.position.x += grindDir * Math.max(speed, 5) * dt; }
                    rider.position.y = rail.y + 0.07;
                    combo += 100 * dt;
                    speed = Math.max(speed, 5);
                    if (Math.random() < 0.8)
                        burst(2, true);
                    const along = rail.axis === 'z' ? rider.position.z - rail.z : rider.position.x - rail.x;
                    if (jump || Math.abs(along) > rail.len / 2) {
                        grinding = -1;
                        slide = false;
                        air = true;
                        vy = jump ? 7 : 2.5;
                        grindLock = 0.4;
                        airAngle = angle;
                        spin = 0;
                    }
                }
                else {
                    let s = 0;
                    if (!air) {
                        s = slopeAlong(rider.position.x, rider.position.z, angle);
                        const grade = s / Math.sqrt(1 + s * s);
                        // Pushing only works where there is floor under the push foot.
                        const push = throttle > 0 ? throttle * 9 * Math.max(0, 1 - Math.abs(s) * 1.5) : throttle * 9;
                        speed += (push - 9.8 * grade * 1.05) * dt;
                        if (throttle === 0) speed -= (Math.abs(s) < 0.05 ? 1.4 : 0.4) * dt;
                        if (speed < 0) {
                            // Too slow for the transition: roll back down it, fakie.
                            if (Math.abs(s) > 0.08) { angle += Math.PI; speed = Math.min(2, -speed); }
                            else speed = 0;
                        }
                        speed = Math.min(speed, 18);
                    }
                    const horizontal = air ? speed : speed / Math.sqrt(1 + s * s);
                    const nx = rider.position.x + Math.sin(angle) * horizontal * dt;
                    const nz = rider.position.z + Math.cos(angle) * horizontal * dt;
                    const gAhead = ground(nx, nz);
                    // A wall is where the ground stops being SMOOTH — the rise
                    // over this step against what the local slope predicts. A
                    // quarter pipe climbs 1.2 m per metre and is not a wall; a
                    // crate rises 1.75 m out of nothing and is. (Measuring the
                    // rise alone read the steep half of every transition as a
                    // wall and slammed anyone who carried speed into it.)
                    const stepLen = Math.hypot(nx - ox, nz - oz);
                    const jump2 = gAhead - oldGround - slopeAlong(ox, oz, angle) * stepLen;
                    // In the air, what matters is whether this ollie can CLEAR
                    // the face: the apex from here, not the height right now.
                    // Measured against the current height instead, ollieing
                    // onto the funbox from the side slammed every time, because
                    // the board crosses the edge early in the arc.
                    const apex = air ? rider.position.y + Math.max(0, vy) ** 2 / 36 : rider.position.y;
                    const wall = jump2 > 0.45 && gAhead > apex + 0.2;
                    // A rail at chest height you ride into is the same thing.
                    const across = Math.abs(Math.sin(angle)); // 1 = straight across a z rail
                    const railHit = !air && speed > 5 && rails.some(r => r.kind === 'rail' &&
                        (r.axis === 'z' ? across : Math.abs(Math.cos(angle))) > 0.5 &&
                        crossesRail(r, ox, oz, nx, nz) && rider.position.y < r.y - 0.15 && r.y - oldGround < 1.3);
                    if (wall || railHit) {
                        if (speed > 5) slam(railHit ? 'BAIL — ATE THE RAIL' : 'BAIL — SLAMMED');
                        else speed = 0;
                    }
                    else {
                        rider.position.x = nx;
                        rider.position.z = nz;
                    }
                    const g = ground(rider.position.x, rider.position.z);
                    if (bail <= 0) {
                        if (!air && grindBuffer > 0 && speed > 1.5 && rails.some(r => r.kind === 'rail' && nearRail(r, rider.position.x, rider.position.z, 1.4, 0.8))) {
                            air = true;
                            vy = Math.max(vy, 3.2);
                            rider.position.y += .12;
                            airAngle = angle;
                            spin = 0;
                        }
                        if (!air) {
                            rider.position.y = g;
                            const ahead = slopeAlong(rider.position.x, rider.position.z, angle);
                            // The lip: the slope ahead is still climbing at the top,
                            // or one fast step carried the rider from the steep face
                            // onto the deck — at 18 m/s a frame is 0.6 m.
                            const lip = g >= 3.4 && (ahead > 0.5 || (oldGround > 2.2 && s > 0.5)) ? lipOf(rider.position.x, rider.position.z) : null;
                            if (jump) {
                                air = true;
                                vy = 7.5;
                                airAngle = angle;
                                spin = 0;
                                note('Ollie', 100);
                                burst(10);
                            }
                            else if (lip && speed > 1 && grindBuffer > 0) {
                                stallAt(lip);
                            }
                            else if (lip && speed > 3) {
                                launch(speed);
                            }
                            // A drop off an EDGE is a transfer; a transition
                            // that simply falls away under you is a roll-in,
                            // and the slope takes it. Same discontinuity
                            // measure the wall uses, with the sign flipped.
                            else if (jump2 < -0.25 && speed > 5) {
                                air = true;
                                vy = 3 + speed * 0.22;
                                airAngle = angle;
                                spin = 0;
                                transfers++;
                                note('Transfer', 150);
                            }
                        }
                        if (air) {
                            vy -= 18 * dt;
                            rider.position.y += vy * dt;
                            if (grindBuffer > 0 && grindLock === 0) {
                                const r = rails.findIndex((r) => nearRail(r, rider.position.x, rider.position.z, r.kind === 'rail' ? 1.4 : 1.0, 0) &&
                                    Math.abs(rider.position.y - r.y) < 1.35);
                                if (r >= 0) {
                                    const rail = rails[r];
                                    grinding = r;
                                    air = false;
                                    vert = false;
                                    // Come in along the line for a 50-50, across it for a boardslide.
                                    const alongDir = rail.axis === 'z' ? Math.cos(angle) : Math.sin(angle);
                                    slide = Math.abs(alongDir) < 0.7;
                                    grindDir = alongDir < 0 ? -1 : 1;
                                    angle = rail.axis === 'z' ? (grindDir < 0 ? Math.PI : 0) : (grindDir < 0 ? -Math.PI / 2 : Math.PI / 2);
                                    addTrick(slide ? 'Boardslide' : '50–50 grind', slide ? 300 : 250);
                                    grindsDone++; lastGrind = rail.kind;
                                    grindBuffer = 0;
                                    flip = 0;
                                    grab = 0;
                                    spin = 0;
                                }
                            }
                            if (air && rider.position.y <= g && vy < 0)
                                land(g);
                        }
                    }
                }
                if ((air || grinding >= 0) && pressed.j && flip <= 0) {
                    addTrick('Kickflip', 300);
                    flip = 0.65;
                }
                if (air && pressed.k && grab <= 0) {
                    addTrick('Indy grab', 250);
                    grab = 0.7;
                }
                if (rider.position.x < -27 ||
                    rider.position.x > 27 ||
                    rider.position.z < -36.5 ||
                    rider.position.z > 36.5) {
                    rider.position.x = T.MathUtils.clamp(rider.position.x, -27, 27);
                    rider.position.z = T.MathUtils.clamp(rider.position.z, -36.5, 36.5);
                    angle += Math.PI;
                    if (air) airAngle += Math.PI;
                    speed *= 0.6;
                }
            }
        }
        // The rider pitches with the transition it is on; in the air it stays level.
        const pitchTarget = !air && grinding < 0 && bail <= 0 && stall <= 0 && active ? -Math.atan(slopeAlong(rider.position.x, rider.position.z, angle)) : 0;
        pitch += (pitchTarget - pitch) * (1 - Math.exp(-10 * dt));
        rider.rotation.set(pitch, angle, 0, 'YXZ');
        const state = { air, vy, bail, grab, flip, grinding, speed, steer, throttle, vert, slide, stall };
        if (!paused) {
            if (art.skater === 'blender') art.update(dt, state);
            else host.dataset.pose = skater.update(dt, state);
        }
        if (flip > 0) {
            flip = Math.max(0, flip - dt);
            deck.rotation.z = (1 - flip / 0.65) * Math.PI * 2;
        }
        else
            deck.rotation.z = 0;
        if (bail <= 0) deck.rotation.y = grinding >= 0 && slide ? Math.PI / 2 : 0;
        if (grab > 0) grab -= dt;
        if (active || time < 120) {
            const a = angle + camOrbit;
            const target = new T.Vector3(rider.position.x - Math.sin(a) * 7.5, rider.position.y + 3.8 + camPitch, rider.position.z - Math.cos(a) * 7.5);
            // Keep the camera inside the room. v5's decks put the skater with
            // their back to the end wall, and the chase seat went through it —
            // the whole frame was flat grey concrete.
            target.x = T.MathUtils.clamp(target.x, -27.5, 27.5);
            target.z = T.MathUtils.clamp(target.z, -36.5, 36.5);
            target.y = Math.max(target.y, 0.8);
            camera.position.lerp(target, 1 - Math.exp(-4 * dt));
            camera.lookAt(rider.position.x, rider.position.y + 1.1, rider.position.z);
            camera.fov = T.MathUtils.lerp(camera.fov, 57 + speed * 0.7, 0.03);
            camera.updateProjectionMatrix();
        }
        else {
            camera.position.x = 24 + Math.sin(now * 0.00006) * 2;
            camera.lookAt(0, 1, -6);
        }
        if (!paused) effects.update(dt, rider.position.clone().add(new T.Vector3(0, .08, 0)), speed, air, angle);
        dust.rotation.y = Math.sin(now * 0.00003) * 0.02;
        if (trickTimer > 0) {
            trickTimer -= dt;
            if (trickTimer <= 0 && !combo)
                trick = '';
        }
        for (const k in pressed)
            delete pressed[k];
        renderer.info.reset();
        look.render(scene, camera);
        host.dataset.drawCalls = String(renderer.info.render.calls);
        host.dataset.triangles = String(renderer.info.render.triangles);
        host.dataset.riderX = rider.position.x.toFixed(3);
        host.dataset.riderY = rider.position.y.toFixed(3);
        host.dataset.riderZ = rider.position.z.toFixed(3);
        host.dataset.heading = angle.toFixed(4);
        host.dataset.air = air ? 'true' : 'false';
        host.dataset.vert = vert ? 'true' : 'false';
        host.dataset.grinding = String(grinding);
        host.dataset.grindKind = grinding >= 0 ? rails[grinding].kind : '';
        host.dataset.stall = stall.toFixed(2);
        host.dataset.grindsDone = String(grindsDone);
        host.dataset.lastGrind = lastGrind;
        host.dataset.stallsDone = String(stallsDone);
        host.dataset.transfers = String(transfers);
        host.dataset.speed = speed.toFixed(2);
        host.dataset.bail = bail.toFixed(3);
        host.dataset.landingTurn = landingTurn.toFixed(3);
        host.dataset.device = device;
        host.dataset.look = look.mode;
        hudTick += dt;
        if (hudTick > 0.09) {
            hudTick = 0;
            update({
                score,
                time,
                speed,
                combo,
                mult,
                trick,
                best,
                device,
                padKind,
                ended: time <= 0,
            });
        }
    }
    const resize = () => {
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
        look.resize();
    };
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return {
        ready: art.ready,
        mobile: art.mobile,
        skater,
        lookPass: look,
        start() {
            reset();
            score = 0;
            time = 120;
            trick = '';
            grindsDone = 0; stallsDone = 0; transfers = 0; lastGrind = '';
            active = true;
            paused = false;
            blur();
            padEdge.drain();
            padWasDown.length = 0;
        },
        end() {
            bank();
            active = false;
            time = 0;
        },
        pause(p) {
            paused = p;
            blur();
            if (!p) { padEdge.drain(); padWasDown.length = 0; }
        },
        get active() { return active && time > 0; },
        get paused() { return paused; },
        key,
        look(x, y) {
            lookX = x;
            lookY = y;
        },
        stick(x, y) {
            analogX = T.MathUtils.clamp((x - 60) / 45, -1, 1);
            analogY = T.MathUtils.clamp((y - 60) / 45, -1, 1);
            device = 'TOUCH';
        },
        // SETUP ONLY, for the gate: stand the skater somewhere with a heading
        // and a speed. It never performs a trick — every action under test is
        // driven through the real pad or keyboard.
        // Read-only views of the authored room, for the gate.
        props: () => PROPS.map(p => ({ ...p })),
        rails: () => rails.map(r => ({ ...r })),
        ground: (x, z) => ground(x, z),
        placeAt(x, z, heading = Math.PI, v = 0) {
            settle();
            rider.position.set(x, ground(x, z), z);
            angle = heading;
            speed = v;
            pitch = 0;
        },
        setLook(mode) { look.setMode(mode); skater.setPS1(mode === 'ps1'); },
        setReflections(value) { look.setReflections(value === 'on' || (value === 'auto' && !art.mobile)); },
        setSkater(kind) { return art.setSkater(kind); },
        get skaterKind() { return art.skater; },
        dispose() {
            art.dispose(); effects.dispose(); look.dispose(); skater.dispose();
            cancelAnimationFrame(raf);
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
            window.removeEventListener('resize', resize);
            renderer.domElement.remove();
            scene.traverse((o) => {
                if (o instanceof T.Mesh || o instanceof T.Points) {
                    o.geometry.dispose();
                    const ms = Array.isArray(o.material) ? o.material : [o.material];
                    ms.forEach((m) => m.dispose());
                }
            });
            texture.dispose();
            renderer.dispose();
        },
    };
}
