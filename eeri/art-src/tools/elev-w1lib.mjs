#!/usr/bin/env node
// Re-roll the World 1 library pieces that carry VOLUME.
//
// The world has no expanded 3D ground — every environment surface is a flat
// plane and a prop sits on a single ground LINE. So a piece that was
// photographed from anywhere above its own middle brings a floor with it: you
// see the top of the sacks, the inside of the bucket, the lid of the chest,
// and the eye reads a surface going back in z that the level does not have.
// It is not a style miss. It is geometry the scene cannot honour.
//
// "No three-quarter angle" was already in the README and did not prevent it,
// because it names a camera position and a model can miss by ten degrees and
// still feel obedient. So this asks for the CONSEQUENCE instead, which is
// checkable by eye in a second and has no degrees in it:
//
//     A CIRCLE SEEN IN TRUE ELEVATION IS A STRAIGHT LINE, NOT AN ELLIPSE.
//
// Every one of these six had an ellipse in it somewhere — a bucket rim, a
// drum barrel, a pallet board, a roof cap. If you can find an ellipse, the
// camera is off-axis and the piece is carrying ground. That is the test, and
// it is the sentence to reuse on the next batch.
import { execFileSync } from 'node:child_process'

const ELEV = [
  'photographed in TRUE ELEVATION: the camera is exactly level with the middle of the object and dead square to it,',
  'like an architectural side elevation or a flat stage-set cutout seen from the audience.',
  'you can NOT see the top of it. NO top face, NO lid surface, NO opening, NO interior, NO upper edge turning away.',
  'NOTHING recedes away from the camera — every surface faces straight out.',
  'ANY circle on this object reads as a STRAIGHT LINE, never as an ellipse or an oval, because it is edge-on.',
  'strictly flat, zero perspective, zero vanishing point, no depth.',
].join(' ')
const FLOAT = [
  'the object is CUT OUT and FLOATING with empty space all around it. it does NOT stand on anything.',
  'the flat magenta continues behind it and UNDERNEATH it, unbroken.',
  'NO ground, NO floor, NO table, NO pedestal, NO base, NO contact patch, NO shadow, NO dark smear, NO gradient.',
  'the light is completely FLAT and shadowless, like a photograph on a lightbox.',
].join(' ')
const REAL = 'a photograph of a real handmade model built from real craft materials — NOT a drawing, NOT an illustration, NO outline strokes, NO cartoon linework. real material surface and real cut edges.'
const KEY = 'the entire background is one solid uniform bright magenta #ff00ff and nothing else.'

const JOBS = [
  ['bg-slabtower-foam', '3:4',
   'ONE face of an unfinished tower slab in PAINTED FOAM BOARD, chalky warm putty grey: a plain flat rectangle, a regular grid of small square window openings, a paler band across the top. you see one face and one face only — no side wall, no roof. down the left edge the cut foam board shows its crumbly open core as a thin strip. very low contrast, quiet and far away.'],

  ['mid-bagstack-kraft', '4:3',
   'a stack of cement sacks in KRAFT PAPER seen dead side-on: five or six plump sacks lying across each other in a low pile, each reading as a soft bulging silhouette with creased paper folds, resting on a corrugated card pallet whose slats are seen EDGE-ON as a row of flat horizontal bars. you see no top of any sack and no top of the pallet — only their side profiles, like a cutaway.'],

  ['mid-formwork-balsa', '4:3',
   'a braced formwork panel in PALE BALSA seen dead side-on: a flat rectangular panel of vertical boards with two horizontal walers across it and a diagonal brace, the prop legs splayed strictly LEFT and RIGHT within the flat plane of the picture, never toward or away from the camera. open pale wood grain, soft crumbly cut ends, small dark bolt heads.'],

  ['prop-cabledrum-kraft', '1:1',
   'a cable drum in CORRUGATED CARD seen exactly side-on so the big flange faces the camera as a TRUE CIRCLE: a flat disc of corrugated card with its fluted edge showing all the way round the rim, a smaller hub circle at the centre, a few coils of dark cable peeking past the flange edge at top and bottom. flat as a wheel pressed against glass.'],

  ['prop-mixerbucket-foam', '4:3',
   'two builders buckets and a shallow mixing tub in PAINTED FOAM BOARD, chalky pale blue and off-white, seen dead side-on: each bucket is a simple flat TRAPEZOID silhouette, wider at the top, with its rim reading as a single straight horizontal line — you can NOT see down into any of them and there is no oval opening anywhere. thick soft-cut foam edges showing the white core, bent paper-cord handles arcing flat across the picture.'],

  ['prop-toolchest-steel', '4:3',
   'a site tool chest in PAINTED STEEL, deep pillar-box red, seen dead side-on: a flat rectangle with a straight horizontal lid seam near the top, two clasp catches on the front face and a handle. you see the front face only — no lid top, no end wall, no depth. chipped enamel at the corners showing bare metal, a few flat rivet heads.'],
]

for (const [name, ar, subject] of JOBS) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${ELEV} ${FLOAT} ${REAL} ${KEY}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w1lib', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log(`✓ ${name}`)
  } catch { console.log(`✗ ${name}`) }
}
console.log('elevation pass done')
