// EERI — the World 3 and World 4 machines.
//
// WHY THIS FILE EXISTS. Twelve levels, four worlds, and until now **two
// machine classes**: `Excavator` and `Crane`. `MACHINE_SPEED` names a pump
// and a pipelayer, DESIGN describes them, and `main.js` builds an excavator
// for anything that is not a crane — so World 2's "pump ride" is an
// excavator wearing the word, and Worlds 3 and 4 borrow Worlds 1-2's
// machines outright. A forest clearing and a night earthworks were being
// worked by the same yellow digger.
//
// THE CHEAP PART IS THE CLASS, THE EXPENSIVE PART IS THE SILHOUETTE. The
// Excavator animates NAMED NODES — house, boom, stick, bucket, seat, step,
// wheels, beacon — and knows nothing else about what it is driving. So a new
// machine is a new MODEL against that contract, not a new class: build the
// same nodes into a different shape and every verb, every mount, every
// mercy frame and every gate works untouched.
//
// That is also the asset seam. Both builders below are placeholders in
// exactly the sense `assets/manifest.json` means it: a `skidder_v1.glb` or
// `loader_v1.glb` that keeps the node names replaces the code with no game
// change, the way `excavator_v1.glb` already did.
//
// WHAT THEY ARE, AND WHY NOT SOMETHING MORE EXOTIC. Both keep the proved
// verbs (`dig`, `span`) rather than inventing one. §8.0's warning is about
// the ride being a fetch-quest, not about a verb being reused, and World 2's
// pump is already "the bank's shape, re-dressed". A machine that lights a
// dark stretch or lifts you up a face is a NEW MECHANIC and belongs in its
// own release with its own room rules — not smuggled in as a model swap.
//
//   SKIDDER (World 3, the forest)  tracked, low, a GRAPPLE where the bucket
//     goes. It drags fallen timber: the same close-and-lift the bucket does,
//     which is why the node is still called `bucket`. A stack that clears the
//     canopy and a brush guard over the cab are the tells that this one works
//     among trees.
//
//   LOADER (World 4, the night site)  wheeled, a wide BLADE, and a mast with
//     two work lamps on it. Earthworks under floodlights: the lamps are what
//     makes it World 4's, and they light while it is unmanned, which is the
//     same job the beacon does said in that world's language.
//
// Both are built to the excavator's own conventions (ART_BRIEF §3.3): thick
// parts, big radii, one body colour over a near-black undercarriage, bolt
// heads as the detail motif, an OPEN seat so the rider is never swallowed.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=42';
import { craftMat } from './craft.js?v=42';

