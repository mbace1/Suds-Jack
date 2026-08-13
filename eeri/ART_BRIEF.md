# EERI — Art Brief

> **Status: v5 — presentation locked.** Owner-given direction
> (2026-08-12, accumulated): **grammar from Super Mario Bros. 3 and Mario 4
> (Super Mario World); presentation is modern layered 2.5D — confirmed
> references Yoshi's Crafted World × DKC Tropical Freeze, pixel art
> dropped; construction machines; 2D environments, 3D characters; Eeri is
> a kid who can ride the machines; machine look is Tonka combined with
> real Cat machines.** Everything else is a starting position built around
> those facts. Sections tagged **[ASSUME]** still
> need the owner's own words. Locked visual plans elsewhere in this repo
> (gameoflife, the hub) all began as briefs like this and only became rules
> after a render → LOOK → redo pass against real references.
>
> **v6 adds §1.2 — the verb, locked.** The machines are no longer simply
> friendly rides: a machine is **dangerous until it is yours**, and rooms
> are built around an exit only a machine can open. This changes what has
> to be drawn (an unmanned state, and a new class of manipulable world
> pieces), so read §1.2 before §5.

---

## 1. What the game is

**Eeri** — a bright, side-view platformer. **Eeri is a kid on a worksite
of construction machines — excavators, cranes, dump trucks, mixers,
rollers, a wrecking ball — and he can climb into them and ride.** The
levels play on a 2D plane with Mario-grammar logic, but the world is a
**deep, layered diorama**: a stage set with real depth in front of and
behind the action.

Riding is not a bolt-on — it is the Mario World half of the grammar doing
its job: the ride-a-creature verb (Yoshi) was that game's signature
addition, so "kid on foot" vs "kid in a machine" is Eeri's small-Mario /
Yoshi-Mario axis. On foot he is nimble and fragile; in a cab he is heavy,
powerful, and the machine takes the hit (the Yoshi rule — you lose the
ride, not the run). Every art decision about a machine is also a decision
about a *mount*.

### 1.2 The verb, locked (owner, 2026-08-13)

The loop, in one line: **read the machine's cycle → time the mount →
reshape the room → get out and climb.**

- **A machine is dangerous until it is yours.** An unmanned machine runs
  its own work cycle — it is not hunting Eeri, it is simply heavy and
  blind, which is both more unsettling and more fair than a chaser. Being
  near one is the risk.
- **Mounting is the skill test, not a convenience.** You approach on the
  machine's own rhythm; getting into the cab converts the threat into a
  tool. That moment is the game's best beat and the art has to sell it.
- **A machine earns its slowness by changing the level.** The bucket digs
  the bank that is too high to jump, the boom lifts the girder into a
  bridge, the ball breaks the wall. This is what makes Cat anatomy
  load-bearing rather than decorative: **the bucket digs because it is a
  bucket.**
- **Each room is a lock and the machine is the key** — its exit is blocked
  in a machine-shaped way. The kid reaches what the machine cannot; the
  machine moves what the kid cannot. Neither finishes a room alone.

**What this adds to the art, and it is not small:**

1. **Every machine needs to read as UNMANNED at a glance** — that is a
   silhouette-level requirement, not a detail. The **empty seat** is the
   primary tell (another reason the cab stays open, §3.6), and the
   secondary is an **amber beacon**, lit and turning while the machine
   works itself, dark once Eeri is aboard. It is a real thing on real
   plant, it is legible at 32 px, and it doubles as the hazard telegraph
   the house rules demand.
2. **Hazard chevrons belong on the machine's own working envelope**, not
   just on set-dressing — the swing zone, the slew radius, the bucket's
   reach.
3. **A new asset class: manipulable world pieces** (§5.1) — the dirt bank
   that gets dug, the girder that gets carried, the wall that breaks.
   These are **3D**, not cutouts, because they are moved, lifted and
   rotated in play, and they need their before/after states drawn as
   deliberately as any character pose.

### 1.1 References, two tiers

