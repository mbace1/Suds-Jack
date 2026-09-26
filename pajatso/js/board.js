// THE BOARD — the pachinko half of the machine. Pure: no DOM, no three.js, no
// clock; stepped with a fixed dt by the engine.
//
// Coordinates are board units (bu, ~1 cm): x in [-30, 30], y in [0, 84], y UP.
// The coin is a disc in the plane of the board — a Plinko chip, not a ball —
// because the same object has to land FLAT on the pusher afterwards.
//
// Nothing here pays anything. The board decides three things about a coin:
// where it comes out (which chute), what it touched on the way (pockets), and
// how long it took. The engine turns those into money.

export const BOARD = {
  W: 60, H: 84,
  C: { x: 0, y: 50 }, R: 30,        // the outer rail is a circle of R about C
  LANE: 2.6,                          // launch lane width, rail to guide rail
  COIN_R: 1.0,
  PIN_R: 0.35,
  G: 84,                              // bu/s^2 — slower than real, so it can be watched
  DT: 1 / 240,
  // the handle: 0..1 power maps onto a launch speed up the lane
  V_MIN: 98, V_MAX: 126,
  CHUTES: ['L', 'C', 'R'],
  // A gap a coin can fall through must clear its diameter by this much, and a
  // gap it cannot must be narrow enough that it never gets INTO it. Anything
  // in between is a wedge: a coin resting on a nail with a wall at its back.
  CLEAR: 2.25,
};

const EPS = 1e-9;
const deg = d => d * Math.PI / 180;

export function seg(ax, ay, bx, by, o = {}) {
  return { ax, ay, bx, by, e: o.e ?? 0.35, mu: o.mu ?? 0.08, kind: o.kind ?? 'wall',
    pocket: o.pocket ?? null, when: o.when ?? null };
}
export function arc(cx, cy, r, a0, a1, n, o) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
    out.push(seg(cx + Math.cos(t0) * r, cy + Math.sin(t0) * r, cx + Math.cos(t1) * r, cy + Math.sin(t1) * r, o));
  }
  return out;
}

