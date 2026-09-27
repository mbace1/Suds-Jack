# Request to Codex — the clay studio, next pass

From: Claude (branch `claude/radio-free-helsinki-pvtsw5`), 2026-09-27.
Owner direction: *"fix the weak spots, then back to more refined animations and
art style. Make a request to codex if needed."*

The clay studio (`radiofree/studio/clay/`) now renders voiced, lip-synced stop
motion: see `studio/clay/*.js`, `studio/episodes/you-looked-at-it.js` and the
header comments in each file. Rendering is software WebGL (SwiftShader) in this
sandbox, about **12 s per exposure** at 1080×1920. Three pieces of work would go
faster in parallel than in sequence, and none of them touches a file Claude is
editing. **Please keep to the files named in each item.**

---

## 1. `clay/motion.js` — animation curves and secondary motion (new file only)

Every move in the episodes is a hand-rolled `ease()` / `eout()` / `squash()`
lerp. The refinement pass needs a small, tested vocabulary instead:

- `curve(keys)` — keyframes `[{t, v, ease}]` with ease-in/out, hold, and
  **anticipation/overshoot** presets (stop-motion timing: moves start with a
  small wind-up and land with a settle), evaluated at a time already
  quantised to twelve exposures a second.
- `spring(state, target, dt)` — damped follow-through for **secondary**
  parts: hair quiffs, ears, ties, the dog's ears and tail, the balloon string.
  It must be deterministic given the exposure number (the renderer can seek to
  any frame), so integrate from the shot start rather than keeping state
  across calls, or expose a pure `settle(t, params)`.
- `arc(a, b, k, lift)` — a move along an arc rather than a straight line
  (Aardman moves are arcs; straight interpolation reads as CG).

Tests in bare node (`studio/test/motion.mjs`, no browser, no three.js), in the
same style as `radiofree/test/film.mjs`. Do **not** wire it into the episodes;
Claude will adopt it shot by shot.

## 2. Review of `radiofree/studio/` (comments only, no edits)

The review focus that matters here, as in `AGENTS.md`:

- **Determinism**: a frame must be a pure function of its time. Flag anything
  that keeps state between frames in a way that breaks seeking (a `stamped`
  flag, `lastPie`, `lastN` exist on purpose and are reset-sensitive).
- **Leaks over a long render**: `clayPie()` rebuilds geometry per change,
  `printMat` redraws canvases, `LIVE` in `clay.js` only grows.
- **Cost**: `boilAll` re-sculpts every visible clay geometry every exposure;
  anything that could be cached or shared (as the glasses wall does) is worth a
  finding.

## 3. Reference plates for the art pass (if your environment can make images)

The house method for art (CLAUDE.md, Toko Drop section): *a reference, then
render → LOOK → name what is wrong → redo.* The clay sets have no references
yet. If you can generate images, make one 9:16 plate per set, in a
**handmade plasticine-and-card stop-motion** register (soft studio key light,
thumbprints in the clay, card facades with painted plaster, shallow depth of
field), **not** imitating any studio's characters:

1. a miniature Helsinki street at dusk — pastel Jugend facades, lit windows,
   a green-and-cream tram, cobbles, a lamp with a pigeon on it
2. a small TV news studio desk with a clay presenter, a monitor behind
3. a pegboard wall of a hundred pairs of clay glasses
4. three clay plinths with price cards under a spotlight

Save to `radiofree/studio/art-ref/` with a short `README.md` saying how each
was made. If your environment cannot make images, skip this item and say so.

---

Anything in `clay/*.js`, `episodes/*` or `render.mjs` is in active use —
please raise a finding rather than editing it.
