# Toko Trip — release log

## v16 — 2026-09-23

A second water, in TSL, and a comparison — **and the comparison does not
favour the new one.** That is the release.

`?water=tsl`, or `__tt.debug.setWater('tsl')`. The island still boots on the
baked material. A style switch is a comparison, not a decision.

### What it is

Clearwater's shading model as a three node material, so it compiles to WGSL on
the WebGPU backend AND to GLSL on WebGL2 — the only reason it is allowed here,
since a hand-written shader would have to be maintained twice and one of the
two would rot. Schlick Fresnel on water's own F0, Beer–Lambert absorption over
a real path length, a depth-graded tint, the mood's sky as a reflection, one
sun glint.

**Depth comes from a vertex attribute, not a texture.** The water plane
already has 200x200 vertices, so the seabed height under each one is an
attribute and sea level is a uniform — the rasteriser interpolates between
28 cm samples. No bathymetry bake, nothing for the tide to invalidate, and it
lifts v14's recorded cap: the tide was held to 28 cm because the BAKED colours
are painted for the depth at mean sea level and drift out of true as the water
moves. This material has no such cap.

**Fresnel is the whole argument.** How much of the bottom you see through
water depends on the angle you look at it from, and that is a per-pixel,
per-view quantity. Vertex colours are baked once and cannot know where your
head is, so v2's water is equally see-through from every angle.

### What the comparison actually showed

**Midday, from the chair: the TSL water wins.** A real depth gradient —
pale at the waterline, deepening through the channel — that no lerp was
painting in by hand, and the bay brightens correctly toward the horizon.

**Golden hour, at a grazing angle: the TSL water loses, badly.** Correct
Fresnel at a graze is ~98% reflection, and what it reflects is a **32x32
painted gradient** with no clouds in it. So the richest view this island has —
dark teal, green sparkle, the sun's path laid across the cove — flattens to a
uniform pale wash. The baked water's wrongness (fixed transparency) was
HIDING a much bigger wrongness: there is no real environment to reflect.

That is a useful result and it is the reason to build a comparison rather than
a replacement. Making the node material the default would trade a small lie
for a large one.

**What the TSL path needs before it could be the default** is not more shader:
it is something worth reflecting — a real env cube with cloud and horizon
detail, or planar reflection, which is a second render pass per eye and
exactly what the fill-rate ladder says not to do in a headset.

### Found building it

- **The coordinate-space bug, and it looked like success.** The `bathy`
  attribute held terrain height while the sea uniform held world y, which sit
  a whole `PAD_H` apart — so every depth went negative, clamped to zero, and
  left a material that was all Fresnel and no absorption. It rendered. It had
  a horizon that went reflective. It looked like water working, and the tell
  was that tripling the extinction changed nothing. The gate now asserts sea
  level lands inside the seabed's range.
- **`rebuildEnv()` makes a FRESH cube each mood** — deliberately, since the
  renderer caches its filtered copy per texture object. A node captures the
  texture it was built with, so the reflection froze on whatever sky the
  island booted under until the node's `.value` was handed each new cube.
  Gated.
- **Extinction, by looking, three times.** 0.85/m and the bay read as MUD —
  the seabed's wet band was painted dark back when the baked water hid it, and
  too little absorption just shows you that paint. 2.4/m and the colour was
  right but the bottom was GONE, costing the cove the one thing its own code
  comment claims for it: a bowl you can see the bottom of. It sits at 1.3.
- The TSL namespace is already in the vendored bundle as `THREE.TSL` — 615
  exports, including three's own `F_Schlick`. Nothing needed vendoring.

Gate: 93 checks.

## v15 — 2026-09-23

Caustics — the light the water throws on the sand. The owner asked for
[Clearwater](https://github.com/Aureliengmz/clearwater) (Aurélien / Lumaris,
MIT) to be added AS the water, and it cannot be, for four reasons worth
recording rather than hand-waving: it holds its own WebGL2 context; it renders
with `depth: false` and carries its own seabed (333 KB of the 401 KB file is an
embedded pebble texture), so there is nowhere to put the chair, the jetty or
the sand; its shaders are GLSL where this renderer may be WebGPU; and its look
rests substantially on a bloom-and-glare post stack, against the one rule the
whole fidelity ladder here stands on. It is not hard to integrate — it is a
different program.

The IDEA ports perfectly, and it is the thing in those pictures that most says
shallow water. Taken with credit in `CREDITS.md`, re-implemented from scratch:

- **A caustic is where refracted rays BUNCH UP.** Launch a grid down through
  the surface, refract each ray by the local slope, and measure how much the
  area compresses where it lands.
