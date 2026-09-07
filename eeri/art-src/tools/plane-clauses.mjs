// EERI — the shared PROMPT CLAUSES for flat library art.
//
// Same reason `keylib.js` exists: these had been written out three times by
// hand, and each rewrite was a chance to drop the one clause that was load
// bearing. Every sentence in here was paid for by a re-roll.
//
// THE WORLD IS FLAT. There is no expanded 3D ground area — the environment is
// flat planes and a prop meets the world at a single ground LINE, with no
// floor extending back in z. So a piece photographed from anywhere above its
// own middle brings a floor with it and the level cannot honour it. That is
// geometry, not taste, and it is what every clause below is protecting.

/**
 * TRUE ELEVATION. Note what this does NOT say: it does not name a camera
 * angle. "No three-quarter angle" was the old wording and it failed — six of
 * twelve pieces broke it — because a model can miss a stated angle by ten
 * degrees and still feel obedient. So ask for the CONSEQUENCE, which has no
 * degrees in it and settles by eye in one second:
 *
 *     A CIRCLE IS EITHER A TRUE CIRCLE OR A STRAIGHT LINE, NEVER AN ELLIPSE.
 *
 * Both halves matter. A circle whose face is square to the camera (a cable
 * drum flange, a cork valve wheel) is a TRUE CIRCLE and is correct. A circle
 * whose axis lies across the picture (a bucket rim, a pipe mouth) is edge-on
 * and must be a straight LINE. An ellipse is the tell that sits between them:
 * find one and the camera is off-axis and the piece is carrying ground.
 */
export const ELEV = [
  'photographed in TRUE ELEVATION: the camera is exactly level with the middle of the object and dead square to it,',
  'like an architectural side elevation or a flat stage-set cutout seen from the audience.',
  'you see ONE face and one face only. NO side wall, NO end wall, NO top face, NO lid surface, NO interior.',
  'NOTHING recedes away from the camera. the whole object is one flat plane facing straight out.',
  'EVERY circle on this object is either a TRUE CIRCLE seen square-on or a STRAIGHT LINE seen edge-on.',
  'there are NO ellipses and NO ovals anywhere, because nothing is turned at an angle.',
  'strictly flat, zero perspective, zero vanishing point, no depth.',
].join(' ');

/**
 * NO GROUND. "No shadow" is the wrong instruction on its own — a model can
 * honour it and still stand the object on something, and a thing that stands
 * has a contact patch. Say the load-bearing thing: the object is cut out and
 * FLOATING and the backing continues behind AND UNDER it. That removes the
 * ground rather than removing the shadow the ground implies.
 *
 * This also protects the key. A cast shadow on magenta is DARK magenta, which
 * sits below keylib's absolute floor (mn > 45) — the floor that stops JPEG
 * noise punching holes in dark art (ART_PIPELINE trap 14) — so it survives
 * keying as an opaque maroon smear. Lowering the floor re-opens trap 14. The
 * fix has to be here, in the prompt.
 */
export const FLOAT = [
  'the object is CUT OUT and FLOATING with empty space all around it. it does NOT stand on anything.',
  'the flat magenta continues behind it and UNDERNEATH it, unbroken.',
  'NO ground, NO floor, NO table, NO pedestal, NO base, NO contact patch, NO shadow, NO dark smear, NO gradient.',
  'the light is completely FLAT and shadowless, like a photograph on a lightbox.',
].join(' ');

/**
 * CRAFT. This clause carries weight that shadow used to carry. Elevation
 * removes the shading that normally sells "handmade", and a model will reach
 * for vector art to fill the gap — flat, obedient, and suddenly clip art. So
 * the material has to be named as SURFACE rather than left to be implied by
 * light.
 */
export const CRAFT = [
  'a photograph of a REAL handmade model, and the material must be legible in the SURFACE itself',
  'since there is no shading to read it from: visible paper fibre and cut texture,',
  'matte chalky brush-painted finish with faint brush marks, slightly imperfect hand-cut edges.',
  'NOT a drawing, NOT an illustration, NOT vector art, NOT clip art, NO outline strokes,',
  'NO glossy plastic, NO smooth digital gradients.',
].join(' ');

/** The backing keylib expects. Keep #ff00ff — see keylib's header. */
export const KEY = 'the entire background is one solid uniform bright magenta #ff00ff and nothing else. EXACTLY ONE subject, complete and whole.';

/** The whole set, in the order that has worked: subject, then the four laws. */
export const laws = (subject) => `${subject} ${ELEV} ${FLOAT} ${CRAFT} ${KEY}`;

/**
 * ONE MORE RULE THAT HAS NO CLAUSE, because it is about what you ask for
 * rather than how: **never ask an elevation piece for anything along its
 * SIDE.** "the cut foam core showing down one edge" is a request for a second
 * face, and the model will turn the object to give you one. Material detail
 * belongs on the front face.
 */
