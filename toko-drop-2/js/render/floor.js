// floor.js — the ground the gels stand on: 1.x's arena floor.
//
// A port of 1.x's FLOOR_FRAG (js/main.js at v268, the studio-default depth):
// a dark navy plane with a slowly pulsing grid in square cells, a vignette
// toward the rim, the grid fading as it goes, and a soft pool of light that
// follows the hero. The border is a thin rail in the same blue as 1.x's.
//
// Unlit, as 1.x's was: the floor is a picture, and the gels are the only
// lit things on it.
import * as THREE from 'three/webgpu';
import { Fn, uv, uniform, float, abs, fract, min, sin, length, smoothstep, mix, fwidth, texture, clamp, vec2 } from 'three/tsl';
import { GEL_TIME } from './gel.js?v=14';

// `light` (optional) is the arena's light map (render/light.js): its rgb is
// light thrown on the floor, its alpha the shadow of what stands on it
export function buildFloor(T, hx, hz, light) {
  const F = T.floor, LF = T.light.arena.floor;
  const group = new THREE.Group();

  const player = uniform(new THREE.Vector2(0.5, 0.5));   // the hero, in floor uv
  const gridX = uniform((hx * 2) / F.gridCell), gridZ = uniform((hz * 2) / F.gridCell);
  const base = uniform(new THREE.Color(F.base)), gridLo = uniform(new THREE.Color(F.gridLo)), gridHi = uniform(new THREE.Color(F.gridHi));

  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = Fn(() => {
    const p = uv();
    // distance to the nearest grid line, in cells; 1.x drew the line 1/50 of
    // a cell wide, and it is antialiased here so a far or small floor does
    // not crawl with moiré
    const gx = float(0.5).sub(abs(fract(p.x.mul(gridX)).sub(0.5)));
    const gz = float(0.5).sub(abs(fract(p.y.mul(gridZ)).sub(0.5)));
    const d = min(gx, gz), aa = fwidth(d);
    const grid = float(1).sub(smoothstep(float(F.gridLine).sub(aa), float(F.gridLine).add(aa), d));
    const pulse = float(0.7).add(sin(GEL_TIME.mul(1.2)).mul(0.3));
    // rim distance, corner-normalised so it reads the same either way up
    const rim = length(p.sub(0.5)).div(0.7071);
    const vig = float(1).sub(smoothstep(F.vignetteInner, 1, rim).mul(F.vignetteDepth));
    const gridFade = float(1).sub(smoothstep(F.vignetteInner, 1, rim).mul(F.gridFalloff));
    const pool = float(1).sub(smoothstep(0, F.poolRadius, length(p.sub(player))));
    const gridColor = mix(gridLo, gridHi, grid);
    const col = mix(base, gridColor, grid.mul(pulse).mul(0.7).mul(gridFade).mul(F.gridGlow));
    const lit = col.mul(vig).add(gridColor.mul(pool).mul(F.poolLift * 0.25)).add(base.mul(pool).mul(F.poolLift));
    if (!light) return lit;
    // a shadow darkens what is under it; light lifts the floor a little and
    // its grid lines a lot, the way a lit surface shows its texture
    // the map's camera looks straight down with the far edge at the top, so
    // its rows run the other way from the floor's v
    const L = texture(light, vec2(p.x, float(1).sub(p.y))), shade = clamp(L.a, 0, 1);
    return lit.mul(float(1).sub(shade)).add(L.rgb.mul(grid.mul(gridFade).mul(LF.grid).add(LF.spill)));
  })();

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2).rotateX(-Math.PI / 2), mat);
  group.add(plane);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(hx * 2, F.railHeight, hz * 2)),
    new THREE.LineBasicNodeMaterial({ color: F.rail }),
  );
  border.position.y = F.railHeight / 2;
  group.add(border);

  // what the camera must hold: the floor and its rail
  const arena = new THREE.Box3(new THREE.Vector3(-hx, 0, -hz), new THREE.Vector3(hx, F.railHeight, hz));

  return {
    group, arena,
    // the light pool follows the hero (world x, z → floor uv)
    setPlayer(x, z) { player.value.set((x + hx) / (2 * hx), (hz - z) / (2 * hz)); },
    dispose() {
      plane.geometry.dispose(); mat.dispose();
      border.geometry.dispose(); border.material.dispose();
    },
  };
}
