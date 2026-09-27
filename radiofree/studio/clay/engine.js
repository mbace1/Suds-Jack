// The clay stage: a miniature studio in three.js.
//
// What makes a render read as CLAYMATION rather than as CG with a clay
// colour, in the order it matters here:
//
//   1. contact and crease shadow — ambient occlusion, so every object sits ON
//      something and every fold in the clay goes dark (GTAO)
//   2. a macro lens — shallow depth of field says "this is 30 cm across"
//      faster than any modelling can (Bokeh)
//   3. soft studio light — one big soft key with soft shadows, a bounce fill,
//      a cool rim; never a sun (VSM shadows, a room environment for the
//      broad soft highlights plasticine has)
//   4. stop motion — the picture changes twelve times a second, not thirty;
//      the lamps breathe a little between exposures; the film has grain
//
// Units are centimetres. The stage owns the renderer, the lights, the camera
// and the post chain; a shot owns a group in the scene and a camera move.

import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/jsm/postprocessing/GTAOPass.js';
import { BokehPass } from '../vendor/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../vendor/jsm/environments/RoomEnvironment.js';

export { THREE };

// the grade: warm lift in the shadows, a lens vignette, film grain, and the
// exposure breathing a percent or two between frames as a real lamp does
const Grade = {
  uniforms: { tDiffuse: { value: null }, uFrame: { value: 0 }, uFlicker: { value: 1 }, uVignette: { value: 0.75 }, uGrain: { value: 0.045 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uFrame, uFlicker, uVignette, uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uFrame * 7.13) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb *= uFlicker;
      // lift the blacks toward a warm brown, the way a stop-motion print sits
      c.rgb = c.rgb * 0.94 + vec3(0.035, 0.022, 0.012);
      vec2 q = vUv - 0.5; q.x *= 0.62;
      c.rgb *= mix(1.0, smoothstep(0.85, 0.2, length(q)), uVignette);
      c.rgb += (h(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

export function makeStage({ width = 1080, height = 1920, quality = 'high' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2230');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 2000);

  // the studio lights. The key is BIG and soft (VSM radius), up and to the
  // left; the fill is a bounce off a warm floor; the rim separates the
  // puppets from the set.
  // a SPOT, not a sun: the set sits in a pool of light that falls off
  // toward the frame edges, which is most of what makes a set look lit
  const key = new THREE.SpotLight('#ffeed6', 14000, 0, 0.5, 0.8, 1.6);
  key.position.set(-60, 110, 90);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 14; key.shadow.blurSamples = 20;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 40; key.shadow.camera.far = 400;
  scene.add(key, key.target);
  const fill = new THREE.HemisphereLight('#dfe8ff', '#a86e40', 0.55);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#bcd4ff', 1.3);
  rim.position.set(70, 60, -80);
  scene.add(rim);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, width, height);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 1.0;
  gtao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.4, thickness: 2.0, scale: 1.2, samples: quality === 'high' ? 16 : 8 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  composer.addPass(gtao);
  const bokeh = new BokehPass(scene, camera, { focus: 80, aperture: 0.0016, maxblur: 0.009 });
  composer.addPass(bokeh);
  const grade = new ShaderPass(Grade);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  return {
    THREE, renderer, scene, camera, composer, key, fill, rim, gtao, bokeh, grade, width, height,
    /** point the lens: where it is, what it looks at, and what is in focus */
    shoot(pos, look, { fov = 30, focus = null, aperture = 0.0016 } = {}) {
      camera.fov = fov; camera.position.copy(pos); camera.lookAt(look); camera.updateProjectionMatrix();
      bokeh.uniforms.focus.value = focus ?? pos.distanceTo(look);
      bokeh.uniforms.aperture.value = aperture;
    },
    render(frame) {
      // the lamp breathes between exposures
      const r = Math.sin(frame * 12.9898) * 43758.5453;
      grade.uniforms.uFrame.value = frame % 97;
      grade.uniforms.uFlicker.value = 1 + ((r - Math.floor(r)) - 0.5) * 0.03;
      composer.render();
    },
  };
}
