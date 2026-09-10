# Hyper Dagger — the seasons

**A season is the arena's ART, declared the way a mode is.** `js/seasons.js`
is the registry; `js/modes.js` says what the body can do and what is trying
to kill it, `seasons.js` says what the world looks like and what the hand is
holding. They multiply: PURE in EMBER is the Devil Daggers spine on black
rock, MOVE in INCA is the bench under a white sky. SEASON sits beside MODE on
the menu, `?season=<id>` deep-links one, `hyperDaggerSeason` remembers it.

A season declares `sky` (base colour, horizon colour, how tight the band is,
a star intensity), `floor` (tint and glow — walls and slabs follow at the v40
ratio), `backdrop` (whether the manifest's monuments show, and how much of
their own bake they carry), `fog`, `dust`, `ground`, `pillars`, `platforms`
and `weapon`. `built: false` is a declaration that carries its palette and
names, in `todo`, what is still only words.

## The owner's brief (2026-09-05)

> **Season 1** should look like *this* [a screenshot of the current build: the
> Meshy skull against the black void, one low red horizon, dim stars, a black
> floor, the bone gauntlet in the corner] — but with **growing and moving
> platforms**, and **dark rock pillars that are hard to see**. The weapon for
> season 1 is a **needler** (fast nails) and a **shotgun** (a wider blast of
> the same nails).
>
> **Season 2** will be an **aquamarine Inca skullscape** with **goo** and
> **soft edges on large voxel platforms**, **waves of goo voxels breaking
> across the arena**. A **whiter background with some blue horizon**.

And on looking at the first build:

> The **3D models were made for season 1 specifically** and currently look
> quite weird. Platforms should be **lower mostly**, styled like **tile work
> that's crooked** or **shale rock that's dark**. **Lighting and vfx** could
> help smooth out the look. **3D assets shouldn't all float**, we may need
> **less objects** in general. And the shale piles should be **darker and
> shorter**.

And on seeing season 2 move (2026-09-10):

> **More rounded corners**, and **non-Newtonian liquids**.

And on seeing season 2 built (2026-09-08):

> **Enemies will be new** — aquamarine, green, yellows — but also slightly
> **Aztec** themed.

## SEASON 0 — VOID (the control)

The arena exactly as it was before seasons: the bare disc, the red horizon,
daggers in the hand, no monuments, no ground, the pre-v41 fog. Kept because
every A/B needs an A — the gate's legacy sections all run here, so the DD
spine is measured unchanged.

## SEASON 1 — EMBER (built, v41)

- **Dark shale pillars.** Five (the brief says fewer objects), standing in a
  radius band of 7–21 on the 26-unit disc, 3–7 high, a footprint of 1.1–2.4 a
  side, never closer than 4.5 to each other so there is always a way through.
  They stop the body, a wall run can use them, and they **stop a nail**
  (`walls.blocks` — a slab test in the wall's own frame, so a fast projectile
  cannot tunnel; the dagger loop asks it before the enemies).
- **Growing, moving platforms.** Four slabs that rise out of the floor over
  1.4 s, stand 14–24 s drifting a slow 0.9-unit orbit, sink in 1.1 s and
  re-seed somewhere else — never within 4.5 of your feet, never on the rock.
  A standing slab is a floor (`player.floorY`, the same value the track
  writes), its sides are walls that report `wallContact`, and a body standing
  on one is **carried** — the slab's motion this frame is added to the feet,
  or a moving floor reads as ice. **Low, mostly**: the height draw is
  SQUARED, so most sit at knee height and only a few reach 1.6.
- **Shale, and crooked tiles.** `js/shale.js` builds both the piles and the
  slabs: a stack of beds of uneven thickness, each nudged and turned off the
  one below, and on a slab's top a grid of tiles that do not agree with each
  other — one merged vertex-coloured geometry per piece, unlit, shaded by the
  cube ladder's per-face tones. The colours are LINEAR and small: 0.05 linear
  is a mid grey on screen, so the slabs live at 0.014 and the piles at 0.010.
  The foot of every pile leans toward the horizon's ember (`glow`), which is
  the only light the rock gets.
