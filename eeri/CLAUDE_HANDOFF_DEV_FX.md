# Claude handoff — EERI Dev / FX Pack

## Intent

Use this pack to iterate on **feel, visual feedback, audio feedback and debugging** without destabilizing v14 movement, level rules, camera logic or the existing production entry.

## Hard rule

**Do not rewrite working EERI systems to integrate this pack.** The pack is deliberately peripheral.

`dev.html` wraps `index.html` rather than copying it. This guarantees the dev tools are inspecting the same build the player sees.

## Files added

- `eeri/dev.html` — dev entry point; same-origin wrapper around the real game
- `eeri/dev/dev-menu.css` — compact dev UI
- `eeri/dev/dev-menu.js` — controls and state inspector
- `eeri/dev/runtime-fx.js` — event-reactive VFX + procedural SFX prototypes
- `eeri/dev/production-fx-shim.js` — optional one-line normal-page preview
- `eeri/test/dev-pack.mjs` — static contract test
- `eeri/EERI_DEV_FX_PACK.md` — user/developer documentation

## Existing API this relies on

`window.__eeri` from `eeri/js/main.js`, including:

- `player`, `audio`, `exc`
- `mode()`, `site()`, `collected()`
- `debug.goSite()`, `debug.goLab()`
- `debug.setPos()`, `debug.excPos()`
- `debug.counts()`, `debug.bank()`, `debug.girder()`, `debug.wall()`
- `debug.stomps()`, `debug.checkpoint()`, `debug.flag()`
- `debug.camera()`, `debug.robots()`, `debug.vents()`, `debug.tris()`

If that API changes, adapt the dev layer. Do not reshape gameplay around the dev layer.

## How FX detection works

`RuntimeFX` polls the debug state once per animation frame and compares it with the previous sample. It infers events from state transitions. Examples:

- `collected` increases → pickup
- `stomps` increases → stomp
- `bank.remaining` decreases → dig
- `wall.hits` increases → wall strike
- `girder.state` changes → heavy action
- `cleared` flips true → completion

This is ideal for prototyping because it requires zero invasive hooks.

## When moving approved FX into production

Prefer explicit event calls at the source after the look is approved:

- bolt loop in `main.js` → pickup FX/SFX
- robot stomp branch → stomp FX/SFX
- `site.bank.dig()` call → dirt FX/SFX
- `site.wall.strike()` call → brick FX/SFX
- girder sling/seat branches → heavy FX/SFX
- clear branch → completion FX/SFX

Keep the gameplay conditions exactly as they are. Move only presentation responsibility.

## Dirt-wall direction

Do **not** add explanatory text next to the excavator.

The bank itself should communicate "diggable":

1. irregular loose-dirt silhouette
2. clumps / stones / exposed soil layers
3. bucket marks and a crumbly face distinct from normal terrain
4. small loose-dirt motion when the excavator approaches or contacts it

Only if that still fails readability, use a small in-world construction sign on/at the bank saying **DIG ME**. The sign labels the obstacle, not the machine or controls.

## Recommended next integration order

1. Use `dev.html` and tune FX/SFX without touching production.
2. Fix the known respawn + stomp-strength issues separately.
3. Get dirt-bank readability working visually.
4. Approve the useful effects one by one.
5. Port approved event calls into `main.js` / `audio.js`.
6. Add the production shim only temporarily; remove it once effects are native.
7. Run existing EERI gates plus `node eeri/test/dev-pack.mjs`.

## Avoid

- no new text tutorial beside excavator
- no machinery simulation-control expansion
- no replacement of the existing movement model as part of FX work
- no permanent dependency on the iframe for production
- no binary audio assets unless the project's audio direction changes intentionally
