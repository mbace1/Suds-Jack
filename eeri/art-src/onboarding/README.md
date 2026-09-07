# Eeri onboarding pack

Source/prototype pack for the first five minutes. It does not add tutorial popups; it turns the existing level grammar into a teaching sequence.

## Principles

- Teach with **safe placement first**, then ask for the verb.
- Bolts draw the intended motion arc before text does.
- One new verb at a time. Level 1 teaches stomp, level 2 climb, level 3 combination; World 2 follows the same rule for water/pipe/pairing.
- A hint appears only after the player has had a fair chance to infer the action.
- Never name keyboard keys. Use the same controller/touch glyph language already used by Eeri.
- A six-year-old can stop moving and inspect the scene forever. Nothing advances because a timer expired.

## The first five minutes

1. **Move:** 8–10 ground-level bolts lead right. No obstacle yet.
2. **Jump:** a low mound interrupts that same trail; the bolt arc draws the jump.
3. **Stomp:** one hopper on open floor, then a higher bolt reachable naturally from the bounce.
4. **Checkpoint:** first activation is on the main route and visually obvious; no explanation required before it works.
5. **Ride:** the excavator is on the route facing the bank. The machine itself, the bank and the action control form one readable composition.

`onboarding-spec.js` is plain data so a level/design agent can compare a room against the teaching contract without importing the game.
