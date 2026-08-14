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
};
export const SOLID_CHARS = '#=GBK';

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
export const robot = (c0, c1, kind = 'skitter') => ({
  kind: 'robot', c0, c1, robotKind: kind,
  robot: { c0, c1, kind },
});

// A small telegraphed hazard sitting on the floor at x.
export const hazard = (x, type = 'steam') => ({
  kind: 'hazard', x, type,
  hazard: { x, type },
});

export const swingBall = (px, py, len = 2.6, zoneW = 7.5) => ({
  kind: 'ball', px, py, len, zoneW,
  ball: { px, py, len, zoneW },
});

export const bolts = (list) => ({ kind: 'bolts', list, bolts: list });
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
    parts: room.parts,
    bolts: [], pits: [], shots: [], machines: [], robots: [], hazards: [],
    pieces: [], obstacles: [], ball: null,
    spawn: { kid: { x: 4.5, y: GROUND }, machines: {} },
    exit: { x: W - 4, y: GROUND },
  };
  for (const p of room.parts) {
    p.stamp?.(grid);
    if (p.pit) out.pits.push(p.pit);
    if (p.piece) out.pieces.push(p.piece);
    if (p.machine) { out.machines.push(p.machine); out.spawn.machines[p.machine.type] = p.machine.x; }
    if (p.robot) out.robots.push(p.robot);
    if (p.hazard) out.hazards.push(p.hazard);
    if (p.ball) out.ball = p.ball;
    if (p.bolts) out.bolts.push(...p.bolts);
    if (p.shot) out.shots.push(p.shot);
    if (p.spawnKid) out.spawn.kid = { x: p.spawnKid.x, y: p.spawnKid.y };
    if (p.exit) out.exit = p.exit;
    if (p.obstacle) out.obstacles.push({ ...p.obstacle, part: p });
    if (p.girderStack) out.stack = p.girderStack;
  }
  out.grid = grid;

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

export function check(room) {
  const r = compile(room);
  const problems = [];
  const note = (s) => problems.push(s);

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

  // A RIDE-ENDING HAZARD MAY NOT STAND BETWEEN A MACHINE AND ITS JOB.
  // The wrecking ball is the only hazard that takes the ride rather than
  // just knocking you back, and in SITE 1 it hung at x=70 — squarely on the
  // excavator's only run from where it is parked to the bank at 84. Every
  // attempt to bring the machine to its job ended with the ball throwing
  // you out of the cab, so the bank could never be dug and the room played
  // as an impossible wall. Nothing checked it, because the track rules only
  // ever asked about holes.
  if (r.ball) {
    const swing = r.ball.len * 0.95 + 0.6;         // arc, plus the ball itself
    const lo = r.ball.px - swing, hi = r.ball.px + swing;
    for (const m of r.machines) {
      for (const o of r.obstacles) {
        if (!o.clears || !m.verbs.includes(o.clears)) continue;
        const from = Math.min(m.x, o.at), to = Math.max(m.x, o.at + (o.size ?? 1));
        if (hi > from && lo < to) {
          note(`${r.name}: the swinging ball at x=${r.ball.px} stands across the `
            + `${m.type}'s route (${from.toFixed(1)}…${to.toFixed(1)}) to the ${o.kind} `
            + `it has to clear — a hit takes the RIDE, so the job can never be done`);
        }
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

  // robots must patrol on floor that exists
  for (const b of r.robots) {
    for (const p of r.pits) {
      if (b.c0 <= p.c1 && b.c1 >= p.c0) note(`${r.name}: a robot patrols ${b.c0}…${b.c1}, which crosses the hole at ${p.c0}…${p.c1}`);
    }
  }

  // the walk: left to right, carrying what you have earned
  const have = new Set();
  const ordered = [...r.obstacles].sort((a, b) => a.at - b.at);
  let x = r.spawn.kid.x;
  for (const o of ordered) {
    // any machine standing between here and the obstacle is yours to mount
    for (const m of r.machines) if (m.x >= x - 0.5 && m.x <= o.at) m.verbs.forEach((v) => have.add(v));
    const passable = o.kind === 'step'
      ? o.size <= REACH.step
      : o.size <= REACH.gap;
    if (!passable && !(o.clears && have.has(o.clears))) {
      note(`${r.name}: STUCK at x=${o.at} — a ${o.kind} of ${o.size} `
        + `(the kid clears ${o.kind === 'step' ? REACH.step : REACH.gap})`
        + (o.clears ? `, and the machine that ${o.clears}s it has not been reached yet` : ' and no machine clears it'));
    }
    x = o.at + (o.size ?? 1);
  }
  for (const m of r.machines) if (m.x >= x - 0.5) m.verbs.forEach((v) => have.add(v));

  // and the way out has to be past the last thing, on foot
  if (r.exit.x > W - 1) note(`${r.name}: the exit at x=${r.exit.x} is outside the room`);

  return { ok: problems.length === 0, problems, compiled: r };
}
