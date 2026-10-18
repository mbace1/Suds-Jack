// Helsinki at four in the afternoon in November: the facade across the
// street, roofs, the cathedral's dome, tram wires and the rain — as painted
// card flats, so every style can cut it its own way.

import * as THREE from 'three';
import { rng } from './sculpt.js';

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** sky: a vertical gradient as an unlit plane */
export function skyPlane(w, h, stops, { pos = [0, 0, -400], intensity = 1 } = {}) {
  const c = canvas(64, 512), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  for (const [k, col] of stops) gr.addColorStop(k, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
  const m = new THREE.MeshBasicMaterial({ map: tex(c), fog: false });
  m.color.setScalar(intensity);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(...pos);
  return p;
}

/**
 * A row of card buildings cut along a roofline, with windows. Returns a mesh
 * whose map carries the paint and whose emissiveMap carries the lit windows.
 * opts: { w, h, px (pixels per cm), seed, wall, wallVar, frame, lit, litP, dark, roofs, dome, edge }
 */
export function facadeFlat(o) {
  const W = Math.round(o.w * o.px), H = Math.round(o.h * o.px);
  const c = canvas(W, H), g = c.getContext('2d');
  const e = canvas(W, H), ge = e.getContext('2d');
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  const r = rng(o.seed || 7);
  const blocks = [];
  let x = 0;
  while (x < W) {
    const bw = (o.blockW ?? 40) * o.px * (0.7 + r() * 0.6);
    const top = H * (o.topMin ?? 0.15) + r() * H * (o.topVar ?? 0.25);
    blocks.push({ x, w: bw, top, col: o.wall[(r() * o.wall.length) | 0] });
    x += bw;
  }
  // silhouette with roofs, chimneys
  for (const b of blocks) {
    g.fillStyle = b.col;
    g.beginPath();
    g.moveTo(b.x, H);
    g.lineTo(b.x, b.top);
    if (o.roofs !== false) {
      const kind = r();
      if (kind < 0.4) { g.lineTo(b.x + b.w * 0.15, b.top - b.w * 0.18); g.lineTo(b.x + b.w * 0.85, b.top - b.w * 0.18); }
      else if (kind < 0.6) { g.lineTo(b.x + b.w * 0.5, b.top - b.w * 0.3); }
      g.lineTo(b.x + b.w, b.top);
    } else g.lineTo(b.x + b.w, b.top);
    g.lineTo(b.x + b.w, H); g.closePath(); g.fill();
    // chimneys
    const nc = (r() * 3) | 0;
    for (let i = 0; i < nc; i++) {
      const cx = b.x + b.w * (0.2 + r() * 0.6), cw = o.px * (2 + r() * 2), ch = o.px * (4 + r() * 5);
      g.fillRect(cx, b.top - b.w * 0.12 - ch, cw, ch + b.w * 0.12);
    }
    // windows in a grid
    const ww = o.px * (o.winW ?? 3.2), wh = o.px * (o.winH ?? 5), gx = o.px * (o.winGapX ?? 3.4), gy = o.px * (o.winGapY ?? 4.4);
    const cols = Math.max(1, Math.floor((b.w - gx) / (ww + gx)));
    const off = (b.w - cols * (ww + gx) + gx) / 2;
    for (let y = b.top + gy * 1.2; y + wh < H - gy * 0.5; y += wh + gy) {
      for (let i = 0; i < cols; i++) {
        const wx = b.x + off + i * (ww + gx);
        const lit = r() < (o.litP ?? 0.3);
        g.fillStyle = o.frame || '#000'; g.fillRect(wx - o.px * 0.4, y - o.px * 0.4, ww + o.px * 0.8, wh + o.px * 0.8);
        g.fillStyle = lit ? o.lit[(r() * o.lit.length) | 0] : o.dark; g.fillRect(wx, y, ww, wh);
        if (lit) {
          ge.fillStyle = g.fillStyle; ge.fillRect(wx, y, ww, wh);
          // a curtain or a plant cutting the light
          if (r() < 0.5) { g.fillStyle = 'rgba(30,18,10,.55)'; ge.fillStyle = 'rgba(0,0,0,.6)'; const cw2 = ww * (0.2 + r() * 0.3); const side = r() < 0.5 ? wx : wx + ww - cw2; g.fillRect(side, y, cw2, wh); ge.fillRect(side, y, cw2, wh); }
        }
        // mullion
        g.fillStyle = o.frame || '#000'; g.fillRect(wx + ww / 2 - o.px * 0.25, y, o.px * 0.5, wh);
        ge.fillStyle = '#000'; ge.fillRect(wx + ww / 2 - o.px * 0.25, y, o.px * 0.5, wh);
      }
    }
  }
  if (o.extra) o.extra(g, ge, W, H, r);
  const mat = new THREE.MeshStandardMaterial({ map: tex(c), emissiveMap: tex(e), emissive: new THREE.Color('#ffffff'), emissiveIntensity: o.glow ?? 2, roughness: 0.95, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide });
  // alpha from the silhouette: draw again into alpha
  const a = canvas(W, H), ga = a.getContext('2d');
  ga.drawImage(c, 0, 0);
  const id = ga.getImageData(0, 0, W, H);
  for (let i = 0; i < id.data.length; i += 4) { const al = id.data[i + 3]; id.data[i] = id.data[i + 1] = id.data[i + 2] = al; id.data[i + 3] = 255; }
  ga.putImageData(id, 0, 0);
  mat.alphaMap = tex(a, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mat);
  return m;
}

/** Helsinki Cathedral, as a silhouette path into ctx, centre-bottom at (cx, by), scale s (px per unit) */
export function cathedral(g, cx, by, s) {
  const P = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, cx + x * s, by - y * s)); g.closePath(); g.fill(); };
  // body and portico
  P([[-30, 0], [-30, 22], [30, 22], [30, 0]]);
  P([[-12, 22], [-12, 26], [0, 31], [12, 26], [12, 22]]);
  // drum with columns
  P([[-11, 22], [-11, 38], [11, 38], [11, 22]]);
  // main dome
  g.beginPath(); g.ellipse(cx, by - 38 * s, 12 * s, 13 * s, 0, Math.PI, 0); g.fill();
  P([[-2.2, 50], [-2.2, 56], [2.2, 56], [2.2, 50]]);
  g.beginPath(); g.ellipse(cx, by - 56 * s, 2.6 * s, 2.6 * s, 0, Math.PI, 0); g.fill();
  P([[-0.4, 58], [-0.4, 62], [0.4, 62], [0.4, 58]]);
  // four corner domes
  for (const x of [-24, 24]) {
    P([[x - 4, 22], [x - 4, 29], [x + 4, 29], [x + 4, 22]]);
    g.beginPath(); g.ellipse(cx + x * s, by - 29 * s, 4.2 * s, 5 * s, 0, Math.PI, 0); g.fill();
    P([[x - 0.3, 33], [x - 0.3, 36], [x + 0.3, 36], [x + 0.3, 33]]);
  }
}

