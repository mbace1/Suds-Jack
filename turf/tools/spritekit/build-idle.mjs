// Idle, 4 phases. The one clip type where the frames are SUPPOSED to be alike.
//   node build-idle.mjs <identityFile> <phase> [--rear]
//
// Locomotion and melee are described by where a limb has travelled to. An idle
// has no travelling limb — the whole point is that the stance does not change —
// so the anchor is the one thing that does move: the CHEST AND SHOULDER LINE,
// described by how high it sits in the picture. Everything else is pinned in
// place by an explicit "does not move" clause, because a phase told only what
// to change will helpfully change other things too.
//
// The prompt therefore does the opposite of every other builder here: it spends
// most of its words on what must STAY, and gives the motion two lines.
import { readFileSync } from 'node:fs';

const PHASES = {
  settle: `
- The bottom of the breath. Her chest is at its FLATTEST and her shoulder line sits at its LOWEST point in the picture — this is the shortest she gets.
- Head level, chin slightly down, eyes on the middle distance.`,

  rise: `
- Drawing breath in. Her chest has begun to fill and her shoulder line has lifted a little from its lowest point — partway up, not at the top.
- Head level, a fraction taller than at rest.`,

  hold: `
- The top of the breath. Her chest is at its FULLEST and her shoulder line sits at its HIGHEST point in the picture — this is the tallest she gets, though only by a little.
- Chin a fraction higher, the whole figure very slightly lengthened.`,

  fall: `
- Letting the breath go. Her chest has begun to empty and her shoulder line has dropped back down partway toward its lowest point.
- Head level, settling, chin coming back down.`,
};

const [, , identityFile, phase] = process.argv;
const rear = process.argv.includes('--rear');
if (!PHASES[phase]) { console.error(`phase must be one of: ${Object.keys(PHASES).join(', ')}`); process.exit(1); }
const identity = readFileSync(identityFile, 'utf8').trim();

const VIEW = rear
  ? `tactical isometric REAR diagonal. Seen FROM BEHIND, facing away from the viewer, angled toward the upper-left of the picture. The face is not visible.`
  : `tactical isometric front diagonal. The face and the front of the body are angled toward the lower-right of the picture. Not a flat side-on profile, not a straight-on front view.`;

process.stdout.write(`A single pixel-art character sprite for a tactical isometric game.

THE CHARACTER, matching the attached reference exactly: ${identity}

VIEW: ${VIEW}

THE STANCE — this is fixed and is the SAME in every frame of this set. She is standing still, at ease but alert, weight even on both feet, feet a comfortable width apart and flat on the ground, knees soft and very slightly bent, arms hanging relaxed at her sides with the elbows a little away from the body.

WHAT MUST NOT CHANGE: her feet do not move and do not lift — both boots stay flat on the ground in exactly the same places. Her stance width does not change. Her hips do not shift from side to side. Her head does not turn. She does not step, lean, crouch, twist or gesture. Nothing about her pose is dramatic or dynamic. She is NOT walking, NOT braced for a fight, NOT reacting to anything.

THE ONE THING THAT MOVES — read left and right below as positions in the PICTURE, not as the character's own left and right. This is one instant of a slow, quiet breath, and the change is DELIBERATELY SMALL:
${PHASES[phase]}

RENDERING: hard-edged pixel art with a 1px dark outline around the silhouette, flat clustered shading in a few tonal steps, strong readable silhouette, compact slightly chibi proportions with a large readable head. No anti-aliasing, no soft airbrushed blending, no photographic gradients, no 3D render look.

OUTPUT: one single character, alone, on a completely flat solid magenta #FF00FF background filling the whole picture. Magenta appears nowhere on the character. The picture contains nothing except the character: no writing, no lettering, no words, no captions, no numbers, no arrows, no boxes, no border, no grid. No ground, no floor, no cast shadow or contact shadow under the feet, no dust, no motion trail, no speed lines, no glow.
`);
