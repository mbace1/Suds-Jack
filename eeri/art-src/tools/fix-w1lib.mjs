#!/usr/bin/env node
// Re-roll the four that broke the library's own plane rule.
//
// Two carried a CAST SHADOW onto the backing. That is not just a style miss:
// a shadow on magenta is DARK magenta, and dark magenta sits below the key's
// absolute floor (keylib demands mn > 45 — the floor that exists so JPEG
// noise in dark art is not punched full of holes, trap 14). So the shadow
// survives keying as a maroon smear. Lowering the floor would re-open trap
// 14; the fix belongs in the prompt.
//
// One went three-quarter perspective (the product-render angle the README
// bans by name) and one drifted to outlined illustration instead of a
// photographed model.
import { execFileSync } from 'node:child_process'

const HARD = [
  'LIGHTING, and this is critical: the light is completely FLAT and shadowless.',
  'the object casts NO shadow onto the background. there is NO shadow anywhere in the image.',
  'nothing is behind the object. the background is EMPTY FLAT MAGENTA touching the object on every side.',
].join(' ')
const FLAT = 'photographed absolutely FLAT and straight-on, dead square to the camera, frontal or exactly side-on. NO perspective, NO three-quarter angle, NO product-render angle, NO tilt. it is a flat cutout piece for a stage set.'
const REAL = 'a photograph of a real handmade model built from real craft materials — NOT a drawing, NOT an illustration, NO outline strokes, NO cartoon linework. real material surface and real cut edges.'
const KEY = 'the entire background is one solid uniform bright magenta #ff00ff and nothing else. EXACTLY ONE object, complete and whole. NO ground, NO floor, NO table, NO pedestal, NO base.'

const JOBS = [
  ['bg-slabtower-foam', '3:4',
   'one quiet distant unfinished tower slab built from PALE PAINTED FOAM BOARD: a tall plain rectangular block in chalky off-white, a grid of small recessed window squares, a lighter cap band at the top, the foam board cut edge showing its crumbly white core down one side. very low contrast, minimal detail.'],
  ['mid-liftshaft-brass', '9:16',
   'one tall narrow lift shaft of pale grey chipboard where BRASS SPLIT PINS are the detail motif: a slim tower with a panel join every level, and a neat row of shiny brass split-pin heads marching up both edges and across every horizontal seam. the brass fixings are the most prominent feature.'],
  ['fg-plankcross-balsa', '16:9',
   'one long PALE BALSA plank seen exactly side-on, edge to the camera, crossing the whole frame horizontally and cropped off by both the left and right edges, with two short dark bracket stubs bolted under it. the pale open wood grain runs along its length. dark enough to read as a foreground occluder but still recognisably pale timber.'],
  ['prop-mixerbucket-foam', '4:3',
   'two builders buckets and a shallow mixing tub made from PAINTED FOAM BOARD in chalky pale blue and off-white: tapered round buckets with rolled rims and thick soft-cut foam edges showing the white foam core, one tipped on its side, matte chalky painted surface, wire handles of bent paper cord.'],
]

for (const [name, ar, subject] of JOBS) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${FLAT} ${HARD} ${REAL} ${KEY}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w1lib', '--name', name], { stdio: ['ignore','ignore','inherit'] })
    console.log(`✓ ${name}`)
  } catch { console.log(`✗ ${name}`) }
}
console.log('fix done')
