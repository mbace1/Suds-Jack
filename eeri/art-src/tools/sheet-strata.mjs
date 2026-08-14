#!/usr/bin/env node
// The strata sections, regenerated as MATERIAL rather than as a photograph of
// a specific arrangement.
//
// The first cut inherited the house craft block, which names split pins and
// masking tape — so every section came back with pins and tape patches in
// specific places, and a detail map TILES. At a 3-unit repeat across 136
// units you could count the same brass pin forty-five times. A detail map has
// to be featureless: the thing that repeats must be the material's own
// rhythm, never an object you can point at.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const MATERIAL = [
  'photographed flat and straight-on, filling the frame edge to edge with no background visible,',
  'evenly lit with soft shadowless light, no object and no scene — a flat swatch of the material itself.',
  'ABSOLUTELY NO fixings of any kind: no split pins, no brass studs, no bolts, no masking tape, no labels,',
  'no printing, no text, no single distinct object anywhere in the frame — nothing a viewer could point at',
  'and name. only the continuous material, the same all over, so the swatch can be tiled without any',
  'feature repeating. seamless, uniform coverage, no vignette, no gradient across the frame.',
].join(' ')

const SHEET = [
  ['S-topsoil', 'a wall of the CUT EDGES of many thin sheets of corrugated card stacked flat one on another, fine tight fluting, the layers slightly uneven so the stack is not perfectly level'],
  ['S-mid',     'a wall of the CUT EDGES of thick corrugated card stacked flat in layers, COARSE deep fluting with big open arches, the stack a little wavy'],
  ['S-packed',  'a wall of dense compressed thin kraft board layers seen edge on, tightly packed with almost no arching, a few darker seams running horizontally'],
  ['S-gritty',  'a wall of the cut edges of corrugated card with coarse grit and small torn paper pellets pressed into the fluting, irregular and lumpy, layers of different thicknesses'],
]

mkdirSync('out/strata', { recursive: true })
for (const [name, subject] of SHEET) {
  if (existsSync(`out/strata/${name}.jpg`)) continue
  try {
    execFileSync('node', ['concept.mjs', `${subject}. ${MATERIAL}`, '--model', 'gemini-3-pro-image',
      '--ar', '1:1', '--out', 'out/strata', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] })
    console.log(`✓ ${name}`)
  } catch { console.log(`✗ ${name}`) }
}
console.log('strata done')