- **Run it once per colour channel at slightly different indices of
  refraction** — that is where the fringe on a caustic filament comes from.
  The real red-to-blue spread is about 1% and lands sub-texel here, so it is
  widened to stay visible: the shape is refraction, the amount is a choice,
  and that is the one liberty taken.
- Clearwater does this on the GPU every frame from a live FFT ocean. This
  bakes it once on the CPU into a tiling texture and lays it on the seabed as
  **one additive decal**, followed vertex by vertex off `groundHeight` so it
  cannot float or sink, masked by depth, and **rebaked as the tide moves**.
- **`map` × `alphaMap` is the whole trick.** three gives each map its own
  transform, so two caustic layers scroll in different directions and multiply
  on a stock material — the interference that stops a scrolling texture
  reading as a scrolling texture. No shader, no post, one draw call, identical
  on both backends.

**The bug worth keeping, because it cost two passes:** the first cut splatted
refracted rays into a histogram at nine samples a texel. Poisson noise at nine
samples IS speckle, and that is exactly what it looked like — a rainbow fizz,
not caustics. A caustic is a **fold, not a scatter**, and the fold has a closed
form: the landing map is `p − b·∇H`, so its Jacobian is `I − b·∇²H` and
brightness is `1/|det|`. Analytic, noise-free, and the web appeared on the
first render after the change.

Three more, all found by looking rather than by the gate:

- **Over-bending destroys a caustic.** At the first bend strength the rays
  scattered rather than focused, and no amount of curve-tuning recovered it.
- **Raising the floor kills the filaments and keeps the peaks**, which is a
  second, different road back to sparkle. The web needs a LOW floor and a low
  gain.
- **The water's own height field is too fine for this.** The caustics bake
  uses P 4/9 where the water's normal map uses 5/13 — rendered side by side,
  the water's fine detail refracts into glitter and the coarse field is the
  one that reads as caustics. A deliberate difference, not a shortcut.

Tuned through the water, because that is the only condition that matters: at
full additive white it stopped being light on a beach and became lace laid
over one. It is the sun's colour bent toward the sea's, at 85%, and it goes
out with the sun rather than with the sky — midday 0.51, golden hour 0.18,
dusk 0.01, which is why golden hour keeps only a trace.

**Honest limit:** it is subtle in a still frame. Caustics are sold by motion
and this island has never been seen in motion by anything but a 2 fps
sandbox. Whether the web reads at eye level in stereo is a headset question.

Cost: ~1.2 s of load for the bake, one extra draw call, and a 113 KB vertex
upload each time the tide moves 2 cm.

Gate: 88 checks.

## v14 — 2026-09-20

The tide. Thirteen versions in, the honest problem was that **everything on
this island happened because you did something** — you pressed the totem, you
pointed at the radio — and when you stopped pointing, nothing happened. A zen
island asked you to sit still and paid nothing for it. You could see all of it
in ninety seconds.

This is the island's one clock, and the point is not that the water moves. The
point is that the things it moves are the things every other system already
reads, so one change makes all of them content:

- **The water rides it** (−1.25 → −0.67 m), and the swell now rides on TOP of
  the tide rather than being the only vertical motion there was.
- **The break walks up the beach** over minutes instead of breathing in one
  place — `foamUpdate` takes `tide + surfLevel(t)`.
- **Sea level is no longer a constant**, and every clamp reads it: `seaY()`
  rather than `SEA_Y`. Low water uncovers **2.4 m of beach you are allowed to
  stand on** (reach 2.6 m → 5.0 m from the chair). That is what makes it a
  mechanic rather than a texture — the tide changes where you may go.
- **The surf comes from the waterline**, so the sound moves with it: the
  emitters re-bisect onto the current edge and sit 2.6 m out at high water
  against 4.6 m at low. From the chair the sea is nearer when it is in.
- **The rocks, the driftwood and the jetty posts surface** at low water, free,
  because they were always there and the water was over them.

Seven minutes for a full ebb and flood, on the slate as **TIDE: still / slow /
quick**. A real tide is not something you can sit through; this is the slowest
thing that is still a thing you can *watch*, which is the only honest reason
to pick a number.

Two caps recorded rather than hidden:

- **28 cm of amplitude**, and the limit is not taste. The water's colour and
  transparency are baked per vertex from the depth at MEAN sea level, so the
  further the tide travels the more the shallows are painted for a depth they
  no longer have. At 28 cm the mismatch sits under the foam line, which is the
  brightest thing in that exact band. Deeper means rebaking 40k vertex colours
  as it moves — a 640 KB upload to fix an error nobody has seen.
- **The baked wet-sand colour and the salt rime stay put.** They are the
  waterline's AVERAGE mark, which is physically what they are.

