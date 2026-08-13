// EERI — the diorama (ART_BRIEF §3.1–3.2). The environment is cutout
// layers: flat-colour painted shapes at real z-depths, so parallax and
// overlap come from the actual camera. In production these are PNG assets;
// in the gate-1 slice they are painted here into CanvasTextures — same
// shapes, same depths, same palette, swappable for files one layer at a
// time without touching the scene.
//
// Every layer is painted with its depth tint baked in (colours pushed
// toward the sky), shading agreeing with the upper-left key.
//
// v4 — the Tropical Freeze pass. Three rules the stack now obeys, because
// the LOOK said it did not:
//   1. THE FOREGROUND CROPS THE FRAME. The fore rect used to stop at y=5,
//      a tile above the ground line, so its pieces could never reach the
//      top of the screen and sat buried in the dirt instead of passing in
//      front of the action. It runs −2…14 now, which is the whole visible
//      band at that depth, and it carries a real kit.
//   2. DISTANCE IS VALUE, NOT JUST HUE. A haze band sits the far stack in
//      air and the skyline lost its internal contrast — it was as crisp as
//      the playfield and fought it.
//   3. THE BACKGROUND WORKS. One digging machine was one event in 96
//      tiles; a crane traverses a load across the skyline and a truck
//      crosses the far road, slow enough never to pull the eye.

import * as THREE from 'three';
import { PAL, LAYER_Z, LAYER_TINT, mix } from './palette.js?v=2';
import { getLayerTexture } from './assets.js?v=2';

export const PPU = 30; // canvas pixels per world unit

// The world rects each layer occupies. These are the asset contract for 2D:
// a live PNG for a layer must be painted to this rect at PPU px per unit
// (sizes listed in assets/README.md). The plane is the same either way —
// only where the pixels come from changes.
export const LAYER_RECTS = {
  sky:     { z: LAYER_Z.SKY,     x0: -60, x1: 170, y0: -6, y1: 40 },
  skyline: { z: LAYER_Z.SKYLINE, x0: -30, x1: 130, y0: 0, y1: 30 },
  far:     { z: LAYER_Z.FAR,     x0: -20, x1: 120, y0: 0, y1: 20 },
  mid:     { z: LAYER_Z.MID,     x0: -12, x1: 110, y0: 0, y1: 14 },
  near:    { z: LAYER_Z.NEAR,    x0: -8,  x1: 104, y0: 0, y1: 8 },
  // the occluder lane: tall enough to be CROPPED by the frame, top and
  // bottom, which is the whole point of a foreground
  fore:    { z: LAYER_Z.FORE,    x0: -8,  x1: 104, y0: -2, y1: 14 },
};

// Where the ground line falls on each plane. Nearer ground sits lower in
// frame, so the fore lane stands below the playfield's y=4 — that offset
// is what stops a foreground piece reading as a thing standing on the path.
const FORE_GROUND = 3.4;

