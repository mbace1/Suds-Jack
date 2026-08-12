# EERI Platformer — Art Production Brief

**For:** a fresh Claude instance (or human artist) running the **Nano Banana + Meshy** asset pipeline.
**Target:** `platformer.html` in `mbace1/Suds-Jack`, branch `claude/html5-platformer-game-p38zub`.
**Goal:** replace all programmer-art (canvas rect drawing) with a cohesive sprite/tile set.

**Pipeline split (decided):**
- **Characters → 3D via Meshy** (image-to-3D from a Nano Banana concept, then pre-rendered to 2D sprite frames)
- **Most other assets → 2D via Nano Banana directly** (tiles, blocks, pipes, coins, flag, backgrounds, FX)

---

## 1. Game & Technical Context

- Single-file HTML5 canvas game, internal resolution **480 × 272**, `image-rendering: pixelated`, horizontal scrolling.
- Tile grid: **16 × 16 px**. Levels are assembled from ASCII chunks (see `platformer.html`, LEVEL BUILDER section) — tiles must tile seamlessly horizontally and vertically since chunks stitch in any order.
- Player hitbox 10 × 15 px (sprite may overhang up to 16 × 24 px). Enemy hitbox 14 × 14 px.
- Everything currently drawn procedurally with `fillRect` — the integration step swaps those draw functions for `ctx.drawImage` sprite-sheet lookups. Keep hitboxes unchanged; art must visually fit them.

## 2. Art Direction

**Reminiscent of Super Mario Bros. 3 / Super Mario World** — that era's language, not its content:

