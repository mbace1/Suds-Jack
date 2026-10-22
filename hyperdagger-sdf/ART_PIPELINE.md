# Hyper Dagger — Nano Banana → Meshy → game: the test sheet

The working checklist for the concept-to-mesh pipeline. Stage 1: generate the
subjects below in Nano Banana and judge them against the CHECK line. Stage 2:
push the survivors to Meshy (image-to-3D). Stage 3: they enter the game as the
**alive-skin** over a voxelized lattice — v4.32's hull architecture already
splits "what you see alive" from "the matter it breaks into", so a Meshy mesh
slots in as the skin while chips/deaths keep bursting real voxels.

## The style block — paste this at the end of EVERY prompt

> matte bone-white and obsidian-black sculpture, monochrome with dark crimson
> glowing accents, carved faceted low-poly surfaces, studio product photo,
> single subject centered, full subject in frame, three-quarter front view,
> soft even lighting, plain light-gray seamless background, no text, no
> watermark

Why each clause is there: the palette IS the game (black & white, dark red the
only contrast color); "faceted low-poly" keeps Meshy from inventing organic
noise the unlit renderer can't shade; "product photo / centered / full subject
/ 3/4 view / plain background" is what Meshy's segmentation and depth
estimation want — a cropped subject or a busy background is the #1 cause of
garbage meshes. Generate square (1:1).

For a stronger Meshy result, also ask Nano for a **turnaround** of any
survivor: "character turnaround sheet, same subject, front view, side view,
back view, three-quarter view" — and feed Meshy the multi-view set.

## What disqualifies a test image (don't push these to Meshy)

- **Thin, spindly, or floating parts** — spider legs, detached crown spikes,
  wisps. Meshy webs them together or drops them. Ask Nano for "thick",
  "chunky", "connected to the body" variants instead.
- **Deep interior cavities that matter** — an open maw reads fine; a hollow
  ring interior (the serpent segment) will come back solid. Design around it.
- **Silhouette that needs color to read** — squint at 10% zoom; if you can't
  name the enemy from the outline, the game can't either at 30 m.
- **Painted-on detail pretending to be geometry** — eyes as flat decals are
  fine (we re-light them as HDR emissive in-engine); armor plates that are
  only painted will disappoint when meshed.

## Enemies — the roster, one prompt line each

Prepend the subject line, append the style block.

| # | Slot in game | Subject line for Nano | CHECK before Meshy |
|---|---|---|---|
| E1 | Skull (the swarm) | a demonic screaming skull with deep hollow eye sockets, pronounced brow ridge, two rows of teeth, no jaw hinge — one fused menacing skull | sockets read as DEPTH, not paint; silhouette instantly "skull" |
| E2 | Dread skull | a massive war-scarred demon skull carved from dark red stone, cracked crown of short thick horns fused to the cranium, burning ember eyes | horns FUSED to the skull, not floating; red reads dark, not pink |
| E3 | Brute | a hulking obsidian skull with two thick down-curved tusks and a heavy underbite, brutal and dense | tusks thick enough to survive meshing |
| E4 | Husk (two-part!) | a sealed angular war-golem torso of overlapping obsidian armor plates, faint crimson light leaking from the seams | plates read as geometry; generate the CORE separately: "a jagged crystalline crimson heart, glowing" |
| E5 | Watcher | a hovering armored drone eye, thick lens housing, single wide crimson lens slit, small antenna fin | one connected body; lens recessed |
| E6 | Serpent head | a horned bone serpent dragon head with open dark maw and recessed burning eyes, thick neck stump | neck stump present (the chain attaches there) |
| E7 | Serpent segment | a thick armored bone vertebra ring segment with a dorsal ridge spike, chunky | accepts being SOLID (the hollow ring won't survive meshing) |
| E8 | Spider (thief) | a squat armored gem-thief beetle-spider, four THICK crab-like legs fused to a low hull body, two crimson eyes | legs are the risk — reject spindly results |
| E9 | Totem | a carved bone monolith totem of stacked screaming faces, crimson veins between the segments | doubles as an environment piece; must read at distance |
| E10 | Leviathan (boss) | a colossal god-head of black stone and bone, crown of broken horns, burning eyes and mouth, ancient and cracked | face survives at LOW detail — it is seen from 20 m |
| E11 | NEW — the Reliquary | a walking shrine of fused bones and black iron, a caged crimson relic glowing in its chest | candidate new matter-enemy: cage = armor, relic = core |
| E12 | NEW — the Choir | a cluster of seven fused screaming skulls arranged in a ring, sharing one bone mass | candidate splitter-evolution; one connected mass, not seven floaters |

## Environments — the disc sits in a void; these are what the void holds

The arena is a flat neon disc with no cover (that rule is load-bearing — DD
has no cover). Environment meshes live **beyond the rim** as monuments in the
void, or **under/around** the disc. Nothing enters the play field.

| # | Where it lives | Subject line for Nano | CHECK before Meshy |
|---|---|---|---|
| V1 | Beyond the rim | a colossal broken stone hand reaching up out of darkness, fingers cracked, monumental scale | reads from ONE side (players never see its back) |
| V2 | Beyond the rim | a ring of ancient leaning obelisks carved with glowing crimson glyphs | generate ONE obelisk; we instance the ring |
| V3 | Beyond the rim | a giant ribcage arch of weathered bone, half-buried, monumental | arch gap wide — it frames the sky |
| V4 | Beyond the rim | a shattered stone colossus head lying on its side, one eye socket glowing faint crimson | companion to the Leviathan lore |
| V5 | Under the disc | an inverted mountain of black rock hanging into the void, stalactite-like | only the top third is ever visible |
| V6 | Distant skyline | a ruined black basalt gate, two pylons and a broken lintel, monumental | silhouette-only at distance — detail is wasted |
| V7 | Arena centre | a cracked ceremonial stone dais with crimson channels carved in rays | FLAT — max knee height, the Leviathan rises through it |
| V8 | Floating | a slowly orbiting shard of broken temple masonry with one carved face | small, cheap, instanced at three sizes |

## The first wave — push these five to Meshy first

1. **E1 Skull** — the game is 80% skulls; if the pipeline works for anything
   it must work for this. Also the cheapest A/B against the current sculpt.
2. **E5 Watcher** — hard-surface, no thin parts, one material: the easiest
   possible meshing win, a good pipeline calibrator.
3. **E10 Leviathan** — biggest visual payoff per asset; it stands still.
4. **V2 Obelisk** — first environment piece; instanced ring = one asset
   dresses the whole void.
5. **V1 Broken hand** — the mood-setter; if this lands, the void stops being
   empty.

Hold E8 (spider legs), E7 (hollow ring), and anything that failed a CHECK for
round two with adjusted prompts.

## Meshy settings + budgets (for stage 3 to stay honest)

- Target polycount: **≤ 15k tris** for enemies, ≤ 8k for instanced
  environment pieces, ≤ 30k for the Leviathan. The engine is unlit — bake no
  PBR maps; albedo only.
- No rigging needed: enemies float and `lookAt` the player; nothing walks.
- Eyes/veins/cores: keep them FLAT COLOR in the texture — in-engine we lift
  those texels to HDR so the bloom bites, same trick as the voxel palettes.
- Scale on import is set per-slot in the engine (world sizes are locked by
  hitboxes — see `radius` per enemy class); never scale to the concept image.
- Integration path: mesh = alive-skin (v4.32 hull slot), lattice = voxelized
  from the mesh at import so chips/bursts/detach keep working unchanged.
