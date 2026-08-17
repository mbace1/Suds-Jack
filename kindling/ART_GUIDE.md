# Betterment — Art Guide

**Status:** the artifact `BETTERMENT_GDD.md` §18.9 names as the next one to write
("Next major design artifact is the **Betterment Art Guide**"), written to the
handoff list in §17.

**This document invents nothing.** Every rule below is cropped from canon —
`BETTERMENT_GDD.md`, `BETTERMENT_GDD_AMENDMENT_KINDLING.md`,
`BETTERMENT_OWNER_DIRECTION.md` and `BETTERMENT_DESIGN.md` — and each one names
where it comes from. What this guide adds is **arithmetic**: canon says "growth
silhouettes" and "inherited trait zones", and a renderer needs to know how many
pixels that is. The numbers are the only new thing here, and they exist because
a rule that cannot be measured cannot be checked by a gate.

**Approved baseline** (GDD §17, verbatim): *crafted layered 2D illustration
first, retro game language second, modern mobile UX hierarchy throughout.*

---

## 1. The construction — layered 2D bonfire / forest / ruin
*(GDD §17 bullet 1; OWNER_DIRECTION "Visual direction — locked target".)*

The scene is built in **four planes, back to front**, and every element belongs
to exactly one:

| plane | holds | lit by |
|---|---|---|
| **sky** | night, stars, moon | nothing — the fire never reaches it |
| **far** | treeline, broken tower, the ruin going on past this room | moonlight only |
| **ruin** | wall sections, the collapse, the free arch, ledges, the gate | cold stone, warmed where the fire reaches |
| **near** | bonfire, ground, companion, branch pile | the fire, and only the fire |
| **front** | a cropped column, bracken | near-black silhouette, no interior detail |

**The subtraction rule.** Canon calls for "moonlit/cold environment against warm
orange fire" (OWNER_DIRECTION). So everything is painted from the COLD ramp and
warmed *toward* the fire by distance. Nothing in the world is warm to begin with.
Paint stone warm and the picture goes flat — the whole scheme is that the fire is
the only warm thing in it.

**The front plane must be cropped by the frame.** A foreground object that fits
inside the picture is a small object standing in the middle distance.

---

## 2. Crafty + retro pixel hybrid
*(GDD §17 bullet 2; OWNER_DIRECTION "Art construction".)*

Canon asks for craft language (paper, card, felt, cut stone, stitching) with
retro pixel edges over it, and — explicitly — **"large shapes and readable
silhouettes over small detail noise"**.

That last clause is the operative one and it is a *subtraction* instruction:

- **No surface texture below 3px.** Mortar lines, flagstone joints, fluting and
  scattered speckle all failed this in practice — every line cut into the stone
  competed with the fire and the picture got busier and less legible.
- **A mass is a silhouette plus one lit edge.** That is the craft read at this
  size: cut paper has an edge, not a gradient.
- **One colour change per row** where a ramp is needed (fire, sky). Banding is
  the retro half of the hybrid; smooth gradients are neither craft nor retro.

---

## 3. Readable mobile composition behind UI
*(GDD §17 bullet 3; OWNER_DIRECTION "UX — mobile first".)*

The scene is looked at on a phone, behind a HUD, in a dark room, for a few
seconds a day. Therefore:

- **The bottom third can be covered** — the fixed nav and the progress bar live
  there. Nothing load-bearing goes below y=104 of 128.
- **The fire is the anchor and sits left of centre**, so the ruin has somewhere
  to recede to and the companion has somewhere to stand that is not the middle.
- **The reward reads at a glance or it is not a reward.** Anything a day is
  supposed to reveal must change a shape, not a shade.

---

## 4. Companion base body + inherited trait zones
*(GDD §17 bullets 4 and 7; GDD §11 inheritance list.)*

Canon lists what may be inherited: horn shape, ears, body silhouette, eye colour,
ember/fire accents, markings, tail, craft-material motif, temperament, combat
tendency, rare mutation.

**The base body** is one mass (body) plus one mass (head), each a flat fill
inside a 1px ink line, lit from the hearth side with a pale crescent and one
ember rim. The light does not turn when the creature turns.

**Every inherited trait owns a ZONE**, and no two traits may write to the same
zone — that is what "trait modularity" (§17 bullet 7) means in a renderer:

| zone | trait | where |
|---|---|---|
| crown | horns | above the head outline |
| head sides | ears | the head's widest points |
| head front | temperament | eyes, brow, mouth |
| eye | eye colour | inside the eye pixels |
| body field | markings | the belly/back interior |
| body outline | body silhouette + combat tendency | the mass itself |
| behind | tail | opposite the facing |
| rim | ember accents | the lit edge and glow |
| surface | craft-material motif | fill treatment of the body field |

