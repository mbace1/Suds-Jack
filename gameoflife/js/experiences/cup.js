// A Cup of Tea — the first kernel of wisdom. The classic Nan-in story told
// through the hands: the player keeps pouring, the cup overflows, and the
// point makes itself. Interactivity IS the teaching.

import { PixelScreen } from '../pixel.js?v=14';
import { PAL } from '../palette.js?v=14';

const CUP_X = 88, CUP_Y = 78, CUP_W = 22, CUP_H = 18;
const FULL_AT = 1.0, OVERFLOW_AT = 1.9;   // keep pouring past full to learn

export const cup = {
  id: 'cup',
  kind: 'wisdom',

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
    let fill = 0;            // 0..OVERFLOW_AT; past 1 the tea spills
    let pouring = 0;         // frames left of pour stream after a tap
    let phase = 'pour';      // pour → spill → empty → outro
    let tilt = 0;            // cup tip animation when emptying
    let raf = 0, dead = false;

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
      return b;
    }

    textEl.textContent = t('cu.s1');
    button(t('cu.pour'), pour);

    function pour() {
      if (phase !== 'pour') return;
      pouring = 22;
      fill += 0.16;
      audio.plink();
      if (fill >= OVERFLOW_AT) {
        phase = 'spill';
        audio.water();
        textEl.textContent = `${t('cu.full')}\n\n${t('cu.wisdom')}`;
        btnRow.innerHTML = '';
        button(t('cu.empty'), emptyCup);
      } else if (fill >= FULL_AT) {
        textEl.textContent = t('cu.brims');
      }
    }

    function emptyCup() {
      phase = 'empty';
      btnRow.innerHTML = '';
      audio.chime();
      setTimeout(() => {
        if (dead) return;
        phase = 'outro';
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('cu.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('cu.nature');
        textEl.append(a, b);
        button(t('ui.continue'), () => onComplete());
      }, 1400);
    }

    function draw(now) {
      // a quiet room at dusk: paper wall, low table
      scr.bands(0, 0, scr.w, 70, ['#3a3448', '#4a4258', '#5a5068', '#6a6078']);
      scr.px(14, 8, 40, 52, '#7a7088');            // window
      scr.px(14, 8, 40, 2, PAL.INK_SOFT); scr.px(14, 58, 40, 2, PAL.INK_SOFT);
      scr.px(33, 8, 2, 52, PAL.INK_SOFT); scr.px(14, 32, 40, 2, PAL.INK_SOFT);
      scr.disc(44, 20, 5, PAL.SUN);                // moon in the pane
      scr.px(0, 70, scr.w, 58, PAL.BARK);          // table
      scr.px(0, 70, scr.w, 3, '#7a5d46');

      const spill = Math.max(0, fill - FULL_AT);
      if (spill > 0 && phase !== 'empty' && phase !== 'outro') {
        // the overflow glows luminescent cyan and runs past the table edge —
        // the excess breaks the frame (2026-07 visual standard)
        const r = Math.min(50, spill * 60);
        scr.px(CUP_X + CUP_W / 2 - r, CUP_Y + CUP_H + 1, r * 2, 3, PAL.CYAN_LUX);
        scr.px(CUP_X + CUP_W / 2 - r * 0.7, CUP_Y + CUP_H + 4, r * 1.4, 2, '#8af2e8');
        if (r > 24) for (let i = 0; i < 5; i++) {   // runnels dripping off the world
          const dx = CUP_X - 20 + i * 14;
          scr.px(dx, CUP_Y + CUP_H + 6 + ((now / 24 + i * 17) % (128 - CUP_Y - CUP_H - 6)), 2, 4, i % 2 ? PAL.CYAN_LUX : '#8af2e8');
        }
      }

      if (phase === 'empty' || phase === 'outro') {
        tilt = Math.min(1, tilt + 0.03);
        // the cup tipped on its side, empty and light
        scr.px(CUP_X + 2, CUP_Y + CUP_H - 8, CUP_W, 8, PAL.PAPER);
        scr.px(CUP_X + 2, CUP_Y + CUP_H - 8, 3, 8, PAL.PAPER_DIM);
      } else {
        scr.px(CUP_X, CUP_Y, CUP_W, CUP_H, PAL.PAPER);              // cup
        scr.px(CUP_X + CUP_W, CUP_Y + 5, 4, 6, PAL.PAPER_DIM);      // handle
        const level = Math.min(1, fill) * (CUP_H - 4);
        scr.px(CUP_X + 2, CUP_Y + 2 + (CUP_H - 4 - level), CUP_W - 4, level, PAL.EARTH);
        // teapot hovering above, tips while pouring
        const tip = pouring > 0 ? 3 : 0;
        scr.px(CUP_X - 6, 34 + tip, 30, 14, PAL.MOSS_DEEP);
        scr.px(CUP_X + 22, 38 + tip, 8, 3, PAL.MOSS_DEEP);          // spout
        scr.px(CUP_X - 12, 36 + tip, 6, 8, PAL.MOSS_DEEP);          // handle
        if (pouring > 0) {
          pouring--;
          scr.px(CUP_X + 28, 41 + tip, 2, CUP_Y - 41 - tip + 2, PAL.EARTH);  // the stream
        }
      }
      if (phase === 'spill') {
        // steam question-marks of excess
        for (let i = 0; i < 3; i++) {
          const sx = CUP_X + 4 + i * 7 + Math.sin(now / 300 + i * 2) * 2;
          scr.px(sx, 60 - ((now / 60 + i * 9) % 18), 1, 3, PAL.PAPER_DIM);
        }
      }
    }

    function loop(now) {
      if (dead) return;
      draw(now);
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
