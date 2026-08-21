#!/usr/bin/env node
// EERI layer PIECES — the pool the compositor draws from.
//
// The v2 layers were built by stamping ONE generated segment across the whole
// rect with a gap between copies. Rendered at full width the failure is
// obvious and it is not a material failure — the segments themselves are on
// target (balsa scaffold, split pins, corrugated cut edges). It is a
// COMPOSITION failure:
//   · the same picture five times across 140 world units
//   · ~50% of every strip is empty air between the stamps
//   · every stamp tops out at exactly the same height — no skyline profile
//   · each stamp carries its own ground bar, which ends where it ends, so
//     the site reads as five islands rather than one continuous site
//
// So the unit of generation stops being "a segment" and becomes "a piece".
// Each of these is ONE object with no ground under it; build-layers.mjs sets
// the baseline, the spacing and the height profile. That is what buys
// variation, overlap and hero silhouettes.
//
// Every piece is generated against the approved segment for its layer as a
// --ref, so the material register does not drift between pool members.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

// The craft register, reconstructed from the approved C-* segments plus
// ART_TARGET rung 1b's verbatim clause. The last sentence is load-bearing:
// a piece that arrives with its own ground bar cannot be placed.
const CRAFT = [
  'a handmade model built from real craft materials, photographed flat and straight-on with no perspective:',
  'corrugated cardboard showing its fluting at every cut edge, grey chipboard, kraft card, balsa wood sticks,',
  'matt poster paint, masking tape, brass split pins used as bolts.',
  'visibly built from overlapping panels with bolted plates and exposed cut edges showing their thickness,',
  'tabs and folds at the joins, slightly rough and handmade, never machine-perfect.',
  'soft even light from the upper left, no gradients, no outlines, no text, no watermark.',
  'the entire background is one solid uniform bright magenta #ff00ff and nothing else —',
  'the magenta runs all the way down to the bottom edge underneath the model:',
  'NO ground, NO floor, NO table, NO shadow, NO base plinth. the object stands alone on magenta.',
].join(' ')

// ref: the approved segment whose material this pool must match.
const REF = {
  skyline: 'out/craft/C-skyline.jpg',
  far: 'out/craft/C-far.jpg',
  mid: 'out/craft/C-mid.jpg',
  near: 'out/craft/C-near.jpg',
  fore: 'out/craft/C-fore.jpg',
}