// ── the layout ───────────────────────────────────────────────────────────
// The board is a MACHINE, not a level: the same nails every run. Charms move
// specific nails (the life nails open, a way appears) through `mods`, which is
// how a parlour really sets a machine — the nail doctor, 釘師, bends nails.
export function buildLayout(mods = {}) {
  const { C, R, LANE, PIN_R, CLEAR } = BOARD;
  const pins = [], segs = [], windmills = [], pockets = [];
  const pinE = mods.rubberPins ? 0.7 : 0.5;
  const pin = (x, y, tag) => pins.push({ x, y, r: PIN_R, e: pinE, tag: tag ?? null });
  const RAIL = { kind: 'rail', e: 0.1, mu: 0.012 };

  // the outer rail: a circle from the right side, over the top, to the left
  // side, then straight walls down both sides
  segs.push(...arc(C.x, C.y, R, deg(-4), deg(180), 72, RAIL));
  const sideLow = 4.5;
  segs.push(seg(-R, C.y, -R, sideLow, RAIL));
  const rx = Math.cos(deg(-4)) * R, ry = C.y + Math.sin(deg(-4)) * R;
  segs.push(seg(rx, ry, R - 0.05, sideLow, { e: 0.3 }));

  // the guide rail: the inner wall of the launch lane, straight up the left
  // side and round to the upper left, where it ends and lets the coin go
  const Rin = R - LANE;
  const TIP = deg(148);
  segs.push(seg(-Rin, sideLow, -Rin, C.y, { ...RAIL, kind: 'guide' }));
  segs.push(...arc(C.x, C.y, Rin, deg(180), TIP, 22, { ...RAIL, kind: 'guide' }));
  segs.push(seg(-R, sideLow, -Rin, sideLow, { kind: 'lanefloor', e: 0.1 }));
  const tip = { x: C.x + Math.cos(TIP) * Rin, y: C.y + Math.sin(TIP) * Rin };
  // the backflow valve (逆流防止): a flap across the mouth of the lane that a
  // coin going out pushes open and a coin bouncing back hits. Without it a
  // coin knocked back up-left by the top nails rides the rail backwards down
  // the lane — a foul the player never shot.
  segs.push(seg(tip.x, tip.y, C.x + Math.cos(TIP) * (R - 0.1), C.y + Math.sin(TIP) * (R - 0.1),
    { kind: 'valve', e: 0.3, mu: 0.05 }));

  // ── the reel window: a box with a roof that sheds coins both ways ──
  const WIN = { x0: -12.5, x1: 12.5, y0: 42, y1: 58, apex: 62.5 };
  // the left side of the frame has a GAP in it: the warp's mouth. A coin
  // sliding down the frame passes it; only one moving INTO the frame falls in.
  const WG = { y0: 47.4, y1: 50.2 };
  const frame = [
    [WIN.x0, WG.y1], [WIN.x0, WIN.y1], [0, WIN.apex], [WIN.x1, WIN.y1], [WIN.x1, WIN.y0 + 2],
    [WIN.x1 - 2, WIN.y0], [WIN.x0 + 2, WIN.y0], [WIN.x0, WIN.y0 + 2], [WIN.x0, WG.y0],
  ];
  for (let i = 0; i < frame.length - 1; i++) segs.push(seg(...frame[i], ...frame[i + 1], { kind: 'frame', e: 0.3 }));
  segs.push(seg(WIN.x0 + 2.4, WG.y0, WIN.x0 + 2.4, WG.y1, { kind: 'frame', e: 0.1 }));    // the back of the mouth

  // ── the stage: a shallow V under the window with a hole over the chucker ──
  // A warped coin rolls down it, maybe jumps the hole, rolls back, and falls
  // through straight at the life nails. The best seat on the board.
  const ST = { y: 37.0, lip: 39.4, x: 10, hole: 1.6 };
  segs.push(seg(-ST.x, ST.lip, -ST.hole, ST.y, { kind: 'stage', e: 0.15, mu: 0.03 }));
  segs.push(seg(ST.hole, ST.y, ST.x, ST.lip, { kind: 'stage', e: 0.15, mu: 0.03 }));
  segs.push(seg(-ST.x, ST.lip, -ST.x - 0.2, ST.lip + 1.0, { kind: 'stage', e: 0.3 }));
  segs.push(seg(ST.x, ST.lip, ST.x + 0.2, ST.lip + 1.0, { kind: 'stage', e: 0.3 }));

  // ── pockets ────────────────────────────────────────────────────────
  // A pocket is a cup: two short walls and a floor, with a sensor inside. The
  // walls mean only a coin falling in from ABOVE is caught — a pocket's rule
  // in a real board.
  const addPocket = (p) => { pockets.push({ flash: 0, hits: 0, open: true, ...p }); return pockets[pockets.length - 1]; };
  const cup = (id, kind, x, y, w, depth, chute) => {
    const p = addPocket({ id, kind, x, y, w, depth, chute });
    segs.push(seg(x - w / 2, y, x - w / 2, y - depth, { kind: 'cup', e: 0.25 }));
    segs.push(seg(x + w / 2, y, x + w / 2, y - depth, { kind: 'cup', e: 0.25 }));
    segs.push(seg(x - w / 2, y - depth, x + w / 2, y - depth, { kind: 'cup', e: 0.1 }));
    return p;
  };
  // the start chucker, and the two life nails that decide it
  const chuckW = 2.75 + (mods.chuckerWiden ?? 0);
  cup('start', 'start', 0, 28, chuckW, 2.4, 'C');
  const life = 2.05 + (mods.lifeNails ?? 0);
  pin(-life, 31.6, 'life'); pin(life, 31.6, 'life');
  // hakama: the skirt below the chucker that carries a miss away from it
  pin(-4.7, 26.2, 'hakama'); pin(4.7, 26.2, 'hakama');
  if (mods.secondChucker) cup('start2', 'start', -8.6, 23.5, 2.75, 2.4, 'L');

  // tulips. Shut, the wings stand straight up a coin's width apart; open, they
  // spread into a funnel. The wings are two sets of segments and the board
  // only collides with the set that matches the tulip's state.
  const tulipN = 2.3, tulipW = mods.wideTulips ? 5.2 : 4.6;
  for (const [id, x, chute] of [['tulipL', -13.5, 'L'], ['tulipR', 13.5, 'R']]) {
    const y = 20, depth = 2.4;
    addPocket({ id, kind: 'tulip', x, y, w: tulipN, narrow: tulipN, wide: tulipW, depth, chute,
      open: !!mods.wideTulips, alwaysOpen: !!mods.wideTulips });
    for (const s of [-1, 1]) {
      segs.push(seg(x + s * tulipN / 2, y - 0.7, x + s * tulipN / 2, y - depth, { kind: 'cup', e: 0.25 }));
      segs.push(seg(x + s * tulipN / 2, y, x + s * tulipN / 2, y - 0.7, { kind: 'wing', e: 0.25, pocket: id, when: 'closed' }));
      segs.push(seg(x + s * tulipW / 2, y + 1.1, x + s * tulipN / 2, y - 0.7, { kind: 'wing', e: 0.2, pocket: id, when: 'open' }));
    }
    segs.push(seg(x - tulipN / 2, y - depth, x + tulipN / 2, y - depth, { kind: 'cup', e: 0.1 }));
  }
  // ticket pockets. Each shares its outer wall with the rail it stands on, so
  // there is no gap between pocket and wall for a coin to wedge in.
  cup('pocketL', 'pocket', -23.0, 48.0, 2.45, 2.0, 'L');
  cup('pocketR', 'pocket', 22.4, 44.6, 2.45, 2.0, 'R');

  // the attacker: a wide gate low on the right, shut unless FEVER. Its lid is
  // sloped so a coin rolls off it toward the middle while it is shut.
  const ATT = { x0: 9.0, x1: 21.0, y: 10 };
  addPocket({ id: 'attacker', kind: 'attacker', x: (ATT.x0 + ATT.x1) / 2, y: ATT.y, w: ATT.x1 - ATT.x0, depth: 3,
    chute: 'R', open: false });
  segs.push(seg(ATT.x0, ATT.y, ATT.x0, ATT.y - 3, { kind: 'cup', e: 0.2 }));
  segs.push(seg(ATT.x1, ATT.y + 2.0, ATT.x1, ATT.y - 3, { kind: 'cup', e: 0.2 }));
  segs.push(seg(ATT.x1, ATT.y + 2.0, ATT.x0, ATT.y, { kind: 'lid', e: 0.2, mu: 0.04, pocket: 'attacker', when: 'closed' }));

  // the warp: a mouth in the left side of the window frame that drops a coin
  // onto the stage. A sensor, not a cup.
  const warp = { x0: WIN.x0 + 0.1, x1: WIN.x0 + 2.4, y0: WG.y0, y1: WG.y1, to: { x: -9.5, y: 40.5 } };

  // windmills: free-spinning deflectors on both sides of the window
  const wm = (x, y) => windmills.push({ x, y, r: 1.7, w: 0, a: 0 });
  wm(-19.8, 53.5); wm(19.8, 53.5);
  if (mods.thirdWindmill) wm(0, 66.8);

  // ── the way: nails a coin ROLLS along, down from the left channel toward the
  // life nails. Tighter than a coin, on purpose. ──
  // A way is a FENCE: at 2.3 bu apart the dip between two nails is a real
  // well a slow coin settles in (every coin that stalled on the first cut
  // stalled there), so the nails stand 1.25 apart and the fence is a rail
  // with teeth. The stall is geometry, not friction. Rolling round the
  // downhill nail, a coin climbs unless the slope is steeper than
  // atan((s/2) / h), h being how high it sits between two nails: 27 degrees
  // at this spacing, which is why every way here is 30 or more. At 2.3 apart
  // it would take 52.
  const ways = [[-20.8, 42.6, -6.4, 34.2]];
  if (mods.rightWay) ways.push([20.8, 42.6, 4.9, 33.4]);
  ways.push([29.4, 23.4, 19.2, 15.0]);            // from the wall itself, so nothing slips past, to over the gate
  for (const [x0, y0, x1, y1] of ways) {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 1.25));
    for (let i = 0; i <= n; i++) pin(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 'way');
  }

  // ── the top nails (天釘): a close double row where the rail lets go ──
  for (let x = -12.6; x <= 12.7; x += 3.15) pin(x, 71.8, 'top');
  for (let x = -11.0; x <= 11.1; x += 3.15) pin(x, 69.0, 'top');

  // ── the field: an offset lattice of nails, cleared around every feature ──
  const K = CLEAR + PIN_R + 0.15;        // a nail's centre this far from any wall
  const boxes = [];
  const keepOut = (x0, y0, x1, y1) => boxes.push([x0, y0, x1, y1]);
  keepOut(WIN.x0 - K, WIN.y0 - 1.0, WIN.x1 + K, WIN.apex + K);
  keepOut(-ST.x - K, ST.y - K, ST.x + K, WIN.y0);
  keepOut(-6.4, 23.4, 6.4, 34.6);
  for (const p of pockets) {
    const hw = (p.wide ?? p.w) / 2;
    keepOut(p.x - hw - K, p.y - p.depth - 1.5, p.x + hw + K, p.y + K + 0.6);
  }
  keepOut(warp.x0 - K - 0.6, warp.y0 - K, warp.x0, warp.y1 + K);
  for (const w of windmills) keepOut(w.x - w.r - K, w.y - w.r - K, w.x + w.r + K, w.y + w.r + K);
  keepOut(-14.6, 66.4, 14.6, 74.6);                               // the top nails' band
  const nearLine = (x, y, [x0, y0, x1, y1], d) => {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2));
    return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) < d;
  };
  const cleared = (x, y) => boxes.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)
    || ways.some(w => nearLine(x, y, w, 2 * PIN_R + CLEAR + 0.2));

  const DX = 3.2, DY = 2.9;
  let row = 0;
  for (let y = 13.2; y < 76; y += DY, row++) {
    const off = row % 2 ? DX / 2 : 0;
    for (let x = -28 + off; x <= 28; x += DX) {
      // inside the rails with room for a coin to fall past the outermost nail
      const inCircle = y > C.y ? Math.hypot(x - C.x, y - C.y) < Rin - K : true;
      const inBody = x > -Rin + K && x < R - K;
      if (!inCircle || !inBody) continue;
      if (cleared(x, y)) continue;
      // open lanes: a lattice full everywhere is a sieve with one answer;
      // holes in a FIXED pattern give the board routes
      const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (h < 0.1) continue;
      pin(x, y, 'field');
    }
  }

  const byId = Object.fromEntries(pockets.map(p => [p.id, p]));
  const layout = { pins, segs, windmills, pockets, byId, warp, tip, WIN, ST, ATT, Rin, mods: { ...mods } };
  layout.grid = buildGrid(layout);
  return layout;
}

