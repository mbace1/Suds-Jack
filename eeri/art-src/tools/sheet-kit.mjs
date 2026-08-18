#!/usr/bin/env node
// EERI — site TOOLS, EQUIPMENT and two new BOTS.
//
// Two different jobs in one file, and they take opposite instructions. Getting
// them the wrong way round is the single most expensive mistake in this
// pipeline, so the split is explicit:
//
//   BOTS      -> will be MESHY AUTO-RIGGED, so: strict T-POSE, --ref Eeri's
//                approved T-pose for BODY PLAN, volumetric limbs.
//   EQUIPMENT -> will be image-to-3D'd and then either prop-packed or cut by
//                slice.mjs, so: THREE-QUARTER, posed open, no T-pose anywhere.
//
// THE VOLUME RULE IS WHY THE BOTS CARRY A REFERENCE (ART_PIPELINE "…but the
// pose is the SECOND thing the rigger looks at"). Two bolt-bots in textbook
// T-poses were both rejected with "Pose estimation failed" — perfect pose,
// perfect proportions, and stick limbs. Eeri rigged first time with his legs
// merged at the hip and his arms barely 40 degrees out. The estimator wants a
// body it can fit a skeleton INSIDE, and there is nothing inside a tube. So
// every bot here is built on Eeri's body plan and is a robot only in its
// faceplate and surface, never in its construction.
//
// EVERY BOT NEEDS ONE LIT EYE. js/robots.js brightens the eye through `notice`
// and `wind` before it acts — the telegraph IS the enemy design (DESIGN §3),
// and an enemy with nothing to brighten cannot be read. It is a required
// feature of the concept, not decoration.
import { execFileSync } from 'node:child_process';

const REF = process.argv[2] || '../E1-eeri-tpose.jpg';

// ---- shared look, taken from the approved machine roster ------------------
const LOOK = [
  'a chunky friendly toy for a small child, in the style of a high quality moulded plastic construction toy:',
  'soft rounded corners, thick simplified forms, no thin fragile detail, slightly matte surface with gentle soft shading.',
  'construction machine yellow as the main colour with dark charcoal grey fittings and grips.',
].join(' ');
const SHOT = 'plain flat pale grey background, even soft studio light, ONE single object, complete and whole, centred and filling most of the frame, nothing cropped, nothing else in the picture, no text, no logo.';

// ---- the bots: T-POSE, on Eeri's body plan --------------------------------
const TPOSE = [
  'STRICT T-POSE: both arms stretched out straight and horizontal, pointing left and right to the edges of the frame,',
  'like the crossbar of a letter T. background clearly visible through EACH ARMPIT. nothing overlaps anything.',
  'standing square to the camera, facing straight forward, feet flat.',
].join(' ');
const BODYPLAN = [
  'copy ONLY the body plan and the chunky solid proportions from the reference image — a solid toy with real mass,',
  'a rounded torso, limbs that taper OUT OF the body rather than tubes stuck onto a box, and big mitten hands.',
  'do NOT copy its clothes, face, hair, hat or colours. it is a ROBOT in its faceplate and surface only, never in its construction.',
].join(' ');

const BOTS = [
  ['B-workerbot', '3:4',
   'a friendly humanoid construction worker robot: a rounded yellow moulded body with a charcoal chest panel, a small hard-hat-shaped head with a smooth dark faceplate carrying ONE BIG ROUND GLOWING AMBER EYE in the centre, chunky mitten hands, thick stubby legs with wide boot feet, a few visible bolt heads and a small orange lamp on one shoulder.'],

  ['B-vacbot', '3:4',
   'a friendly humanoid site VACUUM robot: the same chunky yellow body plan but with a fat ribbed vacuum drum for a belly, a short concertina hose looping from the drum up to one shoulder, a wide flat nozzle mouth low on the front, and a small domed head with a smooth dark faceplate carrying ONE BIG ROUND GLOWING CYAN EYE. chunky mitten hands, thick stubby legs, a dust-filter grille on its back.'],
];

// ---- the equipment: THREE-QUARTER, parts held apart -----------------------
// A cut is a predicate in normalised space, so two parts that TOUCH in the
// concept cannot be separated later. Anything that will move is drawn with air
// around it, exactly as the machine roster was.
const SHOT3Q = [
  'photographed in a THREE-QUARTER view from slightly above and to the front-left,',
  'so its side, its front and a little of its top are all visible and its real depth is unmistakable.',
].join(' ');

const KIT = [
  ['E-jackhammer', '3:4',
   'a toy pneumatic jackhammer standing upright: a yellow body with two thick charcoal handle grips out to the sides, a ribbed air hose stub at the back, and a long charcoal chisel bit projecting straight DOWN from the base with a clear gap of air all around it, well clear of the handles.'],

  ['E-generator', '4:3',
   'a small portable site generator: a yellow boxy body inside a charcoal tubular roll-frame with a carrying handle across the top, a round pull-start recoil housing and a small charcoal exhaust on one side, a control panel with two round sockets and a dial, and two small rubber feet.'],

  ['E-compressor', '4:3',
   'a small towable air compressor: a horizontal yellow cylindrical air tank lying on a charcoal frame, a charcoal motor block on top with a round pressure gauge, a coiled air hose hanging from a hook at one end, and two small black wheels with a clear gap between each wheel and the tank.'],

  ['E-wheelbarrow', '4:3',
   'a builders wheelbarrow: a deep yellow tray, two charcoal tubular handles running back and down, two short stand legs, and ONE black wheel at the front held in a charcoal fork with a clear gap of air between the wheel and the tray.'],

  ['E-cabledrum', '1:1',
   'a portable cable drum on a stand: a big yellow spool wound with thick charcoal cable, mounted on a charcoal A-frame stand with a crank handle on one side, the spool clearly separate from the stand with visible air between the flange and the frame.'],

  ['E-gascart', '3:4',
   'a two-bottle gas bottle trolley: two tall rounded gas cylinders, one deep yellow and one charcoal, strapped upright side by side in a charcoal tubular trolley frame with a handle at the top, two small black wheels at the bottom with a clear gap between wheel and frame, and short hoses coiled at the bottle tops.'],
];

const OUT = process.argv[3] || 'out/kit';

for (const [name, ar, subject] of BOTS) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${LOOK} ${TPOSE} ${BODYPLAN} ${SHOT}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar, '--ref', REF,
      '--out', OUT, '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`✓ ${name} (T-pose, ref'd)`);
  } catch { console.log(`✗ ${name}`); }
}
for (const [name, ar, subject] of KIT) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${LOOK} ${SHOT3Q} ${SHOT}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', OUT, '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`✓ ${name}`);
  } catch { console.log(`✗ ${name}`); }
}
console.log('kit sheet done');
