// Toko Move v2.21 — LANDMARKS, drawn as low-poly origami.
//
// Owner's direction: "bigger spots like the white church can look a bit like a
// low poly origami, mostly grey night version map colors though."
//
// Origami, taken as a technical instruction rather than a mood: a folded paper
// model has FLAT FACES and HARD CREASES, and it is read entirely by which face
// catches the light. So every shape here is a handful of filled polygons in
// three greys, lit from the same direction for all six buildings — no gradient,
// no outline, no shading inside a face. If a form is not legible as flat panels
// it is not drawn; the silhouette has to do the work, which is the same rule the
// arcade's own covers follow for a Master System sprite.
//
// WHAT THESE ARE NOT. They are map SYMBOLS. The pack says so at length and it
// matters: nothing here is a building footprint, the positions are authored
// offsets from real stops, and the credit line must never hand OpenStreetMap
// the blame for them. A symbol that marks the cathedral at roughly the right
// spot is honest; the same shape presented as geometry is not.
import { M_PER_DEG } from './camera.js?v=1';

// Lit from the north-west, every building, always. One light is what makes a
// pile of flat panels read as a solid — two would read as two drawings.
// The three values are far apart on purpose. A first cut kept them within a
// step of each other and the buildings came out as grey blobs with a tower on
// top: origami has no outline, so the CREASE IS THE VALUE CHANGE, and if two
// faces are nearly the same grey there is no fold between them.
const INK = {
  lit:    '#d3dbe1',   // the face turned to the light
  mid:    '#79848c',   // the face turned away
  dark:   '#414a52',   // ground-side and undercut
  pale:   '#f2f6f8',   // the white church, and only the white church
  paleMid:'#9fabb3',
};

// A landmark is sized in METRES and clamped in PIXELS. True scale alone would
// make a cathedral eight pixels wide at route scale — a mark you cannot read is
// not a landmark — and a fixed pixel size would make it an icon that never
// becomes a building. Clamped, it is a symbol far out and a shape up close.
const MIN_PX = 15, MAX_PX = 96;

export function landmarkPoints(pack, resolved) {
  const out = [];
  for (const l of pack?.landmarks || []) {
    const a = resolved?.[l.anchor];
    if (!a) continue;                       // an anchor that is not in the pack is simply not drawn
    const kx = Math.cos(a.lat * Math.PI / 180);
    out.push({ ...l,
      lat: a.lat + (l.offset?.n || 0) / M_PER_DEG,
      lon: a.lon + (l.offset?.e || 0) / (M_PER_DEG * kx) });
  }
  return out;
}

const poly = (ctx, fill, pts) => {
  ctx.fillStyle = fill; ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
};

// ---------------------------------------------------------------- the forms
//
// Each takes (ctx, x, y, s, ink) where (x,y) is where the building meets the
// ground and s is its width in pixels. Heights are multiples of s, so a shape
// keeps its proportions at every zoom.

function box(ctx, x, y, w, h, ink, skew = 0.28) {
  const d = w * skew;
  poly(ctx, ink.mid, [[x - w / 2, y], [x - w / 2, y - h], [x + w / 2 - d, y - h], [x + w / 2 - d, y]]);   // face
  poly(ctx, ink.dark, [[x + w / 2 - d, y], [x + w / 2 - d, y - h], [x + w / 2, y - h - d * .5], [x + w / 2, y - d * .5]]); // return
  poly(ctx, ink.lit, [[x - w / 2, y - h], [x + w / 2 - d, y - h], [x + w / 2, y - h - d * .5], [x - w / 2 + d, y - h - d * .5]]); // top
}

// A dome, folded rather than drawn. The first cut was two long facets meeting at
// a point r*1.72 up, which is a CONE — the cathedral came out as a spike, and
// the two small domes beside it as tent pegs. A dome's whole character is the
// shoulder: it leaves the drum almost vertically, turns hard, and arrives flat.
// So the profile is four folds a side, apex at r*1.3, and the lantern is a
// separate little drum standing on top of it rather than the tip of the cone.
const DOME = [[1, 0], [.94, .5], [.66, .95], [.3, 1.22], [0, 1.3]];   // [x/r, y/r], right half
function dome(ctx, x, y, r, ink) {
  const right = DOME.map(([dx, dy]) => [x + dx * r, y - dy * r]);
  const left = DOME.map(([dx, dy]) => [x - dx * r, y - dy * r]).reverse();
  poly(ctx, ink.mid, [[x, y], ...left, [x, y - r * 1.3]]);
  poly(ctx, ink.lit, [[x, y], [x, y - r * 1.3], ...right.reverse()]);
  const lr = r * .17, ly = y - r * 1.3;
  poly(ctx, ink.mid, [[x - lr, ly], [x - lr, ly - r * .3], [x + lr, ly - r * .3], [x + lr, ly]]);
  poly(ctx, ink.lit, [[x - lr * 1.5, ly - r * .3], [x, ly - r * .62], [x + lr * 1.5, ly - r * .3]]);
}

