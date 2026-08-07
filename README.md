# Suds-Jack

**Concept:** Bomb Jack × Suds 51 × Tempest 2000

A collection of WebGL experiments and a browser game, built as art-style references and playable demos.

Live preview: https://mbace1.github.io/Suds-Jack/

---

## The arcade — `index.html` + `hub/`

One page that carries **every playable thing in the workshop**, each cabinet
with a **Play** button and a **Feedback** button. No build step, no framework,
no image assets: each game's marquee is a 128×72 pixel canvas drawn in code
(`hub/art.js`) and tinted from that game's own palette — and seen through the
same curved, scanlined glass the Game of Life terminal uses, baked once at load
rather than run every frame. The page itself is that terminal: monospace, `>`
carets, `[ PLAY ]` brackets, and a status line with a three-colour screen
accent that tints the chrome while each cabinet keeps its own colour.

Adding a game is **two edits**: an entry in `hub/games.js` and a draw function
in `hub/art.js`. Nothing else in the hub knows any game exists. Each entry
carries a **`status`** — `active` games get the top of the page, `archived`
ones sit under their own heading, dimmed but still playable. One word moves a
game between the two.

An entry can also carry **`live: false`** — the cabinet is listed but there
is nothing to open yet, so Play renders as a dead `[ NOT UP ]` with a note
saying why instead of pointing at a 404. Feedback still works on it.

Also served at the short URL **https://mbace1.github.io/Suds-Jack/AnotherHUB**
— the same page with a `<base>` pointing at the site root.

**Feedback** (`hub/feedback.js`) is the same panel everywhere — 1–5 diamonds
plus optional words, tagged with which cabinet it came from. It reuses the
transport the games already ship (see `scripts/feedback-sheet.gs` on
`gh-pages`): a Google Apps Script `SHEET_ENDPOINT` if one is pasted in
(unlimited, but `no-cors`, so the answer cannot be read — that path reports
*sent-blind*, never *sent*), otherwise the Formspree form already in use by
`toko-drop`. Every note is written to `localStorage` first whatever happens;
an undeliverable one goes to an outbox and is retried on the next visit, one
at a time. Pressing Send having said nothing records nothing.

```sh
node test/hub-smoke.cjs      # 141 checks (needs playwright + its Chromium)
```

> **Catalogue entries carry `inRepo`.** During branch reconciliation, the
> production-only games were copied into the source tree at their existing
> paths. The field remains useful for partial checkouts and future experiments,
> but a complete checkout now contains every currently deployed cabinet.

> **Deployed.** Live at https://mbace1.github.io/Suds-Jack/ — the arcade is
> the site root as of 2026-07-26. The root used to be the Suds Jack game
> itself; that game lives at `sudz/`, which was already the **newer** of the
> two builds (the root copy predated the mobile touch controls), so it was
> left alone and the stale root assets were removed. `paperboy/` and the
> `goo-*.html` sketches had never been on `gh-pages` and were carried over
> with the hub, or four of its links would have 404'd. `gh-pages` remains the
> live branch until generated deployment is introduced; do not edit it as part
> of source reconciliation.

---

## `toko/` — Toko Midori Games™, the brand

The identity of the workshop. Open **`toko/index.html`** for the brand board:
every mark running live, the lockups, the sticker sheet, a glitch lab, the
sting, and SVG downloads.

Everything is **drawn in code from one geometry table** — there is no image
asset in this folder, and the SVG logo files are generated from the same arcs
the canvas strokes, so the file you hand a printer and the thing on screen
cannot drift apart. No build step, no dependencies: copy `toko/` next to a game
and it works.

- **The face** — four fat round-capped arcs and two stems. The mouth is two
  nested arcs opening up; each eye is one arc opening down with a stem dropped
  from the inside of its crown, and that stem is what cuts the two slots that
  make an eye an eye. Minimum size 44px, below which the slots close.
- **Two colours** — black `RGB(0,0,0)` and magenta `RGB(240,2,127)` / `#F0027F`.
  Both process primaries, so it prints anywhere with nothing to match. White is
  the paper, not a colour. The nine-colour sticker sheet is a print run, not a
  palette.
