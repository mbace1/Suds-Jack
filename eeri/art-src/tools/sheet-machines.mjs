#!/usr/bin/env node
// EERI — the EIGHT MACHINES, from the owner's reference sheet
// ("EERI – CONSTRUCTION MACHINES / WORLD 1 – OUR HELPFUL FRIENDS", 2026-08).
//
// These are concepts for MESHY IMAGE-TO-3D, and that makes them a different
// animal from the library pieces. Everything the flat-world library insists on
// is wrong here and the two must not be confused:
//
//   library piece          machine concept
//   -----------------      -----------------------------------------
//   true elevation         THREE-QUARTER — the generator needs to see
//                          depth or it extrudes a flat card cutout
//   magenta backing        plain pale grey — meshy segments on its own
//   no shadow              soft contact shadow is fine, it is discarded
//   flat, no perspective   real volume, real form
//
// WHY 3/4 AND NOT THE SHEET'S SIDE VIEW: image-to-3D infers the unseen half
// by symmetry. A pure side elevation gives it no read on width at all, so it
// guesses, and a machine comes back either paper-thin or barrel-fat.
//
// POSE MATTERS MORE THAN LOOK, because of what happens next. The mesh is cut
// into named nodes by `slice.mjs`, and a cut is a predicate in normalised
// model space — so two parts that TOUCH in the concept cannot be separated
// afterwards. Every arm is drawn deliberately OPEN, every fork clear of the
// floor, every boom away from its own body. A folded excavator is unriggable.
//
// The node contract each machine must be cuttable into is DESIGN §6 / assets
// README: `house boom stick bucket seat step wheels beacon` for the ride
// machines, adapted per machine and recorded in MACHINES[].nodes below.
import { execFileSync } from 'node:child_process';

// The sheet's own language, held constant so eight machines read as one fleet.
const STYLE = [
  'a chunky friendly toy construction machine for a small child, in the style of a high quality moulded plastic toy:',
  'soft rounded corners, thick simplified forms, no thin fragile detail, slightly matte surface with gentle soft shading.',
  'construction machine yellow as the main colour with dark charcoal grey wheels tracks and fittings,',
  'and a small orange beacon lamp on top.',
  'ON THE WINDSCREEN IS A SIMPLE FRIENDLY FACE: two plain black oval eyes and a small closed smile, on a pale cream windscreen. no eyebrows, no nose, no teeth.',
].join(' ');

// 3/4 so the generator can read depth; a clean plain ground so it segments.
const SHOT = [
  'ONE single machine, complete and whole, photographed in a THREE-QUARTER view from slightly above and to the front-left,',
  'so its side, its front and a little of its top are all visible and its real width is unmistakable.',
  'centred, filling most of the frame, nothing cropped, nothing else in the picture.',
  'plain flat pale grey background, even soft studio light, no other objects, no text, no logo, no ground detail.',
].join(' ');

const MACHINES = [
  // id, aspect, nodes it must be cuttable into, subject
  ['excavator', 'tracked digger — the arm is drawn OPEN and reaching, never folded',
   'a yellow tracked excavator: a boxy yellow slew house on wide dark charcoal crawler tracks, an open cab with the friendly face on its windscreen, and a digging arm reaching forward and DOWN-LEFT with a clear gap between every section — the boom rising from the house front, the stick angling down from the boom elbow, and a grey steel bucket hanging open at the end. the whole arm is extended and open, nothing folded back against the body, nothing touching the tracks.'],

  ['crane', 'tracked lattice crane — hook hangs clear',
   'a yellow tracked crawler crane: a boxy yellow house on dark charcoal crawler tracks, an open cab with the friendly face, and one long straight lattice boom angled up and forward at about forty degrees, painted yellow with black and yellow hazard stripes at its tip. a dark hook block hangs straight down from the boom tip on two visible cables, hanging well clear of the body with plenty of air around it.'],

  ['dumptruck', 'six-wheel tipper — the body is DOWN and level',
   'a toy dump truck: a rounded red cab at the front with the friendly face on its windscreen, and behind it a deep bright blue tipper body sitting level and lowered. six chunky black wheels with red hubs on three axles. a small orange beacon on the cab roof. the tipper body is a simple open box, clearly separate from the cab with a visible gap between them.'],

  ['roller', 'road roller — drum clear of the body',
   'a yellow road roller: a wide smooth grey steel drum at the front, mounted on a yellow yoke with a clear gap between the drum and the body, a yellow chassis behind it, one pair of big chunky black rear tyres, and a small open cab with an olive green roof and the friendly face on its windscreen. an orange beacon on the roof.'],

  ['forklift', 'counterbalance forklift — mast upright, forks low and clear',
   'a yellow counterbalance forklift truck: a compact yellow body with a small open cab and the friendly face, four small black wheels, and at the front a tall upright dark charcoal mast standing clear of the body with two flat black forks at its base, the forks lowered and level and pointing forward with clear air above and below them.'],

  ['cherrypicker', 'boom lift — arm out to the side, basket clear',
   'a yellow cherry picker truck: a yellow six-wheeled truck chassis with a small cab and the friendly face at the front, and on its back a yellow articulated boom arm folded UPWARD and reaching out to the left, carrying a small bright red square basket at its end. the basket hangs clear in the air well away from the truck body, and every section of the arm has a visible gap around it. four small dark outrigger legs at the corners.'],

  ['pipelayer', 'side-boom tracked layer — pipe slung clear',
   'a yellow tracked pipe layer machine: a yellow house on dark charcoal crawler tracks with an open cab and the friendly face, a short yellow side boom rising from its left flank, and a single pale grey concrete pipe slung horizontally beneath the boom tip in a blue sling, hanging clear in the air with a visible gap between the pipe and the tracks. a small green triangular flag on a thin pole at the back.'],

  ['floodlight', 'lighting tower — mast up, four lamps',
   'a yellow mobile floodlight tower: a compact yellow trailer body on four small dark legs and two small black wheels, with an orange beacon, and a grey telescopic mast standing straight up from it carrying a square cluster of FOUR white rectangular flood lamps at the top, all four lamps glowing warm white and facing forward. the mast is clearly separate from the body along its whole height.'],
];

const OUT = process.argv[2] ?? 'out/machines';
for (const [id, , subject] of MACHINES) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${STYLE} ${SHOT}`,
      '--model', 'gemini-2.5-flash-image', '--ar', '1:1',
      '--out', OUT, '--name', id], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`✓ ${id}`);
  } catch { console.log(`✗ ${id}`); }
}
console.log('machine concepts done');