Three found building it, and the first is the one worth remembering:

- **`soundUpdate` already had a local called `tide`.** It was v10's normalised
  swell breath, 0..1, named before there was a tide — and when one arrived it
  silently shadowed the real thing, so the surf emitters were re-bisected
  against a swell figure instead of against sea level. Nothing threw. The
  sound simply stopped following the water. It is `breath` now, which is what
  v10's own comment had been calling it all along.
- **The foam band did not span the tide.** The points are generated once in a
  narrow height band around mean sea level, so the break walked straight off
  the end of its own cloud at low water and the surf stopped existing. The
  band now spans the whole range (−0.37…0.54) at 1.8x the count, and the gate
  asserts it, because this is invisible until exactly low water.
- **`clampComfort()` runs at module init and now reads `TIDE_RATES`**, which
  was declared after it. Temporal dead zone, and the island did not boot.

And the rulers were wrong twice more, both for the same reason — *sea level is
not a constant any more*: the water check read `water.position.y`, which only
the render loop writes, so at two frames a second it reported the PREVIOUS
phase and the tide looked inverted; and v10's "every surf emitter sits on the
waterline" asserted `groundHeight ~ 0`, which was the definition of the
waterline only while it could not move.

Gate: 83 checks. The one that matters asserts the payoff rather than the
motion — that low water uncovers beach you can walk on.

### Next on this axis

The sun does not move yet. The three moods are still a button, so time passes
in the water and nowhere else. `tideT` is a real clock and the moods are
already a lerp between keyframes; hanging the sky on the same axis is the
obvious follow-on, and it is deliberately NOT bundled here — doing it badly
would wreck three carefully tuned moods to make one release look bigger.

## v13 — 2026-09-19

The first step. Collision is the island's **geometry** now, not its height
field — and the one-sentence reason is that a height field has one answer per
column, and **the jetty deck and the water under it are the same column**.
The jetty shipped in v5 and has been scenery for eight versions: you could
look at it and you could not stand on it.

`groundHeight(x, z)` is unchanged and still the source of truth for the SHAPE
of the island — the mesh, every scatter pass, the sand maps, the surf
emitters. What moved is the thing you WALK on.

- **three-mesh-bvh, vendored** (MIT, `vendor/three-mesh-bvh.LICENSE`). This is
  a downward raycast against 40k+ triangles of terrain every frame: affordable
  with a bounds tree, nothing like affordable without one. `acceleratedRaycast`
  goes on `Mesh.prototype` and falls through to three's own for any mesh with
  no tree, so the teleport ray and the slate's UV pick are untouched and get
  the speed wherever a tree exists.
- **`standY(x, z, feetY)`** — what you would be standing on, or `null` for
  "the sea". The ray starts a step ABOVE your feet, so you step up onto the
  deck lip and not up a wall, and a face only counts if it points up: the side
  of the totem is geometry too, and standing on it is not walking.
- **`wallBetween()`**, and it **slides** rather than refusing. Refusing the
  whole step makes a doorway feel like glue, and this island is all doorways —
  between a chair, a table and a palm.
- **One `tryMove()` for every path that moves you**, so walking, the headset
  sticks and the teleport cannot disagree about where you are allowed to be.

**A bug this exposed rather than caused:** the headset sticks never touched
`xrPos.y`. Only teleport ever set it — so walking off the pad in VR left your
feet at pad height while the sand dropped away underneath you. Standing on the
jetty is the same mechanism, which is why it only works now.

Measured rather than asserted: **93 deck cells** carry you where the height
field refuses, 20 of them interior, and the scattered rest are rocks in the
shallows — which are also standable now, correctly.

And the gate's ruler was wrong twice in one sitting, both times in the same
direction — *the page was right and the ruler was wrong*:

- The cage check asserted `material.wireframe` after the cage had become
  `LineSegments`.
- `standY(0, 0)` reads **0.055**, not 0, and the check demanded ~0. It is
  0.055 because you now stand ON the deck planks laid on the pad rather than
  in them. That gap **is** the feature, so the check asserts the gap.

Gate: 75 checks.

### What is deliberately NOT here

A capsule sweep, step-up onto arbitrary ledges, and anything resembling
jumping. The deck lip is 0.4 m and the jetty is entered from its landward
end, where the step is small — walking at the deep end and hopping up is
refused, which is correct and not a limitation to fix.

## v12 — 2026-09-19

The prop door. Near-Blender-quality props are the direction, which means the
island has to be a place authored geometry can arrive at — and the door it had
logged a warning and skipped the prop, which is the worst of the available
behaviours. The island looks finished, the prop is simply absent, and **absent
is indistinguishable from never-placed**. Nobody wearing a headset is reading
a console.

