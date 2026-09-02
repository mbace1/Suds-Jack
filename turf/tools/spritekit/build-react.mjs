// Hit (3) and KO (5), phase names from turf/sprite-factory/manifest.json.
//   node build-react.mjs <identityFile> <phase>
//
// These are whole-body reactions, so unlike locomotion (legs) or melee (weapon
// arm) there is no single limb carrying the motion — the anchor is where the
// BODY MASS is in the picture and how far from upright it has got. She faces
// the lower-right, so a blow arriving from that side throws her back and up
// toward the UPPER-LEFT, and the KO drops her along that same line.
import { readFileSync } from 'node:fs';

const PHASES = {
  // ---- HIT: 3 frames -------------------------------------------------
  impact: `
- The instant the blow lands. Her head has just snapped back and her chin lifted, but her body has NOT travelled yet — feet still planted where they were, weight still forward toward the lower-right.
- Shoulders beginning to rotate back toward the upper-left, arms starting to fly loose.
- A frozen jolt: the head and shoulders are already reacting, everything below the waist has not caught up.`,

  recoil: `
- MAXIMUM REACTION — the biggest, most thrown-back shape of the three. Her whole upper body is flung back and up toward the UPPER-LEFT OF THE PICTURE, spine arched, head back, chin high.
- Both arms are flung out loose and wide, elbows soft, hands open — nothing braced or controlled.
- Her weight has been driven off the front foot onto the back foot on the upper-left, front foot light or lifting. Knees buckling slightly. She is being moved, not moving.`,

  catch: `
- She is arresting the reaction: one foot has taken a short hard step BACK toward the LOWER-LEFT OF THE PICTURE to stop herself, that knee bent and loaded.
- Her torso is coming back down from the arched recoil toward upright, head lowering, chin dropping back toward the target, but she is NOT square or settled yet.
- Arms pulling back in toward the body, still loose. Off-balance but no longer falling — the moment she stops going backwards.`,

  // ---- KO: 5 frames --------------------------------------------------
  stagger: `
- She has lost the fight to stay standing. Torso lurching back toward the UPPER-LEFT, legs scrambling under her, one foot crossing behind the other in a failing attempt to catch weight.
- Arms out and loose for balance, head lolling back. Still fully upright, but nothing about the stance is controlled.`,

  buckle: `
- Her knees have GIVEN WAY and she has DROPPED. Both knees are folded up sharply beside her and her hips have sunk almost down to boot height, so the whole figure is squat and compact and takes up much less height in the picture than a standing pose does.
- Torso slumped forward over the folded legs, shoulders rounded, head hanging low, arms loose.
- Test: if her legs are straight, or her hips are anywhere near waist height, the pose is wrong. She should look roughly as wide as she is tall.`,

  fall: `
- She is horizontal in the air, a moment before she lands. THE GROUND LINE IS THE BOTTOM EDGE OF THE PICTURE and she is laid out parallel to it, ACROSS the picture: her head is over on the LEFT of the picture and her boots are over on the RIGHT, with her back, hips and legs strung out between them at roughly the same height.
- She is drawn LYING FLAT and horizontal, running left-to-right, but she has not touched down yet — there is a band of empty space between her and the bottom edge, and the whole TOP THIRD of the picture is empty too.
- Arms flung out loosely, hair thrown out behind her head, nothing bracing.
- Test: the picture of her must be clearly WIDER than it is TALL. If she is vertical, upright, or standing on her head, the pose is wrong.`,

  ko_impact: `
- She has hit the ground and she is DOWN. THE GROUND LINE IS THE BOTTOM EDGE OF THE PICTURE and she is lying along it: her head is near the BOTTOM-LEFT CORNER of the picture and her boots are over near the BOTTOM-RIGHT CORNER, with her shoulders, back, hips and legs all strung out low between them, all at roughly the same low height.
- She is drawn LYING DOWN and horizontal, running left-to-right across the picture. The whole upper half of the picture is empty.
- The impact is still in her: one arm and one boot have bounced slightly up off the ground, back arched a little, the pose jolted rather than resting.
- Test: the picture of her must be clearly WIDER than it is TALL. If she is upright, kneeling, standing on her head, or vertical in any way, the pose is wrong.`,

  settled: `
- The final still pose. THE GROUND LINE IS THE BOTTOM EDGE OF THE PICTURE and she is lying flat along it: her head is near the BOTTOM-LEFT CORNER of the picture and her boots are over near the BOTTOM-RIGHT CORNER, with her shoulders, back, hips and legs all strung out low between them, all at roughly the same low height.
- She is drawn LYING DOWN and horizontal, running left-to-right across the picture. The whole upper half of the picture is empty.
- Every limb is slack and settled flat, nothing lifted and nothing bouncing. Head tipped to one side, hair spread out on the ground.
- Test: the picture of her must be clearly WIDER than it is TALL. If she is upright, kneeling, standing on her head, or vertical in any way, the pose is wrong.`,
};

const [, , identityFile, phase] = process.argv;
const rear = process.argv.includes('--rear');
if (!PHASES[phase]) { console.error(`phase must be one of: ${Object.keys(PHASES).join(', ')}`); process.exit(1); }
const identity = readFileSync(identityFile, 'utf8').trim();

// The down phases are lying on the ground, so the standing "angled toward the
// lower-right" facing lock does not apply to them and reads as a contradiction.
const DOWN = new Set(['fall', 'ko_impact', 'settled']);
// A body lying face-down is the rear view of a down pose — the camera has not
// moved, she has. So the down phases take a "face-down" clause rather than the
// standing rear clause, which would otherwise read as a contradiction against
// "lying along the bottom edge".
const VIEW = DOWN.has(phase)
  ? (rear
      ? `tactical isometric, looking down at her from above and slightly to the side, the same three-quarter angle the rest of the set is drawn at. She has landed FACE DOWN, so what is uppermost is the BACK of her jacket: we see the back of the jacket, the back of her head and her hair spread out, and the SOLES of her boots. Her face is pressed into the ground and is NOT VISIBLE anywhere in this picture. She is not lying on her back and she is not looking upward.`
      : `tactical isometric, looking down at her from above and slightly to the side, the same three-quarter angle the rest of the set is drawn at. She is on the ground, so she is seen from above rather than from the front.`)
  : (rear
      ? `tactical isometric REAR diagonal. She is seen FROM BEHIND, facing away from the viewer, angled toward the upper-left of the picture. We see the BACK of her jacket and the back of her head. Her face is NOT VISIBLE and must not be drawn.

READ THE POSE BELOW FROM BEHIND. It describes a reaction in terms of her chin, her eyes and her chest because that is how a reaction is described — but from this angle none of those are in the picture. Where it says her chin lifts or her head goes back, draw the back of her head tipping back and her hair swinging. Where it says her chest, draw her shoulder blades and her spine. Do NOT turn her round to face the viewer so that those things can be seen.`
      : `tactical isometric front diagonal. Her body is angled toward the lower-right of the picture, the same way as in the attached reference. Not a flat side-on profile, not a straight-on front view. Do not flip or mirror her.`);

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one specific instant of her being hit or going down:
${PHASES[phase]}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. ${DOWN.has(phase) ? 'The ground she lies on is implied and is NOT itself drawn: no floor surface, no ground texture, no cast shadow.' : 'No ground, no floor, no cast shadow or contact shadow.'} Absolutely no blood, no wound, no impact spark, no flash, no motion trail, no speed lines, no glow — those are separate effect assets and must not be drawn into the character.
`);
