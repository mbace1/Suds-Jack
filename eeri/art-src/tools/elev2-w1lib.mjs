#!/usr/bin/env node
// Second elevation pass — two pieces, two different lessons.
//
// slabtower grew a DARK SIDE WALL down its right edge: a receding face, which
// is the whole thing the elevation pass exists to remove. It came back because
// the prompt asked for "the cut foam board core showing down one edge" — a
// request for an EDGE is a request for a second face, and the model obliged by
// turning the object. The material has to live on the front face instead. The
// general rule: never ask an elevation piece for anything along its side.
//
// mixerbucket obeyed the geometry and lost the MATERIAL — flat trapezoids, but
// smooth white plastic with an outline, clip-art rather than a photographed
// foam-board model. Flatness and craft pull against each other here: strip the
// shading that sells "handmade" and the model reaches for vector art to fill
// the gap. So the material has to be named as SURFACE (chalky, matte, cut foam
// core, brush marks) rather than left to be implied by light and shadow, which
// elevation has taken away.
import { execFileSync } from 'node:child_process'

const ELEV = [
  'photographed in TRUE ELEVATION: the camera is exactly level with the middle of the object and dead square to it,',
  'like an architectural side elevation or a flat stage-set cutout seen from the audience.',
  'you see ONE face and one face only. NO side wall, NO end wall, NO top face, NO lid surface, NO interior.',
  'NOTHING recedes away from the camera. the whole object is one flat plane facing straight out.',
  'ANY circle on this object reads as a STRAIGHT LINE, never as an ellipse or an oval, because it is edge-on.',
  'strictly flat, zero perspective, zero vanishing point, no depth.',
].join(' ')
const FLOAT = [
  'the object is CUT OUT and FLOATING with empty space all around it. it does NOT stand on anything.',
  'the flat magenta continues behind it and UNDERNEATH it, unbroken.',
  'NO ground, NO floor, NO table, NO pedestal, NO base, NO contact patch, NO shadow, NO dark smear, NO gradient.',
  'the light is completely FLAT and shadowless, like a photograph on a lightbox.',
].join(' ')
// carries the weight that shadow used to carry — see the header
const CRAFT = 'a photograph of a REAL handmade model, and the material must be legible in the SURFACE itself since there is no shading to read it from: visible paper fibre and cut texture, matte chalky brush-painted finish with faint brush marks, slightly imperfect hand-cut edges. NOT a drawing, NOT an illustration, NOT vector art, NOT clip art, NO outline strokes, NO glossy plastic, NO smooth digital gradients.'
const KEY = 'the entire background is one solid uniform bright magenta #ff00ff and nothing else.'

const JOBS = [
  ['bg-slabtower-foam', '3:4',
   'the flat FRONT FACE of an unfinished tower slab cut from PAINTED FOAM BOARD in chalky warm putty grey: a plain upright rectangle, a regular grid of small dark square window openings punched through it, a slightly paler horizontal band across the top. the foam board texture reads across the whole face — fine open bubble grain and a soft chalky painted surface. it is a single flat cutout panel, a rectangle and nothing more. very low contrast, quiet, distant.'],

  ['prop-mixerbucket-foam', '4:3',
   'two builders buckets and a shallow mixing tub built from PAINTED FOAM BOARD in chalky pale blue and dusty off-white, seen dead side-on: each bucket is a flat TRAPEZOID silhouette, wider at the top, its rim a single straight horizontal line with no oval and no view inside. the thick foam board edge shows its white crumbly core all round each cut outline, the painted faces are matte and chalky with visible brush texture and a few worn patches, and the handles are bent paper cord arcing flat across the picture.'],
]

for (const [name, ar, subject] of JOBS) {
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${ELEV} ${FLOAT} ${CRAFT} ${KEY}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w1lib', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log(`✓ ${name}`)
  } catch { console.log(`✗ ${name}`) }
}
console.log('elevation pass 2 done')