- **Three named slots** — `chair`, `radio`, `cove` — each shipping a
  code-built stand-in and each declaring the contract a file must meet to take
  its place: a triangle budget, an envelope in metres, and how it is seated
  (`ground` from its own measured base, `shelf` at an exact height, `origin`
  untouched, which is the only sane rule for thirty metres of cove).
- **The enabling change is that the chair is now an object.** It was eleven
  geometries baked into the shared static merge with the deck and the table,
  so a chair file had nothing to take the place of — the door was unusable
  before this regardless of what the loader did.
- **Static, enforced.** Animation clips and skinned meshes are refused, not
  silently frozen: a frozen clip is a prop standing in a pose nobody chose,
  and there is no animation system here to run it in.
- **The envelope check is really a units check.** Over 1.25x or under 0.25x of
  the declared span is refused, because a glTF exported in centimetres arrives
  a hundred times too big and one authored at scene scale a hundred times too
  small — and *both look exactly like a missing prop* from the chair.
- **Failing visibly.** A broken slot puts a magenta twelve-edge cage exactly
  where the prop should have stood, at the declared envelope, turning, labelled
  with the reason and repeated on a banner. The stand-in steps aside rather
  than papering over it: a live slot means the file IS the prop.
- **One door.** The old free-form `MODELS` list folded in, because two loaders
  drift and only one of them gets the fix.
- **The CC-BY credit is real now.** The prop table carried a `licence` field
  that was displayed precisely nowhere while the comment beside it claimed
  props were "credited in world" — a promise in a comment rather than a
  credit. The sign's screen is repaintable and a credited prop lands on it the
  moment it loads. CC0 asks for nothing and is not listed.

`models/CONTRACT.md` is the authoring spec; the `PROPS` table is its
machine-readable half, and the table is what runs.

Two found building it:

- **The door could be crashed by a bad file.** `Box3.setFromObject` walks a
  `SkinnedMesh` through `applyBoneTransform`, which throws outright on a rig
  with missing skin attributes — so measuring before refusing meant a
  malformed file took the whole island down instead of failing visibly, which
  is the one outcome this door exists to prevent. Disqualify first, measure
  second, and measure inside a try.
- **`wireframe: true` draws the triangle diagonals too**, so the first cage
  read as a crumpled cat's cradle rather than as the shape of the hole.
  `EdgesGeometry` gives twelve lines that say "this is the envelope".

And the gate's own ruler went stale in the same hour it was written: the cage
check asserted `material.wireframe` and the cage had become `LineSegments`, so
it failed a page that was correct. *The page was right and the ruler was
wrong* — twice now in this repo, and worth expecting a third time.

Gate: 67 checks. The new ones prove each REFUSAL against a synthetic file, so
the contract is tested without a broken `.glb` being committed to prove it.

### What is NOT in this release

**three-mesh-bvh.** The direction is that it lands *with the first movement
commit*, and this one does not touch movement — `groundHeight()` is still the
only thing the clamps ask. Both sources are reachable from here
(`raw.githubusercontent.com` and the npm registry both answer 200), so
vendoring is unblocked when that commit comes. `kind: 'structure'` marks the
slots it will consume.

## v11 — 2026-09-06

The sand. It is the biggest surface in view from the chair and it had rich
colour — height bands, a tide line, a salt rime, baked AO — and then one
flat roughness and no relief whatsoever, which is why it read as painted
paper rather than ground. Two maps, neither of which costs a frame.

- **Ripples.** Wind ripples are DIRECTIONAL: long crests across the wind
  that wander slowly along their length. Round noise gives porridge; a wave
  whose phase is pushed about by a low-frequency field gives sand. Troughs
  are sharpened and peaks flattened, the way blown grains actually pile.
  Every term wraps on the unit square — a whole number of crests, tiling
  fbm for the wander — so the tile has no seam. ~10 cm ripples, and from a
  deck chair the beach is a **grazing-angle** surface, which is exactly
  where a normal map earns its place and a colour map does not.
- **The sheen.** Wet sand is smoother than dry, and under a low sun that is
  the most recognisable thing a beach does: a band of gloss at the water's
  edge that moves when you move. That map is not tiled — it is the island —
  and it is built on the AO bake's own grid, with the same indexing and the
  same 56 m extent, so it inherits whatever mapping the lightmap already
  lands with instead of inventing a second one to keep in sync. It reads
  `groundHeight`, so the gloss follows the cove if the cove is reshaped
  again. It is never mirror-flat: a perfectly smooth beach is a swimming
  pool.

