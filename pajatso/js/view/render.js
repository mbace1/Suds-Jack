// The eye: a renderer drawing the pit into a small target and blowing it up,
// nearest-neighbour, through a grade — the way CloverPit's room looks like a
// memory of a PS1 game rather than a PS1 game.
//
// Three skips tone mapping and colour space when it renders into a target, so
// both happen in the blit (CONCRETE's lesson), and so do the ordered dither,
// the vignette and the grain.

import * as THREE from 'three';
import { STATIONS } from './room.js?v=2';

export const QUALITY = {
  chunky: { lines: 300 },
  crisp: { lines: 420 },
  fine: { lines: 560 },
  full: { lines: 0 },
};

export class Eye {
  constructor(canvas, { quality = 'crisp' } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020203);
    this.scene.fog = new THREE.Fog(0x040405, 3.5, 11);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.02, 40);
    this.quality = quality;
    this.target = null;
    this.station = 'machine';
    this.view = { pos: new THREE.Vector3(...STATIONS.machine.pos), look: new THREE.Vector3(...STATIONS.machine.look) };
    this.from = null; this.tweenT = 1;
    this.parallax = new THREE.Vector2();
    this.shake = 0;
    this.fall = 0;
    this.makeBlit();
    this.env = makeEnv(this.renderer);
    this.resize();
  }

  makeBlit() {
    this.blitScene = new THREE.Scene();
    this.blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.blitMat = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 },
        exposure: { value: 1.05 }, fade: { value: 0 }, tint: { value: new THREE.Color(0, 0, 0) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        precision highp float;
        uniform sampler2D tex; uniform vec2 res; uniform float time; uniform float exposure; uniform float fade; uniform vec3 tint;
        varying vec2 vUv;
        vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
        float bayer(vec2 p){
          int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
          int i = x + y * 4;
          float m[16];
          m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
          m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
          for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
          return 0.0;
        }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 17.0) * 43758.5453); }
        void main(){
          vec2 px = floor(vUv * res);
          vec3 c = texture2D(tex, (px + 0.5) / res).rgb * exposure;
          c = aces(c);
          // lift the blacks toward a cold green, pull the highlights warm:
          // the grade is the room's damp, not a filter on top of it
          c = c * vec3(0.97, 1.0, 0.96) + vec3(0.012, 0.018, 0.016) * (1.0 - c);
          c = pow(c, vec3(1.0 / 2.2));
          // 40 levels a channel, ordered-dithered in source pixels
          float levels = 40.0;
          c = floor(c * levels + bayer(px)) / levels;
          vec2 q = vUv - 0.5;
          float vig = 1.0 - dot(q, q) * 1.15;
          c *= clamp(vig, 0.0, 1.0);
          c += (hash(px) - 0.5) * 0.035;
          c = mix(c, tint, fade);
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blitMat));
  }

  setQuality(q) { if (QUALITY[q]) { this.quality = q; this.resize(); } }

  resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    this.renderer.setSize(w, h, false);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const lines = QUALITY[this.quality].lines || Math.round(h * dpr);
    const ih = Math.min(Math.round(h * dpr), lines), iw = Math.max(1, Math.round(ih * w / h));
    this.target?.dispose();
    this.target = new THREE.WebGLRenderTarget(iw, ih, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
    });
    this.blitMat.uniforms.tex.value = this.target.texture;
    this.blitMat.uniforms.res.value.set(iw, ih);
    this.W = w; this.H = h;
    this.baseFov = w / h < 0.7 ? 66 : w / h < 1 ? 62 : 56;
    this.internal = { w: iw, h: ih };
    this.fitMachine();
  }

  // The HUD owns the top and the bottom of the screen; each station has to fit
  // in what is left, on a phone held either way and on a monitor. So a station
  // SOLVES for its lens: the narrowest field of view that gets its silhouette
  // points inside the free band, with the lens shifted so the band's middle is
  // the picture's middle.
  setInsets(name, top, bottom, right = 0) {
    this.insets = this.insets ?? {};
    const was = this.insets[name];
    if (was && Math.abs(was.top - top) < 2 && Math.abs(was.bottom - bottom) < 2 && Math.abs(was.right - right) < 2 && this.fits?.[name]) return;
    this.insets[name] = { top, bottom, right };
    this.fitStation(name);
  }

  fitMachine() { this.fits = {}; for (const n of Object.keys(STATIONS)) this.fitStation(n); }

  fitStation(name) {
    const W = this.W, H = this.H, st = STATIONS[name];
    this.fits = this.fits ?? {};
    if (!W || !st) return;
    if (!st.fit) { this.fits[name] = { fov: this.baseFov, hFree: H, wFree: W, top: 0 }; return; }
    const ins = this.insets?.[name] ?? { top: 0, bottom: 0, right: 0 };
    const hFree = Math.max(80, H - ins.top - ins.bottom), wFree = Math.max(80, W - (ins.right ?? 0));
    const cam = new THREE.PerspectiveCamera(50, wFree / hFree, 0.02, 40);
    cam.position.set(...st.pos); cam.lookAt(new THREE.Vector3(...st.look));
    const pts = st.fit.map(p => new THREE.Vector3(...p));
    const fits = fov => {
      cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      return pts.every(p => { const q = p.clone().project(cam); return Math.abs(q.x) <= 0.96 && Math.abs(q.y) <= 0.96; });
    };
    let lo = 15, hi = 120;
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    this.fits[name] = { fov: hi, hFree, wFree, top: ins.top };
  }

  turnTo(name) {
    if (!STATIONS[name] || name === this.station) return;
    this.from = { pos: this.view.pos.clone(), look: this.view.look.clone() };
    this.fromStation = this.station;
    this.station = name;
    this.tweenT = 0;
  }

  update(dt, time) {
    const st = STATIONS[this.station];
    const to = { pos: new THREE.Vector3(...st.pos), look: new THREE.Vector3(...st.look) };
    if (this.tweenT < 1 && this.from) {
      this.tweenT = Math.min(1, this.tweenT + dt / 0.55);
      const k = this.tweenT < 0.5 ? 2 * this.tweenT * this.tweenT : 1 - (-2 * this.tweenT + 2) ** 2 / 2;
      // turn the head through the look direction rather than lerping the
      // target through the room: a head turns, it does not slide
      const a = this.from.look.clone().sub(this.from.pos), b = to.look.clone().sub(to.pos);
      const ya = Math.atan2(a.x, -a.z), yb = Math.atan2(b.x, -b.z);
      let dy = yb - ya; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      const yaw = ya + dy * k;
      const pa = Math.atan2(a.y, Math.hypot(a.x, a.z)), pb = Math.atan2(b.y, Math.hypot(b.x, b.z));
      const pitch = pa + (pb - pa) * k;
      const dist = a.length() + (b.length() - a.length()) * k;
      this.view.pos.lerpVectors(this.from.pos, to.pos, k);
      this.view.look.set(this.view.pos.x + Math.sin(yaw) * Math.cos(pitch) * dist,
        this.view.pos.y + Math.sin(pitch) * dist, this.view.pos.z - Math.cos(yaw) * Math.cos(pitch) * dist);
    } else { this.view.pos.copy(to.pos); this.view.look.copy(to.look); }
    const cam = this.camera;
    // the lens: fitted at the machine, ordinary everywhere else, blended
    // through a turn so the room does not jump
    const kk = this.tweenT < 1 ? (this.tweenT < 0.5 ? 2 * this.tweenT * this.tweenT : 1 - (-2 * this.tweenT + 2) ** 2 / 2) : 1;
    const plain = { fov: this.baseFov, hFree: this.H, wFree: this.W, top: 0 };
    const fTo = this.fits?.[this.station] ?? plain;
    const fFrom = (this.tweenT < 1 && this.fits?.[this.fromStation]) || fTo;
    cam.fov = fFrom.fov + (fTo.fov - fFrom.fov) * kk;
    const hF = fFrom.hFree + (fTo.hFree - fFrom.hFree) * kk, topF = fFrom.top + (fTo.top - fFrom.top) * kk;
    const wF = (fFrom.wFree ?? this.W) + ((fTo.wFree ?? this.W) - (fFrom.wFree ?? this.W)) * kk;
    cam.aspect = wF / hF;
    cam.setViewOffset(wF, hF, 0, -topF, this.W, this.H);
    cam.updateProjectionMatrix();
    cam.position.copy(this.view.pos);
    if (this.fall > 0) cam.position.y -= this.fall;
    const look = this.view.look.clone();
    // a little of the pointer in the gaze: you are sitting, not bolted down
    const right = new THREE.Vector3().subVectors(look, cam.position).cross(new THREE.Vector3(0, 1, 0)).normalize();
    look.addScaledVector(right, this.parallax.x * 0.06).add(new THREE.Vector3(0, -this.parallax.y * 0.04, 0));
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.012;
      look.add(new THREE.Vector3(Math.sin(time * 71) * s, Math.sin(time * 53) * s, 0));
    }
    if (this.fall > 0) look.y -= this.fall + Math.min(1.2, this.fall * 0.8);
    cam.lookAt(look);
  }

  render(time) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    this.blitMat.uniforms.time.value = time % 100;
    r.render(this.blitScene, this.blitCam);
  }
}