function spire(ctx, x, y, w, h, ink) {
  poly(ctx, ink.mid, [[x - w / 2, y], [x, y - h], [x, y]]);
  poly(ctx, ink.lit, [[x, y], [x, y - h], [x + w / 2, y]]);
}

const FORMS = {
  // The white church: a stepped plinth, a body, one big dome and four small.
  // It is drawn PALE because it is the white church, and being the lightest
  // thing on a grey board is the whole of why anyone navigates by it.
  domedChurch(ctx, x, y, s, ink) {
    poly(ctx, ink.dark, [[x - s * .62, y], [x + s * .62, y], [x + s * .5, y - s * .1], [x - s * .5, y - s * .1]]);
    box(ctx, x, y - s * .1, s * .86, s * .42, ink, .22);
    for (const dx of [-.34, .34]) dome(ctx, x + s * dx, y - s * .52, s * .13, ink);
    dome(ctx, x, y - s * .58, s * .27, ink);
  },
  onionChurch(ctx, x, y, s, ink) {
    box(ctx, x, y, s * .74, s * .38, ink, .24);
    dome(ctx, x, y - s * .38, s * .22, ink);
    for (const dx of [-.3, .3]) dome(ctx, x + s * dx, y - s * .34, s * .1, ink);
  },
  // Kallio: one tall shoulder and a spire — a church you find by looking up.
  towerChurch(ctx, x, y, s, ink) {
    box(ctx, x - s * .22, y, s * .5, s * .3, ink, .2);
    box(ctx, x + s * .22, y, s * .34, s * .92, ink, .22);
    spire(ctx, x + s * .22, y - s * .92, s * .34, s * .4, ink);
  },
  clockTower(ctx, x, y, s, ink) {
    box(ctx, x, y, s * .9, s * .34, ink, .22);
    box(ctx, x + s * .34, y, s * .26, s * .86, ink, .2);
    poly(ctx, ink.lit, [[x + s * .21, y - s * .86], [x + s * .47, y - s * .86], [x + s * .34, y - s * 1.02]]);
  },
  hall(ctx, x, y, s, ink) {
    box(ctx, x, y, s * .95, s * .3, ink, .26);
    box(ctx, x - s * .18, y - s * .3, s * .42, s * .22, ink, .2);
  },
  // A terminal is a long low shed with a gantry — the shape you actually see
  // from the water, and nothing like the churches, which is the point.
  terminal(ctx, x, y, s, ink) {
    box(ctx, x, y, s, s * .22, ink, .3);
    poly(ctx, ink.dark, [[x + s * .18, y - s * .22], [x + s * .22, y - s * .22], [x + s * .22, y - s * .52], [x + s * .18, y - s * .52]]);
    poly(ctx, ink.lit, [[x + s * .1, y - s * .52], [x + s * .46, y - s * .52], [x + s * .46, y - s * .46], [x + s * .1, y - s * .46]]);
  },
};

// Drawn from the ground up and back to front — a building nearer the bottom of
// the board is nearer the viewer, so it draws last and overlaps the one behind.
export function drawLandmarks(ctx, points, project, pxPerMetre, dpr = 1, opts = {}) {
  const { minPx = MIN_PX, maxPx = MAX_PX } = opts;
  let drawn = 0;
  const placed = points.map(l => ({ l, p: project(l.lat, l.lon) })).sort((a, b) => a.p.y - b.p.y);
  ctx.save();
  for (const { l, p } of placed) {
    const form = FORMS[l.kind]; if (!form) continue;
    const s = Math.max(minPx, Math.min(maxPx, (l.metres || 50) * pxPerMetre)) * dpr;
    const ink = l.pale ? { ...INK, lit: INK.pale, mid: INK.paleMid } : INK;
    form(ctx, p.x, p.y, s, ink);
    drawn++;
  }
  ctx.restore();
  return drawn;
}

export { INK as LANDMARK_INK, FORMS as LANDMARK_FORMS };