Tuned by looking, three times, which is the only way this kind of thing
goes: the first cut was **corrugated iron** — `normalScale` 0.6 on a 9x
derivative under a low sun, and the beach came out ploughed. 0.22 was still
furrows. It landed at **0.09**, which is a fifth of where it started, and
the lesson is the usual one for relief under a raking light: the amplitude
that looks right in the map is several times too much on the ground.

Gate: 53 checks. The new ones assert relief that tiles, a roughness map,
and — the part that could silently be backwards — that the gloss is on the
WATER side of the chair rather than merely present somewhere.

## v10 — 2026-09-06

The sound of the place. There was a surf bed before, and it was a
*soundtrack*: two filtered noise layers wired straight to the speakers,
identical wherever you stood. In a headset that is the thing that gives the
illusion away fastest — long before any geometry does — because a place you
can walk around in has to sound different depending on where in it you are.

- **The surf comes from the waterline.** Six emitters, each bisected onto the
  exact ring where `groundHeight` crosses sea level, so they follow the cove
  if the cove is ever reshaped again. Walking down the beach walks INTO the
  sound and the nook is the quiet end of it. They start at six different
  offsets in the one shared loop, because six copies in phase is mono with
  extra steps.
- **The wash breathes with the tide you can see** — the same `surfLevel(t)`
  that lifts the water plane and walks the foam line up the sand. The wave
  you watch climb is the wave you hear.
- **The wind comes from the crowns that are moving.** Three palms, each with
  a band-passed gust following the SAME sway term the crown is drawn with,
  so the tree you hear is the tree you can see doing it.
- **A gull, now and then**, out over the cove and never behind you in the
  grass — two to three cries, a different bird's pitch each time.
- **The mood mixes the air.** Dusk goes quiet and dark and the gulls go home
  (70–150 s apart); midday brightens the wash and puts them back up (16–44).
  Eased, not switched.
- **A SOUND row on the slate**, which is the point of the routing: nothing
  reaches `ctx.destination` on its own any more, so one switch silences all
  of it — the radio included — and anything added later inherits that.

One trap worth the note: three's `setMasterVolume` ramps with
`setTargetAtTime`, and on a **suspended** AudioContext `currentTime` never
advances, so the ramp never arrives and "off" is a promise rather than a
mute. The value is set outright instead; a click on a deliberate mute is
the cheaper of the two.

Gate: 50 checks. The new ones assert the thing that actually matters — that
the sound comes from SOMEWHERE: every surf emitter within 12 cm of sea
level, no two stacked, the wash measurably breathing over five seconds of
tide, each mood mixing the air differently, and SOUND off reading zero at
the listener rather than merely at the surf.

## v9 — 2026-09-06

The fitting room. Everything up to here was tuned blind — no headset has
been near this island — and the settings that decide whether it is pleasant
are exactly the ones a screenshot cannot answer: how fast the sand goes
past, how you turn, and whether the frame holds up. So this release is not
another thing to look at. It is the means of answering those three
questions in one session instead of three.

- **The slate.** A board leaning against the chair, and the only menu on the
  island: four rows, tapped to cycle. GLIDE (gentle / easy / brisk), TURN
  (snap 30 / snap 45 / smooth), EDGES, and a top row that turns the frame
  cost on. It is a real object standing in the sand rather than a panel
  hanging in the air, because a rectangle floating in front of your face is
  the one thing a room built to be sat in cannot have. The whole menu is ONE
  mesh — the row is read off the hit's UV — so adding a row is a line of
  painting, not another object to place.
- **The dials are read where the movement happens**, not copied: one
  `moveSpeed()` that the headset sticks and the flat keys both ask, and the
  turn step comes out of the same table the slate prints. A setting that
  only half the code reads is a setting that lies.
- **A comfort vignette**, and it is a MESH on the camera, not a post pass —
  no-post is what keeps both backends and both eyes cheap, and this is one
  textured quad, the cheapest thing in the frame. It closes in while you
  glide, and a snap turn kicks it so the cut has an edge to happen behind.
  Weaker on a flat screen, where there is no vestibular conflict to soften
  and the same darkening is just a dimmer picture.
- **The frame cost**: average and worst frame over half a second, draw calls
  and triangles, the backend actually in use and the tier chosen. Off by
  default — a number in the corner of a zen island is a number you start
  playing instead of a place you sit in — and turnable on from inside,
  which is the only way it is any use while you are wearing the thing.
- Settings persist under `tokoTrip.comfort`, so a session spent tuning is
  not repeated next visit.

Three found building it, all the same shape — *a thing can report itself
working and be doing nothing*:

- The vignette quad was sized to a guess and fell **entirely outside** the
  flat camera's frustum: fully opaque, correctly faded in and out, visible
  in no pixel. It is measured off the projection matrix in use now, which
  is also the only way to serve two eyes that are not the same shape as
  each other.
