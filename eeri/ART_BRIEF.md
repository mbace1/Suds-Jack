# EERI — Art Brief

> **Status: draft v2 — for the owner to mark up.** Owner-given direction
> (2026-08-12): **references are Super Mario Bros. 3 and Mario 4 (Super
> Mario World), plus construction machines; environments are 2D, characters
> are 3D.** Everything else in here is a starting position built around
> those three facts. Sections tagged **[ASSUME]** still need the owner's
> own words. Locked visual plans elsewhere in this repo (gameoflife, the
> hub) all began as briefs like this and only became rules after a
> render → LOOK → redo pass against real references.

---

## 1. What the game is

**Eeri** — a bright, side-view platformer in the **Mario 3 / Mario World
register**, whose cast is **construction machines**: excavators, cranes,
dump trucks, mixers, rollers, a wrecking ball. Tile-built 2D worlds; chunky
articulated 3D characters living in them.

**Owner-given (locked until the owner says otherwise):**
- Reference games: *Super Mario Bros. 3* and *Super Mario World* ("Mario 4").
- Theme ingredient: construction machines.
- Asset split: **2D environments, 3D characters.**

**Working assumptions [ASSUME]:**
- *Eeri* is the hero's name (a Finnish given name) — a small figure on a
  big worksite, or possibly a small machine among big ones. Which one
  changes the hero sheet and nothing else in this brief.
- Tone: toy-box, sunny, mischievous — construction as a playground, the
  Bob-the-Builder end of the theme, not industrial grime. Hazards are
  cartoon hazards (swinging balls, tipping loads, wet cement), never gore.
- This is an **homage in register**, same as everything in this repo
  (Paperboy, Cabal, Devil Daggers, Another World): we take the *grammar*
  of Mario 3/World — the constraints and composition rules — and none of
  its actual characters, sprites or logos.

### What "Mario 3 + Mario World" means as instructions, not nostalgia

The house rule for references is that they are technical instructions.
Read this way:

- **The level is a built stage.** SMB3 opens on a curtain and its worlds
  are sets — platforms bolted to the sky, shadows painted on. That conceit
  is a *gift* to a construction game: the stage visibly IS under
  construction. Scaffolds, girders and unfinished edges are the framing
  device, and the "set" reading excuses every floating platform.
- **Flat colour, hard black-line accents, blue sky.** NES/SNES palettes:
  large flat fills, 3–4 tones per material, outlines only where a shape
  must pop from the sky. No gradients wider than a 2–3 band ramp.
- **The tile grid is visible and honest.** Mario levels are readable as
  tiles and proud of it — repetition is rhythm, not a defect. Level art is
  a tileset used well, not a painting.
- **Silhouette-first characters with one exaggerated feature** (Mario's
  cap/moustache → an excavator's arm, a crane's hook). Every character
  reads at 32 px against the sky.
- **Themed worlds re-skin one grammar** (grass/desert/water/giant/sky →
  e.g. groundworks / scaffold heights / demolition / night-shift / the
  crane top). Same tiles-and-machines grammar, re-dressed per world.
- **Secrets look like the wall** — a suspiciously regular patch of tiles
  is the SMB3 invitation to hit it. Art must support "this tile is 2%
  different on purpose."

---

## 2. Why this brief exists: assets are new ground here

Every other project in this repo draws its art **in code** — no image
files, no model files. Eeri is the first project that will ship **real 2D
and 3D asset files**. That is a deliberate departure, and it needs rules
before the first asset lands, because the repo's discipline (no build
step, offline-capable, versioned URLs, one source of truth per look) has
to survive the change:

1. **No build step still holds.** Assets load at runtime — PNG via
   `<img>`/`fetch`, GLB via three.js `GLTFLoader` from a **local
   `vendor/` three.js copy** (same rule as `sudsjack/`, never the CDN).
2. **Every asset file is a versioned URL** from its first release
   (`?v=N`, same convention as every module here) — the Pages CDN caches
   404s, and an asset list is a precache list waiting to happen.
3. **One source of truth per look.** The palette lives in
   `eeri/js/palette.js` even though assets exist — tilesets and model
   colours are *built from* those hex values, and a committed swatch strip
   sits next to the sources so a repaint is a diff, not archaeology.
4. **Sources stay out of the shipped tree.** `.blend`, `.aseprite`, `.kra`
   working files live in `eeri/art-src/` (gitignored or LFS — owner's
   call); the game folder ships only exported, optimised files.

---

## 3. Art direction

### 3.1 The one-line direction

**A Mario-grammar stage set, visibly under construction, with chunky
articulated 3D machines as the cast — everything unified by one low
internal resolution.**

The split the owner asked for, and why it pays:

