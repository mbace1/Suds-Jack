// lens.js — the TILT-SHIFT lens (v94; owner, 2026-11-01: "look into the
// tilt-shift look, detailed central area, maybe it works with small objects
// too if there are enough details"). A miniature is read by its depth of
// field: a lens close to something small holds only a thin slice of it sharp,
// so a scene whose middle is sharp and whose near and far parts melt away
// reads as a model on a table. The scene is drawn into a pass whose target
// carries mipmaps (v79's glow did the same; the vendored build carries no
// depth-of-field addon) and each pixel is read back, bicubically, at the mip
// level its distance from the focus asks for: a thin lens's circle of
// confusion, |z − f| / z, sharp inside `band` and opening to `maxLevel` over
// `ramp`. The focus is the hero's own depth, so what you play is always in
// the sharp slice. A little more saturation on top, the toy colours a
// miniature photograph shows. Off unless asked for: it costs the scene drawn
// into a target, its mipmaps and a full-screen pass. Every number TUNING.lens
import * as THREE from 'three/webgpu';
import { pass, textureBicubicLevel, screenUV, float, vec3, vec4, mix, dot, abs, max, smoothstep, uniform, Fn } from 'three/tsl';

export class Lens {
  constructor(renderer, scene, T) {
    this.renderer = renderer; this.scene = scene; this.L = T.lens;
    this.focus = uniform(30);   // the depth that is sharp, in metres from the camera
    this.post = null; this.pass = null;
  }

  _build(camera) {
    const L = this.L;
    this.pass = pass(this.scene, camera);
    const tex = this.pass.renderTarget.texture;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const col = this.pass.getTextureNode('output').sample(screenUV);
    const viewZ = this.pass.getViewZNode();   // negative in front of the camera
    const out = Fn(() => {
      const z = max(viewZ.negate(), 0.01);
      const d = z.sub(this.focus), coc = abs(d).div(z).mul(d.lessThan(0).select(float(L.near), float(1)));   // nearer than the focus: softened, not melted
      const lod = smoothstep(float(L.band), float(L.band + L.ramp), coc).mul(L.maxLevel);
      let c = textureBicubicLevel(col, lod).rgb;
      const lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(lum), c, L.saturation);
      return vec4(c, 1);
    })();
    this.post = new THREE.PostProcessing(this.renderer, out);
  }

  // the frame through the lens, focused at `focusZ` m, with whichever camera the frame uses
  render(camera, focusZ) {
    if (!this.post) this._build(camera);
    this.pass.camera = camera;
    this.focus.value = focusZ;
    this.post.render();
  }
}
