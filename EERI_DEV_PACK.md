# EERI — the Dev / FX pack

Tools for iterating on **feel, visual feedback, audio feedback and
debugging**, built so they cannot destabilise the shipping game.

**Open `eeri/dev.html` over http.** The full user guide is
[`eeri/dev/README.md`](eeri/dev/README.md); this file is the map.

---

## The one idea

Feel is judged by watching and listening, not by reading a diff. A system
that has to be rewritten before it can be judged never gets judged — which
is exactly how every game in this repo ended up stuck at its first
prototype look (the owner's own diagnosis, recorded in `CLAUDE.md` under
Toko Drop). So this pack is built to be **switched on, watched, tuned, and
then either promoted into the game or thrown away**.

Everything below follows from that.

---

## Layout

```
eeri/
  dev.html              the entry point — a same-origin frame around index.html
  dev/
    dev-menu.js         the panel: level jumps, fire-an-effect, switches, live state
    dev-menu.css        small and deliberately ugly, never mistakable for the game
    README.md           the user guide
  js/
    fx.js               visual spec + particle pool + event inference (no three import)
    audio-fx.js         the voice table + a synthesised WebAudio kit
  assets/
    fx/                 empty on purpose — effects are geometry, not images
    audio/              empty on purpose — sound is synthesised, not sampled
  test/
    dev-menu.mjs        the contract between the pack and the game
    fx-smoke.mjs        the FX spec, pool and inference, in bare node
```

`js/fx.js` and `js/audio-fx.js` live in `js/` rather than `dev/` because
they are the **production** modules — the destination, not the scaffolding.
The game does not import them yet, and `test/dev-menu.mjs` fails if it
starts to before an effect has been approved.

---

## Three decisions worth knowing

**1. `dev.html` frames `index.html`; it does not copy it.**
What you inspect is byte-for-byte what the player gets. A harness that is a
copy drifts, silently, and then you tune something that is not the game.
This repo has paid for that class of bug more than once — the arcade keeps
two entry points byte-identical under test for the same reason, and Eeri
itself forked into three lineages. The gate asserts the frame.

**2. Effects fire from POLLING, not from hooks.**
`dev-menu.js` samples `window.__eeri`'s debug state once a frame and reads
events out of the differences — `collected` went up, so that was a pickup.
Nothing in `main.js` knows the pack exists. That is what makes it safe to
leave switched on while you work, and it is also why it is temporary: a
poll sees only a net change, so two pickups in one frame read as one. When
a look is approved, the inference is replaced by an explicit call at the
source and the polling for that event is dropped.

**3. three.js and WebAudio are injected, not imported.**
The spec (how many particles, what colour, how long) and the simulation
(where they are this frame) are plain data and plain maths. So
`test/fx-smoke.mjs` runs the whole thing in bare node — no browser, no GPU,
no audio device — the same way `test/rooms.mjs` proves a room. **Do not add
a top-level `import * as THREE` to either module**; `test/dev-menu.mjs`
fails on it, on purpose.

---

## What was added to the game

One line, and it is a handle rather than behaviour:

```js
window.__eeri = { player, audio, input, THREE, scene, … }
```

A particle has to be added to *something*. Exporting the scene is how the
pack gets a place to draw without any part of the game having to know
effects exist — the same category as the `tris` and `camera` handles the
test gates already use. Nothing else in `main.js` moved.

---

## Gates

```
node eeri/test/fx-smoke.mjs                              # 31
node eeri/test/dev-menu.mjs                              # 30
```

…on top of the four the project already has:

```
node eeri/test/rooms.mjs                                 # the room prover
NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs        # the game
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs  # a bot finishes every level
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
```

`dev-menu.mjs` is the one that earns its place: the pack reads debug hooks
that nothing in the game depends on, so renaming one breaks the pack and
**nothing else fails**. The dev menu would just quietly show dashes while
the effects quietly stopped. That gate is the missing failure.

---

## Promoting an effect

Keep the gameplay conditions exactly as they are. Move only the
presentation responsibility:

| call site | effect |
|---|---|
| the bolt loop in `main.js` | pickup |
| the robot stomp branch | stomp |
| `site.bank.dig()` | dirt |
| `site.wall.strike()` | brick |
| the girder sling / seat branches | heavy |
| the clear branch | clear |

Then drop that event from the poller. **The pack is scaffolding and is
meant to come down.**

---

## Explicitly not

- **No text tutorial beside the excavator.** If the dirt bank does not read
  as diggable, that is an art problem: irregular loose-dirt silhouette,
  clumps and stones and exposed layers, bucket marks and a crumbly face
  distinct from normal terrain, a little loose motion when the machine
  nears it. Only if all of that fails does a small in-world construction
  sign go **on the bank** — labelling the obstacle, never the machine and
  never the controls.
- No expansion of machine simulation controls.
- No replacement of the movement model as part of FX work.
- No permanent dependency on the frame for production.
- No binary audio assets unless the owner changes that direction
  deliberately — see `eeri/assets/audio/README.md`, and note that changing
  the gate is part of changing the decision.
