// ── Dimetric 2D projection ───────────────────────────────────────────────────
// World axes:  s = lateral lane (─ right +),  f = forward route distance (up),
//              h = height for fake-3D extrusion.
// A sheared orthographic (parallel) projection — the classic Paperboy look:
// forward rolls UP the screen with a slight rightward lean, lateral goes
// down-right, height lifts straight up.  No perspective scaling.
export const LANE_W   = 30;   // px right per lane (s)
export const LANE_DY  = 14;   // px down per lane  (dimetric tilt)
export const FWD_DY   = 22;   // px up per forward unit (f)
export const FWD_DX   = 7;    // px right per forward unit (rightward lean)
export const H_DY     = 19;   // px up per height unit (h)

export const ORIGIN = { x: 0, y: 0 };
export function setOrigin(x, y) { ORIGIN.x = x; ORIGIN.y = y; }

// Project a world point to screen pixels given the current scroll.
// +s (right toward the road) goes up-right; +f (forward) goes up; +h lifts up.
export function P(s, f, h, scrollF) {
  const df = f - scrollF;
  return {
    x: ORIGIN.x + s * LANE_W + df * FWD_DX,
    y: ORIGIN.y - df * FWD_DY - s * LANE_DY - (h || 0) * H_DY,
  };
}

// Fill a polygon from an array of {x,y} points.
export function poly(ctx, pts, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

// Draw an extruded box (s0..s1, f0..f1, h0..h1) with flat front/side/top faces.
// Viewer is down-left, so the visible walls are the left side (s0) and the
// front (f0); draw side, then front, then top.
export function box(ctx, s0, s1, f0, f1, h0, h1, scrollF, c) {
  const A = P(s0, f0, h1, scrollF), B = P(s1, f0, h1, scrollF);
  const C = P(s1, f1, h1, scrollF), D = P(s0, f1, h1, scrollF);
  const a = P(s0, f0, h0, scrollF), b = P(s1, f0, h0, scrollF);
  const d = P(s0, f1, h0, scrollF);
  poly(ctx, [A, D, d, a], c.side);     // left side (s0 face)
  poly(ctx, [A, B, b, a], c.front);    // front (f0 face)
  poly(ctx, [A, B, C, D], c.top);      // top
}
