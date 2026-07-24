// The Forest Path — a short branching walk in pixel scenes, ending with a
// guided four-breath pause. The interactivity is choice, the reward is calm.

import { PixelScreen } from '../pixel.js?v=19';
import { PAL } from '../palette.js?v=19';

const BREATHS = 4;
const BREATH_SEC = 4;   // per half: 4 s in, 4 s out

export const forest = {
  id: 'forest',
  kind: 'story',

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
    let scene = 's1';           // s1 → s2a|s2b → s3 → breathe → outro
    let breatheT = -1;          // seconds into the breathing finale, -1 = off
    let lastHalf = -1;
    let raf = 0, dead = false;

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    function show(key, choices) {
      scene = key;
      textEl.textContent = t(`fo.${key}`);
      btnRow.innerHTML = '';
      for (const [label, next] of choices) button(label, next);
    }

    function startBreathing() {
      scene = 'breathe';
      breatheT = 0;
      lastHalf = -1;
      textEl.textContent = t('fo.breathe.hint');
      btnRow.innerHTML = '';
    }

    function showOutro() {
      scene = 'outro';
      breatheT = -1;
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('fo.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('fo.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    function trees(seed, ground) {
      for (let i = 0; i < 10; i++) {
        const x = ((seed * 31 + i * 41) % 188);
        const h = 26 + ((seed * 7 + i * 13) % 22);
        scr.px(x, ground - h, 3, h, PAL.BARK);
        // each crown gets a crisp dark rim so the canopy reads as defined shapes
        scr.disc(x + 1, ground - h - 4, 6 + (i % 3), i % 2 ? PAL.MOSS : PAL.MOSS_DEEP, PAL.FOREST_FAR);
      }
    }

    function drawScene(now) {
      const sway = Math.sin(now / 900) * 1.5;
      if (scene === 's1') {
        scr.bands(0, 0, scr.w, 60, [PAL.SKY_DAWN_TOP, '#8a6a80', PAL.SKY_DAWN_LOW]);
        scr.px(0, 60, scr.w, 68, PAL.FOREST_FAR);         // deep forest behind the trunks
        scr.px(0, 96, scr.w, 32, PAL.MOSS_DEEP);          // moss begins
        scr.px(0, 88, scr.w, 8, PAL.EARTH);               // the road you leave
        trees(3, 96);
        scr.px(20 + sway, 60, 2, 2, PAL.SUN);             // early light through trunks
      } else if (scene === 's2a') {
        scr.bands(0, 0, scr.w, 56, [PAL.SKY_DAY_TOP, PAL.SKY_DAY_LOW]);
        scr.px(0, 56, scr.w, 72, PAL.MOSS);
        scr.px(0, 92, scr.w, 36, PAL.MOSS_DEEP);
        trees(7, 92);
        scr.px(0, 100, scr.w, 8, PAL.WATER);              // the ribbon stream
        scr.px(0, 100, scr.w, 1, PAL.FOAM);
        scr.px(120, 82, 3, 18, '#9aa4ac');                // the heron
        scr.disc(121, 80, 3, '#9aa4ac');
        scr.px(124, 79, 5, 2, PAL.GOLD);                  // beak
      } else if (scene === 's2b') {
        scr.bands(0, 0, scr.w, 70, [PAL.SKY_DAY_TOP, '#93bfdd', PAL.SKY_DAY_LOW]);
        scr.disc(150, 21, 9, PAL.EMBER);                  // warm halo
        scr.disc(150, 20, 8, PAL.SUN, PAL.EMBER);
        scr.px(0, 110, scr.w, 18, PAL.MOSS_DEEP);         // forest far below
        scr.px(0, 70, scr.w, 40, PAL.MOSS);               // the ridge
        for (let i = 0; i < 6; i++) {                     // leaning pines
          const x = 15 + i * 30;
          scr.px(x + sway, 44, 3, 28, PAL.BARK);
          scr.disc(x + 1 + sway * 1.5, 42, 7, PAL.MOSS_DEEP);
        }
      } else { // s3, breathe, outro share the mossy stone clearing
        scr.bands(0, 0, scr.w, 60, [PAL.SKY_DAY_TOP, '#a9cde2', PAL.SKY_DAY_LOW]);
        scr.px(0, 60, scr.w, 68, PAL.MOSS);
        scr.px(0, 92, scr.w, 36, PAL.MOSS_DEEP);
        trees(11, 92);
        scr.disc(96, 100, 12, PAL.STONE, PAL.STONE_LINE); // the stone, defined rim
        scr.px(86, 92, 20, 4, PAL.MOSS);                  // its moss cushion
        if (scene === 'breathe') drawBreath();
      }
    }

    function drawBreath() {
      const half = Math.floor(breatheT / BREATH_SEC);
      const inhale = half % 2 === 0;
      if (half !== lastHalf && half < BREATHS * 2) {
        lastHalf = half;
        audio.breath(inhale);
        textEl.textContent = t(inhale ? 'fo.breathe.in' : 'fo.breathe.out');
      }
      const k = (breatheT % BREATH_SEC) / BREATH_SEC;
      const r = 8 + (inhale ? k : 1 - k) * 22;
      // breathing circle floats over the clearing, ring only — sky stays visible
      for (let a = 0; a < 64; a++) {
        const th = a / 64 * Math.PI * 2;
        scr.px(96 + Math.cos(th) * r, 52 + Math.sin(th) * r * 0.9, 2, 2, PAL.FOAM);
      }
    }

    let last = performance.now();
    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (breatheT >= 0) {
        breatheT += dt;
        if (breatheT >= BREATHS * 2 * BREATH_SEC) { audio.chime(); showOutro(); }
      }
      drawScene(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    show('s1', [
      [t('fo.s1.a'), () => show('s2a', s2Choices())],
      [t('fo.s1.b'), () => show('s2b', s2Choices())],
    ]);

    function s2Choices() {
      return [
        [t('fo.s2.a'), () => show('s3', [[t('ui.continue'), startBreathing]])],
        [t('fo.s2.b'), () => show('s3', [[t('ui.continue'), startBreathing]])],
      ];
    }

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
