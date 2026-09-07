#!/usr/bin/env node
// Second pass on the pool: the GRADE strips that connect every layer to the
// ground, and re-rolls of the pieces that came back wrong.
//
// Two faults the first pass produced, both visible on the keyed contact sheet:
//   · pieces that are not ONE object — P-far-core arrived as a lift core with
//     two more frames cropped by the frame edges, so its ink bounds span the
//     whole image and it composites as a wide smear
//   · pieces lying down or tumbled when the layer needs them standing
//
// And the fault the layer STRIPS showed, which is not a piece fault at all:
// the run stops abruptly and nothing is connected to the ground. A layer needs
// a continuous grade — a torn card ground line running the full width that
// every piece stands on — or the site reads as cutouts floating in air.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const CRAFT = [
  'a handmade model built from real craft materials, photographed flat and straight-on with no perspective:',
  'corrugated cardboard showing its fluting at every cut edge, grey chipboard, kraft card, balsa wood sticks,',
  'matt poster paint, masking tape, brass split pins used as bolts.',
  'visibly built from overlapping panels with bolted plates and exposed cut edges showing their thickness,',
  'tabs and folds at the joins, slightly rough and handmade, never machine-perfect.',
  'soft even light from the upper left, no gradients, no outlines, no text, no watermark.',
  'the entire background is one solid uniform bright magenta #ff00ff and nothing else.',
].join(' ')

// A single object needs saying twice — the first pass read "one tower crane"
// as "a scene containing a tower crane" for three of the five tall pieces.
const ALONE = 'EXACTLY ONE single object, complete and whole, centred with clear empty magenta all around it and nothing touching any edge of the frame. no other objects, no scenery, no second copy. the magenta runs all the way down under the object: NO ground, NO floor, NO table, NO shadow, NO base plinth.'

// The grade is the opposite: it MUST run off both ends, because it is what
// makes the layer continuous.
const RUN = 'it runs the full width of the frame and is cropped by both the left and the right edge. the magenta above it is empty.'

const REF = {
  far: 'out/craft/C-far.jpg', mid: 'out/craft/C-mid.jpg',
  near: 'out/craft/C-near.jpg', skyline: 'out/craft/C-skyline.jpg', fore: 'out/craft/C-fore.jpg',
}

const SHEET = [
  // ---- the grade strips: what everything stands on ----------------------
  ['G-far',  'far',  '16:9', `a long low horizontal strip of level building ground built from torn kraft and grey corrugated card laid in overlapping layers, the torn top edge showing the corrugated fluting all along it, slightly uneven in height with a shallow rise and dip, a few small card stones scattered on top. ${RUN}`],
  ['G-mid',  'mid',  '16:9', `a long low horizontal strip of churned site ground built from torn brown corrugated card in overlapping layers with the fluting exposed along every torn edge, a shallow rutted top edge, two low piles of card spoil along it and a strip of masking tape laid across. ${RUN}`],
  ['G-near', 'near', '16:9', `a long low horizontal strip of dark churned earth built from torn dark brown corrugated card layered over itself, deep fluting showing along the ragged top edge, a scatter of small dark card stones and one shallow tyre rut. ${RUN}`],

  // ---- re-rolls of the pieces that came back as scenes -------------------
  ['P-far-core',  'far',  '9:16', `one single tall narrow lift-core tower: a solid grey chipboard shaft with a zigzag stair of balsa sticks running up its open front face and a small platform on top. tall and slim. ${ALONE}`],
  ['P-sky-step',  'skyline', '1:1', `one single stepped grey chipboard building: a wide low block with one narrower block set back on top of it, each step showing the card thickness at its cut edge and a few small darker window squares. plain and quiet. ${ALONE}`],
  ['P-near-cones','near', '16:9', `three orange painted card traffic cones standing UPRIGHT in a row on their square bases with a gap between each one, each with one white painted band. all three standing straight up, none lying down. ${ALONE}`],

  // ---- pieces the layers are short of ------------------------------------
  ['P-far-frame3', 'far',  '1:1', `one half-built concrete frame three storeys tall: grey chipboard columns and floor slabs with open bays, the top slab only half laid so two columns stand proud above it, masking tape at the splices and brass split pins at the beam seats. ${ALONE}`],
  ['P-far-silo',   'far',  '3:4', `one tall cylindrical cement silo made of rolled kraft paper tube standing on four balsa legs, with a conical card hopper at its base and a small ladder of balsa up its side. ${ALONE}`],
  ['P-mid-stack',  'mid',  '4:3', `one neat stack of grey chipboard panels and kraft card sheets leaning against two balsa uprights, bound with a strip of masking tape, the cut edges of every sheet showing their thickness. ${ALONE}`],
  ['P-mid-skip',   'mid',  '4:3', `one builders skip made of painted card with sloping ends and a rolled rim, painted dusty orange, heaped with torn card offcuts and a broken balsa stick sticking out. ${ALONE}`],
  ['P-sky-tower',  'skyline', '9:16', `one single tall slim grey chipboard tower block, much taller than it is wide, with a grid of small darker window squares and a plain lighter cap band at the top. quiet and simple. ${ALONE}`],
]

mkdirSync('out/pieces', { recursive: true })
let made = 0
for (const [name, layer, ar, subject] of SHEET) {
  // the re-rolls must overwrite, so only the genuinely new ones are skipped
  const isReroll = ['P-far-core', 'P-sky-step', 'P-near-cones'].includes(name)
  if (!isReroll && (existsSync(`out/pieces/${name}.jpg`) || existsSync(`out/pieces/${name}.png`))) continue
  const args = ['concept.mjs', `${subject} ${CRAFT}`, '--model', 'gemini-3-pro-image',
    '--ar', ar, '--out', 'out/pieces', '--name', name]
  if (REF[layer]) args.push('--ref', REF[layer])
  try { execFileSync('node', args, { stdio: ['ignore', 'ignore', 'inherit'] }); console.log(`✓ ${name}`); made++ }
  catch { console.log(`✗ ${name}`) }
}
console.log(`${made} generated`)