- The draw count was **always exactly zero**, which is a very convincing
  wrong answer. three zeroes `renderer.info` at the top of every animation
  frame, so the counters are only true *after* the render.
- The slate faced the wrong way — `nook()` maps local to world through a
  rotation by MINUS the nook yaw, so a mesh set to `NOOK_YAW` ends up
  facing the opposite way from everything the nook layout implies. The same
  handedness trap that once sat the chair with its back to the cove.

Gate: 41 checks. The new ones assert the menu can be *moved* rather than
merely drawn — each row cycles its own dial and no other, the divisor being
the whole menu — and that what you set survives a reload.

## v8 — 2026-08-11

The palms. They were the weakest geometry left, and they are silhouetted
against the sky in every mood, so v7's sky made them show more, not less.

- **A frond is a spine with leaflets now.** Seven flat planes became nine
  live fronds, each a rachis that rises and then droops with fifteen pairs
  of narrow blades along it, angled forward and down — so the outline is a
  feathered sweep rather than a paddle. Pitch varies round the crown: some
  stand, some lie out flat. Every blade is two triangles with one hard
  normal, which is what makes them read as leaves rather than as cloth.
- **Dead fronds.** Three, shorter and brown, hanging under the crown — the
  single most recognisable thing about a coconut palm, and the thing every
  low-poly palm leaves out.
- **The nuts** in a cluster at the growing point, five of them, two tones.
- The crown's shade proxy grew to match: the fronds reach ~2.3 m, and a
  bake that shaded a 1.35 m disc under a 2.3 m crown would have been lying
  again.

About 3,000 triangles a crown, ~44,000 in the whole scene — well inside a
headset's budget, and nothing else in the frame changed cost.

## v7 — 2026-08-11

The sea. It was a teal plane with a scrolling bump map; it is the biggest
surface in view from the chair, and it had never had a pass of its own.

- **It reflects the sky it sits under.** Six small cube faces are painted
  from the SAME gradient the dome uses, plus the sun, and handed to the
  water as an environment map; they are rebuilt a few times across a mood
  blend and once more when it settles. A real cube camera would also catch
  the clouds, but at the cost of a six-view render and a backend-specific
  path, for a reflection nobody reads cloud shapes out of. The colour is
  the point, and this gets the colour exactly.
  Found and fixed: three.js samples an authored `CubeTexture` with X
  mirrored, so the first cut put a second sun on the wrong side of the sea.
- **It swells.** A low-frequency displacement map the GPU moves the mesh by,
  and the whole plane rides a slow surf level — no vertex touched on the
  CPU.
- **Its surface has direction.** A baked normal map from two noise fields of
  different scale summed — capillary ripple riding a longer chop, which is
  what stops it reading as frosted glass — scrolled against the swell so
  the ripple has cross-motion.
- **The foam line moves.** The old foam sat where sand met still water and
  breathed in place. This is a band of points laid across the run of the
  tide, and each frame the ones near the water's *current* reach light up:
  as the plane lifts the reach climbs the sand and the foam climbs with it,
  then draws back and leaves the wet band behind. Alpha per point on the
  CPU — a few thousand numbers a frame, no shader.

All of it is maps and a cube drawn in code, so it renders the same on both
backends, and nothing in it is post-processing.

## v6 — 2026-08-11

The island can take imported models now.

- **A glTF importer**, with `GLTFLoader` vendored beside the rest of three.
  Drop a `.glb` into `models/` and add a row to `MODELS`: the loader drops it
  onto `groundHeight()` from its own measured base, so it cannot float or
  sink, and `at: [x, z]` is metres from the chair in the island's own
  coordinates — the same ones the terrain and the beach mask speak.
  `flat: true` re-materials it into the satin family, which is what stops a
  downloaded PBR asset reading like a photograph glued onto a poster.
- **Every row carries its provenance** — author, source, licence — the same
  discipline the records already follow, because provenance is the expensive
  thing to reconstruct later and 3D assets are where it is easiest to get
  wrong. See `models/README.md`.
- **A missing or broken model is never the reason the island fails to open.**
  Each load is independent; failure is logged and skipped, and costs you that
  prop and nothing else.

Verified end to end with a throwaway model, which loaded, scaled, sat on the
sand, and cast a real shadow into the baked lighting. It was not committed —
`models/` ships with a README and nothing else.

## v5 — 2026-08-11

A jetty — somewhere for the eye to walk.