**Tier 1 — grammar (owner-given): Mario 3 + Mario World.** These are
*design-language* references, read as instructions:
- Level logic on an honest tile grid; repetition is rhythm.
- The level is a **built stage** (SMB3's curtain-and-flats conceit) — a
  gift to a construction game, where the set can visibly BE under
  construction: scaffold framing, bolted platforms, unfinished edges.
- Themed worlds re-skin one grammar; secrets look like the wall (a tile
  that is 2% off is an invitation).
- Silhouette-first cast, one exaggerated feature each.
- The ride verb (World).

**Tier 2 — presentation (owner-confirmed 2026-08-12): modern layered
2.5D — Yoshi's Crafted World × DKC Tropical Freeze.** What each one
contributes:

| Reference | What we take from it |
|---|---|
| **Yoshi's Crafted World** ★ | the closest single match: a **toy diorama** where every level is visibly a hand-built set (matches Tonka AND the SMB3 stage conceit), foreground/background lanes, soft friendly light — and it is a *riding* game |
| **DKC: Tropical Freeze** ★ | the canonical "2D gameplay, fully 3D layered world": dramatic depth, the camera drifting on rails, background layers where things *happen* (silhouette moments, machines working behind the action), heavy-object weight |
| *Super Mario Bros. Wonder* | modern Mario readability + expressive character animation; how flat-graphic UI/effects sit on a dimensional world |
| *LittleBigPlanet* | the depth *stack*: a shallow set of discrete lanes in one diorama box, materials that read as real toy stuff |

★ = the confirmed pair: **Crafted World's toy-diorama material world ×
Tropical Freeze's layered dynamism**, on Mario 3/World's level grammar.
Wonder and LBP stay as secondary consultation, not targets.

**Consequence, decided (owner, 2026-08-12): pixel art is dropped.** This
is a **clean-edged, modern-rendered** game — no low internal resolution,
no `image-rendering: pixelated`, anywhere. Draft v2's pixel route is
closed, not parked.

**Homage rule, house-wide:** we take the grammar of the references and
none of their characters, sprites or logos — and the machines take Cat's
*anatomy*, never its trade dress (§3.6).

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
   `eeri/js/palette.js` even though assets exist — cutout layers and model
   colours are *built from* those hex values, and a committed swatch strip
   sits next to the sources so a repaint is a diff, not archaeology.
4. **Sources stay out of the shipped tree.** `.blend`, `.aseprite`, `.kra`,
   `.svg` working files live in `eeri/art-src/` (gitignored or LFS —
   owner's call); the game folder ships only exported, optimised files.

---

## 3. Art direction

### 3.1 The one-line direction

**A toy worksite diorama: Mario-grammar levels built as a deep stage set
of flat-colour cutout layers, with chunky Tonka × Cat machines as the
cast — and a kid who climbs into them.**

- **2D owns the world** — the environment is **cutout layers**: big
  flat-colour painted shapes (plywood flats, girder trusses, dirt piles,
  skylines) placed at **real z-depths** in the three.js scene, so
  parallax, overlap and depth-of-field-like layering come from an actual
  camera, not from scroll math. The set is visibly *built*: pieces show
  bolts, braces, raw edges.
- **3D owns the cast** — Eeri and the machines. A machine is a hierarchy
  of rigid parts (cab, boom, stick, bucket, wheels), and one GLB with
  named nodes gives every pose and facing by rotating joints in code —no
  sprite-sheet explosion, and mechanical ease-and-settle motion reads as
  *machine* in a way redrawn frames never quite do. A 3D cast also makes
  **riding** cheap: Eeri's model parents to a `seat` node and both stay
  fully animated.
- **The camera** sits near-side-on with **mild perspective** (long lens,
  ~20–30° FOV **[ASSUME]** — lock in gate 1): enough to make the layer
  stack breathe when it tracks, never enough to hide what platforming
  needs. Gameplay stays on one plane; the camera may drift and reframe
  Tropical-Freeze-style at authored moments, not freely.

### 3.2 The unifier: one material world (the make-or-break rule)

v2's unifier was one low pixel resolution; with the modern layered
direction the risk inverts — the danger is now **2D cutouts and 3D models
reading as two different games** sharing a screen. The unifier becomes
three "ones":

1. **One palette** (§3.3) — every cutout colour and every vertex/texture
   colour comes from `palette.js`. No asset invents a colour.
2. **One light** (§3.4) — the same soft rig on everything 3D, and cutout
   layers painted with shading *consistent with that light* (key from
   upper-left **[ASSUME]**, baked into the painting).
3. **One material language: painted toy.** Everything — flats and
   machines alike — reads as painted wood and pressed steel: flat fills,
   large radii, a single darker tone for side faces, visible bolts as the
   shared detail motif. No photo textures, no grunge/noise maps, no PBR
   gloss anywhere.

Plus **one depth model**, stated once: gameplay plane at z = 0; behind it
a stack of 3–5 environment layers (z ≈ −2, −6, −14, −30, sky); in front
one occluder lane (z ≈ +2) whose pieces are cropped by the frame — the
"cropped foreground = depth" cover lesson, now in-game. Layer depths are
per-world constants, not per-asset improvisation.

**Gate 1 of production (§8) exists to prove this shot before anything
else is made.**

### 3.3 Palette

Mario brightness + worksite: **saturated flats against a big blue sky,
safety yellow-orange as the cast's family colour, hazard stripes as the
danger language.** The modern render allows more tonal range than v2's
hard 3-step ramps, but the *reads* stay flat and posterised — bands, not
gradients.

| Role | Working value | Rule |
|---|---|---|
| SKY | `#4aa8e8` → pale horizon band | large and cheerful; clouds are flat shapes; deepest layer tints toward sky (painted atmosphere) |
| EARTH ramp | warm browns/tans, 3–4 tones | dug ground, dirt piles, brick |
| STEEL ramp | cool blue-greys, 3–4 tones | girders, scaffolds, plates |
| ACCENT GREEN | `#3cc85a` family | the "grass lip" role — safe standable edges |
| MACHINE | **safety yellow-orange `#ffb01f` [ASSUME]** + near-black | the cast's uniform; every friendly machine carries it |
| HAZARD | `#e8402a` red + **black/yellow chevron stripes** | the one language for "this hurts": wet cement, swing zones, live edges — stripes keep danger readable in greyscale |
| INK | `#1a1410` | outlines/edge-darkening where a shape must pop from sky |

- Depth is also colour: each layer back desaturates and shifts toward SKY
  (painted into the cutout, not fogged at runtime) — the diorama's air.
- The machine yellow doubles as the **hub cabinet accent**
  (`hub/games.js`) — the floor's existing accents leave a true
  safety-yellow unclaimed. Veto freely.
- Hazard-vs-safe must survive greyscale (the chevron carries it). Check
  every layer mock in greyscale before approving.
- UI text passes **WCAG AA**, controls hit **44 px** — smoke-gate
  assertions here like everywhere else in the repo.

### 3.4 Light

**One soft rig, no drama:** a hemisphere fill + one directional key
(upper-left), **no cast shadow maps** — every character gets a painted
**blob shadow** on its ground (also the player's landing aid, Mario's
ellipse). A gentle 2-step toon ramp on the 3D is on the table if flat
unlit reads too dead against the layered depth — decide in gate 1, then
lock. Cutout layers are self-lit paintings; their shading is drawn in,
agreeing with the key direction. No bloom, no chromatic aberration, no
post stack; `NoToneMapping` or ACES — whichever the gate-1 shot proves,
then locked.

### 3.5 Motion rules

- **Machines move like machines:** ease-in/ease-out on every joint,
  overshoot-and-settle on stops, slow booms + fast buckets. Weight is the
  whole act.
- **Squash-and-stretch goes on the suspension, not the metal** — a truck
  landing compresses on its wheels/tyres (scale the wheel nodes), the body
  stays rigid. That one rule keeps "cartoon" from becoming "rubber."
- **Every hazard telegraphs** before it is lethal (house rule from
  hyperdagger's telegraphed spawns and flashprince's duel clock): the
  wrecking ball winds back, the load tips before it spills, chevrons
  flash. Readable first, dangerous second.
- **The background works.** Layers behind the action carry slow authored
  life — a crane swinging a load across the skyline, a dump truck crossing
  a far road (the Tropical Freeze lesson: depth you *watch*, not just
  parallax you scroll). One event per screen, slow, never competing with
  the playfield.
- Idle is mandatory per character: engines tick over — a subtle chassis
  vibration, exhaust puffs, a bucket that settles. Machines never freeze.
  Eeri's idle is a kid's: rocking on heels, hard hat adjust.
- `prefers-reduced-motion` stills everything decorative to one frame.

### 3.6 Machine design language: **Tonka × Cat** (owner-given)

The combination, as instructions — each half contributes a different
thing:

**From real Cat machines — the *anatomy*:**
- Every machine is **nameable from silhouette** by someone who knows the
  real thing: correct part relationships (boom–stick–bucket geometry and
  its knuckle points, roller drum-to-cab ratio, dump bed pivot at the rear
  axle, mixer drum angle), correct stance, correct *motion paths*.
- Articulation is honest: joints where the real machine has joints, and
  they travel roughly like the real ones. The dig cycle, the bed tip and
  the drum turn are real cycles, cartooned in timing but not in mechanics.
- **No trade dress:** the yellow is generic safety yellow, there are no
  logos, no "CAT" lettering, no livery graphics. Anatomy is learned from
  the real machines; branding is not borrowed.

**From Tonka — the *build*:**
- **Toy proportions:** parts thickened, radii rounded, wheel diameters
  oversized, part count simplified — a pressed-steel toy of the real
  machine, not a scale model. If a detail wouldn't survive being
  die-stamped in sheet metal, it goes.
- **Visible fasteners:** big friendly bolt heads as the detail motif
  (shared with the environment's set-dressing — the one motif that ties
  cast and world).
- **Paint, not materials:** one body colour + near-black for tyres/
  undercarriage + one trim tone. Wear is a lighter edge-catch on corners
  at most, never rust or grime.

**Because they are mounts:**
- Every rideable machine has an **open, readable cab** sized so Eeri is
  visible and readable *while riding* (the Yoshi rule: the rider is never
  swallowed by the mount), a **`seat` node** in the rig contract, and a
  step/handle that makes the mount move (climb in, not teleport) legible.
- The **mounted silhouette is approved as its own character** — kid +
  machine must read at 32 px just like each alone.

### 3.7 Eeri, the kid

- **Proportions:** toy-figure kid, ~2.5 heads tall — big head, sturdy
  little body; reads next to oversized machines without vanishing.
- **The Mario-cap feature: a machine-yellow hard hat** — his silhouette
  key, his family tie to the machines, and the one colour link between
  the small figure and the big cast. High-vis vest as the secondary read.
  **[ASSUME — owner may have a different picture of him.]**
- On foot he is quick, springy, a little reckless; the run leans forward
  like he can't wait. Riding, his animation moves into hands-on-levers
  work — the character keeps acting while the machine does the moving.
- Face minimal (dot eyes, no mouth or a line) — expression lives in pose
  and timing, which survives distance.

---

## 4. 2D environment specification

The environment is **cutout layers, not tilesets** — but the *grid stays*:
level design and collision live on a tile grid (Mario grammar, honest and
testable), and the cutout art is dressed over it. Collision never comes
from artwork.

| Item | Spec |
|---|---|
| Design grid | tile grid for layout/collision (size locked in gate 1 with the camera); art overhangs and softens the grid, gameplay edges honour it exactly — a standable lip is *visibly* a lip |
| Cutout format | PNG with alpha, exported from vector/paint sources at **the largest scale the camera can reach ×1.5**, so a tracking shot never reveals soft edges; clean hard-edged flats, shading painted in, consistent with the §3.4 key |
| Layer stack | per §3.2: sky · far skyline · 2–3 mid set layers · playfield dressing · one foreground occluder lane; depths are per-world constants in `palette.js`-style code, not per-asset |
| Modularity | each world is a **kit**: repeating flats (girder truss, plywood hoarding, dirt bank, scaffold bay), end-caps, and 3–5 hero pieces (the crane silhouette, the half-built tower); kits assemble like set walls, SMB3 flats-style |
| The stage conceit | pieces show how they're held up: bolts, braces, sandbag feet, raw cut edges; backdrop seams are allowed to show |
| Per-world re-dress | groundworks · scaffold heights · demolition · night-shift **[ASSUME — world list is design's call]**; same kit grammar re-dressed, plus a palette shift (night is a repaint, not a lighting rig) |
| Secrets | each kit includes deliberate near-duplicate pieces (2% off) for hidden/hittable spots — the "suspicious tile" language carried into cutout dressing |
| Playfield platforms | 2D cutout faces on the gameplay plane; where a platform needs thickness against the perspective camera, a shallow 3D slab wears the cutout art as its face — decided per piece in gate 1's shot |
| UI / HUD | flat-graphic, Wonder-style — clean shapes floating over the dimensional world; UI accent = machine yellow; numerals and glyphs before words (trilingual fi/en/ja is the house norm — art-text must be locale-free) |
| File naming | `eeri/assets/2d/<world>_<piece>_v<N>.png`; lower-kebab, no spaces; each world kit carries a same-name `.json` manifest (piece sizes, pivot, intended layer) |

---

## 5. 3D character specification

| Item | Spec |
|---|---|
| Format | **GLB** (single-file glTF 2.0), vendored three.js `GLTFLoader` |
| Scale | 1 unit = 1 design tile; Eeri ≈ 1×1.5 tiles; machines 2–6 tiles — big-machine awe comes free from scale against the kid |
| Rig style | **rigid node hierarchies, no skinning**: cab → boom → stick → bucket, body → wheels; every articulated part its own named node (`boom`, `bucket`, `wheel_fl`, **`seat`** on every rideable). Animation = code rotating/scaling named nodes (or simple GLTF clips per action — decide in gate 2 and lock; code-driven is the recommendation: it composes with physics and the ride) |
| Eeri's rig | the one exception that may need simple skinning or segmented joints (Rayman-style floating parts fit the toy read and dodge skinning entirely — gate 4 decides) |
| Riding contract | Eeri parents to `seat`; mount/dismount are authored moves (climb via the step/handle node), not teleports; while ridden the machine's controls animate (levers, wheel) under Eeri's hands |
| Poly budget | Eeri ≤ 2 000 tris · small machine ≤ 3 000 · big set-piece machine ≤ 6 000 · whole cast on screen ≤ 40 k — the ceiling protects the flat toy read as much as perf |
| Shading | flat/faceted normals; colours as **vertex colours or one shared 64×64 palette-strip texture** (one UV point per cell); §3.4's one rig lights everything; no photo textures, no normal maps, no PBR channels, ever |
| Silhouette rule | every character approved as a black-fill render at 32 px first — one exaggerated feature each (excavator = *arm*, crane = *hook and height*, mixer = *drum*, roller = *drum-nose*); **mounted pairs approved the same way** (§3.6) |
| Facing | side-view game: characters face ±x; turning is an animated y-rotation flip — a 3D cast's free win |
| Pivots | floor-contact origin, +Y up, −Z forward (three.js convention); articulation pivots at the physical hinge |
| Naming | `eeri/assets/3d/<character>_v<N>.glb`; meshes and nodes named, never `Cube.004` |
| Compression | GLBs < 400 KB each; no Draco (adds a decoder dependency — against the grain here) |

**Export checklist (every GLB):** scale applied · transforms zeroed ·
normals flat · node names verified against the rig contract (including
`seat` on rideables) · unused materials/UVs stripped · opens in the
three.js editor with no console warnings · tri count in the commit
message.

**Cast list v1 [ASSUME — design's call, art plans for]:** Eeri · excavator
(first mount) · dump truck · cement mixer · roller · tower crane
(set-piece) · wrecking-ball crane (hazard boss).

**Every machine also ships its unmanned tell** (§1.2): a `beacon` node —
an amber lamp on the cab roof or rear corner, its own mesh so the game can
light it, turn it and kill it — and a seat readable as *empty* from the
side at 32 px.

### 5.1 Manipulable world pieces

The things a machine changes. **3D, not cutouts** — they are lifted,
carried, rotated and broken in play. Same GLB rules as §5 (flat normals,
unlit, palette colours, named nodes), same silhouette-first approval, and
one extra requirement: **the before and after states are both designed**,
because the whole point of the piece is that the room reads differently
once you have used it.

| piece | what it does | states to draw |
|---|---|---|
| dirt bank | dug down by the bucket | full → half → dug flat (3 steps) |
| girder | carried and set as a bridge | stacked → slung → seated as a span |
| brick wall | broken by the ball | intact → cracked → rubble pile |
| load (pallet, pipe stack) | lifted and placed | on the ground → slung → placed |

The dug/broken states are not a lesser version of the whole piece — a
half-dug bank has a fresh cut face and spill at its foot, rubble is a
different silhouette from a wall. Draw the change, do not just erase.

---

## 6. Where 2D ends and 3D begins (the boundary, stated once)

| Layer | Medium | Why |
|---|---|---|
| Sky, clouds, skyline | **2D** cutout layers at depth | flat, cheap, painted air |
| Mid/near set layers, foreground occluders | **2D** cutouts at real z | the diorama; overlap + camera do the depth work |
| Playfield collision | tile grid in level data | never from artwork |
| Playfield dressing/platform faces | **2D** cutouts (shallow 3D slabs behind them only where perspective demands thickness) | the grid stays visible and honest |
| Anything a machine digs, lifts or breaks | **3D** (§5.1) | it is moved and rotated in play; a cutout cannot be carried |
| Eeri + all machines (incl. background workers) | **3D** GLB, node-animated | articulation and riding for free; background machines are the same models, repainted by layer depth |
| Collectables (nuts, bolts, gems) | **3D** slow y-spinners | the genre's collectable language, free in 3D |
| Particles (dust, cement splash, sparks) | **2D** sprite quads | crisper and cheaper than 3D confetti |
| Drop shadows | **2D** blob under each character | the landing aid; no shadow maps |
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
  URL in the manifest resolves 200; cutouts decode; GLBs parse and expose
  their contracted node names (`seat` on every rideable); on-screen
  palette matches `palette.js`; AA + 44 px on UI.
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

1. **The diorama shot.** One screen: the full layer stack in grey-value
   mock cutouts + a grey-box excavator + a grey-box Eeri **riding it**,
   camera at the proposed FOV, tracking slowly. This proves §3.2 — that
   cutout layers and 3D cast read as one game with real depth — and locks
   camera, layer depths, tile size, and flat-vs-toon shading. **Nothing
   else is made until this shot passes.**
2. **Excavator, for real.** Tonka × Cat model + palette + rig contract
   (incl. `seat`) + idle/drive/dig loops as GIFs, plus the mount move.
   Locks the machine language (§3.5, §3.6) and the code-vs-clips decision.
3. **Palette strip + three layer-stack mocks** (flat images per world
   theme) — locks §3.3 and the set-dressing against pictures, not prose.
4. **Eeri** — silhouette first (black-fill at 32 px, on foot AND mounted),
   then model (rig decision: segmented vs skinned), then
   idle/run/jump/land + mount/dismount loops over a plain grey set. Locks
   hero feel.
5. **One room in engine** — one world kit + full layer stack + Eeri + the
   excavator, ridden and on foot. The *vertical slice of the look*; every
   later asset is judged against it.
6. **First hazard** (wrecking ball or wet cement): telegraph → strike,
   chevron language on. Locks the danger read.
7. Everything else, against the slice.

**Definition of done, per asset:** named per convention · versioned URL ·
in the manifest the smoke gate reads · seen moving in-engine · one line in
`VERSIONS.md`.

---

## 9. Open questions for the owner

1. **Reference images.** The pair is confirmed; two or three actual
   pictures (a DKC layer shot, a Crafted World diorama, a Tonka excavator
   next to a real Cat 320) would still sharpen gates 1–3 — per-cover
   references have always been yours to give.
2. **Machine yellow `#ffb01f`** as palette anchor and cabinet accent —
   veto freely.
3. **Camera** — how much perspective? §3.1 proposes a long lens (20–30°);
   gate 1 tests it, but say so now if you already feel strongly.
4. **World themes** — groundworks / scaffold heights / demolition /
   night-shift is a placeholder; the world list is a design decision art
   plans around.
5. **Eeri's look** — hard hat + high-vis is the proposal (§3.7); if you
   have a different picture of him, that's gate-4 input.
6. **Sources.** Gitignore the `.blend`/`.svg`/working files, or track them
   (LFS)? Repo has no precedent to lean on.