### THE 3-PIXEL RULE

**A trait that does not change the silhouette by at least 3 pixels does not
exist.** At 192×128 the companion is roughly 24px tall; a one-pixel horn is
0.5% of it and disappears at arm's length in a dim room, which is the only
condition this app is ever used in.

This is the rule the current lineage renderer breaks: sixteen gene combinations
render as sixteen near-identical creatures, because horns differ by 1–2 px at the
crown, ears by 1px, and markings by scattered single pixels. Only the ember
colour — which changes the *fur*, not an ornament — reads.

Corollary, and it is the same argument `BETTERMENT_DESIGN.md` G3 makes about
growth: **shape over scale, and shape over colour where both are available.** A
hash test proving "different gene combinations create different pixels" is not
evidence of a readable trait; different *pixels* is a far weaker claim than a
different *creature*.

---

## 5. Growth silhouettes
*(GDD §17 bullet 5; BETTERMENT_DESIGN G3.)*

Five stages, and each needs **one dominant silhouette change** rather than a
size step:

| stage | the change |
|---|---|
| spark | a tiny ember body, no ornament |
| wisp | the body lengthens into a flame/tail shape |
| tender | feet, ears and arms separate from the mass |
| keeper | broader body, and it is carrying something |
| elder | an unmistakable mantle / branching crown |

Growth may use scale *as well*, never scale *instead*.

---

## 6. Combat poses and enemy readability
*(GDD §17 bullet 6.)*

Canon requires enemy intent to be telegraphed before each action (GDD §13). The
art rule that follows: **the telegraph is a pose change, held for a beat, not a
colour flash.** A silhouette that changes before the hit lands is readable on a
phone at arm's length; a tint is not.

Combat tendency (guard-heavy, skill-focused, counterattacker, quick striker)
belongs to the **body outline** zone: stockier, narrower, more tail. It must not
also write to the crown or the face, or it collides with horns and temperament.

---

## 7. Living vs Kindled lineage presentation
*(GDD §17 bullet 8; AMENDMENT §§3–5.)*

The amendment is specific: a Kindled companion's remains "appear as a distinctive
ember / ash marker in the fire", and the companion moves to lineage history as a
**Kindled ancestor** carrying a portrait/silhouette and possibly an Ash/Ember
Trait.

- **Living** — warm fur, ember rim, catch light in the eye.
- **Kindled** — the *same silhouette*, drawn in ash greys with **one** ember
  point still in it. Identity is carried by the outline, so an ancestor is
  recognisably the creature it was; the difference is that the warmth is gone.
- The warning state before it (AMENDMENT §29, "subtle ash / ember warning
  marker") is a marker **in the fire**, not on the creature. Canon never dims,
  starves or saddens the companion, and `BETTERMENT_DESIGN.md` §2.1 forbids it.

---

## 8. World region palettes and materials
*(GDD §17 bullet 9.)*

One rule governs every region: **the region changes the COLD half; the fire's
warm ramp never changes.** The bonfire is the constant the player reads light by,
so a region is a different cold — birch ruin blue-grey, deep forest green-black,
ash waste violet-grey — under the same fire.

---

## 9. UI icon grammar
*(GDD §17 bullet 10; OWNER_DIRECTION "UX — mobile first".)*

- Goals, Flames, Bond, combat and lineage each get **one** mark, and marks are
  geometric rather than illustrative — they sit at 16–24px next to text.
- **The UI is not pixelated.** The scene is a pixel canvas; the interface around
  it is crisp DOM text and clean surfaces (OWNER_DIRECTION: "button surfaces
  should be comparatively clean and restrained").
- Room motifs may be borrowed into the chrome (ember caret, lantern for errands),
  but never at the cost of legibility.

---

## 10. Dark mode, and restrained surfaces
*(GDD §17 bullets 11–12; OWNER_DIRECTION "Dark mode is required and should be
the primary presentation".)*

Dark is the primary presentation and the parchment mode is the alternate. Neither
may carry information in colour alone (`BETTERMENT_DESIGN.md` U6), and every
control keeps the 44px target and AA contrast the gates measure.

**`prefers-reduced-motion` is part of the art, not an exception to it.** If the
system asks for stillness, the scene holds still — including single decorative
pixels. A room that keeps twitching for someone who asked it not to is a page
ignoring a preference.

---

## 11. What a gate can check

Everything above that is measurable, so the art cannot quietly regress:

1. Each of the five growth stages differs from its neighbour by ≥3px of outline.
2. Each trait value differs from its siblings by ≥3px **within its own zone**.
3. No two traits write to the same zone.
4. A full fire lights strictly more of the scene than every band below it.
5. Under `prefers-reduced-motion`, two frames one second apart are identical.
6. Kindled and living renders share an outline and differ in fill.
