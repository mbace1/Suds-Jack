# TOKO DROP — Feature Roadmap v2 *(reconciled 2026-07-27)*

*Twin-stick swarm survival. The swarm reads your gun, corpses bite back.*

**Goal arc:** WebGPU/TSL showpiece → Early Access playground → polished 1.0.
Early access lives on **both** the GitHub Pages build and an **itch.io** page.

Each task is scoped to **one prompt + one commit**. Visual source of truth is
`enemy-lab.html`; all numeric balance lives in `tuning.js`.

**Art pass priority (locked):** 1. Materials/goo shaders → 2. Arena &
environment → 3. Motion/animation character → 4. Enemy silhouettes & readability.

**Cabinets are ON HOLD** (user direction, 2026-07-27). The six arcade tributes
stay shipped and gated by `scripts/cabinets.sh`, but no new cabinet work until
this arc lands.

---

## Reconciliation note — read before planning

The v2 brief was written against an earlier build. Audited against the shipped
tree, several items were already done and one assumption was wrong:

| v2 said | Actually |
|---|---|
| 15 enemy types | **40** |
| Migrate main game to WebGPU (Phase 2) | **Shipped v191/v192** — flag-gated, adaptive backend |
| WebGPU availability check + WebGL fallback | **Shipped v192** |
| Gel dome + hit/death effects to TSL | **Shipped v194** |
| Daily seed mode (Phase 4) | **Shipped v179** |
| Score model / end-of-run summary / local bests | **Shipped** (death screen, run history, per-cabinet records) |
| Settings: audio, motion clamp | **Shipped** (haptics still open) |

So Phase 1 is not de-risking a future migration — the main game moved first.
What Phase 1 is *actually* worth is fixing a structural problem it exposes,
below.

**The real blocker:** `enemy-lab.html` imports **no game code**. It carries its
own copy of the goo shader via `onBeforeCompile`, loads three@0.160 **from a
CDN** (violating the standing no-CDN rule), and ships neither the vendored r167
the game uses nor the r180 flag build. The declared "visual source of truth" is
a **fork**. Under the "never painted twice" constraint that is already broken —
art tuned in the lab is tuned against a different implementation than the one
that ships.

`js/specimen.js` (v212) already renders a real `Enemy` with the game's own
materials and follows the renderer's kind. It is the engine the lab should have.

---

## Guiding constraints

- Clean satin MID material is the baseline. No post-processing, no edge treatments.
  *(Exception of record: the cabinets' RetroPass is deliberate per-cabinet
  post. Cabinets are on hold; this constraint governs the main game.)*
- Mobile touch is first-class. Every feature ships with a touch answer.
- Shader-dependent art happens **only on TSL** — never painted twice.
- Renderer-agnostic work (behavior, meta, layout, timing) can proceed on either stack.
- No Geometry Wars aesthetic drift.
- Standing repo rules still apply: no build step, no CDN/runtime deps (vendor
  everything), `?v=` cache tokens on new paths from day one, a `## vN`
  VERSIONS.md entry per game-file commit.

---

## Phase 1 — Prove the stack in the lab *(re-scoped)*

*Goal: the visual source of truth stops being a fork.*

- [x] **Rebuild `enemy-lab.html` on the game's own code** — *v216*
- [x] Verify all **40** types on both renderers — *v216, 11/11 headless*
- [x] `WEBGPU_MIGRATION_NOTES.md` — *shipped alongside v216; Phase 1 complete*

## Phase 2 — Main game systems

- [x] Main game on WebGPURenderer — *v191/v192, behind `WEBGPU (BETA)`*
- [x] "Swarm reads your gun" as one tunable module — *v210/v211, movement
      traits per species in `tuning.js`*
- [x] Corpse bite-back telegraph/timing/cleanup — *v187/v188 revenge rings*
- [x] Run structure: win/lose, fast restart, no reload
- [x] **Wave director v1**: spawn tables move out of `main.js` into `tuning.js`
      — composition, cadence, escalation as data — *v217, equivalence proven
      byte-for-byte (3 seeds × 5 modes × 30 waves)*
- [ ] Promote WebGPU from BETA once the art passes justify it *(the standing
      criterion: it must really push the gelation look)*

## Phase 3 — Showpiece art passes *(priority order, locked)*

- [x] **Goo/gel TSL pass**: dome refraction, wobble dynamics, pop burst — past
      parity, not to it. This is the reason the stack moved — *v218: depth-varying
      thicknessNode, hit-seethe second octave, uTear inflation + interior flare*
- [x] Goo pass 2: corpse and swarm materials (satin MID is the floor, goo the
      ceiling) — *v222: corpse matter (both chunk pools) gets a gel-nugget node
      graph under the flag; the living swarm was already satin/physical + v218*
- [x] **Arena & environment pass**: floor/space treatment that makes swarm flow
      readable — *v223: rim vignette, grid distance falloff, and a lit pool that
      follows the player; both renderers in parity, constants in `TUNING.arena`*
- [ ] Arena pass 2: reactive surface response to mass, prizes, pops
- [ ] Performance budget checkpoint on a mid-range phone, measured after each pass

## Phase 4 — Full Meta *(Early Access gate)*

- [x] Score model, end-of-run summary, local bests, daily seed
- [ ] Unlock track: cumulative-score gates for cosmetics or starting loadouts
      *(cabinet unlocks exist; this is the main-game equivalent)*
- [ ] Haptics + motion-comfort clamp review

## Phase 5 — Early Access launch

- [ ] itch.io page: embed, copy, capture GIFs (`scripts/enemy-loop.mjs` records them)
- [ ] Pages build tagged Early Access, changelog surfaced in-game
- [ ] Feedback channel *(the v212 contextual death-screen question is the
      in-game half; the hub feedback button is the other)*
- [ ] Optional anonymous telemetry — privacy-first, toggleable

## Phase 6 — Live playground *(during EA)*

- [ ] Motion/animation character pass (art priority 3)
- [ ] Game feel: hit-stop and camera-kick as one tunable table
- [ ] Audio pass: layered mix, ducking under swarm density
- [ ] Enemy silhouette & readability pass (art priority 4) — informed by feedback
- [ ] Content drops: elite waves, arena variation, weapon modifiers
- [ ] Balance patches from daily-seed data

## Phase 7 — 1.0

- [ ] Final tuning lock + difficulty curve validation
- [ ] Onboarding: teach-by-play, no tutorial screens
- [ ] Share hook: end-of-run score card image
- [ ] 30-second trailer from real play
- [ ] 1.0 on both venues + PWA install/offline *(PWA already ships)*

---

## Parking lot

- Godot 4.x port — superseded by WebGPU/TSL unless Three.js hits a wall
- Rapier/WASM physics — only if profiling demands it
- Multiplayer / backend leaderboards
- Any post-processing revisit
- **Cabinet work** — six tributes shipped; on hold by direction

---

*`GDD.md` holds design truths, `VERSIONS.md` holds what shipped. Items are
deleted here as they land.*
