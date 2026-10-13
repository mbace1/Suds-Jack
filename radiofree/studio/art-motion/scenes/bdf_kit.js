// The forest kit for "The Biodiversity Fund" — built on RFP (the papercut box).
// A northern spruce is a stack of drooping tiers on a thin trunk: the silhouette is
// the whole drawing, so the tiers are cut with a slight downward hook and a lighter
// edge on the upper left, where the box's light comes from. Rows of them are sheets;
// single ones are sprites, so a tree can fall. The moose is a silhouette with no face;
// its head is a separate piece so it can look up.
window.BDF = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { far: '#22332a', mid: '#18251e', near: '#101a15', edge: '#34503f', trunk: '#2a1d15', mist: '#3c4a42', ground: '#1e1914', stump: '#6a5238', stumpL: '#9a7c52', moose: '#21160f', hall: '#1a1d1f' };
  /** one spruce, drawn with its base at (0,0) and its tip at (0,-h) */
  function spruceShape(g, h, col, edge, seed) {
    // a narrow cone of drooping tiers: each branch tip hangs below where it leaves the trunk
    const r = U.rng(seed), tiers = 12, w = h * 0.15, th = (h * 0.88) / tiers;
    const tipW = (i) => w * (0.12 + 0.88 * Math.pow(i / tiers, 0.9)) * (0.88 + r() * 0.24);
    const ws = Array.from({ length: tiers + 1 }, (_, i) => tipW(i));
    g.fillStyle = C.trunk; g.fillRect(-h * 0.012, -h * 0.13, h * 0.024, h * 0.13);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, -h);
    for (let i = 1; i <= tiers; i++) { const y = -h + i * th; g.quadraticCurveTo(ws[i] * 0.5, y - th * 0.7, ws[i], y + th * 0.25); g.lineTo(ws[i] * 0.3, y - th * 0.1); }
    g.lineTo(0, -h * 0.1);
    for (let i = tiers; i >= 1; i--) { const y = -h + i * th; g.lineTo(-ws[i] * 0.3, y - th * 0.1); g.lineTo(-ws[i], y + th * 0.25); g.quadraticCurveTo(-ws[i] * 0.5, y - th * 0.7, -ws[i - 1] * 0.3, y - th); }
    g.closePath(); g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = Math.max(2, h * 0.006); g.beginPath(); for (let i = 1; i <= tiers; i++) { const y = -h + i * th; g.moveTo(-ws[i] * 0.3, y - th * 0.1); g.quadraticCurveTo(-ws[i] * 0.6, y - th * 0.05, -ws[i], y + th * 0.25); } g.stroke(); }
  }
  /** a row of spruces as one sheet, standing on the line y */
  const row = (key, y, n, h, col, edge, seed, x0 = -80, x1 = W + 80) => sheet('bdf_row_' + key, (g) => {
    const r = U.rng(seed);
    for (let i = 0; i < n; i++) { const x = lerp(x0, x1, (i + r() * 0.6) / n), hh = h * (0.75 + r() * 0.5); g.save(); g.translate(x, y + r() * 20); spruceShape(g, hh, col, edge, seed * 31 + i); g.restore(); }
    g.fillStyle = col; g.fillRect(-90, y + 10, W + 180, H);                    // the ground the row stands on, same card
  }, 12);
  /** a single spruce as a sprite (origin at its base), so it can fall */
  const tree = (h, col, seed) => sprite(`bdf_tree_${h}_${col}_${seed}`, h * 0.5, h * 1.06, h * 0.25, h * 1.02, (g) => spruceShape(g, h, col, C.edge, seed), 9);
  /** a mist sheet: a pale band with a torn top edge */
  const mist = (key, y, hgt, seed) => sheet('bdf_mist_' + key, (g) => {
    const r = U.rng(seed); g.fillStyle = C.mist; g.beginPath(); g.moveTo(-90, y + hgt);
    for (let x = -90; x <= W + 90; x += 40) g.lineTo(x, y + Math.sin(x * 0.01 + seed) * 18 + r() * 14);
    g.lineTo(W + 90, y + hgt); for (let x = W + 90; x >= -90; x -= 40) g.lineTo(x, y + hgt - r() * 20); g.closePath(); g.fill();
  }, 22);
  /** the moose: body sprite (origin at the front hooves) and head sprite (origin at the neck joint) */
  const mooseBody = () => sprite('bdf_moose_body', 520, 420, 160, 400, (g) => {
    g.fillStyle = C.moose;
    // deep chest, the hump over the shoulders, a back falling to a small rump, a belly drawn up
    g.beginPath(); g.moveTo(-36, -250); g.quadraticCurveTo(-10, -340, 60, -352); g.quadraticCurveTo(150, -350, 230, -318); g.quadraticCurveTo(300, -300, 318, -258); g.quadraticCurveTo(320, -215, 296, -196);
    g.quadraticCurveTo(220, -178, 150, -190); g.quadraticCurveTo(70, -186, 20, -196); g.quadraticCurveTo(-30, -205, -36, -250); g.closePath(); g.fill();
    // long thin legs with a knee in each
    for (const [x, d] of [[4, 1], [44, -1], [262, 1], [292, -1]]) { g.beginPath(); g.moveTo(x - 12, -200); g.lineTo(x + 12, -200); g.lineTo(x + 8 + d * 6, -100); g.lineTo(x + 7, 0); g.lineTo(x - 7, 0); g.lineTo(x - 8 + d * 6, -100); g.closePath(); g.fill(); }
    g.beginPath(); g.moveTo(-40, -250); g.lineTo(-10, -170); g.lineTo(30, -150); g.lineTo(10, -260); g.closePath(); g.fill();          // the neck's base
  }, 10);
  const mooseHead = () => sprite('bdf_moose_head', 360, 330, 180, 180, (g) => {
    g.fillStyle = C.moose;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -60); g.quadraticCurveTo(-90, -70, -150, -20); g.quadraticCurveTo(-160, 20, -120, 30); g.quadraticCurveTo(-60, 30, 20, 30); g.closePath(); g.fill();   // the long head, muzzle down-left
    g.beginPath(); g.moveTo(-70, 26); g.quadraticCurveTo(-74, 70, -60, 84); g.quadraticCurveTo(-48, 60, -50, 26); g.fill();            // the bell
    for (const sx of [-1, 1]) { g.save(); g.translate(-30 + sx * 10, -58); g.scale(sx < 0 ? -1 : 1, 1); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(60, -20, 110, -80); for (let k = 0; k < 4; k++) { g.lineTo(110 - k * 24 + 6, -96 - (k % 2) * 16); g.lineTo(110 - k * 24 - 8, -80); } g.quadraticCurveTo(40, -30, 0, 10); g.closePath(); g.fill(); g.restore(); }   // palmate antlers
    g.beginPath(); g.ellipse(-8, -46, 12, 26, -0.5, 0, TAU); g.fill();                                                                       // an ear
  }, 8);
  function moose(c, x, y, s, lookUp = 0, lift = 1.6) {
    put(c, mooseBody(), x, y, { sc: s, lift });
    put(c, mooseHead(), x - 30 * s, y - 230 * s, { sc: s, rot: lerp(-0.6, 0.35, lookUp), lift });   // grazing (muzzle down) to looking up
  }
  /** the harvester: wheels, a lit cab, a crane arm reaching forward, the red light */
  const harvester = () => sprite('bdf_harvester', 660, 420, 350, 380, (g) => {
    g.fillStyle = '#2b2620'; g.beginPath(); g.roundRect(-220, -170, 420, 90, 14); g.fill();
    g.fillStyle = '#3a3128'; g.beginPath(); g.roundRect(-80, -330, 170, 170, 16); g.fill();
    g.fillStyle = K.ochre; g.beginPath(); g.roundRect(-60, -310, 130, 90, 8); g.fill();
    g.fillStyle = K.ink; for (const x of [-170, -70, 70, 160]) { g.beginPath(); g.arc(x, -60, 56, 0, TAU); g.fill(); }
    g.strokeStyle = '#2b2620'; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(-60, -200); g.lineTo(-220, -330); g.lineTo(-290, -230); g.stroke();
    g.fillStyle = '#2b2620'; g.fillRect(-320, -240, 60, 70);
  }, 10);
  /** a log seen end-on: bark ring, pale wood, growth rings */
  const logEnd = (r) => sprite('bdf_log_' + r, r * 2.4, r * 2.4, r * 1.2, r * 1.2, (g) => {
    g.fillStyle = C.trunk; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = C.stumpL; g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(90,60,30,.45)'; g.lineWidth = 2; for (let k = 1; k < 5; k++) { g.beginPath(); g.arc(r * 0.05, -r * 0.03, r * 0.84 * k / 5, 0, TAU); g.stroke(); }
  }, 6);
  /** a stump: what is left, so the clearing reads as a clearing and not a field */
  const stump = (s) => sprite('bdf_stump_' + s, 90 * s, 70 * s, 45 * s, 60 * s, (g) => {
    g.fillStyle = C.trunk; g.fillRect(-30 * s, -36 * s, 60 * s, 36 * s);
    g.fillStyle = C.stumpL; g.beginPath(); g.ellipse(0, -36 * s, 30 * s, 10 * s, 0, 0, TAU); g.fill();
  }, 5);
  return { C, spruceShape, row, tree, mist, moose, harvester, logEnd, stump };
})();
