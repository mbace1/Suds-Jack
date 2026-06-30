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

### Skltr — Neon Survival Roguelike (`skltr/`)
A **3rd-person action roguelike** built on Three.js r167, **rebuilt from scratch** around the
Returnal moment-to-moment feel (the `3PA Evolutionary Dossier` is the foundational brief).
**Art = "night mode"** — a **white hand-drawn sketch look on pure black** (Vib Ribbon): every
body is a black-filled shape wearing a **white `EdgesGeometry` outline**, lit by a soft bloom,
with a faint grid on black. The hero is a **big-eyed, long-eared bunny humanoid** (sketchy
white-line limbs holding a gun); enemies are **white-line critters** (skittering chaser, squat
spitting frog-turret, hovering bat-flyer, many-eyed boss) that all turn to face you.

**Gameplay-first, Returnal pacing:** an **over-the-shoulder free-look** camera that aims **in
every direction** (full 360° yaw + near-full pitch, so you can shoot up at flyers); fast WASD
movement; **hold-to-fire**; **Shift** sprint; and the **i-frame dash** (**Space** / DASH button,
short cooldown) as the core dodge through **slow, dense bullet-hell** — turrets fire radial
rings, flyers rain aimed clusters, the boss alternates 20-shot rings and wide fans. A
**5-tier Adrenaline** engine drives intensity: kills without taking a hit climb the tiers (each
escalating damage + fire rate) and **any hit instantly wipes it to zero**. A time-scaling
**spawn director** ramps enemy HP/damage/density through named phases (CALM → … → NIGHTMARE)
with periodic **boss** spikes. Permadeath; survive as long as you can — best time persists in
`localStorage` under `skltrBestTime`.

> Meta-progression (gold / chests / stacking items / teleporter-stage loop) was intentionally
> stripped in this rebuild to focus on the core combat feel; it can be layered back on later.

No build step — open `skltr/index.html` (three.js + addons via the jsDelivr importmap, same as
toko-drop / paperboy; uses `EffectComposer` + `UnrealBloomPass`). Keyboard+mouse (pointer-lock,
Arrow-key camera fallback) or touch (left-stick move, right-stick free-look + fire, DASH button).

> Note on deploys: published to the **`gh-pages` branch** as **`Skltr/`** — live at
> `/Suds-Jack/Skltr/`, linked from the gh-pages landing page. Copy the `skltr/` folder onto
> `gh-pages` as `Skltr/` to update it.

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
skltr/          # Skltr — neon survival roguelike (Returnal feel, white-sketch-on-black)
  index.html      # importmap (three + addons); near-black page
  js/
    main.js       # Night scene + bloom (EffectComposer/UnrealBloomPass), free-look OTS camera,
                  #   loop/states, spawn director + phases, 3D collisions, sparks, HUD
    shared.js     # Night palette, white-line glow()/makeEye() helpers, big-eared Bunny hero
    player.js     # Movement/sprint, dash i-frames, 3D aim+fire, health, 5-tier Adrenaline
    enemy.js      # White-line critters (chaser/turret-frog/flyer-bat/boss) + bullet-hell AI
    projectile.js # 3D object-pooled neon-faint projectiles shared by player & enemies
    input.js      # WASD + full free-look mouse (pointer-lock, Arrow fallback) + touch sticks/DASH
    audio.js      # WebAudio bleep kit (shoot/dash/kill/adrenaline/boss/over)
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
