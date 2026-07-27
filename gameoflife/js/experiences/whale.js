// The Whale Fall — a story told by descending. A grey whale dies at the surface
// and begins the longest funeral on earth: the body sinks three kilometres into
// water that has never been lit, and there it becomes a town. Scavengers strip
// it in months, worms and snails farm the bones for years, and bacteria live off
// the fat inside them for half a century. Nothing is wasted; the whole thing is
// just a very slow way of feeding a hundred species that could not otherwise
// exist. The player rides it down and stays for fifty years.
//
// Built to the 2026-07 void standard: a dithered water column that darkens with
// depth, the whale a pale shape in it, and the deep-sea life glowing
// luminescent cyan and breaking the frame — the only light down there is alive.
// Revert: find something fallen and see what is eating it.

import { PixelScreen, bayer, rampDither, shade } from '../pixel.js?v=38';
import { PAL } from '../palette.js?v=38';

// the water column, dark → darker; the surface is the only lit thing
const SEA = ['#04070d', '#071019', '#0b1c2b', '#12303f', '#1d4a5c', '#2f6d80'];
const BONE = ['#5a5f63', '#7d8288', '#a3a8ad', '#c8ccd0'];
const FLESH = ['#2e2c30', '#43404a', '#57535f'];
const LUX = PAL.CYAN_LUX, LUX_HI = '#c8fbf4';

// each stage of the fall: how deep we are, and how long the body has been down
const STAGES = [
  { key: 'wh.d1', depth: 0.00, life: 0 },   // the surface, the last breath
  { key: 'wh.d2', depth: 0.35, life: 0 },   // the long sinking
  { key: 'wh.d3', depth: 1.00, life: 1 },   // touchdown; the scavengers arrive
  { key: 'wh.d4', depth: 1.00, life: 2 },   // months: stripped to the bone
  { key: 'wh.d5', depth: 1.00, life: 3 },   // years: the bone farmers
];

