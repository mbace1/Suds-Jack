// Water Downhill — a tilt puzzle, small cousin of the aqueduct. Four stone
// ledges and a trickle from above; tap a ledge to flip which way it slopes, and
// route the water all the way down until it runs off the edge of the world in
// luminescent cyan (the breakout). Water never pushes — it takes the first
// opening you give it. Revert: pour water on a real slope and watch it choose.

import { PixelScreen, rampDither } from '../pixel.js?v=29';
import { PAL } from '../palette.js?v=29';

const INLET = 92;
const STONE = ['#2c2a26', '#433f37', '#5e594d', '#7c7565', '#9c9482'];
const CY = PAL.CYAN_LUX, CY_HI = '#c8fbf4';

// each ledge: a diagonal bar spanning [lo,hi] at height y (thickness h); tilt
// 'L' slopes down to the left (low end = lo), 'R' down to the right (= hi).
// spans are arranged so the water only chains down for one route: L,R,L,(any)
const LED = [
  { y: 32, h: 8, lo: 60, hi: 124, tilt: 'R' },
  { y: 56, h: 8, lo: 44, hi: 100, tilt: 'R' },
  { y: 80, h: 8, lo: 88, hi: 148, tilt: 'R' },
  { y: 104, h: 8, lo: 50, hi: 120, tilt: 'R' },
];

export const downhill = {
  id: 'downhill',
  kind: 'game',

  start(host, ctx) {
    const { t, audio, onComplete } = ctx;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen-wrap';
    host.appendChild(wrap);
    const textEl = document.createElement('div');
    textEl.className = 'exp-text';
    host.appendChild(textEl);
    const btnRow = document.createElement('div');
    btnRow.className = 'exp-buttons';
    host.appendChild(btnRow);

    const scr = new PixelScreen(wrap, 192, 128);
    const led = LED.map(l => ({ ...l }));   // per-run copy so tilts reset
    let phase = 'intro';   // intro → solve → flow → truth → outro
    let solvedT = 0, glowT = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('wd.s1');
    button(t('wd.begin'), () => {
      phase = 'solve';
      textEl.textContent = t('wd.hint');
      btnRow.innerHTML = '';
    });

    // low end (the draining side) and the ledge surface height at a given x
    const lowEnd = (L) => (L.tilt === 'L' ? L.lo : L.hi);
    const surfY = (L, x) => {
      const yL = L.tilt === 'L' ? L.y + L.h : L.y;   // left-end height
      const yR = L.tilt === 'L' ? L.y : L.y + L.h;   // right-end height
      return yL + (yR - yL) * (x - L.lo) / (L.hi - L.lo);
    };

    // trace the water from the inlet down through whatever ledges catch it
    function path() {
      const pts = [[INLET, 8]];
      let wx = INLET;
      for (const L of led) {
        if (wx < L.lo - 3 || wx > L.hi + 3) return { pts: [...pts, [wx, L.y]], solved: false };
        pts.push([wx, surfY(L, wx)]);
        const lo = lowEnd(L);
        pts.push([lo, L.y + L.h]);
        wx = lo;
      }
      pts.push([wx, 130]);
      return { pts, solved: true };
    }

    function onTap(e) {
      if (dead || phase !== 'solve') return;
      const p = scr.toPixel(e);
      for (const L of led) {
        if (p.x >= L.lo && p.x <= L.hi && p.y >= L.y - 5 && p.y <= L.y + L.h + 6) {
          L.tilt = L.tilt === 'L' ? 'R' : 'L';
          audio.step();
          return;
        }
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function truth() {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('wd.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('wd.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('wd.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── rendering ────────────────────────────────────────────────
    function ledge(L) {
      const yL = L.tilt === 'L' ? L.y + L.h : L.y;
      const yR = L.tilt === 'L' ? L.y : L.y + L.h;
      const n = L.hi - L.lo;
      for (let i = 0; i <= n; i++) {
        const x = L.lo + i, y = yL + (yR - yL) * i / n;
        for (let d = 0; d < 5; d++) scr.px(x, y + d, 1, 1, rampDither(STONE, 0.75 - d * 0.14, x, y + d));
      }
      // a little cup at the low end so the eye reads the drain direction
      const lx = lowEnd(L);
      scr.px(lx - 1, (L.tilt === 'L' ? yL : yR) - 2, 3, 2, STONE[1]);
    }

    function water(now, res) {
      const { pts, solved } = res;
      // cumulative lengths for animating droplets along the polyline
      const seg = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        seg.push(l); total += l;
      }
      const at = (dist) => {
        let dd = dist;
        for (let i = 0; i < seg.length; i++) {
          if (dd <= seg[i]) { const tt = dd / (seg[i] || 1); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * tt, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * tt]; }
          dd -= seg[i];
        }
        return pts[pts.length - 1];
      };
      // the thin channel of water, then bright droplets running down it
      for (let d = 0; d < total; d += 2) { const [x, y] = at(d); scr.px(x, y, 1, 1, CY); }
      for (let k = 0; k < 7; k++) {
        const dist = ((now / 5 + k * (total / 7)) % total);
        const [x, y] = at(dist);
        scr.px(x, y, 1, 1, CY_HI); scr.px(x, y + 1, 1, 1, CY);
      }
      if (!solved) {                                   // a dead trickle drips and fades
        const [ex, ey] = pts[pts.length - 1];
        for (let i = 0; i < 4; i++) {
          const yy = ey + ((now / 8 + i * 9) % 16);
          if (yy < 128) scr.px(ex, yy, 1, 1, i % 2 ? CY : '#2a6a68');
        }
      } else {                                         // it pours off the world — breakout
        const [ex] = pts[pts.length - 1];
        scr.softDisc(ex, 126, 10 + Math.min(20, glowT * 20), '#0a2e2c', 14);
        for (let i = 0; i < 6; i++) scr.px(ex - 3 + i, 122 + (i % 3), 1, 4, i % 2 ? CY : CY_HI);
      }
    }

    function draw(now, dt) {
      const res = phase === 'intro' ? { pts: [[INLET, 8], [INLET, 30]], solved: false } : path();
      if (phase === 'solve') {
        if (res.solved) { solvedT += dt; if (solvedT > 1.1) truth(); }
        else solvedT = 0;
      }
      if (res.solved || phase === 'truth' || phase === 'outro') glowT += dt;

      scr.clear(PAL.VOID);
      scr.softDisc(96, 68, 66, '#0a1414', 24);         // a cool cavern halo in the void
      scr.px(INLET - 3, 4, 6, 6, STONE[2]);            // the spout the water falls from
      led.forEach(ledge);
      water(now, phase === 'intro' ? { pts: [[INLET, 8], [INLET, 128]], solved: false } : res);
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (phase === 'truth' || phase === 'outro') glowT += dt;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      destroy() {
        dead = true;
        cancelAnimationFrame(raf);
        scr.destroy();
        host.innerHTML = '';
      },
    };
  },
};
