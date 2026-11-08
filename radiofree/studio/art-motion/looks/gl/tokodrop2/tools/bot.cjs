// The capture's player for the 8 Nov re-cut, handed to the game through its own hook (debug.capPlay(think), v119).
//
// Why it exists: the 4 Nov takes were played by the game's built-in capture bot (botInput in main.js), which with
// nothing on the floor aims at +x and FIRES ANYWAY. After a boss died, and between waves, the hero stood still and
// streamed shots at nothing in a straight dotted line that sat frozen frame after frame (the 4 Nov film's BOSS and
// WORLD CLEAR cuts, 22.3–25.1 s). That is the "glitched shooting part" the owner asked to have cut (8 Nov).
//
// This player shoots only when there is a body to shoot, circles the nearest body at a distance instead of
// backing straight away from it, turns the other way now and then and off the rail, and dashes when a body gets
// close. It runs in the page, once a drawn frame; nothing in the game is patched. Its state lives on window.__bs.
module.exports = function think(w) {
  const h = w.hero;
  const S = (window.__bs ||= { dir: 1, cd: 0, k: 0 });
  S.k++;
  let near = null, nd = Infinity;
  for (const g of w.gels) {
    if (!g.alive || g.state !== 'active') continue;
    const d = Math.hypot(g.x - h.x, g.z - h.z);
    if (d < nd) { nd = d; near = g; }
  }
  if (!near) return { mx: -h.x / w.hx, mz: -h.z / w.hz, ax: 0, az: -1, aim: false, fire: false, dash: false };
  const ux = (near.x - h.x) / nd, uz = (near.z - h.z) / nd, r = near.r || 0.6;
  const want = 4.5 + r * 1.5;
  const radial = nd < want ? -1 : nd > want + 3 ? 0.7 : 0;
  if (S.k % 140 === 0) S.dir *= -1;
  if ((Math.abs(h.x) > w.hx * 0.82 || Math.abs(h.z) > w.hz * 0.82) && S.k % 24 === 0) S.dir *= -1;
  const mx = -uz * S.dir + ux * radial - (h.x / w.hx) * 0.7;
  const mz = ux * S.dir + uz * radial - (h.z / w.hz) * 0.7;
  let dash = false;
  if (S.cd > 0) S.cd--; else if (nd < r + 2.4) { dash = true; S.cd = 40; }
  return { mx, mz, ax: ux, az: uz, aim: true, fire: true, dash };
};
