# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate
thing: it tracks every module-graph change so a browser cannot serve half of
one build and half of another. Bump both when shipping.

## v40 — 2026-08-09

**The sword is in.** It has been holstered since v33 for two good reasons and
neither holds any more: it reads as the same man since the repaint, and there
is now something to swing it at.

The grammar was already in `hero.js` and has never been reachable — forward
advances, back retreats, jump strikes, Shift parries, down sheathes, every one
of them committed. The weapon button cycles nothing → pistol → sword now.

**A post**, waist-high, at the middle of the bench. Wooden, and it rocks when
you hit it. The sword's whole design is that the edge lands on ONE frame in the
middle of the swing (`hitAt`) — six frames of wind-up before it is anywhere,
which is the window a parry has to live in — and none of that is a thing you
can feel swinging at air. The pistol reaches it too.

## v39 — 2026-08-09

**He can be hit now, and it shows.** Being hurt was drawn as one frozen frame
of the skid. Row 7 is the stagger — knocked backwards, arms flailing for
balance, then a lean forward as he gets his feet under him — and ten of its
fourteen frames are the move (the last four run him off into a stride, which is
someone else's job). Twenty-eight frames instead of twenty-two, because losing
and regaining your balance wants the room.

Row 45 is the other kind, and it is not a stagger: the whole body seizes, arms
flung wide and then straight above his head. That is what this sheet does for
an energy hit, so `strike(…, 'shock')` plays it and carries **no knockback at
all** — the difference between the two is whether it moves you.

Nothing on the bench can hurt him, so **H** does, from behind so the knockback
carries the right way; **SHIFT+H** is the energy hit. Both are in the gallery.

## v38 — 2026-08-09

**The jump, and then the whole sheet written down.**

Row 13 is not the jump. It is floor-registered from end to end — his feet are
on cell row 47 in all seventeen frames — because it is the crouch, the arm
swing, the rise onto his toes and the landing: what he does ON the ground
either side of a jump. Four of its frames were being hung off the hip as the
flight, so a jump was a man standing still and reaching, floated up the screen
by the engine. The flight is row 14, seven frames of him actually off the
ground. And it was paced at f/3, which ran out of drawing after twelve of the
jump's thirty-six frames and then held one frame for the whole descent — two
thirds of a jump on a freeze-frame. Now f/5, so the arc gets all of it.

**Falling had no animation of its own.** It was three frames borrowed out of
the middle of a running jump, so walking off a ledge played a man mid-leap with
his knees tucked. Row 16 is the fall: arms up, legs together, coming down. And
`landHard` — the one that hurts — was playing the ordinary landing; it is the
tail of row 32 now, the eight frames of sliding out flat.

Also: the running gather hovered three pixels for one of its two frames,
because its two frames have two different floors.

**And the census.** All sixty-one rows identified and written into
`ref/README.md` with what each one is and what uses it. Twenty-five were
mapped; five of those twenty-five were the wrong move, which is the whole
argument for the table. It names the twenty-nine rows nothing uses yet — a
second turn, a pistol-whip, an electrocution, four different ways to end up on
the floor — and the two rules that were being broken: registration is per row,
not per sheet, and a row is not a move.

## v37 — 2026-08-09

**The turn was Conrad's all along, and it was hiding under the standing
frames.** Row 0 was mapped as a three-frame breathing idle. It is not an idle —
it is the ABOUT-FACE: ten frames of him rotating side-on, through front-on with
both arms showing, round to side-on the other way. Only its first three were
being used, and looped, so his idle was a man rocking his shoulders round and
back every ninety frames while the actual turn came off the Prince of Persia
sheet. Now `stand` is one still frame, the way Conrad stands, and the turn is
twenty frames of his own rotation. The Prince's turn is gone.

The facing flips on the way OUT of the move rather than part-way through. The
ten drawn frames already carry the whole rotation, so flipping mid-move hands
the engine's mirror to a clip that is already mirroring itself and he turns
back the way he came; flipping on the last frame draws that frame backwards for
one frame.

**Going up a storey was a winch.** The mantle was playing row 39 — a hanging
man SWINGING HIS LEGS — so he rose twenty-four pixels without his body ever
doing anything about it. The move is on two rows: 27 is the hang with his hands
above the cell, 26 is the fold, his head held still while his knees come up to
his chest and then unfold into standing. Played hang → fold → stand with the
anchor walking from his hands at the lip to his feet on it, that is a man
getting onto a roof. Climbing down is the same run backwards.

A move that spans two rows needed a fourth way of laying one out — `cells`,
`[row, col]` per frame — alongside `n`, `cols` and `rects`.

## v36 — 2026-08-09

**Everything he can do, measured against the floor.** After the run turned out
to be anchored wrong, the same question got asked of all thirty-one
animations: draw each frame on a bare canvas and see where its lowest pixel
lands relative to the floor line it claims. Six were wrong, and two of them
badly.

The cause is that this rip is not registered the same way row to row. Most
rows are drawn against a common floor line, so one `ground` for the row is
right. Some are cropped to the TOP of their cells instead — and a prone man is
seven pixels tall, so `wake`, the very first thing the game plays, had him
**lying in mid-air thirty-one pixels up**, and `dead` floated thirty-eight. Both
carry a floor per frame now (`grounds`, the vertical twin of v35's `axs`), and
the death gets a hand-made arc on top so he is thrown off his feet and comes
back down, which the rip cannot say by itself.

The pistol had three of its own:
- **Aiming floated four pixels** and stood eight pixels forward of where he
  stands, and firing slid the whole eight back and forth. Both anchors per
  frame.
- **Crouched fire was the wrong row entirely.** Row 30 is a man *standing* with
  the arm out and his knees flexed; take him to the floor and tell him to
  shoot and that is what you got. Row 21 is the one where he is actually down —
  pistol up by the ear, then extended level along the ground. Crouched aim and
  crouched fire are both off row 21 now.

What is left is deliberate: the run, the wind-up and the running gather leave
the ground because a running stride does.

## v35 — 2026-08-09

**The run was shuddering, and the stop was the wrong animation.**

The run's twenty frames all shared one anchor column. Measured off the sheet
his belt sits anywhere from x=10.5 to x=19.5 and it zigzags four to six pixels
between *adjacent* frames, so on top of the 1.94px he really travels he was
lurching forward and then back half a body-width — seven frames in twenty had
his pelvis moving BACKWARDS. Every frame is now pinned by its own belt, and the
engine's constant speed does the moving, which is what a run is. The whole
locomotion chain got the same treatment — stand, both halves of the walk, the
wind-up, the run, the halt — so nothing pops sideways handing over to anything
else.

And the stop was playing the wrong row. Row 5 starts him stood still with his
feet together and winds him *forward* into full running posture; row 6 starts
him leaning back with his arms flung out and straightens him up. Letting go of
the stick was playing row 5 — winding him up rather than down, which is why it
never settled. So:

- **`skid` is row 6 now**, the real halt, given **thirty frames and twenty-four
  pixels** of slide instead of seventeen and twelve. A stop that is over in a
  quarter of a second reads as a cut, not as a man stopping.
- **Row 5 becomes `windUp`**, a new state between the walk and the run. A step
  used to hand straight over to a 1.62px/frame cycle, which is a man at a
  standstill teleporting into a sprint. Twenty-two frames now, speed ramped
  across them, and at the end it hands over to the cycle already up to speed —
  or to the halt, if you let go halfway up.

Both are in the gallery as RUN · winding up and RUN · coming to a halt.

## v34 — 2026-08-09

**Jimbo, fitted onto the Prince's animation.** The instruction was not to
repalette the Prince and it was not to change Jimbo — it was to make the frames
off the other sheet be the same man as the walk. Three things do that, and all
three come from the Prince being *naked*: he is bare-armed and barefoot, so the
skin on him is already a region of its own. Sort it into blobs — the top one
cut five rows down is the face, the ones sitting on the bottom of the body are
the boots, the rest are arms — and Jimbo gets **white shoes** and, at last,
**grey sleeves**, which Conrad's sheet can never give because its four browns
are shading laid across the whole garment rather than body versus arm. A
**white tee** goes on the front two columns of the upper chest, because the
open jacket over a white shirt is the loudest thing on him at this size, and
without it a sword frame is a man in a plain dark top.

Every colour it paints is one of his own eighteen. That matters: the
framebuffer quantiser only leaves alone what it has been told to keep, so the
sword frames were snapping to the room palette while the walk did not.

**The turn had a silver stripe down it.** The blade is found by being one or
two pixels through, and a man seen face-on mid-turn is one or two pixels
through as well — so the one animation off that sheet that plays in ordinary
play was being handed a sword. Blade detection is now limited to the four bands
that have a sword in them.

Also: the gallery counted frames by reading `n`, which the hand-laid sword
frames do not have, so it showed `1 / NaN` and never advanced; and it hung the
ledge moves off `lip`, a field renamed to `ledge` when the mantle stopped
clipping. Both fixed, and the eight sword animations are back in the reel —
to be LOOKED at. The sword stays holstered in play.

## v33 — 2026-08-09

**The weapon button gets a buffer.** It was only answered from a standing
frame, so a press made while he was landing, stepping or turning went in the
bin. On a pad that is most of the presses — you reach for the button as you
arrive somewhere, not after. Twenty-two frames, the same reasoning as the jump
buffer, which has been there since the beginning for exactly this.

Found by driving the on-screen pad with real touches on a phone viewport, in
both orientations. Everything else there was already right: a tap is one step,
a hold becomes a run, jump jumps once, MODE toggles once.

## v33 — 2026-08-09

**The sword is holstered.** It is the one thing here that changes what Jimbo
looks like mid-move — the Prince is a different build, 40px to Conrad's 38 and
a different shape — and swapping the character model to get a weapon is the
wrong trade. The frames and the eight states stay in the code. When it comes
back it will be by fitting the Conrad LOOK onto the Prince's animation, not by
letting the Prince's body walk on.

**The pistol instead, and all of it is Conrad's own.** Row 18 is the draw, row
33 the aim and the shot standing, rows 20 and 30 the same crouched. Same build
throughout, so nothing changes shape. E draws it, X fires, down crouches with
it in his hand rather than doubling him over, and two frames of light at the
muzzle make a shot read on a bench with nothing to hit. FIRE and the mode
toggle are separate buttons now — one button cannot both shoot and change what
the whole screen is doing.

**The clipping on the ledge moves.** The lip is the fixed thing in a mantle and
what RESTS on it moves: his hands at the start, his feet at the end. Anchoring
the cell's top to the ledge pins his head there for the whole second half and
he never gets up; anchoring the hip puts it where his feet would be if he were
standing, which mid-mantle he is not. The support point is walked from the
cell's top to its bottom across the move now.

And the bench's ledge is 64px up rather than 48. His hands reach 46 above his
feet, so off a one-storey lip his boots were two pixels off the floor and it
read as a man stretching, not hanging. The catch window went from ten pixels
to fourteen to match, or a 64px lip is a single frame at the apex of a jump.

**The weapon button gets a buffer** — twenty-two frames, same as jump. It was
only answered from a standing frame, so a press made while landing, stepping or
turning went in the bin, which on a pad is most of them.

## v32 — 2026-08-09

**The controls.** Three bugs, and the first one is the whole complaint.

- **The one-shot presses were never cleared.** `input.flush()` exists and the
  rewritten `main.js` never called it, so `jumpPress`, `firePress`, `gunPress`
  and `carefulPress` latched ON permanently after the first press. He jumped at
  every opening he got, the sword drew and sheathed itself, and one press of
  the mode button flipped the mode sixty times a second. It is called from a
  `finally` now, so it happens whatever else does.
- **Taps were being dropped.** A key pressed and released between two polls
  never happened at all — at sixty frames a second a frame is 16ms and a brisk
  tap is shorter. Jump and fire had edges; the HOLDS (left, right, up, down,
  Shift) had nothing. Every key and every on-screen button now keeps counting
  for four frames after it comes up, which is what makes a tap mean one step,
  one turn, one climb. Four is well under the sixteen a hold needs to become a
  run, so a tap is still exactly one step.
- **A tapped up would not pull him up off a ledge.** `input.up` is a held
  state; hanging read it on the frame and missed the tap. It honours the jump
  buffer now, the way standing already did.

And the gap is further right, so there is a hundred and forty pixels of floor
to get up to speed on. With it near the start the first thing anyone did was
walk into the hole.

## v31 — 2026-08-09

**A real turn**, at last. Conrad's sheet has none — that was checked row by
row — but the Prince's does: six frames whose chest goes eight pixels wide to
eighteen and back, which is a man rotating through front-on and the only shape
that is. It plays reversed with the facing flipped on frame one, so the mirror
the engine already applies runs it the right way round.

He changes build for those fourteen frames. The two sheets are two different
men — 40px against 38, slimmer, a different jacket — and bracketed by Conrad's
standing frames the swap is visible. The alternative is no turn at all, which
is what v28 had.

**The navy trousers are fixed.** The belt-finder was measuring against the
FRAME, and a raised sword stretches the frame fifteen pixels of empty air at
the top, which put the waist in his chest. It measures against the body now,
and only accepts a red run between 35% and 70% down him — a second run of hair
is not a belt.

## v30 — 2026-08-09

**The sword.** Flashback has none in it, so these are the Prince of Persia
frames, repainted the same way and standing next to Conrad's without scaling —
his figure is 40px to Conrad's 38.

Eight states, all his own pixels: drawing, en garde, advance, retreat, the
overhead strike, the parry, the clang, sheathing. Press **E** on the bench (or
SWORD on the pad) and the stance takes over: forward advances, back retreats,
up strikes, Shift parries, down puts it away.

That rip is hand-laid rather than a grid, so every frame carries its own source
rect and its own anchor — the REAR foot, because in a lunge that is the planted
one and anchoring on the body's centre drags him backwards as he reaches. The
sheet also faces the opposite way from Conrad's, so the flip is inverted for it.

**Repainting it needed a different trick.** His outfit there is one flat white
with nothing to look up — but the red is his hair AND his belt, in two separate
blobs, and the lower one says where the trousers start. That is what finally
gives Jimbo baggy brown trousers, which no repaint of Conrad's sheet could. The
blade is found by thickness: the only thing on him one or two pixels through.

Sleeves were attempted twice there and dropped both times; see `ref/README.md`.

## v29 — 2026-08-09

**He is Jimbo now.** The sheet is repainted: brown trousers, a white t-shirt, a
dark letterman jacket. `ref/recolour.py` builds `ref/jimbo.png` out of
`ref/conrad.png`, and that is what the game loads.

Most of it is one lookup, the sheet being indexed art. Two things are not:

- **Hair shares a colour with the jacket** (`#633100` is both), so it is split
  by REGION — inside the top eight rows of a frame that colour is hair and
  stays brown, below it is jacket and goes dark.
- **Sleeves cannot be split.** The four browns are shading — lit side, shade
  side, fold, edge — laid across the whole garment rather than body versus
  sleeve. There is no set of pixels that means "sleeve", so grey sleeves need
  hand-painting frame by frame. Not done.

And baggier trousers are a silhouette, which no repaint reaches.

Also in: `ref/pop.png`, the Prince of Persia sheet. His figure is 40px against
Conrad's 38, so the two mix without scaling — that is where the sword comes
from next.

## v28 — 2026-08-09

**There is no turn on the sheet.** Row 18 was mapped as one and it is him
DRAWING THE PISTOL — profile, then something happening across the chest, which
is a gun coming up and not a man rotating. Every wide-chested frame on the
sheet was checked: all of them are arms flung out, being shot or throwing.
Flashback turns Conrad instantly, so this does too — the turn is eight frames
of holding still and flipping rather than eighteen, because eighteen frames of
a still man reads as the game hanging. The gun draw is kept in the gallery
under its own name.

**Two strides corrected**, both measured rather than chosen:

- The walk carries fourteen pixels, not twelve. The single frame of his walk
  with BOTH feet on the ground has them 13.9px apart, and that is the stride.
- The run's cycle is twenty-four frames rather than twenty-two, so a step
  carries 19.4px against the 19.7px his feet are apart at full split.

Carry less than the stride and the planted foot slides backwards under him.
Two pixels a step is a skate.

## v27 — 2026-08-09

**A gap and a ledge**, so the moves that need geometry have geometry. You
cannot judge a running jump on flat ground and you cannot judge a hang at all
without a lip to catch — but it is still a bench, not a level: nothing to
reach, nothing to kill you.

- `bench.js` is a twenty-by-twelve grid with a two-tile gap in the floor and
  one storey-high ledge. The tile queries are the old level's own, minus rooms,
  traps and doors.
- **His reach is forty-six pixels, not twenty-six.** Hanging, Conrad's hands
  are on the lip and his boots are forty-six under it — measured off the sheet.
  The drawn figure's was twenty-six and every ledge in the old level was cut
  for that number, which is exactly why the hang could not take his frames
  until the level went away and the ledges became mine to place.
- So the hang, the mantle and the climb-down are his now. They anchor on the
  LIP — cell top on the ledge line — because that is what the sheet draws them
  against: the whole vertical of a mantle is in the frames themselves, and only
  the horizontal is cancelled out so the move's own carry is not doubled. The
  climb-down is the mantle run backwards, which is what Flashback does too.
- Twenty-one animations in the gallery now.

## v26 — 2026-08-09

**Stripped to the character.** The levels are gone — no rooms, no scenery, no
traps, no sentries, no duel. One flat floor, one man, and every frame he has,
because the animation is the work and everything else was in front of it.

- `level.js`, `rooms.js`, `scenery.js`, `enemy.js`, `fx.js` and `audio.js` are
  removed from the build. They are in git history and on `main` if the world
  comes back.
- Two modes. FREE drives him about on the floor — the only way to judge whether
  a move reads at the speed it actually plays. GALLERY walks through the
  eighteen animations one at a time, looping, with the name and the frame count
  on screen.
- **The drawn figure can no longer appear.** Every state reachable here maps to
  a row of the sheet: the turn, pulling up out of a run, the gather, the drive,
  the landing, the running jump's whole flight, and falling all went in with it.
- Airborne frames anchor on the HIP, frame by frame, rather than on the floor.
  A jump's cell carries its own rise, and pinning it to the floor would add that
  rise to the engine's ballistic one and send him up twice.

## v25 — 2026-08-09

**Conrad's own pixels.** The hero is no longer drawn — he is blitted, cut
straight out of the SNES sprite sheet (`ref/conrad.png`, LuigiBlood's rip).
Polygons from thirteen joint angles get his pose, his proportions and his
timing; they will never get his pixels, so for the hero they step aside.

The number jumps from 5 because this cabinet's public sequence ran to v24 under
a different build of Flash Prince, which this replaces. The log below v5 is
this build's own history.

- Frames are cut on the sheet's 32×48 grid and drawn at whole pixels with no
  scaling. Black is never one of his fourteen colours, so black is the cell
  background and keys out with nothing to lose.
- He survives the sixteen-colour framebuffer because the quantise pass is
  handed his fourteen colours as fixed points: it still snaps the world to the
  room's palette and leaves him alone, so he stays in the draw order — behind
  the foreground, in front of the wall.
- **A cache that had never once hit.** The nearest-colour table was an
  `Int32Array` tested with `< 0`, and a packed ABGR value has its top bit set,
  so every cached answer read back negative and every pixel recomputed sixteen
  distance tests every frame. It is a `Uint32Array` now, zero meaning "not
  worked out yet".
- Mapped so far: stand, walk, the twenty-frame run, crouch, standing up, the
  forward roll, getting up off the floor, and dying. The jumps, the fall, the
  ledge, the turn and the pistol still draw the polygon figure — a jump's cell
  carries its own rise and needs a per-frame anchor off the hip, or he goes up
  twice; the ledge moves hang from the HANDS, where Conrad's hand-to-foot is
  about forty pixels against the twenty-six this game's ledges are cut for.
  The sword has no frames at all: Flashback has no sword in it.
- He no longer fades with the biome. He carries his own colours now.

## v5 — 2026-07-28

The second pass at the references — the two things v4 was still short of, plus
two the pictures do that I had not noticed the first time.

- **Planting has depth now.** A BANK of ferns receding along the horizon, not
  one row: the references never show a single line of plants, and it is the
  mass behind that makes the few near ones read as near. Creeper coming down
  out of the canopy at two depths, and epiphytes clinging to the trunks
  themselves — a bare trunk appears nowhere in either picture.
- **Carved relief.** Recessed panels cut into the interior stone with a lit
  head and a shadowed sill and a motif inside them, and the meander running
  along the fronts of the steps. (On EVERY step front first, which turned the
  floor into a zip fastener — it is one tile in four now.)
- **Light that glows.** `halo()`: a wide soft ring the quantiser lands on
  whatever is nearest, a solid ring of the light's own colour, a hot core.
  With sixteen flat colours there is no bloom to reach for, so glow has to be
  painted the way a 1991 artist would have painted it. On the door and the
  bioluminescence.
- **The man touches the floor.** One flat contact shadow. Without it he is a
  cut-out laid on the picture instead of someone standing in it, and that is
  true of every figure in both references.

## v4 — 2026-07-28

Art built to the owner's reference sheets (two Another World tribute
illustrations, 2026-07). What they demanded that the build was not doing:

- **Every material is a RAMP, not a fill.** A rock face in the reference is a
  lit top plane, a mid face, a shadow side and a dark crevice line — four
  values on one shape — and every mass here was being painted with exactly
  one. The sixteen-colour rule was never the obstacle; the eleven world slots
  were just being spent flat. Every surface now carries EDGE / NEAR / SOLID /
  DARK across it.
- **Foliage is clustered blades, not a frond on a stick.** New `leaves()`:
  broad leaves over a NARROW fan, widest about halfway along, on a filled base,
  drawn dark and then lighter and smaller over the top. The first cut used thin
  triangles over a 270° fan and every cluster came out a black starburst.
- **Growth over every lip** — moss and creeper hanging off each exposed
  surface, LIGHTER than the stone it hangs from. The other way round it reads
  as damage rather than as life, which is the tell in both references.
- **Ruins became architecture**: base, tapered shaft with a lit edge and
  flutes, capital, lintel, and a carved meander. Palace arches got a keystone,
  an impost course and a dark void behind them.
- **The machine became a machine**: dark armoured plate with cyan light strips,
  hot orange vents and slack cable runs, instead of one flat wheel.
- **Warm against cool.** Both references live on it — teal jungle against
  orange machine light, cyan crystal against red rock — and each biome was
  sitting in a single temperature. The reactor's LUX2 is now a hot orange.
- **A sky with things in it**: stars, and three bodies rather than two.
- Foreground **bioluminescence** — glowing caps and crystals clustered along
  the bottom of the frame — and **petroglyphs** cut into the rock where the
  stone starts and the jungle ends.

One thing that had to be walked back: the first atmosphere pass stacked three
haze veils all the way down to the floor, which added to about half an alpha
over everything the player stands on and turned the whole picture pale.
Recession has to happen BEHIND the action, not on it — it is two bands in the
middle distance and one veil at the foot now.

## v3 — 2026-07-28

Prince of Persia's move set, properly; a real control panel on a phone; and
the rock stops being one poured shape.

**The move set.** What was here was Flashback's half — commit, run, hang,
mantle. This is the rest of PoP's vocabulary, and every one of them exists
because the original had it and the game is worse without it:

- **The careful step** (Shift + a direction). Five pixels instead of twelve
  and twenty-six frames instead of twenty-two: more time to travel less
  ground, which is exactly the trade you want when the floor runs out in nine
  pixels. Held, it never promotes to a run. It is the most useful button in
  Prince of Persia and it was missing.
- **Climbing down** (down, at a lip). He kneels, gets his hands on the edge
  and lowers himself over it — twenty-six pixels of descent for free, and the
  difference between a two-storey drop and a survivable one. The button that
  did it is still held when he arrives, so letting go needs a fresh press;
  without that he dropped into the thing he had just carefully avoided.
- **Stepping up** onto anything a foot high, rather than hanging off it. A
  move set that dangles you from a kerb is comic.
- **The run-turn** — plant, pivot, go back the other way in twenty-two frames
  instead of skidding to a halt and then turning in thirty-four.
- **The wall bump.** Running into stone stops you and takes a moment back for
  it. And he will not sprint at a wall he is already standing against, which
  is what turned the first cut into a bump-step-bump oscillation.
- **The flask** now needs a crouch over it, as PoP's potions do — a beat of
  vulnerability in exchange for the heal.
- **A buffered jump.** 26 frames, just longer than a step. A committed move
  set has to forgive a button pressed while you are locked out of the world,
  or it reads as unresponsive when it is only committed.

**The sword.** Found in the tomb, and once it is out he is in a stance rather
than walking: forward advances, back retreats, up strikes, Shift parries, down
puts it away. The **swordsman** runs the same grammar with the same wind-ups,
so a fight is two people reading each other. A strike lands on ONE frame in
the middle of the swing; the parry window is four frames either side of it.
Parry and the blades ring and nobody is hurt. Stand there and you lose a
flask.

**The controls, on a phone.** Held upright, the pad is now a real panel UNDER
the picture — a thumb on a portrait phone covers the bottom third of the
glass, and in a game where the thing that kills you is at your feet that is
the third you most need to see. Landscape keeps the overlay, pushed into the
corners and kept faint. Both are drawn in display pixels rather than into the
sixteen-colour buffer, and both only appear on a touchscreen.

**Art.** Coursed masonry on everything built and bedding planes on everything
natural; alcoves cut into the back walls; grass tufts on soil and chipped
edges on stone; sconces that wash the wall behind them.

## v2 — 2026-07-28

The first act stops being one long screen.

Laid out side by side, screens 0–4 were the same composition five times: palms
at the edges, two suns, a ridge. Every screen was distinct in LAYOUT — which is
what you die on — but not one of them was somewhere you could name afterwards,
and five identical pictures is the fastest way to make a hand-authored world
feel generated.

- **`scene`** — a new optional field on a room. The biome still decides the
  sixteen colours and which shapes are allowed; `scene` decides where in that
  biome you are standing, and hangs one thing in the frame you remember the
  room by. It changes the trunks (count, height, girth, lean) and adds that
  screen's own furniture.
- `pod` — the capsule that put him here, half-buried at the end of the furrow
  it cut, hatch blown off, still venting
- `chasm` — no far side: mist all the way down with something lit at the
  bottom of it, which is the only reason you can tell it is far
- `understory` — down among it, a ceiling of leaves overhead and undergrowth
  at your feet, the sky only a rumour
- `canopy` — above it, the mist now a sea below you with the tops of the trees
  coming up through it
- `firstStone` — the first thing anybody built, seen through the last trees
- `colonnade` — two near columns in black across screen 9, which is what tells
  it apart from screen 8: both are cut block with glyphs, and at a glance they
  were the same picture

## v1 — 2026-07-27

First build. A cinematic platformer in the Another World idiom: filled
polygons quantised to sixteen colours, rotoscoped skeletal animation, fixed
screens with a hard cut between them.

- **Movement is committed.** Every grounded move is a scripted length — a step
  is 22 frames and carries 12px, a turn is 18, a mantle is 40 — and the stick
  is not connected to anything until the move declares itself open. Tap a
  direction for one step, hold it and the step runs on into a run.
- **The ledge.** Walk off an edge and he catches it rather than falls; hold
  toward a lip in the air and he grabs it; up mantles him over. A standing jump
  rises 27px, so his hands reach a lip 53px up, so a 48px storey is climbable —
  every distance in the level is measured off those numbers.
- **Falls.** One storey free, two hurt, three kill. Prince of Persia's ladder.
- **The duel.** A sentry takes 68 frames from seeing you to firing (spot 26,
  draw 26, aim 16) and so do you — drawing the pistol costs 21. Crouch and his
  shot goes over your head; roll and you go under it.
- **Fourteen screens**, jungle → dig → tomb → reactor → palace → overgrown,
  with the sixteen-colour palette walking continuously across the whole run so
  no two adjacent screens are the same colour and no screen announces a change.
- Traps: proximity-free spike cycles, ceiling slabs, tiles that will not hold,
  a plate-and-gate on a timer, pulsing force fields.
- Beast, sentry and drone; three health cells; a run clock with a best time in
  `localStorage` under `flashPrinceBest`.
- Keyboard, gamepad and an on-screen pad on touch. The arcade shell for the way
  back to the hub.
