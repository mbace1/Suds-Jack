# Slay Kallio — art request: everything else, to match the owner's 26

Owner, 2026-09-13: *"can you make an art request to match these — level
background, foreground, items, enemies, etc."* **These** are the twenty-six
characters cut from the owner's own casting sheets
(`turf/art-src/sprites/cast/roster/`, cut by `turf/tools/sheet-cut.mjs`), on
the bridge since v34 as the whole human cast. Everything below is asked for in
**their** language, so that a fight stops being three art registers in one
frame (pixel-art people, code-painted animals, a rendered courtyard) and
becomes one.

This follows `turf/ART_REQUEST.md`'s shape because that file has already paid
for the mistakes: an asset that cannot be cut into the game is not an asset
(§1), and a background in the wrong camera is a poster (§10). Read those two
sections; the contract is repeated here only where Slay Kallio differs.

---

## 0. The register, read off the 26

Before anything is drawn, the constraints, measured off the sheet rather than
described from memory (`visual-reference-fidelity`'s rule):

| trait | what the 26 do |
|---|---|
| resolution | a standing figure is **~95–130 px wide × 241 px tall** of ink on a 192×288 plate; the game shows it at ~356 px tall on a 512 texture, upscaled **nearest-neighbour** — it is pixel art and stays pixel art |
| line | a **hard 1px dark ink line** round every form and between forms — no soft edges, no antialiasing against the world |
| shading | **three to four flat tonal bands** per material, off one light from high-left; no gradients, no airbrush |
| palette | desaturated olive, grey, denim, kraft; **warm rust/orange and one saturated accent** per figure (a red beanie, a yellow hard hat, a green mohawk); skin is a small area |
| view | **front / front-three-quarter**, weight centred over the feet, feet flat at the bottom of the ink |
| material | worn: frayed hems, patched knees, scuffed boots; a prop held in the hand, never floating |
| what it is NOT | not clean sprite art, not painterly, not photographic, not isometric |

Anything requested below that does not match this row-for-row does not go
in, whatever else it does well.

## 1. The format — what makes it CUTTABLE (TURF §1, with two differences)

- PNG, sRGB, full resolution; **flat `#FF00FF` magenta ground**, nothing else
  on it; no cast shadow onto the key; named for the id it answers; subject
  clear of the frame edges; no labels, frames or variant grids.
- **Two differences from TURF:**
  1. **Front only.** Everybody faces across this bridge and `puppet.js` mirrors
     the enemy row (`body.scale.x = facing`), so a back view is never drawn.
     One facing per figure. (TURF needs both; do not reuse a TURF request
     verbatim.)
  2. **The runtime file is 192×288**, padded however it likes — the loader
     scans the ink and sizes off it (`plates.js` `scanInk`; TURF's "a prop's
     height comes from its INK, never its file"). Deliver the keyed source at
     any size; `sheet-cut.mjs`'s fit step makes the 192×288.
- **No baked lighting that has to survive.** The plate replaces the PAINT and
  not the process: newsprint, torchlight, nicks, fibre and grime run over
  every figure (`paintCutout`), and from v34 a kraft **cut-out border**
  follows the silhouette. Light in the plate is fine; light the game must
  preserve is not.

## 2. The one hard requirement for backgrounds: THE BRIDGE'S CAMERA

This is the section that exists because of v33. The TURF courtyard, schoolyard
and dockyard are reused as Slay Kallio's backdrops, and on screen they read as
**a poster hung behind the deck**. They are orthographic isometric renders
(45° yaw / 30° elevation — TURF §10.1) and `dockyard` is one-point
perspective; the bridge is a **near-level perspective view**. Two cameras in
one frame is the mismatch TURF §10 refuses on its own board.

Slay Kallio's camera (`scene.js` `resize`), so a plate can be made **in** it:

| | landscape | portrait |
|---|---|---|
| projection | perspective, vertical FOV **36°** | perspective, vFOV **46°** |
| eye height above the deck | **1.6** (deck = 0) | **1.25** |
| aim point | y **0.28**, so tilted down **~10°** | y **0.46**, flatter |
| action width fitted | **4.6** units + 0.35 margin | 4.6 × 0.74 = **3.4** |
| distance | derived from width and hFOV — roughly 6–7 units back from the row | closer |
| far plane | 80 | 80 |

**Consequences that decide the picture:**

- The horizon is **a little above the middle of the frame** in landscape and
  higher in portrait. The deck runs off both ends of the frame on purpose.
- The plate sits on a plane behind the far rail, **cut to the frame's own
  shape** (`bg.js`), and **portrait keeps only the MIDDLE third of a landscape
  plate** — so the subject goes off to one side and **the middle stays a
  quiet mass** (`bg/README.md`). Compose for both crops or deliver a portrait
  cut.
- The **tilt-shift's sharp band follows the deck** (`scene.js`, repaint on
  every row move); everything above and below it is blurred by the game. So
  detail belongs at deck height; a busy sky is wasted.
- The plate is **graded by the hour** (`MOOD` in `data.js` — exposure, lifted
  black, split tint, grain, vignette) unless marked `pregraded`. Deliver flat,
  let the game grade — or deliver three (day / evening / night) and mark them.

**The ten-second test, adapted from TURF §10.2:** stand a figure on the deck in
the game (`?bg=<file>`), and the plate's ground lines either recede toward the
same horizon the planks do, or they do not. If the deck says one horizon and
the plate says another, it is a poster.

### 2.1 What is asked for: the canal, in the bridge's camera, by hour

Six plates. Each is **a Kallio canal-side seen from the middle of a footbridge,
near-level, ~10° down** — the camera above. Paper-theatre reading: **far /
mid / near as distinct planes** (a paper theatre is flats in a row), so the
tilt-shift has planes to land on.

| id | hour | the shot |
|---|---|---|
| `canal-day` | day | the canal bank opposite, a tram stop, apartment fronts, birches — bright, flat, a Karhupuisto Sunday |
| `park-day` | day | the bear statue's park from the path — the shipped photograph's subject, drawn in the register |
| `yard-evening` | evening | a courtyard mouth onto the canal, first windows lit, long shadows across the water |
| `metro-evening` | evening | the metro sign glowing over the steps, people as shapes |
| `street-night` | night | sodium light, wet asphalt, a bar's window the only warm thing |
| `door-night` | night | a stairwell door propped open, one bulb, the canal black behind |

Each: **2048 × 1152 (16:9)**, and — because portrait keeps the middle —
nothing that has to be seen may sit in the outer 30% either side. In the 26's
register: hard ink, flat bands, olive/grey/kraft with sodium and one accent.
**No people on the plates**: people are figures on the bridge, and a painted
one behind them is a second scale.

What is NOT asked for: any iso render, any photograph, any painterly plate.
The photographs (`?scenery=photos`) stay as the comparison set.

## 3. Foreground — the near band, as cut flats

`scene.js` draws an out-of-focus **foreground band** along the bottom
(`paintForeground`), painted in code. Ask instead for **three cut flats** in
the register — the same 192-wide keyed PNG rule as a figure, laid along the
near rail by the game:

| id | what |
|---|---|
| `fg-rail` | a run of the footbridge's own railing: two posts, a rail, a bike lock, a scarf tied on |
| `fg-litter` | the corner of the deck: a can, a crushed cup, a torn poster, cigarette ends |
| `fg-bollard` | a bollard and a coil of chain, the canal wall's edge |

Each **512 × 192**, keyed, front, in the register. They will be blurred by
the tilt-shift; detail is at 2–3 px scale.

## 4. Items — the card pictures, as props in the register

`cardart.js` paints **42 pictures** in code (v29 gave them the plates'
banding and wear; the one thing code could not give them is **volume** — a
prop is a three-quarter view, a code shape is flat-on). Ask for all 42 as
small keyed plates in the 26's technique, front-three-quarter, on magenta,
**160 × 104 (≈ 96×62 ×1.67)**, ink filling ~80% of the frame:

```
dog stick glove bell pigeon bear key tram steam mirror tar badge
fist twofist can bottle bottlebreak cardboard hand spray double sunburst
guitar string hat crowd note noise bin bag haul coin shove cart rattle
stack sweep bridge coat shout lamp rain
```

Rules that came out of v29 and TURF's props: **each is one object**, not a
scene; wear is material (rust runs DOWN, chips at the top edge); the accent
colour is left to the game (a card's picture is tinted by its owner's accent —
draw in neutral kraft/olive/grey and let `paintCardPic` tint). Five of these
have a TURF prop already (bin, lamp, cart, cardboard, stack) — **redraw in
this register anyway**, because a set with five plates and thirty-seven
drawings is two registers again.

## 5. Enemies — the ten that are not people

A roster of street operators has no rat in it, so these ten are still the
code-painted cutouts of v8 standing next to pixel-art people. They are the
biggest remaining seam. Ask for each in the 26's register, **front, keyed,
fit to 192×288 with feet at the bottom of the ink**, same nearest-neighbour
pixel scale as a person (a rat is a rat-sized figure, ~40% of a person's
height; the loader sizes off ink so draw it at the scale it should stand):

| id | kallio name | fantasy name | it is |
|---|---|---|---|
| `rat` | Rat | Imp | a brown canal rat, sat up, whiskers, a real eye (not the ear — v10's fault) |
| `bin_rat` | Bin Rat | Dire Imp | fatter, a crisp packet or peel stuck to it |
| `boss_rat` | The King Rat | Imp Lord | big, scarred, a bottle-cap crown — a boss reads as one |
| `blob` | Mutating Blob | Bog Ooze | olive gel, one eye, no rectangles anywhere (v10) |
| `blob_spawn` | Blob Spawn | Oozeling | the same, small |
| `tar_blob` | Tar Blob | Pitch Ooze | near-black, glossy, a slack mouth — thorns on it |
| `pigeon` | Pigeon | Rook | a Helsinki pigeon, iridescent neck band as one flat band |
| `gull` | Gull | Harpy | big, white, a yellow beak — a menace at bin height |
| `gull_king` | The Gull King | The Harpy Queen | bigger, a crown of bread tags |
| `the_bear` | The Bear | The Stone Bear | **the act-two boss** — the Karhupuisto bear statue, granite, moss in the seams, amber eyes; the biggest thing in the game (43% of its sheet) |

**Both skins are one drawing each** — the fantasy name is a lookup, not a
second set (`data.js`); the imp is the rat with a different colour on it. Draw
the kallio one. **Nightfall mutations** (`nightfall`: grown eyes past dusk) are
done by the game over the plate (`mutate()`), so no mutated variants — but
leave a face area the game can put an eye on.

## 6. The six who act — pose sets for the heroes

`motion.js` moves the card; `frameAt` swaps a drawn frame under it, and only
`leopard` and `gunner` have frames (TURF's seven-pose table). The six heroes
are the ones on screen every turn. Ask for **five frames each** — front only,
so five files not fourteen:

`idle` (the cut, already exists) · `attack-windup` · `attack-release` · `hit`
· `death-fall`

for `beanie-bottle` (Park Drinker), `mohawk-green` (Busker), `hood-can`
(Bottle Collector), `sledge` (Cart Pusher), `rasta-bandaged` (Old Boxer);
`leopard` (Dog Walker) is done. `death-down` too if the budget allows; the
topple already lands the standing frame on its side.

Contract, from TURF §12.5 with one line struck: neutral stand, feet flat at
the bottom of the ink, arms clear of the silhouette, **no baked FX**, reads at
the game's scale — and ~~two facings~~ **one facing**. The reference for every
frame is the roster crop itself (`roster/<name>.png`); `cast/README.md`
measured 12 generations per character against a local crop, and the recipe
is there. This is the one item that needs an API key this environment does
not have.

## 7. Not asked for, and why

- **Map textures.** The torn-paper map (`map.js`) is drawn in code and is a
  different object — paper, not a plate. Leave it.
- **Card frames / UI.** Dark leather stock with bone text was the answer to
  five lit rectangles over a night scene (v10); it is not in the 26's
  register and should not be.
- **A photographed backdrop drawn over.** §2 asks for the canal *in the
  register*; tracing the photographs would give the plate's perspective with
  the photograph's noise.
- **Weapons policy.** None — the owner's own 26 carry knives, a pistol, a
  sledgehammer; the game's verbs are a swing, a bottle and a trolley and the
  figures are people who carry things. (v19's refusal was reversed
  2026-09-09.)

## 8. Acceptance — what a delivery has to survive

1. `node turf/tools/sheet-cut.mjs` (or `kindling/tools/cut.mjs key`) turns
   the magenta into alpha **with no pink rim** — the two-stage key exists
   because the sheets are antialiased against magenta; a delivery that
   defeats it is returned.
2. Placed in `slaykallio/figures/` (people, enemies) or `slaykallio/bg/`
   (plates) and named for its id, **`node slaykallio/test/core.mjs`** passes
   its file checks, and the browser gate's **"every puppet is a painted
   cutout, not a blank plane"** still holds.
3. **A contact sheet of the whole cast** (`__sk.debug.look(id)` for every
   id) is looked at by a person: the new enemy stands next to `hood-can` and
   reads as the same kind of drawing.
4. **A background passes the ten-second test in §2**, in both orientations,
   with a figure standing on the deck — and an art change ends in that
   screenshot, never in a green suite.

