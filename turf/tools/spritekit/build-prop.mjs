// Street furniture and cover props for the TURF board.
//   node build-prop.mjs <propFile> <name>
//
// NOT the character pipeline, and the rendering block is deliberately different.
// The cast plates are pixel-art-shaped; the owner's prop sheet
// (turf/art-src/reference/props-street.png) is INKED ILLUSTRATION — measured at
// 16.9% pure black, which is the outline and the cast shading, over a dark
// muted earth palette (#443322, #332211, #223322, #333322). Asking for "pixel
// art" here would flatten exactly the quality that sheet has.
//
// The one thing every prop must share is the CAMERA. These sit on the same
// isometric grid as each other, so a prop drawn at a different angle cannot be
// placed beside the ones the owner already made. The view block below is fixed
// and must not be varied per object.
import { readFileSync } from 'node:fs';

const [, , propFile, name] = process.argv;
if (!propFile || !name) { console.error('usage: node build-prop.mjs <propFile> <name>'); process.exit(1); }
const spec = readFileSync(propFile, 'utf8').trim();

process.stdout.write(`A single piece of street furniture, drawn as a game asset for a gritty urban isometric tactics game.

THE OBJECT: ${spec}

VIEW — THIS IS FIXED AND IS THE SAME FOR EVERY OBJECT IN THE SET: a three-quarter ISOMETRIC view from above, the camera looking down at roughly thirty degrees, with the object turned so that we see its front face and one side face at once and a little of its top. Not a flat side elevation, not a straight-on front view, not a top-down plan. The object sits level, as if resting on flat ground that is not drawn.

RENDERING: HEAVILY INKED comic-book illustration, and the emphasis is on heavily. Measured against the reference set, roughly HALF of the object's area is deep shadow or solid black: a thick black outline around the whole silhouette, black again around every internal shape, and large hard-edged masses of black filling the shadow side and every recess, seam and underside. Shadows are solid black shapes with sharp edges, never soft gradients and never grey haze.

THE OBJECT IS DARK OVERALL. Most of its surface sits in shadow; only the top faces and the edges catching the light are lighter. Do not render it evenly lit, and do not let it come out pale, chalky or washed out.

ITS COLOURS ARE RICH, NOT WASHED. Deep green municipal paint, warm rust orange, saturated brown timber, cold blue-grey concrete — properly coloured, just dark. This is a dark picture with strong colour in it, NOT a pale or desaturated one.

WEATHERING is part of the style, not an extra: chipped paint, rust bleeding from bolts and seams, dirt streaks running down vertical faces, scuffs along the edges that get knocked, grime collecting where surfaces meet. It should look like it has stood outside in a city for fifteen years.

SCALE AND FRAMING: the object fills most of the picture and is fully inside it — nothing cropped by any edge, and a clear margin all the way round.

OUTPUT: one single object, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the object. The picture contains nothing except the object: no writing, no lettering, no words, no logo, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no pavement, no kerb, no cast shadow or contact shadow under the object.
`);
