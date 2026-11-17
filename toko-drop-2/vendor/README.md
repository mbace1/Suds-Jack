# vendor/

Everything the game loads at runtime lives in this repo. Nothing comes from a
CDN.

## three.js r186 (`three@0.186.1`, MIT): `three/`

The WebGPU build, which is the game's one renderer path. `WebGPURenderer`
falls back to WebGL 2 by itself when a device has no WebGPU.

| file | what | upstream sha256 |
| --- | --- | --- |
| `three.webgpu.js` | renderer, node materials, re-exports core | `15cfce5c653541704fd9a3463c39d3e8b854bb6265ccd854d7cfe74090625cc6` (before the patch) |
| `three.core.js` | core classes, imported by the file above | `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6` |
| `three.tsl.js` | the TSL functions, imports `three/webgpu` | `6e6b92d8ce467818944f73815a96abadc6392fb34de577d479a23810b6aeeed0` |
| `LICENSE` | three.js MIT licence | |

r186 ships no minified builds. These are the plain ESM files from
`npm pack three@0.186.1`, copied unchanged except for two patches, both in
`three.webgpu.js`.

**Patch 1, the core import token:** `three.webgpu.js` imports and
re-exports `./three.core.js` on its lines 6 and 7. Both now read
`./three.core.js?v=r186`. Upstream that import has no token, and an
untokened path is the Pages-CDN trap (1.x v118/v119). Both lines must carry
the same URL: two different URLs would load core twice, and nothing would
be `instanceof` anything.

**Patch 2, the identity swizzle:** `GPUTextureViewDescriptor` defaults
`swizzle` to `'rgba'`. In both its constructor and `reset()`, it is now
`undefined`. Three r186 never sets a non-default swizzle anywhere, and
`'rgba'` is the identity, so on a browser that accepts the field this
changes nothing. WebIDL treats `undefined` as the field being absent.

Chrome 141 and 142 had an earlier shape for that field and **reject** the
string. Chrome 143 shipped the 4-character string form. On those two
versions, every `createView()` throws and the WebGPU path dies on its
first frame, with no fall back to WebGL 2, because WebGPU *was* available.
That was found by the smoke gate's first WebGPU boot, on Chromium 141.

Search for `toko-drop patch` to find patch 2. Drop it when three stops
sending the default.

**Tokens:** vendored three uses `?v=r<REVISION>`, not the game's `?v=N`.
These bytes change only when three is upgraded, so a game bump leaves
their URL alone and nobody re-downloads 3.7 MB of three. If a patch ever
changes without an upgrade, move the token to `r186.1`, `r186.2` and so
on. `scripts/check-tokens.mjs` enforces the family.

**The importmap** in `index.html` maps `three` and `three/webgpu` to the
same URL, so there is one three in the page. `three/tsl` maps to
`three.tsl.js`, whose own `import … from 'three/webgpu'` goes back through
that mapping.

**To upgrade:**
1. `npm pack three@<ver>` and copy the three build files and `LICENSE`.
2. Re-apply patch 1 with the new revision. Check whether patch 2 is
   still needed.
3. Change every `?v=r<old>` in the importmap.
4. Update this table.
5. Run `node scripts/check-tokens.mjs` and `scripts/smoke.sh`.
