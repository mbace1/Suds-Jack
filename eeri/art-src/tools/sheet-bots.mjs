#!/usr/bin/env node
// EERI — the BOLT-BOT family. PHASING §2's highest asset-value-per-credit
// item: ONE rigged biped base, retextured/re-headed into N enemies, so the
// game stops being "one enemy type across twelve levels".
//
// Routing, per PHASING §1: legs → Meshy rig. These have legs on purpose —
// the hopper and the bucket are re-cast as bipeds precisely so the 5-credit
// humanoid rigger can take them, walk and run included. The roller stays a
// vehicle and never comes near this file.
//
// The T-POSE rule is a TECHNICAL requirement of the concept, not a style
// choice (ART_PIPELINE Stage 1): a mesh is rigged from where its geometry
// sits, so an arm resting on the ribs cannot be separated from them. Four
// attempts at "A-pose" came back with arms down; the wording below is the
// one that worked first time, reused verbatim.
//
// Model: base nano banana (flash). The v14 A/B found flash equal or better
// outside fine lattice work, and these are chunky toy shapes.
//
// Tone rule, and it is not decoration (PHASING §0.2, DESIGN): nothing
// malicious, everything stompable, site machines gone wandering. They patrol,
// carry things and nap. They never look angry.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const TPOSE = [
  'standing in a strict T-POSE: both arms stretched out straight and horizontal,',
  'pointing left and right to the edges of the frame, like the crossbar of a letter T.',
  'the legs are apart with clear空 daylight visible BETWEEN them, and daylight visible through EACH armpit.',
  'nothing overlaps anything else. seen straight from the front, symmetrical, no perspective.',
].join(' ').replace('空', '')

const CRAFT = [
  'a handmade toy character built from real craft materials, photographed straight-on:',
  'painted balsa wood, kraft card, rolled paper tube limbs, matt poster paint,',
  'brass split pins at the shoulders hips and knees like a jointed paper puppet,',
  'visible cut edges showing their thickness, slightly rough and handmade, never machine-perfect.',
  'soft even light from the upper left, no gradients, no outlines, no text, no watermark.',
  'the entire background is one solid uniform bright magenta #ff00ff and nothing else,',
  'with the magenta clearly visible through both armpits and between the legs.',
].join(' ')

// Friendly is a spec here, not a mood: DESIGN says age 6, generous, nothing
// malicious. A cross-looking enemy would be off-brief.
const TONE = 'the face is simple and FRIENDLY — two round dot eyes and nothing else, never angry, never a scowl, no teeth, no weapons.'

const SHEET = [
  // the base. Everything else is this, re-headed.
  ['B-boltbot', '1:1', `one small round-bodied worker robot toy: a fat round drum body of painted kraft card, stubby paper-tube arms and legs, big flat card feet, a single large brass bolt head sticking up out of the top of its body where a head would be. painted in dull safety yellow and grey. ${TONE} ${TPOSE}`],
  // the hopper: DESIGN §3's timing enemy, re-cast as a biped (PHASING §2)
  ['B-hopper',  '1:1', `one small worker robot toy built around a jackhammer: a narrow upright body of painted balsa with a chisel bit pointing down between its feet, stubby paper-tube arms, thick spring-coil legs of wound paper cord, a little card hard hat on top. painted dull safety orange and grey. ${TONE} ${TPOSE}`],
  // the bucket: DESIGN §3's scuttler, likewise
  ['B-bucket',  '1:1', `one small worker robot toy built around a cement bucket: a tapered card bucket for a body with a rolled rim and a wire handle, stubby paper-tube arms and short bent legs, a small card lamp on top of the rim for a head. painted grey and dull teal. ${TONE} ${TPOSE}`],
]

mkdirSync('out/bots', { recursive: true })
let made = 0
for (const [name, ar, subject] of SHEET) {
  if (existsSync(`out/bots/${name}.jpg`) || existsSync(`out/bots/${name}.png`)) continue
  const args = ['concept.mjs', `${subject} ${CRAFT}`, '--model', 'gemini-2.5-flash-image',
    '--ar', ar, '--out', 'out/bots', '--name', name]
  // the two variants are drawn FROM the base so the family reads as one kit
  if (name !== 'B-boltbot' && existsSync('out/bots/B-boltbot.png')) args.push('--ref', 'out/bots/B-boltbot.png')
  else if (name !== 'B-boltbot' && existsSync('out/bots/B-boltbot.jpg')) args.push('--ref', 'out/bots/B-boltbot.jpg')
  try { execFileSync('node', args, { stdio: ['ignore', 'ignore', 'inherit'] }); console.log(`✓ ${name}`); made++ }
  catch { console.log(`✗ ${name}`) }
}
console.log(`${made} bot concepts`)
console.log('bots done')
