// THE PAJATSO FACE. The Finnish coin wall game (from the German Bajazzo, the
// clown): one coin, a lever, a curved track over the top, brass nails, and
// cups with a number painted over them. A coin that falls into a cup pays that
// many coins; a coin that falls through to the bottom is the house's.
//
// Pure: a layout in the same shape `Board` in ../board.js steps, so the
// physics that were tuned by measurement for the pachinko board — the
// rail, the valve, the knife-edge tip, the wedge rule — are the same physics
// here. Only the face is new.
//
// The coin is BIG, the way a real one on a real Pajatso is: 2.5 bu across on a
// 60 bu face against the pachinko board's 2. Every clearance is sized off it.

import { BOARD, seg, arc, buildGrid } from '../board.js?v=2';

const deg = d => d * Math.PI / 180;

export const FACE = {
  COIN_R: 1.25,
  SCALE: 1.25,                 // the coin's radius over BOARD.COIN_R
  LANE: 3.0,
  PIN_R: 0.4,
  // a gap a coin falls through clears its diameter by 12%; nothing on this
  // face is narrower than a coin and wider than nothing (no fences at all)
  CLEAR: 2.8,
  // the spring. A Pajatso's range, measured so the weakest shot just gets
  // round the guide and the strongest rides the rail down the right side
  V_MIN: 104, V_MAX: 121,
  CUP_W: 2.85, CUP_D: 3.0,
};

// What each cup pays, painted over it. Named by WHERE a cup is, not by what it
// pays: the numbers were set from measured rates (test/face.mjs), and the
// first cut had them backwards — the clown's mouth, meant as the jackpot, was
// hit more often than the two side chimneys together. So the chimneys are
// the POTTI, and the clown pays the frequent big win.
export const PAYS = {
  star: 10,                    // POTTI: the two chimney cups high on the sides
  clown: 5,                    // the clown's mouth, top centre
  inner: 3,
  mid: 2,
  low: 2,
  back: 1,                     // the middle slot at the bottom gives the coin back
};
export const JACKPOT = 'star';

