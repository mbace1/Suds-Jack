// The one in-page measurement both drift.cjs and normalise.cjs inject, so the
// checker and the fixer can never disagree about what "head width" means.
//
// Head width is the width of a connected blob in the top slice, not the
// longest ink run in any row of it. That much is a real improvement — a run
// measure counts a hand and a head on the same row as one 160px head.
//
// TWO LIMITS, BOTH MEASURED, NEITHER FIXED:
//
// 1. An ARM IS NOT A SEPARATE BLOB. It joins the head at the shoulder, and the
//    shoulder is inside the top 22% band, so a flung-out arm still merges. On
//    the hit/KO set this reads 86, 164, 84, 161, 83 — and narrowing the band
//    does not rescue it (measured at 0.08 / 0.10 / 0.12 / 0.16 / 0.22, the best
//    spread was 47.6%).
//
// 2. The deeper problem on a reaction clip is not the ruler at all: A HEAD
//    SNAPPED BACK OR LOLLING IS GENUINELY WIDER IN PROJECTION than a level
//    one. Head width is pose-invariant through a RUN, which is why it works
//    there; whiplash breaks that assumption by design. So drift.cjs takes
//    --no-scale, and a reaction clip is checked on its ground line only.
//
// A ponytail, a hat or a hood is attached to the head and so is part of the
// blob either way (~11% over a 12-frame cycle). That wants a different anchor
// entirely and is still open.
module.exports.MEASURE_SRC = `
function measure(d, W, H, slice) {
  let y0 = H, y1 = -1, x0 = W, x1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (d[(y * W + x) * 4 + 3] > 127) {
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
    }
  const ih = y1 - y0 + 1;
  const yEnd = Math.min(H, y0 + Math.round(ih * slice));

  // label connected components inside the head band only
  const lab = new Int32Array(W * (yEnd - y0)).fill(-1);
  const idx = (x, y) => (y - y0) * W + x;
  let next = 0; const area = [], bx0 = [], bx1 = [];
  const stack = [];
  for (let y = y0; y < yEnd; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] <= 127 || lab[idx(x, y)] !== -1) continue;
    const id = next++; area[id] = 0; bx0[id] = x; bx1[id] = x;
    stack.length = 0; stack.push(x, y); lab[idx(x, y)] = id;
    while (stack.length) {
      const cy = stack.pop(), cx = stack.pop();
      area[id]++; if (cx < bx0[id]) bx0[id] = cx; if (cx > bx1[id]) bx1[id] = cx;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= W || ny < y0 || ny >= yEnd) continue;
        if (d[(ny * W + nx) * 4 + 3] <= 127 || lab[idx(nx, ny)] !== -1) continue;
        lab[idx(nx, ny)] = id; stack.push(nx, ny);
      }
    }
  }
  let best = -1;
  for (let i = 0; i < next; i++) if (best < 0 || area[i] > area[best]) best = i;
  const headW = best < 0 ? 0 : bx1[best] - bx0[best] + 1;

  // foot line: centre of the ink on the bottom row
  let fx0 = W, fx1 = -1;
  for (let x = 0; x < W; x++) if (d[(y1 * W + x) * 4 + 3] > 127) { if (x < fx0) fx0 = x; if (x > fx1) fx1 = x; }
  return { headW, ih, iw: x1 - x0 + 1, x0, y0, x1, y1, footY: y1, footCx: (fx0 + fx1) / 2 };
}`;
