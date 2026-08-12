# EERI — Art Brief

> **Status: draft v1 — for the owner to mark up.** Everything in here is a
> starting position, not a locked plan. Sections tagged **[ASSUME]** are
> guesses that need the owner's own words before production starts; the
> locked visual plans elsewhere in this repo (gameoflife, the hub) all began
> as briefs like this one and only became rules after a render → LOOK →
> redo pass against real references.

---

## 1. What the game is **[ASSUME]**

**Eeri** — an atmospheric platformer. Working read of the name: *eeri* as in
**eerie**, and as a Finnish given name — the small figure you play is called
Eeri. Both readings should survive in the art: a quiet, unsettling world
seen by someone small enough to be swallowed by it.

- **Genre:** side-view platformer, room-by-room or slow-scroll.
- **Tone:** hushed, wrong-in-the-corner-of-your-eye. Not horror-loud —
  eerie. Dread comes from scale, silence and light, never from gore.
- **Reference space** (to be replaced by the owner's own references —
  per-cover references are the owner's to give, same rule as the arcade):
  *Limbo* / *Inside* (silhouette + fog + one light source), *Little
  Nightmares* (small hero, oversized world), and the house's own
  `flashprince/` (commitment-based movement, hard-cut rooms that you learn
  and remember).

The brief covers **art only**. Mechanics get their own document; the one
mechanical fact art must respect is that a platformer hero's read —
silhouette, contact frames, ledge reach — *is* the game feel.

---

## 2. Why this brief exists: assets are new ground here

Every other project in this repo draws its art **in code** — no image
files, no model files. Eeri is the first project that will ship **real 2D
and 3D asset files**. That is a deliberate departure, and it needs rules
before the first asset lands, because the repo's discipline (no build step,
offline-capable, versioned URLs, one source of truth per look) has to
survive the change:

1. **No build step still holds.** Assets are loaded at runtime — PNG via
   `<img>`/`fetch`, GLB via three.js `GLTFLoader` from a **local
   `vendor/` three.js copy** (same rule as `sudsjack/`, never the CDN).
2. **Every asset file is a versioned URL** from its first release
   (`?v=N` token, same convention as every module here) — the Pages CDN
   caches 404s, and an asset list is a precache list waiting to happen.
3. **One source of truth per look.** The palette lives in
   `eeri/js/palette.js` even though assets exist — textures and sprites are
   *built from* those hex values, and a swatch strip is committed next to
   the sources so a repaint is a diff, not archaeology.
4. **Sources stay out of the shipped tree.** `.blend`, `.aseprite`, `.kra`
   working files live in `eeri/art-src/` (gitignored or LFS — owner's
   call); the game folder ships only the exported, optimised files.

---

## 3. Art direction

### 3.1 The one-line direction

**A 16-bit night seen through a modern lens:** hand-pixelled 2D reads
(sprites, foreground) over low-poly flat-shaded 3D depth (rooms, props,
parallax), unified by a single palette and a single light.

This is the 2.5D split that earns having *both* asset types instead of
picking one:

- **2D owns everything the player reads at speed** — Eeri, creatures,
  pickups, hazards, UI. Pixel art, hard edges, `image-rendering:
  pixelated`. A platformer's read lives in silhouette and animation timing,
  and pixels are the house's native tongue.
- **3D owns everything the player reads as *place*** — room geometry,
  large props, background layers with true parallax, the occasional slow
  rotating set-piece. Low-poly, flat-shaded, unlit or single-light — the
  `paperboy/` / `dropcabal/` register, never PBR.
- The camera is **orthographic or near-ortho**, locked to the side view, so
  the 3D never fights the 2D grid. 3D exists to give the rooms depth and
  cheap re-dressing, not to become a free camera.

### 3.2 Palette

Follow the house pattern that already works in three projects: **a dark,
muted world with one cold luminescent accent for everything that matters,
and warm for everything that hurts.**

| Role | Working value | Rule |
|---|---|---|
| VOID | `#050608` | pure-black-adjacent; the world sits in it |
| WORLD ramp | 4–5 desaturated blue-greys, dark → mid | rooms, props, parallax — nothing in this ramp may glow |
| EERI | pale bone `#d8d4c8` + one dark tone | the hero must never be a black silhouette against a dark scene — light him or rim him (lesson recorded from the cover work) |
| LUX (accent) | violet `#b48ae8` **[ASSUME]** | interactives, save points, eyes in the dark, UI focus — the *only* saturated cold colour on screen |
| EMBER (hazard) | warm `#e86a3a` family | everything that damages is warm and angular; nothing safe is |

