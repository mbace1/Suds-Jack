// THE STANDEE — a character drawn as a paper card standing in the world,
// not as a sprite being nudged around the screen.
//
// Owner, 2026-09-06: "we are trying to make actual Paper Mario looking
// puppets, those would give this a bit more dimension rather than moving
// sprites." The first cut of v35 leaned and squashed the plate in the
// picture plane, which is a moving sprite wearing a costume: nothing about
// it says the character is a physical object standing on the ground.
//
// A standee is that object. It has three properties a sprite does not:
//
//   1. THICKNESS. The card is extruded, so turning it shows an edge. That
//      edge is what the eye reads as "this is a thing", and it is why a
//      Paper Mario character resting at a slight angle looks like cardboard
//      rather than like a drawing.
//   2. YAW. It turns about its own vertical axis. The board's camera is
//      ORTHOGRAPHIC (render.js's 2:1 projection has no vanishing point), and
//      that is what makes this exact rather than faked: under an ortho
//      camera a yawed flat card foreshortens to `cos(yaw)` horizontally and
//      not at all vertically. No perspective warp, no column slicing, no
//      pre-rendered turn frames — one horizontal scale, and it is correct.
//   3. PITCH. It falls over about its feet, away from the camera, which is
//      the same `cos` on the other axis plus the top edge travelling along
//      the ground.
//
// So the whole vocabulary is two angles and a thickness, and the art it
// needs is ONE standing plate.
//
// The extrusion is drawn as the plate's own silhouette in a flat paper
// colour, offset by the card's thickness along the turn — cached per image,
// because filling a silhouette is a composite pass and this runs per unit
// per frame.

// Card thickness in board pixels, and it is DELIBERATELY EXAGGERATED. A real
// 3mm standee of a 1.8m figure is 0.17% of its height; at SPRITE_H 29 that is
// a twentieth of a pixel and the card may as well be a drawing. 3.0 is about
// a tenth of the figure's height — the same order of exaggeration the art
// already applies to its own outline, and the first value at which the cut
// edge survives the downscale and reads as thickness rather than as a stray
// dark pixel. Measured by looking, at the zoom the game actually ships at.
export const THICKNESS = 3.0;
// The angle a standee rests at. Zero is a card seen dead-on, which reads as
// a flat drawing pinned to the screen — every Paper Mario standee is turned
// a few degrees so its edge is doing some work.
export const REST_YAW = 0.42;

const silhouettes = new Map();

// The plate's own shape, filled flat. `destination-in` against the source
// keeps the alpha and throws away the colour, which is what makes this work
// for any plate without knowing anything about what is drawn on it.
function silhouetteOf(img, colour) {
  const key = `${img.src}|${colour}`;
  let c = silhouettes.get(key);
  if (c) return c;
  try {
    c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
  } catch { c = null; }
  silhouettes.set(key, c);
  return c;
}

export function clearSilhouettes() { silhouettes.clear(); }

// Draw one standee. `post` is anim.js's posture; everything else is the
// geometry render.js already worked out for the plate.
//
// Returns the y of the top of the drawn card, which is what the HP bar and
// the threat badge hang off.
export function drawStandee(ctx, entry, opts) {
  const { img, inkTop, inkBottom, inkLeft, inkRight } = entry;
  const {
    x, feetY, scale, mirror = false,
    yaw = 0, pitch = 0, lean = 0, hop = 0, squash = 0,
    edge = '#1b1b1f', edgeLit = '#3a3a42',
  } = opts;

  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  const cardH = (inkBottom - inkTop + 1) * scale;
  // The plate is padded; the card's own centre is its INK's centre, so a
  // figure drawn off-centre in its cell still turns about itself.
  const inkCx = (inkLeft + inkRight + 1) / 2 * scale;
  const drawX = -inkCx, drawY = -inkBottom * scale;

  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  // How far the card's top edge has travelled along the ground as it falls.
  // Screen-down, because the board's camera looks down at the floor: a card
  // going over lies DOWN the screen, into the scene.
  const fallY = Math.sin(pitch) * cardH * 0.62;

  ctx.save();
  ctx.translate(x, feetY - hop);
  if (lean) ctx.rotate(lean);
  // Pitch is a vertical foreshorten about the feet plus the top edge
  // travelling; both together are what make it read as falling AWAY rather
  // than as the picture being rotated.
  ctx.transform(1, 0, fallY / Math.max(1, cardH), cp, 0, 0);
  if (squash) ctx.scale(1 + squash, 1 - squash);
  // The turn. Mirroring is folded in here rather than applied separately, so
  // a character that is both facing left and mid-turn gets one transform.
  ctx.scale((mirror ? -1 : 1) * (cy || 0.001), 1);

  // THE EDGE, first, so the face lands on top of it. Offset opposite the
  // turn: the further the card is turned, the more of its thickness the
  // viewer is on the far side of. Two tones — the lit sliver reads as the
  // cut face catching the same light the board does.
  // Screen-space extrusion is THICKNESS * |sin(yaw)|; dividing by cos undoes
  // the yaw scale this is drawn inside, so the edge keeps that width on
  // screen however far the card is turned. A PITCHED card also shows the
  // extrusion as its top face, which is what makes a body on the floor read
  // as a board lying there rather than as a sprite that got small.
  const depth = (Math.abs(sy) * THICKNESS + Math.sin(pitch) * THICKNESS * 0.8)
    / Math.max(0.001, Math.abs(cy));
  if (depth > 0.05) {
    const dir = sy >= 0 ? 1 : -1;
    const sil = silhouetteOf(img, edge);
    const lit = silhouetteOf(img, edgeLit);
    if (sil) {
      const steps = Math.max(1, Math.min(4, Math.round(depth)));
      for (let i = steps; i >= 1; i--) {
        const t = depth * (i / steps);
        ctx.drawImage(i === 1 && lit ? lit : sil, drawX - dir * t, drawY, w, h);
      }
    }
  }
  ctx.drawImage(img, drawX, drawY, w, h);
  ctx.restore();

  return feetY - hop - cardH * cp;
}

// The card's footprint on the floor, for its shadow. A standing card throws
// a thin sliver; one lying down throws its whole length. Returned in board
// px as {w, h} so render.js can draw it with the same diamond helper it uses
// for everything else.
export function footprint(cardW, cardH, yaw, pitch, hop) {
  const air = Math.min(1, hop / 4);
  const w = cardW * Math.abs(Math.cos(yaw)) * (1 - air * 0.25);
  const h = (THICKNESS + Math.sin(pitch) * cardH * 0.55) * (1 - air * 0.25);
  return { w, h };
}