// ── a uniform grid over the static colliders ─────────────────────────────
const CELL = 4;
// Every collider is registered in each cell its bounding box, grown by the
// largest coin radius, touches — so a coin only ever asks the ONE cell its
// centre is in.
const PAD = 1.8;
export function buildGrid(L) {
  const cols = Math.ceil((BOARD.W + 8) / CELL), rows = Math.ceil((BOARD.H + 8) / CELL);
  const cells = Array.from({ length: cols * rows }, () => ({ pins: [], segs: [] }));
  const cx = x => Math.floor((x + 34) / CELL), cy = y => Math.floor((y + 4) / CELL);
  const put = (x0, y0, x1, y1, i, key) => {
    for (let r = Math.max(0, cy(y0 - PAD)); r <= Math.min(rows - 1, cy(y1 + PAD)); r++)
      for (let c = Math.max(0, cx(x0 - PAD)); c <= Math.min(cols - 1, cx(x1 + PAD)); c++)
        cells[r * cols + c][key].push(i);
  };
  L.pins.forEach((p, i) => put(p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r, i, 'pins'));
  L.segs.forEach((s, i) => put(Math.min(s.ax, s.bx), Math.min(s.ay, s.by), Math.max(s.ax, s.bx), Math.max(s.ay, s.by), i, 'segs'));
  return {
    cols, rows, cells,
    cell(x, y) {
      const c = cx(x), r = cy(y);
      return (c < 0 || r < 0 || c >= cols || r >= rows) ? null : cells[r * cols + c];
    },
  };
}

