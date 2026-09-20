# texel-studio, spiked on a real TURF tile

The owner found [`EYamanS/texel-studio`](https://github.com/EYamanS/texel-studio)
— an LLM agent that paints pixel art with drawing tools rather than diffusing
it — and asked whether it answers the failure mode behind §2.4.

**It does not, for the cast, and §2.4 says why.** That section measured the
owner's own reference art at **2574 distinct colours in 3025 pixels** — *"smooth
anti-aliased digital shading with a pixel-grid aesthetic, not a quantised retro
palette"* — and records the earlier §2.1 as having drawn the wrong conclusion
from the same evidence: *"that the art should flatten to fit the pipeline,
rather than that the pipeline was the wrong tool for this art."* Texel-studio
paints true flat quantised pixel art. Pointing it at the cast repeats §2.1's
mistake with better machinery. It also has no character-identity mechanism,
defaults to 16x16, and has no concept of animation frames — while the two
defects it would rule out (rotating to profile, duplicating a half-cycle) are
already closed: roster breadth scored **zero mirror failures** across four
characters the recipe had never seen.

**But it is the right tool for the lane next door.** `ART_REQUEST.md` already
reserves `palette.json`'s 32 colours for *"anything in this game that IS meant
to be classic quantised pixel art (tiles, UI, drops)"*, and `render.js` draws
32x16 isometric tile diamonds while a grep for `drawTile|terrain|floorTile`
returns **nothing** — TURF has no terrain art at all.

## What the spike actually did

Driven directly against `agent.run_agent_stream`, no server and no Redis, with
**TURF's own palette** — 14 of `palette.json`'s greys, olives and accents:

```
prompt   "A cracked concrete ground tile for a top-down city game..."
size     32
result   1024 of 1024 pixels filled, 11 of the 14 palette indices used
time     77 s   (~60 agent steps against gemini-3.6-flash)
```

`concrete-32.png` is the result and it is genuinely usable — real quantised
pixel art, in the game's own palette, no post-processing.

## Three findings, one of which is a real limit

- **It ignored "seamless", and the tiling proves it.** `tiletest.cjs` compares
  the mean colour step ACROSS the wrap against the mean step between interior
  columns: **6.26x horizontally, 4.13x vertically** (~1.0 would be seamless).
  `concrete-32-tiled3x3.png` shows why — a crack hugs the tile's left edge and
  lines up into a hard grid when repeated. On a game that draws a visible tile
  diamond that may be acceptable or even wanted, but the agent has no concept of
  wrapping and asking for it in words did not produce it.
- **Its pinned model is dead.** `gemini-2.5-flash` now returns 404 *"no longer
  available to new users"*; `gemini-3.6-flash` works. A one-line fix, but the
  repo has not been pushed since 2026-07-02.
- **77 s per tile** against ~7 s for one image generation. Irrelevant for tiles —
  they are a few dozen one-off assets, not 1400 frames — and it would be
  disqualifying for the cast.

## Reading

Worth using for terrain, props and the effect assets the character prompts
deliberately exclude (muzzle flash, impact sparks). Not for the cast. If tiles
must wrap, either post-process (offset-and-repair) or design the set around a
visible slab joint, which the isometric grid arguably wants anyway.

`tiletest.cjs` stays regardless — it is an absolute check in the same family as
`verify.cjs`, and it asks the one question about a tile that no eye reliably
answers.
