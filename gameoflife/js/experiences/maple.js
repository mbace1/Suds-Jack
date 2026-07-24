// The Year of the Old Maple — one tree, four seasons, same hill. Phenology
// as a story: spring unpacks, summer works, autumn reveals, winter waits
// with everything ready. Ends by giving the player a tree of their own.

import { PixelScreen } from '../pixel.js?v=14';
import { PAL } from '../palette.js?v=14';

const SPRING_LEAF = '#a8c97a', SUMMER_LEAF = '#5f7a4a', SUMMER_DEEP = '#3d5232';
const AUTUMN_RED = '#c9573a', AUTUMN_GOLD = '#d9a13c', SNOW = '#e8eef2';

export const maple = {
  id: 'maple',
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
    let scene = 's1';   // s1 spring → s2a|s2b → s3 summer → s4a|s4b → s5 autumn → s6 winter → outro
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
      textEl.textContent = t(`ma.${key}`);
      btnRow.innerHTML = '';
      for (const [label, next] of choices) button(label, next);
    }

    function showOutro() {
      scene = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('ma.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('ma.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // the same tree every season: trunk on a low hill, crown drawn per season
    function hillAndTrunk(skyBands, ground, groundDeep) {
      scr.bands(0, 0, scr.w, 74, skyBands);
      scr.px(0, 74, scr.w, 54, ground);
      for (let x = 0; x < scr.w; x += 4) {              // the low hill line
        const y = 74 - Math.round(Math.sin((x / scr.w) * Math.PI) * 10);
        scr.px(x, y, 4, 76 - y + 2, ground);
      }
      scr.px(0, 106, scr.w, 22, groundDeep);
      scr.px(92, 36, 6, 34, PAL.BARK);                  // trunk on the crest
      scr.px(86, 44, 8, 4, PAL.BARK);                   // low bough left
      scr.px(96, 40, 10, 4, PAL.BARK);                  // bough right
      scr.px(84, 40, 4, 3, PAL.BARK);
      scr.px(104, 36, 4, 3, PAL.BARK);
    }

    function crown(colors, density, r = 20, edge) {
      // cluster of discs around the trunk top; density 0..1 thins the canopy.
      // an edge tint gives the canopy defined, readable lobes
      const spots = [[95, 26, r * 0.8], [82, 32, r * 0.6], [108, 30, r * 0.65], [95, 16, r * 0.55], [88, 22, r * 0.5], [104, 20, r * 0.5]];
      spots.forEach(([x, y, rr], i) => {
        if (i / spots.length < density) scr.disc(x, y, rr, colors[i % colors.length], edge);
      });
    }

    function fallingBits(now, count, colors, speed = 1, drift = 8) {
      for (let i = 0; i < count; i++) {
        const y = ((now / 1000) * (10 + (i % 4) * 5) * speed + i * 29) % 120;
        const x = (70 + i * 17 + Math.sin(now / 600 + i) * drift) % 192;
        scr.px(x, y, 2, 2, colors[i % colors.length]);
      }
    }

    function drawScene(now) {
      if (scene === 's1' || scene === 's2a' || scene === 's2b') {
        // April: bare twigs, dark fists of buds; s2 variants add their focus
        hillAndTrunk([PAL.SKY_DAWN_TOP, '#8a7a92', '#c9a48a', PAL.SKY_DAY_LOW], PAL.MOSS, PAL.MOSS_DEEP);
        crown([SPRING_LEAF, '#c2d69a'], scene === 's1' ? 0.35 : 0.6, 16, '#6f8a4a');
        for (let i = 0; i < 8; i++) {                   // bud fists on the twig tips
          const [bx, by] = [[78, 30], [88, 18], [100, 12], [112, 22], [116, 32], [84, 24], [108, 16], [94, 10]][i];
          scr.px(bx, by, 2, 3, '#4a3a3a');
        }
        if (scene === 's2a') {                          // inset: the bud opened like a letter
          scr.px(16, 14, 52, 44, PAL.INK);
          scr.px(18, 16, 48, 40, '#2e3527');
          scr.px(28, 22, 10, 28, '#6b4a3a');            // the shell, split
          scr.px(40, 22, 4, 28, '#6b4a3a');
          scr.px(34, 26, 8, 20, SPRING_LEAF);           // the folded leaf inside
          scr.px(36, 24, 4, 2, SPRING_LEAF);
          scr.px(38, 28, 1, 16, '#7a9a5a');             // its folds
          scr.px(35, 32, 6, 1, '#7a9a5a');
        }
        if (scene === 's2b') {                          // looking up from the grass: leaf ceiling
          for (let i = 0; i < 12; i++) {
            const x = 20 + (i * 31) % 150, y = 8 + (i * 13) % 30;
            scr.px(x, y, 5, 3, i % 2 ? SPRING_LEAF : '#c2d69a');
          }
        }
      } else if (scene === 's3' || scene === 's4a' || scene === 's4b') {
        // high summer: full green country
        hillAndTrunk([PAL.SKY_DAY_TOP, '#93bfdd', '#a9cde2', PAL.SKY_DAY_LOW], PAL.MOSS, PAL.MOSS_DEEP);
        scr.disc(160, 15, 9, PAL.EMBER);                  // warm halo
        scr.disc(160, 14, 8, PAL.SUN, PAL.EMBER);
        crown([SUMMER_LEAF, SUMMER_DEEP, '#6f8a5a'], 1, 22, PAL.FOREST_FAR);
        if (scene === 's4a') {                          // the pool of shade, someone in it
          scr.px(76, 66, 42, 8, SUMMER_DEEP);
          scr.px(96, 60, 4, 8, '#5d7a8a');              // the sitter
          scr.px(97, 57, 2, 3, '#d8b48f');
          for (let i = 0; i < 5; i++)                   // heat shimmer rising off the field
            scr.px(24 + i * 34, 80 + Math.sin(now / 300 + i) * 2, 1, 4, '#c9d9a8');
        }
        if (scene === 's4b') {                          // the town in the tree
          scr.px(90 + Math.sin(now / 400) * 1.5, 50, 2, 1, PAL.INK);   // ants on the bark road
          scr.px(93, 56 + Math.cos(now / 350) * 1.5, 2, 1, PAL.INK);
          scr.px(102, 24, 5, 3, PAL.BARK);              // the nest
          scr.px(103, 22, 3, 2, PAL.INK_SOFT);          // its bird
          scr.px(85, 34, 3, 2, '#8a7a5a');              // the moth pretending to be bark
        }
      } else if (scene === 's5') {
        // October: the reveal
        hillAndTrunk(['#8a7aa0', '#b08a7a', '#d9a97c', '#e8c9a0'], '#8a8a5a', '#6b6b46');
        crown([AUTUMN_RED, AUTUMN_GOLD, '#b8763a'], 0.9, 21, '#7a3a24');
        fallingBits(now, 14, [AUTUMN_RED, AUTUMN_GOLD]);
        scr.px(70, 70, 50, 3, AUTUMN_GOLD);             // the ground gaining what the tree gives
      } else {
        // winter, and the outro shares it: bare, snowlit, ready
        hillAndTrunk(['#3a4258', '#5a6278', '#8a92a8', '#c8d0dc'], SNOW, '#c8d4dc');
        for (let i = 0; i < 8; i++) {                   // next spring, already sealed on the twigs
          const [bx, by] = [[78, 30], [88, 18], [100, 12], [112, 22], [116, 32], [84, 24], [108, 16], [94, 10]][i];
          scr.px(bx, by, 2, 3, '#4a3a3a');
        }
        fallingBits(now, 16, [SNOW, '#d8e0e8'], 0.5, 4);
        scr.px(70, 72, 50, 4, SNOW);                    // drifted snow at the roots
      }
    }

    function loop(now) {
      if (dead) return;
      drawScene(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    show('s1', [
      [t('ma.s1.a'), () => show('s2a', next('s3'))],
      [t('ma.s1.b'), () => show('s2b', next('s3'))],
    ]);

    function next(key) {
      if (key === 's3') return [[t('ui.continue'), () => show('s3', [
        [t('ma.s3.a'), () => show('s4a', next('s5'))],
        [t('ma.s3.b'), () => show('s4b', next('s5'))],
      ])]];
      if (key === 's5') return [[t('ui.continue'), () => show('s5', [[t('ui.continue'), () => show('s6', [[t('ui.continue'), showOutro]])]])]];
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