- **The lockup** — face, gap, three lines, ™. The logotype stands the same
  height as the face; that relationship *is* the lockup.
- **The counter** — a slim bar for the top of the arcade that opens into a
  conversation with Toko in the old Sierra idiom: portrait, typewriter text, a
  numbered list of things you can say (`mountChat()`). A hand-written dialogue
  tree in `toko/js/dialogue.js`, not a language model — no network call, ever.
- **The signature** — one import (`sign()`) puts the badge in a game's corner,
  under the HUD, taking no input. `toko-drop`, `paperboy`, `dropcabal` and
  `hyperdagger` are signed; `gameoflife` deliberately is not — it is the room
  where Toko takes the mask off.

Created by **美鳥十湖** — *Toko Midori*, The Game Creator.

Two caveats worth knowing: the face geometry is measured off the master artwork
rather than lifted from the original vector file, and **the logotype typeface is
the owner's licence and is not in this repo** — register it as the family
`Toko Grotesk` and every lockup picks it up. The board says so out loud until
you do.

Rules and construction notes: **`toko/BRAND.md`**. Gate:
`node toko/test/brand.cjs` (Playwright).

> **GO MAKE YOUR OWN.**

---

## Demos

### `goo-snowman.html`
WebGL fragment-shader snowman. Full-screen ray-marched SDF with Blinn-Phong + Fresnel + SSS lighting, two-pass bloom. Starting point for the goo shader series.

### `goo-surface.html`
SPH-lite (Smoothed Particle Hydrodynamics) goop on a flat surface. 64 particles, metaball WebGL render pass, amber/honey color. Tap to poke, drag to pull. Designed as a physics + art-style reference for porting to Godot 4 or Unreal Engine.

### `goo-flop.html`
Single gel cube that flops onto its side on a horizontal swipe. Physics: gravity-torque model (restoring below 45°, accelerating above), pivot-arc geometry for center tracking, squish on impact. Ray-marched SDF with Rodrigues rotation. Swipe right/left → cube tips and rests on its side; opposite swipe rights it.

### `paperboy/`
**Paper Route — Dawn Run.** A Paperboy clone built on Three.js r167 with an
**isometric, flat-shaded homage to the original Paperboy art** — orthographic 3/4
camera, bright sunny-day palette (sky-blue backdrop, grey road, green lawns, cube
houses with pitched roofs, a BMX kid in a yellow helmet). **Unlit flat `MeshBasicMaterial`
— no lights, shadows or fog** — with `NoToneMapping` for a flat 2D poster read; no bloom /
chromatic aberration / gel transmission (that look belongs to toko-drop). All colours live in `js/palette.js`
so the scheme re-tints in one place.

**Controls:** A/D or ←/→ steer · W/S throttle/brake · Z throw left · X (or M) throw right · SPACE throw to lean side · ESC pause  
**Mobile:** left-half stick rides (x = steer, y = throttle) · ◀ ▶ buttons throw

#### Gameplay
- Endless auto-scrolling paper route; the road/lawns follow the bike and a scrolling lane texture sells the speed
- Houses stream in on both kerbs — **teal = subscribers** (deliver to the mailbox for 250 × streak), **terracotta = non-subscribers** (smash a window for 100)
- Land a paper near a subscriber's mailbox zone to deliver; miss a subscriber as it scrolls past and your delivery streak resets
- Road hazards: passing cars (oncoming/moving), red hydrants, orange cones, brown hopping dogs — a hit costs a life (3 lives, mercy i-frames + flicker after a crash)
- 10 starting papers; grab blue **paper bundles** on the road to refill (+5, cap 25)
- "Day" milestones every 130 m ramp bike speed + hazard density and award a bonus; hi-score in localStorage
- Screen-shake trauma + spark bursts on deliveries, smashes, pickups and crashes

