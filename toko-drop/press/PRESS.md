# Toko Drop — press kit

Everything needed to put the game in front of people: copy to paste, shots to
upload, and the honest technical notes. Screenshots and GIFs in this folder
are captured straight from the running game (screenshots at 1280×720, GIFs
via `scripts/enemy-loop.mjs`).

**Play:** https://mbace1.github.io/Suds-Jack/toko-drop/
**Source:** https://github.com/mbace1/Suds-Jack

---

## One line

A twin-stick swarm survival game where every kill leaves a body — and the
bodies shoot back.

## Short description (itch.io "short description", ~200 chars)

Twin-stick swarm survival where the corpses fight back: 40 gel-bodied species,
six arcade tributes, a boost-only RUSH mode, and a WebGPU showpiece build —
free, in your browser, no install.

## Long description (store page body)

Toko Drop is a twin-stick survival game against a swarm of soft, gel-bodied
enemies — and the swarm doesn't stay dead where it falls. Kill something in
**CLOSE COMBAT** and its corpse spits an aimed burst, a fan, or a grazeable
ring back at you, in a dialect that matches what killed it. Standing in one
spot is never actually safe.

- **The swarm reads your gun.** Movement traits are per-species data, not one
  global behavior toggle — chasers commit, snipers kite, packs school, and a
  handful of specialists (a puller, an ambusher, a wall-weaver) show up on
  their own schedule as a wave director escalates composition and cadence
  over the run, not just enemy count.
- **RUSH MODE flips the whole ruleset.** Boost replaces the dash: held, it's
  invulnerable and kills on contact — but firing cancels the shield, so the
  gun is the fallback, not the plan. Heat is the shared cost between boosting
  and shooting; overheat locks you out until it cools. Levels move both ways,
  so a hit genuinely eases the next wave, and a clean run stamps a tier
  (C through S) on a per-level ladder. Pick one of four abilities before the
  run, and read any level's exact grade targets, roster and pressure off the
  ladder screen first.
- **ROGUELIKE** run-upgrades, **DAILY SEED** runs (everyone faces the same
  seed, with a rotating daily modifier), and **CLOSE COMBAT** (no guns —
  every body hurts, and every corpse strikes back) sit alongside the classic
  ruleset as full mode swaps, not settings.
- **Six arcade cabinet tributes** — TOKOTRON, GAUNDROP, BINDING, LOADOUT,
  KAIKKI, NEX DEUS — each a different genre wearing this engine: vector
  rescue-and-extract, dungeon delve, heist-with-witnesses, and a sixth that
  unlocks by playing the other five well. Each cabinet gets its own retro
  post-process pass (palette, scanlines, glow) and its own local high score.
- **A WebGPU showpiece build, right alongside the classic one.** Flip
  `WEBGPU (BETA)` and the same game runs on Three.js's TSL node-pipeline
  renderer: gel domes with real depth-varying refraction and wobble, corpse
  matter that pops and inflates on death, and a floor that visibly answers
  what's happening on it — darkening under the live swarm, ringing out at
  every kill, glowing warm under pickups. Adaptive WebGL2 fallback when a
  device has no real WebGPU device.

## Features

- **40 enemy species**, each with its own movement traits, revenge dialect,
  and (on the WebGPU build) its own gel-material behavior
- **RUSH MODE** — boost-only invulnerability, heat as the shared resource,
  a stamped S/A/B/C tier ladder per level, one of four selectable abilities
  (dump your heat as a burn, a no-heat panic clear, free boosting with a
  doubled chain, or reflect incoming fire back as your own), and a ladder
  screen that shows every level's grade targets before you climb it
- **ROGUELIKE** upgrades, **DAILY SEED** runs with rotating modifiers,
  **CLOSE COMBAT** (no guns, corpses strike back), **SMASH TV** door-rush
  — full mode swaps, mixable
- **Six arcade cabinets**, each its own genre and its own retro post-process
  look, gated behind an in-fiction unlock