- **2D owns the world** — tilesets, parallax skies, scaffolding frames,
  UI. Mario levels *are* tiles; pixel art is the medium the reference
  demands and the house's native tongue.
- **3D owns the cast** — hero and machines. This is where 3D earns its
  place: a machine is a hierarchy of rigid parts (cab, boom, stick,
  bucket, wheels), and one GLB with named nodes gives every pose and
  every facing **by rotating joints in code** — no sprite sheet explosion
  per angle, and mechanical motion (a boom easing to a stop, wheels that
  actually roll) comes free and reads as *machine* in a way redrawn
  frames never quite do.

### 3.2 The unifier: one internal resolution (the make-or-break rule)

Smooth antialiased 3D floating over crisp pixel tiles is the failure mode
of this whole direction — two arts sharing a screen instead of one game.
The fix is already proven in this repo: **`dropcabal/` renders three.js at
a 220 px internal height and upscales with `image-rendering: pixelated`.**
Eeri does the same — the 3D characters render into the *same low-res
buffer* the tiles occupy (**internal height ~240 px [ASSUME]** — lock in
gate 1), with `NearestFilter` on everything, no antialiasing, flat unlit
materials and `NoToneMapping`. At that point a 3D machine *becomes* pixel
art in motion, and the seam disappears. A CSS scanline overlay stays
optional and off by default.

**Gate 1 of production (§8) exists to prove this shot before anything
else is made.**

### 3.3 Palette

Mario register + worksite: **saturated flats against a blue sky, with
safety yellow-orange as the cast's family colour and hazard stripes as
the danger language.**

| Role | Working value | Rule |
|---|---|---|
| SKY | `#4aa8e8` → pale horizon band | large, flat, cheerful; clouds are 2–3 flat shapes |
| EARTH ramp | warm browns/tans, 3 tones | dug ground, dirt piles, brick |
| STEEL ramp | cool blue-greys, 3 tones | girders, scaffolds, plates |
| ACCENT GREEN | `#3cc85a` family | the "grass lip" role — safe standable edges |
| MACHINE | **safety yellow-orange `#ffb01f` [ASSUME]** + near-black | the cast's uniform; every friendly machine carries it |
| HAZARD | `#e8402a` red + **black/yellow chevron stripes** | the one language for "this hurts": wet cement, swing zones, live edges — stripes make danger readable in greyscale |
| INK | `#1a1410` | outlines, only where a shape must pop from sky |

- The machine yellow doubles as the **hub cabinet accent**
  (`hub/games.js`) — the floor's existing accents (cyan/green/red/orange/
  gold/pink) leave a true safety-yellow unclaimed. Veto freely.
- Ramps are 3 tones per material, hard steps, no smooth gradients — the
  SNES read.
- Hazard-vs-safe must survive greyscale (the chevron carries it). Check
  every room mock in greyscale before approving.
- UI text passes **WCAG AA**, controls hit **44 px** — smoke-gate
  assertions here like everywhere else in the repo.

### 3.4 Light

None, effectively: **everything unlit** (`MeshBasicMaterial` on the 3D,
flat fills on the 2D) for the poster read — the `paperboy/` rule. Depth
cues are painted: a darker tone on a machine's side faces baked into
vertex colours, painted drop-shadow blobs under characters (Mario's
ellipse shadow), painted shadows in the tiles. No dynamic lights, no
shadow maps, no bloom, no post stack. If night-shift worlds happen, night
is a palette swap, not a lighting rig.

### 3.5 Motion rules

- **Machines move like machines:** ease-in/ease-out on every joint,
  overshoot-and-settle on stops, slow booms + fast buckets. Weight is the
  whole act.
- **Squash-and-stretch goes on the suspension, not the metal** — a truck
  landing compresses on its wheels/tyres (scale the wheel nodes), the body
  stays rigid. That one rule keeps "cartoon" from becoming "rubber."
- **Every hazard telegraphs** before it is lethal (house rule from
  hyperdagger's telegraphed spawns and flashprince's duel clock): the
  wrecking ball winds back, the load tips before it spills, hazard
  stripes flash. Readable first, dangerous second.
- Idle is mandatory per character: engines tick over — a 1–2 px chassis
  vibration, exhaust puffs, a bucket that settles. Machines never freeze.
- `prefers-reduced-motion` stills everything decorative to one frame.

---

## 4. 2D environment specification