function paintCanvas({ x0, x1, y0, y1, draw, tint }) {
  const w = x1 - x0, h = y1 - y0;
  const cv = document.createElement('canvas');
  cv.width = Math.min(4096, Math.round(w * PPU));
  cv.height = Math.round(h * PPU);
  const g = cv.getContext('2d');
  const sx = cv.width / w, sy = cv.height / h;
  // painter works in world units, y-up, origin at (x0, y0)
  g.setTransform(sx, 0, 0, -sy, -x0 * sx, y1 * sy);
  const T = (c) => (tint > 0 ? mix(c, PAL.SKY_PALE, tint) : c);
  draw(g, T);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function mountLayer(scene, rect, tex) {
  const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  mesh.position.set(rect.x0 + w / 2, rect.y0 + h / 2, rect.z);
  scene.add(mesh);
  return mesh;
}

const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// ---- the individual paintings ------------------------------------------

function drawSky(g) {
  // bands, not gradients — but the sky itself may breathe a little
  const grad = g.createLinearGradient(0, 34, 0, 2);
  grad.addColorStop(0, PAL.SKY);
  grad.addColorStop(1, mix(PAL.SKY, PAL.SKY_PALE, 0.8));
  g.fillStyle = grad; g.fillRect(-40, 0, 240, 40);

  // THE HAZE: a pale band sitting on the horizon, so the far stack stands
  // in air instead of being pasted on. Distance is value before it is hue.
  const haze = g.createLinearGradient(0, 12, 0, -2);
  haze.addColorStop(0, mix(PAL.SKY_PALE, PAL.SKY, 0.85));
  haze.addColorStop(1, PAL.SKY_PALE);
  g.fillStyle = haze; g.fillRect(-40, -2, 240, 14);

  // sun, pale and flat
  g.fillStyle = mix(PAL.CLOUD, PAL.SKY, 0.15);
  g.beginPath(); g.arc(120, 30, 3.4, 0, 7); g.fill();
  // flat cloud shapes: stacked rounded bars
  const cloud = (x, y, s) => {
    rect(g, PAL.CLOUD, x, y, 9 * s, 1.1 * s);
    rect(g, PAL.CLOUD, x + 1.6 * s, y + 1.1 * s, 5.4 * s, 1.0 * s);
    rect(g, PAL.CLOUD, x + 3.0 * s, y + 2.1 * s, 2.6 * s, 0.8 * s);
  };
  cloud(4, 26, 1); cloud(48, 30, 1.4); cloud(96, 24, 0.9); cloud(150, 29, 1.2);
}

function drawSkyline(g, T) {
  // distant city blocks + two tower cranes — nameable from silhouette.
  // The lit/shade split is deliberately SHALLOW here: at this distance a
  // crisp two-tone block reads as near, and it was competing with the
  // playfield for the eye.
  const base = 3.4;
  const block = (x, w, h) => {
    rect(g, T(PAL.STEEL[2]), x, base, w, h);
    rect(g, T(PAL.STEEL[3]), x, base, w * 0.42, h); // lit left face, barely
  };
  block(-6, 8, 9); block(6, 6, 13); block(16, 10, 7); block(30, 7, 11);
  block(42, 9, 8); block(56, 6, 15); block(66, 10, 9); block(82, 8, 12);
  block(94, 7, 8); block(104, 9, 10);
  const crane = (x, h, arm) => {
    const c = T(mix(PAL.MACHINE_DK, PAL.STEEL[3], 0.35));
    rect(g, c, x, base, 0.7, h);
    rect(g, c, x - arm * 0.28, base + h, arm, 0.6);
    rect(g, c, x + arm * 0.55, base + h - 3.2, 0.16, 3.2); // hoist line
    rect(g, c, x + arm * 0.47, base + h - 3.6, 0.5, 0.5);  // the hook block
  };
  crane(24, 17, 12); crane(74, 20, 14);
}

function drawFar(g, T) {
  // half-built concrete frames: columns and slabs, sky showing through
  const base = 3.6;
  const frame = (x, bays, floors) => {
    const bw = 3.2, fh = 2.4;
    for (let f = 0; f <= floors; f++) {
      rect(g, T(PAL.STEEL[3]), x - 0.3, base + f * fh, bays * bw + 0.6, 0.5);
    }
    for (let b = 0; b <= bays; b++) {
      rect(g, T(PAL.STEEL[2]), x + b * bw, base, 0.55, floors * fh);
    }
    // one bay wears hoarding — machine yellow lives in the depth too
    rect(g, T(PAL.MACHINE), x + bw * (bays - 1), base, bw, fh * 0.9);
  };
  frame(2, 4, 3); frame(34, 5, 2); frame(58, 3, 4); frame(84, 4, 2);
  // dirt line along the bottom so the frames stand on something
  rect(g, T(PAL.EARTH[2]), -10, 2.2, 130, 1.6);
}

function drawMid(g, T) {
  // scaffold bays with braces + plywood hoarding — the built stage showing
  const base = 3.8;
  const scaffold = (x, bays, lifts) => {
    const bw = 2.6, lh = 2.0;
    g.strokeStyle = T(PAL.STEEL[1]); g.lineWidth = 0.22;
    for (let b = 0; b <= bays; b++) {
      rect(g, T(PAL.STEEL[1]), x + b * bw, base, 0.28, lifts * lh);
    }
    for (let l = 1; l <= lifts; l++) {
      rect(g, T(PAL.EARTH[3]), x, base + l * lh, bays * bw + 0.28, 0.34); // plank
    }
    for (let b = 0; b < bays; b++) { // diagonal braces
      g.beginPath();
      g.moveTo(x + b * bw + 0.14, base);
      g.lineTo(x + (b + 1) * bw + 0.14, base + lh);
      g.stroke();
    }
  };
  const hoarding = (x, w) => {
    rect(g, T(PAL.EARTH[3]), x, base, w, 2.6);           // plywood
    rect(g, T(PAL.EARTH[2]), x, base + 2.2, w, 0.4);     // top rail
    for (let i = 0.6; i < w; i += 2.2) {                  // bolt heads
      rect(g, T(PAL.INK), x + i, base + 1.2, 0.22, 0.22);
    }
  };
  scaffold(6, 3, 3); hoarding(20, 9); scaffold(40, 4, 2);
  hoarding(58, 7); scaffold(72, 3, 4); hoarding(88, 10);
  rect(g, T(PAL.EARTH[1]), -10, 2.6, 130, 1.4); // ground line
}

function drawNear(g, T) {
  // dirt banks, pipe stacks, cones — just behind the action
  const base = 3.9;
  const bank = (x, w, h) => {
    g.fillStyle = T(PAL.EARTH[1]);
    g.beginPath();
    g.moveTo(x, base); g.lineTo(x + w * 0.3, base + h);
    g.lineTo(x + w * 0.7, base + h); g.lineTo(x + w, base);
    g.closePath(); g.fill();
    rect(g, T(PAL.EARTH[0]), x + w * 0.55, base + h - 0.28, w * 0.32, 0.28); // shade side
  };
  const pipes = (x, n) => {
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < n - r; i++) {
        g.fillStyle = T(r ? PAL.STEEL[3] : PAL.STEEL[2]);
        g.beginPath();
        g.arc(x + i * 1.1 + r * 0.55, base + 0.55 + r * 0.95, 0.55, 0, 7);
        g.fill();
        g.fillStyle = T(PAL.STEEL[0]);
        g.beginPath();
        g.arc(x + i * 1.1 + r * 0.55, base + 0.55 + r * 0.95, 0.26, 0, 7);
        g.fill();
      }
    }
  };
  const cone = (x) => {
    g.fillStyle = T(PAL.VEST);
    g.beginPath();
    g.moveTo(x, base); g.lineTo(x + 0.3, base + 0.85); g.lineTo(x + 0.6, base);
    g.closePath(); g.fill();
    rect(g, T(PAL.CLOUD), x + 0.12, base + 0.34, 0.36, 0.16);
  };
  bank(2, 6, 1.8); pipes(26, 4); bank(38, 5, 1.4); cone(50); cone(51.2);
  bank(74, 7, 2.1); pipes(88, 3); cone(60);
}

