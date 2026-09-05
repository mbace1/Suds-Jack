// Sky — where most of the surreal comes from, and now where most of the
// purple is. A violet zenith bleeding down through purple into a lilac
// horizon; a small hard sun that BLOOMS (it is drawn over-white so the bloom
// pass catches it and nothing else in the sky); the ringed body ahead; a moon.
//
// The rule that keeps being relearned: horizon and fog must be the SAME value.
import * as THREE from 'three';
import { PAL } from './palette.js?v=5';

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

function ringedBody() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshBasicMaterial({ color: PAL.planet, fog: false })));
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(1.008, 20, 14, 0, Math.PI * 0.62, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: PAL.planetRim, fog: false }));
  rim.rotation.y = -0.9;
  g.add(rim);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.15, 48),
    new THREE.MeshBasicMaterial({ color: PAL.planetRim, fog: false, side: THREE.DoubleSide,
      transparent: true, opacity: 0.5 }));
  ring.rotation.x = Math.PI / 2 - 0.30; ring.rotation.z = 0.16;
  g.add(ring);
  return g;
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

  const planet = ringedBody();
  planet.scale.setScalar(400); planet.renderOrder = -3;
  group.add(planet);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: PAL.moon, fog: false }));
  moon.scale.setScalar(52); moon.renderOrder = -3;
  group.add(moon);

  // the sky is its own layer so the full-res depth prepass can skip it
  group.traverse(o => o.layers.set(3));
  scene.add(group);
  const toSun = new THREE.Vector3(-sunDir[0], -sunDir[1], -sunDir[2]).normalize();
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
