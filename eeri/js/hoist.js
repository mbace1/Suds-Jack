// EERI — the hoist: the first solid thing in this game that is not a tile.
//
// WHY THAT SENTENCE IS THE WHOLE DESIGN. Every other floor here is a
// character in the grid. Collision is a lookup (`level.solidCell`), the
// meshes are built once per room and never touched again, and nothing in
// `Player` has any concept of standing ON something — entity contact is only
// ever a one-frame impulse (`bounce`, `struck`) after which you are airborne.
// A floor that MOVES can be none of those things, which is why the gizmo kit
// stopped at the tile line on purpose (VERSIONS v14) and why this is the
// expensive item of world 2.
//
// So: an entity, shaped exactly like `robots.js`'s — it takes the room's
// group, adds its own meshes to it, and answers `update(dt)`. Everything it
// makes lives inside that group, or it leaks when the level changes.
//
// The carry itself is NOT here. It is one pass in `Player.update`, after the
// tile pass, reading `level.platforms` — because the player is the only
// thing that can decide it is being carried, and putting that decision in
// two places is how it starts disagreeing with itself.
//
// It moves VERTICALLY ONLY. A lift is what level 6 asks for, and a hoist
// that also slid sideways would have its carry fighting the player's own
// run — a much larger argument, and one nothing needs yet.

import * as THREE from 'three';
import { PAL } from './palette.js?v=32';
import { craftMat, craftBox } from './craft.js?v=32';

export class Hoist {
  // `def` is the part's own record: { c0, c1, cy0, cy1, period }
  constructor(scene, level, def) {
    this.level = level;
    this.c0 = def.c0; this.c1 = def.c1;
    this.cy0 = def.cy0; this.cy1 = def.cy1;
    this.period = def.period || 4;

    // the platform's own frame: x is its centre, y is the TOP surface —
    // the thing the player stands on — so nothing downstream has to add
    // half a thickness to work out where the floor is
    this.hw = (def.c1 - def.c0 + 1) / 2;
    this.x = (def.c0 + def.c1 + 1) / 2;
    this.y = def.cy0;
    this.vy = 0;
    this.t = 0;

    this.group = new THREE.Group();
    const M = (c) => craftMat(c, 'balsa');
    const w = def.c1 - def.c0 + 1;

    // the deck: a plate you can read the edge of, because a platform whose
    // extent is ambiguous is a platform you step off by accident
    const deck = craftBox(w, 0.28, 1.5, M(PAL.STEEL[2]));
    deck.position.set(0, -0.14, 0); this.group.add(deck);
    const lip = craftBox(w + 0.14, 0.12, 1.6, M(PAL.MACHINE));
    lip.position.set(0, -0.02, 0); this.group.add(lip);
    for (const dx of [-w / 2 + 0.18, w / 2 - 0.18]) {
      const post = craftBox(0.16, 0.5, 0.5, M(PAL.MACHINE_DK));
      post.position.set(dx, 0.2, 0); this.group.add(post);
    }

    // the CABLE, drawn up to the head of the shaft. It is what says "this
    // thing moves" while it is standing still at the bottom, which is the
    // only moment a player meets it without already knowing.
    this.cableH = def.cy1 - def.cy0 + 1.4;
    this.cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
      M(PAL.DARK),
    );
    this.group.add(this.cable);
    const head = craftBox(w * 0.5, 0.22, 0.5, M(PAL.MACHINE_DK));
    head.position.set(0, def.cy1 - def.cy0 + 1.3, 0);
    this.group.add(head);

    scene.add(this.group);
  }

  // where the shaft's head sits, in world y
  get headY() { return this.cy1 + 1.3; }

  update(dt, reduced = false) {
    // A TRIANGLE, not a sine. The hoist has to be READ — you wait for it,
    // and waiting is only fair if the arrival is predictable — and a sine
    // spends most of its time near the ends, which reads as a lift that
    // hesitates. Constant speed with a hard turn is what a real one does.
    this.t = (this.t + dt / this.period) % 1;
    const k = this.t < 0.5 ? this.t * 2 : 2 - this.t * 2;   // 0 → 1 → 0
    const wasY = this.y;
    this.y = this.cy0 + (this.cy1 - this.cy0) * k;
    this.vy = dt > 0 ? (this.y - wasY) / dt : 0;

    // reduced motion: park it at the bottom rather than freeze it mid-shaft,
    // where it would be a floor nobody could reach and a level nobody could
    // finish. The game must still be completable with the animation off.
    if (reduced) { this.y = this.cy0; this.vy = 0; }

    this.group.position.set(this.x, this.y, 0);
    const span = Math.max(0.1, this.headY - this.y);
    this.cable.scale.y = span;
    this.cable.position.set(0, span / 2, 0);
  }

  // what `Player`'s platform pass reads. Deliberately loose scalars, the
  // same shape `Robot.landedOn` uses, so the player never learns what kind
  // of thing is carrying it.
  get top() { return this.y; }
  overlaps(x, hw) { return Math.abs(x - this.x) < this.hw + hw; }
}
