// <Title> — one paragraph on what this actually is: the real thing it is about,
// where and when it happened, and the turn it takes. Then a line on what the
// player DOES, because the interaction should be the point rather than a way of
// paging through text. Then: Revert: <the real-world thing the outro asks for>.
//
// Copy this file, rename it to <id>.js, and read EXPERIENCES.md — the gate
// checks more than you might expect (all three languages, an animated first
// screen, contrast, 44px targets).

import { PixelScreen } from '../pixel.js?v=38';
import { PAL } from '../palette.js?v=38';

export const TEMPLATE_ID = {          // rename to your id, e.g. `export const eel =`
  id: 'template',                     // must match the filename and the i18n prefix
  kind: 'story',                      // 'story' | 'game' | 'wisdom' — mind the 70/20/10

  start(host, ctx) {
    const { t, audio, onComplete } = ctx;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen-wrap';
    host.appendChild(wrap);
    const textEl = document.createElement('div');
    textEl.className = 'exp-text';    // the story goes here — it is the accessible channel
    host.appendChild(textEl);
    const btnRow = document.createElement('div');
    btnRow.className = 'exp-buttons';
    host.appendChild(btnRow);

    const scr = new PixelScreen(wrap, 192, 128);
    let phase = 'intro';              // intro → … → truth → outro
    let glowT = 0;                    // seconds since the reveal, for the breakout
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('xx.s1');
    button(t('xx.begin'), () => {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('xx.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), showOutro);
    });

    // the outro is always two paragraphs: what happened, then the real thing to
    // go and do. The nature-note is the whole reason this project exists.
    function showOutro() {
      phase = 'outro';
      audio.chime();
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('xx.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('xx.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    // Anything expensive and unchanging goes in scr.cached(key, …) — a
    // full-screen dither is one fillRect per pixel and will drop a phone to
    // single-digit fps if it is repainted every frame. Key it on whatever
    // actually changes, quantised.
    function backdrop() {
      scr.cached(`bg:${phase}`, () => {
        scr.clear(PAL.VOID);
        // …static art…
      });
    }

    // REQUIRED: something is moving on the very first screen, and for a cached
    // scene it is drawn AFTER the blit so the cache still holds. Make it belong
    // to the place — weather, water, dust, an animal — not a generic wobble.
    function alive(now) {
      for (let i = 0; i < 6; i++) {
        const x = ((now / 60) + i * 33) % 200 - 8;
        scr.px(x, 30 + (i * 13) % 60, 2, 1, PAL.INK_SOFT);
      }
    }

    function draw(now, dt) {
      if (phase === 'truth' || phase === 'outro') glowT += dt;
      backdrop();
      alive(now);
      // the breakout: at the reveal, something luminescent leaves the frame
      if (phase === 'truth' || phase === 'outro') {
        const k = Math.min(1, glowT * 0.6);
        scr.softDisc(96, 64, 10 + k * 40, '#0a2c30', 16);
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // destroy must stop the loop AND drop the canvas — main.js calls this
    // before starting the next experience, and a leaked rAF loop runs forever
    // against a detached canvas
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