export const whale = {
  id: 'whale',
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
    let phase = 'intro';    // intro → fall → choice → truth → outro
    let stage = -1;         // index into STAGES
    let depth = 0;          // eased toward the stage's depth
    let life = 0;           // eased toward the stage's life level
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

    textEl.textContent = t('wh.s1');
    button(t('wh.begin'), deeper);

    function deeper() {
      phase = 'fall';
      stage++;
      audio.plink();
      textEl.textContent = t(STAGES[stage].key);
      btnRow.innerHTML = '';
      if (stage >= STAGES.length - 1) {
        // the choice is really about whether a death is a loss or a harvest
        button(t('wh.choice.a'), showTruth);
        button(t('wh.choice.b'), showTruth);
      } else {
        button(t('wh.deeper'), deeper);
      }
    }

    function showTruth() {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('wh.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('wh.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('wh.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── rendering ────────────────────────────────────────────────
    // the column: light only at the very top, and it loses the fight fast.
    // Cached on the quantised depth — it is a full-screen dither, far too
    // expensive to repaint while nothing about it is changing.
    function column() {
      // per-PIXEL, not in 2px cells: a 2px cell on a smooth vertical ramp lines
      // the thresholds up into visible horizontal dashes. This whole layer is
      // inside cached(), so the finer stipple is free.
      for (let y = 0; y < 128; y++) {
        const u = Math.max(0, 1 - (y / 128) * 0.85 - depth * 0.9);
        for (let x = 0; x < 192; x++) {
          scr.px(x, y, 1, 1, rampDither(SEA, u, x, y));
        }
      }
      if (depth < 0.5) {                       // the surface, while we can see it
        const lit = 1 - depth * 2;
        for (let x = 0; x < 192; x += 3) {
          const h = 2 + ((x * 7) % 3);
          scr.px(x, 2 + ((x * 5) % 3), 3, h, shade('#6ea8bc', 0.4 + lit * 0.6));
        }
      }
    }

    // marine snow: the constant fall of everything dying higher up. It is the
    // reason the deep is not empty, and it drifts from the first frame.
    function snow(now) {
      for (let i = 0; i < 26; i++) {
        const x = (i * 47 + 11) % 190;
        const y = ((now / (26 + (i % 5) * 9) + i * 31) % 140) - 6;
        scr.px(x + Math.sin(now / 900 + i) * 2, y, 1, 1, i % 4 ? '#22333d' : '#33505c');
      }
    }

    // the body: a pale mass while it has flesh, a ribcage once it does not
    function body(now) {
      const cy = 62 + (1 - depth) * 34;        // rides down as we descend
      if (life < 1.6) {
        // A whale profile, not a cylinder: blunt head at the right, a long back
        // that tapers to a narrow peduncle, then the flukes spread flat. The
        // silhouette is the whole recognition, so it is worth the arithmetic.
        for (let dx = -44; dx <= 46; dx++) {
          const u2 = (dx + 44) / 90;                        // 0 tail → 1 snout
          let half;
          if (u2 < 0.18) half = 1.2 + u2 * 9;               // the thin peduncle
          else if (u2 < 0.78) half = 10.5 * Math.sin(Math.PI * (0.18 + (u2 - 0.18) * 0.95));
          else half = 9.5 * (1 - (u2 - 0.78) * 3.4);        // the head, rounding off
          half = Math.max(0, Math.round(half));
          if (!half) continue;
          for (let dy = -half; dy <= half; dy++) {
            // the back is dark, the belly pale — countershading, like the animal
            const u = 0.28 + (dy / (half + 0.5)) * 0.42 + (1 - depth) * 0.22;
            scr.px(96 + dx, cy + dy - 1, 1, 1, rampDither(FLESH, u, 96 + dx, cy + dy));
          }
        }
        // the flukes: two flat blades off the peduncle, the read that says whale
        for (let i = 0; i < 9; i++) {
          const w = 9 - i;
          scr.px(96 - 44 - i, cy - 2 - Math.round(i * 0.9), Math.max(1, w * 0.4), 1, FLESH[1]);
          scr.px(96 - 44 - i, cy + 1 + Math.round(i * 0.9), Math.max(1, w * 0.4), 1, FLESH[1]);
        }
        scr.px(96 + 20, cy + 6, 9, 3, FLESH[1]);            // the pectoral fin
        scr.px(96 + 30, cy + 1, 14, 1, shade(FLESH[2], 1.25));  // the long jaw line
        scr.px(96 + 40, cy - 3, 2, 2, '#1a1a1e');           // the eye
      } else {
        // Stripped to the frame. Ribs hang from a spine and BOW outward as they
        // fall — straight verticals read as a xylophone, not a ribcage.
        const spineY = cy - 9;
        scr.px(96 - 44, spineY, 88, 2, BONE[1]);            // the spine
        for (let i = 0; i < 12; i++) {
          const rx = 96 - 40 + i * 7;
          const len = 16 - Math.abs(i - 5.5) * 1.6;         // longest amidships
          for (let j = 0; j < len; j++) {
            const t2 = j / len;
            const bow = Math.sin(t2 * 1.9) * (5 - Math.abs(i - 5.5) * 0.5);
            scr.px(rx + bow, spineY + 2 + j, 1, 1,
              rampDither(BONE, 0.75 - t2 * 0.45, rx, spineY + j));
          }
        }
        scr.px(96 + 42, spineY - 2, 13, 6, BONE[1]);        // skull
        scr.px(96 + 36, spineY + 3, 20, 2, BONE[0]);        // and its long jaw
        scr.px(96 - 52, spineY, 10, 2, BONE[0]);            // tail vertebrae
      }
      scr.px(96 - 46, cy + 12, 92, 3, '#0a1218');           // the sediment it settles into
    }

    // the town: everything that shows up to live off it, glowing because down
    // here the only light is made by something alive (the breakout element)
    function town(now) {
      if (life < 0.6) return;
      const cy = 62 + (1 - depth) * 34;
      const n = Math.floor(life * 9);
      for (let i = 0; i < n; i++) {
        const a = now / 1400 + i * 0.9;
        const rx = 30 + (i * 13) % 40, ry = 10 + (i * 7) % 14;
        const x = 96 + Math.cos(a) * rx, y = cy + Math.sin(a * 1.3) * ry;
        // a lamp at this resolution is a cross of dim pixels around a bright
        // core — softDisc's dither is too coarse here and lands as an octagon
        const dim = '#0e4a4a';
        scr.px(x - 1, y, 1, 1, dim); scr.px(x + 1, y, 1, 1, dim);
        scr.px(x, y - 1, 1, 1, dim); scr.px(x, y + 1, 1, 1, dim);
        scr.px(x, y, 1, 1, i % 3 ? LUX : LUX_HI);
      }
      if (life > 2.4) {
        // the bone-eating worms: a red-plumed lawn along the ribs, and their
        // glow lifts off the frame entirely
        for (let i = 0; i < 20; i++) {
          const x = 96 - 40 + i * 4.2;
          const h = 3 + Math.round(2 * Math.sin(now / 500 + i));
          scr.px(x, cy - 11 - h, 1, h, i % 2 ? '#b8564a' : '#8f4038');
        }
        const k = Math.min(1, glowT * 0.5);
        if (k > 0) {
          scr.softDisc(96, cy - 6, 20 + k * 40, '#062e2e', 18);
          for (let i = 0; i < 9; i++) {
            const rise = ((now / 34 + i * 26) % 120);
            scr.px(96 - 34 + i * 9 + Math.sin(now / 420 + i) * 4, cy - 14 - rise, 1, 2,
              i % 3 ? LUX : LUX_HI);
          }
        }
      }
    }

    function draw(now, dt) {
      const s = STAGES[Math.max(0, stage)];
      const td = stage < 0 ? 0 : s.depth, tl = stage < 0 ? 0 : s.life;
      depth += (td - depth) * Math.min(1, dt * 1.6);
      life += (tl - life) * Math.min(1, dt * 1.2);
      if (phase === 'truth' || phase === 'outro') glowT += dt;

      // the column is a full-screen dithered ramp: paint it once per depth step
      scr.cached(`sea:${Math.round(depth * 24)}`, () => { scr.clear(PAL.VOID); column(); });
      snow(now);          // always falling — the scene lives from the first frame
      body(now);
      town(now);
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
