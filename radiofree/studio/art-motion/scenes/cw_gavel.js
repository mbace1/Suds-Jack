// Shot 5 · 25.7–32.1 s · The Speaker. Close on the dais: the Speaker's place, the gavel swung
// by someone out of shot (a real person: not drawn). A card slams down in front of it — FLIPPANT AT
// BEST — and on the beat the gavel comes down on its block.
SCENES['cw_gavel'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move, pop } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_CARD = 2.5, T_BANG = 3.2;   // the stamp lands with the caption's keyword; the gavel a beat and a half later
  return {
    draw(c, lt) {
      // the gavel is raised slowly, the whole time the line is read, then comes down on the beat
      const up = lt < T_BANG - 0.25 ? RFP.ease.out(clamp((lt - 0.3) / 2.4, 0, 1)) * (1 + Math.sin(lt * 7) * 0.015) : lt < T_BANG ? 1 - ((lt - (T_BANG - 0.25)) / 0.25) ** 2 : ease.out(clamp((lt - T_BANG - 0.3) / 0.6, 0, 1)) * 0.6;
      const slam = lt < T_BANG ? 1 : 1 + 0.07 * Math.exp(-(lt - T_BANG) * 7) * (1 - Math.exp(-(lt - T_BANG) * 40));
      const cam = { x: Math.sin(lt * 0.6) * 8 + (lt > T_BANG ? Math.sin((lt - T_BANG) * 40) * 8 * Math.exp(-(lt - T_BANG) * 8) : 0), y: 0, z: slam * move(lt, 0, 6.4, 1.04, 1.0), fx: 540, fy: 1300 };
      stack(c, [
        { sh: D.chamber(), d: 0.06, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 1100, 640, 'rgba(240,170,70,', 0.26); g.fillStyle = 'rgba(255,230,180,.4)'; const r = U.rng(12); for (let i = 0; i < 26; i++) g.fillRect((r() * 900 + 90 + lt * 12 * (r() - 0.3) + ox) % W, 700 + (r() * 700 + lt * 18 * r()) % 700, 3, 3); }, d: 0.06 },   // dust in the lamp
        { sh: sheet('cw_daisclose', (g) => { g.fillStyle = D.C.woodL; g.fillRect(-90, 1380, W + 180, 70); g.fillStyle = D.C.wood; g.fillRect(-90, 1450, W + 180, H); g.fillStyle = 'rgba(255,240,210,.07)'; g.fillRect(-90, 1380, W + 180, 8); }), d: 0.2, lift: 1 },
        { fn: (g, ox) => {
          put(g, D.plate('SPEAKER', 240), 880 + ox, 1460, { lift: 1.4 });
          put(g, D.block(), 640 + ox, 1400, { lift: 1.2 });
          // the gavel swings about a point off the frame's right edge: raised, then down on its block
          const a = lerp(-0.06, 0.55, up);   // canvas angles run clockwise: positive lifts the head
          g.save(); g.translate(1240 + ox, 1330); g.rotate(a); put(g, D.gavel(600), 0, 0, { lift: 2 + up * 2 }); g.restore();
        }, d: 0.3 },
        { sh: D.table(), d: 0.4, lift: 1.4, y: 200 },
        { fn: (g, ox) => {
          // OpenAI's place in the foreground: its blank answer, still held up — the answer the Speaker means
          RFP.hand(g, 300 + ox, 1700, 0.75, 0, { sleeve: '#23272b', cuff: '#e8e2d4' });
          put(g, RFP.sprite('cw_blank2', 220, 270, 110, 135, (q) => { q.fillStyle = '#e8e2d4'; q.fillRect(-90, -112, 180, 224); q.fillStyle = 'rgba(21,18,15,.22)'; q.font = '140px "Anton-400"'; q.textAlign = 'center'; q.fillText('?', 0, 50); }, 6), 300 + ox, 1540, { rot: -0.05, lift: 1.8 });
          put(g, D.plate('OPENAI', 230, 24), 300 + ox, 1800, { lift: 1.6 });
        }, d: 0.4 },
        { fn: (g, ox) => { const kc = pop(lt, T_CARD, 0.16); if (kc > 0) put(g, D.stampMark('FLIPPANT AT BEST', 860), 540 + ox, 760, { sc: lerp(1.5, 0.92, Math.min(kc, 1)), rot: -0.05, lift: 0.4 }); }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