### `flashprince/`
**Flash Prince.** A cinematic platformer in the **Another World** idiom, crossed with
**Flashback** and the original **Prince of Persia**. Canvas 2D, no build step, no image
assets — and not a sprite in it: every frame, background and character alike, is a list
of **filled polygons** rasterised into a 320×192 buffer and then **quantised to sixteen
colours**, which takes the antialiasing back out and leaves the hard flat edges the
originals had. The character is a **rotoscoped skeleton** — a pose is thirteen joint
angles, a frame is those angles turned into eleven polygons, an animation is a short list
of poses with times against them.

**Controls:** ← → walk (**hold to run**) · ↑ jump, pull up, stand · ↓ crouch / let go ·
E draw or holster the pistol · X fire · ESC pause
**Mobile:** an on-screen cross bottom-left, JUMP / FIRE / GUN bottom-right. **Gamepad:**
left stick or d-pad, A jump, X/RT fire, Y draw.

#### The rule
**Every move you start, you finish.** A step is 22 frames long and carries 12 pixels
whether you like it or not; a turn is 18; a mantle is 40; and until a move reaches the
frame it declares open, the stick is not connected to anything. Nothing accelerates
freely anywhere. Tap a direction for one careful step, hold it and the step runs on into
a run — Flashback's rule, and the only reason a ledge edge is survivable.

- **The ledge.** Walk off an edge and he *catches* it rather than falls. Hold toward a lip
  in the air and he grabs it; ↑ mantles him over, slowly. A standing jump rises 27px and
  his hands reach 26 above his feet, so he can catch a lip 53px up — a storey is 48, which
  is why a storey is climbable, and every platform in the game is measured off that number
- **Falls** cost what they cost in Prince of Persia: one storey free, two hurt, three kill
- **The duel.** A sentry takes 68 frames from seeing you to firing — spot 26, draw 26, aim
  16 — and so do you; drawing the pistol costs 21 of them. **Crouch and his shot goes over
  your head. Roll and you go under it.** Two actors locked into animations, each betting
  that theirs finishes first, which is Flashback's gunfights and Prince of Persia's sword
  fights both
- **Fourteen screens** with a hard cut between them (no scrolling, no camera — a screen is
  a composition you learn, die on, and never see again): jungle → dig → tomb → reactor →
  palace → overgrown. The **sixteen-colour palette walks continuously across the whole
  run**, so the greens drain out of the rock over four screens while the sandstone comes up
  underneath and nothing ever announces a change of biome
- Traps: spike beds on a cycle, ceiling slabs, tiles that will not hold you, a plate-and-
  gate on a timer you have to beat, pulsing force fields
- A beast that coils and leaps, sentries with rifles, drones that lob slow orbs; three
  health cells; a run clock, and a best time in `localStorage`

### `dropcabal/`
**Drop Cabal.** A **Cabal (1988 arcade) homage** built on Three.js r167 — the blob and
cube gels from Toko Drop invade a Cabal gallery. Chunky **pixel rendering** (220 px
internal resolution upscaled with `image-rendering: pixelated` + scanlines) over flat
unlit `MeshBasicMaterial`, suds-sunset palette. **Layered shooting:** your crosshair
raycasts into a perspective field and tracers fly *into* the depth rows — near enemies
and destructible suds towers physically intercept shots aimed at far ones, while slow
readable enemy orbs fly *out* at your strip and have to be dodged.

**Controls:** MOUSE aim · hold LMB fire · A/D run · SPACE dodge roll (i-frames) ·
G / RMB / SHIFT grenade · ESC pause
**Mobile:** dual virtual sticks — left stick runs, right stick steers the crosshair + autofires · quick tap either stick = roll · ✸ button grenade

#### Gameplay
- Fill the stage quota gauge Cabal-style; clearing pops the stragglers, banks a stage
  bonus and hands you +1 bomb
- GLOBBO hoppers, YELA cubes, lobbing SPITTORs, 3-spread ORANGE cubes, and SPLITTAs
  that burst into rushing minis — every kill explodes into gel debris
- Suds towers crumble chunk by chunk for points; gold-capped bonus towers refund a bomb
- Grenades arc to the crosshair and wipe a radius (enemies, towers, even orbs)
- Shoot enemy orbs out of the air for +20; roll straight through anything with i-frames
- 3 lives, mercy flicker, hi-score in localStorage

