// EERI — the parts kit, and the reach budget every room is measured against.
//
// The method is flashprince's, ported rather than copied: there, the room is
// twenty by twelve characters and `editor.js` paints it from a named brush
// strip, because "the character IS the data". Eeri's rooms are 96 x 18 and
// scroll, and they carry something flashprince never had — MACHINES, which
// have a track they can drive and obstacles only they can clear. So a room
// here is not a painted grid; it is a LIST OF PARTS, and each part declares
// its rules once: what it stamps into the map, what it demands of whoever
// arrives, and which verb removes it.
//
// What flashprince has and this adds to: flashprince's level distances are
// measured off a written budget (a jump rises 27px, a running jump carries
// 3.7 tiles, so a 3-tile gap goes and a 4-tile gap does not) — but nothing
// CHECKS a room against it. You find out by playing. Eeri gets the budget as
// numbers AND the check, so a room that cannot be finished fails the build
// instead of stranding a player.
//
// This module is deliberately PURE — it imports no three.js and touches no
// DOM — so `test/rooms.mjs` can prove every room navigable in plain Node,
// the way gameoflife proves its aqueducts in `check_levels.mjs`.

export const W = 96, H = 18;
export const GROUND = 4;          // top of the ground band, in tiles

// ---- the reach budget ----------------------------------------------------
// Measured off js/kid.js, not guessed: RUN 6.2, JUMP_V 12.6, GRAV 30,
// FALL_X 1.35. Every distance in every room is checked against these, so a
// change to the kid's jump fails the rooms it just broke rather than
// silently making one impossible.
export const REACH = {
  // apex = v^2 / 2g = 12.6^2 / 60 = 2.646 tiles
  jumpUp: 2.646,
  // a step he can land ON, whole tiles, with the last 0.6 of a tile kept
  // back as the margin between "measured" and "reliable under a thumb"
  step: 2,
  // airtime = rise (v/g = 0.42s) + fall through the same height at FALL_X
  // (sqrt(2h/(g*1.35)) = 0.362s) = 0.782s; carried at RUN = 4.85 tiles
  jumpAcross: 4.85,
  gap: 4,                          // whole tiles of hole he clears from a run

  // …AND THE SAME JUMP TAKEN OUT OF WATER. Wading caps the run at WADE x
  // RUN, and a running jump carries `run speed x airtime` — so a takeoff
  // from shallow water carries 2.67 tiles, not 4.85. This is the trap the
  // kit already has a scar from: "anything that changes where the player can
  // get to must be added to the reach model, or the check starts passing
  // rooms nobody can finish". The tarp taught it by being missing; water
  // would have taught it again by being SILENT, because a gap after a puddle
  // looks exactly like a gap.
  jumpAcrossWading: 4.85 * 0.55,
  gapWading: 2,
};

// ---- the speeds, and the telegraph clock ---------------------------------
// Measured off js/kid.js the same way REACH is, and used by the walk-time
// estimate below.
export const SPEED = { run: 6.2, climb: 3.6, wade: 6.2 * 0.55 };
// what the gizmos do, in the same place as everything else the prover reads
export const GIZMO = { belt: 2.6, tarp: 17.5 };
// a tarp throws you tarp^2/2g tiles up: 17.5 gives 5.1, about twice a jump
export const TARP_RISE = (17.5 * 17.5) / 60;

// …and the machines', off js/excavator.js and js/crane.js, for the ride term
// of the estimate below. A machine is deliberately slower than the kid.
export const MACHINE_SPEED = { excavator: 3.4, crane: 2.8, pump: 3.0, pipelayer: 2.6 };
// what a ride's own job costs, in seconds: the mount and dismount moves, and
// then the work itself — a dug row, a slung span, a swing of the ball
export const RIDE = { mount: 0.55, dismount: 0.5, dig: 0.7, sling: 0.55, seat: 0.5, swing: 2.4, drain: 0.8 };

// THE TELEGRAPH FLOOR (DESIGN §4.1, the owner's, and it is about a
// six-year-old): "telegraph ≥ 1.0 s before anything can touch you". A rule
// the prover cannot READ is a rule that drifts — all three of these clocks
// were under it — so the clocks live here, in the pure module, and
// robots.js and hazards.js import them rather than keeping their own.
export const TELL = 1.0;
export const CLOCK = {
  // it sees you, it draws back, and only then does it lunge: notice + wind
  // is the whole warning, so that sum is what the floor applies to
  skitter: { notice: 0.45, wind: 0.62, lunge: 0.5, recover: 0.7 },
  // the collar lights before it blows
  vent: { cycle: 3.2, warn: 1.05, blow: 0.6 },
  // it winds back, chevrons pulsing, one warning tone
  ball: { wind: 1.05, swing: 1.15, rest: 1.0 },
  // A HOPPER IS EXEMPT and the reason is not an excuse: the floor is about
  // things that BECOME dangerous. A hopper is dangerous continuously and
  // identically from the moment you see it — a metronome, never a surprise —
  // so what it owes you is a readable rhythm, not a warning.
  hopper: { cycle: 1.35, crouch: 0.28, rise: 1.25 },
  roller: { speed: 2.4 },
  // THE BUCKET SLEEPS. `wake` is the whole telegraph — it lifts its head
  // before it moves, and 0.55 s is long enough for a six-year-old to read
  // it and step back. It chases for `chase` and then gives up and settles
  // again, which is what makes it a PROXIMITY test rather than a pursuer:
  // the answer is always "go round it or wait", never "outrun it forever".
  bucket: { wake: 0.55, chase: 2.2, speed: 2.9, settle: 1.1, hear: 3.4 },
};

// A machine is heavy, refuses a cliff, and cannot jump. It clears what it is
// built to clear and nothing else. `arm` is how far from its own centre it
// can work — the bucket's reach, the ball's swing radius — which is what
// decides whether an obstacle is reachable from its track.
export const MACHINE_REACH = {
  // the bucket digs a bank down, and the same bucket slings a girder and
  // lowers it in as a span: one machine, two verbs
  excavator: { verbs: ['dig', 'span'], arm: 2.6 },
  crane: { verbs: ['smash'], arm: 3.4 },
  // WORLD 2. The pump lowers a flooded trench the way the bucket lowers a
  // bank — a row at a time, so it reads. The pipe-layer needs NO new verb:
  // seating a pipe section IS the excavator's `span`, re-dressed, which is
  // why it is the cheap second machine of the pair.
  pump: { verbs: ['drain'], arm: 3.0 },
  pipelayer: { verbs: ['span'], arm: 2.8 },
};

// ---- the palette ---------------------------------------------------------
// One entry per kind of thing a room is made of. `ch` is what it stamps into
// the tile grid — the character IS the data, same as flashprince — and
// `clears` names the verb that removes it, or null when it is scenery.

