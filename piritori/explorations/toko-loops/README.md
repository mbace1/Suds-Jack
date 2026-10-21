# Toko Slomo, acted — looped animation for the noodle-bar narrative scene

**Status: concept and renders sent for approval, 20 Oct 2026. Not wired into the game.**

**v2, 21 Oct** (owner: "Loops review is good but could be slightly more animated"):
- Idle is 6 s and fuller: bigger drying strokes, shoulders that breathe, a look about with a quizzical brow, finger
  taps and two blinks.
- Lean talks: small nods on the syllables, and the cloth hand lifts on the important word.
- Buy info, sabotage and leave all act bigger. Leave has three waves.
- The lantern swings further and the steam is thicker.
- The fills behind moving pieces are shaded, so a gap reads as the cut-out's shadow and not as a light smear.
- Render: `renders/toko-loops-review-v2.mp4`.

Owner, 20 Oct: "Can you look at Project Piritori and the Toko Slomo concept and create looped animations that can act
in game in the narrative scene? Approve concept and renders."

## The concept

Nothing is redrawn. The approved `toko-slomo-noodles-v02.png` (`art-library/screens/instances/era1/`) is split into
cut-card pieces. Each piece moves from a hidden pivot, which is what ART_BIBLE §14 asks for: "paper moved by hands, pins
and hinges". The poses are held on a 10 fps rhythm. The ambient loops hold 4–8 frames each at their own rates, so
nothing loops in step.

It is also the production separation the v02 sheet already asks for: "production still separates stage, Toko, hood,
face mark, props, steam, window pass, copy and controls."

### The pieces

`renders/concept-layers.jpg` shows the stage with Toko lifted out, then every piece tinted with its pivot.

| Piece | Pivot | Moves |
|---|---|---|
| torso | waist, on the counter's back edge | breath, lean over the counter |
| head (hood + hair) | neck, under the chin | tilt, nod, bow, look to the window |
| brows | own centre | raise, knit (they sit over a cleaned patch of hood) |
| eyelids | — | a blink: hood-yellow card drops over the eye openings |
| fore_r: cloth, fist and forearm | right elbow | drying, set down, a wave |
| hand_l: sleeve and hand | left elbow | lift, push, tap |
| note | its centre | slid across the counter to the player |
| counter | — | the near edge of the counter, in front of his waist |
| lantern | its cord | a degree and a half of swing |
| tram | — | rocks on its bogies; headlights breathe |

Drawn in code: steam off the pot, rain in the window, the headlight glow, and the till ringing up the price.

### The clips

Each clip maps to one of the scene's own states.

| Clip | When | What he does | Length |
|---|---|---|---|
| `idle` | the scene is open | dries the cloth round his fist, breathes into his shoulders, looks about with a quizzical brow, taps the note, blinks | 6.0 s loop |
| `lean` | "Toko lowers his voice": while his line is on screen | leans over the counter, stops drying, brows down and in, a small nod on the word | 3.6 s loop |
| `buy_info` | BUY INFO | lifts his hand, slides the note across, the till rings €120, brows up, a nod; the note is yours | 3.2 s, then idle |
| `sabotage` | RISK SABOTAGE | looks to the window, sets the cloth down, knits his brows, a slow shake of the head | 3.4 s, then idle |
| `leave` | LEAVE | a bow from the neck, the cloth raised in three waves | 2.8 s, then idle |

Frame zero of every clip, and `still()`, is the approved painting rebuilt from its pieces. Against the source PNG the
mean difference is 0.17/765, and what remains is anti-aliasing at piece edges. That frame is the reduced-motion and
low-power fallback (§14.4).

## What is in this folder

- `js/toko-stage.js`: the rig, the clips and the player, as one ES module with no dependencies.
  - `createStage(canvas)` returns `{ play(name, {then}), tick(), still(), frame(t, pose), pose(name, t) }`.
  - `play()` blends from wherever he is into the next clip over 0.3 s. A one-shot falls back to `then`.
- `preview.html`: the review page. The buttons play each clip live, and *Play the review reel* runs the sequence.
- `layers/`: the pieces as PNG with alpha, plus `layers.json` (boxes, lid colour, counter edge).
- `tools/seg.py` cuts Toko out of the painting (GrabCut seeded by hand polygons).
- `tools/layers.py` splits him into pieces and fills what each piece hides. It mirrors along each row, so the shelf
  lines and the counter grain carry through.
- `tools/render.mjs`: renders stills and the reel from `preview.html` in headless Chromium.
- `renders/`: `concept-layers.jpg` and `toko-loops-review.mp4`.

Run the preview with `npm --prefix piritori run serve`, then open `/piritori/explorations/toko-loops/preview.html`.

## Honest limits

- **The fills behind the pieces are mirrored, not painted.** Only a few pixels ever show at an edge while he moves. The
  widest reveal is under the cloth when he waves, and there it reads as apron. A painted plate would remove even that.
- **The tram does not pass yet.** Driving it out of the window needs a painted empty street behind it, and a mirrored
  one is not good enough to show for seconds. For now it rocks and its lights breathe in the rain.
- **The mask's smile is fixed.** It is a mask. He acts with his head, brows, hands and eyelids.

## To ship after approval

1. Convert the pieces to WebP and register them in `art/v3/manifest.json` under one `toko-rig-v01` id.
2. In `js/v3/app.js`, the Toko encounter draws into a `<canvas class="scene-image">` instead of the flat `<img>`. Keep
   the same CSS crop.
3. The choice handlers call `play('buy_info' | 'sabotage' | 'leave')`, and the dialogue beat calls `play('lean')`.
4. Under `prefers-reduced-motion`, draw `still()`.
