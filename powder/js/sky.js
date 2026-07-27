// Sky — the backdrop from the reference plates: a hazy gradient, one blown-out
// sun with a few thin rays, and a ring of distant ranges dissolving into the
// haze. All of it rides with the camera, so the descent never runs out of world.
import * as THREE from 'three';
import { PAL, SUN_DIR } from './palette.js?v=2';

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0.00, '#' + new THREE.Color(PAL.skyTop).getHexString());
  grd.addColorStop(0.46, '#' + new THREE.Color(PAL.skyMid).getHexString());
  grd.addColorStop(0.72, '#' + new THREE.Color(PAL.skyLow).getHexString());
  grd.addColorStop(1.00, '#' + new THREE.Color(PAL.fog).getHexString());
  g.fillStyle = grd; g.fillRect(0, 0, 8, 128);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function sunTexture() {
  const N = 128, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const mid = N / 2;
  // wide warm bloom, then the hard white disc — the plates blow it right out
  const halo = g.createRadialGradient(mid, mid, 4, mid, mid, mid);
  halo.addColorStop(0, 'rgba(255,253,244,1)');
  halo.addColorStop(0.16, 'rgba(255,251,230,0.85)');
  halo.addColorStop(0.34, 'rgba(246,230,180,0.34)');
  halo.addColorStop(0.7, 'rgba(246,230,180,0.07)');
  halo.addColorStop(1, 'rgba(246,230,180,0)');
  g.fillStyle = halo; g.fillRect(0, 0, N, N);
  g.fillStyle = 'rgba(255,255,255,1)';
  g.beginPath(); g.arc(mid, mid, N * 0.145, 0, Math.PI * 2); g.fill();
  // thin flare spikes
  g.strokeStyle = 'rgba(255,252,236,0.5)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + 0.2, r = i % 2 ? N * 0.30 : N * 0.46;
    g.beginPath();
    g.moveTo(mid + Math.cos(a) * N * 0.14, mid + Math.sin(a) * N * 0.14);
    g.lineTo(mid + Math.cos(a) * r, mid + Math.sin(a) * r);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function ridgeGeometry() {
  const N = 56, R = 820;
  const pos = [], col = [];
  // A whisper, not a range. This ring spans the whole frame by construction,
  // so any real contrast here paints one grey wing straight across the shot —
  // it has to sit within a hair of the haze it stands in.
  const near = new THREE.Color(PAL.fog);
  const far = new THREE.Color(PAL.fog).lerp(new THREE.Color(PAL.skyMid), 0.22);
  const h = i => {
    const a = i / N * Math.PI * 2;
    return 8 + 16 * (0.5 + 0.5 * Math.sin(a * 3.1 + 1.2))
             + 10 * (0.5 + 0.5 * Math.sin(a * 7.7 + 4.4));
  };
  const push = (i, y, c) => {
    const a = i / N * Math.PI * 2;
    pos.push(Math.cos(a) * R, y, Math.sin(a) * R);
    col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < N; i++) {
    const h0 = h(i), h1 = h(i + 1);
    // two triangles per segment: base strip up to the ridge line
    push(i, -70, near); push(i + 1, -70, near); push(i, h0, far);
    push(i + 1, -70, near); push(i + 1, h1, far); push(i, h0, far);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function makeSky(scene) {
  const group = new THREE.Group();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 16, 10),
    new THREE.MeshBasicMaterial({ map: gradientTexture(), side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -3;
  group.add(dome);

  const ridges = new THREE.Mesh(ridgeGeometry(),
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: false }));
  ridges.renderOrder = -2;
  group.add(ridges);

  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshBasicMaterial({ map: sunTexture(), transparent: true, fog: false, depthWrite: false }));
  sun.renderOrder = -1;
  group.add(sun);

  group.matrixAutoUpdate = true;
  scene.add(group);

  const toSun = new THREE.Vector3(-SUN_DIR[0], -SUN_DIR[1], -SUN_DIR[2]).normalize();
  const sunPos = new THREE.Vector3();

  return {
    group, sun, toSun,
    update(camera) {
      group.position.set(camera.position.x, camera.position.y, camera.position.z);
      ridges.position.y = -34;                 // ranges sit below the eye line
      sunPos.copy(toSun).multiplyScalar(760);
      sun.position.copy(sunPos);
      sun.quaternion.copy(camera.quaternion);  // billboard
    },
  };
}
