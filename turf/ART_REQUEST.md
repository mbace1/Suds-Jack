# TURF — the art request

One document to hand to whoever makes the art — a person, Codex, or the Nano
Banana pipeline. `turf/GDD.md` and `turf/PRODUCTION_PIPELINE.md` are the design
canon; this is the *what and why* for the six Milestone 1 archetypes, written
so it works from alone.

**Current state: everything on screen is code-drawn placeholder** — flat
canvas silhouettes, no image assets, `turf/js/render.js`'s `drawUnit`. That
stays live regardless of this request. What's asked for here are **reference
plates**, not a runtime asset swap: art to look at, name what's wrong, redo,
and use to guide a proper pixel-art pass (`PRODUCTION_PIPELINE.md` §4's own
stated plan — "AI-assisted generation for placeholder sprites now... hand-
pixel-art pass in Aseprite later"). See §4 below for what that means in
practice and what is deliberately *not* being asked for yet.

---

## 0. Two ways to fill this request

**A — generate it here, one command.** The repo has a working graphics
pipeline (`assets/README.md`): Nano Banana draws the 2D, prompts live in
`assets/manifest.mjs`, bytes land under `assets/out/`. This PR adds six
entries under `turf/*` (§1) plus a `turfGrim` style block (§3).

```bash
node scripts/assets.mjs status                 # what exists, missing, drifted
node scripts/assets.mjs gen --dry               # what a run would do, calls nothing
node scripts/assets.mjs gen --only turf         # generate them (costs money)
```

**The only thing missing is a key.** Checked this session:
`generativelanguage.googleapis.com` answers — the 403 it returns is *Google's
own* "unregistered caller" reply (confirmed via `node scripts/assets.mjs
doctor`), not the egress proxy refusing the host, so the route is open and
nothing needs a network-policy change. Set `GEMINI_API_KEY`
(aistudio.google.com/apikey) and all six generate on the spot.

**B — deliver files by hand.** Everything below still applies; a generated
image and a drawn one land in the same place.

## 0.1 Either way: deliver FILES

An asset described in a chat, or pasted as an inline picture, cannot be cut
into the game — this has cost other projects in this repo two lost batches
already (`piritori/ART_REQUEST.md` §0.1). Deliver:

- PNG, sRGB, full resolution — never a screenshot, never re-compressed.
- Named after the id it answers (`blade-plate.png`, `grunt-blunt-plate.png`).
- Subject clear of the frame edges, no labels/captions/frames/variant grids.

---

## 1. The six archetypes

Each is a **reference plate** — one figure, three-quarter view, full body,
centred, plain dark backdrop, nothing else in frame. Colours and roles are
read directly off `turf/data/*.json` and `turf/js/palette.js`; a plate that
disagrees with the game's own numbers is a reference for a different game.

**On pose — deliberately not a T-pose.** T-pose is only a requirement for
anything headed to Meshy for rigging (`ART_PIPELINE.md` §0's rule). TURF has
no 3D/rig plan right now — it's a 2D canvas tactics game — so these are asked
for in a natural ready/alert stance instead, the pose an Aseprite artist would
actually want to trace from. **If a 3D or Godot direction is ever decided for
TURF**, re-request these in T-pose per that doc's rule before sending anything
to Meshy; don't assume these plates work for that without redoing them.

### 1.1 Operators (player squad, `turf/data/units.json`)

| id | archetype | weapon | stat | look |
|---|---|---|---|---|
| `turf/blade-plate` | melee | knife (dmg 4, rng 1) | 9 hp, move 4 | fast, close-quarters |
| `turf/niner-plate` | ranged | pistol (dmg 2, rng 5) | 8 hp, move 4 | steady, mid-range |
| `turf/wrench-plate` | control | pipe (dmg 1, rng 1, knockback 2) | 10 hp, move 3 | heaviest, built to shove |

Shared brief: Nordic 90s street operator — dark practical streetwear (jacket,
boots), nothing military or superhero, this is a turf war between locals, not
soldiers. Rim-lit in cold blue-cyan (`PAL.PLAYER` **#6fb8d9**, shadow side
`PAL.PLAYER_DK` **#3f7590**) against a near-black backdrop — the in-game
sprite is rim-lit for exactly this reason (CLAUDE.md's "a hero cannot be a
black silhouette against a dark scene" lesson), so the plate should already
answer that, not need it added later.

```
turf/blade-plate:
A lean street operator holding a fixed-blade knife low and ready, weight
forward like they close distance fast. Dark practical streetwear, hood down.
Rim-lit cold blue-cyan (#6fb8d9) against near-black. Three-quarter view, full
body, centred, plain dark backdrop, no text, no logos, no UI.

turf/niner-plate:
A street operator sighting down a pistol held two-handed at chest height,
calm and settled rather than lunging — this one plays the long game. Dark
practical streetwear. Rim-lit cold blue-cyan (#6fb8d9) against near-black.
Three-quarter view, full body, centred, plain dark backdrop, no text, no
logos, no UI.

turf/wrench-plate:
The heaviest-built of the three operators, gripping a length of pipe in both
hands like a bar about to swing — built for a shove, not a stab. Dark
practical streetwear, wider stance than the other two. Rim-lit cold
blue-cyan (#6fb8d9) against near-black. Three-quarter view, full body,
centred, plain dark backdrop, no text, no logos, no UI.
```

### 1.2 Rival grunts (`turf/data/enemies.json`)

| id | archetype | weapon | stat | look |
|---|---|---|---|---|
| `turf/grunt-blunt-plate` | melee | bat (dmg 2, knockback 1) | 5 hp, move 3 | rangy, swings wide |
| `turf/grunt-handgun-plate` | ranged | handgun (dmg 2, rng 5) | 4 hp, move 3 | the leanest of the six |
| `turf/grunt-shotgun-plate` | ranged | shotgun (dmg 4, rng 2, knockback 1) | 5 hp, move 3 | bulkiest, built for close range |

Shared brief: rival gang, same street-clothes register as the operators —
this is two locals crews, not cops-vs-robbers — but warm rather than cold:
backlit rust-orange (`PAL.ENEMY` **#c9663f**, shadow side `PAL.ENEMY_DK`
**#8c4229**) against the same near-black, so a screen with both factions on
it reads warm-vs-cold at a glance the way the in-game silhouettes already do.

```
turf/grunt-blunt-plate:
A rangy street thug gripping a baseball bat with a wide, wound-up swing
stance. Rough street clothes, no armour. Backlit warm rust-orange (#c9663f)
against near-black. Three-quarter view, full body, centred, plain dark
backdrop, no text, no logos, no UI.

turf/grunt-handgun-plate:
The leanest of the rival crew, holding a handgun low and loose, unhurried —
this one has range and knows it. Rough street clothes. Backlit warm
rust-orange (#c9663f) against near-black. Three-quarter view, full body,
centred, plain dark backdrop, no text, no logos, no UI.

turf/grunt-shotgun-plate:
The bulkiest of the rival crew, a sawn-off shotgun held tight to the hip,
built for a close, ugly fight rather than a clean one. Rough street clothes.
Backlit warm rust-orange (#c9663f) against near-black. Three-quarter view,
full body, centred, plain dark backdrop, no text, no logos, no UI.
```

## 2. Not requested yet

- **No environment/backlot plate.** The channel/cover geometry
  (`turf/data/encounters.json`) is still a Milestone 1 fixed layout being
  balanced (see `turf/VERSIONS.md`'s open item on the bot-playthrough
  difficulty) — a reference plate for it now would likely need redoing once
  the layout settles. Ask again once Phase 2's variable encounters land.
- **No elite/boss variant.** `PRODUCTION_PIPELINE.md` §2.2 calls a boss a
  "Phase 1 stretch goal, not a requirement" — same reasoning, don't spend
  credits ahead of the design.
- **No runtime sprite integration.** Even once plates exist, wiring an actual
  sprite renderer into `turf/js/render.js` (replacing `drawUnit`'s canvas
  silhouettes) is a separate, deliberate change — not implied by generating
  reference art.

---

## 3. The style block (`assets/manifest.mjs`)

```js
turfGrim: `TURF house style. Nordic 90s street-crime realism, not arcade
pulp — Insomnia/Trainspotting register, not Metal Slug's war-comic tone.
Muted, desaturated palette; the only saturated colour is the rim/backlight
named per-subject. Flat, hard-edged lighting, no soft glow, no bloom. Plain
near-black backdrop, no set dressing in frame — the plate is the subject
alone.`,
```
