// The Eel — the animal that made fools of everybody. Aristotle decided eels
// grew from mud, because nobody could find an egg, a larva, or a reproductive
// organ in one. Two thousand years later a young Freud dissected four hundred
// of them in Trieste looking for testicles and found nothing. The whole life
// story only came apart in the 1920s, and the last chapter is STILL missing:
// no human being has ever seen European eels spawn, or found an egg in the
// Sargasso Sea. We know where they go because we know where the smallest
// larvae are, which is a different kind of knowing.
//
// A dark-water scene: the eel is a moving curve rather than a sprite, because
// the animal is basically a travelling wave. Revert: look into the nearest
// ditch, and let something remain unexplained.

import { PixelScreen, rampDither } from '../pixel.js?v=40';
import { PAL } from '../palette.js?v=40';

const WATER = ['#050d12', '#0a1a22', '#123039', '#1c4a52'];
const WEED = ['#1e3a2c', '#2c5240', '#3d6b52'];
const SKIN = ['#1a1712', '#2e2a20', '#4a4534', '#6b6448'];
const SILVER = ['#3a4048', '#5f6a74', '#8fa0ad', '#c8d8e2'];

// where we are in the eel's life; `open` widens the water from ditch to ocean
const STOPS = [
  { key: 'ee.d1', open: 0.15, silver: 0, weed: 1 },   // the ditch, Aristotle's mud
  { key: 'ee.d2', open: 0.15, silver: 0, weed: 1 },   // Freud, four hundred dissections
  { key: 'ee.d3', open: 0.40, silver: 0, weed: 0.6 }, // the glass eels arrive
  { key: 'ee.d4', open: 0.20, silver: 0, weed: 1 },   // twenty years in a ditch
  { key: 'ee.d5', open: 1.00, silver: 1, weed: 0 },   // it turns silver and leaves
];

