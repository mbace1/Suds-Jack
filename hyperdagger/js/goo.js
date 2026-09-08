import * as THREE from 'three';
import { shadedBox } from './voxel.js?v=75';
import { gelMaterial } from './gel.js?v=75';

/**
 * THE GOO WAVE — season 2's swell, made of the same cubes everything else in
 * this game is made of.
 *
 * Owner's brief: *waves of goo voxels breaking across the arena*. So it is a
 * travelling height field on a grid over the disc, cut into voxels: a long
 * crest sweeps across, rises, leans forward as it steepens, and BREAKS —
 * the leading face throws a scatter of loose cubes ahead of itself, which is
 * what makes it surf rather than a moving hill.
 *
 * It is one InstancedMesh for the whole thing (the pattern every voxel body
 * here uses), and only the cells near the crest are drawn — the count is set
 * per frame, so a 46x46 grid costs a few hundred instances, not two thousand.
 *
 * WHAT IT IS TO PLAY: a moving FLOOR. `heightAt` answers what the crest is
 * under any point, `preUpdate` hands that to the player the way `platforms`
 * does, and a body standing on it is carried along the wave's direction — you
 * ride it. It does no damage; whether the trough should hurt is a design call
 * nobody has made, and a hazard that kills you before anyone has decided it
 * should is worse than one that does not exist. See SEASONS.md.
 */
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export class GooWave {
  /** @param {THREE.Scene} scene @param {number} arenaR */
  constructor(scene, arenaR) {
    this.scene = scene;
    this.arenaR = arenaR;
    this.cfg = null;
    this.mesh = null;
    this.t = 0;
    this.dirX = 0; this.dirZ = 1;
    this.cells = [];   // {x, z} grid centres inside the disc
    this.count = 0;    // instances drawn this frame
    this.spray = null; // (x, y, z, dirX, dirZ) => void — the caller's debris pool
    this.sprayed = 0;  // this frame
    this.draw = Math.random;
  }

  /** Build the grid and the instance pool for a season's `goo` block. */
  build(cfg, draw = Math.random) {
    this.clear();
    this.cfg = cfg;
    if (!cfg) return;
    // one direction per run, so a DAILY arena breaks the same way
    const a = draw() * Math.PI * 2;
    this.dirX = Math.cos(a); this.dirZ = Math.sin(a);
    // ...and a PHASE, so a run opens mid-sea. The crest forms off one rim,
    // which means starting at zero gives several seconds of flat water
    // before anything happens — the first thing you see should be the sea
    // already moving.
    this.period = (this.arenaR * 2 + cfg.width * 2 + cfg.gap) / cfg.speed;
    this.t = draw() * this.period;
    const cell = cfg.cell, r = this.arenaR;
    for (let x = -r; x <= r; x += cell) {
      for (let z = -r; z <= r; z += cell) {
        if (x * x + z * z > r * r) continue;
        this.cells.push({ x, z });
      }
    }
    this.draw = draw;
    const geo = shadedBox(cell * 0.92);
    // v44: GEL. Not the cube ladder — goo is the thing light goes into, so
    // this is the one material in the game that pretends to be lit (gel.js)
    const mat = cfg.material ?? gelMaterial({ lip: cfg.lip, wobble: cfg.wobble, caustic: cfg.caustic, fresnel: cfg.fresnel, spec: cfg.spec });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.cells.length);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.cells.length * 3), 3);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.name = 'goo';
    this.scene.add(this.mesh);
  }

  /** How far along the wave's travel a point is — the crest is at `phase 0`. */
  _s(x, z) {
    const c = this.cfg;
    const along = x * this.dirX + z * this.dirZ;
    // the crest starts off one edge and walks to the other, then re-forms
    const span = this.arenaR * 2 + c.width * 2;
    const head = -this.arenaR - c.width + ((this.t * c.speed) % (span + c.gap));
    return along - head;
  }

  /**
   * The crest's height above the floor at (x, z), and 0 well away from it.
   * A breaking wave is NOT a sine: it rises slowly on the back, peaks, and
   * drops steeply down its face, so the profile is asymmetric.
   */
  heightAt(x, z) {
    const c = this.cfg;
    if (!c) return 0;
    const s = this._s(x, z);
    const w = c.width;
    if (s < -w || s > w * 0.55) return 0;
    // back of the wave: a long smooth rise. Face: a short steep fall.
    const k = s <= 0 ? 1 - (-s / w) : 1 - (s / (w * 0.55));
    const eased = k * k * (3 - 2 * k);
    // a ripple along the crest, so it is a sea and not an extruded curve
    const across = x * -this.dirZ + z * this.dirX;
    const ripple = 1 + Math.sin(across * c.rippleK + this.t * 1.7) * c.ripple;
    return Math.max(0, c.amp * eased * ripple);
  }

  /**
   * Advance the wave and pose every cube near the crest. Runs BEFORE
   * player.update, like the track and the slabs, because a floor has to be
   * known before gravity integrates. `floorFor(player)` is applied by the
   * caller so the higher of slab-or-goo wins.
   */
  update(dt) {
    if (!this.cfg || !this.mesh) return;
    this.t += dt;
    const c = this.cfg, cell = c.cell;
    let n = 0;
    this.sprayed = 0;
    for (const g of this.cells) {
      const h = this.heightAt(g.x, g.z);
      if (h < cell * 0.35) continue;                 // below the surface: not drawn
      // THE BREAK: the lip throws loose cubes ahead of itself. A wave that
      // only rises and falls is a hill that moves; one that sheds is surf.
      if (this.spray && h > c.amp * (c.sprayFrom ?? 0.8) && this.sprayed < (c.sprayMax ?? 6)
        && this._s(g.x, g.z) > 0 && this.draw() < (c.sprayChance ?? 0.05)) {
        this.spray(g.x, h + cell * 0.3, g.z, this.dirX, this.dirZ);
        this.sprayed++;
      }
      // Cubes SNAP to the cell grid in y as well: goo made of voxels reads as
      // voxels only if it steps. A smooth column of cubes is a smooth surface
      // with seams, which is the look this game already rejected once.
      const y = Math.round(h / cell) * cell;
      if (y <= 0) continue;
      const lean = Math.min(1, h / c.amp) * c.lean;  // the crest leans into its travel
      _p.set(g.x + this.dirX * lean, y - cell * 0.5, g.z + this.dirZ * lean);
      _q.set(0, 0, 0, 1);
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(n, _m);
      // colour: deep in the body, bright at the lip — the break is the light
      const lip = Math.min(1, h / (c.amp * 0.92));
      _c.setRGB(
        c.deep[0] + (c.lip[0] - c.deep[0]) * lip,
        c.deep[1] + (c.lip[1] - c.deep[1]) * lip,
        c.deep[2] + (c.lip[2] - c.deep[2]) * lip,
      );
      this.mesh.setColorAt(n, _c);
      n++;
    }
    this.mesh.count = n;
    this.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * What the wave is worth to the body: the crest under the feet as a floor,
   * and — standing on it — a shove along the wave's own travel. That shove is
   * the whole point: you are not standing on a hill, you are being carried.
   */
  carry(dt, player, floor) {
    if (!this.cfg) return floor;
    const c = this.cfg, f = player.feet;
    const h = this.heightAt(f.x, f.z);
    if (h <= 0) return floor;
    // only a crest at or below the feet holds you up — you are pushed by the
    // face of the wave, never teleported to its top
    if (h > f.y + 0.5) return floor;
    if (h <= floor) return floor;
    if (f.y <= h + 0.05 && player.vy <= 0) {
      f.x += this.dirX * c.push * dt;
      f.z += this.dirZ * c.push * dt;
    }
    return h;
  }

  clear() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (!this.cfg?.material) this.mesh.material.dispose(); // a shared material is the caller's
      this.mesh = null;
    }
    this.cells.length = 0;
    this.cfg = null;
    this.count = 0;
  }

  getState() {
    return {
      on: !!this.cfg,
      cells: this.cells.length,
      drawn: this.count,
      t: +this.t.toFixed(2),
      dir: [+this.dirX.toFixed(2), +this.dirZ.toFixed(2)],
      period: +(this.period ?? 0).toFixed(2),
      sprayed: this.sprayed,
      peak: this.cfg ? this.cfg.amp : 0,
    };
  }
}