- **The monuments.** The Meshy environment pieces were made for this season
  and looked wrong in every wide shot — the gate a black arch with pink rims,
  a black blob with red veins filling the sky. Two causes, found by hiding
  pieces one at a time: the asset rig's white light is aimed at enemies in
  the disc and never reaches a piece at z −40, so only the crimson fills
  caught their edges; and the blob was the *mountain*, whose bake is
  near-black by nature, standing 34 high at −64. A season now owns the
  backdrop's look (`backdrop: {visible, emissive}` → `Backdrop.setLook`,
  which feeds the bake back through `emissiveMap` at 0.45 so the stone
  carries its own light and the fills become rims), the mountain stands at
  −88 and 30 high — a horizon, not a wall — and the manifest lost two stray
  obelisks (eight pieces → six).
- **Lighting and VFX.** The **fog** is the season's and leans to the
  horizon's ember (16→64) instead of pure black, so distance melts into the
  glow rather than into a hole; the drifting motes are **embers**; and a
  matte **ground** ring stands outside the disc under the monuments, because
  a piece on the void floats and a piece on a plane stands.
- **The needler.** `T.weapons.needler`: the same tap/hold grammar (tap = the
  shotgun, hold = the stream), but the projectile is a **nail** — a quarter
  of the dagger's girth, near twice its length, hot brass — the stream runs
  1.35× the tier's rate at 72 u/s in a tighter cone, and the shotgun is a
  **wider** blast (0.27 rad against 0.18) of the same nails at 104 u/s. The
  DD economy (burst DPS under stream DPS) only gets safer with the rate, and
  the gate asserts it. The stream tick sits a fifth higher in the audio.

The star field is in the sky shader (`uStars`), sparse and under the bloom
threshold: the first cut was a snowstorm against the reference's handful and
the threshold now passes a quarter of the cells it did.

**Seeded.** The rock and the slabs draw from the run's own rng, so a DAILY
arena is the same for everyone that day.

**The arena is cover (v42).** Rock and slabs stop an enemy orb, hold an enemy
body out of themselves so the swarm comes round rather than through, and a
gem lands on a slab instead of sinking into it. That is what makes the season
a change to how a run is played and not only to how it looks.

**Known gaps, on purpose.** Thorns still erupt at floor level under a body
standing on a slab, which makes the slab a way to dodge them — reads as
intended for now, worth watching. Nothing casts a shadow onto a slab, so a
body standing on one has no contact cue but its own height.

## SEASON 2 — INCA (built, v43–v44)

The brief: *an aquamarine Inca skullscape with goo and soft edges on large
voxel platforms, waves of goo voxels breaking across the arena, a whiter
background with some blue horizon* — and then *go really crazy on the art
style, think tech art*.

- **The sky.** Whiter, kept under the bloom threshold, with a saturated blue
  band at the horizon, a **haze** and a pale **sun** in the shader (`uHaze`,
  `uSun`, `uSunDir`), no stars. The fog is pale and long (20→90) so the
  horizon melts into the white.
- **The floor.** An aquamarine grid on dark water (the texture is near-black
  with bright lines, so the tint only shows where the glow lifts it — a
  bright floor would cost the enemies their silhouettes under a white sky),
  with a **caustic** crawling on it: three sine fields in world space,
  thresholded, the same term the gel carries.
- **Gel** (`js/gel.js`). The one material in the game that pretends to be
  lit, the cheap way: fresnel rim, caustic, one-sun specular, vertex wobble,
  all on a `MeshBasicMaterial` through `onBeforeCompile`, world space, no
  lights. The bodies start DARK (deep 0.012/0.09/0.11) and the shader makes
  them bright — a body that starts pale ends white, which the first two cuts
  proved. The rim is what blooms, and only at edges.
