// Toko Move — JUICE: deliveries you can feel (leap 2, v2.51).
//
// A delivery used to be a line in the feed and a number that changed. It is a
// moment now, and every beat of it is something the game already knew:
//
//   DELIVERED  the door flashes (a ring off the stop), the parcel pops up and
//              away, coins fly off toward the score, and the score bumps.
//   LATE       the parcel comes out cracked and shakes, the fee is red, and the
//              chain's multiplier stutters as it breaks.
//   A DROP     a smaller ring and its fee — extra, and it looks extra.
//   THE CHAIN  every step up the on-time multiplier punches in over the
//              courier and the HUD's ×N bumps with it.
//
// It RECORDS BY WATCHING, like shiftlog.js: nothing in deliveries.js knows it
// exists. Each frame it compares the score, the results and the multiplier with
// the last frame and turns the difference into effects, so it cannot disagree
// with the numbers — it is drawn FROM them. Under prefers-reduced-motion the
// coins, the shake and the punch are dropped and the words stay.
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const LIFE = { deliver: 1.4, late: 1.5, drop: 0.95, mult: 0.9 };

export function mountJuice(tm) {
  if (tm.juice) return tm.juice;
  const fx = [], seen = [];
  let prev = null;
  const bump = (id, cls) => { const el = document.getElementById(id); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function poll(now = performance.now()) {
    const ch = tm.challenge; if (!ch) return;
    const cur = { score: ch.score || 0, n: (ch.results || []).length, mult: ch.streakMult?.() || 1 };
    if (!prev) { prev = cur; return; }
    const ll = tm.courierLatLon?.();
    if (cur.score > prev.score && ll) {
      const amount = cur.score - prev.score, main = cur.n > prev.n, late = main && ch.results[cur.n - 1] === 'late';
      const kind = main ? (late ? 'late' : 'deliver') : 'drop';
      fx.push({ kind, t0: now, ll, amount }); seen.push(kind); bump('score', 'jBump');
    }
    if (cur.mult > prev.mult && ll) { fx.push({ kind: 'mult', t0: now + 250, ll, amount: cur.mult }); seen.push('mult'); bump('mult', 'jBump'); }
    else if (cur.mult < prev.mult) bump('mult', 'jBreak');
    prev = cur;
  }

  function draw(ctx, project, dpr = 1, now = performance.now()) {
    poll(now);
    const calm = reduced();
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], t = (now - f.t0) / 1000;
      if (t < 0) continue;
      if (t > LIFE[f.kind]) { fx.splice(i, 1); continue; }
      const p = project(f.ll.lat, f.ll.lon), k = t / LIFE[f.kind];
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      if (f.kind === 'deliver' || f.kind === 'drop') {
        // the door: a ring off the stop
        const big = f.kind === 'deliver', r = (6 + (big ? 42 : 24) * Math.min(1, t / 0.55)) * dpr, a = Math.max(0, 1 - t / 0.55);
        ctx.strokeStyle = `rgba(122,196,120,${a.toFixed(2)})`; ctx.lineWidth = (big ? 4 : 3) * dpr; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      }
      if (f.kind === 'deliver' && !calm) {
        // the parcel pops up and away
        const pt = Math.min(1, t / 0.8), s = (10 + 8 * Math.sin(Math.min(1, pt * 1.6) * Math.PI / 2)) * dpr, y = p.y - (14 + 34 * pt) * dpr;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, pt - 0.6) / 0.4); ctx.fillStyle = '#c58b3c'; ctx.strokeStyle = '#17242b'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.roundRect(p.x - s / 2, y - s / 2, s, s, 2 * dpr); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#f3e3c3'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.moveTo(p.x - s / 2, y); ctx.lineTo(p.x + s / 2, y); ctx.moveTo(p.x, y - s / 2); ctx.lineTo(p.x, y + s / 2); ctx.stroke(); ctx.globalAlpha = 1;
        // coins fly off toward the score, up and out of the top of the map
        for (let c = 0; c < 7; c++) {
          const ct = (t - 0.15 - c * 0.05) / 0.75; if (ct <= 0 || ct >= 1) continue;
          const sx = p.x + (c - 3) * 5 * dpr, sy = p.y - 10 * dpr, ex = p.x * 0.25, ey = -30 * dpr, mx = (sx + ex) / 2 + (c - 3) * 18 * dpr, my = Math.min(sy, ey) - 40 * dpr;
          const u = ct, x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex, yy = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey;
          ctx.fillStyle = '#f2c94c'; ctx.strokeStyle = '#8a6a12'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.arc(x, yy, 3.2 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      if (f.kind === 'late') {
        // the parcel comes out cracked, and shakes
        const shake = calm ? 0 : Math.sin(t * 60) * 3 * dpr * Math.max(0, 1 - t / 0.6), s = 18 * dpr, y = p.y - 26 * dpr, x = p.x + shake;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.7) / 0.3); ctx.fillStyle = '#8d8a84'; ctx.strokeStyle = '#17242b'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.roundRect(x - s / 2, y - s / 2, s, s, 2 * dpr); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#17242b'; ctx.lineWidth = 1.6 * dpr; ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s / 2); ctx.lineTo(x + s * 0.12, y - s * 0.15); ctx.lineTo(x - s * 0.08, y + s * 0.05); ctx.lineTo(x + s * 0.1, y + s / 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (f.kind !== 'mult') {
        // the fee, rising
        const txt = `${f.kind === 'late' ? 'LATE ' : ''}+${f.amount}`, y = p.y - (f.kind === 'deliver' ? 52 : f.kind === 'late' ? 48 : 26) * dpr - 18 * dpr * k;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.55) / 0.45); ctx.font = `900 ${Math.round((f.kind === 'drop' ? 11 : 15) * dpr)}px ui-monospace,monospace`;
        ctx.lineWidth = 4 * dpr; ctx.strokeStyle = '#fffdf7'; ctx.strokeText(txt, p.x, y); ctx.fillStyle = f.kind === 'late' ? '#b34a36' : f.kind === 'drop' ? '#3f7a45' : '#233d4d'; ctx.fillText(txt, p.x, y); ctx.globalAlpha = 1;
      } else {
        // the chain punches in
        const sc = calm ? 1 : 1 + 0.9 * Math.max(0, 1 - t / 0.25), y = p.y + 30 * dpr;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.5) / 0.5); ctx.font = `900 ${Math.round(18 * sc * dpr)}px ui-monospace,monospace`;
        ctx.lineWidth = 5 * dpr; ctx.strokeStyle = '#fffdf7'; const txt = `×${String(f.amount.toFixed(2)).replace(/0+$/, '').replace(/\.$/, '')}`;
        ctx.strokeText(txt, p.x, y); ctx.fillStyle = '#3f7a45'; ctx.fillText(txt, p.x, y); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }
  tm.juice = { draw, poll, live: () => fx.map(f => f.kind), seen: () => seen.slice() };
  return tm.juice;
}
