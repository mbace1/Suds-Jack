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

### Hyper Dagger (`hyperdagger/`)
A first-person **Devil Daggers × HYPERDEMON homage** on Three.js r167 — survive a swarm
of **voxel** skulls on a neon disc in a synthwave void; survival time is the only score.
Enemies are string-art voxel models (one `InstancedMesh` per enemy, per-voxel colors) and
deaths explode them into **physical voxel debris** (gravity, floor bounce, tumble) from a
shared pool. Combat: **hold to stream daggers**, gems drop from heavy kills and level
the daggers up (LV 3 = **homing**); enemy roster is skulls, crowned skulls, splitter
skulls (burst into minis), brutes, drifting totem spawners (which also pulse **jumpable
orb rings**), **watcher** drones firing aimed orb volleys, thorn spikes erupting under
the player, **blinkers** that teleport toward you, a **segmented serpent** whose rings
gib individually (its pale **ghost** variant is armored from the front — shoot the rings
from behind), spider gem-thieves that also lay **egg sacs** (hatch 2 skulls unless shot,
harmless to touch), and the Leviathan boss. Returnal-inspired bullet-hell: enemy orbs are slow, readable,
and the **dash phases through projectiles** (never bodies). Movement: **jump + double
jump**, dash with FOV kick (requests buffered 0.25 s across the cooldown). Art is **black & white with dark red as the only contrast color** — the neon grid
just stops at the arena edge (no barrier visual). Desktop: pointer-lock mouse look,
**fire is automatic while moving** (hold LMB when still), Space jump ×2, Shift dash,
Esc = pause/options. Touch: dual on-screen sticks — left moves, right looks; **firing is
automatic while moving** (or while the look stick is held); **tap either stick = jump ×2,
flick either stick = dash**; ⏸ button top-right. The pause menu carries persisted
options (`hyperDaggerOpts`): game speed ×1/1.25/1.5, FOV 70/80/90, look sensitivity, and smear/
shake/chroma toggles. Touch play requests fullscreen + landscape lock on start. Onboarding
is paced across the first ~150s (one new enemy roughly every 15-20s) and recurring spawns
tighten over time; the death screen recaps what killed you, a kill breakdown, and your
last 10 run times. No build step — open `hyperdagger/index.html` (three.js via jsDelivr
importmap, same as toko-drop). Same `gh-pages` deploy caveat as paperboy.

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
hyperdagger/    # Hyper Dagger — FPS Devil Daggers × HYPERDEMON homage, voxel enemies
  index.html
  js/
    main.js     # Scene (grid arena, rainbow sky, afterimage/bloom/chroma), director, combat, HUD
    voxel.js    # String-art voxel models + parser, VoxelSprite (InstancedMesh), DebrisPool physics
    enemy.js    # Skull/Wraith, Brute, Totem (spawner), Serpent (chain), Spider (thief), Leviathan
    daggers.js  # Object-pooled dagger projectiles; homing steer at LV 3; segment hit tests
    gems.js     # DD-style gem drops: ballistic scatter, hover, player magnet, collect
    player.js   # First-person controller: yaw/pitch, WASD/stick strafe, jump, dash, head-bob
    input.js    # Pointer-lock mouse + WASD, or dual touch sticks + DASH/JUMP btns; tap-vs-hold fire
    audio.js    # WebAudio synth kit (fire/shotgun/hit/gib/gem/levelup/dash/roar/death + drone)
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

## Hyper Dagger (`hyperdagger/`) — Architecture Notes

**Voxel pipeline (`voxel.js`):** `MODELS` defines enemies as string-art layers —
`layers[0]` is the bottom slice, each layer an array of rows, row 0 the *front* face
(mapped to +z so `Object3D.lookAt(player)` points the face at the player). Palette values
are hex ints, or `[r,g,b]` arrays with components > 1 for **HDR glow voxels** (eyes,
totem veins) that trip the bloom threshold while bone/body stays matte. `VoxelSprite`
bakes a model into one `InstancedMesh` (per-voxel `setColorAt`; hit-flash brightens
`material.color`, which multiplies every instance). `DebrisPool` is a single 1600-cube
`InstancedMesh`: gravity −28, floor bounce ×−0.38 with friction, Euler tumble, shrink-out
over the last 0.3 s; `burst(worldVoxels, …)` explodes a dead enemy's actual voxels
outward from their centroid plus the killing dagger's impulse.

**Combat:** hold LMB (or hold the right touch stick) = dagger stream. Weapon levels via
gems — `LEVEL_GEMS = [0,0,10,30]`, `WEAPON[lv]` sets stream rate / homing. LV 3 daggers steer toward the best target in a
~37° cone (`DaggerPool.update(dt, targets)`). Each dagger keeps `prev` position and
collisions use **segment-vs-sphere** tests so fast projectiles can't tunnel. Skulls take
knockback along the dagger direction (brutes mostly resist via lower `knock`).
Enemy → player kill test is against both torso and camera positions; totems don't kill,
they `player.pushOut(...)` as solids. Gems (`gems.js`) scatter ballistically, hover, then
magnet to the player inside 5.5 u.