### `hyperdagger/`
**Hyper Dagger.** A first-person **Devil Daggers × HYPERDEMON homage** built on Three.js
r167 — survive a swarm of voxel skulls on a neon disc floating in a synthwave void; your
survival time is your only score. All enemies are **string-art voxel models** rendered as
one `InstancedMesh` each, and every kill explodes them into **physical voxel debris**
(gravity, floor bounce with damping, tumbling, shrink-out) via a shared 1600-cube pool.
`UnrealBloomPass` + HDR palette colors (only eyes / totem veins / daggers / arena ring
exceed 1.0) give selective glow without washing out the bone.

**Controls:** mouse look (pointer lock) · **fire is automatic while you move** (hold LMB when still) · WASD · SPACE **jump / double jump** · SHIFT dash · ESC pause/options  
**Mobile:** left stick moves · right stick looks · **fire is automatic** · **tap either stick = jump / double jump** · **flick either stick to dash** · ⏸ pause — no on-screen buttons

#### Gameplay
- Obsidian **totems** (slowly drifting) rise behind telegraph light-beams from the start and exhale chasing **skulls** (faster over time, 30% **gilded** 2-HP skulls after 60 s); horned **brutes** (10 HP, knockback-resistant) join at 45 s; segmented **serpents** weave around the arena and dive-bomb from 100 s — every ring is individually destructible and gibs on its own
- Onboarding is paced one mechanic at a time over the first ~150 s (watchers 25 s, brutes 45 s, thorns 60 s, spiders 75 s, blinkers 90 s, serpents 100 s, Leviathan 150 s) and recurring spawns tighten as the run goes on, instead of five enemies debuting in the same 30-second window
- **Milestone announcements:** every first encounter gets a named toast + a low two-note stinger — THE WATCHERS, THE BRUTES, THORNS BENEATH, THE THIEVES, THE BLINKERS, THE SERPENT / THE PALE SERPENT, CROWNED SKULLS, THE SPLITTERS — and THE LEVIATHAN RISES plays on every boss spawn
- **Gems** drop from heavy kills (totems 3, brutes 2, each serpent ring 1, Leviathan 10), scatter physically, then magnet to you: 10 gems → faster stream, 30 gems → **homing daggers**
- **Spiders** skitter across the floor eating your loose gems — kill one and it refunds everything it swallowed +1; the **Leviathan** rises at the arena centre, exhales skulls, and drags you toward its face every 9 s — walk or dash out of the pull
- Segment-vs-sphere hit tests so fast daggers can't tunnel; skulls take knockback per hit
- **Returnal-inspired bullet-hell:** watcher drones telegraph and fire aimed orb volleys, totems pulse slow expanding orb rings you jump over, and thorn spikes erupt from red sigils under your feet — **dash phases through orbs** (never through bodies); dash requests buffer across the cooldown
- **Splitter skulls** (white crown) burst into three frantic minis; spawn mix shifts as the run goes on
- **Blinkers** teleport 6-8 u toward you every couple of seconds (running away doesn't build distance); every second **serpent** is a pale **ghost** whose rings deflect daggers from the front — flank it or shoot the tail; **spiders lay egg sacs** that hatch two skulls unless you pop them first (eggs are harmless to touch)
- Two modes (menu toggle): **PURE** — Devil Daggers rules, one touch kills; **HYPER** — HYPERDEMON rules, a draining life-clock is your health: kills add their score in seconds (cap 60), a hit costs 10 + mercy i-frames, 0 = TIME OUT. Separate hi-scores
- One touch kills you (PURE) — DEVOURED slow-mo, instant tap/click retry, hi-score in localStorage
- **Death recap:** the death screen names what killed you, a per-enemy kill breakdown, your dagger level reached, and your last 10 run times
- HYPERDEMON feel: afterimage motion smear, trauma-driven screen shake + chromatic aberration, FOV kicks on dash/shotgun, rainbow-band sky, first-person voxel gauntlet with recoil
- **Adaptive music:** an all-synth minor-pentatonic arpeggio layers voices in as the swarm and run time build — bass at all times, arp / hi-hat / lead counter-melody phasing in with intensity, over the detuned-saw drone; toggle in the pause menu
- **Style meter:** a Returnal/DMC-style rank (D → SSS) fed by fast kills, dash-through-orb dodges and gem pickups; idling bleeds it out faster at the top tiers, so holding **S+** means never stopping. The rank drives a HUD badge + fill bar and swells the music; your peak rank is on the death recap
- **Gamepad:** plug in a controller — left stick moves, right stick looks, RT/RB fire, A jumps (×2), B/LT dashes — feeding the same input paths as mouse/keyboard/touch

### `toko-drop/`
**Toko Drop v221.** A Three.js twin-stick swarm-survival arena game. The default
MOVEMENT mode removes enemy shooting: enemies dodge bullet lanes, school like
fish, split into minnows and turn deaths into revenge rings. The classic
bullet-hell arsenal remains available from OPTIONS.

**Controls:** WASD + hold LMB to aim/fire · SPACE dash · ESC pause · E eye style

**Touch:** left stick move · right stick aim/fire · release right stick dash

**Gamepad:** left stick move · right stick aim/fire · A/bumper/trigger dash · Start pause

The title screen supports portrait and landscape arenas plus two run formats:
Arcade waves back-to-back, or Roguelike upgrade choices after each wave. Local
personal bests track score, wave and survival time.

#### Current systems

- Thirteen enemy families with elite, twin, group and boss variants
- Swarm, spike, boss and breather wave pacing, peaking around wave 10
- Cargo-moth convoys, destructible gates and drifting powerup drops
- Ten roguelike upgrades spanning health, movement, weapons and defence
- Gel materials, wobble, hit response, debris, puddles and revenge-ring deaths
- Run hit telemetry and opt-in death-screen feedback stored locally
- `js/tuning.js` as the enemy feel source of truth; `enemy-lab.html` as the
  visual reference; `GDD.md`, `TOKO_DROP_ROADMAP.md` and `VERSIONS.md` for
  design, planning and release history

---

## Changelog

### 2026-08
- **hyperdagger v4.29 — Devil Daggers gunfeel:** the reference's two-mode trigger, taken literally: **TAP = shotgun burst** (10 daggers in a wide cone at once, recoil + FOV kick + its own bassy synth voice, 0.6 s hand lockout), **HOLD = stream** (spins up after 0.22 s). The fire-while-moving auto-stream is **removed on desktop and gamepad** — every dagger is aimed and the tap-vs-hold read is the skill, exactly as in DD; touch alone keeps auto-fire while moving, since two sticks already claim both thumbs. Releasing the click that started the run can't fire a spurious burst (`fireHeldT` seeded high on reset), and a long hold released is never mistaken for a tap. Tips card rewritten. The smoke gate also moved **into the repo** (`hyperdagger/test/smoke.cjs`, 19 checks: boot, gunfeel×5, aim assist, REAP×3, chunk detachment, style bleed, death→restart, zero page errors) so it survives environment resets like every other project's gate

### 2026-07
- **`flashprince/` — Flash Prince v1:** new cinematic platformer, **Another World × Flashback × Prince of Persia**. Canvas 2D, no build step, no assets. **Polygon renderer** (`screen.js`): everything is filled polygons at 320×192, then a pass snaps every pixel to the nearest of the room's sixteen colours through a lazily-filled RGB555 table — hard edges, a genuinely 16-colour framebuffer, and palette changes per screen the way the original did them. **Rotoscoped skeletal animation** (`figure.js`): a pose is thirteen joint angles, a frame is eleven polygons, a clip is poses with hold times, so a run can sit on its contact pose for three frames and blur through the pass in one. **Committed movement** (`hero.js`): every grounded move is a scripted length carrying a scripted distance, jumps are ballistic off a scripted gather, and input is only read in the window a move declares open. Ledge grabs (walk off an edge and he catches it), slow mantles, PoP's fall ladder (one storey free, two hurt, three kill), a crouch/roll that goes under gunfire, and a draw-time pistol duel against sentries running the same clock. **Fourteen hand-authored screens** with hard cuts, the 16-colour palette walking continuously from jungle to tomb to reactor to palace to overgrown so the biome changes without a transition anywhere. Spikes, ceiling slabs, crumbling tiles, plate-and-gate timers, force fields; beast, sentry and drone. Keyboard, gamepad and an on-screen pad; the arcade shell for the way home
- **hyperdagger v3.6 — style meter + gamepad:** a Returnal/DMC-flavoured rank system (`STYLE_TIERS` D→SSS, cap 150) rewards chaining — kills add by type, a dash *through* an orb adds +4 (credited once per orb via `o.phased`), gem pickups top it up; `step()` bleeds the meter at `6 + styleVal·0.05`/s so the top tiers stay fleeting. The tier shows as a HUD badge + `×mult` + fill bar (`#style`), folds into the music-intensity signal (0.35 weight), and its run peak is a new death-recap line; only S-and-above rank-ups toast so lower crossings never clobber an enemy-debut announcement. **Gamepad support:** `input.pollGamepad()` runs each frame and feeds the existing `getMove`/`getLookRate`/`firing` getters (left stick move, right stick look-rate, RT/RB fire, A = jump ×2, B/LT = dash, deadzoned + edge-detected) so a controller needs no other plumbing
- **hyperdagger v3.5 — adaptive music layer:** an all-synth A1 minor-pentatonic arpeggio on a lookahead scheduler (16th notes queued ~0.15 s ahead so it never stutters, resyncs after a pause instead of bursting) plays over the drone. Voices layer in with a run-intensity signal (live-threat count + run progress): bass always, arp above ~0.25, hi-hat tick above ~0.5, a lead counter-melody above ~0.75 — so the soundtrack thickens as the swarm builds and thins when you clear it. New MUSIC on/off toggle in the pause menu (`opts.music`, persisted, reconciles live)
- **hyperdagger v3.4 — milestone announcements:** every enemy debut now gets an authored first-encounter moment — a 2.2 s named toast (THE WATCHERS / THE BRUTES / THORNS BENEATH / THE THIEVES / THE BLINKERS / THE SERPENT / THE PALE SERPENT / CROWNED SKULLS / THE SPLITTERS) plus a low two-note dread stinger and a trauma pulse; THE LEVIATHAN RISES re-announces on every boss respawn. One-per-run keyed in `announced{}`; new `debug.setTime()` warp for testing the schedule
- **hyperdagger v3.3 — difficulty pacing + death recap:** onboarding spread across the first ~150 s so mechanics debut one at a time (watcher 25 s, brute 45 s, thorn 60 s, spider 75 s, blinker 90 s, serpent 100 s, Leviathan 150 s — replacing the old 40-70 s five-enemy pile-up); every recurring spawn now tightens its cadence toward a floor as the run goes on instead of holding flat; skull cap 42→46. Death screen now recaps the run: what killed you, a kill breakdown by enemy type, dagger level reached, and your last 10 run times (`hyperDaggerHistory` in localStorage)
- **hyperdagger v3.2 — symmetric sticks + minimalistic shooting:** tap EITHER stick to jump/double-jump (flick-dash was already on both); a second finger tapping an occupied half jumps too. Shooting is now automatic whenever you're moving — on desktop and touch alike — with hold-LMB / hold-look-stick as the standing-still fire; standing motionless without input is the only way to hold fire
- **hyperdagger v3.1 — roster round two:** **Blinker** (glitch shard that jump-cuts 6-8 u toward the player every 2.2 s with a debris puff + zap at the departure point — anti-kiting), **ghost serpent** (every second serpent; pale rings armored from the front, daggers *clink* off — damage only from behind/side, which also counters lazy homing), **spider egg sacs** (laid every ~10 s, pulse for 4 s then hatch two skulls; 2 HP targets, harmless to touch)
- **hyperdagger v3 — Returnal-inspired bullet-hell pass:** new `bullets.js` orb pool (slow readable red orbs, culled past the arena); **Watcher** drone (orbits at mid range, eye-burn telegraph + warning tick, 3-orb aimed fan — the game's first ranged enemy), **totem orb rings** (flat, jumpable expanding waves every 7 s), **Thorn** floor spikes (red sigil under your feet → white voxel spike; move, dash, or jump), **Splitter** skull → 3 mini skulls. Dash gets projectile i-frames (phases through orbs, never bodies) + 0.25 s input buffering. Fixes: gem pool 40→80, totems can't spawn overlapping, look-sensitivity option in the pause menu, fullscreen + landscape lock on touch play, notch-safe HUD (`viewport-fit=cover` + safe-area insets)
- **hyperdagger v2 — feel + monochrome restyle:** faster all around (move 12 u/s, dash 30 u/s on a 1 s cooldown, hotter streams, quicker enemies); **double jump** replaces the shotgun (Space ×2 / tap the left touch stick); **flick either stick to dash** in the flick direction; on-screen DASH/JUMP buttons removed; new ⏸ **pause menu** (Esc on desktop) with persisted options — game speed ×1/1.25/1.5, FOV 70/80/90, smear/shake/chroma toggles. Art rebuilt **black & white with dark red as the single contrast color** — grey band sky with a red ember horizon, white-on-black grid that simply stops at the arena edge (barrier ring removed), white daggers/blade, red eyes/veins/gems/telegraphs
- **hyperdagger HYPER mode:** menu-toggleable HYPERDEMON scoring — a draining life-clock is your health (start 30 s, cap 60 s): kills add their score in seconds, a hit costs 10 s + knockback + 1.2 s mercy i-frames instead of instant death, 0 = TIME OUT. PURE mode (one-touch DD rules) unchanged; separate localStorage hi-scores per mode
- **hyperdagger roster completion:** **Spider** gem-thief (skitters on the floor eating loose gems, refunds its haul +1 when killed) and the **Leviathan** boss (60-HP voxel god-head at the arena centre after 120 s — exhales skulls, drags the player toward its face every 9 s, showers 10 gems on death). New `pull()` synth warning, `player.nudge()` external-force hook, debug spawners
- **hyperdagger parity pass:** Devil Daggers feature parity — tap-shotgun / hold-stream firing, gem drops with magnet physics, 3-tier dagger levels (LV 3 homing), gilded 2-HP skulls, 12-ring **serpent** (centipede homage) with individually gibbing segments, drifting totems, telegraphed spawns. HYPERDEMON graphics parity — `AfterimagePass` motion smear, trauma-driven shake + chromatic-aberration `ShaderPass`, FOV kicks, dash move (Shift / on-screen DASH), rainbow hue-wheel sky, first-person checkerboard voxel gauntlet with recoil, death slow-mo. New `gems.js`; new synth sounds (shotgun/gem/levelup/dash/roar)
- **`hyperdagger/` — Hyper Dagger:** new first-person Devil Daggers × HYPERDEMON homage. Voxel enemies (string-art layer models → per-enemy `InstancedMesh` with per-voxel `setColorAt`), physical voxel-gib debris pool (gravity, floor bounce, tumble, shrink-out), dagger-stream combat with segment-sphere hit tests + knockback, totem/skull/brute spawn director, animated shader sky + synthwave grid arena, selective HDR bloom, WebAudio synth kit incl. detuned-saw drone. Desktop pointer-lock mouse look; mobile dual on-screen sticks (right stick auto-fires) + jump button. Survival-time score, localStorage hi-score

### 2026-06
- **toko-drop v0.3.3:** Stronger death VFX (heavier gel-like chunks) + improved material hit response on blobs (visible temporary refraction/transmission shift when hit).
- **toko-drop v0.3.2:** Stronger hit response on blobs, improved death chunks, richer idle wobble, better dash visual feedback + powerup pickup feel.
- **toko-drop v0.3.1:** Stronger hit rim glow + basic inner emissive boost on blob-type enemies.
- **`paperboy/` — Paper Route (Dawn Run):** new Paperboy clone. **Art rebuilt as an isometric, flat-shaded Paperboy homage** — orthographic 3/4 camera (`OrthographicCamera` + `ISO_OFF`, sun/shadow frustum follows the bike), bright sunny-day palette, `MeshLambertMaterial` under a hemisphere/sun rig, `NoToneMapping`, no bloom/chroma/gel (dropped the toko-drop pipeline that the first cut used). Cube houses with pitched roofs, a low-poly BMX kid. Gameplay unchanged: endless streamed-and-culled route, arc-throw delivery to subscriber mailbox zones, window smashing, blue-bundle resupply, 3-life crash system, 130 m "day" ramp, localStorage hi-score. Colours centralised in `js/palette.js`. Modular `js/`: `main`, `world`, `player`, `paper`, `input`, `audio`, `palette`. Live site is served from the `gh-pages` branch (not `main`)
- **toko-drop "all-out gel" VFX pass:** five-part physical upgrade — (1) post-processing pipeline (`EffectComposer`: `UnrealBloomPass` strength 0.55/threshold 0.9 so only hot highlights bloom + custom chromatic-aberration `ShaderPass` + `OutputPass` ACES/sRGB); (2) `iridescence` + `attenuationColor`/`attenuationDistance` on blobs, plus `sheen` + `anisotropy` on cubes (Jell-O colour depth, soap-film sheen, candy-glass streaks); (3) Fresnel rim glow injected in the fragment shader (wet glistening silhouette edges); (4) blob geometry densified to 48×32 segments (smooth vertex-displaced surface, no faceting); (5) `SludgeRibbon` rewritten from a flat strip into an arched 3D `TubeGeometry` gel bead
- **Godot port brief (`toko-drop/GODOT_PORT.md`):** dispatch-ready doc mapping every browser gel/VFX system to its Godot 4.3+ equivalent — true SSS, screen-space refraction, verlet tentacles dragging on the floor, `GPUParticles3D` drips, `SoftBody3D` splits, `WorldEnvironment` SSR/SSIL/SDFGI, custom Compositor passes; includes a `gel.gdshader` skeleton, ordered task list, and parity checklist
- **Visual Lab (`toko-drop/lab.html`):** per-enemy slider tuning tool — live Three.js preview (OrbitControls, click-to-hit), 4 param groups (material, vertex wobble, scale breathe, hit response) each with plain-English descriptions; Record Snapshot saves params + text note to localStorage; Copy as Prompt formats all snapshots as LLM-ready context; Copy Code Patch generates paste-ready `enemy.js` block; Export JSON for archival
- **toko-drop gel amplified:** emissive inner glow on all enemies, vertex wobble 3× larger, hit squash init 0.35→0.65, decay halved — blobs visibly morph, cubes have candy-glass pulse
- **toko-drop gel material pass:** all enemies + player upgraded to `MeshPhysicalMaterial` — blobs get transmission + clearcoat goo look; cubes get rounded-box candy-glass; IBL via `RoomEnvironment`; ACESFilmic tonemapping
- **toko-drop perf pass:** bullets rewritten with `InstancedMesh` + typed arrays — 300 draw calls → 2; zero allocations per frame
- **Blob vertex shader:** organic surface ripple on blob-type enemies via `onBeforeCompile`; hit-burst wave decays after each shot; collision shape unchanged
- **Player powerup methods:** `grantInvincibility`, `grantFireRateBoost`, `dashing` getter (were called but not implemented)
- **goo-flop:** full 90° side-flop physics; pivot-arc geometry; gravity-torque model; swipe gesture detection

### 2025 (earlier)
- toko-drop: 13 enemy types, fat bullets, poison zones, TORO dash boss, BAMBU lob, PYRA ring
- toko-drop: gates, powerups, Kirby eyes, SludgeRibbon (BufferGeometry), BambuAoE
- goo-surface: SPH physics, metaball WebGL render, drag/poke interaction, bloom
- goo-snowman: initial WebGL fragment-shader SDF demo