const solid = (ch) => ({ ch, solid: true });
export const TILES = {
  air: { ch: ' ', solid: false },
  earth: solid('#'),
  ledge: solid('='),
  girder: solid('G'),
  bank: solid('B'),
  brick: solid('K'),
  // A BELT carries you along it — the character carries the direction, so a
  // belt cannot disagree with itself about which way it runs.
  beltR: solid('C'),
  beltL: solid('c'),
  // …and a TARP throws you up off it, harder than a jump
  tarp: solid('T'),
  // SHALLOW WATER is solid — it is a floor, and the only thing it does is
  // slow you down (DESIGN world 2). It is the belt's shape exactly: a floor
  // that disagrees with you, read from the character under your boot.
  // Deep water is NOT here, because deep water is a `pit` drawn differently
  // and the pit already knows how to hand you back.
  water: solid('~'),
  // a rung is NOT solid — you pass through it in every direction and only
  // the climb verb holds you on it. A solid ladder is a wall with a picture
  // of a ladder on it.
  ladder: { ch: 'H', solid: false },
};
export const SOLID_CHARS = '#=GBKCcT~';
export const BELT_CHARS = 'Cc';
export const TARP_CHAR = 'T';
export const WATER_CHAR = '~';
export const CLIMB_CHAR = 'H';

// THE TILE CONTRACT, checked rather than trusted. `TILES` above is
// documentation — nothing imports it — while the strings are what the game
// actually reads, so the two can drift apart in silence. This proves every
// solid TILES entry appears in SOLID_CHARS and vice versa, and it runs at
// import time so a mismatch cannot reach a room.
{
  const declared = Object.values(TILES).filter((t) => t.solid).map((t) => t.ch).sort().join('');
  const listed = [...SOLID_CHARS].sort().join('');
  if (declared !== listed) {
    throw new Error(`parts.js: TILES and SOLID_CHARS disagree — TILES says "${declared}", SOLID_CHARS says "${listed}"`);
  }
}

// ---- parts ---------------------------------------------------------------
// Each returns a descriptor. `stamp(grid)` writes tiles. `obstacle` is what
// the part puts in the player's way, and is what the checker reads.

const rows = (grid, r0, r1, c0, c1, ch) => {
  for (let r = r0; r <= r1; r++) {
    for (let c = Math.max(0, c0); c <= Math.min(W - 1, c1); c++) grid[r][c] = ch;
  }
};
// tile row cy (0 = bottom) is grid row H-1-cy
const rowOf = (cy) => H - 1 - cy;

export const ground = () => ({
  kind: 'ground',
  stamp: (g) => rows(g, rowOf(GROUND - 1), H - 1, 0, W - 1, '#'),
});

// A step up. Two tiles or less and the kid takes it; more and it is a wall
// with no verb, which the checker will reject.
export const mound = (c0, c1, h) => ({
  kind: 'mound', c0, c1, h,
  stamp: (g) => rows(g, rowOf(GROUND + h - 1), rowOf(GROUND), c0, c1, '#'),
  obstacle: { at: c0, kind: 'step', size: h, clears: null },
});

export const ledge = (c0, c1, cy) => ({
  kind: 'ledge', c0, c1, cy,
  stamp: (g) => rows(g, rowOf(cy), rowOf(cy), c0, c1, '='),
});

export const girderBeam = (c0, c1, cy) => ({
  kind: 'girder', c0, c1, cy,
  stamp: (g) => rows(g, rowOf(cy), rowOf(cy), c0, c1, 'G'),
});

// A hole the kid jumps. Wider than REACH.gap and the checker rejects it
// unless a span part covers it.
export const pit = (c0, c1) => ({
  kind: 'pit', c0, c1,
  stamp: (g) => rows(g, rowOf(GROUND - 1), H - 1, c0, c1, ' '),
  pit: { c0, c1, backX: c0 - 3 },
  obstacle: { at: c0, kind: 'gap', size: c1 - c0 + 1, clears: null },
  // a machine will not drive into a hole, and must not be penned by one
  blocksMachine: true,
});

// The machine-shaped lock: too tall to jump, taken down a row at a time.
export const bank = (c0, c1, h = 3) => ({
  kind: 'bank', c0, c1, h,
  stamp: (g) => rows(g, rowOf(GROUND + h - 1), rowOf(GROUND), c0, c1, 'B'),
  piece: { type: 'bank', c0, c1, cy0: GROUND, rows: h },
  obstacle: { at: c0, kind: 'step', size: h, clears: 'dig' },
});

// The other machine-shaped lock: a brick wall, broken by the ball.
export const brickWall = (c0, c1, h = 4) => ({
  kind: 'wall', c0, c1, h,
  stamp: (g) => rows(g, rowOf(GROUND + h - 1), rowOf(GROUND), c0, c1, 'K'),
  piece: { type: 'wall', c0, c1, cy0: GROUND, rows: h },
  obstacle: { at: c0, kind: 'step', size: h, clears: 'smash' },
});

// A gap only a span will cross.
export const chasm = (c0, c1) => ({
  kind: 'chasm', c0, c1,
  stamp: (g) => rows(g, rowOf(GROUND - 1), H - 1, c0, c1, ' '),
  pit: { c0, c1, backX: c0 - 3 },
  obstacle: { at: c0, kind: 'gap', size: c1 - c0 + 1, clears: 'span' },
  blocksMachine: true,
});

// A rideable machine. `track` is the A-to-B run of floor it can drive, and
// the checker holds the room to it: every obstacle this machine is supposed
// to clear must lie inside the track, and the track must contain no hole,
// or the machine is penned away from its own job.
export const machine = (type, x, track) => ({
  kind: 'machine', type, x, track,
  machine: { type, x, track, verbs: MACHINE_REACH[type].verbs, arm: MACHINE_REACH[type].arm },
});

// Where a girder waits before the machine slings it. Pairs with a chasm:
// compile() reads the two together into the span job.
export const girderStack = (x) => ({ kind: 'stack', x, girderStack: { x } });

// Small things to avoid. A robot patrols a span of floor; the Yoshi rule
// applies — it takes the ride, never the run.
//
// THREE KINDS, and the split is the whole point of having more than one
// (DESIGN §3): a `hopper` is a TIMING test — it rises and falls on a fixed
// rhythm you wait out or stomp; a `roller` is a SPACING test — it trundles
// its span and is too flat to stomp, so it is a thing you jump; a `skitter`
// is a PROVOCATION test — it patrols, notices, winds up and lunges. One
// behaviour each, and none of them chases you across the room.
// `cy` puts one on a DECK rather than on the ground — the height it stands
// at, which is also the height the checker holds it to: a robot up there is
// no longer walking over the hole in the floor below it.
export const robot = (c0, c1, kind = 'skitter', cy = null) => ({
  kind: 'robot', c0, c1, robotKind: kind,
  robot: { c0, c1, kind, cy },
});
export const hopper = (c0, c1) => robot(c0, c1, 'hopper');
export const roller = (c0, c1) => robot(c0, c1, 'roller');
// a FOURTH kind, and it is a PROXIMITY test: an abandoned digger bucket
// asleep on the floor that wakes when you LAND beside it, chases briefly,
// and settles again. It takes no span because it does not patrol — the two
// cells are how far it is willing to lurch, not a beat it walks.
export const bucketBot = (c0, c1 = c0 + 2) => robot(c0, c1, 'bucket');

