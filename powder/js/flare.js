// The sun's lens flare — the one thing every reference plate has: a blown
// disc with a soft halo and a run of ghost rings marching through the frame
// centre. Screen-space, on the HD layer so it is full-resolution and sits
// over the dithered world. three's Lensflare addon does the occlusion query
// against the frame's depth, so the flare dies behind a canyon wall.
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

function tex(draw) {
  const N = 128, c = document.createElement('canvas');
  c.width = c.height = N;
  draw(c.getContext('2d'), N);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
  return t;
}

const haloTex = () => tex((g, N) => {
  const m = N / 2, grd = g.createRadialGradient(m, m, 0, m, m, m);
  grd.addColorStop(0, 'rgba(255,250,240,1)');
  grd.addColorStop(0.18, 'rgba(255,240,220,0.9)');
  grd.addColorStop(0.42, 'rgba(255,210,180,0.22)');
  grd.addColorStop(1, 'rgba(255,190,170,0)');
  g.fillStyle = grd; g.fillRect(0, 0, N, N);
});

const ringTex = () => tex((g, N) => {
  const m = N / 2, grd = g.createRadialGradient(m, m, m * 0.62, m, m, m * 0.98);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.85, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, N, N);
});

const discTex = () => tex((g, N) => {
  const m = N / 2, grd = g.createRadialGradient(m, m, 0, m, m, m * 0.9);
  grd.addColorStop(0, 'rgba(255,255,255,0.35)');
  grd.addColorStop(0.7, 'rgba(255,255,255,0.28)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, N, N);
});

export function makeFlare(scene, toSun) {
  const flare = new Lensflare();
  const halo = haloTex(), ring = ringTex(), disc = discTex();
  // element size is in pixels; distance 0 is the sun, 1 is the frame centre
  // mirrored, and the ghosts sit between
  // v11: the ghosts stay — the plates have them — but only on the SUN'S
  // side of the frame centre. The chain runs sun → centre → mirror point,
  // and the low formula seat puts the car just under the centre, so every
  // ghost past about 0.45 sat on the car or beside it and read as a bubble,
  // a target or a UI bug. What is left is the part of the chain nearest the
  // light, where a lens actually shows it.
  flare.addElement(new LensflareElement(halo, 300, 0, new THREE.Color(1.0, 0.94, 0.86)));
  flare.addElement(new LensflareElement(ring, 46, 0.16, new THREE.Color(0.55, 0.38, 0.62).multiplyScalar(0.34)));
  flare.addElement(new LensflareElement(disc, 20, 0.27, new THREE.Color(0.36, 0.60, 0.56).multiplyScalar(0.40)));
  flare.addElement(new LensflareElement(ring, 26, 0.36, new THREE.Color(0.62, 0.45, 0.36).multiplyScalar(0.30)));
  flare.layers.set(1);
  scene.add(flare);
  const _v = new THREE.Vector3();
  return {
    flare,
    update(camera) {
      flare.position.copy(camera.position).addScaledVector(_v.copy(toSun), 1500);
    },
  };
}
