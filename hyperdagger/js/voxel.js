import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/**
 * Voxel models as string-art layers. layers[0] is the BOTTOM slice; each layer
 * is an array of rows (row 0 = front face, toward +z after parsing, which is
 * the side `Object3D.lookAt(target)` points at the target). '.' = empty.
 * Palette values are hex ints, or [r,g,b] arrays with components > 1 for
 * HDR glow parts that should trip the bloom pass.
 */
const SKULL_LAYERS = [
  ['..WWW..', '..SWS..'],
  ['.WWWWW.', '.WSWSW.', '..WWW..'],
  ['.WWKWW.', 'WWWWWWW', '.WWWWW.'],
  ['WRRWRRW', 'WWWWWWW', '.WWWWW.'],
  ['WWWWWWW', 'WWWWWWW', '.WWWWW.'],
  ['.WWWWW.', '.WWWWW.', '..WWW..'],
];

export const MODELS = {
  skull: {
    voxelSize: 0.22,
    palette: { W: 0xd8d8d8, S: 0xa8a8a8, R: [2.8, 0.2, 0.2], K: 0x1a1a1a },
    layers: SKULL_LAYERS,
  },
  // crowned skull — faster, 2 HP, red crown
  skull2: {
    voxelSize: 0.22,
    palette: { W: 0x8a8a8a, S: 0x666666, R: [2.8, 0.2, 0.2], K: 0x111111, C: [2.2, 0.2, 0.2] },
    layers: [...SKULL_LAYERS, ['.C.C.C.', '.......', '.......']],
  },
  // splitter — big white-crowned skull that bursts into minis
  skullBig: {
    voxelSize: 0.32,
    palette: { W: 0xdcdcdc, S: 0xaaaaaa, R: [2.8, 0.2, 0.2], K: 0x1a1a1a, C: [2.4, 2.4, 2.4] },
    layers: [...SKULL_LAYERS, ['.C.C.C.', '.......', '.......']],
  },
  skullTiny: {
    voxelSize: 0.12,
    palette: { W: 0xb8b8b8, S: 0x8a8a8a, R: [2.8, 0.2, 0.2], K: 0x151515 },
    layers: SKULL_LAYERS,
  },
  // dread skull — the Skull IV analog: big, fast, dark-red bone, burning crown
  skullDread: {
    voxelSize: 0.4,
    palette: { W: 0x6e1212, S: 0x4a0c0c, R: [3.2, 0.35, 0.35], K: 0x0a0202, C: [2.6, 0.2, 0.2] },
    layers: [...SKULL_LAYERS, ['C.C.C.C', '.......', '.......']],
  },
  // blinker — glitch shard that teleports toward the player
  blinker: {
    voxelSize: 0.26,
    palette: { D: 0x3a3a3a, R: [2.6, 0.2, 0.2] },
    layers: [
      ['...', '.D.', '...'],
      ['.D.', 'DRD', '.D.'],
      ['D.D', '.R.', 'D.D'],
      ['.D.', 'DRD', '.D.'],
      ['...', '.D.', '...'],
    ],
  },
  // spider egg — hatches skulls unless shot first
  egg: {
    voxelSize: 0.2,
    palette: { W: 0xe8e8e8, R: [2.4, 0.15, 0.15] },
    layers: [
      ['.W.', 'WWW', '.W.'],
      ['WWW', 'WRW', 'WWW'],
      ['.W.', 'WWW', '.W.'],
    ],
  },
  // ghost serpent — pale rings armored from the front (shoot from behind)
  serpentGhost: {
    voxelSize: 0.3,
    palette: { S: 0xf0f0f0, C: [1.4, 1.4, 1.4] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['SSS', 'SCS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  serpentGhostHead: {
    voxelSize: 0.36,
    palette: { S: 0xd8d8d8, C: [1.4, 1.4, 1.4], R: [2.8, 0.2, 0.2] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['S.S', 'SCS', 'SSS'],
      ['R.R', 'SSS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  // thorn — white spike that erupts from a telegraphed floor sigil
  thorn: {
    voxelSize: 0.3,
    anchor: 'bottom',
    palette: { W: 0xcfcfcf, S: 0x9a9a9a, R: [2.6, 0.2, 0.2] },
    layers: [
      ['WWW', 'WSW', 'WWW'],
      ['.W.', 'WWW', '.W.'],
      ['.W.', 'WSW', '.W.'],
      ['...', '.W.', '...'],
      ['...', '.W.', '...'],
      ['...', '.R.', '...'],
    ],
  },
  // watcher — hovering drone eye that fires orb volleys (Returnal turret nod)
  watcher: {
    voxelSize: 0.26,
    palette: { S: 0x2a2a2a, W: 0xcfcfcf, R: [2.8, 0.2, 0.2] },
    layers: [
      ['.SSS.', 'SSSSS', '.SSS.'],
      ['SRRRS', 'SWSWS', 'SSSSS'],
      ['.SSS.', 'SSSSS', '.SSS.'],
    ],
  },
  brute: {
    voxelSize: 0.46,
    palette: { W: 0x2e2e2e, S: 0x1e1e1e, R: [2.8, 0.2, 0.2], K: 0x0a0a0a, V: [1.8, 0.15, 0.15] },
    layers: [
      ...SKULL_LAYERS.map(l => l.map(r => r)),
      ['V.....V', '.......', '.......'],
      ['V.....V', '.......', '.......'],
    ],
  },
  // serpent body segment — armored ring with an HDR core
  serpent: {
    voxelSize: 0.3,
    palette: { S: 0xcfcfcf, C: [2.4, 0.2, 0.2] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['SSS', 'SCS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  // serpent head — eyes + open mouth at the front face
  serpentHead: {
    voxelSize: 0.36,
    palette: { S: 0x9a9a9a, C: [2.4, 0.2, 0.2], R: [2.8, 0.2, 0.2] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['S.S', 'SCS', 'SSS'],
      ['R.R', 'SSS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  // gem thief — squat body, corner legs, red eyes front
  spider: {
    voxelSize: 0.24,
    palette: { B: 0x242424, D: 0x151515, L: 0x151515, R: [2.8, 0.2, 0.2] },
    layers: [
      ['L...L', '.....', 'L...L'],
      ['.BBB.', 'BDBDB', '.BBB.'],
      ['.RBR.', 'BBBBB', '.BBB.'],
    ],
  },
  // late-game boss: dark god-head, glowing eyes/horns/crown, voxelSize 0.7
  leviathan: {
    voxelSize: 0.7,
    detailBoost: 1, // one extra subdivision tier when the global default is lower
    wobble: 0.7,    // heaves slowly — massive, not jittery
    palette: {
      W: 0x1c1c1c, S: 0x101010, K: 0x000000,
      R: [3.0, 0.2, 0.2], V: [2.0, 0.15, 0.15], C: [2.4, 2.4, 2.4],
    },
    layers: [
      ['..WWWWW..', '..SSSSS..'],
      ['.WWWWWWW.', '.WSWSWSW.', '..WWWWW..'],
      ['.WWWKWWW.', 'WWWWWWWWW', '.WWWWWWW.'],
      ['WRRWKWRRW', 'WWWWWWWWW', '.WWWWWWW.'],
      ['WWWWWWWWW', 'WWWWWWWWW', '.WWWWWWW.'],
      ['.WWWWWWW.', '.WWWWWWW.', '..WWWWW..'],
      ['V.C.C.C.V', '.........', '.........'],
      ['V.......V', '.........', '.........'],
    ],
  },
  // THE REVENANT — assembled out of the player's own bone-yard: dirty bone,
  // hollow ribcage, two burning eyes. Deliberately lankier than a skull so it
  // reads as a standing figure the moment it claws out of the floor.
  revenant: {
    voxelSize: 0.3,
    wobble: 1.15, // loose-jointed, more alive than the plated husk
    palette: { B: 0xdedede, S: 0x9a9a9a, R: [2.8, 0.2, 0.2] },
    layers: [
      ['.B.B.', '.....', '.....'],
      ['.S.S.', '.....', '.....'],
      ['BSBSB', '.SBS.', '.....'],
      ['B.S.B', '.BSB.', '.....'],
      ['S.B.S', '.SBS.', '.....'],
      ['BSBSB', 'SBSBS', '.....'],
      ['.RBR.', '.SBS.', '.....'],
    ],
  },
  // THE HUSK — armored slab whose shell fully ENCLOSES an HDR core, so the
  // core is invisible until dagger chips carve a hole through the plating.
  // The armor is checkerboarded (A/B) because unlit same-colour voxels read
  // as one flat polygon; at ×64 the plates erode into a convincing crater.
  husk: {
    voxelSize: 0.42,
    wobble: 0.45, // heavy plating barely stirs
    palette: {
      A: 0x2e2e2e, B: 0x1a1a1a,
      C: [3.0, 0.25, 0.25], // core — only visible once the shell is breached
      E: [2.8, 0.2, 0.2],
    },
    layers: [
      ['.ABA.', 'BABAB', '.ABA.'],
      ['ABABA', 'BCCCB', 'ABABA'],
      ['BABAB', 'ACCCA', 'BABAB'],
      ['ABABA', 'BCCCB', 'ABABA'],
      ['.BAB.', 'ABABA', '.BAB.'],
      // eye on the FRONT face (row 0) — a first-person player meets it at
      // eye level, so a top-face eye would never be seen
      ['.AEA.', '.ABA.', '..A..'],
    ],
  },
  // first-person gauntlet: checkerboarded glove (unlit voxels need baked
  // shading to read as cubes), long HDR white blade forward (row 0)
  hand: {
    voxelSize: 0.05,
    wobble: 0.3,
    palette: { G: 0x3a3a3a, D: 0x222222, H: 0x555555, B: [1.25, 1.25, 1.25] },
    layers: [
      ['...', '...', '...', '...', '...', '...', '...', 'DGD', 'GDG', 'DGD'],
      ['.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', 'GHG', 'DGD', 'GDG'],
      ['...', '...', '...', '...', '...', '...', '...', 'DGD', 'GDG', 'DGD'],
    ],
  },
  totem: (() => {
    // M veins sit on the outer faces so the pillar glows from every angle
    const A = ['.OMO.', 'OOOOO', 'MOOOM', 'OOOOO', '.OMO.'];
    const B = ['.OOO.', 'OOOOO', 'OOOOO', 'OOOOO', '.OOO.'];
    const mouth = ['.OMO.', 'OO.OO', 'M.M.M', 'OO.OO', '.OMO.'];
    const crown = ['..O..', '.OMO.', '.MOM.', '.OMO.', '..O..'];
    return {
      voxelSize: 0.34,
      anchor: 'bottom',
      wobble: 0.35,
      palette: { O: 0x161616, M: [2.4, 0.2, 0.2] },
      layers: [B, A, B, A, B, A, B, mouth, mouth, crown],
    };
  })(),
};

// Global voxel density: every model voxel is split into detail³ minis of the
// same silhouette. ×64 (detail 4) is the DESIGN DEFAULT — the perf governor
// walks new spawns down the ladder (×27/×8/×1) as frame cost rises.
let globalDetail = 4;
export function setVoxelDetail(n) { globalDetail = Math.max(1, Math.min(4, n | 0)); }
export function getVoxelDetail() { return globalDetail; }

// Style hue: null = the native crimson look; otherwise ACCENT colors (red-
// dominant, i.e. the R/C/V/M glow parts of every palette) are re-hued in
// place while bone/body greys pass through untouched. HDR magnitude is
// preserved (max channel keeps its value) so bloom trips identically.
let styleHue = null;
export function setStyleHue(h) { styleHue = h; }
export function getStyleHue() { return styleHue; }
const _tint = new THREE.Color();
const _tint2 = new THREE.Color(); // litter re-tint scratch (keeps _tint free for styleTint itself)
/** Re-hue `c` in place if it reads as an accent color; returns `c`. */
export function styleTint(c) {
  if (styleHue === null) return c;
  if (!(c.r > c.g * 2 && c.r > c.b * 2)) return c;
  const i = Math.max(c.r, c.g, c.b);
  _tint.setHSL(styleHue, 1, 0.5);
  const m = Math.max(_tint.r, _tint.g, _tint.b, 1e-6);
  c.copy(_tint).multiplyScalar(i / m);
  return c;
}

/** Parse a model definition into centred local-space voxels, subdividing
 *  each source voxel into subdivide³ minis. */
export function parseModel(def, subdivide = 1) {
  const { layers, palette, voxelSize: s, anchor = 'center' } = def;
  const voxels = [];
  const h = layers.length;
  const ms = s / subdivide; // mini size
  const off = (s - ms) / 2; // centre the mini grid inside the source voxel
  for (let y = 0; y < h; y++) {
    const rows = layers[y];
    const d = rows.length;
    for (let zi = 0; zi < d; zi++) {
      const row = rows[zi];
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (col === undefined) continue;
        const cx = (x - (row.length - 1) / 2) * s;
        const cy = anchor === 'bottom' ? (y + 0.5) * s : (y - (h - 1) / 2) * s;
        const cz = ((d - 1) / 2 - zi) * s;
        for (let sx = 0; sx < subdivide; sx++) {
          for (let sy = 0; sy < subdivide; sy++) {
            for (let sz = 0; sz < subdivide; sz++) {
              const color = Array.isArray(col)
                ? new THREE.Color().setRGB(col[0], col[1], col[2])
                : new THREE.Color(col);
              voxels.push({
                x: cx - off + sx * ms,
                y: cy - off + sy * ms,
                z: cz - off + sz * ms,
                color,
                key: row[x], // palette key kept for later retints (gauntlet evolution)
              });
            }
          }
        }
      }
    }
  }
  return voxels;
}

/** One voxel model as a single InstancedMesh with per-voxel colors.
 *  Voxels can be chipped off before death (bullet holes) — dead voxels are
 *  scaled to zero and excluded from worldVoxels()/death bursts. */
export class VoxelSprite {
  constructor(def, subdivide = globalDetail + (def.detailBoost || 0)) {
    subdivide = Math.max(1, Math.min(4, subdivide));
    this.voxels = parseModel(def, subdivide);
    this.size = def.voxelSize / subdivide;
    this.aliveCount = this.voxels.length;
    this.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // Per-voxel LIFE, all in the vertex shader so density is free: the voxel
    // lattice breathes (~3% swell), a ripple travels across the body, and
    // each voxel's size shimmers slightly out of phase with its neighbors —
    // at ×64 the model reads as thousands of live cells, not one mesh.
    // One shared program (same cache key); per-sprite uniform objects.
    this.animT = Math.random() * 100; // desync so a swarm never pulses in unison
    this.baseWobble = def.wobble ?? 1;
    this.uniforms = {
      uTime: { value: this.animT },
      uWobble: { value: this.baseWobble },
      uVox: { value: this.size },
    };
    this.material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>',
          '#include <common>\nuniform float uTime;\nuniform float uWobble;\nuniform float uVox;')
        .replace('#include <begin_vertex>', /* glsl */`#include <begin_vertex>
        #ifdef USE_INSTANCING
          // instance translation = this voxel's spot in the body lattice
          vec3 vic = instanceMatrix[3].xyz;
          float vph = vic.x * 2.3 + vic.y * 1.7 + vic.z * 2.9;
          // voxel size shimmer, slightly out of phase per cell
          transformed *= 1.0 + 0.10 * uWobble * sin(uTime * 4.0 + vph * 3.1);
          // whole-body breathe: the lattice swells around its origin
          transformed += vic * (0.035 * uWobble * sin(uTime * 2.1));
          // traveling ripple across the surface
          transformed += uVox * 0.22 * uWobble * vec3(
            sin(uTime * 3.1 + vph),
            sin(uTime * 2.6 + vph * 1.3 + 1.7),
            sin(uTime * 3.7 + vph * 0.8 + 3.4));
        #endif`);
    };
    this.material.customProgramCacheKey = () => 'voxel-sprite-anim';
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(this.size, this.size, this.size),
      this.material,
      this.voxels.length,
    );
    mesh.frustumCulled = false;
    this.voxels.forEach((v, i) => {
      v.alive = true;
      v.base = v.color.clone(); // pre-style color — applyStyle() re-derives from it
      styleTint(v.color);
      mesh.setMatrixAt(i, _m.makeTranslation(v.x, v.y, v.z));
      mesh.setColorAt(i, v.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.mesh = mesh;
    this.flashK = 0;

    // Integer grid coords + lookup map for connectivity (chunk detachment).
    // All voxel coords sit on one ms-lattice, so offsets from the min corner
    // round to clean integers; +1 margin keeps neighbor keys non-negative.
    let mx = Infinity, my = Infinity, mz = Infinity;
    for (const v of this.voxels) {
      mx = Math.min(mx, v.x); my = Math.min(my, v.y); mz = Math.min(mz, v.z);
    }
    const inv = 1 / this.size;
    this.grid = new Map();
    this.voxels.forEach((v, i) => {
      v.gx = Math.round((v.x - mx) * inv) + 1;
      v.gy = Math.round((v.y - my) * inv) + 1;
      v.gz = Math.round((v.z - mz) * inv) + 1;
      this.grid.set(v.gx + v.gy * 1024 + v.gz * 1048576, i);
    });
  }

  /** After chips carve the model, voxel islands no longer 6-connected to the
   *  main body break away: they die here and are returned as CLUSTERS of
   *  {pos, color} world voxels so the caller can throw each one as a chunk
   *  of debris with a shared impulse. The largest component always stays. */
  detachIslands() {
    if (this.aliveCount <= 4) return [];
    const comp = new Int32Array(this.voxels.length).fill(-1);
    const sizes = [];
    const stack = [];
    for (let i = 0; i < this.voxels.length; i++) {
      if (!this.voxels[i].alive || comp[i] !== -1) continue;
      const c = sizes.length;
      sizes.push(0);
      comp[i] = c;
      stack.push(i);
      while (stack.length) {
        const j = stack.pop();
        sizes[c]++;
        const v = this.voxels[j];
        for (let n = 0; n < 6; n++) {
          const k = v.gx + (n === 0) - (n === 1)
            + (v.gy + (n === 2) - (n === 3)) * 1024
            + (v.gz + (n === 4) - (n === 5)) * 1048576;
          const m = this.grid.get(k);
          if (m !== undefined && this.voxels[m].alive && comp[m] === -1) {
            comp[m] = c;
            stack.push(m);
          }
        }
      }
    }
    if (sizes.length <= 1) return [];
    let best = 0;
    for (let c = 1; c < sizes.length; c++) if (sizes[c] > sizes[best]) best = c;
    if (sizes[best] < 4) return []; // never detach the body down past the chip floor
    this.mesh.updateWorldMatrix(true, false);
    const clusters = sizes.map(() => []);
    for (let i = 0; i < this.voxels.length; i++) {
      if (comp[i] === -1 || comp[i] === best) continue;
      const v = this.voxels[i];
      v.alive = false;
      this.aliveCount--;
      clusters[comp[i]].push({
        pos: _s.set(v.x, v.y, v.z).applyMatrix4(this.mesh.matrixWorld).clone(),
        color: v.color, base: v.base,
      });
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return clusters.filter(c => c.length);
  }

  /** Knock out up to n alive voxels nearest to worldPoint (a dagger impact),
   *  leaving a visible hole. Returns the removed voxels' world positions +
   *  colors so a few can fly off as debris. */
  chip(worldPoint, n) {
    if (this.aliveCount <= 4 || n <= 0) return [];
    this.mesh.updateWorldMatrix(true, false);
    _v.copy(worldPoint);
    this.mesh.worldToLocal(_v);
    // rank alive voxels by distance to the impact (partial selection is
    // overkill at these counts — a sort of ≤ a few thousand entries is fine)
    const ranked = [];
    for (let i = 0; i < this.voxels.length; i++) {
      const vx = this.voxels[i];
      if (!vx.alive) continue;
      const dx = vx.x - _v.x, dy = vx.y - _v.y, dz = vx.z - _v.z;
      ranked.push({ i, d2: dx * dx + dy * dy + dz * dz });
    }
    ranked.sort((a, b) => a.d2 - b.d2);
    const out = [];
    const take = Math.min(n, ranked.length, this.aliveCount - 4);
    for (let k = 0; k < take; k++) {
      const i = ranked[k].i;
      const vx = this.voxels[i];
      vx.alive = false;
      this.aliveCount--;
      out.push({
        pos: _s.set(vx.x, vx.y, vx.z).applyMatrix4(this.mesh.matrixWorld).clone(),
        color: vx.color, base: vx.base,
      });
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    }
    if (out.length) this.mesh.instanceMatrix.needsUpdate = true;
    return out;
  }

  /** Hit flash: brightens material.color, which multiplies every instance color. */
  flash(k = 1.8) { this.flashK = k; }

  update(dt) {
    this.animT += dt;
    this.uniforms.uTime.value = this.animT;
    // a hit also shakes the lattice awake for a beat
    this.uniforms.uWobble.value = this.baseWobble + this.flashK * 1.2;
    if (this.flashK > 0) {
      this.flashK = Math.max(0, this.flashK - dt * 7);
      this.material.color.setScalar(1 + this.flashK);
    }
  }

  /** Recolor every voxel whose palette key appears in `palette` (hex int or
   *  [r,g,b] HDR array). Drives the per-level gauntlet evolution. */
  retint(palette) {
    this.voxels.forEach((v, i) => {
      const col = palette[v.key];
      if (col === undefined) return;
      if (Array.isArray(col)) v.base.setRGB(col[0], col[1], col[2]);
      else v.base.set(col);
      styleTint(v.color.copy(v.base));
      this.mesh.setColorAt(i, v.color);
    });
    this.mesh.instanceColor.needsUpdate = true;
  }

  /** Re-derive every voxel color from its pre-style base under the current
   *  style hue — lets a STYLE change restyle live sprites instantly. */
  applyStyle() {
    this.voxels.forEach((v, i) => {
      styleTint(v.color.copy(v.base));
      this.mesh.setColorAt(i, v.color);
    });
    this.mesh.instanceColor.needsUpdate = true;
  }

  randomColor() {
    return this.voxels[(Math.random() * this.voxels.length) | 0].color;
  }

  /** World-space positions + colors of ALIVE voxels (chipped ones already
   *  left as debris), for handing off to the debris pool on death. */
  worldVoxels() {
    this.mesh.updateWorldMatrix(true, false);
    const out = [];
    for (const v of this.voxels) {
      if (!v.alive) continue;
      out.push({
        pos: _v.set(v.x, v.y, v.z).applyMatrix4(this.mesh.matrixWorld).clone(),
        color: v.color, base: v.base,
      });
    }
    return out;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Global pool of physical voxel debris: gravity, floor bounce with damping,
 * tumbling, and a shrink-out at end of life. One InstancedMesh for everything.
 */
export class DebrisPool {
  constructor(scene, cap = 4000) {
    this.cap = cap;
    this.softCap = cap; // perf governor lowers this; pool stays preallocated
    // How many gibs ONE death may throw. At the ×64 design default a dread
    // skull is 5,824 voxels — sampling to ~170 chunky gibs threw away the very
    // density you came to see, so the budget scales with the perf tier.
    this.gibTarget = 520;
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, cap);
    this.mesh.frustumCulled = false;
    this.items = [];
    this.free = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < cap; i++) {
      this.mesh.setMatrixAt(i, zero);
      this.free.push(i);
    }
    scene.add(this.mesh);
  }

  /** Free the n oldest gibs (items[] is in spawn order) so a fresh burst can
   *  land. Cheap: one splice, only ever hit when the field is saturated. */
  _retireOldest(n) {
    n = Math.min(n, this.items.length);
    if (n <= 0) return;
    for (let k = 0; k < n; k++) {
      this.mesh.setMatrixAt(this.items[k].i, _m.makeScale(0, 0, 0));
      this.free.push(this.items[k].i);
    }
    this.items.splice(0, n);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** `base` is the voxel's PRE-STYLE color; litter keeps it so a STYLE change
   *  can re-hue the bone-yard along with everything else. Defaults to `color`. */
  spawn(pos, color, vel, size, life = 1.6, base = color) {
    if (!this.free.length || this.items.length >= this.softCap) return;
    const i = this.free.pop();
    this.items.push({
      i, size, life, maxLife: life,
      px: pos.x, py: pos.y, pz: pos.z,
      vx: vel.x, vy: vel.y, vz: vel.z,
      rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: 0,
      wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14,
      br: base.r, bg: base.g, bb: base.b,
    });
    this.mesh.setColorAt(i, color);
    this.mesh.instanceColor.needsUpdate = true;
  }

  /** Explode a set of world voxels outward from their centroid, plus an
   *  impulse. Dense models carry thousands of voxels — stride-sample down to
   *  `gibTarget` so one death can't drain the shared pool, keeping apparent
   *  volume by scaling gib size with ∛stride. */
  burst(worldVoxels, size, impulse, power = 1) {
    if (!worldVoxels.length) return;
    // A death must ALWAYS visibly gib. When the field is saturated `spawn()`
    // would silently drop every piece, so retire the oldest (already settled,
    // shrinking) debris to guarantee this kill some room of its own.
    const room = Math.min(this.softCap - this.items.length, this.free.length);
    const want = Math.min(this.gibTarget, Math.max(64, Math.floor(this.softCap * 0.15)));
    if (room < want) this._retireOldest(want - room);
    const budget = Math.max(1, Math.min(this.gibTarget,
      Math.min(this.softCap - this.items.length, this.free.length)));
    const stride = Math.max(1, Math.ceil(worldVoxels.length / budget));
    if (stride > 1) {
      worldVoxels = worldVoxels.filter((_, i) => i % stride === 0);
      size *= Math.cbrt(stride); // conserve apparent gib volume
    }
    const c = _v.set(0, 0, 0);
    for (const v of worldVoxels) c.add(v.pos);
    c.divideScalar(worldVoxels.length);
    for (const v of worldVoxels) {
      _s.copy(v.pos).sub(c);
      const len = Math.max(_s.length(), 0.05);
      _s.divideScalar(len).multiplyScalar((3 + Math.random() * 6) * power);
      _s.x += impulse.x + (Math.random() - 0.5) * 2;
      _s.y += impulse.y + 2 + Math.random() * 5;
      _s.z += impulse.z + (Math.random() - 0.5) * 2;
      this.spawn(v.pos, v.color, _s, size, 1.1 + Math.random() * 0.9, v.base ?? v.color);
    }
  }

  /** Push nearby debris around so the gib field belongs to the fight instead
   *  of lying inert under it: heavy-kill shockwaves blast it outward, and a
   *  dashing player wades through it. Settled pieces wake up and get a little
   *  life back, so a kicked gib arcs instead of popping out mid-flight.
   *  A (dirX, dirZ) bias makes a sweep read as "shoved along", not "exploded". */
  shove(x, y, z, radius, power, dirX = 0, dirZ = 0) {
    const r2 = radius * radius;
    for (const d of this.items) {
      const dx = d.px - x, dy = d.py - y, dz = d.pz - z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 > r2) continue;
      const dist = Math.sqrt(dist2) || 1e-3;
      const k = power * (1 - dist / radius); // linear falloff to the rim
      d.vx += (dx / dist) * k + dirX * k * 0.8;
      d.vz += (dz / dist) * k + dirZ * k * 0.8;
      d.vy += (0.35 + Math.random() * 0.5) * k; // lift, so it tumbles not slides
      d.wx += (Math.random() - 0.5) * k * 2.5;
      d.wz += (Math.random() - 0.5) * k * 2.5;
      if (d.life < 0.5) d.life = 0.5;
    }
  }

  update(dt) {
    const G = -28;
    for (let k = this.items.length - 1; k >= 0; k--) {
      const d = this.items[k];
      d.life -= dt;
      if (d.life <= 0) {
        this.mesh.setMatrixAt(d.i, _m.makeScale(0, 0, 0));
        this.free.push(d.i);
        this.items.splice(k, 1);
        continue;
      }
      d.vy += G * dt;
      d.px += d.vx * dt; d.py += d.vy * dt; d.pz += d.vz * dt;
      const half = d.size / 2;
      if (d.py < half && d.vy < 0) {
        d.py = half;
        d.vy *= -0.38;
        d.vx *= 0.72; d.vz *= 0.72;
        d.wx *= 0.6; d.wy *= 0.6; d.wz *= 0.6;
        // Come to rest on the floor → hand the piece to the litter field and
        // free this slot NOW. Litter is a static mesh (no per-frame physics),
        // so a run's carnage accumulates for free and the active pool — the
        // only part that costs CPU — stays small.
        if (this.litter && Math.abs(d.vy) < 1.1 && Math.hypot(d.vx, d.vz) < 1.3) {
          this.litter.add(d);
          this.mesh.setMatrixAt(d.i, _m.makeScale(0, 0, 0));
          this.free.push(d.i);
          this.items.splice(k, 1);
          continue;
        }
      }
      d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
      const sc = d.size * Math.min(1, d.life / 0.3);
      _m.compose(
        _v.set(d.px, d.py, d.pz),
        _q.setFromEuler(_e.set(d.rx, d.ry, d.rz)),
        _s.setScalar(sc),
      );
      this.mesh.setMatrixAt(d.i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  reset() {
    for (const d of this.items) {
      this.mesh.setMatrixAt(d.i, _m.makeScale(0, 0, 0));
      this.free.push(d.i);
    }
    this.items.length = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * The bone-yard: debris that has come to rest. One InstancedMesh whose
 * matrices are written ONCE on arrival and never touched again — no gravity,
 * no tumble, no per-frame cost — so a run's carnage can pile up on the floor
 * for the price of a single draw call. A ring buffer, so the oldest bones
 * quietly make way for the newest.
 *
 * `shove()` promotes pieces back into the live DebrisPool, which is what lets
 * a shockwave or a dash kick a settled pile back into the air.
 */
export class LitterField {
  constructor(scene, cap = 2500) {
    this.cap = cap;
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.items = new Array(cap).fill(null);
    this.cursor = 0;
    this.filled = 0;
    scene.add(this.mesh);
  }

  /** Take a settled debris item. Keeps its resting pose and both its current
   *  and pre-style colors (the latter so a STYLE change can re-hue the pile). */
  add(d) {
    if (this.cap <= 0) return;
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.cap;
    this.filled = Math.min(this.filled + 1, this.cap);
    this.items[i] = {
      px: d.px, py: d.py, pz: d.pz,
      rx: d.rx, ry: d.ry, rz: d.rz,
      size: d.size, br: d.br, bg: d.bg, bb: d.bb,
    };
    _m.compose(
      _v.set(d.px, d.py, d.pz),
      _q.setFromEuler(_e.set(d.rx, d.ry, d.rz)),
      _s.setScalar(d.size),
    );
    this.mesh.setMatrixAt(i, _m);
    _tint2.setRGB(d.br, d.bg, d.bb);
    this.mesh.setColorAt(i, styleTint(_tint2));
    this.mesh.count = this.filled;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  /** Wake settled bones inside the radius: they leave the field and re-enter
   *  `pool` as live debris flung outward (plus an optional direction bias). */
  shove(pool, x, y, z, radius, power, dirX = 0, dirZ = 0) {
    const r2 = radius * radius;
    let woke = 0;
    for (let i = 0; i < this.cap; i++) {
      const it = this.items[i];
      if (!it) continue;
      const dx = it.px - x, dy = it.py - y, dz = it.pz - z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 > r2) continue;
      const dist = Math.sqrt(dist2) || 1e-3;
      const k = power * (1 - dist / radius);
      _v.set(it.px, it.py, it.pz);
      _tint2.setRGB(it.br, it.bg, it.bb);
      const styled = styleTint(_tint2.clone());
      pool.spawn(_v, styled,
        _s.set((dx / dist) * k + dirX * k * 0.8,
          (0.5 + Math.random() * 0.6) * k,
          (dz / dist) * k + dirZ * k * 0.8),
        it.size, 1.1 + Math.random() * 0.6, _tint2);
      this.items[i] = null;
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      woke++;
    }
    if (woke) this.mesh.instanceMatrix.needsUpdate = true;
    return woke;
  }

  /** Densest patch of bones: samples live entries and returns the one with the
   *  most neighbours inside `radius`, or null if nothing reaches `minCount`.
   *  This is what lets the bone-yard become a spawn condition rather than
   *  decoration — no corpses, no revenant. */
  densestSpot(minCount, radius, samples = 40) {
    const live = [];
    for (let i = 0; i < this.cap; i++) if (this.items[i]) live.push(this.items[i]);
    if (live.length < minCount) return null;
    const r2 = radius * radius;
    let best = null;
    for (let s = 0; s < samples; s++) {
      const a = live[(Math.random() * live.length) | 0];
      let n = 0;
      for (const b of live) {
        const dx = b.px - a.px, dz = b.pz - a.pz;
        if (dx * dx + dz * dz <= r2) n++;
      }
      if (!best || n > best.count) best = { x: a.px, z: a.pz, count: n };
    }
    return best && best.count >= minCount ? best : null;
  }

  /** Devour up to `max` bones inside the radius — the pile visibly drains as
   *  whatever rose from it takes shape. Returns how many were taken. */
  consume(x, z, radius, max) {
    const r2 = radius * radius;
    let taken = 0;
    for (let i = 0; i < this.cap && taken < max; i++) {
      const it = this.items[i];
      if (!it) continue;
      const dx = it.px - x, dz = it.pz - z;
      if (dx * dx + dz * dz > r2) continue;
      this.items[i] = null;
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      taken++;
    }
    if (taken) this.mesh.instanceMatrix.needsUpdate = true;
    return taken;
  }

  /** Re-hue the whole pile under the current style (cheap, only on a change). */
  applyStyle() {
    for (let i = 0; i < this.cap; i++) {
      const it = this.items[i];
      if (!it) continue;
      _tint2.setRGB(it.br, it.bg, it.bb);
      this.mesh.setColorAt(i, styleTint(_tint2));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  get count() {
    let n = 0;
    for (let i = 0; i < this.cap; i++) if (this.items[i]) n++;
    return n;
  }

  reset() {
    for (let i = 0; i < this.cap; i++) {
      if (this.items[i]) this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      this.items[i] = null;
    }
    this.cursor = 0;
    this.filled = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