- **The goo wave** (`js/goo.js`). A travelling height field over the disc,
  cut into voxels: a crest sweeps across, rises along a long back, leans into
  its own travel as it steepens, and drops down a short steep face — a
  breaking wave is asymmetric, and a sine is not one. A ripple runs along the
  crest so it reads as a sea rather than an extruded curve; the cubes SNAP to
  the cell grid in y as well as x and z, because goo made of voxels only reads
  as voxels if it steps; and **the lip sheds loose cubes ahead of itself**
  through the debris pool — that is the break. A random phase at build, so a
  run opens on a sea already moving.
- **What it is to play:** a moving floor. `heightAt` answers the crest height
  anywhere, the loop hands it to the player the way the slabs do, and a body
  standing on it is **carried along the wave's direction** — you ride it. The
  higher of slab-or-crest wins, so a wave rolling past a slab cannot drop you
  through it. **It does no damage,** deliberately: whether the trough should
  hurt is a design call nobody has made.
- **Soft edges on large voxel platforms.** Four LARGE slabs (5–8 a side) that
  grow slower and stand longer, built as **mounds** of goo cubes — columns on
  a grid, the height a rounded dome (1 − r⁴)^0.6 — in the gel material. Every
  piece is still a cube; the silhouette is soft.
- **Rounded, and non-Newtonian** (v47). Every gel piece is a **rounded box**
  (`gelBox`), overlapping its cell so a mound is one body with soft creases
  rather than a tray of eggs — and rounding cost the fresnel rim half its
  strength, because a rounded cube curves away from you everywhere a flat one
  did not. The goo is **shear-thickening**: struck fast it is nearly a solid
  (`GelSpring` raises its own stiffness with the strain rate), and a body
  **standing still on it sinks through** while a body **running across it is
  held**. That is the season's verb — the wave was a ride, and riding it is
  now something you do. Worked hard, the goo goes pale and matte; left alone
  it is dark and wet, and the sea carries that per cube so the breaking face
  is solid while the swell behind it is liquid.
- **Gel and goo physics** (v46, from Toko Drop's `enemy.js`). A mound
  **gives way**: a squash spring (spring 0.24, damp 0.86, `landSquish`
  0.32) on its height — land on it and it squashes, volume kept, leave it
  and it springs back, a nail makes it flinch; your feet stay on it while
  it moves so the body rides the recoil. The sea **splashes**: a nail
  crossing the surface or a body landing on the water spreads a ring that
  widens and fades — the splash itself on flat water. And the gel **bleeds
  light**: the satin subsurface term, the sun behind a body lighting it
  from within.
- **The skullscape** (`js/inca.js`). No Meshy art exists for it, so it is the
  game's own string-art skull at ×22, half-buried just past the rim, turned to
  face the arena, tinted dark aquamarine so it is a silhouette against the
  white sky with its ember eyes burning; and stepped **terraces** further out,
  a ziggurat skyline through the fog. Nothing there collides.
- **The roster** (`js/roster.js`, v45). The owner's new sculpts will come
  through the manifest when they are made; the colour is the season's now,
  for whatever body is in the slot. A **turquoise mosaic**: the bake's value
  kept, the hue handed out by band of lattice rows — turquoise / jade /
  turquoise / gold — with the seams stepped on alternate columns, a
  per-tessera jitter, gold eyes, no red anywhere. The Meshy skin wears the
  same banding in its own shader, so the skin and the cubes under it agree.
  A dark jade body with gold in it is also the answer to bone against a
  white sky.
- **Seeded** like the rest of the arena: a DAILY sea breaks the same way for
  everyone, under the same skulls.

Still open:

1. **The new season 2 sculpts** — aquamarine / green / yellow, Aztec — the
   recolour holds the slot until they arrive through the manifest.
2. **Decide what the wave costs you.** It carries; it does not kill.
3. **The Inca backdrop from real art**, if any arrives — through the manifest
   `env` seam (`backdrop.js`) with its own `backdrop.emissive` for the white
   sky. The skullscape is the game's own skull until then.

The bench for all of it is MOVE in INCA: nothing is trying to kill you, so
the only thing under test is the look.
