#!/usr/bin/env node
// EERI — the LANDING SCREEN: a logo, and the touch-control backboard.
//
// Neither is in DESIGN.md yet; both are owner direction (2026-08-14). The
// logo is tested in three directions rather than argued about, because a
// logo is cheap to try and expensive to be wrong about.
//
// The backboard brief is exact and worth honouring literally: "painted
// cardboard look, with select, start and speaker grill, exactly like the
// original Gameboy". So the reference is the DMG control face — d-pad left,
// two round buttons right on a slant, SELECT and START as small slanted
// pills in the middle, and the speaker as diagonal slots bottom-right —
// rebuilt in this game's craft materials instead of grey plastic.
//
// It is a BACKBOARD: the real controls are DOM buttons on top of it
// (DESIGN §5: 44 px minimum, glyphs never key names), so what is generated
// here is the PLATE — the holes, the printed labels, the grill — and not
// the live buttons themselves.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const CRAFT = [
  'built from real craft materials and photographed straight-on, flat and square with no perspective:',
  'painted balsa and thick corrugated card with visible cut edges showing their thickness,',
  'matt poster paint, masking tape, brass split pins as fixings,',
  'slightly rough and handmade, never machine-perfect, no gloss, no gradients, no outlines.',
  'soft even light from the upper left.',
].join(' ')

const KEY = 'the entire background behind and around the object is one solid uniform bright magenta #ff00ff and nothing else. NO ground, NO table, NO shadow.'

const SHEET = [
  // ---- logo, three directions -------------------------------------------
  ['T-logo-sign', '4:3',
   'a construction site hoarding SIGN reading the single word "EERI" in big bold chunky capital letters, hand-painted in cream on a safety-yellow bolted metal plate, with a black and yellow diagonal hazard stripe along the bottom edge and a brass split pin in each of the four corners. the word EERI is spelled E-E-R-I and is the only text anywhere in the picture.'],
  ['T-logo-kid', '4:3',
   'the single word "EERI" spelled E-E-R-I in four fat chunky letters CUT OUT of thick corrugated cardboard and painted in bright friendly colours, the letters slightly tilted and overlapping each other like a child arranged them, with a small green spiky dinosaur-crest hat sitting on top of the first E like a little hat, and one brass hexagonal bolt used as the dot on the I. warm, handmade and childlike. the word EERI is the only text anywhere in the picture.'],
  ['T-logo-both', '4:3',
   'a construction site hoarding SIGN: a safety-yellow bolted plate with a brass split pin in each corner and a black and yellow diagonal hazard stripe along the bottom edge, and mounted ON TOP of the plate the single word "EERI" spelled E-E-R-I in four fat chunky letters cut from thick corrugated cardboard and painted cream, standing proud of the sign with their cut edges showing, a small green spiky dinosaur crest sitting on top of the first E. the word EERI is the only text anywhere in the picture.'],

  // ---- the control backboard, two takes ---------------------------------
  ['T-pad-gameboy', '16:9',
   'the CONTROL PANEL FACE of a handheld game console, built as a craft model: a wide rounded rectangular plate of painted card in warm dusty grey-lilac. on the LEFT a plus-shaped four-way direction pad cut from dark grey card, sunk into a round recess. on the RIGHT two large round buttons in deep raspberry red, set on a slant one above and right of the other. in the MIDDLE-BOTTOM two small slanted grey pill-shaped buttons side by side, each with a tiny printed label under it reading SELECT and START. in the BOTTOM RIGHT corner a speaker grill of six long thin parallel diagonal slots cut into the card. brass split pins at the plate corners. seen absolutely flat from the front, like a photograph of the panel lying on a table.'],
  ['T-pad-craft', '16:9',
   'a wide handheld console control panel built from painted corrugated card in dusty grey-lilac with a safety-yellow band across the top edge: on the LEFT a dark grey plus-shaped direction pad in a round sunken recess, on the RIGHT two big round deep-red buttons set on a slant, in the MIDDLE two small slanted grey pill buttons labelled SELECT and START in tiny printed capitals, and in the BOTTOM RIGHT a grill of six long thin diagonal slots. every edge shows the corrugated fluting, brass split pins at the four corners, one strip of masking tape at one corner. flat straight-on view.'],
]

mkdirSync('out/title', { recursive: true })
let made = 0
for (const [name, ar, subject] of SHEET) {
  if (existsSync(`out/title/${name}.png`) || existsSync(`out/title/${name}.jpg`)) continue
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${CRAFT} ${KEY}`, '--model', 'gemini-2.5-flash-image',
      '--ar', ar, '--out', 'out/title', '--name', name], { stdio: ['ignore','ignore','inherit'] })
    console.log(`✓ ${name}`); made++
  } catch { console.log(`✗ ${name}`) }
}
console.log(`${made} title assets`)
console.log('title done')
