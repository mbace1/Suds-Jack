# Toko Drop

Twin-stick bullet-hell arena shooter built with Three.js and Web Audio.

## Play

Live at **[mbace1.github.io/Suds-Jack/toko-drop/](https://mbace1.github.io/Suds-Jack/toko-drop/)**

## Controls

|  | Move | Aim / Fire | Dash |
|---|---|---|---|
| **Keyboard** | WASD | Hold LMB toward target | Space |
| **Touch / Gamepad** | Left stick | Right stick | Release right stick |

**ESC** — pause · **E** — toggle eye style

## Modes

**Roguelike** *(default)* — choose an upgrade card after every wave cleared.  
**Arcade** — waves run back-to-back, no upgrade pick. Toggle on the title screen.

Death returns you to the title screen so you can start a fresh run.

## Enemies

13 enemy types: blobs, cubes, and specialists.  
Variants include **elite** (2× HP, 1.2× scale), **elite-lite** (1.5× HP), **twins**, and **groups**.  
Every **8th wave** spawns a boss-scaled enemy (3× HP, 1.5× size) with 2.5× wave budget.  
**Spike waves** (4th, 12th, 20th…) run 1.6× budget.

Mid-wave **cargo moth convoys** sweep the arena in sinusoidal paths — shoot them for drifting pickup drops.

## Upgrades

| Card | Effect |
|---|---|
| +1 HP | Gain one hit point |
| Speed Up | Move 20% faster permanently |
| Fire Rate Up | Shoot 20% faster permanently |
| Bigger Bullets | Bullets 30% larger |
| Dash Refresh | Dash cooldown −0.15 s |
| Nuke | Clear all enemy bullets instantly |
| Pierce | Bullets pass through enemies |
| Magnet | Pickups are attracted to you |
| Shield | Absorbs one hit, resets each wave |
| Dash Boom | Radial explosion on every dash |

## Changelog

See [VERSIONS.md](VERSIONS.md) for the full version history.
