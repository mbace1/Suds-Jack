// Toko Move v3 — THE BOARD BETWEEN MOMENTS (art bible §3; owner, 2026-11-02:
// the scenes are the main view, the board shows "where you are" between them).
//
// One canvas, drawn only while a hop plays: paper (or the night ink), the
// water, every real HSL line in its family's ink with the metro on top, the
// named places as white discs, and the courier — the Toko-cyan disc — riding
// its line's real geometry from one stop to the next, sitting on a pill in the
// line's colour (bible §6: "boarding is the courier disc snapping onto the
// pill"). A walk is an ink dash. The destination wears a pin in the parcel's
// colour so where the parcel is going reads before any word does. No route is
// drawn from here to there — the handover rule: the board shows the network,
// never the answer.
//
// The frame is the hop and the destination, padded, never tighter than about a
// kilometre, so a hop always shows enough city around it to be a place.
//
// v3.8 — POLISHED (owner, 2026-11-06: "the top down view can use some
// polish"). Measured off the trailer's board frames, it had three faults, and
// each one is fixed here with data the game already ships:
//   · THE SEA WAS A STROKE. Coastline is a line in OpenStreetMap, so the board
//     drew a band along it and a harbour read as blue tubes on paper. sea.js
//     solves the coastline into polygons; the sea is filled, with a lighter
//     shallows band along the shore and a hairline coast.
//   · THE LAND WAS EMPTY. The real streets (centre extract) and HSL's own
//     corridors beyond it — ground.js, the real-time board's ground, which the
//     journey never loaded — are a whisper under the lines, and the district
//     names sit on the land the way a map names its quarters.
//   · EVERY LINE WEIGHED THE SAME. The network is quieted to the background
//     and the hop's own line is drawn bold, inked solid behind the courier and
//     faint ahead, so the line you are riding is the one thing with weight.
// Plus the origami landmarks (landmarks.js) at their stops, and a pill big
// enough to carry the line's number.
//
// Everything that does not move during a hop is drawn ONCE into a base canvas
// and blitted each frame; a hop redraws only the line, the pill and the names.
// Where the ground data ends (the water and corridor packs stop at 24.995 E),
// the ground fades out instead of stopping at a ruled edge.
import { TransitLayers } from './transit-layers.js?v=11';
import { applySkin, TOKO_CYAN } from './skin.js?v=1';
import { seaRings, labelAt } from './sea.js?v=1';
import { landmarkPoints, drawLandmarks } from './landmarks.js?v=3';

const kxAt = lat => Math.cos(lat * Math.PI / 180);
const M_PER_DEG = 111320;
const nearestIndex = (path, p) => { let bi = 0, bd = Infinity; for (let i = 0; i < path.length; i++) { const dy = path[i][0] - p.lat, dx = (path[i][1] - p.lon) * kxAt(p.lat), d = dy * dy + dx * dx; if (d < bd) { bd = d; bi = i; } } return bi; };
const mix = (a, b, k) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };

