// Toko Move v3.12 — THE MOMENTS (owner's art pack, PR #632, approved
// 2026-11-07: "Perfect all approved"; art/sunny-open-perspectives/).
//
// Four illustrations of the job itself, each cut for both formats from one
// master: the parcel handed over at a kiosk hatch, the delivery at a doorway,
// the parcel shown to a cyclist at the steps, and the orange metro at an open
// platform. They stand full frame at the beats they draw, under the panel
// those beats already have:
//   · a job is TAKEN — the kiosk (the pickup)
//   · a job is DELIVERED — the doorway or the cyclist, picked by the drop
//     itself, so the same drop is always the same picture
//   · a METRO is boarded at Kalasatama — the platform. The pack draws the
//     outdoor metro, and of the game's 23 places only Kalasatama has one
//     (README: "Outdoor metro only Kalasatama/east in game scope")
// The pack is sunny only, so the night shift keeps its own stop.
//
// `face` is the courier's face in each crop (the push-in's origin), measured
// from the pack's compositor (sources/compose.py) and its crop boxes
// (crop-metadata.json, which test/moments.mjs holds this table to); the
// cyclist scene shows the courier from behind, so its origin is the parcel.
// `keep` is the point a cropped screen holds in view, when it is not the face.
// Pure: no DOM.
export const MOMENTS = {
  kiosk:   { at: [377, 319], crop: { '169': [0, 200, 1024, 776], '916': [260, 0, 836, 1024] } },
  doorway: { at: [528, 180], keep: [528, 330], crop: { '169': [0, 64, 1024, 640], '916': [240, 0, 816, 1024] } },
  cyclist: { at: [470, 560], keep: [760, 520], crop: { '169': [0, 152, 1024, 728], '916': [272, 0, 848, 1024] } },
  metro:   { at: [434, 597], keep: [633, 597], crop: { '169': [0, 248, 1024, 824], '916': [380, 0, 956, 1024] } },
};
// where a point of the master lands in a format's crop, as fractions
export const faceIn = (id, fmt, key = 'at') => { const m = MOMENTS[id], [x0, y0, x1, y1] = m.crop[fmt], p = m[key] || m.at;
  return [+((p[0] - x0) / (x1 - x0)).toFixed(3), +((p[1] - y0) / (y1 - y0)).toFixed(3)]; };
// what a cropped screen keeps in view: the face, unless the scene says otherwise
// (the cyclist's portrait has the courier's back at one edge and her face at the
// other; a phone keeps her face and the parcel, and loses some of his back;
// sideways, the doorway keeps the courier's middle, so the parcel he carries
// is not on the frame's edge; the metro's portrait keeps the courier at its
// edge and the cab's front, not the courier alone)
export const keepIn = (id, fmt) => faceIn(id, fmt, 'keep');

const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export const pickupMoment = night => (night ? null : 'kiosk');
export const deliveryMoment = (d, night) => (night || !d ? null : ['doorway', 'cyclist'][hash(`${d.to}|${d.contents}`) % 2]);
export const metroMoment = (hop, night) => (!night && hop?.kind === 'ride' && hop.model === 'metro' && hop.from === 'kalasatama' ? 'metro' : null);
