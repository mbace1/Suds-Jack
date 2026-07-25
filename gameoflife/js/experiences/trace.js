// Trace the Chaos — a free-form constellation game. The stars do not come
// joined; every constellation anyone ever saw, someone drew. Here is a field
// of stars in the void — tap one, then another, and trace whatever shape you
// see. The dithered purple nebula blooms around what you connect. The pattern
// is yours: the sky was never arranged, we arranged it. Extends `stars`; built
// to ideas/ref/constellation-nebula.png. Revert: name your own star pattern.

import { PixelScreen, bayer, rampDither } from '../pixel.js?v=25';
import { PAL } from '../palette.js?v=25';

// a scattered field of connectable stars (the bright gold nodes)
const STARS = [
  [40, 84], [58, 70], [82, 64], [104, 62], [128, 56], [152, 46],
  [150, 70], [126, 82], [96, 40], [120, 34], [70, 46], [46, 56],
];
const TAP_R = 11;
const MIN_SEG = 5;                 // segments before "name it" is offered

// colored field sparkles (blue / red / white), reference-style
const FIELD = [
  [30, 40, '#8ec8ff'], [64, 30, '#bfe0ff'], [88, 96, '#8ec8ff'],
  [140, 100, '#e07a6a'], [110, 104, '#bfe0ff'], [168, 84, '#e07a6a'],
  [24, 96, '#bfe0ff'], [156, 24, '#8ec8ff'],
];

const NEB = ['#180c26', '#2c1842', '#442860', '#5c3c80', '#7a52a0'];
const GOLD = PAL.GOLD_LUX, GOLD_CORE = '#fff2c0', GOLD_DARK = '#7a5410';

export const trace = {
  id: 'trace',
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
    let phase = 'intro';   // intro → draw → named → outro
    let pen = -1;          // index of the star the line is drawing from
    const segs = [];       // [i, j] pairs already drawn
    let named = false;     // has the "name it" button been offered
    let bloom = 0, glowT = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('tr.s1');
    button(t('tr.begin'), () => {
      phase = 'draw';
      textEl.textContent = t('tr.hint');
      btnRow.innerHTML = '';
    });

    const hasSeg = (a, b) => segs.some(([i, j]) => (i === a && j === b) || (i === b && j === a));

    function onTap(e) {
      if (dead || phase !== 'draw') return;
      const p = scr.toPixel(e);
      let hit = -1;
      for (let i = 0; i < STARS.length; i++) {
        if (Math.hypot(p.x - STARS[i][0], p.y - STARS[i][1]) <= TAP_R) { hit = i; break; }
      }
      if (hit < 0) return;
      if (pen < 0) { pen = hit; audio.plink(); return; }
      if (hit !== pen && !hasSeg(pen, hit)) {
        segs.push([pen, hit]);
        audio.plink();
      }
      pen = hit;
      if (segs.length >= MIN_SEG && !named) {
        named = true;
        textEl.textContent = t('tr.enough');
        button(t('tr.name'), nameIt);
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function nameIt() {
      phase = 'named';
      glowT = 0;
      audio.water();
      textEl.textContent = t('tr.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('tr.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('tr.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── rendering ────────────────────────────────────────────────
    // the dithered nebula, blooming around the stars you have connected;
    // centre + spread come from the used nodes, opacity from `bloom`
    function nebula() {
      const used = new Set();
      segs.forEach(([i, j]) => { used.add(i); used.add(j); });
      if (!used.size) return;
      let mx = 0, my = 0;
      used.forEach(i => { mx += STARS[i][0]; my += STARS[i][1]; });
      mx /= used.size; my /= used.size;
      let rr = 30;
      used.forEach(i => { rr = Math.max(rr, Math.hypot(STARS[i][0] - mx, STARS[i][1] - my) + 22); });
      const extra = phase === 'named' || phase === 'outro' ? 8 : 0;   // breakout swell
      const RX = rr + extra, RY = rr * 0.8 + extra;
      for (let y = my - RY; y <= my + RY; y += 2) {
        for (let x = mx - RX; x <= mx + RX; x += 2) {
          const d = ((x - mx) / RX) ** 2 + ((y - my) / RY) ** 2;
          if (d > 1) continue;
          const fall = 1 - d;                        // brighter toward centre
          if (bayer(x, y) < bloom * fall * 1.1) {
            scr.px(x, y, 2, 2, rampDither(NEB, fall, x, y));
          }
        }
      }
    }

    function sparkle(x, y, c, big) {
      scr.px(x, y, 1, 1, c);
      if (big) {
        scr.px(x - 2, y, 1, 1, c); scr.px(x + 2, y, 1, 1, c);
        scr.px(x, y - 2, 1, 1, c); scr.px(x, y + 2, 1, 1, c);
        scr.px(x - 1, y, 1, 1, c); scr.px(x + 1, y, 1, 1, c);
        scr.px(x, y - 1, 1, 1, c); scr.px(x, y + 1, 1, 1, c);
      }
    }

    function glowLine(x0, y0, x1, y1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
        scr.px(x, y + 1, 1, 1, GOLD_DARK);
        scr.px(x, y, 1, 1, GOLD);
        if (k % 3 === 0) scr.px(x, y, 1, 1, GOLD_CORE);
      }
    }

    function node(x, y, r, core) {
      scr.softDisc(x, y, r + 2, '#3a2a08', 3);
      scr.disc(x, y, r, GOLD);
      if (core) scr.px(x, y, 1, 1, GOLD_CORE);
    }

    function draw(now, dt) {
      const target = phase === 'named' || phase === 'outro' ? 1 : Math.min(1, segs.length / 6);
      bloom += (target - bloom) * Math.min(1, dt * 3);
      glowT += dt;

      scr.clear(PAL.VOID);
      nebula();
      // field sparkles over the cloud, twinkling
      const tw = Math.floor(now / 400) % 2 === 0;
      FIELD.forEach(([x, y, c], i) => sparkle(x, y, c, (i % 2 === 0) === tw));
      for (let i = 0; i < 34; i++) {                 // faint dust of far stars
        const x = (i * 53 + 11) % 190, y = (i * 29 + 7) % 122;
        if (Math.sin(now / 600 + i) > -0.4) scr.px(x, y, 1, 1, '#4a4468');
      }

      // the lines you have drawn
      segs.forEach(([i, j]) => glowLine(...STARS[i], ...STARS[j]));
      // a live rubber-band from the pen to nowhere yet — a soft dotted hint
      if (phase === 'draw' && pen >= 0) {
        const [px, py] = STARS[pen];
        for (let a = 0; a < 8; a++) scr.px(px + Math.cos(glowT * 2 + a) * (6 + a), py + Math.sin(glowT * 2 + a) * (6 + a) * 0.7, 1, 1, a % 2 ? GOLD : GOLD_DARK);
      }

      // the connectable stars; the pen pulses
      STARS.forEach(([x, y], i) => {
        const isPen = i === pen;
        const r = isPen ? 2 + (Math.sin(glowT * 6) > 0 ? 1 : 0) : 2;
        node(x, y, r, i === pen || segs.some(([a, b]) => a === i || b === i));
      });

      sparkle(172, 110, '#cfd8e0', true);            // the lone void star, signature
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
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
