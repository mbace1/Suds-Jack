# World 1 library — index of existing sources

The category folders are the contract; the pieces themselves largely already
exist elsewhere in `art-src/`, generated for the v14–v23 art passes. **This
index maps them into the library's taxonomy by reference instead of copying
megabytes of JPGs into a second location** — a piece that exists twice will
drift twice. New candidates still land in the folders per the README.

Every piece listed here already satisfies the critical plane rule: each was
generated as ONE object with no ground, no pedestal, no floor shadow, frontal
or near-side-on (the generation clause is in
`art-src/tools/sheet-pieces.mjs`, and it matches the README's rule nearly
word for word).

**Keying note.** These sources are **magenta-backed** (#ff00ff), keyed by
`art-src/tools/keylib.js` (hue-ratio key + despill + alpha bleed — read its
header before touching a threshold; all three of its rules shipped as bugs
first). The README's World 1 lock names **bright blue** as negative space for
newly generated candidates; if candidates arrive blue-backed, keylib needs a
blue variant — do not run the magenta key on them and call the pink residue a
mystery.

## background/  (distant structural silhouettes, quiet)
| piece | source |
|---|---|
| office tower slab | `craft/pieces/P-sky-slab.jpg` |
| stepped building | `craft/pieces/P-sky-step.jpg` |
| paired low blocks | `craft/pieces/P-sky-pair.jpg` |
| slim tower block | `craft/pieces/P-sky-tower.jpg` |
| chimney stack | `craft/pieces/P-sky-stack.jpg` |
| tower crane (balsa lattice) | `craft/pieces/P-sky-crane.jpg` |

## midground/  (scaffold bays, hoarding, frames, trusses)
| piece | source |
|---|---|
| five-storey concrete frame | `craft/pieces/P-far-frame5.jpg` |
| three-storey frame | `craft/pieces/P-far-frame3.jpg` |
| squat two-storey frame | `craft/pieces/P-far-frame2.jpg` |
| lift-core tower with stair | `craft/pieces/P-far-core.jpg` |
| cement silo on legs | `craft/pieces/P-far-silo.jpg` |
| site hoarding run (far grade) | `craft/pieces/P-far-hoard.jpg` |
| tower crane with base | `craft/pieces/P-far-crane.jpg` |
| three-lift scaffold | `craft/pieces/P-mid-scaff3.jpg` |
| single-lift scaffold bay | `craft/pieces/P-mid-scaff1.jpg` |
| tall slim scaffold tower | `craft/pieces/P-mid-tower.jpg` |
| overlapping-panel hoarding | `craft/pieces/P-mid-hoard.jpg` |
| site cabin | `craft/pieces/P-mid-hut.jpg` |

## foreground/  (narrow verticals, bottom sweeps, overhead crossings)
| piece | source |
|---|---|
| full-height scaffold standard | `craft/pieces/P-fore-stand.jpg` |
| debris-netting panel | `craft/pieces/P-fore-net.jpg` |
| high pipe run (cropped both ends) | `craft/pieces/P-fore-pipe.jpg` |
| dark spoil sweep (bottom edge) | `craft/pieces/P-fore-spoil.jpg` |
| dark drums + trestle (cropped) | `craft/pieces/P-fore-drums.jpg` |

## props/  (flat side-view dressing that sits on the ground line)
| piece | source |
|---|---|
| pipe stack (pyramid, chocked) | `craft/pieces/P-mid-pipes.jpg` |
| concrete mixer | `craft/pieces/P-mid-mixer.jpg` |
| sheet-stack against uprights | `craft/pieces/P-mid-stack.jpg` |
| builders skip | `craft/pieces/P-mid-skip.jpg` |
| spoil mound with felt crest | `craft/pieces/P-near-spoil.jpg` |
| small pipe pyramid | `craft/pieces/P-near-pipes.jpg` |
| traffic cones ×3 | `craft/pieces/P-near-cones.jpg` |
| oil drums ×2 | `craft/pieces/P-near-drums.jpg` |
| pallet + sacks | `craft/pieces/P-near-pallet.jpg` |
| temporary fencing run | `craft/pieces/P-near-fence.jpg` |
| buried features (pipe, drum, root, brick, stones, bottle) | `craft/earth/F-*.jpg` |

## textures/  (material swatches — MUST BE FEATURELESS, they tile)
| swatch | source |
|---|---|
| fine card fluting (topsoil) | `craft/earth/S-topsoil.jpg` |
| coarse card fluting | `craft/earth/S-mid.jpg` |
| packed kraft layers | `craft/earth/S-packed.jpg` |
| gritty fluting | `craft/earth/S-gritty.jpg` |
| balsa / felt / flute / paper | `craft/T-*.jpg` |
| felt fringe strip (keyed edge) | `craft/earth/E-fringe.jpg` |

The tiling law for anything in this section, learned twice: **a detail map
must be featureless — tile it 3×3 and LOOK** (`ART_PIPELINE.md` traps 20–23).
A swatch with a nameable object in it reads fine as a patch and prints the
same object forty-five times across a level.

## Not in the library on purpose
- `craft/pieces/G-*.jpg`, `craft/earth/E-tear.jpg` — compositor internals
  (grade strips), consumed by `tools/build-layers.mjs`, not placeable pieces.
- `bots/`, `pickups/`, `title/` — cast, collectables and UI: they go through
  the 3D/manifest seams, not the layer library.
- `craft/pipeworks/` — World 2's pool, parked until level 4.
