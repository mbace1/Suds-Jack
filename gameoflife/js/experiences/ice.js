// The Ice Core — an arctic station, a drill going down. Each layer of the core
// is one year the sky was sealed into the ice: soot from your lifetime's fires,
// lead and fallout, Tambora's ash, the little ice age's thick winters, and at
// the bottom, air that has not been breathed since the last ice age. Reads the
// depths one at a time; the trapped air glows luminescent cyan and breaks the
// frame. Built to the 2026-07 void-vignette standard, dithered ice ramps.
// Revert: imagine your own square of earth a hundred years ago.

import { PixelScreen, bayer, rampDither } from '../pixel.js?v=28';
import { PAL } from '../palette.js?v=28';

// the core column, a rounded cylinder floating in the void
const COX = 96, COW = 34, COT = 10, COB = 120;   // centre-x, width, top, bottom
const WIN_Y = 62;                                 // the reading window (core centre)

// the ice itself, dark-teal deep → bright rime, stippled by rampDither
const ICE = ['#2e4c58', '#436d7c', '#6b9aa8', '#9cc8d4', '#d8f0f6'];
const CYAN = PAL.CYAN_LUX, CYAN_HI = '#c8fbf4';

// each descent stop: the year, its signature layer type, its story key
const STOPS = [
  { year: '2015 CE',    band: '#2b2b28', story: 'ic.l1' },   // wildfire soot
  { year: '1965 CE',    band: '#8a6a5e', story: 'ic.l2' },   // lead + fallout
  { year: '1816 CE',    band: '#7c7c74', story: 'ic.l3' },   // Tambora ash
  { year: '1350 CE',    band: '#e6f4fa', story: 'ic.l4' },   // little-ice-age winters
  { year: '18,000 BCE', band: '#3e6f7c', story: 'ic.l5' },   // the last ice age
];

export const ice = {
  id: 'ice',
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
    let phase = 'intro';   // intro → descend → choice → truth → outro
    let stop = -1;         // index into STOPS, -1 = not yet lowered
    let scroll = 0;        // animated toward stop*40
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

    textEl.textContent = t('ic.s1');
    button(t('ic.begin'), deeper);

    function deeper() {
      phase = 'descend';
      stop++;
      audio.plink();
      const s = STOPS[stop];
      textEl.textContent = `${s.year} — ${t(s.story)}`;
      btnRow.innerHTML = '';
      if (stop >= STOPS.length - 1) {
        button(t('ic.choice.a'), showTruth);
        button(t('ic.choice.b'), showTruth);
      } else {
        button(t('ic.deeper'), deeper);
      }
    }

    function showTruth() {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('ic.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('ic.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('ic.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── rendering ────────────────────────────────────────────────
    const halfAt = (y) => {                       // rounded cylinder caps
      const r = COW / 2;
      if (y < COT + r) return Math.sqrt(Math.max(0, r * r - (COT + r - y) ** 2));
      if (y > COB - r) return Math.sqrt(Math.max(0, r * r - (y - (COB - r)) ** 2));
      return r;
    };

    // the ice column: dithered annual layering, a left-edge cylinder highlight,
    // and — at the reading window — the current stop's signature band
    function core(now) {
      for (let y = COT; y <= COB; y++) {
        const half = halfAt(y);
        if (half < 1) continue;
        const wy = y + scroll;
        // annual layering: slow light/dark banding = summer/winter snow
        let base = 0.5 + 0.28 * Math.sin(wy * 0.5) + 0.12 * Math.sin(wy * 0.17);
        for (let dx = -half; dx <= half; dx++) {
          const rim = 1 - Math.abs(dx) / half;               // cylinder roundness
          let u = base * (0.55 + rim * 0.5);
          if (dx < -half * 0.4) u += 0.18;                   // the glassy highlight
          scr.px(COX + dx, y, 1, 1, rampDither(ICE, u, COX + dx, y));
        }
      }
      // the signature layer sits across the reading window when at a stop
      if (stop >= 0) {
        const s = STOPS[stop];
        for (let y = WIN_Y - 4; y <= WIN_Y + 4; y++) {
          const half = halfAt(y);
          for (let dx = -half; dx <= half; dx++) {
            const near = 1 - Math.abs(y - WIN_Y) / 5;
            if (bayer(COX + dx, y) < near * 0.9) scr.px(COX + dx, y, 1, 1, s.band);
          }
        }
      }
      // reading-window brackets in the void, flanking the core
      const bx = COW / 2 + 6;
      for (const sx of [-1, 1]) {
        const x = COX + sx * bx;
        scr.px(x - (sx < 0 ? 4 : 0), WIN_Y - 5, 5, 1, '#7a8a90');
        scr.px(x - (sx < 0 ? 4 : 0), WIN_Y + 5, 5, 1, '#7a8a90');
        scr.px(sx < 0 ? x : x, WIN_Y - 5, 1, 11, '#7a8a90');
      }
    }

    // the drill cable descending from above into the core
    function drill() {
      scr.px(COX - 1, 0, 2, Math.max(0, WIN_Y - 6), '#5a5148');
      scr.px(COX - 3, 2, 6, 4, '#7a7060');          // the winch head
    }

    // the trapped ancient air: a cyan bubble at the window that, at the truth,
    // swells and breaks the frame, spilling glow into the void
    function airBubble(now) {
      const deepest = stop >= STOPS.length - 1;
      if (!deepest && phase !== 'truth' && phase !== 'outro') return;
      const grow = phase === 'truth' || phase === 'outro' ? Math.min(1, glowT * 0.6) : 0.3;
      const r = 3 + grow * 9;
      scr.softDisc(COX + 6, WIN_Y, 8 + grow * 22, '#0f3a3a', 16);   // glow halo
      scr.disc(COX + 6, WIN_Y, r, CYAN);
      scr.disc(COX + 6, WIN_Y, Math.max(1, r - 2), CYAN_HI);
      if (grow > 0.4) {                              // it lifts free, past the frame
        for (let i = 0; i < 7; i++) {
          const rise = ((now / 30 + i * 40) % 80);
          const bx = COX + 6 + Math.sin(now / 400 + i) * 6;
          scr.disc(bx, WIN_Y - 10 - rise, i % 2 ? 2 : 1, i % 3 ? CYAN : CYAN_HI);
        }
      }
    }

    function draw(now, dt) {
      const target = Math.max(0, stop) * 40;
      scroll += (target - scroll) * Math.min(1, dt * 4);   // ease toward the stop
      if (phase === 'truth' || phase === 'outro') glowT += dt;

      scr.clear(PAL.VOID);
      scr.softDisc(COX, 64, 40, '#0a1a20', 20);      // cold cabinet light in the void
      drill();
      core(now);
      airBubble(now);
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      draw(now, dt);
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
