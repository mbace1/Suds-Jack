#!/usr/bin/env node
// Round 3, both from owner notes on round 2:
//
//  LANDSCAPE PAD — "that needs wider and thinner look. maybe more arcade
//  background board feel." So not a handheld at all: an arcade cabinet's
//  CONTROL PANEL seen from above — a long thin plank with the stick's ball
//  on the far left, buttons on the far right, and the whole middle left
//  EMPTY, because in landscape the middle of the screen is the game.
//
//  LOGO WITH EERI — "Eeri the character involved, coming towards the camera
//  pov from top of the text box, waist up." He leans over the top edge of
//  the sign like a kid over a fence, breaking the frame. --ref carries his
//  identity; the sign is ours and is described, not ref'd, because
//  concept.mjs carries one ref and the character is the half that cannot
//  drift.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const CRAFT = 'built from real craft materials and photographed absolutely flat and straight-on with no perspective: painted balsa and thick corrugated card with visible cut edges showing their thickness, matt poster paint, brass split pins as fixings, slightly rough and handmade, never machine-perfect, no gloss, no gradients, no outline strokes. soft even light from the upper left.'
const KEY = 'the entire background behind and around the object is one solid uniform bright magenta #ff00ff and nothing else. NO ground, NO table, NO shadow.'

const JOBS = [
  ['T-pad-arcade', '21:9', null,
   'a long thin ARCADE CABINET CONTROL PANEL strip, built as a craft model: a single long narrow plank of painted card in dusty blue-grey (#5f7080) with a thin safety-yellow band (#ffb01f) along its whole top edge, its corrugated cut edge showing along the bottom. on the FAR LEFT end, one arcade joystick: a black ball on a short stick rising from a round recessed base, with a four-way cross printed faintly under it. on the FAR RIGHT end, two large round buttons in deep raspberry red set side by side on a slight slant, printed with small cream capital letters B and A. next to the buttons, two small grey pill buttons with tiny printed labels SELECT and START. a small speaker grill of five short diagonal slots cut through the card at the very right corner. THE ENTIRE MIDDLE OF THE PLANK IS EMPTY painted card with nothing on it. brass split pins at the four corners.'],
  ['T-logo-eeri', '4:3', '/home/user/Suds-Jack/eeri/art-src/E1-eeri-tpose.jpg',
   'a construction site hoarding sign with the toy figure from the reference image leaning over it: a wide safety-yellow bolted plate (#ffb01f) with a brass split pin in each corner and a black-and-yellow diagonal hazard stripe along the bottom edge, carrying the single word "EERI" spelled E-E-R-I in four fat chunky cream capital letters cut from corrugated cardboard, standing proud with their cut edges showing. LEANING OVER THE TOP EDGE of the sign from behind it, visible from the waist up, the exact same toy child character as the reference image — same face, same green dinosaur-crest cap, same dark t-shirt — arms resting on the sign top edge, leaning forward towards the camera with a happy open smile, as if peeking over a fence at the viewer. his body is behind the sign, his arms and head break in front of and above its top edge. the word EERI is the only text anywhere in the picture.'],
]

for (const [name, ar, ref, subject] of JOBS) {
  if (existsSync(`out/title/${name}.png`)) continue
  const args = ['concept.mjs', `${subject} ${CRAFT} ${KEY}`, '--model', 'gemini-2.5-flash-image',
    '--ar', ar, '--out', 'out/title', '--name', name]
  if (ref) args.push('--ref', ref)
  try { execFileSync('node', args, { stdio: ['ignore','ignore','inherit'] }); console.log(`✓ ${name}`) }
  catch { console.log(`✗ ${name}`) }
}
console.log('title3 done')
