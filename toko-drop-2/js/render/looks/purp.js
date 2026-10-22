// purp.js — how PURP CUBE looks: 1.x built every cube the same way, so it is
// REDD CUBE's rounded cube (looks/redd.js) in its own violet, 0xcc44ff —
// RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18), 1.35 on a side at radius
// 0.75, in the firmer `cube` satin family (enemy.js:738, 807-809). No eyes, no
// motion trail, and no tell: 1.x gives PURP no emissive of its own, so its
// spiral comes without a warning (enemy.js:2648-2690). It tumbles over its
// planted leading edge, breathes and squashes about its centre at rest, and
// pops flat where it died, exactly as REDD does (enemy.js:1542-1565,
// 2739-2777, 3013-3029), with its own shared geometry. Its bullets are the
// core's gel bullets in 0xcc66ff.
import { cubeLook } from './redd.js?v=13';

export default cubeLook();
