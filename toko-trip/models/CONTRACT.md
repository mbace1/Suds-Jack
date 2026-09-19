# The prop contract

What a `.glb` has to be before this island will stand it up. The loader
**enforces every rule below** rather than trusting it, and a file that breaks
one does not quietly vanish — see *Failing visibly* at the bottom.

The machine-readable half of this document is the `PROPS` table at the top of
`../index.html`. If the two ever disagree, the table is what runs.

## The three named slots

| slot | kind | budget | envelope (m) | seated |
|---|---|---|---|---|
| `chair` | structure | 6 000 tris | 1.2 × 1.6 × 1.3 | on the ground, from its own base |
| `radio` | dressing | 2 500 tris | 0.6 × 0.7 × 0.5 | on the table top, at an exact height |
| `cove` | structure | 24 000 tris | 30 × 8 × 30 | at the island's origin, untouched |

Anything else goes in `DRESSING` and is placed by `at: [x, z]`.

## Coordinates, and the one convention that has bitten twice

- **Metres.** Y up, Z forward. glTF's own convention, so an exporter set to
  metres needs nothing done to it.
- **Island space.** `at: [x, z]` is metres from the chair, in the coordinates
  `groundHeight()` and `beachness()` already speak — so a prop can be placed
  relative to the beach rather than by trial and error.
- **A prop faces +z**, and the slot rotates it. The code chair is built with
  its **backrest at local +z**, so the seat looks down local −z; a replacement
  chair authored the same way lands in the same pose. Getting this backwards
  is the bug that has cost this project two days — once by sitting the player
  with their back to the cove, once by turning the settings slate into a
  plank. Author the chair so that **somebody sitting in it faces −z**.
- **Origin at the foot** is preferred but not required: a `ground`-seated prop
  is dropped onto the terrain from its own *measured* base, because exported
  models rarely agree about where zero is.

## Static. No exceptions.

There is no animation system on this island. A file carrying **animation
clips** or a **skinned mesh** is refused rather than silently frozen, because
a frozen clip is a prop standing in a pose nobody chose. Rig nothing; bake the
pose you want.

## Budgets, and the thing that actually costs you

A headset is **fill-bound, not triangle-bound**, so the triangle budgets above
are generous and the envelope check matters more. What genuinely hurts is
**texture memory**: prefer untextured, flat-colour or vertex-coloured meshes
and let the island's own lighting do the work. `flat: true` re-materials an
import into the satin palette for exactly this reason — it is what stops a
downloaded PBR asset reading as a photograph glued onto a poster.

No Draco or meshopt compression: the decoder would have to be vendored beside
three, and this project has deliberately stayed dependency-thin. glTF/GLB only
— convert FBX and OBJ first.

## The envelope is really a units check

Declared `span` is checked against the file's own measured bounds, refusing
anything over **1.25×** or under **0.25×**. That is not fussiness about size:
a glTF exported in centimetres arrives a hundred times too big and one
authored at scene scale arrives a hundred times too small, and **both look
exactly like a missing prop** from the chair. This is the commonest export
mistake there is and the check that names it in one line.

## Provenance is a row, not a footnote

Every row states where the model came from and on what terms. **CC0 needs no
credit and still gets a row.** Anything else is **credited in world**, on the
arcade sign's screen, automatically, the moment it loads — the house rule is
that attribution lives where a player can see it, not only in a source file.

Check the licence **per asset** at download time: on the big marketplaces it
varies model by model, not site by site.

## Failing visibly

A slot is `placeholder` (the code-built stand-in stands, and no file is
fetched) or `live` (the file is loaded and checked).

When a `live` slot fails — the file 404s, does not parse, or breaks any rule
above — the island does **not** put the stand-in back. A **magenta wireframe
cage** stands exactly where the prop should have been, at the declared
envelope, turning, with a label naming the slot and the reason; a banner
repeats it on the page.

The fallback was the old behaviour and it was the worst available one: the
island looked finished, the prop was simply absent, and *absent is
indistinguishable from never-placed*. Nobody wearing a headset is reading a
console warning. A prop that fails should be the most obvious thing in the
frame.
