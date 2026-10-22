// reddmini.js — how REDD MINI looks: REDD CUBE's rounded cube (looks/redd.js)
// at its own radius and colour, 0xff4433 — 1.x built every cube the same way,
// RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18) in the `cube` satin family
// (enemy.js:738, 807-809), so at r 0.32 its absolute 0.18 corners take most of
// each face and the mini reads rounder than its parent. It tumbles, breathes,
// squashes and pops exactly as REDD does (enemy.js:1542-1565, 2739-2777,
// 3013-3029), with its own shared geometry.
import { cubeLook } from './redd.js?v=10';

export default cubeLook();
