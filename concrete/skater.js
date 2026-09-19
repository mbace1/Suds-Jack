import * as T from './vendor/three.module.min.js?v=185';

// The skater in the register of the original Tony Hawk's Pro Skater: a
// few dozen flat boxes, Gouraud-lit, a face that is eight pixels of texture
// with the filtering off, baggy jeans, big shoes, and poses that SNAP rather
// than blend. Nothing here is loaded — the whole figure is built in code, so
// it is the same skater on the mobile tier and the desktop tier, and the
// Blender rig is one option away rather than the thing everything depends on.
//
// Conventions: the group origin is the top of the deck. Travel is local +z.
// The skater stands ACROSS the board facing local +x (regular stance), so the
// front foot is at +z and the back foot at -z. Rotating a limb about z swings
// it fore/aft in the facing direction, about x swings it along the board.

const OUTFIT = {
  skin: '#c98e66', tee: '#e9e4d6', jeans: '#2c3d5a', shoe: '#efe9df',
  sole: '#22262a', cap: '#16202a', hair: '#3a2618', print: '#1d2a31',
};

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.magFilter = t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

const faceTexture = () => canvasTexture(16, 16, g => {
  g.fillStyle = OUTFIT.skin; g.fillRect(0, 0, 16, 16);
  g.fillStyle = OUTFIT.hair; g.fillRect(3, 3, 4, 1); g.fillRect(9, 3, 4, 1);
  g.fillStyle = '#f4efe6'; g.fillRect(3, 5, 4, 3); g.fillRect(9, 5, 4, 3);
  g.fillStyle = '#1a1614'; g.fillRect(4, 6, 2, 2); g.fillRect(10, 6, 2, 2);
  g.fillStyle = '#a86f52'; g.fillRect(7, 8, 2, 3);
  g.fillStyle = '#6e3f34'; g.fillRect(5, 12, 6, 1);
});

const printTexture = () => canvasTexture(32, 32, g => {
  g.fillStyle = OUTFIT.tee; g.fillRect(0, 0, 32, 32);
  g.fillStyle = OUTFIT.print;
  g.fillRect(6, 9, 20, 3); g.fillRect(6, 20, 20, 3);
  g.beginPath(); g.moveTo(16, 11); g.lineTo(21, 16); g.lineTo(16, 21); g.lineTo(11, 16); g.closePath(); g.fill();
  g.fillStyle = '#dafa45'; g.fillRect(14, 14, 4, 4);
});

// A pose is a flat map of joint -> [rx, ry, rz] plus hipsY and a root
// transform, and every state is written as an edit of `base(crouch)`, so the
// legs always agree with the hips height and a crouch reads as one number.
const JOINTS = ['hips', 'torso', 'head', 'shoulderL', 'elbowL', 'shoulderR', 'elbowR', 'thighF', 'shinF', 'footF', 'thighB', 'shinB', 'footB', 'root'];
const LEG = 0.82, FOOT = 0.1925; // thigh + shin, and hip joint drop + shoe

function base(c) {
  const a = 0.18 + c * 1.05;
  return {
    hips: [0, 0, 0], torso: [0, 0, c * 0.35], head: [0, -0.5, -c * 0.2],
    shoulderL: [-0.25, 0, 0.15], elbowL: [0, 0, 0.3], shoulderR: [0.25, 0, 0.15], elbowR: [0, 0, 0.3],
    thighF: [-0.2, 0, a], shinF: [0, 0, -2 * a], footF: [0.2, 0, a],
    thighB: [0.2, 0, a], shinB: [0, 0, -2 * a], footB: [-0.2, 0, a],
    root: [0, 0, 0], rootZ: 0, hipsY: FOOT + LEG * Math.cos(a),
  };
}
const legFor = hipsY => Math.acos(T.MathUtils.clamp((hipsY - FOOT) / LEG, -1, 1));

