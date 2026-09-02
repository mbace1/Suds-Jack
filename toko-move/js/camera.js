// Toko Move v2.19 — THE CAMERA.
//
// Why this file exists. The board is 4.9 km by 8.4 km of real Helsinki drawn at
// one fixed scale, and at that scale everything is the same size: a stop you are
// standing at, a stop you will never visit, and a hundred tram badges crossing
// the whole city at once. The owner's reading was exact — "the map is clutter
// with fast moving objects" — and the fix is not fewer trams. It is a camera:
// the thing that decides what is NEAR right now.
//
// Three scales, snapped (owner's direction: "snap to 3 scales is primary option,
// but pinch to zoom second"):
//
//   CITY   the whole board — where am I going, what does the network look like
//   ROUTE  ~4 km tall, so a 2 km radius around the courier fits — what can I catch
//   STOP   ~1.3 km tall — which platform, which direction, how far is the walk
//
// The camera owns NO drawing and NO canvas. It owns a centre, a zoom, and the
// arithmetic that turns the one board projection into a viewport — which is what
// lets every layer in the game (water, roads, lines, stops, vehicles, the walker,
// every hit test) keep calling the single published projection and stay in
// agreement about where a thing is. That agreement is the rule board.js was
// written to protect and this file must not break it.

export const M_PER_DEG = 111320;              // metres per degree of latitude

// A scale's span is the HEIGHT of the viewport in metres. Height, not width,
// because the board is portrait and the canvas is cut to the board's aspect —
// so height is the dimension that stays honest when the window changes shape.
export const SCALES = [
  { id: 'city',  label: 'CITY',  spanM: 0 },     // 0 = the whole board
  { id: 'route', label: 'ROUTE', spanM: 4000 },  // a 2 km radius fits inside it
  { id: 'stop',  label: 'STOP',  spanM: 1300 },
];

// The owner's number: "only trams that will pass by me, and in a circle of 2km
// map scale". It is a radius, and it is the fleet rule at CITY scale only —
// zoomed in, the viewport is already the filter and a second one would hide a
// tram you can see the track of.
export const FLEET_RADIUS_M = 2000;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const scaleById = id => SCALES.find(s => s.id === id) || SCALES[0];

// Metres between two lat/lon points, with longitude scaled by cos(lat). Without
// that correction a point matches roughly twice as far east-west as north-south
// at this latitude — the same trap approachingAt() in core already pays for.
export function metresBetween(aLat, aLon, bLat, bLon) {
  const kx = Math.cos(((aLat + bLat) * 0.5) * Math.PI / 180);
  return Math.hypot((aLat - bLat) * M_PER_DEG, (aLon - bLon) * kx * M_PER_DEG);
}

export class Camera {
  constructor(box) {
    this.box = box;
    this.cy = (box.n + box.s) / 2; this.cx = (box.e + box.w) / 2;  // where it is
    this.ty = this.cy; this.tx = this.cx;                          // where it is going
    this.zoom = 1; this.targetZoom = 1;
    this.scale = 'city';
    this.following = true;   // dropped by a drag, taken back by RECENTRE
    this.pinching = false;
  }

  heightM() { return (this.box.n - this.box.s) * M_PER_DEG; }
  widthM() {
    const kx = Math.cos(((this.box.n + this.box.s) * 0.5) * Math.PI / 180);
    return (this.box.e - this.box.w) * kx * M_PER_DEG;
  }

  // Zoom is a multiple of the CITY view, so 1 is always "the whole board" no
  // matter how the board box moves when an anchor is added. That is the same
  // derived-not-typed rule boardBox() follows.
  zoomFor(id) {
    const s = scaleById(id);
    if (!s.spanM) return 1;
    return clamp(this.heightM() / s.spanM, 1, this.maxZoom());
  }
  maxZoom() { return Math.max(1, this.heightM() / SCALES[SCALES.length - 1].spanM) * 1.35; }

  // Pinch lands between the notches, so the rail still has to say where you are.
  // Nearest in LOG space: zoom is multiplicative, and half way between ×1 and ×6
  // is ×2.4, not ×3.5.
  nearestScale(z = this.zoom) {
    let best = SCALES[0], bd = Infinity;
    for (const s of SCALES) {
      const d = Math.abs(Math.log(this.zoomFor(s.id)) - Math.log(clamp(z, 1, this.maxZoom())));
      if (d < bd) { bd = d; best = s; }
    }
    return best.id;
  }

  snapTo(id) { this.scale = id; this.targetZoom = this.zoomFor(id); this.following = true; return this; }
  cycle(dir = 1) {
    const i = SCALES.findIndex(s => s.id === this.nearestScale());
    return this.snapTo(SCALES[clamp(i + dir, 0, SCALES.length - 1)].id);
  }
  // Free zoom (wheel, pinch). It does not snap — snapping under a live pinch
  // fights the fingers — but it does rename the scale, so the rail never lies
  // about which band you are in.
  setZoom(z, immediate = false) {
    this.targetZoom = clamp(z, 1, this.maxZoom());
    if (immediate) this.zoom = this.targetZoom;
    this.scale = this.nearestScale(this.targetZoom);
    return this;
  }


