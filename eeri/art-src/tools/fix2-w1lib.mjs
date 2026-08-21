#!/usr/bin/env node
// Round 2 on the two that STILL broke the plane rule after fix-w1lib.
//
// Both failed the same way and the first fix was aimed slightly wrong. It told
// the model there is "no shadow", which it can satisfy while still standing the
// object ON something — and a thing that stands has a contact patch, which is
// what came back (a maroon pool beside the tower, a dark slab under the plank).
//
// So say the load-bearing thing instead: the object is CUT OUT AND FLOATING and
// the magenta continues BEHIND AND UNDER it. That removes the ground rather
// than removing the shadow the ground implies.
//
// Second, smaller, real: a WHITE object on a magenta backing picks up magenta
// bounce, and keylib's despill then eats the pale side of it (despill fires on
// any g < min(r,b) lean). The library's own answer is that nothing here is pure
// white anyway — the palette is chalky and slightly warm. Tinting the foam off
// the white point costs nothing and takes the spill problem away with it.
import { execFileSync } from 'node:child_process'

const FLOAT = [
  'the object is CUT OUT and FLOATING in the middle of the frame with empty space all around it.',
  'it does NOT stand on anything and it does NOT rest on anything.',
  'the flat magenta continues behind it and UNDERNEATH it, unbroken.',
  'there is NO ground, NO floor, NO table, NO pedestal, NO base, NO contact patch,',
  'NO shadow, NO dark smear, NO reflection and NO gradient anywhere on the background.',
  'the light is completely FLAT and shadowless, like a photograph on a lightbox.',
].join(' ')
const FLAT = 'photographed absolutely FLAT and straight-on, dead square to the camera. NO perspective, NO three-quarter angle, NO product-render angle, NO tilt. it is a flat cutout piece for a stage set.'
const REAL = 'a photograph of a real handmade model built from real craft materials — NOT a drawing, NOT an illustration, NO outline strokes, NO cartoon linework. real material surface and real cut edges.'
const KEY = 'the entire background is one solid uniform bright magenta #ff00ff and nothing else. EXACTLY ONE subject, complete and whole, nothing cropped except where stated.'

const JOBS = [
  // tinted off the white point on purpose — see the header note on spill
  ['bg-slabtower-foam', '3:4',
   'one quiet distant unfinished tower slab built from PAINTED FOAM BOARD in a chalky warm putty grey (a soft greyish beige, definitely not white): a tall plain rectangular block, a regular grid of small recessed window squares, a slightly paler cap band across the top, and down one vertical edge the cut foam board shows its crumbly open core. very low contrast, minimal detail, quiet and far away.'],

  // an X of two planks: a better occluder silhouette than one bar, and it does
  // not duplicate the pool's existing single high pipe run
  ['fg-plankcross-balsa', '16:9',
   'TWO long PALE BALSA planks crossing each other in a big X, seen exactly side-on with their flat faces to the camera, both planks running corner to corner and cropped off by the edges of the frame, a few small dark bolt heads where they cross. open pale wood grain running along each plank, soft crumbly balsa cut ends. they read as a foreground brace across the view.'],
]

for (const [name, ar, subject] of JOBS) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${FLAT} ${FLOAT} ${REAL} ${KEY}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w1lib', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log(`✓ ${name}`)
  } catch { console.log(`✗ ${name}`) }
}
console.log('fix2 done')
