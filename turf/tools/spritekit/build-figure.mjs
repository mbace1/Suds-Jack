// Slay Kallio's creature plates — the ten figures TURF's cast cannot supply.
//   node build-figure.mjs <specFile> <name>
//
// WHY THIS LIVES IN TURF'S SPRITEKIT and not in slaykallio/: a Slay Kallio
// deploy is the folder minus test/ and art-src/, and this is a build tool, not
// runtime art. More to the point, the whole reason these ten are generated at
// all is that they have to stand in a row with 23 TURF plates — so they are
// made in the SAME SHOP, with the same style block, the same magenta key, the
// same 192x288 cell and the same absolute gate. A second pipeline in a second
// folder is how two art languages start, which is the exact fault v29 fixed
// one row higher up, on the cards.
//
// The differences from build.mjs's character path are three and only three:
//   1. the subject is an ANIMAL, so the anatomy sentences are wrong for it and
//      the pose vocabulary ("planted foot on the RIGHT SIDE OF THE PICTURE")
//      has nothing to grip;
//   2. PROFILE, facing right, fixed — this is a side-view game and a
//      three-quarter turn reads as wrong twice, once per facing;
//   3. no faction trim. PAL.PLAYER cyan and PAL.ENEMY orange are TURF's two
//      crews and nothing on this bridge has a squad.
//
// Everything else — the hard 1px outline, two shade steps, flat fills, the
// magenta key — is turfGrim verbatim, deliberately.
import { readFileSync } from 'node:fs';

const [, , specFile, name] = process.argv;
if (!specFile || !name) { console.error('usage: node build-figure.mjs <specFile> <name>'); process.exit(1); }
const spec = readFileSync(specFile, 'utf8').trim();

process.stdout.write(`A single creature, drawn as a game character sprite for a gritty deckbuilder set on a bridge over a canal in Kallio, Helsinki.

THE CREATURE: ${spec}

VIEW — FIXED, AND THE SAME FOR EVERY FIGURE IN THIS SET: a flat SIDE VIEW, in profile, facing to the RIGHT. The camera is level with the animal, not above it and not below it. Not a three-quarter view, not a front view, not a top-down view. The creature stands or sits on flat ground that is NOT DRAWN.

RENDERING: pixel art in the register of Metal Slug Tactics' character sprites — not its cartoon war-comic content, its TECHNIQUE. A hard one-pixel BLACK OUTLINE carrying the whole silhouette, and black again around every internal shape. Flat colour fills with at most two shade steps per surface: a base tone and one shadow tone. No gradients, no soft airbrushed shading, no anti-aliased edges, no glow. Strong colour-blocking that reads at a glance from a distance, because this is seen small.

THE SILHOUETTE CARRIES THE WHOLE THING. There is no shading to hide a weak shape in, so the outline alone must say what animal this is and how big it is.

THE REGISTER IS KALLIO: wet asphalt, bin juice, canal water and sodium street light. Muted and grubby — municipal green, rust, tar black, gull white, pigeon grey, damp brown. Dirty, but properly coloured: this is a grubby picture with real colour in it, not a pale or washed-out one. No neon, no bright saturated accents, no cyan or orange team trim of any kind.

SCALE AND FRAMING: the creature fills most of the picture and is fully inside it — nothing cropped by any edge, and a clear margin all the way round.

OUTPUT: one single creature, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the creature. The picture contains nothing except the creature: no writing, no lettering, no words, no logo, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no pavement, no water, no cast shadow or contact shadow under it.
`);
