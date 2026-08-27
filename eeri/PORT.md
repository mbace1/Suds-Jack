# EERI — the seam with the Godot port

Owner's direction, 2026-08-21:

> Eeri now has a separate repo where the **Godot port** is produced from
> your version updates. **JavaScript is aimed at testing VERTICAL and
> Godot the LANDSCAPE formats.**

So there are two builds of one game, and they are not a fork: this one is
upstream. What follows is what crosses between them, and — just as
important — what does not.

---

## 1. The split, in one line each

| | JavaScript (this repo) | Godot (the port repo) |
|---|---|---|
| **format under test** | **vertical / portrait** | **landscape** |
| **role** | upstream: the design is authored here | the port, produced from releases here |
| **canon for** | rules, numbers, level layouts, pacing | its own rendering, framing and input |

Both builds ship both orientations — this one already has a Game Boy DMG
face plate in portrait and an arcade control-panel strip in landscape
(`js/main.js`, `padplate_portrait` / `padplate_landscape`). The direction
is about **where each format is judged**, not about which one exists.
Portrait questions — is the room readable on a tall phone, does the HUD
clear the plate, is the reach budget still honest when the camera pulls
in — get answered here. Landscape questions get answered in Godot.

---

## 2. What the port reads: `spec/eeri.json`

**Prose is a fine way to say why something changed and a terrible way to
carry a number.** `VERSIONS.md` says the dig stroke is 0.46 s in a
sentence; a port that reads that sentence has copied a number by hand,
which is the same class of failure as a precache list a token behind the
page — and this repo has shipped that one more than once.

So the seam is a file, emitted from the modules the game itself reads and
never re-typed:

```sh
node eeri/tools/spec.mjs            # → eeri/spec/eeri.json  (~48 KB)
```

It carries four things:

- **`budget`** — `REACH` (step, gap, jump arc), `SPEED`, the gizmo
  constants, `MACHINE_SPEED` / `MACHINE_REACH`, and `RIDE`'s per-verb
  costs. Straight out of `js/parts.js`.
- **`clocks`** — the telegraph floor (`TELL` = 1.0 s, and it is about a
  six-year-old) and every enemy's own clock. If the port telegraphs a
  skitter in less than a second it has broken the game's one safety rule.
- **`levels`** — all twelve, **compiled**. Each carries its `grid`: one
  string per tile row, row 0 at the top, with `tiles.solidChars` saying
  which glyphs stop you. **A port does not need to reimplement
  `parts.js`** — the grid is the collision truth and every part (machine,
  robot, hazard, belt, tarp, hoist, pipe, ladder, water, bolts, golden,
  blueprint, checkpoint, flag, camera shots) is listed with its position.
- **`report`** per level — the report card's numbers (asks per ten tiles,
  worst dead-air run, learned-run seconds, share not spent riding), so
  the port can tell a level that plays thin from one that is quiet
  because it is teaching.

**It cannot go stale.** `test/rooms.mjs` regenerates the spec in memory
and fails if the committed file disagrees, the same way the arcade's
smoke gate asserts `sw.js`'s shell list. A spec that drifts from the game
is worse than no spec.

---

## 3. What the port does NOT read, deliberately

Everything about how this build *looks and feels on a screen*:

- `js/layers.js` — the cutout diorama, `LAYER_RECTS` × PPU at real z
- `js/fx.js`, `js/audio-fx.js` — the dev/FX pack (three.js and WebAudio
  are **injected**, never imported, and that is a JS-build concern)
- `js/craft.js`, `js/palette.js` colour values, `vendor/three.module.min.js`
- `js/glyphs.js` and the two pad plates — input surfaces are per-format,
  and format is exactly what the two builds are dividing between them
- `index.html`'s CSS, the orientation media queries, `assets/2d/*`

`ART_BRIEF.md` and `PHASING.md` still govern the *look* of both (Yoshi's
Crafted World 80 / Tropical Freeze 20), but they are read by people, not
by the port.

---

## 4. Shipping a version the port can follow

A release here is already three things — a top entry in `VERSIONS.md`, a
`?v=` token bump, and the six gates green. Porting adds one:

```sh
node eeri/tools/spec.mjs            # regenerate; commit spec/eeri.json
```

and one habit in the changelog: **when a number moves, name it.** "The
dig stroke is faster" costs the porter a diff; "`RIDE.dig` 0.7 → 0.46 s,
`STROKE` 0.46" costs them nothing, and the spec then proves it.

`spec.eeri.json`'s `version` field is read out of `VERSIONS.md`'s top
heading, so the port can always answer *which release am I looking at*
without being told.

---

## 5. Two things worth agreeing on early

**Versions.** This build numbers `vMAJOR.MINOR` from v15 and its `?v=`
module tokens are separate integers. If the port numbers itself
independently, say so out loud somewhere both repos can see — this
project has already had **three lineages all calling themselves v11**,
and "version numbers do not detect this" is written into its own house
rules.

**Who owns a rule change.** The design is authored here, so a tuning
change should land here first and reach the port through a spec bump. A
change discovered in Godot (landscape makes a jump unreadable, say) is
worth more than the rule it breaks — but it comes back here to be made,
or the two builds start disagreeing about what Eeri is.
