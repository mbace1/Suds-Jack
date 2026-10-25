# Motion graphics: what GitHub has that our kit does not (19 Oct)

Owner, 19 Oct: "Can you look into motion graphics side and suggest some cool options. Maybe new graphics or popular
things from GitHub."

**Our own engine already has the motion grammar:**
- manim's easings, springs, staggers and lagged starts;
- 12 fps stepping for card;
- transitions, collage, charts and kinetic type.

So the useful finds are the things it **cannot** do. Four of them were tried inside the papercut box, one test per
shot, in `previews/19-10-Motion-Lab-en.mp4` (silent, 20 s). The code is `scenes/ml_kit.js` with `eras_ml.js`, and the
libraries are vendored in `scenes/vendor/`. All four are MIT and need no network at render time.

## Tried

| # | What it adds | Library | What it would carry in a film |
|---|---|---|---|
| 1 | **Paper with weight.** Real physics: cards fall, tumble and pile up, and a heavy stamp lands and shoves the pile. | matter.js 0.20 (83 KB) | Terms raining on Toko; ballots into a box; a pile of filings; robocalls stacking up. If a shot needs hundreds of bodies, Rapier (WASM, deterministic) is the upgrade. |
| 2 | **Text that makes way.** Paragraphs lay themselves out round a moving shape, a line at a time, in en, fi and ja, with no DOM. | Pretext 1.0 (Cheng Lou, released March 2026) | Small print that parts round Toko's mask; a document he walks through. It could also give the captions balanced line breaks in all three languages. |
| 3 | **Shapes that turn.** One cut shape becomes another: shield → padlock → eye, then the eye blinks. | flubber 0.4 | The satire's turn as one image: the promise becomes the thing. GSAP's MorphSVG does the same, and all of GSAP has been free since 2025. |
| 4 | **Marks by hand.** A red marker circles the clause, underlines it, strikes the opt-out and highlights "Silence counts as consent". The gloved hand follows the pen tip. | rough.js 4.6 | DECODE on paper. It suits any story that is a document: a label, a filing, terms. |

How they fit the pipeline:
- Each test is a pure function of the shot's time, like every other scene. The physics re-simulates from zero whenever
  time goes backwards, so stills and the full render agree.
- Physics contacts can drive the cue sheet, so every card that lands gets its own paper tap.

## Not tried, worth knowing

- **Paper Shaders** (`paper-design/shaders`): small canvas shaders with no dependencies (grain gradient, dithering, mesh
  gradient). They suit a new look, such as dithered Kallio noir, more than the papercut box. The API is still 0.0.x.
- **p5.brush**: natural media (pencil, charcoal, watercolour, hatching), built for print quality rather than speed. That
  is fine for an offline render, and it would give a **court-sketch** look for hearings, a natural fit for Coxon.
- **GSAP**, now free with every plugin: SplitText, DrawSVG, MorphSVG, MotionPath. It is the industry's timeline and can
  be seeked frame by frame. It is worth it only if we want its plugins; our easings already cover the rest.
- **WebGL fluid** (PavelDoGreat/WebGL-Fluid-Simulation, MIT): ink and smoke, e.g. steam in the noir set.

## Not recommended

- **Remotion, HyperFrames (HeyGen, open-sourced March 2026), Motion Canvas and Revideo** are whole video frameworks.
  Our pipeline already does their job: deterministic headless render, captions, sidecars and the sound checks.
  Switching would cost us that and put nothing new on screen. Remotion also needs a company licence above three
  employees.
- **Theatre.js**: development moved to a private repo in 2024, and its current status is unclear.

## Suggestion

Put **1 (physics)** and **4 (marks)** into the next papercut films, because they fit stories already on the table:
- *Per Caller*: the AI robocalls pile up.
- *Label Sold Separately*: the marker circles the one ad in three that says "AI".

Keep **2** for a document story. Keep **3** for a punchline that is a change of shape.

## Second look, 25 Oct: the "20 open-source stacks" list (owner)

Each tool is checked against what the studio already has. Our pipeline already renders deterministically and
headlessly, and it already writes captions, sidecars, a sound mix with loudness checks and three languages. The clay
films already have a hand-written camera back (`clay/welcome/lib/post.js`): ambient occlusion (GTAO), bokeh depth of
field, bloom and a grade.

**Worth trying:**

| Tool | What it would add | Where |
|---|---|---|
| **Blender (headless, Cycles)**: the job Blender MCP does, without the MCP | Real light bounce, subsurface clay and true soft shadows: the Aardman look that WebGL fakes. This is the biggest possible step up for the Toko clay set. | A test: one still of Toko on the bench in Blender, next to the three.js frame. Cost: Blender in the container, about 300 MB, plus porting the sculpt kit. |
| **GSAP plugins** (SplitText, DrawSVG, MorphSVG), free since 2025 | Kinetic captions split by letter, line drawing and shape morphs, all seekable frame by frame | Papercut punchlines. Already noted on 19 Oct as "only if we want its plugins". |
| **whisper.cpp** | Captions from speech | Only for the Gameplay Laboratory compilation, if its clips have commentary. Our films have no voice-over. |
| **Rive / Lottie** | Interactive, state-driven vector animation for apps | Not for films. It suits the arcade games and the Toko Drop menus. |

**Already covered, or not for us:**
- **Already in the pipeline:** Remotion, HyperFrames, Motion Canvas, Manim, FFmpeg and three.js. Remotion also needs a
  company licence above three employees.
- **pmndrs postprocessing and React Three Fiber:** our post chain already has these passes.
- **ShaderGradient:** Paper Shaders, noted on 19 Oct, covers this.
- **Theatre.js:** dormant.
- **Cap and OpenCut:** human tools. The owner could use OpenCut to trim the Gameplay Laboratory clips by hand.
- **Figma MCP:** only if there are Figma files to import.
- **Kokoro:** still held. It has no Finnish voice, and the station's rule is three languages or none.

**Blender verdict (owner, 25 Oct): no.** The test still is kept in `previews/25-10-Blender-test-side-by-side.png`. The clay films stay on three.js.