/** rain in the air: thin streaks as one instanced mesh */
export function rainStreaks(n, box, { len = 6, w = 0.06, color = '#9fb8d8', opacity = 0.35, seed = 5, slant = 0.12 } = {}) {
  const geo = new THREE.CylinderGeometry(w, w, len, 4, 1);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const im = new THREE.InstancedMesh(geo, mat, n);
  const r = rng(seed), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector3(box[0] + r() * (box[1] - box[0]), box[2] + r() * (box[3] - box[2]), box[4] + r() * (box[5] - box[4]));
    q.setFromEuler(new THREE.Euler(0, 0, slant + (r() - 0.5) * 0.05));
    s.set(1, 0.6 + r() * 0.8, 1);
    m.compose(p, q, s); im.setMatrixAt(i, m);
  }
  im.castShadow = false; im.receiveShadow = false;
  return im;
}

/** a water drop on glass, drawn as the lens it is: inverted sky low, dark rim, one glint */
export function dropMaterial({ sky = '#9fb4dc', dark = '#141a26', glint = '#ffd9a8', lightDir = [0.5, 0.4, 0.75], glintAmt = 5, opacity = 0.9 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uSky: { value: new THREE.Color(sky) }, uDark: { value: new THREE.Color(dark) }, uGlint: { value: new THREE.Color(glint) },
      uL: { value: new THREE.Vector3(...lightDir).normalize() }, uAmt: { value: glintAmt }, uOp: { value: opacity },
    },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vNw;
      void main(){ vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.0); vN = normalize(normalMatrix * mat3(instanceMatrix) * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uSky, uDark, uGlint, uL; uniform float uAmt, uOp; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 n = normalize(vN), v = normalize(vV);
        float facing = abs(dot(n, v));
        float rim = 1.0 - smoothstep(0.15, 0.7, facing);
        float lens = smoothstep(-0.5, 0.7, -n.y);
        vec3 col = mix(uDark, uSky, lens * 0.9) * (1.0 - rim * 0.85);
        vec3 h = normalize(normalize((viewMatrix * vec4(uL, 0.0)).xyz) + v);
        col += uGlint * pow(max(dot(n, h), 0.0), 90.0) * uAmt;
        col += uSky * pow(1.0 - facing, 6.0) * 0.4;
        gl_FragColor = vec4(col, uOp * (0.55 + 0.45 * rim));
      }`,
  });
}
