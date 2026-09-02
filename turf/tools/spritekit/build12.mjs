// 12-phase locomotion, phase names matching turf/sprite-factory/manifest.json.
// The six phases are structurally identical per half-cycle, so they are
// templated on which side of the PICTURE the planted foot is on — keeping the
// screen-space rule that made the 4-frame cycle work.
//   node build12.mjs <identityFile> <phase> [--rear]
import { readFileSync } from 'node:fs';

const PHASES = ['contact', 'compression', 'push', 'pass', 'reach', 'precontact'];

function body(side, phase) {
  const S = side.toUpperCase(), O = (side === 'left' ? 'RIGHT' : 'LEFT');
  return {
    contact: `
- The forward leg reaches down and toward the ${S} SIDE OF THE PICTURE. Its foot has just landed flat on the ground on the ${S} SIDE, taking the full weight, that knee only slightly bent.
- The other leg trails up and behind toward the ${O} SIDE OF THE PICTURE, knee bent, that foot lifted clear of the ground, heel up.
- Body at its LOWEST point, taking the impact of the landing. Torso pitched forward.`,

    compression: `
- The weight is now fully stacked over the planted foot on the ${S} SIDE OF THE PICTURE. That knee has bent DEEPER than at the moment of landing, absorbing the load — this is the most compressed the legs get.
- The other foot has left the ground behind on the ${O} SIDE and is just beginning to travel forward, knee folding.
- Body still LOW, hips dropped over the ${S}-side leg. Torso pitched forward.`,

    push: `
- The planted leg on the ${S} SIDE OF THE PICTURE is STRAIGHTENING, driving the body upward off that foot. Its heel is beginning to peel off the ground.
- The other leg is swinging forward, knee leading, travelling from behind toward the middle of the picture.
- Body RISING out of the compressed low point toward mid height.`,

    pass: `
- Both feet are close together underneath the hips, at the moment the legs scissor past each other. The foot on the ${S} SIDE OF THE PICTURE is still on the ground but up on its toes, heel lifted.
- The other knee is lifted and driving forward past it.
- Body at its HIGHEST point of the run, hips level, legs gathered under the body rather than spread apart.`,

    reach: `
- The swinging leg now EXTENDS forward toward the ${O} SIDE OF THE PICTURE, reaching ahead for ground it has not touched yet, knee opening out, that foot still in the air.
- The other foot is behind on the ${S} SIDE, heel high, only the toes still grazing the ground as it leaves.
- Body DESCENDING from the high point, legs opening into a stride.`,

    precontact: `
- The reaching foot is about to land on the ${O} SIDE OF THE PICTURE — ankle extended, toe dropping, a moment away from touching down but NOT yet planted.
- The other leg is fully trailing behind on the ${S} SIDE, foot off the ground, knee bent.
- Body dropping LOW again into the stride, braced for the impact that is about to come.`,
  }[phase];
}

const [, , identityFile, phaseName] = process.argv;
const rear = process.argv.includes('--rear');
const identity = readFileSync(identityFile, 'utf8').trim();
const m = /^(left|right)_(\w+)$/.exec(phaseName || '');
if (!m || !PHASES.includes(m[2])) {
  console.error(`phase must be <left|right>_<${PHASES.join('|')}>`);
  process.exit(1);
}
const [, side, phase] = m;

const VIEW = rear
  ? `tactical isometric REAR diagonal. She is seen FROM BEHIND, facing away from the viewer, angled toward the upper-left of the picture. We see her back. Her face is not visible.`
  : `tactical isometric front diagonal. The face and the front of the body are angled toward the lower-right of the picture. Not a flat side-on profile, not a straight-on front view.`;

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one specific instant of a running stride:
${body(side, phase)}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no cast shadow or contact shadow under the feet, no dust, no motion trail, no speed lines, no glow.
`);
