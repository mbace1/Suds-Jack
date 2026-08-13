// EERI — the asset seam (ART_BRIEF §2). The game never asks "file or
// placeholder?" — it asks this module for a model or a layer texture and
// gets the same shape either way:
//
//   model  → { root: Object3D, nodes: { name: Object3D, … } }
//   layer  → THREE.Texture or null (null = paint the built-in placeholder)
//
// assets/manifest.json decides which side of the seam each entry is on.
// A model that arrives without its contracted nodes is refused loudly and
// the placeholder ships instead — a silent half-rig is worse than a grey box.

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js?v=1';

const BASE = new URL('../assets/', import.meta.url);

let manifest = null;

export async function loadManifest() {
  const res = await fetch(new URL('manifest.json?v=1', BASE));
  manifest = await res.json();
  return manifest;
}

// ---- 3D: models against a rig contract -----------------------------------

export async function getModel(name, buildPlaceholder, kind = 'models') {
  const entry = manifest?.[kind]?.[name];
  if (!entry || entry.status !== 'live') return buildPlaceholder();
  try {
    const gltf = await new GLTFLoader().loadAsync(new URL(entry.file + '?v=' + manifest.v, BASE).href);
    const root = gltf.scene;
    const nodes = {};
    const missing = [];
    for (const n of entry.nodes) {
      const obj = root.getObjectByName(n);
      if (obj) nodes[n] = obj; else missing.push(n);
    }
    if (missing.length) {
      console.warn(`[eeri] model "${name}" is missing contracted nodes: ${missing.join(', ')} — using placeholder`);
      return buildPlaceholder();
    }
    return { root, nodes, live: true };
  } catch (e) {
    console.warn(`[eeri] model "${name}" failed to load (${e.message}) — using placeholder`);
    return buildPlaceholder();
  }
}

// manipulable world pieces are the same contract in a different block
export function getPiece(name, buildPlaceholder) {
  return getModel(name, buildPlaceholder, 'pieces');
}

// ---- 2D: layer paintings --------------------------------------------------

export async function getLayerTexture(world, layer) {
  const entry = manifest?.layers?.[world]?.[layer];
  if (!entry || entry.status !== 'live') return null;
  try {
    const tex = await new THREE.TextureLoader().loadAsync(new URL(entry.file + '?v=' + manifest.v, BASE).href);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  } catch (e) {
    console.warn(`[eeri] layer "${world}/${layer}" failed to load (${e.message}) — painting placeholder`);
    return null;
  }
}

export function manifestData() { return manifest; }
