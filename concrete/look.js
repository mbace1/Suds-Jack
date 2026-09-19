import * as T from './vendor/three.module.min.js?v=185';
import { Reflector } from './vendor/Reflector.js?v=185';

// The room's look, kept out of the game: a wet concrete floor that reflects
// the skater and the lights (the Dream Loop demo's signature — a real second
// render through a mirrored camera, not a cube map, so the figure and the
// sparks are in it), slanted shafts of window light, and a PS1 mode that
// draws the whole frame at 240 lines with a Bayer dither and no filtering.
//
// Everything in here may do nothing: with reflections off the floor is the
// floor, with the modern look the shafts are the only addition, and the
// physics never reads any of it.
export function createLook({ renderer, scene, camera, mobile }) {
  const disposables = [];

  // --- Wet floor -----------------------------------------------------------
  const wet = document.createElement('canvas');
  wet.width = wet.height = 256;
  const g = wet.getContext('2d');
  g.fillStyle = '#404040'; g.fillRect(0, 0, 256, 256);
  let seed = 9;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 12 + rnd() * 48, v = Math.floor(90 + rnd() * 150);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${v},${v},${v},.85)`); grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 4000; i++) { const v = Math.floor(rnd() * 255); g.fillStyle = `rgba(${v},${v},${v},.08)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
  const wetTexture = new T.CanvasTexture(wet);
  wetTexture.wrapS = wetTexture.wrapT = T.RepeatWrapping;
  disposables.push(wetTexture);
  const shader = {
    uniforms: { ...T.UniformsUtils.clone(Reflector.ReflectorShader.uniforms), surfaceMap: { value: wetTexture }, strength: { value: 1 } },
    vertexShader: Reflector.ReflectorShader.vertexShader
      .replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vSurface;')
      .replace('vUv = textureMatrix', 'vSurface = uv; vUv = textureMatrix'),
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D surfaceMap; uniform float strength; varying vec4 vUv; varying vec2 vSurface;
      void main() {
        float n = texture2D(surfaceMap, vSurface * 7.0).r;
        vec4 uv = vUv;
        uv.xy += vec2(n - 0.5) * 0.012 * uv.w;
        vec3 reflection = texture2DProj(tDiffuse, uv).rgb;
        float wetness = smoothstep(0.38, 0.78, n);
        gl_FragColor = vec4(reflection, (0.04 + wetness * 0.3) * strength);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const size = mobile ? 256 : 512;
  const mirror = new Reflector(new T.PlaneGeometry(57, 75), { textureWidth: size, textureHeight: size, multisample: 0, shader, clipBias: 0.002 });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.008;
  mirror.material.transparent = true;
  mirror.material.depthWrite = false;
  mirror.name = 'wet-floor';
  scene.add(mirror);
  // A second full render of the room every frame is the one real cost here;
  // the reflection is refreshed at most every 40 ms and the texture between
  // refreshes is the last one, which the eye does not catch on a floor.
  const reflect = mirror.onBeforeRender;
  let reflectedAt = -Infinity, captures = 0;
  mirror.onBeforeRender = function (...args) {
    const now = performance.now();
    if (now - reflectedAt < 40) return;
    reflectedAt = now; captures++;
    reflect.apply(this, args);
  };

  // --- Light shafts --------------------------------------------------------
  const shafts = new T.Group();
  shafts.name = 'light-shafts';
  scene.add(shafts);
  const shaftAlpha = document.createElement('canvas');
  shaftAlpha.width = 64; shaftAlpha.height = 128;
  const sg = shaftAlpha.getContext('2d');
  const along = sg.createLinearGradient(0, 0, 0, 128);
  along.addColorStop(0, '#fff'); along.addColorStop(0.7, '#666'); along.addColorStop(1, '#000');
  sg.fillStyle = along; sg.fillRect(0, 0, 64, 128);
  const across = sg.createLinearGradient(0, 0, 64, 0);
  across.addColorStop(0, 'rgba(0,0,0,1)'); across.addColorStop(0.3, 'rgba(0,0,0,0)'); across.addColorStop(0.7, 'rgba(0,0,0,0)'); across.addColorStop(1, 'rgba(0,0,0,1)');
  sg.fillStyle = across; sg.fillRect(0, 0, 64, 128);
  const shaftTexture = new T.CanvasTexture(shaftAlpha);
  disposables.push(shaftTexture);
  const shaftMaterial = new T.MeshBasicMaterial({ color: '#ffd9a0', alphaMap: shaftTexture, transparent: true, opacity: mobile ? 0.1 : 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false });
  disposables.push(shaftMaterial);
  const dir = new T.Vector3(-14, -24, 15).normalize(), length = 13;
  const shaftGeometry = new T.PlaneGeometry(7, length);
  disposables.push(shaftGeometry);
  for (let z = -30; z <= 30; z += 12) {
    const start = new T.Vector3(28.7, 9, z);
    const mid = start.clone().addScaledVector(dir, length / 2);
    for (const wide of [new T.Vector3(0, 0, 1), new T.Vector3().crossVectors(dir, new T.Vector3(0, 0, 1)).normalize()]) {
      const plane = new T.Mesh(shaftGeometry, shaftMaterial);
      const basis = new T.Matrix4().makeBasis(wide, dir.clone(), new T.Vector3().crossVectors(wide, dir).normalize());
      plane.setRotationFromMatrix(basis);
      plane.position.copy(mid);
      plane.renderOrder = 2;
      shafts.add(plane);
    }
  }

  // --- PS1 pass ------------------------------------------------------------
  const target = new T.WebGLRenderTarget(4, 3, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, type: T.HalfFloatType });
  const blitMaterial = new T.ShaderMaterial({
    uniforms: { tex: { value: target.texture }, res: { value: new T.Vector2(4, 3) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tex; uniform vec2 res; varying vec2 vUv;
      const mat4 bayer = mat4(0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.) / 16.0;
      void main() {
        gl_FragColor = vec4(texture2D(tex, vUv).rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        ivec2 cell = ivec2(mod(floor(vUv * res), 4.0));
        float d = bayer[cell.x][cell.y] - 0.5;
        float levels = 31.0;
        gl_FragColor.rgb = floor(gl_FragColor.rgb * levels + d) / levels;
      }`,
    depthTest: false, depthWrite: false,
  });
  const blitScene = new T.Scene();
  const blitCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blitQuad = new T.Mesh(new T.PlaneGeometry(2, 2), blitMaterial);
  blitQuad.frustumCulled = false;
  blitScene.add(blitQuad);
  disposables.push(target, blitMaterial, blitQuad.geometry);

  let mode = 'modern', reflections = !mobile, pixelRatio = renderer.getPixelRatio(), shadows = renderer.shadowMap.enabled;
  function resize() {
    const aspect = camera.aspect || 1;
    const h = 240, w = Math.max(4, Math.round(h * aspect));
    target.setSize(w, h);
    blitMaterial.uniforms.res.value.set(w, h);
  }
  resize();
  function refreshMaterials() {
    scene.traverse(o => { if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true; });
  }
  function applyMode() {
    const ps1 = mode === 'ps1';
    shafts.visible = !ps1;
    mirror.visible = reflections;
    if (ps1) { renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; }
    else { renderer.setPixelRatio(pixelRatio); renderer.shadowMap.enabled = shadows; }
    refreshMaterials();
  }
  applyMode();

  return {
    get mode() { return mode; },
    get reflections() { return reflections; },
    setMode(m) { if (m !== mode) { mode = m === 'ps1' ? 'ps1' : 'modern'; applyMode(); } },
    setReflections(on) { reflections = !!on; mirror.visible = reflections; },
    resize,
    render(sceneToDraw, cam) {
      if (mode === 'ps1') {
        renderer.setRenderTarget(target);
        renderer.render(sceneToDraw, cam);
        renderer.setRenderTarget(null);
        renderer.render(blitScene, blitCamera);
      } else renderer.render(sceneToDraw, cam);
    },
    metrics: () => ({ mode, reflections, captures, size }),
    dispose() {
      mirror.removeFromParent(); mirror.getRenderTarget().dispose(); mirror.geometry.dispose(); mirror.material.dispose();
      shafts.removeFromParent();
      for (const d of disposables) d.dispose();
    },
  };
}
