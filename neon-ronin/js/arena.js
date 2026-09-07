import * as THREE from 'three';

// ── Tiered temple arena ───────────────────────────────────────────────────────
// Rooms are no longer a flat disc. Higher rooms unlock taller architecture:
// a raised dais reached by flanking staircases, then a full ziggurat with an
// outer ring terrace. The module owns both the geometry AND `heightAt(x, z)`,
// which every actor samples so it stands on whatever it is walking over.
//
//   pit      (rooms 1-3)  flat disc, as before
//   temple   (rooms 4-7)  central dais + 2 opposing staircases
//   ziggurat (rooms 8+)   outer ring terrace + high dais + 4 staircases
//
// Platforms are circles; stairs are radial ramps quantised into steps. Both
// are cheap analytic shapes, so heightAt stays a handful of comparisons.

const STEP_RISE = 0.28;

export class Arena {
  constructor(scene, radius) {
    this.scene = scene;
    this.radius = radius;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.hueMats = [];      // re-tinted per room by main
    this.platforms = [];    // { r, h }
    this.stairs = [];       // { angle, innerR, outerR, halfW, topH, steps }
    this._owned = [];       // geometries to dispose on rebuild
  }

  layoutFor(room) {
    if (room >= 8) return 'ziggurat';
    if (room >= 4) return 'temple';
    return 'pit';
  }

  // Height of the walkable surface under a world XZ position.
  heightAt(x, z) {
    let h = 0;
    const r = Math.hypot(x, z);
    for (const p of this.platforms) {
      if (r <= p.r && p.h > h) h = p.h;
    }
    for (const s of this.stairs) {
      const c = Math.cos(-s.angle), sn = Math.sin(-s.angle);
      const u = x * c - z * sn;          // along the stair axis (outward)
      const v = x * sn + z * c;          // across the stair
      if (Math.abs(v) > s.halfW || u < s.innerR || u > s.outerR) continue;
      const t = (s.outerR - u) / (s.outerR - s.innerR);          // 0 bottom → 1 top
      const stepped = Math.min(1, Math.ceil(t * s.steps) / s.steps);
      const sh = s.baseH + stepped * (s.topH - s.baseH);
      if (sh > h) h = sh;
    }
    return h;
  }

