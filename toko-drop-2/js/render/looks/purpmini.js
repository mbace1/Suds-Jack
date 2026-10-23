// purpmini.js — how PURP MINI looks: REDD CUBE's rounded cube (looks/redd.js)
// at its own radius and colour, 0xdd66ff — 1.x built every cube the same way,
// RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18) in the `cube` satin family
// (enemy.js:738, 807-809), so at r 0.26 its absolute 0.18 corners take most of
// each face and the smallest body in the roster reads as a pebble. It
// tumbles, breathes, squashes and pops exactly as REDD does (enemy.js:
// 1542-1565, 2739-2777, 3013-3029), with its own shared geometry. Born from a
// PURP, it is not drawn while it waits out its parent's 0.28 s pop: 1.x built
// the brood only when the pop ended, at full size (enemy.js:2992-3000,
// main.js:10586-10620).
import { cubeLook } from './redd.js?v=24';

export default cubeLook({ unborn: true });