  // Zoom about a POINT, not about the middle. A map that zooms to its own centre
  // walks whatever you were looking at off the screen, and then you pan back —
  // every time. Keeping the world point under the finger fixed is what makes a
  // pinch feel attached to the map rather than applied to it.
  zoomAbout(base, width, height, px, py, z) {
    const before = this.apply(base, width, height).invert(px, py);
    this.setZoom(z, true);
    const kx = Math.cos(((base.box.n + base.box.s) * 0.5) * Math.PI / 180);
    const bp = base(before.lat, before.lon);
    // where the base-space centre must sit for `before` to land back on (px,py)
    const cxPx = bp.x - (px - width / 2) / this.zoom;
    const cyPx = bp.y - (py - height / 2) / this.zoom;
    this.ty = this.cy = base.box.n - cyPx / base.scale;
    this.tx = this.cx = base.box.w + cxPx / (base.scale * kx);
    this.following = false;
    this.clampCentre(base, width, height);
    return this;
  }

  lookAt(lat, lon) { this.ty = lat; this.tx = lon; return this; }
  // A drag is the player saying "I want to look over there", so it takes the
  // camera off the courier until they ask for them back. Following through a
  // drag is the map fighting the hand.
  panBy(dLat, dLon) { this.ty += dLat; this.tx += dLon; this.following = false; return this; }
  recentre() { this.following = true; return this; }

  // Half the viewport in degrees, at a given canvas and base projection.
  halfSpan(base, width, height) {
    const b = base.box, kx = Math.cos(((b.n + b.s) * 0.5) * Math.PI / 180);
    const s = base.scale * this.zoom;
    return { lat: (height / 2) / s, lon: (width / 2) / (s * kx) };
  }

  // Keep the viewport over the board. Panning into empty ocean off the corner of
  // the projection is not a view of anything, and at CITY scale the whole board
  // is on screen anyway so the centre is pinned — which is why a pan at city
  // scale correctly does nothing rather than sliding the board out of frame.
  clampCentre(base, width, height) {
    const half = this.halfSpan(base, width, height), b = base.box;
    const midLat = (b.n + b.s) / 2, midLon = (b.e + b.w) / 2;
    const lat = (b.n - b.s) <= half.lat * 2 ? midLat : clamp(this.cy, b.s + half.lat, b.n - half.lat);
    const lon = (b.e - b.w) <= half.lon * 2 ? midLon : clamp(this.cx, b.w + half.lon, b.e - half.lon);
    this.cy = lat; this.cx = lon;
    this.ty = (b.n - b.s) <= half.lat * 2 ? midLat : clamp(this.ty, b.s + half.lat, b.n - half.lat);
    this.tx = (b.e - b.w) <= half.lon * 2 ? midLon : clamp(this.tx, b.w + half.lon, b.e - half.lon);
  }

  // One frame of motion. Frame-rate independent: an exponential approach, not a
  // fixed fraction per frame, or the camera drifts at a different speed on a
  // 120 Hz screen than on a 60 Hz one.
  step(dt, base, width, height, target = null) {
    // The dead zone is what makes it a CAMERA and not a cursor. Recentring on
    // every metre the courier moves turns the map into the thing that moves and
    // the courier into the thing that stands still, and then no landmark holds.
    if (target && this.following) {
      const half = this.halfSpan(base, width, height);
      const dz = { lat: half.lat * 0.42, lon: half.lon * 0.42 };
      if (Math.abs(target.lat - this.ty) > dz.lat || Math.abs(target.lon - this.tx) > dz.lon)
        this.lookAt(target.lat, target.lon);
    }
    const k = 1 - Math.exp(-Math.max(0, dt) / 150);
    this.cy += (this.ty - this.cy) * k;
    this.cx += (this.tx - this.cx) * k;
    this.zoom *= Math.pow(this.targetZoom / this.zoom, k);
    if (Math.abs(this.zoom - this.targetZoom) / this.targetZoom < 0.002) this.zoom = this.targetZoom;
    this.clampCentre(base, width, height);
    return this;
  }

  // THE projection. It takes board.js's boardFit — which is still the only thing
  // that knows how lat/lon becomes board pixels — and re-centres and scales it
  // about the canvas middle. Everything downstream keeps calling one function.
  apply(base, width, height) {
    const c = base(this.cy, this.cx), z = this.zoom, hw = width / 2, hh = height / 2;
    const project = (lat, lon) => { const p = base(lat, lon); return { x: (p.x - c.x) * z + hw, y: (p.y - c.y) * z + hh }; };
    project.box = base.box;
    project.scale = base.scale * z;      // pixels per degree of latitude, as drawn
    project.zoom = z;
    // Screen back to the world — for a drag, and for anything that has to ask
    // "what is under this pixel" in world terms rather than by testing every node.
    project.invert = (x, y) => {
      const kx = Math.cos(((base.box.n + base.box.s) * 0.5) * Math.PI / 180);
      const px = (x - hw) / z + c.x, py = (y - hh) / z + c.y;
      return { lat: base.box.n - py / base.scale, lon: base.box.w + px / (base.scale * kx) };
    };
    return project;
  }

  // Metres per drawn pixel — how a pixel drag becomes a real distance, and how a
  // layer decides whether it has room to say something.
  metresPerPixel(base) { return M_PER_DEG / (base.scale * this.zoom); }

  // WHAT IS NEAR. The owner's rule, in one place so the fleet, the labels and the
  // HUD count can never disagree about it.
  //
  // At CITY scale the map is the whole city and drawing every vehicle on it was
  // the clutter — so the fleet is cut to what is actually available to you: on a
  // line that passes where you are, and inside the 2 km circle. Zoomed in, the
  // viewport is the filter: everything in frame is drawn, because at that scale
  // an omitted tram is a lie about a street you can see.
  //
  // Note what this does NOT do: it never hides a LINE. The network's geometry
  // stays drawn in full at every scale, so the map still tells you the truth
  // about what exists — it only stops pretending you can catch all of it.
  fleetRule() { return this.nearestScale() === 'city' ? 'near' : 'viewport'; }
}
