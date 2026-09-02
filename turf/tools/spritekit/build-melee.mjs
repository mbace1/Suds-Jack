// Melee, 5 phases, names from turf/sprite-factory/manifest.json.
//   node build-melee.mjs <identityFile> <phase> [--rear]
//
// Same screen-space rule as locomotion, but the motion is in the ARMS, so the
// unambiguous anchor is where the WEAPON is in the picture rather than where
// the feet are. The weapon travels upper-left -> lower-right -> lower-left ->
// centre across the five phases, which is a monotone path the model can place
// without needing to reason about the character's own left and right.
import { readFileSync } from 'node:fs';

const PHASES = {
  ready: `
- Balanced combat stance, weight even, knees slightly bent, ready but not yet committed.
- The weapon is held low and close, roughly at hip height near the MIDDLE of the picture, blade angled forward and clearly readable against the background.
- Body upright and settled. This is the calm before the strike — no wind-up yet.`,

  anticipation: `
- The weapon arm is drawn BACK and UP toward the UPPER-LEFT OF THE PICTURE, as far from the target as it gets, the blade cocked ready to come down.
- The whole body coils AWAY from the strike with it: shoulders rotated back toward the upper-left, weight loaded onto the back foot, knees bent deeper than in any other phase. This is the most compressed the body gets.
- The head stays turned toward the lower-right, watching the target, even as the body twists away from it.`,

  contact: `
- MAXIMUM EXTENSION — the strongest, widest silhouette of the whole action. The weapon arm is thrown fully out toward the LOWER-RIGHT OF THE PICTURE, arm straight, blade at the far end of its reach where it meets the target.
- The leading leg drives forward under it, that knee bent and taking the weight; the back leg braces straight behind, pushing.
- Shoulders have rotated all the way through, following the arm toward the lower-right. Body committed and stretched out.`,

  followthrough: `
- The weapon has passed through the target and kept going in the SAME direction: the arm continues DOWN and further toward the LOWER-RIGHT OF THE PICTURE, now below waist height, well past the point of contact. It does not swing back across the body.
- The body has over-rotated forward with it, shoulders carried past square toward the lower-right, balance tipped further forward than a settled stance would allow.
- Still committed, still moving, not yet recovering.`,

  recover: `
- The weapon arm is pulling back IN toward the middle of the picture, elbow folding, blade coming back up to a guard position near the body.
- Weight is resettling between the feet, knees straightening slightly, shoulders squaring back up.
- Controlled and gathering, clearly still mid-motion rather than a relaxed standing pose — this is NOT the same as the ready stance.

NOTE ON THIS PHASE, AND A CORRECTION. This phase was once documented here as
impossible to separate from the ready pose — measured at 0.747, then 0.790,
then 0.877 across three attempts at stronger wording, and written up as a
property of the model. That was wrong, and the wrongness was in the RULER.
Silhouette IoU cannot see a knife: the blade is about 2% of the sprite's pixels
and the torso that did not move is most of the rest, so a weapon travelling a
quarter of a body height barely shifts the score. Measured on where the weapon
actually is (reach.cjs), ready and recover sit 0.270 apart — comfortably
distinct, and they always were. Gate an attack clip with reach.cjs, not with
phase.cjs.
`,
};

const [, , identityFile, phase] = process.argv;
const rear = process.argv.includes('--rear');
if (!PHASES[phase]) { console.error(`phase must be one of: ${Object.keys(PHASES).join(', ')}`); process.exit(1); }
const identity = readFileSync(identityFile, 'utf8').trim();

const VIEW = rear
  ? `tactical isometric REAR diagonal. Seen FROM BEHIND, facing away from the viewer, angled toward the upper-left of the picture. The face is not visible.`
  : `tactical isometric front diagonal. The face and the front of the body are angled toward the lower-right of the picture. Not a flat side-on profile, not a straight-on front view.

HER FACING IS FIXED AND MUST NOT CHANGE. In the attached reference she is angled toward the lower-right, and she stays angled toward the lower-right here. Her head, chest and hips still point that way no matter where the weapon travels. Do NOT flip, mirror or turn her to face the other way. The weapon moves across the picture; she does not turn around with it.`;

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one specific instant of a melee attack:
${PHASES[phase]}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no cast shadow or contact shadow under the feet. Absolutely no slash trail, no motion arc, no speed lines, no impact spark, no blood, no glow — those are separate effect assets and must not be drawn into the character.
`);
