// EERI — hazards. The house rule (ART_BRIEF §3.5) is that everything
// dangerous TELEGRAPHS before it is lethal: readable first, dangerous
// second. So the wrecking ball hangs dead still until you are near, then
// winds back — chevrons flashing, a warning tone — and only then swings.
//
// The cost is the Yoshi rule (§1): a hit takes the RIDE, not the run.
// Riding, you are thrown clear of the cab; on foot it is knockback and
// mercy frames. Nothing here kills.

import * as THREE from 'three';
import { PAL } from './palette.js?v=36';
import { craftMat, craftBox } from './craft.js?v=36';
import { CLOCK } from './parts.js?v=36';

// black/yellow chevrons — the one danger language, readable in greyscale
function chevronTexture() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 32;
  const g = cv.getContext('2d');
  g.fillStyle = PAL.MACHINE; g.fillRect(0, 0, 64, 32);
  g.fillStyle = PAL.INK;
  for (let i = -32; i < 96; i += 32) {
    g.beginPath();
    g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i - 16, 32); g.lineTo(i - 32, 32);
    g.closePath(); g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// the telegraph clock is DESIGN §4.1's and lives in parts.js, where the room
// prover can hold it to the 1.0s floor — this was 0.85
const WIND = CLOCK.ball.wind;     // the telegraph, in seconds
const SWING = CLOCK.ball.swing;   // the strike
const REST = CLOCK.ball.rest;     // settling back

export class WreckingBall {
  // pivot (px, py) under a girder; the ball swings in the x/y plane
  constructor(scene, px, py, len = 2.6, zoneW = 7) {
    this.px = px; this.py = py; this.len = len;
    this.state = 'rest'; this.t = 0;
    this.angle = 0; this.r = 0.52;
    this.warned = false;

    const M = (c) => craftMat(c, 'balsa');
    this.group = new THREE.Group();
    this.group.position.set(px, py, 0);

    // the arm swings: chain + ball are children, so one rotation moves both
    this.arm = new THREE.Group();
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 6), M(PAL.DARK));
    chain.position.y = -len / 2;
    this.arm.add(chain);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(this.r, 14, 12), M(PAL.STEEL[1]));
    ball.position.y = -len;
    this.arm.add(ball);
    const band = new THREE.Mesh(new THREE.TorusGeometry(this.r * 0.92, 0.07, 6, 16), M(PAL.STEEL[0]));
    band.position.y = -len; band.rotation.y = Math.PI / 2;
    this.arm.add(band);
    this.group.add(this.arm);

    // the bracket it hangs off — it is attached to something, visibly
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), M(PAL.MACHINE_DK));
    br.position.y = 0.05; this.group.add(br);

    // the swing zone, striped on the ground: the danger is drawn before it moves
    this.zone = new THREE.Mesh(
      new THREE.PlaneGeometry(zoneW, 0.42),
      new THREE.MeshBasicMaterial({ map: chevronTexture(), transparent: true, opacity: 0.62 }),
    );
    this.zone.material.map.repeat.x = zoneW / 1.4;
    this.zone.rotation.x = -Math.PI / 2;
    this.zone.position.set(px, 4.03, 0.4);

    scene.add(this.group, this.zone);
  }

  // returns the ball's world position (x, y)
  ballPos() {
    return {
      x: this.px + Math.sin(this.angle) * this.len,
      y: this.py - Math.cos(this.angle) * this.len,
    };
  }

  // near = the thing that wakes it (player or machine x)
  update(dt, nearX, audio, reduced) {
    this.t += dt;
    const dist = Math.abs(nearX - this.px);

    if (this.state === 'rest') {
      this.angle += (0 - this.angle) * Math.min(1, 4 * dt);
      this.zone.material.opacity = 0.34;
      if (dist < 6 && this.t > REST) { this.state = 'wind'; this.t = 0; this.warned = false; }
    } else if (this.state === 'wind') {
      // TELEGRAPH: it draws back, the chevrons pulse, one warning tone
      const k = Math.min(1, this.t / WIND);
      this.angle = -0.95 * k * k;
      this.zone.material.opacity = reduced ? 0.8 : 0.45 + 0.4 * Math.abs(Math.sin(this.t * 16));
      if (!this.warned) { audio?.warn(); this.warned = true; }
      if (this.t >= WIND) { this.state = 'swing'; this.t = 0; }
    } else if (this.state === 'swing') {
      // STRIKE: fast through the bottom, slow at the far top — a real pendulum
      const k = Math.min(1, this.t / SWING);
      this.angle = -0.95 * Math.cos(k * Math.PI * 2) * (1 - k * 0.45);
      this.zone.material.opacity = 0.8;
      if (this.t >= SWING) { this.state = 'rest'; this.t = 0; }
    }

    this.arm.rotation.z = -this.angle;
  }

  // only the swing can hurt you — a ball hanging still is scenery
  hits(x, y, hw, h) {
    if (this.state !== 'swing') return false;
    const b = this.ballPos();
    const cx = Math.max(x - hw, Math.min(b.x, x + hw));
    const cy = Math.max(y, Math.min(b.y, y + h));
    const dx = b.x - cx, dy = b.y - cy;
    return dx * dx + dy * dy < this.r * this.r;
  }
}