// A small telegraphed hazard sitting on the floor at x.
export const hazard = (x, type = 'steam') => ({
  kind: 'hazard', x, type,
  hazard: { x, type },
});

export const swingBall = (px, py, len = 2.6, zoneW = 7.5) => ({
  kind: 'ball', px, py, len, zoneW,
  ball: { px, py, len, zoneW },
});

// ---- the gizmo kit (DESIGN §2) -------------------------------------------
// "Gizmos are the third source of variety and cost the least." They are also
// what makes twelve levels possible: one idea per level means the kit IS the
// level count, so breadth here beats polish.
//
// These two are TILE-NATIVE — a belt is a floor that moves you, a tarp is a
// floor that throws you — which is why they cost almost nothing: they stamp
// like any other part and the whole behaviour is one hook in the player's
// step. The gizmos that must MOVE (a hoist platform, a tipping plank, a
// swinging hook) are a different and much larger job, because every solid in
// this game is a tile and a moving platform cannot be one. That is named
// here so the next session knows the kit stops at the tile line on purpose.

// A belt. `dir` is +1 (right) or -1 (left); it carries you at BELT while you
// stand on it, so a belt against you is a spacing problem and a belt with
// you is a gift.
export const belt = (c0, c1, cy, dir = 1) => ({
  kind: 'belt', c0, c1, cy, dir,
  stamp: (g) => rows(g, rowOf(cy), rowOf(cy), c0, c1, dir > 0 ? 'C' : 'c'),
  belt: { c0, c1, cy, dir },
});

// A tarp: land on it and it throws you higher than any jump. The check holds
// it to its HEADROOM, because a bounce into a ceiling is a bounce that reads
// as the game taking the move away from you.
export const tarp = (c0, c1, cy) => ({
  kind: 'tarp', c0, c1, cy,
  stamp: (g) => rows(g, rowOf(cy), rowOf(cy), c0, c1, 'T'),
  tarp: { c0, c1, cy },
});

// ---- water (DESIGN world 2) ----------------------------------------------
// World 1's floor is either there or it is a hole. Water is the THIRD state:
// somewhere you can be that is neither safe nor fatal — which is the
// cheapest new idea a platformer has, and the whole reason three levels of
// pipes are not three levels of dirt.
//
// It must obey DESIGN §4.1, and this is not negotiable: *Eeri is never hurt,
// never dies, has no health bar.* So WATER DOES NOT DROWN HIM. Between them
// the two kinds add no new way to lose:

// SHALLOW — a floor that slows you. It stamps at GROUND like any other
// floor and the whole behaviour is one read in the player's step, exactly
// as the belt is. Wading is not a verb you press; it is a place you are.
export const shallow = (c0, c1) => ({
  kind: 'shallow', c0, c1,
  stamp: (g) => rows(g, rowOf(GROUND - 1), rowOf(GROUND - 1), c0, c1, '~'),
  water: { c0, c1, deep: false },
});

// DEEP — a `pit` wearing different paint. It is authored as water and reads
// as water, but mechanically it is the hole this game already understands,
// so `fallRespawn` hands you to the near lip with nothing new written. The
// `pit` record is what makes that true; `water` is what makes it look right.
export const deep = (c0, c1) => ({
  kind: 'deep', c0, c1,
  stamp: (g) => rows(g, rowOf(GROUND - 1), H - 1, c0, c1, ' '),
  pit: { c0, c1, backX: c0 - 3 },
  water: { c0, c1, deep: true, respawns: true },
  obstacle: { at: c0, kind: 'gap', size: c1 - c0 + 1, clears: null },
  blocksMachine: true,
});

// A FLOODED TRENCH: the pump's job, and world 2's machine-shaped lock.
//
// It is a HOLE, not a wall — deep water is a pit wearing different paint,
// and that is the rule the whole world rests on (DESIGN §4.1: he is never
// hurt, so water hands him back exactly as a hole does). Until it is pumped
// it is too wide to jump; pumped, it is floor you walk across, so the ride
// leaves the level visibly changed the way the dig does.
export const flooded = (c0, c1) => ({
  kind: 'flooded', c0, c1,
  stamp: (g) => rows(g, rowOf(GROUND - 1), H - 1, c0, c1, ' '),
  pit: { c0, c1, backX: c0 - 3 },
  water: { c0, c1, deep: true, respawns: true },
  // the drained floor is what the ride hands back, and `finishedGrid` needs
  // to know about it or every bolt over the trench reads as unreachable
  drained: { c0, c1, cy: GROUND - 1 },
  obstacle: { at: c0, kind: 'gap', size: c1 - c0 + 1, clears: 'drain' },
  blocksMachine: true,
});

// ---- the hoist (DESIGN world 2, level 6's idea) --------------------------
// THE FIRST SOLID THING IN THIS GAME THAT IS NOT A TILE, and that sentence
// is the whole of why it is expensive. Every other floor here is a character
// in the grid: collision is a lookup, meshes are built once, and nothing has
// to be told it is standing on anything. A floor that MOVES can be none of
// those — so it is an entity with its own pass in the player's step, and the
// kit deliberately stopped at this line until now (see VERSIONS v14).
//
// `c0…c1` is the platform's width, `cy0` its bottom and `cy1` its top. It
// runs between them forever on `period` seconds a round trip. Vertical only:
// a lift is what level 6 needs, and a hoist that also slid sideways would
// need the carry to fight the player's own run.
//
// Its `check()` contract is THE LADDER'S, and deliberately so — both ends,
// every time. A ladder is held to a foot and a landing because one ending in
// mid-air is invisible on a screenshot; a hoist is worse, because it is only
// wrong for the half of the cycle you are not looking at.
export const hoist = (c0, c1, cy0, cy1, period = 4) => ({
  kind: 'hoist', c0, c1, cy0, cy1, period,
  hoist: { c0, c1, cy0, cy1, period },
});

// ---- the pipe (DESIGN world 2, level 5's idea) ---------------------------
// A tube you go INSIDE: enter one mouth, come out the other. It is not a
// tile — a tile is a place, and a pipe is a pair of places plus a move
// between them — so it is authored as two points and a scripted walk, which
// is the machine mount's shape rather than the belt's.
//
// The contract is the LADDER'S, generalised, and `check()` holds it to both
// ends the same way: a pipe that delivers you into a wall is the horizontal
// version of a ladder that tops out in mid-air, and that is the mistake this
// whole kit exists to make impossible.
//
// `a` and `b` are {c, cy} — the tile each mouth sits in. Travel is
// two-way, because a one-way pipe is a trapdoor and this game does not take
// things away from you.
export const pipe = (a, b) => ({
  kind: 'pipe', a, b,
  pipe: { a, b },
});

