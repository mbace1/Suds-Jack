// Sky — where most of the surreal comes from.
//
// A violet zenith bleeding down into an amber horizon; a small hard sun; an
// enormous ringed body sitting on the skyline that is far too close to be a
// planet and far too big to be a moon; a second moon; and a band of cloud
// that does not move like weather. Everything rides with the camera, so the
// flats never run out of world.
//
// The one rule that keeps being relearned: the horizon colour and the fog
// colour must be the SAME value, or the ground stops at a hard seam against
// the sky and no amount of atmosphere hides it.
import * as THREE from 'three';
import { PAL } from './palette.js?v=3';

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  const hex = v => '#' + new THREE.Color(v).getHexString();
  grd.addColorStop(0.00, hex(PAL.zenith));
  grd.addColorStop(0.34, hex(PAL.skyHigh));
  grd.addColorStop(0.62, hex(PAL.skyMid));
  grd.addColorStop(0.82, hex(PAL.horizon));
  grd.addColorStop(1.00, hex(PAL.fog));
  g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function discTexture(inner, outer, spikes) {
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const m = N / 2;
  const halo = g.createRadialGradient(m, m, 2, m, m, m);
  halo.addColorStop(0, inner);
  halo.addColorStop(0.13, inner);
  halo.addColorStop(0.30, outer);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.fillRect(0, 0, N, N);
  if (spikes) {
    g.strokeStyle = 'rgba(255,250,235,0.30)';
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
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

/** The ringed body: a shaded sphere plus a flat ring, both unlit and faked. */
function ringedBody() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 20),
    new THREE.MeshBasicMaterial({ color: PAL.planet, fog: false }));
  g.add(body);
  // a crescent of rim light, so it reads as lit by the same sun as the ground
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(1.008, 28, 20, 0, Math.PI * 0.62, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: PAL.planetRim, fog: false, side: THREE.FrontSide }));
  rim.rotation.y = -0.9;
  g.add(rim);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 2.15, 64),
    new THREE.MeshBasicMaterial({
      color: PAL.planetRim, fog: false, side: THREE.DoubleSide,
      transparent: true, opacity: 0.55 }));
  ring.rotation.x = Math.PI / 2 - 0.30;
  ring.rotation.z = 0.16;
  g.add(ring);
  return g;
}

/** Distant range: a ring of mesa silhouettes barely separated from the haze. */
function rangeGeometry() {
  const N = 72, R = 1500;
  const pos = [], col = [];
  const near = new THREE.Color(PAL.fog);
  const far = new THREE.Color(PAL.fog).lerp(new THREE.Color(PAL.rock), 0.20);
  const h = i => {
    const a = i / N * Math.PI * 2;
    // flat-topped, because this is a mesa country and the skyline says so
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

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 32, 20),
    new THREE.MeshBasicMaterial({
      map: gradientTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -5;
  group.add(dome);

  const range = new THREE.Mesh(rangeGeometry(), new THREE.MeshBasicMaterial({
    vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  range.renderOrder = -2;
  range.position.y = -60;
  group.add(range);

  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(330, 330),
    new THREE.MeshBasicMaterial({
      map: discTexture('rgba(255,252,240,1)', 'rgba(255,214,150,0.35)', true),
      transparent: true, fog: false, depthWrite: false,
      blending: THREE.AdditiveBlending }));
  sun.renderOrder = -4;
  group.add(sun);

  const planet = ringedBody();
  planet.scale.setScalar(400);
  planet.renderOrder = -3;
  group.add(planet);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshBasicMaterial({ color: PAL.moon, fog: false }));
  moon.scale.setScalar(52);
  moon.renderOrder = -3;
  group.add(moon);

  scene.add(group);

  const toSun = new THREE.Vector3(-sunDir[0], -sunDir[1], -sunDir[2]).normalize();
  const _p = new THREE.Vector3();

  return {
    group, toSun,
    update(camera) {
      group.position.copy(camera.position);
      sun.position.copy(_p.copy(toSun).multiplyScalar(2000));
      sun.quaternion.copy(camera.quaternion);
      // AHEAD, not behind. The route runs toward -z and this is the single
      // best thing in the sky; parked behind the player it is scenery nobody
      // ever sees. Out in front it looms over every straight.
      planet.position.set(-900, 330, -2350);
      moon.position.set(980, 900, -1100);
    },
  };
}
