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

### Neon Ronin (`neon-ronin/`) — Character-Swap Action Roguelike
A **third-person hack-and-slash action roguelike** in the spirit of Morbid Metal: instant
character swapping mid-combo, arena combat, pick-an-upgrade roguelike rooms. Art is
**deliberately simple low-poly** — every fighter is the same box-primitive humanoid
samurai-robot rig (`js/robots.js`) tinted per role — set in **dark caves lit by neon**:
near-black fog, emissive pillars/floor-rings that re-tint each room, `UnrealBloomPass`,
point lights only. No build step — open `neon-ronin/index.html` (three.js r167 from the
jsDelivr CDN via an importmap, same as toko-drop).

**Player frames (1/2/3 or Q to swap, shared 2.2 s cooldown):** KIRI (cyan katana,
balanced 3-hit combo) · GORO (magenta cleaver, slow 2-hit, huge arc + knockback) · SAYA
(lime daggers, 5-hit chain, fastest dash). Swapping detonates a 360° burst, grants brief
i-frames, and cancels the current swing — weaving swaps into combos is the core
mechanic. LMB chains combos (input-buffered), Shift/Space dashes with i-frames (**2
charges**, refilling one at a time), and slashes deflect enemy bolts caught in the arc.

**Combat verbs:** **RMB = heavy** (`poseHeavy`, 0.78 s, ×2.8 damage, wider arc, heavy
knockback + shake — slow and committed). **F = parry** (`poseParry`): a 0.45 s stance
whose first 0.24 s are active (`player.parrying`) and root you in place; active frames
negate incoming melee inside `combat.hurtPlayer`, stagger the attacker, and reflect any
bolt within 2.4 u back at the nearest enemy as a white `pBolts` shot. **R = ultimate**,
gated on a kill-charged meter (`player.ult`/`ULT_MAX`, +4 drone / +10 normal / +25
brute, +10 on parry): KIRI IAIJUTSU blinks forward cutting a line, GORO TECTONIC drops
three expanding quake rings, SAYA THOUSAND CUTS spins a rapid 360° flurry. Ults grant
i-frames for their whole duration and damage on fixed ticks (framerate-independent).
Touch gets ⛨ PARRY and ★ ULT buttons on the left; auto-combat mixes in a heavy every
4th opening.
Player frames use the `fancy` rig dressing (kasa hat, rope obi + scabbards, hakama
skirt, piston shins); enemies keep the leaner V-crest silhouette. The run cycle winds
up/down via `player.speedK` (stride, footfall bounce and forward lean all scale with
it — max lean at full speed, `poseRun` in `robots.js`), and heading banks at
`TURN_RATE` instead of snapping.

**Touch controls:** floating dual sticks — left stick moves, **flicking it in any
direction dashes that way** (flick = ≥30 px of stick travel inside 90 ms; the stick
must settle before the next flick registers), right stick orbits the camera as a rate
control (tap/lift = **jump**, again mid-air = **double jump**; jumping above y 0.9
dodges melee, slams and bolts). While touch drives,
combat is **automatic** (`input.autoCombat`): melee mode auto-swings/chains when an enemy
is in reach; ranged mode auto-fires bolts (from a second `BoltPool`, `pBolts`) at the
nearest enemy — toggled by the ⚔/➶ button above the right stick. Form chips double as
tap-to-swap buttons. Touch mode flips on at the first `touchstart` anywhere (window-level
listener) so pointer lock is never requested on phones; desktop keyboard/mouse is
unchanged.

**Enemies (`js/enemy.js`):** SLASHER (crimson katana, telegraphed slash — blade glow
ramps during windup), GUNNER (violet rifle, holds a ~9 u ring while strafing, 3-bolt
bursts from the pooled `BoltPool`), BRUTE (ember cleaver hulk, ground-slam AoE with an
expanding telegraph ring), DRONE (mob-tier swarmer, no telegraph, lunge-bite). Every
4th room is a brute room. Drones use a **separate cheap rig** — `buildMob` in
`robots.js`, 6 meshes with geometry *and* materials shared per accent (no per-rig
clones; flash swaps `chest.material` via `setMobFlash`) — so horde rooms stay cheap.
They arrive as **flood packs** (one shared spawn beam on the pack lead, scattered
around a shared center); live enemies are capped at 70 with overflow held in `pending`.

