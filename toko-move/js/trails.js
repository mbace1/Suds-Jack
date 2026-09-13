// Toko Move v2.27 — VEHICLE TRAILS: which way a tram came from.
//
// The idea came from a canvas demo the owner sent: two paths, a dot running
// along each, and a background painted with `rgba(...,0.3)` instead of cleared,
// so the dots smear. The path-following half is already here and done properly —
// LiveNetwork interpolates real traced HSL geometry at real speeds — but the
// trail was worth having: direction is currently only readable from a badge, and
// a tram's badge does not say whether it is coming toward you or leaving.
//
// THE DEMO'S TECHNIQUE CANNOT BE USED HERE, and the reason is the whole design
// of this file. An alpha-overdraw trail fades everything on the canvas, and this
// board's ground — water, streets, districts, landmarks — is a cached bitmap
// blitted fresh every frame. Fading it would smear the map into mud, and not
// fading it would erase the trail on the next blit.
//
// So nothing accumulates in pixels. Each vehicle keeps a short history of where
// it WAS, in lat/lon, and the tail is re-projected every frame like everything
// else on the board. That is not a workaround; it is the only version that
// survives the camera. A pixel buffer would be wrong the instant you panned,
// and stale in a different way the instant you zoomed.
export const TRAIL_TICKS = 34;      // how far back a tail reaches, in ticks
const EVERY = 2;                    // sample every other tick — 17 points is plenty

export class Trails {
  constructor({ ticks = TRAIL_TICKS, every = EVERY } = {}) {
    this.ticks = ticks; this.every = every;
    this.paths = new Map();          // vehicle id -> [[tick, lat, lon], …]
  }

  // Sampled on the tick, not the frame: a 120 Hz screen must not remember more
  // of the city than a 30 Hz one.
  record(id, tick, lat, lon) {
    if (tick % this.every !== 0) return;
    let a = this.paths.get(id);
    if (!a) { a = []; this.paths.set(id, a); }
    if (a.length && a[a.length - 1][0] === tick) return;
    a.push([tick, lat, lon]);
    const cut = tick - this.ticks;
    while (a.length && a[0][0] < cut) a.shift();
  }

  // A vehicle that stops being drawn stops being remembered, or a filtered-out
  // fleet leaves ghosts behind it for as long as the tab is open.
  forget(seen) { for (const id of this.paths.keys()) if (!seen.has(id)) this.paths.delete(id); }

  // The tail tapers in width and fades in alpha toward the back, so the HEAD is
  // unambiguous: the fat, bright end is where the vehicle is going. A uniform
  // line would say "this tram is on this street", which the route already says.
  draw(ctx, project, dpr = 1) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // ADDITIVE, because a wake in the line's own colour laid on top of that
    // same line is invisible — which is what the first cut drew. The demo's
    // trail read against black; here it has to read against the route it is
    // running along, so it has to be BRIGHTER than that route rather than
    // merely present. `lighter` also means two trams meeting on a shared
    // corridor brighten each other, which is true and useful.
    ctx.globalCompositeOperation = 'lighter';
    for (const [, a] of this.paths) {
      if (a.length < 2) continue;
      const colour = a.colour || '#8aa';
      for (let i = 1; i < a.length; i++) {
        const k = i / (a.length - 1);              // 0 at the tail, 1 at the head
        const p = project(a[i - 1][1], a[i - 1][2]), q = project(a[i][1], a[i][2]);
        ctx.globalAlpha = 0.04 + 0.34 * k * k;     // squared, so the tail leaves quietly
        ctx.lineWidth = (1.1 + 3.4 * k) * dpr;
        ctx.strokeStyle = colour;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // One pass over the fleet: remember where everything visible is, forget the
  // rest, then draw. `filter` is the camera's near-rule, so a tram you are not
  // being shown does not leave a wake either.
  update(ctx, net, tick, project, dpr = 1, filter = null) {
    if (!ctx || !net) return 0;
    const seen = new Set();
    for (const v of net.vehicles) {
      if (!v.layer.visible) continue;
      const p = net.position(v, tick);
      if (!p) continue;
      if (filter && !filter(p.lat, p.lon, v.layer, v)) continue;
      seen.add(v.id);
      this.record(v.id, tick, p.lat, p.lon);
      const a = this.paths.get(v.id);
      if (a) a.colour = v.layer.colour;
    }
    this.forget(seen);
    this.draw(ctx, project, dpr);
    return seen.size;
  }
}
