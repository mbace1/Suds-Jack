// Radio Free Helsinki — the B-roll.
//
// Low-poly Helsinki, shot as news footage and cut into the package between the
// anchor and the graphics. Deliberately a different register from the panels:
// those are flat vector charts in phosphor green, this is daylight with depth
// in it. The contrast is the point — a package that cuts between a face, a
// chart and a street is doing something a static two-frame codec cannot.
//
// It still arrives through the codec screen, so scanlines, grain and (under
// DECODE) the amber wash go over the top. Bright daylight inside a dark green
// receiver is exactly how a broadcast monitor looks in a dark room.

import { PAL } from './palette.js?v=6';
import { mix, shade } from './screen.js?v=6';
import { render, box, project } from './poly.js?v=6';

// a muted northern daylight. Every ramp is dark→light; a face picks its step
// from how it faces the sun.
const STONE  = ['#6b6558', '#8a8375', '#a49c8c', '#bdb5a3'];
const STONE2 = ['#5e5a52', '#7b7669', '#928c7d', '#a8a192'];
const ROOF   = ['#33393d', '#454c50', '#576065', '#69737a'];
const LEAF   = ['#22331f', '#31492b', '#3f5c36', '#4d7042'];
const TRUNK  = ['#3a2f26', '#4a3c30', '#5a493a', '#6a5745'];
const ASPH   = ['#3c3e42', '#4a4d51', '#585c61', '#666a70'];
const DRONE  = ['#15181c', '#22272c', '#30363d', '#3e454d'];
const TRAM   = ['#1d4a3f', '#2a6455', '#357a68', '#40907b'];
const WATER  = ['#2b4654', '#38596a', '#456c80', '#527f96'];
const HULL   = ['#4a4238', '#5f564a', '#74695b', '#897c6c'];

// The sky, drawn as bands behind everything. It stops a few pixels BELOW the
// horizon rather than at the middle of the frame — the ground planes cover the
// overlap, and the haze band sitting right on the vanishing point is what sells
// distance in a shot with no fog.
function sky(scr, top, low, hz = 0.5) {
  const h = Math.round(scr.h * hz) + 3;
  const bands = [top, mix(top, low, 0.4), mix(top, low, 0.72), low];
  const bh = h / bands.length;
  scr.px(0, 0, scr.w, scr.h, low);
  bands.forEach((c, i) => scr.px(0, i * bh, scr.w, Math.ceil(bh), c));
}

// the drones. Four rotor arms and a body, kept small and dark against the sky
// so they read the way a real one does: a smudge you have to look twice at.
function drone(cx, cy, cz, tilt, t, i) {
  const f = [];
  f.push(...box(cx, cy, cz, 0.5, 0.16, 0.5, DRONE));
  for (const [ax, az] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
    f.push(...box(cx + ax, cy + 0.14, cz + az, 0.1, 0.05, 0.1, DRONE));
    // the rotor disc, spinning: a flat quad that scales with the blur
    const r = 0.26 + Math.sin(t * 22 + i * 2 + ax) * 0.04;
    f.push({
      pts: [[cx + ax - r, cy + 0.2, cz + az], [cx + ax, cy + 0.2, cz + az - r],
            [cx + ax + r, cy + 0.2, cz + az], [cx + ax, cy + 0.2, cz + az + r]],
      ramp: DRONE, flat: 0.75,
    });
  }
  return f;
}