| Item | Spec |
|---|---|
| Working grid | **16 px tile** at the internal resolution (the Mario 3/World grid — **[ASSUME]**, lock in gate 1; internal height ~240 px ≈ 15 tiles of visible ground-to-sky, close to SMB3's screen) |
| Formats | PNG tilesets, indexed to the palette; one sheet per world theme + one shared "grammar" sheet (girders, scaffolds, hazard stripes, pipes/ducts) used by every world |
| Scaling | integer scale only, `image-rendering: pixelated` / `NearestFilter`; never non-integer, never `object-fit` (resamples smoothly regardless — the hub already paid for that lesson) |
| Tile inventory (grammar sheet) | solids (dirt / brick / steel plate) · one-way scaffold planks · ladders · girder beams (ends + repeats) · hazard-stripe edging · ? -style hit-tiles (crates?) · pipes/ducts · décor bolts, signage, cones |
| Per-world sheets | groundworks · scaffold heights · demolition · night-shift **[ASSUME — world list is design's call]**; each re-dresses the same grammar, SMB3-style |
| Parallax | 2–3 layers: sky + clouds (slow), skyline/cranes silhouette (mid), playfield; all pixel-art PNGs at the internal resolution, moved in whole pixels |
| The stage conceit | visible set-dressing: platform edges show bolts/brackets, some ledges end in unfinished rebar, backdrop seams are allowed to show like SMB3's painted flats |
| Secrets | each tileset includes deliberate near-duplicate tiles (2% off) for hittable/hidden blocks — the "suspicious tile" language needs art support from day one |
| UI / HUD | pixel UI on the same grid; numerals and glyphs before words (trilingual fi/en/ja is the house norm — art-text must be locale-free); UI accent = machine yellow |
| File naming | `eeri/assets/2d/<sheet>_<theme>.png` + same-name `.json` (tile ids, one-way flags, hazard flags); lower-kebab, no spaces |

**Sheet hygiene:** fixed cell grid, no per-tile trimming; collision comes
from the level data reading tile ids, never from image inspection.

---

## 5. 3D character specification

| Item | Spec |
|---|---|
| Format | **GLB** (single-file glTF 2.0), vendored three.js `GLTFLoader` |
| Scale | 1 unit = 1 tile (16 internal px); hero ≈ 1×1.5 tiles; machines 2–6 tiles — Mario-World "giant world" reads come free from big models |
| Rig style | **rigid node hierarchies, no skinning**: cab → boom → stick → bucket, body → wheels; every articulated part its own named node (`boom`, `bucket`, `wheel_fl`…). Animation = code rotating/scaling named nodes (or simple GLTF clips per action — decide in gate 2 and lock; code-driven is the recommendation, it composes with physics and needs no mixer) |
| Poly budget | hero ≤ 800 tris · small machine ≤ 1 200 · big set-piece machine ≤ 3 000 · whole cast on screen ≤ 15 k |
| Shading | flat/faceted normals, **unlit `MeshBasicMaterial`**, colours as **vertex colours or one shared 64×64 palette-strip texture** (one UV point per cell, `NearestFilter`); side faces one ramp-step darker, baked, for the painted-depth read. No PBR channels, no normal maps, ever |
| Silhouette rule | every character approved as a black-fill render at 32 px first — one exaggerated feature each (the Mario-cap rule): the excavator is *arm*, the crane is *hook and height*, the mixer is *drum* |
| Facing | side-view game: characters face ±x; turning is a quick y-rotation flip (a 3D cast's free win — the turn can be animated, not mirrored) |
| Pivots | floor-contact origin, +Y up, −Z forward (three.js convention); articulation pivots at the physical hinge |
| Naming | `eeri/assets/3d/<character>_v<N>.glb`; meshes and nodes named, never `Cube.004` |
| Compression | GLBs < 300 KB each; no Draco (adds a decoder dependency — against the grain here) |

**Export checklist (every GLB):** scale applied · transforms zeroed ·
normals flat · node names verified against the rig contract in the
character's spec · unused materials/UVs stripped · opens in the three.js
editor with no console warnings · tri count in the commit message.

**Cast list v1 [ASSUME — design's call, art plans for]:** Eeri (hero) ·
excavator · dump truck · cement mixer · roller · tower crane (set-piece) ·
wrecking-ball crane (hazard boss).

---

## 6. Where 2D ends and 3D begins (the boundary, stated once)

| Layer | Medium | Why |
|---|---|---|
| Sky, clouds, skyline parallax | **2D** PNG layers | flat, cheap, the Mario read |
| Playfield tiles + collision | **2D** tileset; collision from tile ids | the grid is the game |
| Scaffold/girder framing, décor | **2D** tiles on the grammar sheet | part of the stage set |
| Eeri + all machines | **3D** GLB, node-animated, rendered into the low-res buffer | articulation for free, no per-angle sprite sheets |
| Pickups / small collectables | **3D** simple spinners (nut, bolt, gem) **[ASSUME]** — a slow y-spin is the genre's collectable language and is free in 3D | |
| Particles (dust, cement splash, sparks) | **2D** pixel sprites | reads crisper at low res than 3D confetti |
| Drop shadows | **2D** painted ellipse under each character | Mario's shadow; also the player's landing aid |
| UI / HUD | 2D DOM or canvas | AA contrast + 44 px are testable there |

Anything not listed defaults to 2D. Moving something across this boundary
is an owner decision, recorded by editing this table.

---

## 7. House obligations (non-negotiable, inherited)

- **Hub cabinet:** a 128×72 marquee **cover, not an icon** — drawn in code
  in `hub/art.js` like every other cabinet (the marquee stays code even
  though the game ships assets). Composition rules already learned apply:
  a framing device lighter than the sky behind it (a scaffold frame over
  that blue sky qualifies); the hero lit or two-colour-rimmed, never
  black-on-dark; crop a foreground element (a bucket, a hook) at the frame
  for depth. Register: Master System — flat fills inside a hard black
  line. Plus a `hub/games.js` entry (title, tagline, lineage, tags,
  controls, `path`, `accent: '#ffb01f'`, `art`, `inRepo`, `status`,
  `pad`).
- **Toko Midori signature:** `sign()` badge with `counter: true`; magenta
  unless the palette fights it — against safety yellow it likely holds,
  but decide in-engine, the paperboy way.
- **`eeri/VERSIONS.md`** from the first shipped change; `?v=N` tokens move
  with it; `scripts/versions.mjs` picks it up automatically.
- **Smoke gate** (`eeri/test/smoke.cjs`) grows an art section: every asset
  URL in the manifest resolves 200; sheets decode; GLBs parse and expose
  their contracted node names; on-screen palette matches `palette.js`;
  AA + 44 px on UI.
- **Deploys** ride the existing discipline: `gh-pages` is the live site,
  `scripts/deploy-hub.mjs`, never a hand-copy.

---

## 8. Production method

The method is the one the owner already named for toko-drop, applied from
asset one: **reference from the owner → render → LOOK → name what is wrong
→ redo**, judged against **captured motion, not stills** — a
`scripts/enemy-loop.mjs`-style GIF-loop capture gets set up before any
character is approved, because prototype-feel lives entirely in the part a
state assertion cannot see.

**Order of work** (each gate is a LOOK pass, drafts discarded freely):

1. **The unification shot.** One screen: real tiles at the internal
   resolution + ONE placeholder 3D machine (grey-box excavator) rendered
   into the same buffer, idling. This proves §3.2 — that a 3D character
   over pixel tiles reads as one game — and locks internal resolution +
   tile size. **Nothing else is made until this shot passes.**
2. **Excavator, for real.** Model + palette + rig contract + idle/move/
   dig loops as GIFs. Locks the machine language (§3.5) and the
   code-vs-clips animation decision.
3. **Palette strip + three room mocks** (flat images) — locks §3.3 and
   the stage-set dressing against pictures, not prose.
4. **Eeri** — silhouette first (black-fill at 32 px), then model, then
   idle/run/jump/land loops over a plain tile ramp. Locks hero feel.
5. **One room in engine** — grammar tileset + one world sheet + parallax +
   Eeri + the excavator. The *vertical slice of the look*; every later
   asset is judged against it.
6. **First hazard** (wrecking ball or wet cement): telegraph → strike,
   chevron language on. Locks the danger read.
7. Everything else, against the slice.

**Definition of done, per asset:** named per convention · versioned URL ·
in the manifest the smoke gate reads · seen moving in-engine · one line in
`VERSIONS.md`.

---

## 9. Open questions for the owner

1. **Who is Eeri?** A small builder-kid among the machines, or the
   smallest machine on the site? Changes the hero sheet only, but changes
   it completely.
2. **Reference images.** "Mario 3 + Mario World + construction machines"
   is the direction; two or three actual pictures (which SMB3 world?
   which machines — toy-like Tonka reads or real Volvo/Cat proportions?)
   beat any paragraph here. Per-cover references have always been yours
   to give — same for the whole game.
3. **Accent / machine yellow `#ffb01f`** — veto freely.
4. **Internal resolution + tile size** (§3.2, §4) — proposed ~240 px /
   16 px tiles; gate 1 exists to test it, but if you already know you want
   chunkier (208 px) or finer (270 px), say so before gate 1.
5. **World themes** — groundworks / scaffold heights / demolition /
   night-shift is a placeholder list; the world list is a design decision
   art plans around.
6. **Sources.** Gitignore the `.blend`/`.aseprite` working files, or track
   them (LFS)? Repo has no precedent to lean on.
