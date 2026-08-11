import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── The orc ───────────────────────────────────────────────────────────────────
// The one asset-built fighter on the floor (owner's call, 2026-08-11): a
// concept-art orc run through an image-to-3D pipeline, remeshed to ~8k tris
// and 1024px webp textures (assets/orc.glb, ~0.9 MB). Everything else in the
// game is primitives built in robots.js — this file is the adapter that makes
// a static textured mesh speak the same rig language: per-instance materials
// for hit-flash / telegraph glow, and whole-body pose functions (the GLB has
// no joints, so the acting is all lean, squash and bounce on a pivot group).
//
// The model loads once, lazily; rollSpawns gates on orcReady(), so on a slow
// connection the room simply rolls brutes instead — a missing nicety, never
// a broken room.

export const ORC_ACCENT = 0x53ff6e;   // toxic green — his telegraphs, shards, beam
const HEIGHT = 2.55;                  // world height; brute territory, reads "heavy"

let _tpl = null;      // prepared template scene, cloned per spawn

const _loader = new GLTFLoader();
_loader.load('assets/orc.glb?v=1', (gltf) => {
  const model = gltf.scene;
  // normalise: scale to HEIGHT, feet on y=0, centred on x/z. The Meshy export
  // is ~1.9u tall with its origin at the middle of the body, front toward +z
  // (same convention the samurai rigs are built to).
  const bb = new THREE.Box3().setFromObject(model);
  const size = bb.getSize(new THREE.Vector3());
  const s = HEIGHT / size.y;
  model.scale.setScalar(s);
  model.position.set(
    -(bb.min.x + size.x / 2) * s,
    -bb.min.y * s,
    -(bb.min.z + size.z / 2) * s,
  );
  _tpl = model;
}, undefined, (err) => console.warn('orc.glb failed to load — orcs stay benched', err));

export function orcReady() { return !!_tpl; }

export function buildOrc() {
  // geometry is shared with the template; materials are cloned per orc so one
  // orc's hit-flash never lights up another (same rule robots.js follows)
  const model = _tpl.clone();
  const mats = [];
  model.traverse((o) => {
    if (o.isMesh) {
      const m = o.material = o.material.clone();
      // the arena is nearly unlit and the robots carry their own neon — raw
      // albedo here reads as a black silhouette (the cover lesson: light it).
      // So the basecolor doubles as a low emissive map: he glows himself
      // readable, below the bloom threshold, and flash/glow ride the same
      // channel on top (resolved in _apply).
      m.emissiveMap = m.map;
      m.metalness = 0;
      m.roughness = 0.85;
      mats.push(m);
    }
  });
  const pivot = new THREE.Group();   // all acting happens here; Enemy owns group
  pivot.add(model);
  const group = new THREE.Group();
  group.add(pivot);
  const rig = { group, pivot, mats, orc: true, glow: 1, flash: false };
  _apply(rig);                                        // start in the resting self-lit state
  return rig;
}

// flash (hit) and glow (telegraph) share the one material's emissive channel,
// so they are tracked on the rig and resolved in one place — flash wins
function _apply(rig) {
  for (const m of rig.mats) {
    if (rig.flash) {
      m.emissive.setHex(0xffffff);
      m.emissiveIntensity = 1.6;                      // white pop through the emissiveMap
    } else if (rig.glow > 1) {
      m.emissive.setHex(ORC_ACCENT);                  // telegraph: green heat rising
      m.emissiveIntensity = 0.4 + (rig.glow - 1) * 0.35;
    } else {
      m.emissive.setHex(0xffffff);                    // resting: self-lit, under the bloom
      m.emissiveIntensity = 0.4;
    }
  }
}
export function setOrcFlash(rig, on) { rig.flash = on; _apply(rig); }
export function setOrcGlow(rig, boost) { rig.glow = boost; _apply(rig); }

// ── Poses — whole-body acting on the pivot ────────────────────────────────────
export function orcWalk(rig, phase) {
  const p = rig.pivot;
  p.position.y = Math.abs(Math.sin(phase)) * 0.09;         // heavy two-beat bounce
  p.rotation.z = Math.sin(phase) * 0.055;                   // side-to-side waddle
  p.rotation.x = 0.07;                                      // leaning into the walk
  p.scale.set(1, 1, 1);
}
export function orcIdle(rig, t) {
  const p = rig.pivot;
  p.position.y = 0;
  p.rotation.z = 0;
  p.rotation.x = Math.sin(t * 1.8) * 0.02;                  // breathing
  p.scale.set(1, 1, 1);
}
export function orcCrouch(rig, k) {                          // charge windup: coil down
  const p = rig.pivot;
  p.position.y = 0;
  p.rotation.z = Math.sin(k * 40) * 0.03 * k;               // pawing the ground
  p.rotation.x = 0.3 * k;
  p.scale.set(1 + 0.1 * k, 1 - 0.16 * k, 1 + 0.1 * k);
}
export function orcLunge(rig, k) {                           // mid-charge: stretched flat out
  const p = rig.pivot;
  p.position.y = 0.12;
  p.rotation.z = 0;
  p.rotation.x = 0.42;
  p.scale.set(1 - 0.06 * k, 1 + 0.04 * k, 1 + 0.12 * k);
}
export function orcStagger(rig, k) {                         // post-charge daze: reeling back
  const p = rig.pivot;
  p.position.y = 0;
  p.rotation.x = -0.18 * (1 - k);
  p.rotation.z = Math.sin(k * 14) * 0.06 * (1 - k);
  p.scale.set(1, 1, 1);
}