// ---- the shared kit ------------------------------------------------------
// Everything both machines are made of, so the two builders below read as
// what is DIFFERENT about them rather than as two copies of a box helper.
function kit(tint) {
  const T = (c) => (tint > 0 ? mix(c, PAL.SKY_PALE, tint) : c);
  const M = (c) => craftMat(T(c), 'balsa');
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (parent, r, h, c, x, y, z, seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  return { box, cyl };
}

// The beacon is the unmanned tell and the hazard telegraph at once
// (ART_BRIEF §1.2), so it is identical on every machine on purpose: one lamp
// means one thing across the whole game.
function beaconAt(house, box, x, y, z) {
  const beacon = new THREE.Group(); beacon.name = 'beacon';
  beacon.position.set(x, y, z); house.add(beacon);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.17, 8),
    new THREE.MeshBasicMaterial({ color: '#ff9c1a' }),
  );
  lamp.position.y = 0.1; beacon.add(lamp);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.16),
    new THREE.MeshBasicMaterial({ color: '#ffdc8a', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  flash.position.set(0.13, 0.1, 0); flash.rotation.y = Math.PI / 2; beacon.add(flash);
  box(beacon, 0.1, 0.1, 0.1, PAL.DARK, 0, 0, 0);
  return beacon;
}

// The open cab, with the seat node the mount lands on.
function cabIn(house, box, cyl, x) {
  const cab = new THREE.Group(); cab.position.set(x, 0, 0); house.add(cab);
  box(cab, 0.78, 0.07, 0.8, PAL.STEEL[1], 0, 0.03, 0);
  box(cab, 0.3, 0.26, 0.52, PAL.MACHINE_DK, 0.36, 0.2, 0);
  box(cab, 0.34, 0.1, 0.34, PAL.DARK, -0.12, 0.22, 0);
  box(cab, 0.1, 0.4, 0.34, PAL.DARK, -0.3, 0.42, 0);
  for (const dz of [0.09, -0.09]) {
    cyl(cab, 0.022, 0.3, PAL.INK, 0.18, 0.32, dz, 6).rotation.z = -0.35;
  }
  const seat = new THREE.Group(); seat.name = 'seat';
  seat.position.set(-0.1, 0.12, 0); cab.add(seat);
  return seat;
}

// The step. The mount move is legible because this exists to climb onto.
function stepOn(root, box, x, y, z) {
  const step = new THREE.Group(); step.name = 'step';
  step.position.set(x, y, z);
  box(step, 0.36, 0.07, 0.3, PAL.MACHINE, 0, 0, 0);
  box(step, 0.06, 0.45, 0.06, PAL.DARK, -0.15, 0.25, 0);
  root.add(step); return step;
}

// ---- WORLD 3: THE SKIDDER ------------------------------------------------
export function buildSkidderModel(tint = 0) {
  const { box, cyl } = kit(tint);
  const root = new THREE.Group();   // origin at ground contact, facing +x
  const nodes = {};
  // THE BODY COLOUR STAYS IN THE FAMILY. `PAL.MACHINE` is "the cast's family
  // colour" (palette.js), and a green skidder would read as a different cast
  // rather than as another machine on the same site. So these two machines
  // are told apart by SILHOUETTE — which is the house rule anyway: a flat
  // fill inside a hard line has nowhere to put the difference except the
  // outline. A forest livery is a palette decision and belongs to the art
  // lane, not to a model builder.
  const BODY = PAL.MACHINE, BODY_DK = PAL.MACHINE_DK;

  // WIDE, SHORT TRACKS. A skidder works on soft ground, so it sits on more
  // track than the excavator does and lower over it — the silhouette says
  // "this one does not sink" before anything else about it registers.
  const tracks = new THREE.Group(); tracks.name = 'tracks'; root.add(tracks);
  const wheels = new THREE.Group(); wheels.name = 'wheels'; tracks.add(wheels);
  for (const dz of [0.68, -0.68]) {
    box(tracks, 3.0, 0.7, 0.5, PAL.DARK, 0, 0.38, dz);
    box(tracks, 2.5, 0.22, 0.54, PAL.INK, 0, 0.09, dz);
    for (const wx of [-1.05, -0.35, 0.35, 1.05]) {
      const spin = new THREE.Group(); spin.position.set(wx, 0.32, dz);
      cyl(spin, 0.26, 0.56, PAL.STEEL[1], 0, 0, 0, 9).rotation.x = Math.PI / 2;
      cyl(spin, 0.1, 0.6, PAL.INK, 0, 0, 0, 6).rotation.x = Math.PI / 2;
      wheels.add(spin);
    }
  }
  nodes.wheels = wheels;
  nodes.step = stepOn(root, box, 0.95, 0.6, 0.66);
  box(root, 2.2, 0.2, 1.25, PAL.STEEL[0], -0.05, 0.82, 0);   // deck plate

  const house = new THREE.Group(); house.name = 'house'; house.position.y = 0.92;
  root.add(house); nodes.house = house;
  box(house, 1.35, 0.7, 1.1, BODY, -0.3, 0.35, 0);
  box(house, 0.55, 0.6, 1.1, BODY_DK, -1.18, 0.33, 0);      // counterweight
  box(house, 1.35, 0.1, 1.14, BODY_DK, -0.3, 0.05, 0);
  // THE STACK. Tall enough to read against a treeline — the one part that
  // says "forest machine" from across the room.
  cyl(house, 0.075, 0.85, PAL.DARK, -0.72, 1.12, 0.32, 8);
  cyl(house, 0.11, 0.12, PAL.INK, -0.72, 1.56, 0.32, 8);     // its cap
  for (const bx of [-0.85, -0.45, -0.05]) {
    cyl(house, 0.045, 0.06, PAL.DARK, bx, 0.5, 0.57, 6).rotation.x = Math.PI / 2;
  }
  // BRUSH GUARD over the cab: it works under branches, so it wears a roof
  // the excavator does not — and it is bars, not a canopy, because the rider
  // must stay visible (the Yoshi rule).
  for (const dz of [0.34, -0.34]) box(house, 0.06, 0.62, 0.06, PAL.STEEL[0], 0.9, 0.72, dz);
  for (const bx of [0.55, 0.78, 1.0]) box(house, 0.06, 0.06, 0.78, PAL.STEEL[0], bx, 1.05, 0);
  nodes.seat = cabIn(house, box, cyl, 0.52);
  nodes.beacon = beaconAt(house, box, -0.48, 1.1, 0.36);

  // boom → stick → GRAPPLE. Shorter and heavier than the excavator's arm,
  // because it drags rather than reaches.
  const boom = new THREE.Group(); boom.name = 'boom';
  boom.position.set(0.35, 0.3, 0); house.add(boom); nodes.boom = boom;
  box(boom, 1.5, 0.34, 0.28, BODY, 0.72, 0, 0);
  box(boom, 1.5, 0.09, 0.3, BODY_DK, 0.72, -0.17, 0);

  const stick = new THREE.Group(); stick.name = 'stick';
  stick.position.set(1.44, 0, 0); boom.add(stick); nodes.stick = stick;
  box(stick, 1.0, 0.22, 0.2, BODY, 0.46, 0, 0);

  // The node is still called `bucket`: it is what closes on the load, and
  // the class drives it by that name.
  const bucket = new THREE.Group(); bucket.name = 'bucket';
  bucket.position.set(0.94, 0, 0); stick.add(bucket); nodes.bucket = bucket;
  box(bucket, 0.22, 0.2, 0.44, PAL.STEEL[1], 0.02, -0.08, 0);     // the head
  for (const dz of [0.2, -0.2]) {                                  // two jaws
    const jaw = new THREE.Group(); jaw.position.set(0.1, -0.16, dz); bucket.add(jaw);
    box(jaw, 0.4, 0.09, 0.1, PAL.STEEL[0], 0.16, -0.06, 0);
    box(jaw, 0.1, 0.24, 0.1, PAL.STEEL[0], 0.34, -0.2, 0);
    jaw.rotation.z = dz > 0 ? -0.25 : -0.25;
    jaw.rotation.y = dz > 0 ? 0.22 : -0.22;
  }

  boom.rotation.z = 0.52; stick.rotation.z = -1.35; bucket.rotation.z = -0.6;
  return { root, nodes };
}

// ---- WORLD 4: THE LOADER -------------------------------------------------
export function buildLoaderModel(tint = 0) {
  const { box, cyl } = kit(tint);
  const root = new THREE.Group();
  const nodes = {};
  const BODY = PAL.MACHINE, BODY_DK = PAL.MACHINE_DK;

  // FOUR BIG WHEELS, not tracks. A wheeled loader reads as fast and as road
  // machinery, which is what a night shift on a made-up site would run.
  const under = new THREE.Group(); under.name = 'tracks'; root.add(under);
  const wheels = new THREE.Group(); wheels.name = 'wheels'; under.add(wheels);
  box(under, 2.5, 0.34, 1.15, PAL.INK, -0.1, 0.62, 0);         // chassis beam
  for (const dz of [0.66, -0.66]) {
    for (const wx of [-0.92, 0.86]) {
      const spin = new THREE.Group(); spin.position.set(wx, 0.5, dz);
      cyl(spin, 0.5, 0.42, PAL.DARK, 0, 0, 0, 12).rotation.x = Math.PI / 2;
      cyl(spin, 0.24, 0.46, PAL.STEEL[1], 0, 0, 0, 9).rotation.x = Math.PI / 2;
      cyl(spin, 0.08, 0.5, PAL.INK, 0, 0, 0, 6).rotation.x = Math.PI / 2;
      wheels.add(spin);
    }
  }
  nodes.wheels = wheels;
  nodes.step = stepOn(root, box, 0.5, 0.72, 0.7);

  const house = new THREE.Group(); house.name = 'house'; house.position.y = 0.86;
  root.add(house); nodes.house = house;
  box(house, 1.5, 0.66, 1.12, BODY, -0.5, 0.33, 0);           // engine block
  box(house, 1.5, 0.1, 1.16, BODY_DK, -0.5, 0.03, 0);
  box(house, 0.4, 0.3, 0.9, BODY_DK, -1.3, 0.5, 0);           // rear weight
  cyl(house, 0.06, 0.34, PAL.DARK, -0.95, 0.82, 0.3, 8);
  for (const bx of [-1.05, -0.65, -0.25]) {
    cyl(house, 0.045, 0.06, PAL.DARK, bx, 0.44, 0.58, 6).rotation.x = Math.PI / 2;
  }
  nodes.seat = cabIn(house, box, cyl, 0.42);
  nodes.beacon = beaconAt(house, box, -0.35, 1.06, 0.34);

  // THE MAST. Two work lamps on a short tower — this is what makes it World
  // 4's machine rather than a yellow digger at night. They are unlit
  // materials, the same trick the beacon uses: the lamp IS the light, since
  // §3.4 forbids a post stack and there is no bloom to catch a glow.
  const mast = new THREE.Group(); mast.position.set(-0.55, 0.66, 0); house.add(mast);
  cyl(mast, 0.06, 1.1, PAL.STEEL[0], 0, 0.55, 0, 8);
  box(mast, 0.5, 0.07, 0.1, PAL.STEEL[0], 0, 1.1, 0);
  for (const dx of [-0.2, 0.2]) {
    const lampBody = box(mast, 0.2, 0.16, 0.22, PAL.DARK, dx, 1.02, 0);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.12),
      new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    glass.position.set(0.11, 0, 0); glass.rotation.y = Math.PI / 2;
    lampBody.add(glass);
  }

  // boom → stick → BLADE. The arm is a loader's: it lifts from the front and
  // low, so it rests almost flat instead of folded up over the house.
  const boom = new THREE.Group(); boom.name = 'boom';
  boom.position.set(0.45, 0.1, 0); house.add(boom); nodes.boom = boom;
  for (const dz of [0.42, -0.42]) box(boom, 1.9, 0.22, 0.16, BODY, 0.9, 0, dz);
  box(boom, 0.3, 0.16, 0.9, BODY_DK, 0.3, 0, 0);              // cross brace

  const stick = new THREE.Group(); stick.name = 'stick';
  stick.position.set(1.8, 0, 0); boom.add(stick); nodes.stick = stick;
  box(stick, 0.5, 0.18, 0.9, BODY, 0.2, 0, 0);

  const bucket = new THREE.Group(); bucket.name = 'bucket';
  bucket.position.set(0.45, 0, 0); stick.add(bucket); nodes.bucket = bucket;
  box(bucket, 0.5, 0.12, 1.3, PAL.STEEL[1], 0.2, -0.22, 0);   // the wide blade
  box(bucket, 0.12, 0.44, 1.3, PAL.STEEL[1], -0.02, -0.02, 0);
  box(bucket, 0.62, 0.06, 1.34, PAL.STEEL[0], 0.28, -0.28, 0); // cutting edge
  for (const dz of [-0.5, 0, 0.5]) box(bucket, 0.1, 0.05, 0.12, PAL.DARK, 0.5, -0.28, dz);

  boom.rotation.z = 0.24; stick.rotation.z = -0.9; bucket.rotation.z = -0.35;
  return { root, nodes };
}
