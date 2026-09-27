// Sky — where most of the surreal comes from, and now where most of the
// purple is. A violet zenith bleeding down through purple into a lilac
// horizon; a small hard sun that BLOOMS (it is drawn over-white so the bloom
// pass catches it and nothing else in the sky); the ringed body ahead; a moon.
//
// The rule that keeps being relearned: horizon and fog must be the SAME value.
import * as THREE from 'three';
import { PAL } from './palette.js?v=11';

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  const hex = v => '#' + new THREE.Color(v).getHexString();
  grd.addColorStop(0.00, hex(PAL.zenith));
  grd.addColorStop(0.30, hex(PAL.skyHigh));
  grd.addColorStop(0.58, hex(PAL.skyMid));
  grd.addColorStop(0.80, hex(PAL.horizon));
  grd.addColorStop(1.00, hex(PAL.fog));
  g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

function discTexture(inner, outer, spikes) {
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const m = N / 2;
  const halo = g.createRadialGradient(m, m, 2, m, m, m);
  halo.addColorStop(0, inner);
  halo.addColorStop(0.11, inner);
  halo.addColorStop(0.26, outer);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.fillRect(0, 0, N, N);
  if (spikes) {
    g.strokeStyle = 'rgba(255,240,225,0.28)';
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.3, r = i % 2 ? N * 0.3 : N * 0.46;
      g.beginPath();
      g.moveTo(m + Math.cos(a) * N * 0.1, m + Math.sin(a) * N * 0.1);
      g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

// ---- the ringed body ---------------------------------------------------------
// v11. It was three flat unlit meshes — a pink disc, a paler partial sphere
// for a lit edge, a flat translucent annulus — and under the PS2 posterise it
// read as a sticker on the sky. Now it is LIT by the same sun as everything
// else, which sits ahead and to the right of it, so what you see is what a
// low sun behind a gas giant gives: mostly its night side, washed toward the
// sky by the air in front of it, and a hard bright crescent on the sun side
// with a soft terminator and a lilac limb. The ring is banded with a gap in
// it; the body throws its shadow across the ring and the ring throws a band
// of shadow across the crescent. Both are worked out per pixel against a
// ray to the sun, in the planet's own frame, where the ring is the plane y=0.
const BODY_VERT = `
varying vec3 vN;
varying vec3 vL;
varying vec3 vV;
void main() {
  vL = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const BODY_FRAG = `
uniform vec3 uSun;        // toward the sun, world
uniform vec3 uSunL;       // toward the sun, the body's own frame
uniform vec3 uLit, uDark, uLimb, uAir;
uniform float uBands, uAirK, uRing;
uniform vec2 uRingR;      // inner, outer radius, body radii
varying vec3 vN;
varying vec3 vL;
varying vec3 vV;
void main() {
  float ndl = dot(normalize(vN), uSun);
  float lit = smoothstep(-0.10, 0.30, ndl);
  // the ring's shadow on the body: a ray to the sun that crosses the ring
  // plane inside the ring's radii is in its shade
  vec3 P = normalize(vL);
  if (uRing > 0.0 && abs(uSunL.y) > 1e-3) {
    float t = -P.y / uSunL.y;
    if (t > 0.0) {
      float r = length((P + uSunL * t).xz);
      float inRing = smoothstep(uRingR.x, uRingR.x + 0.06, r) * (1.0 - smoothstep(uRingR.y - 0.08, uRingR.y, r));
      lit *= 1.0 - 0.62 * inRing * uRing;
    }
  }
  // latitude bands, drawn in the body's frame so they lie along the ring
  float lat = P.y;
  float band = 0.5 + 0.5 * sin(lat * 21.0 + 1.3 * sin(lat * 6.0 + 0.8));
  vec3 surf = uLit * (1.0 - uBands * band);
  vec3 col = mix(uDark, surf, lit);
  // the limb: its own air, brightest on the lit side
  float fr = pow(1.0 - max(0.0, dot(normalize(vN), vV)), 2.6);
  col += uLimb * fr * (0.25 + 0.75 * lit);
  // and ours, in front of it
  col = mix(col, uAir, uAirK);
  gl_FragColor = vec4(col, 1.0);
}`;

const RING_VERT = `
varying vec3 vL;
void main() {
  vL = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const RING_FRAG = `
uniform vec3 uSunL;
uniform vec3 uLit, uShade, uAir;
uniform vec2 uRingR;
uniform float uAirK;
varying vec3 vL;
void main() {
  vec3 Q = vL;
  float r = length(Q.xz);
  float u = (r - uRingR.x) / (uRingR.y - uRingR.x);
  // bands: a dim inner ring, the bright main ring, a GAP, a thinner outer one
  float dens = 0.35 + 0.25 * sin(u * 61.0) * sin(u * 23.0 + 1.0);
  dens *= smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.93, 1.0, u));
  dens *= 1.0 - 0.9 * (smoothstep(0.60, 0.63, u) - smoothstep(0.68, 0.71, u));
  dens *= mix(0.55, 1.0, smoothstep(0.18, 0.30, u));
  // the body's shadow: a ray to the sun from here that hits the unit sphere
  float b = dot(Q, uSunL), c = dot(Q, Q) - 1.0;
  float shadow = (b < 0.0 && b * b - c > 0.0) ? 1.0 : 0.0;
  vec3 col = mix(uLit, uShade, shadow);
  col = mix(col, uAir, uAirK);
  gl_FragColor = vec4(col, clamp(dens * 1.25, 0.0, 1.0) * mix(0.9, 0.7, shadow));
}`;

function ringedBody(toSun) {
  const g = new THREE.Group();
  const RR = new THREE.Vector2(1.32, 2.25);
  const air = new THREE.Color(PAL.skyMid).lerp(new THREE.Color(PAL.horizon), 0.45);
  const common = { uSun: { value: toSun.clone() }, uSunL: { value: new THREE.Vector3() }, uRingR: { value: RR } };
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.ShaderMaterial({
    uniforms: {
      ...common,
      uLit: { value: new THREE.Color(0xf4dcdc) }, uDark: { value: new THREE.Color(PAL.planet).multiplyScalar(0.42) },
      uLimb: { value: new THREE.Color(0xb88ee0) }, uAir: { value: air },
      uBands: { value: 0.24 }, uAirK: { value: 0.20 }, uRing: { value: 1 },
    },
    vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, fog: false,
  }));
  g.add(body);
  const ringGeo = new THREE.RingGeometry(RR.x, RR.y, 128, 1);
  ringGeo.rotateX(-Math.PI / 2);                 // into the body's y=0 plane
  const ring = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({
    uniforms: {
      uSunL: common.uSunL, uRingR: common.uRingR,
      uLit: { value: new THREE.Color(PAL.planetRim).lerp(new THREE.Color(0xfff0e6), 0.3) },
      uShade: { value: new THREE.Color(PAL.planet).multiplyScalar(0.55) },
      uAir: { value: air }, uAirK: { value: 0.22 },
    },
    vertexShader: RING_VERT, fragmentShader: RING_FRAG,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false,
  }));
  g.add(ring);
  // the tilt: the ring opens about twenty degrees toward the road
  g.rotation.set(0.36, 0, -0.17);
  g.userData = { body, ring, sunL: common.uSunL.value };
  return g;
}

/** A moon: the body's shader without bands or a ring. */
function moonBody(toSun) {
  return new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: toSun.clone() }, uSunL: { value: new THREE.Vector3(0, 1, 0) }, uRingR: { value: new THREE.Vector2(1, 1) },
      uLit: { value: new THREE.Color(PAL.moon) }, uDark: { value: new THREE.Color(PAL.skyMid).multiplyScalar(0.9) },
      uLimb: { value: new THREE.Color(0x6a5a8a) }, uAir: { value: new THREE.Color(PAL.skyHigh).lerp(new THREE.Color(PAL.skyMid), 0.5) },
      uBands: { value: 0.0 }, uAirK: { value: 0.28 }, uRing: { value: 0 },
    },
    vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, fog: false,
  }));
}