// ---- the verticality kit -------------------------------------------------
// A LADDER is the second verb the platformer half was missing (DESIGN §2),
// and it is what turns a room from a corridor into a place. It stamps rungs
// that nothing collides with — only the climb holds you on them — so the
// column it occupies stays passable in every other way.
//
// The two ends are the whole contract, and `check()` holds a ladder to both:
// a FOOT you can start from (solid under it, or a landing beside its bottom
// rung) and a LANDING you can step off onto (a solid tile beside its TOP
// rung, whose surface is exactly the height the climb tops out at). A ladder
// that ends in mid-air is the vertical version of a gap too wide to jump,
// and it is the mistake this kit exists to make impossible.
export const ladder = (c, cy0, cy1) => ({
  kind: 'ladder', c, cy0, cy1,
  stamp: (g) => rows(g, rowOf(cy1), rowOf(cy0), c, c, 'H'),
  ladder: { c, cy0, cy1 },
});

// A scaffold is a ladder with the deck it serves: the standard shape, so a
// room does not have to remember to pair them. `deck` is the row the ledge
// occupies; the ladder tops out at the same row, which is what puts his feet
// on the deck's surface when the climb ends.
export const scaffold = (c, deckC1, cy) => [
  ladder(c, GROUND, cy),
  ledge(c + 1, deckC1, cy),
];

// The midway gate (DESIGN §4). No lives and no game over, so a checkpoint
// buys nothing but time — which is the only currency this game has. Passing
// it lights it; falling out of the world puts you back here rather than at
// the start.
export const checkpoint = (x) => ({ kind: 'checkpoint', x, checkpoint: { x, y: GROUND } });

// The end of a level (DESIGN §4.2): it BUILDS itself in three phases as you
// come up on it and activates by being run past — no button, no stopping.
// Level 3 of a world carries the big one, which must be tellable from the
// small one before you reach it.
export const flagAt = (x, big = false) => ({ kind: 'flag', x, big, flag: { x, y: GROUND, big } });

export const bolts = (list) => ({ kind: 'bolts', list, bolts: list });

// ---- bolts, in the coordinates a level is actually authored in -----------
// `bolts()` takes GRID ROWS, which count down from the top of the map and
// are a nuisance to think in. Everything below takes `cy` — tiles above the
// bottom of the world, the same number the parts above use — so a trail laid
// along the ground is `boltRun(GROUND, 8, 14)` rather than four subtractions
// done by hand.
const cell = (cy, c) => [H - 1 - cy, c];

export const boltsAt = (cy, cols) => bolts(cols.map((c) => cell(cy, c)));
export const boltRun = (cy, c0, c1) => bolts(
  Array.from({ length: c1 - c0 + 1 }, (_, i) => cell(cy, c0 + i)));

// An arc over a gap — the breadcrumb that TEACHES the jump instead of
// telling you about it. Rises to `rise` at the middle and comes back down,
// so following the bolts IS the jump's timing.
export const boltArc = (cy, c0, c1, rise = 2) => {
  const n = c1 - c0;
  return bolts(Array.from({ length: n + 1 }, (_, i) => {
    const t = n === 0 ? 0 : i / n;
    return cell(cy + Math.round(Math.sin(t * Math.PI) * rise), c0 + i);
  }));
};

// A column beside a ladder: the same trick, standing up.
export const boltCol = (c, cy0, cy1) => bolts(
  Array.from({ length: cy1 - cy0 + 1 }, (_, i) => cell(cy0 + i, c)));

// The hidden three (DESIGN §4.2). A different silhouette, off the main line,
// and `check()` refuses one that no jump or ladder can reach — a secret you
// cannot collect is a bug wearing a secret's clothes.
export const golden = (cy, cols) => ({
  kind: 'golden', list: cols.map((c) => cell(cy, c)),
  golden: cols.map((c) => cell(cy, c)),
});

export const startAt = (x) => ({ kind: 'start', x, spawnKid: { x, y: GROUND } });
export const exitAt = (x) => ({ kind: 'exit', x, exit: { x, y: GROUND } });
export const shot = (x0, x1, framing) => ({ kind: 'shot', shot: { x0, x1, ...framing } });

// ---- compile -------------------------------------------------------------
// Turn a parts list into everything the game needs. This is the ONLY place
// that knows how a part becomes tiles, so a part cannot disagree with itself
// the way a hand-drawn grid and a separate `pits` array could.

export function compile(room) {
  const grid = Array.from({ length: H }, () => new Array(W).fill(' '));
  const out = {
    name: room.name,
    idea: room.idea || null,
    // a part helper may hand back SEVERAL parts (a scaffold is a ladder and
    // the deck it serves), so the list is flattened once, here
    parts: room.parts.flat(),
    bolts: [], golden: [], pits: [], shots: [], machines: [], robots: [], hazards: [],
    pieces: [], obstacles: [], ladders: [], belts: [], tarps: [], water: [], pipes: [], hoists: [],
    ball: null, checkpoint: null, flag: null,
    spawn: { kid: { x: 4.5, y: GROUND }, machines: {} },
    exit: { x: W - 4, y: GROUND },
  };
  for (const p of out.parts) {
    p.stamp?.(grid);
    if (p.pit) out.pits.push(p.pit);
    if (p.piece) out.pieces.push(p.piece);
    if (p.machine) { out.machines.push(p.machine); out.spawn.machines[p.machine.type] = p.machine.x; }
    if (p.robot) out.robots.push(p.robot);
    if (p.hazard) out.hazards.push(p.hazard);
    if (p.ball) out.ball = p.ball;
    if (p.bolts) out.bolts.push(...p.bolts);
    if (p.golden) out.golden.push(...p.golden);
    if (p.ladder) out.ladders.push(p.ladder);
    if (p.belt) out.belts.push(p.belt);
    if (p.tarp) out.tarps.push(p.tarp);
    if (p.water) out.water.push(p.water);
    if (p.pipe) out.pipes.push(p.pipe);
    if (p.hoist) out.hoists.push(p.hoist);
    if (p.drained) (out.drained ||= []).push(p.drained);
    if (p.checkpoint) out.checkpoint = p.checkpoint;
    if (p.flag) out.flag = p.flag;
    if (p.shot) out.shots.push(p.shot);
    if (p.spawnKid) out.spawn.kid = { x: p.spawnKid.x, y: p.spawnKid.y };
    if (p.exit) out.exit = p.exit;
    if (p.obstacle) out.obstacles.push({ ...p.obstacle, part: p });
    if (p.girderStack) out.stack = p.girderStack;
  }
  out.grid = grid;

  // Where the level ENDS, and which curtain it drops. A flag closes levels 1
  // and 2 of a world; a gate is the world's own ending — Eeri clocking out —
  // and a room may carry both, the flag first (DESIGN §4.2).
  out.finish = out.flag
    ? { x: out.flag.x, kind: out.flag.big ? 'flag-big' : 'flag' }
    : { x: out.exit.x, kind: 'gate' };
  out.gate = room.parts.flat().some((p) => p.exit) ? out.exit : null;

  // ---- the shapes the game already reads --------------------------------
  // Derived here, once, from the parts — so nothing downstream has to know
  // a room is assembled rather than hand-drawn.
  const pieceOf = (t) => out.pieces.find((q) => q.type === t) || null;
  out.bank = pieceOf('bank');
  out.wall = pieceOf('wall');

  const chasmPart = room.parts.find((p) => p.kind === 'chasm');
  out.girder = (out.stack && chasmPart) ? {
    stackX: out.stack.x,
    gap: { c0: chasmPart.c0, c1: chasmPart.c1, cy: GROUND - 1 },
    // the lip window: close enough to lower the span in, and inside the
    // machine's track by construction
    seat: { x0: chasmPart.c0 - 4.4, x1: chasmPart.c0 - 0.7 },
    spanLen: (chasmPart.c1 - chasmPart.c0 + 1) + 1.8,
  } : null;

  for (const m of out.machines) out.spawn[m.type] = { x: m.x, y: GROUND };
  return out;
}

