// One still: a renderer at 1080×1920 × ss, a scene the style builds, the
// camera back from post.js, and the PNG handed to the harness.

import * as THREE from 'three';
import { Post } from './post.js';

export const W = 1080, H = 1920;

export async function boot(build) {
  try {
    const q = new URLSearchParams(location.search);
    const ss = Number(q.get('ss') || 1);
    const w = Math.round(W * ss), h = Math.round(H * ss);
    const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the grade encodes
    renderer.toneMapping = THREE.NoToneMapping;
    document.body.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, w / h, 1, 2000);
    const post = new Post(renderer, w, h);
    const t0 = performance.now();
    const opts = await build({ THREE, scene, camera, renderer, post, ss, q, w, h });
    const t1 = performance.now();
    if (opts.raw) { renderer.setRenderTarget(null); renderer.render(scene, camera); }
    else post.render(scene, camera, opts);
    const gl = renderer.getContext(); gl.finish();
    const t2 = performance.now();
    console.log(`build ${(t1 - t0).toFixed(0)}ms, render ${(t2 - t1).toFixed(0)}ms`);
    window.__png = renderer.domElement.toDataURL('image/png');
    window.__done = true;
  } catch (e) {
    window.__err = (e && e.stack) || String(e);
  }
}
