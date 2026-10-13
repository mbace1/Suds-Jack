// Shot 3 · 6.4–9.6 s · The receipt. A dark card bar across the top with a slot and
// the red light; out of the slot feeds a paper receipt, held at its foot by a gloved
// hand in a sleeve. The header stays where it is and the paper grows DOWN, one line a
// beat, each with a red rubber stamp: CAKE ORDERED, BAKERY ACQUIRED, BIRCH LEAF ?,
// PIGEON FOLLOWED — and the total, $249 + EVERYTHING. Behind it, the square at dusk.
SCENES['rfp_receipt'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, words, pop, ease, move, glow, put, ledAt, hand } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, X0 = 250, X1 = 830, TOP = 300, LINE = 200, HEAD = 230;
  const ITEMS = [
    ['CAKE', 'looked 0.4 s', 'ORDERED'],
    ['BAKERY', 'looked 1.1 s', 'ACQUIRED'],
    ['BIRCH LEAF', 'looked 0.2 s', '?'],
    ['PIGEON', 'looked twice', 'FOLLOWED'],
  ];
  const T = [1, 2, 3, 4, 5].map((k) => k * B);          // a line on each beat; the total on the fifth
  const street = () => sheet('rfp_rc_street', (g) => {
    g.fillStyle = '#3a2a24'; g.fillRect(-90, 700, W + 180, H);
    g.fillStyle = K.roof2; g.fillRect(-90, 820, 520, 900); g.fillRect(640, 760, 540, 1000);
    g.fillStyle = K.lamp; for (const [x, y] of [[-20, 900], [120, 900], [260, 900], [700, 860], [860, 860], [1000, 860], [700, 1080], [1000, 1080]]) g.fillRect(x, y, 90, 130);
    g.fillStyle = '#1f1a16'; g.fillRect(-90, 1500, W + 180, 600);
  });
  const bar = () => sprite('rfp_rc_bar', 900, 200, 450, 100, (g) => {
    g.fillStyle = K.ink; g.beginPath(); g.roundRect(-420, -80, 840, 160, 30); g.fill();
    g.fillStyle = '#000'; g.fillRect(-310, 50, 620, 12);
    g.fillStyle = K.card; g.font = '52px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('LOOKSY', -40, 10);
  }, 12);
  function receipt(c, lt) {
    const shown = T.filter((t) => lt >= t).length, feed = shown < 5 ? clamp((lt - (T[shown - 1] ?? 0)) / 0.18, 0, 1) : 1;
    const len = HEAD + Math.max(0, shown - 1) * LINE + (shown ? LINE * ease.out(feed) : 0) + 60, y1 = TOP + len;
    // the paper: shadow, body with a torn foot, tooth
    c.save(); c.shadowColor = 'rgba(20,10,4,.5)'; c.shadowBlur = 22; c.shadowOffsetX = 12; c.shadowOffsetY = 16;
    c.fillStyle = '#fbf6ea'; c.beginPath(); c.moveTo(X0, TOP); c.lineTo(X1, TOP); c.lineTo(X1, y1);
    for (let x = X1; x >= X0; x -= 24) c.lineTo(x - 12, y1 + ((x / 24) % 2 ? 10 : -6));
    c.lineTo(X0, y1); c.closePath(); c.fill(); c.restore();
    c.fillStyle = 'rgba(120,100,70,.06)'; for (let y = TOP; y < y1; y += 6) c.fillRect(X0, y, X1 - X0, 2);
    // the header, held
    c.fillStyle = K.ink; c.textAlign = 'center'; c.font = '44px "RobotoCondensed"'; c.fillText('GLANCE RECEIPT', 540, TOP + 80);
    c.font = '30px "RobotoCondensed"'; c.fillText('SENAATINTORI · 16:03', 540, TOP + 128);
    c.fillRect(X0 + 30, TOP + 170, X1 - X0 - 60, 4); c.textAlign = 'left';
    // the lines, each with its stamp
    ITEMS.forEach(([what, how, verdict], i) => {
      if (lt < T[i]) return;
      const y = TOP + HEAD + i * LINE + 40;
      c.fillStyle = K.ink; c.font = '50px "RobotoCondensed"'; c.fillText(what, X0 + 34, y); c.font = '30px "RobotoCondensed"'; c.fillStyle = '#6a5c4e'; c.fillText(how, X0 + 34, y + 44);
      const k = clamp((lt - T[i]) / 0.12, 0, 1), sc = lerp(1.6, 1, ease.out(k));
      c.save(); c.translate(X1 - 130, y + 6); c.rotate(-0.12 + (i % 2) * 0.08); c.scale(sc, sc); c.globalAlpha = 0.25 + 0.75 * k;
      c.strokeStyle = K.red; c.lineWidth = 6; c.font = (verdict === '?' ? '84px' : '46px') + ' "Anton-400"'; const tw = c.measureText(verdict).width;
      c.strokeRect(-tw / 2 - 18, -48, tw + 36, 74); c.fillStyle = K.red; c.textAlign = 'center'; c.fillText(verdict, 0, verdict === '?' ? 22 : 12); c.textAlign = 'left';
      c.restore();
    });
    if (lt >= T[4]) {
      const y = TOP + HEAD + 4 * LINE + 30, k = clamp((lt - T[4]) / 0.14, 0, 1), sc = lerp(1.5, 1, ease.out(k));
      c.fillStyle = K.ink; c.fillRect(X0 + 30, y - 70, X1 - X0 - 60, 4);
      c.font = '50px "RobotoCondensed"'; c.fillText('TOTAL', X0 + 34, y);
      c.save(); c.translate(X1 - 150, y - 14); c.scale(sc, sc); c.fillStyle = K.red; c.font = '96px "Anton-400"'; c.textAlign = 'center'; c.fillText('$249', 0, 20); c.restore();
      c.fillStyle = K.red; c.font = '40px "Anton-400"'; c.textAlign = 'center'; c.fillText('+ EVERYTHING', 540, y + 76); c.textAlign = 'left';
    }
    return y1;
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.7) * 10, y: 0, z: 1 };
      // on the total, push in on it: the whole frame, paper and all
      const zt = move(lt, T[4] - 0.02, 0.35, 1, 1.18);
      c.save(); c.translate(600, 1380); c.scale(zt, zt); c.translate(-600, -1380);
      stack(c, [
        { sh: dusk('rc', 900), d: 0.08, lift: 0 },
        { sh: street(), d: 0.25 },
        { fn: (g, ox) => { glow(g, 200 + ox, 960, 300, 'rgba(255,214,140,', 0.3); glow(g, 860 + ox, 960, 300, 'rgba(255,214,140,', 0.3); }, d: 0.25 },
      ], cam);
      c.fillStyle = 'rgba(20,10,6,.35)'; c.fillRect(0, 0, W, H);
      RFP.leaves(c, lt + 7, { n: 8, seed: 31, cam });
      const y1 = receipt(c, lt);
      // the hand holds the foot of the paper and is drawn down with it
      hand(c, 540, y1 + 40, 0.95, 0, { sleeve: '#2b3a30', cuff: K.rust });
      put(c, bar(), 540, TOP - 50, { lift: 1.6 });
      ledAt(c, 870, TOP - 70, 16, lt < T[0] ? 0.3 : Math.floor(lt * 4) % 2 === 0 ? 1 : 0.25);
      c.restore();
      box(c);
    },
  };
})();
