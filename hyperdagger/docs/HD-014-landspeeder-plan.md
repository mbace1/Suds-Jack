# HD-014 — Season 3 trucks become floating landspeeders: PLAN (for review, no code)

- Queue item: HD-014 (QUEUE.md on `docs/hyperdagger-queue-playtest`, PR #589). Status: Queued, size M, blocked-by HD-006.
- Design direction (Mikael, 12 Oct 2026 23:03, `/workspace/hd-season-test/NOTES.md`): the highway trucks become **floating landspeeder platforms**: no wheels, they hover, and the cargo still rides on them. Cargo and haul rules stay the same, so the existing haul checks still mean something.
- Gate: plan before code. Mikael reviews this doc, picks options, then code lands in separate small PRs. Merging needs Mikael's yes.
- Base for references: `origin/main` @ `603e76d82` (#590). Line numbers are for that commit.

## 1. What exists now

All season 3 trucks are built in `js/convoy.js` (`Convoy`). `js/truck.js` (`TruckTrack`) is the wrapper: with `cfg.moving` it hands every call to the convoy (`setConfig` L24–28, `active` L30, `reset` L77, `preUpdate` L99, `update` L122). Its own `addPlatform` slabs (L60–73, falling slabs L146–167) belong to the classic `?mode=truck` road and are **out of scope**.

### Mesh parts: `Convoy._truck()` `js/convoy.js` L238–297
Each truck is one `THREE.Group`. **Its origin is the centre of the trailer top** (comment L235–237), so tilt pivots on the deck the player stands on.
| Part | Where | Notes |
|---|---|---|
| trailer box `w × trailerH × depth` | L245–247 | `trailerH` 2.0–3.8 (L241), `top = ROAD_Y + CHASSIS + trailerH` (L242); `ROAD_Y=-3.2` L37, `CHASSIS=1.1` L39 |
| roof slab (lighter colour) | L249–251 | the landing surface you read first |
| edge outline (`LineSegments`) | L252–254 | recoloured on braking, L499 |
| cab `w*0.92 × 2.3 × 2.6`, in front (−z), lower | L256–258 | its local pos is `cabLocal` (L292), the gaze/missile target |
| glass | L260–262 | |
| **wheels**: 4 axles × 2 = 8 meshes sharing `wheelGeo`/`wheelMat` | L263–271; shared geo/mat L206–207; dispose skip L229–230 | `wy = -(top-ROAD_Y)+0.45`, so they sit on the asphalt |
| brake lights | L273–278 | `brakeMat` recoloured L498 |

### Collision boxes and platforms
- Truck footprint and deck height: `Convoy.topAt()` L304–316. It uses `group.position.y` plus tilt (`rotation.z`, `rotation.x`) inside `w/2+0.3 × depth/2+0.3`, or a welded crate top when one is under the feet and reachable (the #590 fix).
- Standing and carry: `Convoy.preUpdate()` L421–438 sets `player.floorY` and `this.standing`. The carried and air speeds are pinned by smoke (`haul: a truck carries the body…`, `…in the air you keep the speed…`).
- Pose: `Convoy._pose()` L443–453. **Important:** the group's `position.y` already bobs: `t.top + sin(age*bobW+ph) * cfg.bob` (L452, `bob: 0.07`, seasons.js L381). Roll, pitch, jostle, lean and dive all rotate the group (L447–451). Because `topAt` reads the group, the existing bob **already moves the deck**, and the stand logic is tuned around that 0.07 u.
- Death: touching the road (`fallY: -2.9`, seasons.js L382; `TruckTrack.fallY()` truck.js L33). The killer name is `'the road': 'THE ROAD'` in `js/main.js` L55. `daggers.floorY` is in main.js L1708.
- `get platforms()` returns `this.trucks` (L138) for the gate and loop harness.

### Cargo attachment: `js/cargo.js`
- `load(t)` L109–131 stacks crates on the trailer top, welded from the start (`local` offset relative to the truck). `jolt(t, kick)` L134 unwelds them. `topAt(x,z)` L171 gives crate tops to the convoy. Spill and road crates are at L245–252 (`ROAD_Y` passed in from convoy L503). The weld tuning is at L40–41.
- Crates follow the **group transform**. Anything that changes the group pose moves the crates too.

### Jackknife and wreck
- `hit(t)` L319–330: three missiles in the cab, then `jacked`, `ts=2`, a big jolt (spill), `JACKKNIFE` toast (main.js L3292).
- `wreck(t)` L332–336: the pile-up finale folds and stops a truck dead (main.js L2954–2965; seasons.js finale `{at:180, kind:'pileup', reach:70, resume:1.2}`).
- Fold animation in `update` L467–472: `jackYaw` eases to `±0.7` and feeds `rotation.y` and part of the roll (L449–451).

### Smoke block `haul:` (`test/smoke.cjs` L1548–1583)
Spawn survive 5 s, death named THE ROAD, cargo welded and riding, brake slides the load, three missiles jackknife (`|yaw|>0.3`, `spd<6`), gaze locks a cab, pile-up finale, convoy faster afterwards, TRUCK scheme, trucks drive, missile hand, carry and air momentum, no gun, gaze range and dwell, CARGO IS THE SCORE. **None of these may change.** No smoke test looks at wheels today.

## 2. Visual changes (pick one per row)

All new visuals go on a **child `hull` group** (or individual child meshes) under the truck group. The group transform, `top`, and `topAt` stay exactly as they are.

**A. Wheels**: remove the L263–271 loop and the `wheelGeo`/`wheelMat` (L206–207, L229–230). No options here; that is the brief.

**B. Body silhouette** (the deck stays `w × depth` at the same `top`)
- **B1 "Hover-pallet"**: keep the trailer box and cab as they are, minus the wheels. Cheapest, and it reads as a "hovering truck".
- **B2 "Skiff"**: taper the trailer underside (a narrower lower box or a chamfered bottom), turn the cab into a lower canopy pod with glass, and add side fins. Same top face, so the same deck.
- **B3 "Speeder sled"**: a thin deck slab plus a separate hull pod under it, with an open gap between the deck and the pod. The strongest landspeeder read. Only the underside is new, and it needs care so the slab still reads as a solid landing surface.

**C. Hover gap, bob and tilt** (visual only, on the child)
- **C1 "Still"**: no extra motion. The existing 0.07 u group bob and the jostle already give a float. The gap is just visible air where the wheels were (~1.1 u of `CHASSIS`).
- **C2 "Float"**: the child hull adds a slow bob (~0.05–0.08 u, 0.8–1.2 Hz) and a small extra roll lag. **The deck does not move more than it does today.**
- **C3 "Thrust-lean"**: as C2, plus the child hull pitches nose-down on acceleration and noses up on braking (it reuses `dive`/`lean`, but only on the child).

**D. Underside glow or thrusters**
- **D1 "Glow strip"**: an emissive `MeshBasicMaterial` strip or plane under the hull (fog:false like the brake lights). 1–2 meshes per truck.
- **D2 "Thruster pods"**: 4 small emissive cylinders or boxes at the old axle positions, plus a pulsing intensity (a colour lerp, no lights).
- **D3 "Ion skirt"**: D1 plus a translucent additive "exhaust" plane flickering under each pod.

**E. Ground shadow or light on the road**
- **E1 "Blob shadow"**: a dark transparent quad at `ROAD_Y+0.01` under each truck, scaled by the hover height. It is placed in world space so it does not tilt with the truck. Cheap.
- **E2 "Glow pool"**: an additive tinted quad (thruster colour) on the asphalt instead of the dark one. This sells the hover in the dark season 3 sky (a low sun ahead, fog 18–72).
- **E3 "Both"**: E1 core plus an E2 rim. No real `PointLight`s in any option (see perf).

**F. Jackknife and wreck read for a hovercraft** (the motion and the timing stay the same; only the cosmetics change)
- **F1 "Spin-out"**: no change except that the thrusters flicker or sputter when `jacked`. The fold yaw reads as the hull spinning out.
- **F2 "Stall"**: on `jacked`, the glow fades to red and the child hull sags and lists (visual only). On `wrecked` (the pile-up) the hull "grounds": the child drops to touch the road visually. **The deck stays at `top`**, so the finale wall is still crossable.
- **F3 "Sparks"**: F2 plus a short spark or smoke burst (reusing the gibs/dust system) at the cab on the third hit and at each pile-up wreck.

Suggested default to start from: **B2 + C2 + D2 + E2 + F2**.

## 3. What must not change
- **Platform heights and the deck**: `trailerH` range, `CHASSIS`, `ROAD_Y`, `t.top`, `group.position` (including the existing `cfg.bob` 0.07 term), and `topAt()`. The deck the player stands on must be bit-identical for the same RNG.
- **Collision**: `topAt` footprint margins, `preUpdate` standing/carry, `fallY`, the `daggers.floorY` setup.
- **Crate attachment**: `cargo.load/jolt/topAt`, weld rules, and the crates' local offsets on the deck.
- **Scoring**: `cargoScore`, spill and save, the HUD `load N`.
- **Convoy speed and behaviour**: speed, speedVar, brake, lanes, follow, laneSpeed, and the finale `resume`/`skulls`.
- **The pile-up finale**: `wreck()` stops trucks dead, `reach: 70`.
- **Jackknife mechanics**: 3 hp, `jackYaw` targets, crawl speed (the smoke asserts `|yaw|>0.3`, `spd<6`).
- **Gaze/missile target**: `cabLocal` and `proxy.radius` (the cab pod may change shape, but its centre stays where it is).
- **Killer names**: `THE ROAD` (main.js L55) and the death screen wording. "Felled by something" must never come back.
- **No version token bumps or VERSIONS/log entries until a code PR is approved.** Each code PR follows the repo's usual `?v=` rule.

## 4. Risks
1. **Bob moving the deck.** The stand and fall logic (`topAt` → `floorY`) reads the group's y, and #590 just fixed a first-frame fall at spawn. Any new bob or tilt **must be on a child mesh only**, never on `group.position`/`rotation`. A pinning test (step 1) catches a regression.
2. **Visual and physical mismatch.** If the hull bobs and the deck does not, a big C2 amplitude can make the roof look like it slides against the player's feet. Keep the bob on the hull and pods **below** the deck, and keep the roof slab on the group.
3. **Perf on slow devices.** The box ran ~5x slow (NOTES.md), and HD-011 adds a perf budget. Rules: no real lights, no shadow maps. Shared geometry and materials across trucks (like `wheelGeo` today), and per-truck emissive colour only when needed. Removing the 8 wheels frees draws for ~4 pods plus 1 quad. The goal is draw calls per truck ≤ today's. Pulsing is a uniform/colour lerp, not new materials per frame. Check this against the HD-011 perf smoke.
4. **Disposal.** `_remove()` skips the shared wheel geo/mat (L229–230). New shared resources need the same skip, or every despawn disposes a resource that other trucks still use. The ground quad, if it is world-space and not a child, needs its own remove.
5. **Mesh and asset pipeline.** The trucks are procedural boxes today, with no GLB in `assets/` (manifest.json). B1–B3 and D/E can all be procedural. If Mikael wants authored art, it goes through **Astra's art lane** (Nano Banana → **Meshy** → game, `ART_PIPELINE.md`), with a turnaround sheet, low-poly faceted, and loaded via `meshassets.js`. A Meshy hull must not define collision: the deck stays the procedural `topAt` box, and the mesh is cosmetic only, scaled to `w × depth × trailerH`.
6. **Season 3 `todo` text.** seasons.js L395 says "a cab, a trailer, wheels". Update it in the code PR, not here.
7. **Dependencies.** HD-014 is blocked by HD-006, and it touches convoy.js, which #590 and the HD-011 perf work also touch. Rebase each step on current main.

## 5. Step plan (small PRs, each with tests, each needing Mikael's yes)
1. **PR 1: pin the deck (tests only, no visuals).** Add a smoke check `haul: LANDSPEEDER — deck heights pinned`. With a seeded RNG, record `t.top`, `topAt(t, x, z)` at 5 points per truck, and the player `floorY` for N frames, then assert they match a reference computed from `ROAD_Y + CHASSIS + trailerH` with today's group bob/tilt. It must pass on main as-is.
2. **PR 2: remove the wheels.** Delete the wheel loop and the shared wheel resources. Add a smoke check `haul: no wheel meshes on any truck`, which walks each `t.group` and asserts no mesh uses a wheel geometry or has `name==='wheel'`. To make this testable, name the parts (`trailer`, `cab`, `roof`, `hull`…) in this PR. The PR 1 pin and all `haul:` checks stay green.
3. **PR 3: hover visuals.** Add the chosen B/C/D/E options on a child `hull`. Smoke check `haul: hover visual` asserts that (a) each truck has a `hull` child and an underside glow mesh, (b) over time the child's local y/rotation changes (C2/C3) while `group.position.y - t.top` stays within the existing `cfg.bob`, and (c) the PR 1 pin is unchanged. Add a perf check against the HD-011 budget (draw calls per truck ≤ the baseline).
4. **PR 4: jackknife and wreck read.** Add the chosen F option (thruster sputter, stall, ground-out of the child only). Smoke: the existing jackknife and pile-up checks plus `haul: a wrecked speeder's deck stays at top` (the pin applies to wrecked trucks too).
5. **(Optional) PR 5: Meshy hull art** via Astra's lane, only if Mikael asks. It swaps the child mesh only, and all pins stay.

Each PR runs `node test/smoke.cjs` (the full `haul:` block) and `test/offline.cjs`, and includes a screenshot or clip of season 3 for review. No deploy without Mikael's yes.

## 6. Open questions for Mikael
1. Silhouette: **B1** hover-pallet, **B2** skiff, or **B3** speeder sled?
2. Hover motion: **C1** still, **C2** float, or **C3** thrust-lean? Is the current 0.07 u deck bob fine to keep as it is (it is part of the stand logic today)?
3. Underside: **D1** glow strip, **D2** thruster pods, or **D3** ion skirt? What colour (amber to match the season 3 sun and the missile glow, or a cool cyan contrast)?
4. Road: **E1** blob shadow, **E2** glow pool, or **E3** both?
5. Jackknife and wreck read: **F1** spin-out, **F2** stall/ground-out, or **F3** with sparks?
6. Keep a separate **cab** (a driver pod you lock with the gaze), or merge it into the hull? (The cab centre must stay put for the gaze either way.)
7. Procedural only, or should Astra make a Meshy hull later (PR 5)?
8. Should the classic `?mode=truck` slab road (truck.js) stay as it is? (The plan assumes yes, and that HD-014 is the season 3 convoy only.)
9. Rename the in-game words "truck", "JACKKNIFE" or "THE PILE-UP"? The plan assumes **no**: the names, killer names and toasts stay.
