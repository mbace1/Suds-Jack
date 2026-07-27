// ── Terrain ────────────────────────────────────────────────────────────────
// The Endless hill field. Tiny Wings' geometry, restated for a skater: a chain
// of alternating crests and troughs, each pair joined by a raised-cosine curve
// so the slope is exactly zero at every crest and every trough. That flat-at-
// the-extremes property is what makes the hills *poppable* — you can carry a
// tangential landing through a trough and off the far lip without a kink
// eating your speed.
//
// Two things read off this module:
//   sample(x) -> {y, m}   analytic height + slope, used by the physics
//   update(camX)          streams points ahead and rewrites the visible ribbon
//
// The ribbon is a FIXED vertex-count sliding window (no chunk pooling): every
// frame we resample the curve at a constant spacing across the camera's span
// and rewrite the position buffer. ~180 samples is nothing to rewrite and it
// sidesteps a whole class of spawn/cull bugs.

import * as THREE from 'three';
import { COL, GLOW } from './palette.js?v=2';
import { mulberry32, lerp, clamp } from './rng.js?v=2';

const DX      = 0.45;   // ribbon sample spacing (world units)
const SPAN    = 130;    // world units of ribbon kept alive around the camera
const BEHIND  = 34;     // how much of that sits behind the camera
const SAMPLES = Math.ceil(SPAN / DX);
const HALF_W  = 7;      // ribbon half-width in z (gives the top face its read)
const LIP     = 0.5;    // height of the mid-tone band under the front edge
const BODY_D  = 170;    // how far the dark mass hangs below the surface

// Average downhill gradient. Tiny Wings' islands fall away under you, and they
// have to: without a net descent the chain of hills is a closed energy system,
// so one badly-timed climb bleeds your speed to nothing and there is no way
// back. This is the term that keeps gravity feeding the run.
const DESCENT = 0.115;

// Difficulty ramp: hills get taller and tighter the further you get.
const RAMP_DIST = 3200;

function makeStrip(color, hdr) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(SAMPLES * 2 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const idx = [];
  for (let i = 0; i < SAMPLES - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, d, a, d, c);
  }
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  if (hdr) mat.color.setRGB(hdr[0], hdr[1], hdr[2]); else mat.color.setHex(color);
  return { mesh: new THREE.Mesh(geo, mat), pos, mat };
}

export class Terrain {
  constructor(seed, scene) {
    this.rnd = mulberry32(seed);
    // Alternating control points. Start on a crest so the run opens with a
    // drop — you are moving before you have made a single decision.
    this.pts = [{ x: -40, y: 11 }, { x: -8, y: 11 }];
    this.nextIsTrough = true;
    this.base = 0;      // random walk, the local character of the hills
    this.trend = 0;     // the descending line they wander around
    this.ensure(200);

    this.top  = makeStrip(COL.groundTop);
    // The lip is the one HDR thing in the scene — the lit edge of the hill.
    this.lip  = makeStrip(null, GLOW.edge);
    this.body = makeStrip(COL.groundBody);
    // Draw back-to-front so the dark mass never z-fights the lip band.
    this.body.mesh.renderOrder = 0;
    this.lip.mesh.renderOrder  = 1;
    this.top.mesh.renderOrder  = 2;
    for (const s of [this.body, this.lip, this.top]) {
      s.mesh.frustumCulled = false;
      scene.add(s.mesh);
    }
    this.winX0 = 0;
  }

  // ── Generation ───────────────────────────────────────────────────────────
  ensure(untilX) {
    let last = this.pts[this.pts.length - 1];
    while (last.x < untilX) {
      const r = this.rnd;
      const d = clamp(last.x / RAMP_DIST, 0, 1);

      let amp = lerp(4.5, 9.5, d) * (0.65 + 0.7 * r());
      const len = lerp(30, 19, d) * (0.75 + 0.5 * r());
      // The occasional oversized crest — the one you set up for.
      if (!this.nextIsTrough && r() < 0.12) amp *= 1.65;

      this.trend -= DESCENT * len;
      this.base = clamp(this.base + (r() - 0.5) * 3.2, -7, 7);
      const mid = this.trend + this.base;
      const y = this.nextIsTrough ? mid - amp : mid + amp;

      this.pts.push({ x: last.x + len, y });
      this.nextIsTrough = !this.nextIsTrough;
      last = this.pts[this.pts.length - 1];
    }
  }

  prune(camX) {
    // Keep one point behind the window so sample() never falls off the front.
    while (this.pts.length > 4 && this.pts[1].x < camX - BEHIND - 60) {
      this.pts.shift();
    }
  }

  // ── Query ────────────────────────────────────────────────────────────────
  // Raised-cosine between control points: zero slope at both ends.
  sample(x) {
    const p = this.pts;
    if (x <= p[0].x) return { y: p[0].y, m: 0 };
    const lastP = p[p.length - 1];
    if (x >= lastP.x) return { y: lastP.y, m: 0 };

    let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (p[mid].x <= x) lo = mid; else hi = mid;
    }
    const a = p[lo], b = p[hi];
    const dx = b.x - a.x;
    const t = (x - a.x) / dx;
    const dy = b.y - a.y;
    return {
      y: a.y + dy * (1 - Math.cos(t * Math.PI)) * 0.5,
      m: (dy * Math.PI * Math.sin(t * Math.PI)) / (2 * dx),
    };
  }

  heightAt(x) { return this.sample(x).y; }

  // ── Ribbon rewrite ───────────────────────────────────────────────────────
  update(camX) {
    this.ensure(camX + SPAN);
    this.prune(camX);

    // Snap the window origin to the sample grid so vertices never swim.
    this.winX0 = Math.floor((camX - BEHIND) / DX) * DX;

    const tp = this.top.pos, lp = this.lip.pos, bp = this.body.pos;
    for (let i = 0; i < SAMPLES; i++) {
      const x = this.winX0 + i * DX;
      const y = this.sample(x).y;
      const o = i * 6;

      tp[o] = x; tp[o + 1] = y; tp[o + 2] = -HALF_W;
      tp[o + 3] = x; tp[o + 4] = y; tp[o + 5] = HALF_W;

      lp[o] = x; lp[o + 1] = y; lp[o + 2] = HALF_W;
      lp[o + 3] = x; lp[o + 4] = y - LIP; lp[o + 5] = HALF_W;

      // The body hangs a fixed depth below the surface rather than reaching an
      // absolute floor — the world descends forever, so an absolute one would
      // eventually rise above the terrain and flood the screen.
      bp[o] = x; bp[o + 1] = y - LIP; bp[o + 2] = HALF_W;
      bp[o + 3] = x; bp[o + 4] = y - BODY_D; bp[o + 5] = HALF_W;
    }
    this.top.mesh.geometry.attributes.position.needsUpdate = true;
    this.lip.mesh.geometry.attributes.position.needsUpdate = true;
    this.body.mesh.geometry.attributes.position.needsUpdate = true;
  }

  retint(zone) {
    if (!zone) return;
    this.top.mat.color.setHex(zone.groundTop);
    this.lip.mat.color.setHex(zone.groundLip);
    this.body.mat.color.setHex(zone.groundBody);
  }
}
