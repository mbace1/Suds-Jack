// TEMPORARY CAMPAIGN REGISTRATION FOR THE WORLD 3/4 GREYBOX PASS.
//
// Worlds 1-2 live in rooms.js and are already being tested/tuned. Rather
// than rewrite that large stable file just to append six experimental rooms,
// this shim mutates the SAME rooms.js?v=23 array that level.js re-exports.
// ESM runs this once, before main.js builds SITES, so the runtime still has
// one flat list and goSite(i + 1) remains the whole progression model.
//
// Once 3-1…4-3 survive playtesting, fold WORLD34_ROOMS into rooms.js and
// delete this file + its one import from levelid.js.

import { ROOMS } from './rooms.js?v=23';
import { WORLD34_ROOMS } from './world34-rooms.js?v=1';

for (const room of WORLD34_ROOMS) {
  if (!ROOMS.some((r) => r.name === room.name)) ROOMS.push(room);
}
