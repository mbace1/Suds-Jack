#!/usr/bin/env node
// Re-roll four World 2 pieces. Three of them share ONE new failure, and it is
// specific to this world in a way World 1 never surfaced:
//
//     A PIPE WORLD IS FULL OF CIRCULAR OPENINGS, AND AN OPENING IS THE
//     HARDEST THING TO KEEP FLAT.
//
// A pipe stub, a hose coupling, a vent collar — the model wants to show you
// the MOUTH, because a mouth is what says "pipe". But a mouth is a circle
// whose axis points at the camera, so drawing it at all tilts the object, and
// out comes the ellipse: manifold grew two dark oval openings, pumphouse and
// hoserun one each. Saying "no ellipses" does not help, because the model is
// not trying to draw an ellipse, it is trying to draw a pipe.
//
// So give it the two legal ways to end a pipe instead:
//
//     CAP IT, OR CROP IT.
//
// A flat disc cap facing the camera is a TRUE circle and is correct. A pipe
// running off the edge of the frame has no end to draw at all. Every pipe end
// in these prompts is now explicitly one or the other, and nothing is left
// for the model to decide.
//
// The fourth failure is the old one: pumphouse and steamvent both came back
// with a cast shadow, which keys as an opaque maroon smear (keylib floor,
// trap 14). Both are objects that conceptually SIT — a shed on a plinth, a
// stack on a base — and a thing that sits is a thing the model grounds. They
// get the float clause with the sitting explicitly denied.
import { execFileSync } from 'node:child_process';
import { laws } from './plane-clauses.mjs';

const W2 = 'World 2 the waterworks palette: cool and damp — galvanised silver, slate blue, weed green, wet-card grey. no warm browns.';
const ENDS = 'EVERY pipe end in this picture is either CLOSED by a flat round cap facing straight at the camera, or runs off the edge of the frame. NO pipe mouth, NO opening, NO hole, NO bore, NO dark oval, NO tube interior is visible anywhere. no pipe points toward or away from the camera.';
const NOSIT = 'this object does not sit, rest, stand or lean on anything at all — it is a cut-out shape floating in empty magenta with nothing below it.';

const JOBS = [
  ['mid-manifold-band', '4:3',
   `a pipe manifold where every joint is bound with RUBBER BANDS: five slate-blue paper pipes of different widths meeting a flat central header block, each junction wrapped with two or three coloured rubber bands as gaskets, a few bands perished and split. all five pipes run flat within the picture plane — up, down, left and right — and each one is stopped by a flat round card cap facing the camera. ${ENDS}`],

  ['mid-pumphouse-tube', '4:3',
   `a small pump house built from CARDBOARD TUBE: a fat horizontal tube lying across a low card plinth, its spiral wound seam showing along its length, a flat card roof cap, a small square window. BOTH ends of the tube are closed off by flat card discs facing the camera, and a slim pipe leaves each end horizontally and runs off the left and right edges of the frame. seen dead side-on so the tube reads as a rectangle with a rounded top. ${ENDS} ${NOSIT}`],

  ['prop-steamvent-cotton', '4:3',
   `a small vent stack puffing steam made of COTTON WOOL: a short galvanised-silver card pipe standing upright, closed at the top by a flat round card cap facing the camera, with a card flange collar around it seen edge-on as a straight bar. rising behind and above the cap, three soft teased-out clouds of real cotton wool, wispy and fibrous, spreading LEFT and RIGHT across the picture and never toward the camera. ${ENDS} ${NOSIT}`],

  ['fg-hoserun-cleaner', '16:9',
   `a thick flexible hose made from a giant PIPE CLEANER, crossing the ENTIRE width of the frame in a long sagging curve and running off BOTH the left and the right edge so neither end of the hose is visible in the picture: dense fuzzy chenille nap in weed green over a wire core, with two silver card couplings clamped along its length, each coupling a plain band seen edge-on. the whole curve lies flat within the picture plane. ${ENDS}`],
];

for (const [name, ar, subject] of JOBS) {
  try {
    execFileSync('node', ['concept.mjs', laws(`${subject} ${W2}`),
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w2lib', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`✓ ${name}`);
  } catch { console.log(`✗ ${name}`); }
}
console.log('w2 fix done');