- The accent doubles as the game's **hub cabinet accent** (`hub/games.js`)
  — violet is unclaimed on the floor (current cabinets run cyan/green/
  red/orange/gold/pink), so the cabinet will read as its own.
- Contrast is load-bearing, not decorative: hazard vs safe must survive
  greyscale. Check every room mock in greyscale before approving it.
- UI text colours pass **WCAG AA** and controls hit **44 px** — both are
  smoke-gate assertions everywhere else in this repo and will be here too.

### 3.3 Light

One light per room, and the room is *about* it. A doorway, a shaft, a
lantern Eeri carries — the light defines where you look and where you are
allowed to feel safe. Fog/haze cheap-tricked with 2–3 translucent parallax
planes, not volumetrics. Post stack (if three.js is in play): ACES + mild
bloom on LUX/EMBER emissives only — the `hyperdagger/` selective-bloom
trick (HDR colour values > 1.0 trip the threshold; matte stays matte).
No chromatic aberration, no afterimage — this game is still, not fast.

### 3.4 Motion rules

- **Rotoscope timing, not constant-rate loops** — hold the contact pose,
  blur through the pass (the `flashprince/` lesson). A 6-frame walk with
  good holds beats a 12-frame even one.
- Idle is where eerie lives: Eeri breathes, the world *almost* doesn't.
  One thing in each room moves very slowly. Nothing loops in under ~4 s in
  the background or the eye finds the loop.
- `prefers-reduced-motion` gets a still first frame everywhere decorative.

---

## 4. 2D asset specification

| Item | Spec |
|---|---|
| Working grid | **24 px tile**; hero ~2 tiles tall (**[ASSUME]** — lock after first in-engine mock; 16 px reads too crunchy over 3D, 32 px balloons room sizes) |
| Hero sprite | ≤ 32×56 px box; silhouette-first — approve the black-fill version before any interior detail is drawn |
| Formats | PNG, indexed to the palette where the tool allows; sprite **sheets** (one sheet per entity) with a same-name `.json` frame map |
| Scaling | integer scale only, `image-rendering: pixelated` / `NearestFilter`; never non-integer, never `object-fit` (it resamples smoothly regardless — the hub already paid for that lesson) |
| Animation set (hero, minimum) | idle · walk · run · jump-rise · jump-fall · land (hard + soft) · ledge-grab · climb · push · startle · death |
| Animation set (per creature) | idle · move · notice/telegraph · attack/act · death — **the telegraph is mandatory**; every hazard is readable before it is lethal (house rule from hyperdagger's telegraphed spawns and flashprince's duel clock) |
| Tiles | 24 px tileset per biome: solids, one-way platforms, ladders/vines, spikes/hazard, décor overhangs; autotile edges optional, hand-placed acceptable at this scope |
| UI | drawn to the same grid; UI accent = LUX; numerals and glyphs before words (trilingual fi/en/ja is the house norm — text that is art must be locale-free) |
| File naming | `eeri/assets/2d/<entity>_<action>_<w>x<h>.png` + `.json`; lower-kebab; no spaces ever |

**Sheet hygiene:** frames on a fixed cell grid, origin/pivot recorded in
the JSON (feet-centre for characters), no per-frame trimming — trimmed
frames make hit-boxes lie.

---

## 5. 3D asset specification

| Item | Spec |
|---|---|
| Format | **GLB** (single-file glTF 2.0), loaded with the vendored three.js `GLTFLoader` |
| Scale | 1 unit = 1 m; hero height ≈ 1.1 u — export with real-world scale applied, no node scaling |
| Poly budget | props ≤ 500 tris · room shells ≤ 2 000 · set-pieces ≤ 4 000 · **whole visible scene ≤ 25 k** — budgets exist to keep the flat-shaded read, not just perf |
| Shading | flat/faceted normals; `MeshBasicMaterial`-equivalent (unlit) or one hemisphere+directional pair per room — decide once in the first room mock and lock it |
| Textures | preferably **none** — vertex colours or a single shared 64×64 palette-strip texture (one UV point per colour cell). No baked lighting, no normal maps, no PBR channels |
| Pivots | floor-contact origin, +Y up, −Z forward (three.js convention); door/lever pivots at the hinge |
| Naming | `eeri/assets/3d/<biome>_<thing>_v<N>.glb`; meshes inside named, not `Cube.004` |
| Animation | none in GLB for v1 — 3D things that move, move in code (rotation, slides); skinned/keyframed GLTF animation is a later decision, not a default |
| Compression | keep GLBs < 500 KB each; Draco only if a file forces the question (it adds a decoder dependency — against the grain here) |

**Export checklist (every GLB):** scale applied · transforms zeroed ·
normals flat · unused materials/UV sets stripped · file opens in the
three.js editor with no console warnings · total tri count written into the
commit message.

