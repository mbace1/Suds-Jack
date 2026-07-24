// The Longest Summer — an arctic tern's migration, pole to pole. A visual
// short story with two small choices and one astonishing true fact; it ends
// by pointing the player at the birds over their own head.

import { PixelScreen } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

export const tern = {
  id: 'tern',
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
    let scene = 's1';   // s1 → s2a|s2b → s3 → s4a|s4b → s5 → outro
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
      textEl.textContent = t(`te.${key}`);
      btnRow.innerHTML = '';
      for (const [label, next] of choices) button(label, next);
    }

    function showOutro() {
      scene = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('te.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('te.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // the tern: a few white pixels with black cap and swept wings
    function bird(x, y, flap) {
      const w = Math.round(Math.sin(flap) * 3);
      scr.px(x - 4, y - w, 4, 1, PAL.PAPER);      // left wing
      scr.px(x + 1, y - w, 4, 1, PAL.PAPER);      // right wing
      scr.px(x - 1, y, 3, 2, PAL.PAPER);          // body
      scr.px(x, y - 1, 2, 1, PAL.INK);            // black cap
      scr.px(x + 2, y + 1, 2, 1, PAL.INK_SOFT);   // forked tail
    }

    function waves(y0, rows, base, now) {
      for (let r = 0; r < rows; r++) {
        for (let x = 0; x < scr.w; x += 12) {
          const off = (now / 40 + r * 17 + x) % 12;
          scr.px(x + off, y0 + r * 7, 5, 1, r % 2 ? PAL.FOAM : PAL.WATER);
        }
        scr.px(0, y0 + r * 7 + 1, scr.w, 6, base);
      }
    }

    function drawScene(now) {
      const flap = now / 140;
      if (scene === 's1') {
        // arctic tundra, midnight sun skimming the horizon
        scr.bands(0, 0, scr.w, 70, [PAL.SKY_DAWN_TOP, '#7a6a8a', '#c98f7a', PAL.SKY_DAWN_LOW]);
        scr.disc(96, 66, 11, PAL.EMBER);          // ember halo of the midnight sun
        scr.disc(96, 66, 10, PAL.SUN, PAL.EMBER); // the sun that will not set
        scr.px(0, 70, scr.w, 58, PAL.MOSS_DEEP);  // tundra
        for (let i = 0; i < 14; i++) scr.px((i * 29) % 190, 76 + (i * 13) % 44, 3, 2, PAL.STONE);
        scr.px(0, 70, scr.w, 2, PAL.MOSS);
        bird(60, 60, flap);
        bird(120, 50, flap + 1.5);
      } else if (scene === 's2a' || scene === 's2b') {
        // open ocean, the flock heading south
        scr.bands(0, 0, scr.w, 62, [PAL.SKY_DAY_TOP, '#93bfdd', PAL.SKY_DAY_LOW]);
        scr.px(0, 62, scr.w, 66, PAL.WATER_DEEP);
        waves(64, 9, PAL.WATER_DEEP, now);
        for (let i = 0; i < 5; i++) bird(40 + i * 26, 26 + (i % 3) * 8, flap + i);
      } else if (scene === 's3') {
        // the storm wall
        scr.bands(0, 0, scr.w, 80, ['#23283b', '#2e3448', '#3a4058', '#23283b']);
        scr.px(0, 80, scr.w, 48, '#1c2233');
        waves(82, 6, '#1c2233', now * 2);
        for (let i = 0; i < 4; i++) {             // rain, driven sideways
          const rx = ((now / 3 + i * 47) % 200) - 4;
          scr.px(rx, 10 + i * 24, 8, 1, '#5a6a8a');
          scr.px(rx + 30, 22 + i * 20, 8, 1, '#5a6a8a');
        }
        bird(96, 54, flap * 2);
      } else if (scene === 's4a' || scene === 's4b') {
        // southern ocean: icebergs, antarctic light
        scr.bands(0, 0, scr.w, 64, ['#3a4a6b', '#6b8ab0', '#a9cde2', PAL.FOAM]);
        scr.px(0, 64, scr.w, 64, PAL.WATER_DEEP);
        waves(66, 8, PAL.WATER_DEEP, now);
        scr.px(20, 44, 34, 20, PAL.FOAM);         // berg one
        scr.px(28, 36, 14, 8, PAL.FOAM);
        scr.px(130, 50, 44, 14, '#d8e8f0');       // berg two
        bird(96, 30, flap);
      } else {
        // the second summer: antarctic pack ice under a second unsetting sun
        scr.bands(0, 0, scr.w, 70, ['#4a5a8a', '#8a7aa0', '#d9a97c', PAL.SKY_DAWN_LOW]);
        scr.disc(96, 64, 11, PAL.EMBER);
        scr.disc(96, 64, 10, PAL.SUN, PAL.EMBER);
        scr.px(0, 70, scr.w, 58, PAL.FOAM);       // ice to the horizon
        scr.px(0, 70, scr.w, 2, '#d8e8f0');
        for (let i = 0; i < 8; i++) scr.px((i * 47) % 180, 84 + (i * 19) % 36, 8, 2, '#c8dce8');
        bird(80, 52, flap);
        bird(110, 58, flap + 2);
      }
    }

    let last = performance.now();
    function loop(now) {
      if (dead) return;
      drawScene(now);
      raf = requestAnimationFrame(loop);
      last = now;
    }
    raf = requestAnimationFrame(loop);

    show('s1', [
      [t('te.s1.a'), () => show('s2a', s3Choice())],
      [t('te.s1.b'), () => show('s2b', s3Choice())],
    ]);

    function s3Choice() {
      return [[t('ui.continue'), () => show('s3', [
        [t('te.s3.a'), () => show('s4a', s5Choice())],
        [t('te.s3.b'), () => show('s4b', s5Choice())],
      ])]];
    }
    function s5Choice() {
      return [[t('ui.continue'), () => show('s5', [[t('ui.continue'), showOutro]])]];
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
