#!/usr/bin/env node
// EERI — the PICKUPS (DESIGN §6.3). Four objects the player chases.
//
// The contract that decides every one of these: **"≤ 1 tile, unmistakably
// NOT a bolt at 32 px — different silhouette, not just bigger."** They are
// seen small and in motion, so the job is entirely SILHOUETTE. A token that
// differs from a bolt only in colour has failed before it is modelled.
//
//   bolt      — the breadcrumb, hundreds per level. Hex. Already good in
//               code; this is the same shape as craft, for the 3D pass.
//   toolbox   — world 1's token. A LONG LOW BOX WITH A HANDLE ARCH over it:
//               the arch is the silhouette, and nothing else here has one.
//   blueprint — world 2's. A ROLLED TUBE, the only cylinder in the set, and
//               §6.3 says it should "look like a thing worth framing".
//   goldbolt  — world 3's. This one is deliberately allowed to be a bolt,
//               because it IS the golden variant — so it is bigger, WINGED
//               (a wing nut), and gold. The wings are the silhouette.
//
// Turned 25° and lifted, per ART_PIPELINE: a dead-front view gives the mesher
// no front-to-back silhouette to work with.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const CRAFT = [
  'a small handmade craft-model prop, photographed turned about 25 degrees to one side and slightly from above,',
  'built from painted balsa, kraft card and rolled paper with visible cut edges showing their thickness,',
  'matt poster paint, slightly rough and handmade, never machine-perfect, no gloss.',
  'soft even light from the upper left, no gradients, no outlines, no text, no watermark.',
  'the entire background is one solid uniform bright magenta #ff00ff and nothing else.',
  'EXACTLY ONE single object, complete and whole, centred with clear empty magenta all around it.',
  'NO ground, NO floor, NO table, NO shadow, NO base plinth — the object floats on the magenta.',
].join(' ')

const SHEET = [
  ['K-bolt',      'one chunky six-sided hexagonal nut lying flat like a fat little wheel, painted bright construction yellow with a darker grey collar through its middle hole. simple, bold and instantly readable at a tiny size.'],
  ['K-toolbox',   'one small worker toolbox: a LONG LOW box in dull safety red with a grey lid, and a tall thin ARCHING CARRY HANDLE hooping right over the top of it from end to end, with two brass split pins where the handle meets the box, and one small clasp on the front. the arching handle is the most important feature and must stand clearly proud above the box with magenta visible in the gap under the arch.'],
  ['K-blueprint', 'one rolled-up blueprint drawing: a single cylindrical scroll of pale blue paper rolled tight, tied around its middle with a band of red string, the open ends showing the rolled paper spiral. it lies at a slight angle like a baton. no box, no tube case — just the rolled paper itself.'],
  ['K-goldbolt',  'one WING NUT painted shining gold: a hexagonal nut body with two big flat wings sticking up and out from its sides like little ears, so its outline is unmistakably winged rather than round. noticeably chunkier than a plain nut.'],
]

mkdirSync('out/pickups', { recursive: true })
let made = 0
for (const [name, subject] of SHEET) {
  if (existsSync(`out/pickups/${name}.png`) || existsSync(`out/pickups/${name}.jpg`)) continue
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${CRAFT}`, '--model', 'gemini-2.5-flash-image',
      '--ar', '1:1', '--out', 'out/pickups', '--name', name], { stdio: ['ignore','ignore','inherit'] })
    console.log(`✓ ${name}`); made++
  } catch { console.log(`✗ ${name}`) }
}
console.log(`${made} pickups`)
console.log('pickups done')
