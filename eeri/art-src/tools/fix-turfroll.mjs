#!/usr/bin/env node
// turfroll-felt: the crossed rolls did not STAND.
//
// Two failures in one piece, and only the second is about the flat world:
//
//  1. It would not stay like that. Two turf rolls crossed in an X have the
//     upper one resting one end on the ground and one end on the lower roll —
//     a thing you could build and could not leave. A prop reads as site
//     dressing only if it looks put down rather than posed, and a six year
//     old will clock a balancing act faster than an adult will.
//  2. It showed the round ends of the rolls as OVALS, which is the ellipse
//     tell — the camera was off its axis and the piece was carrying ground.
//
// Both are fixed by the same decision: lay the rolls with their axes running
// LEFT-TO-RIGHT across the picture. Then each roll is a plain rectangle with a
// rounded top, a 2+1 pyramid is genuinely stable, and there is no circular end
// anywhere to turn into an oval. The unrolled flap hangs DOWN the front face
// rather than lying toward the viewer, which would have been depth again.
import { execFileSync } from 'node:child_process';
import { laws } from './plane-clauses.mjs';

const SUBJECT = [
  'a stable stack of three rolls of turf made from WOOL FELT, seen dead side-on:',
  'two rolls resting side by side on the bottom and one nestled in the groove between them on top,',
  'a settled pyramid that is obviously stable and put down rather than balanced.',
  'each roll lies with its length running LEFT TO RIGHT across the picture, so it reads as a plain',
  'rectangle with a softly rounded top — no round roll end is visible anywhere.',
  'deep green felt nap on the curved outer face, dark brown soil felt showing along the cut lower edges,',
  'and from the top roll one short flap of turf has come unrolled and hangs straight DOWN the front of the stack.',
  'the felt is fuzzy and matte with visible fibre.',
].join(' ');

execFileSync('node', ['concept.mjs', laws(SUBJECT),
  '--model', 'gemini-2.5-flash-image', '--ar', '4:3',
  '--out', 'out/w1lib', '--name', 'prop-turfroll-felt'], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log('✓ prop-turfroll-felt');
