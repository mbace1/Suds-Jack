# Hyper Dagger — press kit

Everything needed to put the game in front of people: copy to paste, shots to
upload, and the honest technical notes. Screenshots in this folder are captured
straight from the running game at 1280×720.

**Play:** https://mbace1.github.io/Suds-Jack/hyperdagger/
**Workbench:** https://mbace1.github.io/Suds-Jack/hyperdagger/voxel-lab.html
**Source:** https://github.com/mbace1/Suds-Jack

---

## One line

A first-person arena survival game where the enemies are made of destructible
matter — and the corpses you leave behind get back up.

## Short description (itch.io "short description", ~200 chars)

Survive a swarm of voxel skulls on a neon disc in the void. Chew holes in armor,
shatter enemies into hundreds of pieces, and watch the bone-yard you've made
stand up and come for you. Time is the only score.

## Long description (store page body)

Hyper Dagger is a first-person arena survival game in the lineage of *Devil
Daggers* and *HYPERDEMON*: one disc, no cover, no health bar worth the name, and
a clock that only stops when you die. Your time is the only score.

What makes it its own thing is **matter**. Every enemy is a lattice of thousands
of voxels, and none of it is decoration:

- **Damage is physical.** Daggers knock real voxels out of a body. Holes open,
  edges erode, and when a hole severs a limb the piece breaks off and tumbles
  away — a connectivity check, not an animation.
- **Armor is a puzzle, not a health bar.** The **husk** hides its core inside a
  sealed shell. Daggers barely scratch plating; you have to chew a hole through
  it until the core is bared, and then it dies fast. You can hear the difference
  before you see it.
- **Death is a shower of parts.** A heavy enemy shatters into hundreds of
  individual pieces that fall, bounce, and settle.
- **The floor remembers.** Settled debris stays as a bone-yard. Shockwaves and
  your own dash kick it back into the air.
- **The bone-yard fights back.** The **revenant** cannot spawn on a timer — it
  rises only where your carnage has piled up, devouring the pile to assemble
  itself. Camp on a killing field and the field stands up.

Around that: a pressure director that introduces exactly one new threat at a
time, a style rank that rewards never standing still, daily seeded runs with a
shared leaderboard, and a full options menu down to voxel density.

## Features

- **Two rulesets** — PURE (one touch kills) and HYPER (a draining clock is your
  health; kills buy seconds)
- **~16 enemy types** introduced one at a time on a guaranteed schedule
- **Daily seeded runs** — everyone faces the same day, with a global top-10
- **Style rank D→SSS** that bleeds out if you stop moving
- **Plays with anything** — mouse+keyboard, gamepad (menus included, with
  haptics), or touch with dual sticks
- **Installable and offline** — a PWA that works with no connection after the
  first visit
- **Accessibility** — reduced motion, high contrast, FOV, sensitivity, and an
  automatic performance governor that adapts to weak hardware

## Controls

| | Move | Fire | Jump | Dash | Pause |
|---|---|---|---|---|---|
| **Mouse + keys** | WASD | automatic while moving (hold LMB when still) | Space ×2 | Shift | Esc |
| **Gamepad** | left stick | RT/RB or moving | A/✕ ×2 | B/○ | Start |
| **Touch** | left stick | automatic while moving | tap either stick | flick either stick | ⏸ |

## Tech notes (for a devlog / HN-style audience)

- Vanilla **Three.js r167**, no build step, no framework, no dependencies beyond
  a vendored copy of three. Open the HTML file and it runs.
- Enemies are **string-art voxel models** — text layers in source, parsed into
  one `InstancedMesh` each, subdivided ×64 at the default density (a dread skull
  is 5,824 voxels).
- Per-voxel animation runs entirely in a **vertex shader** shared by every
  sprite, so density costs nothing on the CPU.
- Debris, the bone-yard, daggers, orbs and gems are each **one draw call**; the
  whole projectile layer costs 3 instead of 500+.
- Settled debris retires into a **static** instanced mesh with no per-frame
  update, so a run's accumulated carnage is nearly free.
- Ships with a **Voxel Lab** — a browser workbench that imports the real engine
  code to author models, edit palettes with HDR glow, and test destruction.

## Screenshots

| file | what it shows |
|---|---|
| `01-hero-husk-breached.png` | A husk with its shell chewed open and the core blazing, standing in a bone-yard |
| `02-boneyard.png` | The floor after three heavy kills — carnage that stays |
| `03-swarm.png` | Mid-run: the swarm, a spawn telegraph, daggers in flight |
| `04-shatter.png` | One ×64 enemy shattering into ~486 individual pieces |
| `05-style-cyan.png` | The CYAN style preset — same game, re-hued accent |
| `06-voxel-lab.png` | The Voxel Lab workbench |

## Credits

Built by mbace1. Homage to *Devil Daggers* (Sorath) and *HYPERDEMON* (Sorath);
no assets from either — every model, sound and shader here is original and
procedural.