**Spawn director (`main.js`):** all heavy spawns are **telegraphed** — an additive light
beam marks the spot for 0.7 s (`pending[]`), then the enemy appears. First-appearance
times are spread across the first ~150s so mechanics land one at a time rather than
piling up (each debut in `resetRun()`, each recurring cadence tightening via
`Math.max(floor, base - gameTime * rate)` in `director()`): totems (cap 6, slow orbit
drift) from t=0 every 24s tightening to 16s, exhaling skulls (global cap 46, 30% gilded
`Wraith` after 60s) at a tightening interval and pulsing an orb ring every 6s; **watchers**
(cap 3) from t=25 every 20s tightening to 12s; brutes from t=45 every 16s tightening to
10s; **thorns** from t=60 (0.9s sigil warning, lethal below `feet.y` 1.4) every 12s
tightening to 6s; **spiders** (cap 2) from t=75 every 30s tightening to 20s, laying an egg
sac every ~10s; **blinkers** (cap 3) from t=90 every 25s tightening to 14s; **serpents**
(cap 2) from t=100 every 45s tightening to 32s — every second serpent is a ghost; the
**Leviathan** from t=150, one at a time, respawning every 120s. Totem exhales roll
splitters (15%, > 45s) before crowned skulls (30%, > 60s). A `Serpent` is a controller
owning 12 `SerpentSegment` enemies (pushed into the main `enemies` array so the normal
collision loops apply); the head weaves around the player and dive-bombs every 8s,
surviving segments chain-follow at 0.95 u spacing, and each ring gibs + drops a gem
individually. Spiders skitter on the floor and eat loose gems — killing one refunds
everything it swallowed + 1. The Leviathan is a 60-HP god-head at the arena centre that
exhales skulls and every 9s drags the player toward itself for 1.8s (`player.nudge` at
7 u/s — walk or dash out); it drops 10 gems. A pairwise separation pass (skull/brute
only) keeps the swarm from collapsing into one blob.

**Death recap (`main.js`):** `killsByType` tallies kills by `e.type` (Wraith/Splitter/
MiniSkull all report `'skull'` — they never override the base type, so the breakdown
line only ever needs the handful of distinct enemy types) and `lastKiller` is
overwritten by every `playerStruck(sx, sz, killerType)` call, so on the fatal call it's
already the correct cause — no post-hoc reordering needed. `showDeath()` builds a
"felled by ___ · daggers LV_" line plus the kill breakdown, then reads/writes a
`hyperDaggerHistory` localStorage array (last 10 runs, newest first) and renders
`hist.slice(1, 9)` — skipping index 0, the run that was just pushed — as the "recent"
line, since showing the run you're already looking at the big stat line for is
redundant. TIME OUT (HYPER's clock hitting 0 in `step()`) bypasses the cause line
entirely rather than blaming a stale `lastKiller` from an earlier survived hit.

**Modes:** menu-button toggle, persisted in `localStorage` (`hyperDaggerMode`). PURE =
one-touch death (DD). HYPER = HYPERDEMON rules: `lifeT` drains in real time (start 30,
cap 60), kills add `e.score` seconds, an enemy touch costs 10 + `player.nudge`
knockback + 1.2 s `mercyT` i-frames, and 0 → `die(true)` = TIME OUT. Hi-scores are
per-mode (`hyperDaggerHi` / `hyperDaggerHiHyper`).

**Input quirks:** shooting is minimalistic — the stream is automatic whenever move
input is nonzero (`getMove()` length > 0.15), and holding LMB / the look stick fires
while standing still. A sub-250 ms / sub-12 px tap on EITHER stick = jump (works
mid-air for the double jump; a second finger tapping an occupied half also jumps); a
fast ≥40 px flick within the last 150 ms before release on **either stick = dash**
along the screen-space flick direction. No on-screen buttons —
touches that start on DOM controls (`button`, `#pauseBtn`) are left alone so the pause
menu stays tappable. Pointer-lock mousemove deltas with `hypot > 400` are dropped —
some browsers emit one giant bogus delta right after locking. On desktop the pause
button can't be clicked while pointer-locked (lock routes all events to the canvas) —
Esc is the pause path there; the button exists for touch.

**Render / feel:** ACES tone mapping + `EffectComposer` (`RenderPass` →
`AfterimagePass` 0.72 (HYPERDEMON motion smear) → `UnrealBloomPass` 0.7/0.45/0.6 →
chromatic-aberration `ShaderPass` → `OutputPass`); smear/shake/chroma each sit behind a
pause-menu toggle. Bloom is *selective* via HDR colors (white daggers/blade/crown, red
eyes/veins/gems exceed 1.0). A **trauma** value (kills, shotgun, dash,
death) drives camera shake + the chroma amount; dash and shotgun kick the FOV. The
first-person **voxel gauntlet** is a camera child (`scene.add(camera)` required) at
z −1.05 — closer and it smears into a slab at the screen corner; its glove is
checkerboarded because unlit same-color voxels read as one flat polygon. Death = red
vignette + slow-mo debris. Sky is a `BackSide` sphere: greyscale band shimmer over black with one dark-red ember
glow at the horizon (`fog: false`); the floor is a `CanvasTexture` white-on-black grid
on a circle of exactly `ARENA_R` — the grid simply ends at the edge, no barrier mesh. Death/menu/pause are DOM overlays; touch sticks
are drawn on the `#canvas-ui` overlay each frame. Hi-score lives in `localStorage` under
`hyperDaggerHi`. `window.__hd` exposes `{enemies, player, debris, daggers, gems,
serpents, debug}` (debug: `addGems(n)`, `spawnSerpent()`, `spawnSpider()`,
`spawnLeviathan()`, `getSchedule()` — the raw `nextXAt` timers, useful for verifying the
onboarding pacing without needing real-time simulation) for console tinkering and
automated smoke tests.

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
