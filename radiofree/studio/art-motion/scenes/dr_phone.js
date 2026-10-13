// Shot 3 · 12.9–19.3 s · The brief. Close on a phone in a gloved hand, the room soft and dark
// behind it. The evening's daily brief slides up the screen, in the device's own words:
// "Unexpectedly, a deer briefly entered the family room." Under it, the clip it means — a
// small grainy frame with a brown shape crossing a rug.
SCENES['dr_phone'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, put, glow, ease, move, hand } = RFP, D = DR, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_CARD = 0.6, PX = 540, PY = 1200, SW = 440, SH = 860;
  const LINE = 'Unexpectedly, a deer briefly entered the family room.';
  const phone = () => sprite('dr_phone', 520, 980, 260, 490, (g) => { g.fillStyle = '#15171a'; g.beginPath(); g.roundRect(-250, -480, 500, 960, 56); g.fill(); g.fillStyle = '#0c1014'; g.beginPath(); g.roundRect(-SW / 2, -SH / 2, SW, SH, 36); g.fill(); g.fillStyle = '#15171a'; g.beginPath(); g.roundRect(-60, -SH / 2 + 10, 120, 28, 14); g.fill(); }, 12);
  function wrap(c, text, w) { const out = []; let line = ''; for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (c.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; } out.push(line); return out; }
  function card(c, x, y, a, lt) {
    c.save(); c.globalAlpha = a; c.translate(x, y);
    c.fillStyle = 'rgba(232,226,212,.96)'; c.beginPath(); c.roundRect(-200, 0, 400, 560, 28); c.fill();
    // the app's mark: a little house in the four colours
    const cols = ['#4a82e0', '#de4a3c', '#f4bd2a', '#3aa35a']; c.save(); c.translate(-166, 44); for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.fillRect((i % 2) * 14 - 14, Math.floor(i / 2) * 14 - 8, 13, 13); } c.fillStyle = cols[0]; c.beginPath(); c.moveTo(-18, -8); c.lineTo(0, -24); c.lineTo(18, -8); c.fill(); c.restore();
    c.fillStyle = '#3a3a34'; c.font = '22px "Poppins-700"'; c.fillText('DOODLE HOME', -138, 42); c.font = '20px "RobotoCondensed"'; c.fillText('Daily brief · 18:42', -138, 68);
    c.fillStyle = K.ink; c.font = '40px "RobotoCondensed"'; wrap(c, LINE, 350).forEach((l, i) => c.fillText(l, -176, 140 + i * 50));
    // the clip it means: a grainy frame, a rug, a brown shape mid-stride
    c.fillStyle = '#2a2420'; c.fillRect(-176, 360, 352, 170); c.fillStyle = 'rgba(122,58,34,.8)'; c.beginPath(); c.ellipse(0, 490, 150, 26, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.rect(-176, 360, 352, 170); c.clip(); const px = 240 - ((lt * 150) % 520), st = Math.sin(lt * 9) * 6;   // the clip plays: the brown shape crosses the rug, again and again
    D.dog(c, px, 512, 0.26, { dir: -1, t: lt, trot: 1, lift: 0.3 }); c.restore();
    const r = U.rng(4); c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 160; i++) c.fillRect(-176 + r() * 352, 360 + r() * 170, 2, 2);
    c.fillStyle = 'rgba(232,226,212,.9)'; c.beginPath(); c.moveTo(-14, 426); c.lineTo(16, 445); c.lineTo(-14, 464); c.fill();
    c.restore();
  }
  return {
    draw(c, lt) {
      const cam = { x: 0, y: 0, z: move(lt, 0, 6.4, 1.0, 1.05), fx: PX, fy: PY };
      const k = ease.out(clamp((lt - T_CARD) / 0.5, 0, 1)), tilt = Math.sin(lt * 0.9) * 0.02;
      stack(c, [
        { sh: sheet('dr_blur', (g) => { g.fillStyle = '#1c201c'; g.fillRect(-90, -90, W + 180, H + 180); }), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 160 + ox, 520, 420, 'rgba(240,170,70,', 0.4); glow(g, 900 + ox, 1500, 300, 'rgba(240,170,70,', 0.14); }, d: 0.05 },
        { fn: (g, ox) => {
          hand(g, PX + 50 + ox, PY + 470, 1.8, 0.1, { sleeve: '#3a3530', cuff: K.ochre });
          g.save(); g.translate(PX + ox, PY); g.rotate(tilt); g.scale(1.25, 1.25);
          put(g, phone(), 0, 0, { lift: 2 });
          glow(g, 0, -80, 380, 'rgba(200,220,235,', 0.1);
          g.save(); g.beginPath(); g.roundRect(-SW / 2, -SH / 2, SW, SH, 36); g.clip();
          g.fillStyle = 'rgba(232,226,212,.6)'; g.font = '64px "Poppins-600"'; g.textAlign = 'center'; g.fillText('18:42', 0, -300); g.textAlign = 'left';
          card(g, 0, lerp(SH / 2 + 20, -230, k), k > 0 ? 1 : 0, lt);
          g.restore();
          g.fillStyle = '#121212'; g.beginPath(); g.roundRect(-286, 160, 70, 130, 30); g.fill();    // the thumb over the phone's edge
          g.restore();
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
