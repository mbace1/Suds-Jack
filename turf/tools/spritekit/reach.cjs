// Where the WEAPON is, frame by frame.
//   node reach.cjs <dir> <frame...>
//
// Silhouette IoU is the wrong instrument for an attack clip and this file
// exists because it gave a wrong answer twice. A pistol or a knife is ~2% of a
// sprite's pixels; a torso and a head are most of the rest. So two frames whose
// weapon has moved from the hip to the shoulder still score as near-duplicates,
// because the 98% that did not move drowns out the 2% that did. Ranged
// `recover` vs `ready` scored 0.839 — NEAR-DUPLICATE — on two frames that are
// obviously different to the eye.
//
// What actually tracks the weapon is the extreme ink in the direction the
// weapon travels. For a character facing the lower-right that is the RIGHTMOST
// ink, and the useful number is not how far right it goes but HOW HIGH UP that
// happens: hip, chest or above the shoulder. That one number orders an attack.
const fs = require('fs'); const path = require('path');
const { load, pixels } = require(path.join(__dirname, 'img.cjs'));

(async () => {
  const [dir, ...files] = process.argv.slice(2);
  if (!files.length) { console.log('usage: node reach.cjs <dir> <frame...>'); process.exit(1); }

  const rows = [];
  for (const f of files) {
    const o = await load(path.join(dir, f));
    const d = pixels(o), W = o.W, H = o.H;
    let y0 = H, y1 = -1, x1 = -1, tipY = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] > 127) {
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > x1) { x1 = x; tipY = y; }
      }
    const ih = y1 - y0 + 1;
    // reach: how far right the ink goes, as a fraction of the figure's height
    // height: where that happens, 0 at the feet and 1 at the top of the head
    rows.push({ f, reach: (x1 - W / 2) / ih, height: (y1 - tipY) / ih });
  }

  console.log('frame'.padEnd(30), 'reach'.padStart(7), 'height'.padStart(7));
  for (const r of rows) console.log(r.f.replace(/\.png$/, '').padEnd(30), r.reach.toFixed(3).padStart(7), r.height.toFixed(3).padStart(7));

  // the pairwise distance in that 2-D signature; 0.05 of a body height is about
  // a hand's width, which is the smallest move worth calling a separate phase
  const same = [];
  console.log('\npair'.padEnd(41), 'dist'.padStart(6), '  verdict');
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    const dist = Math.hypot(a.reach - b.reach, a.height - b.height);
    const label = `${a.f.replace(/\.png$/, '')} vs ${b.f.replace(/\.png$/, '')}`;
    if (dist < 0.05) same.push(label);
    console.log(label.padEnd(40), dist.toFixed(3).padStart(6), '  ', dist < 0.05 ? 'SAME weapon position' : 'distinct');
  }
  // SAME weapon position is not a failure on its own. Two phases can hold the
  // blade at the same height and still be different poses — rear melee
  // anticipation is coiled and low, recover is upright, and reach scores them
  // 0.036 apart while the silhouette scores 0.706. The weapon probe and the
  // body probe answer different questions and an attack clip needs both.
  if (same.length) {
    console.log(`\n${same.length} pair(s) hold the weapon at the same place. That is not a verdict — check the BODY:`);
    console.log(`  node phase.cjs <dir> <pairs.json> full`);
  }
})();