export class HopBoard {
  constructor(canvas, { pack, water = null, skin, net, ground = null, detail = true }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.skin = skin; this.net = net; this.ground = ground; this.detail = detail;
    this.water = water || ground?.water || null;
    this.transit = new TransitLayers(pack); applySkin(this.transit, skin); this.transit.showAll();
    this.label = s => s;   // set to lang.js tr() once the language is known
    try { this.sea = this.water ? seaRings(this.water) : null; } catch { this.sea = null; }
    const resolved = {}; for (const n of net.nodes.values()) resolved[n.id] = n;
    this.marks = ground?.landmarks ? landmarkPoints(ground.landmarks, resolved) : [];
    this.streets = detail && ground ? [...ground.streetsFor('stop'), ...ground.corridorsFor('stop')] : [];
    this.base = null; this.baseKey = '';
  }
  resize() { const d = Math.min(2, globalThis.devicePixelRatio || 1), r = this.canvas.getBoundingClientRect();
    this.d = d; this.canvas.width = Math.max(1, Math.round(r.width * d)); this.canvas.height = Math.max(1, Math.round(r.height * d)); }
  // A projection that fits these points (with padding) into the canvas.
  frame(points, lift = true) {
    const W = this.canvas.width, H = this.canvas.height, lat0 = points.reduce((a, p) => a + p.lat, 0) / points.length, kx = kxAt(lat0);
    let s = Math.min(...points.map(p => p.lat)), n = Math.max(...points.map(p => p.lat)), w = Math.min(...points.map(p => p.lon)), e = Math.max(...points.map(p => p.lon));
    // names are written to the RIGHT of a place, so the frame sits a little
    // east of the points' middle and is padded wider than it is tall
    const minSpan = 0.011, cy = (s + n) / 2, cx = (w + e) / 2 + (e - w) * 0.12;
    let hLat = Math.max(minSpan, (n - s) * 1.8), hLon = Math.max(minSpan / kx, (e - w) * 2.2);
    // the frame's own shape
    if (hLon * kx / hLat < W / H) hLon = hLat * (W / H) / kx; else hLat = hLon * kx / (W / H);
    const sc = H / hLat, top = cy + hLat / 2, left = cx - hLon / 2;
    // the card covers the bottom of the screen: lift the frame so the hop sits above it
    const up = lift ? H * 0.12 : 0;
    this.fit = (lat, lon) => ({ x: (lon - left) * kx * sc, y: (top - lat) * sc - up });
    this.cam = { key: `${W}x${H}:${left.toFixed(6)}:${top.toFixed(6)}:${sc.toFixed(2)}:${up}`, sc };
    this.view = { n: top - up / sc, s: top - (H + up) / sc, w: left, e: left + W / (kx * sc) };
    return this.fit;
  }
  // Draw the hop at progress t (0..1). `hop` is journey.js's s.hop, or null for
  // a still frame of where the courier stands.
  // `previews` are hops on offer (the stop's card), drawn as their own paths so
  // a choice reads as WHERE it leaves you; `labels: false` is the corner inset.
  draw({ at, hop = null, t = 1, dest = null, destColour = '#233d4d', halted = null, previews = [], labels = true, lift = true }) {
    const { ctx, canvas, skin, net } = this, d = this.d || 1, W = canvas.width, H = canvas.height;
    const from = net.nodes.get(hop ? hop.from : at), to = hop ? net.nodes.get(hop.to) : null, dn = dest ? net.nodes.get(dest) : null;
    const fit = this.frame([from, to, dn, ...previews.map(p => net.nodes.get(p.to))].filter(Boolean), lift);
    // the lines in focus: the one being ridden, or the ones on offer
    const focus = new Set([hop?.line?.sourceId, ...previews.map(p => p.line?.sourceId)].filter(Boolean));
    const held = halted ? this.transit.layers.filter(l => halted(l)).map(l => l.id).join() : '';
    const named = new Map(labels ? [[from.id, from], ...(to ? [[to.id, to]] : []), ...(dn ? [[dn.id, dn]] : []), ...previews.map(p => [p.to, net.nodes.get(p.to)])] : []);
    const key = `${this.cam.key}|${skin.id}|${[...focus].join()}|${held}|${[...named.keys()].join()}`;
    if (key !== this.baseKey || !this.base) { const t0 = performance.now(); this.renderBase(fit, { focus, halted, named }); this.baseKey = key; this.baseMs = performance.now() - t0; }
    ctx.save(); ctx.clearRect(0, 0, W, H); ctx.drawImage(this.base, 0, 0);
    // the offers: each hop's own path, heavy, in its line's ink (a walk dashed)
    for (const p of previews) { const pts = this.hopPath({ ...p, from: from.id }).map(([lat, lon]) => fit(lat, lon)), ink = p.kind === 'ride' ? this.inkOf(p) : skin.label;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; trace(ctx, pts);
      ctx.strokeStyle = skin.paper; ctx.lineWidth = 11 * d; ctx.stroke(); ctx.strokeStyle = ink; ctx.lineWidth = 7 * d; if (p.kind !== 'ride') ctx.setLineDash([7 * d, 6 * d]); ctx.stroke(); ctx.setLineDash([]);
      const e = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(e.x, e.y, 7 * d, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3.5 * d; ctx.strokeStyle = ink; ctx.stroke(); ctx.restore(); }
    // the hop: solid behind the courier, faint ahead — the line you are on
    let pos = fit(from.lat, from.lon), ang = 0;
    if (hop) {
      const pts = this.hopPath(hop).map(([lat, lon]) => fit(lat, lon)), r = alongPath(pts, t); pos = r.p; ang = r.a;
      const done = [...pts.slice(0, r.i + 1), r.p], ink = hop.kind === 'walk' ? skin.label : this.inkOf(hop);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (hop.kind === 'walk') {
        ctx.setLineDash([2 * d, 7 * d]); ctx.lineWidth = 4.2 * d; ctx.globalAlpha = 0.32; ctx.strokeStyle = ink; trace(ctx, pts); ctx.stroke();
        ctx.globalAlpha = 1; trace(ctx, done); ctx.stroke(); ctx.setLineDash([]);
      } else {
        trace(ctx, pts); ctx.strokeStyle = skin.paper; ctx.lineWidth = 11 * d; ctx.stroke();
        ctx.globalAlpha = 0.38; ctx.strokeStyle = ink; ctx.lineWidth = 6.5 * d; ctx.stroke(); ctx.globalAlpha = 1;
        trace(ctx, done); ctx.lineWidth = 6.5 * d; ctx.stroke();
        // the hop's far stop, on the line
        const e = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(e.x, e.y, 6 * d, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3 * d; ctx.strokeStyle = ink; ctx.stroke();
      }
      ctx.restore();
    }
    // the drop: a pin in the parcel's colour, breathing while a hop plays
    if (dn) { const p = fit(dn.lat, dn.lon);
      if (hop) { const k = (performance.now() % 1600) / 1600; ctx.beginPath(); ctx.arc(p.x, p.y, (12 + 12 * k) * d, 0, Math.PI * 2); ctx.globalAlpha = 0.45 * (1 - k); ctx.lineWidth = 2.5 * d; ctx.strokeStyle = destColour; ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.beginPath(); ctx.arc(p.x, p.y, 11 * d, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3 * d; ctx.strokeStyle = destColour; ctx.stroke();
      ctx.fillStyle = skin.hubRing; ctx.beginPath(); ctx.roundRect(p.x - 4.5 * d, p.y - 4.5 * d, 9 * d, 9 * d, 1.5 * d); ctx.fill(); }
    ctx.font = `700 ${Math.round(12.5 * d)}px Inter, system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const n of named.values()) { const p = fit(n.lat, n.lon), txt = this.label(n.name).toUpperCase(); ctx.lineWidth = 5 * d; ctx.strokeStyle = skin.halo; ctx.strokeText(txt, p.x + 14 * d, p.y - 12 * d); ctx.fillStyle = skin.label; ctx.fillText(txt, p.x + 14 * d, p.y - 12 * d); }
    // the courier: on its line's pill (the number riding with it), or on foot
    if (hop && hop.kind !== 'walk') drawPill(ctx, pos.x, pos.y, ang, this.inkOf(hop), hop.line?.mode === 'metro' ? 'M' : (hop.line?.family || hop.line?.label || ''), d);
    drawCourier(ctx, pos.x, pos.y, d);
    ctx.restore();
  }
  inkOf(hop) { return this.transit.layers.find(l => l.id === hop.line?.sourceId)?.colour || '#52676d'; }
  // Everything that holds still for a hop, drawn once: paper, ground, water,
  // the quarters' names, the network (the hop's line in focus), the stops and
  // the landmarks.
  renderBase(fit, { focus, halted, named }) {
    const W = this.canvas.width, H = this.canvas.height, d = this.d || 1, skin = this.skin;
    if (!this.base) this.base = document.createElement('canvas');
    const b = this.base; b.width = W; b.height = H; const ctx = b.getContext('2d');
    ctx.fillStyle = skin.paper; ctx.fillRect(0, 0, W, H);
    // the ground (water and streets) on its own layer, so it can fade where the data ends
    const g = this.groundLayer || (this.groundLayer = document.createElement('canvas')); g.width = W; g.height = H; const gx = g.getContext('2d');
    this.drawWater(gx, fit);
    if (this.detail) this.drawStreets(gx, fit);
    this.fadeEdges(gx, fit, this.water?.boundingBox, 34 * d);
    ctx.drawImage(g, 0, 0);
    if (this.detail) this.drawDistricts(ctx, fit, named);
    // the network at half strength while a hop has a line in focus; the focused
    // line full. (transit-layers' own focus fades the rest to 28%, which is the
    // real-time board's emphasis and reads as a ghost at a hop's scale.)
    const hold = halted ? l => halted(l) : null;
    if (focus.size) {
      this.transit.draw(ctx, W, H, { fit, alpha: 0.5, lineWidth: 2.6 * d, casing: skin.paper, halted: hold, filter: l => !focus.has(l.id) });
      this.transit.draw(ctx, W, H, { fit, alpha: 0.96, lineWidth: 3.4 * d, casing: skin.paper, halted: hold, filter: l => focus.has(l.id) });
    } else this.transit.draw(ctx, W, H, { fit, alpha: 0.96, lineWidth: 3.2 * d, casing: skin.paper, halted: hold });
    // the named places: white discs with an ink ring
    ctx.lineWidth = 2 * d;
    for (const n of this.net.nodes.values()) { const p = fit(n.lat, n.lon); if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5 * d, 0, Math.PI * 2); ctx.fillStyle = skin.hub; ctx.fill(); ctx.strokeStyle = skin.hubRing; ctx.stroke(); }
    if (this.detail && this.marks.length) drawLandmarks(ctx, this.marks, fit, this.cam.sc / d / M_PER_DEG, d, { minPx: 30, maxPx: 80 });
  }
  hopPath(hop) {
    const a = this.net.nodes.get(hop.from), b = this.net.nodes.get(hop.to);
    if (hop.kind !== 'ride' || !hop.line) return [[a.lat, a.lon], [b.lat, b.lon]];
    const layer = this.transit.layers.find(l => l.id === hop.line.sourceId); if (!layer?.path?.length) return [[a.lat, a.lon], [b.lat, b.lon]];
    const i = nearestIndex(layer.path, a), j = nearestIndex(layer.path, b);
    const seg = i <= j ? layer.path.slice(i, j + 1) : layer.path.slice(j, i + 1).reverse();
    return seg.length >= 2 ? seg : [[a.lat, a.lon], [b.lat, b.lon]];
  }
  // The sea, filled (sea.js), lakes on top; then the shallows — a lighter band
  // inside the shore — and a hairline coast. Without a solved sea (a water
  // pack sea.js cannot close) it falls back to the old shaded band.
  drawWater(ctx, fit) {
    const src = this.water; if (!src) return; const skin = this.skin, d = this.d || 1;
    const path = new Path2D(), add = (pts, close) => { pts.forEach(([lat, lon], i) => { const p = fit(lat, lon); i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y); }); if (close) path.closePath(); };
    if (this.sea?.sea.length) for (const ring of [...this.sea.sea, ...this.sea.islands]) add(ring, true);
    const lakes = new Path2D(); for (const a of src.areas || []) if (a.shape?.length > 2) a.shape.forEach(([lat, lon], i) => { const p = fit(lat, lon); i ? lakes.lineTo(p.x, p.y) : lakes.moveTo(p.x, p.y); });
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (this.sea?.sea.length) { ctx.fillStyle = skin.waterFill; ctx.fill(path, 'evenodd'); }
    ctx.fillStyle = skin.waterFill; ctx.fill(lakes);
    const coast = new Path2D(); for (const e of src.edges || []) (e.shape || []).forEach(([lat, lon], i) => { const p = fit(lat, lon); i ? coast.lineTo(p.x, p.y) : coast.moveTo(p.x, p.y); });
    if (this.sea?.sea.length) {
      ctx.save(); ctx.clip(path, 'evenodd'); ctx.strokeStyle = mix(skin.waterFill, skin.paper, 0.38); ctx.lineWidth = 14 * d; ctx.stroke(coast); ctx.restore();
    } else { ctx.strokeStyle = skin.waterFill; ctx.lineWidth = 18 * d; ctx.stroke(coast); }
    ctx.strokeStyle = skin.waterEdge || skin.water; ctx.lineWidth = 1.3 * d; ctx.stroke(coast); ctx.stroke(lakes);
    ctx.restore();
  }
  // The streets, as a whisper: the real ones in the centre, HSL's corridors
  // beyond — ground.js keeps the two from drawing one street twice.
  drawStreets(ctx, fit) {
    const d = this.d || 1, road = this.skin.road || {}, W = this.canvas.width, H = this.canvas.height;
    const tiers = [['minor', 1.3], ['mid', 2.3], ['major', 3.4]];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [tier, w] of tiers) {
      const p = new Path2D(); let any = false;
      for (const r of this.streets) { if (r.tier !== tier) continue; const sh = r.shape || []; if (sh.length < 2) continue;
        const a = fit(sh[0][0], sh[0][1]), z = fit(sh[sh.length - 1][0], sh[sh.length - 1][1]);
        if (Math.max(a.x, z.x) < -200 || Math.min(a.x, z.x) > W + 200 || Math.max(a.y, z.y) < -200 || Math.min(a.y, z.y) > H + 200) continue;
        sh.forEach(([lat, lon], i) => { const q = fit(lat, lon); i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y); }); any = true; }
      if (!any) continue;
      ctx.strokeStyle = road[tier] || road.minor || '#e4dfd3'; ctx.lineWidth = w * d; ctx.stroke(p);
    }
    ctx.restore();
  }
  // The quarters' names, quiet and spaced, where they do not sit on a name
  // the hop needs or on each other.
  drawDistricts(ctx, fit, named) {
    const d = this.d || 1, W = this.canvas.width, H = this.canvas.height, list = this.ground?.districtsFor?.('stop') || [];
    const keep = [...named.values()].map(n => fit(n.lat, n.lon)), placed = [];
    ctx.save(); ctx.font = `600 ${Math.round(10 * d)}px Inter, system-ui, sans-serif`; ctx.letterSpacing = `${2.2 * d}px`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.skin.district || this.skin.labelDim; ctx.globalAlpha = 0.85;
    for (const q of list) { const at = labelAt(q); if (!at) continue; const p = fit(at[0], at[1]), txt = String(q.name).toUpperCase(), w = ctx.measureText(txt).width;
      if (p.x - w / 2 < 8 * d || p.x + w / 2 > W - 8 * d || p.y < 60 * d || p.y > H - 40 * d) continue;
      if (keep.some(k => Math.abs(k.x + 60 * d - p.x) < w / 2 + 70 * d && Math.abs(k.y - 12 * d - p.y) < 22 * d)) continue;
      if (placed.some(o => Math.abs(o.x - p.x) < (o.w + w) / 2 + 10 * d && Math.abs(o.y - p.y) < 22 * d)) continue;
      ctx.fillText(txt, p.x, p.y); placed.push({ x: p.x, y: p.y, w }); }
    ctx.restore();
  }
  // Where the data stops inside the frame, the ground fades rather than ending
  // on a ruled line (the water and corridor packs stop at 24.995 E).
  fadeEdges(ctx, fit, box, F) {
    if (!box) return; const W = this.canvas.width, H = this.canvas.height;
    const nw = fit(box.n, box.w), se = fit(box.s, box.e);
    ctx.save(); ctx.globalCompositeOperation = 'destination-out';
    const band = (x0, y0, x1, y1, rx, ry, rw, rh) => { if (rw <= 0 || rh <= 0) return; const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); };
    if (nw.y > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, nw.y); band(0, nw.y, 0, nw.y + F, 0, nw.y, W, F); }
    if (se.y < H) { ctx.fillStyle = '#000'; ctx.fillRect(0, se.y, W, H - se.y); band(0, se.y, 0, se.y - F, 0, se.y - F, W, F); }
    if (nw.x > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, nw.x, H); band(nw.x, 0, nw.x + F, 0, nw.x, 0, F, H); }
    if (se.x < W) { ctx.fillStyle = '#000'; ctx.fillRect(se.x, 0, W - se.x, H); band(se.x, 0, se.x - F, 0, se.x - F, 0, F, H); }
    ctx.restore();
  }
}

const trace = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); };

function alongPath(pts, t) {
  if (pts.length < 2) return { p: pts[0], a: 0, i: 0 };
  const seg = []; let total = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); total += l; }
  let goal = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) { if (goal <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, goal / seg[i]) : 0, a = pts[i], b = pts[i + 1];
      return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, a: Math.atan2(b.y - a.y, b.x - a.x), i }; } goal -= seg[i]; }
  return { p: pts[pts.length - 1], a: 0, i: pts.length - 1 };
}

// The pill (bible §6): the vehicle, in its line's ink, lying along the line,
// with the line's number on its tail so the courier on its nose never covers it.
function drawPill(ctx, x, y, ang, ink, label, d) {
  const L = 52 * d, R = 12 * d, back = Math.cos(ang) < 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = 'rgba(15,20,24,.18)'; ctx.beginPath(); ctx.roundRect(-L + 12 * d, -R + 3 * d, L, 2 * R, R); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-L + 12 * d - 2 * d, -R - 2 * d, L + 4 * d, 2 * R + 4 * d, R + 2 * d); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-L + 12 * d, -R, L, 2 * R, R); ctx.fillStyle = ink; ctx.fill();
  if (label) { ctx.translate(-L / 2 - 2 * d, 0); if (back) ctx.rotate(Math.PI);
    ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(13 * d)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0.5 * d); }
  ctx.restore();
}

// The courier (art bible §3): Toko cyan, a white ring, a white parcel, an ink
// edge and a soft shadow — the only cyan-filled thing on the board.
export function drawCourier(ctx, x, y, d = 1) {
  const r = 10 * d; ctx.save();
  ctx.fillStyle = 'rgba(15,20,24,.22)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.95, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r + 1.6 * d, 0, Math.PI * 2); ctx.fillStyle = '#15262b'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r - 2.6 * d, 0, Math.PI * 2); ctx.fillStyle = TOKO_CYAN; ctx.fill();
  const s = r * 0.78; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(x - s / 2, y - s / 2, s, s, 1.6 * d); ctx.fill();
  ctx.restore();
}
