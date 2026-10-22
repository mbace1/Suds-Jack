import * as THREE from 'three';
/**
 * THE ROSTER PALETTE — a season's recolour of every body in the game.
 *
 * Owner's direction for season 2 (2026-09-08): *enemies will be new —
 * aquamarine, green, yellows, but also slightly Aztec themed*. The sculpts
 * that will carry that are the owner's to make and arrive through the
 * manifest seam like the current roster did; what the game can own NOW is
 * the colour, and it can own it for whatever body is in the slot, string-art
 * or Meshy, today's skull or next month's.
 *
 * So a season may declare `roster`, and `VoxelSprite` asks it for every
 * voxel's colour as the body is built. The reference for the Aztec read is
 * the TURQUOISE MOSAIC — the skull masks tiled in turquoise, jade and gold
 * tesserae — and that is a lattice already: the voxels are the tesserae.
 * The recolour keeps the bake's VALUE (sockets stay dark, crowns stay
 * light, every chip and gib still reads as the body it came off) and hands
 * out the HUE by horizontal BAND of lattice rows, the seam between bands
 * jogging one row on alternate columns — a stepped seam, the Aztec step
 * motif in its cheapest form. A per-tessera value jitter breaks the fill
 * into tiles. HDR voxels (the eyes) burn GOLD instead of ember; a red mark
 * in the source turns yellow.
 *
 * Nothing downstream knows: `v.base` is taken AFTER this, so LOOK SMOOTH's
 * hull, the STYLE tint, chips, islands, gibs and the bone-yard all follow.
 */
export function mosaicPalette(cfg) {
  const bands = cfg.bands ?? [[0.10, 0.66, 0.60], [0.08, 0.50, 0.22], [0.10, 0.66, 0.60], [0.92, 0.72, 0.12]];
  const hdr = cfg.hdr ?? [3.6, 2.2, 0.25];
  const mark = cfg.mark ?? [0.95, 0.80, 0.18];
  const rows = Math.max(1, cfg.rows ?? 3);
  const jitter = cfg.jitter ?? 0.12;
  const lift = cfg.lift ?? 1.0;
  return (c, v, size) => {
    // the eyes: anything already past 1.0 is a light, and stays one
    if (c.r > 1.05 || c.g > 1.05 || c.b > 1.05) return c.setRGB(hdr[0], hdr[1], hdr[2]);
    const lum = Math.min(1, (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) * lift);
    // a real red in the source (a mark, a wound) goes yellow — the season has no red
    if (c.r > Math.max(c.g, c.b) * 1.6 && c.r > 0.25) return c.setRGB(mark[0] * (0.6 + lum * 0.5), mark[1] * (0.6 + lum * 0.5), mark[2] * (0.6 + lum * 0.5));
    const hx = Math.round(v.x / size), hy = Math.round(v.y / size), hz = Math.round(v.z / size);
    // the band, with its seam stepping on alternate columns
    const jog = (hx + hz) & 1;
    const band = bands[Math.abs(Math.floor((hy + jog) / rows)) % bands.length];
    // value: the bake's darks stay dark (an S-ish curve), the lights carry the tile
    const k = Math.pow(lum, 1.4) * 1.1 + 0.08;
    // per-tessera jitter, seeded on the cell so it never flickers
    let h = (hx * 73856093) ^ (hy * 19349663) ^ (hz * 83492791);
    h = ((h >>> 0) % 1000) / 1000;
    const j = 1 + (h - 0.5) * 2 * jitter;
    return c.setRGB(band[0] * k * j, band[1] * k * j, band[2] * k * j);
  };
}

/**
 * The same mosaic for the alive-SKIN — the Meshy mesh an enemy wears over
 * its lattice until it is wounded (mesh-enemies.js). The lattice is hidden
 * under it, so a recolour that stopped at the voxels would show bone until
 * the first chip; this patches the skin's Lambert with the same banding in
 * the mesh's own space, so shedding the skin changes nothing but the edges.
 * `pitch` is the lattice cell in the MESH's local units (the template is
 * scaled to its slot, so the caller divides by that scale).
 */
export function mosaicSkin(cfg) {
  const bands = cfg.bands ?? [[0.10, 0.66, 0.60], [0.08, 0.50, 0.22], [0.10, 0.66, 0.60], [0.92, 0.72, 0.12]];
  const rows = Math.max(1, cfg.rows ?? 3);
  const jitter = cfg.jitter ?? 0.12;
  const lift = cfg.lift ?? 1.0;
  return (material, pitch) => {
    const u = {
      uB0: { value: new THREE.Color().setRGB(...bands[0]) },
      uB1: { value: new THREE.Color().setRGB(...bands[1 % bands.length]) },
      uB2: { value: new THREE.Color().setRGB(...bands[2 % bands.length]) },
      uB3: { value: new THREE.Color().setRGB(...bands[3 % bands.length]) },
      uRows: { value: rows }, uPitch: { value: Math.max(1e-4, pitch) },
      uJitter: { value: jitter }, uLift: { value: lift },
    };
    material.userData.mosaic = u;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMosaic;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMosaic = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform vec3 uB0; uniform vec3 uB1; uniform vec3 uB2; uniform vec3 uB3;
uniform float uRows; uniform float uPitch; uniform float uJitter; uniform float uLift;
varying vec3 vMosaic;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
{
  float lum = min(1.0, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)) * uLift);
  vec3 cell = floor(vMosaic / uPitch + 0.5);
  float jog = mod(cell.x + cell.z, 2.0);
  float bi = mod(floor((cell.y + jog) / uRows), 4.0);
  bi = bi < 0.0 ? bi + 4.0 : bi;
  vec3 band = bi < 0.5 ? uB0 : (bi < 1.5 ? uB1 : (bi < 2.5 ? uB2 : uB3));
  float k = pow(lum, 1.4) * 1.1 + 0.08;
  float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float j = 1.0 + (h - 0.5) * 2.0 * uJitter;
  diffuseColor.rgb = band * k * j;
}`);
    };
    material.customProgramCacheKey = () => 'mosaic-skin';
    material.needsUpdate = true;
  };
}
