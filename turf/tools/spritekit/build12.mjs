// 12-phase locomotion, phase names matching turf/sprite-factory/manifest.json.
// The six phases are structurally identical per half-cycle, so they are
// templated on which side of the PICTURE the planted foot is on — keeping the
// screen-space rule that made the 4-frame cycle work.
//   node build12.mjs <identityFile> <phase> [--rear] [--covered]
//
// --covered is for a character whose LEGS ARE NOT VISIBLE — a long apron, a
// coat past the knee, a skirt. Every phase below is written as where the legs
// are, which is the right signal for a normal silhouette and useless for one
// that hides them: Toko Slomo (long apron AND both arms locked behind his back)
// produced a 6-frame front cycle with ZERO distinct pairs and five
// near-duplicates, against a hand-made cycle that managed five distinct. So
// --covered adds the signal that IS visible on such a character: where the
// boots are relative to the hem, and which way the hem is swinging.
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
const covered = process.argv.includes('--covered');
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

// The hem leads the body: cloth lags what the legs did a moment ago, so it
// swings BACKWARD as a leg drives forward and hangs still at the extremes.
const COVERED = {
  contact: `\n- THE HEM AND THE BOOTS: his long hem has swung back and hangs at its most SLANTED, trailing behind the leading leg. Below it one boot is planted flat and clearly ahead of the hem's front edge; the other boot shows only as a toe behind the hem.`,
  compression: `\n- THE HEM AND THE BOOTS: the hem has dropped to its LOWEST and hangs almost straight down as his weight sinks, briefly still. Only the planted boot shows beneath it, close under the hem's front edge; the other foot is hidden behind the cloth.`,
  push: `\n- THE HEM AND THE BOOTS: the hem is lifting and beginning to swing FORWARD as he drives upward. The planted boot's heel is peeling off the ground and shows below the hem's back edge; the other boot is emerging at the front.`,
  pass: `\n- THE HEM AND THE BOOTS: the hem is at its HIGHEST and swung fully FORWARD, kicked out ahead of his shins. Both boots are close together and mostly hidden behind it — only the toes show.`,
  reach: `\n- THE HEM AND THE BOOTS: the hem is falling back down and swinging BACKWARD again. One boot has appeared well out in FRONT of the hem, reaching ahead of the cloth entirely; the other is behind it.`,
  precontact: `\n- THE HEM AND THE BOOTS: the hem is low and slanting back, nearly settled. The reaching boot is out in front and about to land, its sole angled toward the ground; the trailing boot shows behind the hem's back edge.`,
};

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE POSE — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one specific instant of a running stride:
${body(side, phase)}${covered ? COVERED[phase] : ''}${covered ? `

HIS LEGS ARE HIDDEN. The long hem covers his knees and thighs in every frame, so do NOT try to show the leg positions described above through it — they are there to tell you what the body is doing. What the picture must show is the HEM and the BOOTS below it, exactly as described. The hem's swing and the boots' spacing are the whole animation.` : ''}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no cast shadow or contact shadow under the feet, no dust, no motion trail, no speed lines, no glow.
`);