export function buildPajatso(mods = {}) {
  const { C, R } = BOARD;
  const { LANE, PIN_R, CLEAR, CUP_W, CUP_D, COIN_R } = FACE;
  const pins = [], segs = [], pockets = [];
  const pin = (x, y, tag) => pins.push({ x, y, r: PIN_R, e: 0.5, tag: tag ?? null });
  const RAIL = { kind: 'rail', e: 0.1, mu: 0.012 };

  // the rail: over the top and down both sides, the same circle the pachinko
  // board uses
  segs.push(...arc(C.x, C.y, R, deg(-4), deg(180), 72, RAIL));
  const sideLow = 4.5;
  segs.push(seg(-R, C.y, -R, sideLow, RAIL));
  const rx = Math.cos(deg(-4)) * R, ry = C.y + Math.sin(deg(-4)) * R;
  segs.push(seg(rx, ry, R - 0.05, 5.5, { e: 0.3 }));

  // the lane: up the left, round to the upper left, where the guide lets go
  const Rin = R - LANE;
  const TIP = deg(142);
  segs.push(seg(-Rin, sideLow, -Rin, C.y, { ...RAIL, kind: 'guide' }));
  segs.push(...arc(C.x, C.y, Rin, deg(180), TIP, 22, { ...RAIL, kind: 'guide' }));
  segs.push(seg(-R, sideLow, -Rin, sideLow, { kind: 'lanefloor', e: 0.1 }));
  const tip = { x: C.x + Math.cos(TIP) * Rin, y: C.y + Math.sin(TIP) * Rin };
  segs.push(seg(tip.x, tip.y, C.x + Math.cos(TIP) * (R - 0.1), C.y + Math.sin(TIP) * (R - 0.1),
    { kind: 'valve', e: 0.3, mu: 0.05 }));

  // ── the cups ──────────────────────────────────────────────────────────
  // Two walls and a floor, a sensor inside, and two guard nails over the mouth
  // exactly a pass apart — the nail a coin has to get past is the whole game.
  // A CHIMNEY is the cup's walls carried up above its mouth: a coin has to
  // come in steeply to get down it, and the POTTI's has a nail over it too.
  // Chimney tops, guards and the blocker are all placed a PASS from each
  // other, never nearer — anything nearer is a well a coin sits in.
  const cup = (id, pay, x, y, { w = CUP_W, chimney = 0 } = {}) => {
    pockets.push({ id, kind: 'cup', pay, x, y, w, depth: CUP_D, chimney, chute: x < -9 ? 'L' : x > 9 ? 'R' : 'C',
      open: true, flash: 0, hits: 0 });
    const top = y + chimney;
    segs.push(seg(x - w / 2, top, x - w / 2, y - CUP_D, { kind: 'cup', e: 0.25 }));
    segs.push(seg(x + w / 2, top, x + w / 2, y - CUP_D, { kind: 'cup', e: 0.25 }));
    segs.push(seg(x - w / 2, y - CUP_D, x + w / 2, y - CUP_D, { kind: 'cup', e: 0.1 }));
    if (!chimney) {
      const g = CLEAR / 2 + PIN_R + (mods.easyGuards ? 0.4 : 0);
      pin(x - g, y + 2.1, 'guard'); pin(x + g, y + 2.1, 'guard');
    }
    // the clown: a nail straight over the chimney, high enough that the gap to
    // each chimney top is a pass (centre to wall end: CLEAR + PIN_R)
    if (pay === 'clown') pin(x, top + Math.sqrt((CLEAR + PIN_R + 0.1) ** 2 - (w / 2) ** 2), 'blocker');
  };
  const CUPS = [
    ['clown', 'clown', 0, 58.5],
    ['starL', 'star', -19.5, 45.5], ['starR', 'star', 19.5, 45.5],
    ['innerL', 'inner', -9.6, 38.5], ['innerR', 'inner', 9.6, 38.5],
    ['midL', 'mid', -10.5, 26], ['midR', 'mid', 10.5, 26],
    ['lowL', 'low', -21, 17], ['lowR', 'low', 21, 17],
  ];
  const CHIMNEY = { clown: mods.lowChimney ? 1.5 : 3.6, star: 3.0 };
  for (const [id, pay, x, y] of CUPS) cup(id, pay, x, y, { chimney: CHIMNEY[pay] ?? 0 });

  // ── the kickers: ramps on both walls. The nails stop a pass short of each
  // wall (the wedge rule), which leaves a free lane down it; without these the
  // strongest shots rode the rail round and fell straight down the right wall
  // and the weakest down the guide, and neither touched a nail. ──
  const KICK = [];
  for (const y of [40, 27, 9.5]) {
    KICK.push([R, y + 2.6, R - 4.6, y]);            // right wall, sloping in and down
    KICK.push([-Rin, y + 2.6, -Rin + 4.6, y]);      // left side, off the guide
  }
  for (const [ax, ay, bx, by] of KICK) segs.push(seg(ax, ay, bx, by, { kind: 'kicker', e: 0.35, mu: 0.05 }));

  // ── the bottom: slots, not cups. The middle one gives the coin back. ──
  const SLOTS = [-30, -18, -3, 3, 18, 30];
  for (const x of SLOTS.slice(1, -1)) segs.push(seg(x, 0.2, x, 5.0, { kind: 'divider', e: 0.2 }));
  const slots = SLOTS.slice(0, -1).map((x0, i) => ({ x0, x1: SLOTS[i + 1], pay: i === 2 ? 'back' : null }));

  // ── the nails: an offset lattice, cleared around every cup ──
  const K = CLEAR + PIN_R + 0.2;
  const boxes = [];
  for (const [ax, ay, bx, by] of KICK) boxes.push([Math.min(ax, bx) - K, by - K, Math.max(ax, bx) + K, ay + K]);
  for (const p of pockets) boxes.push([p.x - p.w / 2 - K, p.y - p.depth - 1.2, p.x + p.w / 2 + K, p.y + p.chimney + 3.4]);
  const cleared = (x, y) => boxes.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
  const DX = 4.4, DY = 3.7;
  let row = 0;
  for (let y = 8.6; y < 76; y += DY, row++) {
    const off = row % 2 ? DX / 2 : 0;
    for (let x = -26.4 + off; x <= 27; x += DX) {
      const inCircle = y > C.y ? Math.hypot(x - C.x, y - C.y) < Rin - K : true;
      const inBody = x > -Rin + K && x < R - K;
      if (!inCircle || !inBody || cleared(x, y)) continue;
      // a FIXED pattern of missing nails gives the face routes rather than a sieve
      const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (h < 0.12) continue;
      pin(x, y, 'field');
    }
  }

  // THE WEDGE RULE, as one pass rather than a box per feature: a field nail
  // may not stand closer than a PASS to any other nail or to the end of any
  // wall, or a coin sits in the well between them. Every coin the first cut
  // had to fish out was sitting on a guard or the POTTI's blocker with a
  // lattice nail beside it.
  const PASS = CLEAR + 2 * PIN_R + 0.1;
  const fixed = pins.filter(p => p.tag !== 'field');
  const ends = segs.filter(g => g.kind !== 'rail' && g.kind !== 'guide')
    .flatMap(g => [[g.ax, g.ay], [g.bx, g.by]]);
  for (let i = pins.length - 1; i >= 0; i--) {
    const p = pins[i];
    if (p.tag !== 'field') continue;
    if (fixed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < PASS)
      || ends.some(([x, y]) => Math.hypot(x - p.x, y - p.y) < PASS - PIN_R)) pins.splice(i, 1);
  }

  const byId = Object.fromEntries(pockets.map(p => [p.id, p]));
  // no warp on a Pajatso: a sensor nothing can ever be inside
  const warp = { x0: 99, x1: 99, y0: 99, y1: 99, to: { x: 0, y: 0 } };
  const layout = { pins, segs, windmills: [], pockets, byId, warp, tip, Rin, slots, mods: { ...mods }, coinR: COIN_R };
  layout.grid = buildGrid(layout);
  return layout;
}

// where a coin that reached the bottom landed
export function slotAt(L, x) {
  return L.slots.find(s => x >= s.x0 && x < s.x1) ?? L.slots[x < 0 ? 0 : L.slots.length - 1];
}