function rangeGeometry() {
  const N = 72, R = 1500;
  const pos = [], col = [];
  const near = new THREE.Color(PAL.fog);
  const far = new THREE.Color(PAL.fog).lerp(new THREE.Color(PAL.skyMid), 0.22);
  const h = i => {
    const a = i / N * Math.PI * 2;
    const base = 34 + 40 * (0.5 + 0.5 * Math.sin(a * 2.3 + 1.1));
    const step = Math.round((0.5 + 0.5 * Math.sin(a * 6.1 + 4.0)) * 3) / 3;
    return base * (0.45 + 0.55 * step);
  };
  const push = (i, y, c) => {
    const a = i / N * Math.PI * 2;
    pos.push(Math.cos(a) * R, y, Math.sin(a) * R);
    col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < N; i++) {
    const h0 = h(i), h1 = h(i + 1);
    push(i, -180, near); push(i + 1, -180, near); push(i, h0, far);
    push(i + 1, -180, near); push(i + 1, h1, far); push(i, h0, far);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function makeSky(scene, sunDir) {
  const group = new THREE.Group();

  const dome = new THREE.Mesh(new THREE.SphereGeometry(2600, 24, 16),
    new THREE.MeshBasicMaterial({ map: gradientTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -5;
  group.add(dome);

  const range = new THREE.Mesh(rangeGeometry(), new THREE.MeshBasicMaterial({
    vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  range.renderOrder = -2; range.position.y = -60;
  group.add(range);

  // Over-white on purpose: MeshBasic does not clamp, so a colour above 1.0
  // pushes the disc past the bloom threshold and the sun is the one thing in
  // the sky that glows. That is the whole point of the pass.
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(360, 360),
    new THREE.MeshBasicMaterial({
      map: discTexture('rgba(255,244,228,1)', 'rgba(255,196,160,0.42)', true),
      color: new THREE.Color(2.6, 2.4, 2.0),
      transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  sun.renderOrder = -4;
  group.add(sun);

  const toSun = new THREE.Vector3(-sunDir[0], -sunDir[1], -sunDir[2]).normalize();
  // v11: smaller (it was 40 degrees of sky with its ring) and lit. Lit by a
  // sun swung toward the camera: the real one is 38 degrees from the planet
  // and would light a hairline crescent; swung, it is a half phase whose lit
  // side still faces the sun on the screen, which is all the eye checks.
  const planetSun = toSun.clone().add(new THREE.Vector3(0, 0, 0.85)).normalize();
  const planet = ringedBody(planetSun);
  planet.scale.setScalar(330); planet.renderOrder = -3;
  planet.userData.body.renderOrder = -3; planet.userData.ring.renderOrder = -2.5;
  group.add(planet);
  // the sun in the planet's own frame, for the two shadows — the tilt never
  // changes, so once
  planet.updateMatrixWorld(true);
  planet.userData.sunL.copy(planetSun).applyQuaternion(planet.quaternion.clone().invert()).normalize();

  const moon = moonBody(toSun);
  moon.scale.setScalar(52); moon.renderOrder = -3;
  group.add(moon);

  // the sky is its own layer so the full-res depth prepass can skip it
  group.traverse(o => o.layers.set(3));
  scene.add(group);
  const _p = new THREE.Vector3();

  return {
    group, toSun,
    update(camera) {
      group.position.copy(camera.position);
      sun.position.copy(_p.copy(toSun).multiplyScalar(2000));
      sun.quaternion.copy(camera.quaternion);
      // AHEAD, not behind: the route runs toward -z and this is the best
      // thing in the sky. Parked behind the player nobody ever sees it.
      planet.position.set(-900, 330, -2350);
      moon.position.set(980, 900, -1100);
    },
  };
}