// ── the simulation ───────────────────────────────────────────────────────
let _uid = 1;

export class Board {
  constructor(layout, rng) {
    this.L = layout;
    this.rng = rng;
    this.coins = [];
    this.events = [];
    this.t = 0;
    this.magnet = 0;          // charm: a pull toward the start chucker
    this.shake = 0;           // a rattle the view can show
  }

  setLayout(layout) {
    // carry pocket state (tulips open, counters) across a rebuild
    for (const p of layout.pockets) {
      const o = this.L.byId[p.id];
      if (!o) continue;
      p.hits = o.hits;
      if (p.kind === 'tulip' && !p.alwaysOpen) p.open = o.open;
      if (p.kind === 'attacker') p.open = o.open;
    }
    this.L = layout;
  }

  get busy() { return this.coins.length > 0; }

  // The handle. `power` 0..1. A hand on a handle is not a machine: the speed
  // carries a small wobble from the seeded stream, so one power is a
  // neighbourhood on the board, not a point.
  launch(power, props = {}) {
    const { V_MIN, V_MAX, R, LANE } = BOARD;
    const p = Math.max(0, Math.min(1, power));
    // a machine with a different spring passes its own range (the Pajatso's)
    const v = (props.vMin ?? V_MIN) + ((props.vMax ?? V_MAX) - (props.vMin ?? V_MIN)) * p + this.rng.wobble(props.wobble ?? 1.5);
    const scale = props.scale ?? 1;
    const coin = {
      id: _uid++, x: -R + (props.lane ?? LANE) / 2, y: props.y ?? 9.6, vx: 0, vy: v,
      r: BOARD.COIN_R * scale, m: scale * scale,
      spin: this.rng.next() * Math.PI * 2, spinV: 0,
      value: props.value ?? 1, kind: props.kind ?? 'copper', fever: !!props.fever,
      age: 0, still: 0, kicks: 0, touched: [], power: p,
    };
    this.coins.push(coin);
    this.events.push({ t: 'launch', id: coin.id, power: p, v });
    return coin;
  }

