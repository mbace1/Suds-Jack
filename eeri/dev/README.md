# `eeri/dev/` — the dev & FX harness

Open **`eeri/dev.html`** over http. That is the whole thing.

```
python3 -m http.server 8000     # from the repo root
open http://localhost:8000/eeri/dev.html
```

It will not work from `file://` — the panel reads into the game's frame, and
that needs same-origin. The page says so rather than sitting there broken.

## What it is for

Iterating on **feel, visual feedback, audio feedback and debugging** without
destabilising v14 movement, level rules or camera logic.

## The hard rule

**Do not rewrite working EERI systems to integrate this pack.** It is
deliberately peripheral, and `test/dev-menu.mjs` keeps it that way — the
gate fails if `main.js` ever imports it.

`dev.html` **wraps `index.html` in a frame rather than copying it**, so what
you are inspecting is byte-for-byte what the player gets. A dev harness that
is a copy is one that drifts; this repo has paid for that class of bug more
than once, in the arcade's two entry points and in three Eeri lineages.

## How the effects fire without touching the game

`dev-menu.js` samples `window.__eeri`'s debug state once per animation frame
and reads events out of the **differences** (`sample()` and `detect()` in
`js/fx.js`):

| the state that moved | the event inferred |
|---|---|
| `collected` up | pickup |
| `counts().golden` up | pickup, bigger |
| `stomps` up | stomp |
| `bank().remaining` down | dirt, at the machine |
| `wall().hits` up | brick, at the machine |
| `girder().state` changed | heavy |
| `cleared` flips true | clear |

Zero hooks in `main.js`. That is what makes it safe to leave in place while
you tune.

**It is a prototyping device and it says so.** A poll only sees a net change,
so two pickups in one frame read as one event, and an effect fires a frame
late. Both are fine for judging a look and neither is acceptable in the
shipping game.

## Moving an approved effect into production

Once the owner has looked at one and approved it, replace the inference with
an explicit call at the source. Keep the gameplay conditions **exactly** as
they are — only the presentation responsibility moves:

| call site in the game | effect |
|---|---|
| the bolt loop in `main.js` | pickup |
| the robot stomp branch | stomp |
| `site.bank.dig()` | dirt |
| `site.wall.strike()` | brick |
| the girder sling / seat branches | heavy |
| the clear branch | clear |

Then drop the polling for that event. The pack is scaffolding; it is meant
to come down.

## The files

| file | what it is |
|---|---|
| `../dev.html` | the entry point — a same-origin frame around the real game |
| `dev-menu.js` | the panel: level jumps, an effect-fire button per effect, switches, a live state table |
| `dev-menu.css` | deliberately small and ugly, so it is never mistaken for the game |
| `../js/fx.js` | the visual spec, the particle pool, the event inference. **No three.js import** — the renderer is injected |
| `../js/audio-fx.js` | the voice table and a WebAudio kit. Synthesised, never sampled |

## Gates

```
node eeri/test/fx-smoke.mjs     # the FX spec, pool and inference, in bare node
node eeri/test/dev-menu.mjs     # the contract between the pack and the game
```

`fx-smoke.mjs` runs with no browser, no GPU and no audio device, because
`fx.js` and `audio-fx.js` keep their spec and simulation as plain data with
three.js and WebAudio injected. **Do not add a top-level `import * as THREE`
to either** — `dev-menu.mjs` fails on it, on purpose.

`dev-menu.mjs` is the one that catches the silent break: the pack reads
hooks that nothing in the game depends on, so renaming one breaks the pack
and nothing else. That gate is the missing failure.

## Not this

- No text tutorial beside the excavator. If the dirt bank does not read as
  diggable, that is an **art** problem — irregular silhouette, clumps and
  stones, bucket marks, a crumbly face, a little loose motion when the
  machine nears it. Only if all of that fails does a small in-world sign go
  **on the bank**, labelling the obstacle, never the machine or the controls.
- No expansion of machine simulation controls.
- No replacing the movement model as part of FX work.
- No permanent dependency on the frame for production.
- No binary audio assets — see `../assets/audio/README.md`.

## What #235 holds that this does not

The dev/FX pack was built twice — once here, once on
`agent/eeri-dev-fx-pack` (**PR #235**) — from the same handoff. The two
architectures are the same idea: poll the game, infer events from state
differences, synthesise every sound. The difference is the surface. This
pack draws through **three.js, injected**, which is what lets `fx-smoke`
and `dev-menu` run in bare node; #235 draws on a **2D canvas overlay** and
carries one 18-line static contract test.

This one stays. But #235's **menu** is ahead of it, and these are worth
taking when there is budget for them — none touches the FX layer, all are
`window.__eeri` debug hooks plus a row each:

- **invincibility** and **hitbox preview** — the two that make a level
  reproducible to look at rather than to survive
- **machine access / taming** — reach a ride without playing to it
- **one-step dig** — advance the excavator a single beat
- **warps** within a level, not just level jumps
- **copy state** — the readout to the clipboard, for pasting into a note

Anything added here must be added to `dev-menu.mjs` in the same edit: the
pack reads hooks nothing in the game depends on, so a rename breaks it
silently and no other gate notices.
