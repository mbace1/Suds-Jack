// The Four Dots — Padua, January 1610. Galileo's lens as a circular vignette
// in the void: Jupiter banded in the middle, four white sparks that will not
// stay put. Click the nights past; keep the notebook; choose what the dots
// mean. Owner's design (2026-07 master doc). The moons run on the real
// Galilean periods (1.8 / 3.6 / 7.2 / 16.7 days).

import { PixelScreen } from '../pixel.js?v=13';
import { PAL } from '../palette.js?v=13';

const CX = 96, CY = 56, LENS_R = 50;
const JUP = ['#d9c9a0', '#b8926a', '#d0b088', '#a87f5c', '#c9ab80'];   // cloud bands
const MOONS = [
  { r: 15, T: 1.8, p0: 0.4 },    // Io
  { r: 22, T: 3.6, p0: 2.1 },    // Europa
  { r: 31, T: 7.2, p0: 4.2 },    // Ganymede
  { r: 43, T: 16.7, p0: 1.1 },   // Callisto
];
const NIGHTS_NEEDED = 5;

export const dots = {
  id: 'dots',
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
    let phase = 'intro';    // intro → observe → choice → wander → truth → outro
    let night = 0;
    const journal = [];     // per-night moon x-offsets, for the notebook strip
    let glowT = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    function moonOffsets(n) {
      return MOONS.map(m => Math.round(m.r * Math.sin((n + m.p0) / m.T * Math.PI * 2)));
    }

    textEl.textContent = t('do.s1');
    button(t('do.look'), () => { phase = 'observe'; passNight(); });

    function passNight() {
      night++;
      journal.push(moonOffsets(night));
      if (journal.length > 6) journal.shift();
      audio.plink();
      textEl.textContent = `${t('do.night')} ${night} — ${t('do.hint')}`;
      btnRow.innerHTML = '';
      if (night >= NIGHTS_NEEDED) {
        button(t('do.choice.a'), () => {
          phase = 'wander';
          textEl.textContent = t('do.wander');
          btnRow.innerHTML = '';
          button(t('ui.continue'), showTruth);
        });
        button(t('do.choice.b'), showTruth);
      } else {
        button(t('do.pass'), passNight);
      }
    }

    function showTruth() {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('do.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('do.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('do.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── drawing ──────────────────────────────────────────────────
    function lens(now) {
      // the eyepiece: a circle of night sky floating in the void
      scr.disc(CX, CY, LENS_R, '#0c1020');
      scr.disc(CX - 6, CY - 5, LENS_R - 4, '#101628');
      for (let i = 0; i < 26; i++) {                       // faint field stars
        const a = i * 2.39997, rr = 8 + (i * 17) % (LENS_R - 10);
        const x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        if ((i + Math.floor(now / 700)) % 4) scr.px(x, y, 1, 1, '#3a4258');
      }
      // warped-glass rim: two bright arcs and a soft chromatic edge
      for (let i = 0; i < 64; i++) {
        const a = i / 64 * Math.PI * 2;
        const x = CX + Math.cos(a) * LENS_R, y = CY + Math.sin(a) * LENS_R;
        scr.px(x, y, 2, 2, '#2a3048');
        if (a > 3.6 && a < 4.6) scr.px(x, y, 2, 1, '#6a7290');   // the polish catching light
      }
    }

    function jupiter(now) {
      const R = 9;
      for (let dy = -R; dy <= R; dy++) {
        const half = Math.floor(Math.sqrt(R * R - dy * dy));
        scr.px(CX - half, CY + dy, half * 2 + 1, 1, JUP[(dy + R) % JUP.length]);
      }
      scr.px(CX + 3, CY + 3, 3, 2, '#a05040');             // the great red spot
    }

    function moons(n, luxe) {
      const offs = moonOffsets(n);
      offs.forEach((xo, i) => {
        if (Math.abs(xo) < 4) return;                      // transiting or occulted tonight
        const x = CX + xo, y = CY + Math.round(xo * 0.05); // slight orbital tilt
        scr.px(x, y, 2, 2, PAL.FOAM);
        if (luxe) scr.px(x, y - 1, 2, 1, '#ffffff');
      });
      if (luxe) {
        // the truth: the orbits themselves, cyan lines running past the lens rim
        glowT += 0.016;
        MOONS.forEach((m, i) => {
          const reach = Math.min(1, glowT * 0.8);
          for (let k = -m.r; k <= m.r; k += 3) {
            if (Math.abs(k) > m.r * reach) continue;
            const y = CY + Math.round(k * 0.05) + (i - 1.5) * 0.6;
            scr.px(CX + k, y + 14 + i * 3, 1, 1, PAL.CYAN_LUX);
          }
        });
        // and past the glass: the outermost orbit escapes the instrument
        const esc = Math.min(30, glowT * 26);
        scr.px(CX - 43 - esc, CY + 14 + 3 * 3, esc, 1, PAL.CYAN_LUX);
        scr.px(CX + 43, CY + 14 + 3 * 3, esc, 1, PAL.CYAN_LUX);
      }
    }

    function notebook() {
      // the journal strip: ink dots row per night, Sidereus Nuncius style.
      // paper crosses the void — the record outlives the eyepiece
      const y0 = 106;
      scr.px(30, y0 - 2, 132, 22, '#d8ccae');
      scr.px(30, y0 - 2, 132, 1, '#efe6d0');
      journal.forEach((offs, row) => {
        const y = y0 + row * 3 + 1;
        scr.px(94, y, 4, 2, '#4a3a2a');                    // Jupiter as an ink 'O'
        offs.forEach(xo => { if (Math.abs(xo) >= 4) scr.px(96 + xo, y, 2, 1, '#2a2018'); });
      });
    }

    function draw(now) {
      scr.clear(PAL.VOID);
      if (phase === 'intro') {
        // the tube on its stand against the Padua night, waiting
        scr.px(20, 100, 152, 4, '#2a2420');                // the sill
        scr.px(70, 60, 52, 6, '#6a5a42');                  // the tube, aimed up-right
        scr.px(118, 56, 10, 8, '#8a7452');
        scr.px(64, 64, 8, 6, '#4a3e30');
        scr.px(150, 20, 3, 3, PAL.FOAM);                   // Jupiter, naked-eye bright
        scr.px(151, 21, 1, 1, '#ffffff');
        for (let i = 0; i < 14; i++) scr.px((i * 41 + 7) % 190, (i * 23 + 5) % 90, 1, 1, '#3a4258');
      } else {
        lens(now);
        jupiter(now);
        moons(night, phase === 'truth' || phase === 'outro');
        if (journal.length && phase !== 'intro') notebook();
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
