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
import { TransitLayers } from './transit-layers.js?v=11';
import { applySkin, TOKO_CYAN } from './skin.js?v=1';

const kxAt = lat => Math.cos(lat * Math.PI / 180);
const nearestIndex = (path, p) => { let bi = 0, bd = Infinity; for (let i = 0; i < path.length; i++) { const dy = path[i][0] - p.lat, dx = (path[i][1] - p.lon) * kxAt(p.lat), d = dy * dy + dx * dx; if (d < bd) { bd = d; bi = i; } } return bi; };

export class HopBoard {
  constructor(canvas, { pack, water, skin, net }) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.water = water; this.skin = skin; this.net = net;
    this.transit = new TransitLayers(pack); applySkin(this.transit, skin); this.transit.showAll();
    this.label = s => s;   // set to lang.js tr() once the language is known
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
    ctx.save(); ctx.fillStyle = skin.paper; ctx.fillRect(0, 0, W, H);
    this.drawWater(fit);
    const holdFam = halted ? (l => halted(l)) : null;
    this.transit.draw(ctx, W, H, { fit: (lat, lon) => fit(lat, lon), alpha: 0.96, lineWidth: 3.2 * d, casing: skin.paper, halted: holdFam });
    // the named places: white discs with an ink ring; the hop's ends and the drop are named
    ctx.lineWidth = 2 * d;
    for (const n of net.nodes.values()) { const p = fit(n.lat, n.lon); if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4.5 * d, 0, Math.PI * 2); ctx.fillStyle = skin.hub; ctx.fill(); ctx.strokeStyle = skin.hubRing; ctx.stroke(); }
    const named = new Map(labels ? [[from.id, from], ...(to ? [[to.id, to]] : []), ...(dn ? [[dn.id, dn]] : []), ...previews.map(p => [p.to, net.nodes.get(p.to)])] : []);
    // the offers: each hop's own path, heavy, in its line's ink (a walk dashed)
    for (const p of previews) { const pts = this.hopPath({ ...p, from: from.id }).map(([lat, lon]) => fit(lat, lon)), ink = p.kind === 'ride' ? (this.transit.layers.find(l => l.id === p.line?.sourceId)?.colour || '#52676d') : skin.label;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
      ctx.strokeStyle = skin.paper; ctx.lineWidth = 11 * d; ctx.stroke(); ctx.strokeStyle = ink; ctx.lineWidth = 7 * d; if (p.kind !== 'ride') ctx.setLineDash([7 * d, 6 * d]); ctx.stroke(); ctx.setLineDash([]);
      const e = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(e.x, e.y, 7 * d, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3.5 * d; ctx.strokeStyle = ink; ctx.stroke(); ctx.restore(); }
    // the drop: a pin in the parcel's colour
    if (dn) { const p = fit(dn.lat, dn.lon); ctx.beginPath(); ctx.arc(p.x, p.y, 11 * d, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3 * d; ctx.strokeStyle = destColour; ctx.stroke();
      ctx.fillStyle = skin.hubRing; ctx.beginPath(); ctx.roundRect(p.x - 4.5 * d, p.y - 4.5 * d, 9 * d, 9 * d, 1.5 * d); ctx.fill(); }
    ctx.font = `700 ${Math.round(12 * d)}px Inter, system-ui, sans-serif`; ctx.textBaseline = 'middle';
    for (const n of named.values()) { const p = fit(n.lat, n.lon), txt = this.label(n.name).toUpperCase(); ctx.lineWidth = 4 * d; ctx.strokeStyle = skin.halo; ctx.strokeText(txt, p.x + 14 * d, p.y - 12 * d); ctx.fillStyle = skin.label; ctx.fillText(txt, p.x + 14 * d, p.y - 12 * d); }
    // the courier, on the hop
    let pos = fit(from.lat, from.lon), ang = 0;
    if (hop) { const pts = this.hopPath(hop).map(([lat, lon]) => fit(lat, lon)); const r = alongPath(pts, t); pos = r.p; ang = r.a;
      if (hop.kind === 'walk') { ctx.save(); ctx.setLineDash([6 * d, 5 * d]); ctx.lineWidth = 2.4 * d; ctx.strokeStyle = skin.label; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.restore(); }
      else { // the pill under the disc, in the line's ink
        const layer = this.transit.layers.find(l => l.id === hop.line.sourceId), ink = layer?.colour || '#52676d';
        ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(ang); ctx.beginPath(); ctx.roundRect(-17 * d, -8 * d, 34 * d, 16 * d, 8 * d); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.roundRect(-15 * d, -6 * d, 30 * d, 12 * d, 6 * d); ctx.fillStyle = ink; ctx.fill(); ctx.restore(); } }
    drawCourier(ctx, pos.x, pos.y, d);
    ctx.restore();
  }
  hopPath(hop) {
    const a = this.net.nodes.get(hop.from), b = this.net.nodes.get(hop.to);
    if (hop.kind !== 'ride' || !hop.line) return [[a.lat, a.lon], [b.lat, b.lon]];
    const layer = this.transit.layers.find(l => l.id === hop.line.sourceId); if (!layer?.path?.length) return [[a.lat, a.lon], [b.lat, b.lon]];
    const i = nearestIndex(layer.path, a), j = nearestIndex(layer.path, b);
    const seg = i <= j ? layer.path.slice(i, j + 1) : layer.path.slice(j, i + 1).reverse();
    return seg.length >= 2 ? seg : [[a.lat, a.lon], [b.lat, b.lon]];
  }
  drawWater(fit) {
    const src = this.water; if (!src) return; const { ctx, skin } = this, d = this.d || 1;
    ctx.save(); ctx.fillStyle = skin.waterFill; ctx.strokeStyle = skin.water; ctx.lineWidth = 1.2 * d;
    for (const area of src.areas || []) { if (!area.shape?.length) continue; ctx.beginPath(); area.shape.forEach(([lat, lon], i) => { const p = fit(lat, lon); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // the sea is an open coastline with the water on its right: shaded outward
    // from the shore, the way the real-time board does it (core-v212 drawWater)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // one solid band (not the real-time board's three translucent ones, which
    // read as stripes at a hop's kilometre scale)
    for (const [off, w, a] of [[9, 18, 1]]) { ctx.strokeStyle = skin.waterFill; ctx.globalAlpha = a; ctx.lineWidth = w * d;
      for (const edge of src.edges || []) { const pts = (edge.shape || []).map(([lat, lon]) => fit(lat, lon)); if (pts.length < 2) continue; ctx.beginPath();
        for (let i = 0; i < pts.length; i++) { const a0 = pts[Math.max(0, i - 1)], b0 = pts[Math.min(pts.length - 1, i + 1)], dx = b0.x - a0.x, dy = b0.y - a0.y, len = Math.hypot(dx, dy) || 1;
          const x = pts[i].x + (dy / len) * off * d, y = pts[i].y - (dx / len) * off * d; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); } }
    ctx.restore();
  }
}

function alongPath(pts, t) {
  if (pts.length < 2) return { p: pts[0], a: 0 };
  const seg = []; let total = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(l); total += l; }
  let goal = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) { if (goal <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, goal / seg[i]) : 0, a = pts[i], b = pts[i + 1];
      return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, a: Math.atan2(b.y - a.y, b.x - a.x) }; } goal -= seg[i]; }
  return { p: pts[pts.length - 1], a: 0 };
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