// ---- the check -----------------------------------------------------------
// Mario Maker's rule, as a build step: you do not ship a room you cannot
// finish. Walks the room left to right, carrying the verbs earned so far,
// and reports the first thing that stops you — with the numbers, so the fix
// is obvious rather than a guess.

// The level's own counts (DESIGN §4.2). `x/100` is the level's completion
// figure, so a level with 97 bolts in it is a level whose HUD lies.
export const LEVEL = { bolts: 100, golden: 3 };

// How far above a standable surface a bolt can hang and still be taken: the
// jump apex (2.65) plus the collect radius, minus a margin, in tiles.
const BOLT_REACH = 3.4;
// …and how far to either side a takeoff can be, since a bolt over a hole is
// collected in the air on the way across rather than from underneath.
const BOLT_SPREAD = 3;

// The map AFTER the room's rides have done their work — the bank dug out,
// the wall down, the span seated. Reachability has to be judged against this
// one, or every bolt the ride opens up reads as unreachable.
function finishedGrid(r) {
  const g = r.grid.map((row) => row.slice());
  for (const p of r.pieces) {
    for (let cy = p.cy0; cy < p.cy0 + p.rows; cy++) {
      for (let c = p.c0; c <= p.c1; c++) g[H - 1 - cy][c] = ' ';
    }
  }
  for (const d of r.drained || []) {
    for (let c = d.c0; c <= d.c1; c++) g[H - 1 - d.cy][c] = '#';
  }
  if (r.girder) {
    for (let c = r.girder.gap.c0; c <= r.girder.gap.c1; c++) {
      g[H - 1 - r.girder.gap.cy][c] = 'G';
    }
  }
  return g;
}

// the surface height of the first solid at or below cy in column c, or null
function surfaceBelow(g, c, cy) {
  if (c < 0 || c >= W) return null;
  for (let k = Math.min(cy, H - 1); k >= 0; k--) {
    if (SOLID_CHARS.includes(g[H - 1 - k][c])) return k + 1;
  }
  return null;
}