// THE OCCLUDER LANE. Dark, near-silhouette, and CROPPED — every piece here
// runs off the top or the bottom of its rect, because a foreground element
// that fits inside the frame is just scenery placed early. Pieces are
// narrow and sit in the level's quiet stretches: you pass behind one for a
// beat, which is the depth cue, and you are never hidden mid-jump.
function drawFore(g) {
  const STEEL = mix(PAL.STEEL[0], PAL.INK, 0.55);
  const STEEL_LT = mix(PAL.STEEL[1], PAL.INK, 0.4);
  const TIMBER = mix(PAL.EARTH[0], PAL.INK, 0.45);
  const IRON = mix(PAL.DARK, PAL.INK, 0.3);
  const base = FORE_GROUND;

  // a scaffold bay standing in front: standards run clean off the top
  const scaffoldLeg = (x, w = 1.5) => {
    for (const dx of [0, w]) rect(g, STEEL, x + dx, -2, 0.3, 16);
    for (const ly of [1.0, 3.4, 5.8]) rect(g, STEEL_LT, x, base + ly, w + 0.3, 0.22);
    g.strokeStyle = STEEL_LT; g.lineWidth = 0.2;
    g.beginPath();
    g.moveTo(x + 0.15, base + 1.0); g.lineTo(x + w + 0.15, base + 3.4);
    g.moveTo(x + w + 0.15, base + 3.4); g.lineTo(x + 0.15, base + 5.8);
    g.stroke();
    rect(g, IRON, x - 0.2, base - 0.6, 0.7, 0.5);          // sandbag foot
    rect(g, IRON, x + w - 0.2, base - 0.6, 0.7, 0.5);
  };

  // a chain and hook hanging in from above — cropped by the top edge, and
  // it stops HIGH: a hook dangling at head height is a thing in the way,
  // not a thing in front
  const chainHook = (x, toY) => {
    rect(g, IRON, x - 0.05, toY, 0.1, 14 - toY);
    rect(g, IRON, x - 0.24, toY - 0.38, 0.48, 0.42);       // the hook block
    rect(g, IRON, x - 0.09, toY - 0.86, 0.18, 0.5);        // the hook itself
  };

  // cable drums — SMALL and sunk to the bottom edge. They were 1.25-unit
  // discs at eye level, which is the worst thing a foreground can be: a
  // dark blob parked over the middle of the frame with the action behind
  // it. A foreground occludes in passing or it lines the bottom; it does
  // not sit in the shot.
  const drums = (x) => {
    const drum = (dx, dy, r) => {
      g.fillStyle = TIMBER;
      g.beginPath(); g.arc(x + dx, dy, r, 0, 7); g.fill();
      g.fillStyle = IRON;
      g.beginPath(); g.arc(x + dx, dy, r * 0.34, 0, 7); g.fill();
    };
    drum(0, base - 1.5, 0.72); drum(1.5, base - 1.6, 0.62);
    drum(0.75, base - 0.45, 0.6);
  };

  // spoil heaped along the bottom — the near ground sweeping under the
  // action, cropped by the frame's lower edge. Its crest has to break the
  // PLAYFIELD's ground line (y=4) or the whole heap sits inside the earth
  // band and reads as a hole cut in the dirt rather than a mound in front
  // of it — which is exactly how it read on the first pass.
  const spoilHeap = (x, w, h = 1.4) => {
    const crest = base + h;
    g.fillStyle = mix(PAL.EARTH[0], PAL.INK, 0.52);
    g.beginPath();
    g.moveTo(x, -2);
    g.lineTo(x + w * 0.22, crest * 0.94);
    g.lineTo(x + w * 0.5, crest);
    g.lineTo(x + w * 0.79, crest * 0.88);
    g.lineTo(x + w, -2);
    g.closePath(); g.fill();
    // stones catching the light along the crest
    g.fillStyle = mix(PAL.EARTH[1], PAL.INK, 0.42);
    for (let i = 0.26; i < 0.8; i += 0.2) {
      g.beginPath();
      g.arc(x + w * i, crest * 0.9 - 0.12, 0.17, 0, 7);
      g.fill();
    }
  };

  // a pipe run crossing high, over the whole action
  const pipeRun = (x0, w, y) => {
    rect(g, STEEL, x0, y, w, 0.42);
    rect(g, STEEL_LT, x0, y + 0.42, w, 0.12);
    for (let i = 1.4; i < w; i += 3.2) {                    // hangers to the top
      rect(g, IRON, x0 + i, y + 0.5, 0.12, 14 - y);
    }
  };

  // a hoarding corner, bolted, cropped by the bottom
  const hoarding = (x, w) => {
    rect(g, TIMBER, x, -2, w, base + 2.4);
    rect(g, mix(PAL.EARTH[1], PAL.INK, 0.5), x, base + 2.0, w, 0.4);
    for (let i = 0.7; i < w; i += 1.9) rect(g, IRON, x + i, base + 0.6, 0.26, 0.26);
  };

  // Placed in the gaps between the room's beats — the mound is 8–16, the
  // pit 46–48, the machine 61, the ball 66–72, the bank 84–88 — and never
  // over the thing a room is asking you to read. Verticals pass by,
  // heaps line the bottom, the pipe run crosses above everything.
  scaffoldLeg(1);
  spoilHeap(13, 8);
  chainHook(27, base + 5.4);
  scaffoldLeg(37);
  pipeRun(41, 15, 10.6);
  spoilHeap(50, 6.5, 1.2);
  hoarding(57, 2.0);
  drums(74);
  scaffoldLeg(95);
}

