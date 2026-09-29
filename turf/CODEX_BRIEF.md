# TURF — pixel art in Metal Slug Tactics' technique: a brief for Codex

This is a self-contained work order. You do not need any earlier conversation.
Repo `mbace1/Suds-Jack`, project `turf/`: vanilla ES modules, no build step, no
npm dependencies. Everything below runs in bare `node` (22+).

## What we want

**Hand-finished pixel sprites** for TURF's characters (and then its props), in
Metal Slug Tactics' *technique*, to replace an automatic conversion that is
already live.

The owner asked (2026-09-29) for "a huge leap into the visuals, more Metal Slug
Tactics look that was in the art bible". v45 made that leap as far as code can:
every painted plate is now re-cut at load time onto a pixel grid with a hard
outline and flat colour bands (`js/mstcut.js`). That cut is honest about its
ceiling — an algorithm cannot decide that an eye is one dark pixel, that a pair
of trainers needs a highlight, or that the jacket's trim should read as the
squad's colour. **Those decisions are the job.** You start from the cut (a
correctly sized, correctly outlined scaffold) and finish it like a pixel artist.

## 1. The look, in measurable terms

The art bible is `turf/ART_REQUEST.md` §2. Read it. In short:

| trait | requirement |
|---|---|
| outline | a **hard, closed, dark outline** carries the whole silhouette. Dark = luma < 40; the house ink is `#100e14`. The figure must read in outline alone. |
| edges | **alpha is 0 or 255.** No anti-aliasing against transparency, no soft shadow, no glow. |
| fills | **flat bands**, at most **18 fill colours** per sprite (outline excluded). Base, shadow, one highlight per material is the MST rhythm; the owner's references allow a third or fourth band on cloth (§2.3). No gradients, no dithering noise. |
| grid | a standing body's ink is **58 px tall** (`MST_H` in `js/render.js`), ±2 for the outline. The board draws it at exactly half size in board pixels, so every pixel you place is visible. |
| faction | operators (the player's squad) carry the cold trim `#6fb8d9`; rivals the warm rust `#c9663f`. **Trim, not a paint job** — a collar, a stripe, a patch, a cuff. It is what tells the sides apart across the board. |
| register | TURF's own, not MST's content: **Nordic 90s street crime, muted and desaturated**, Insomnia/Trainspotting, not a war comic. |

What must **not** change:

- **Who these people are.** The cast is the owner's own 26 characters
  (`art-src/sprites/cast/roster/`, cut from his casting sheets) plus the plates
  already on the board. Same face, hair, build, clothes, weapon, pose. You are
  re-drawing them in a technique, not inventing new characters.
- **The camera and facing.** Three-quarter front view, the figure facing the
  viewer's lower right, feet on the bottom row of ink — exactly as the scaffold
  stands. The game mirrors the sprite for the other directions.
- **Size.** Do not change `SPRITE_H` or `MST_H`; the owner sized figures on the
  board twice ("way too big", then "10% too big").
- **No ground shadow, no base, no card edge.** The game draws the drop shadow.
  The owner explicitly asked for the cardboard look to be removed (v45).

## 2. The workflow

```sh
# 1. Write every plate's automatic cut at NATIVE size — your starting point.
node turf/tools/mst-export.mjs                 # -> turf/art-src/sprites/mst-scaffold/*.png
#    (scaffolds are derived files: do not commit them)

# 2. Hand-finish one. Save it as turf/art-src/sprites/mst/<plate-name>.png,
#    e.g. art-src/sprites/mst/blade-plate.png. Same canvas size is easiest;
#    any canvas works as long as the figure's ink is 58px tall.

# 3. Check it against the art bible (the same function the build gate uses).
node turf/tools/mst-export.mjs --check turf/art-src/sprites/mst/blade-plate.png

# 4. List it — one line in turf/js/mstart.js:
#      'blade-plate.png': 'art-src/sprites/mst/blade-plate.png',
#    The board now draws your sprite instead of the cut. Nothing else changes.

# 5. Gates.
node turf/test/smoke.mjs                        # includes the art-bible check on every listed file
NODE_PATH=$(npm root -g) node turf/test/playable.cjs
```

To **see** it, serve the repo root (`python3 -m http.server 8767`) and open
`http://127.0.0.1:8767/turf/`. The title screen has a **Look** switch
(pixel/painted) for comparing. `turf/tools/mst-sheet.html` is the contact
sheet the cut's height was chosen from.

### What to fix on each scaffold (in this order)

1. **The face.** Eyes as deliberate dark pixels (usually 1×1 or 1×2), a brow
   line, a mouth. The cut blurs a face into a skin-coloured blob; this is the
   single biggest improvement per minute.
2. **Highlights the cut lost.** White trainers, trouser stripes, a zip, the
   weapon's metal edge — one or two bright pixels each, placed, not scattered.
3. **Cluster cleanup.** Merge stray single pixels into their neighbours; make
   each material three or four flat bands lit from the upper left.
4. **Faction trim.** Recolour one small, readable region to the side's colour
   (above). If the character already wears it, leave it.
5. **Weapon silhouette.** The weapon must read in outline — a pistol is not a
   blob at the end of an arm.

## 3. Priority

1. The three operators on the board in the first encounter: `blade-plate`,
   `niner-plate`, `wrench-plate`. **Stop after these three and hand them back**
   — the owner judges the direction on three before anyone paints thirty.
2. The rivals of the first encounter (see `data/encounters.json`,
   `backlot`), then the remaining operators, then the rest of `data/enemies.json`.
3. Pose frames for the two characters that have them (`cast/gunner-*`,
   `cast/leopard-*`): same grid, key each frame's file name in `MST_ART`.
4. Props (§4).

## 4. Props

Same technique, same pixel density as the figures (2 sprite pixels per board
pixel). Native ink height = `PROP_H[name] × 2` (`js/render.js`); the list and
real-world heights live in `art-src/props/props.json`. Examples: `bench` ~32px,
`bin` ~38px, `crate` ~38px, `dumpster` ~42px, `lamp` ~146px. Save to
`art-src/sprites/props/mst/<name>.png`, check with
`node turf/tools/mst-export.mjs --check-prop <file>`, list in `MST_PROPS`
(`js/mstart.js`). Props are seen from the board's camera: an orthographic
**45° yaw / 30° elevation** — a box's top is a 2:1 diamond.

## 5. If you have image generation

Use each scaffold as the **input image** (image-to-image), never text alone —
text alone invents a new person, and the identities are the owner's. A prompt
that has worked for this register:

> Clean up this pixel-art character sprite in the technique of Metal Slug
> Tactics: hard 1px near-black outline around the whole silhouette, flat colour
> fills with at most three or four tones per material lit from the upper left,
> no anti-aliasing, no gradients, no dithering noise, transparent background,
> no ground shadow. Keep the same person, clothes, weapon, pose, facing and
> exact pixel dimensions. Give the face readable features (eyes as single dark
> pixels, brow, mouth). Muted, desaturated Nordic street palette. Add a small
> [cold blue #6fb8d9 | warm rust #c9663f] trim detail on the clothing.

Then **snap the result back to the grid** — generators drift off pixel
boundaries and add semi-transparent edges — and run `--check`. A generated
image that fails the check is not a delivery.

## 6. Done means

- Every file you list in `js/mstart.js` passes `node turf/test/smoke.mjs`.
- A screenshot of the board (desktop and a 390px-wide phone) with your sprites
  in it, next to the same view with them unlisted.
- One commit per batch, with a `turf/VERSIONS.md` entry (read the top entry
  first and take the NEXT number — this log has had four collisions), and the
  `VERSION` constant in `js/main.js` moved to match (a gate enforces it).

## 7. Do not

- Invent new characters, re-pose them, or change their clothes.
- Change `SPRITE_H`, `MST_H`, the camera, the engine, `data/*.json` or balance.
- Commit `art-src/sprites/mst-scaffold/`.
- Deploy to `gh-pages`, force-push, or skip hooks.
