# TURF — cutout motion layer: implementation brief

Self-contained handoff. Read `ART_REQUEST.md` §12 for the *why*; this is the
*what*. Repo: `mbace1/Suds-Jack`, project dir `turf/`. **No build step, vanilla
ES modules, no dependencies.**

## The idea in one line

A character is a flat standing plate; the animation is a **transform applied to
that plate** (Paper Mario), not a flipbook drawn inside it.

## Why now

`node scripts/assets.mjs doctor` reports no `GEMINI_API_KEY` and no
`MESHY_API_KEY`, so no art can be generated in this environment. **30 character
plates exist; 2 characters have pose frames.** The other 28 slide and flash and
nothing else. This layer costs zero art and lands on all thirty.

---

## 1. What already exists (do not rebuild it)

`turf/js/anim.js` — 320 lines, owns **the only rAF loop in the game**, and
stops itself when nothing is mid-clip. Keep that property.

```js
export const CAST = { gunner: 'gunner', leopard: 'leopard' };   // who has frames

const CLIPS = {                       // [pose, ms]; Infinity = hold
  idle:   [['idle', Infinity]],
  move:   [['move', 280], ['idle', Infinity]],
  attack: [['attack-windup', 170], ['attack-release', 260], ['idle', Infinity]],
  hit:    [['hit', 300], ['idle', Infinity]],
  death:  [['death-fall', 300], ['death-down', Infinity]],
};

export function facingFor(dgx, dgy) {          // 2 drawn facings cover 4 dirs
  return { mirror: (dgx - dgy) < 0, back: (dgx + dgy) < 0 };
}

const MOVE_MS_PER_TILE = 85, MOVE_MS_MIN = 130;
const KNOCK_MS = 190, FLASH_MS = 220, FLOAT_MS = 780;
```

The animator returns, per unit:

| call | returns |
|---|---|
| `spriteFor(unit)` | `{src, mirror, refSrc}` or **`null`** = "no frame set, draw the static plate" (28 of 30 units) |
| `offsetFor(unit)` | `{gx, gy}` fractional TILE offset, or null once landed |
| `flashFor(unit)` | 0..1 hit flash |
| `isDying(unit)` | true while the death clip runs (keeps the corpse in the draw list) |

`turf/js/render.js`:

```js
export const SPRITE_H = 29;          // a body is ONE TILE; everything derives from this

function drawUnitSprite(g, entry, x, feetY, mirror, refH) {
  const { img, inkTop, inkBottom } = entry;
  const contentH = inkBottom - inkTop + 1;
  const scale = SPRITE_H / (refH || contentH);   // scaled off INK, never the frame
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  const drawY = feetY - inkBottom * scale;
  if (mirror) { /* save; translate(x,0); scale(-1,1); drawImage(-w/2, drawY); restore */ }
  else g.ctx.drawImage(img, x - w / 2, drawY, w, h);
  return feetY - contentH * scale;               // top of visible content, for the HP bar
}
```

---

## 2. What to add

### 2.1 New module `turf/js/cutout.js` — pure, no DOM, bare-node testable

Follow `js/momentum.js` / `js/ammo.js`: a leaf module, no imports from
render/combat, so the gate runs in bare node.

```js
export const REST = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, skew: 0 };

// dx/dy   in SPRITE HEIGHTS (resolution-independent; multiply by SPRITE_H)
//         +dx = screen right, +dy = screen DOWN
// rot     radians, about the FEET
// sx/sy   scale about the FEET (sy<1 = squash)
// skew    horizontal shear about the feet (the cardboard flexing)
export function poseAt(clip, elapsedMs, ctx) -> transform
```

`ctx` carries what the pose needs and nothing more:
`{ dirX, dirY, tiles, mirror, ranged }` — `dirX/dirY` a unit screen-space
vector toward the target (attack) or away from the attacker (hit, death);
`tiles` the path length in tiles (move); `ranged` picks recoil over lunge.

**Anchor everything at the feet.** A cutout stands on a base: rotation about
the feet is the topple, squash about the feet is the landing. Anchoring at the
centre makes every verb read as a sprite being scaled.

### 2.2 The five clips

| clip | shape | ms |
|---|---|---|
| `idle` | `REST` (see §4, the breath decision) | ∞ |
| `move` | **per-tile hop**: `dy = -0.18·sin(π·hop)`, lean `rot = 0.10·dirX` on the rise, land squash `sy 0.90 → 1` over the last 60 ms. `hop = frac(progress · tiles)` — a 4-tile move is 4 hops, not one long float | matches the existing tween: `max(130, 85·tiles)` |
| `attack` melee | anticipation `dx = -0.10·dirX`, `rot = -0.08·dirX` (110) → **lunge** `dx = +0.30·dirX`, `rot = +0.16·dirX` (90) → recover to REST (160) | 360 |
| `attack` ranged | anticipation as above (110) → **recoil** `dx = -0.14·dirX` + `skew = 0.10·dirX` (70) → settle with one decaying shake (180) | 360 |
| `hit` | knock `dx = 0.16·dirX`, `skew = 0.18·dirX`, `sy = 0.94` (KNOCK_MS 190) → overshoot back through REST and settle (110) | 300 |
| `death` | **topple**: `rot → ±1.36 rad` (78°) with gravity easing `t²`, `dy → +0.06`, one small settle bounce; sign = away from the attacker (`-dirX`). Then **hold** | 420 then ∞ |

