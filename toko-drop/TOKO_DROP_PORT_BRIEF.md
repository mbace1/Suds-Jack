# Toko Drop — Visual & Behavior Port + In-Game Tuner

**Task brief for Claude Code, working in the Suds-Jack repo (`toko-drop/`).**
**Visual source of truth:** `toko-drop/enemy-lab.html` (commit the enemy tester file alongside this brief). Open it in a browser and match what you see. When this brief and the lab file disagree, the lab wins.

> Deploy note: the live site is served from the **`gh-pages` branch**, not `main`. After changes are verified on `main`, copy `toko-drop/` onto `gh-pages`.

---

## Part 1 — Extract `js/tuning.js` (do this first)

Create a single exported config module. Everything below that is currently hardcoded in `enemy.js` / `main.js` moves here. `enemy.js` reads it at spawn AND per-frame where cheap (so live edits apply without respawn where possible).

```js
// js/tuning.js — single source of truth for enemy look & feel
export const TUNING = {
  material: {
    // preset applied to all gel; per-family overrides below
    sss: 0.7, roughness: 0.16, clearcoat: 1.0, clearcoatRoughness: 0.06,
    sheen: 0.45, transmission: 0.15, thickness: 0.8, ior: 1.38,
    presets: {
      satin : { sss:0.70, roughness:0.16, clearcoat:1.00, sheen:0.45, transmission:0.15 },
      jelly : { sss:0.50, roughness:0.09, clearcoat:0.95, sheen:0.25, transmission:0.45 },
      glassy: { sss:0.10, roughness:0.02, clearcoat:0.90, sheen:0.00, transmission:0.78 },
      candy : { sss:0.30, roughness:0.05, clearcoat:1.00, sheen:0.15, transmission:0.35 },
      clay  : { sss:0.15, roughness:0.38, clearcoat:0.15, sheen:0.60, transmission:0.00 },
      neon  : { sss:1.35, roughness:0.12, clearcoat:0.80, sheen:0.30, transmission:0.20 },
    },
    families: { blob:{}, cube:{ roughness:0.10, transmission:0.25 } }, // cube = firmer candy
  },
  blob: {
    domeCut: 0.7, domeRound: 0.22,          // geometry, see Part 2
    shape:   { x:1.05, y:0.82, z:1.05 },    // squat grounded baseline
    shapes:  { SPITTOR:{x:1.02,y:0.78,z:1.26}, FANNER:{x:1.30,y:0.66,z:1.08}, WEEVA:{x:0.98,y:1.02,z:0.98} },
    dragStretchPerSpeed: 0.10, dragMax: 0.35, rearDragTilt: 0.35,
    spittorInflate: 0.22, spittorRecoil: 0.18,
    weevaVibrate: 0.03, fannerSway: 0.10, globboLungeHz: 3.0,
  },
  flop:  { arcStartDeg:135, arcEndDeg:45, landSquish:0.32, cycleFromSpeed:true },
  toro:  { revTime:1.6, telegraphTime:0.5, dashSpeed:22, dashMin:14,
           indicatorWidth:0.34, arrowSize:[0.5,0.9] },
  bambu: { segments:3, segHeight:0.6, flareBottom:0.20, flareTop:0.36, lipScale:1.14,
           lobTelegraph:0.7, lobFlight:1.0, lobCooldown:4.0, lobArcHeight:2.4,
           landingRingRadius:[0.55,0.95] },
  fx:    { hitDroplets:8, killDroplets:22, killChunks:5, splatLife:20,
           slimeTrailInterval:0.3, slimeTrailLife:4, poisonLife:8,
           hitWobbleStart:0.65, hitWobbleDecay:1.1 },
};
```

## Part 2 — Blob geometry: hero-style gel dome

Replace `SphereGeometry(radius, 48, 32)` for the blob family with an SDF-generated dome — most of a ball with a flat rounded-off bottom (same family as the player, fuller than a half-ball):

- SDF: `smax(length(p) - 1, -p.y - domeCut, domeRound)` where `smax(a,b,k) = -smin(-a,-b,k)` and `smin` is the standard polynomial smooth-min (k·0.25 form).
- Generate by shrink-wrapping a dense `SphereGeometry(1, 96, 64)`: binary-search each vertex direction to the SDF zero crossing, normals from SDF gradient. The exact ~30-line implementation is in `enemy-lab.html` (`sdfGeometry`, `sdRoundBox`, `smin`).
- **Translate geometry +0.7 in Y** so the origin is the floor contact point. Then rest position is `y=0` and all squash/breathe/hit scaling anchors to the ground (no floating).
- Keep the existing vertex ripple + hit shockwave injection unchanged; it works on this geometry (rings now radiate from the contact point, which looks right).

