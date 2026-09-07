# Tiny 2D

A one-button momentum skater. **Tiny Wings' verb on a skateboard**, side-on, low-poly,
no build step — open `index.html`.

Art direction matches `tinyhawk/`: **Skate Story**. A near-black cold world, the lit lip of
the hill glowing neon, and bloom + smear doing the work — ACES with an `EffectComposer`,
**selective bloom via HDR colour** (only the lip's `GLOW.edge` is over 1.0). The bloom
threshold stays high on purpose: drop it and the matte ground blooms too, which greys out
the near-black the whole look depends on.

Spun out of the Tiny Hawk design work. Tiny Hawk itself went third-person 3D; this
side-on idea was too good to throw away with it, so it lives here as its own thing.

## The one button

| gesture | what it does |
|---|---|
| **hold** on the ground | press into the face — gravity ×2.7, you accelerate down the slope |
| **release** at the lip | pop, sized by how long you held (max ~0.4 s) |
| **hold** in the air | dive, to get down onto the next downslope sooner |
| flick up / second finger / `X` | a trick — 0.28 s of rotation you must finish before touching down |

Space or tap anywhere = press. The whole game is *press on the way down, let go at the top,
land along the next slope instead of into it.*

## Scoring

Landing is what pays. A touchdown is graded by how much of your velocity was
**perpendicular** to the slope at contact:

* **perfect** (< 0.17) — keep your speed, +6 %, **fever +1**
* **ok** (< 0.44) — lose a slice of speed proportional to the angle
* **hard** — 45 % of your speed, fever halved
* **bail** — landed mid-trick: a third of your speed, fever to 1, −3 s daylight

Air time and tricks are banked *only on a clean touchdown*, multiplied by fever (cap ×8).
The sun sets in real time; every 200 m buys 7 s of daylight back.

## How it works

* `terrain.js` — alternating crests and troughs joined by **raised-cosine** curves, so the
  slope is exactly zero at every extreme and a hill is poppable. The chain has a net
  **descent** (`DESCENT = 0.115`): without it the hills are a closed energy system and one
  bad climb parks you forever. The visible ribbon is a fixed-vertex sliding window
  rewritten each frame — no chunk pooling.
* `skater.js` — the whole simulation is ballistic. Integrate under gravity, *then* ask the
  terrain if you ended up underground; if so snap to the surface and project velocity onto
  the slope tangent. Cresting a hill launches you for free, and landing quality is just
  the perpendicular component. Substepped at 1/120 s so a fast descent can't step over a hill.
* `main.js` — ortho camera that leads by speed and zooms out as you go faster; three
  parallax hill layers anchored to a *smoothed* camera height (the world descends forever,
  so anything anchored to absolute height eventually floods the screen).
* Still unlit — no lights, no shadows, no fog. Volume comes from three explicit tones per
  surface; the difference is that the lip tone is HDR and blooms. All colour in
  `palette.js`, glow values in `GLOW`.

`window.__t2` exposes `{skater, terrain, audio, input, debug}` for console tinkering and
the headless smoke test.

## Known rough edges

* Tuning is bot-verified, not hand-verified. A naive bot gets ~3 perfect / 8 ok / 5 hard
  over 26 s; the bands need a human pass.
* Tricks are all-or-nothing with no read on whether you have room to land one. Playtest
  whether that wants a tell.
* No daily seed yet — `rng.js` has `dailySeed()` ready for a seeded 3-tries-a-day mode.

## Deploy

Same caveat as the other demos: the published site is served from the **`gh-pages`
branch**, not `main`. Copy `tiny2d/` across to go live at `/Suds-Jack/tiny2d/`, and bump
the `?v=N` cache-busters together.

The game is developed here now — it used to exist only on the deployed site, which is why
its cabinet was `inRepo: false`. Releases go in `VERSIONS.md` (a `## vN` entry at the top,
staged with the change); `scripts/versions.mjs` reads that top entry at deploy time and
the arcade shows the number on the cabinet.
