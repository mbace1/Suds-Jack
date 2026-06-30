# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projects

### Suds Jack
HTML5 demo built with **Three.js / WebGL**.
Concept: "Bomb Jack x Suds 51 x Tempest 2000" — floating bomb-collection gameplay, soap/bubble aesthetic, Tempest 2000 psychedelic tube-shooter energy.
Build tooling: TBD — update this file once chosen and add dev/build commands.

### Paper Route — Dawn Run (`paperboy/`)
A **Paperboy clone** built on Three.js r167 with an **isometric, flat-shaded homage to
the original Paperboy art** — orthographic 3/4 camera, bright sunny-day palette (sky-blue
backdrop, grey road, green lawns, cube houses with pitched roofs, a little BMX kid in a
yellow helmet). It renders **flat and unlit** — `MeshBasicMaterial` solid colours, **no
lights, shadows, fog, bloom, chromatic-aberration or gel transmission** (those belong to
toko-drop) — for a deliberately 2D poster read. The whole colour scheme lives in
`paperboy/js/palette.js` so it re-tints in one edit. Endless auto-scrolling route;
deliver to the teal subscriber houses, dodge road hazards, refill from blue bundles,
survive 3 crashes. No build step — open `paperboy/index.html` (three.js loads from the
jsDelivr CDN via an importmap, same as toko-drop).

> Note on deploys: the published site is served from the **`gh-pages` branch** (a
> separate curated site root that already holds `toko-drop/`), **not** `main`. Demo
> updates must be copied onto `gh-pages` to go live at `/Suds-Jack/paperboy/`.

### Ribbon — Minimalist Survival Roguelike (`ribbon/`)
A **3rd-person action roguelike that plays like Risk of Rain 2**, built on Three.js r167
with a **minimalist vector look** — a pure-white void, white `MeshBasic` bodies with black
`EdgesGeometry` outlines, a grey ground grid, and a small accent palette (teal = you, red =
enemies, amber = gold/chests, violet = teleporter). Over-the-shoulder 3/4 camera; WASD move
+ mouse aim, hold-to-fire, sprint, jump, and **four RoR2-style skill slots** — M1 primary,
M2 piercing slug, Q i-frame dash, R radial nova (each on its own cooldown).

Core loop: a **spawn director** trickles in melee/ranged/brute enemies (floating HP bars)
whose HP and damage **scale continuously with a difficulty clock** (time + stage), shown as
RoR2-style tiers (EASY → … → HAHAHA). Kills bank **gold**; spend it on **chests** that roll
**stacking passive items** across common/uncommon/rare tiers (damage, attack speed, crit,
forks, pierce, lifesteal, max HP, regen, gold) — items combine into your run's build. Each
stage has a **teleporter**: engage it to spawn a **boss** and a horde, hold the ring to
charge it to 100%, then warp to the next, harder stage. Permadeath; furthest stage persists
in `localStorage` under `ribbonHiStage`. No build step — open `ribbon/index.html` (three.js
via the jsDelivr importmap, same as toko-drop / paperboy). Keyboard+mouse (with Arrow-key
camera fallback) or touch (left-stick move, right-stick aim/fire, on-screen skill buttons).

> Note on deploys: published to the **`gh-pages` branch** as **`Skltr/`** — live at
> `/Suds-Jack/Skltr/`. Copy the `ribbon/` folder onto `gh-pages` as `Skltr/` to update it.

### Toko Drop — Gelatin Bullet-Hell Twin-Stick Shooter
Top-down arena twin-stick shooter. Primary development is in **Unreal Engine 5.4** (started from the Top Down template), with a potential HTML5 prototype / Godot port planned.

**Pillars:** twin-stick controls, bullet-hell enemy patterns with deliberately slow enemy movement, roguelite run-based progression, gun upgrade trees, gelatin/clay visuals (translucent wobbling materials, destructible chunks, colorful puddle decals).

**Current UE5.4 state:**
- Player pawn: `BP_GelPlayer` (Character-based, static mesh + `M_Gelatin` material, set as Default Pawn in `BP_TopDownGameMode`)
- Weapon: `BP_Weapon` (Actor-based, basic firing logic, spawned at a character weapon point)
- Enemy: Blueprint class with basic "move toward player" AI
- Mostly Blueprint-driven; open to C++ for performance-sensitive paths (bullet counts in bullet-hell can get heavy)

**Systems still to build:**
1. Weapon system + upgrade trees
2. Enemy bullet-hell patterns (spiral, spread, ring, etc.)
3. Arena + procedural/roguelite run generation
4. Roguelite meta-progression (unlocks, between-run upgrades)
5. Gelatin VFX: vertex displacement wobble, destructible chunks, puddle decals (Niagara + material functions)
6. HUD: health, score, run state

## Repository Structure

