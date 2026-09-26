// Toko Move — THE WALK FOLLOWS THE STREET (roadmap L4, v2.55).
//
// A walk between two stops was drawn as a straight line: the courier slid
// through blocks, across courtyards and once over the corner of a church. The
// walk's COST is a gameplay abstraction (hubs-walking.js says so and keeps
// saying so); where the figure is DRAWN does not have to be. The repo already
// carries real OpenStreetMap streets for the centre (cities/ground, ODbL), so
// the figure walks those: the shortest way along real streets from the street
// point nearest one stop to the one nearest the other, with the street the walk
// is named for preferred, because "walk Hämeentie" should look like Hämeentie.
//
// Three honest limits, each handled rather than hidden:
//   · the street extract covers the CENTRE only (60.17–60.20 / 24.93–24.98).
//     A walk with an end outside it has no streets to follow, and is drawn
//     straight, as before — never along an invented line;
//   · a stop more than SNAP m from any street stays straight for the same
//     reason: the path would begin somewhere the stop is not;
//   · a found path longer than DETOUR × the straight line is refused. The
//     extract is clipped to its box, so a street network can be disconnected at
//     the edge, and a figure walking round three sides of Kallio to cross one
//     block reads as a bug, not a street.
//
// Pure: no DOM, no clock, no fetch. test/walkpath.mjs holds it in bare node
// against the committed extract.
export const SNAP = 140, DETOUR = 1.9, NAMED = 0.55, BRIDGE = 25;
const SKIP = new Set(['service', 'track']);

export function metres(a, b) {
  const lat = (a[0] + b[0]) * 0.5 * Math.PI / 180;
  return Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos(lat));
}
const key = p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

// Every point of every walkable way is a vertex; consecutive points are edges.
// OSM ways meet at SHARED nodes, so identical coordinates join the network.
export function buildGraph(roads = []) {
  const pts = [], at = new Map(), adj = [];
  const vid = p => { const k = key(p); let i = at.get(k); if (i === undefined) { i = pts.length; at.set(k, i); pts.push([p[0], p[1]]); adj.push([]); } return i; };
  for (const r of roads) {
    if (SKIP.has(r.class)) continue;
    const sh = r.shape || [], name = String(r.name || '').toLowerCase();
    for (let i = 1; i < sh.length; i++) {
      const a = vid(sh[i - 1]), b = vid(sh[i]); if (a === b) continue;
      const m = metres(sh[i - 1], sh[i]);
      adj[a].push({ to: b, m, name }); adj[b].push({ to: a, m, name });
    }
  }
  // JUNCTIONS. The extract is simplified (streets-import.mjs rounds and thins
  // each way), and a T-junction's shared node is exactly what thinning drops:
  // built from shared points alone the centre came out as 455 separate pieces.
  // So a DEAD END — a way's loose end — within BRIDGE m of another street is
  // joined to it. Only loose ends: joining every near pair would walk the
  // figure through the gap between two parallel streets.
  const cell = 0.0003, grid = new Map(), ck = (la, lo) => `${Math.floor(la / cell)},${Math.floor(lo / cell)}`;
  pts.forEach((q, i) => { const k = ck(q[0], q[1]); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
  for (let i = 0; i < pts.length; i++) {
    if (adj[i].length !== 1) continue;
    const q = pts[i], cx = Math.floor(q[0] / cell), cy = Math.floor(q[1] / cell), own = adj[i][0].to;
    let best = -1, bd = BRIDGE;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${cx + dx},${cy + dy}`) || []) {
      if (j === i || j === own) continue; const d = metres(q, pts[j]); if (d < bd) { bd = d; best = j; } }
    if (best >= 0 && !adj[i].some(e => e.to === best)) { adj[i].push({ to: best, m: bd, name: '' }); adj[best].push({ to: i, m: bd, name: '' }); }
  }
  // Which piece of the network each point is on, so a stop is snapped to a
  // street that actually connects to the other end's street, not to a stub.
  const comp = new Int32Array(pts.length).fill(-1), size = [];
  for (let i = 0, c = 0; i < pts.length; i++) { if (comp[i] >= 0) continue; const st = [i]; comp[i] = c; let n = 0;
    while (st.length) { const x = st.pop(); n++; for (const e of adj[x]) if (comp[e.to] < 0) { comp[e.to] = c; st.push(e.to); } }
    size.push(n); c++; }
  return { pts, adj, comp, size };
}

// Every street point within SNAP of p, nearest first per network piece.
function near(g, p) {
  const by = new Map();
  for (let i = 0; i < g.pts.length; i++) { const d = metres(g.pts[i], p); if (d > SNAP) continue;
    const c = g.comp[i], cur = by.get(c); if (!cur || d < cur.d) by.set(c, { i, d }); }
  return by;
}

// The street the walk is named for, split on "/" — "Kaivokatu / Simonkatu" is
// two streets and walking either is walking the name.
const names = street => String(street || '').toLowerCase().split('/').map(s => s.trim()).filter(Boolean);

// A polyline [[lat, lon], ...] from `from` to `to`, or null when there is no
// honest street path (see the three limits above).
export function walkPath(g, from, to, street = '') {
  if (!g?.pts?.length || !from || !to) return null;
  const a = [from.lat, from.lon], b = [to.lat, to.lon];
  // Both ends on the same piece of network — the biggest piece they share.
  const na = near(g, a), nb = near(g, b);
  let piece = -1; for (const c of na.keys()) if (nb.has(c) && (piece < 0 || g.size[c] > g.size[piece])) piece = c;
  if (piece < 0) return null;
  const s = na.get(piece), t = nb.get(piece);
  const want = names(street), fav = n => want.some(w => n && (n.includes(w) || w.includes(n)));
  // Dijkstra over weighted metres; a small graph (≈ 20k vertices), a binary heap.
  const n = g.pts.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), heap = [];
  const push = (i, d) => { heap.push([d, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  dist[s.i] = 0; push(s.i, 0);
  while (heap.length) {
    const [d, i] = pop(); if (d > dist[i]) continue; if (i === t.i) break;
    for (const e of g.adj[i]) { const nd = d + e.m * (fav(e.name) ? NAMED : 1); if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = i; push(e.to, nd); } }
  }
  if (!Number.isFinite(dist[t.i])) return null;
  const mid = []; for (let i = t.i; i !== -1; i = prev[i]) mid.push(g.pts[i]); mid.reverse();
  const line = [a, ...mid, b];
  if (length(line) > DETOUR * Math.max(1, metres(a, b))) return null;
  return line;
}

export function length(line) { let m = 0; for (let i = 1; i < line.length; i++) m += metres(line[i - 1], line[i]); return m; }

// The point a fraction `f` of the way along the line, by distance walked.
export function pointAlong(line, f) {
  if (!line?.length) return null;
  const total = length(line), goal = Math.max(0, Math.min(1, f)) * total;
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    const seg = metres(line[i - 1], line[i]);
    if (run + seg >= goal) { const k = seg ? (goal - run) / seg : 0, p = line[i - 1], q = line[i]; return { lat: p[0] + (q[0] - p[0]) * k, lon: p[1] + (q[1] - p[1]) * k }; }
    run += seg;
  }
  const z = line[line.length - 1]; return { lat: z[0], lon: z[1] };
}
