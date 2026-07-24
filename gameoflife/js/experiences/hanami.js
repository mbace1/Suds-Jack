// Under the Blossoms — how hanami began: the Heian court's first blossom
// party, Edo's riverbank picnics, and the lesson underneath it all —
// mono no aware, the gathering that exists because the bloom will end.

import { PixelScreen } from '../pixel.js?v=19';
import { PAL } from '../palette.js?v=19';

const PINK = '#e8a8b8', PINK_DEEP = '#c97f95', PINK_PALE = '#f2cdd6';

export const hanami = {
  id: 'hanami',
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
    let scene = 's1';   // s1 → s2a|s2b → s3 → s4a|s4b → outro
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
      textEl.textContent = t(`ha.${key}`);
      btnRow.innerHTML = '';
      for (const [label, next] of choices) button(label, next);
    }

    function showOutro() {
      scene = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('ha.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('ha.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // a blossoming crown: overlapping pink discs with a defined deep-pink rim
    function sakura(cx, cy, r) {
      scr.disc(cx - r * 0.6, cy, r * 0.7, PINK, '#a85f75');
      scr.disc(cx + r * 0.6, cy + 1, r * 0.7, PINK_DEEP, '#a85f75');
      scr.disc(cx, cy - r * 0.5, r * 0.8, PINK, '#a85f75');
      scr.disc(cx + r * 0.2, cy + r * 0.3, r * 0.6, PINK_PALE);
    }

    // drifting petals, deterministic per index so they loop seamlessly
    function petals(now, count, yMax = 128) {
      for (let i = 0; i < count; i++) {
        const speed = 12 + (i % 5) * 4;
        const y = ((now / 1000) * speed + i * 37) % (yMax + 10);
        const x = (i * 53 + Math.sin(now / 700 + i) * 9 + (now / 1000) * 6) % 200;
        scr.px(x - 4, y, 2, 2, i % 3 ? PINK : PINK_PALE);
      }
    }

    function figure(x, y, robe) {
      scr.px(x, y, 4, 6, robe);
      scr.px(x + 1, y - 3, 2, 3, '#d8b48f');
    }

    function drawScene(now) {
      if (scene === 's1' || scene === 's2a') {
        // the emperor's garden, a pavilion, one great tree
        scr.bands(0, 0, scr.w, 62, ['#cfe3ea', '#dcebf0', '#e8f2f4', PAL.SKY_DAY_LOW]);
        scr.px(0, 62, scr.w, 66, PAL.MOSS);
        scr.px(0, 104, scr.w, 24, PAL.MOSS_DEEP);
        scr.px(128, 30, 44, 32, PAL.INK_SOFT);          // pavilion
        scr.px(124, 26, 52, 6, PAL.INK);                // its roof
        scr.px(132, 40, 8, 22, PAL.PAPER_DIM);          // shoji panels
        scr.px(148, 40, 8, 22, PAL.PAPER_DIM);
        scr.px(52, 40, 5, 30, PAL.BARK);                // the tree
        scr.px(48, 52, 5, 4, PAL.BARK);
        sakura(54, 30, 14);
        if (scene === 's2a') {                          // the poets beneath
          figure(38, 68, '#7a5d8a'); figure(62, 72, '#8a5d5d'); figure(50, 76, '#5d7a8a');
          scr.px(36, 78, 32, 2, PAL.PAPER);             // the long poem-paper
        }
        petals(now, 14, 100);
      } else if (scene === 's2b') {
        // the pond: petals sailing off like little boats
        scr.bands(0, 0, scr.w, 48, ['#cfe3ea', '#e8f2f4', PAL.SKY_DAY_LOW]);
        scr.px(0, 48, scr.w, 80, PAL.MOSS);
        scr.px(0, 72, scr.w, 40, PAL.WATER);            // the pond
        scr.px(0, 72, scr.w, 2, PAL.FOAM);
        for (let i = 0; i < 10; i++) {                  // petals on the current
          const x = (i * 41 + now / 90) % 200;
          scr.px(x - 4, 78 + (i % 4) * 8, 3, 1, i % 2 ? PINK : PINK_PALE);
        }
        figure(24, 62, '#8a5d5d');                      // the servant girl, watching
        sakura(160, 30, 12);
        scr.px(158, 40, 4, 24, PAL.BARK);
        petals(now, 8, 70);
      } else if (scene === 's3' || scene === 's4a' || scene === 's4b') {
        // Edo: a river, a bridge, a whole city under planted rows
        scr.bands(0, 0, scr.w, 54, ['#a9cde2', '#cfe3ea', PAL.SKY_DAY_LOW]);
        scr.px(0, 54, scr.w, 74, PAL.MOSS);
        scr.px(0, 88, scr.w, 22, PAL.WATER);            // the river
        scr.px(0, 88, scr.w, 2, PAL.FOAM);
        scr.px(60, 80, 70, 6, PAL.BARK);                // the bridge arc (flat pixel take)
        scr.px(70, 74, 50, 6, PAL.BARK);
        for (let i = 0; i < 5; i++) {                   // the planted row
          const x = 20 + i * 38;
          scr.px(x, 40, 4, 18, PAL.BARK);
          sakura(x + 2, 30, 11);
        }
        for (let i = 0; i < 9; i++) figure(14 + i * 20, 62 + (i % 3) * 4, ['#7a5d8a', '#8a5d5d', '#5d7a8a'][i % 3]);
        petals(now, scene === 's4b' ? 26 : 16, 86);
        if (scene === 's4b') scr.px(0, 84, scr.w, 4, PINK_PALE);   // the second blooming underfoot
      } else {
        // outro: dusk, the bloom letting go
        scr.bands(0, 0, scr.w, 70, [PAL.SKY_DUSK_TOP, '#5a4258', '#8a5d6d', PAL.SKY_DUSK_LOW]);
        scr.px(0, 70, scr.w, 58, '#2e2735');
        scr.px(0, 70, scr.w, 6, PINK_PALE);             // fallen petals carpet the dark
        scr.px(90, 40, 5, 30, PAL.BARK);
        sakura(92, 28, 13);
        petals(now, 22, 70);
      }
    }

    function loop(now) {
      if (dead) return;
      drawScene(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    show('s1', [
      [t('ha.s1.a'), () => show('s2a', s3Choice())],
      [t('ha.s1.b'), () => show('s2b', s3Choice())],
    ]);

    function s3Choice() {
      return [[t('ui.continue'), () => show('s3', [
        [t('ha.s3.a'), () => show('s4a', [[t('ui.continue'), showOutro]])],
        [t('ha.s3.b'), () => show('s4b', [[t('ui.continue'), showOutro]])],
      ])]];
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
