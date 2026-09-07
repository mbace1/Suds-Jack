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
  //
  // The first cut of these described only GEOMETRY — where the limbs are, how
  // low the hips sit — and every frame came back with the character still in
  // control: `stagger` read as an alert idle, `buckle` as an athletic crouch
  // ready to pounce, and `fall` as a jumping attack with the knife raised and
  // the teeth gritted. Limb positions do not make a knockout. What makes one is
  // that she has STOPPED FIGHTING, which lives in the face, the hands and the
  // slack in the body — so each phase below now says how much control is left
  // and what the face is doing, and the geometry comes second.
  stagger: `
- CONTROL: mostly gone. She is not choosing where her feet go any more; her legs are catching up with a body that is already falling.
- FACE: dazed and unfocused. Eyes half shut and not looking at anything, mouth loose and open. She is not looking at the viewer and not looking at a target.
- Her whole body is toppling backward toward the UPPER-LEFT OF THE PICTURE, shoulders well behind her hips so she is clearly past her own balance point, head lolling back and to one side, neck loose.
- One foot has been thrown out behind her toward the lower-left in a scrambling attempt to catch weight; the other is barely on the ground. Knees slack, not bent with purpose.
- Both arms hang and swing loose, elbows soft, hands open and empty of intent — NOT raised, NOT guarding, NOT braced.
- Test: if she looks alert, balanced, ready, or like she is turning to look at something, the pose is wrong.`,

  buckle: `
- CONTROL: gone. Her legs have stopped holding her up.
- FACE: slack, eyes closed or nearly closed, head hanging so the face is angled down at the ground. Not grimacing, not defiant.
- ONE knee has dropped and is on the ground, the other leg folded awkwardly under or across it — the two legs are doing DIFFERENT things and the pose is lopsided. Her weight has collapsed onto the down knee rather than being held between two feet.
- Torso slumped forward and twisted over the collapsed leg, spine rounded, shoulders dropped, head hanging lowest of all.
- Both arms hang straight down toward the ground, loose, one hand touching or nearly touching the floor — dead weight, not propping her up.
- Test: if this looks like a CROUCH — feet flat, both knees bent the same, weight balanced, back straight, head up — the pose is WRONG. A crouch is something you choose; this is something that happened to her.`,

  fall: `
- CONTROL: none. She is a falling body.
- FACE: completely slack, eyes shut, mouth open, head lolling loose on the neck.
- She is horizontal in the air, a moment before she lands. THE GROUND LINE IS THE BOTTOM EDGE OF THE PICTURE and she is laid out parallel to it, ACROSS the picture: her head is over on the LEFT and her boots on the RIGHT, back and hips strung out between them at roughly the same height.
- She is drawn LYING FLAT and horizontal, but has not touched down — a band of empty space between her and the bottom edge, and the whole TOP THIRD of the picture empty.
- Arms trailing loose and limp, hair thrown out behind her head. Nothing braced, nothing reaching, nothing held up.
- Test: the picture of her must be clearly WIDER than it is TALL. If she looks like she is jumping, lunging, attacking, or holding anything up, the pose is wrong.`,

  ko_impact: `
- CONTROL: none. Her body is being moved by the impact, not by her.
- FACE: slack, eyes shut, mouth open, head rolled to one side.
- She has landed on her BACK — shoulders and hips flat to the ground, face upward. This matches the frames either side of it: she is falling backward and she stays that way up, she does not roll over between frames.
- She has hit the ground and she is DOWN. THE GROUND LINE IS THE BOTTOM EDGE OF THE PICTURE and she is lying along it: her head near the BOTTOM-LEFT CORNER, her boots near the BOTTOM-RIGHT, shoulders, back, hips and legs strung out low between them.
- She is drawn LYING DOWN and horizontal, running left-to-right. The whole upper half of the picture is empty.
- The impact is still in her: one limp arm and one boot have bounced loosely up off the ground and are falling back, the body jolted rather than resting. The bounce is floppy, not a push — she is not pushing off anything.
- Test: the picture of her must be clearly WIDER than it is TALL. If she is upright, kneeling, propping herself up, or vertical in any way, the pose is wrong.`,

  settled: `
- CONTROL: none. She is unconscious.
- FACE: completely slack, eyes closed, mouth slightly open, cheek against the ground.
- The final still pose. THE GROUND LINE IS THE BOTTOM EDGE OF THE PICTURE and she is lying flat along it: head near the BOTTOM-LEFT CORNER, boots near the BOTTOM-RIGHT, everything strung out low between them.
- She is drawn LYING DOWN and horizontal, running left-to-right. The whole upper half of the picture is empty.
- She has NOT rolled over since she landed: she is lying the same way up as she hit the ground, with her cheek against the floor and the back of her shoulders uppermost.
- Every limb is slack and flat on the ground, fingers loosely open, nothing lifted, nothing bouncing, nothing bearing weight. Hair spread out on the floor.
- The dropped weapon is lying FLAT ON THE GROUND beside her, resting where it fell. It is not in the air, not falling, and not near the top of the picture.
- Test: the picture of her must be clearly WIDER than it is TALL, and NOTHING in the pose may be holding its own weight, looking at anything, or floating above the ground.`,
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

// The identity block ends with a clause like "the knife is part of her and must
// stay visible in every pose, never dropped" — which is right for every clip
// except this one. Told that, the model draws an unconscious character still
// gripping her weapon, and a fist closed around a knife reads as intent no
// matter what the rest of the body is doing. So the KO half overrides it: the
// weapon leaves the hand. Nothing else in the identity changes.
const KO = new Set(['stagger', 'buckle', 'fall', 'ko_impact', 'settled']);
const PROP_OVERRIDE = KO.has(phase)
  ? `

OVERRIDE ON THE HELD WEAPON: ignore the instruction above that she never drops it. She is being knocked out, so her hand OPENS and the weapon LEAVES it. In this frame the weapon is either falling loose through the air near her open hand, or already lying on the ground beside her, separate from her body and clearly not held. Her fingers are loose and open. Do not draw her gripping anything.`
  : '';

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}${PROP_OVERRIDE}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one specific instant of her being hit or going down:
${PHASES[phase]}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. ${DOWN.has(phase) ? 'The ground she lies on is implied and is NOT itself drawn: no floor surface, no ground texture, no cast shadow.' : 'No ground, no floor, no cast shadow or contact shadow.'} Absolutely no blood, no wound, no impact spark, no flash, no motion trail, no speed lines, no glow — those are separate effect assets and must not be drawn into the character.
`);
