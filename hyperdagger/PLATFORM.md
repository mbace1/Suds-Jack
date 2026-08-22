# Hyper Dagger — the platform

One fast-FPS core. **A mode is a declared experiment, not a branch.**

This is a laboratory for FPS jump-and-dash ideas, not a game with difficulty
settings. Bone Dust started as a Devil Daggers arena clone and shipped as a
directional bullet-hell dodger; the point of a bench is that the shipped game
is allowed to be a surprise. Out of these a single game may emerge, or several.

## The registry — `js/modes.js`

| Mode | Reference | Body | Pressure | Failure |
|------|-----------|------|----------|---------|
| **PURE** | Devil Daggers | 1 jump, no dash | fixed spawnset — identical every run | one touch, edge is void |
| **HYPER** | HYPERDEMON | 1 jump, dash, REAP | budgeted director + pressure ceiling | a draining clock |
| **TRUCK** | Clustertruck | 2 jumps, dash, glide | the track leaves the moment you touch it | the fall |
| **MOVE** | — | 3 jumps, dash, glide, air dash | none | none — it is a bench |

A mode declares `abilities`, `director`, `lethality`, `arena`, `edge` and its
own `hiKey`. `main.js` asks the registry; it does not ask `mode === 'pure'`.
**Adding an experiment is one entry and no new branches.** `?mode=<id>`
deep-links one, which is what makes a movement idea shareable for a playtest.

The gate walks `MODES` rather than naming modes. That is not tidiness: TRUCK
was declared in the v33 notes, was never imported by `main.js`, and existed
only on paper for three releases while every gate passed.

## The movement vocabulary

`jumps` · `dash` · `reap` · `glide` · `airDash` · `wallRun`

Extend it here and every mode can opt in immediately. `applyAbilities()` is
the single call that configures the body, so no mode can half-configure it.

- **glide** — hold jump while falling, gravity drops to `glideGravity`. On the
  way DOWN only: a glide that lifts is a double jump with extra steps, and the
  thing under test is hang time, not height.
- **airDash** — a charge that punches through the dash cooldown, airborne
  only, refilled on landing. Air control, never an infinite dash.
- **wallRun** — declared, **not implemented**. It needs walls and the disc has
  none; a court/course arena is the prerequisite. It is in the vocabulary so
  the next arena has a socket rather than a rewrite.

## Where a new idea goes

**MOVE first.** Nothing is trying to kill you there, so the only thing under
test is the body and a bad idea is obvious in ten seconds instead of hidden
behind a fight. Promote it into a lethal mode once it survives that.

## What every mode shares

The player body, the dagger gunfeel, input, the voxel damage model, and the
optional Meshy skins (`assets/manifest.json` — a kind listed there is loaded
and re-materialed as the alive-skin; a kind absent is never requested).

## The floor is a value

`player.floorY` is the surface under the feet: `0` on the disc, written per
frame by the track, `-Infinity` where there is no platform. That is how "the
floor left" is an ordinary fall rather than a special case — and it is what a
future arena writes to put geometry under the player.
