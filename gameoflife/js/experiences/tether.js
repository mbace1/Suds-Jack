// The Tether — Paris, 21 November 1783. A paper-and-linen globe strains over the
// Château de la Muette with two men standing in a wicker gallery, a straw fire
// burning under its mouth. Every flying machine before this was held by a rope.
// The player cuts it, feeds the fire, and the ground lets go — the first humans
// ever to travel free of the earth. Cinematic-letterbox format (as `glass`), with
// the brazier flame as the GOLD_LUX breakout through the bars.
// Revert: look down from the highest place you can walk to.

import { PixelScreen, shade, rampDither } from '../pixel.js?v=42';
import { PAL } from '../palette.js?v=42';

// the widescreen band; the void above and below is the letterbox
const BY0 = 12, BY1 = 104;

// the globe
const GX = 96, GY = 46, GR = 21;

const SKY  = ['#5a86a8', '#7ba4c0', '#9dc0d4', '#c2dae6'];   // high → horizon
const CITY = ['#3e3a34', '#544d43', '#6b6154', '#847767'];
const SILK = ['#22385c', '#2f4b78', '#3d6098', '#5079b8'];   // the blue globe
const FLAME = PAL.GOLD_LUX, FLAME_HI = '#fff2c0';

export const tether = {
  id: 'tether',
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
    let stage = 0;         // 0 tethered → 1 over the roofs → 2 high → 3 crossing
    let alt = 0;           // eased height, 0..1, follows `stage`
    let phase = 'intro';   // intro → rising → truth → outro
    let stoke = 0;         // seconds of a brighter fire after feeding it
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

    function say(key, choices) {
      textEl.textContent = t(key);
      btnRow.innerHTML = '';
      for (const [label, fn] of choices) button(label, fn);
    }

    say('th.s1', [[t('th.cut'), () => {
      phase = 'rising';
      stage = 1;
      audio.water();
      stoke = 1.2;
      say('th.s2', [
        [t('th.s2.a'), () => climb('th.s3a')],
        [t('th.s2.b'), () => climb('th.s3b')],
      ]);
    }]]);

    // each choice feeds the fire and lifts them another stage
    function climb(key) {
      stage = 2;
      stoke = 1.2;
      audio.plink();
      say(key, [[t('ui.continue'), spark]]);
    }

    // the real hazard of that afternoon: embers eating holes in the linen
    function spark() {
      say('th.s4', [
        [t('th.s4.a'), () => finale('th.s5a')],
        [t('th.s4.b'), () => finale('th.s5b')],
      ]);
    }

    function finale(key) {
      stage = 3;
      stoke = 1.6;
      audio.plink();
      say(key, [[t('ui.continue'), truth]]);
    }

    function truth() {
      phase = 'truth';
      glowT = 0;
      stoke = 2.4;
      audio.water();
      say('th.truth', [[t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('th.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('th.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      }]]);
    }

    // ── rendering ────────────────────────────────────────────────
    // the world below, drawn parametrically on `alt`: the horizon climbs toward
    // eye level, the city compresses and shrinks, the Seine thins to a ribbon
    function world(now) {
      // the ground plane's top edge: it slides down and away as you climb, and
      // everything on it shrinks, so Paris turns from a street into a map
      const hy = Math.round(78 + alt * 16);
      const sc = 1 - alt * 0.74;                       // feature scale
      const gh = BY1 - hy;                             // ground depth on screen

      // chunky banded sky (the project's idiom — dithering here read as dashes)
      scr.bands(0, BY0, scr.w, hy - BY0, SKY);
      // a haze bank lying on the horizon, thicker the higher you get
      const hz = 2 + Math.round(alt * 4);
      for (let x = 0; x < scr.w; x++) {
        const w = hz + Math.round(Math.sin(x * 0.07 + now / 3000) * 1.4);
        scr.px(x, hy - w, 1, w, '#cfe0ea');
      }

      // the ground itself
      scr.px(0, hy, scr.w, gh, CITY[1]);
      scr.px(0, hy, scr.w, 1, CITY[3]);                // the lit far edge
      // the Seine, a curve that reads as a ribbon from high up
      const rw = Math.max(1, Math.round(4 * sc + 1));
      for (let x = 0; x < scr.w; x++) {
        const ry = hy + Math.round(gh * 0.42 + Math.sin(x * 0.035 + 1.2) * gh * 0.16);
        if (ry + rw < BY1) {
          scr.px(x, ry, 1, rw, '#4c7288');
          scr.px(x, ry + rw, 1, 1, '#6d95aa');
        }
      }
      // rooftops: tall and near down there at first, a fine grain once high
      const step = Math.max(3, Math.round(11 * sc));
      for (let x = -4; x < scr.w + 4; x += step) {
        const hh = Math.max(1, Math.round((6 + ((x * 13) % 8)) * sc));
        const ty = hy + 2 + ((x * 7) % Math.max(1, Math.round(gh * 0.7)));
        if (ty + hh >= BY1) continue;
        scr.px(x, ty, step - 1, hh, rampDither(CITY, 0.35 + ((x * 5) % 4) / 8, x, ty));
        if (sc > 0.55) scr.px(x, ty - 1, step - 1, 1, CITY[3]);   // lit roof ridge
      }
      // the château and the crowd, legible only while they are still close
      if (alt < 0.5) {
        const k = 1 - alt / 0.5;
        const chh = Math.max(2, Math.round(13 * k));
        const cy = BY1 - 6 - chh;
        scr.px(56, cy, 80, chh, CITY[2]);
        scr.px(56, cy - 1, 80, 2, CITY[3]);            // its pale roofline
        for (let i = 0; i < 5; i++) scr.px(62 + i * 17, cy + 2, 4, Math.max(1, chh - 4), CITY[0]);  // windows
        for (let i = 0; i < 26; i++) {                 // a hundred thousand people
          const px = 8 + (i * 29) % 178;
          scr.px(px, BY1 - 5, 1, Math.max(1, Math.round(3 * k)), i % 3 ? '#2e2a26' : '#3e3832');
        }
      }
    }

    // the balloon: a blue-and-gold globe, cord netting, a wicker gallery, and
    // the straw fire burning under its open mouth
    function balloon(now) {
      const sway = Math.sin(now / 1400) * 1.5;
      const cx = GX + sway;
      // the globe, dithered silk with gold bands
      for (let dy = -GR; dy <= GR + 6; dy++) {
        const t2 = (dy + GR) / (GR * 2);
        // a globe that tapers to the mouth below
        const wob = dy <= GR * 0.5 ? Math.sqrt(Math.max(0, 1 - (dy / GR) ** 2))
                                   : Math.max(0.28, 0.87 - (dy - GR * 0.5) / (GR * 1.1));
        const half = GR * wob;
        if (half < 1) continue;
        for (let dx = -half; dx <= half; dx++) {
          const u = 0.62 - (dx / GR) * 0.34 - t2 * 0.18;
          let c = rampDither(SILK, u, cx + dx, GY + dy);
          if (Math.abs(dy % 12) < 2 && Math.abs(dx) < half - 1) c = PAL.GOLD;   // gold bands
          scr.px(cx + dx, GY + dy, 1, 1, c);
        }
        scr.px(cx - Math.round(half), GY + dy, 1, 1, shade(SILK[0], 0.8));      // rim
        scr.px(cx + Math.round(half), GY + dy, 1, 1, shade(SILK[0], 0.8));
      }
      // fleur-de-lis dabs, the royal decoration
      for (const [ox, oy] of [[-9, -6], [8, -6], [0, 4], [-11, 6], [10, 6]]) {
        scr.px(cx + ox, GY + oy, 1, 3, PAL.GOLD);
        scr.px(cx + ox - 1, GY + oy + 1, 3, 1, PAL.GOLD);
      }
      // cords from the mouth down to the gallery
      const my = GY + GR + 6, gy = my + 9;
      for (const ox of [-7, -3, 3, 7]) {
        for (let y = my; y < gy; y++) scr.px(cx + ox + Math.round((y - my) * -ox * 0.04), y, 1, 1, '#8a7a5e');
      }
      // the wicker gallery the two men stood in
      scr.px(cx - 9, gy, 18, 6, '#8a6a3e');
      scr.px(cx - 9, gy, 18, 1, '#a88452');
      for (let i = 0; i < 5; i++) scr.px(cx - 8 + i * 4, gy + 1, 1, 4, shade('#8a6a3e', 0.75));
      // the two aeronauts, shoulders above the rail
      scr.px(cx - 5, gy - 4, 2, 4, '#2e2a30'); scr.px(cx - 5, gy - 6, 2, 2, '#c9a184');
      scr.px(cx + 4, gy - 4, 2, 4, '#3a2e2a'); scr.px(cx + 4, gy - 6, 2, 2, '#c9a184');
      // the brazier and its fire, burning up into the mouth of the globe
      const heat = 0.55 + Math.min(1, stoke) * 0.45;
      scr.px(cx - 3, gy - 3, 6, 3, '#4a4038');
      for (let i = 0; i < 9; i++) {
        const fy = gy - 4 - i;
        const w = Math.max(1, Math.round((5 - i * 0.5) * heat));
        const flick = Math.round(Math.sin(now / 70 + i) * 1.2);
        scr.px(cx - w / 2 + flick, fy, w, 1, i < 3 ? FLAME_HI : FLAME);
      }
      // embers rising into the globe's throat
      for (let i = 0; i < 5; i++) {
        const rise = ((now / 26 + i * 13) % 26);
        scr.px(cx - 4 + i * 2, gy - 10 - rise, 1, 1, i % 2 ? FLAME : FLAME_HI);
      }
      return [cx, gy];
    }

    // the tether: a rope down to a stake, taut until it is cut
    function rope(cx, gy) {
      for (let y = gy + 6; y < BY1; y++) {
        scr.px(cx + Math.round((y - gy) * 0.12), y, 1, 1, '#6a5a42');
      }
    }

    // at the truth the fire flares. The warm halo goes BEHIND the balloon so it
    // reads as firelight in the air, not a blot over the globe.
    function flareGlow(now) {
      const grow = Math.min(1, glowT * 0.7);
      const cx = GX + Math.sin(now / 1400) * 1.5, gy = GY + GR + 15;
      scr.softDisc(cx, gy - 6, 9 + grow * 13, '#4a3410', 11);
    }

    // ...and the sparks it throws go in front, streaming up past the bars
    function flareSparks(now) {
      const cx = GX + Math.sin(now / 1400) * 1.5, gy = GY + GR + 15;
      for (let i = 0; i < 14; i++) {
        const rise = ((now / 16 + i * 17) % 130);
        const sx = cx - 16 + (i * 2.4) + Math.sin(now / 260 + i) * 4;
        scr.px(sx, gy - 4 - rise, 1, 1, i % 3 ? FLAME : FLAME_HI);
      }
    }

    function draw(now, dt) {
      alt += (stage / 3 - alt) * Math.min(1, dt * 1.6);
      if (stoke > 0) stoke = Math.max(0, stoke - dt);
      if (phase === 'truth' || phase === 'outro') glowT += dt;

      const lit = phase === 'truth' || phase === 'outro';
      scr.clear(PAL.VOID);
      world(now);
      if (lit) flareGlow(now);
      const [cx, gy] = balloon(now);
      if (stage === 0) rope(cx, gy);
      if (lit) flareSparks(now);
      // re-lay the letterbox bars so the scene stays inside the band; the
      // breakout sparks above were drawn over them on purpose
      scr.px(0, 0, scr.w, BY0, PAL.VOID);
      scr.px(0, BY1, scr.w, 128 - BY1, PAL.VOID);
      if (phase === 'truth' || phase === 'outro') {
        // a few sparks live out in the bars — the light leaves the frame
        for (let i = 0; i < 7; i++) {
          const sx = 30 + (i * 23) % 140 + Math.sin(now / 400 + i) * 4;
          scr.px(sx, BY0 - 2 - ((now / 40 + i * 7) % 9), 1, 1, i % 2 ? FLAME : FLAME_HI);
          scr.px(sx, BY1 + 1 + ((now / 50 + i * 5) % 8), 1, 1, FLAME);
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