- **The jetty.** Planks across, two beams under, five pairs of posts into the
  bed, running 8.4 m from the sand out over the water. It is built the way the
  nook's deck is built — a box per board, tone jitter per board, ends baked
  darker — because that is what makes timber read as timber rather than as one
  striped slab. Two things ride the walk out, and both are the tide's: the
  boards get damper and darker the further they are from dry sand, and each
  post carries the waterline on it, soaked below and a pale rime of dried salt
  just above, the same tell v4 gave the sand.
- **Where it is, is the whole design.** On the cove's spine it would run dead
  down the middle of the bay and halve the open water from the chair, which is
  the one view this island is built around. So it goes to one side — and which
  side is not a taste question. The lantern sits 1.65 m off the spine and the
  sign home sits 2.5 m off it the other way; between them a deck fouls one or
  the other at every offset from −2.8 to +2.8, and outside them the palms close
  in. −3.0 m is the only lane with clearance on both sides that still ends in
  water deep enough to need posts.
  Found by measuring, after the first cut put the deck **through** that lantern
  — 9 cm from its post — because the clearance check asked the palms and
  nothing else.
- **It is in the bake.** Five `proxyBox`es rather than one, because `proxyBox`
  is axis-aligned and this deck lies at 23° to the axes, so a single box either
  misses the ends or shades water the planks are nowhere near. Most of the
  shade it throws lands on the **seabed** — v3 gave the bay a bottom, and a
  jetty floating over its own clean sand would give that away.
- **Nothing in it is a measured coordinate.** Where the planks meet the sand is
  *found*, by bisecting the terrain for deck height, because this file's rule
  is that moving `INLET_A`/`INLET_B` reshapes the bay and everything re-places
  itself off the same function. A hardcoded start would have been the one thing
  in the cove that did not move with it. The bisection window is deliberately
  wide: the shore's distance along the spine changes with the offset, and a
  narrow one clamps to its own bound and starts the deck in mid-air.

Not done, and worth knowing: the teleport clamp reads `groundHeight`, so you
cannot stand ON the jetty — you stand under it, in the water, exactly as you do
beside the driftwood log. Walking the planks needs the teleport to know about
the deck, which is a bigger change than adding a prop.

## v4 — 2026-08-10

A graphics and details pass, aimed at what a seated person actually looks at.

- **Clouds.** Half the view from the chair is sky, and a bare gradient was
  the cheapest thing in the scene to improve. Sixteen soft sprites on a
  slowly turning ring — no volumetrics, no per-frame cost — each taking the
  mood's own colour, so a sunset lights their undersides and dusk turns them
  bruise-purple. They have their own seeded rng, so the sky does not
  reshuffle every time a rock moves.
- **A horizon with something on it.** Three far islands in fog colour. An
  empty horizon has no scale in it; with something on it the sea reads as
  distance rather than as a flat band.
- **Birds.** Three, circling, never landing. Two triangles each and a
  wingbeat that is one sine — which is the only thing that makes three
  triangles read as a bird rather than a speck.
- **The tide line.** The waterline is the edge of this scene people look at
  most and the sand simply stopped there. Wet sand is now darker and more
  saturated than dry, and a pale rime of dried salt sits just above the
  water's reach, marking how far it came in.

## v3 — 2026-08-10

The lighting stopped guessing, and the water got a bottom.

- **A real lightmap, replacing the fake one.** v2 shaded the sand with flat
  discs under each object — a decent cheat that could not know a palm has a
  *crown*, so trunks had shadows and the thing casting the actual shade did
  not. Now every standing thing is a sphere or a box, and each point on the
  ground fires a cosine-weighted hemisphere of rays and counts how much sky
  it can see. It runs at load because the proxies are binned into 4 m cells,
  so a ray only tests its own neighbourhood. The bake ships twice: into the
  terrain's vertex colours, and as a 256² `aoMap`, which shades between
  vertices where a 27 cm mesh spacing has nothing to say.
  A palm's trunk shape is now decided in the scatter plan rather than in the
  builder, because the bake has to know where the crown ends up.
- **Water with a floor.** The usual way to fade water at a beach is to read
  the depth buffer and compare; this island already has the seabed as a
  function, so every vertex simply asks how deep the water is above it. No
  depth texture, no backend difference, and it cannot disagree with the
  ground it lies on. Colour and alpha both ride that depth, so the shallows
  are pale and see-through and the bay reads as a bowl you can see the
  bottom of. The horizon sheet behind it is a **ring**, not a sheet — a full
  sheet under the island is opaque, so light through the shallow water lands
  on that instead of on the sand and the whole fade is invisible.
  Tuned twice: the first pass was so transparent the bay read as wet sand
  and the waterline disappeared with it.

Chosen and worth recording: this did **not** use TSL. The vendored r180
bundle ships the node materials but not the TSL functions, and the exact
per-vertex depth above is better than a screen-space one anyway — it asks
the same `groundHeight` everything else asks.

