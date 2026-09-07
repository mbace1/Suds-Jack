# WebGPU / TSL Migration Notes

*Written retrospectively from the v191–v195 migration of the main game, plus
the v216 enemy-lab rebuild. This is the brief the roadmap asked for — what we
learned moving a shipped three.js WebGL game onto WebGPURenderer/TSL, kept as
the reference for every future node-material port (Phase 3's goo passes read
this first).*

---

## 1. Version strategy: two vendored builds, one flag

- **r167's WGSL codegen is unusable for real WebGPU** — it emits a
  runtime-sized uniform array that today's strict WGSL validation rejects
  (v191 shipped whiteout until we pinned `forceWebGL`). The true backend
  needed **r180** (v192).
- We did **not** upgrade the classic path. `three.module.min.js` stays r167;
  the flag build is a separate vendored `three.webgpu.min.js` (r180), which
  pulls `three.core.min.js` — that internal import carries a patched-in `?v=`
  token that `bump-version.sh` rotates with the rest of the graph.
- **Importmaps are immutable per page.** The build choice happens in a
  classic `<script>` that `document.write`s the importmap from
  `localStorage.tokoDropGpu` *before any module resolves*. Flipping the flag
  therefore requires a reload — the toggle does it immediately so the UI can
  never show a state the page isn't in (`main.js` `setGpu`).
- **WebGPURenderer is adaptive**: where the browser doesn't grant WebGPU it
  runs its WebGL2 backend. Ship one code path and surface which backend won
  (the HUD tag). Don't write "if WebGPU else WebGL" game code.

## 2. Detecting which build you're in

- Under the flag build there is **no `THREE.WebGLRenderer` export**. The
  feature-detect used everywhere:
  `const IS_GPU = typeof THREE.WebGPURenderer === 'function';`
- Secondary views (pause-menu tester, `specimen.js`, the lab) must **follow
  the main renderer's kind** with the same detect — a WebGL view inside a
  WebGPU page throws.
- `WebGPURenderer` needs `await renderer.init()` before first render. Any
  rAF loop must hold rendering until a `ready` flip (see `specimen.js`).
- TSL namespace shim: `const TSL = IS_GPU ? (THREE.TSL ?? THREE) : null;` —
  the exports moved between r-versions.

## 3. Porting `onBeforeCompile` GLSL to TSL nodes

- `onBeforeCompile` **does not exist** on node materials. Every GLSL
  injection has to be rebuilt as a node graph: vertex displacement →
  `positionNode`, emissive tricks → `emissiveNode`
  (`materialEmissive.add(...)` keeps the material's own emissive).
- **Uniform bridge**: `const U = v => IS_GPU ? TSL.uniform(v) : { value: v };`
  TSL's `uniform()` exposes the same `.value` interface as a GLSL uniform
  object, so ALL existing game code that pokes `u.uWobble.value` keeps
  working on both paths untouched. This one helper is why the port didn't
  fork the gameplay code.
- Renames bite: `normalView ?? transformedNormalView` (moved across
  r-versions). Shim, don't assume.
- Per-instance data: GLSL `ShaderMaterial` doesn't exist in the node
  pipeline. `InstancedBufferAttribute`s feed node materials via
  `TSL.attribute('aColor', 'vec3')` etc. — same attributes, new plumbing
  (see `SplatPool`).

## 4. The two bugs that cost real time — memorise these

1. **Node graphs evaluate EVERY branch.** GLSL's `if` hides a `÷0`; a node
   graph computes it anyway and the NaN poisons the whole image (v195's black
   retro pass). Guard denominators at the source:
   `const safeP = max(uPosterize, 1.0)`. If a value can be zero, clamp it
   *before* it divides anything.
2. **TSL `select` / `ConditionalNode` black-screened AND device-lost the
   WebGL2 backend** (r180). Write **zero-conditional graphs**: `step()` masks
   + `mix()` instead of branches. The NES-palette quantiser is 16 unrolled JS
   constants folded with `mix(step(...))` — ugly, correct, fast.

   Debug method that found both: **staged bisect** — rebuild the node graph
   piece by piece against a known-good constant output until the screen dies.

## 5. Output-encoding parity

Raw values that looked right in GLSL render washed-out under the node
pipeline's output encoding. Pre-encode with **`.pow(2.2)`** on colour inputs
(floor texture, splat `aColor`) to match the WebGL look byte-for-byte. Check
parity by screenshot diff, not by eye.

## 6. Process rules that held up

- **One system per release**, each behind the flag, each verified headless
  before the next (bullets → splats → renderer → gel → retro pass). A big-bang
  port would have made the v195 bisect impossible.
- **The flag is a real fork in `index.html` only.** Everything else is one
  codebase consulting `IS_GPU`/`TSL` at module scope.
- Headless verification runs fine under swiftshader — the WebGPU build's
  WebGL2 fallback exercises the whole node pipeline without WebGPU hardware.
  What it does NOT exercise is real WGSL compilation on a real adapter; field
  test that (the v192 whiteout was invisible headless).
- **Secondary views import the game's material, never copy it** (v216: the
  enemy lab had drifted into a fork with its own shader on CDN three —
  rebuilt on `specimen.js`). If a page needs the look, it imports the module.

## 7. Current state (v216)

| Piece | Status |
|---|---|
| Renderer, floor, bullets, splats | TSL under the flag (v189–v192) |
| Goo wobble + SSS | TSL under the flag (v194) |
| RetroPass (cabinets) | TSL under the flag (v195) |
| Enemy lab | Same materials, both builds, one tap apart (v216) |
| Promotion to default | **Held** — criterion: the flag path must really push the gelation look (field feedback, 2026-07-22) |
