#!/usr/bin/env node
// WORLD 2 — THE WATERWORKS. Library direction pieces.
//
// World 2 already exists as a parked pool (`craft/pipeworks/`, 25 pieces, five
// layers built at `pipeworks_*_v1` and held as `placeholder` until level 4).
// This set does NOT start a second lineage: it extends that one, keeping its
// subject vocabulary (tank, rack, valve, elbow, sluice, culvert, standpipe)
// and its one locked look rule, which is worth repeating because it is the
// thing most likely to be broken by someone rendering "water":
//
//     WATER IS CUT PAPER — layered blue card with scalloped torn edges.
//     NEVER a rendered liquid, never a gradient, never anything wet.
//
// What this set adds is MATERIAL SPREAD, the same job it did for World 1. The
// waterworks is where the craft kit gets its wet half: paper drinking straws,
// cardboard tube, kitchen foil, pipe cleaners, cork, rubber bands, wire mesh,
// hessian, cotton wool, greaseproof paper. One per piece, named in the file.
//
// World 2 also shifts the PALETTE: World 1 is warm — putty, kraft, balsa.
// The waterworks is cool and damp — galvanised silver, slate blue, weed green,
// wet-card grey. Same kit, different end of it.
import { execFileSync } from 'node:child_process';
import { laws } from './plane-clauses.mjs';

const W2 = 'World 2 the waterworks palette: cool and damp — galvanised silver, slate blue, weed green, wet-card grey. no warm browns.';

const JOBS = [
  // ---- background: quiet, low contrast, large simple forms ---------------
  ['bg-gasholder-foil', '3:4',
   'a distant gas holder drum wrapped in crinkled KITCHEN FOIL: a tall plain cylinder seen dead side-on so it reads as a flat rectangle with a slight sheen, banded by three horizontal guide rails of thin card, a shallow domed cap across the top. the foil is softly crumpled and matte, not mirror bright. quiet, very low contrast, far away.'],

  ['bg-pipebridge-straw', '16:9',
   'a long distant pipe bridge built from PAPER DRINKING STRAWS: four parallel straws running the full width of the frame on a row of simple card trestle legs, small paper collars where the straw lengths join. seen exactly side-on so every straw is a straight horizontal bar and the straw mouths are not visible at all. thin, quiet and far away.'],

  // ---- midground: the working plant --------------------------------------
  ['mid-valvewheel-cork', '4:3',
   'a valve station where the handwheels are discs of CORK: a squat card body with three round cork wheels facing straight out at the camera as true circles, their crumbly speckled cork faces and cut rims clearly visible, mounted on short straight spindles, with slate-blue painted pipe stubs left and right. the cork is the most prominent material.'],

  ['mid-pumphouse-tube', '4:3',
   'a small pump house built from CARDBOARD TUBE: a fat horizontal tube lying across a low card plinth, its spiral wound seam showing along the length, a card roof cap, a small square window and a pipe leaving each end. seen dead side-on so the tube reads as a rectangle with a rounded top and both tube ends are hidden behind flat card discs.'],

  ['mid-sluicegate-mesh', '3:4',
   'a sluice gate whose screen is fine WIRE MESH: an upright rectangular frame of grey painted card holding a panel of real woven wire mesh, a threaded card spindle and a small crank at the top, weed-green staining along the lower half where the water sits. the mesh weave is crisp and clearly visible.'],

  ['mid-manifold-band', '4:3',
   'a pipe manifold where every joint is bound with RUBBER BANDS: five slate-blue paper pipes of different widths meeting a flat header, each junction wrapped with two or three coloured rubber bands as gaskets, a few bands perished and split. seen flat side-on, all pipes running within the picture plane, no pipe pointing at the camera.'],

  // ---- foreground: narrow occluders, cropped by the frame -----------------
  ['fg-hoserun-cleaner', '16:9',
   'a thick flexible hose made from a giant PIPE CLEANER, crossing the whole frame in a long sagging curve and cropped off by both the left and right edges: dense fuzzy chenille nap in weed green over a wire core, with two card couplings clamped along it. seen flat side-on, the curve lying entirely within the picture plane.'],

  ['fg-grating-tulle', '9:16',
   'a tall narrow drainage grating panel: a dark slate painted card frame filled with a fine dark TULLE mesh, a diagonal card brace behind the mesh, wet-looking weed-green streaks down the frame. dead frontal, flat, dark enough to read as a foreground occluder.'],

  // ---- props: the ground-line dressing ------------------------------------
  // the water piece: this is the one that states the world's locked look rule,
  // and it is in the library precisely so nobody renders a liquid instead
  ['prop-watersheet-paper', '16:9',
   'a low run of standing water made entirely from LAYERED CUT PAPER: four flat overlapping sheets of blue card in slate blue, pale sky blue, white and deep navy, each with a hand-torn scalloped wavy top edge, stacked so the paler sheets sit in front. absolutely flat cut paper with visible torn white fibre along every edge — it is PAPER, not liquid: no transparency, no reflection, no gradient, no shine, no wetness, no rendered water of any kind.'],

  ['prop-standpipe-straw', '9:16',
   'a site standpipe built from PAPER DRINKING STRAWS: three straws bundled upright and bound with paper tape at two heights, a card valve block near the top with a cork handle, and a short straw spout bent out to one side within the picture plane. seen dead side-on so every straw is a straight vertical bar, no straw mouth visible.'],

  ['prop-sandbags-hessian', '4:3',
   'a low wall of sandbags in coarse HESSIAN SACKING seen dead side-on: seven plump bags laid in two courses, each a soft bulging silhouette of rough open-weave burlap with visible loose threads and a stitched top seam, damp and darker along the bottom course. you see only their side profiles — no top face of any bag.'],

  ['prop-steamvent-cotton', '4:3',
   'a small vent stack puffing steam made of COTTON WOOL: a short galvanised-silver card pipe with a card flange collar, and rising from it three soft teased-out clouds of real cotton wool, wispy and fibrous at the edges. seen flat side-on, the cotton spreading left and right within the picture plane, never toward the camera.'],
];

for (const [name, ar, subject] of JOBS) {
  try {
    execFileSync('node', ['concept.mjs', laws(`${subject} ${W2}`),
      '--model', 'gemini-2.5-flash-image', '--ar', ar,
      '--out', 'out/w2lib', '--name', name], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`✓ ${name}`);
  } catch { console.log(`✗ ${name}`); }
}
console.log('w2 sheet done');
