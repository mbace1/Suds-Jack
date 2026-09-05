# Slay Kallio — concept filter

Owner supplied `Slay_Kallio_Sideview_Concept_Pack_v0.1` (nine sheets salvaged
from TURF and the wider art library) with one instruction:

> these are quite different so need filtering before any use

They are. The pack contains at least three incompatible renderings — painted
line-art, pixel art at two different scales, and mixed roster sheets — and most
of its cast is not this game's cast. **Three sheets are kept here, six are
rejected, and nothing is used as art.** This file is the filter and the reason
for each verdict, so nobody re-imports the rejects in six months.

## The five filters

Applied in order. A sheet has to survive all five to be worth keeping.

**1. Identity only, never pixels.** This game draws its figures in code —
`js/puppet.js` paints a 256×512 cutout with a heavy doubled ink line, scumbled
paint and a grime pass, then stands it on a tin or cardboard base. Nothing in
the pack is in that grammar, and nothing in it can be. So a sheet is worth
keeping only for **who a person is** — what they wear, what they carry, how
they hold themselves — and never for how it is rendered. That single rule
disqualifies every sheet as *art* before the others are even asked.

**2. No weapons.** Almost every figure in the pack carries a knife or a gun.
That is TURF's grammar: a tactics game about armed street operators. Slay
Kallio is bums, rats and mutating blobs on a bridge, and its verbs are a swing,
a bottle, a shopping trolley and a plank. A knife silhouette does not transfer;
it changes what the game is about.

**3. Would this person be sleeping under the bridge?** The brief is Kallio
bums. A mohawk street fighter in a puffer vest with a gold chain and a blade is
a different game's protagonist, however good the sprite is.

**4. Real marks come off.** The wanderer's bucket hat carries a real
supermarket wordmark and there is a real cigarette pack in the props row. The
shape, the colour and the read all transfer. The trademarks do not, and are not
reproduced in any shipped drawing.

**5. Profile or nothing.** This is a side-view game and every figure is drawn
in profile facing +x. Front/back turnarounds give identity but no posture;
only three sheets carry a genuine side row.

## Kept

| file | what it is for | what was taken |
|---|---|---|
| `accepted/wanderer-alepa-profile.png` | **Late, the park drinker.** The only sheet that is both on-brief and has an explicit full-body profile. | Yellow bucket hat (no wordmark), olive parka open over a black hoodie, navy tracksuit bottoms with white side stripes, battered dark clogs, a cigarette, hollow eyes, lank hair. |
| `accepted/heavy-white-suit-profile.png` | **The Bridge King.** He is a mob boss rather than a bum, and that is the point — the one person on the bridge with money reads instantly as the one who owns it. | Cream suit, black shirt, gold chain, slicked hair, heavy low mass, small eyes. |
| `accepted/roster-street-identities.png` | **Rival bums.** Kept for two figures out of twenty. | The worn coat with bandaged hands, and the older man in a long coat holding a bottle. |

## Rejected, and why

- **Mohawk knife fighter** (the pack's own first pick) — armed, and a
  fighting-game archetype rather than a Kallio bum. Its side-walk row is the
  best locomotion reference in the pack and this game has no walk cycle: the
  puppets stand, wobble, lunge and topple. Fails 2, 3 and, in practice, 5.
- **Four-direction knife fighter** — armed; front/back/left/right turnaround
  for a character we are not making. Fails 2 and 3.
- **Rogue turnaround** — same, and the thinnest identity of the set.
- **Dreadlocked fighter** — armed; three-quarter rather than profile.
- **Rugged brawler** — move/attack/hit/KO material for a brawler. This game's
  "KO" is a cardboard cutout toppling in 3D about its feet, which no sprite
  sheet can advise on. Fails 1 and 3.
- **Broad neon-alley roster** — superseded by the kept roster sheet; the same
  mining job, done twice.

## What actually changed in the game

Two identities, both rebuilt from scratch in `js/puppet.js`'s own grammar:
Late took the wanderer's silhouette, and the Bridge King took the heavy's. No
pixels were copied, traced or sampled — the sheets were looked at and the
figures were drawn.
