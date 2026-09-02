// Ranged, 5 phases. Same anchor as melee — where the WEAPON is in the picture —
// because the motion is in the arms, not the feet.
//   node build-ranged.mjs <identityFile> <phase> [--rear]
//
// The gun travels: hip -> rising -> fully out at the lower-right -> kicked UP
// toward the upper-right -> back in toward the middle. `fire` is the phase most
// at risk of duplicating `aim`, since the arm is extended in both, so the kick
// is described as a rotation the silhouette can actually show: the barrel that
// pointed at the lower-right now points at the upper-right.
//
// The reference is MIRRORED for this set. The melee finding: a weapon carried
// on the character's screen-left drags the whole body round to face screen-left,
// and no amount of prompt-level facing lock beats it.
import { readFileSync } from 'node:fs';

const PHASES = {
  ready: `
- Balanced stance, weight even, knees slightly bent, alert but not yet committed.
- The pistol is held LOW and close to the body, roughly at hip height near the MIDDLE of the picture, muzzle angled down at the ground.
- Body upright and settled, both shoulders square. This is the calm before the shot.`,

  raise: `
- The gun arm is on its way UP and OUT. The pistol has left the hip and sits partway between the hip and full extension, around chest height, travelling toward the LOWER-RIGHT OF THE PICTURE, muzzle beginning to level off.
- The elbow is still bent and the arm is not straight yet. The other arm is coming across the body to steady it.
- Weight beginning to settle onto the front foot. Head turning to follow the muzzle.`,

  aim: `
- MAXIMUM EXTENSION and the steadiest pose of the set. The gun arm is thrown fully out toward the LOWER-RIGHT OF THE PICTURE, elbow locked straight, the pistol at the far end of its reach with the barrel LEVEL and pointing at the lower-right.
- The head is dropped in behind the gun, sighting straight along the barrel. Shoulders rotated through to line up with the arm.
- Front knee bent and loaded, back leg braced straight behind. Everything in the body is pointing the same way as the barrel.`,

  fire: `
- The shot has just gone off and the RECOIL has thrown the gun. The arm is still out toward the lower-right, but the pistol has SNAPPED UPWARD: the barrel that was level now points up toward the UPPER-RIGHT OF THE PICTURE, the wrist rolled back, the elbow buckled from locked to bent.
- The whole body has been driven back with it — shoulders knocked back and up, head pulled off the sightline, chin lifted.
- Feet still planted where they were. Only the arm and the upper body have moved, and they have moved a long way.`,

  recover: `
- Bringing the gun back down and IN toward the middle of the picture, elbow folding, the pistol dropping back toward chest height, muzzle coming down out of the recoil.
- Shoulders squaring back up, head coming back round, weight resettling between the feet.
- Controlled and gathering, clearly still mid-motion. This is NOT the low hip-height ready stance — the gun is higher and the body is still unwinding.`,
};

const [, , identityFile, phase] = process.argv;
const rear = process.argv.includes('--rear');
if (!PHASES[phase]) { console.error(`phase must be one of: ${Object.keys(PHASES).join(', ')}`); process.exit(1); }
const identity = readFileSync(identityFile, 'utf8').trim();

const VIEW = rear
  ? `tactical isometric REAR diagonal. Seen FROM BEHIND, facing away from the viewer, angled toward the upper-left of the picture. The face is not visible.`
  : `tactical isometric front diagonal. The face and the front of the body are angled toward the lower-right of the picture. Not a flat side-on profile, not a straight-on front view.

HIS FACING IS FIXED AND MUST NOT CHANGE. In the attached reference he is angled toward the lower-right, and he stays angled toward the lower-right here. Do NOT flip, mirror or turn him. The gun moves across the picture; he does not turn around with it.`;

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one specific instant of firing a handgun:
${PHASES[phase]}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no cast shadow or contact shadow under the feet. Absolutely no muzzle flash, no smoke, no shell casing, no tracer, no bullet, no impact spark, no motion trail, no speed lines, no glow — those are separate effect assets and must not be drawn into the character.
`);