Bounds every pose must respect (the gate asserts them): `|dx| ≤ 0.5`,
`|dy| ≤ 0.35`, `|rot| ≤ 1.4 rad`, `0.8 ≤ sx,sy ≤ 1.2`, `|skew| ≤ 0.25`.

### 2.3 Wire into `anim.js`

`CLIPS` keeps its filename table. Add a parallel accessor — do **not** replace
`spriteFor`:

```js
transformFor(unit) -> transform      // REST when nothing is playing
```

It reads the same `live` map (`{clip, startedAt, mirror, back}`), so a unit
with frames plays the frame *and* the motion; one without plays motion alone.
Move's `tiles` comes from the tween's manhattan distance — store it on the
tween when `schedule` creates it.

`settle()` already reports "is anything still running"; a cutout clip must be
included in that or the rAF stops mid-topple.

### 2.4 Wire into `render.js` — three traps

In `drawUnit`, wrap **only the body draw**:

```js
const tr = anim ? anim.transformFor(unit) : REST;
g.ctx.save();
g.ctx.translate(x + tr.dx * SPRITE_H, feetY + tr.dy * SPRITE_H);
g.ctx.rotate(tr.rot);
g.ctx.transform(1, 0, tr.skew, 1, 0, 0);
g.ctx.scale((frame && frame.mirror ? -1 : 1) * tr.sx, tr.sy);
g.ctx.translate(-x, -feetY);
drawUnitSprite(g, entry, x, feetY, false, refH);   // mirror handled ABOVE now
g.ctx.restore();
```

1. **Do not mirror twice.** `drawUnitSprite`'s own `mirror` branch and the
   transform's `scale(-1,1)` cancel each other. Fold mirror into the transform
   and pass `false` down, or delete the branch. This is the bug to expect.
2. **The shadow, faction ring, HP bar, momentum pips, ammo pips and role
   marker are UI and must NOT be transformed.** They stay outside the
   save/restore, on the untransformed `x`/`feetY`/`topY`. A toppling corpse
   whose HP bar topples with it looks like a bug — and `drawUnit` already
   returns early on `hp <= 0` for the bar, so only the ring and shadow matter.
3. **The hit flash redraws the same image in `lighter`** — it must use the
   *same* transform, or the flash detaches from the body mid-lunge.

### 2.5 Style B (second roster + swappable style)

- `turf/data/styles.json`: `{ id, name, units, enemies, spriteDir }` per style.
  `A` is the current files; `B` names a second roster.
- Menu toggle, persisted in `localStorage` under **`turfStyle`** (same pattern
  as `hyperDaggerMode`, `sudsJackHubLayout`).
- **`data/units.json` / `enemies.json` stay the schema of record** — style B is
  another file of the same shape, never a new schema.
- Board geometry does not move: a body is one tile wide, `SPRITE_H` stays 29,
  and every plate is scaled off its own ink. A style that needs different
  proportions is a different game, not a different style.

---

## 3. Gates

```
node turf/test/smoke.mjs        # must stay green (130 checks)
node turf/test/cutout.mjs       # NEW, bare node
node turf/test/balance.mjs      # unaffected; run if combat.js is touched
```

`test/cutout.mjs` must assert at least:

- every clip is `REST` at `t = 0` (a verb that starts displaced pops);
- every clip returns to `REST` at its end **except `death`**, which holds a
  toppled rotation — assert `|rot| > 1.2` and that it stays there at `t = 10s`;
- no keyframe of any clip exceeds the §2.2 bounds;
- the topple falls **away from the attacker**: `sign(rot) === -sign(dirX)`;
- `move` produces `tiles` distinct hops — sample `dy` across the clip and
  count zero-crossings;
- mirroring does not invert rotation twice: `poseAt` is independent of
  `mirror` (the flip is the renderer's job) — this is the guard for trap 1.

**Then take a screenshot.** An art change ends in a picture, never in a green
suite — this repo has twice shipped a gate that certified *works* while the
thing looked wrong. Render one unit through all five clips at real board scale
and look at it.

---

## 4. Two decisions to make deliberately, not by default

1. **The idle breath.** MST-style breathing is what §6 asks for, but `anim.js`
   stops its rAF the moment nothing is animating, and a breath never stops.
   Recommended: **ship `idle` as `REST`**, put the breath behind a constant,
   and if it is wanted later, run it only for the selected unit and the acting
   unit so the loop is bounded. Do not quietly make the game animate forever.
2. **Lunge distance vs. the grid.** `dx = 0.30` sprite-heights is deliberately
   less than half a tile: a lunge that visibly enters the target's tile reads
   as a move, and this game promises that the board says where everything is.

## 5. House rules that apply

- No build step, no dependencies, vanilla ES modules.
- All game logic stays in plain `(x, y)` grid coordinates; `render.js` is the
  only file that knows about pixels, and nothing it computes feeds back into
  game state.
- One `?v=` cache token per module, bumped when and only when its bytes change.
- Every change gets a top entry in `turf/VERSIONS.md` naming what moved and
  why.
- `window.__turf` is the debug seam; add `__turf.debug.playClip(uid, name)` so
  a clip can be fired without winning a fight to see it.
