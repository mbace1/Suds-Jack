# MISTAKES.md

Recurring mistakes, recorded so they stop recurring. Each entry is a rule, the
real incident that earned it, and how to tell you are about to repeat it.

**Append to this file when a mistake costs a round of work.** A mistake that
only lives in a chat log gets made again next session.

---

## Art & rendering

### Isometric means NON-CARDINAL directions. Never side profile, never straight-on front.
*2026-08-31, TURF.* Generated a 6-frame run cycle prompted as "SIDE PROFILE,
running toward the RIGHT." Unusable: TURF's board is orthogonal 4-directional
and `render.js`'s `toScreen()` is a 2:1 isometric projection, so the four grid
directions land on the four **screen diagonals**. Every character sprite must be
a 3/4 view facing NE / NW / SE / SW. Two drawn facings mirrored left/right cover
all four.

**Tell:** any prompt containing "side profile", "side view", "facing right", or
"front-facing" for a sprite in an isometric game.

### Check the model tier before concluding a tool can't do the job.
*2026-08-31, TURF.* Spent two rounds concluding "Nano Banana can't hold a
character across poses" and "image gen can't animate" — while pinned to
`gemini-2.5-flash-image`, the cheapest model in the family.
`gemini-3-pro-image-preview` was **already wired into
`scripts/lib/nano-banana.mjs`** and produced six distinct, identity-consistent
frames on the first attempt. The manifest pins flash deliberately to avoid Pro
spend; that is a cost decision, not a capability ceiling.

**Tell:** about to say "the tool can't do X." First check what tier was actually
used, and what else the local code already supports.

### Animation frames must be generated in ONE image, not N separate calls.
*2026-08-31, TURF.* Every per-pose generation is an independent roll: scale
drifts, the ground line moves, poses duplicate. A model holds proportions and
registration *within* a single image. Generate the whole strip in one call at a
wide aspect (`21:9`), then split and register in code.

### Differentiate poses by GEOMETRY, not by adjectives.
*2026-08-31, TURF.* Attack windup vs release read as the same frame because both
prompts described the same end pose, differing only in wording ("tense and set"
vs "braced hard against the recoil"). A model cannot turn a tension adjective
into a distinct silhouette. Describing opposite shapes worked immediately — low
coil vs full extension; tall overhead raise vs low forward lunge. Say
"exaggerate past what feels natural; a subtle difference reads as no difference
at sprite scale."

### Read the owner's supplied references BEFORE designing an approach.
*2026-08-31, TURF.* `turf/references/casting-sheet-run-cycle.png` — a 6-frame
numbered run cycle, two facings, shared ground line — sat unused through several
rounds of guessing at the target. Check `*/references/` and `art-src/` first.

### A gate that certifies *works* cannot see *looks*.
Already recorded for `kindling/`; it generalises. An art change ends in a
rendered image someone looked at, never in a green test suite. Two separate
band-brightness gates "passed" art that was visibly wrong.

---

## Process

### Don't spend a budget guessing. Test the cheapest high-information case first.
*2026-08-31, TURF.* Regenerated all 8 attack frames on a theory before showing
one and asking. When the result was rejected, the whole batch was wasted. Show
one, get a read, then scale.

### Report blocked hosts; never route around them.
*2026-08-31.* `api.pixellab.ai` returned 403 at the egress proxy. Per
`/root/.ccr/README.md` that is an org policy denial to report, not an obstacle to
work around.

### Ask what "goal level" means rather than iterating blind.
*2026-08-31, TURF.* Two full regeneration rounds were rejected as "nowhere near"
before establishing the actual bar (5-6 genuinely distinct frames, consistent
telegraph, correct directions). One question up front would have saved both.

---

## Git & deploys

### Never reuse a version number; read the other lineage's log first.
Recorded for `eeri/` and it applies repo-wide — two lineages both reached "v11"
independently and nothing detected it.

### Deploys never merge, and never regenerate `hub/versions.json` on the deployed tree.
Run `--check`, then `--check --repair`. A plain run rewrites every key from
whatever that tree happens to hold and has moved cabinets backwards.