## v2 — 2026-08-10

The cove got much bigger, the island got a book, a radio and a way home,
and the whole thing got a gate.

- **A broad, mellow bay.** `groundHeight`'s profile is now written in world
  metres instead of a normalised dome, because "how many steps of sand
  before the water" is the thing being tuned and a normalised dome hides
  it. A grass crown at ~1.7 m falls to the waterline around r 13 — five
  metres of walkable beach — while the cove tip still drops under water
  about four steps in front of the chair. `ISLAND_R` 18, a wider spine,
  more palms and reeds; every scatter pass re-placed itself off the same
  function, which is what that function is for.
- **Fixed: the chair faced away from the water.** The model is built with
  its backrest at local +z, so rotating the nook by `chairYaw` sat you with
  your back to the cove. `chairYaw` is now documented as the direction the
  *sitter faces*, the nook rotates by `chairYaw + π`, and one `nook()`
  helper maps every local coordinate, so the deck, radio and book cannot
  drift apart from it again. The gate asserts it behaviourally.
- **Quality tiers and static sun shadows.** `TIER` decides once per device:
  Quest keeps the base budget, Vision Pro and desktop get a 1.2×
  framebuffer, a 2048 shadow map, ~2.2× instancing and a denser mesh. The
  sun casts real shadows, rendered only while a mood blends and never
  after — the scene is static and the sun only moves on a mood change — so
  palms and lanterns land on the sand at no steady-state cost.
- **The island notices a real sit.** Head in the seat band for a moment and
  one wave comes in louder with a low chime. A long press on the chair
  recalibrates the seat from the head pose, which is the whole calibration
  path on Vision Pro, where Safari has no `immersive-ar` for `chair-lab`
  and no `squeeze` to bind anything to.
- **The book.** Treasure Island's opening pages on canvas textures rather
  than troika-three-text — no vendored dependency, and sharper per byte at
  one page of large serif type. It opens into your lap, turns, and shuts
  itself at the end. Pages carry a faint emissive so they read at dusk
  without relighting the nook.
- **The radio plays real records**, each one credited in world. A `TRACKS`
  table carries the provenance and a plaque above the radio prints it, so
  nothing plays unattributed; the credit shrinks to fit rather than
  clipping the source. Loading is lazy, so the island still opens at once;
  a missing file falls back to the synth bed in silence; and pressing the
  radio shows a card immediately, because decoding a three-minute side
  takes about three seconds and a button that seems dead gets pressed
  twice. See `audio/README.md` for what is in the folder and on what basis.
- **The way home** is a driftwood signpost with a little CRT on it, drawn
  in code like every marquee on the site. It ends the XR session before
  navigating, so a headset is never left on a dead compositor.
- **`toko-trip/test/smoke.cjs`** — 29 checks, all driven off game state
  rather than the wall clock.

Still to come: the cave interior (deferred by decision), and the nature
walks from real footage.

## v1 — 2026-08-10

Island v2, on the floor for the first time.

- The cove: `groundHeight(x, z)` is the one source of truth — dome falloff,
  the inlet carved from the sea to ~3.5 m in front of the chair, and a level
  pad under the real chair (`PAD_H` 0.92, so the sea sits below your feet).
- The nook: driftwood deck, beach chair placed from `chair-lab.html`'s
  calibration (persistent anchor when granted, local-floor fallback always),
  side table, radio, the book waiting.
- Baked AO in vertex colours (every scattered thing darkens the sand under
  it), grain and bump noise passes on sand and water — the two fixes named
  in the build brief, in order.
- Eight swaying palms, three lanterns that brighten as the mood darkens,
  rocks, a driftwood log, shells, 420 instanced grass tufts, 260 instanced
  pebbles, ~2000 shoreline foam points breathing with the surf, reeds on
  both inlet banks, fireflies at dusk, and the cave landmark with its
  flickering magenta neon arch (exterior only).
- Three moods on the totem (or M): Golden Hour, Dusk & Fireflies, Bright
  Midday — each a single config object.
- Teleport by controller ray (water rejected), pointing at the chair
  returns the reference space to the calibration, desktop drag-look + WASD.
- Procedural surf (brown noise, twin LFO swells); the radio plays a quiet
  self-made pad until `RADIO_TRACK_URL` is given a royalty-free track.
- three r180 vendored locally (`vendor/`), WebGPURenderer with WebGL2
  fallback and a `FORCE_WEBGL` escape hatch. No post-processing.

Still to come, from the brief: sit-down detection, the Treasure Island
book, the radio track, the hub link in-world, the cave interior (deferred
by decision).
