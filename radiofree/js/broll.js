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

import { PAL } from './palette.js?v=7';
import { mix, shade, bayer } from './screen.js?v=7';
import { render, box, project } from './poly.js?v=7';
// `num` only: the 3x5 glyph renderer, which is furniture rather than register.
// `field`/`ink`/`inkLo` are deliberately re-declared below instead of imported —
// the footage must not depend on the graphics module it is meant to cut against.
import { num } from './visuals.js?v=7';

// A northern DUSK. Every ramp is dark→light; a face picks its step from how it
// faces what is left of the sun.
//
// These were a bright midday when the poly plates were the only footage. The
// approved city plates below are painted at night, and a rotation that cuts
// from noon to midnight and back is a rotation the eye catches every time —
// so the whole poly set was pulled down to the same hour. Nothing else about
// them changed; the ramps are the light.
const STONE  = ['#3a3730', '#4e4a41', '#625d51', '#767063'];
const STONE2 = ['#33312c', '#454239', '#565246', '#676255'];
const ROOF   = ['#1d2124', '#282d31', '#33393d', '#3e4549'];
const LEAF   = ['#141d13', '#1d2a1a', '#263622', '#2f432a'];
const TRUNK  = ['#221c17', '#2c241d', '#362c23', '#403429'];
const ASPH   = ['#222426', '#2b2d30', '#34373a', '#3d4044'];
const DRONE  = ['#0b0d10', '#141719', '#1d2124', '#262b2f'];
const TRAM   = ['#123029', '#1a4038', '#215046', '#286055'];
const WATER  = ['#1a2b34', '#233742', '#2c4350', '#354f5e'];
const LIT    = ['#16302b', '#20463e', '#2b5c51', '#357264'];   // lit windows
const HULL   = ['#2e2923', '#3c352d', '#4a4237', '#584e41'];

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
  sky(scr, '#141d2a', '#425360', 0.42);
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
          ramp: LIT, flat: 0.62,
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
  sky(scr, '#111a26', '#3c4c59', 0.4);
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
  sky(scr, '#131c28', '#414f5c', 0.4);
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

// ── THE APPROVED CITY PLATES ───────────────────────────────────────
// Six shots painted rather than rendered — the cathedral, two trams, the
// station, Kamppi and the gulf. They came from the deployed line, where they
// had been written straight into `visuals.js` as story panels; they are
// footage, so they live here now, and they keep their approved names.
//
// They are painted in phosphor at night while the poly plates above are lit
// daylight, which is why every plate in this file goes out through the same
// `drawBroll()` treatment and why the poly skies were pulled down to dusk: a
// rotation that cuts from noon to midnight and back is a rotation you notice.
//
// `field`, `ink` and `inkLo` are local copies of the three helpers these were
// written against in visuals.js — see the note on the import at the top.
const W = 128, H = 152;
function field(scr, decode, grid = true) {
  scr.clear(mix(PAL.PANEL, '#1a1206', decode * 0.5));
  if (!grid) return;
  const g = mix(PAL.GREEN_LO, PAL.AMBER_DIM, decode * 0.7);
  for (let x = 0; x < W; x += 8) scr.px(x, 0, 1, H, shade(g, 0.5));
  for (let y = 0; y < H; y += 8) scr.px(0, y, W, 1, shade(g, 0.5));
}
const ink = (d) => mix(PAL.GREEN, PAL.AMBER, d);
const inkLo = (d) => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

// Tuomiokirkko / Senate Square (approved)
function cathedral(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 52, [mix('#0c1820', '#1a1408', d), mix('#122430', '#241a0c', d)]);
  const cx = 64;
  scr.ellipse(cx, 36, 30, 18, mix('#d0d8dc', '#c0a068', d));
  scr.ellipse(cx, 34, 26, 14, mix('#e0e8ec', '#d0b078', d));
  scr.ellipse(cx - 22, 42, 8, 6, mix('#c8d0d4', '#b89860', d));
  scr.ellipse(cx + 22, 42, 8, 6, mix('#c8d0d4', '#b89860', d));
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 9;
    scr.px(x - 1, 50, 3, 32, mix('#c0c8cc', '#b09058', d));
  }
  scr.px(cx - 32, 50, 64, 4, mix('#a8b0b4', '#a08050', d));
  for (let s = 0; s < 6; s++) {
    const y = 84 + s * 5;
    const w = 72 + s * 7;
    scr.px(cx - w / 2, y, w, 4, mix('#9898a0', '#907040', d));
  }
  scr.px(0, 114, W, H - 114, mix('#101820', '#1c160c', d));
  for (let i = 0; i < 10; i++) {
    const x = 12 + ((t * 11 + i * 19) % (W - 24));
    const y = 118 + (i % 3) * 5;
    if (d < 0.4 || i % 3 === 0) scr.px(x, y, 2, 3, ink(d * 0.5));
  }
  scr.px(18, 22, 2, 20, inkLo(d));
  const fy = 20 + Math.sin(t * 2.1) * 2;
  scr.px(20, fy, 11, 7, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  if (d > 0.35) {
    scr.rect(4, 4, 34, 11, PAL.PANEL_LO, PAL.AMBER);
    num(scr, 8, 6, 'OBS', PAL.AMBER_HOT);
  }
}

