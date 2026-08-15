# Claude handoff — EERI Dev / FX pack

*Owner handoff, 2026-08-14. This is the brief the pack was built to; it is
kept at the repo root so the next agent reads it before touching the pack.
The pack itself is documented in [`EERI_DEV_PACK.md`](EERI_DEV_PACK.md) and
[`eeri/dev/README.md`](eeri/dev/README.md).*

## Intent

Iterate on **feel, visual feedback, audio feedback and debugging** without
destabilising v14 movement, level rules, camera logic or the existing
production entry.

## Hard rule

**Do not rewrite working EERI systems to integrate this pack.** The pack is
deliberately peripheral.

`dev.html` wraps `index.html` rather than copying it. This guarantees the
dev tools are inspecting the same build the player sees.

## Files

| file | what |
|---|---|
| `eeri/dev.html` | dev entry point; same-origin wrapper around the real game |
| `eeri/dev/dev-menu.css` | compact dev UI |
| `eeri/dev/dev-menu.js` | controls and state inspector |
| `eeri/dev/README.md` | the user guide |
| `eeri/js/fx.js` | event-reactive VFX — spec, pool, and the state inference |
| `eeri/js/audio-fx.js` | procedural SFX |
| `eeri/test/dev-menu.mjs` | static contract test |
| `eeri/test/fx-smoke.mjs` | FX spec / pool / inference test |
| `EERI_DEV_PACK.md` | developer documentation |

**Deviation from the original handoff, recorded deliberately.** The brief
listed `dev/runtime-fx.js` and `dev/production-fx-shim.js`. The owner's
folder structure (2026-08-14) puts the FX modules at `js/fx.js` and
`js/audio-fx.js` instead, and that is the better place: they are the
**production destination**, not scaffolding, so they should not have to move
when an effect is approved. `test/dev-menu.mjs` enforces that the game does
not import them until one is.

The shim was dropped for the same reason — it existed to preview effects on
the normal page, and a module already sitting in `js/` can simply be
imported when its moment comes. Adding a temporary indirection whose whole
job is to be removed later is a thing to skip when the destination is
already correct.

## Existing API this relies on

`window.__eeri` from `eeri/js/main.js`:

- `player`, `audio`, `exc`, and now `THREE`, `scene`
- `mode()`, `site()`, `collected()`
- `debug.goSite()`, `debug.goLab()`
- `debug.setPos()`, `debug.excPos()`
- `debug.counts()`, `debug.bank()`, `debug.girder()`, `debug.wall()`
- `debug.stomps()`, `debug.checkpoint()`, `debug.flag()`
- `debug.camera()`, `debug.robots()`, `debug.vents()`, `debug.tris()`

**`THREE` and `scene` are the only addition to the game.** A particle has to
be added to something; this is the handle that lets the pack draw without
any part of the game knowing effects exist. Same category as `tris` and
`camera`.

If that API changes, adapt the dev layer. **Do not reshape gameplay around
the dev layer.** `test/dev-menu.mjs` asserts every hook above still exists,
because a rename breaks the pack and nothing else — the menu would quietly
show dashes and the effects would quietly stop.

## How FX detection works

`dev-menu.js` polls the debug state once per animation frame and compares it
with the previous sample, inferring events from transitions:

- `collected` increases → pickup
- `stomps` increases → stomp
- `bank.remaining` decreases → dig
- `wall.hits` increases → wall strike
- `girder.state` changes → heavy action
- `cleared` flips true → completion

Ideal for prototyping: zero invasive hooks. Honest limits, both real: a poll
sees only a **net** change, so two pickups in one frame read as one, and
every effect fires a frame late. A **level change fires nothing at all** —
every counter resets on a new room, and without that guard the first frame
of level 2 fired a dig, a stomp and a clear at once. That guard is a test.

## When moving approved FX into production

Prefer explicit event calls at the source after the look is approved:

- bolt loop in `main.js` → pickup FX/SFX
- robot stomp branch → stomp FX/SFX
- `site.bank.dig()` call → dirt FX/SFX
- `site.wall.strike()` call → brick FX/SFX
- girder sling/seat branches → heavy FX/SFX
- clear branch → completion FX/SFX

Keep the gameplay conditions exactly as they are. Move only presentation
responsibility.

## Dirt-wall direction

Do **not** add explanatory text next to the excavator.

The bank itself should communicate "diggable":

1. irregular loose-dirt silhouette
2. clumps / stones / exposed soil layers
3. bucket marks and a crumbly face distinct from normal terrain
4. small loose-dirt motion when the excavator approaches or contacts it

Only if that still fails readability, use a small in-world construction sign
on/at the bank saying **DIG ME**. The sign labels the obstacle, not the
machine or controls.

## Recommended next integration order

1. Use `dev.html` and tune FX/SFX without touching production.
2. Fix the known respawn + stomp-strength issues separately.
3. Get dirt-bank readability working visually.
4. Approve the useful effects one by one.
5. Port approved event calls into `main.js` / `audio.js`.
6. Remove polling for each event as it is ported.
7. Run existing EERI gates plus `node eeri/test/fx-smoke.mjs` and
   `node eeri/test/dev-menu.mjs`.

## Avoid

- no new text tutorial beside excavator
- no machinery simulation-control expansion
- no replacement of the existing movement model as part of FX work
- no permanent dependency on the iframe for production
- no binary audio assets unless the project's audio direction changes
  intentionally
