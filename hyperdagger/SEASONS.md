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

## SEASON 2 — INCA (the wave is built, v43)

What is in: a whiter sky kept under the bloom threshold, a saturated blue
horizon band, an aquamarine floor (the texture is near-black with bright grid
lines, so the tint only shows where the glow lifts it — the read is an
aquamarine GRID on dark water, not a teal floor), four LARGE slabs (5–8 a
side) that grow slower and stand longer, aquamarine shale under them, the
needler, no rock, no monuments — season 1's are season 1's.

- **The goo wave** (`js/goo.js`). A travelling height field over the disc,
  cut into voxels: a crest sweeps across, rises along a long back, leans into
  its own travel as it steepens, and drops down a short steep face — a
  breaking wave is asymmetric, and a sine is not one. A ripple runs along the
  crest so it reads as a sea rather than an extruded curve. Everything is one
  InstancedMesh and only the cells near the crest are drawn (about 250 of
  1600), and the cubes SNAP to the cell grid in y as well as x and z, because
  goo made of voxels only reads as voxels if it steps.
- **What it is to play:** a moving floor. `heightAt` answers the crest height
  anywhere, the loop hands it to the player the way the slabs do, and a body
  standing on it is **carried along the wave's direction** — you ride it. The
  higher of slab-or-crest wins, so a wave rolling past a slab cannot drop you
  through it.
- **It does no damage,** deliberately. Whether the trough should hurt is a
  design call nobody has made, and a hazard that kills before anyone decided
  it should is worse than one that does not exist yet.
- **Seeded** like the rest of the arena: a DAILY sea breaks the same way for
  everyone.

What is not, and what comes next:

1. **Soft edges on the large voxel platforms** — the slabs stop wearing shale
   beds and get a gel surface (a shader, not geometry).
2. **The Inca skull backdrop** through the manifest `env` seam (`backdrop.js`),
   with its own `backdrop.emissive` for the white sky.
3. **Readability under a white sky** — bone enemies against a light
   background lose their silhouette; the skins are Lambert-lit and the
   string-art bodies are unlit, so expect a pass on both.
4. **Decide what the wave costs you.** It carries; it does not kill.

The bench for all of it is MOVE in INCA: nothing is trying to kill you, so
the only thing under test is the look.
