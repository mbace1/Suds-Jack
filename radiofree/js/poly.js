// Radio Free Helsinki — a very small flat-shaded 3D renderer.
//
// The B-roll is meant to read as FOOTAGE, not as another vector graphic: a
// camera moving through a low-poly Helsinki, cut into the package between the
// anchor and the charts. That needs actual 3D — a hand-drawn fake would not
// hold up against a graphic panel sitting one cut away from it.
//
// Painter's algorithm on convex polygons, which is all the geometry here needs:
// no mesh intersects another, so sorting by depth and filling back-to-front is
// exact rather than approximate. No z-buffer, no clipper — polygons that reach
// behind the near plane are dropped whole, and scenes keep their geometry in
// front of the camera so nothing pops in view.

// world → camera → screen. `cam` is {x, y, z, yaw, f}.
function view(p, cam) {
  const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
  const c = Math.cos(-cam.yaw), s = Math.sin(-cam.yaw);
  return [dx * c - dz * s, dy, dx * s + dz * c];
}

const NEAR = 0.35;

// `cam.hz` puts the horizon somewhere other than halfway down the frame — the
// renderer has no pitch, and it does not need one: sliding the vanishing point
// is what a news camera on a tripod actually does, and it decides how much of
// the shot is sky. Without it a 128×152 portrait frame is half empty grey.
export function project(p, cam, w, h) {
  const v = view(p, cam);
  if (v[2] < NEAR) return null;
  const hz = cam.hz !== undefined ? cam.hz * h : h / 2;
  return [w / 2 + (v[0] / v[2]) * cam.f, hz - (v[1] / v[2]) * cam.f, v[2]];
}

// fill a convex polygon by scanlines. Points are already projected.
function fill(scr, pts, color) {
  let top = Infinity, bot = -Infinity;
  for (const p of pts) { if (p[1] < top) top = p[1]; if (p[1] > bot) bot = p[1]; }
  top = Math.max(0, Math.floor(top));
  bot = Math.min(scr.h - 1, Math.ceil(bot));
  for (let y = top; y <= bot; y++) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        const x = a[0] + (b[0] - a[0]) * t;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    if (lo > hi) continue;
    const x0 = Math.max(0, Math.round(lo));
    const x1 = Math.min(scr.w - 1, Math.round(hi));
    if (x1 >= x0) scr.px(x0, y, x1 - x0 + 1, 1, color);
  }
}

// the light the whole city is lit by: a low northern sun, over the shoulder
const LIGHT = (() => {
  const v = [0.4, 0.78, -0.48];
  const m = Math.hypot(...v);
  return v.map(c => c / m);
})();

// how hard a face is lit, 0..1 — used to pick a step out of a colour ramp so
// the shading stays banded and hard-edged like the rest of the app
export function lambert(pts) {
  const [a, b, c] = pts;
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const m = Math.hypot(...n) || 1;
  const d = (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / m;
  return Math.min(1, Math.max(0, Math.abs(d)));
}

// Draw a list of {pts, ramp} faces. `ramp` is dark→light; the face picks its
// step from how it faces the sun, so a box reads as a box without any outline.
export function render(scr, faces, cam) {
  const drawable = [];
  for (const f of faces) {
    const sp = [];
    let ok = true, depth = 0;
    for (const p of f.pts) {
      const q = project(p, cam, scr.w, scr.h);
      if (!q) { ok = false; break; }
      sp.push(q);
      depth += q[2];
    }
    if (!ok || sp.length < 3) continue;
    depth /= sp.length;
    const ramp = f.ramp;
    const k = f.flat !== undefined ? f.flat : lambert(f.pts);
    const color = ramp[Math.min(ramp.length - 1, Math.floor(k * ramp.length))];
    drawable.push({ sp, color, depth });
  }
  drawable.sort((a, b) => b.depth - a.depth);          // far first
  for (const d of drawable) fill(scr, d.sp, d.color);
}

// a box, as six faces — the workhorse for buildings, benches, containers
export function box(x, y, z, w, h, d, ramp) {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
  return [
    { pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], ramp },   // top
    { pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], ramp },   // -z
    { pts: [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], ramp },   // +z
    { pts: [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]], ramp },   // -x
    { pts: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], ramp },   // +x
  ];
}