// Narrower street tram (first approved tram, renamed)
function katu(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 38, [mix('#0a141c', '#181008', d), mix('#101c28', '#20160c', d)]);
  for (let i = 0; i < 6; i++) {
    const x = i * 22;
    const h = 26 + ((i * 13) % 16);
    scr.px(x, 38 - h, 20, h, mix('#0e1c24', '#1e160a', d));
    for (let wy = 0; wy < h - 6; wy += 7) {
      const on = ((Math.floor(t * 1.7) + i + wy) % 4) !== 0;
      scr.px(x + 4, 38 - h + 4 + wy, 3, 3, on ? inkLo(d) : shade(inkLo(d), 0.35));
      scr.px(x + 12, 38 - h + 4 + wy, 3, 3, on ? shade(inkLo(d), 0.65) : shade(inkLo(d), 0.3));
    }
  }
  scr.px(0, 86, W, H - 86, mix('#101418', '#1a140c', d));
  scr.px(0, 94, W, 2, inkLo(d));
  const tx = ((t * 20) % (W + 55)) - 28;
  scr.px(tx, 76, 40, 13, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d * 0.45));
  scr.px(tx + 3, 70, 11, 6, mix(PAL.GREEN, PAL.AMBER, d * 0.35));
  scr.px(tx + 2, 80, 7, 5, mix('#1a282c', '#2a1e10', d));
  scr.px(tx + 13, 80, 7, 5, mix('#1a282c', '#2a1e10', d));
  scr.px(tx + 24, 80, 7, 5, mix('#1a282c', '#2a1e10', d));
  for (let i = 0; i < 3; i++) {
    const cx = ((t * 14 + i * 48) % (W + 28)) - 14;
    scr.px(cx, 106 + (i % 2) * 9, 13, 5, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.3));
  }
  for (let i = 0; i < 4; i++) {
    const lx = 14 + i * 32;
    scr.px(lx, 48, 2, 36, inkLo(d));
    const pulse = 0.55 + 0.45 * Math.sin(t * 2.8 + i);
    scr.px(lx - 2, 46, 6, 3, mix(shade(PAL.GREEN_HOT, pulse), PAL.AMBER_HOT, d));
  }
  if (d > 0.35) num(scr, 4, 6, '4T', PAL.AMBER_HOT);
}

// Wide Mannerheimintie boulevard tram (second approved)
function mannerheim(scr, t, d) {
  field(scr, d, false);
  // deep night sky
  scr.bands(0, 0, W, 30, [mix('#060e14', '#140e08', d), mix('#0a1620', '#1a120a', d)]);
  // tall buildings set further back for wide avenue feel
  for (let i = 0; i < 5; i++) {
    const x = i * 28 - 4;
    const h = 40 + ((i * 17) % 22);
    scr.px(x, 30 - h, 26, h, mix('#0c1a22', '#1c140a', d));
    for (let wy = 0; wy < h - 8; wy += 9) {
      for (let wx = 4; wx < 22; wx += 8) {
        const on = ((Math.floor(t * 1.5) + i + wy + wx) % 5) !== 0;
        scr.px(x + wx, 30 - h + 6 + wy, 4, 4, on ? inkLo(d) : shade(inkLo(d), 0.3));
      }
    }
  }
  // wide multi-lane street
  scr.px(0, 78, W, H - 78, mix('#0e1418', '#1a140c', d));
  // tram tracks (double)
  scr.px(52, 78, 2, H - 78, inkLo(d));
  scr.px(74, 78, 2, H - 78, inkLo(d));
  // tram coming toward camera
  const ty = 90 + Math.sin(t * 0.8) * 2;
  const tw = 28 + Math.sin(t * 0.4) * 2;
  scr.px(64 - tw / 2, ty, tw, 18, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d * 0.4));
  scr.px(64 - tw / 2 + 4, ty + 4, tw - 8, 8, mix('#1a282c', '#2a1e10', d));
  scr.px(62, ty - 4, 4, 4, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d)); // headlight
  // distant traffic dots
  for (let i = 0; i < 6; i++) {
    const x = 10 + ((t * 12 + i * 30) % (W - 20));
    const y = 110 + (i % 3) * 8;
    scr.px(x, y, 10, 4, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.25));
  }
  // street lights along both sides
  for (let i = 0; i < 5; i++) {
    const lx = 8 + i * 28;
    scr.px(lx, 40, 2, 38, inkLo(d));
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + i);
    scr.px(lx - 3, 38, 8, 3, mix(shade(PAL.GREEN_HOT, pulse), PAL.AMBER_HOT, d));
    const rx = W - 10 - i * 28;
    scr.px(rx, 40, 2, 38, inkLo(d));
    scr.px(rx - 3, 38, 8, 3, mix(shade(PAL.GREEN_HOT, pulse), PAL.AMBER_HOT, d));
  }
  if (d > 0.35) {
    num(scr, 4, 6, 'M10', PAL.AMBER_HOT);
  }
}