Per-blob silhouettes and tells (all values in TUNING.blob):
- Baseline: squat dome via `shape` scale.
- **GLOBBO**: chase speed pulses — `speed × (max(0,sin(t·3+phase))² · 2.6 + 0.4)` — lunging slime.
- **SPITTOR**: longer in Z (snout). Inflates up to +22% scale over the 0.45s before firing (this replaces/joins `_isTelegraphing` emissive). Recoils 0.18 units backward on fire with hitWobble 0.3.
- **FANNER**: wide flat pancake; rocks `rotation.z = sin(t·7)·0.10` while strafing.
- **WEEVA**: taller; vibrates `±0.03` scale jitter at 40Hz (drill feel with its bullet stream).
- **SPLITTA**: two child dome meshes (same material) embedded at `(±0.6, 0.42, 0.15)` local, scale 0.42 — the split is visible before it happens.

Grounded drag (all blobs): estimate horizontal speed per frame; `drag = min(speed·0.10, 0.35)`; yaw mesh to face motion; stretch Z by `(1+drag)`, reduce Y by `drag·0.25`, tilt `rotation.x = -drag·0.35` (nose lifts, rear drags the floor).

## Part 3 — Cube family: flop, don't slide

Replace the current constant-velocity `_cardDir` slide for all cube types (YELA, ORANGE, SLUDGE, REDD, PURP + minis) with edge-pivot flops. Math is already in the repo root `goo-flop.html`:

- Per flop: pivot arc angle 135°→45°; displacement along dir `= L + D·cos(ang)` (0→2L); height `= D·sin(ang)` where `L` = half-extent, `D = L·√2`. Tip rotation 0→90° about axis `up × dir`.
- **Land flat every flop** (reset orientation — the cube is symmetric; this avoids the crooked rest pose after diagonal flops).
- Landing squish: hitWobble 0.32. Cadence derived from each type's existing `speed`: `cycle = 2L / speed`, flop duration `min(0.3, cycle·0.65)`, rest for the remainder. Keep existing direction-picking logic (YELA 50% diagonals, minis re-pick fast, SLUDGE slow) and wall bouncing.
- Trails unchanged: YELA slime every 0.3s, SLUDGE ribbon/poison as-is — just emitted from the flopping body.

## Part 4 — TORO: wheel + exact telegraph

- Orientation: upright wheel. Yaw group faces the (45°-snapped) dash direction; the torus + rim spikes spin about the axle. During `revring`, spin accelerates (existing `3 + ramp·8` rad/s); during dash, spin rate = dashSpeed / rim radius (it visually *rolls*).
- Telegraph indicator: replace the fixed 36-unit line with a group — shaft `BoxGeometry(0.34, 0.04, 1)` scaled in Z to the **exact dash length** (raycast from TORO along dashDir to the arena wall), plus a 3-sided cone arrowhead (0.5 × 0.9, rotated to lie along the path) whose **tip sits exactly at the impact point**. Keep the existing opacity flash (`sin(t·25)`).
- Everything else in the TORO state machine stays (idle creep → revring 1.6s → telegraph 0.5s → dash 22→14 → recover 0.8s).

## Part 5 — BAMBU rebuild: bamboo tower + lob shot

Replace the current BAMBU construction with (repo stubs `_makeBambuSeg` / `_lobTargetX/Z` are the skeleton):

- **Body**: 3 stacked segments, each a `CylinderGeometry(topR, bottomR, 0.6)` **flaring wider toward its top** — bottomR `0.20+i·0.02`, topR `0.36+i·0.03` — with a thin node lip (`topR·1.14`, h 0.06) between segments. Gel material, shares the family shader. Keep the emerge-from-floor animation.
- **Attack cycle** (per `lobCooldown` 4s): pick landing point near the player (± spread) → **flashing landing ring** (`RingGeometry(0.55, 0.95)`, opacity toggling at ~22Hz) on the floor for 0.7s while the tower squash-strains → launch a large blob (r≈0.34, emissive) on a parabola from the tower top, ~1.0s flight, arc height 2.4, ring flashing faster during flight → splashdown: droplet burst, big splat decal, damage zone as designed.
- The landing ring is the important gameplay addition: the player must see where the lob lands **before** it lands.

## Part 6 — Pause menu: ENEMIES tab (live tuner)

Add a tab/section to the existing pause overlay:

- Horizontal chip row of all enemy types (color dot + name), HIT / KILL debug buttons acting on a spawned specimen, preset buttons + the 5 material sliders, all **writing directly into `TUNING`** so changes apply to the live game on unpause.
- Reuse the widget layout and slider bindings from `enemy-lab.html` — the CSS/DOM there is already mobile-friendly (bottom sheet, big touch targets).
- Include a "copy tuning JSON" button (serialize `TUNING`) and, if cheap, "paste/import".
- Selecting a chip while paused may spawn that enemy at arena center as a preview specimen (removed on unpause) — optional, do it only if it doesn't complicate wave state.

## Verify

1. `enemy-lab.html` side-by-side with the game: blob silhouettes, flop rhythm, TORO telegraph, BAMBU cycle should read the same.
2. No regression in bullet patterns, wave scheduling, scoring.
3. Mobile: test touch on the pause tuner; frame rate on a mid phone should improve vs. the old transmission-0.78 material.
4. Update CLAUDE.md (Toko Drop section) to note tuning.js as the single source of truth, then deploy to gh-pages.
