// Shot 6 · 32.1–37.5 s · On hold, again. The same gate on 6 October 2026. The floodlights go
// out; the leaves swing shut; a gloved hand in an official's sleeve lifts ON HOLD out of the
// puddle and hangs it back on its chains; the regulator's stamp lands on its corner — LVV ·
// 6.10 — and on the last hit the padlock snaps shut. This time the hold is not Doodle's.
SCENES['doh_rehang'] = (() => {
  const { K, W, H, sprite, stack, box, put, glow, ease, move, pop, fist, leaves } = RFP, { C, row } = BDF, D = DOH, { clamp, lerp } = U;
  const B = 60 / 112, T_DARK = 0.5, T_SHUT = 2 * B, T_LIFT = 3 * B, T_HUNG = 3 * B + 0.8, T_STAMP = 2.5, T_HIT = 3.0, SX = 540, SY = 1190;
  const notice = () => sprite('doh_notice', 200, 260, 100, 130, (g) => {   // the agency's notice, pinned to the hoarding
    g.fillStyle = K.card; g.fillRect(-84, -116, 168, 232); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '30px "ArchivoBlack-400"'; g.fillText('LVV', 0, -76); g.font = '16px "RobotoCondensed"'; g.fillText('LUPA- JA VALVONTAVIRASTO', 0, -52);
    g.fillStyle = 'rgba(21,18,15,.5)'; for (let i = 0; i < 4; i++) g.fillRect(-64, -34 + i * 16, 128, 5);
    g.save(); g.translate(0, 62); g.rotate(-0.12); g.strokeStyle = K.mag; g.lineWidth = 5; g.strokeRect(-70, -32, 140, 64); g.fillStyle = K.mag; g.font = '30px "Anton-400"'; g.fillText('6.10.2026', 0, 11); g.restore();
    g.fillStyle = K.mag; g.beginPath(); g.arc(0, -108, 6, 0, Math.PI * 2); g.fill();
  }, 6);
  return {
    draw(c, lt) {
      const slam = lt < T_HIT ? 1 : 1 + 0.06 * Math.exp(-(lt - T_HIT) * 6) * (1 - Math.exp(-(lt - T_HIT) * 40));
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: slam * move(lt, T_HUNG, 2.0, 1.0, 1.1), fx: SX, fy: SY };
      const light = lt < T_DARK ? 1 : lt < T_DARK + 0.3 ? 0.4 : 0, shut = ease.out(clamp((lt - T_SHUT) / 0.7, 0, 1));
      const kl = ease.out(clamp((lt - T_LIFT) / (T_HUNG - T_LIFT), 0, 1));
      const sx = lerp(700, SX, kl), sy = lerp(1610, SY, kl) + (lt > T_HUNG ? Math.sin((lt - T_HUNG) * 12) * Math.exp(-(lt - T_HUNG) * 5) * 12 : 0), sflat = lerp(0.42, 1, clamp(kl * 3, 0, 1));
      stack(c, [
        { sh: RFP.dusk('doh', 1150), d: 0.04, lift: 0 },
        { sh: row('doh_far', 1170, 16, 300, C.far, null, 41), d: 0.1, lift: 0.4 },
        { fn: (g, ox) => { D.crane(g, 200 + ox, 1190, 500, 470, 1.1, lt); D.crane(g, 880 + ox, 1200, 420, 400, Math.PI + 0.9, lt + 0.4); }, d: 0.14 },
        { sh: D.site(), d: 0.2, lift: 0.4 },
        { fn: (g, ox) => {
          for (const [x, y] of [[420, 960], [700, 940]]) {
            g.fillStyle = '#1b1a17'; g.fillRect(x - 5 + ox, y, 10, 220); g.fillRect(x - 40 + ox, y - 16, 80, 22);
            g.fillStyle = light > 0.05 ? '#ffe6b0' : '#4a4236'; g.fillRect(x - 34 + ox, y - 12, 68, 12);
            if (light > 0.05) glow(g, x + ox, y + 200, 300, 'rgba(240,170,70,', 0.25 * light);
          }
        }, d: 0.24 },
        { fn: (g, ox) => {
          const sc = lerp(0.16, 1, shut);
          for (const [dir, hx] of [[1, D.GX0], [-1, D.GX1]]) { g.save(); g.translate(hx + ox, D.GY1); g.scale(sc, 1); put(g, D.leaf(dir), 0, 0, { lift: 1.4 - shut * 0.8 }); g.restore(); }
        }, d: 0.3 },
        { sh: D.hoarding(), d: 0.3, lift: 1.2 },
        { fn: (g, ox) => glow(g, 980 + ox, 760, 520, 'rgba(240,170,70,', 0.22), d: 0.3 },
        { sh: D.road(), d: 0.4, lift: 0.6 },
        { fn: (g, ox) => {
          // the sign: out of the puddle, carried up by the hand, hung back on its chains
          if (lt >= T_HUNG - 0.05) { const top = D.GY0 + 30; D.chain(g, SX - 160 + ox, top, sx - 160 + ox, sy - 72); D.chain(g, SX + 160 + ox, top, sx + 160 + ox, sy - 72); }
          g.save(); g.translate(sx + ox, sy); g.scale(1, sflat); put(g, D.sign(), 0, 0, { rot: lerp(-0.16, 0, kl), lift: lerp(0.3, 2, kl) }); g.restore();
          const km = pop(lt, T_STAMP, 0.2); if (km > 0) put(g, notice(), 900 + ox, 1300, { sc: Math.min(km, 1.1), rot: 0.04, lift: 1.4 });
          const kp = pop(lt, T_HIT, 0.16); if (kp > 0) put(g, D.padlock(), SX + ox, 1330, { sc: kp, rot: 0.05, lift: 1.4 });
          // the official's hand: comes down, takes the sign up, lets go and withdraws
          const hk = lt < T_LIFT ? ease.out(clamp((lt - (T_LIFT - 0.5)) / 0.5, 0, 1)) : lt < T_HUNG + 0.2 ? 1 : 1 - ease.out(clamp((lt - T_HUNG - 0.2) / 0.5, 0, 1));
          if (hk > 0) fist(g, sx + 20 + ox, lerp(-400, sy - 120, hk), 1.1, Math.PI + 0.2, { sleeve: '#1e2226', cuff: K.mag, len: 900 });
        }, d: 0.4 },
      ], cam);
      leaves(c, lt + 11, { n: 5, seed: 93, cam });
      D.tag(c, '6.10.2026 · KAJAANI · MUHOS', 110, 1690, clamp((lt - 0.5) / 0.3, 0, 1));
      box(c);
    },
  };
})();