// Central Station (original approved style)
function station(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 28, [mix('#08141c', '#181008', d), mix('#0c1c28', '#20160c', d)]);
  const tx = 64;
  scr.px(tx - 11, 6, 22, 56, mix('#1a282c', '#2a1e10', d));
  scr.px(tx - 13, 4, 26, 4, mix('#2a383c', '#3a2e18', d));
  scr.disc(tx, 26, 9, mix('#d0d8dc', '#c8a870', d));
  scr.disc(tx, 26, 7, mix('#e8f0f4', '#d8b880', d));
  const ang = (t * 0.12) % (Math.PI * 2);
  scr.px(tx, 26, 1, -6, ink(d));
  scr.px(tx, 26, Math.round(Math.cos(ang) * 5), Math.round(Math.sin(ang) * 5), inkLo(d));
  scr.px(6, 38, 42, 28, mix('#121e22', '#1e160c', d));
  scr.px(80, 38, 42, 28, mix('#121e22', '#1e160c', d));
  for (const side of [10, 84]) {
    for (let wy = 0; wy < 20; wy += 8) {
      for (let wx = 0; wx < 34; wx += 10) {
        const on = ((Math.floor(t * 1.4) + wy + wx) % 5) !== 0;
        scr.px(side + wx, 44 + wy, 5, 4, on ? inkLo(d) : shade(inkLo(d), 0.35));
      }
    }
  }
  scr.px(0, 68, W, H - 68, mix('#0e1418', '#1a1208', d));
  for (let i = 0; i < 12; i++) {
    const x = 8 + ((t * 9 + i * 15) % (W - 16));
    const y = 76 + (i % 4) * 6;
    if (d < 0.35 || i % 3 === 0) scr.px(x, y, 2, 3, ink(d * 0.5));
  }
  const tr = ((t * 7) % (W + 36)) - 18;
  scr.px(tr, 128, 34, 7, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.35));
  scr.px(tr + 3, 124, 8, 4, inkLo(d));
  if (d > 0.35) num(scr, 4, 6, d > 0.5 ? 'LATE' : 'ON', ink(d));
}

function kamppi(scr, t, d) {
  field(scr, d, false);
  scr.px(0, 0, W, H, mix('#060a10', '#140e06', d));
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 30, h = 50 + (i % 3) * 18;
    scr.rect(x, H - 20 - h, 24, h, mix('#0c1820', '#1e160a', d), inkLo(d));
    for (let wy = 0; wy < h - 8; wy += 8) {
      const on = ((Math.floor(t * 2) + i + wy) % 5) !== 0;
      scr.px(x + 4, H - 20 - h + 6 + wy, 4, 3, on ? ink(d * 0.6) : shade(inkLo(d), 0.5));
      scr.px(x + 14, H - 20 - h + 6 + wy, 4, 3, on ? inkLo(d) : shade(inkLo(d), 0.4));
    }
  }
  scr.px(0, H - 20, W, 20, mix('#0a1218', '#1a1208', d));
  for (let i = 0; i < 18; i++) {
    const x = 6 + (i * 17 + Math.floor(t * 8)) % (W - 12);
    const y = H - 16 + (i % 3) * 4;
    const keep = d < 0.35 || i % 5 === 0;
    if (keep) scr.px(x, y, 2, 3, ink(d * 0.5));
  }
  if (d > 0.4) num(scr, 4, 8, d > 0.5 ? '12' : '90', ink(d));
}

function gulf(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 55, [mix('#08141c', '#181008', d), mix('#0c2030', '#22180c', d)]);
  for (let i = 0; i < 12; i++) {
    const x = 4 + i * 10;
    const h = 8 + ((i * 7) % 14);
    scr.px(x, 55 - h, 8, h, mix('#0e1c24', '#1e160a', d));
    if ((Math.floor(t) + i) % 4 === 0) scr.px(x + 2, 55 - h + 3, 2, 2, inkLo(d));
  }
  for (let y = 70; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y >> 1) < 0.5 + Math.sin(x * 0.08 + t * 1.2) * 0.1)
        scr.px(x, y, 2, 2, mix('#0a2838', '#281c0a', d));
    }
  }
  scr.px(0, 64, W, 8, mix('#121820', '#1e160c', d));
  if (d > 0.3) {
    scr.px(50, 100, W - 50, 2, PAL.AMBER);
    num(scr, 54, 108, 'CAB', PAL.AMBER_HOT);
  }
}

const PLATES = { esplanadi, harbour, treeline,
                 cathedral, katu, mannerheim, station, kamppi, gulf };
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
