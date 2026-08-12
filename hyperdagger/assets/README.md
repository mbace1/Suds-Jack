# Mesh assets — Meshy exports land here

Drop a GLB in this folder, then register it in `MESH_ASSETS` in
`js/meshassets.js` — the key is the `MODELS` slot it replaces
(`skull`, `watcher`, `skullDread`, `leviathan`, …):

```js
skull: { url: 'assets/skull.glb?v=1', height: 1.40, voxelSize: 0.14, yaw: 0 },
```

- `height` — world height in units. Hitboxes are locked per enemy class, so
  match the slot's current model (skull 1.40, watcher 0.76, dread 2.50 tall
  ×10 layers ×0.25, leviathan ~6.3). Getting this wrong changes how the
  enemy LOOKS vs how it HITS.
- `voxelSize` — lattice pitch for the damage voxels; use the slot's current
  pitch. The voxelizer caps the lattice at ~64³ and coarsens automatically.
- `yaw` — radians, if the export doesn't face +z (the game `lookAt`s the
  player along +z).
- `?v=1` on the url from day one — the Pages CDN caches 404s (~10 min), so
  an untokened brand-new path can serve a black screen right after deploy.
  Bump the token when the file changes.

Everything is fail-soft: a missing or broken GLB logs one console warning
and the slot keeps its built-in string-art model. Budgets and prompt
guidance: `../ART_PIPELINE.md`.
