// The Right to Roam — jokamiehenoikeus, taught the way it is actually
// learned: a July blueberry walk with grandmother through somebody else's
// forest, which is also everyone's. Ends with the quiet fee the right asks.

import { PixelScreen } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

const BILBERRY = '#4a3a6b', BILBERRY_LIT = '#6b5a9b', BUCKET = '#c9502e';

export const berry = {
  id: 'berry',
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
      textEl.textContent = t(`be.${key}`);
      btnRow.innerHTML = '';
      for (const [label, next] of choices) button(label, next);
    }

    function showOutro() {
      scene = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('be.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('be.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    function spruce(x, ground, h) {
      scr.px(x, ground - h, 3, h, PAL.BARK);
      for (let l = 0; l < 4; l++) {                     // layered boughs
        const w = 4 + l * 3;
        scr.px(x + 1 - w / 2, ground - h + 2 + l * 5, w, 3, l % 2 ? PAL.MOSS_DEEP : PAL.FOREST_FAR);
      }
    }

    function understory(ground, withBerries, now) {
      scr.px(0, ground, scr.w, 128 - ground, PAL.MOSS_DEEP);
      for (let i = 0; i < 26; i++) {                    // blueberry shrubs
        const x = (i * 23) % 190, y = ground + 4 + (i * 11) % (120 - ground);
        scr.px(x, y, 4, 2, PAL.MOSS);
        if (withBerries) scr.px(x + 1, y - 1, 2, 2, i % 3 ? BILBERRY : BILBERRY_LIT);
      }
    }

    function person(x, y, tall, robe) {
      scr.px(x, y - tall, 4, tall, robe);
      scr.px(x + 1, y - tall - 3, 2, 3, '#d8b48f');
    }

    function bucket(x, y) {
      scr.px(x, y, 6, 5, BUCKET);
      scr.px(x + 1, y - 2, 4, 1, PAL.INK_SOFT);
    }

    function drawScene(now) {
      if (scene === 's1' || scene === 's2a') {
        // the forest edge in July light
        scr.bands(0, 0, scr.w, 56, [PAL.SKY_DAY_TOP, '#a9cde2', PAL.SKY_DAY_LOW]);
        scr.px(0, 56, scr.w, 24, PAL.FOREST_FAR);       // deep woods behind the trunks
        understory(80, true, now);
        for (let i = 0; i < 7; i++) spruce(12 + i * 28, 82, 34 + (i * 7) % 14);
        person(60, 104, 12, '#5d7a8a');                 // grandmother
        person(78, 104, 8, BUCKET);                     // the child, berry-red anorak
        bucket(52, 100); bucket(86, 101);
      } else if (scene === 's2b' || scene === 's3') {
        // deep in the patch: berries everywhere, fingers already purple
        scr.bands(0, 0, scr.w, 40, ['#a9cde2', PAL.SKY_DAY_LOW]);
        understory(44, true, now);
        for (let i = 0; i < 4; i++) spruce(20 + i * 48, 50, 26);
        person(96, 96, 8, BUCKET);
        bucket(106, 92);
        scr.px(80, 100, 3, 2, BILBERRY); scr.px(120, 106, 3, 2, BILBERRY);
        if (scene === 's3') {                           // thunder far off: darkening east
          scr.px(150, 0, 42, 40, '#4a4a5e');
          scr.px(140, 8, 20, 22, '#5a5a6e');
        }
      } else if (scene === 's4a') {
        // under the great spruce, rain combed aside
        scr.bands(0, 0, scr.w, 50, ['#4a4a5e', '#5a5a6e', '#6a6a7e']);
        for (let i = 0; i < 6; i++) {                   // rain
          const rx = (i * 37 + now / 6) % 200;
          scr.px(rx, (now / 4 + i * 31) % 60, 1, 4, '#8a9ab0');
        }
        understory(70, false, now);
        spruce(90, 110, 52);                            // the shelter tree, huge
        person(84, 106, 12, '#5d7a8a');
        person(98, 106, 8, BUCKET);
      } else if (scene === 's4b') {
        // racing the rain home, buckets full
        scr.bands(0, 0, scr.w, 54, ['#5a5a6e', '#7a7a8e', PAL.SKY_DAY_LOW]);
        understory(70, false, now);
        for (let i = 0; i < 5; i++) spruce(10 + i * 40, 74, 30);
        person(50 + (now / 60) % 60, 100, 12, '#5d7a8a');
        person(70 + (now / 60) % 60, 100, 8, BUCKET);
      } else {
        // mummola kitchen: pie in the window light, rain outside
        scr.bands(0, 0, scr.w, 128, ['#3a3428', '#4a4234', '#5a5040']);
        scr.px(20, 12, 44, 40, '#7a8aa0');              // window, rain-grey
        for (let i = 0; i < 4; i++) scr.px(24 + i * 9, 14 + (now / 8 + i * 17) % 34, 1, 3, '#9aaac0');
        scr.px(40, 12, 2, 40, PAL.INK_SOFT); scr.px(20, 30, 44, 2, PAL.INK_SOFT);
        scr.px(0, 78, scr.w, 50, PAL.BARK);             // table
        scr.px(0, 78, scr.w, 3, '#7a5d46');
        scr.disc(96, 74, 14, '#d9a05c');                // the pie
        scr.px(84, 68, 24, 4, '#c98a48');
        scr.px(90, 70, 4, 3, BILBERRY); scr.px(100, 72, 4, 3, BILBERRY);  // filling showing
        bucket(140, 74);
        scr.px(141, 70, 4, 2, BILBERRY);                // what's left of the haul
      }
    }

    function loop(now) {
      if (dead) return;
      drawScene(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    show('s1', [
      [t('be.s1.a'), () => show('s2a', s3Choice())],
      [t('be.s1.b'), () => show('s2b', s3Choice())],
    ]);

    function s3Choice() {
      return [[t('ui.continue'), () => show('s3', [
        [t('be.s3.a'), () => show('s4a', [[t('ui.continue'), () => show('s5', [[t('ui.continue'), showOutro]])]])],
        [t('be.s3.b'), () => show('s4b', [[t('ui.continue'), () => show('s5', [[t('ui.continue'), showOutro]])]])],
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