// ---- how long a level takes to walk (DESIGN §4) -------------------------
// "60–90 seconds first time through, ~40 once learned." That was a target
// nothing measured, so a level could drift to twice its length and only a
// playthrough would say so. This is the LEARNED run — someone who knows the
// route and never stops — which is the floor the 60–90 sits above.
//
// It is an estimate and says so: the parts each carry a cost that is a
// reasonable reading of what they ask for, not a simulation.
export function estimate(room) {
  const r = compile(room);
  const dist = Math.max(0, r.finish.x - r.spawn.kid.x);
  const parts = {
    run: dist / SPEED.run,
    // a gap or a step is an approach, a read and a jump
    obstacles: r.obstacles.length * 0.9,
    // …a small machine is a rhythm you wait a beat for
    smalls: r.robots.length * 1.4,
    // …a ladder is climbed at climbing speed, once
    climbs: r.ladders.reduce((n, l) => n + (l.cy1 - l.cy0 + 1) / SPEED.climb, 0),
    // …and the ride is measured from the job it actually does, rather than
    // from what DESIGN §1 says a ride SHOULD be. Those two numbers
    // disagreeing is the finding, not a rounding error.
    ride: rideTime(r),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  // DESIGN §1: "that is 80% of playtime and it has to be good on its own —
  // if the riding were deleted the game should still be worth playing."
  return { total, parts, onFoot: (total - parts.ride) / total };
}

// the ride, from its own parts: get to the cab, drive to the job, do it,
// step off
function rideTime(r) {
  const m = r.machines[0];
  const job = r.obstacles.find((o) => o.clears);
  if (!m || !job) return 0;
  const speed = MACHINE_SPEED[m.type] || 3;
  const drive = Math.abs(job.at - m.x) / speed;
  let work = 0;
  if (job.clears === 'dig') work = (job.size || 1) * RIDE.dig;
  else if (job.clears === 'span') work = RIDE.sling + RIDE.seat
    + (r.girder ? Math.abs(r.girder.seat.x0 - r.girder.stackX) / speed : 0);
  else if (job.clears === 'smash') work = 2 * RIDE.swing;
  else if (job.clears === 'drain') work = (job.size || 1) * RIDE.drain;
  // A VERB WITH NO BRANCH LEAVES work AT 0 and the estimate quietly
  // under-counts — the failure this chain is most likely to have, because
  // nothing errors. Say so instead.
  else throw new Error(`rideTime: no cost for the verb "${job.clears}" — `
    + 'add a branch, or estimate() will under-count this ride in silence');
  return RIDE.mount + drive + work + RIDE.dismount;
}

export function check(room) {
  const r = compile(room);
  const problems = [];
  const note = (s) => problems.push(s);

  // ---- the ladders: both ends, every time -------------------------------
  // A ladder that ends in mid-air is the vertical version of a gap too wide
  // to jump, and it is invisible on a screenshot.
  const solidAt = (c, cy) => c >= 0 && c < W && cy >= 0 && cy < H
    && SOLID_CHARS.includes(r.grid[H - 1 - cy][c]);
  for (const l of r.ladders) {
    const footed = solidAt(l.c, l.cy0 - 1) || solidAt(l.c - 1, l.cy0 - 1) || solidAt(l.c + 1, l.cy0 - 1);
    if (!footed) note(`${r.name}: the ladder at x=${l.c} starts at cy=${l.cy0} with nothing to stand on under it`);
    // you top out with your feet at cy1+1, so the landing beside the top
    // rung is the tile at cy1 — its surface is exactly that height
    const landed = solidAt(l.c - 1, l.cy1) || solidAt(l.c + 1, l.cy1);
    if (!landed) note(`${r.name}: the ladder at x=${l.c} tops out at cy=${l.cy1} with nothing to step off onto — `
      + `put a deck tile at (${l.c - 1} or ${l.c + 1}, ${l.cy1})`);
  }
  // a ladder answers a step the kid's jump cannot: it has to stand at the
  // face of it and reach the top
  const ladderFor = (at, size) => r.ladders.some((l) =>
    l.c >= at - 2 && l.c <= at + size + 1 && l.cy1 >= GROUND + size - 1);

  // every machine must be able to do its job from its own track
  for (const m of r.machines) {
    const [t0, t1] = m.track;
    if (m.x < t0 || m.x > t1) note(`${r.name}: the ${m.type} spawns at x=${m.x}, outside its own track ${t0}…${t1}`);
    for (const p of r.pits) {
      if (p.c0 > t0 && p.c1 < t1) {
        note(`${r.name}: the ${m.type}'s track ${t0}…${t1} is cut by a hole at ${p.c0}…${p.c1} — it refuses cliffs, so it would be penned on one side`);
      }
    }
  }

  // …and every obstacle that needs a verb must be inside the track of a
  // machine that HAS that verb
  for (const o of r.obstacles) {
    if (!o.clears) continue;
    const m = r.machines.find((mm) => mm.verbs.includes(o.clears));
    if (!m) { note(`${r.name}: the ${o.kind} at x=${o.at} needs "${o.clears}" and no machine in the room provides it`); continue; }
    const [t0, t1] = m.track;
    // it must be able to STAND somewhere on its track and still reach: the
    // working interval has to overlap the track, not merely sit near it
    const reachFrom = o.at - m.arm, reachTo = o.at + (o.size ?? 1) + m.arm;
    if (reachTo < t0 || reachFrom > t1) {
      note(`${r.name}: the ${o.kind} at x=${o.at} is out of the ${m.type}'s reach — `
        + `it works ${reachFrom.toFixed(1)}…${reachTo.toFixed(1)} but its track is ${t0}…${t1}`);
    }
  }

  // robots must patrol on floor that exists — on the ground, that means no
  // hole under them; on a deck, that means a deck under every step of it
  for (const b of r.robots) {
    if (b.cy == null) {
      for (const p of r.pits) {
        if (b.c0 <= p.c1 && b.c1 >= p.c0) note(`${r.name}: a robot patrols ${b.c0}…${b.c1}, which crosses the hole at ${p.c0}…${p.c1}`);
      }
    } else {
      for (let c = b.c0; c <= b.c1; c++) {
        if (!SOLID_CHARS.includes(r.grid[H - 1 - (b.cy - 1)][c])) {
          note(`${r.name}: a robot patrols ${b.c0}…${b.c1} at cy=${b.cy}, and there is no deck under x=${c}`);
          break;
        }
      }
    }
  }

  // the walk: left to right, carrying what you have earned
  const have = new Set();
  const ordered = [...r.obstacles].sort((a, b) => a.at - b.at);
  let x = r.spawn.kid.x;
  let last = x;
  for (const o of ordered) {
    // any machine standing between here and the obstacle is yours to mount
    for (const m of r.machines) if (m.x >= x - 0.5 && m.x <= o.at) m.verbs.forEach((v) => have.add(v));
    const passable = o.kind === 'step'
      ? (o.size <= REACH.step || ladderFor(o.at, o.size))
      : o.size <= REACH.gap;
    if (!passable && !(o.clears && have.has(o.clears))) {
      note(`${r.name}: STUCK at x=${o.at} — a ${o.kind} of ${o.size} `
        + `(the kid clears ${o.kind === 'step' ? REACH.step : REACH.gap}${o.kind === 'step' ? ', or any height with a ladder on it' : ''})`
        + (o.clears ? `, and the machine that ${o.clears}s it has not been reached yet` : ' and no machine clears it'));
    }
    x = o.at + (o.size ?? 1);
    last = Math.max(last, x);
  }
  for (const m of r.machines) if (m.x >= x - 0.5) m.verbs.forEach((v) => have.add(v));

  // and the way out has to be past the last thing, on foot
  if (r.exit.x > W - 1) note(`${r.name}: the exit at x=${r.exit.x} is outside the room`);

  // ---- the shape of a level (DESIGN §4) ---------------------------------
  // Everything below is a rule the owner set, held as a build step rather
  // than as a paragraph somebody remembers. They are cheap to satisfy and
  // they are the difference between three rooms and three LEVELS.

  // the ride is the peak, so it cannot open the level: its payoff sits in
  // the back half, and you board before you arrive at it
  for (const o of r.obstacles) {
    if (!o.clears) continue;
    if (o.at < W * 0.45) {
      note(`${r.name}: the ride's payoff (the ${o.kind} at x=${o.at}) is in the first `
        + `${Math.round((o.at / W) * 100)}% of the room — a ride is beat 3–4, not the way in`);
    }
    const m = r.machines.find((mm) => mm.verbs.includes(o.clears));
    if (m && m.x > o.at) note(`${r.name}: the ${m.type} is parked at x=${m.x}, PAST the ${o.kind} it clears at x=${o.at}`);
  }

  // the midway gate
  if (!r.checkpoint) {
    note(`${r.name}: no checkpoint — dying has to cost the middle of a level, not the whole of it`);
  } else {
    const f = r.checkpoint.x / W;
    if (f < 0.3 || f > 0.7) note(`${r.name}: the checkpoint at x=${r.checkpoint.x} is ${Math.round(f * 100)}% `
      + 'through the room — a midway gate belongs between 30% and 70%');
    if (!solidAt(Math.floor(r.checkpoint.x), GROUND - 1)) {
      note(`${r.name}: the checkpoint at x=${r.checkpoint.x} has no ground under it`);
    }
  }

  // the way it ends
  if (r.finish.x <= last) {
    note(`${r.name}: the ${r.finish.kind} at x=${r.finish.x} sits before the last obstacle at x=${last} — `
      + 'the end of a level goes past everything in it');
  }
  if (r.flag && r.gate && r.flag.x >= r.gate.x) {
    note(`${r.name}: the flag at x=${r.flag.x} is not before the gate at x=${r.gate.x} — `
      + 'the flag closes the level, the gate closes the WORLD');
  }

  // ---- nothing ride-ending may stand in a machine's own run -------------
  // From the other design instance's playtest, and it is the best kind of
  // rule: somebody actually played it and got stuck. The wrecking ball hung
  // across the excavator's only run from where it parks to the bank it is
  // meant to dig, and a hit takes the RIDE — so every attempt ended with the
  // ball throwing you out of the cab and a long walk back.
  //
  // The sharpened version of that finding is what makes it a rule rather
  // than a placement note: a bot that drives steadily CAN thread the swing.
  // It is not a wall, it is timing-dependent — and for a six-year-old that
  // is worse, because the same approach works sometimes and not others with
  // no way to tell which. The old track rules only ever asked about holes.
  for (const o of r.obstacles) {
    if (!o.clears) continue;
    const m = r.machines.find((mm) => mm.verbs.includes(o.clears));
    if (!m) continue;
    const lo = Math.min(m.x, o.at), hi = Math.max(m.x, o.at) + (o.size ?? 1);
    const inTheWay = [];
    if (r.ball && r.ball.px > lo && r.ball.px < hi) inTheWay.push(`the swinging ball at x=${r.ball.px}`);
    for (const h of r.hazards) {
      if (h.x > lo && h.x < hi) inTheWay.push(`the ${h.type} vent at x=${h.x}`);
    }
    for (const what of inTheWay) {
      note(`${r.name}: ${what} stands in the ${m.type}'s only run from x=${m.x} to the `
        + `${o.kind} at x=${o.at} — a hit takes the RIDE, so this is the ride ending `
        + 'on the way to its own job, over and over');
    }
  }

  // ---- the gizmos, held to the two ways they go wrong -------------------
  // A belt that delivers you into a hole is the game moving you somewhere
  // you did not choose, which is the one thing a generous platformer must
  // never do — a jump you got wrong is yours, a belt you were standing on is
  // not. So the cell it hands you to must be somewhere you can stand.
  for (const b of r.belts) {
    const outCol = b.dir > 0 ? b.c1 + 1 : b.c0 - 1;
    const landing = solidAt(outCol, b.cy) || solidAt(outCol, b.cy - 1);
    if (!landing) {
      note(`${r.name}: the belt at ${b.c0}…${b.c1} runs ${b.dir > 0 ? 'right' : 'left'} and hands you `
        + `to x=${outCol}, where there is no floor — a belt may not walk you off an edge`);
    }
  }
  // …and a tarp needs the air to throw you into
  for (const t of r.tarps) {
    for (let cy = t.cy + 1; cy <= t.cy + Math.ceil(TARP_RISE); cy++) {
      const blocked = solidAt(t.c0, cy) || solidAt(t.c1, cy);
      if (blocked) {
        note(`${r.name}: the tarp at ${t.c0}…${t.c1} throws you ${TARP_RISE.toFixed(1)} tiles `
          + `into something solid at cy=${cy} — a bounce into a ceiling reads as the game `
          + 'taking the move back');
        break;
      }
    }
  }

  // ---- the hoist: both ends, and the ceiling ----------------------------
  // The ladder's contract, and one rule a ladder never needed. A ladder is
  // static, so if it clears the wall once it clears it forever; a hoist is
  // only wrong for the half of its cycle you are not watching, which is why
  // every one of these is a build step rather than a placement note.
  for (const h of r.hoists) {
    if (h.cy1 <= h.cy0) {
      note(`${r.name}: the hoist at ${h.c0}…${h.c1} runs from cy=${h.cy0} to cy=${h.cy1} — `
        + 'it goes nowhere, or downwards');
      continue;
    }
    // 1. you have to be able to GET ON: something standable beside its floor
    const boardable = solidAt(h.c0 - 1, h.cy0 - 1) || solidAt(h.c1 + 1, h.cy0 - 1);
    if (!boardable) {
      note(`${r.name}: the hoist at ${h.c0}…${h.c1} sits at cy=${h.cy0} with nothing to `
        + `board it from — put a floor beside x=${h.c0 - 1} or x=${h.c1 + 1}`);
    }
    // 2. …and OFF at the top, which is the half nobody checks
    const lands = solidAt(h.c0 - 1, h.cy1) || solidAt(h.c1 + 1, h.cy1);
    if (!lands) {
      note(`${r.name}: the hoist at ${h.c0}…${h.c1} tops out at cy=${h.cy1} with nothing to `
        + `step off onto — a lift to nowhere is a ladder that tops out in mid-air, `
        + `and it is only wrong for half the cycle`);
    }
    // 3. its shaft must be clear, or it carries you into the level
    for (let cy = h.cy0; cy <= h.cy1; cy++) {
      let blocked = false;
      for (let c = h.c0; c <= h.c1 && !blocked; c++) if (solidAt(c, cy)) blocked = true;
      if (blocked) {
        note(`${r.name}: the hoist at ${h.c0}…${h.c1} runs through solid tile at cy=${cy} — `
          + 'its shaft has to be clear the whole way');
        break;
      }
    }
    // 4. THE CRUSH. Riding to the top with a ceiling over it puts the player
    // between a floor that keeps rising and a tile that will not move. The
    // tarp has the same rule for the same reason, and a tarp only throws you
    // once — a hoist does it every cycle.
    let ceiling = false;
    for (let c = h.c0; c <= h.c1 && !ceiling; c++) {
      if (solidAt(c, h.cy1 + 1) || solidAt(c, h.cy1 + 2)) ceiling = true;
    }
    if (ceiling) {
      note(`${r.name}: the hoist at ${h.c0}…${h.c1} tops out at cy=${h.cy1} with something `
        + 'solid directly above it — it would carry the player into a ceiling, every cycle');
    }
  }

  // ---- the pipe: both mouths, every time --------------------------------
  // The ladder's rule, generalised. A ladder is held to a foot and a landing
  // because a ladder ending in mid-air is invisible on a screenshot; a pipe
  // is worse, because the far mouth may be forty tiles away and nobody
  // checks it by eye. Both mouths must be somewhere you can STAND — arriving
  // is the same problem as leaving.
  for (const q of r.pipes) {
    for (const [name, m] of [['near', q.a], ['far', q.b]]) {
      if (m.c < 0 || m.c >= W) {
        note(`${r.name}: a pipe's ${name} mouth at x=${m.c} is outside the room`);
        continue;
      }
      if (!solidAt(m.c, m.cy - 1)) {
        note(`${r.name}: the pipe's ${name} mouth at (x=${m.c}, cy=${m.cy}) has nothing to `
          + 'stand on under it — a pipe that delivers you into mid-air is a ladder that '
          + 'tops out in mid-air, lying down');
      }
      if (solidAt(m.c, m.cy)) {
        note(`${r.name}: the pipe's ${name} mouth at (x=${m.c}, cy=${m.cy}) is buried in `
          + 'solid tile — you could not step into it, or out of it');
      }
    }
    if (q.a.c === q.b.c && q.a.cy === q.b.cy) {
      note(`${r.name}: a pipe's two mouths are the same cell (x=${q.a.c}, cy=${q.a.cy}) — `
        + 'it goes nowhere');
    }
  }

  // ---- a jump taken OUT OF WATER carries less --------------------------
  // The rule the tarp's scar predicts. Wading caps the run, a running jump
  // carries `run x airtime`, so a gap whose takeoff lip is shallow water is
  // measured against 2.67 tiles rather than 4.85 — and the two look
  // identical in a room listing, which is precisely why this is a rule and
  // not a note. Only the KID's gaps: a machine does not wade.
  const waterAt = (c) => c >= 0 && c < W && r.grid[H - 1 - (GROUND - 1)][c] === WATER_CHAR;
  for (const o of r.obstacles) {
    if (o.clears || o.kind !== 'gap') continue;
    if (!waterAt(o.at - 1)) continue;
    if (o.size > REACH.gapWading) {
      note(`${r.name}: the gap of ${o.size} at x=${o.at} is taken off from SHALLOW WATER at `
        + `x=${o.at - 1} — wading caps the run, so that jump carries `
        + `${REACH.jumpAcrossWading.toFixed(2)} tiles, not ${REACH.jumpAcross}. `
        + `From water the budget is ${REACH.gapWading}`);
    }
  }

  // ---- water, and the one way it goes wrong -----------------------------
  // DESIGN §4.1: Eeri is never hurt and never dies, so DEEP WATER DOES NOT
  // DROWN HIM — it hands him back, exactly as a hole does. That promise is
  // only true if there is somewhere to hand him back TO: `fallRespawn` walks
  // to `backX`, three tiles before the near lip, and if that column is
  // itself water or a hole he is handed straight back in and the level eats
  // him. A pit has never needed this rule because a pit beside a pit is
  // obviously wrong; two stretches of water read as one pond and are not.
  for (const w of r.water) {
    if (!w.respawns) continue;
    const back = w.c0 - 3;
    if (back < 0 || !solidAt(back, GROUND - 1)) {
      note(`${r.name}: the deep water at ${w.c0}…${w.c1} has no dry lip to hand you back to `
        + `(x=${back} is not standable) — deep water returns you like a hole, and a return `
        + 'into more water is a level that eats you');
    }
  }
  // …and shallow water is a floor, so it must actually BE one. It stamps
  // OVER the ground's top row, so asking whether the water tile is solid
  // answers itself — the question is whether the earth is still under it.
  for (const w of r.water) {
    if (w.deep) continue;
    for (let c = w.c0; c <= w.c1; c++) {
      if (!solidAt(c, GROUND - 2)) {
        note(`${r.name}: the shallow water at ${w.c0}…${w.c1} has nothing under x=${c} — `
          + 'shallow water is a floor you wade through, not a puddle in mid-air');
        break;
      }
    }
  }

  // ---- generosity, as numbers (DESIGN §4.1) -----------------------------
  // "Every jump proved with a full tile of slack over the budget." The
  // budget's own ceilings are step 2 (of 2.65) and gap 4 (of 4.85), which is
  // 0.65 and 0.85 — so the CEILING cannot meet the rule and the only honest
  // check is on what a level actually USES. Anything under a full tile is
  // named, and anything under 0.6 fails: that is the line between "measured"
  // and "reliable under a thumb".
  for (const o of r.obstacles) {
    if (o.clears) continue;                     // the machine's, not the kid's
    const slack = o.kind === 'step'
      ? REACH.jumpUp - o.size
      : REACH.jumpAcross - o.size;
    if (slack < 0.6) {
      note(`${r.name}: the ${o.kind} of ${o.size} at x=${o.at} leaves ${slack.toFixed(2)} tiles of slack — `
        + 'under the 0.6 that separates "measured" from "reliable under a thumb"');
    }
  }

  // ---- the collectibles, and whether they can actually be had -----------
  const seen = new Set();
  for (const [row, col] of r.bolts) {
    const k = `${row},${col}`;
    if (seen.has(k)) note(`${r.name}: two bolts share the cell (row ${row}, col ${col}) — one of them can never be counted`);
    seen.add(k);
  }
  if (r.bolts.length !== LEVEL.bolts) {
    note(`${r.name}: ${r.bolts.length} bolts, and the HUD says x/${LEVEL.bolts}`);
  }
  if (r.golden.length !== LEVEL.golden) {
    note(`${r.name}: ${r.golden.length} golden bolts — a level hides exactly ${LEVEL.golden}`);
  }

  const fin = finishedGrid(r);
  const reach = (cy, col) => {
    for (let c = col - BOLT_SPREAD; c <= col + BOLT_SPREAD; c++) {
      const t = surfaceBelow(fin, c, cy);
      if (t !== null && cy - t <= BOLT_REACH && cy - t >= -0.5) return true;
    }
    if (r.ladders.some((l) => Math.abs(l.c - col) <= 1 && cy >= l.cy0 - 1 && cy <= l.cy1 + 1)) return true;
    // A TARP IS A WAY UP, so the reach model has to know it — it was written
    // when a jump was the only way to gain height, and the first thing the
    // gizmo lab did was report its own bolts unreachable. Anything a gizmo
    // adds to the player's reach has to be added here too, or the check
    // starts refusing correct rooms, which is worse than not checking.
    if (r.tarps.some((t) => col >= t.c0 - 1 && col <= t.c1 + 1
      && cy >= t.cy && cy <= t.cy + 1 + TARP_RISE + 0.9)) return true;
    // …and A PIPE IS A WAY TO GET SOMEWHERE, so it counts too. Its mouths
    // are standable by the rule above, so anything within a jump of either
    // one is reachable — this is the same debt the tarp taught, paid on the
    // way in this time rather than after the lab complained.
    if (r.pipes.some((q) => [q.a, q.b].some((m) =>
      Math.abs(m.c - col) <= BOLT_SPREAD && cy - m.cy <= BOLT_REACH && cy - m.cy >= -0.5))) return true;
    // …and A HOIST IS A MOVING FLOOR, so everything within a jump of ANY
    // height it passes through is reachable. Same debt as the tarp and the
    // pipe, paid on the way in: a gizmo that changes where the player can
    // get to must be in this model, or the check refuses correct rooms.
    return r.hoists.some((h) => col >= h.c0 - BOLT_SPREAD && col <= h.c1 + BOLT_SPREAD
      && cy >= h.cy0 - 0.5 && cy <= h.cy1 + BOLT_REACH);
  };
  for (const [row, col] of [...r.bolts, ...r.golden]) {
    const cy = H - 1 - row;
    if (SOLID_CHARS.includes(r.grid[row][col]) && !SOLID_CHARS.includes(fin[row][col])) continue; // the ride frees it
    if (!reach(cy, col)) note(`${r.name}: the bolt at (cy ${cy}, x ${col}) is out of reach — `
      + `nothing within ${BOLT_SPREAD} tiles of it gets a jump close enough`);
  }
  // …and a golden bolt that sits on the route is not hidden, it is scenery
  for (const [row, col] of r.golden) {
    const cy = H - 1 - row;
    const t = surfaceBelow(fin, col, cy);
    const overAHole = t === null;
    if (!overAHole && cy - t < 2) {
      note(`${r.name}: the golden bolt at (cy ${cy}, x ${col}) is ${(cy - t).toFixed(0)} tile(s) off the floor — `
        + 'you would take it by walking, and a secret you cannot miss is not a secret');
    }
  }

  return { ok: problems.length === 0, problems, compiled: r };
}
