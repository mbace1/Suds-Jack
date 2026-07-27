// Fourteen screens, side by side, and the world changing colour under you.
//
// Another World is a row of fixed screens with a hard cut between them: no
// scrolling, no camera, no minimap. A screen is a composition, you learn it,
// you die on it, you beat it, you never see it again. That is the format here —
// twenty tiles by twelve, cut on the edge — and it is also why every screen has
// to be legible in one glance, because a glance is all you get before something
// on it kills you.
//
// `t` is the room's place on the palette line (see palette.js): 0 is the jungle
// the pod came down in, 5 is the same jungle coming back through a palace floor
// four thousand years later. Nothing announces the change. The greens just
// leave, room by room, and one day you are standing in a tomb.
//
//   #  rock, stone, marble — whatever this biome makes its floors from
//   -  the wall behind you: not solid, but not sky either
//   ~  a tile that will not hold you for long
//   ^  spikes. solid to stand on, deadly when they are up
//   |  a gate, closed until the plate is stood on
//   p  that plate
//   f  a field you cannot walk through while it is lit
//   C  a slab waiting in the ceiling
//   D  the door out
//   S  where he wakes up      G  the pistol       h  a medical cell
//   b  something that lives here          g  a sentry        d  a drone
//   T  a light

export const RW = 20, RH = 12, TILE = 16;
export const ROOM_W = RW * TILE, ROOM_H = RH * TILE;

export const ROOMS = [
  { // 0 — he wakes in the clearing. Nothing here can hurt him; that is the point.
    t: 0.00, beat: 'wake',
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '          ##        ',
      '   S      ##        ',
      '####################',
    ],
  },
  { // 1 — the first hole in the floor of the world
    t: 0.25,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '#######  ###########',
    ],
  },
  { // 2 — and the first thing that lives here. Exits one storey up.
    t: 0.50,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '             #######',
      '             #######',
      '     b       #######',
      '####################',
    ],
  },
  { // 3 — the high road. A three-tile gap over nothing, which is exactly as far
    //     as a running jump goes.
    t: 0.75,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '######   #######    ',
      '######   #######    ',
      '######   #######    ',
      '######   ###########',
    ],
  },
  { // 4 — somebody else came down here first, and did not get up again
    t: 1.00, beat: 'gun',
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '   ###              ',
      '   ###  G      h    ',
      '####################',
    ],
  },
  { // 5 — the dig. Stone under the roots, and the first man with a gun.
    t: 1.30, beat: 'sentry',
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '              ######',
      '              ######',
      '    g               ',
      '####################',
    ],
  },
  { // 6 — four tiles that will not hold, and what is under them
    t: 1.65,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '####~~~~####        ',
      '####    ####        ',
      '####    ####        ',
      '####^^^^############',
    ],
  },
  { // 7 — inside now. The walls are cut, and two of them come down.
    t: 2.00, beat: 'tomb',
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '   ---------------  ',
      '   ---------------  ',
      '   ---C-------C---  ',
      '   ---------------  ',
      '   ---------------  ',
      '   -------------h-  ',
      '####################',
    ],
  },
  { // 8 — a plate, a gate, and not enough time
    t: 2.40,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '   ---------------  ',
      '   ---------------  ',
      '   ---------------  ',
      '   ---------------  ',
      '   ----------||---  ',
      '   ----------||---  ',
      '#####p#####^^#######',
    ],
  },
  { // 9 — the long hall, and two of them in it
    t: 2.80,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '  ---------------   ',
      '  ---------------   ',
      '  ---------------   ',
      '  ---------------   ',
      '  -----#####----T   ',
      '  ---------------   ',
      '  -g---------g---   ',
      '####################',
    ],
  },
  { // 10 — and behind the hieroglyphs, the machine that wrote them
    t: 3.30, beat: 'reactor',
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '   ####             ',
      '   ####      ####   ',
      '                    ',
      '         ff       h ',
      '     d   ff         ',
      '####################',
    ],
  },
  { // 11 — out the other side into somebody's palace, four thousand years on
    t: 4.00, beat: 'palace',
    map: [
      '                    ',
      '                    ',
      '   --------------   ',
      '   --------------   ',
      '   --------------   ',
      '   --------------   ',
      '   --------------   ',
      '   --------------   ',
      '   ---##----##---   ',
      '   --------------   ',
      '   -g--------g---   ',
      '####################',
    ],
  },
  { // 12 — the terrace. The floor of it is a row of teeth.
    t: 4.40,
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '   ####   ####   ###',
      '   ####   ####   ###',
      '                    ',
      '####^^^^^^^^^^^^####',
    ],
  },
  { // 13 — and the jungle is already coming back up through it
    t: 5.00, beat: 'end',
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '######              ',
      '######              ',
      '             D      ',
      '####################',
    ],
  },
];

// The one line of text in each act. Another World has no words in it at all;
// these are the concession, and they are kept to a breath each.
export const BEATS = {
  wake: 'THE POD CAME DOWN IN THE DARK',
  gun: 'HE WAS NOT THE FIRST ONE HERE',
  sentry: 'THEY ARE STILL PATROLLING',
  tomb: 'SOMEONE CUT THESE WALLS',
  reactor: 'AND SOMETHING ELSE BUILT THEM',
  palace: 'FOUR THOUSAND YEARS LATER',
  end: 'AND THE FOREST TOOK IT ALL BACK',
};
