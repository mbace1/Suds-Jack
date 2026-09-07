// ── the encounter plate, seated on the board ───────────────────────
// Owner, 2026-09-03, two blue lines drawn across a phone screenshot of
// backlot marking the courtyard's near corner: "blue lines show where the
// grid should start."
//
// The grid ended well above them, and the cause was not the grid. The photo
// was `background: cover center` on #stage and the board was flex-centred in
// the same box, so both were centred and NEITHER was placed against the
// other — and the courtyard's paving is not in the middle of its own
// picture (its centre sits at 54%/68%, well below and right of the image
// centre, because the plate is mostly building). Two independent centrings
// cannot align two things; one of them has to be positioned FROM the other.
//
// So each plate declares its own floor quad — the flat ground a fight
// actually happens on — as fractions of the image, measured off the picture
// rather than guessed:
//   cx, cy  the floor's centre
//   halfH   half its height, top vertex to near vertex
//   halfW   half its width; not used for placement, kept because it is the
//           number that says WHY the grid cannot simply fill the yard (see
//           below), and the gate reads it.
// fitPlate() then scales the picture so its floor half-height equals the
// board diamond's half-height and puts the two centres on top of each other.
// The near vertex of the grid lands on the near vertex of the paving, which
// is exactly where the blue lines were drawn.
//
// WHY THE GRID STILL DOES NOT FILL THE YARD SIDE TO SIDE, and why more
// columns cannot fix it: a board's bounding diamond is ALWAYS 2:1, whatever
// its dimensions, because a tile is 32x16 and the box works out to
// (cols+rows-2)*16 by (cols+rows-2)*8. Adding columns adds tiles; it does
// not change that ratio. The courtyard's paving is 2.78:1 and the schoolyard
// asphalt 1.92:1. Matching the height (which is what puts the near corner
// where it was asked for) therefore leaves a strip of paving either side on
// the courtyard — a yard slightly wider than the fight in it, which is how a
// yard looks — and matching the width instead would push the board's top and
// bottom vertices up into the buildings.
export const PLATES = {
  //                    image px      floor centre        floor half-extents
  'courtyard.jpg':  { w: 1100, h: 619, cx: 0.541, cy: 0.676, halfW: 0.388, halfH: 0.248 },
  'schoolyard.jpg': { w: 1100, h: 733, cx: 0.484, cy: 0.539, halfW: 0.384, halfH: 0.300 },
};