// `hero` pieces are placed rarely and break the height line; `fill` is the
// everyday run. `ar` is chosen so the piece roughly fills its frame — a tall
// piece in a 16:9 frame is mostly magenta and keys down to a sliver.
const SHEET = [
  // ---- skyline: quiet, hazed, sets the city and gets out of the way -------
  ['P-sky-slab',   'skyline', '3:4',  'one distant unfinished office tower made of grey chipboard: a tall plain slab with a grid of small darker window squares, a lighter cap band at the top, two masking-tape lap joints down its face. simple and quiet, very little internal detail.'],
  ['P-sky-step',   'skyline', '1:1',  'one distant stepped building made of grey chipboard: a wide low block with a narrower block set back on top of it and a small box on top of that, each step showing the card thickness at its cut edge.'],
  ['P-sky-crane',  'skyline', '4:3',  'one distant tower crane made of balsa sticks: a slender lattice mast, a long horizontal jib reaching to the right with a counter-jib stubbing left, a tiny hook block on a thread. brass split pins at the joints. open lattice with magenta showing through every triangle.'],
  ['P-sky-stack',  'skyline', '3:4',  'one distant tall thin chimney stack made of rolled kraft paper tube with two painted bands near the top, standing alone.'],
  ['P-sky-pair',   'skyline', '16:9', 'two distant low grey chipboard blocks of different heights standing side by side with a narrow gap between them, plain faces, a few window squares.'],

  // ---- far: the half-built frames. structure you read as distance --------
  ['P-far-frame5', 'far', '3:4',  'one half-built concrete building frame five storeys tall: grey chipboard columns and floor slabs with the magenta showing straight through every open bay, masking tape wrapped at the column splices, brass split pins at the beam seats, the top floor unfinished with two columns standing proud above the last slab.'],
  ['P-far-frame2', 'far', '4:3',  'one squat half-built concrete frame two storeys tall and wide: grey chipboard columns and slabs, open bays, one bay boarded over with an ochre kraft card panel taped at its corners.'],
  ['P-far-core',   'far', '9:16', 'one tall narrow lift-core tower made of grey chipboard: a solid shaft taller than everything around it with a stair zigzag of balsa sticks running up its open side, a small platform at the top.'],
  ['P-far-crane',  'far', '4:3',  'one tower crane made of balsa sticks standing on a grey chipboard base block: lattice mast, long jib to the left, counterweight block of dark card on the short arm, a hook block hanging on thread. brass split pins at every joint, magenta through the lattice.'],
  ['P-far-hoard',  'far', '16:9', 'one long low run of site hoarding: overlapping kraft and ochre card boards nailed with split pins to balsa rails, boards at slightly different heights along the top edge, one board a little proud of the others.'],

  // ---- mid: the built stage. scaffold bays, hoarding, the bolts showing --
  ['P-mid-scaff3', 'mid', '3:4',  'one three-lift balsa scaffold tower: vertical standards, horizontal ledgers, diagonal braces, brass split pins at every joint, corrugated card plank decks on two lifts and one ochre painted plank running diagonally across as a brace.'],
  ['P-mid-scaff1', 'mid', '4:3',  'one single-lift wide balsa scaffold bay with a corrugated card deck, a diagonal brace, a short balsa ladder leaning against it, split pins at the joints.'],
  ['P-mid-hoard',  'mid', '16:9', 'one wide run of site hoarding built from overlapping card panels in kraft, dusty blue-grey and burnt orange, each panel a different width, split pin heads in a row along the top and bottom rails, corrugated edges exposed where panels overlap.'],
  ['P-mid-hut',    'mid', '4:3',  'one site cabin: a kraft card box with a flat roof of corrugated card overhanging at the ends, two blue-grey window rectangles, a small step of balsa at the door, masking tape at the roof seam.'],
  ['P-mid-pipes',  'mid', '4:3',  'a stack of grey rolled paper tubes lying horizontally, seven of them stacked in a pyramid, chocked at the ends by two small balsa wedges, the open tube ends showing their rolled paper thickness.'],
  ['P-mid-tower',  'mid', '9:16', 'one tall slim balsa scaffold tower five lifts high with a corrugated card deck at the top and an ochre painted safety rail, a thin balsa ladder running up its outside, split pins throughout — much taller than a normal scaffold bay.'],
  ['P-mid-mixer',  'mid', '1:1',  'one small concrete mixer made of craft materials: a kraft paper drum tilted on a balsa A-frame stand with two card wheels, painted ochre, split pins at the axles.'],

  // ---- near: ground clutter, small, sparse, never competing --------------
  ['P-near-spoil', 'near', '16:9', 'one low mound of excavated earth: torn brown corrugated card in overlapping layers with the fluting showing along every torn edge, a strip of green wool felt laid along its crest as grass.'],
  ['P-near-pipes', 'near', '4:3',  'three grey rolled paper tubes stacked as a small pyramid on the ground, ends facing the viewer showing the rolled paper thickness.'],
  ['P-near-cones', 'near', '16:9', 'three small orange painted card traffic cones of the same size standing in a row with gaps between them, each with a white painted band and a square card base.'],
  ['P-near-drums', 'near', '4:3',  'two painted card oil drums standing upright side by side, one ochre and one blue-grey, with rolled rims top and bottom and a split pin bung on the lid.'],
  ['P-near-pallet','near', '4:3',  'a short stack of balsa pallets with kraft card sacks piled on top, bound with a strip of masking tape.'],
  ['P-near-fence', 'near', '16:9', 'a short run of temporary site fencing: a grid of thin balsa sticks in a frame, standing in two small card feet, leaning very slightly.'],

  // ---- fore: the occluder lane. CROPPED, dark, near-silhouette -----------
  ['P-fore-stand', 'fore', '9:16', 'one single vertical scaffold standard of dark balsa running the full height of the frame from the very bottom edge to the very top edge, with two short horizontal stubs bolted to it by split pins and one diagonal brace stub. dark and near-silhouette with very little interior detail. it must touch both the top and the bottom edge of the frame.'],
  ['P-fore-pipe',  'fore', '16:9', 'one dark horizontal pipe run of rolled paper tube crossing the whole frame from the left edge to the right edge high up, with two dark balsa hanger brackets dropping from it, the tube ends cropped off by the frame edges. dark and near-silhouette.'],
  ['P-fore-spoil', 'fore', '16:9', 'one long low sweep of dark torn corrugated card as a spoil heap along the very bottom edge of the frame, its torn top edge showing the fluting, running off both the left and right edges. dark and near-silhouette, occupying only the bottom third.'],
  ['P-fore-drums', 'fore', '4:3',  'two dark card oil drums and a dark balsa trestle standing together, cropped off by the bottom edge of the frame so their feet are not visible. dark and near-silhouette.'],
  ['P-fore-net',   'fore', '9:16', 'one tall dark panel of debris netting: a fine grid of dark thread stretched on a dark balsa frame running from the bottom edge to the top edge of the frame, magenta showing through the mesh. dark and near-silhouette.'],
]

mkdirSync('out/pieces', { recursive: true })
let made = 0, failed = []
for (const [name, layer, ar, subject] of SHEET) {
  if (existsSync(`out/pieces/${name}.jpg`) || existsSync(`out/pieces/${name}.png`)) continue
  const args = ['concept.mjs', `${subject} ${CRAFT}`, '--model', 'gemini-3-pro-image',
    '--ar', ar, '--out', 'out/pieces', '--name', name]
  if (REF[layer]) args.push('--ref', REF[layer])
  try {
    execFileSync('node', args, { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log(`✓ ${name}`); made++
  } catch { console.log(`✗ ${name}`); failed.push(name) }
}
console.log(`\n${made} pieces generated${failed.length ? `, ${failed.length} failed: ${failed.join(' ')}` : ''}`)
