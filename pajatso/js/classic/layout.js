// THE PAJATSO FACE, after the owner's photographs of a real one (a Finnish
// 1 mk machine on an orange bar wall, 2026-09-27). What the photos settled:
//
//   - the winning places are a ROW OF WINDOWS across the top of the face, each
//     with its payout printed under it: R · 1:00 · 1:50 · 1:50 · 7:00 · 1:50 ·
//     1:50 · 1:00 · R. The 7:00 in the middle is the POTTI.
//   - below them a grey band, red V deflectors, and then the thing everybody
//     remembers: COLUMNS OF COINS behind chrome dividers, the machine's own
//     money, stacked where you can see it. A coin that misses every window
//     falls down there and joins the pile.
//   - the POTTI opens the three middle columns. So the jackpot is BIGGER the more the
//     machine has eaten, and you can see exactly how big before you pull.
//
// Pure: a layout in the shape `Board` in ../board.js steps, so the rail, the
// valve, the knife-edge tip and the wedge rule are the physics the pachinko
// board was tuned with. The coin is BIG, 2.5 bu across on a 60 bu face.

import { BOARD, seg, arc, buildGrid } from '../board.js?v=4';

const deg = d => d * Math.PI / 180;

export const FACE = {
  COIN_R: 1.25,
  SCALE: 1.25,                 // the coin's radius over BOARD.COIN_R
  LANE: 3.0,
  PIN_R: 0.4,
  // a gap a coin falls through clears its diameter by 12%; nothing on this
  // face is narrower than that and wider than nothing (no wells)
  CLEAR: 2.8,
  // the spring: the weakest pull just gets past the guide, the strongest rides
  // the rail round and down the right side
  V_MIN: 104, V_MAX: 121,
  // the windows: a coin wide and a bit, a pitch that leaves a PASS between
  WIN_W: 2.9, POTTI_W: 2.66, TULIP_W: 3.8, WIN_D: 3.0, WIN_Y: 52, PITCH: 6.0, MID: 1.5,
  // the pot: thirteen columns behind chrome dividers
  COLS: 13, COL_X0: -27, COL_X1: 30, COL_TOP: 30, STACK: 1.9, COL_MAX: 15,
};

// What each window pays, in markka for the 1 mk coin it took. `R` gives the
// coin back. The POTTI pays its 7:00 AND the three middle columns of the pot.
export const PAYS = { R: 1, one: 1, half: 1.5, potti: 7 };
export const LABEL = { R: 'R', one: '1:00', half: '1:50', potti: '7:00', x3: '×3' };
export const JACKPOT = 'potti';
export const WINDOWS = ['R', 'one', 'half', 'half', 'potti', 'half', 'half', 'one', 'R'];
// the pot a machine is hung on the wall with: a hump, highest where the V
// deflectors send the most coins, the way the photographs show it
export const POT_START = [3, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 3];

// The roguelike (KUOPPA) bolts parts onto this face and bends it with charms;
// both arrive as `mods`, and with no mods this is exactly the base machine.
//   parts: ['chucker', 'tulips', 'fever', 'windmills', 'chain', 'multiplier']
//   openPotti, winWiden (bu), rubberPins, wideTulips
export const CHUCKER = { x: 1.5, y: 66.2, w: 2.9, depth: 2.6 };
export const MILLS = [[-13.5, 64.6], [16.5, 64.6]];
export const TULIPS = [1, 7];            // the two 1:00 windows
export const TIMES3 = [0, 8];            // the two R windows
export const ATTACKER = { x0: 3.8, x1: 29.6, y: 44.4 };