```
suds-jack/      # (not yet scaffolded)
toko-drop/
  index.html
  js/
    main.js     # Three.js scene, game loop, collision, wave management
    input.js    # Virtual joystick (touch) + WASD/mouse fallback
    player.js   # Player movement, dash mechanic, firing
    enemy.js    # Enemy class — 4 bullet-hell patterns, each with distinct color
    bullet.js   # Object-pooled bullets (300 cap, shared pool for all bullets)
paperboy/       # Paper Route — Dawn Run (Paperboy clone, toko-drop art, new palette)
  index.html
  js/
    main.js     # Scene + render pipeline (bloom/chroma/ACES/IBL), loop, collisions, HUD, states
    palette.js  # Central warm-dawn colour scheme (single source of truth for all tints)
    world.js    # Route streaming (houses/hazards/pickups) + cull, paper→house resolution
    player.js   # Gel rider + low-poly bike, steer/throttle, lean, crash mercy, ghost trail
    paper.js    # Object-pooled thrown papers with arc/gravity physics + landing detection
    input.js    # Touch stick (steer/throttle) + two throw buttons; WASD/ZX keyboard fallback
    audio.js    # WebAudio bleep kit (throw/deliver/smash/pickup/crash/day-clear)
ribbon/         # Ribbon — minimalist survival roguelike (RoR2-style, vector look)
  index.html
  js/
    main.js       # Scene, 3rd-person camera, loop/states, spawn director + difficulty clock,
                  #   collisions, teleporter/stage loop, HUD (bars, skills, inventory, prompts)
    shared.js     # Vector materials/palette, outlined-box helper, procedural Figure (player+enemies)
    player.js     # Movement/sprint/jump/dash, 4 skill slots + cooldowns, item-derived stats, health
    enemy.js      # Enemy archetypes (grunt/gunner/brute/boss), chase-and-attack AI, time-scaling
    projectile.js # Object-pooled projectiles shared by player & enemies (crit/pierce/lifesteal)
    items.js      # Stacking passive items (3 rarities) + rarity rolls + stat resolver
    world.js      # Arena grid/boundary, gold chests, teleporter event + charge logic
    input.js      # WASD+mouse (pointer-lock, Arrow fallback) + touch sticks/skill buttons
    audio.js      # WebAudio bleep kit (shoot/skills/kill/gold/chest/teleport/boss/over)
```

## Toko Drop — Architecture Notes

**Entry point:** `toko-drop/js/main.js` sets up the Three.js scene, wires input/player/enemy/bullets together, and runs the game loop.

**Controls:** Virtual twin-sticks (left half / right half of screen). Right stick release triggers a **dash** with i-frames. Desktop fallback: WASD move, hold LMB + mouse to aim and fire, Space to dash.

**Enemy patterns** (all four spawn simultaneously per wave, each with a unique color):
- `Pattern.RING` — orange, radial burst of 10 bullets every 2 s
- `Pattern.SPIRAL` — purple, rotating single shot every 80 ms
- `Pattern.SPREAD` — blue, 5-bullet aimed cone every 1.5 s
- `Pattern.ALTERNATING` — green, alternates ring burst and direct aimed shot every 1.1 s

**Bullet pool:** `BulletPool` pre-allocates 300 `THREE.Mesh` instances. `spawnDir(x, z, dx, dz, isPlayer, color)` pops from pool; `recycleAt(i)` splices active array at index `i` (always iterate backwards when recycling mid-loop).

**Dash:** 0.18 s at 26 units/s, 0.9 s cooldown, invincible during dash. Direction uses last aim direction if stick was released before movement.

**Wave progression:** when all 4 enemies are dead, `spawnWave()` removes old meshes from scene and spawns fresh enemies at `0.6 × HALF` radius in a cross pattern. Wave counter displayed in UI.

## Paper Route (`paperboy/`) — Architecture Notes

**Coordinate system:** forward = −z (the bike auto-advances into −z); +x is right. The
road, lawns, and kerbs are long static meshes re-centred on `player.position.z` every
frame, and the road's lane texture scrolls via `roadTex.offset.y` to sell the speed —
so the world is effectively infinite without moving the geometry.

**Camera / art:** a fixed-angle `OrthographicCamera` offset by `ISO_OFF` from the bike
gives the isometric Paperboy read; the route rolls mostly *up* the screen with a slight
rightward lean. Rendering is a plain `renderer.render` (no `EffectComposer`) with
`NoToneMapping`, and every mesh is **unlit `MeshBasicMaterial`** — no lights, shadows or
fog — for a flat 2D look. House "flash" on a delivery/smash is a colour lerp toward white
(`bodyMat.color.lerp(_WHITE, k)`), since `MeshBasic` has no emissive channel; `baseColor`
is updated on delivery so the house stays green after the flash settles.

**Streaming (`world.js`):** houses (both kerbs), hazards, and pickups spawn ahead of the
bike (independent z-cursors advancing toward `playerZ - SPAWN_AHEAD`) and are culled +
disposed once well behind. Houses are randomly subscriber (~55%, mint) or not (coral).
Each house carries a delivery zone `{ zoneX, z, zoneR }` near its mailbox.

**Throw → delivery:** `paper.js` is an arc-physics pool — `throw_(x,z,side,speed)` launches
a paper with lateral velocity toward `side`, slight forward lead, and gravity. On landing
it's flagged; `main` polls `papers.freshLandings()` and calls `world.resolvePaper(p)`,
which finds the nearest same-side house within `zoneR`: subscriber → deliver (250 ×
streak), non-subscriber → window smash (100). Tuning that matters: `THROW_VX`,
`HOUSE_X`/`zoneX`, and `zoneR` jointly set the deliverable lane band — land-x ≈
playerX + THROW_VX·flightTime must fall within `zoneX ± zoneR`, so the rider delivers
from the matching lane, not dead centre.

**Crash / lives:** `world.hazardHit()` returns an overlapping live hazard; a hit calls
`player.crash()` (mercy i-frames + flicker, returns false while invincible to avoid
double-hits), costs a life, breaks the streak. 0 lives → game over → auto-restart.

**Days:** every `DAY_DIST` (130 m) increments the day, bumps `player.setBaseSpeed` and
`world.setDifficulty` (hazard density + car speed), and awards a bonus. Hi-score persists
in `localStorage` under `paperRouteHi`.

**Controls:** desktop A/D-←/→ steer, W/S throttle, Z/X (or M) throw left/right, Space
throws toward the lean side, Esc pause. Touch: left-half stick (x = steer, y = throttle)
+ on-screen ◀ ▶ throw buttons whose hit-rects live on `InputManager` and are drawn by the
HUD.
