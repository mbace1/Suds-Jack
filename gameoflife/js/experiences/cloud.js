// The Cloudberry Patch — a midsummer mire under the midnight sun. You pick
// lakka, the amber gold of the north — but a bear's fresh track leads to the
// same patch, and at the mire's heart the finest cluster asks to be left. A
// companion to `berry` (jokamiehenoikeus): the right to roam carries the quiet
// duty to leave some behind. "Not everything beautiful is meant for you."

import { PixelScreen } from '../pixel.js?v=19';
import { PAL } from '../palette.js?v=19';

const CLOUD = '#f0b64a', CLOUD_LIT = '#ffd77a', CLOUD_RAW = '#c9502e';
const BEAR = '#33291f', PEAT = '#4a4030', BOG = '#3a5a66';

export const cloud = {
  id: 'cloud',
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
      textEl.textContent = t(`cl.${key}`);
      btnRow.innerHTML = '';
      for (const [label, next] of choices) button(label, next);
    }

    function showOutro() {
      scene = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('cl.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('cl.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    // the low midnight sun that rolls along without setting
    function midnightSun(now) {
      scr.bands(0, 0, scr.w, 62, [PAL.SKY_DAWN_TOP, '#7a6a8a', '#c98f7a', PAL.SKY_DAWN_LOW]);
      const sx = 40 + (Math.sin(now / 6000) * 6);
      scr.disc(sx, 58, 12, PAL.EMBER);
      scr.disc(sx, 57, 10, PAL.SUN, PAL.EMBER);
      scr.px(0, 50, scr.w, 1, '#e8c79a');                 // haze line on the horizon
    }

    // the open aapa mire: string hummocks between flarks (bog pools)
    function mire(now, berries) {
      scr.px(0, 62, scr.w, 66, PEAT);
      // flarks: still pools reflecting the pale sky
      for (const [x, y, w] of [[8, 96, 46], [96, 84, 60], [10, 116, 70], [120, 108, 64], [150, 78, 40]]) {
        scr.px(x, y, w, 5, BOG);
        scr.px(x, y, w, 1, '#6f97a2');                    // bright water edge
        if ((Math.floor(now / 400)) % 2) scr.px(x + 4, y + 1, w - 12, 1, '#557a84'); // faint ripple
      }
      // hummocks of sphagnum, cloudberry plants riding on them
      for (let i = 0; i < 22; i++) {
        const x = (i * 37 + 6) % 188, y = 66 + (i * 53) % 56;
        scr.px(x, y, 7, 3, i % 2 ? PAL.MOSS : PAL.MOSS_DEEP);
        scr.px(x + 1, y - 1, 5, 1, '#7a8a56');            // the low leaves
        if (berries && i % 2 === 0) {                     // the amber fruit
          const ripe = i % 4 !== 0;
          scr.px(x + 2, y - 2, 2, 2, ripe ? CLOUD : CLOUD_RAW);
          if (ripe) scr.px(x + 2, y - 2, 1, 1, CLOUD_LIT);
        }
      }
      // stunted pines at the far tree line
      for (let i = 0; i < 6; i++) {
        const x = 16 + i * 32;
        scr.px(x, 54, 2, 12, PAL.BARK);
        for (let l = 0; l < 3; l++) scr.px(x - 2 - l, 56 + l * 3, 6 + l * 2, 2, PAL.FOREST_FAR);
      }
    }

    // a line of fresh bear tracks pressed into the wet peat
    function tracks() {
      for (let i = 0; i < 7; i++) {
        const x = 30 + i * 20, y = 118 - i * 7;
        scr.px(x, y, 4, 3, BEAR);                         // the pad
        for (let c = 0; c < 3; c++) scr.px(x + c * 1.5, y - 1, 1, 1, BEAR);   // claw dots
      }
    }

    function bear(x, y) {
      scr.px(x, y, 16, 9, BEAR);                          // body
      scr.px(x + 13, y - 4, 6, 5, BEAR);                  // head
      scr.px(x + 12, y - 6, 2, 2, BEAR); scr.px(x + 17, y - 6, 2, 2, BEAR);  // ears
      scr.px(x, y + 9, 4, 2, BEAR); scr.px(x + 11, y + 9, 4, 2, BEAR);       // legs
      scr.px(x + 18, y - 2, 1, 1, '#a86a2e');             // eye-glint
    }

    function cup(x, y, full) {
      scr.px(x, y, 8, 7, '#b8542e');                      // birchbark cup, tarred red
      scr.px(x, y, 8, 1, '#d8743e');
      if (full) { scr.px(x + 1, y + 1, 6, 2, CLOUD); scr.px(x + 2, y + 1, 2, 1, CLOUD_LIT); }
    }

    function drawScene(now) {
      if (scene === 's1' || scene === 's2a') {
        midnightSun(now);
        mire(now, true);
        tracks();
        cup(150, 112, scene === 's2a');
      } else if (scene === 's2b' || scene === 's3') {
        // close in the patch — berries everywhere, the bear at the tree line
        midnightSun(now);
        mire(now, true);
        for (const [x, y] of [[40, 90], [70, 104], [110, 96], [140, 110], [88, 118]]) {
          scr.px(x, y, 3, 3, CLOUD); scr.px(x, y, 1, 1, CLOUD_LIT);   // a glut of ripe fruit
        }
        bear(150, 60);                                     // watching, unbothered
        cup(96, 100, true);
        if (scene === 's3') {                              // the one perfect cluster
          for (let i = 0; i < 7; i++) {
            const a = i / 7 * Math.PI * 2;
            scr.px(92 + Math.cos(a) * 5, 78 + Math.sin(a) * 4, 2, 2, CLOUD);
          }
          scr.px(92, 78, 3, 3, CLOUD_LIT);
        }
      } else if (scene === 's4a') {
        // walking out, cup full, the mire behind
        midnightSun(now);
        mire(now, false);
        cup(96, 96, true);
        scr.px(96, 88, 2, 8, '#5d7a8a');                   // your arm carrying it
      } else if (scene === 's4b') {
        // the left cluster stays lit on its hummock behind you
        midnightSun(now);
        mire(now, false);
        scr.px(84, 92, 20, 6, PAL.MOSS);                   // the hummock
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          scr.px(94 + Math.cos(a) * 6, 88 + Math.sin(a) * 4, 2, 2, CLOUD);
        }
        scr.px(93, 87, 3, 3, CLOUD_LIT);
      } else {
        // s5 / outro: the low sun over the quiet mire, cup at rest
        midnightSun(now);
        mire(now, true);
        cup(90, 108, true);
      }
    }

    function loop(now) {
      if (dead) return;
      drawScene(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    show('s1', [
      [t('cl.s1.a'), () => show('s2a', s3Choice())],
      [t('cl.s1.b'), () => show('s2b', s3Choice())],
    ]);

    function s3Choice() {
      return [[t('ui.continue'), () => show('s3', [
        [t('cl.s3.a'), () => show('s4a', s5())],
        [t('cl.s3.b'), () => show('s4b', s5())],
      ])]];
    }
    function s5() {
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
