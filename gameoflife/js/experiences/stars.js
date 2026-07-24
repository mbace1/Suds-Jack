// The Night Compass — a constellation game. Trace the seven stars of the
// Big Dipper (Otava / 北斗七星), then walk its pointer stars to Polaris, the
// one star that never moves. The oldest navigation lesson there is.

import { PixelScreen } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

// the Dipper as a traceable chain: handle first, then around the bowl.
// the closing bowl edge (Dubhe -> Megrez) draws itself on completion.
const DIPPER = [
  [26, 46],   // Alkaid  (handle tip)
  [44, 36],   // Mizar
  [60, 34],   // Alioth
  [74, 38],   // Megrez  (bowl, top back)
  [78, 58],   // Phecda  (bowl, bottom back)
  [102, 62],  // Merak   (bowl, bottom front — pointer)
  [100, 38],  // Dubhe   (bowl, top front — pointer)
];

// level 2: a smaller dipper low in the sky; the pointers aim at Polaris
const MINI = DIPPER.map(([x, y]) => [x * 0.55 + 8, y * 0.55 + 76]);
const POLARIS = [52, 22];
const DECOYS = [[92, 30], [130, 24], [160, 44], [110, 58], [30, 50], [146, 74]];

const TAP_R = 11;

export const stars = {
  id: 'stars',
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
    let phase = 'intro';   // intro → trace → done1 → find → outro
    let traced = 0;        // stars connected so far (index into DIPPER)
    let flashT = 0;        // wrong-tap dim flash
    let glowT = 0;         // completion glow
    let raf = 0, dead = false;

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    function setText(s) { textEl.textContent = s; }

    // ── phases ───────────────────────────────────────────────────
    setText(t('st.intro'));
    button(t('ui.continue'), () => {
      phase = 'trace';
      traced = 0;
      setText(t('st.hint1'));
      btnRow.innerHTML = '';
    });

    function finishTrace() {
      phase = 'done1';
      glowT = 0;
      audio.chime();
      setText(t('st.done1'));
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'find';
        setText(t('st.hint2'));
        btnRow.innerHTML = '';
      });
    }

    function finishFind() {
      phase = 'outro';
      glowT = 0;
      audio.chime();
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('st.done2');
      const b = document.createElement('p'); b.textContent = t('st.outro');
      const c = document.createElement('p'); c.className = 'nature-note'; c.textContent = t('st.nature');
      textEl.append(a, b, c);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    function onTap(e) {
      if (dead) return;
      const p = scr.toPixel(e);
      if (phase === 'trace') {
        const [nx, ny] = DIPPER[traced];
        if (Math.hypot(p.x - nx, p.y - ny) <= TAP_R) {
          traced++;
          audio.plink();
          if (traced === DIPPER.length) finishTrace();
        } else if (DIPPER.some(([sx, sy]) => Math.hypot(p.x - sx, p.y - sy) <= TAP_R)) {
          flashT = 1;   // a dipper star, but not the next in the walk
        }
      } else if (phase === 'find') {
        if (Math.hypot(p.x - POLARIS[0], p.y - POLARIS[1]) <= TAP_R) {
          finishFind();
        } else if (DECOYS.some(([sx, sy]) => Math.hypot(p.x - sx, p.y - sy) <= TAP_R)) {
          flashT = 1;
          setText(t('st.wrong2'));
        }
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    // ── drawing ──────────────────────────────────────────────────
    function line(x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) scr.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, c);
    }

    function star(x, y, size, bright, tw) {
      const c = bright ? PAL.FOAM : '#8a90a8';
      scr.px(x - size / 2, y - size / 2, size, size, c);
      if (bright && tw) { scr.px(x - size / 2 - 2, y, 1, 1, c); scr.px(x + size / 2 + 1, y, 1, 1, c); }
    }

    function nightSky(now) {
      scr.bands(0, 0, scr.w, 128, ['#0a0c18', '#0e1220', '#131828', '#181e30']);
      for (let i = 0; i < 46; i++) {   // faint background field, twinkling
        const x = (i * 47 + 13) % 190, y = (i * 31 + 7) % 124;
        if (Math.sin(now / 500 + i * 2.1) > -0.6) scr.px(x, y, 1, 1, '#4a5068');
      }
      // treeline silhouette so the sky belongs to somewhere
      for (let x = 0; x < scr.w; x += 8) {
        const h = 6 + ((x * 7) % 11);
        scr.px(x, 128 - h, 8, h, '#05060c');
        scr.px(x + 3, 128 - h - 4, 2, 4, '#05060c');
      }
    }

    function drawScene(now) {
      nightSky(now);
      if (flashT > 0) flashT = Math.max(0, flashT - 0.06);
      glowT += 0.05;
      const tw = Math.floor(now / 400) % 2 === 0;

      if (phase === 'intro') {
        // the whole dipper faintly there, a promise
        for (const [x, y] of DIPPER) star(x, y, 2, true, tw);
        star(...POLARIS, 3, true, !tw);
      } else if (phase === 'trace' || phase === 'done1') {
        for (let i = 0; i < traced - 1; i++) line(...DIPPER[i], ...DIPPER[i + 1], PAL.MOSS);
        if (phase === 'done1') {
          line(...DIPPER[6], ...DIPPER[3], PAL.MOSS);   // close the bowl
          const pulse = 2 + (Math.sin(glowT * 4) > 0 ? 1 : 0);
          for (const [x, y] of DIPPER) star(x, y, pulse + 1, true, true);
        } else {
          DIPPER.forEach(([x, y], i) => {
            const isNext = i === traced;
            star(x, y, i < traced ? 4 : isNext && tw ? 3 : 2, true, i < traced);
          });
        }
        if (flashT > 0) scr.px(0, 0, scr.w, 2, PAL.DANGER);
      } else if (phase === 'find') {
        // mini dipper, its trace remembered
        for (let i = 0; i < MINI.length - 1; i++) line(...MINI[i], ...MINI[i + 1], PAL.MOSS_DEEP);
        line(...MINI[6], ...MINI[3], PAL.MOSS_DEEP);
        for (const [x, y] of MINI) star(x, y, 2, true, false);
        // the pointer line, dotted, walking up from Merak through Dubhe
        const [mx, my] = MINI[5], [dx, dy] = MINI[6];
        const vx = dx - mx, vy = dy - my;
        for (let k = 1; k < 14; k++) {
          if (k % 2) scr.px(dx + vx * k * 0.55, dy + vy * k * 0.55, 1, 1, '#5a6080');
        }
        for (const [x, y] of DECOYS) star(x, y, 2, true, false);
        star(...POLARIS, tw ? 3 : 2, true, tw);
        if (flashT > 0) scr.px(0, 0, scr.w, 2, PAL.DANGER);
      } else { // outro: Polaris crowned, everything else humble
        for (let i = 0; i < MINI.length - 1; i++) line(...MINI[i], ...MINI[i + 1], PAL.MOSS_DEEP);
        line(...MINI[6], ...MINI[3], PAL.MOSS_DEEP);
        for (const [x, y] of MINI) star(x, y, 2, true, false);
        const pulse = 3 + (Math.sin(glowT * 3) > 0 ? 1 : 0);
        star(...POLARIS, pulse, true, true);
        scr.px(POLARIS[0], POLARIS[1] - 8, 1, 4, PAL.FOAM);
        scr.px(POLARIS[0], POLARIS[1] + 5, 1, 4, PAL.FOAM);
      }
    }

    function loop(now) {
      if (dead) return;
      drawScene(now);
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
