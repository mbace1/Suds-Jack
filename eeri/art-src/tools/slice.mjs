#!/usr/bin/env node
/**
 * EERI — the OTHER rigging pipeline: one fused mesh → a contracted rig, by
 * CUTTING it rather than assembling separately-generated parts.
 *
 * Why this exists. `assemble.mjs` generates a character part by part and
 * scales each part to its own declared world length. That is correct for a
 * machine — a boom really IS 1.65 units — and catastrophic for a body, because
 * image-to-3D normalises every part it returns to roughly the same size, so a
 * head and a torso arrive the same size and scaling each to its own length
 * makes a bobblehead. It also cannot know which way a limb came back pointing.
 * Both of those killed the v5 Eeri.
 *
 * A fused mesh has neither problem: the proportions are whatever the generator
 * drew, and nothing here rescales one part against another. All this does is
 * decide which TRIANGLE belongs to which node and move the pivot there.
 *
 *   node slice.mjs inspect <file.glb>            # measured render, to author cuts
 *   node slice.mjs cut <rigName>                 # apply CUTS[rigName]
 *
 * Cut predicates run in order and the FIRST match owns the triangle, so write
 * them specific-first. Coordinates are in NORMALISED model space: the model is
 * scaled so its longest horizontal axis is 1 and translated so x/z are centred
 * and y = 0 is the lowest point. `inspect` draws that grid on the render.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, basename } from 'node:path'

const HERE = process.env.MESHY_HERE || WORK;
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };

// ---------------------------------------------------------------- cut tables
//
// A cut is [nodeName, parentOrNull, test, pivot, rest?, bind?].
//
// `rest` and `bind` are BOTH rotations and they are NOT the same thing:
//   rest — a z angle or [x,y,z] euler set on the DRIVEN node. It is a pose,
//          so children inherit it. Folding an excavator's boom folds the
//          stick and bucket hanging off it. That is what you want there.
//   bind — an [x,y,z] euler set on an inner holder wrapping the GEOMETRY
//          ONLY. It is a correction to how the part was modelled, not a
//          pose, and children do not inherit it.
//
// A T-posed limb needs `bind`, and using `rest` for it silently does nothing.
// three.js composes euler XYZ as Rx·Ry·Rz, so a rest x is applied AFTER the
// game's z in the local frame: the arm is still pointing along z when the
// game swings it about z, which spins it on its own axis, and only then does
// the x drop it to the side. It looks plausible and the hand never moves.
// `bind` puts the correction INSIDE the driven node so the game's angle
// composes outside it, which is the way round a bind pose has to work.
//
// `test` is a
// function of the triangle centroid in normalised model space; `pivot` is the
// point in that same space that becomes the node's origin (the hinge). The
// node's POSITION is derived from its pivot minus its parent's, so a rig is
// authored entirely by pointing at places on the model.
const CUTS = {
  excavator: {
    src: 'out/eeri3d/m1-excavator.glb',
    out: 'excavator_v2.glb',
    // world length along x, the facing yaw, and which axis normalises.
    // Meshy has no convention for any of them, so all are declared and
    // `inspect` is how you find them.
    length: 2.9,
    yaw: Math.PI,       // it came back facing −x; `inspect` is how you find out
    // Planes read off the inspect grid, not guessed. The arm sweeps up and
    // back over itself, so boom and stick OVERLAP in x and cannot be split by
    // a vertical plane alone — the stick is the descending member in front of
    // the elbow, which is why its test is a corner and not a half-space.
    // A null test is an empty node — an attachment point, or a parent for
    // things cut below it. Order is the priority order for the tests AND the
    // build order for parenting, so a parent must be listed before its child.
    nodes: [
      ['bucket', 'stick',  (p) => p.x > 0.28 && p.y < 0.42,  [0.40, 0.40, 0]],
      ['stick',  'boom',   (p) => p.x > 0.30,                [0.38, 0.62, 0]],
      ['boom',   'house',  (p) => p.x > 0.04 && p.y > 0.29,  [0.07, 0.32, 0]],
      // A WHEEL IS A CIRCLE. Cut with a horizontal plane it came out sawn in
      // half — the bottom spinning and the top left on the chassis. Each one
      // is its own child of `wheels` because the game spins the children.
      ['tracks', null,     null,                             [0, 0, 0]],
      ['wheels', 'tracks', null,                             [0, 0, 0]],
      ['wheelF', 'wheels', (p) => Math.hypot(p.x - 0.108, p.y - 0.129) < 0.15, [0.108, 0.129, 0]],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.336, p.y - 0.121) < 0.16, [-0.336, 0.121, 0]],
      ['house',  null,     () => true,                       [0, 0.17, 0]],
      ['seat',   'house',  null,                             [-0.10, 0.30, 0]],
      ['step',   null,     null,                             [0.20, 0.16, 0.18]],
      ['beacon', 'house',  null,                             [-0.22, 0.60, 0]],
    ],
  },

  // The case the old pipeline could not do. Generated part-by-part, a head and
  // a torso come back the same size and scaling each to its own declared
  // length made a bobblehead; cutting one figure cannot, because nothing here
  // rescales one limb against another.
  eeri: {
    src: 'out/eeri4/E1-eeri-tpose.glb',
    out: 'eeri_v2.glb',
    length: 1.62,
    by: 'y',            // a figure normalises by HEIGHT, a machine by length
    yaw: Math.PI / 2,   // sculpted facing the camera; turn him side-on
    // Authored in POST-yaw space, which is the only space that matters: after
    // the turn his left and right are separated by z, not x, so arms and legs
    // split on z. Read off the inspect grid — shoulder line y 0.50, sleeve
    // meets torso at |z| 0.17, crotch 0.20, neck 0.58.
    //
    // The BIND ROTATIONS are what a T-pose costs. The arms are modelled
    // sticking straight out along z; the game swings them about z, which
    // would spin them on their own axis. ±90° about x drops each arm to its
    // side FIRST — and it has to be a `bind`, inside the driven node, not a
    // `rest` on it, or the composition order cancels the whole thing out.
    nodes: [
      ['head', null,   (p) => p.y > 0.58,                  [0, 0.58, 0]],
      ['armL', 'body', (p) => p.z > 0.17 && p.y > 0.30,    [0, 0.50, 0.17],  0, [Math.PI / 2, 0, 0]],
      ['armR', 'body', (p) => p.z < -0.17 && p.y > 0.30,   [0, 0.50, -0.17], 0, [-Math.PI / 2, 0, 0]],
      ['hipL', null,   (p) => p.y < 0.20 && p.z > 0,       [0, 0.20, 0.07]],
      ['hipR', null,   (p) => p.y < 0.20,                  [0, 0.20, -0.07]],
      ['body', null,   () => true,                         [0, 0.20, 0]],
    ],
  },

  // ---- THE EIGHT MACHINES (owner's reference sheet, 2026-08) --------------
  // Numbers are read off `inspect`'s grid and then flipped, because every
  // test here is in POST-YAW space. These all came back facing −x, so yaw is
  // PI and a feature measured at x on the render is at −x in the table. That
  // sign is the single easiest thing to get wrong and it fails silently: the
  // catch-all swallows everything and you get one node called `house`.
  m_excavator: {
    src: 'out/m3d/excavator/image-01a011c1.glb',
    out: 'excavator_v2.glb',
    length: 2.9,
    yaw: Math.PI,
    // The arm folds back over itself, so boom and stick overlap in x — but
    // only just: the elbow sits at x 0.27 and it is the one clean plane
    // through the whole arm. The bucket then needs a y test as well, because
    // it hangs UNDER the stick's own x range rather than beyond it.
    nodes: [
      ['beacon', 'house',  (p) => Math.hypot(p.x - (-0.22), p.y - (0.37)) < 0.055, 'auto'],
      ['bucket', 'stick', (p) => p.x > 0.30 && p.y < 0.22, [0.34, 0.21, 0]],
      ['stick',  'boom',  (p) => p.x > 0.26,               [0.27, 0.45, 0]],
      ['boom',   'house', (p) => p.x > -0.08 && p.y > 0.16, [-0.07, 0.19, 0]],
      // A WHEEL IS A CIRCLE — a horizontal plane saws it in half and the top
      // stays behind on the chassis. Each idler is its own radial test, and
      // the idlers MUST be tested before the belt: order is priority, and a
      // `tracks` plane listed first swallows every wheel triangle and leaves
      // both spinning nodes empty. (It did exactly that on the first run —
      // and a 0-tri node is silent, the rig loads and simply never turns.)
      ['wheelF', 'wheels', (p) => Math.hypot(p.x + 0.041, p.y - 0.067) < 0.075, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.404, p.y - 0.067) < 0.075, 'auto'],
      ['tracks', null,     (p) => p.y < 0.14,               [0, 0, 0]],
      ['wheels', 'tracks', null,                            [0, 0, 0]],
      ['house',  null,     () => true,                      [-0.25, 0.15, 0]],
      ['seat',   'house',  null,                            [-0.20, 0.22, 0]],
      ['step',   null,     null,                            [-0.10, 0.10, 0.18]],
    ],
  },

  // The crane is the one machine whose driven node TRANSLATES: the hook drops
  // rather than swinging on a hinge.
  //
  // THERE IS NO `cable` NODE, and that is the right answer rather than a
  // shortfall. A cut for it returned 0 triangles because the hoist rope is
  // not in the mesh at all — image-to-3D will not model a 2 px thread, so the
  // hook simply floats. Do not go looking for a cleverer predicate: nothing
  // is there to find. The rope is drawn in code as a cylinder between the
  // sheave and `hook`, which is better anyway, since a rope that pays out is
  // DEFORMATION and the routing rule sends deformation to code. A cut node
  // could only have scaled a fixed mesh.
  //
  // The boom keeps its backstay, which is correct: the pendant swings with
  // the boom in life too.
  m_crane: {
    src: 'out/m3d/crane/image-01a011c2.glb',
    out: 'crane_v1.glb',
    length: 3.0,
    yaw: Math.PI,
    nodes: [
      ['beacon', 'house',  (p) => Math.hypot(p.x - (-0.41), p.y - (0.44)) < 0.055, 'auto'],
      // NAMED FOR THE GAME, not for the crane. js/crane.js drives `arm` and
      // `ball`: it is a wrecking-ball crane, and it keeps `arm` plumb by
      // counter-rotating it against the boom each frame. The mapping is exact
      // even though the words differ — the sheave IS the arm's pivot and the
      // hook IS the ball — so the rig drops straight onto existing code. A
      // GLB whose nodes disagree with its driver does not degrade: it throws
      // `Cannot read properties of undefined (reading 'rotation')` and takes
      // the whole ride down with it.
      ['ball',   'arm',   (p) => p.x > 0.35 && p.y < 0.70,  'auto'],
      ['arm',    'boom',  null,                             [0.46, 1.10, 0]],
      ['boom',   'house', (p) => p.y > 0.40 && p.x > -0.16, [-0.13, 0.41, 0]],
      ['wheelF', 'wheels', (p) => Math.hypot(p.x + 0.055, p.y - 0.070) < 0.080, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.430, p.y - 0.070) < 0.080, 'auto'],
      ['tracks', null,     (p) => p.y < 0.165,               [0, 0, 0]],
      ['wheels', 'tracks', null,                             [0, 0, 0]],
      ['house',  null,     () => true,                       [-0.26, 0.16, 0]],
      ['seat',   'house',  null,                             [-0.13, 0.26, 0]],
      ['step',   null,     null,                             [-0.16, 0.11, 0.20]],
    ],
  },

  // The tipper hinges at its REAR BOTTOM edge, not its centre — get that pivot
  // wrong and the body sinks through the chassis as it lifts instead of
  // rearing up off it. That one point is the whole rig.
  m_dumptruck: {
    src: 'out/m3d/dumptruck/image-01a011c4.glb',
    out: 'dumptruck_v1.glb',
    length: 3.4,
    yaw: Math.PI,
    nodes: [
      ['beacon', 'cab',  (p) => Math.hypot(p.x - (0.275), p.y - (0.48)) < 0.055, 'auto'],
      // wheels first: the cab plane would otherwise take the top of the front
      // tyre with it, and a half-tyre spinning inside a fixed half is the
      // sawn-wheel failure one machine up.
      ['wheelF', 'wheels', (p) => Math.hypot(p.x - 0.303, p.y - 0.082) < 0.085, 'auto'],
      ['wheelM', 'wheels', (p) => Math.hypot(p.x + 0.086, p.y - 0.082) < 0.085, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.314, p.y - 0.082) < 0.085, 'auto'],
      ['tipper', 'body',  (p) => p.x < 0.14 && p.y > 0.215,  [-0.47, 0.21, 0]],
      ['cab',    'body',  (p) => p.x > 0.16 && p.y > 0.17,   [0.30, 0.17, 0]],
      ['wheels', 'body',  null,                              [0, 0, 0]],
      ['body',   null,    () => true,                        [0, 0.10, 0]],
      ['seat',   'cab',   null,                              [0.30, 0.28, 0]],
      ['step',   null,    null,                              [0.20, 0.12, 0.20]],
    ],
  },

  // The drum is the whole machine and it is the hardest circle in the fleet,
  // because the YOKE crosses it: a yellow plate straddling the drum right
  // through its centre, so a radial test alone takes the yoke with it and the
  // arm spins. They only separate in z — the fork arms sit outside the drum
  // ends — which is the one time a cut here needs the third axis.
  m_roller: {
    src: 'out/m3d/roller/image-01a011c5.glb',
    out: 'roller_v1.glb',
    length: 2.6,
    yaw: Math.PI,
    nodes: [
      ['beacon', 'body',  (p) => Math.hypot(p.x - (-0.017), p.y - (0.70)) < 0.055, 'auto'],
      // z 0.225, not 0.17: the first cut clipped the drum's own ends off and
      // left 950 triangles — a thin disc spinning inside its own rim. The
      // window has to be wider than the drum and narrower than the yoke arms,
      // and the drum is most of the machine's width.
      ['drum',   'body',   (p) => Math.hypot(p.x - 0.288, p.y - 0.165) < 0.175 && Math.abs(p.z) < 0.225, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.244, p.y - 0.183) < 0.155, 'auto'],
      ['wheels', 'body',   null,                             [0, 0, 0]],
      ['body',   null,     () => true,                       [0, 0.18, 0]],
      ['seat',   'body',   null,                             [0.02, 0.42, 0]],
      ['step',   null,     null,                             [-0.10, 0.14, 0.20]],
    ],
  },

  // THE MAST DOES NOT MOVE — only the carriage and its forks ride up it. That
  // realisation removes the hardest cut on this machine: the mast can simply
  // stay with the body, and the only plane needed is the one in front of it.
  m_forklift: {
    src: 'out/m3d/forklift/image-01a011c6.glb',
    out: 'forklift_v1.glb',
    length: 2.2,
    yaw: Math.PI,
    nodes: [
      ['beacon', 'body',  (p) => Math.hypot(p.x - (-0.185), p.y - (0.62)) < 0.055, 'auto'],
      ['carriage', 'body',  (p) => p.x > 0.19 && p.y < 0.26,  [0.20, 0.05, 0]],
      ['wheelF', 'wheels', (p) => Math.hypot(p.x - 0.051, p.y - 0.078) < 0.090, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.333, p.y - 0.081) < 0.090, 'auto'],
      ['wheels', 'body',   null,                             [0, 0, 0]],
      ['body',   null,     () => true,                       [0, 0.12, 0]],
      ['seat',   'body',   null,                             [-0.10, 0.33, 0]],
      ['step',   null,     null,                             [-0.02, 0.10, 0.18]],
    ],
  },

  // A DIAGONAL MEMBER NEEDS A DIAGONAL CUT. The boom crosses the cab in x and
  // sits above it in y, so neither a vertical nor a horizontal plane divides
  // them — but a sloped half-plane along the boom's own underside does, and
  // costs nothing. `p.y > 0.52 + 0.439·p.x` is that line, read off the two
  // ends of the boom on the inspect grid.
  m_cherrypicker: {
    src: 'out/m3d/cherrypicker/image-01a011c8.glb',
    out: 'cherrypicker_v1.glb',
    length: 3.2,
    yaw: Math.PI,
    nodes: [
      ['beacon', 'body',  (p) => Math.hypot(p.x - (-0.013), p.y - (0.44)) < 0.055, 'auto'],
      ['basket', 'boom',   (p) => p.x > 0.30 && p.y > 0.40 && p.y < 0.70, [0.42, 0.66, 0]],
      ['boom',   'body',   (p) => p.y > 0.52 + 0.439 * p.x,  [-0.342, 0.415, 0]],
      ['wheelF', 'wheels', (p) => Math.hypot(p.x - 0.021, p.y - 0.103) < 0.078, 'auto'],
      ['wheelM', 'wheels', (p) => Math.hypot(p.x + 0.177, p.y - 0.103) < 0.078, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.375, p.y - 0.103) < 0.078, 'auto'],
      ['wheels', 'body',   null,                             [0, 0, 0]],
      ['body',   null,     () => true,                       [0, 0.14, 0]],
      ['seat',   'body',   null,                             [-0.02, 0.34, 0]],
      ['step',   null,     null,                             [0.10, 0.12, 0.18]],
    ],
  },

  // The slung pipe came back as a ring seen end-on rather than a length of
  // pipe. That is fine and arguably better — a ring reads as "pipe" at 32 px
  // and does not foreshorten — but it means `load` is cut by a single x plane
  // beyond the boom tip rather than by any clever shape test.
  m_pipelayer: {
    src: 'out/m3d/pipelayer/image-01a011c9.glb',
    out: 'pipelayer_v1.glb',
    length: 2.8,
    yaw: Math.PI,
    nodes: [
      ['beacon', 'house',  (p) => Math.hypot(p.x - (-0.048), p.y - (0.55)) < 0.055, 'auto'],
      ['load',   'hook',   (p) => p.x > 0.345,               [0.418, 0.295, 0]],
      ['hook',   'boom',   null,                             [0.33, 0.62, 0]],
      ['boom',   'house',  (p) => p.x > 0.13 && p.y > 0.40,  [0.13, 0.45, 0]],
      ['flag',   'house',  (p) => p.x < -0.39 && p.y > 0.42, [-0.40, 0.42, 0]],
      ['wheelF', 'wheels', (p) => Math.hypot(p.x - 0.071, p.y - 0.084) < 0.070, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x + 0.330, p.y - 0.084) < 0.070, 'auto'],
      ['tracks', null,     (p) => p.y < 0.20,                [0, 0, 0]],
      ['wheels', 'tracks', null,                             [0, 0, 0]],
      ['house',  null,     () => true,                       [0, 0.22, 0]],
      ['seat',   'house',  null,                             [0.02, 0.33, 0]],
      ['step',   null,     null,                             [-0.10, 0.14, 0.19]],
    ],
  },

  // NOT RIDEABLE — no `seat`, no `step`. It is site furniture that lights a
  // dark span, so the contract is shorter on purpose and `assets.js` should
  // never be asked for a seat it does not have.
  m_floodlight: {
    src: 'out/m3d/floodlight/image-01a011ca.glb',
    out: 'floodlight_v1.glb',
    length: 1.5,
    yaw: 0,             // came back square to camera; nothing to turn
    by: 'x',
    nodes: [
      ['beacon', 'body',  (p) => Math.hypot(p.x - (0.30), p.y - (0.78)) < 0.055, 'auto'],
      ['lamps',  'mast',   (p) => p.y > 1.25,                [0, 1.27, 0]],
      ['mast',   'body',   (p) => p.y > 0.72,                [0, 0.70, 0]],
      ['wheelL', 'wheels', (p) => Math.hypot(p.x + 0.244, p.y - 0.170) < 0.145, 'auto'],
      ['wheelR', 'wheels', (p) => Math.hypot(p.x - 0.229, p.y - 0.170) < 0.145, 'auto'],
      ['wheels', 'body',   null,                             [0, 0, 0]],
      ['body',   null,     () => true,                       [0, 0.20, 0]],
    ],
  },
};

const [mode, arg] = process.argv.slice(2);
if (!['inspect', 'cut', 'check'].includes(mode)) {
  console.error('usage: node slice.mjs inspect <file.glb> | cut <rig> | check <rig>');
  process.exit(1);
}
// `check` renders the cut rig with one colour per node over the same grid, so
// a bad plane is SEEN rather than inferred from triangle counts. Counting
// triangles is how v5 shipped a kid with an arm across his face.
const NODE_COLOURS = [0xff4d3d, 0x3dc0ff, 0x8bdc3d, 0xffcc33, 0xc86bff, 0x33e0c0];

const PAGE = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#c9d6de}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/rig.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(HERE, 'node_modules/three', u.slice(6)) : join(HERE, 'meshy', u);
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(8943);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
page.on('pageerror', e => console.log('ERR:', e.message));
page.on('console', m => { if (m.type() === 'log') console.log(' ', m.text()); });
await page.goto('http://localhost:8943/rig.html', { waitUntil: 'load' });

// The normaliser, shared by both modes so what `inspect` draws is exactly the
// space `cut` tests against.
const PRELUDE = `
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  // CAP THE CUT. A sliced piece is an open shell: the face where it parted
  // from its neighbour has no geometry, so the first time a joint rotates far
  // you see straight up a hollow leg. Every edge used by exactly ONE triangle
  // is on that opening; link them into loops and fan each loop to its own
  // centroid. Vertices are welded on a quantised key first, because a
  // non-indexed geometry stores every corner separately and nothing would
  // ever be found to share an edge.
  window.capHoles = (THREE, g) => {
    const pos = g.attributes.position.array;
    const key = (i) => (Math.round(pos[i * 3] * 1e4) + ',' +
                        Math.round(pos[i * 3 + 1] * 1e4) + ',' +
                        Math.round(pos[i * 3 + 2] * 1e4));
    const n = pos.length / 3;
    const id = new Int32Array(n), byKey = new Map(), rep = [];
    for (let i = 0; i < n; i++) {
      const k = key(i);
      if (!byKey.has(k)) { byKey.set(k, rep.length); rep.push(i); }
      id[i] = byKey.get(k);
    }
    // count each undirected edge; keep the direction it was seen in, because a
    // boundary loop has to be walked consistently or the fan comes out inverted
    const seen = new Map();
    for (let t = 0; t < n; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = id[t + e], b = id[t + (e + 1) % 3];
        const k = a < b ? a + ':' + b : b + ':' + a;
        const rec = seen.get(k);
        if (rec) rec.count++; else seen.set(k, { count: 1, a, b });
      }
    }
    const next = new Map();
    for (const { count, a, b } of seen.values()) if (count === 1) next.set(a, b);
    if (!next.size) return g;

    const tris = [];
    const V = (r) => new THREE.Vector3(pos[rep[r] * 3], pos[rep[r] * 3 + 1], pos[rep[r] * 3 + 2]);
    const used = new Set();
    for (const start of next.keys()) {
      if (used.has(start)) continue;
      const loop = []; let cur = start, guard = next.size + 1;
      while (guard-- && !used.has(cur)) { used.add(cur); loop.push(cur); cur = next.get(cur); if (cur === undefined) break; }
      if (loop.length < 3) continue;
      const c = new THREE.Vector3();
      for (const r of loop) c.add(V(r));
      c.multiplyScalar(1 / loop.length);
      for (let i = 0; i < loop.length; i++) {
        const p1 = V(loop[i]), p2 = V(loop[(i + 1) % loop.length]);
        tris.push(c.x, c.y, c.z, p2.x, p2.y, p2.z, p1.x, p1.y, p1.z);
      }
    }
    if (!tris.length) return g;

    // rebuild with the caps appended; cap corners copy the attributes of the
    // boundary vertex they sit on, so the cap wears the piece's own colour
    const out = new THREE.BufferGeometry();
    for (const name of Object.keys(g.attributes)) {
      const a = g.attributes[name], k = a.itemSize;
      const add = new Float32Array(tris.length / 3 * k);
      if (name === 'position') { add.set(tris); }
      else if (name === 'normal') { /* recomputed below */ }
      else {
        // flat fill from the first boundary vertex — a cut face is interior
        // and never seen except through the joint it opens
        const src = a.array;
        for (let i = 0; i < add.length; i += k) for (let c = 0; c < k; c++) add[i + c] = src[rep[0] * k + c];
      }
      const merged = new Float32Array(a.array.length + add.length);
      merged.set(a.array, 0); merged.set(add, a.array.length);
      out.setAttribute(name, new THREE.BufferAttribute(merged, k));
    }
    out.computeVertexNormals();
    return out;
  };

  // one world-space, non-indexed geometry: triangles are what get sorted, and
  // a shared index would tie triangles of different nodes to the same vertices
  window.flatten = async (file, yaw = 0, by = 'x') => {
    const scene = (await new GLTFLoader().loadAsync(file)).scene;
    scene.updateMatrixWorld(true);
    const geos = [], mats = [];
    scene.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position','normal','uv','color'].includes(k)) g.deleteAttribute(k);
      g.applyMatrix4(o.matrixWorld);
      geos.push(g); mats.push(o.material);
    });
    const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    // Turn it to face +x FIRST, once, rather than negating x in every cut
    // test. A rotation, never a mirror: a mirror would put the cab on the
    // wrong side and reverse triangle winding, rendering it inside-out.
    if (yaw) geo.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw));
    geo.computeBoundingBox();
    const bb = geo.boundingBox, size = new THREE.Vector3(); bb.getSize(size);
    // normalise: longest horizontal axis → 1, x/z centred, y = 0 at the base
    // A machine normalises by its LENGTH and a figure by its HEIGHT — a
    // standing figure normalised on x comes out 1.4 units tall and walks
    // straight off the inspect frame.
    const s = 1 / (by === 'y' ? size.y : Math.max(size.x, size.z));
    geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    geo.scale(s, s, s);
    geo.computeBoundingBox();
    return { geo, mat: mats[0], size: geo.boundingBox.getSize(new THREE.Vector3()) };
  };
