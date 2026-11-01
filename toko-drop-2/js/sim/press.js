// press.js — what pressed on a body this step; v82's contact squash (render/
// actors.js contactEase, render/gel.js contactSquash) reads it, the rules read
// nothing of it. The same pushes are kept three ways:
//   pressX/Z   the VECTOR toward what pressed, metres: the direction. It
//              cancels when a body is pressed from both sides
//   pressM     the TOTAL, metres, every push added: it never cancels
//   pressAX/Z  the AXIS: each push folded onto the running sum's side before
//              it is added, so two pushes from opposite sides make one axis
//              instead of nothing (its sign is the first push's)
// v90: before this the view read the vector alone, and a gel squeezed from
// both sides — the middle of every crowd, the hero with a gel either side —
// read as unpressed and stood round while its neighbours flattened.
// `o` may be a body spawned since the step's reset, with no fields yet.
export function press(o, px, pz) {
  o.pressX = (o.pressX || 0) + px; o.pressZ = (o.pressZ || 0) + pz;
  o.pressM = (o.pressM || 0) + Math.hypot(px, pz);
  if ((o.pressAX || 0) * px + (o.pressAZ || 0) * pz < 0) { px = -px; pz = -pz; }
  o.pressAX = (o.pressAX || 0) + px; o.pressAZ = (o.pressAZ || 0) + pz;
}
export function pressReset(o) { o.pressX = o.pressZ = o.pressM = o.pressAX = o.pressAZ = 0; }