// A small cube of the room as a metal sees it: black, one warm bulb above,
// the machine's glow in front. Chrome with no environment renders black.
function makeEnv(renderer) {
  const size = 64;
  const face = (paint) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); paint(g); return c; };
  const dark = g => { const gr = g.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, '#2a2622'); gr.addColorStop(1, '#0a0908'); g.fillStyle = gr; g.fillRect(0, 0, size, size); };
  const withGlow = (x, y, r, col) => g => { dark(g); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, size, size); };
  const faces = [
    face(withGlow(20, 30, 26, 'rgba(160,255,200,0.6)')),     // +x
    face(withGlow(44, 30, 30, 'rgba(160,210,255,0.7)')),     // -x
    face(withGlow(32, 32, 30, 'rgba(255,230,170,1)')),       // +y: the bulb
    face(g => { g.fillStyle = '#050403'; g.fillRect(0, 0, size, size); }),  // -y
    // +z is the room BEHIND you — and it is what a coin facing you reflects.
    // Painted dark, every coin on the board was a black disc on a dark board.
    face(g => { const gr = g.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, '#fff0d0'); gr.addColorStop(0.5, '#c89060'); gr.addColorStop(1, '#402818'); g.fillStyle = gr; g.fillRect(0, 0, size, size); }),  // +z
    face(withGlow(32, 30, 34, 'rgba(255,120,200,0.9)')),     // -z: the machine
  ];
  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  return cube;
}