// ── ESPLANADI ──────────────────────────────────────────────────────
// The park avenue: two rows of limes down the middle, stone facades either
// side, a bandstand at the far end — and drones holding station over it. The
// camera dollies slowly up the promenade, which is how this shot is always
// filmed.
function esplanadi(scr, t, d) {
  sky(scr, '#5c7385', '#9fb2bd', 0.42);
  const faces = [];
  const roll = (t * 1.5) % 12;                     // the dolly, looped
  const cam = { x: 0, y: 2.4, z: -3, yaw: Math.sin(t * 0.16) * 0.045, f: 105, hz: 0.42 };

  // The ground, in strips that do not overlap in x. Painter's algorithm sorts
  // by average depth, and two ground planes running the whole length of the
  // shot have the SAME average depth — so a full-width road laid under the
  // lawns wins the coin toss half the time and covers them. Butt the strips
  // together instead and the sort can never matter.
  const strip = (x0, x1, ramp, flat) => faces.push({
    pts: [[x0, 0, -1.5], [x1, 0, -1.5], [x1, 0, 60], [x0, 0, 60]], ramp, flat,
  });
  strip(-3.2, 3.2, ASPH, 0.6);                     // the gravel promenade
  for (const sx of [-1, 1]) {
    strip(sx * 3.2, sx * 9, LEAF, 0.7);            // lawn
    strip(sx * 9, sx * 30, ASPH, 0.4);             // the carriageways, darker
  }
  // Paving joints across the promenade, scrolling with the dolly. Without them
  // the near third of the frame is one flat grey slab and the camera reads as
  // parked — the trees pass at the edges but nothing moves under the lens.
  // They stop at z 30: the promenade they sit on is ONE long quad whose average
  // depth is about 32, so a joint further out than that sorts behind its own
  // road and vanishes. Past 30 they would be sub-pixel anyway.
  for (let i = 0; i < 10; i++) {
    const z = i * 3 - (roll % 3);
    if (z < -1) continue;
    faces.push({
      pts: [[-3.2, 0.01, z], [3.2, 0.01, z], [3.2, 0.01, z + 0.35], [-3.2, 0.01, z + 0.35]],
      ramp: ASPH, flat: 0.15,
    });
  }

  for (let i = 0; i < 9; i++) {
    const z = i * 6 - roll + 4;
    if (z < -2) continue;
    // the facades: a solid wall of blocks down both sides
    for (const sx of [-1, 1]) {
      const hgt = 9 + ((i * 5) % 4) * 1.6;
      faces.push(...box(sx * 13, 0, z, 8, hgt, 5.6, i % 2 ? STONE : STONE2));
      faces.push(...box(sx * 13, hgt, z, 8.4, 0.5, 6, ROOF));
      // windows, as a darker inset strip — cheap, and it scales the buildings
      for (let w = 0; w < 4; w++) {
        faces.push({
          pts: [[sx * 8.95, 2 + w * 2.2, z - 2], [sx * 8.95, 2 + w * 2.2, z + 2],
                [sx * 8.95, 3.1 + w * 2.2, z + 2], [sx * 8.95, 3.1 + w * 2.2, z - 2]],
          ramp: ROOF, flat: 0.35,
        });
      }
    }
    // the limes: two rows, trunks and a chunky canopy
    for (const sx of [-1, 1]) {
      const tz = z + 3;
      faces.push(...box(sx * 5.6, 0, tz, 0.5, 2.8, 0.5, TRUNK));
      faces.push(...box(sx * 5.6, 2.6, tz, 3.4, 2.2, 3.4, LEAF));
      faces.push(...box(sx * 5.6, 4.4, tz, 2.2, 1.4, 2.2, LEAF));
    }
    // benches along the middle
    if (i % 2 === 0) faces.push(...box(0, 0, z + 1, 1.8, 0.5, 0.6, TRUNK));
  }

  // the bandstand, far up the promenade
  faces.push(...box(0, 0, 52, 5, 3, 5, STONE));
  faces.push(...box(0, 3, 52, 6.4, 0.6, 6.4, ROOF));

  // The drones. The near one is the shot — close enough to count its arms —
  // and the other two hold further up the avenue, so the frame reads as a
  // formation rather than as one prop.
  const at = (i) => [
    Math.sin(t * 0.5 + i * 2.1) * 2.6,
    5.2 + Math.sin(t * 0.9 + i) * 0.4 + i * 1.5,
    5.5 + i * 9 - (roll * 0.3),
  ];
  for (let i = 0; i < 3; i++) {
    const [dx, dy, dz] = at(i);
    faces.push(...drone(dx, dy, dz, 0, t, i));
  }

  render(scr, faces, cam);

  // the red position lights, drawn after so they sit on top of the bodies
  for (let i = 0; i < 3; i++) {
    if (Math.floor(t * 2.5 + i) % 2) continue;
    const [dx, dy, dz] = at(i);
    const p = project([dx, dy + 0.12, dz], cam, scr.w, scr.h);
    if (p) scr.px(p[0], p[1], i ? 1 : 2, i ? 1 : 2, mix(PAL.DEFENCE, PAL.AMBER_HOT, d));
  }
}

// ── THE HARBOUR ────────────────────────────────────────────────────
// Container cranes over the water, for anything about the port or the sea.
function harbour(scr, t, d) {
  sky(scr, '#4e6675', '#93a8b4', 0.4);
  const faces = [];
  const drift = (t * 0.8) % 14;

  faces.push({ pts: [[-40, 0, 6], [40, 0, 6], [40, 0, 70], [-40, 0, 70]], ramp: WATER, flat: 0.5 });
  faces.push({ pts: [[-40, 0.4, -2.5], [40, 0.4, -2.5], [40, 0.4, 6], [-40, 0.4, 6]], ramp: ASPH, flat: 0.6 });

  for (let i = 0; i < 4; i++) {                    // the gantries
    const z = 14 + i * 13 - drift;
    if (z < 2) continue;
    for (const sx of [-1, 1]) {
      faces.push(...box(sx * 7, 0.4, z, 0.7, 11, 0.7, ROOF));
      faces.push(...box(sx * 7, 0.4, z + 5, 0.7, 11, 0.7, ROOF));
    }
    faces.push(...box(0, 11, z + 2.5, 18, 0.9, 1.4, ROOF));
    faces.push(...box(-2 + ((t * 2 + i * 3) % 8), 9.4, z + 2.5, 1.4, 1.6, 1.4, TRAM));
  }
  for (let i = 0; i < 7; i++) {                    // stacked boxes on the quay
    const z = 8 + i * 8 - drift;
    if (z < 1) continue;
    const ramp = i % 3 === 0 ? TRAM : i % 3 === 1 ? HULL : STONE2;
    faces.push(...box(-13 + (i % 2) * 26, 0.4, z, 5, 2.4, 6, ramp));
    if (i % 2) faces.push(...box(-13 + (i % 2) * 26, 2.8, z, 5, 2.4, 6, HULL));
  }

  render(scr, faces, { x: 0, y: 3.4, z: -4, yaw: 0.06 + Math.sin(t * 0.13) * 0.03, f: 100, hz: 0.4 });
}