**Squad allies (`js/ally.js`):** the repeatable RONIN BANNER card recruits steel-blue
ally ronin (cap 6). They hold ring-formation slots around the player, auto-engage
anything within ~4 u, and die without ending the run — fallen allies stand back up at
the start of the next room (`Ally.revive`). **CHARGE** (`E` / the ⚑ touch button, 10 s
cooldown) sends the squad hunting anything in the room with +50% damage and +40% speed
for 4 s. Because allies are also valid prey, enemy AI targets a generalized
`ctx.targets` list (player + live allies, each `{pos, radius, isPlayer, ref}`);
`Enemy._pickTarget` chooses the nearest each frame and all enemy damage dispatches
through `combat.hurtTarget` (which routes to `hurtPlayer`, preserving aerial dodge and
SECOND CORE, or to `Ally.hurt`). Ally melee runs through `combat.allyStrike`, reusing
the same sector test as the player's `meleeStrike`, and its kills flow through
`combat.onKill` so score, streak, lifesteal and CHAIN ARC all apply.

**Run loop (`js/main.js`):** clear the room's pending+live spawns → +100×room bonus →
pick 1 of 3 cards → next room with the next neon hue and a bigger spawn budget
(`8 + 4×room`, capped 40; difficulty scalar also grows). Cards mix repeatable **stat
upgrades** with one-shot **modifiers** (orange `MODS` in main.js — flags on
`player.stats.mods`): STATIC WAKE (dash trail), ECHO BLADE (every 3rd strike
shockwaves), CHAIN ARC (kills detonate/cascade), BOLT MAGNET (deflects return fire),
BERSERK PROTOCOL (+40% dmg under 40% HP, via `player.dmgMul()`), SECOND CORE (one
revive per room, `player.reviveUsed`), OVERCHARGE SWAP (swap fires a bolt nova),
GLASS EDGE (dmg up / defense down). Owned mods leave the offer pool. The upgrade
overlay stacks its cards vertically on portrait/narrow screens (CSS media queries in
index.html). Kill streak (broken on taking damage) scales score up to ×3; death → run
summary; hi-score persists in `localStorage` under `neonRoninHi`. Longer-term model
and animation plans live in `neon-ronin/ROADMAP.md`.

**Combat resolution:** all damage flows through the `combat` object in `main.js` —
`meleeStrike` does XZ sector tests (range + half-angle; point-blank hits ignore the
angle) against enemies and bolts; `hurtPlayer` respects dash/mercy i-frames. Rigs are
posed procedurally every frame (stateless `poseWalk`/`poseSwing`/… in `robots.js`, called
after `poseStance` resets joints); accent/blade materials are cloned per rig so telegraph
glow (`setGlow`) and hit flash (`setFlash`) never bleed between robots, while geometries
are cached module-wide.

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
neon-ronin/     # Neon Ronin (character-swap action roguelike, low-poly samurai robots)
  index.html    # HUD (integrity bar, form chips, announce), overlays (start/pause/over/upgrade)
  js/
    main.js     # Scene + bloom, cave arena, 3rd-person camera, rooms/upgrades, combat resolver
    robots.js   # Box-primitive samurai-robot rig factory + stateless procedural poses
    player.js   # 3 swappable frames, combo melee, dash i-frames, swap burst, run stats
    enemy.js    # SLASHER/GUNNER/BRUTE state machines + pooled neon BoltPool
    effects.js  # Transient VFX (slash arcs, telegraph/shock rings, sparks, shards, spawn beams)
    ally.js     # Squad ronin — formation follow, auto-engage, CHARGE order
    input.js    # Pointer-lock mouse + WASD + touch sticks; buffered one-shots
    audio.js    # WebAudio bleep kit (slash/hit/kill/hurt/dash/swap/slam/rally/…)
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