  inLane(c) {
    const { C, Rin } = { C: BOARD.C, Rin: this.L.Rin };
    if (c.y <= C.y) return c.x < -Rin;
    const d = Math.hypot(c.x - C.x, c.y - C.y);
    return d > Rin && Math.atan2(c.y - C.y, c.x - C.x) > deg(116);
  }

  step(dt = BOARD.DT) {
    const { G } = BOARD;
    this.t += dt;
    for (const w of this.L.windmills) { w.a += w.w * dt; w.w *= Math.exp(-0.9 * dt); }
    for (const p of this.L.pockets) if (p.flash > 0) p.flash = Math.max(0, p.flash - dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);

    const start = this.L.byId.start;
    for (const c of this.coins) {
      c.age += dt;
      c.vy -= G * dt;
      if (this.magnet > 0 && start && c.x > -this.L.Rin) {
        const dx = start.x - c.x, dy = (start.y + 1.6) - c.y, d = Math.hypot(dx, dy);
        if (d < 12 && d > 0.4) { const f = this.magnet * (1 - d / 12) / d; c.vx += dx * f * dt; c.vy += dy * f * dt; }
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.spin += c.spinV * dt; c.spinV *= Math.exp(-0.5 * dt);
      this.collideStatic(c);
    }
    this.collideCoins();
    for (let i = this.coins.length - 1; i >= 0; i--) this.resolve(this.coins[i], i, dt);
  }

  segActive(s) {
    if (!s.when) return true;
    const p = this.L.byId[s.pocket];
    return p ? (s.when === 'open') === !!p.open : true;
  }

  collideStatic(c) {
    const L = this.L;
    const cell = L.grid.cell(c.x, c.y);
    if (cell) {
      for (const pi of cell.pins) {
        const p = L.pins[pi];
        const hit = this.hitCircle(c, p.x, p.y, p.r, p.e, 0.1, 'pin');
        // a coin balanced on a nail head is an equilibrium no real coin
        // holds; the first breath of air tips it, so this does
        if (hit && hit.ny > 0.985 && Math.abs(c.vx) < 0.6) c.vx += (this.rng.next() < 0.5 ? -1 : 1) * 1.4;
      }
      for (const si of cell.segs) {
        const s = L.segs[si];
        if (!this.segActive(s)) continue;
        // the valve only stops a coin turning back toward the lane (anticlockwise)
        if (s.kind === 'valve' && (c.x - BOARD.C.x) * c.vy - (c.y - BOARD.C.y) * c.vx <= 0) continue;
        this.hitSeg(c, s);
      }
    }
    for (const w of L.windmills) {
      const dx = c.x - w.x, dy = c.y - w.y, d = Math.hypot(dx, dy), rr = c.r + w.r;
      if (d >= rr || d < EPS) continue;
      const nx = dx / d, ny = dy / d;
      // the blades move; the coin feels the relative velocity, and the
      // windmill takes back what friction gives the coin
      const ux = -ny * w.w * w.r, uy = nx * w.w * w.r;
      const imp = this.contact(c, nx, ny, rr - d, 0.42, 0.4, ux, uy, 'windmill');
      if (imp) w.w = Math.max(-24, Math.min(24, w.w - imp.jt * 0.6 / w.r * c.m));
    }
  }

  hitCircle(c, x, y, r, e, mu, what) {
    const dx = c.x - x, dy = c.y - y, rr = c.r + r;
    if (dx >= rr || dx <= -rr || dy >= rr || dy <= -rr) return null;
    const d = Math.hypot(dx, dy);
    if (d >= rr || d < EPS) return null;
    return this.contact(c, dx / d, dy / d, rr - d, e, mu, 0, 0, what);
  }

  hitSeg(c, s) {
    const dx = s.bx - s.ax, dy = s.by - s.ay, L2 = dx * dx + dy * dy;
    const t = L2 > EPS ? Math.max(0, Math.min(1, ((c.x - s.ax) * dx + (c.y - s.ay) * dy) / L2)) : 0;
    const px = s.ax + dx * t, py = s.ay + dy * t;
    const ex = c.x - px, ey = c.y - py, d = Math.hypot(ex, ey);
    if (d >= c.r || d < EPS) return null;
    const hit = this.contact(c, ex / d, ey / d, c.r - d, s.e, s.mu, 0, 0, s.kind);
    // the same knife-edge on the end of a wall — a pocket's rim
    if (hit && (t === 0 || t === 1) && hit.ny > 0.985 && Math.abs(c.vx) < 0.6) c.vx += (this.rng.next() < 0.5 ? -1 : 1) * 1.4;
    return hit;
  }

  // One contact: push out, bounce the normal part, rub the tangential part.
  // Friction is Coulomb — proportional to the normal impulse — so a coin riding
  // the rail loses a little to it and a coin grazing a nail loses less.
  contact(c, nx, ny, depth, e, mu, ux, uy, what) {
    c.x += nx * depth; c.y += ny * depth;
    const rvx = c.vx - ux, rvy = c.vy - uy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return null;
    const jn = -(1 + e) * vn;
    const tx = -ny, ty = nx;
    const vt = rvx * tx + rvy * ty;
    const jt = -Math.sign(vt) * Math.min(Math.abs(vt), mu * jn);
    c.vx += nx * jn + tx * jt; c.vy += ny * jn + ty * jt;
    // a disc rolling along a surface turns at v/r — only for the eye
    c.spinV = -((c.vx - ux) * tx + (c.vy - uy) * ty) / c.r;
    if (jn > 8 && what !== 'rail' && what !== 'guide')
      this.events.push({ t: 'tick', what, x: c.x, y: c.y, v: jn });
    return { jn, jt, nx, ny };
  }

  collideCoins() {
    const cs = this.coins;
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i];
      for (let j = i + 1; j < cs.length; j++) {
        const b = cs[j];
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        if (dx >= rr || dx <= -rr || dy >= rr || dy <= -rr) continue;
        const d = Math.hypot(dx, dy);
        if (d >= rr || d < EPS) continue;
        const nx = dx / d, ny = dy / d, over = rr - d;
        const ia = 1 / a.m, ib = 1 / b.m, sum = ia + ib;
        a.x -= nx * over * ia / sum; a.y -= ny * over * ia / sum;
        b.x += nx * over * ib / sum; b.y += ny * over * ib / sum;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn >= 0) continue;
        const imp = -(1 + 0.45) * vn / sum;
        a.vx -= nx * imp * ia; a.vy -= ny * imp * ia;
        b.vx += nx * imp * ib; b.vy += ny * imp * ib;
      }
    }
  }

  // Everything that can happen to a coin after it has moved: a pocket, the
  // warp, the bottom, a foul, or being stuck.
  resolve(c, i, dt) {
    const L = this.L;
    for (const p of L.pockets) {
      let hw;
      if (p.kind === 'tulip') hw = p.narrow / 2 + (p.open ? 0.15 : 0);
      else if (!p.open) continue;
      else hw = p.w / 2;
      // inside means ABOVE the floor: the old bound reached 1.4 below it, and a
      // coin sliding UNDER a cup was paid as a coin in it (the Pajatso's POTTI
      // traces caught one ending under the cup it was credited to)
      if (Math.abs(c.x - p.x) < hw && c.y < p.y - 0.25 && c.y > p.y - p.depth + 0.2) {
        this.coins.splice(i, 1);
        p.hits++; p.flash = 0.7;
        c.touched.push(p.id);
        this.events.push({ t: 'pocket', pocket: p.id, kind: p.kind, coin: c, chute: p.chute, wasOpen: p.open });
        if (p.kind === 'tulip' && !p.alwaysOpen) { p.open = !p.open; this.events.push({ t: 'tulip', pocket: p.id, open: p.open }); }
        this.events.push({ t: 'exit', coin: c, chute: p.chute, via: p.id });
        return;
      }
    }
    const wp = L.warp;
    if (c.x > wp.x0 && c.x < wp.x1 && c.y > wp.y0 && c.y < wp.y1) {
      c.x = wp.to.x; c.y = wp.to.y;
      c.vx = 2.0 + this.rng.next() * 5.0; c.vy = 0;
      c.touched.push('warp');
      this.events.push({ t: 'warp', coin: c });
      return;
    }
    if (c.y < 0.8) {
      this.coins.splice(i, 1);
      const chute = c.x < -9 ? 'L' : c.x > 9 ? 'R' : 'C';
      this.events.push({ t: 'exit', coin: c, chute, via: 'bottom' });
      return;
    }
    // a foul: the shot is coming back down the lane. It is taken out as soon as
    // it turns, before the bottom — a coin resting on the lane floor sat under
    // the next launch, and every launch after that hit it and fell back too.
    if (c.vy < -1 && c.y < BOARD.C.y - 5 && this.inLane(c)) {
      this.coins.splice(i, 1);
      this.events.push({ t: 'foul', coin: c });
      return;
    }
    // stuck: balanced on a nail, wedged in a gap. A player bangs the cabinet;
    // this rattles it, and if that fails, fishes the coin out.
    const speed = Math.hypot(c.vx, c.vy);
    c.still = speed < 2.5 ? c.still + dt : 0;
    if (c.still > 1.0) {
      c.still = 0; c.kicks++;
      if (c.kicks > 3) {
        this.coins.splice(i, 1);
        this.events.push({ t: 'exit', coin: c, chute: c.x < -9 ? 'L' : c.x > 9 ? 'R' : 'C', via: 'rescued' });
        return;
      }
      c.vx += (this.rng.next() < 0.5 ? -1 : 1) * (6 + this.rng.next() * 5);
      c.vy += 5 + this.rng.next() * 3;
      this.shake = 0.25;
      this.events.push({ t: 'rattle', coin: c, x: c.x, y: c.y });
    }
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || c.y > BOARD.H + 10 || Math.abs(c.x) > 40) {
      this.coins.splice(i, 1);
      this.events.push({ t: 'exit', coin: c, chute: 'C', via: 'rescued' });
    }
  }

  setAttacker(open) {
    const a = this.L.byId.attacker;
    if (a && a.open !== open) { a.open = open; this.events.push({ t: 'attacker', open }); }
  }

  drain() { const e = this.events; this.events = []; return e; }
}
