// EERI — the clock-out building (DESIGN §4.3).
//
// THE HOLE THIS FILLS. The premise is that Eeri is on a worksite, and twelve
// levels went past with **nothing on that site ever getting finished**. The
// golden bolts were a count, and a count that buys nothing is a chore with a
// sparkle on it. So they build the world's building: a world is three levels,
// each hides three, and the nine you find are the nine parts of the thing
// this world was working on. Nine of nine and the lights go on. Four of nine
// and it stands there four-ninths built, with the gaps visible.
//
// IT NEVER GATES ANYTHING (§4.3, and it is the rule that decides the design).
// You clock out either way and the next world opens either way. The reward
// for finding them is SEEING MORE OF THE THING, never being let past a door
// — this is a game for a six-year-old, and a locked door is a punishment
// dressed as content.
//
// WHY A MISSING PART IS A FRAME RATHER THAN A HOLE. "The gaps visible" has
// two readings and only one of them is a building: an absent part leaves
// nothing to look at, so the eye reads a smaller building rather than an
// unfinished one. A part you have not earned is therefore drawn as its own
// STEEL OUTLINE — four thin uprights and a ring where the floor would be —
// which is what an unfinished storey looks like on a real site, and which
// tells you exactly what is missing and where it would go.
//
// The building is nine parts stacked three by three: three storeys of three
// bays. Parts fill from the BOTTOM LEFT, the way a building actually goes up
// — you cannot have a fourth storey with no third — so a partial building is
// always a plausible object rather than nine floating cubes.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=41';
import { craftMat, craftBox } from './craft.js?v=41';

// Each world was working on something different, and the difference is in the
// proportions and the fill, never in the part COUNT — nine bolts is nine
// bolts and the shape of the count must not change per world or the meter
// stops meaning one thing.
//
// The names are what the clock-out card says you built. They are deliberately
// plain nouns a six-year-old already owns: a kid on a site does not clock out
// having completed a mixed-use development.
// The body tones are literals rather than PAL entries on purpose: a building
// is not part of the cast, and adding four colours to the palette to hold
// them would be reaching into the art lane's file for something only this
// screen draws. If they want them in PAL later, one edit moves them.
export const BUILDING = {
  groundworks: { name: 'the tower', body: '#cbb8a0', w: 2.0, h: 1.5, roof: 'flat' },
  pipeworks:   { name: 'the pumphouse', body: '#9fb0bc', w: 2.4, h: 1.25, roof: 'flat' },
  grove:       { name: 'the lodge', body: '#a8794c', w: 2.3, h: 1.3, roof: 'pitch' },
  nightshift:  { name: 'the depot', body: '#8e97a6', w: 2.5, h: 1.2, roof: 'flat' },
};

export const PARTS = 9;          // three levels x three golden bolts

// `found` is 0..9. Anything above PARTS is clamped rather than trusted: the
// count is summed across three levels and a replayed level must not be able
// to build a tenth storey.
export function buildWorldBuilding(world, found) {
  const spec = BUILDING[world] || BUILDING.groundworks;
  const got = Math.max(0, Math.min(PARTS, Math.round(found)));
  const root = new THREE.Group();
  const body = craftMat(spec.body, 'card');
  const dark = craftMat(mix(spec.body, PAL.INK, 0.34), 'card');
  const steel = craftMat(PAL.STEEL[1], 'balsa');
  // A LIT WINDOW IS NOT A LIGHT. §3.4 forbids a post stack and there is no
  // bloom to catch a glow, so the window IS the lamp: an unlit basic material
  // at full warmth, exactly the trick the machine beacon uses.
  const litGlass = new THREE.MeshBasicMaterial({ color: '#ffdb8a' });
  const darkGlass = new THREE.MeshBasicMaterial({ color: '#2b3340' });

  const box = (mat, w, h, d, x, y, z = 0) => {
    const m = craftBox(w, h, d, mat);
    m.position.set(x, y, z); root.add(m); return m;
  };

  // the pad it stands on — a building with no ground under it floats
  box(dark, spec.w * 3 + 0.5, 0.18, 1.7, 0, 0.09);

  for (let i = 0; i < PARTS; i++) {
    const bay = i % 3, storey = Math.floor(i / 3);
    const x = (bay - 1) * spec.w;
    const y = 0.18 + storey * spec.h + spec.h / 2;
    if (i < got) {
      box(body, spec.w * 0.96, spec.h * 0.96, 1.5, x, y);
      box(dark, spec.w * 0.99, spec.h * 0.1, 1.54, x, y + spec.h * 0.46);  // floor band
      // the window: dark while the building is unfinished, lit when it is
      // done, which is the whole of "and the lights go on"
      const g = new THREE.Mesh(new THREE.PlaneGeometry(spec.w * 0.42, spec.h * 0.4),
        got === PARTS ? litGlass : darkGlass);
      g.position.set(x, y, 0.76); root.add(g);
    } else {
      // NOT YET BUILT: the frame it will stand in. Four uprights and a ring,
      // in steel, so the gap is a shape you can point at.
      for (const dx of [-spec.w * 0.46, spec.w * 0.46]) {
        for (const dz of [-0.7, 0.7]) box(steel, 0.1, spec.h * 0.96, 0.1, x + dx, y, dz);
      }
      for (const dz of [-0.7, 0.7]) box(steel, spec.w * 0.96, 0.08, 0.1, x, y + spec.h * 0.46, dz);
      for (const dx of [-spec.w * 0.46, spec.w * 0.46]) {
        box(steel, 0.1, 0.08, 1.5, x + dx, y + spec.h * 0.46, 0);
      }
    }
  }

  // The roof only goes on a FINISHED building. That is the strongest reading
  // of "finished" available without a word on screen: an open top is a site,
  // a closed top is a building.
  if (got === PARTS) {
    const top = 0.18 + 3 * spec.h;
    if (spec.roof === 'pitch') {
      const r = new THREE.Mesh(new THREE.ConeGeometry(spec.w * 2.1, spec.h * 1.1, 4), dark);
      r.rotation.y = Math.PI / 4; r.position.set(0, top + spec.h * 0.55, 0); root.add(r);
    } else {
      box(dark, spec.w * 3.1, 0.22, 1.66, 0, top + 0.11);
      box(steel, 0.12, 0.9, 0.12, spec.w * 1.1, top + 0.66);       // the aerial
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#ff6a4a' }));        // and its red light
      lamp.position.set(spec.w * 1.1, top + 1.14, 0); root.add(lamp);
    }
  }

  return { root, name: spec.name, got, parts: PARTS };
}
