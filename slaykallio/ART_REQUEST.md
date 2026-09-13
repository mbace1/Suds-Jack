# Slay Kallio — the art request

There was never one. `turf/ART_REQUEST.md` is named from four places in this
project (`GDD.md` §2, `js/motion.js`, `js/plates.js`, `VERSIONS.md` ×2) and has
been doing the job by proxy, which works for the people and works for nothing
else — because **TURF has no rats in it.**

This file asks for the part TURF cannot supply.

---

## 1. The gap, counted

The roster is **33 figures**. Of those:

| | count | where the art comes from |
|---|---|---|
| people wearing TURF plates | 23 | `figures/*.png`, cast in `js/plates.js` |
| people with a full pose set | 2 of those 23 | `leopard`, `gunner` — seven frames each |
| **everything that is not a person** | **10** | **nothing — drawn in code by `js/puppet.js`** |

The ten are the owner's own brief, verbatim: *"enemies that are rats, mutating
blobs and other bum cardboard cutouts."* Two of the three nouns in that
sentence have no art.

```
rat · bin_rat · boss_rat          three rats, one of them a boss
blob · blob_spawn · tar_blob      three blobs
pigeon · gull · gull_king         three birds, one of them a boss
the_bear                          the act-two wall
```

`js/puppet.js`'s `rat()`, `slime()`, `bird()` and `bear()` draw them now, and
they are honest drawings — but they are the only figures on the bridge that are
not photographs of a made object, and in a row of three that is visible.
`HANDOFF.md` §9 says so in its own words: *"the mixed row now has three kinds of
thing in it."*

**Nothing else is being asked for here.** The people are cast, the backgrounds
are photographs, the cards are painted by `js/cardart.js`. This is ten plates.

---

## 2. The format — identical to a cast plate, because the row is one row

Every rule in `figures/README.md` applies unchanged, and it is short:

- **192×288 PNG, transparent**, one figure, standing.
- **Padded however it likes.** `js/plates.js` scans the INK bounds and stands
  the figure on the same baseline as everything else. Sizing to the FILE puts a
  rat in the air and the bear through the planks.
- **No baked lighting that has to survive.** The plate replaces the PAINT and
  not the process — `paintCutout` still runs newsprint, torchlight, nicks,
  fibre and grime over the top, and those passes are what make a figure belong
  to this bridge instead of to TURF's board.
- **One file per id**, named for the figure, cast by one line in `CAST`.
- No pose set. §6.

The working format before the cut is **flat solid magenta `#FF00FF`**, which is
a cutting key and not a colour choice: `kindling/tools/cut.mjs key` reads it and
`#FF00FF` must appear nowhere on the animal.

---

## 3. The style — TURF's technique, because two languages in one row is the
bug this project already fixed once

v29 moved the cards into the figures' register for exactly this reason: *"the
frame carried two art languages at once."* Ten creatures drawn in a different
technique would put the same fault back, one row lower.

So the style block is `turfGrim`, unchanged, and that is deliberate — these
animals are made **in the same shop** as the 23 people standing next to them:

> Pixel art in the register of Metal Slug Tactics' character sprites — not its
> cartoon war-comic content, its TECHNIQUE: a hard 1px black outline carrying
> the whole silhouette, flat colour fills with at most two shade steps per
> surface (a base tone and one shadow tone — no gradients, no soft airbrushed
> shading, no anti-aliased edges), strong colour-blocking readable at a glance
> from a distance.

Two things change from TURF's wording, and only two:

1. **The register is Kallio, not a Nordic crime board.** Wet asphalt, bin
   juice, canal water, sodium light. Municipal green, rust, tar, gull-white,
   pigeon-grey.
2. **No faction trim.** `PAL.PLAYER` cyan and `PAL.ENEMY` orange belong to
   TURF's two crews. Nothing on this bridge has a squad.

**Profile, facing +x.** This is a side-view game. Every figure faces across the
bridge and `body.scale.x = facing` mirrors the enemy row, so a three-quarter
turn reads as wrong twice — once for each facing.

---

## 4. The ten, each as what the PICTURE shows

Specs live one per file in `art-src/figures/*.spec.txt` so the prompt builder
reads them rather than embedding them; this table is the brief behind them.

### The rats — a size ladder, and they must read as one family

| id | scale | what it is |
|---|---|---|
| `rat` | 0.50 | An ordinary brown canal rat, side on, low to the ground, nose down and tail out behind. Small. Nothing special about it — it is the tutorial enemy and its job is to be legible at a third of a person's height. |
| `bin_rat` | 0.72 | The same animal grown wrong on refuse. Half again as big, coarse patchy fur, a bald scarred flank, one ear torn, teeth too long for the jaw. Still a rat and obviously the same species. |
| `boss_rat` | 1.00 | **The King Rat.** As tall as a man's waist, hunched up on its haunches so the silhouette has a *shoulder*, matted fur going grey, a tail thick as a rope, and — the one piece of staging — a **tangle of knotted tails and bin-wire behind it**, because that is the folklore and it is what makes him a king rather than a bigger rat. No crown. |

The ladder is the point: put the three side by side and the growth has to be
legible without reading a label.

### The blobs — mutating, and the mutation is the read