  _mesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }

  // Glowing rim on a platform edge (the neon edge-light of the cover art).
  _rim(r, y) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const geo = new THREE.RingGeometry(r - 0.12, r, 64);
    this._owned.push(geo);
    const ring = this._mesh(geo, mat, 0, y + 0.03, 0);
    ring.rotation.x = -Math.PI / 2;
    this.hueMats.push(mat);
    return ring;
  }

  clear() {
    for (const g of this._owned) g.dispose();
    this._owned.length = 0;
    // materials in hueMats belong to this arena build; drop them too
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const c = this.group.children[i];
      this.group.remove(c);
      if (c.material && !c.material._shared) c.material.dispose();
    }
    this.hueMats.length = 0;
    this.platforms.length = 0;
    this.stairs.length = 0;
    this.lamps = [];
  }

  build(room) {
    this.clear();
    const layout = this.layoutFor(room);
    const R = this.radius;

    // light enough to catch the hemisphere fill — pure-dark stone reads as
    // floating neon outlines with no solid volume behind them
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2b3242, flatShading: true, roughness: 0.85, metalness: 0.15,
    });
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x39445c, flatShading: true, roughness: 0.8, metalness: 0.2,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x171c27, flatShading: true, roughness: 0.9, metalness: 0.1,
    });

    // base floor
    const floorGeo = new THREE.CircleGeometry(R + 1.5, 48);
    this._owned.push(floorGeo);
    const floor = this._mesh(floorGeo, floorMat, 0, 0, 0);
    floor.rotation.x = -Math.PI / 2;

    // faint concentric guide rings on the ground floor
    for (const rr of [R * 0.45, R * 0.75, R]) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff, transparent: true, opacity: rr === R ? 0.6 : 0.18,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const geo = new THREE.RingGeometry(rr - 0.06, rr, 64);
      this._owned.push(geo);
      const ring = this._mesh(geo, mat, 0, 0.02, 0);
      ring.rotation.x = -Math.PI / 2;
      this.hueMats.push(mat);
    }

    if (layout === 'pit') return layout;

    // ── raised dais + flanking staircases ──
    const daisR = layout === 'ziggurat' ? 5.5 : 6.5;
    const daisH = layout === 'ziggurat' ? 3.4 : 2.2;
    const stairAngles = layout === 'ziggurat'
      ? [0, Math.PI / 2, Math.PI, -Math.PI / 2]
      : [Math.PI * 0.25, Math.PI * 1.25];

    // optional mid terrace (ziggurat only)
    let terraceR = 0, terraceH = 0;
    if (layout === 'ziggurat') {
      terraceR = 12;
      terraceH = 1.5;
      const tGeo = new THREE.CylinderGeometry(terraceR, terraceR, terraceH, 40);
      this._owned.push(tGeo);
      this._mesh(tGeo, stoneMat, 0, terraceH / 2, 0);
      this._rim(terraceR, terraceH);
      this.platforms.push({ r: terraceR, h: terraceH });
    }

    const dGeo = new THREE.CylinderGeometry(daisR, daisR, daisH, 40);
    this._owned.push(dGeo);
    this._mesh(dGeo, stoneMat, 0, daisH / 2, 0);
    this._rim(daisR, daisH);
    this.platforms.push({ r: daisR, h: daisH });

    // vertical neon ribs down the dais face, so the drop reads as a wall
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, depthWrite: false });
      const geo = new THREE.BoxGeometry(0.1, daisH * 0.8, 0.1);
      this._owned.push(geo);
      this._mesh(geo, mat, Math.cos(a) * daisR, daisH * 0.42, Math.sin(a) * daisR);
      this.hueMats.push(mat);
    }

    // two lamps sculpting the dais out of the dark
    for (const s of [-1, 1]) {
      const lamp = new THREE.PointLight(0xffffff, 26, 22, 1.6);
      lamp.position.set(s * daisR * 0.7, daisH + 3.2, 0);
      this.group.add(lamp);
      this.lamps = this.lamps || [];
      this.lamps.push(lamp);
    }

    // staircases: quantised radial ramps, drawn as individual steps
    for (const angle of stairAngles) {
      const baseH = layout === 'ziggurat' ? terraceH : 0;
      const innerR = daisR - 0.2;
      const outerR = innerR + (daisH - baseH) / STEP_RISE * 0.55;
      const steps = Math.max(4, Math.round((daisH - baseH) / STEP_RISE));
      const halfW = 2.2;
      this.stairs.push({ angle, innerR, outerR, halfW, topH: daisH, baseH, steps });

      const c = Math.cos(angle), sn = Math.sin(angle);
      const stepDepth = (outerR - innerR) / steps;
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;                   // 1 = top step
        const h = baseH + t * (daisH - baseH);
        const u = outerR - (i + 0.5) * stepDepth;    // step centre along the axis
        const geo = new THREE.BoxGeometry(stepDepth + 0.02, h, halfW * 2);
        this._owned.push(geo);
        const step = this._mesh(geo, stepMat, c * u, h / 2, sn * u);
        step.rotation.y = -angle;
        // glowing nosing on each tread (cover-art edge light)
        const nMat = new THREE.MeshBasicMaterial({
          color: 0xff2fd6, transparent: true, opacity: 0.8, depthWrite: false,
        });
        nMat._alt = true;      // takes the complementary room hue
        const nGeo = new THREE.BoxGeometry(0.06, 0.05, halfW * 2);
        this._owned.push(nGeo);
        const nose = this._mesh(nGeo, nMat,
          c * (u + stepDepth / 2), h + 0.02, sn * (u + stepDepth / 2));
        nose.rotation.y = -angle;
        this.hueMats.push(nMat);
      }

      // balustrade pillars flanking the stair run
      for (const side of [-1, 1]) {
        const px = c * outerR - sn * side * (halfW + 0.35);
        const pz = sn * outerR + c * side * (halfW + 0.35);
        const geo = new THREE.BoxGeometry(0.4, daisH + 1.6, 0.4);
        this._owned.push(geo);
        this._mesh(geo, stoneMat, px, (daisH + 1.6) / 2, pz);
        const cMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, depthWrite: false });
        const cGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5);
        this._owned.push(cGeo);
        this._mesh(cGeo, cMat, px, daisH + 1.65, pz);
        this.hueMats.push(cMat);
      }
    }

    return layout;
  }
}
