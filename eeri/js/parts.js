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
};

// ---- the speeds, and the telegraph clock ---------------------------------
// Measured off js/kid.js the same way REACH is, and used by the walk-time
// estimate below.
export const SPEED = { run: 6.2, climb: 3.6 };
// what the gizmos do, in the same place as everything else the prover reads
export const GIZMO = { belt: 2.6, tarp: 17.5 };
// a tarp throws you tarp^2/2g tiles up: 17.5 gives 5.1, about twice a jump
export const TARP_RISE = (17.5 * 17.5) / 60;

// …and the machines', off js/excavator.js and js/crane.js, for the ride term
// of the estimate below. A machine is deliberately slower than the kid.
export const MACHINE_SPEED = { excavator: 3.4, crane: 2.8 };
// what a ride's own job costs, in seconds: the mount and dismount moves, and
// then the work itself — a dug row, a slung span, a swing of the ball
export const RIDE = { mount: 0.55, dismount: 0.5, dig: 0.7, sling: 0.55, seat: 0.5, swing: 2.4 };

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
  // a rung is NOT solid — you pass through it in every direction and only
  // the climb verb holds you on it. A solid ladder is a wall with a picture
  // of a ladder on it.
  ladder: { ch: 'H', solid: false },
};
export const SOLID_CHARS = '#=GBKCcT';
export const BELT_CHARS = 'Cc';
export const TARP_CHAR = 'T';
export const CLIMB_CHAR = 'H';

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
    pieces: [], obstacles: [], ladders: [], belts: [], tarps: [],
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
    return r.tarps.some((t) => col >= t.c0 - 1 && col <= t.c1 + 1
      && cy >= t.cy && cy <= t.cy + 1 + TARP_RISE + 0.9);
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
