// Shot 3 · 12.9–19.3 s · The auction. An auction room in card: on the easel, the lot — an empty
// AD SLOT the shape of a post. Paddles go up in the rows, one after another, each outbid; then a
// gold paddle with a crook's mask goes up highest. The gavel comes down: SOLD. The slot turns
// over, and it is the scam ad from the first shot.
SCENES['nrf_auction'] = (() => {
  const { W, H, sheet, sprite, stack, put, glow, ease, move, pop } = RFP, D = NRF, N = D.N, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, T_CROOK = 2.45, T_BANG = 3.3, T_SOLD = 3.4, T_FLIP = 4.35;
  const BX = 380, BY = 975, BW = 380, BH = 480;
  const BACKROW = [150, 345, 540, 735, 930].map((x, i) => ({ x, y: 1330, s: 0.55, coat: ['#1d3a46', '#22303a', '#2a3f48', '#1a2e38', '#26363e'][i], hair: ['short', 'bob', 'short', 'bun', 'short'][i], col: ['#0b1418', '#3a2a1e', '#5a5048', '#14100c', '#2a1e14'][i] }));
  const FRONT = [200, 540, 880].map((x, i) => ({ x, y: 1560, s: 0.85, coat: ['#183440', '#20282f', '#1f3a44'][i], hair: ['bob', 'short', 'short'][i], col: ['#2a1e14', '#0b1418', '#6a5a4a'][i] }));
  // who bids when: [row, index, up, down, side]; the crook is FRONT[1], and it does not come down
  const BIDS = [[BACKROW, 1, 0.75, 1.7, 1], [FRONT, 0, 1.15, 2.05, 1], [BACKROW, 3, 1.55, 2.4, -1], [FRONT, 2, 1.9, 2.75, -1]];
  const room = () => sheet('nrf_auction_room', (g) => {
    ['#081820', '#0c222c', '#0f2a36', '#13313f'].forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 360, W + 180, H); });
    g.fillStyle = N.teal2; g.fillRect(-90, 1180, W + 180, 600); g.fillStyle = N.teal3; g.fillRect(-90, 1180, W + 180, 14);   // the wainscot
    for (const [x, w] of [[90, 150], [840, 150]]) { g.fillStyle = N.goldD; g.fillRect(x - 12, 548, w + 24, 214); g.fillStyle = '#10232b'; g.fillRect(x, 560, w, 190); g.fillStyle = 'rgba(147,221,232,.18)'; g.beginPath(); g.moveTo(x + 10, 740); g.lineTo(x + w * 0.5, 600); g.lineTo(x + w - 10, 740); g.fill(); }   // two framed pictures: an auction house
    g.fillStyle = '#071319'; g.fillRect(-90, 1760, W + 180, 300);
  }, 14);
  const easel = () => sprite('nrf_easel', 520, 900, 260, 300, (g) => {
    g.strokeStyle = '#3a2a1c'; g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.moveTo(-40, -300); g.lineTo(-200, 560); g.moveTo(40, -300); g.lineTo(200, 560); g.moveTo(0, -300); g.lineTo(0, 600); g.stroke();
    g.fillStyle = '#4a3624'; g.fillRect(-230, 230, 460, 26);                                                          // the ledge the board stands on
  }, 10);
  const slotFront = () => sprite('nrf_slot_front', BW + 20, BH + 20, (BW + 20) / 2, (BH + 20) / 2, (g) => {
    g.fillStyle = N.white; g.beginPath(); g.roundRect(-BW / 2, -BH / 2, BW, BH, 18); g.fill();
    g.strokeStyle = N.cyan; g.lineWidth = 6; g.setLineDash([22, 14]); g.beginPath(); g.roundRect(-BW / 2 + 30, -BH / 2 + 30, BW - 60, BH - 60, 14); g.stroke(); g.setLineDash([]);
    g.fillStyle = N.ink; g.textAlign = 'center'; g.font = '62px "ArchivoBlack-400"'; g.fillText('AD', 0, -98); g.fillText('SLOT', 0, -28);
  }, 10);
  function slotBack(g) {
    g.fillStyle = '#0f1d24'; g.beginPath(); g.roundRect(-BW / 2, -BH / 2, BW, BH, 18); g.fill();
    g.save(); g.beginPath(); g.roundRect(-BW / 2 + 14, -BH / 2 + 14, BW - 28, BH - 28, 12); g.clip(); D.newsSet(g, -BW / 2 + 14, -BH / 2 + 14, BW - 28, BH - 28); g.restore();
    put(g, D.standee(), 0, BH / 2 - 30, { sc: 0.44, lift: 1 });
  }
  function bidder(g, b, ox) { put(g, D.back(b.hair, b.coat, b.col), b.x + ox, b.y, { sc: b.s, lift: 1 + b.s }); }
  function raise(g, b, k, ox, side, crook) {
    if (k <= 0) return;
    const s = b.s, sx = b.x + ox + side * 120 * s, sy = b.y + 60 * s, hx = b.x + ox + side * (crook ? 120 : 170) * s, hy = lerp(b.y + 120 * s, b.y - (crook ? 420 : 250) * s, Math.min(k, 1.1));
    put(g, D.paddle(crook), hx, hy + 30 * s, { sc: s * (crook ? 1.25 : 1), rot: side * -0.08, lift: 1.4 + s });
    D.arm(g, sx, sy, hx, hy + 20 * s, 64 * s, b.coat);
  }
  return {
    draw(c, lt) {
      const shake = lt > T_BANG ? Math.sin((lt - T_BANG) * 40) * 8 * Math.exp(-(lt - T_BANG) * 8) : 0;
      const cam = { x: Math.sin(lt * 0.5) * 8 + shake, y: 0, z: move(lt, 0, 6.4, 1.0, 1.06), fx: 540, fy: 1050 };
      // the gavel: raised slowly while the crook's paddle goes up, then down on the beat
      const up = lt < T_BANG - 0.22 ? ease.out(clamp((lt - 2.4) / 0.7, 0, 1)) : lt < T_BANG ? 1 - ((lt - (T_BANG - 0.22)) / 0.22) ** 2 : ease.out(clamp((lt - T_BANG - 0.4) / 0.6, 0, 1)) * 0.35;
      const fp = clamp((lt - T_FLIP) / 0.45, 0, 1), flip = Math.cos(Math.PI * ease.out(fp));
      stack(c, [
        { sh: room(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, 60, 0, 1300); gr.addColorStop(0, 'rgba(241,246,246,.2)'); gr.addColorStop(1, 'rgba(241,246,246,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(BX - 40 + ox, 60); g.lineTo(BX + 40 + ox, 60); g.lineTo(BX + 300 + ox, 1300); g.lineTo(BX - 300 + ox, 1300); g.closePath(); g.fill(); g.restore(); glow(g, BX + ox, BY, 380, 'rgba(147,221,232,', 0.22); }, d: 0.08 },
        { fn: (g, ox) => {
          put(g, easel(), BX + ox, BY + 70, { lift: 1.2 });
          g.save(); g.translate(BX + ox, BY); g.scale(Math.max(0.02, Math.abs(flip)), 1);
          if (flip >= 0) { put(g, slotFront(), 0, 0, { lift: 1.6 }); D.slam(g, D.stamp('SOLD', 290, 120), 0, 112, lt, T_SOLD, -0.1); }
          else slotBack(g);
          g.restore();
          // the rostrum and the gavel, swung by someone out of shot on the right
          g.fillStyle = N.teal3; g.beginPath(); g.moveTo(690 + ox, 1100); g.lineTo(950 + ox, 1100); g.lineTo(930 + ox, 1420); g.lineTo(710 + ox, 1420); g.closePath(); g.fill();
          g.fillStyle = N.gold; g.fillRect(680 + ox, 1088, 280, 16); g.fillRect(712 + ox, 1180, 216, 6);
          put(g, D.block(), 790 + ox, 1080, { sc: 0.7, lift: 1.2 });
          g.save(); g.translate(1200 + ox, 1010); g.rotate(lerp(-0.06, 0.6, up)); put(g, D.gavel(420), 0, 0, { sc: 1, lift: 2 + up * 2 }); g.restore();
        }, d: 0.12 },
        { fn: (g, ox) => {
          BACKROW.forEach((b) => bidder(g, b, ox));
          for (const [row, i, t0, t1, side] of BIDS) if (row === BACKROW) raise(g, row[i], pop(lt, t0, 0.3) * (1 - ease.out(clamp((lt - t1) / 0.35, 0, 1))), ox, side, false);
        }, d: 0.2 },
        { fn: (g, ox) => {
          FRONT.forEach((b) => bidder(g, b, ox));
          for (const [row, i, t0, t1, side] of BIDS) if (row === FRONT) raise(g, row[i], pop(lt, t0, 0.3) * (1 - ease.out(clamp((lt - t1) / 0.35, 0, 1))), ox, side, false);
          const kc = pop(lt, T_CROOK, 0.32); if (kc > 0) { glow(g, 642 + ox, FRONT[1].y - 560, 260, 'rgba(232,197,71,', 0.35 * Math.min(kc, 1)); raise(g, FRONT[1], kc, ox, 1, true); }
        }, d: 0.3 },
      ], cam);
      D.box(c);
    },
  };
})();