---

## 6. Where 2D ends and 3D begins (the boundary, stated once)

| Layer | Medium | Why |
|---|---|---|
| Sky / far fog | 2D gradient or shader plane | cheapest, never inspected |
| Far + mid parallax | **3D**, flat-shaded | true parallax for free from the camera |
| Playfield geometry | **3D** shell, collision from level data (not from the mesh) | rooms re-dress cheaply; collision stays honest and hand-authored |
| Platforms, hazards, interactives | **2D** sprites (or sprite-mapped quads in the 3D scene) | the player reads these at speed; pixel edges + telegraphs live here |
| Eeri + creatures | **2D** sprites on billboards/quads | silhouette and timing are the game |
| Foreground occluders | 2D, semi-transparent | frames the shot; the "cropped foreground = depth" cover lesson |
| UI / HUD | 2D DOM or canvas | AA contrast + 44 px targets are testable there |

Anything not listed defaults to 2D. Moving something across this boundary
is an owner decision, recorded by editing this table.

---

## 7. House obligations (non-negotiable, inherited)

- **Hub cabinet:** a 128×72 marquee **cover, not an icon** — drawn in code
  in `hub/art.js` like every other cabinet (the marquee stays code even
  though the game ships assets). Composition rules already learned: a
  framing device lighter than the sky behind it; the hero lit or
  two-colour-rimmed, never black-on-dark; crop a foreground element at the
  frame to create depth. Register: Master System — flat fills inside a hard
  black line, shape lives in the silhouette. Plus a `hub/games.js` entry
  (title, tagline, lineage, tags, controls, `path`, `accent: '#b48ae8'`,
  `art`, `inRepo`, `status`, `pad`).
- **Toko Midori signature:** `sign()` badge with `counter: true`, corner
  chosen to clear the game's own controls; magenta unless the palette
  fights it (paperboy went black-on-white for exactly that reason —
  decide against the real palette, in-engine).
- **`eeri/VERSIONS.md`** from the first shipped change; `?v=N` tokens move
  with it; `scripts/versions.mjs` picks it up automatically.
- **Smoke gate** (`eeri/test/smoke.cjs`) grows an art section: every asset
  URL in the manifest resolves 200; sprites decode; GLBs parse; palette
  values on screen match `palette.js`; AA + 44 px on UI.
- **Deploys** ride the existing discipline: `gh-pages` is the live site,
  `scripts/deploy-hub.mjs`, never a hand-copy.

---

## 8. Production method

The method is the one the owner already named for toko-drop, applied from
asset one: **reference from the owner → render → LOOK → name what is wrong
→ redo**, judged against **captured motion, not stills** — a
`scripts/enemy-loop.mjs`-style GIF-loop capture gets set up for Eeri before
the hero animation set is approved, because prototype-feel lives entirely
in the part a state assertion cannot see.

**Order of work** (each gate is a LOOK pass, drafts discarded freely):

1. **Palette strip + three room mocks** (flat images, no engine) — lock
   palette and the 2D/3D boundary against pictures, not prose.
2. **Hero silhouette sheet** — black-fill only, all key poses. Lock the
   read before a single interior pixel.
3. **Hero animation set** as GIF loops on a plain ramp — lock timing.
4. **One room, in engine** — one GLB shell + tileset + hero. This is the
   *vertical slice of the look*; every later asset is judged against it.
5. **Creature one** (idle → telegraph → act) — locks the hazard language.
6. Everything else, against the slice.

**Definition of done, per asset:** named per convention · versioned URL ·
in the manifest the smoke gate reads · seen moving in-engine · one line in
`VERSIONS.md`.

---

## 9. Open questions for the owner

1. **The name.** Is Eeri the character, the place, or just the mood?
   (Everything in §1 bends to this answer.)
2. **References.** Which pictures is this actually built to? Per-cover
   references have always been yours to give — same here, for the whole
   game. Two or three images beat any paragraph in this brief.
3. **Accent.** Violet `#b48ae8` is proposed because the floor doesn't have
   one — veto freely.
4. **2.5D split** (§3.1) vs pure-2D with faked parallax vs pure-3D
   flat-shaded: the split is the recommendation because it's the only
   option that *needs* both asset types you asked for — but say the word
   and §4–§6 get rewritten.
5. **Sources.** Gitignore the `.blend`/`.aseprite` working files, or track
   them (LFS)? Repo has no precedent to lean on.
6. **Scope of the animation set** — the §4 list is the honest minimum for
   the genre; cutting ledge-grab/climb changes level design, so it's a
   design decision wearing an art hat.
