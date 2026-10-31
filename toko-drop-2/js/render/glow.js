// glow.js — the GLOW option (v79): a bloom pass, OFF by default (owner,
// 2026-10-31: "bloom last and not on by default"). The scene is rendered into
// a pass whose render target carries mipmaps, and the output adds the frame's
// bright part sampled bicubically at four mip levels — a mip-chain bloom, the
// idea of three's BloomNode, which is an addon the vendored build does not
// carry. The bright part is cut with a soft knee round `threshold`, in linear
// light, before the tone mapping and the colour space PostProcessing applies
// to its output. Costs a full-screen pass and the scene drawn into a target;
// the PLAY RECORD says what a phone makes of it. Every number TUNING.glow
import * as THREE from 'three/webgpu';
import { pass, textureBicubicLevel, screenUV, float, vec3, vec4, max, Fn } from 'three/tsl';

export class Glow {
  constructor(renderer, scene, T) {
    this.renderer = renderer; this.scene = scene; this.G = T.glow;
    this.post = null; this.pass = null;
  }

  _build(camera) {
    const G = this.G;
    this.pass = pass(this.scene, camera, { samples: G.samples });
    const tex = this.pass.renderTarget.texture;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const col = this.pass.getTextureNode('output').sample(screenUV);
    const out = Fn(() => {
      let glow = vec3(0);
      G.levels.forEach((lvl, i) => {
        const c = textureBicubicLevel(col, float(lvl)).rgb;
        // the bright part: everything past the threshold, eased in over the knee
        const l = max(max(c.r, c.g), c.b), k = max(l.sub(G.threshold).add(G.knee), 0), soft = k.mul(k).div(4 * G.knee + 1e-4);
        const w = max(max(l.sub(G.threshold), soft), 0).div(max(l, 1e-4));
        glow = glow.add(c.mul(w).mul(G.weights[i]));
      });
      return vec4(col.rgb.add(glow.mul(G.strength)), 1);
    })();
    this.post = new THREE.PostProcessing(this.renderer, out);
  }

  // the frame, through the pass, with whichever camera the frame uses
  render(camera) {
    if (!this.post) this._build(camera);
    this.pass.camera = camera;
    this.post.render();
  }
}
