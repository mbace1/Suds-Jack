// Toko Move v3.9 — WHAT YOU WALK PAST (owner, 2026-11-06: "lots more art and
// scenarios in these styles").
//
// A card dealt on foot plays over the board mid-walk, and until now the board
// said nothing about it: a reindeer on Mannerheimintie was a line of text over a
// map. Each walking card now puts a small picture beside the courier — a white
// card with an ink edge and a tail to the courier, the board's own bubble — in
// the bible's flat register: a handful of filled shapes, no gradient, no
// outline inside a form, the palette's inks. The stop's cards get their actors
// in the scene (make_actors.py); these are the same idea at the board's scale.
//
// Pure canvas: drawVignette(ctx, id, x, y, d) draws at the courier's (x, y) in
// device pixels and returns whether there was a picture for that card.
const INK = '#15262b', PAPER = '#fffdf7', RULE = '#c5cec8';

const box = (c, x, y, w, h, r, fill) => { c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
const disc = (c, x, y, rx, ry, fill) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
const poly = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
const line = (c, pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
// a tiny person: legs, a body, a head (no face, like every person in the game)
const figure = (c, x, y, s, jacket, skin = '#e8b996', legs = '#3e4a52') => {
  box(c, x - 3 * s, y - 9 * s, 2.6 * s, 9 * s, 1.2 * s, legs); box(c, x + 0.4 * s, y - 9 * s, 2.6 * s, 9 * s, 1.2 * s, legs);
  box(c, x - 4 * s, y - 19 * s, 8 * s, 11 * s, 3 * s, jacket); disc(c, x, y - 22.5 * s, 3.4 * s, 3.6 * s, skin);
};

// Each draws into a 64×64 box whose top-left is (0, 0); `s` is the scale.
const PICTURES = {
  reindeer: (c, s) => {                      // in the middle of Mannerheimintie
    box(c, 0, 44 * s, 64 * s, 12 * s, 0, '#d6d2c6'); for (const x of [6, 26, 46]) box(c, x * s, 49 * s, 10 * s, 2 * s, 1, PAPER);
    for (const [x, sh] of [[20, '#6b4a33'], [26, '#8a6346'], [40, '#6b4a33'], [46, '#8a6346']]) box(c, x * s, 30 * s, 3.2 * s, 18 * s, 1.4 * s, sh);
    disc(c, 33 * s, 30 * s, 16 * s, 8 * s, '#8a6346'); disc(c, 48 * s, 20 * s, 5.5 * s, 4.5 * s, '#8a6346'); disc(c, 53 * s, 22 * s, 3 * s, 2.4 * s, '#6b4a33');
    disc(c, 30 * s, 25 * s, 9 * s, 3 * s, '#efe6d4');                                  // the pale back of the neck
    line(c, [[46 * s, 16 * s], [42 * s, 6 * s], [37 * s, 3 * s]], 1.8 * s, '#5b3a2a'); line(c, [[43 * s, 9 * s], [47 * s, 4 * s]], 1.6 * s, '#5b3a2a');
    line(c, [[50 * s, 16 * s], [54 * s, 6 * s], [59 * s, 4 * s]], 1.8 * s, '#5b3a2a'); line(c, [[53 * s, 9 * s], [50 * s, 4 * s]], 1.6 * s, '#5b3a2a');
  },
  sofa: (c, s) => {                          // students in overalls, a sofa down Aleksanterinkatu
    figure(c, 10 * s, 60 * s, 1.75 * s, '#c4372f'); figure(c, 54 * s, 60 * s, 1.75 * s, '#c4372f');   // their heads above it, carrying at the waist
    box(c, 8 * s, 30 * s, 48 * s, 12 * s, 3 * s, '#2c9c77'); box(c, 8 * s, 36 * s, 8 * s, 12 * s, 3 * s, '#237a5d'); box(c, 48 * s, 36 * s, 8 * s, 12 * s, 3 * s, '#237a5d');
    box(c, 15 * s, 38 * s, 34 * s, 8 * s, 3 * s, '#3fb58e');
  },
  iceswim: (c, s) => {                       // a hole in the ice, and a man in it, steaming
    disc(c, 32 * s, 46 * s, 30 * s, 13 * s, '#e9f2f4'); disc(c, 32 * s, 46 * s, 18 * s, 7 * s, '#4f8fa8'); disc(c, 32 * s, 44 * s, 5 * s, 5.4 * s, '#e8b996');
    for (const [x, y, r] of [[26, 30, 4.5], [34, 22, 5.5], [28, 13, 4]]) disc(c, x * s, y * s, r * s, r * 0.8 * s, '#dfe6e8');
  },
  karaoke: (c, s) => {                       // a door opens, a song comes out at you
    box(c, 6 * s, 10 * s, 30 * s, 48 * s, 2 * s, '#2b3238'); box(c, 10 * s, 14 * s, 22 * s, 44 * s, 1 * s, '#ffcc00'); figure(c, 21 * s, 58 * s, 1.5 * s, '#bd61c8');
    for (const [x, y] of [[44, 26], [54, 16]]) { disc(c, x * s, y * s, 3.6 * s, 3 * s, INK); line(c, [[(x + 3) * s, y * s], [(x + 3) * s, (y - 11) * s], [(x + 7) * s, (y - 9) * s]], 1.8 * s, INK); }
  },
  roadworks: (c, s) => {                     // dug up since 2019
    disc(c, 32 * s, 52 * s, 28 * s, 7 * s, '#b9a88a'); disc(c, 30 * s, 50 * s, 14 * s, 6 * s, '#8a7a5f');
    box(c, 4 * s, 24 * s, 40 * s, 8 * s, 1 * s, '#ffffff'); for (let i = 0; i < 4; i++) poly(c, [[(6 + i * 10) * s, 32 * s], [(11 + i * 10) * s, 24 * s], [(15 + i * 10) * s, 24 * s], [(10 + i * 10) * s, 32 * s]], '#e2683c');
    box(c, 8 * s, 32 * s, 3 * s, 16 * s, 1, '#69777a'); box(c, 37 * s, 32 * s, 3 * s, 16 * s, 1, '#69777a');
    poly(c, [[50 * s, 50 * s], [62 * s, 50 * s], [57 * s, 24 * s], [55 * s, 24 * s]], '#e2683c'); box(c, 52 * s, 36 * s, 8 * s, 4 * s, 1, '#ffffff');
  },
  fence: (c, s) => {                         // the gap everyone uses
    box(c, 0, 52 * s, 64 * s, 4 * s, 0, '#d6d2c6');
    for (let x = 4; x < 62; x += 7) if (x < 26 || x > 38) box(c, x * s, 18 * s, 3.4 * s, 36 * s, 1, '#69777a');
    box(c, 0, 24 * s, 24 * s, 2.4 * s, 0, '#69777a'); box(c, 40 * s, 24 * s, 24 * s, 2.4 * s, 0, '#69777a');
    for (const [x, y] of [[30, 58], [34, 50], [30, 42]]) disc(c, x * s, y * s, 2 * s, 1.2 * s, '#8a7a5f');
  },
  fog: (c, s) => {                           // the harbour cranes, heard and not seen
    line(c, [[18 * s, 56 * s], [18 * s, 14 * s], [52 * s, 14 * s]], 3 * s, '#b8c2c6'); line(c, [[18 * s, 22 * s], [30 * s, 14 * s]], 2 * s, '#b8c2c6'); line(c, [[46 * s, 14 * s], [46 * s, 30 * s]], 1.4 * s, '#b8c2c6');
    for (const [y, a] of [[26, .9], [38, .95], [50, .9]]) { c.globalAlpha = a; box(c, 2 * s, y * s, 60 * s, 9 * s, 4.5 * s, '#e9edee'); } c.globalAlpha = 1;
  },
  slip: (c, s) => {                          // black ice, and a pensioner who is fine
    disc(c, 32 * s, 52 * s, 28 * s, 8 * s, '#cfe3ea'); line(c, [[18 * s, 50 * s], [30 * s, 54 * s]], 1.4 * s, PAPER); line(c, [[38 * s, 48 * s], [48 * s, 52 * s]], 1.4 * s, PAPER);
    figure(c, 34 * s, 52 * s, 1.8 * s, '#7d5a8a', '#f1cfb0', '#3e4a52'); line(c, [[41 * s, 33 * s], [45 * s, 51 * s]], 1.6 * s, '#5b3a2a');
    disc(c, 34 * s, 10 * s, 4 * s, 2.6 * s, '#9aa3a6');
  },
  wet: (c, s) => {                           // rain finds the gap in your bag
    box(c, 13 * s, 25 * s, 38 * s, 30 * s, 4 * s, RULE); box(c, 14 * s, 26 * s, 36 * s, 28 * s, 3 * s, '#ffffff'); box(c, 29 * s, 26 * s, 5 * s, 28 * s, 0, INK);
    for (const [x, y] of [[12, 10], [26, 4], [40, 12], [54, 6], [48, 20], [20, 18]]) { poly(c, [[x * s, (y - 4) * s], [(x + 3) * s, (y + 2) * s], [(x - 3) * s, (y + 2) * s]], '#3e8ecc'); disc(c, x * s, (y + 2) * s, 3 * s, 3 * s, '#3e8ecc'); }
    disc(c, 22 * s, 44 * s, 6 * s, 4 * s, '#c9e4e8');
  },
};
export const VIGNETTES = Object.keys(PICTURES);

// The bubble: a white card above and to the LEFT of the courier, its tail to
// the courier — the board writes every place's name to its right, so the left
// is where a name is not — flipped right only if it would leave the canvas.
export function drawVignette(ctx, id, x, y, d = 1) {
  const pic = PICTURES[id]; if (!pic) return false;
  const W = ctx.canvas.width, size = 74 * d, s = size / 64 * 0.86, pad = (size - 64 * s) / 2;
  const left = x - 18 * d - size >= 6 * d, bx = left ? x - 18 * d - size : x + 18 * d, by = Math.max(6 * d, y - 24 * d - size);
  ctx.save();
  ctx.fillStyle = 'rgba(15,20,24,.16)'; ctx.beginPath(); ctx.roundRect(bx + 2 * d, by + 4 * d, size, size, 14 * d); ctx.fill();
  const tx = left ? bx + size - 16 * d : bx + 16 * d;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(tx - 7 * d, by + size - 2 * d); ctx.lineTo(x + (left ? -6 : 6) * d, y - 8 * d); ctx.lineTo(tx + 7 * d, by + size - 2 * d); ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx - 2 * d, by - 2 * d, size + 4 * d, size + 4 * d, 15 * d); ctx.fill();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.roundRect(bx, by, size, size, 13 * d); ctx.fill();
  ctx.beginPath(); ctx.roundRect(bx, by, size, size, 13 * d); ctx.clip();
  ctx.translate(bx + pad, by + pad); pic(ctx, s);
  ctx.restore();
  return true;
}