| id | scale | what it is |
|---|---|---|
| `blob_spawn` | 0.55 | A knee-high lump of yellow-green ooze, one eye or none, a couple of drips pulling away from it. Simple, and that is deliberate — it is the one that gets summoned. |
| `blob` | 0.95 | **Mutating Blob.** Chest-high, sagging, with things it has eaten half-visible inside it: a bottle, a can, a bicycle spoke. Bulges that are on their way to being limbs and are not there yet. Municipal green going acid. |
| `tar_blob` | 0.90 | The same body in **road tar** — near black, glossy, hard-crusted on top with the crust cracked and something warmer showing through. Its counter-move is `harden`, so the picture must be able to look armoured. |

### The birds — canal birds, not fantasy birds

| id | scale | what it is |
|---|---|---|
| `pigeon` | 0.42 | A city pigeon, side on, grey-blue with an oil-slick green neck, **one foot missing or stumped** the way half of them are. Small and unbothered. |
| `gull` | 0.66 | A herring gull, wings half-open and aggressive, head forward, yellow bill with the red spot. Dirty white. It is bigger than a pigeon by a lot and that has to show. |
| `gull_king` | 1.00 | **The Gull King.** A gull the size of a dog, wings wide, standing on something. Scarred bill, one clouded eye, feathers stained. `look.crown` is true in the data — a real crown would be a joke, so the crown is **a ring of rubbish wedged on the head or a bent bottle-cap circlet**, and it must read as something it found. |

### The bear

| id | scale | what it is |
|---|---|---|
| `the_bear` | 1.32 | **The Bear** — act two's wall, and 78–95% of act-two deaths (`HANDOFF.md` §6). It is **the Kallio park bear statue, walking**: weathered grey-green cast bronze or granite, moss in the seams, a plinth-flat underside to the paws, chipped where a shoulder has been knocked. The eyes are the only warm thing on it and they are lit. Enormous — it must dwarf the King Rat. Standing on all fours, side on, head turned slightly toward the viewer. |

The fantasy skin is a **lookup, not a second set** (`GDD.md`): `Imp`, `Bog
Ooze`, `Rook`, `Harpy`, `The Stone Bear` are the same ten pictures under
different names, exactly as the 23 people already are. **No second plate is
requested for the fantasy theme.**

---

## 5. The pipeline — one command per figure

```bash
# 1 generate  (needs GEMINI_API_KEY; gemini-2.5-flash-image, ~$0.039 a call)
node turf/tools/spritekit/build-figure.mjs slaykallio/art-src/figures/rat.spec.txt rat \
  | node scripts/lib/nano-banana.mjs > /tmp/rat.raw.png

# 2 cut the magenta
node kindling/tools/cut.mjs key /tmp/rat.raw.png /tmp/rat.keyed.png

# 3 fit to the cell, one common scale, bbox-centred, foot on the baseline
node turf/tools/spritekit/fitclip.cjs /tmp/rat.keyed.png slaykallio/figures/rat.png

# 4 gate it, ABSOLUTELY — not against its siblings
node turf/tools/spritekit/verify.cjs slaykallio/figures/rat.png
```

`verify.cjs` is the one that matters and the reason it exists is written in
`turf/tools/spritekit/TOOLING.md`: **every gate built before it compares frames
to each other, so two frames broken the same way agree perfectly.** That blind
spot hid 63 clipped frames. It checks each file on its own — ink on the border,
any surviving magenta, soft (anti-aliased) fraction, coverage inside
0.08–0.70 — and a creature set is exactly where a relative check would fail,
because a rat and a bear are *supposed* to disagree about everything.

Then one line each in `js/plates.js`:

```js
rat: 'rat', bin_rat: 'bin-rat', boss_rat: 'king-rat', ...
```

and `test/core.mjs` will fail if a named plate is not in the tree.

**They go in `figures/`, never `art-src/`.** A Slay Kallio deploy is the folder
minus `test/` and `art-src/`, so runtime art under `art-src/` arrives on the
site as a 404. `art-src/figures/` holds the **specs** and the raws; the ten
PNGs ship from `figures/`.

---

## 6. Not requested, and why

- **Pose sets for the ten.** `leopard` and `gunner` cost seven files each and
  they are people; a rat has no `attack-windup` that a still card plus
  `js/motion.js`'s lunge does not already carry. Ask again once a creature is
  the thing being watched.
- **A rear facing.** Nobody turns round. Seven files a character instead of
  fourteen, for the same reason `plates.js` gives.
- **A second plate for the fantasy skin.** The theme is a name lookup. Painting
  it twice would make it a second data set, which `GDD.md` explicitly refuses.
- **Replacing `js/puppet.js`'s creature painters.** They stay as the fallback —
  `paintCutout` falls through to them for any figure whose plate has not
  decoded, and that is what stops the art switch ever showing a blank plane.

## 7. The one that is not on this list

`figures/README.md`: *"`vex` and `leopard` are the only two women in the set and
both are now cast — so **a third woman needs new art, not a recast.**"* True,
still true, and a different request: it is a person, in TURF's shop, and it
belongs in `turf/ART_REQUEST.md` §8's production plan rather than here.
