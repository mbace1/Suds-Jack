#!/usr/bin/env node
// EERI — the EARTH SECTION. Sources for the ground, which is ~30% of every
// frame and is currently one detail map repeated 52 times across 136 world
// units, in a perfectly regular grid. It has been "fixed" twice — v10 gave it
// the material kit, v11 fixed the map's contrast — and both times the axis was
// MATERIAL. Neither touched composition, which is why it still reads as
// wallpaper: an evenly-spaced motif marching across the screen is
// machine-perfect, and machine-perfect is the one thing the reference is not.
//
// Three kinds of source, because the ground needs three different things and
// only the first of them is allowed to repeat:
//
//   S-*  STRATA. Material, and material may tile — a card flute genuinely is
//        regular. But each band gets its OWN section at its OWN scale, so the
//        four bands stop being four tints of one stamp.
//   E-*  EDGES. Torn card, keyed to alpha, laid along every band boundary and
//        along the grass lip. Four dead-straight horizontals running the full
//        length of the level is the single most machine-perfect thing on
//        screen; a card cut has a torn line.
//   F-*  FEATURES. Things embedded in the cut, keyed and placed sparsely and
//        deterministically. The face has no information in it at all right
//        now — the code cobbles are dodecahedrons at a value you cannot see.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const CRAFT = [
  'a handmade model built from real craft materials, photographed flat and straight-on with no perspective:',
  'corrugated cardboard showing its fluting at every cut edge, grey chipboard, kraft card, balsa wood sticks,',
  'matt poster paint, masking tape, brass split pins used as bolts.',
  'slightly rough and handmade, never machine-perfect.',
  'soft even light from the upper left, no gradients, no outlines, no text, no watermark.',
].join(' ')

const KEYED = `${CRAFT} the entire background is one solid uniform bright magenta #ff00ff and nothing else. EXACTLY ONE single object, complete and whole, centred with clear empty magenta all around it. NO ground, NO floor, NO table, NO shadow, NO base plinth.`

// A strata source fills the frame edge to edge — it is a material swatch, and
// detailmap.mjs strips it to luminance, so its own colour does not matter.
const FILLS = `${CRAFT} the material completely fills the frame edge to edge with no background visible, seen absolutely straight on, evenly lit, no object and no scene — a flat swatch of the material itself.`

const SHEET = [
  // ---- strata: one per band, deliberately different in scale and character
  ['S-topsoil', '1:1', `a close flat swatch of the CUT EDGE of thin corrugated card stacked in many layers, fine tight fluting, the layers slightly uneven and pressed together, a few torn fibres standing up. ${FILLS}`],
  ['S-mid',     '1:1', `a close flat swatch of the CUT EDGE of thick corrugated card stacked in layers, COARSE deep fluting with big open arches, the stack a little wavy and not perfectly level. ${FILLS}`],
  ['S-packed',  '1:1', `a close flat swatch of dense compressed layers of dark kraft board seen edge on, the layers thin and tightly packed with almost no arching, a few darker seams running through. ${FILLS}`],
  ['S-gritty',  '1:1', `a close flat swatch of the cut edge of corrugated card with coarse grit and small paper pellets pressed into the fluting, irregular and lumpy, layers of different thicknesses. ${FILLS}`],

  // ---- edges: the torn line, keyed to alpha
  ['E-tear',    '16:9', `one long horizontal strip of torn corrugated cardboard, the TOP edge ripped raggedly along its whole length so the fluting and the torn paper fibres stand exposed, the bottom edge straight. the strip is shallow — about one eighth as tall as it is wide — and runs off both the left and right edges of the frame. ${CRAFT} the entire background is one solid uniform bright magenta #ff00ff, above and below the strip, and nothing else.`],
  ['E-fringe',  '16:9', `one long horizontal strip of dark green wool felt, the TOP edge cut into an uneven fringe of short irregular tufts of nap standing up, the bottom edge straight. the strip is shallow — about one tenth as tall as it is wide — and runs off both the left and right edges of the frame. ${CRAFT} the entire background is one solid uniform bright magenta #ff00ff, above and below the strip, and nothing else.`],

  // ---- features embedded in the cut face
  ['F-stone',   '1:1',  `one irregular rounded stone made from crumpled and layered grey card, its edges showing the paper laminations, slightly flattened. ${KEYED}`],
  ['F-stones',  '4:3',  `a small cluster of four irregular card stones of different sizes resting against each other, made from crumpled grey and brown card with visible paper laminations. ${KEYED}`],
  ['F-pipe',    '4:3',  `one short length of grey rolled paper tube lying horizontally, cut off cleanly at both ends so the rolled paper thickness of the wall shows at each opening, one masking tape band around its middle. ${KEYED}`],
  ['F-drum',    '1:1',  `one dented card oil drum lying on its side half crushed, painted dull ochre with the paint scraped off in patches showing the kraft underneath, rolled rims at both ends. ${KEYED}`],
  ['F-root',    '4:3',  `one gnarled tree root made from twisted brown paper cord and torn kraft strips, spreading into three thinner tendrils, dry and fibrous. ${KEYED}`],
  ['F-brick',   '4:3',  `a broken chunk of old brick wall made from small painted card rectangles in dull red and buff, mortar lines of pale grey paper, the break edge ragged and stepped. ${KEYED}`],
  ['F-bottle',  '1:1',  `one old buried bottle made from pale blue-green translucent paper wrapped over a card form, half of it broken away with a jagged edge. ${KEYED}`],
]

mkdirSync('out/earth', { recursive: true })
let made = 0
for (const [name, ar, subject] of SHEET) {
  if (existsSync(`out/earth/${name}.jpg`) || existsSync(`out/earth/${name}.png`)) continue
  try {
    execFileSync('node', ['concept.mjs', subject, '--model', 'gemini-3-pro-image',
      '--ar', ar, '--out', 'out/earth', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log(`✓ ${name}`); made++
  } catch { console.log(`✗ ${name}`) }
}
console.log(`${made} earth sources generated`)
