// Prompt builder — the working recipe from Round 2, parameterised.
//   node build.mjs <identityFile> <pose> > prompt.txt
//
// The rules baked in here are the ones that were MEASURED to matter:
//  * pose described in absolute SCREEN-space ("right side of the picture"),
//    never body-relative ("his right leg") and never relative to another
//    frame ("swap the legs") — relational deltas produced near-duplicates
//    (legIoU 0.847) and body-relative terms are ambiguous to the model.
//  * no "FRAME 1 / FRAME 2" language anywhere: that wording alone caused
//    labels to be rendered into the image.
//  * identity reference is a NEUTRAL standing pose, never a previous frame,
//    so there is no pose available to copy.
//  * any held prop is named in the identity block, not the pose block, or
//    it silently disappears in poses that don't mention it.
import { readFileSync } from 'node:fs';

const POSES = {
  'contact-right': `
- His forward leg reaches down and toward the RIGHT SIDE OF THE PICTURE. Its foot is planted flat on the ground on the RIGHT SIDE OF THE PICTURE, taking full weight, that knee only slightly bent.
- The other leg trails up and behind toward the LEFT SIDE OF THE PICTURE, knee sharply bent, that foot lifted clear of the ground, heel up.
- So: planted foot low on the right of the picture, lifted foot behind on the left. Hips tilt down toward the planted right-hand side.

Caught at the LOWEST, most compressed moment of a run, torso pitched forward.`,

  'contact-left': `
- His forward leg reaches down and toward the LEFT SIDE OF THE PICTURE. Its foot is planted flat on the ground on the LEFT SIDE OF THE PICTURE, taking full weight, that knee only slightly bent.
- The other leg trails up and behind toward the RIGHT SIDE OF THE PICTURE, knee sharply bent, that foot lifted clear of the ground, heel up.
- So: planted foot low on the left of the picture, lifted foot behind on the right. Hips tilt down toward the planted left-hand side.

Caught at the LOWEST, most compressed moment of a run, torso pitched forward.`,

  'pass-right': `
- Both feet are close together underneath the hips, at the moment the two legs scissor past each other. The foot on the RIGHT SIDE OF THE PICTURE is flat on the ground taking the weight, that leg nearly straight.
- The other leg is swinging through: its knee lifted and driving forward toward the RIGHT SIDE OF THE PICTURE, that foot just clearing the ground close beside the planted one, heel up.
- So: feet close together under the body rather than spread apart, one knee lifted and driving forward. Hips level.

Caught at the HIGHEST, most extended moment of a run, rising between steps, body lifted.`,

  'pass-left': `
- Both feet are close together underneath the hips, at the moment the two legs scissor past each other. The foot on the LEFT SIDE OF THE PICTURE is flat on the ground taking the weight, that leg nearly straight.
- The other leg is swinging through: its knee lifted and driving forward toward the LEFT SIDE OF THE PICTURE, that foot just clearing the ground close beside the planted one, heel up.
- So: feet close together under the body rather than spread apart, one knee lifted and driving forward. Hips level.

Caught at the HIGHEST, most extended moment of a run, rising between steps, body lifted.`,

  'rear-contact-left': `
- She is running AWAY from the camera, so her leading leg reaches UP the picture and away from the viewer. That leading foot is planted on the ground on the LEFT SIDE OF THE PICTURE and slightly HIGHER up the picture (further away), taking full weight, that knee only slightly bent.
- The other leg trails toward the RIGHT SIDE OF THE PICTURE and LOWER down the picture (nearer the camera), knee sharply bent, that foot lifted clear of the ground, sole visible, heel up toward the viewer.
- So: planted foot upper-left, lifted foot lower-right with its sole showing. Hips tilt down toward the planted left-hand side.

Caught at the LOWEST, most compressed moment of a run, torso pitched forward and away.`,

  'rear-contact-right': `
- She is running AWAY from the camera, so her leading leg reaches UP the picture and away from the viewer. That leading foot is planted on the ground on the RIGHT SIDE OF THE PICTURE and slightly HIGHER up the picture (further away), taking full weight, that knee only slightly bent.
- The other leg trails toward the LEFT SIDE OF THE PICTURE and LOWER down the picture (nearer the camera), knee sharply bent, that foot lifted clear of the ground, sole visible, heel up toward the viewer.
- So: planted foot upper-right, lifted foot lower-left with its sole showing. Hips tilt down toward the planted right-hand side.

Caught at the LOWEST, most compressed moment of a run, torso pitched forward and away.`,

  'rear-pass-left': `
- She is running AWAY from the camera. Both feet are close together underneath her hips, at the moment the two legs scissor past each other. The foot on the LEFT SIDE OF THE PICTURE is flat on the ground taking the weight, that leg nearly straight.
- The other leg swings through: its knee lifted and driving UP the picture and away from the viewer, that foot just clearing the ground close beside the planted one, sole angled toward the camera.
- So: feet close together under the body rather than spread apart. Hips level.

Caught at the HIGHEST, most extended moment of a run, rising between steps, body lifted.`,

  'rear-pass-right': `
- She is running AWAY from the camera. Both feet are close together underneath her hips, at the moment the two legs scissor past each other. The foot on the RIGHT SIDE OF THE PICTURE is flat on the ground taking the weight, that leg nearly straight.
- The other leg swings through: its knee lifted and driving UP the picture and away from the viewer, that foot just clearing the ground close beside the planted one, sole angled toward the camera.
- So: feet close together under the body rather than spread apart. Hips level.

Caught at the HIGHEST, most extended moment of a run, rising between steps, body lifted.`,
};

const [, , identityFile, pose] = process.argv;
const identity = readFileSync(identityFile, 'utf8').trim();
const VIEW = pose.startsWith('rear-')
  ? `tactical isometric REAR diagonal. She is seen FROM BEHIND, facing away from the viewer, angled toward the upper-left of the picture. We see her back — the back of her head, her shoulders and the back of her jacket. Her face is not visible. Not a flat side-on profile, not a straight-on back turnaround.`
  : `tactical isometric front diagonal. The face and the front of the body are angled toward the lower-right of the picture. Not a flat side-on profile, not a straight-on front view.`;
if (!POSES[pose]) { console.error(`pose must be one of: ${Object.keys(POSES).join(', ')}`); process.exit(1); }

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right:
${POSES[pose]}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no cast shadow or contact shadow under the feet, no dust, no motion trail, no speed lines, no glow.
`);
