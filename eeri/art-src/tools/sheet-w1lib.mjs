#!/usr/bin/env node
// WORLD 1 LIBRARY — direction pieces.
//
// The library landed as a contract with procedural SVG starters. This adds
// the other half: PHOTOGRAPHIC CRAFT pieces in the register the shipping
// layers actually use, so the folder shows the direction rather than
// describing it. (ART_TARGET rung 1b: the `_v1` vector layers were retired
// for reading as "brown shape"; a library that promotes to production has to
// aim at the production register.)
//
// EACH PIECE LEADS WITH A DIFFERENT MATERIAL, from the README's own texture
// direction list — painted foam/card · balsa · kraft+corrugated · masking
// tape · felt · painted steel · brass fasteners. That is what "variety of
// styles and textures" has to mean here: not seven versions of a scaffold,
// but seven surfaces you could point at and name.
//
// THE PLANE RULE is the library's hard constraint and is stated three ways
// below, because it is exactly what a generator gets wrong: it loves to add
// a floor, a plinth and a three-quarter product angle.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const PLANE = [
  'photographed absolutely FLAT and straight-on, frontal or near-side-on, with NO perspective and NO three-quarter angle.',
  'the object is a flat stage-set cutout piece.',
  'NO ground, NO floor plane, NO table, NO pedestal, NO base plinth, NO cast shadow of any kind.',
  'NO sky, NO clouds, NO sun, NO scenery of any kind.',
].join(' ')

const CRAFT = [
  'a handmade model built from real craft materials, slightly rough and handmade, never machine-perfect,',
  'exposed cut edges showing real material thickness, soft even light from the upper left,',
  'no gloss, no gradients, no outline strokes, no text, no watermark.',
].join(' ')

const KEY = 'the entire background is one solid uniform bright magenta #ff00ff and nothing else. EXACTLY ONE object, complete and whole, with clear empty magenta all around it.'

// [folder, name, ar, material-lead, subject]
const SHEET = [
  // ---- background: quiet, low contrast, distant ------------------------
  ['background', 'bg-slabtower-foam', '3:4', 'painted foam board',
   'one quiet distant unfinished tower slab built from PALE PAINTED FOAM BOARD: a tall plain rectangular block in chalky off-white with a soft matte painted surface, a grid of small recessed window squares, one lighter cap band at the top, the foam board\'s cut edge showing its slightly crumbly white core along one side. very low contrast, minimal detail, restful.'],
  ['background', 'bg-gantry-steel', '16:9', 'painted steel',
   'one distant low gantry bridge built from PAINTED STEEL card in dusty blue-grey: a long shallow lattice truss spanning between two plain box piers, painted matte with a few chipped patches showing grey board underneath. quiet and simple, magenta showing through every triangle of the lattice.'],

  // ---- midground: the built stage --------------------------------------
  ['midground', 'mid-formwork-balsa', '4:3', 'balsa timber',
   'one section of concrete FORMWORK shuttering built from PALE BALSA TIMBER: a wall of vertical balsa boards held by three horizontal walers, with diagonal raking props leaning against it, the balsa\'s soft open wood grain clearly visible along every stick, brass split pins at the joints.'],
  ['midground', 'mid-hoarding-tape', '16:9', 'masking tape',
   'one run of site hoarding where MASKING TAPE is the visible join language: overlapping panels of kraft and dusty blue card, every single seam between panels covered by a strip of cream masking tape laid slightly crooked, some tape ends curling up, a few tape patches doubled over tears. the tape is the most prominent feature.'],
  ['midground', 'mid-bagstack-kraft', '4:3', 'kraft + corrugated',
   'one large stack of cement sacks built from KRAFT PAPER: plump paper sacks in brown kraft stacked in staggered courses on a corrugated card pallet, the pallet\'s cut end showing deep open fluting, one sack split with pale powder spilling from it.'],
  ['midground', 'mid-liftshaft-brass', '9:16', 'brass fasteners',
   'one tall narrow lift shaft built from pale grey chipboard where BRASS SPLIT PINS are the detail motif: a slim tower with panel joins every level, and a neat row of shiny brass split-pin heads marching up both edges and across every horizontal seam, catching the light. the brass fixings are the most prominent feature.'],

  // ---- foreground: cropped occluders -----------------------------------
  ['foreground', 'fg-mesh-steel', '9:16', 'painted steel',
   'one tall panel of dark PAINTED STEEL mesh fencing running the full height of the frame from the very bottom edge to the very top edge: a fine dark grid on a heavy dark frame with a diagonal brace, painted matte near-black blue-grey, magenta clearly visible through every square of the mesh. dark and near-silhouette. it must touch both the top and the bottom edge.'],
  ['foreground', 'fg-plankcross-balsa', '16:9', 'balsa timber',
   'one long dark BALSA plank crossing the whole frame diagonally from the left edge to the right edge, cropped off by both edges, with two short dark bracket stubs bolted to it. dark, near-silhouette, minimal interior detail, the wood grain just readable.'],

  // ---- props: sit on the existing ground line ---------------------------
  ['props', 'prop-cabledrum-kraft', '1:1', 'kraft + corrugated',
   'one large cable drum built from CORRUGATED CARD: two thick round card cheeks with their corrugated fluting exposed all around the rims, a rolled kraft paper barrel between them, wound with dark paper cord. seen straight from the side so it reads as a flat disc.'],
  ['props', 'prop-turfroll-felt', '4:3', 'wool felt',
   'three rolls of turf made from GREEN WOOL FELT: thick soft felt rolled into cylinders with a fuzzy napped green outer surface and a brown card underside visible at the open ends, two lying side by side and one resting across them. the soft wool nap is the most prominent feature.'],
  ['props', 'prop-toolchest-steel', '4:3', 'painted steel',
   'one site tool chest built from PAINTED STEEL card in dull safety red: a low rectangular chest with a heavy lid, a rolled rim along the top, two clasps, a folded-down carry handle on the front face, painted matte with chipped edges showing grey board beneath.'],
  ['props', 'prop-mixerbucket-foam', '4:3', 'painted foam board',
   'two builders buckets and a mixing tub made from PAINTED FOAM BOARD in chalky pale blue and off-white: tapered round buckets with rolled rims and thick soft-cut foam edges, one tipped on its side, matte chalky painted surface.'],
]

mkdirSync('out/w1lib', { recursive: true })
let made = 0, failed = []
for (const [folder, name, ar, mat, subject] of SHEET) {
  if (existsSync(`out/w1lib/${name}.png`) || existsSync(`out/w1lib/${name}.jpg`)) continue
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${PLANE} ${CRAFT} ${KEY}`,
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w1lib', '--name', name], { stdio: ['ignore','ignore','inherit'] })
    console.log(`✓ ${name}  [${mat}] → ${folder}/`); made++
  } catch { console.log(`✗ ${name}`); failed.push(name) }
}
console.log(`${made} library pieces${failed.length ? `, failed: ${failed.join(' ')}` : ''}`)
console.log('w1lib done')
