// The Silver Plate — Boulevard du Temple, 1838: the first photograph of a
// human being. The player runs the exposure; everything that moves erases
// itself, and one still man steps into history.
//
// Pilot of the new visual standard: a jagged vignette floating in the pure
// black void, muted graphic-novel tones, and a luminescent gold breakout
// when the plate finally fixes.

import { PixelScreen } from '../pixel.js?v=17';
import { PAL } from '../palette.js?v=17';

// the vignette: scene lives in this window, edges eaten by deterministic jags
const VX = 22, VY = 12, VW = 148, VH = 100;
const EXPOSURE_SEC = 4;

export const plate = {
  id: 'plate',
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
    let phase = 'street';   // street → expose → choice → reflect → outro
    let exposeT = 0;        // 0..EXPOSURE_SEC
    let lastTick = -1;
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

    textEl.textContent = t('pl.s1');
    button(t('pl.begin'), () => {
      phase = 'expose';
      exposeT = 0;
      textEl.textContent = '';
      btnRow.innerHTML = '';
    });

    function showChoice() {
      phase = 'choice';
      textEl.textContent = t('pl.s2');
      btnRow.innerHTML = '';
      button(t('pl.s2.a'), () => reflect('pl.s3a'));
      button(t('pl.s2.b'), () => reflect('pl.s3b'));
    }

    function reflect(key) {
      phase = 'reflect';
      textEl.textContent = t(key);
      btnRow.innerHTML = '';
      button(t('ui.continue'), showOutro);
    }

    function showOutro() {
      phase = 'outro';
      glowT = 0;
      audio.chime();
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('pl.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('pl.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    // sepia factor 0 = live street, 1 = the fixed plate
    function street(now, sepia) {
      const wall = sepia > 0.5 ? '#8a7a62' : '#6e6a72';
      const roof = sepia > 0.5 ? '#5a4e3e' : '#4a4652';
      const road = sepia > 0.5 ? '#b0a084' : '#8e8a90';
      // the boulevard runs diagonally through the window
      scr.px(VX, VY, VW, VH, road);
      // facades left and top (the view from Daguerre's window)
      scr.px(VX, VY, 52, VH, wall);
      for (let fy = 0; fy < 4; fy++) for (let fx = 0; fx < 3; fx++) {   // shuttered windows
        scr.px(VX + 8 + fx * 15, VY + 8 + fy * 24, 7, 12, sepia > 0.5 ? '#6e5e48' : '#525060');
      }
      scr.px(VX, VY, VW, 10, roof);                       // far rooftops
      scr.px(VX + 60, VY + 4, 30, 6, roof);
      scr.px(VX + 100, VY + 2, 3, 9, '#3a3640');          // chimney pokes past the frame
      scr.px(VX + 100, VY - 4, 3, 6, '#3a3640');
      // pavement line + young boulevard trees
      scr.px(VX + 52, VY + 10, 2, VH - 10, sepia > 0.5 ? '#9a8a6e' : '#7a767e');
      for (let i = 0; i < 4; i++) {
        const tx = VX + 66 + i * 24;
        scr.px(tx, VY + 34 + i * 14, 2, 12, '#4a4038');
        scr.disc(tx + 1, VY + 30 + i * 14, 5, sepia > 0.5 ? '#7a7052' : '#565e52');
      }
    }

    function crowds(now, fade) {
      // moving life: carriages and walkers streaming the diagonal.
      // fade 0..1 — as the exposure runs they turn to ghosts, then to nothing
      for (let i = 0; i < 16; i++) {
        if ((i / 16) < fade) continue;                    // erased already
        const speed = 14 + (i % 5) * 9;
        const p = ((now / 1000) * speed + i * 43) % (VW + 20) - 10;
        const lane = VY + 20 + (i * 23) % (VH - 30);
        const ghost = fade > 0 && (Math.floor(now / 90) + i) % 2 === 0;
        if (ghost) continue;                              // flicker = half-recorded
        const c = fade > 0 ? '#7a7062' : (i % 3 ? '#3a3640' : '#2e2a34');
        if (i % 4 === 0) { scr.px(VX + p, lane, 6, 3, c); scr.px(VX + p + 1, lane - 2, 3, 2, c); }
        else scr.px(VX + p, lane, 2, 3, c);
      }
    }

    function stillMan(sepia) {
      const mx = VX + 58, my = VY + VH - 22;              // lower left, at the corner
      scr.px(mx, my, 3, 9, sepia > 0.5 ? '#3e3428' : '#22202a');       // the man, standing
      scr.px(mx, my - 3, 3, 3, sepia > 0.5 ? '#5a4a36' : '#38343e');   // his hat
      scr.px(mx + 5, my + 5, 3, 4, sepia > 0.5 ? '#4a3e30' : '#2a2832');  // the bootblack, kneeling
      scr.px(mx + 1, my + 9, 6, 1, '#1e1c24');            // their shared shadow
    }

    // the jagged frame: black teeth eat the edges so the vignette floats
    function vignette() {
      for (let x = VX - 4; x < VX + VW + 4; x += 5) {
        const j = 2 + ((x * 13) % 6);
        scr.px(x, VY - 6, 5, j + 4, PAL.VOID);
        scr.px(x + 2, VY + VH - j + 2, 5, j + 6, PAL.VOID);
      }
      for (let y = VY - 4; y < VY + VH + 4; y += 5) {
        const j = 2 + ((y * 17) % 6);
        scr.px(VX - 6, y, j + 4, 5, PAL.VOID);
        scr.px(VX + VW - j + 2, y + 2, j + 6, 5, PAL.VOID);
      }
    }

    function draw(now, dt) {
      scr.clear(PAL.VOID);
      if (phase === 'street') {
        street(now, 0);
        crowds(now, 0);
        stillMan(0);
      } else if (phase === 'expose') {
        exposeT += dt;
        const k = Math.min(1, exposeT / EXPOSURE_SEC);
        const tick = Math.floor(exposeT);
        if (tick !== lastTick) { lastTick = tick; audio.plink(); }
        street(now, k);
        crowds(now, k);
        stillMan(k);
        // the plate drinking light: a faint gold film rising
        if (k > 0.5) for (let i = 0; i < 30; i++) {
          const x = VX + (i * 37) % VW, y = VY + (i * 53) % VH;
          if ((Math.floor(now / 160) + i) % 3 === 0) scr.px(x, y, 1, 1, '#c9b88a');
        }
        if (exposeT >= EXPOSURE_SEC) { audio.water(); showChoice(); }
      } else {
        street(now, 1);
        stillMan(1);
        if (phase === 'outro') {
          // the fix: luminescent gold light breaking the vignette into the void
          glowT += dt;
          const R = 12 + Math.min(40, glowT * 26);
          for (let i = 0; i < 40; i++) {
            const th = i / 40 * Math.PI * 2;
            const rr = R + ((i * 29) % 9);
            const gx = VX + 61 + Math.cos(th) * rr, gy = VY + VH - 18 + Math.sin(th) * rr * 0.8;
            scr.px(gx, gy, 2, 2, i % 3 ? PAL.GOLD_LUX : '#fff2c0');
          }
        }
      }
      vignette();
      // the outro glow is drawn AFTER the frame so it truly spills into the void
      if (phase === 'outro') {
        const px0 = VX + 61, py0 = VY + VH - 18;
        for (let i = 0; i < 14; i++) {
          const th = i / 14 * Math.PI * 2 + glowT;
          const rr = 30 + Math.min(56, glowT * 30) + ((i * 31) % 12);
          scr.px(px0 + Math.cos(th) * rr, py0 + Math.sin(th) * rr * 0.9, 2, 1, PAL.GOLD_LUX);
        }
      }
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