const POSES = {
  idle(s, t) {
    const p = base(0.12);
    p.torso[2] += Math.sin(t * 1.5) * 0.03;
    p.head[1] = -0.2 + Math.sin(t * 0.7) * 0.15;
    return p;
  },
  coast(s) {
    const p = base(0.3 + Math.min(0.25, s.speed / 40));
    p.shoulderL = [-0.55, 0, 0.1]; p.shoulderR = [0.55, 0, 0.1];
    p.elbowL = [0, 0, 0.25]; p.elbowR = [0, 0, 0.25];
    p.torso[2] = 0.2; p.head[1] = -0.9;
    return p;
  },
  push(s, t) {
    const p = base(0.35);
    const sw = Math.sin(t * 2.4 * Math.PI * 2);
    p.hipsY = 0.86;
    const a = legFor(p.hipsY);
    p.thighF = [-0.2, 0, a]; p.shinF = [0, 0, -2 * a]; p.footF = [0.2, 0, a];
    p.thighB = [0.25 + 0.7 * sw, 0, 0.05]; p.shinB = [0, 0, -0.15 - 0.6 * Math.max(0, -sw)]; p.footB = [-0.25 - 0.4 * sw, 0, 0.1];
    p.torso = [0.2, 0, 0.25]; p.head[1] = -0.9;
    p.shoulderL = [-0.4, 0, 0.3]; p.shoulderR = [0.4, 0, -0.2];
    return p;
  },
  crouch() {
    const p = base(0.75);
    p.shoulderL = [-0.3, 0, -0.5]; p.shoulderR = [0.3, 0, -0.5];
    return p;
  },
  ollie() {
    const p = base(0.5);
    p.hipsY = 0.72;
    p.thighF = [-0.2, 0, 1.5]; p.shinF = [0, 0, -2.3]; p.footF = [0.2, -0.3, 0.9];
    p.thighB = [0.2, 0, 0.9]; p.shinB = [0, 0, -1.9]; p.footB = [-0.2, 0, 1.0];
    p.shoulderL = [-1.1, 0, 0.3]; p.shoulderR = [1.1, 0, 0.3]; p.elbowL = [0, 0, 0.4]; p.elbowR = [0, 0, 0.4];
    p.torso = [0, 0, 0.3]; p.head[1] = -0.6;
    return p;
  },
  air(s) {
    const p = base(0.5);
    p.hipsY = 0.62;
    p.thighF = [-0.2, 0, 0.95]; p.shinF = [0, 0, -1.7]; p.footF = [0.2, 0, 0.75];
    p.thighB = [0.2, 0, 0.95]; p.shinB = [0, 0, -1.7]; p.footB = [-0.2, 0, 0.75];
    p.shoulderL = [-1.3, 0, 0.4]; p.shoulderR = [1.3, 0, 0.4]; p.elbowL = [0, 0, 0.3]; p.elbowR = [0, 0, 0.3];
    p.torso = [-s.steer * 0.2, 0, 0.25]; p.head[1] = -0.7;
    return p;
  },
  kickflip(s) {
    const p = POSES.air(s);
    const k = 1 - s.flip / 0.65;
    p.thighF = [-0.2, 0, 0.5]; p.shinF = [0, 0, -0.6]; p.footF = [0.2, -1.2 * Math.sin(k * Math.PI), 0.2];
    p.shoulderL = [-1.0, 0, -0.9]; p.shoulderR = [1.2, 0, 0.1];
    return p;
  },
  grab() {
    const p = base(0.6);
    p.hipsY = 0.55;
    p.thighF = [-0.2, 0, 1.2]; p.shinF = [0, 0, -2.0]; p.footF = [0.2, 0, 0.8];
    p.thighB = [0.2, 0, 1.2]; p.shinB = [0, 0, -2.0]; p.footB = [-0.2, 0, 0.8];
    p.torso = [0, 0, 0.55]; p.head = [0, -0.4, -0.3];
    p.shoulderR = [-0.4, 0, 0.8]; p.elbowR = [0, 0, 0.5];
    p.shoulderL = [-0.9, 0, -1.0]; p.elbowL = [0, 0, 0.3];
    return p;
  },
  grind(s, t) {
    const p = base(0.45);
    p.shoulderL = [-1.0, 0, -0.15]; p.shoulderR = [1.0, 0, -0.15]; p.elbowL = [0, 0, 0.2]; p.elbowR = [0, 0, 0.2];
    p.torso = [Math.sin(t * 9) * 0.05, s.slide ? 0.3 : 0, -0.05]; p.head = [0, -0.5, -0.35];
    return p;
  },
  land() {
    const p = base(0.65);
    p.shoulderL = [-0.7, 0, 0.2]; p.shoulderR = [0.7, 0, 0.2];
    p.torso[2] = 0.3;
    return p;
  },
  bail(s) {
    const k = T.MathUtils.clamp((1.1 - s.bail) / 0.75, 0, 1); // 0 at the hit, 1 flat on the floor
    const p = base(0.4);
    p.root = [-1.55 * Math.min(1, k * 1.6), 0, 0.25 * k];
    p.rootZ = 1.1 * k;
    p.shoulderL = [-0.6, 0, -2.2]; p.shoulderR = [0.6, 0, -2.2]; p.elbowL = [0, 0, 0.8]; p.elbowR = [0, 0, 0.8];
    p.thighF = [-0.3, 0, 0.8]; p.shinF = [0, 0, -1.0]; p.thighB = [0.3, 0, 0.6]; p.shinB = [0, 0, -1.2];
    p.torso = [0, 0, 0.4]; p.head = [0, -0.2, 0.3];
    return p;
  },
  recover(s) {
    const k = 1 - s.bail / 0.35; // 0 flat, 1 standing
    const p = base(0.5 * (1 - k) + 0.15);
    p.root = [-1.55 * (1 - k), 0, 0.25 * (1 - k)];
    p.rootZ = 1.1 * (1 - k);
    p.shoulderL = [-0.3, 0, 0.5 * (1 - k)]; p.shoulderR = [0.3, 0, 0.5 * (1 - k)];
    return p;
  },
};

