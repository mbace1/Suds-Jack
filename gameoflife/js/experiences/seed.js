// The Seed — a wisdom kernel about patience and growth that cannot be forced.
// You plant one seed. Quiet day/night cycles pass. You may water it, but the
// real work happens while you wait and look away. Ends by inviting the player
// to plant something living in the real world and not rush it.

import { PixelScreen } from '../pixel.js?v=34';
import { PAL } from '../palette.js?v=34';

export const seed = {
  id: 'seed',
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
    let phase = 'intro';   // intro → planted → growing → grown → outro
    let day = 0;          // 0..3 day/night cycles
    let growth = 0;       // 0 → 1
    let watered = false;
    let raf = 0, dead = false;
    let last = performance.now();
    let cycleT = 0;

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    // ── flow ─────────────────────────────────────────────────────
    textEl.textContent = t('sd.s1');
    button(t('sd.plant'), plant);

    function plant() {
      phase = 'planted';
      textEl.textContent = t('sd.planted');
      btnRow.innerHTML = '';
      button(t('sd.wait'), startGrowing);
    }

    function startGrowing() {
      phase = 'growing';
      textEl.textContent = t('sd.growing');
      btnRow.innerHTML = '';
      // optional water button appears after a moment
      setTimeout(() => {
        if (phase === 'growing' && !watered) {
          button(t('sd.water'), () => {
            watered = true;
            audio.chime();
            textEl.textContent = t('sd.watered');
            btnRow.innerHTML = '';
          });
        }
      }, 2800);
    }

    function showGrown() {
      phase = 'grown';
      audio.chime();
      textEl.textContent = t('sd.wisdom');
      btnRow.innerHTML = '';
      button(t('ui.continue'), showOutro);
    }

    function showOutro() {
      phase = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p');
      a.textContent = t('sd.outro');
      const b = document.createElement('p');
      b.className = 'nature-note';
      b.textContent = t('sd.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    function drawSoil() {
      // dark earth bed at the bottom
      scr.px(0, 96, 192, 32, PAL.EARTH);
      scr.px(0, 96, 192, 3, '#6a543c');
      // small stones
      for (let i = 0; i < 9; i++) {
        const x = 18 + (i * 21) % 160;
        const y = 108 + (i % 3) * 5;
        scr.px(x, y, 3, 2, PAL.STONE_DARK);
      }
    }

    function drawSeed(x, y) {
      // a small dark seed
      scr.px(x - 1, y, 3, 2, '#3a2e22');
      scr.px(x, y - 1, 1, 1, '#2a2218');
    }

    function drawSprout(progress) {
      // pale root going down, green shoot going up
      const h = Math.floor(progress * 28);
      if (h < 2) return;

      // root
      for (let i = 0; i < Math.min(h, 10); i++) {
        scr.px(95, 97 + i, 2, 1, '#8a7a5a');
      }

      // shoot
      const shootH = Math.max(0, h - 6);
      for (let i = 0; i < shootH; i++) {
        const yy = 95 - i;
        scr.px(95, yy, 2, 1, i > shootH - 4 ? PAL.LEAF : PAL.MOSS);
      }

      // tiny leaves when mature
      if (progress > 0.75) {
        scr.px(92, 95 - shootH + 2, 3, 1, PAL.LEAF);
        scr.px(97, 95 - shootH + 3, 3, 1, PAL.LEAF);
      }
    }

    function drawSky(dayPhase) {
      // simple day / night sky above the soil
      if (dayPhase < 0.5) {
        // day
        scr.bands(0, 0, 192, 96, [PAL.SKY_DAY_TOP, '#93bfdd', PAL.SKY_DAY_LOW]);
        scr.disc(148, 22, 7, PAL.SUN, true);
      } else {
        // night
        scr.bands(0, 0, 192, 96, ['#0a0c18', '#0e1220', '#131828']);
        // a few stars
        for (let i = 0; i < 11; i++) {
          const x = (i * 37 + 9) % 180;
          const y = 8 + (i * 13) % 50;
          scr.px(x, y, 1, 1, '#8a90a8');
        }
      }
    }

    function draw(now) {
      const dayPhase = (cycleT % 8) / 8; // 0..1 through day/night

      scr.clear(PAL.VOID);
      drawSky(dayPhase);
      drawSoil();

      if (phase === 'intro' || phase === 'planted') {
        // just the empty soil waiting
        if (phase === 'planted') drawSeed(96, 94);
      } else {
        drawSeed(96, 94);
        drawSprout(growth);
      }

      // a soft cyan glow on the sprout tip when it breaks the soil (breakout accent)
      if (growth > 0.35) {
        const tipY = 95 - Math.floor(Math.max(0, growth * 28 - 6));
        if (tipY < 94) {
          scr.px(95, tipY - 1, 2, 1, PAL.CYAN_LUX);
        }
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (phase === 'growing') {
        cycleT += dt;
        // growth is slow and mostly automatic
        const target = watered ? 1.0 : 0.72;
        growth += (target - growth) * 0.015;
        if (growth > 0.98) {
          growth = 1;
          showGrown();
        }
      }

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