- **WebGPU (BETA)** — a full TSL node-pipeline build of the same game,
  goo/gel shading past parity with the classic renderer
- **Plays with anything** — keyboard + mouse, gamepad (with haptics on
  supported hardware), or touch with dual sticks
- **Installable and offline** — a PWA that works with no connection after
  the first visit, cache-token discipline so a new release is never served
  stale
- **Accessibility** — reduce-motion (gates every full-screen flash and
  camera shake), haptics as its own independent toggle, volume + announcer
  volume sliders, three languages (EN/JA/FI)
- **Contextual death screen** — asks a rotating question about what actually
  killed you, next to a live specimen of it

## Controls

| | Move | Aim & Fire | Dash / Boost | Rush ability | Pause |
|---|---|---|---|---|---|
| **Keyboard + mouse** | WASD / arrows | mouse (auto-fires while aimed) | Space | Q | Esc |
| **Gamepad** | left stick | right stick (auto-fires while pushed) | A / RB / RT | X / LB | Start |
| **Touch** | left stick | right stick | RUSH: push the move stick past 86% of its travel | lower-left pad | top-center tap |

## Tech notes (for a devlog / HN-style audience)

- **Vanilla Three.js, no build step.** The classic renderer is r167; the
  `WEBGPU (BETA)` flag jumps the same game to r180's `WebGPURenderer` and TSL
  node-pipeline, with an adaptive WebGL2 fallback when a real WebGPU device
  isn't available. Nothing is painted twice — shader-dependent art exists
  only on the TSL side, and both renderers run the identical arena/gameplay
  math from shared `TUNING` data.
- **The wave director is data, not code.** Spawn composition, cadence and
  escalation live in `TUNING.waves` as tables a mode can swap wholesale
  (CLOSE COMBAT drafts an entirely different roster from the gun modes),
  proven byte-for-byte equivalent to the pre-refactor spawner across a
  multi-seed replay suite before it shipped.
- **Corpses aren't decoration.** A kill's revenge attack — aimed burst, fan,
  or ring — is derived from the species' own living bullet color and cached,
  so the palette rule ("revenge never wears living colors") can't drift out
  of sync as species are added.
- **The arena floor is three cheap fragment terms**, both renderers in
  parity: a rim vignette + grid falloff, a lit pool that follows the player,
  and fixed-size point arrays (live enemies, recent kills, live pickups) that
  are deliberately branch-free — an unused slot carries zero strength rather
  than a skipped loop iteration, so neither the GLSL loop nor the TSL
  node-graph ever needs dynamic control flow.
- **Bullets, splats and corpse debris are each one draw call** via
  `InstancedMesh`, regardless of how many are alive.
- **A service worker precaches the whole module graph** behind `?v=N` cache
  tokens that rotate every release — tokened responses are cache-first and
  immutable, so a new release is never served stale and an offline boot
  still has everything it needs.
- **Verification is headless and visual, not just "it compiled."** Every
  release runs a Playwright-driven smoke test (boots the game, exercises
  every enemy type) and a six-cabinet sweep (plays each cabinet, checks for
  mode leaks) before shipping; `scripts/enemy-loop.mjs` records a real
  looping GIF of an enemy behaving, straight from the shipped code, whenever
  a design question is better answered with a moving picture than a
  paragraph — the two GIFs in this kit were captured that way.

## Screenshots

| file | what it shows |
|---|---|
| `01-title.png` | Title screen — mode toggles (ROGUELIKE / RUSH / DAILY), control legend, language picker |
| `02-classic.png` | Classic run, wave 1: the gel-bodied swarm closing in |
| `03-rush.png` | RUSH MODE — level HUD, shotgun tag, the boost-only ruleset in motion |
| `04-nexdeus-cabinet.png` | The NEX DEUS cabinet mid zone-surge, its own neon retro post-process |

## GIFs

| file | what it shows |
|---|---|
| `charge.gif` | TORO charging — committed to the line, never sidesteps once it commits |
| `school.gif` | FLIT ×9 — a fish school moving as one body |

## Credits

Built by mbace1.
