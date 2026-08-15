#!/usr/bin/env node
// Refinement pass. The three logo directions were tested; the HYBRID won —
// the hoarding plate gives it structure and worksite, the cut-card letters
// and the crest give it the kid. What it needs is a crest that reads as a
// crest rather than a green smudge, and room to breathe.
//
// The pad plate moves onto the GAME'S OWN PALETTE (palette.js): MACHINE
// #ffb01f is the cast's family colour, STEEL and INK do the rest. The DMG
// grey-lilac was a photograph of a Game Boy, not of THIS game's Game Boy.
//
// It is drawn WITH its d-pad and buttons, not with empty holes: the live DOM
// controls become transparent hit areas sitting exactly over them, which
// keeps DESIGN §5's 44 px targets while letting the plate carry every pixel
// of the look. A drawn cross and two lettered buttons are glyphs, not key
// names, so §5's "never a key name" still holds.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const CRAFT = 'built from real craft materials and photographed absolutely flat and straight-on with no perspective: painted balsa and thick corrugated card with visible cut edges showing their thickness, matt poster paint, brass split pins as fixings, slightly rough and handmade, never machine-perfect, no gloss, no gradients, no outline strokes. soft even light from the upper left.'
const KEY = 'the entire background behind and around the object is one solid uniform bright magenta #ff00ff and nothing else. NO ground, NO table, NO shadow.'

const SHEET = [
  ['T-logo-v2', '4:3',
   'a construction site hoarding sign: a wide safety-yellow bolted plate (colour #ffb01f) with a brass split pin in each of its four corners and a short black-and-yellow diagonal hazard stripe along the bottom edge only. mounted standing proud ON TOP of the plate, the single word "EERI" spelled E-E-R-I in four fat chunky capital letters cut from thick corrugated cardboard and painted cream, their corrugated cut edges clearly visible at the sides so they read as separate pieces lifted off the sign. sitting on top of the first E, clearly separate and clearly readable, a small bright green spiky dinosaur crest of five triangular card spikes in a row, like the crest on a toy dinosaur hood. generous empty yellow margin all around the word. the word EERI is the only text anywhere in the picture.'],

  ['T-pad-v2', '16:9',
   'the flat CONTROL PANEL FACE of a handheld game console, built as a craft model in warm painted card: a wide rounded-rectangle plate painted dusty blue-grey (#5f7080) with a safety-yellow band (#ffb01f) across its top edge and a brass split pin in each corner. on the LEFT, a black plus-shaped four-way direction pad (#26221c) sunk into a shallow round recess. on the RIGHT, two large round buttons painted deep raspberry red, set on a slant with the lower-left one below and left of the upper-right one, each with a small cream capital letter printed on it — the left button reads B and the right button reads A. in the MIDDLE-BOTTOM, two small grey pill-shaped buttons lying at a slant side by side, with tiny cream capital labels printed on the card beneath them reading SELECT and START. in the BOTTOM-RIGHT corner, a speaker grill of six long thin parallel diagonal slots cut clean through the card. flat straight-on view, like a photograph of the panel lying face-up on a table.'],
]

mkdirSync('out/title', { recursive: true })
for (const [name, ar, subject] of SHEET) {
  if (existsSync(`out/title/${name}.png`)) continue
  try {
    execFileSync('node', ['concept.mjs', `${subject} ${CRAFT} ${KEY}`, '--model', 'gemini-2.5-flash-image',
      '--ar', ar, '--out', 'out/title', '--name', name], { stdio: ['ignore','ignore','inherit'] })
    console.log(`✓ ${name}`)
  } catch { console.log(`✗ ${name}`) }
}
console.log('title2 done')