const PLACEHOLDER_DRAW = {
  skyline: { draw: drawSkyline, tint: LAYER_TINT.SKYLINE },
  far:     { draw: drawFar,     tint: LAYER_TINT.FAR },
  mid:     { draw: drawMid,     tint: LAYER_TINT.MID },
  near:    { draw: drawNear,    tint: LAYER_TINT.NEAR },
  fore:    { draw: drawFore,    tint: 0 },
};

// ---- the background WORKS (ART_BRIEF §3.5) -------------------------------
// "Depth you watch, not just parallax you scroll." One event per screen,
// slow, never competing with the playfield. These are meshes rather than
// paint because they move; they are tinted to their layer's depth so they
// belong to it, and reduced motion parks them.

function backgroundEvents(scene) {
  const events = [];
  const T = (c, t) => mix(c, PAL.SKY_PALE, t);
  const M = (c) => new THREE.MeshBasicMaterial({ color: c });

  // a tower crane traversing a load across the skyline
  {
    const g = new THREE.Group();
    const c = T(mix(PAL.MACHINE_DK, PAL.STEEL[3], 0.35), LAYER_TINT.SKYLINE);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 9), M(c));
    line.position.y = -4.5; g.add(line);
    const load = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), M(c));
    load.position.y = -9.4; g.add(load);
    g.position.set(74, 23.4, LAYER_Z.SKYLINE + 0.2);
    scene.add(g);
    events.push({ obj: g, x0: 66, x1: 86, speed: 0.55, dir: 1 });
  }

  // a dump truck crossing the far road
  {
    const g = new THREE.Group();
    const body = T(PAL.MACHINE, LAYER_TINT.FAR);
    const dark = T(PAL.DARK, LAYER_TINT.FAR);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), M(body));
    bed.position.set(-0.5, 0.85, 0); g.add(bed);
    const cab = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), M(body));
    cab.position.set(1.6, 0.9, 0); g.add(cab);
    for (const wx of [-1.5, 0.2, 1.7]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), M(dark));
      w.position.set(wx, 0.35, 0.01); g.add(w);
    }
    g.position.set(-16, 3.3, LAYER_Z.FAR + 0.3);
    scene.add(g);
    events.push({ obj: g, x0: -18, x1: 118, speed: 3.4, dir: 1 });
  }

  return {
    update(dt) {
      for (const e of events) {
        e.obj.position.x += e.speed * e.dir * dt;
        if (e.obj.position.x > e.x1) {
          if (e.speed > 2) e.obj.position.x = e.x0;   // the truck loops round
          else e.dir = -1;                             // the crane traverses back
        } else if (e.obj.position.x < e.x0) {
          e.dir = 1;
        }
      }
    },
    // for the gate: "the background works" is a claim, so it is measurable
    positions: () => events.map((e) => e.obj.position.x),
  };
}

// world = the level's theme; each named layer asks the asset seam for a
// live PNG first and paints its placeholder if there is none.
export async function buildLayers(scene, world = 'groundworks', reduced = false) {
  // the sky is a layer like any other now — the crafted paper sky ships as a
  // PNG through the same seam, and drawSky stays as its code placeholder
  const liveSky = await getLayerTexture(world, 'sky');
  mountLayer(scene, LAYER_RECTS.sky,
    liveSky || paintCanvas({ ...LAYER_RECTS.sky, tint: 0, draw: drawSky }));
  for (const name of ['skyline', 'far', 'mid', 'near', 'fore']) {
    const rect = LAYER_RECTS[name];
    const live = await getLayerTexture(world, name);
    mountLayer(scene, rect, live || paintCanvas({ ...rect, ...PLACEHOLDER_DRAW[name] }));
  }
  const events = backgroundEvents(scene);
  return {
    update: (dt) => { if (!reduced) events.update(dt); },
    positions: () => events.positions(),
  };
}
