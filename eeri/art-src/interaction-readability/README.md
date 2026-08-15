# Eeri interaction readability pack

Source-only visual language for answering one question: **what can Eeri do here?**

This is not a tutorial-text system. The priority is object behaviour and shape; text is the last fallback.

## Current interaction families covered

- machine mount
- dirt bank / dig target
- ladder
- pipe mouth
- checkpoint
- build piece / placement target

## Readability ladder

1. **Object motion** — the usable part moves or breathes.
2. **Local contrast** — a small highlight sits on the usable part itself.
3. **Physical marker** — chevrons, grip tape, footprint/step mark, airflow strip.
4. **Tiny icon** — only when the action still fails in motion.
5. **Text fallback** — only on the object, never floating beside it.

The dirt-bank rule is explicit: make the dirt look diggable first. If words are still needed, `DIG ME` belongs **on the dirt face**, never beside the excavator.

## Anti-rules

- no pulsing outline around everything
- no floating quest marker
- no arrows that look like a route through the level
- no colour that invents a new palette role
- no readability cue that survives after the interaction is complete

`readability-spec.js` holds the recipes; `readability-cues.svg` provides reusable source shapes; the lab previews the hierarchy.