export function buildPajatso(mods = {}) {
  const { C, R } = BOARD;
  const { LANE, PIN_R, CLEAR, WIN_D, WIN_Y, PITCH, MID, COIN_R } = FACE;
  const WIN_W = FACE.WIN_W + (mods.winWiden ?? 0);
  const parts = new Set(mods.parts ?? []);
  const pins = [], segs = [], pockets = [], windmills = [];
  const pinE = mods.rubberPins ? 0.7 : 0.5;
  const pin = (x, y, tag) => pins.push({ x, y, r: PIN_R, e: pinE, tag: tag ?? null });
  const RAIL = { kind: 'rail', e: 0.1, mu: 0.012 };

  // the rail: over the top and down both sides
  segs.push(...arc(C.x, C.y, R, deg(-4), deg(180), 72, RAIL));
  const sideLow = 4.5;
  segs.push(seg(-R, C.y, -R, sideLow, RAIL));
  const rx = Math.cos(deg(-4)) * R, ry = C.y + Math.sin(deg(-4)) * R;
  segs.push(seg(rx, ry, R - 0.05, 0.2, { kind: 'wall', e: 0.3 }));

  // the lane: up the left, round to the upper left, where the guide lets go
  const Rin = R - LANE;
  const TIP = deg(142);
  segs.push(seg(-Rin, sideLow, -Rin, C.y, { ...RAIL, kind: 'guide' }));
  segs.push(...arc(C.x, C.y, Rin, deg(180), TIP, 22, { ...RAIL, kind: 'guide' }));
  segs.push(seg(-R, sideLow, -Rin, sideLow, { kind: 'lanefloor', e: 0.1 }));
  const tip = { x: C.x + Math.cos(TIP) * Rin, y: C.y + Math.sin(TIP) * Rin };
  segs.push(seg(tip.x, tip.y, C.x + Math.cos(TIP) * (R - 0.1), C.y + Math.sin(TIP) * (R - 0.1),
    { kind: 'valve', e: 0.3, mu: 0.05 }));

  // ── the windows: two walls and a floor each, open at the top. The wall
  // tops are knife edges (board.js tips a coin balanced on one), and the air
  // between two windows is a PASS, so a coin that misses falls on down. ──
  WINDOWS.forEach((base, i) => {
    const pay = parts.has('multiplier') && TIMES3.includes(i) ? 'x3' : base;
    const x = MID + (i - 4) * PITCH, w = pay === JACKPOT ? FACE.POTTI_W : WIN_W;
    const id = `w${i}`;
    const tulip = parts.has('tulips') && TULIPS.includes(i);
    pockets.push({ id, kind: tulip ? 'tulip' : 'cup', pay, x, y: WIN_Y, w, depth: WIN_D, chimney: 0, chute: x < -9 ? 'L' : x > 9 ? 'R' : 'C',
      open: tulip ? !!mods.wideTulips : true, alwaysOpen: tulip && !!mods.wideTulips, narrow: w, flash: 0, hits: 0, window: i, tulip });
    if (tulip) {
      // a TULIP: shut, it is an ordinary window; hit, its two petals swing out
      // and catch wider, and the next coin in shuts it again. Only the wall
      // set matching the state collides (board.js `when`).
      const T = FACE.TULIP_W;
      for (const s of [-1, 1]) {
        segs.push(seg(x + s * w / 2, WIN_Y - 0.7, x + s * w / 2, WIN_Y - WIN_D, { kind: 'window', e: 0.25 }));
        segs.push(seg(x + s * w / 2, WIN_Y, x + s * w / 2, WIN_Y - 0.7, { kind: 'petal', e: 0.25, pocket: id, when: 'closed' }));
        segs.push(seg(x + s * T / 2, WIN_Y + 1.1, x + s * w / 2, WIN_Y - 0.7, { kind: 'petal', e: 0.2, pocket: id, when: 'open' }));
      }
    } else {
      segs.push(seg(x - w / 2, WIN_Y, x - w / 2, WIN_Y - WIN_D, { kind: 'window', e: 0.25 }));
      segs.push(seg(x + w / 2, WIN_Y, x + w / 2, WIN_Y - WIN_D, { kind: 'window', e: 0.25 }));
    }
    segs.push(seg(x - w / 2, WIN_Y - WIN_D, x + w / 2, WIN_Y - WIN_D, { kind: 'window', e: 0.1 }));
    // the POTTI is guarded: a nail straight over its mouth, high enough that
    // the gap to each wall top is a pass (centre to wall end CLEAR + PIN_R)
    if (pay === JACKPOT && !mods.openPotti) pin(x, WIN_Y + Math.sqrt((CLEAR + PIN_R + 0.1) ** 2 - (w / 2) ** 2), 'guard');
  });

  // ── the START CHUCKER (a part): a cup in the middle of the nails that pays
  // nothing itself and spins the reels. Two life nails over its mouth a pass
  // apart, the way v2's cups were guarded. ──
  if (parts.has('chucker')) {
    const { x, y, w, depth } = CHUCKER;
    pockets.push({ id: 'start', kind: 'cup', pay: 'start', x, y, w, depth, chimney: 0, chute: 'C', open: true, flash: 0, hits: 0 });
    segs.push(seg(x - w / 2, y, x - w / 2, y - depth, { kind: 'window', e: 0.25 }));
    segs.push(seg(x + w / 2, y, x + w / 2, y - depth, { kind: 'window', e: 0.25 }));
    segs.push(seg(x - w / 2, y - depth, x + w / 2, y - depth, { kind: 'window', e: 0.1 }));
    const g = CLEAR / 2 + PIN_R;
    pin(x - g, y + 2.1, 'life'); pin(x + g, y + 2.1, 'life');
  }
  // ── the ATTACKER (a part, FEVER's gate): the space under the right half of
  // the window row. Shut, it is nothing; open (FEVER), every coin that misses
  // the windows on the right falls through it and is paid. ──
  if (parts.has('fever')) {
    const { x0, x1, y } = ATTACKER;
    pockets.push({ id: 'attacker', kind: 'attacker', pay: 'attacker', x: (x0 + x1) / 2, y, w: x1 - x0, depth: 2.2, chimney: 0, chute: 'R', open: false, flash: 0, hits: 0 });
  }
  // ── WINDMILLS (a part): free-spinning deflectors either side of the chucker ──
  if (parts.has('windmills')) for (const [x, y] of MILLS) windmills.push({ x, y, r: 1.7, w: 0, a: 0 });

  // ── the kickers: a ramp off the right wall above the windows, so a coin
  // that rides the rail all the way round is thrown back over the row rather
  // than dropping down the gap by the wall every time ──
  const KICK = [[R * Math.cos(deg(22)), C.y + R * Math.sin(deg(22)), 24.2, 58.4], [29.0, 58.5, 24.8, 55.6]];
  for (const [ax, ay, bx, by] of KICK) segs.push(seg(ax, ay, bx, by, { kind: 'kicker', e: 0.35, mu: 0.05 }));

  // ── the red V: two long plates under the grey band that run coins in toward
  // the middle columns — which is why the pot is a hump ──
  const V = [[-24, 43.5, -5.2, 35.5], [27.5, 43.5, 8.2, 35.5]];
  for (const [ax, ay, bx, by] of V) segs.push(seg(ax, ay, bx, by, { kind: 'deflector', e: 0.25, mu: 0.08 }));

  // ── the pot: thirteen columns. A coin that gets into one is the machine's.
  // A column is a pocket that pays nothing: `pot` in the pocket says which. ──
  const { COLS, COL_X0, COL_X1, COL_TOP } = FACE;
  const cw = (COL_X1 - COL_X0) / COLS;
  const columns = [];
  for (let k = 0; k < COLS; k++) {
    const x0 = COL_X0 + k * cw, x1 = x0 + cw;
    columns.push({ k, x0, x1, x: (x0 + x1) / 2 });
    if (k > 0) segs.push(seg(x0, 0.2, x0, COL_TOP, { kind: 'divider', e: 0.2 }));
    pockets.push({ id: `c${k}`, kind: 'cup', pay: null, pot: k, x: (x0 + x1) / 2, y: COL_TOP, w: cw - 0.2, depth: COL_TOP - 0.4,
      chimney: 0, chute: 'C', open: true, flash: 0, hits: 0 });
  }

  // ── the nails: a sparse, staggered field in the red above the windows, so
  // one pull is a neighbourhood of windows and never a single one ──
  const PASS = CLEAR + 2 * PIN_R + 0.1;
  const DX = 5.2, DY = 3.8;
  let row = 0;
  for (let y = 57.6; y < 76; y += DY, row++) {
    const off = row % 2 ? DX / 2 : 0;
    for (let x = -24 + off; x <= 27; x += DX) {
      if (Math.hypot(x - C.x, y - C.y) > Rin - PASS) continue;
      if (x < -Rin + PASS || x > R - PASS) continue;
      const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (h < 0.1) continue;
      pin(x, y, 'field');
    }
  }
  // THE WEDGE RULE as one pass: no field nail nearer than a pass to another
  // nail or to the end of any wall
  const fixed = pins.filter(p => p.tag !== 'field');
  for (let i = pins.length - 1; i >= 0; i--) {
    const p = pins[i];
    if (p.tag === 'field' && windmills.some(w => Math.hypot(w.x - p.x, w.y - p.y) < w.r + PIN_R + CLEAR + 0.1)) pins.splice(i, 1);
  }
  const ends = segs.filter(g => g.kind !== 'rail' && g.kind !== 'guide')
    .flatMap(g => [[g.ax, g.ay], [g.bx, g.by]]);
  for (let i = pins.length - 1; i >= 0; i--) {
    const p = pins[i];
    if (p.tag !== 'field') continue;
    if (fixed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < PASS)
      || ends.some(([x, y]) => Math.hypot(x - p.x, y - p.y) < PASS - PIN_R)) pins.splice(i, 1);
  }

  const byId = Object.fromEntries(pockets.map(p => [p.id, p]));
  const warp = { x0: 99, x1: 99, y0: 99, y1: 99, to: { x: 0, y: 0 } };
  const layout = { pins, segs, windmills, pockets, byId, warp, tip, Rin, columns, mods: { ...mods }, coinR: COIN_R };
  layout.grid = buildGrid(layout);
  return layout;
}

// which column a coin at x falls into
export function columnAt(L, x) {
  const c = L.columns.find(c => x >= c.x0 && x < c.x1);
  return c ? c.k : x < 0 ? 0 : L.columns.length - 1;
}
export const MIDDLE = Math.floor(FACE.COLS / 2);
// the columns the POTTI opens: the middle three, where the V sends the most
export const POTTI_COLS = [MIDDLE - 1, MIDDLE, MIDDLE + 1];