export function createSkater() {
  const mats = [], textures = [];
  const snap = { value: 0 };
  const M = (color, extra = {}) => {
    const m = new T.MeshLambertMaterial({ color, ...extra });
    m.onBeforeCompile = sh => {
      sh.uniforms.ps1Snap = snap;
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'uniform float ps1Snap;\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\nif (ps1Snap > 0.5) { vec2 res = vec2(160.0, 120.0); vec2 ndc = gl_Position.xy / gl_Position.w; ndc = floor(ndc * res + 0.5) / res; gl_Position.xy = ndc * gl_Position.w; }');
    };
    m.customProgramCacheKey = () => 'thps-snap';
    mats.push(m);
    return m;
  };
  const face = faceTexture(), print = printTexture();
  textures.push(face, print);
  const skin = M(OUTFIT.skin), tee = M(OUTFIT.tee), jeans = M(OUTFIT.jeans), shoe = M(OUTFIT.shoe),
    sole = M(OUTFIT.sole), cap = M(OUTFIT.cap), hair = M(OUTFIT.hair),
    faceMat = M('#ffffff', { map: face }), printMat = M('#ffffff', { map: print });

  const group = new T.Group();
  group.name = 'thps-skater';
  group.position.y = 0.17;
  const root = new T.Group();
  group.add(root);
  const part = (w, h, d, x, y, z, m, parent) => {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const joint = (x, y, z, parent) => {
    const j = new T.Group();
    j.position.set(x, y, z);
    parent.add(j);
    return j;
  };
  const J = {};
  J.root = root;
  J.hips = joint(0, 0.98, 0, root);
  part(0.26, 0.16, 0.34, 0, 0, 0, jeans, J.hips);
  J.torso = joint(0, 0.08, 0, J.hips);
  const chest = new T.Mesh(new T.BoxGeometry(0.24, 0.5, 0.42), [printMat, tee, tee, tee, tee, tee]);
  chest.position.y = 0.25; chest.castShadow = true;
  J.torso.add(chest);
  J.head = joint(0, 0.52, 0, J.torso);
  part(0.1, 0.08, 0.12, 0, 0.04, 0, skin, J.head);
  const skull = new T.Mesh(new T.BoxGeometry(0.24, 0.26, 0.22), [faceMat, skin, skin, skin, skin, skin]);
  skull.position.y = 0.21; skull.castShadow = true;
  J.head.add(skull);
  part(0.25, 0.06, 0.23, -0.01, 0.33, 0, hair, J.head);
  part(0.27, 0.1, 0.25, -0.01, 0.38, 0, cap, J.head);
  part(0.16, 0.03, 0.2, 0.2, 0.35, 0, cap, J.head);
  for (const [side, z] of [['L', 0.27], ['R', -0.27]]) {
    const sh = J['shoulder' + side] = joint(0, 0.46, z, J.torso);
    part(0.14, 0.14, 0.13, 0, -0.05, 0, tee, sh);
    part(0.11, 0.2, 0.11, 0, -0.2, 0, skin, sh);
    const el = J['elbow' + side] = joint(0, -0.31, 0, sh);
    part(0.1, 0.26, 0.1, 0, -0.13, 0, skin, el);
    part(0.09, 0.1, 0.09, 0, -0.3, 0, skin, el);
  }
  for (const [side, z] of [['F', 0.11], ['B', -0.11]]) {
    const th = J['thigh' + side] = joint(0, -0.06, z, J.hips);
    part(0.2, 0.42, 0.2, 0, -0.21, 0, jeans, th);
    const sh = J['shin' + side] = joint(0, -0.42, 0, th);
    part(0.18, 0.4, 0.18, 0, -0.2, 0, jeans, sh);
    const ft = J['foot' + side] = joint(0, -0.4, 0, sh);
    part(0.32, 0.09, 0.19, 0.03, -0.06, 0, shoe, ft);
    part(0.33, 0.035, 0.2, 0.03, -0.115, 0, sole, ft);
  }

  const cur = base(0.12);
  let state = 'idle', clock = 0, acc = 0, ps1 = false, wasAir = false, landing = 0;
  function apply() {
    for (const j of JOINTS) if (J[j]) J[j].rotation.set(cur[j][0], cur[j][1], cur[j][2]);
    J.hips.position.y = cur.hipsY;
    root.position.z = cur.rootZ;
  }
  apply();

  function stateFor(s) {
    if (s.bail > 0.35) return 'bail';
    if (s.bail > 0) return 'recover';
    if (s.grab > 0) return 'grab';
    if (s.flip > 0) return 'kickflip';
    if (s.grinding >= 0) return 'grind';
    if (s.air) return s.vy > 4 && !s.vert ? 'ollie' : 'air';
    if (landing > 0) return 'land';
    if (s.speed < 0.2) return 'idle';
    return s.throttle > 0 && s.speed < 10 ? 'push' : 'coast';
  }

  // Poses snap toward their target with an exponential rate that is fast
  // enough to read as a keyframe change, and on the PS1 look the update is
  // held to fifteen steps a second, which is the frame cadence the original
  // animated at and most of why its skaters move the way they do.
  function update(dt, s) {
    if (wasAir && !s.air && s.grinding < 0) landing = 0.22;
    wasAir = s.air;
    landing = Math.max(0, landing - dt);
    clock += dt;
    acc += dt;
    if (ps1 && acc < 1 / 15) return state;
    const step = acc; acc = 0;
    state = stateFor(s);
    const target = POSES[state](s, clock);
    const rate = state === 'ollie' || state === 'land' || state === 'bail' ? 22 : 13;
    const k = 1 - Math.exp(-rate * step);
    for (const j of JOINTS) {
      const t = target[j], c = cur[j];
      for (let i = 0; i < 3; i++) c[i] += (t[i] - c[i]) * k;
    }
    cur.hipsY += (target.hipsY - cur.hipsY) * k;
    cur.rootZ += (target.rootZ - cur.rootZ) * k;
    // Lean into a turn from the ankles rather than tilting the whole rider.
    cur.root[2] += ((target.root[2] - (s.air || s.grinding >= 0 ? 0 : s.steer * 0.1)) - cur.root[2]) * k;
    apply();
    return state;
  }

  return {
    group, joints: J, update,
    get state() { return state; },
    setPS1(on) { ps1 = !!on; snap.value = on ? 1 : 0; },
    hold(name, t = 0.5) { // debug: freeze a named pose for a contact sheet
      const target = POSES[name]({ speed: 5, steer: 0, flip: 0.65 * (1 - t), bail: name === 'bail' ? 1.1 - 0.75 * t : name === 'recover' ? 0.35 * (1 - t) : 0, vy: 5, air: true, grinding: -1, grab: 0, slide: false }, t * 4);
      for (const j of JOINTS) cur[j] = [...target[j]];
      cur.hipsY = target.hipsY; cur.rootZ = target.rootZ;
      apply();
    },
    poses: Object.keys(POSES),
    dispose() {
      group.removeFromParent();
      group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      for (const m of mats) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