- Bright, saturated, cheerful daylight palette; bold shapes readable at 16 px.
- Thin dark outlines (1px at final scale) around characters and interactive objects, SMW-style, so they pop off the background.
- Chunky rounded forms, big heads, small bodies; scenery has that "cardboard stage-set" flatness (SMB3's theater framing is a good instinct).
- **Legally distinct.** No red plumber cap, no mushrooms, no koopa shells, no question-mark-block trade dress copies. "Eeri" has its own cast (see §5) — we borrow the *feel* (clarity, bounce, charm), never the designs.
- Current night-sky background gets replaced by a bright day world; keep `#f8d800` as the collectible/score accent.

### Palette anchor (2D assets must harmonize with these)

| Role | Hex |
|---|---|
| Sky | `#58a8f8` |
| Cloud/highlight | `#f8f8f8` |
| Ground earth | `#c88040` / dark `#8a5020` |
| Grass | `#40b830` / lit `#68d848` |
| Brick | `#d86828` |
| Prize block & coins | `#f8d800` / shade `#c09000` |
| Pipe/portal | `#28a048` / lit `#58d878` |
| Outline ink | `#302018` |
| Danger/UI red | `#e03030` |
| Hero teal | `#40c8b0` |
| Enemy rust | `#9b4510` |

## 3. Character Pipeline (Nano Banana → Meshy → sprites)

1. **Concept (Nano Banana):** character turnaround sheet — front / side / 3/4 views on neutral grey, single soft key light upper-left, flat cartoon shading. Prompt templates in §6.
2. **Model (Meshy):** image-to-3D from the best 3/4 view. Low-poly (< 10k tris), stylized/toon shading, no PBR gloss.
3. **Render:** orthographic **side view** (side-scroller), key light upper-left ~35°, mild warm fill. Render each animation pose at **8× final size**, transparent background.
4. **Post:** downscale nearest-neighbor to final pixel size, then add the 1px `#302018` outline so 3D characters sit in the same visual language as the 2D tiles.
5. **Pack:** horizontal-strip sprite sheets + manifest (§7).

## 4. 2D Asset Pipeline (Nano Banana direct)

Generate at high res with flat orthographic side-on framing, then downscale nearest-neighbor to final tile size. Tiles must be seamless: request "tileable" explicitly and verify edges by tiling a 3×3 repeat before delivery.

## 5. Asset Manifest

All sizes are **final on-screen pixels**. Frames laid out left→right in one horizontal strip per file.

| File | Source | Frame size | Frames | Notes |
|---|---|---|---|---|
| `assets/player.png` | Meshy 3D | 16×24 | 8 | idle, walk×3, jump, fall, skid, death. Faces **right** (code mirrors) |
| `assets/enemy.png` | Meshy 3D | 16×16 | 4 | walk×2, squished, angry-telegraph |
| `assets/tiles.png` | Nano Banana | 16×16 | 8 | ground-top (grass), ground-fill, brick, prize-block, prize-used, pipe-top, pipe-body, deep-rock |
| `assets/coin.png` | Nano Banana | 12×12 | 4 | spin cycle |
| `assets/flag.png` | Nano Banana | 32×128 | 1 | goal pole + banner |
| `assets/fx.png` | Nano Banana | 8×8 | 6 | brick shards ×3, sparkle ×2, poof |
| `assets/bg-far.png` | Nano Banana | 480×136 | 1 | tileable-x: distant hills, SMB3-flat |
| `assets/bg-near.png` | Nano Banana | 480×100 | 1 | tileable-x: closer bushes/trees layer |

### Character design notes

- **Player ("Eeri"):** small round explorer-spirit; teal body, cream face, big single-highlight eyes, a wisp/antenna that trails when running. Distinct silhouette at 16 px — test by squinting.
- **Enemy ("Grump"):** grumpy rust-colored pebble-creature, stubby feet, heavy eyebrows. Squished frame = flattened pancake with X eyes.

## 6. Prompt Templates

**Character turnaround (Nano Banana, feeds Meshy):**
> Turnaround sheet of a small round [description], bright cartoon platformer mascot style, bold shapes, flat cel shading, front view / side view / three-quarter view, neutral grey background, single soft key light from upper left, no text, no watermark, game concept art

**Tile (Nano Banana direct):**
> Seamless tileable 16-bit platformer game tile of [description], viewed straight from the side, flat orthographic, bright saturated colors, thin dark outline, crisp edges, plain background, 1:1 aspect

**Background layer (Nano Banana direct):**
> Seamless horizontally-tileable side-scroller background layer, [distant rounded hills / near bushes and trees], bright cheerful daylight, flat theater-backdrop style, 3–4 tones only, no characters, wide crop

## 7. Delivery Contract

Commit to `claude/html5-platformer-game-p38zub`:

```
assets/
  player.png  enemy.png  tiles.png  coin.png  flag.png  fx.png
  bg-far.png  bg-near.png
  manifest.json
```

`manifest.json` shape:

```json
{
  "player": { "fw": 16, "fh": 24, "frames": ["idle","walk1","walk2","walk3","jump","fall","skid","death"] },
  "enemy":  { "fw": 16, "fh": 16, "frames": ["walk1","walk2","squish","telegraph"] },
  "tiles":  { "fw": 16, "fh": 16, "frames": ["ground_top","ground_fill","brick","qblock","qused","pipe_top","pipe_body","solid"] },
  "coin":   { "fw": 12, "fh": 12, "frames": ["spin1","spin2","spin3","spin4"] }
}
```

Rules:
- PNG, transparent background, **no anti-aliasing halos** against transparency (downscale with nearest-neighbor).
- Character feet must sit exactly on the bottom edge of the frame (game anchors sprites at feet).
- Keep every asset in the §2 palette family.
- Do **not** modify `platformer.html` game logic — integration (swapping draw calls to `drawImage`) is a separate task that happens after assets land.

## 8. Definition of Done

- [ ] All files in §5 committed with manifest
- [ ] A single contact-sheet PNG (`assets/contact-sheet.png`) showing everything at 4× zoom on a `#58a8f8` background, for review at a glance
- [ ] Ground tiles verified seamless in a 3×3 repeat
- [ ] Player readable as "cute spirit" at 100% zoom; enemy readable as "grumpy"; the two never confusable
