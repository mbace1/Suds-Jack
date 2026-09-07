// Toko Move — chapter 1. Helsinki is now a CITY DEFINITION plus the generic
// builder, not a bespoke function: the anchors, their names and tags, the walk
// links and the per-mode speeds live in cities/helsinki.city.js, and
// js/city-build.js turns any such definition plus its source pack into a graph.
//
// This wrapper stays because core-v212.js, main.js and two gates import
// `buildRealHelsinki` by name, and because a chapter deserves a door with its
// own name on it. It is deliberately three lines: the moment chapter 2 lands,
// the only new code should be its definition file.
//
// test/city-build.mjs asserts this path builds a graph identical to the one the
// hand-written v2.11 builder produced, node for node and edge for edge.
import { buildCity } from './city-build.js?v=1';
import { HELSINKI } from '../cities/helsinki.city.js?v=1';

export { HELSINKI };
export function buildRealHelsinki(pack) { return buildCity(pack, HELSINKI); }
