# Suds-Jack

Two games plus an agent pipeline.

| Path          | Game                | Tech       | Live URL                                      |
|---------------|---------------------|------------|-----------------------------------------------|
| `game/`       | Suds Jack           | Canvas 2D  | `mbace1.github.io/Suds-Jack/sudz/`            |
| `game/voxel/` | Suds Jack — Voxel   | Canvas 2D  | `mbace1.github.io/Suds-Jack/voxel/`           |
| `agents/`     | Claude agent pipeline (`orchestrator.py`) | Python | — |

**Toko Drop lives in a different repo.** Its source is not checked in here,
but `agents/toko_playtester.py` reads `toko-drop/index.html` and
`toko-drop/js/*.js` relative to this repo root — so those reads currently
return `[not found]` placeholders and the playtester reviews nothing. Either
vendor the source in, point `TOKO_FILES` at a real path, or run that agent
from the Toko Drop checkout.

## Input support — required

**Every playable must support all three input methods. No exceptions.**

1. **Keyboard** — arrows/WASD, Space, Enter
2. **Touch** — screen zones, with on-canvas button hints on touch devices
3. **Gamepad** — Gamepad API, polled once per frame at the top of the main loop

The mapping below is for single-stick games. Twin-stick games (Toko Drop)
use axes 0/1 to move and axes 2/3 to aim, with the right stick past the
deadzone acting as fire.

### Gamepad conventions used in this repo

Standard mapping. Poll with `navigator.getGamepads()`; take the first
`connected` pad.

| Input                  | Action                          |
|------------------------|---------------------------------|
| Axis 0 / d-pad 14,15   | Move left / right               |
| Button 0 (A)           | Jump or fire; also start/retry  |
| Button 9 (Start)       | Start / retry                   |
| Buttons 1,2,5,7 (B/X/RB/RT) | Superzapper / secondary    |

Rules:
- **Deadzone 0.30** on stick axes — anything smaller is ignored.
- **Edge-trigger discrete actions.** Keep a `prev[]` array of last frame's
  button states; fire only on `down(i) && !prev[i]`. Holding a button must
  never repeat a jump or a zap. Held states (movement, jump-float) read the
  raw pressed value instead.
- **Clear all held state on disconnect**, and handle
  `gamepadconnected` / `gamepaddisconnected`.
- Show a `◎ PAD` / `◎ GAMEPAD` indicator when one is connected, and swap
  on-screen prompts to the button names.

## Deploying

GitHub Pages serves the `gh-pages` branch. `game/` maps to `sudz/` there and
`game/voxel/` maps to `voxel/`. Deploy by copying files into a worktree of
`origin/gh-pages` and pushing — do not merge branches:

```sh
git worktree add /tmp/ghp origin/gh-pages
cp game/voxel/game.js /tmp/ghp/voxel/game.js
git -C /tmp/ghp commit -am "..." && git -C /tmp/ghp push origin HEAD:gh-pages
git worktree remove /tmp/ghp
```

Verify a deploy by comparing blob hashes rather than assuming:
`git hash-object <local>` against the API's blob sha. Note that egress to
`github.io` is blocked from the dev sandbox, so the page itself can't be
loaded here.

## Testing games headlessly

The games are plain scripts, not modules. To exercise them in Node: stub
`document` / `window` / `requestAnimationFrame` with a Proxy-based canvas
context, then `eval` the source with an appended accessor object exposing the
internals you need (`const`/`let` inside `eval` stay eval-scoped, so plain
globals will not see them). For `game/game.js`, strip the outer
`(async function () { ... })();` wrapper first.

**Gotcha:** Node 22 ships a built-in read-only `navigator` global.
`global.navigator = {...}` silently fails; use
`Object.defineProperty(globalThis, 'navigator', {...})` or gamepad polling
appears to do nothing.