`;

if (mode === 'inspect' || mode === 'check') {
  const rig = CUTS[arg];
  const spec = mode === 'check'
    ? { ...rig, nodes: rig.nodes.map(([n, p, t, pv, r, b]) => [n, p, t ? t.toString() : null, pv, r ?? 0, b ?? null]) }
    : { src: arg, yaw: Number(process.argv[4] ?? 0), by: process.argv[5] ?? 'x', nodes: [] };

  await page.evaluate(async ({ spec, prelude, colours }) => {
    const fn = new Function('return (async () => {' + prelude + ' return window.flatten; })()');
    await fn();
    const THREE = await import('three');
    const { geo, mat, size } = await window.flatten(spec.src, spec.yaw ?? 0, spec.by ?? 'x');
    console.log('normalised size  x ' + size.x.toFixed(3) + '  y ' + size.y.toFixed(3) + '  z ' + size.z.toFixed(3));

    const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(1200, 700);
    r.setClearColor(0xc9d6de); document.body.appendChild(r.domElement);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-3, 6, 6); sc.add(key);

    if (spec.nodes.length) {
      // paint each triangle by which node claims it — unowned stays white,
      // which is how a hole in the cut table announces itself
      const tests = spec.nodes.map(([, , t]) => (t ? eval('(' + t + ')') : null));
      const pos = geo.attributes.position.array, triN = pos.length / 9;
      const col = new Float32Array(pos.length);
      const c = { x: 0, y: 0, z: 0 }, tmp = new THREE.Color();
      for (let t = 0; t < triN; t++) {
        const o = t * 9;
        c.x = (pos[o] + pos[o + 3] + pos[o + 6]) / 3;
        c.y = (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3;
        c.z = (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3;
        let n = -1;
        for (let i = 0; i < tests.length; i++) if (tests[i] && tests[i](c)) { n = i; break; }
        tmp.setHex(n < 0 ? 0xffffff : colours[n % colours.length]);
        for (let v = 0; v < 3; v++) { col[o + v * 3] = tmp.r; col[o + v * 3 + 1] = tmp.g; col[o + v * 3 + 2] = tmp.b; }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      sc.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
      // and a dot on every declared pivot, so a hinge in the wrong place shows
      for (const [, , , pv] of spec.nodes) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0x000000 }));
        d.position.set(pv[0], pv[1], 0.4); sc.add(d);
      }
    } else {
      sc.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        map: mat?.map ?? null, color: mat?.color?.clone() ?? new THREE.Color(0xffffff),
      })));
    }

    // the grid IS the coordinate readout: a line every 0.1, heavier every 0.5
    for (let i = -10; i <= 20; i++) {
      const v = i / 10, hot = Math.abs(v % 0.5) < 1e-6;
      const c = hot ? 0xd02020 : 0x2a3a4a;
      const mk = (a, b) => sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: hot ? 0.9 : 0.35 })));
      mk(new THREE.Vector3(v, -0.05, 0.5), new THREE.Vector3(v, 1.2, 0.5));
      mk(new THREE.Vector3(-1.0, v, 0.5), new THREE.Vector3(1.0, v, 0.5));
    }
    // FIT the frame to the model. A fixed frustum was sized for a machine and
    // beheaded every standing figure that went through it.
    const pad = 0.12, aspect = 1200 / 700;
    const halfY = Math.max(size.y / 2 + pad, (size.x / 2 + pad) / aspect);
    const midY = size.y / 2;
    const cam = new THREE.OrthographicCamera(
      -halfY * aspect, halfY * aspect, midY + halfY, midY - halfY, 0.01, 20);
    cam.position.set(0, 0, 6); cam.lookAt(0, 0, 0);
    r.render(sc, cam);
  }, { spec, prelude: PRELUDE, colours: NODE_COLOURS });

  await page.waitForTimeout(300);
  await mkdir('out/slice', { recursive: true }).catch(() => {});
  const name = mode === 'check' ? `check-${arg}` : `inspect-${basename(arg, '.glb')}`;
  await page.screenshot({ path: `out/slice/${name}.png` });
  console.log(`→ out/slice/${name}.png`);
} else {
  const RIG = CUTS[arg];
  if (!RIG) { console.error(`no cut table for ${arg}`); process.exit(1); }
  const spec = { ...RIG, nodes: RIG.nodes.map(([n, p, t, pv, r, b]) => [n, p, t ? t.toString() : null, pv, r ?? 0, b ?? null]) };

  const res = await page.evaluate(async ({ spec, prelude }) => {
    const fn = new Function('return (async () => {' + prelude + ' return window.flatten; })()');
    await fn();
    const THREE = await import('three');
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const { geo, mat } = await window.flatten(spec.src, spec.yaw ?? 0, spec.by ?? 'x');

    const pos = geo.attributes.position.array;
    const triN = pos.length / 9;
    const tests = spec.nodes.map(([, , t]) => (t ? eval('(' + t + ')') : null));
    const owner = new Int8Array(triN).fill(-1);
    const c = { x: 0, y: 0, z: 0 };
    for (let t = 0; t < triN; t++) {
      const o = t * 9;
      c.x = (pos[o] + pos[o + 3] + pos[o + 6]) / 3;
      c.y = (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3;
      c.z = (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3;
      for (let n = 0; n < tests.length; n++) if (tests[n] && tests[n](c)) { owner[t] = n; break; }
    }

    // one geometry per node, built from its own triangles
    const counts = [];
    const sub = spec.nodes.map((_, n) => {
      const idx = []; for (let t = 0; t < triN; t++) if (owner[t] === n) idx.push(t);
      counts.push(idx.length);
      if (!idx.length) return null;
      const g = new THREE.BufferGeometry();
      for (const name of Object.keys(geo.attributes)) {
        const a = geo.attributes[name], k = a.itemSize;
        const src = a.array, dst = new src.constructor(idx.length * 3 * k);
        idx.forEach((t, i) => dst.set(src.subarray(t * 3 * k, t * 3 * k + 3 * k), i * 3 * k));
        g.setAttribute(name, new THREE.BufferAttribute(dst, k));
      }
      return g;
    });

    // Pivots → node positions. Nothing is scaled per-part — there is ONE
    // scale for the whole rig, which is the entire point of cutting rather
    // than assembling. It is BAKED into the geometry and the node positions
    // rather than set on the root: the game parents Eeri into `seat` at
    // runtime, and a scaled root would have made him 2.9× life size.
    const S = spec.length;
    const root = new THREE.Group(); root.name = spec.out.replace(/_v\d+\.glb$/, '');
    const byName = {}, pivots = {};
    const material = new THREE.MeshLambertMaterial({
      map: mat?.map ?? null, color: mat?.color?.clone() ?? new THREE.Color(0xffffff),
    });
    // Two orders, and they are NOT the same one. The table is written in TEST
    // priority (specific first, so `bucket` claims its triangles before
    // `stick` sees them), but a node cannot be parented before its parent
    // exists — and `bucket` is a child of `stick`. So pivots are collected in
    // one pass and the tree is built in a second, deferring any node whose
    // parent has not been built yet.
    // PIVOT 'auto' — the node's own geometric centre, resolved before
    // anything is parented. Hand-typed pivots are read off a render by eye,
    // and for a hinge that is fine because a hinge only has to be near the
    // right seam. For a WHEEL it is not: a spin about a point 0.1 off centre
    // is a wobble, and a wobbling wheel is the most legible way for a toy to
    // look fake. Measured wheels do not wobble, and nothing about a wheel's
    // centre needs a human opinion — it is where its triangles are.
    for (let i = 0; i < spec.nodes.length; i++) {
      if (spec.nodes[i][3] !== 'auto') continue;
      const g = sub[i];
      if (!g) { spec.nodes[i][3] = [0, 0, 0]; continue; }
      g.computeBoundingBox();
      const c = g.boundingBox.getCenter(new THREE.Vector3());
      spec.nodes[i][3] = [c.x, c.y, c.z];
    }
    for (const [name, , , pv] of spec.nodes) pivots[name] = pv;
    const pending = spec.nodes.map((n, i) => [n, i]);
    let guard = pending.length + 1;
    while (pending.length && guard--) {
      for (let i = 0; i < pending.length; i++) {
        const [[name, parent, , pv, restZ, bind], n] = pending[i];
        if (parent && !byName[parent]) continue;
        const g = new THREE.Group(); g.name = name;
        const pp = parent ? pivots[parent] : [0, 0, 0];
        g.position.set((pv[0] - pp[0]) * S, (pv[1] - pp[1]) * S, (pv[2] - pp[2]) * S);
          // REST ROTATION, all three axes. A T-posed arm lies along z and the
        // game swings arms about z — rotating it about its own axis does
        // nothing. It has to be brought DOWN to the side first, which is a
        // rotation about x, and only then do the game's z swings mean
        // anything. A scalar z-only rest could not express that.
        const rot = Array.isArray(restZ) ? restZ : [0, 0, restZ || 0];
        g.rotation.set(rot[0], rot[1], rot[2]);
        if (sub[n]) {
          const gg = window.capHoles(THREE, sub[n].clone());
          gg.translate(-pv[0], -pv[1], -pv[2]);   // pivot to the node origin
          gg.scale(S, S, S);                       // then to world size, baked
          const mesh = new THREE.Mesh(gg, material); mesh.name = name + '_mesh';
          if (bind) {
            // geometry-only holder: the game's angle composes OUTSIDE this
            const h = new THREE.Group(); h.name = name + '_bind';
            h.rotation.set(bind[0], bind[1], bind[2]);
            h.add(mesh); g.add(h);
          } else g.add(mesh);
        }
        (parent ? byName[parent] : root).add(g);
        byName[name] = g;
        pending.splice(i--, 1);
      }
    }
    if (pending.length) throw new Error('unparented nodes: ' + pending.map(p => p[0][0]).join(', '));

    const buf = await new GLTFExporter().parseAsync(root, { binary: true });
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { b64: btoa(s), counts, triN, names: spec.nodes.map(n => n[0]) };
  }, { spec, prelude: PRELUDE });

  res.names.forEach((n, i) => console.log(`  ${n.padEnd(8)} ${res.counts[i]} tris`));
  const orphan = res.triN - res.counts.reduce((a, b) => a + b, 0);
  console.log(`  ${'(unowned)'.padEnd(8)} ${orphan} tris of ${res.triN}`);
  await mkdir('out/rigged', { recursive: true }).catch(() => {});
  const buf = Buffer.from(res.b64, 'base64');
  await writeFile(`out/rigged/${RIG.out}`, buf);
  console.log(`→ out/rigged/${RIG.out} (${(buf.length / 1024).toFixed(0)} KB)`);
}

await browser.close();
server.close();