export const eel = {
  id: 'eel',
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
    let phase = 'intro';    // intro → life → choice → truth → outro
    let stop = -1;
    let open = 0.15, silver = 0, weed = 1;   // eased toward the stop's values
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

    textEl.textContent = t('ee.s1');
    button(t('ee.begin'), onward);

    function onward() {
      phase = 'life';
      stop++;
      audio.plink();
      textEl.textContent = t(STOPS[stop].key);
      btnRow.innerHTML = '';
      if (stop >= STOPS.length - 1) {
        button(t('ee.choice.a'), showTruth);
        button(t('ee.choice.b'), showTruth);
      } else {
        button(t('ee.next'), onward);
      }
    }

    function showTruth() {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('ee.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('ee.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('ee.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── drawing ──────────────────────────────────────────────────
    // the water: a narrow murky ditch that opens into ocean as the story does
    function water(now) {
      const surf = Math.round(10 + (1 - open) * 16);
      for (let y = 0; y < 128; y++) {
        const u = 0.85 - (y / 128) * 0.75 - (1 - open) * 0.1;
        for (let x = 0; x < 192; x++) scr.px(x, y, 1, 1, rampDither(WATER, u, x, y));
      }
      // the surface, seen from underneath, with light bending on it
      for (let x = 0; x < 192; x++) {
        const w = surf + Math.sin(x * 0.14 + now / 700) * 1.6 + Math.sin(x * 0.4 + now / 400);
        scr.px(x, w, 1, 2, '#3f6f7a');
        if ((x + Math.floor(now / 90)) % 9 === 0) scr.px(x, w - 1, 1, 1, '#8fc0c8');
      }
      // muddy floor — Aristotle's culprit
      const floor = 108 + Math.round(open * 16);
      scr.px(0, floor, 192, 128 - floor, '#100c08');
      for (let i = 0; i < 40; i++) {
        const x = (i * 29 + 7) % 190;
        scr.px(x, floor + (i % 4), 2, 1, '#1a140c');
      }
      if (weed > 0.05) {                       // ditch weed, combed by the current
        for (let i = 0; i < 22; i++) {
          const x = (i * 17 + 5) % 188;
          const h = (8 + (i * 7) % 22) * weed;
          for (let j = 0; j < h; j++) {
            const bend = Math.sin(now / 800 + i + j * 0.2) * (j / 6);
            scr.px(x + bend, floor - j, 1, 1, rampDither(WEED, 0.3 + j / h * 0.6, x, floor - j));
          }
        }
      }
    }

    // The eel itself: a travelling sine, drawn segment by segment, because that
    // is honestly what the animal is — a wave that goes all the way through.
    function body(now) {
      const len = 74, cy = 68;
      const amp = 9 + silver * 5;
      const phaseX = now / (silver > 0.5 ? 260 : 420);
      const ramp = silver > 0.5 ? SILVER : SKIN;
      let px0 = null;
      for (let i = 0; i <= len; i++) {
        const u = i / len;                      // 0 head → 1 tail tip
        const x = 30 + i * 1.7 + Math.sin(now / 3000) * 8;
        const y = cy + Math.sin(u * 5.2 - phaseX) * amp * (0.35 + u * 0.9);
        // deep body at the front, ribbon-thin at the tail
        const th = Math.max(1, Math.round((1 - u * 0.75) * 4 + (u > 0.25 && u < 0.8 ? 1 : 0)));
        for (let dy = -th; dy <= th; dy++) {
          const shade2 = 0.3 + (dy / (th + 0.5)) * 0.45 + silver * 0.25;
          scr.px(x, y + dy, 2, 1, rampDither(ramp, shade2, x, y + dy));
        }
        if (i === 0) {                          // the head, and the eye
          scr.px(x - 2, y - 2, 4, 5, ramp[1]);
          scr.px(x + 1, y - 1, 1, 1, silver > 0.5 ? '#e8f4ff' : '#0c0a06');
        }
        px0 = [x, y];
      }
      // the long dorsal fin that runs most of the animal
      for (let i = 12; i <= len; i += 2) {
        const u = i / len;
        const x = 30 + i * 1.7 + Math.sin(now / 3000) * 8;
        const y = cy + Math.sin(u * 5.2 - phaseX) * amp * (0.35 + u * 0.9);
        scr.px(x, y - Math.round((1 - u * 0.75) * 4) - 1, 1, 1, ramp[silver > 0.5 ? 2 : 1]);
      }
      return px0;
    }

    // the last chapter nobody has: at the truth the eel swims out of the frame
    // toward a place we have never actually seen it reach
    function sargasso(now, tail) {
      const k = Math.min(1, glowT * 0.5);
      if (k <= 0) return;
      for (let i = 0; i < 9; i++) {             // sargassum weed, drifting in
        const x = 150 + (i * 13) % 44 - k * 8;
        const y = 24 + (i * 21) % 60 + Math.sin(now / 900 + i) * 3;
        scr.px(x, y, 5, 2, '#4a5a2c');
        scr.px(x + 1, y - 1, 2, 1, '#6b7a3a');
      }
      // a question mark of light where the eggs would be, if anyone had seen one
      const cx = 168, cy2 = 58;
      scr.softDisc(cx, cy2, 12 + k * 26, '#0a2c30', 14);
      for (let i = 0; i < 14; i++) {
        const a = now / 1600 + i * 0.45;
        const r = 6 + ((i * 7) % 16) + k * 12;
        scr.px(cx + Math.cos(a) * r, cy2 + Math.sin(a) * r * 0.8, 1, 1,
          i % 3 ? PAL.CYAN_LUX : '#c8fbf4');
      }
    }

    function draw(now, dt) {
      const s = STOPS[Math.max(0, stop)];
      const to = stop < 0 ? STOPS[0] : s;
      open += (to.open - open) * Math.min(1, dt * 1.4);
      silver += (to.silver - silver) * Math.min(1, dt * 1.2);
      weed += (to.weed - weed) * Math.min(1, dt * 1.4);
      if (phase === 'truth' || phase === 'outro') glowT += dt;

      water(now);
      const tail = body(now);
      sargasso(now, tail);
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