// ── THE EASTERN TREELINE ───────────────────────────────────────────
// Forest, a cut line, a mast. For the defence band: the shot every bulletin
// about the border uses, because there is nothing else to point a camera at.
function treeline(scr, t, d) {
  sky(scr, '#54677a', '#a8b3ba', 0.4);
  const faces = [];
  const roll = (t * 1.1) % 9;

  // butted strips, not stacked planes — see the note in esplanadi()
  const strip = (x0, x1, ramp, flat) => faces.push({
    pts: [[x0, 0, -1.5], [x1, 0, -1.5], [x1, 0, 70], [x0, 0, 70]], ramp, flat,
  });
  strip(-2.6, 2.6, ASPH, 0.62);                    // the cut line
  strip(-40, -2.6, LEAF, 0.5);
  strip(2.6, 40, LEAF, 0.5);

  for (let i = 0; i < 14; i++) {                   // spruce, both sides, ragged
    const z = i * 4.5 - roll + 3;
    if (z < -1) continue;
    for (const sx of [-1, 1]) {
      const x = sx * (4.5 + ((i * 7) % 5) * 1.6);
      const hgt = 5 + ((i * 3) % 4) * 1.2;
      faces.push(...box(x, 0, z, 0.4, hgt * 0.35, 0.4, TRUNK));
      for (let k = 0; k < 3; k++) {                // stacked skirts = a conifer
        const w = 3 - k * 0.85;
        faces.push(...box(x, hgt * 0.3 + k * hgt * 0.24, z, w, hgt * 0.3, w, LEAF));
      }
    }
  }
  faces.push(...box(0, 0, 44, 0.6, 16, 0.6, ROOF));   // the mast at the end
  faces.push(...box(0, 16, 44, 1.6, 0.4, 1.6, ROOF));

  const cam = { x: 0, y: 2.2, z: -3, yaw: Math.sin(t * 0.2) * 0.06, f: 108, hz: 0.4 };
  render(scr, faces, cam);

  if (Math.floor(t * 1.2) % 2 === 0) {               // the mast light
    const p = project([0, 16.4, 44], cam, scr.w, scr.h);
    if (p) scr.px(p[0], p[1], 2, 2, mix(PAL.DEFENCE, PAL.AMBER_HOT, d));
  }
}

const PLATES = { esplanadi, harbour, treeline };
export const BROLL_KEYS = Object.keys(PLATES);

// Footage arrives through the receiver, not straight onto the page: a green
// cast, grain, and — once decoded — the same amber wash the rest of the app
// wears. Without it the B-roll reads as a photo pasted into a codec.
export function drawBroll(key, scr, t, decode) {
  (PLATES[key] || esplanadi)(scr, t, decode);

  const tint = mix('#0d2a22', '#2a1d06', decode);
  scr.ctx.globalAlpha = 0.16 + decode * 0.2;
  scr.px(0, 0, scr.w, scr.h, tint);
  scr.ctx.globalAlpha = 1;

  // Video grain, sparse and unpatterned. A bayer-gated version of this looked
  // right in the abstract and shipped a fixed lattice of black holes — the low
  // cells of the matrix are the same cells every frame, so the "noise" sat
  // still and read as a perforated screen rather than as a signal.
  scr.ctx.globalAlpha = 0.5;
  for (let i = 0; i < 90; i++) {
    const x = (Math.random() * scr.w) | 0, y = (Math.random() * scr.h) | 0;
    scr.px(x, y, 2, 1, Math.random() < 0.45 ? shade(tint, 2.4) : PAL.INK);
  }
  scr.ctx.globalAlpha = 1;

  // one dropout bar drifting down the frame, the way a weak feed tears
  const by = Math.floor((t * 26) % (scr.h + 40)) - 20;
  if (by > 0 && by < scr.h - 2) {
    scr.ctx.globalAlpha = 0.14;
    scr.px(0, by, scr.w, 2, shade(tint, 3));
    scr.ctx.globalAlpha = 1;
  }
}
